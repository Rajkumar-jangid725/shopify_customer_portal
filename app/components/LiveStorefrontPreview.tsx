import React, { useState } from "react";
import { Card, Text, ButtonGroup, Button } from "@shopify/polaris";
import type { MenuItemData } from "../services/portal.server";

export interface LiveStorefrontPreviewProps {
  settings: any;
  customCss: string;
  fontFamily: string;
  menuItems: MenuItemData[];
  config: any;
  previewDevice: "desktop" | "mobile";
  setPreviewDevice: (device: "desktop" | "mobile") => void;
  previewTab: string;
  setPreviewTab: (tab: string) => void;
}

export function LiveStorefrontPreview({
  settings,
  customCss,
  fontFamily,
  menuItems,
  config,
  previewDevice,
  setPreviewDevice,
  previewTab,
  setPreviewTab,
}: LiveStorefrontPreviewProps) {
  const [previewSearch, setPreviewSearch] = useState("");
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);

  const activeColor = settings.navigationStyle?.activeItemBg || settings.colorTypography?.primaryBtnBg || "#355E59";
  const itemsBg = settings.navigationStyle?.itemsBg || "#FBF8F5";
  const textColor = settings.colorTypography?.textColor || "#1A1A1A";
  const headingColor = settings.colorTypography?.headingColor || "#1A1A1A";
  const borderColor = settings.colorTypography?.borderColor || "#E8E3DD";
  const inputBg = settings.colorTypography?.inputBgColor || "#FAF7F2";
  const containerBg = settings.colorTypography?.fullContainerBg || "#FAF7F2";
  const cardBg = settings.colorTypography?.halfContainerBg || "#FFFFFF";
  const primaryBtnBg = settings.colorTypography?.primaryBtnBg || activeColor;
  const primaryBtnText = settings.colorTypography?.primaryBtnText || "#FFFFFF";
  const activeItemText = settings.navigationStyle?.activeItemText || "#FFFFFF";
  const hoverItemBg = settings.navigationStyle?.hoverItemBg || "#C5A880";
  const customerNameColor = settings.navigationStyle?.customerName || "#1A1A1A";
  const navBorder = settings.navigationStyle?.border || "#E5E5E5";
  const headingSize = settings.colorTypography?.headingSize || 26;
  const bodySize = settings.colorTypography?.textSize || 14;
  const menuSize = settings.navigationStyle?.menuTextSize || 14;

  const resolvedFontFamily =
    fontFamily === "amolih"
      ? "'Inter', -apple-system, sans-serif"
      : fontFamily === "inherit"
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      : fontFamily;

  const resolvedHeadingFont =
    fontFamily === "amolih"
      ? "'Bellefair', 'Cormorant Garamond', Georgia, serif"
      : fontFamily === "inherit"
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      : fontFamily;

  return (
    <div style={{ position: "sticky", top: "16px" }}>
      <Card padding="0">
        {/* Live Preview Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            borderBottom: "1px solid #E2E8F0",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px 12px 0 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Text as="h2" variant="headingMd">
              Live preview
            </Text>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: "#DCFCE7",
                color: "#166534",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              ● Live Storefront View
            </span>
          </div>

          <ButtonGroup variant="segmented">
            <Button
              pressed={previewDevice === "desktop"}
              onClick={() => setPreviewDevice("desktop")}
              size="slim"
            >
              Desktop
            </Button>
            <Button
              pressed={previewDevice === "mobile"}
              onClick={() => setPreviewDevice("mobile")}
              size="slim"
            >
              Mobile
            </Button>
          </ButtonGroup>
        </div>

        {/* Live Portal Simulation Canvas */}
        <div
          style={{
            padding: previewDevice === "mobile" ? "12px" : "18px",
            backgroundColor: containerBg,
            maxWidth: previewDevice === "mobile" ? "420px" : "100%",
            margin: previewDevice === "mobile" ? "0 auto" : "0",
            boxSizing: "border-box",
            borderRadius: "0 0 12px 12px",
            minHeight: "620px",
            overflowX: "hidden",
            transition: "max-width 0.25s ease",
          }}
        >
          {/* Live Dynamic Stylesheet */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
                .amolih-pv-scope {
                  --amolih-primary: ${activeColor};
                  --amolih-gold: #C5A880;
                  --amolih-gold-dark: #A8895E;
                  --amolih-gold-border: rgba(197, 168, 128, 0.35);
                  --amolih-sidebar: ${itemsBg};
                  --amolih-card-bg: ${cardBg};
                  --amolih-text: ${textColor};
                  --amolih-text-muted: #64748B;
                  --amolih-border: ${borderColor};
                  --amolih-border-light: #F4EFEB;
                  --amolih-btn-bg: ${primaryBtnBg};
                  --amolih-btn-text: ${primaryBtnText};
                  --amolih-container-bg: ${containerBg};
                  --amolih-nav-border: ${navBorder};
                  --amolih-nav-active-bg: ${activeColor};
                  --amolih-nav-active-text: ${activeItemText};
                  --amolih-nav-hover-bg: ${hoverItemBg};
                  --amolih-radius: 12px;
                  --amolih-radius-lg: 16px;
                  --amolih-radius-sm: 8px;
                  font-family: ${resolvedFontFamily};
                  color: var(--amolih-text);
                  font-size: ${bodySize}px;
                  line-height: 1.5;
                }
                .amolih-pv-scope * { box-sizing: border-box; }
                .amolih-pv-hero {
                  background: linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 50%, #FAF7F2 100%);
                  border: 1px solid var(--amolih-gold-border);
                  border-radius: var(--amolih-radius-lg);
                  padding: 1.15rem 1.35rem;
                  margin-bottom: 1.15rem;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  gap: 1rem;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                }
                .amolih-pv-hero-tag {
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  font-size: 0.68rem;
                  font-weight: 600;
                  letter-spacing: 0.1em;
                  text-transform: uppercase;
                  color: var(--amolih-gold-dark);
                  background: #FFFFFF;
                  border: 1px solid var(--amolih-gold-border);
                  padding: 0.2rem 0.55rem;
                  border-radius: 999px;
                  margin-bottom: 0.25rem;
                }
                .amolih-pv-hero-title {
                  font-family: ${resolvedHeadingFont};
                  font-size: 1.45rem;
                  font-weight: 500;
                  color: var(--amolih-text);
                  margin: 0;
                  line-height: 1.2;
                }
                .amolih-pv-hero-sub {
                  font-size: 0.78rem;
                  color: var(--amolih-text-muted);
                  margin: 0.2rem 0 0;
                }
                .amolih-pv-avatar {
                  width: 44px;
                  height: 44px;
                  border-radius: 50%;
                  background: #FFFFFF;
                  border: 2px solid var(--amolih-gold);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 1.1rem;
                  font-weight: 600;
                  color: var(--amolih-primary);
                  box-shadow: 0 2px 6px rgba(197, 168, 128, 0.2);
                  flex-shrink: 0;
                }
                .amolih-pv-layout {
                  display: grid;
                  grid-template-columns: ${previewDevice === "mobile" ? "1fr" : "230px 1fr"};
                  gap: 1.15rem;
                  align-items: start;
                }
                .amolih-pv-sidebar {
                  background: var(--amolih-sidebar);
                  border: 1px solid var(--amolih-nav-border);
                  border-radius: var(--amolih-radius-lg);
                  padding: 0.75rem;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                  display: flex;
                  flex-direction: column;
                  gap: 0.35rem;
                }
                .amolih-pv-profile-header {
                  padding: 0.65rem 0.75rem 0.8rem;
                  border-bottom: 1px solid var(--amolih-nav-border);
                  margin-bottom: 0.35rem;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                }
                .amolih-pv-user-name {
                  font-size: 0.92rem;
                  font-weight: 600;
                  color: ${customerNameColor};
                  line-height: 1.2;
                }
                .amolih-pv-user-email {
                  font-size: 0.7rem;
                  color: var(--amolih-text-muted);
                  margin-top: 2px;
                }
                .amolih-pv-nav-item {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 0.65rem;
                  padding: 0.65rem 0.85rem;
                  border-radius: var(--amolih-radius-sm);
                  color: var(--amolih-text);
                  font-size: ${menuSize}px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.15s ease;
                  user-select: none;
                }
                .amolih-pv-nav-item:hover {
                  background: var(--amolih-nav-hover-bg);
                  color: var(--amolih-primary);
                }
                .amolih-pv-nav-item.is-active {
                  background: var(--amolih-nav-active-bg) !important;
                  color: var(--amolih-nav-active-text) !important;
                  font-weight: 600;
                  box-shadow: 0 2px 8px rgba(53, 94, 89, 0.22);
                }
                .amolih-pv-nav-label {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.6rem;
                }
                .amolih-pv-badge {
                  display: inline-flex;
                  align-items: center;
                  border-radius: 999px;
                  font-size: 0.68rem;
                  padding: 0.15rem 0.5rem;
                  font-weight: 600;
                  background: rgba(0,0,0,0.06);
                }
                .amolih-pv-nav-item.is-active .amolih-pv-badge {
                  background: rgba(255, 255, 255, 0.25);
                  color: #FFFFFF;
                }
                .amolih-pv-concierge-card {
                  margin-top: 0.75rem;
                  padding: 0.75rem;
                  background: #FFFFFF;
                  border: 1px solid var(--amolih-border);
                  border-radius: var(--amolih-radius-sm);
                  text-align: center;
                }
                .amolih-pv-concierge-btn {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  width: 100%;
                  padding: 0.45rem 0.75rem;
                  background: var(--amolih-primary);
                  color: #FFFFFF;
                  border-radius: var(--amolih-radius-sm);
                  font-size: 0.75rem;
                  font-weight: 600;
                  margin-top: 0.5rem;
                  cursor: pointer;
                }
                .amolih-pv-sidebar-logout {
                  margin-top: 0.5rem;
                  padding: 0.65rem 0.75rem;
                  border-top: 1px solid var(--amolih-border-light);
                  font-size: 0.78rem;
                  color: #94A3B8;
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  cursor: pointer;
                }
                .amolih-pv-sidebar-logout:hover { color: #DC2626; }
                .amolih-pv-panel {
                  background: var(--amolih-card-bg);
                  border: 1px solid var(--amolih-border);
                  border-radius: var(--amolih-radius-lg);
                  padding: 1.35rem 1.4rem;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
                }
                .amolih-pv-panel-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  flex-wrap: wrap;
                  gap: 0.75rem;
                  margin-bottom: 0.35rem;
                }
                .amolih-pv-pane-title {
                  font-family: ${resolvedHeadingFont};
                  font-size: ${headingSize}px;
                  font-weight: 500;
                  color: ${headingColor};
                  margin: 0;
                  line-height: 1.2;
                }
                .amolih-pv-pane-subtitle {
                  font-size: 0.8rem;
                  color: var(--amolih-text-muted);
                  margin: 0.2rem 0 0;
                }
                .amolih-pv-divider {
                  border: 0;
                  border-bottom: 1px solid var(--amolih-border);
                  margin: 0.75rem 0 1.15rem;
                }
                .amolih-pv-metrics-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                  gap: 0.65rem;
                  margin-bottom: 1.15rem;
                }
                .amolih-pv-metric-card {
                  background: #FAF7F2;
                  border: 1px solid var(--amolih-gold-border);
                  border-radius: var(--amolih-radius);
                  padding: 0.75rem 0.9rem;
                }
                .amolih-pv-metric-label {
                  font-size: 0.65rem;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  color: var(--amolih-gold-dark);
                  margin-bottom: 0.2rem;
                }
                .amolih-pv-metric-val {
                  font-family: ${resolvedHeadingFont};
                  font-size: 1.4rem;
                  font-weight: 500;
                  color: var(--amolih-text);
                  line-height: 1.15;
                }
                .amolih-pv-metric-sub {
                  font-size: 0.7rem;
                  color: var(--amolih-text-muted);
                  margin-top: 0.15rem;
                }
                .amolih-pv-order-card {
                  border: 1px solid var(--amolih-border);
                  border-radius: var(--amolih-radius);
                  padding: 1.1rem 1.15rem;
                  background: #FFFFFF;
                  margin-bottom: 1rem;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
                }
                .amolih-pv-order-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  flex-wrap: wrap;
                  gap: 0.5rem;
                  margin-bottom: 0.5rem;
                }
                .amolih-pv-order-name {
                  font-family: ${resolvedHeadingFont};
                  font-size: 1.15rem;
                  font-weight: 500;
                  color: var(--amolih-text);
                }
                .amolih-pv-status-pill {
                  padding: 0.2rem 0.65rem;
                  border-radius: 999px;
                  font-size: 0.7rem;
                  font-weight: 600;
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                }
                .amolih-pv-status-pill.paid {
                  background: #ECFDF5;
                  color: #065F46;
                  border: 1px solid #A7F3D0;
                }
                .amolih-pv-status-pill.fulfilled {
                  background: #EFF6FF;
                  color: #1E40AF;
                  border: 1px solid #BFDBFE;
                }
                .amolih-pv-btn-primary {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  padding: 0.45rem 0.95rem;
                  background: var(--amolih-btn-bg);
                  color: var(--amolih-btn-text);
                  border-radius: var(--amolih-radius-sm);
                  font-size: 0.78rem;
                  font-weight: 600;
                  border: none;
                  cursor: pointer;
                  transition: opacity 0.15s;
                }
                .amolih-pv-btn-primary:hover { opacity: 0.92; }
                .amolih-pv-btn-secondary {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  padding: 0.45rem 0.85rem;
                  background: #FFFFFF;
                  color: var(--amolih-text);
                  border: 1px solid var(--amolih-border);
                  border-radius: var(--amolih-radius-sm);
                  font-size: 0.78rem;
                  font-weight: 500;
                  cursor: pointer;
                }
                .amolih-pv-fields {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 0.85rem;
                }
                .amolih-pv-field-box {
                  background: #FAF7F2;
                  border: 1px solid var(--amolih-border);
                  border-radius: var(--amolih-radius-sm);
                  padding: 0.75rem 0.85rem;
                }
                .amolih-pv-field-box label {
                  display: block;
                  font-size: 0.68rem;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  color: #78716C;
                  margin-bottom: 0.2rem;
                }
                .amolih-pv-field-val {
                  font-size: 0.9rem;
                  font-weight: 500;
                  color: var(--amolih-text);
                }
                .amolih-pv-span-2 { grid-column: 1 / -1; }
                ${customCss}
              `,
            }}
          />

          <div className="amolih-pv-scope">
            {/* Live Hero Customer Banner */}
            <div className="amolih-pv-hero">
              <div>
                <span className="amolih-pv-hero-tag">✦ Client Folio</span>
                <h1 className="amolih-pv-hero-title">
                  {config.welcomeMessage || "Welcome back"}, John Doe
                </h1>
                <p className="amolih-pv-hero-sub">
                  Valued Client &bull; {config.portalTitle || "Amolih Customer Portal"}
                </p>
              </div>
              <div className="amolih-pv-avatar">JD</div>
            </div>

            {/* Live Portal Split Layout */}
            <div className="amolih-pv-layout">
              {/* Left Navigation Sidebar */}
              <aside className="amolih-pv-sidebar">
                <div className="amolih-pv-profile-header">
                  <div className="amolih-pv-avatar" style={{ width: 36, height: 36, fontSize: "0.95rem" }}>
                    JD
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="amolih-pv-user-name">John Doe</div>
                    <div className="amolih-pv-user-email">example@gmail.com</div>
                  </div>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {menuItems
                    .filter((item) => item.isEnabled !== false)
                    .map((item, idx) => {
                      const dest = (item.destination || "").toLowerCase();
                      const isActive =
                        previewTab === dest ||
                        (previewTab === "orders" && dest === "orders") ||
                        (previewTab === "details" && dest === "details") ||
                        (previewTab === "addresses" && dest === "addresses") ||
                        (previewTab === "circle" && dest.includes("circle"));

                      return (
                        <div
                          key={idx}
                          className={`amolih-pv-nav-item ${isActive ? "is-active" : ""}`}
                          onClick={() => {
                            setShowInvoiceDetail(false);
                            setPreviewTab(dest || "orders");
                          }}
                        >
                          <span className="amolih-pv-nav-label">
                            <span style={{ fontSize: "1rem" }}>{item.icon || "✦"}</span>
                            <span>{item.label}</span>
                          </span>
                          {item.badgeText && (
                            <span className="amolih-pv-badge">
                              {item.badgeText}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </nav>

                {previewDevice === "desktop" && (
                  <div className="amolih-pv-concierge-card">
                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>Bespoke Concierge</div>
                    <div style={{ fontSize: "0.7rem", color: "#64748B", marginTop: 2 }}>
                      Inquire on fine jewelry or orders
                    </div>
                    <div className="amolih-pv-concierge-btn">
                      💬 Chat on WhatsApp
                    </div>
                  </div>
                )}

                <div className="amolih-pv-sidebar-logout">
                  <span>🚪</span> <span>Sign out of account</span>
                </div>
              </aside>

              {/* Right Display Panel */}
              <main className="amolih-pv-panel">
                {/* ============================================================== */}
                {/* 1. ORDERS HISTORY VIEW */}
                {/* ============================================================== */}
                {(previewTab === "orders" || previewTab === "details/orders") && (
                  <div>
                    {!showInvoiceDetail ? (
                      <>
                        <div className="amolih-pv-panel-header">
                          <div>
                            <h2 className="amolih-pv-pane-title">Orders History</h2>
                            <p className="amolih-pv-pane-subtitle">1 order recorded in your account.</p>
                          </div>
                          <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.74rem" }}>
                            Explore Collection ↗
                          </button>
                        </div>
                        <hr className="amolih-pv-divider" />

                        {/* Top Metrics Cards (General Settings Reactivity) */}
                        <div className="amolih-pv-metrics-grid">
                          {settings.general?.totalSpent && (
                            <div className="amolih-pv-metric-card">
                              <div className="amolih-pv-metric-label">Lifetime Investment</div>
                              <div className="amolih-pv-metric-val">₹729.95</div>
                              <div className="amolih-pv-metric-sub">Total spent</div>
                            </div>
                          )}
                          {settings.general?.allOrders && (
                            <div className="amolih-pv-metric-card">
                              <div className="amolih-pv-metric-label">Orders Placed</div>
                              <div className="amolih-pv-metric-val">1</div>
                              <div className="amolih-pv-metric-sub">Total orders</div>
                            </div>
                          )}
                          {settings.general?.addresses && (
                            <div className="amolih-pv-metric-card">
                              <div className="amolih-pv-metric-label">Primary Destination</div>
                              <div className="amolih-pv-metric-val" style={{ fontSize: "1.1rem" }}>Rajasthan, India</div>
                              <div className="amolih-pv-metric-sub">Default address</div>
                            </div>
                          )}
                        </div>

                        {/* Search & Filter Bar */}
                        {settings.general?.allOrders && (
                          <div style={{ display: "flex", gap: "8px", marginBottom: "0.85rem" }}>
                            <input
                              type="text"
                              placeholder="Search by order, product or keyword..."
                              value={previewSearch}
                              onChange={(e) => setPreviewSearch(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "7px 10px",
                                borderRadius: "6px",
                                border: `1px solid ${borderColor}`,
                                fontSize: "12px",
                                backgroundColor: inputBg,
                                outline: "none",
                              }}
                            />
                            <select
                              style={{
                                padding: "7px 10px",
                                borderRadius: "6px",
                                border: `1px solid ${borderColor}`,
                                fontSize: "12px",
                                backgroundColor: "#FFFFFF",
                              }}
                            >
                              <option>Newest</option>
                              <option>Oldest</option>
                            </select>
                          </div>
                        )}

                        {/* Live Order Card #1000 */}
                        <article className="amolih-pv-order-card">
                          <div className="amolih-pv-order-header">
                            <div>
                              <div className="amolih-pv-order-name">Order #1000</div>
                              <div style={{ fontSize: "0.76rem", color: "#64748B", marginTop: 2 }}>
                                Placed on November 25, 2026 &bull; 1 item
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <span className="amolih-pv-status-pill paid">● Paid</span>
                              <span className="amolih-pv-status-pill fulfilled">● Fulfilled</span>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0.65rem 0 0.45rem" }}>
                            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A8895E", fontWeight: 600 }}>
                              Order Investment Total
                            </span>
                            <span style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--amolih-primary)" }}>
                              ₹729.95
                            </span>
                          </div>

                          {/* Line Item */}
                          <div style={{ padding: "0.65rem 0", borderTop: "1px dashed #E8E3DD", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ width: 38, height: 38, borderRadius: 6, background: "#FAF7F2", border: "1px solid #E8E3DD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                                💎
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.84rem", color: textColor }}>
                                  Solitaire Charm Necklace
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                                  Qty: 1 &bull; 18K Yellow Gold
                                </div>
                              </div>
                            </div>
                            <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>₹729.95</span>
                          </div>

                          {/* Action Strip (Reacting to General Toggles) */}
                          <div style={{ borderTop: "1px solid #F4EFEB", paddingTop: "0.75rem", marginTop: "0.45rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {settings.general?.downloadInvoice && (
                                <button
                                  type="button"
                                  className="amolih-pv-btn-primary"
                                  style={{ fontSize: "0.74rem", padding: "0.35rem 0.75rem" }}
                                  onClick={() => setShowInvoiceDetail(true)}
                                >
                                  📄 View Invoice
                                </button>
                              )}
                              {settings.general?.quickReorder && (
                                <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.74rem", padding: "0.35rem 0.75rem" }}>
                                  ⚡ Quick Reorder
                                </button>
                              )}
                              <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.74rem", padding: "0.35rem 0.75rem" }}>
                                🚚 Track Courier ↗
                              </button>
                              {settings.general?.cancelOrder && (
                                <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.74rem", padding: "0.35rem 0.75rem", color: "#DC2626" }}>
                                  ✕ Cancel Order
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                              Shipping to: Rajasthan, India
                            </div>
                          </div>
                        </article>

                        <div style={{ textAlign: "center", marginTop: "1rem", color: "#64748B", fontSize: "0.75rem" }}>
                          Showing 1 of {settings.general?.ordersPerPage || 4} orders &bull; Load more ↓
                        </div>
                      </>
                    ) : (
                      /* Live Invoice Detail View */
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                          <button
                            type="button"
                            className="amolih-pv-btn-secondary"
                            onClick={() => setShowInvoiceDetail(false)}
                            style={{ fontSize: "0.75rem" }}
                          >
                            ← Back to Orders
                          </button>
                          <button type="button" className="amolih-pv-btn-primary" style={{ fontSize: "0.75rem" }}>
                            🖨️ Print Invoice
                          </button>
                        </div>
                        <div style={{ border: "1px solid #E8E3DD", borderRadius: 8, padding: 16, backgroundColor: "#FFFFFF" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 10 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "1rem" }}>TAX INVOICE</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Invoice #INV-1000 &bull; Placed Nov 25, 2026</div>
                            </div>
                            <div style={{ textAlign: "right", fontSize: "0.75rem" }}>
                              <strong>Amolih Fine Jewelry</strong><br />Bespoke Studio &bull; Rajasthan
                            </div>
                          </div>
                          <div style={{ margin: "14px 0", fontSize: "0.8rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div>
                              <span style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase" }}>Billed & Shipped To:</span><br />
                              <strong>John Doe</strong><br />101 Luxury Avenue, C-Scheme<br />Rajasthan 302001, India
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.7rem", color: "#64748B", textTransform: "uppercase" }}>Payment Status:</span><br />
                              <span className="amolih-pv-status-pill paid">● Paid via Shopify Payments</span>
                            </div>
                          </div>
                          <div style={{ borderTop: "1px solid #E8E3DD", paddingTop: 10, fontSize: "0.8rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                              <span>Solitaire Charm Necklace &times; 1</span>
                              <span>₹618.60</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#64748B" }}>
                              <span>GST (18%)</span>
                              <span>₹111.35</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #E8E3DD", paddingTop: 8, marginTop: 8, fontWeight: 700, fontSize: "0.95rem" }}>
                              <span>Total Paid</span>
                              <span style={{ color: "var(--amolih-primary)" }}>₹729.95</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================== */}
                {/* 2. PROFILE DETAILS VIEW */}
                {/* ============================================================== */}
                {(previewTab === "details" || previewTab === "profile") && (
                  <div>
                    <div className="amolih-pv-panel-header">
                      <div>
                        <h2 className="amolih-pv-pane-title">Profile Details</h2>
                        <p className="amolih-pv-pane-subtitle">Manage your personal profile, email, and contact preferences.</p>
                      </div>
                      {settings.general?.editProfile && (
                        <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.74rem" }}>
                          ✏️ Edit Profile
                        </button>
                      )}
                    </div>
                    <hr className="amolih-pv-divider" />

                    <div className="amolih-pv-metrics-grid">
                      <div className="amolih-pv-metric-card">
                        <div className="amolih-pv-metric-label">Lifetime Investment</div>
                        <div className="amolih-pv-metric-val">₹729.95</div>
                        <div className="amolih-pv-metric-sub">Total spent</div>
                      </div>
                      <div className="amolih-pv-metric-card">
                        <div className="amolih-pv-metric-label">Orders Placed</div>
                        <div className="amolih-pv-metric-val">1</div>
                        <div className="amolih-pv-metric-sub">Total orders</div>
                      </div>
                      <div className="amolih-pv-metric-card">
                        <div className="amolih-pv-metric-label">Primary Destination</div>
                        <div className="amolih-pv-metric-val" style={{ fontSize: "1.1rem" }}>Rajasthan, India</div>
                        <div className="amolih-pv-metric-sub">Default address</div>
                      </div>
                    </div>

                    <div className="amolih-pv-fields">
                      <div className="amolih-pv-field-box">
                        <label>First Name</label>
                        <div className="amolih-pv-field-val">John</div>
                      </div>
                      <div className="amolih-pv-field-box">
                        <label>Last Name</label>
                        <div className="amolih-pv-field-val">Doe</div>
                      </div>
                      <div className="amolih-pv-field-box amolih-pv-span-2">
                        <label>Email Address</label>
                        <div className="amolih-pv-field-val">example@gmail.com</div>
                      </div>
                      <div className="amolih-pv-field-box amolih-pv-span-2">
                        <label>Contact Phone</label>
                        <div className="amolih-pv-field-val">+91 98765 43210</div>
                      </div>
                      {(settings.customFields || []).map((cf: any) => (
                        <div key={cf.id} className="amolih-pv-field-box">
                          <label>{cf.label} {cf.required && "*"}</label>
                          <div className="amolih-pv-field-val">[Customer {cf.label} value]</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* 3. SAVED ADDRESSES VIEW */}
                {/* ============================================================== */}
                {previewTab === "addresses" && (
                  <div>
                    <div className="amolih-pv-panel-header">
                      <div>
                        <h2 className="amolih-pv-pane-title">Saved Addresses</h2>
                        <p className="amolih-pv-pane-subtitle">Manage your shipping & billing destinations</p>
                      </div>
                      <button type="button" className="amolih-pv-btn-primary" style={{ fontSize: "0.74rem" }}>
                        + Add New Address
                      </button>
                    </div>
                    <hr className="amolih-pv-divider" />

                    {/* Default Address Card */}
                    <div style={{ border: "1px solid var(--amolih-gold-border)", background: "#FAF7F2", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>John Doe</span>
                        <span className="amolih-pv-status-pill paid" style={{ fontSize: "0.68rem" }}>Default Address</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748B", lineHeight: 1.5 }}>
                        101 Luxury Avenue, C-Scheme<br />
                        Rajasthan 302001, India<br />
                        Phone: +91 98765 43210
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.7rem", padding: "0.25rem 0.65rem" }}>✏️ Edit</button>
                        <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.7rem", padding: "0.25rem 0.65rem", color: "#DC2626" }}>🗑️ Delete</button>
                      </div>
                    </div>

                    {/* New Address Form Preview (Shows Required Field Settings) */}
                    <div style={{ background: "#FFFFFF", border: "1px solid #E8E3DD", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6 }}>
                        Address Form Preview
                      </div>
                      {settings.address?.enableGoogleSuggestions && (
                        <div style={{ fontSize: "0.72rem", color: "#065F46", background: "#ECFDF5", padding: "3px 8px", borderRadius: 4, marginBottom: 10, display: "inline-block" }}>
                          ✨ Google Address Auto-suggestions Active
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {[
                          { key: "firstName", label: "First name" },
                          { key: "lastName", label: "Last name" },
                          { key: "company", label: "Company" },
                          { key: "address", label: "Address" },
                          { key: "apartment", label: "Apartment" },
                          { key: "city", label: "City" },
                          { key: "zip", label: "Zip" },
                          { key: "phone", label: "Phone" },
                        ].map((f) => {
                          const isReq = (settings.address?.fields as any)?.[f.key];
                          return (
                            <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <label style={{ fontSize: "0.7rem", fontWeight: 500 }}>{f.label}</label>
                                <span style={{ fontSize: "0.65rem", color: isReq ? "#EF4444" : "#94A3B8" }}>
                                  {isReq ? "Required *" : "Optional"}
                                </span>
                              </div>
                              <input
                                type="text"
                                placeholder={`Enter ${f.label.toLowerCase()}`}
                                disabled
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #E8E3DD",
                                  backgroundColor: "#FAF7F2",
                                  fontSize: "11px",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <button type="button" className="amolih-pv-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                          Save address
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* 4. CIRCLE / VIP TIER VIEW */}
                {/* ============================================================== */}
                {(previewTab === "amolih-circle-progress-bar" || previewTab === "circle" || previewTab === "for-you") && (
                  <div>
                    <div className="amolih-pv-panel-header">
                      <div>
                        <h2 className="amolih-pv-pane-title">
                          {config.circleTierTitle || "Amolih Circle's Progress Bar"}
                        </h2>
                        <p className="amolih-pv-pane-subtitle">Exclusive VIP tier privileges and rewards</p>
                      </div>
                      <button type="button" className="amolih-pv-btn-secondary" style={{ fontSize: "0.74rem" }}>
                        Tier Benefits ↗
                      </button>
                    </div>
                    <hr className="amolih-pv-divider" />

                    {/* VIP Tier Progress Card */}
                    <div style={{ border: "1px solid var(--amolih-gold-border)", background: "linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#A8895E" }}>🏅 Gold VIP Member</span>
                        <span style={{ fontSize: "0.78rem", color: "#64748B" }}>1,450 / 2,000 Points</span>
                      </div>
                      <div style={{ width: "100%", height: 10, background: "#E8E3DD", borderRadius: 999, overflow: "hidden", margin: "10px 0 6px" }}>
                        <div style={{ width: "72%", height: "100%", background: "linear-gradient(90deg, #A8895E, #C5A880)", borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                        550 points until Platinum Tier status unlock
                      </div>
                    </div>

                    {/* Tier Privileges */}
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 8 }}>
                      Your Unlocked Privileges
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {[
                        { icon: "✨", title: "10% Bespoke Discount", desc: "Applied on all custom pieces" },
                        { icon: "✈️", title: "Complimentary Express", desc: "Insured door-to-door delivery" },
                        { icon: "💎", title: "Annual Polish", desc: "Free cleaning & inspection" },
                        { icon: "💬", title: "Priority Concierge", desc: "Direct WhatsApp jewelers access" },
                      ].map((p, idx) => (
                        <div key={idx} style={{ padding: "8px 10px", background: "#FAF7F2", border: "1px solid #E8E3DD", borderRadius: 8 }}>
                          <div style={{ fontSize: "1rem" }}>{p.icon}</div>
                          <div style={{ fontWeight: 600, fontSize: "0.78rem", marginTop: 4 }}>{p.title}</div>
                          <div style={{ fontSize: "0.7rem", color: "#64748B" }}>{p.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* 5. EXTERNAL CONCIERGE / OTHER MENUS */}
                {/* ============================================================== */}
                {previewTab !== "orders" && previewTab !== "details" && previewTab !== "profile" && previewTab !== "addresses" && previewTab !== "amolih-circle-progress-bar" && previewTab !== "circle" && previewTab !== "for-you" && (
                  <div>
                    <div className="amolih-pv-panel-header">
                      <div>
                        <h2 className="amolih-pv-pane-title">Customer Concierge</h2>
                        <p className="amolih-pv-pane-subtitle">Direct line to our personal shopping & support team</p>
                      </div>
                    </div>
                    <hr className="amolih-pv-divider" />

                    <div style={{ textAlign: "center", padding: "2rem 1rem", background: "#FAF7F2", borderRadius: 12, border: "1px dashed var(--amolih-gold-border)" }}>
                      <div style={{ fontSize: "2.25rem", marginBottom: 6 }}>💬</div>
                      <h3 style={{ fontSize: "1.1rem", margin: "0 0 6px", fontWeight: 600 }}>We are online & ready to assist</h3>
                      <p style={{ fontSize: "0.78rem", color: "#64748B", maxWidth: 340, margin: "0 auto 14px" }}>
                        Connect directly with our master jewelers on WhatsApp for custom sizing, order updates, or styling recommendations.
                      </p>
                      <button type="button" className="amolih-pv-btn-primary" style={{ padding: "0.55rem 1.15rem", margin: "0 auto" }}>
                        Open WhatsApp Concierge ↗
                      </button>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
