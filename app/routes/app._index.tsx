import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Banner,
  Badge,
  Divider,
  Checkbox,
  Box,
  Tabs,
  Select,
  ButtonGroup,
  Modal,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getPortalConfig, savePortalConfig, type MenuItemData } from "../services/portal.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await getPortalConfig(shop);

  return json({
    shop,
    config,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save_all") {
    const portalTitle = (formData.get("portalTitle") as string) || "Amolih Customer Portal";
    const primaryColor = (formData.get("primaryColor") as string) || "#355E59";
    const sidebarBgColor = (formData.get("sidebarBgColor") as string) || "#FBF8F5";
    const textColor = (formData.get("textColor") as string) || "#1A1A1A";
    const fontFamily = (formData.get("fontFamily") as string) || "Inter, -apple-system, sans-serif";
    const supportUrl = (formData.get("supportUrl") as string) || "https://wa.me/918233905718";
    const circleTierTitle = (formData.get("circleTierTitle") as string) || "Amolih Circle's Progress Bar";
    const welcomeMessage = (formData.get("welcomeMessage") as string) || "Welcome back";
    
    const menuItemsJson = formData.get("menuItems") as string;
    let menuItems: MenuItemData[] = [];
    try {
      menuItems = JSON.parse(menuItemsJson);
    } catch (e) {
      console.error("Failed to parse menu items:", e);
    }

    const saved = await savePortalConfig(
      shop,
      {
        portalTitle,
        primaryColor,
        sidebarBgColor,
        textColor,
        fontFamily,
        supportUrl,
        circleTierTitle,
        welcomeMessage,
      },
      menuItems
    );

    return json({ success: true, saved });
  }

  return json({ success: false });
};

const ICON_OPTIONS = [
  { label: "👤 Profile / Details", value: "👤" },
  { label: "🛒 Shopping Cart / Orders", value: "🛒" },
  { label: "🏅 Medal / Loyalty Rewards", value: "🏅" },
  { label: "📍 Location / Addresses", value: "📍" },
  { label: "💬 Message / WhatsApp Support", value: "💬" },
  { label: "📦 Package / Shipment Tracking", value: "📦" },
  { label: "🔄 Return / Exchange Requests", value: "🔄" },
  { label: "🎁 Gift / Coupons & Offers", value: "🎁" },
  { label: "❤️ Heart / Wishlist", value: "❤️" },
  { label: "❓ Question / FAQ & Help", value: "❓" },
  { label: "📄 Document / Invoice & Receipts", value: "📄" },
  { label: "💳 Card / Payment Methods", value: "💳" },
  { label: "⚙️ Gear / Account Preferences", value: "⚙️" },
  { label: "🔗 Link / External Destination", value: "🔗" },
];

const LINK_TYPE_OPTIONS = [
  { label: "Internal Account Page (details, orders, circle, addresses)", value: "INTERNAL_PAGE" },
  { label: "Shopify Storefront Link (/collections, /pages, etc.)", value: "SHOPIFY_STORE" },
  { label: "External Web Destination (https://...)", value: "EXTERNAL_URL" },
  { label: "Support / Concierge Action (WhatsApp, Email)", value: "SUPPORT_ACTION" },
];

const BADGE_TONE_OPTIONS = [
  { label: "None / No Badge", value: "" },
  { label: "Info (Subtle Blue)", value: "info" },
  { label: "Success (Vibrant Green)", value: "success" },
  { label: "Attention (Gold / Yellow)", value: "attention" },
  { label: "Warning (High Priority / Red)", value: "warning" },
];

export default function Index() {
  const { shop, config } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [selectedTab, setSelectedTab] = useState(1); // Default to "Navigation & Menu Builder"

  // Theme & Branding Settings
  const [portalTitle, setPortalTitle] = useState(config.portalTitle || "Amolih Customer Portal");
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor || "#355E59");
  const [sidebarBgColor, setSidebarBgColor] = useState(config.sidebarBgColor || "#FBF8F5");
  const [textColor, setTextColor] = useState(config.textColor || "#1A1A1A");
  const [fontFamily, setFontFamily] = useState(config.fontFamily || "Inter, -apple-system, sans-serif");
  const [supportUrl, setSupportUrl] = useState(config.supportUrl || "https://wa.me/918233905718");
  const [circleTierTitle, setCircleTierTitle] = useState(config.circleTierTitle || "Amolih Circle's Progress Bar");
  const [welcomeMessage, setWelcomeMessage] = useState(config.welcomeMessage || "Welcome back");

  // Navigation Menus State
  const [menuItems, setMenuItems] = useState<MenuItemData[]>((config.menuItems as any) || []);

  // Modal State for Add / Edit Menu Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalLabel, setModalLabel] = useState("");
  const [modalIcon, setModalIcon] = useState("👤");
  const [modalDestination, setModalDestination] = useState("");
  const [modalLinkType, setModalLinkType] = useState<MenuItemData["linkType"]>("INTERNAL_PAGE");
  const [modalBadgeText, setModalBadgeText] = useState("");
  const [modalBadgeTone, setModalBadgeTone] = useState("info");
  const [modalOpenInNewTab, setModalOpenInNewTab] = useState(false);
  const [modalMobileVisible, setModalMobileVisible] = useState(true);

  // Modal State for Live Store Launch Guide (prevents 404 errors)
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const storeHandle = shop.replace(".myshopify.com", "");
  const customerAccountsSettingsUrl = `https://admin.shopify.com/store/${storeHandle}/settings/customer_accounts`;
  const checkoutEditorUrl = `https://admin.shopify.com/store/${storeHandle}/settings/checkout/editor`;
  const accountUrl = `https://${shop}/account`;

  // Live Simulator State
  const [simActiveTab, setSimActiveTab] = useState(menuItems[0]?.destination || "details");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const isSaving = fetcher.state === "submitting";

  const handleSaveAll = () => {
    fetcher.submit(
      {
        intent: "save_all",
        portalTitle,
        primaryColor,
        sidebarBgColor,
        textColor,
        fontFamily,
        supportUrl,
        circleTierTitle,
        welcomeMessage,
        menuItems: JSON.stringify(menuItems),
      },
      { method: "POST" }
    );
    shopify.toast.show("Customer Portal & Navigation Menus Published!");
  };

  const handleOpenAddModal = () => {
    setEditingIndex(null);
    setModalLabel("");
    setModalIcon("👤");
    setModalDestination("");
    setModalLinkType("INTERNAL_PAGE");
    setModalBadgeText("");
    setModalBadgeTone("info");
    setModalOpenInNewTab(false);
    setModalMobileVisible(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (index: number) => {
    const item = menuItems[index];
    setEditingIndex(index);
    setModalLabel(item.label);
    setModalIcon(item.icon);
    setModalDestination(item.destination);
    setModalLinkType(item.linkType);
    setModalBadgeText(item.badgeText || "");
    setModalBadgeTone(item.badgeTone || "info");
    setModalOpenInNewTab(item.openInNewTab);
    setModalMobileVisible(item.mobileVisible);
    setIsModalOpen(true);
  };

  const handleSaveModalItem = () => {
    if (!modalLabel.trim()) {
      shopify.toast.show("Please enter a menu title / label");
      return;
    }

    const updatedItem: MenuItemData = {
      label: modalLabel.trim(),
      icon: modalIcon,
      destination: modalDestination.trim() || "details",
      linkType: modalLinkType,
      badgeText: modalBadgeText.trim() ? modalBadgeText.trim() : null,
      badgeTone: modalBadgeTone || null,
      position: editingIndex !== null ? editingIndex : menuItems.length,
      isEnabled: editingIndex !== null ? menuItems[editingIndex].isEnabled : true,
      openInNewTab: modalOpenInNewTab,
      visibility: "ALL",
      mobileVisible: modalMobileVisible,
    };

    if (editingIndex !== null) {
      const copy = [...menuItems];
      copy[editingIndex] = updatedItem;
      setMenuItems(copy);
    } else {
      setMenuItems([...menuItems, updatedItem]);
    }

    setIsModalOpen(false);
    shopify.toast.show(editingIndex !== null ? "Menu item updated" : "New menu item added");
  };

  const handleDeleteItem = (index: number) => {
    const copy = menuItems.filter((_, i) => i !== index);
    setMenuItems(copy);
    shopify.toast.show("Menu item removed");
  };

  const handleToggleItemStatus = (index: number) => {
    const copy = [...menuItems];
    copy[index].isEnabled = !copy[index].isEnabled;
    setMenuItems(copy);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...menuItems];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    copy.forEach((item, idx) => (item.position = idx));
    setMenuItems(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === menuItems.length - 1) return;
    const copy = [...menuItems];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    copy.forEach((item, idx) => (item.position = idx));
    setMenuItems(copy);
  };

  const handleAddPreset = (preset: {
    label: string;
    icon: string;
    destination: string;
    linkType: MenuItemData["linkType"];
    badgeText?: string;
    badgeTone?: string;
    openInNewTab?: boolean;
  }) => {
    const newItem: MenuItemData = {
      label: preset.label,
      icon: preset.icon,
      destination: preset.destination,
      linkType: preset.linkType,
      badgeText: preset.badgeText || null,
      badgeTone: preset.badgeTone || null,
      position: menuItems.length,
      isEnabled: true,
      openInNewTab: preset.openInNewTab || false,
      visibility: "ALL",
      mobileVisible: true,
    };
    setMenuItems([...menuItems, newItem]);
    shopify.toast.show(`Added "${preset.label}" menu`);
  };

  const tabs = [
    { id: "overview-tab", content: "Overview & Health" },
    { id: "nav-builder-tab", content: "Navigation & Menu Builder" },
    { id: "preview-tab", content: "Live Customer Portal Preview" },
    { id: "theme-tab", content: "Theme & Brand Styling" },
  ];

  return (
    <Page fullWidth>
      <TitleBar title="Shopify Customer Portal Builder">
        <button variant="primary" onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? "Publishing Changes..." : "Save & Publish Changes"}
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Top Header Card */}
        <Banner tone="info">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="p" fontWeight="bold">
                Connected Store: {shop}
              </Text>
              <Text as="p" tone="subdued">
                Custlo-inspired customer account customization engine active. All menus, links, and themes sync directly to your customer accounts.
              </Text>
            </BlockStack>
            <InlineStack gap="300">
              <Badge tone="success">Active on New Customer Accounts</Badge>
              <Button
                onClick={() => setIsLiveModalOpen(true)}
                variant="plain"
              >
                Live Store Setup & Test ↗
              </Button>
            </InlineStack>
          </InlineStack>
        </Banner>

        <Card padding="0">
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box padding="500">

              {/* ============================================================== */}
              {/* TAB 0: OVERVIEW & HEALTH */}
              {/* ============================================================== */}
              {selectedTab === 0 && (
                <BlockStack gap="500">
                  <Layout>
                    <Layout.Section>
                      <Card>
                        <BlockStack gap="400">
                          <Text as="h2" variant="headingLg">
                            Customer Portal Status & Metrics
                          </Text>
                          <Text as="p" tone="subdued">
                            Track the real-time engagement and operational health of your customer account dashboard.
                          </Text>
                          <Divider />
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                              <Text as="p" tone="subdued">Active Menus</Text>
                              <Text as="h3" variant="headingXl">
                                {menuItems.filter((i) => i.isEnabled).length} / {menuItems.length}
                              </Text>
                            </Box>
                            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                              <Text as="p" tone="subdued">Portal Publication</Text>
                              <Text as="h3" variant="headingXl" tone="success">
                                Published
                              </Text>
                            </Box>
                            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                              <Text as="p" tone="subdued">Active Theme</Text>
                              <Text as="h3" variant="headingXl">
                                Custlo Forest
                              </Text>
                            </Box>
                            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                              <Text as="p" tone="subdued">Account Extension</Text>
                              <Text as="h3" variant="headingXl">
                                Full-Page UI
                              </Text>
                            </Box>
                          </div>
                        </BlockStack>
                      </Card>
                    </Layout.Section>

                    <Layout.Section variant="oneThird">
                      <Card>
                        <BlockStack gap="400">
                          <Text as="h2" variant="headingMd">
                            Quick Launch Actions
                          </Text>
                          <Divider />
                          <Button fullWidth onClick={() => setSelectedTab(1)}>
                            ✨ Add Menus & Manage Links
                          </Button>
                          <Button fullWidth onClick={() => setSelectedTab(2)}>
                            👁️ View Live Custlo Simulator
                          </Button>
                          <Button fullWidth onClick={() => setSelectedTab(3)}>
                            🎨 Edit Colors & Branding
                          </Button>
                          <Button
                            fullWidth
                            variant="secondary"
                            onClick={() => setIsLiveModalOpen(true)}
                          >
                            🚀 Test on Live Shopify Store
                          </Button>
                        </BlockStack>
                      </Card>
                    </Layout.Section>
                  </Layout>
                </BlockStack>
              )}

              {/* ============================================================== */}
              {/* TAB 1: NAVIGATION & MENU BUILDER (CORE USER REQUEST) */}
              {/* ============================================================== */}
              {selectedTab === 1 && (
                <BlockStack gap="500">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        Customer Account Navigation Builder
                      </Text>
                      <Text as="p" tone="subdued">
                        Add custom menus and configure their respective links, icons, badges, destinations, and visibility.
                      </Text>
                    </BlockStack>
                    <InlineStack gap="300">
                      <Button variant="primary" onClick={handleOpenAddModal}>
                        + Add Menu Item
                      </Button>
                    </InlineStack>
                  </InlineStack>

                  <Layout>
                    <Layout.Section>
                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="h3" variant="headingMd">
                              Configured Menus ({menuItems.length})
                            </Text>
                            <Text as="p" tone="subdued">
                              Click edit to adjust links or use arrows to reorder
                            </Text>
                          </InlineStack>
                          <Divider />

                          {menuItems.length === 0 ? (
                            <Box padding="600">
                              <BlockStack align="center" inlineAlign="center" gap="300">
                                <Text as="p" tone="subdued">
                                  No menu items added yet. Click "+ Add Menu Item" or pick a 1-click preset on the right.
                                </Text>
                                <Button onClick={handleOpenAddModal}>Add Your First Menu</Button>
                              </BlockStack>
                            </Box>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {menuItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "14px 18px",
                                    backgroundColor: item.isEnabled ? "#FFFFFF" : "#F8FAFC",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "8px",
                                    opacity: item.isEnabled ? 1 : 0.6,
                                  }}
                                >
                                  {/* Left Details */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                    <div
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "6px",
                                        backgroundColor: sidebarBgColor,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "18px",
                                      }}
                                    >
                                      {item.icon}
                                    </div>
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontWeight: 600, fontSize: "14px", color: textColor }}>
                                          {item.label}
                                        </span>
                                        {item.badgeText && (
                                          <Badge tone={(item.badgeTone as any) || "info"}>
                                            {item.badgeText}
                                          </Badge>
                                        )}
                                        {!item.isEnabled && (
                                          <Badge>Disabled</Badge>
                                        )}
                                      </div>
                                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                                        <span style={{ fontWeight: 500 }}>Destination:</span> {item.destination} &bull;{" "}
                                        <span style={{ fontWeight: 500 }}>Type:</span> {item.linkType}
                                        {item.openInNewTab && " (Opens in new tab)"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Actions */}
                                  <InlineStack gap="200" blockAlign="center">
                                    <ButtonGroup variant="segmented">
                                      <Button
                                        size="slim"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveUp(idx)}
                                      >
                                        ▲
                                      </Button>
                                      <Button
                                        size="slim"
                                        disabled={idx === menuItems.length - 1}
                                        onClick={() => handleMoveDown(idx)}
                                      >
                                        ▼
                                      </Button>
                                    </ButtonGroup>
                                    <Button
                                      size="slim"
                                      variant={item.isEnabled ? "secondary" : "plain"}
                                      onClick={() => handleToggleItemStatus(idx)}
                                    >
                                      {item.isEnabled ? "Active" : "Enable"}
                                    </Button>
                                    <Button size="slim" onClick={() => handleOpenEditModal(idx)}>
                                      Edit
                                    </Button>
                                    <Button
                                      size="slim"
                                      tone="critical"
                                      variant="plain"
                                      onClick={() => handleDeleteItem(idx)}
                                    >
                                      Remove
                                    </Button>
                                  </InlineStack>
                                </div>
                              ))}
                            </div>
                          )}
                        </BlockStack>
                      </Card>
                    </Layout.Section>

                    {/* Quick Presets Library */}
                    <Layout.Section variant="oneThird">
                      <Card>
                        <BlockStack gap="400">
                          <Text as="h3" variant="headingMd">
                            1-Click Menu Presets
                          </Text>
                          <Text as="p" tone="subdued">
                            Instantly add standard customer account destinations:
                          </Text>
                          <Divider />
                          <Button
                            fullWidth
                            textAlign="left"
                            onClick={() =>
                              handleAddPreset({
                                label: "Track Package",
                                icon: "📦",
                                destination: "https://track.aftership.com",
                                linkType: "EXTERNAL_URL",
                                badgeText: "Live",
                                badgeTone: "success",
                                openInNewTab: true,
                              })
                            }
                          >
                            + Add "Track Package" Link
                          </Button>
                          <Button
                            fullWidth
                            textAlign="left"
                            onClick={() =>
                              handleAddPreset({
                                label: "Return & Exchange",
                                icon: "🔄",
                                destination: "https://returns.yourbrand.com",
                                linkType: "EXTERNAL_URL",
                                badgeText: "Self-Service",
                                badgeTone: "info",
                                openInNewTab: true,
                              })
                            }
                          >
                            + Add "Return & Exchange" Portal
                          </Button>
                          <Button
                            fullWidth
                            textAlign="left"
                            onClick={() =>
                              handleAddPreset({
                                label: "Wishlist & Favorites",
                                icon: "❤️",
                                destination: "/pages/wishlist",
                                linkType: "SHOPIFY_STORE",
                                badgeText: "Saved",
                                badgeTone: "attention",
                              })
                            }
                          >
                            + Add "Wishlist" Store Page
                          </Button>
                          <Button
                            fullWidth
                            textAlign="left"
                            onClick={() =>
                              handleAddPreset({
                                label: "WhatsApp Concierge",
                                icon: "💬",
                                destination: supportUrl,
                                linkType: "SUPPORT_ACTION",
                                badgeText: "24/7",
                                badgeTone: "success",
                                openInNewTab: true,
                              })
                            }
                          >
                            + Add "WhatsApp Concierge"
                          </Button>
                          <Button
                            fullWidth
                            textAlign="left"
                            onClick={() =>
                              handleAddPreset({
                                label: "FAQ & Help Center",
                                icon: "❓",
                                destination: "/pages/faq",
                                linkType: "SHOPIFY_STORE",
                              })
                            }
                          >
                            + Add "FAQ & Help Center"
                          </Button>
                        </BlockStack>
                      </Card>
                    </Layout.Section>
                  </Layout>
                </BlockStack>
              )}

              {/* ============================================================== */}
              {/* TAB 2: LIVE CUSTOMER PORTAL PREVIEW (CUSTLO MATCH) */}
              {/* ============================================================== */}
              {selectedTab === 2 && (
                <BlockStack gap="500">
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="p" fontWeight="bold">
                          Interactive Custlo Simulator
                        </Text>
                        <Text as="p" tone="subdued">
                          See your dynamic menus, links, and branding exactly as customer shoppers will experience them.
                        </Text>
                      </BlockStack>
                      <InlineStack gap="300">
                        <ButtonGroup variant="segmented">
                          <Button
                            pressed={previewDevice === "desktop"}
                            onClick={() => setPreviewDevice("desktop")}
                          >
                            🖥️ Desktop
                          </Button>
                          <Button
                            pressed={previewDevice === "mobile"}
                            onClick={() => setPreviewDevice("mobile")}
                          >
                            📱 Mobile
                          </Button>
                        </ButtonGroup>
                        <Button
                          onClick={() => setIsLiveModalOpen(true)}
                          variant="secondary"
                        >
                          Open In Live Store ↗
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </Box>

                  {/* Simulator Canvas */}
                  <div
                    style={{
                      maxWidth: previewDevice === "mobile" ? "420px" : "100%",
                      margin: previewDevice === "mobile" ? "0 auto" : "0",
                      border: "1px solid #CBD5E1",
                      borderRadius: "12px",
                      padding: "24px",
                      backgroundColor: "#F8FAFC",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: previewDevice === "mobile" ? "1fr" : "280px 1fr",
                        gap: "24px",
                        fontFamily,
                      }}
                    >
                      {/* DYNAMIC LEFT SIDEBAR (EXACT CUSTLO SPECIFICATION) */}
                      <div
                        style={{
                          backgroundColor: sidebarBgColor,
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          height: "fit-content",
                        }}
                      >
                        {/* Customer Email Header */}
                        <div style={{ padding: "16px 20px", fontSize: "13px", color: "#64748B", backgroundColor: "rgba(0,0,0,0.02)" }}>
                          sarah.j@amolih.com
                        </div>
                        <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                        {/* RENDER DYNAMICALLY CONFIGURED MENUS */}
                        {menuItems
                          .filter((item) => item.isEnabled)
                          .map((item, idx) => {
                            const isActive = simActiveTab === item.destination;
                            return (
                              <div key={idx}>
                                <div
                                  onClick={() => {
                                    if (item.linkType === "EXTERNAL_URL" || item.linkType === "SUPPORT_ACTION") {
                                      window.open(item.destination, "_blank");
                                    } else {
                                      setSimActiveTab(item.destination);
                                    }
                                  }}
                                  style={{
                                    backgroundColor: isActive ? primaryColor : "transparent",
                                    color: isActive ? "#FFFFFF" : textColor,
                                    padding: "16px 20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                    fontWeight: isActive ? 600 : 400,
                                    transition: "background-color 0.15s ease",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <span style={{ fontSize: "18px" }}>{item.icon}</span>
                                    <span>{item.label}</span>
                                  </div>

                                  {item.badgeText && (
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        padding: "3px 8px",
                                        borderRadius: "999px",
                                        backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#E2E8F0",
                                        color: isActive ? "#FFFFFF" : "#1E293B",
                                      }}
                                    >
                                      {item.badgeText}
                                    </span>
                                  )}
                                </div>
                                <div style={{ borderBottom: "1px solid #E2E8F0" }} />
                              </div>
                            );
                          })}
                      </div>

                      {/* RIGHT SIMULATOR CANVAS: DYNAMIC CONTENT ACCORDING TO SELECTED MENU */}
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                          padding: "24px",
                          minHeight: "420px",
                        }}
                      >
                        {simActiveTab === "details" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", color: textColor }}>
                                Profile Details
                              </h2>
                              <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>
                                Manage your personal account information and communication settings.
                              </p>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                              <div>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>First Name</label>
                                <div style={{ padding: "10px 14px", border: "1px solid #CBD5E1", borderRadius: "6px", marginTop: "4px" }}>
                                  Sarah
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>Last Name</label>
                                <div style={{ padding: "10px 14px", border: "1px solid #CBD5E1", borderRadius: "6px", marginTop: "4px" }}>
                                  Jenkins
                                </div>
                              </div>
                              <div style={{ gridColumn: "span 2" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>Email Address</label>
                                <div style={{ padding: "10px 14px", border: "1px solid #CBD5E1", borderRadius: "6px", marginTop: "4px" }}>
                                  sarah.j@amolih.com
                                </div>
                              </div>
                              <div style={{ gridColumn: "span 2" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748B" }}>Contact Phone</label>
                                <div style={{ padding: "10px 14px", border: "1px solid #CBD5E1", borderRadius: "6px", marginTop: "4px" }}>
                                  +91 98234 56789
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {simActiveTab === "orders" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px 0", color: textColor }}>
                                  Orders History
                                </h2>
                                <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>1 order placed</p>
                              </div>
                              <span style={{ padding: "4px 10px", borderRadius: "6px", backgroundColor: "#ECFDF5", color: "#065F46", fontSize: "12px", fontWeight: 600 }}>
                                Fulfilled
                              </span>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontWeight: 600 }}>Order #1042</span>
                                <span style={{ fontWeight: 700, color: primaryColor }}>₹3,450.00</span>
                              </div>
                              <div style={{ fontSize: "13px", color: "#64748B" }}>
                                Placed on 28 Oct 2026 &bull; Standard Shipping (Air Courier)
                              </div>
                            </div>
                          </div>
                        )}

                        {simActiveTab === "circle" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px 0", color: textColor }}>
                                {circleTierTitle}
                              </h2>
                              <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>
                                You are currently on <strong>Gold Tier</strong> (620 / 1,000 Points to Platinum).
                              </p>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            {/* Progress bar */}
                            <div style={{ backgroundColor: "#E2E8F0", height: "12px", borderRadius: "999px", overflow: "hidden" }}>
                              <div style={{ width: "62%", height: "100%", backgroundColor: primaryColor }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748B" }}>
                              <span>Silver Tier</span>
                              <span>Gold (Current)</span>
                              <span>Platinum (Next)</span>
                            </div>
                          </div>
                        )}

                        {simActiveTab === "addresses" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px 0", color: textColor }}>
                                Saved Shipping Addresses
                              </h2>
                              <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>
                                2 shipping addresses linked to your account.
                              </p>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong>Default Address</strong>
                                <span style={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>Default</span>
                              </div>
                              <div style={{ marginTop: "6px", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                                Sarah Jenkins<br />
                                42 Marina Boulevard, Apt 9B<br />
                                Mumbai, Maharashtra 400001
                              </div>
                            </div>
                          </div>
                        )}

                        {!["details", "orders", "circle", "addresses"].includes(simActiveTab) && (
                          <div style={{ textAlign: "center", padding: "40px 20px" }}>
                            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔗</div>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, color: textColor, margin: "0 0 8px 0" }}>
                              Custom Destination: {simActiveTab}
                            </h3>
                            <p style={{ color: "#64748B", fontSize: "14px", margin: 0 }}>
                              This menu is configured to link to your custom target or storefront page.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </BlockStack>
              )}

              {/* ============================================================== */}
              {/* TAB 3: THEME & BRAND STYLING */}
              {/* ============================================================== */}
              {selectedTab === 3 && (
                <Layout>
                  <Layout.Section>
                    <BlockStack gap="500">
                      <Card>
                        <BlockStack gap="400">
                          <Text as="h2" variant="headingMd">
                            Color Palette (Custlo Brand System)
                          </Text>
                          <Text as="p" tone="subdued">
                            Customize the background, primary active accents, typography, and buttons.
                          </Text>
                          <Divider />
                          <TextField
                            label="Primary Accent / Active Tab Color"
                            value={primaryColor}
                            onChange={setPrimaryColor}
                            helpText="Used for active sidebar tabs, buttons, and progress highlights (Custlo default: #355E59)."
                            autoComplete="off"
                          />
                          <TextField
                            label="Sidebar Background Color"
                            value={sidebarBgColor}
                            onChange={setSidebarBgColor}
                            helpText="Used for the left customer account vertical navigation panel (Custlo default: #FBF8F5 warm cream)."
                            autoComplete="off"
                          />
                          <TextField
                            label="Primary Text Color"
                            value={textColor}
                            onChange={setTextColor}
                            helpText="Primary font color for labels, body text, and headings (Default: #1A1A1A)."
                            autoComplete="off"
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="400">
                          <Text as="h2" variant="headingMd">
                            Typography & Labels
                          </Text>
                          <Divider />
                          <Select
                            label="Portal Font Family"
                            options={[
                              { label: "Modern Sans-Serif (Inter / System)", value: "Inter, -apple-system, sans-serif" },
                              { label: "Luxury Editorial Serif (Playfair / Georgia)", value: "Playfair Display, Georgia, serif" },
                              { label: "Clean Geometric (Poppins / Circular)", value: "Poppins, -apple-system, sans-serif" },
                            ]}
                            value={fontFamily}
                            onChange={setFontFamily}
                          />
                          <TextField
                            label="Loyalty Program Menu Title"
                            value={circleTierTitle}
                            onChange={setCircleTierTitle}
                            autoComplete="off"
                          />
                          <TextField
                            label="Default WhatsApp / Concierge URL"
                            value={supportUrl}
                            onChange={setSupportUrl}
                            autoComplete="off"
                          />
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  </Layout.Section>

                  <Layout.Section variant="oneThird">
                    <Card>
                      <BlockStack gap="400">
                        <Text as="h2" variant="headingMd">
                          Color Quick Presets
                        </Text>
                        <Divider />
                        <Button
                          fullWidth
                          onClick={() => {
                            setPrimaryColor("#355E59");
                            setSidebarBgColor("#FBF8F5");
                            setTextColor("#1A1A1A");
                          }}
                        >
                          🍃 Custlo Emerald & Cream (Default)
                        </Button>
                        <Button
                          fullWidth
                          onClick={() => {
                            setPrimaryColor("#1E293B");
                            setSidebarBgColor("#F8FAFC");
                            setTextColor("#0F172A");
                          }}
                        >
                          🌑 Midnight Slate
                        </Button>
                        <Button
                          fullWidth
                          onClick={() => {
                            setPrimaryColor("#831843");
                            setSidebarBgColor("#FFF1F2");
                            setTextColor("#4C0519");
                          }}
                        >
                          🌹 Royal Rose
                        </Button>
                        <Button
                          fullWidth
                          onClick={() => {
                            setPrimaryColor("#18181B");
                            setSidebarBgColor("#FFFFFF");
                            setTextColor("#18181B");
                          }}
                        >
                          ⚪ Minimalist Mono
                        </Button>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                </Layout>
              )}

            </Box>
          </Tabs>
        </Card>
      </BlockStack>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT MENU ITEM */}
      {/* ============================================================== */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? "Edit Menu & Link" : "Add Menu & Link"}
        primaryAction={{
          content: editingIndex !== null ? "Update Menu" : "Add Menu",
          onAction: handleSaveModalItem,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Menu Title / Label"
              value={modalLabel}
              onChange={setModalLabel}
              placeholder="e.g. Orders History, Loyalty Club, Track Order"
              autoComplete="off"
            />

            <Select
              label="Menu Icon"
              options={ICON_OPTIONS}
              value={modalIcon}
              onChange={setModalIcon}
            />

            <Select
              label="Link Type"
              options={LINK_TYPE_OPTIONS}
              value={modalLinkType}
              onChange={(val) => setModalLinkType(val as any)}
            />

            <TextField
              label="Destination Link / Target"
              value={modalDestination}
              onChange={setModalDestination}
              placeholder="e.g. orders, details, circle, addresses, https://wa.me/..."
              helpText="For Internal Pages: 'details', 'orders', 'circle', or 'addresses'. For External: full URL."
              autoComplete="off"
            />

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Badge Text (Optional)"
                  value={modalBadgeText}
                  onChange={setModalBadgeText}
                  placeholder="e.g. 1, New, Tier 2"
                  autoComplete="off"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Badge Color Tone"
                  options={BADGE_TONE_OPTIONS}
                  value={modalBadgeTone}
                  onChange={setModalBadgeTone}
                />
              </div>
            </InlineStack>

            <Checkbox
              label="Open Link in New Tab / Window"
              checked={modalOpenInNewTab}
              onChange={setModalOpenInNewTab}
            />

            <Checkbox
              label="Visible on Mobile Customer Account"
              checked={modalMobileVisible}
              onChange={setModalMobileVisible}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: LIVE STORE LAUNCH & SETUP GUIDE (RESOLVES 404) */}
      {/* ============================================================== */}
      <Modal
        open={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        title="Testing Your Portal on Live Shopify Store"
        primaryAction={{
          content: "Open Store /account Page ↗",
          onAction: () => {
            window.open(accountUrl, "_blank");
          },
        }}
        secondaryActions={[
          {
            content: "Close",
            onAction: () => setIsLiveModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="warning">
              <Text as="p" fontWeight="bold">
                Why "404 Page not found" occurred:
              </Text>
              <Text as="p">
                Shopify Customer Account UI Extensions run exclusively on <strong>New Customer Accounts</strong>. If your store currently uses legacy "Classic accounts", Shopify's theme router cannot find extension pages and displays a 404. Follow the 2 quick verification steps below:
              </Text>
            </Banner>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingSm">
                      Step 1: Activate "New Customer Accounts"
                    </Text>
                    <Text as="p" tone="subdued">
                      Go to Shopify Admin &gt; Settings &gt; Customer Accounts, and select <strong>New customer accounts</strong>.
                    </Text>
                  </BlockStack>
                  <Button
                    url={customerAccountsSettingsUrl}
                    target="_blank"
                    variant="primary"
                  >
                    Open Settings ↗
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingSm">
                      Step 2: Add Extension in Accounts Editor
                    </Text>
                    <Text as="p" tone="subdued">
                      In the Checkout &amp; Accounts editor, select the account page and add the <strong>Customer Portal Page</strong> extension.
                    </Text>
                  </BlockStack>
                  <Button
                    url={checkoutEditorUrl}
                    target="_blank"
                    variant="secondary"
                  >
                    Open Editor ↗
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingSm">
                      Step 3: Open Live Customer Portal
                    </Text>
                    <Text as="p" tone="subdued">
                      Once New Customer Accounts is active, navigating to <strong>/account</strong> opens the customer portal.
                    </Text>
                  </BlockStack>
                  <Button
                    url={accountUrl}
                    target="_blank"
                    variant="secondary"
                  >
                    Visit /account ↗
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
