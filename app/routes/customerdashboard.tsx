import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { authenticate, unauthenticated } from "../shopify.server";
import { getPortalConfig } from "../services/portal.server";

type MenuItem = {
  label: string;
  icon?: string | null;
  destination: string;
  linkType?: string | null;
  badgeText?: string | null;
  badgeTone?: string | null;
  isEnabled?: boolean | null;
  openInNewTab?: boolean | null;
};

function extractGraphQLError(resJson: any): string | null {
  if (resJson?.errors && Array.isArray(resJson.errors) && resJson.errors.length > 0) {
    const raw = resJson.errors.map((e: any) => e.message).join(", ");
    if (
      raw.includes("not approved to access the Customer object") ||
      raw.includes("protected-customer-data")
    ) {
      return "Protected Customer Data permission needed: In Shopify Partner Dashboard, open your app ('Amolih-customer-portal') > API access > Protected customer data, and check 'Customer data' (Approval is instant for development stores).";
    }
    return raw;
  }
  return null;
}

/**
 * App Proxy Dashboard Action
 * Handles live customer session actions:
 * - update_profile (firstName, lastName, email, phone)
 * - create_address
 * - update_address
 * - delete_address
 * - set_default_address
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop =
    session?.shop ||
    url.searchParams.get("shop") ||
    "dev-amolih.myshopify.com";
  const pathPrefix =
    url.searchParams.get("path_prefix") || "/apps/customerdashboard";
  const loggedInCustomerId = url.searchParams.get("logged_in_customer_id");
  const tab = (url.searchParams.get("tab") || "details").toLowerCase();

  const isJson =
    request.headers.get("accept")?.includes("application/json") ||
    request.headers.get("x-requested-with") === "XMLHttpRequest";

  if (!loggedInCustomerId) {
    const errorMsg = "Please log in to your store account to save details.";
    if (isJson) {
      return json({ success: false, error: errorMsg }, { status: 401 });
    }
    return redirect(
      `${pathPrefix}?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(errorMsg)}`,
    );
  }

  // Get Admin API client
  let adminClient = admin;
  if (!adminClient) {
    try {
      const { admin: fallbackAdmin } = await unauthenticated.admin(shop);
      adminClient = fallbackAdmin;
    } catch (e) {
      console.error("Failed to load fallback admin client:", e);
    }
  }

  if (!adminClient) {
    const errorMsg =
      "Store authentication token is missing. Please open the app in Shopify admin once to authorize write_customers access.";
    if (isJson) {
      return json({ success: false, error: errorMsg }, { status: 500 });
    }
    return redirect(
      `${pathPrefix}?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(errorMsg)}`,
    );
  }

  const formData = await request.formData();
  const actionType = (formData.get("action_type") as string) || "";
  const customerGid = `gid://shopify/Customer/${loggedInCustomerId.replace(/\D/g, "")}`;

  try {
    // 1. UPDATE PROFILE
    if (actionType === "update_profile") {
      const firstName = ((formData.get("first_name") as string) || "").trim();
      const lastName = ((formData.get("last_name") as string) || "").trim();
      const email = ((formData.get("email") as string) || "").trim();
      const phone = ((formData.get("phone") as string) || "").trim();

      const input: Record<string, any> = {
        id: customerGid,
        firstName,
        lastName,
      };
      if (email) input.email = email;
      if (phone) input.phone = phone;

      const response = await adminClient.graphql(
        `#graphql
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              firstName
              lastName
              email
              phone
            }
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { input } },
      );

      const resJson = await response.json();
      const rootError = extractGraphQLError(resJson);
      if (rootError) {
        if (isJson) {
          return json({ success: false, error: rootError }, { status: 403 });
        }
        return redirect(
          `${pathPrefix}?tab=details&error=${encodeURIComponent(rootError)}`,
        );
      }
      const userErrors = resJson.data?.customerUpdate?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e: any) => e.message).join(", ");
        if (isJson) {
          return json({ success: false, error: errorMsg }, { status: 400 });
        }
        return redirect(
          `${pathPrefix}?tab=details&error=${encodeURIComponent(errorMsg)}`,
        );
      }

      if (isJson) {
        return json({
          success: true,
          message: "Profile details updated successfully!",
        });
      }
      return redirect(
        `${pathPrefix}?tab=details&success=${encodeURIComponent("Profile details updated successfully!")}`,
      );
    }

    // 2. CREATE ADDRESS
    if (actionType === "create_address") {
      const addressInput: Record<string, any> = {
        firstName: ((formData.get("first_name") as string) || "").trim(),
        lastName: ((formData.get("last_name") as string) || "").trim(),
        company: ((formData.get("company") as string) || "").trim(),
        address1: ((formData.get("address1") as string) || "").trim(),
        address2: ((formData.get("address2") as string) || "").trim(),
        city: ((formData.get("city") as string) || "").trim(),
        province: ((formData.get("province") as string) || "").trim(),
        zip: ((formData.get("zip") as string) || "").trim(),
        country: ((formData.get("country") as string) || "").trim(),
      };
      const phone = ((formData.get("phone") as string) || "").trim();
      if (phone) addressInput.phone = phone;

      const isDefault =
        formData.get("is_default") === "true" ||
        formData.get("is_default") === "on";

      const response = await adminClient.graphql(
        `#graphql
        mutation customerAddressCreate($customerId: ID!, $address: MailingAddressInput!) {
          customerAddressCreate(customerId: $customerId, address: $address) {
            address {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { customerId: customerGid, address: addressInput } },
      );

      const resJson = await response.json();
      const rootError = extractGraphQLError(resJson);
      if (rootError) {
        if (isJson) {
          return json({ success: false, error: rootError }, { status: 403 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(rootError)}`,
        );
      }
      const userErrors =
        resJson.data?.customerAddressCreate?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e: any) => e.message).join(", ");
        if (isJson) {
          return json({ success: false, error: errorMsg }, { status: 400 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(errorMsg)}`,
        );
      }

      const newAddressId =
        resJson.data?.customerAddressCreate?.address?.id;
      if (isDefault && newAddressId) {
        await adminClient.graphql(
          `#graphql
          mutation customerUpdateDefaultAddress($addressId: ID!, $customerId: ID!) {
            customerUpdateDefaultAddress(addressId: $addressId, customerId: $customerId) {
              customer { id }
              userErrors { field message }
            }
          }`,
          { variables: { addressId: newAddressId, customerId: customerGid } },
        );
      }

      if (isJson) {
        return json({
          success: true,
          message: "New address added successfully!",
        });
      }
      return redirect(
        `${pathPrefix}?tab=addresses&success=${encodeURIComponent("New address added successfully!")}`,
      );
    }

    // 3. UPDATE ADDRESS
    if (actionType === "update_address") {
      const rawAddressId = (formData.get("address_id") as string) || "";
      const addressGid = rawAddressId.startsWith("gid://shopify/")
        ? rawAddressId
        : `gid://shopify/MailingAddress/${rawAddressId.replace(/\D/g, "")}`;

      const addressInput: Record<string, any> = {
        firstName: ((formData.get("first_name") as string) || "").trim(),
        lastName: ((formData.get("last_name") as string) || "").trim(),
        company: ((formData.get("company") as string) || "").trim(),
        address1: ((formData.get("address1") as string) || "").trim(),
        address2: ((formData.get("address2") as string) || "").trim(),
        city: ((formData.get("city") as string) || "").trim(),
        province: ((formData.get("province") as string) || "").trim(),
        zip: ((formData.get("zip") as string) || "").trim(),
        country: ((formData.get("country") as string) || "").trim(),
      };
      const phone = ((formData.get("phone") as string) || "").trim();
      if (phone) addressInput.phone = phone;

      const isDefault =
        formData.get("is_default") === "true" ||
        formData.get("is_default") === "on";

      const response = await adminClient.graphql(
        `#graphql
        mutation customerAddressUpdate($customerId: ID!, $addressId: ID!, $address: MailingAddressInput!) {
          customerAddressUpdate(customerId: $customerId, addressId: $addressId, address: $address) {
            address {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            customerId: customerGid,
            addressId: addressGid,
            address: addressInput,
          },
        },
      );

      const resJson = await response.json();
      const rootError = extractGraphQLError(resJson);
      if (rootError) {
        if (isJson) {
          return json({ success: false, error: rootError }, { status: 403 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(rootError)}`,
        );
      }
      const userErrors =
        resJson.data?.customerAddressUpdate?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e: any) => e.message).join(", ");
        if (isJson) {
          return json({ success: false, error: errorMsg }, { status: 400 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(errorMsg)}`,
        );
      }

      if (isDefault) {
        await adminClient.graphql(
          `#graphql
          mutation customerUpdateDefaultAddress($addressId: ID!, $customerId: ID!) {
            customerUpdateDefaultAddress(addressId: $addressId, customerId: $customerId) {
              customer { id }
              userErrors { field message }
            }
          }`,
          { variables: { addressId: addressGid, customerId: customerGid } },
        );
      }

      if (isJson) {
        return json({
          success: true,
          message: "Address updated successfully!",
        });
      }
      return redirect(
        `${pathPrefix}?tab=addresses&success=${encodeURIComponent("Address updated successfully!")}`,
      );
    }

    // 4. DELETE ADDRESS
    if (actionType === "delete_address") {
      const rawAddressId = (formData.get("address_id") as string) || "";
      const addressGid = rawAddressId.startsWith("gid://shopify/")
        ? rawAddressId
        : `gid://shopify/MailingAddress/${rawAddressId.replace(/\D/g, "")}`;

      const response = await adminClient.graphql(
        `#graphql
        mutation customerAddressDelete($addressId: ID!, $customerId: ID!) {
          customerAddressDelete(addressId: $addressId, customerId: $customerId) {
            deletedAddressId
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { addressId: addressGid, customerId: customerGid } },
      );

      const resJson = await response.json();
      const rootError = extractGraphQLError(resJson);
      if (rootError) {
        if (isJson) {
          return json({ success: false, error: rootError }, { status: 403 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(rootError)}`,
        );
      }
      const userErrors =
        resJson.data?.customerAddressDelete?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e: any) => e.message).join(", ");
        if (isJson) {
          return json({ success: false, error: errorMsg }, { status: 400 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(errorMsg)}`,
        );
      }

      if (isJson) {
        return json({
          success: true,
          message: "Address deleted successfully!",
        });
      }
      return redirect(
        `${pathPrefix}?tab=addresses&success=${encodeURIComponent("Address deleted successfully!")}`,
      );
    }

    // 5. SET DEFAULT ADDRESS
    if (actionType === "set_default_address") {
      const rawAddressId = (formData.get("address_id") as string) || "";
      const addressGid = rawAddressId.startsWith("gid://shopify/")
        ? rawAddressId
        : `gid://shopify/MailingAddress/${rawAddressId.replace(/\D/g, "")}`;

      const response = await adminClient.graphql(
        `#graphql
        mutation customerUpdateDefaultAddress($addressId: ID!, $customerId: ID!) {
          customerUpdateDefaultAddress(addressId: $addressId, customerId: $customerId) {
            customer {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { addressId: addressGid, customerId: customerGid } },
      );

      const resJson = await response.json();
      const rootError = extractGraphQLError(resJson);
      if (rootError) {
        if (isJson) {
          return json({ success: false, error: rootError }, { status: 403 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(rootError)}`,
        );
      }
      const userErrors =
        resJson.data?.customerUpdateDefaultAddress?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e: any) => e.message).join(", ");
        if (isJson) {
          return json({ success: false, error: errorMsg }, { status: 400 });
        }
        return redirect(
          `${pathPrefix}?tab=addresses&error=${encodeURIComponent(errorMsg)}`,
        );
      }

      if (isJson) {
        return json({
          success: true,
          message: "Default address updated successfully!",
        });
      }
      return redirect(
        `${pathPrefix}?tab=addresses&success=${encodeURIComponent("Default address updated successfully!")}`,
      );
    }

    return redirect(`${pathPrefix}?tab=${encodeURIComponent(tab)}`);
  } catch (error: any) {
    console.error("Dashboard action execution error:", error);
    const errorMsg = error?.message || "An unexpected error occurred while saving.";
    if (isJson) {
      return json({ success: false, error: errorMsg }, { status: 500 });
    }
    return redirect(
      `${pathPrefix}?tab=${encodeURIComponent(tab)}&error=${encodeURIComponent(errorMsg)}`,
    );
  }
};

/**
 * App Proxy Dashboard Loader
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid, session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop =
    session?.shop ||
    url.searchParams.get("shop") ||
    "dev-amolih.myshopify.com";
  const pathPrefix =
    url.searchParams.get("path_prefix") || "/apps/customerdashboard";
  const tab = (url.searchParams.get("tab") || "details").toLowerCase();
  const successMessage = url.searchParams.get("success") || "";
  const errorMessage = url.searchParams.get("error") || "";

  const config = await getPortalConfig(shop);
  const menuItems = (config.menuItems || []).filter(
    (item: MenuItem) => item.isEnabled !== false,
  );
  const circlePageUrl =
    (config as any).circlePageUrl || "amolih-circle-progress-bar";
  const activeTab = resolveActiveTab(tab, menuItems, circlePageUrl);

  return liquid(
    renderDashboardHtml({
      config,
      menuItems,
      activeTab,
      pathPrefix,
      circlePageUrl,
      successMessage,
      errorMessage,
    }),
  );
};

function isCircleTab(tab: string, circlePageUrl?: string | null) {
  const norm = (tab || "").toLowerCase().trim();
  const circleNorm = (circlePageUrl || "amolih-circle-progress-bar")
    .toLowerCase()
    .trim()
    .replace(/^\/pages\//, "")
    .replace(/^\//, "");
  return (
    norm === "circle" ||
    norm === "amolih-circle-progress-bar" ||
    norm === circleNorm ||
    norm.includes("progress-bar") ||
    norm.includes("circle")
  );
}

function resolveActiveTab(
  tab: string,
  menuItems: MenuItem[],
  circlePageUrl?: string | null,
) {
  const norm = tab.toLowerCase().trim();
  if (isCircleTab(norm, circlePageUrl)) {
    const circleItem = menuItems.find((item) =>
      isCircleTab((item.destination || "").toLowerCase(), circlePageUrl),
    );
    if (circleItem) {
      return (circleItem.destination || "amolih-circle-progress-bar").toLowerCase();
    }
    return "amolih-circle-progress-bar";
  }

  const enabledInternal = menuItems
    .filter((item) => !isExternalItem(item))
    .map((item) => (item.destination || "details").toLowerCase());

  if (enabledInternal.includes(norm)) return norm;
  return enabledInternal[0] || "details";
}

function isExternalItem(item: MenuItem) {
  const type = item.linkType || "";
  if (
    type === "EXTERNAL_URL" ||
    type === "SUPPORT_ACTION" ||
    type === "SHOPIFY_STORE"
  ) {
    return true;
  }
  const destination = item.destination || "";
  return /^https?:\/\//i.test(destination) || destination.startsWith("/");
}

function renderDashboardHtml({
  config,
  menuItems,
  activeTab,
  pathPrefix,
  circlePageUrl,
  successMessage,
  errorMessage,
}: {
  config: {
    portalTitle?: string | null;
    welcomeMessage?: string | null;
    primaryColor?: string | null;
    sidebarBgColor?: string | null;
    textColor?: string | null;
    fontFamily?: string | null;
    supportUrl?: string | null;
    circleTierTitle?: string | null;
    circlePageUrl?: string | null;
  };
  menuItems: MenuItem[];
  activeTab: string;
  pathPrefix: string;
  circlePageUrl: string;
  successMessage: string;
  errorMessage: string;
}) {
  const title = escapeHtml(config.portalTitle || "Amolih Customer Portal");
  const welcome = escapeHtml(config.welcomeMessage || "Welcome back");
  const primary = escapeHtml(config.primaryColor || "#355E59");
  const sidebarBg = escapeHtml(config.sidebarBgColor || "#FBF8F5");
  const textColor = escapeHtml(config.textColor || "#1A1A1A");
  const rawFontFamily = config.fontFamily || "inherit";
  const supportUrl =
    config.supportUrl ||
    "https://wa.me/918233905718?text=Hi+AMOLIH%21+I+have+a+question.";
  const circleTitle = escapeHtml(
    config.circleTierTitle || "Amolih Circle's Progress Bar",
  );

  // AMOLIH TYPOGRAPHY ARCHITECTURE:
  // Storefront font stack:
  // Headings/Serifs: 'Bellefair', 'Cormorant Garamond' (Editorial Jaipur Luxury)
  // Interface/Body: 'Inter', 'Open Sans' (Modern Clean Sans)
  const isInheritTheme =
    !rawFontFamily ||
    rawFontFamily === "inherit" ||
    rawFontFamily === "amolih" ||
    rawFontFamily.toLowerCase().includes("inherit") ||
    rawFontFamily.toLowerCase().includes("amolih") ||
    rawFontFamily.toLowerCase().includes("theme");

  // Always preload and load Google Fonts for Bellefair, Cormorant Garamond, Inter, and Open Sans
  let googleFontLink = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bellefair&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">`;

  let bodyFontFamily =
    "var(--font-body-family, 'Inter', 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)";
  let headingFontFamily =
    "var(--font-heading-family, 'Bellefair', 'Cormorant Garamond', Garamond, Georgia, serif)";

  if (!isInheritTheme) {
    const fontName = rawFontFamily.split(",")[0].replace(/['"]/g, "").trim();
    if (
      fontName &&
      !fontName.startsWith("-apple-system") &&
      fontName !== "sans-serif" &&
      fontName !== "serif"
    ) {
      googleFontLink += `
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">`;
      bodyFontFamily = `'${fontName}', var(--font-body-family, 'Inter', sans-serif)`;
      headingFontFamily = `'${fontName}', var(--font-heading-family, 'Bellefair', serif)`;
    } else {
      bodyFontFamily = escapeHtml(rawFontFamily);
      headingFontFamily = escapeHtml(rawFontFamily);
    }
  }

  const menuHtml = menuItems
    .map((item) => {
      const destination = (item.destination || "details").toLowerCase();
      const external = isExternalItem(item);
      const isCircle = isCircleTab(destination, circlePageUrl);
      const active =
        (!external && destination === activeTab.toLowerCase()) ||
        (!external && isCircle && isCircleTab(activeTab, circlePageUrl));

      const href = external
        ? escapeHtml(resolveExternalHref(item, supportUrl))
        : escapeHtml(
          `${pathPrefix}?tab=${encodeURIComponent(item.destination || "details")}`,
        );
      const target = item.openInNewTab ? ' target="_blank" rel="noopener"' : "";
      const badge = renderMenuBadge(destination, item.badgeText);

      return `<a class="amolih-menu-item${active ? " is-active" : ""}" href="${href}"${target}>
        <span class="amolih-menu-label"><span class="amolih-icon">${escapeHtml(item.icon || "✦")}</span>${escapeHtml(item.label)}</span>
        ${badge}
      </a>`;
    })
    .join("");

  const panelHtml = renderPanelLiquid(
    activeTab,
    menuItems,
    circleTitle,
    circlePageUrl,
    pathPrefix,
  );

  return `
${googleFontLink}
<style>
  :root {
    --amolih-primary: ${primary};
    --amolih-primary-dark: #23433E;
    --amolih-primary-light: rgba(53, 94, 89, 0.08);
    --amolih-gold: #C5A880;
    --amolih-gold-dark: #A8895E;
    --amolih-gold-light: #FBF8F3;
    --amolih-gold-border: rgba(197, 168, 128, 0.35);
    --amolih-sidebar: ${sidebarBg};
    --amolih-card-bg: #FFFFFF;
    --amolih-text: ${textColor};
    --amolih-text-muted: #64748B;
    --amolih-border: #E8E3DD;
    --amolih-border-light: #F4EFEB;
    --amolih-font-luxury: 'Bellefair', 'Cormorant Garamond', Garamond, Georgia, serif;
    --amolih-font-editorial: 'Cormorant Garamond', 'Bellefair', Garamond, Georgia, serif;
    --amolih-font-modern: 'Inter', 'Open Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --amolih-font-family: ${bodyFontFamily};
    --amolih-heading-font: ${headingFontFamily};
    --amolih-radius: 12px;
    --amolih-radius-lg: 16px;
    --amolih-radius-sm: 8px;
    --amolih-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
    --amolih-shadow: 0 4px 20px -2px rgba(53, 94, 89, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
    --amolih-shadow-hover: 0 10px 25px -4px rgba(53, 94, 89, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06);
  }

  html, body {
    overflow-x: hidden;
    max-width: 100vw;
  }

  .amolih-dashboard {
    font-family: var(--amolih-font-family);
    color: var(--amolih-text);
    width: 100%;
    max-width: 1220px;
    margin: 0 auto;
    padding: 2rem 1.25rem 4rem;
    line-height: 1.55;
    overflow-x: clip;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .amolih-dashboard * {
    box-sizing: border-box;
  }
  .amolih-dashboard h1,
  .amolih-dashboard h2,
  .amolih-dashboard h3,
  .amolih-dashboard h4,
  .amolih-serif {
    font-family: var(--amolih-heading-font);
    font-weight: 400;
    color: var(--amolih-text);
    letter-spacing: 0.015em;
  }
  .amolih-dashboard h1 { margin: 0; font-size: 2.35rem; line-height: 1.15; }
  .amolih-dashboard h2 { margin: 0 0 0.4rem; font-size: 1.55rem; line-height: 1.25; }
  .amolih-dashboard h3 { margin: 0 0 0.35rem; font-size: 1.25rem; font-family: var(--amolih-font-editorial); }
  .amolih-dashboard input,
  .amolih-dashboard button,
  .amolih-dashboard select,
  .amolih-dashboard textarea,
  .amolih-dashboard label,
  .amolih-dashboard a {
    font-family: var(--amolih-font-modern);
  }

  /* Luxury Hero Customer Header */
  .amolih-hero-banner {
    background: linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 50%, #FAF7F2 100%);
    border: 1px solid var(--amolih-gold-border);
    border-radius: var(--amolih-radius-lg);
    padding: 1.75rem 2rem;
    margin-bottom: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
    position: relative;
    overflow: hidden;
    box-shadow: var(--amolih-shadow);
  }
  .amolih-hero-banner::after {
    content: "AMOLIH";
    position: absolute;
    right: 20px;
    bottom: -15px;
    font-family: var(--amolih-heading-font);
    font-size: 5rem;
    font-weight: 700;
    color: rgba(197, 168, 128, 0.07);
    letter-spacing: 0.25em;
    pointer-events: none;
    user-select: none;
  }
  .amolih-hero-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--amolih-gold-dark);
    background: #FFFFFF;
    border: 1px solid var(--amolih-gold-border);
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    margin-bottom: 0.5rem;
  }
  .amolih-hero-title {
    font-family: var(--amolih-heading-font);
    font-size: 2.15rem;
    color: var(--amolih-text);
    margin: 0;
    line-height: 1.2;
  }
  .amolih-hero-sub {
    color: var(--amolih-text-muted);
    font-size: 0.92rem;
    margin: 0.35rem 0 0;
    font-family: var(--amolih-font-modern);
    letter-spacing: 0.01em;
  }
  .amolih-hero-stats {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .amolih-avatar-circle {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 2px solid var(--amolih-gold);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--amolih-heading-font);
    font-size: 1.35rem;
    color: var(--amolih-primary);
    font-weight: 500;
    box-shadow: 0 4px 10px rgba(197, 168, 128, 0.2);
  }

  /* Layout Structure */
  .amolih-layout {
    display: grid;
    grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
  }

  /* Luxury Sidebar & Linear Navigation */
  .amolih-sidebar {
    background: var(--amolih-sidebar);
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius-lg);
    padding: 0.85rem;
    box-shadow: var(--amolih-shadow);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .amolih-nav-scroll-wrapper {
    position: relative;
    width: 100%;
  }
  .amolih-nav-scroll-track {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    width: 100%;
  }
  .amolih-sidebar-profile {
    padding: 1rem 1rem 1.15rem;
    border-bottom: 1px solid var(--amolih-border);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .amolih-sidebar-name {
    font-family: var(--amolih-font-editorial);
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--amolih-text);
    line-height: 1.25;
  }
  .amolih-sidebar-email {
    font-size: 0.78rem;
    color: var(--amolih-text-muted);
    word-break: break-all;
    font-family: var(--amolih-font-modern);
    margin-top: 2px;
  }
  .amolih-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: var(--amolih-radius-sm);
    text-decoration: none;
    color: var(--amolih-text);
    font-size: 0.93rem;
    font-weight: 500;
    font-family: var(--amolih-font-modern);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }
  .amolih-menu-item:hover {
    background: rgba(53, 94, 89, 0.05);
    color: var(--amolih-primary);
    transform: translateX(2px);
  }
  .amolih-menu-item.is-active {
    background: var(--amolih-primary);
    color: #FFFFFF !important;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(53, 94, 89, 0.25);
  }
  .amolih-menu-label { display: inline-flex; align-items: center; gap: 0.75rem; }
  .amolih-icon { width: 1.35rem; text-align: center; font-size: 1.05rem; }
  .amolih-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: #E2E8F0;
    color: #1E293B;
    font-size: 0.72rem;
    padding: 0.2rem 0.65rem;
    white-space: nowrap;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .amolih-menu-item.is-active .amolih-badge {
    background: rgba(255, 255, 255, 0.22);
    color: #FFFFFF;
  }

  /* Sidebar WhatsApp Concierge Card (Desktop) */
  .amolih-sidebar-concierge {
    margin-top: 1rem;
    padding: 1rem;
    background: #FFFFFF;
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius-sm);
    text-align: center;
  }
  .amolih-concierge-title {
    font-family: var(--amolih-font-editorial);
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 4px;
    color: var(--amolih-text);
  }
  .amolih-concierge-desc {
    font-size: 0.78rem;
    color: var(--amolih-text-muted);
    margin: 0 0 10px;
  }
  .amolih-concierge-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 0.6rem 0.85rem;
    background: var(--amolih-primary);
    color: #FFFFFF !important;
    border-radius: var(--amolih-radius-sm);
    text-decoration: none;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition: opacity 0.15s ease;
  }
  .amolih-concierge-btn:hover { opacity: 0.92; }
  .amolih-sidebar-logout {
    margin-top: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--amolih-border-light);
  }
  .amolih-logout-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.84rem;
    color: #94A3B8;
    text-decoration: none;
    transition: color 0.15s;
  }
  .amolih-logout-link:hover { color: #DC2626; }

  /* Mobile Footer Actions (Concierge & Logout) - Hidden on desktop */
  .amolih-mobile-footer-strip {
    display: none;
  }

  /* Fully Responsive & Linear Horizontal Nav for Mobile */
  @media (max-width: 860px) {
    .amolih-dashboard {
      padding: 1.25rem 1rem 3.5rem;
      width: 100%;
      max-width: 100%;
      overflow-x: clip;
    }
    .amolih-hero-banner {
      padding: 1.25rem 1.25rem;
      margin-bottom: 1.25rem;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .amolih-hero-title {
      font-size: 1.7rem;
    }
    .amolih-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      width: 100%;
      max-width: 100%;
      min-width: 0;
      gap: 1.25rem;
    }

    /* Transform Sidebar into Linear Horizontal Scrollable Pill Bar */
    .amolih-sidebar {
      position: sticky;
      top: 10px;
      z-index: 45;
      background: rgba(251, 248, 245, 0.96);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--amolih-border);
      border-radius: 16px;
      padding: 6px;
      box-shadow: 0 4px 18px rgba(53, 94, 89, 0.08);
      gap: 0;
      margin-bottom: 0.5rem;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
    }
    .amolih-sidebar-profile,
    .amolih-sidebar-concierge,
    .amolih-sidebar-logout {
      display: none !important;
    }

    .amolih-nav-scroll-wrapper {
      position: relative;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
    }
    .amolih-nav-scroll-track {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      gap: 8px;
      padding: 2px 2px;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      overscroll-behavior-x: contain;
      overscroll-behavior: contain;
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-snap-type: x proximity;
    }
    .amolih-nav-scroll-track::-webkit-scrollbar {
      display: none;
    }
    .amolih-main-pane {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .amolih-menu-item {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0.55rem 1.15rem;
      border-radius: 999px;
      background: #FFFFFF;
      border: 1px solid var(--amolih-border);
      font-size: 0.86rem;
      font-weight: 500;
      color: var(--amolih-text);
      scroll-snap-align: center;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: all 0.2s ease;
    }
    .amolih-menu-item:hover {
      transform: none;
      background: rgba(53, 94, 89, 0.05);
    }
    .amolih-menu-item.is-active {
      background: var(--amolih-primary) !important;
      color: #FFFFFF !important;
      border-color: var(--amolih-primary);
      box-shadow: 0 3px 12px rgba(53, 94, 89, 0.28);
      font-weight: 600;
    }
    .amolih-menu-label {
      gap: 6px;
    }
    .amolih-icon {
      width: auto;
      font-size: 0.95rem;
    }
    .amolih-badge {
      font-size: 0.68rem;
      padding: 0.15rem 0.5rem;
    }

    /* Mobile Footer Actions (Concierge & Logout) */
    .amolih-mobile-footer-strip {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.75rem;
    }
    .amolih-mobile-concierge-card {
      background: #FFFFFF;
      border: 1px solid var(--amolih-border);
      border-radius: var(--amolih-radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      text-align: center;
      align-items: center;
      box-shadow: var(--amolih-shadow-sm);
    }
  }

  @media (max-width: 640px) {
    .amolih-dashboard {
      padding: 0.85rem 0.75rem 3rem;
    }
    .amolih-hero-banner {
      padding: 1.15rem 1rem;
      margin-bottom: 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    .amolih-hero-title {
      font-size: 1.55rem;
    }
    .amolih-hero-stats {
      width: 100%;
      justify-content: flex-start;
    }
    .amolih-metrics-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px !important;
      margin-bottom: 1.25rem !important;
    }
    .amolih-metric-card {
      padding: 0.85rem 0.95rem !important;
    }
    .amolih-metric-val {
      font-size: 1.4rem !important;
    }
    .amolih-metric-label {
      font-size: 0.65rem !important;
    }
    .amolih-panel {
      padding: 1.25rem 1rem !important;
      border-radius: var(--amolih-radius) !important;
    }
    .amolih-pane-title {
      font-size: 1.45rem !important;
    }
    .amolih-order-card {
      padding: 1rem 1rem !important;
    }
    .amolih-order-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .amolih-order-price {
      font-size: 1.25rem !important;
    }
    .amolih-tier-milestones {
      font-size: 0.68rem;
    }
  }

  @media (max-width: 380px) {
    .amolih-metrics-grid {
      grid-template-columns: 1fr !important;
    }
    .amolih-menu-item {
      padding: 0.5rem 0.95rem;
      font-size: 0.82rem;
    }
  }

  /* Main Display Panel */
  .amolih-panel {
    background: var(--amolih-card-bg);
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius-lg);
    padding: 2.25rem 2.25rem;
    box-shadow: var(--amolih-shadow);
  }
  @media (max-width: 640px) {
    .amolih-panel { padding: 1.5rem 1.15rem; }
  }

  .amolih-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .amolih-pane-title {
    font-family: var(--amolih-heading-font);
    font-size: 1.85rem;
    font-weight: 400;
    color: var(--amolih-text);
    margin: 0;
    line-height: 1.2;
    letter-spacing: 0.02em;
  }
  .amolih-pane-subtitle {
    color: var(--amolih-text-muted);
    font-size: 0.92rem;
    margin: 0.25rem 0 0;
    font-family: var(--amolih-font-modern);
  }
  .amolih-divider {
    border: 0;
    border-bottom: 1px solid var(--amolih-border);
    margin: 1.25rem 0 1.75rem;
  }

  /* Metric Stat Cards Grid */
  .amolih-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.75rem;
  }
  .amolih-metric-card {
    background: #FAF7F2;
    border: 1px solid var(--amolih-gold-border);
    border-radius: var(--amolih-radius);
    padding: 1.15rem 1.25rem;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .amolih-metric-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--amolih-shadow);
  }
  .amolih-metric-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--amolih-gold-dark);
    margin-bottom: 0.35rem;
    font-family: var(--amolih-font-modern);
  }
  .amolih-metric-val {
    font-family: var(--amolih-heading-font);
    font-size: 1.85rem;
    font-weight: 400;
    color: var(--amolih-text);
    line-height: 1.15;
  }
  .amolih-metric-sub {
    font-size: 0.78rem;
    color: var(--amolih-text-muted);
    margin-top: 0.25rem;
  }

  /* Folio Profile Fields */
  .amolih-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 600px) {
    .amolih-fields { grid-template-columns: 1fr; }
  }
  .amolih-field-box {
    background: #FAF7F2;
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius-sm);
    padding: 1rem 1.15rem;
    transition: border-color 0.15s ease;
  }
  .amolih-field-box label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #78716C;
    margin-bottom: 0.3rem;
  }
  .amolih-field-val {
    font-size: 1rem;
    font-weight: 500;
    color: var(--amolih-text);
    word-break: break-word;
    font-family: var(--amolih-font-modern);
  }
  .amolih-span-2 { grid-column: 1 / -1; }

  /* Luxury Order Folio Cards */
  .amolih-order-card {
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius);
    padding: 1.35rem 1.5rem;
    background: #FFFFFF;
    margin-bottom: 1.25rem;
    box-shadow: var(--amolih-shadow-sm);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .amolih-order-card:hover {
    border-color: var(--amolih-gold);
    box-shadow: var(--amolih-shadow);
  }
  .amolih-order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.65rem;
  }
  .amolih-order-name {
    font-family: var(--amolih-heading-font);
    font-size: 1.4rem;
    font-weight: 400;
    color: var(--amolih-text);
    letter-spacing: 0.02em;
  }
  .amolih-order-meta {
    font-size: 0.85rem;
    color: var(--amolih-text-muted);
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .amolih-order-price {
    font-family: var(--amolih-heading-font);
    font-size: 1.35rem;
    font-weight: 400;
    color: var(--amolih-primary);
  }
  .amolih-status-pill {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.04em;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .amolih-status-pill.fulfilled {
    background: #ECFDF5;
    color: #065F46;
    border: 1px solid #A7F3D0;
  }
  .amolih-status-pill.unfulfilled {
    background: #FFFBEB;
    color: #92400E;
    border: 1px solid #FDE68A;
  }
  .amolih-status-pill.paid {
    background: #F0FDF4;
    color: #166534;
    border: 1px solid #BBF7D0;
  }

  /* Line Items Container */
  .amolih-order-items {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed var(--amolih-border);
    font-size: 0.92rem;
  }
  .amolih-line-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0;
    color: var(--amolih-text);
  }
  .amolih-line-item-title {
    font-family: var(--amolih-font-editorial);
    font-size: 1.05rem;
    font-weight: 500;
  }

  /* In-App Invoice View (Custlo Reference Standard) */
  .amolih-order-invoice-detail {
    margin-top: 0.5rem;
    display: none;
  }
  .amolih-order-invoice-detail.is-active {
    display: block !important;
  }
  .amolih-invoice-nav-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 10px;
  }
  .amolih-invoice-paper {
    background: #FFFFFF;
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius);
    padding: 2.25rem;
    box-shadow: var(--amolih-shadow);
    color: var(--amolih-text);
    position: relative;
  }
  @media (max-width: 640px) {
    .amolih-invoice-paper {
      padding: 1.25rem 1rem;
    }
  }
  .amolih-invoice-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.25rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--amolih-gold-border);
  }
  .amolih-invoice-brand {
    font-family: var(--amolih-heading-font);
    font-size: 2.2rem;
    font-weight: 400;
    color: var(--amolih-primary);
    letter-spacing: 0.06em;
    line-height: 1.1;
  }
  .amolih-invoice-brand-sub {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--amolih-gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-top: 3px;
  }
  .amolih-invoice-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 1.25rem;
    margin: 1.5rem 0;
    padding: 1.25rem;
    background: #FAF7F2;
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius-sm);
  }
  .amolih-invoice-meta-title {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--amolih-gold-dark);
    margin-bottom: 0.45rem;
    font-family: var(--amolih-font-modern);
  }
  .amolih-invoice-meta-body {
    font-size: 0.86rem;
    color: var(--amolih-text);
    line-height: 1.5;
  }
  .amolih-invoice-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    margin: 1.5rem 0;
  }
  .amolih-invoice-table th {
    background: #FAF7F2;
    border-top: 1px solid var(--amolih-border);
    border-bottom: 1px solid var(--amolih-border);
    padding: 0.75rem 0.85rem;
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--amolih-gold-dark);
    font-family: var(--amolih-font-modern);
  }
  .amolih-invoice-table td {
    padding: 0.95rem 0.85rem;
    border-bottom: 1px solid var(--amolih-border-light);
    font-size: 0.9rem;
    vertical-align: middle;
  }
  .amolih-invoice-calc-box {
    width: 100%;
    max-width: 380px;
    background: #FAF7F2;
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius-sm);
    padding: 1.25rem;
  }
  .amolih-invoice-calc-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.86rem;
    color: var(--amolih-text-muted);
    margin-bottom: 0.5rem;
  }
  .amolih-invoice-calc-total {
    border-top: 1px solid var(--amolih-gold-border);
    padding-top: 0.65rem;
    margin-top: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  @media print {
    @page {
      size: portrait;
      margin: 10mm 12mm;
    }
    html, body {
      background: #FFFFFF !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      min-height: 0 !important;
    }
    /* Hide ALL theme and page elements */
    header, footer, nav, aside,
    .header, .footer, .announcement-bar,
    #shopify-section-header, #shopify-section-footer, .shopify-section,
    .amolih-sidebar, #amolih-sidebar,
    .amolih-hero-banner,
    .amolih-nav-menu,
    .amolih-nav-scroll-wrapper,
    .amolih-sidebar-profile,
    .amolih-sidebar-logout,
    .amolih-mobile-nav,
    .amolih-mobile-footer-strip,
    .amolih-panel-header,
    .amolih-divider,
    #amolih-orders-list-view,
    .amolih-invoice-nav-bar,
    .amolih-btn-sm,
    .amolih-button,
    .amolih-button-secondary {
      display: none !important;
    }
    #amolih-portal-container,
    .amolih-dashboard,
    .amolih-layout,
    .amolih-main-pane,
    .amolih-main-content,
    .amolih-panel {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      max-width: 100% !important;
      width: 100% !important;
    }
    .amolih-order-invoice-detail {
      display: none !important;
    }
    .amolih-order-invoice-detail.is-active {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    .amolih-invoice-paper {
      box-shadow: none !important;
      border: 1px solid #D1D5DB !important;
      border-radius: 6px !important;
      padding: 16px 18px !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      page-break-inside: avoid;
    }
    .amolih-invoice-header {
      padding-bottom: 10px !important;
    }
    .amolih-invoice-brand {
      font-size: 24px !important;
    }
    .amolih-invoice-meta-grid {
      margin: 10px 0 !important;
      padding: 8px 12px !important;
      gap: 10px !important;
      background: #F9FAFB !important;
      border: 1px solid #E5E7EB !important;
    }
    .amolih-invoice-meta-title {
      font-size: 9px !important;
      margin-bottom: 2px !important;
    }
    .amolih-invoice-meta-body {
      font-size: 11px !important;
      line-height: 1.35 !important;
    }
    .amolih-invoice-table {
      margin: 10px 0 !important;
    }
    .amolih-invoice-table th {
      padding: 6px 8px !important;
      font-size: 10px !important;
      background: #F3F4F6 !important;
    }
    .amolih-invoice-table td {
      padding: 6px 8px !important;
      font-size: 11px !important;
    }
    .amolih-invoice-calc-box {
      padding: 8px 12px !important;
      max-width: 290px !important;
      background: #F9FAFB !important;
      border: 1px solid #E5E7EB !important;
    }
    .amolih-invoice-calc-row {
      margin-bottom: 3px !important;
      font-size: 11px !important;
    }
    .amolih-invoice-calc-total {
      padding-top: 4px !important;
      margin-top: 3px !important;
    }
    .amolih-invoice-footer-strip {
      margin-top: 10px !important;
      padding-top: 8px !important;
    }
  }

  /* Luxury Buttons */
  .amolih-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--amolih-primary);
    color: #FFFFFF !important;
    text-decoration: none;
    padding: 0.75rem 1.5rem;
    border-radius: var(--amolih-radius-sm);
    font-size: 0.92rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(53, 94, 89, 0.2);
    transition: all 0.2s ease;
  }
  .amolih-button:hover {
    background: var(--amolih-primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(53, 94, 89, 0.3);
  }
  .amolih-button-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #FFFFFF;
    color: var(--amolih-text) !important;
    text-decoration: none;
    padding: 0.65rem 1.25rem;
    border-radius: var(--amolih-radius-sm);
    font-size: 0.88rem;
    font-weight: 500;
    line-height: 1;
    border: 1px solid var(--amolih-border);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .amolih-button-secondary:hover {
    background: #FAF7F2;
    border-color: var(--amolih-gold);
    color: var(--amolih-primary) !important;
  }
  .amolih-btn-sm {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0.4rem 0.75rem;
    font-size: 0.82rem;
    border-radius: 6px;
    border: 1px solid var(--amolih-border);
    background: #FFFFFF;
    color: var(--amolih-text);
    cursor: pointer;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.15s;
  }
  .amolih-btn-sm:hover {
    background: #FAF7F2;
    border-color: var(--amolih-gold);
  }
  .amolih-btn-danger {
    color: #DC2626 !important;
    border-color: #FECACA !important;
  }
  .amolih-btn-danger:hover {
    background: #FEF2F2 !important;
  }

  /* Form Grid & Inputs */
  .amolih-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  @media (max-width: 600px) {
    .amolih-form-grid { grid-template-columns: 1fr; }
  }
  .amolih-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .amolih-form-group label {
    font-size: 0.76rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #57534E;
  }
  .amolih-input {
    width: 100%;
    padding: 0.75rem 0.95rem;
    border: 1px solid var(--amolih-border);
    border-radius: var(--amolih-radius-sm);
    font-size: 0.95rem;
    background: #FFFFFF;
    color: var(--amolih-text);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .amolih-input:focus {
    outline: none;
    border-color: var(--amolih-primary);
    box-shadow: 0 0 0 3px rgba(53, 94, 89, 0.12);
  }
  .amolih-help-text {
    font-size: 0.75rem;
    color: var(--amolih-text-muted);
  }
  .amolih-form-actions {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-top: 1.5rem;
  }

  /* Alerts */
  .amolih-alert {
    padding: 0.95rem 1.25rem;
    border-radius: var(--amolih-radius-sm);
    margin-bottom: 1.5rem;
    font-size: 0.92rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .amolih-alert-success {
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    color: #065F46;
  }
  .amolih-alert-error {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #991B1B;
  }

  /* Loyalty Progress Bar */
  .amolih-loyalty-container {
    background: linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 100%);
    border: 1px solid var(--amolih-gold-border);
    border-radius: var(--amolih-radius);
    padding: 1.75rem;
    margin-bottom: 1.5rem;
  }
  .amolih-progress-track {
    width: 100%;
    height: 12px;
    background: #E7DFD5;
    border-radius: 999px;
    overflow: hidden;
    margin: 1.25rem 0 0.65rem 0;
  }
  .amolih-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--amolih-primary) 0%, var(--amolih-gold) 60%, var(--amolih-primary) 100%);
    border-radius: 999px;
    transition: width 0.6s ease;
  }
  .amolih-tier-milestones {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--amolih-gold-dark);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .amolih-spinner {
    display: inline-block;
    width: 28px;
    height: 28px;
    border: 3px solid #E2E8F0;
    border-top-color: var(--amolih-primary);
    border-radius: 50%;
    animation: amolih-spin 0.8s linear infinite;
  }
  @keyframes amolih-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>

<section class="amolih-dashboard">
  <!-- Luxury Amolih Hero Banner -->
  <div class="amolih-hero-banner">
    <div>
      {% if customer %}
        <h1 class="amolih-hero-title">${welcome}, {{ customer.first_name | default: customer.email | escape }}</h1>
      {% else %}
        <h1 class="amolih-hero-title">${title}</h1>
      {% endif %}
    </div>

    {% if customer %}
      <div class="amolih-hero-stats">
        <div class="amolih-avatar-circle" title="{{ customer.name | escape }}">
          {{ customer.first_name | slice: 0 | upcase }}{{ customer.last_name | slice: 0 | upcase }}
        </div>
      </div>
    {% endif %}
  </div>

  ${successMessage ? `<div class="amolih-alert amolih-alert-success"><span>✓</span> <span>${escapeHtml(successMessage)}</span></div>` : ""}
  ${errorMessage ? `<div class="amolih-alert amolih-alert-error"><span>⚠</span> <span>${escapeHtml(errorMessage)}</span></div>` : ""}

  <div class="amolih-layout">
    <!-- Left Navigation Sidebar -->
    <aside class="amolih-sidebar">
      {% if customer %}
        <div class="amolih-sidebar-profile">
          <div class="amolih-avatar-circle" style="width:40px; height:40px; font-size:1.05rem;">
            {{ customer.first_name | slice: 0 | upcase }}{{ customer.last_name | slice: 0 | upcase }}
          </div>
          <div style="min-width:0;">
            <div class="amolih-sidebar-name">{{ customer.first_name | default: "Valued" | escape }} {{ customer.last_name | default: "Client" | escape }}</div>
            <div class="amolih-sidebar-email">{{ customer.email | escape }}</div>
          </div>
        </div>
      {% endif %}

      <div class="amolih-nav-scroll-wrapper">
        <nav class="amolih-nav-scroll-track" aria-label="Account Navigation">
          ${menuHtml}
        </nav>
      </div>

      <div class="amolih-sidebar-logout">
        <a href="/account/logout" class="amolih-logout-link">
          <span>🚪</span> <span>Sign out of account</span>
        </a>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="amolih-main-pane">
      {% unless customer %}
        <div class="amolih-panel" style="text-align:center; padding:3.5rem 1.5rem;">
          <div style="font-size:3rem; margin-bottom:1rem;">✦</div>
          <h2 class="amolih-pane-title">Sign in Required</h2>
          <p class="amolih-pane-subtitle" style="max-width:440px; margin:0.5rem auto 1.5rem;">
            Please sign in to access your bespoke Jaipur fine jewelry orders, saved shipping locations, and VIP privileges.
          </p>
          <div>
            <a class="amolih-button" href="/account/login">Sign in to Amolih</a>
          </div>
        </div>
      {% else %}
        ${panelHtml}

        <!-- Mobile Concierge & Sign-out Strip (Visible only on mobile) -->
        <div class="amolih-mobile-footer-strip">
          <div style="text-align:center; padding:0.5rem 0 1rem;">
            <a href="/account/logout" class="amolih-logout-link" style="justify-content:center;">
              <span>🚪</span> <span>Sign out of account</span>
            </a>
          </div>
        </div>
      {% endunless %}
    </main>
  </div>
</section>

<script>
  (function() {
    // 0. Horizontal Scroll & Gesture Containment (prevents whole screen from moving on swipe)
    var track = document.querySelector(".amolih-nav-scroll-track");
    if (track) {
      var startX = 0;
      var startY = 0;
      track.addEventListener("touchstart", function(e) {
        if (e.touches && e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }
      }, { passive: true });

      track.addEventListener("touchmove", function(e) {
        if (e.touches && e.touches.length === 1) {
          var dx = Math.abs(e.touches[0].clientX - startX);
          var dy = Math.abs(e.touches[0].clientY - startY);
          if (dx > dy && dx > 3) {
            // Isolate horizontal swipe inside navbar, stopping screen navigation / drawer dragging
            e.stopPropagation();
          }
        }
      }, { passive: false });

      // Mouse drag-to-scroll support for desktop / dev simulation
      var isDown = false;
      var mouseStartX = 0;
      var scrollInitial = 0;
      track.addEventListener("mousedown", function(e) {
        isDown = true;
        mouseStartX = e.pageX - track.offsetLeft;
        scrollInitial = track.scrollLeft;
      });
      window.addEventListener("mouseup", function() { isDown = false; });
      track.addEventListener("mousemove", function(e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - track.offsetLeft;
        var walk = (x - mouseStartX) * 1.5;
        track.scrollLeft = scrollInitial - walk;
      });
    }

    // Auto-center Active Menu Item in Horizontal Linear Nav (Mobile View)
    var activeMenuItem = document.querySelector(".amolih-nav-scroll-track .amolih-menu-item.is-active");
    if (activeMenuItem) {
      setTimeout(function() {
        activeMenuItem.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      }, 150);
    }
    // 1. Profile Edit Toggle
    var editProfBtn = document.getElementById("amolih-toggle-edit-profile");
    var cancelProfBtn = document.getElementById("amolih-cancel-edit-profile");
    var profView = document.getElementById("amolih-profile-view");
    var profEdit = document.getElementById("amolih-profile-edit");

    if (editProfBtn && profView && profEdit) {
      editProfBtn.addEventListener("click", function() {
        profView.style.display = "none";
        profEdit.style.display = "block";
        editProfBtn.style.display = "none";
      });
    }

    if (cancelProfBtn && profView && profEdit) {
      cancelProfBtn.addEventListener("click", function() {
        profEdit.style.display = "none";
        profView.style.display = "block";
        if (editProfBtn) editProfBtn.style.display = "inline-flex";
      });
    }

    // 2. Add Address Toggle
    var openAddAddrBtn = document.getElementById("amolih-open-add-address-btn");
    var closeAddAddrBtn = document.getElementById("amolih-close-add-address-btn");
    var addAddrBox = document.getElementById("amolih-add-address-box");

    if (openAddAddrBtn && addAddrBox) {
      openAddAddrBtn.addEventListener("click", function() {
        addAddrBox.style.display = "block";
        openAddAddrBtn.style.display = "none";
      });
    }

    if (closeAddAddrBtn && addAddrBox) {
      closeAddAddrBtn.addEventListener("click", function() {
        addAddrBox.style.display = "none";
        if (openAddAddrBtn) openAddAddrBtn.style.display = "inline-flex";
      });
    }

    // 3. Edit Address Toggles
    document.querySelectorAll(".amolih-btn-edit-addr").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var addrId = this.getAttribute("data-id");
        var form = document.getElementById("addr-edit-form-" + addrId);
        if (form) {
          form.style.display = form.style.display === "none" ? "block" : "none";
        }
      });
    });

    document.querySelectorAll(".amolih-cancel-addr-edit").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var addrId = this.getAttribute("data-id");
        var form = document.getElementById("addr-edit-form-" + addrId);
        if (form) form.style.display = "none";
      });
    });

    // 4. Enhanced AJAX Submission for Forms
    var forms = document.querySelectorAll("#amolih-profile-form, .amolih-ajax-form");
    forms.forEach(function(form) {
      form.addEventListener("submit", function(e) {
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute("data-orig-text", submitBtn.innerHTML);
          submitBtn.innerHTML = "Saving...";
        }
      });
    });

    // 5. Dynamic Currency and Price Number Formatting
    function formatMoneyNumber(rawVal, currency) {
      if (!rawVal) return rawVal;
      var clean = String(rawVal).replace(/[^0-9.]/g, "");
      var num = parseFloat(clean);
      if (isNaN(num)) return rawVal;
      var locale = "en-US";
      if (currency === "INR") locale = "en-IN";
      else if (currency === "GBP") locale = "en-GB";
      return num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    document.querySelectorAll(".amolih-order-total-price, .amolih-line-price, .amolih-total-spent-val").forEach(function(el) {
      var curr = el.getAttribute("data-currency");
      var sym = el.getAttribute("data-symbol");
      var rawAmt = el.getAttribute("data-amount");
      if (curr && sym && rawAmt) {
        var formattedNum = formatMoneyNumber(rawAmt, curr);
        el.textContent = sym + formattedNum;
      }
    });

    // 6. Custlo-Style In-App Invoice Navigation & Print Logic (Robust Delegated Architecture)
    function findInvoiceElement(orderId, orderName, orderIndex, clickedBtn) {
      var cleanId = (orderId || "").toString().trim();
      var cleanName = (orderName || "").toString().trim();
      var cleanIdx = (orderIndex || "").toString().trim();
      var digitsTarget = cleanId.replace(/\D/g, "");

      var target = null;

      // 1. If clicked button is passed, directly grab sibling invoice view
      if (clickedBtn && clickedBtn.closest) {
        var card = clickedBtn.closest(".amolih-order-card");
        if (card) {
          var next = card.nextElementSibling;
          while (next) {
            if (next.classList && next.classList.contains("amolih-order-invoice-detail")) {
              target = next;
              break;
            }
            next = next.nextElementSibling;
          }
        }
      }

      // 2. Direct ID or data attribute lookup
      if (!target && cleanId) {
        target = document.getElementById("amolih-invoice-view-" + cleanId) ||
                 document.querySelector('.amolih-order-invoice-detail[data-order-id="' + cleanId + '"]') ||
                 document.querySelector('.amolih-order-invoice-detail[id*="' + cleanId + '"]');
      }
      if (!target && digitsTarget) {
        target = document.querySelector('.amolih-order-invoice-detail[data-order-number="' + digitsTarget + '"]') ||
                 document.querySelector('.amolih-order-invoice-detail[data-order-name*="' + digitsTarget + '"]');
      }
      if (!target && cleanName) {
        target = document.querySelector('.amolih-order-invoice-detail[data-order-name="' + cleanName + '"]');
      }
      if (!target && cleanIdx) {
        target = document.querySelector('.amolih-order-invoice-detail[data-order-index="' + cleanIdx + '"]');
      }
      if (!target) {
        var allInvoices = document.querySelectorAll(".amolih-order-invoice-detail");
        if (allInvoices.length === 1) {
          target = allInvoices[0];
        } else if (cleanIdx) {
          var num = parseInt(cleanIdx, 10);
          if (!isNaN(num) && allInvoices[num - 1]) target = allInvoices[num - 1];
        }
      }
      if (!target && clickedBtn) {
        var allBtns = Array.prototype.slice.call(document.querySelectorAll(".amolih-btn-view-invoice"));
        var btnIdx = allBtns.indexOf(clickedBtn);
        var allInv = document.querySelectorAll(".amolih-order-invoice-detail");
        if (btnIdx >= 0 && allInv[btnIdx]) target = allInv[btnIdx];
      }
      if (!target) {
        target = document.querySelector(".amolih-order-invoice-detail");
      }
      return target;
    }

    function showInvoiceDetail(orderId, orderName, orderIndex, clickedBtn) {
      var target = findInvoiceElement(orderId, orderName, orderIndex, clickedBtn);

      if (target) {
        // Hide all order cards so only the invoice is displayed
        document.querySelectorAll(".amolih-order-card").forEach(function(card) {
          card.style.setProperty("display", "none", "important");
        });
        // Hide any other active invoices
        document.querySelectorAll(".amolih-order-invoice-detail").forEach(function(el) {
          el.style.setProperty("display", "none", "important");
          el.classList.remove("is-active");
        });
        // Display the selected invoice
        target.style.setProperty("display", "block", "important");
        target.classList.add("is-active");

        var ordersContainer = document.getElementById("amolih-orders-container") || document.getElementById("amolih-orders-list-view");
        if (ordersContainer) ordersContainer.classList.add("in-invoice-mode");

        window.scrollTo({ top: target.offsetTop - 30, behavior: "smooth" });

        var ref = (orderId || orderName || orderIndex || "").toString().trim();
        if (ref) {
          try {
            history.pushState({ invoiceOrderId: ref }, "", "#invoice-" + encodeURIComponent(ref));
          } catch(e) {}
        }
      }
    }

    function hideInvoiceDetail() {
      // Hide all invoices
      document.querySelectorAll(".amolih-order-invoice-detail").forEach(function(el) {
        el.style.setProperty("display", "none", "important");
        el.classList.remove("is-active");
      });
      // Restore all order cards
      document.querySelectorAll(".amolih-order-card").forEach(function(card) {
        card.style.setProperty("display", "block", "important");
      });

      var ordersContainer = document.getElementById("amolih-orders-container") || document.getElementById("amolih-orders-list-view");
      if (ordersContainer) ordersContainer.classList.remove("in-invoice-mode");

      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        var cleanUrl = window.location.pathname + window.location.search.replace(/[?&]invoice=[^&]*/g, "");
        history.pushState(null, "", cleanUrl);
      } catch(e) {}
    }

    function printOrderInvoice(orderId, orderIndex) {
      var cleanId = (orderId || "").toString().trim();
      var cleanIdx = (orderIndex || "").toString().trim();
      var docEl = null;

      if (cleanId) {
        docEl = document.getElementById("amolih-invoice-doc-" + cleanId) ||
                document.querySelector('.amolih-invoice-paper[data-order-id="' + cleanId + '"]');
      }
      if (!docEl && cleanIdx) {
        docEl = document.querySelector('.amolih-invoice-paper[data-order-index="' + cleanIdx + '"]');
      }
      if (!docEl) {
        docEl = document.querySelector(".amolih-order-invoice-detail.is-active .amolih-invoice-paper") ||
                document.querySelector(".amolih-invoice-paper");
      }

      if (!docEl) {
        window.print();
        return;
      }

      var orderName = docEl.getAttribute("data-order-name") || ("#" + (cleanId || "Invoice"));
      var iframe = document.getElementById("amolih-print-iframe");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "amolih-print-iframe";
        iframe.style.position = "fixed";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }
      var iframeDoc = iframe.contentWindow || iframe.contentDocument;
      if (iframeDoc.document) iframeDoc = iframeDoc.document;

      var printStyles = "" +
        "@page { size: portrait; margin: 10mm 12mm; }\n" +
        "* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n" +
        "html, body { margin: 0; padding: 0; background: #FFFFFF !important; color: #1A1A1A; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.35; }\n" +
        ".amolih-invoice-paper { box-sizing: border-box; border: 1px solid #D5C7B2 !important; border-radius: 6px !important; padding: 16px 20px !important; background: #FFFFFF !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; box-shadow: none !important; }\n" +
        ".amolih-invoice-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px !important; border-bottom: 1px solid rgba(197, 168, 128, 0.4) !important; margin-bottom: 10px !important; }\n" +
        ".amolih-invoice-brand { font-family: 'Bellefair', Georgia, serif; font-size: 24px !important; color: #355E59 !important; letter-spacing: 0.05em; line-height: 1.1; }\n" +
        ".amolih-invoice-meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px !important; margin: 10px 0 !important; padding: 8px 12px !important; background: #FAF7F2 !important; border: 1px solid #E8E3DD !important; border-radius: 6px !important; }\n" +
        ".amolih-invoice-meta-title { font-size: 9px !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #A8895E !important; margin-bottom: 2px !important; }\n" +
        ".amolih-invoice-meta-body { font-size: 10.5px !important; line-height: 1.35 !important; color: #475569 !important; }\n" +
        ".amolih-invoice-table { width: 100%; border-collapse: collapse; margin: 10px 0 !important; }\n" +
        ".amolih-invoice-table th { background: #FAF7F2 !important; border-top: 1px solid #E8E3DD !important; border-bottom: 1px solid #E8E3DD !important; padding: 5px 8px !important; font-size: 9.5px !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #A8895E !important; }\n" +
        ".amolih-invoice-table td { padding: 5px 8px !important; border-bottom: 1px solid #F1EDE8 !important; font-size: 10.5px !important; vertical-align: middle; }\n" +
        ".amolih-status-pill { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 600; line-height: 1.3; }\n" +
        ".amolih-status-pill.paid, .amolih-status-pill.fulfilled { background: #EBF8F1 !important; color: #14532D !important; border: 1px solid #BBF7D0 !important; }\n" +
        ".amolih-status-pill.unfulfilled { background: #FEF9EE !important; color: #854D0E !important; border: 1px solid #FDE68A !important; }\n" +
        ".amolih-invoice-calc-box { width: 100%; max-width: 290px; background: #FAF7F2 !important; border: 1px solid #E8E3DD !important; border-radius: 6px !important; padding: 8px 12px !important; page-break-inside: avoid; break-inside: avoid; }\n" +
        ".amolih-invoice-calc-row { display: flex; justify-content: space-between; font-size: 10.5px; color: #475569; margin-bottom: 3px; }\n" +
        ".amolih-invoice-calc-total { border-top: 1px solid rgba(197, 168, 128, 0.4); padding-top: 4px; margin-top: 3px; display: flex; justify-content: space-between; align-items: baseline; }\n" +
        ".amolih-invoice-footer-strip { border-top: 1px dashed rgba(197, 168, 128, 0.4); padding-top: 8px !important; margin-top: 10px !important; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748B; page-break-inside: avoid; break-inside: avoid; }\n";

      iframeDoc.open();
      iframeDoc.write('<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice - ' + orderName + ' - Amolih</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bellefair&family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + printStyles + '</style></head><body>' + docEl.outerHTML + '</body></html>');
      iframeDoc.close();

      setTimeout(function() {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch(err) {
          window.print();
        }
      }, 300);
    }

    // Expose functions globally for direct inline onclick invocations
    window.showInvoiceDetail = showInvoiceDetail;
    window.hideInvoiceDetail = hideInvoiceDetail;
    window.printOrderInvoice = printOrderInvoice;

    // Direct button listener binder
    function amolihBindButtons() {
      document.querySelectorAll(".amolih-btn-view-invoice").forEach(function(btn) {
        btn.onclick = function(e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          var orderId = this.getAttribute("data-order-id");
          var orderName = this.getAttribute("data-order-name");
          var orderIndex = this.getAttribute("data-order-index");
          showInvoiceDetail(orderId, orderName, orderIndex, this);
          return false;
        };
      });
      document.querySelectorAll(".amolih-btn-back-to-orders").forEach(function(btn) {
        btn.onclick = function(e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          hideInvoiceDetail();
          return false;
        };
      });
      document.querySelectorAll(".amolih-btn-print-invoice").forEach(function(btn) {
        btn.onclick = function(e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          var orderId = this.getAttribute("data-order-id");
          var orderIndex = this.getAttribute("data-order-index");
          printOrderInvoice(orderId, orderIndex);
          return false;
        };
      });
    }

    amolihBindButtons();
    document.addEventListener("DOMContentLoaded", amolihBindButtons);
    setTimeout(amolihBindButtons, 100);
    setTimeout(amolihBindButtons, 500);

    // Delegated Global Event Listeners in CAPTURE phase (prevents theme scripts from blocking click)
    document.addEventListener("click", function(e) {
      var el = e.target;
      if (el && el.nodeType === 3) el = el.parentElement;
      if (!el || !el.closest) return;

      var viewBtn = el.closest(".amolih-btn-view-invoice");
      if (viewBtn) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        var orderId = viewBtn.getAttribute("data-order-id");
        var orderName = viewBtn.getAttribute("data-order-name");
        var orderIndex = viewBtn.getAttribute("data-order-index");
        showInvoiceDetail(orderId, orderName, orderIndex, viewBtn);
        return false;
      }

      var backBtn = el.closest(".amolih-btn-back-to-orders");
      if (backBtn) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        hideInvoiceDetail();
        return false;
      }

      var printBtn = el.closest(".amolih-btn-print-invoice");
      if (printBtn) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        var orderId = printBtn.getAttribute("data-order-id");
        var orderIndex = printBtn.getAttribute("data-order-index");
        printOrderInvoice(orderId, orderIndex);
        return false;
      }
    }, true);

    function checkInvoiceHash() {
      if (window.location.hash && window.location.hash.indexOf("#invoice-") === 0) {
        var hashVal = decodeURIComponent(window.location.hash.replace("#invoice-", "")).trim();
        showInvoiceDetail(hashVal, hashVal, hashVal);
      } else {
        var urlParams = new URLSearchParams(window.location.search);
        var qOrderId = urlParams.get("order_id") || urlParams.get("invoice");
        if (qOrderId) {
          showInvoiceDetail(qOrderId, qOrderId, qOrderId);
        }
      }
    }

    window.addEventListener("hashchange", checkInvoiceHash);
    window.addEventListener("popstate", function() {
      if (window.location.hash && window.location.hash.indexOf("#invoice-") === 0) {
        checkInvoiceHash();
      } else {
        hideInvoiceDetail();
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", checkInvoiceHash);
    } else {
      setTimeout(checkInvoiceHash, 60);
    }
  })();
</script>`;
}

function renderPanelLiquid(
  activeTab: string,
  menuItems: MenuItem[],
  circleTitle: string,
  circlePageUrl: string,
  pathPrefix: string,
) {
  // 1. ORDERS HISTORY (MODERN LUXURY VIEWS)
  if (activeTab === "orders") {
    return `<div class="amolih-panel">
  <script>
    (function() {
      window.showInvoiceDetail = function(orderId, orderName, orderIndex, clickedBtn) {
        var cleanId = (orderId || "").toString().trim();
        var cleanName = (orderName || "").toString().trim();
        var cleanIdx = (orderIndex || "").toString().trim();
        var digitsTarget = cleanId.replace(/\\D/g, "") || cleanName.replace(/\\D/g, "");

        var target = null;

        // 1. Sibling traversal from button
        if (clickedBtn && clickedBtn.closest) {
          var card = clickedBtn.closest(".amolih-order-card");
          if (card) {
            var next = card.nextElementSibling;
            while (next) {
              if (next.classList && next.classList.contains("amolih-order-invoice-detail")) {
                target = next;
                break;
              }
              next = next.nextElementSibling;
            }
          }
        }

        // 2. Direct ID or data attribute lookup
        if (!target && cleanId) {
          target = document.getElementById("amolih-invoice-view-" + cleanId) ||
                   document.querySelector('.amolih-order-invoice-detail[data-order-id="' + cleanId + '"]') ||
                   document.querySelector('.amolih-order-invoice-detail[id*="' + cleanId + '"]');
        }
        if (!target && digitsTarget) {
          target = document.querySelector('.amolih-order-invoice-detail[data-order-number="' + digitsTarget + '"]') ||
                   document.querySelector('.amolih-order-invoice-detail[data-order-name*="' + digitsTarget + '"]') ||
                   document.querySelector('.amolih-order-invoice-detail[id*="' + digitsTarget + '"]');
        }
        if (!target && cleanName) {
          target = document.querySelector('.amolih-order-invoice-detail[data-order-name="' + cleanName + '"]');
        }
        if (!target && cleanIdx) {
          target = document.querySelector('.amolih-order-invoice-detail[data-order-index="' + cleanIdx + '"]');
        }
        if (!target) {
          var allInvoices = document.querySelectorAll(".amolih-order-invoice-detail");
          if (allInvoices.length === 1) {
            target = allInvoices[0];
          } else if (cleanIdx) {
            var num = parseInt(cleanIdx, 10);
            if (!isNaN(num) && allInvoices[num - 1]) target = allInvoices[num - 1];
          }
        }
        if (!target && clickedBtn) {
          var allBtns = Array.prototype.slice.call(document.querySelectorAll(".amolih-btn-view-invoice"));
          var bIdx = allBtns.indexOf(clickedBtn);
          var allInv = document.querySelectorAll(".amolih-order-invoice-detail");
          if (bIdx >= 0 && allInv[bIdx]) target = allInv[bIdx];
        }
        if (!target) {
          target = document.querySelector(".amolih-order-invoice-detail");
        }

        if (target) {
          // Hide all order cards so only the invoice is displayed
          document.querySelectorAll(".amolih-order-card").forEach(function(c) {
            c.style.setProperty("display", "none", "important");
          });
          // Hide any other active invoices
          document.querySelectorAll(".amolih-order-invoice-detail").forEach(function(el) {
            el.style.setProperty("display", "none", "important");
            el.classList.remove("is-active");
          });
          // Display the selected invoice
          target.style.setProperty("display", "block", "important");
          target.classList.add("is-active");

          window.scrollTo({ top: target.offsetTop - 30, behavior: "smooth" });

          var ref = (cleanName || digitsTarget || cleanId || cleanIdx).toString().trim();
          if (ref) {
            try { history.pushState({ invoiceOrderId: ref }, "", "#invoice-" + encodeURIComponent(ref)); } catch(e) {}
          }
        }
      };

      window.hideInvoiceDetail = function() {
        document.querySelectorAll(".amolih-order-invoice-detail").forEach(function(el) {
          el.style.setProperty("display", "none", "important");
          el.classList.remove("is-active");
        });
        document.querySelectorAll(".amolih-order-card").forEach(function(c) {
          c.style.setProperty("display", "block", "important");
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        try {
          var cleanUrl = window.location.pathname + window.location.search.replace(/[?&]invoice=[^&]*/g, "");
          history.pushState(null, "", cleanUrl);
        } catch(e) {}
      };

      function amolihBindOrderButtons() {
        document.querySelectorAll(".amolih-btn-view-invoice").forEach(function(btn) {
          btn.onclick = function(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            var oId = this.getAttribute("data-order-id");
            var oName = this.getAttribute("data-order-name");
            var oIdx = this.getAttribute("data-order-index");
            window.showInvoiceDetail(oId, oName, oIdx, this);
            return false;
          };
        });
        document.querySelectorAll(".amolih-btn-back-to-orders").forEach(function(btn) {
          btn.onclick = function(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            window.hideInvoiceDetail();
            return false;
          };
        });
        document.querySelectorAll(".amolih-btn-print-invoice").forEach(function(btn) {
          btn.onclick = function(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            var oId = this.getAttribute("data-order-id");
            var oIdx = this.getAttribute("data-order-index");
            if (window.printOrderInvoice) window.printOrderInvoice(oId, oIdx);
            return false;
          };
        });
      }

      amolihBindOrderButtons();
      document.addEventListener("DOMContentLoaded", amolihBindOrderButtons);
      setTimeout(amolihBindOrderButtons, 100);
      setTimeout(amolihBindOrderButtons, 400);

      document.addEventListener("click", function(e) {
        var el = e.target;
        if (el && el.nodeType === 3) el = el.parentElement;
        if (!el || !el.closest) return;

        var vBtn = el.closest(".amolih-btn-view-invoice");
        if (vBtn) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          var oId = vBtn.getAttribute("data-order-id");
          var oName = vBtn.getAttribute("data-order-name");
          var oIdx = vBtn.getAttribute("data-order-index");
          window.showInvoiceDetail(oId, oName, oIdx, vBtn);
          return false;
        }

        var bBtn = el.closest(".amolih-btn-back-to-orders");
        if (bBtn) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          window.hideInvoiceDetail();
          return false;
        }

        var pBtn = el.closest(".amolih-btn-print-invoice");
        if (pBtn) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          var oId = pBtn.getAttribute("data-order-id");
          var oIdx = pBtn.getAttribute("data-order-index");
          if (window.printOrderInvoice) window.printOrderInvoice(oId, oIdx);
          return false;
        }
      }, true);
    })();
  </script>
  <div class="amolih-panel-header">
    <div>
      <h2 class="amolih-pane-title">Orders History</h2>
      <p class="amolih-pane-subtitle">{{ customer.orders.size }} {% if customer.orders.size == 1 %}order{% else %}orders{% endif %} recorded in your account.</p>
    </div>
    {% if customer.orders.size > 0 %}
      <a href="/collections/all" class="amolih-button-secondary" style="font-size:0.84rem; padding:0.5rem 1rem;">
        Explore New Arrivals ↗
      </a>
    {% endif %}
  </div>
  <hr class="amolih-divider" />

  {% if customer.orders.size == 0 %}
    <div style="text-align:center; padding:3.5rem 1.5rem; background:#FAF7F2; border:1px dashed var(--amolih-gold-border); border-radius:var(--amolih-radius);">
      <div style="font-size:3rem; margin-bottom:0.75rem;">💎</div>
      <h3 style="font-family:var(--amolih-heading-font); font-size:1.6rem; margin:0 0 0.5rem; font-weight:400;">Your Jewelry Box is Waiting</h3>
      <p class="amolih-pane-subtitle" style="max-width:420px; margin:0 auto 1.5rem;">
        Explore our latest handcrafted fine jewelry, bespoke charms, and personalized pieces.
      </p>
      <a href="/collections/all" class="amolih-button">Explore Collection</a>
    </div>
  {% else %}
    <div id="amolih-orders-list-view">
      {% for order in customer.orders %}
        {% assign order_curr = order.total_price_set.presentment_money.currency_code | default: order.currency %}
        {% if order_curr == blank or order_curr == 'USD' %}
          {% if order.shipping_address.country_code == 'IN' or order.billing_address.country_code == 'IN' or customer.default_address.country_code == 'IN' or customer.default_address.country == 'India' %}
            {% assign order_curr = 'INR' %}
          {% elsif order.shipping_address.country_code == 'GB' or order.billing_address.country_code == 'GB' or order.shipping_address.country_code == 'UK' or customer.default_address.country_code == 'GB' or customer.default_address.country == 'United Kingdom' %}
            {% assign order_curr = 'GBP' %}
          {% elsif order.shipping_address.country_code == 'US' or order.billing_address.country_code == 'US' or customer.default_address.country_code == 'US' or customer.default_address.country == 'United States' %}
            {% assign order_curr = 'USD' %}
          {% endif %}
        {% endif %}
        {% assign order_curr = order_curr | default: 'USD' | upcase %}
        {% case order_curr %}
          {% when 'INR' %}
            {% assign curr_symbol = '₹' %}
          {% when 'GBP' %}
            {% assign curr_symbol = '£' %}
          {% when 'USD' %}
            {% assign curr_symbol = '$' %}
          {% when 'EUR' %}
            {% assign curr_symbol = '€' %}
          {% when 'CAD' %}
            {% assign curr_symbol = 'CA$' %}
          {% when 'AUD' %}
            {% assign curr_symbol = 'AU$' %}
          {% when 'JPY' %}
            {% assign curr_symbol = '¥' %}
          {% when 'AED' %}
            {% assign curr_symbol = 'AED ' %}
          {% when 'SAR' %}
            {% assign curr_symbol = 'SAR ' %}
          {% else %}
            {% assign curr_symbol = order_curr | append: ' ' %}
        {% endcase %}
        {% if order.total_price_set.presentment_money.amount != blank %}
          {% assign order_total = order.total_price_set.presentment_money.amount %}
        {% else %}
          {% assign order_total = order.total_price | money_without_currency %}
        {% endif %}

        <article class="amolih-order-card" id="amolih-order-card-{{ order.id }}" data-order-id="{{ order.id }}" data-order-name="{{ order.name | escape }}" data-order-number="{{ order.order_number }}" data-order-index="{{ forloop.index }}" data-order-currency="{{ order_curr }}">
          <div class="amolih-order-header">
            <div>
              <div class="amolih-order-name">{{ order.name | escape }}</div>
              <div class="amolih-order-meta">
                <span>Placed on {{ order.created_at | date: "%B %d, %Y" }}</span>
                <span>&bull;</span>
                <span>{{ order.line_items.size }} item{% if order.line_items.size != 1 %}s{% endif %}</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              {% if order.financial_status == 'paid' %}
                <span class="amolih-status-pill paid">● Paid</span>
              {% else %}
                <span class="amolih-status-pill unfulfilled">{{ order.financial_status | escape }}</span>
              {% endif %}
              {% if order.fulfillment_status == 'fulfilled' %}
                <span class="amolih-status-pill fulfilled">● Fulfilled</span>
              {% else %}
                <span class="amolih-status-pill unfulfilled">● {{ order.fulfillment_status | default: "Processing" | escape }}</span>
              {% endif %}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin:0.75rem 0 0.5rem; flex-wrap:wrap; gap:8px;">
            <div style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--amolih-gold-dark); font-weight:600;">
              Order Investment Total
            </div>
            <div class="amolih-order-total-price" style="font-family:var(--amolih-heading-font); font-size:1.45rem; font-weight:400; color:var(--amolih-primary);" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ order_total }}">
              {{ curr_symbol }}{{ order_total }}
            </div>
          </div>

          <!-- Line items -->
          <div class="amolih-order-items">
            {% for line in order.line_items limit: 50 %}
              {% if line.final_price_set.presentment_money.amount != blank %}
                {% assign line_price = line.final_price_set.presentment_money.amount %}
              {% elsif line.price_set.presentment_money.amount != blank %}
                {% assign line_price = line.price_set.presentment_money.amount %}
              {% elsif line.original_line_price_set.presentment_money.amount != blank %}
                {% assign line_price = line.original_line_price_set.presentment_money.amount %}
              {% elsif line.final_price != blank %}
                {% assign line_price = line.final_price | money_without_currency %}
              {% else %}
                {% assign line_price = line.price | money_without_currency %}
              {% endif %}
              <div class="amolih-line-item">
                <div>
                  <span class="amolih-line-item-title">{{ line.title | escape }}</span>
                  <span style="font-size:0.78rem; color:var(--amolih-text-muted); margin-left:6px;">&times; {{ line.quantity }}</span>
                </div>
                <span class="amolih-line-price" style="font-weight:600; font-size:0.95rem;" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ line_price }}">{{ curr_symbol }}{{ line_price }}</span>
              </div>
            {% endfor %}
          </div>

          <!-- Action Strip -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; padding-top:0.85rem; border-top:1px solid var(--amolih-border-light); flex-wrap:wrap; gap:10px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="amolih-button amolih-btn-view-invoice" onclick="window.showInvoiceDetail && window.showInvoiceDetail('{{ order.id }}', '{{ order.name | escape }}', '{{ forloop.index }}', this); return false;" data-order-id="{{ order.id }}" data-order-name="{{ order.name | escape }}" data-order-number="{{ order.order_number }}" data-order-index="{{ forloop.index }}" style="font-size:0.82rem; padding:0.45rem 0.95rem; font-weight:600; cursor:pointer;">
                📄 View Invoice & Details
              </button>
              {% if order.order_status_url %}
                <a href="{{ order.order_status_url }}" target="_blank" rel="noopener" class="amolih-button-secondary" style="font-size:0.82rem; padding:0.45rem 0.85rem;">
                  🚚 Track Courier ↗
                </a>
              {% endif %}
              <a href="https://wa.me/918233905718?text=Hi+Amolih%2C+I+have+a+question+regarding+my+Order+{{ order.name | url_encode }}." target="_blank" rel="noopener" class="amolih-button-secondary" style="font-size:0.82rem; padding:0.45rem 0.85rem;">
                💬 Inquire on WhatsApp
              </a>
            </div>
            {% if order.shipping_address %}
              <div style="font-size:0.8rem; color:var(--amolih-text-muted);">
                Shipping to: {{ order.shipping_address.city | escape }}, {{ order.shipping_address.country | escape }}
              </div>
            {% endif %}
          </div>
        </article>
      {% assign order_curr = order.total_price_set.presentment_money.currency_code | default: order.currency %}
      {% if order_curr == blank or order_curr == 'USD' %}
        {% if order.shipping_address.country_code == 'IN' or order.billing_address.country_code == 'IN' or customer.default_address.country_code == 'IN' or customer.default_address.country == 'India' %}
          {% assign order_curr = 'INR' %}
        {% elsif order.shipping_address.country_code == 'GB' or order.billing_address.country_code == 'GB' or order.shipping_address.country_code == 'UK' or customer.default_address.country_code == 'GB' or customer.default_address.country == 'United Kingdom' %}
          {% assign order_curr = 'GBP' %}
        {% elsif order.shipping_address.country_code == 'US' or order.billing_address.country_code == 'US' or customer.default_address.country_code == 'US' or customer.default_address.country == 'United States' %}
          {% assign order_curr = 'USD' %}
        {% endif %}
      {% endif %}
      {% assign order_curr = order_curr | default: 'USD' | upcase %}
      {% case order_curr %}
        {% when 'INR' %}
          {% assign curr_symbol = '₹' %}
        {% when 'GBP' %}
          {% assign curr_symbol = '£' %}
        {% when 'USD' %}
          {% assign curr_symbol = '$' %}
        {% when 'EUR' %}
          {% assign curr_symbol = '€' %}
        {% when 'CAD' %}
          {% assign curr_symbol = 'CA$' %}
        {% when 'AUD' %}
          {% assign curr_symbol = 'AU$' %}
        {% when 'JPY' %}
          {% assign curr_symbol = '¥' %}
        {% when 'AED' %}
          {% assign curr_symbol = 'AED ' %}
        {% when 'SAR' %}
          {% assign curr_symbol = 'SAR ' %}
        {% else %}
          {% assign curr_symbol = order_curr | append: ' ' %}
      {% endcase %}
      {% if order.total_price_set.presentment_money.amount != blank %}
        {% assign order_total = order.total_price_set.presentment_money.amount %}
      {% else %}
        {% assign order_total = order.total_price | money_without_currency %}
      {% endif %}
      {% if order.subtotal_price_set.presentment_money.amount != blank %}
        {% assign calc_subtotal = order.subtotal_price_set.presentment_money.amount %}
      {% elsif order.subtotal_price != blank %}
        {% assign calc_subtotal = order.subtotal_price | money_without_currency %}
      {% else %}
        {% assign calc_subtotal = order_total %}
      {% endif %}
      {% if order.total_discounts_set.presentment_money.amount != blank %}
        {% assign calc_discounts = order.total_discounts_set.presentment_money.amount %}
      {% elsif order.total_discounts != blank %}
        {% assign calc_discounts = order.total_discounts | money_without_currency %}
      {% else %}
        {% assign calc_discounts = "0.00" %}
      {% endif %}
      {% if order.shipping_price != blank %}
        {% assign calc_shipping = order.shipping_price | money_without_currency %}
      {% else %}
        {% assign calc_shipping = "0.00" %}
      {% endif %}
      {% if order.tax_price != blank %}
        {% assign calc_tax = order.tax_price | money_without_currency %}
      {% else %}
        {% assign calc_tax = "0.00" %}
      {% endif %}

      <div id="amolih-invoice-view-{{ order.id }}" data-order-id="{{ order.id }}" data-order-name="{{ order.name | escape }}" data-order-number="{{ order.order_number }}" data-order-index="{{ forloop.index }}" class="amolih-order-invoice-detail" style="display:none;">
        <!-- Top Navigation / Action Bar -->
        <div class="amolih-invoice-nav-bar">
          <button type="button" class="amolih-button-secondary amolih-btn-back-to-orders" onclick="window.hideInvoiceDetail && window.hideInvoiceDetail(); return false;" style="font-weight:600; font-size:0.86rem; padding:0.55rem 1.15rem; gap:6px; cursor:pointer;">
            ← Back to All Orders
          </button>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="amolih-button amolih-btn-print-invoice" onclick="window.printOrderInvoice && window.printOrderInvoice('{{ order.id }}', '{{ forloop.index }}'); return false;" data-order-id="{{ order.id }}" data-order-name="{{ order.name | escape }}" data-order-index="{{ forloop.index }}" style="font-size:0.85rem; padding:0.55rem 1.15rem; gap:6px; cursor:pointer;">
              🖨️ Download / Print Invoice
            </button>
            {% if order.order_status_url %}
              <a href="{{ order.order_status_url }}" target="_blank" rel="noopener" class="amolih-button-secondary" style="font-size:0.85rem; padding:0.55rem 1rem;">
                🚚 Track Courier ↗
              </a>
            {% endif %}
          </div>
        </div>

        <!-- Branded Printable Invoice Sheet -->
        <div class="amolih-invoice-paper" id="amolih-invoice-doc-{{ order.id }}" data-order-id="{{ order.id }}" data-order-name="{{ order.name | escape }}" data-order-index="{{ forloop.index }}">
          <!-- Header -->
          <div class="amolih-invoice-header">
            <div>
              <div class="amolih-invoice-brand">AMOLIH</div>
              <div style="font-size:0.82rem; color:var(--amolih-text-muted); margin-top:4px; font-weight:500;">
                Official Tax Invoice & Order Receipt
              </div>
            </div>
            <div style="text-align:right;">
              <div style="display:inline-block; background:#FAF7F2; border:1px solid var(--amolih-gold-border); padding:0.35rem 0.75rem; border-radius:6px; font-size:0.75rem; font-weight:700; color:var(--amolih-gold-dark); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;">
                Tax Invoice
              </div>
              <div style="font-family:var(--amolih-heading-font); font-size:1.75rem; font-weight:400; color:var(--amolih-text); line-height:1.15;">
                {{ order.name | escape }}
              </div>
              <div style="font-size:0.82rem; color:var(--amolih-text-muted); margin-top:4px;">
                Placed on {{ order.created_at | date: "%B %d, %Y" }}
              </div>
              <div style="display:flex; gap:6px; justify-content:flex-end; margin-top:8px;">
                {% if order.financial_status == 'paid' %}
                  <span class="amolih-status-pill paid">● Paid</span>
                {% else %}
                  <span class="amolih-status-pill unfulfilled">{{ order.financial_status | escape }}</span>
                {% endif %}
                {% if order.fulfillment_status == 'fulfilled' %}
                  <span class="amolih-status-pill fulfilled">● Fulfilled</span>
                {% else %}
                  <span class="amolih-status-pill unfulfilled">● {{ order.fulfillment_status | default: "Processing" | escape }}</span>
                {% endif %}
              </div>
            </div>
          </div>

          <!-- Parties & Dispatch Metadata Grid -->
          <div class="amolih-invoice-meta-grid">
            <!-- Billed To -->
            <div>
              <div class="amolih-invoice-meta-title">Billed To</div>
              <div style="font-size:0.94rem; font-weight:600; color:var(--amolih-text);">
                {{ order.billing_address.name | default: customer.name | escape }}
              </div>
              <div class="amolih-invoice-meta-body" style="color:var(--amolih-text-muted); margin-top:3px;">
                {% if order.billing_address %}
                  {% if order.billing_address.company %}{{ order.billing_address.company | escape }}<br/>{% endif %}
                  {{ order.billing_address.address1 | escape }}<br/>
                  {% if order.billing_address.address2 %}{{ order.billing_address.address2 | escape }}<br/>{% endif %}
                  {{ order.billing_address.city | escape }}, {{ order.billing_address.province | escape }} {{ order.billing_address.zip | escape }}<br/>
                  {{ order.billing_address.country | escape }}
                  {% if order.billing_address.phone %}<br/>Phone: {{ order.billing_address.phone | escape }}{% endif %}
                {% else %}
                  {{ customer.email | escape }}
                {% endif %}
              </div>
            </div>

            <!-- Shipped To -->
            <div>
              <div class="amolih-invoice-meta-title">Shipped To</div>
              <div style="font-size:0.94rem; font-weight:600; color:var(--amolih-text);">
                {{ order.shipping_address.name | default: customer.name | escape }}
              </div>
              <div class="amolih-invoice-meta-body" style="color:var(--amolih-text-muted); margin-top:3px;">
                {% if order.shipping_address %}
                  {% if order.shipping_address.company %}{{ order.shipping_address.company | escape }}<br/>{% endif %}
                  {{ order.shipping_address.address1 | escape }}<br/>
                  {% if order.shipping_address.address2 %}{{ order.shipping_address.address2 | escape }}<br/>{% endif %}
                  {{ order.shipping_address.city | escape }}, {{ order.shipping_address.province | escape }} {{ order.shipping_address.zip | escape }}<br/>
                  {{ order.shipping_address.country | escape }}
                  {% if order.shipping_address.phone %}<br/>Phone: {{ order.shipping_address.phone | escape }}{% endif %}
                {% else %}
                  No physical shipping address recorded
                {% endif %}
              </div>
            </div>

            <!-- Dispatch & Payment Info -->
            <div>
              <div class="amolih-invoice-meta-title">Dispatch & Payment Details</div>
              <div class="amolih-invoice-meta-body">
                <div><strong>Payment Status:</strong> {{ order.financial_status_label | default: order.financial_status | capitalize }}</div>
                <div style="margin-top:3px;"><strong>Delivery Method:</strong> {{ order.shipping_methods.first.title | default: "Insured Air Courier" }}</div>
                {% if order.fulfillments.size > 0 %}
                  <div style="margin-top:3px;"><strong>Courier Partner:</strong> {{ order.fulfillments.first.tracking_company | default: "Express Courier" }}</div>
                  {% if order.fulfillments.first.tracking_number %}
                    <div style="margin-top:2px;"><strong>Tracking Reference:</strong> {{ order.fulfillments.first.tracking_number }}</div>
                  {% endif %}
                {% endif %}
              </div>
            </div>
          </div>

          <!-- Line Items Table -->
          <div style="overflow-x:auto;">
            <table class="amolih-invoice-table">
              <thead>
                <tr>
                  <th>Item & Specification</th>
                  <th style="text-align:center;">SKU</th>
                  <th style="text-align:right;">Unit Price</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                {% for line in order.line_items limit: 50 %}
                  {% if line.final_price_set.presentment_money.amount != blank %}
                    {% assign inv_unit = line.final_price_set.presentment_money.amount %}
                  {% elsif line.price_set.presentment_money.amount != blank %}
                    {% assign inv_unit = line.price_set.presentment_money.amount %}
                  {% elsif line.price != blank %}
                    {% assign inv_unit = line.price | money_without_currency %}
                  {% else %}
                    {% assign inv_unit = "0.00" %}
                  {% endif %}
                  {% if line.final_line_price_set.presentment_money.amount != blank %}
                    {% assign inv_sub = line.final_line_price_set.presentment_money.amount %}
                  {% elsif line.original_line_price_set.presentment_money.amount != blank %}
                    {% assign inv_sub = line.original_line_price_set.presentment_money.amount %}
                  {% elsif line.final_line_price != blank %}
                    {% assign inv_sub = line.final_line_price | money_without_currency %}
                  {% else %}
                    {% assign inv_sub = inv_unit %}
                  {% endif %}
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:12px;">
                        {% if line.image %}
                          <img src="{{ line.image | image_url: width: 100 }}" alt="{{ line.title | escape }}" style="width:44px; height:44px; object-fit:cover; border-radius:6px; border:1px solid var(--amolih-border-light); flex-shrink:0;" />
                        {% endif %}
                        <div>
                          <div style="font-family:var(--amolih-font-editorial); font-size:1.02rem; font-weight:500; color:var(--amolih-text);">
                            {{ line.title | escape }}
                          </div>
                          {% if line.variant_title and line.variant_title != 'Default Title' %}
                            <div style="font-size:0.78rem; color:var(--amolih-text-muted); margin-top:2px;">
                              Variant: {{ line.variant_title | escape }}
                            </div>
                          {% endif %}
                        </div>
                      </div>
                    </td>
                    <td style="text-align:center; font-size:0.82rem; color:var(--amolih-text-muted);">
                      {{ line.sku | default: "—" | escape }}
                    </td>
                    <td style="text-align:right;" class="amolih-order-total-price" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ inv_unit }}">
                      {{ curr_symbol }}{{ inv_unit }}
                    </td>
                    <td style="text-align:center; font-weight:600;">
                      {{ line.quantity }}
                    </td>
                    <td style="text-align:right; font-weight:600; color:var(--amolih-primary);" class="amolih-order-total-price" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ inv_sub }}">
                      {{ curr_symbol }}{{ inv_sub }}
                    </td>
                  </tr>
                {% endfor %}
              </tbody>
            </table>
          </div>

          <!-- Financial Calculation Breakdown -->
          <div style="display:flex; justify-content:flex-end; margin:1rem 0;">
            <div class="amolih-invoice-calc-box">
              <div class="amolih-invoice-calc-row">
                <span>Subtotal</span>
                <span class="amolih-order-total-price" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ calc_subtotal }}">{{ curr_symbol }}{{ calc_subtotal }}</span>
              </div>
              {% if calc_discounts != "0.00" and calc_discounts != "0" %}
                <div class="amolih-invoice-calc-row" style="color:#166534;">
                  <span>Offers & Discounts Applied{% if order.discount_applications.size > 0 %} ({{ order.discount_applications.first.title }}){% endif %}</span>
                  <span>-{{ curr_symbol }}{{ calc_discounts }}</span>
                </div>
              {% endif %}
              <div class="amolih-invoice-calc-row">
                <span>Insured Shipping & Handling</span>
                <span>{% if calc_shipping != "0.00" and calc_shipping != "0" %}{{ curr_symbol }}{{ calc_shipping }}{% else %}Complimentary (Free){% endif %}</span>
              </div>
              <div class="amolih-invoice-calc-row" style="margin-bottom:0.75rem;">
                <span>Taxes (GST / VAT)</span>
                <span>{% if calc_tax != "0.00" and calc_tax != "0" %}{{ curr_symbol }}{{ calc_tax }}{% else %}Included{% endif %}</span>
              </div>

              <div class="amolih-invoice-calc-total">
                <span style="font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--amolih-gold-dark);">Invoice Grand Total</span>
                <span class="amolih-order-total-price" style="font-family:var(--amolih-heading-font); font-size:1.55rem; color:var(--amolih-primary);" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ order_total }}">
                  {{ curr_symbol }}{{ order_total }}
                </span>
              </div>

              <div class="amolih-invoice-calc-row" style="margin-top:0.5rem; padding-top:0.4rem; border-top:1px dashed var(--amolih-border-light);">
                <span>Amount Paid</span>
                <span style="font-weight:600; color:var(--amolih-text);">{{ curr_symbol }}{{ order_total }}</span>
              </div>
              <div class="amolih-invoice-calc-row" style="margin-top:0.25rem; margin-bottom:0;">
                <span>Balance Remaining</span>
                <span style="font-weight:600; color:#166534;">{{ curr_symbol }}0.00</span>
              </div>
            </div>
          </div>

          <!-- Invoice Footer -->
          <div class="amolih-invoice-footer-strip" style="border-top:1px dashed var(--amolih-gold-border); padding-top:0.75rem; margin-top:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="font-size:0.75rem; color:var(--amolih-text-muted); line-height:1.45;">
              Thank you for choosing Amolih.
            </div>
            <div style="font-size:0.72rem; color:var(--amolih-text-muted); text-align:right;">
              Generated via Amolih Customer Portal &bull; System Verified
            </div>
          </div>
        </div>
      </div>
    {% endfor %}
    </div>
  {% endif %}
</div>`;
  }

  // 2. SAVED ADDRESSES (MODERN LUXURY VIEWS)
  if (activeTab === "addresses") {
    return `<div class="amolih-panel">
  <div class="amolih-panel-header">
    <div>
      <h2 class="amolih-pane-title">Saved Delivery Locations</h2>
      <p class="amolih-pane-subtitle">Manage your verified shipping destinations and primary delivery address.</p>
    </div>
    <button type="button" class="amolih-button" id="amolih-open-add-address-btn">
      + Add New Address
    </button>
  </div>
  <hr class="amolih-divider" />

  <!-- Add New Address Form -->
  <div id="amolih-add-address-box" style="display:none; margin-bottom:2rem; padding:1.75rem; border:1px solid var(--amolih-gold-border); border-radius:var(--amolih-radius); background:#FAF7F2;">
    <h3 style="margin:0 0 1.25rem; font-size:1.35rem; font-family:var(--amolih-heading-font);">Add Bespoke Delivery Location</h3>
    <form method="post" action="${pathPrefix}?tab=addresses" class="amolih-ajax-form">
      <input type="hidden" name="action_type" value="create_address" />
      <div class="amolih-form-grid">
        <div class="amolih-form-group">
          <label>First Name</label>
          <input type="text" name="first_name" value="{{ customer.first_name | escape }}" class="amolih-input" placeholder="e.g. Sarah" />
        </div>
        <div class="amolih-form-group">
          <label>Last Name</label>
          <input type="text" name="last_name" value="{{ customer.last_name | escape }}" class="amolih-input" placeholder="e.g. Jenkins" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label>Company / Apartment Suite (Optional)</label>
          <input type="text" name="company" placeholder="Apartment / Villa / Suite / Business" class="amolih-input" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label>Street Address *</label>
          <input type="text" name="address1" required placeholder="House/Flat number, road, area" class="amolih-input" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label>Apartment, suite, unit (Optional)</label>
          <input type="text" name="address2" placeholder="Floor, Landmark, Near..." class="amolih-input" />
        </div>
        <div class="amolih-form-group">
          <label>City *</label>
          <input type="text" name="city" required class="amolih-input" placeholder="City" />
        </div>
        <div class="amolih-form-group">
          <label>State / Province</label>
          <input type="text" name="province" class="amolih-input" placeholder="State / Region" />
        </div>
        <div class="amolih-form-group">
          <label>Postal / ZIP Code *</label>
          <input type="text" name="zip" required class="amolih-input" placeholder="PIN / Postal Code" />
        </div>
        <div class="amolih-form-group">
          <label>Country *</label>
          <input type="text" name="country" value="India" required class="amolih-input" placeholder="Country" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label>Recipient Contact Phone</label>
          <input type="tel" name="phone" placeholder="+91..." class="amolih-input" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" name="is_default" value="true" />
            <span style="font-size:0.9rem;">Set as my primary delivery address for future fine jewelry orders</span>
          </label>
        </div>
      </div>
      <div class="amolih-form-actions">
        <button type="submit" class="amolih-button">Save Delivery Location</button>
        <button type="button" class="amolih-button-secondary" id="amolih-close-add-address-btn">Cancel</button>
      </div>
    </form>
  </div>

  <!-- Address Cards Grid -->
  {% if customer.addresses.size == 0 %}
    <div style="text-align:center; padding:3.5rem 1.5rem; background:#FAF7F2; border:1px dashed var(--amolih-gold-border); border-radius:var(--amolih-radius);">
      <div style="font-size:3rem; margin-bottom:0.75rem;">📍</div>
      <h3 style="font-family:var(--amolih-heading-font); font-size:1.6rem; margin:0 0 0.5rem; font-weight:400;">No Shipping Addresses Saved</h3>
      <p class="amolih-pane-subtitle" style="max-width:420px; margin:0 auto 1.5rem;">
        Add your delivery location to ensure swift, insured courier handling for your orders.
      </p>
    </div>
  {% else %}
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
      {% for address in customer.addresses %}
        <article class="amolih-order-card" id="addr-card-{{ address.id }}" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
              <span style="font-family:var(--amolih-font-editorial); font-size:1.25rem; font-weight:600; color:var(--amolih-text);">
                {{ address.name | default: "Delivery Location" | escape }}
              </span>
              {% if address == customer.default_address %}
                <span class="amolih-status-pill fulfilled" style="font-size:0.7rem;">✦ Default</span>
              {% endif %}
            </div>

            <div style="color:#475569; font-size:0.92rem; line-height:1.6; font-family:var(--amolih-font-modern);">
              {{ address | format_address }}
              {% if address.phone != blank %}
                <div style="font-size:0.82rem; color:var(--amolih-text-muted); margin-top:6px;">
                  📞 {{ address.phone | escape }}
                </div>
              {% endif %}
            </div>
          </div>

          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:1.25rem; padding-top:0.85rem; border-top:1px solid var(--amolih-border-light);">
            <button type="button" class="amolih-btn-sm amolih-btn-edit-addr" data-id="{{ address.id }}">✏️ Edit</button>
            {% unless address == customer.default_address %}
              <form method="post" action="${pathPrefix}?tab=addresses" style="display:inline;">
                <input type="hidden" name="action_type" value="set_default_address" />
                <input type="hidden" name="address_id" value="{{ address.id }}" />
                <button type="submit" class="amolih-btn-sm">★ Make Default</button>
              </form>
            {% endunless %}
            <form method="post" action="${pathPrefix}?tab=addresses" style="display:inline;" onsubmit="return confirm('Delete this saved location?');">
              <input type="hidden" name="action_type" value="delete_address" />
              <input type="hidden" name="address_id" value="{{ address.id }}" />
              <button type="submit" class="amolih-btn-sm amolih-btn-danger">Delete</button>
            </form>
          </div>

          <!-- Inline Edit Form -->
          <div id="addr-edit-form-{{ address.id }}" style="display:none; margin-top:1rem; padding-top:1rem; border-top:1px dashed var(--amolih-gold-border);">
            <form method="post" action="${pathPrefix}?tab=addresses" class="amolih-ajax-form">
              <input type="hidden" name="action_type" value="update_address" />
              <input type="hidden" name="address_id" value="{{ address.id }}" />
              <div class="amolih-form-grid">
                <div class="amolih-form-group">
                  <label>First Name</label>
                  <input type="text" name="first_name" value="{{ address.first_name | escape }}" class="amolih-input" />
                </div>
                <div class="amolih-form-group">
                  <label>Last Name</label>
                  <input type="text" name="last_name" value="{{ address.last_name | escape }}" class="amolih-input" />
                </div>
                <div class="amolih-form-group amolih-span-2">
                  <label>Company (Optional)</label>
                  <input type="text" name="company" value="{{ address.company | escape }}" class="amolih-input" />
                </div>
                <div class="amolih-form-group amolih-span-2">
                  <label>Street Address *</label>
                  <input type="text" name="address1" value="{{ address.address1 | escape }}" required class="amolih-input" />
                </div>
                <div class="amolih-form-group amolih-span-2">
                  <label>Apartment, suite (Optional)</label>
                  <input type="text" name="address2" value="{{ address.address2 | escape }}" class="amolih-input" />
                </div>
                <div class="amolih-form-group">
                  <label>City *</label>
                  <input type="text" name="city" value="{{ address.city | escape }}" required class="amolih-input" />
                </div>
                <div class="amolih-form-group">
                  <label>State / Province</label>
                  <input type="text" name="province" value="{{ address.province | escape }}" class="amolih-input" />
                </div>
                <div class="amolih-form-group">
                  <label>Postal / ZIP *</label>
                  <input type="text" name="zip" value="{{ address.zip | escape }}" required class="amolih-input" />
                </div>
                <div class="amolih-form-group">
                  <label>Country *</label>
                  <input type="text" name="country" value="{{ address.country | escape }}" required class="amolih-input" />
                </div>
                <div class="amolih-form-group amolih-span-2">
                  <label>Phone</label>
                  <input type="tel" name="phone" value="{{ address.phone | escape }}" class="amolih-input" />
                </div>
                {% unless address == customer.default_address %}
                  <div class="amolih-form-group amolih-span-2">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                      <input type="checkbox" name="is_default" value="true" />
                      <span style="font-size:0.85rem;">Set as my primary delivery address</span>
                    </label>
                  </div>
                {% endunless %}
              </div>
              <div class="amolih-form-actions">
                <button type="submit" class="amolih-button">Update Address</button>
                <button type="button" class="amolih-button-secondary amolih-cancel-addr-edit" data-id="{{ address.id }}">Cancel</button>
              </div>
            </form>
          </div>
        </article>
      {% endfor %}
    </div>
  {% endif %}
</div>`;
  }

  // 3. AMOLIH CIRCLE PROGRESS BAR (ASSIGNED PAGE URL: pages/amolih-circle-progress-bar)
  if (isCircleTab(activeTab, circlePageUrl)) {
    const cleanHandle = (circlePageUrl || "amolih-circle-progress-bar")
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/?pages\//i, "")
      .replace(/^\/+|\/+$/g, "")
      .split("?")[0]
      .split("#")[0] || "amolih-circle-progress-bar";
    const targetUrl = `/pages/${cleanHandle}`;

    return `<div class="amolih-panel">
  {% assign circle_page = pages['${escapeHtml(cleanHandle)}'] %}
  <div class="amolih-panel-header">
    <div>
      <h2 class="amolih-pane-title">
        {% if circle_page and circle_page.title != blank %}
          {{ circle_page.title | escape }}
        {% else %}
          ${circleTitle}
        {% endif %}
      </h2>
      <p class="amolih-pane-subtitle">Jaipur Heritage Loyalty Tier & Privileges &bull; /pages/${escapeHtml(cleanHandle)}</p>
    </div>
    <a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener" class="amolih-button-secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem; text-decoration:none;">
      Open Full Page ↗
    </a>
  </div>
  <hr class="amolih-divider" style="margin-bottom:1.5rem;" />

  <!-- Modern Tier Tracker Card -->
  <div class="amolih-loyalty-container">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.12em; color:var(--amolih-gold-dark); font-weight:600;">Current Membership Tier</div>
        <div style="font-family:var(--amolih-heading-font); font-size:1.85rem; color:var(--amolih-text); margin-top:2px;">Amolih Circle &bull; Tier 2 Privé</div>
      </div>
      <span class="amolih-status-pill fulfilled" style="font-size:0.82rem; padding:0.35rem 0.85rem;">
        ✦ Active Privileges
      </span>
    </div>

    <div class="amolih-progress-track">
      <div class="amolih-progress-bar" style="width:65%;"></div>
    </div>

    <div class="amolih-tier-milestones">
      <span>Tier 1: Silver Artisan</span>
      <span>Tier 2: Royal Jaipur Privé</span>
      <span>Tier 3: Imperial Heritage</span>
    </div>
  </div>

  <div id="amolih-circle-container" class="amolih-page-container">
    {% if circle_page and circle_page.content != blank %}
      <div class="amolih-page-rte rte">
        {{ circle_page.content }}
      </div>
    {% else %}
      <div id="amolih-circle-loader" style="text-align:center; padding:3rem 1rem; color:#64748B;">
        <div class="amolih-spinner"></div>
        <p style="margin:0.65rem 0 0; font-size:0.92rem;">Loading content from /pages/${escapeHtml(cleanHandle)}...</p>
      </div>
      <div id="amolih-circle-fetched-content" class="amolih-page-rte rte" style="display:none;"></div>
      <iframe
        id="amolih-circle-frame"
        src="${escapeHtml(targetUrl)}"
        style="display:none; width:100%; min-height:650px; border:1px solid var(--amolih-border); border-radius:var(--amolih-radius);"
        loading="lazy"
      ></iframe>
    {% endif %}
  </div>

  <script>
    (function() {
      var loader = document.getElementById("amolih-circle-loader");
      var fetched = document.getElementById("amolih-circle-fetched-content");
      var frame = document.getElementById("amolih-circle-frame");
      if (!loader) return;

      fetch("${escapeHtml(targetUrl)}")
        .then(function(res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function(html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, "text/html");

          var selectors = [
            "#MainContent .rte",
            "main .rte",
            ".page-content",
            ".main-page-content",
            "#MainContent",
            "main",
            ".main-content"
          ];
          var extracted = null;
          for (var i = 0; i < selectors.length; i++) {
            var el = doc.querySelector(selectors[i]);
            if (el && el.innerHTML.trim().length > 0) {
              extracted = el;
              break;
            }
          }

          if (extracted) {
            var unwanted = extracted.querySelectorAll("header, footer, nav, .announcement-bar, #shopify-section-header, #shopify-section-footer, .header-wrapper, .footer");
            unwanted.forEach(function(u) { u.remove(); });

            if (extracted.textContent.trim().length > 10 || extracted.querySelector("img, svg, video, form, table, [class*='loyalty'], [class*='progress'], [class*='tier']")) {
              fetched.innerHTML = extracted.innerHTML;
              loader.style.display = "none";
              fetched.style.display = "block";
              return;
            }
          }

          loader.style.display = "none";
          if (frame) frame.style.display = "block";
        })
        .catch(function() {
          loader.style.display = "none";
          if (frame) frame.style.display = "block";
        });
    })();
  </script>
</div>`;
  }

  // 4. PROFILE DETAILS (MODERN LUXURY VIEWS)
  if (activeTab === "details") {
    return `<div class="amolih-panel">
  <div class="amolih-panel-header" style="align-items: center;">
    <div style="display: flex; align-items: center;">
      <h2 class="amolih-pane-title" style="margin: 0; line-height: 1.2; position: relative; top: 3px;">Profile Details</h2>
    </div>
    <button type="button" class="amolih-button-secondary" id="amolih-toggle-edit-profile" style="margin: 0; display: inline-flex; align-items: center; justify-content: center; line-height: 1;">
      ✏️ Edit Profile
    </button>
  </div>
  <hr class="amolih-divider" />

  <!-- 3 Quick-Stats Luxury Metric Cards -->
  {% assign cust_curr = customer.orders.first.total_price_set.presentment_money.currency_code | default: customer.orders.first.currency %}
  {% if cust_curr == blank or cust_curr == 'USD' %}
    {% if customer.default_address.country_code == 'IN' or customer.default_address.country == 'India' %}
      {% assign cust_curr = 'INR' %}
    {% elsif customer.default_address.country_code == 'GB' or customer.default_address.country == 'United Kingdom' %}
      {% assign cust_curr = 'GBP' %}
    {% elsif customer.default_address.country_code == 'US' or customer.default_address.country == 'United States' %}
      {% assign cust_curr = 'USD' %}
    {% endif %}
  {% endif %}
  {% assign cust_curr = cust_curr | default: 'USD' | upcase %}
  {% case cust_curr %}
    {% when 'INR' %}
      {% assign cust_symbol = '₹' %}
    {% when 'GBP' %}
      {% assign cust_symbol = '£' %}
    {% when 'USD' %}
      {% assign cust_symbol = '$' %}
    {% when 'EUR' %}
      {% assign cust_symbol = '€' %}
    {% when 'CAD' %}
      {% assign cust_symbol = 'CA$' %}
    {% when 'AUD' %}
      {% assign cust_symbol = 'AU$' %}
    {% when 'JPY' %}
      {% assign cust_symbol = '¥' %}
    {% when 'AED' %}
      {% assign cust_symbol = 'AED ' %}
    {% when 'SAR' %}
      {% assign cust_symbol = 'SAR ' %}
    {% else %}
      {% assign cust_symbol = cust_curr | append: ' ' %}
  {% endcase %}
  {% assign total_spent_calc = 0 %}
  {% for ord in customer.orders %}
    {% if ord.total_price_set.presentment_money.amount != blank %}
      {% assign ord_amt = ord.total_price_set.presentment_money.amount | plus: 0 %}
      {% assign total_spent_calc = total_spent_calc | plus: ord_amt %}
    {% else %}
      {% assign ord_amt = ord.total_price | money_without_currency | remove: ',' | plus: 0 %}
      {% assign total_spent_calc = total_spent_calc | plus: ord_amt %}
    {% endif %}
  {% endfor %}

  <div class="amolih-metrics-grid">
    <div class="amolih-metric-card">
      <div class="amolih-metric-label">Lifetime Investment</div>
      <div class="amolih-metric-val amolih-total-spent-val" data-currency="{{ cust_curr }}" data-symbol="{{ cust_symbol }}" data-amount="{% if total_spent_calc > 0 %}{{ total_spent_calc }}{% elsif customer.total_spent > 0 %}{{ customer.total_spent | money_without_currency | remove: ',' }}{% else %}0.00{% endif %}">
        {% if total_spent_calc > 0 %}
          {{ cust_symbol }}{{ total_spent_calc | round: 2 }}
        {% elsif customer.total_spent > 0 %}
          {{ cust_symbol }}{{ customer.total_spent | money_without_currency }}
        {% else %}
          {{ cust_symbol }}0.00
        {% endif %}
      </div>
      <div class="amolih-metric-sub">Total spent</div>
    </div>

    <div class="amolih-metric-card">
      <div class="amolih-metric-label">Orders Placed</div>
      <div class="amolih-metric-val">{{ customer.orders.size }}</div>
      <div class="amolih-metric-sub">Total orders</div>
    </div>

    <div class="amolih-metric-card">
      <div class="amolih-metric-label">Primary Destination</div>
      <div class="amolih-metric-val" style="font-size:1.35rem; font-family:var(--amolih-font-modern);">
        {{ customer.default_address.city | default: "No address saved" | escape }}
      </div>
      <div class="amolih-metric-sub">{{ customer.default_address.country | default: "Default address" | escape }}</div>
    </div>
  </div>

  <!-- View Mode -->
  <div id="amolih-profile-view">
    <div class="amolih-fields">
      <div class="amolih-field-box">
        <label>First Name</label>
        <div class="amolih-field-val">{{ customer.first_name | default: "Not added" | escape }}</div>
      </div>
      <div class="amolih-field-box">
        <label>Last Name</label>
        <div class="amolih-field-val">{{ customer.last_name | default: "Not added" | escape }}</div>
      </div>
      <div class="amolih-field-box amolih-span-2">
        <label>Email Address</label>
        <div class="amolih-field-val">{{ customer.email | default: "Not added" | escape }}</div>
      </div>
      <div class="amolih-field-box amolih-span-2">
        <label>Contact Phone</label>
        <div class="amolih-field-val">{{ customer.phone | default: "Not added" | escape }}</div>
      </div>
    </div>
  </div>

  <!-- Edit Mode Form -->
  <div id="amolih-profile-edit" style="display:none; margin-top:0.5rem;">
    <form method="post" action="${pathPrefix}?tab=details" id="amolih-profile-form" class="amolih-ajax-form">
      <input type="hidden" name="action_type" value="update_profile" />
      <div class="amolih-form-grid">
        <div class="amolih-form-group">
          <label for="prof_first_name">First Name *</label>
          <input type="text" id="prof_first_name" name="first_name" value="{{ customer.first_name | escape }}" required class="amolih-input" placeholder="First Name" />
        </div>
        <div class="amolih-form-group">
          <label for="prof_last_name">Last Name *</label>
          <input type="text" id="prof_last_name" name="last_name" value="{{ customer.last_name | escape }}" required class="amolih-input" placeholder="Last Name" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label for="prof_email">Email Address *</label>
          <input type="email" id="prof_email" name="email" value="{{ customer.email | escape }}" required class="amolih-input" placeholder="customer@example.com" />
          <small class="amolih-help-text">Primary contact for order confirmations and atelier receipts.</small>
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label for="prof_phone">Contact Phone</label>
          <input type="tel" id="prof_phone" name="phone" value="{{ customer.phone | escape }}" placeholder="+91 98765 43210" class="amolih-input" />
          <small class="amolih-help-text">Include country code (e.g. +91...) for SMS courier & shipment tracking notifications.</small>
        </div>
      </div>
      <div class="amolih-form-actions">
        <button type="submit" class="amolih-button">Save Changes</button>
        <button type="button" class="amolih-button-secondary" id="amolih-cancel-edit-profile">Cancel</button>
      </div>
    </form>
  </div>
</div>`;
  }

  // 5. CUSTOM TAB FALLBACK
  const item = menuItems.find(
    (entry) => (entry.destination || "").toLowerCase() === activeTab,
  );
  return `<div class="amolih-panel">
  <h2 class="amolih-pane-title">${escapeHtml(item?.label || "Account")}</h2>
  <p class="amolih-pane-subtitle">This menu item opens inside your bespoke account portal.</p>
</div>`;
}

function renderMenuBadge(destination: string, badgeText?: string | null) {
  if (destination === "orders") {
    return `{% if customer and customer.orders.size > 0 %}<span class="amolih-badge">{{ customer.orders.size }}</span>{% endif %}`;
  }
  if (destination === "addresses") {
    return `{% if customer and customer.addresses.size > 0 %}<span class="amolih-badge">{{ customer.addresses.size }} Saved</span>{% endif %}`;
  }
  if (badgeText) {
    return `<span class="amolih-badge">${escapeHtml(badgeText)}</span>`;
  }
  return "";
}

function resolveExternalHref(item: MenuItem, supportUrl: string) {
  const destination = item.destination || "";
  if (/^https?:\/\//i.test(destination) || destination.startsWith("/")) {
    return destination;
  }
  if ((item.linkType || "") === "SUPPORT_ACTION") {
    return supportUrl;
  }
  return destination || supportUrl;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
