import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState } from "preact/hooks";

export default async () => {
  render(<CustomerPortalPage />, document.body);
};

function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState("details");

  // Safe customer detection across preview and authenticated modes
  let firstName = "Sarah";
  let lastName = "Jenkins";
  let displayEmail = "sarah.j@amolih.com";
  let phone = "+91 98234 56789";

  if (typeof globalThis !== "undefined" && globalThis.shopify?.customer) {
    const c = globalThis.shopify.customer;
    if (c.firstName) firstName = c.firstName;
    if (c.lastName) lastName = c.lastName;
    if (c.email) displayEmail = c.email;
    if (c.phone) phone = c.phone;
  }

  return (
    <s-box
      border="base"
      borderRadius="base"
      padding="base"
      background="subdued"
    >
      {/* ============================================================== */}
      {/* 2-COLUMN SIDE-BY-SIDE GRID (CUSTLO SIDEBAR + DETAILS INFO) */}
      {/* ============================================================== */}
      <s-grid
        gridTemplateColumns="280px 1fr"
        gap="loose"
        alignItems="start"
      >

        {/* ================= COLUMN 1: LEFT CUSTLO SIDEBAR ================= */}
        <s-box
          border="base"
          borderRadius="base"
          padding="none"
          background="subdued"
        >
          <s-stack direction="block" gap="none">

            {/* Customer Email Header */}
            <s-box padding="base" background="transparent">
              <s-text tone="subdued" font-size="small">
                {displayEmail}
              </s-text>
            </s-box>
            <s-divider />

            {/* Menu Item 1: My Details */}
            <s-box
              padding="base"
              background={activeTab === "details" ? "base" : "transparent"}
              onClick={() => setActiveTab("details")}
            >
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="inline" gap="tight" alignItems="center">
                  <s-text>👤</s-text>
                  <s-text font-weight={activeTab === "details" ? "bold" : "normal"}>
                    My Details
                  </s-text>
                </s-stack>
                {/* No badge on My Details in Image 2 */}
              </s-stack>
            </s-box>
            <s-divider />

            {/* Menu Item 2: Orders History */}
            <s-box
              padding="base"
              background={activeTab === "orders" ? "base" : "transparent"}
              onClick={() => setActiveTab("orders")}
            >
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="inline" gap="tight" alignItems="center">
                  <s-text>🛒</s-text>
                  <s-text font-weight={activeTab === "orders" ? "bold" : "normal"}>
                    Orders History
                  </s-text>
                </s-stack>
                <s-badge tone="neutral">1</s-badge>
              </s-stack>
            </s-box>
            <s-divider />

            {/* Menu Item 3: Amolih Circle's Progress Bar */}
            <s-box
              padding="base"
              background={activeTab === "circle" ? "base" : "transparent"}
              onClick={() => setActiveTab("circle")}
            >
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="inline" gap="tight" alignItems="center">
                  <s-text>🏅</s-text>
                  <s-text font-weight={activeTab === "circle" ? "bold" : "normal"}>
                    Amolih Circle's Progress Bar
                  </s-text>
                </s-stack>
                <s-badge tone="neutral">Tier 2</s-badge>
              </s-stack>
            </s-box>
            <s-divider />

            {/* Menu Item 4: Addresses */}
            <s-box
              padding="base"
              background={activeTab === "addresses" ? "base" : "transparent"}
              onClick={() => setActiveTab("addresses")}
            >
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="inline" gap="tight" alignItems="center">
                  <s-text>📍</s-text>
                  <s-text font-weight={activeTab === "addresses" ? "bold" : "normal"}>
                    Addresses
                  </s-text>
                </s-stack>
                <s-badge tone="neutral">2 Saved</s-badge>
              </s-stack>
            </s-box>
            <s-divider />

            {/* Menu Item 5: Chat with us */}
            <s-box
              padding="base"
              background={activeTab === "chat" ? "base" : "transparent"}
              onClick={() => setActiveTab("chat")}
            >
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="inline" gap="tight" alignItems="center">
                  <s-text>💬</s-text>
                  <s-text font-weight={activeTab === "chat" ? "bold" : "normal"}>
                    Chat with us
                  </s-text>
                </s-stack>
                <s-badge tone="neutral">Online</s-badge>
              </s-stack>
            </s-box>

            {/* Logout button removed as per Image 2 */}

          </s-stack>
        </s-box>

        {/* ================= COLUMN 2: RIGHT DETAILS INFO ================= */}
        <s-box
          border="base"
          borderRadius="base"
          padding="loose"
          background="base"
        >
          {/* VIEW 1: MY DETAILS / PROFILE INFO (MATCHING IMAGE 2) */}
          {activeTab === "details" && (
            <s-stack direction="block" gap="loose">
              <s-stack direction="block" gap="extraTight">
                <s-heading level={1}>Profile Details</s-heading>
                <s-text tone="subdued" font-size="small">
                  Manage your personal account information and communication settings.
                </s-text>
              </s-stack>

              <s-divider />

              {/* 2-Column Form Fields (Label Above + Outlined Box Below) */}
              <s-grid
                gridTemplateColumns="1fr 1fr"
                gap="base"
              >
                <s-stack direction="block" gap="extraTight">
                  <s-text tone="subdued" font-size="small">First Name</s-text>
                  <s-box border="base" borderRadius="base" padding="base" background="base">
                    <s-text>{firstName || "Sarah"}</s-text>
                  </s-box>
                </s-stack>

                <s-stack direction="block" gap="extraTight">
                  <s-text tone="subdued" font-size="small">Last Name</s-text>
                  <s-box border="base" borderRadius="base" padding="base" background="base">
                    <s-text>{lastName || "Jenkins"}</s-text>
                  </s-box>
                </s-stack>
              </s-grid>

              <s-stack direction="block" gap="extraTight">
                <s-text tone="subdued" font-size="small">Email Address</s-text>
                <s-box border="base" borderRadius="base" padding="base" background="base">
                  <s-text>{displayEmail}</s-text>
                </s-box>
              </s-stack>

              <s-stack direction="block" gap="extraTight">
                <s-text tone="subdued" font-size="small">Contact Phone</s-text>
                <s-box border="base" borderRadius="base" padding="base" background="base">
                  <s-text>{phone || "+91 98234 56789"}</s-text>
                </s-box>
              </s-stack>
            </s-stack>
          )}

          {/* VIEW 2: ORDERS HISTORY */}
          {activeTab === "orders" && (
            <s-stack direction="block" gap="loose">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="block" gap="extraTight">
                  <s-heading level={1}>Orders History</s-heading>
                  <s-text tone="subdued" font-size="small">
                    Review and track your recent store orders.
                  </s-text>
                </s-stack>
                <s-button to="shopify:customer-account/orders" variant="secondary">
                  View in Shopify ↗
                </s-button>
              </s-stack>

              <s-divider />

              <s-box border="base" borderRadius="base" padding="base" background="subdued">
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                    <s-text font-weight="bold">Order #1042</s-text>
                    <s-badge tone="success">Fulfilled</s-badge>
                  </s-stack>
                  <s-text font-weight="bold" font-size="large">₹3,450.00</s-text>
                  <s-text tone="subdued" font-size="small">
                    Placed on 28 Oct 2026 &bull; Standard Express Shipping (Delivered)
                  </s-text>
                  <s-divider />
                  <s-text font-size="small">Item: Amolih Heritage Silk Shawl (x1)</s-text>
                </s-stack>
              </s-box>
            </s-stack>
          )}

          {/* VIEW 3: AMOLIH CIRCLE VIP REWARDS */}
          {activeTab === "circle" && (
            <s-stack direction="block" gap="loose">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="block" gap="extraTight">
                  <s-heading level={1}>Amolih Circle's Progress Bar</s-heading>
                  <s-text tone="subdued" font-size="small">
                    You are currently on Gold Tier (620 / 1,000 Points to Platinum).
                  </s-text>
                </s-stack>
                <s-badge tone="attention">Tier 2 Gold</s-badge>
              </s-stack>

              <s-divider />

              <s-box border="base" borderRadius="base" padding="base" background="subdued">
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                    <s-text font-weight="bold">Tier Progress</s-text>
                    <s-text font-weight="bold">62% Complete</s-text>
                  </s-stack>
                  <s-text tone="subdued" font-size="small">
                    Earn 380 more points on your next purchase to reach Platinum Tier and unlock 10% store credit rewards.
                  </s-text>
                </s-stack>
              </s-box>

              <s-stack direction="inline" gap="base" justifyContent="space-between">
                <s-box inlineSize="31%" border="base" borderRadius="base" padding="base">
                  <s-stack direction="block" gap="tight">
                    <s-text font-weight="bold">🚚 Express Shipping</s-text>
                    <s-text tone="subdued" font-size="small">Priority carrier dispatch.</s-text>
                  </s-stack>
                </s-box>
                <s-box inlineSize="31%" border="base" borderRadius="base" padding="base">
                  <s-stack direction="block" gap="tight">
                    <s-text font-weight="bold">🔄 14-Day Returns</s-text>
                    <s-text tone="subdued" font-size="small">Hassle-free exchange guarantee.</s-text>
                  </s-stack>
                </s-box>
                <s-box inlineSize="31%" border="base" borderRadius="base" padding="base">
                  <s-stack direction="block" gap="tight">
                    <s-text font-weight="bold">💬 24/7 Concierge</s-text>
                    <s-text tone="subdued" font-size="small">Direct WhatsApp stylist support.</s-text>
                  </s-stack>
                </s-box>
              </s-stack>
            </s-stack>
          )}

          {/* VIEW 4: ADDRESSES */}
          {activeTab === "addresses" && (
            <s-stack direction="block" gap="loose">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="block" gap="extraTight">
                  <s-heading level={1}>Saved Shipping Addresses</s-heading>
                  <s-text tone="subdued" font-size="small">
                    Manage your delivery locations.
                  </s-text>
                </s-stack>
                <s-button to="shopify:customer-account/addresses" variant="secondary">
                  Manage in Shopify ↗
                </s-button>
              </s-stack>

              <s-divider />

              <s-box border="base" borderRadius="base" padding="base" background="subdued">
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                    <s-text font-weight="bold">Sarah Jenkins</s-text>
                    <s-badge tone="info">Default</s-badge>
                  </s-stack>
                  <s-text tone="subdued" font-size="small">
                    42 Marina Boulevard, Apt 9B<br />
                    Mumbai, Maharashtra 400001<br />
                    India
                  </s-text>
                </s-stack>
              </s-box>
            </s-stack>
          )}

          {/* VIEW 5: CHAT WITH US */}
          {activeTab === "chat" && (
            <s-stack direction="block" gap="loose">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <s-stack direction="block" gap="extraTight">
                  <s-heading level={1}>Amolih WhatsApp Concierge</s-heading>
                  <s-text tone="subdued" font-size="small">
                    Connect directly with our personal shopping and support team.
                  </s-text>
                </s-stack>
                <s-badge tone="success">Online Now</s-badge>
              </s-stack>

              <s-divider />

              <s-box border="base" borderRadius="base" padding="base" background="subdued">
                <s-stack direction="block" gap="tight" alignItems="center">
                  <s-text font-size="large">💬</s-text>
                  <s-text font-weight="bold">Direct WhatsApp Concierge</s-text>
                  <s-text tone="subdued" font-size="small">
                    Available Monday to Saturday (9:00 AM – 8:00 PM IST) for size advice, bespoke orders, and order assistance.
                  </s-text>
                  <s-button
                    to="https://wa.me/918233905718?text=Hi+AMOLIH%21+I+have+a+question."
                    external
                    variant="primary"
                  >
                    Open WhatsApp Chat (+91 82339 05718)
                  </s-button>
                </s-stack>
              </s-box>
            </s-stack>
          )}
        </s-box>
      </s-grid>
    </s-box>
  );
}
