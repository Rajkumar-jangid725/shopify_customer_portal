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

  // TYPOGRAPHY ENGINE:
  // If 'inherit' or empty, seamlessly adopt storefront theme typography (Dawn/Sense/etc.)
  // If a specific font name is specified, load Google Fonts stylesheet and apply font family.
  const isInheritTheme =
    !rawFontFamily ||
    rawFontFamily === "inherit" ||
    rawFontFamily.toLowerCase().includes("inherit") ||
    rawFontFamily.toLowerCase().includes("theme");

  let googleFontLink = "";
  let bodyFontFamily =
    "var(--font-body-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)";
  let headingFontFamily =
    "var(--font-heading-family, var(--font-body-family, inherit))";

  if (!isInheritTheme) {
    const fontName = rawFontFamily.split(",")[0].replace(/['"]/g, "").trim();
    if (
      fontName &&
      !fontName.startsWith("-apple-system") &&
      fontName !== "sans-serif" &&
      fontName !== "serif"
    ) {
      googleFontLink = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">`;
      bodyFontFamily = `'${fontName}', var(--font-body-family, -apple-system, sans-serif)`;
      headingFontFamily = `'${fontName}', var(--font-heading-family, var(--font-body-family, inherit))`;
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
        <span class="amolih-menu-label"><span class="amolih-icon">${escapeHtml(item.icon || "🔗")}</span>${escapeHtml(item.label)}</span>
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
  .amolih-dashboard {
    --amolih-primary: ${primary};
    --amolih-sidebar: ${sidebarBg};
    --amolih-text: ${textColor};
    --amolih-font-family: ${bodyFontFamily};
    --amolih-heading-font: ${headingFontFamily};
    font-family: var(--amolih-font-family);
    color: var(--amolih-text);
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3.5rem;
    line-height: 1.5;
  }
  .amolih-dashboard * {
    box-sizing: border-box;
  }
  .amolih-dashboard h1,
  .amolih-dashboard h2,
  .amolih-dashboard h3,
  .amolih-dashboard h4 {
    font-family: var(--amolih-heading-font);
    font-weight: var(--font-heading-weight, 700);
    letter-spacing: var(--font-heading-letter-spacing, -0.01em);
    color: var(--amolih-text);
  }
  .amolih-dashboard h1 { margin: 0 0 0.35rem; font-size: 1.85rem; }
  .amolih-dashboard h2 { margin: 0 0 0.5rem; font-size: 1.35rem; }
  .amolih-dashboard input,
  .amolih-dashboard button,
  .amolih-dashboard select,
  .amolih-dashboard textarea,
  .amolih-dashboard label,
  .amolih-dashboard a {
    font-family: inherit;
  }
  .amolih-muted { color: #64748B; margin: 0 0 1rem; }
  .amolih-layout {
    display: grid;
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
    gap: 1.5rem;
    align-items: start;
    margin-top: 1rem;
  }
  @media (max-width: 800px) {
    .amolih-layout { grid-template-columns: 1fr; }
  }
  .amolih-sidebar {
    background: var(--amolih-sidebar);
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .amolih-email {
    font-size: 0.85rem;
    color: #64748B;
    padding: 0.5rem 0.75rem 0.75rem;
    word-break: break-word;
    font-weight: 500;
  }
  .amolih-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0.85rem;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    font-size: 0.95rem;
    transition: all 0.15s ease;
  }
  .amolih-menu-item:hover {
    background: rgba(255, 255, 255, 0.7);
  }
  .amolih-menu-item.is-active {
    background: var(--amolih-primary);
    color: #FFFFFF !important;
    font-weight: 600;
  }
  .amolih-menu-label { display: inline-flex; align-items: center; gap: 0.65rem; }
  .amolih-icon { width: 1.25rem; text-align: center; }
  .amolih-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: #E2E8F0;
    color: #1E293B;
    font-size: 0.75rem;
    padding: 0.15rem 0.6rem;
    white-space: nowrap;
    font-weight: 600;
  }
  .amolih-menu-item.is-active .amolih-badge {
    background: rgba(255,255,255,0.25);
    color: #FFFFFF;
  }
  .amolih-panel {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .amolih-divider {
    border: 0;
    border-bottom: 1px solid #E2E8F0;
    margin: 1rem 0 1.25rem;
  }
  .amolih-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .amolih-field-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 0.85rem 1rem;
  }
  .amolih-field-box label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748B;
    margin-bottom: 0.3rem;
  }
  .amolih-field-val {
    font-size: 1rem;
    color: var(--amolih-text);
    word-break: break-word;
  }
  .amolih-span-2 { grid-column: 1 / -1; }
  .amolih-card {
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 1rem 1.15rem;
    background: #FAFAFA;
    margin-bottom: 0.85rem;
    transition: border-color 0.15s ease;
  }
  .amolih-card:hover {
    border-color: #CBD5E1;
  }
  .amolih-card-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.4rem;
  }
  .amolih-banner {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: 12px;
    padding: 1.5rem;
  }
  .amolih-actions { margin-top: 1rem; }
  .amolih-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--amolih-primary);
    color: #FFFFFF !important;
    text-decoration: none;
    padding: 0.65rem 1.25rem;
    border-radius: 8px;
    font-size: 0.92rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .amolih-button:hover {
    opacity: 0.92;
  }
  .amolih-button-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    color: var(--amolih-text) !important;
    text-decoration: none;
    padding: 0.6rem 1.15rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid #CBD5E1;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .amolih-button-secondary:hover {
    background: #F8FAFC;
    border-color: #94A3B8;
  }
  .amolih-btn-sm {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
    border-radius: 6px;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    color: var(--amolih-text);
    cursor: pointer;
    text-decoration: none;
    font-weight: 500;
  }
  .amolih-btn-sm:hover {
    background: #F1F5F9;
  }
  .amolih-btn-danger {
    color: #DC2626 !important;
    border-color: #FECACA !important;
  }
  .amolih-btn-danger:hover {
    background: #FEF2F2 !important;
  }
  .amolih-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }
  .amolih-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .amolih-form-group label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #475569;
  }
  .amolih-input {
    width: 100%;
    padding: 0.65rem 0.85rem;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    font-size: 0.95rem;
    background: #FFFFFF;
    color: var(--amolih-text);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .amolih-input:focus {
    outline: none;
    border-color: var(--amolih-primary);
    box-shadow: 0 0 0 3px rgba(53, 94, 89, 0.15);
  }
  .amolih-help-text {
    font-size: 0.75rem;
    color: #64748B;
  }
  .amolih-form-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }
  .amolih-alert {
    padding: 0.85rem 1.15rem;
    border-radius: 8px;
    margin-bottom: 1.25rem;
    font-size: 0.92rem;
    display: flex;
    align-items: center;
    gap: 0.65rem;
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
  .amolih-progress {
    height: 12px;
    border-radius: 999px;
    background: #E2E8F0;
    overflow: hidden;
  }
  .amolih-progress span {
    display: block;
    height: 100%;
    background: var(--amolih-primary);
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .amolih-circle-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(53, 94, 89, 0.1);
    color: var(--amolih-primary);
    font-size: 0.8rem;
    font-weight: 600;
  }
  .amolih-page-container {
    width: 100%;
    min-height: 250px;
  }
  .amolih-page-rte {
    font-size: 1rem;
    line-height: 1.65;
    color: var(--amolih-text);
  }
  .amolih-page-rte img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }
  .amolih-page-rte table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }
  .amolih-page-rte th,
  .amolih-page-rte td {
    border: 1px solid #E2E8F0;
    padding: 0.65rem 0.85rem;
    text-align: left;
  }
  .amolih-page-rte th {
    background: #F8FAFC;
    font-weight: 600;
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
  <h1>${title}</h1>
  {% if customer %}
    <p class="amolih-muted">${welcome}, {{ customer.first_name | default: customer.email | escape }}</p>
  {% else %}
    <p class="amolih-muted">${welcome}</p>
  {% endif %}

  ${successMessage ? `<div class="amolih-alert amolih-alert-success"><span>✓</span> <span>${escapeHtml(successMessage)}</span></div>` : ""}
  ${errorMessage ? `<div class="amolih-alert amolih-alert-error"><span>⚠</span> <span>${escapeHtml(errorMessage)}</span></div>` : ""}

  <div class="amolih-layout">
    <aside class="amolih-sidebar">
      {% if customer %}
        <div class="amolih-email">{{ customer.email | escape }}</div>
      {% endif %}
      ${menuHtml}
    </aside>
    <div>
      {% unless customer %}
        <div class="amolih-banner">
          <h2>Sign in Required</h2>
          <p class="amolih-muted" style="margin-bottom:1rem;">Please sign in to view and manage your account details, addresses, and orders.</p>
          <div class="amolih-actions"><a class="amolih-button" href="/account/login">Sign in</a></div>
        </div>
      {% else %}
        ${panelHtml}
      {% endunless %}
    </div>
  </div>
</section>

<script>
  (function() {
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
  // 1. ORDERS HISTORY
  if (activeTab === "orders") {
    return `<div class="amolih-panel">
  <h2>Orders history</h2>
  <p class="amolih-muted">{{ customer.orders.size }} {% if customer.orders.size == 1 %}order{% else %}orders{% endif %} recorded on this account.</p>
  <hr class="amolih-divider" />
  {% if customer.orders.size == 0 %}
    <div style="text-align:center; padding:3rem 1rem;">
      <div style="font-size:3rem; margin-bottom:0.75rem;">🛒</div>
      <p class="amolih-muted">You have no orders yet.</p>
      <a href="/collections/all" class="amolih-button" style="margin-top:0.5rem;">Explore Store Catalog</a>
    </div>
  {% else %}
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
      <article class="amolih-card" data-order-currency="{{ order_curr }}">
        <div class="amolih-card-row">
          <strong>{{ order.name | escape }}</strong>
          <span class="amolih-badge">{{ order.fulfillment_status | default: "unfulfilled" | escape }}</span>
        </div>
        <div class="amolih-order-total-price" style="font-size:1.1rem; font-weight:700; color:var(--amolih-primary);" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ order_total }}">
          {{ curr_symbol }}{{ order_total }}
        </div>
        <div class="amolih-muted" style="font-size:0.85rem; margin-top:0.25rem;">
          Placed on {{ order.created_at | date: "%b %d, %Y" }} &bull; Payment: {{ order.financial_status | escape }}
        </div>
        <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px dashed #E2E8F0; font-size:0.9rem;">
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
            <div style="display:flex; justify-content:space-between; padding:0.25rem 0;">
              <span>{{ line.title | escape }} &times; {{ line.quantity }}</span>
              <span class="amolih-line-price" style="font-weight:600;" data-currency="{{ order_curr }}" data-symbol="{{ curr_symbol }}" data-amount="{{ line_price }}">{{ curr_symbol }}{{ line_price }}</span>
            </div>
          {% endfor %}
        </div>
        {% if order.order_status_url %}
          <div style="margin-top:0.75rem;">
            <a href="{{ order.order_status_url }}" target="_blank" rel="noopener" class="amolih-btn-sm">View Tracking & Invoice ↗</a>
          </div>
        {% endif %}
      </article>
    {% endfor %}
  {% endif %}
</div>`;
  }

  // 2. SAVED ADDRESSES (FULL CRUD)
  if (activeTab === "addresses") {
    return `<div class="amolih-panel">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:10px;">
    <div>
      <h2 style="margin:0;">Saved addresses</h2>
      <p class="amolih-muted" style="margin:0.25rem 0 0;">Delivery locations linked to your customer session.</p>
    </div>
    <button type="button" class="amolih-button" id="amolih-open-add-address-btn">
      + Add New Address
    </button>
  </div>
  <hr class="amolih-divider" />

  <!-- Add New Address Form -->
  <div id="amolih-add-address-box" style="display:none; margin-bottom:1.5rem; padding:1.25rem; border:1px solid #CBD5E1; border-radius:10px; background:#F8FAFC;">
    <h3 style="margin:0 0 1rem; font-size:1.15rem;">Add New Delivery Address</h3>
    <form method="post" action="${pathPrefix}?tab=addresses" class="amolih-ajax-form">
      <input type="hidden" name="action_type" value="create_address" />
      <div class="amolih-form-grid">
        <div class="amolih-form-group">
          <label>First Name</label>
          <input type="text" name="first_name" value="{{ customer.first_name | escape }}" class="amolih-input" placeholder="e.g. John" />
        </div>
        <div class="amolih-form-group">
          <label>Last Name</label>
          <input type="text" name="last_name" value="{{ customer.last_name | escape }}" class="amolih-input" placeholder="e.g. Doe" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label>Company (Optional)</label>
          <input type="text" name="company" placeholder="Apartment / Suite / Business" class="amolih-input" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label>Street Address *</label>
          <input type="text" name="address1" required placeholder="House number, flat, street name" class="amolih-input" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label>Apartment, suite, unit (Optional)</label>
          <input type="text" name="address2" placeholder="Floor, Landmark, etc." class="amolih-input" />
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
          <label>Contact Phone</label>
          <input type="tel" name="phone" placeholder="+91..." class="amolih-input" />
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" name="is_default" value="true" />
            <span>Set as my default shipping address</span>
          </label>
        </div>
      </div>
      <div class="amolih-form-actions">
        <button type="submit" class="amolih-button">Save Address</button>
        <button type="button" class="amolih-button-secondary" id="amolih-close-add-address-btn">Cancel</button>
      </div>
    </form>
  </div>

  <!-- Address List -->
  {% if customer.addresses.size == 0 %}
    <div style="text-align:center; padding:3rem 1rem;">
      <div style="font-size:3rem; margin-bottom:0.75rem;">📍</div>
      <p class="amolih-muted">You have no saved addresses yet.</p>
    </div>
  {% else %}
    <div style="display:flex; flex-direction:column; gap:0.85rem;">
      {% for address in customer.addresses %}
        <article class="amolih-card" id="addr-card-{{ address.id }}">
          <div class="amolih-card-row">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong>{{ address.name | default: "Delivery Location" | escape }}</strong>
              {% if address == customer.default_address %}
                <span class="amolih-badge" style="background:#DCFCE7; color:#15803D;">Default</span>
              {% endif %}
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="amolih-btn-sm amolih-btn-edit-addr" data-id="{{ address.id }}">✏️ Edit</button>
              {% unless address == customer.default_address %}
                <form method="post" action="${pathPrefix}?tab=addresses" style="display:inline;">
                  <input type="hidden" name="action_type" value="set_default_address" />
                  <input type="hidden" name="address_id" value="{{ address.id }}" />
                  <button type="submit" class="amolih-btn-sm">Set Default</button>
                </form>
              {% endunless %}
              <form method="post" action="${pathPrefix}?tab=addresses" style="display:inline;" onsubmit="return confirm('Delete this saved address?');">
                <input type="hidden" name="action_type" value="delete_address" />
                <input type="hidden" name="address_id" value="{{ address.id }}" />
                <button type="submit" class="amolih-btn-sm amolih-btn-danger">Delete</button>
              </form>
            </div>
          </div>
          <div style="color:#475569; font-size:0.95rem; line-height:1.6; margin-top:0.4rem;">
            {{ address | format_address }}
            {% if address.phone != blank %}
              <div style="font-size:0.85rem; color:#64748B; margin-top:4px;">📞 {{ address.phone | escape }}</div>
            {% endif %}
          </div>

          <!-- Inline Edit Form -->
          <div id="addr-edit-form-{{ address.id }}" style="display:none; margin-top:1rem; padding-top:1rem; border-top:1px dashed #CBD5E1;">
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
                  <label>Apartment, suite, unit (Optional)</label>
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
                  <label>Postal / ZIP Code *</label>
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
                      <span>Set as my default shipping address</span>
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
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:0.75rem;">
    <div>
      <h2 style="margin:0;">
        {% if circle_page and circle_page.title != blank %}
          {{ circle_page.title | escape }}
        {% else %}
          ${circleTitle}
        {% endif %}
      </h2>
      <p class="amolih-muted" style="margin:0.25rem 0 0;">/pages/${escapeHtml(cleanHandle)}</p>
    </div>
    <a href="${escapeHtml(targetUrl)}" target="_blank" rel="noopener" class="amolih-button-secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem; text-decoration:none;">
      Open Full Page ↗
    </a>
  </div>
  <hr class="amolih-divider" style="margin-bottom:1.25rem;" />

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
        style="display:none; width:100%; min-height:650px; border:1px solid #E2E8F0; border-radius:8px;"
        loading="lazy"
      ></iframe>
    {% endif %}
  </div>

  <script>
    (function() {
      var loader = document.getElementById("amolih-circle-loader");
      var fetched = document.getElementById("amolih-circle-fetched-content");
      var frame = document.getElementById("amolih-circle-frame");
      if (!loader) return; // Liquid already rendered circle_page.content directly!

      fetch("${escapeHtml(targetUrl)}")
        .then(function(res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function(html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, "text/html");

          // Extract main page content from storefront theme
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
            // Remove store headers/footers/navbars if nested inside main
            var unwanted = extracted.querySelectorAll("header, footer, nav, .announcement-bar, #shopify-section-header, #shopify-section-footer, .header-wrapper, .footer");
            unwanted.forEach(function(u) { u.remove(); });

            if (extracted.textContent.trim().length > 10 || extracted.querySelector("img, svg, video, form, table, [class*='loyalty'], [class*='progress'], [class*='tier']")) {
              fetched.innerHTML = extracted.innerHTML;
              loader.style.display = "none";
              fetched.style.display = "block";
              return;
            }
          }

          // If extraction is empty or relies on theme sections/scripts, embed responsive iframe
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

  // 4. PROFILE DETAILS (EDITABLE FROM LIVE USER SESSION)
  if (activeTab === "details") {
    return `<div class="amolih-panel">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:10px;">
    <div>
      <h2 style="margin:0;">Profile details</h2>
      <p class="amolih-muted" style="margin:0.25rem 0 0;">Your personal account information and primary contact details.</p>
    </div>
    <button type="button" class="amolih-button-secondary" id="amolih-toggle-edit-profile">
      ✏️ Edit Profile
    </button>
  </div>
  <hr class="amolih-divider" />

  <!-- View Mode -->
  <div id="amolih-profile-view">
    <div class="amolih-fields">
      <div class="amolih-field-box">
        <label>First name</label>
        <div class="amolih-field-val">{{ customer.first_name | default: "Not added" | escape }}</div>
      </div>
      <div class="amolih-field-box">
        <label>Last name</label>
        <div class="amolih-field-val">{{ customer.last_name | default: "Not added" | escape }}</div>
      </div>
      <div class="amolih-field-box amolih-span-2">
        <label>Email address</label>
        <div class="amolih-field-val">{{ customer.email | default: "Not added" | escape }}</div>
      </div>
      <div class="amolih-field-box amolih-span-2">
        <label>Contact phone</label>
        <div class="amolih-field-val">{{ customer.phone | default: "Not added" | escape }}</div>
      </div>
      <div class="amolih-field-box">
        <label>Total Orders</label>
        <div class="amolih-field-val">{{ customer.orders.size }} orders</div>
      </div>
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
      <div class="amolih-field-box">
        <label>Total Spent</label>
        <div class="amolih-field-val amolih-total-spent-val" style="font-weight:700; color:var(--amolih-primary);" data-currency="{{ cust_curr }}" data-symbol="{{ cust_symbol }}" data-amount="{% if total_spent_calc > 0 %}{{ total_spent_calc }}{% elsif customer.total_spent > 0 %}{{ customer.total_spent | money_without_currency | remove: ',' }}{% else %}0.00{% endif %}">
          {% if total_spent_calc > 0 %}
            {{ cust_symbol }}{{ total_spent_calc | round: 2 }}
          {% elsif customer.total_spent > 0 %}
            {{ cust_symbol }}{{ customer.total_spent | money_without_currency }}
          {% else %}
            {{ cust_symbol }}0.00
          {% endif %}
        </div>
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
          <small class="amolih-help-text">Primary contact for notifications and order receipts.</small>
        </div>
        <div class="amolih-form-group amolih-span-2">
          <label for="prof_phone">Contact Phone</label>
          <input type="tel" id="prof_phone" name="phone" value="{{ customer.phone | escape }}" placeholder="+91 98765 43210" class="amolih-input" />
          <small class="amolih-help-text">Include country code (e.g. +91...) for SMS order notifications.</small>
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
  <h2>${escapeHtml(item?.label || "Account")}</h2>
  <p class="amolih-muted">This menu item opens inside your account portal.</p>
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
