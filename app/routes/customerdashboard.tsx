import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
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

/**
 * App Proxy dashboard.
 * Portal branding/menu come from our DB. Customer PII/orders/addresses come from
 * Liquid `customer` (storefront session) so we do not need Protected Customer Data
 * Admin API approval for this page.
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

  const config = await getPortalConfig(shop);
  const menuItems = (config.menuItems || []).filter(
    (item: MenuItem) => item.isEnabled !== false,
  );
  const activeTab = resolveActiveTab(tab, menuItems);

  return liquid(
    renderDashboardHtml({
      config,
      menuItems,
      activeTab,
      pathPrefix,
    }),
  );
};

function resolveActiveTab(tab: string, menuItems: MenuItem[]) {
  const enabledInternal = menuItems
    .filter((item) => !isExternalItem(item))
    .map((item) => (item.destination || "details").toLowerCase());

  if (enabledInternal.includes(tab)) return tab;
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
  };
  menuItems: MenuItem[];
  activeTab: string;
  pathPrefix: string;
}) {
  const title = escapeHtml(config.portalTitle || "Amolih Customer Portal");
  const welcome = escapeHtml(config.welcomeMessage || "Welcome back");
  const primary = escapeHtml(config.primaryColor || "#355E59");
  const sidebarBg = escapeHtml(config.sidebarBgColor || "#FBF8F5");
  const textColor = escapeHtml(config.textColor || "#1A1A1A");
  const fontFamily = escapeHtml(
    config.fontFamily || "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  );
  const supportUrl =
    config.supportUrl ||
    "https://wa.me/918233905718?text=Hi+AMOLIH%21+I+have+a+question.";
  const circleTitle = escapeHtml(
    config.circleTierTitle || "Amolih Circle's Progress Bar",
  );

  const menuHtml = menuItems
    .map((item) => {
      const destination = (item.destination || "details").toLowerCase();
      const external = isExternalItem(item);
      const active = !external && destination === activeTab.toLowerCase();
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

  const panelHtml = renderPanelLiquid(activeTab, menuItems, circleTitle);

  return `
<style>
  .amolih-dashboard {
    --amolih-primary: ${primary};
    --amolih-sidebar: ${sidebarBg};
    --amolih-text: ${textColor};
    font-family: ${fontFamily};
    color: var(--amolih-text);
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }
  .amolih-dashboard h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
  .amolih-dashboard h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
  .amolih-muted { color: #666; margin: 0 0 1rem; }
  .amolih-layout {
    display: grid;
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 800px) {
    .amolih-layout { grid-template-columns: 1fr; }
  }
  .amolih-sidebar {
    background: var(--amolih-sidebar);
    border: 1px solid #e8e2da;
    border-radius: 12px;
    padding: 0.75rem;
  }
  .amolih-email {
    font-size: 0.85rem;
    color: #666;
    padding: 0.5rem 0.75rem 0.75rem;
    word-break: break-word;
  }
  .amolih-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
  }
  .amolih-menu-item:hover,
  .amolih-menu-item.is-active {
    background: #fff;
  }
  .amolih-menu-label { display: inline-flex; align-items: center; gap: 0.6rem; }
  .amolih-icon { width: 1.25rem; text-align: center; }
  .amolih-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: #efe8df;
    color: #5b4636;
    font-size: 0.75rem;
    padding: 0.15rem 0.55rem;
    white-space: nowrap;
  }
  .amolih-panel {
    background: #fff;
    border: 1px solid #e8e2da;
    border-radius: 12px;
    padding: 1.25rem;
  }
  .amolih-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .amolih-fields label {
    display: block;
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 0.25rem;
  }
  .amolih-span-2 { grid-column: 1 / -1; }
  .amolih-card {
    border: 1px solid #e8e2da;
    border-radius: 10px;
    padding: 0.9rem 1rem;
    background: #faf7f3;
    margin-bottom: 0.75rem;
  }
  .amolih-card-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.35rem;
  }
  .amolih-banner {
    background: #fff8e8;
    border: 1px solid #f0d9a0;
    border-radius: 12px;
    padding: 1.25rem;
  }
  .amolih-actions { margin-top: 1rem; }
  .amolih-button {
    display: inline-block;
    background: var(--amolih-primary);
    color: #fff !important;
    text-decoration: none;
    padding: 0.65rem 1rem;
    border-radius: 8px;
  }
  .amolih-progress {
    height: 10px;
    border-radius: 999px;
    background: #ece6df;
    overflow: hidden;
  }
  .amolih-progress span {
    display: block;
    height: 100%;
    background: var(--amolih-primary);
  }
</style>
<section class="amolih-dashboard">
  <h1>${title}</h1>
  {% if customer %}
    <p class="amolih-muted">${welcome}, {{ customer.first_name | default: customer.email | escape }}</p>
  {% else %}
    <p class="amolih-muted">${welcome}</p>
  {% endif %}
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
          Please sign in to view your dashboard.
          <div class="amolih-actions"><a class="amolih-button" href="/account/login">Sign in</a></div>
        </div>
      {% else %}
        ${panelHtml}
      {% endunless %}
    </div>
  </div>
</section>`;
}

function renderPanelLiquid(
  activeTab: string,
  menuItems: MenuItem[],
  circleTitle: string,
) {
  if (activeTab === "orders") {
    return `{% comment %} orders panel {% endcomment %}
<div class="amolih-panel">
  <h2>Orders history</h2>
  <p class="amolih-muted">{{ customer.orders.size }} {% if customer.orders.size == 1 %}order{% else %}orders{% endif %}</p>
  {% if customer.orders.size == 0 %}
    <p class="amolih-muted">You have no orders yet.</p>
  {% else %}
    {% for order in customer.orders %}
      <article class="amolih-card">
        <div class="amolih-card-row">
          <strong>{{ order.name | escape }}</strong>
          <span class="amolih-badge">{{ order.fulfillment_status | default: "unfulfilled" | escape }}</span>
        </div>
        <div><strong>{{ order.total_price | money }}</strong></div>
        <div class="amolih-muted">Placed on {{ order.created_at | date: "%b %d, %Y" }}</div>
        {% for line in order.line_items limit: 5 %}
          <div class="amolih-muted">{{ line.title | escape }} × {{ line.quantity }}</div>
        {% endfor %}
      </article>
    {% endfor %}
  {% endif %}
</div>`;
  }

  if (activeTab === "addresses") {
    return `<div class="amolih-panel">
  <h2>Saved addresses</h2>
  <p class="amolih-muted">Delivery locations on this account.</p>
  {% if customer.addresses.size == 0 %}
    <p class="amolih-muted">You have no saved addresses yet.</p>
  {% else %}
    {% for address in customer.addresses %}
      <article class="amolih-card">
        <div class="amolih-card-row">
          <strong>{{ address.name | default: "Address" | escape }}</strong>
          {% if address == customer.default_address %}
            <span class="amolih-badge">Default</span>
          {% endif %}
        </div>
        {{ address | format_address }}
      </article>
    {% endfor %}
  {% endif %}
</div>`;
  }

  if (activeTab === "circle") {
    return `<div class="amolih-panel">
  <h2>${circleTitle}</h2>
  <p class="amolih-muted">Gold tier. 620 of 1,000 points to Platinum.</p>
  <div class="amolih-progress"><span style="width:62%"></span></div>
</div>`;
  }

  if (activeTab === "details") {
    return `<div class="amolih-panel">
  <h2>Profile details</h2>
  <p class="amolih-muted">Your name, email, and phone from this customer account.</p>
  <div class="amolih-fields">
    <div><label>First name</label><div>{{ customer.first_name | default: "Not added" | escape }}</div></div>
    <div><label>Last name</label><div>{{ customer.last_name | default: "Not added" | escape }}</div></div>
    <div class="amolih-span-2"><label>Email address</label><div>{{ customer.email | default: "Not added" | escape }}</div></div>
    <div class="amolih-span-2"><label>Contact phone</label><div>{{ customer.phone | default: "Not added" | escape }}</div></div>
  </div>
</div>`;
  }

  const item = menuItems.find(
    (entry) => (entry.destination || "").toLowerCase() === activeTab,
  );
  return `<div class="amolih-panel">
  <h2>${escapeHtml(item?.label || "Account")}</h2>
  <p class="amolih-muted">This menu item opens inside your account portal.</p>
</div>`;
}

function renderMenuBadge(destination: string, badgeText?: string | null) {
  // Orders/addresses badges must reflect the logged-in customer, not static admin seed text.
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
