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
    const fontFamily = (formData.get("fontFamily") as string) || "inherit";
    const supportUrl = (formData.get("supportUrl") as string) || "https://wa.me/918233905718";
    const circleTierTitle = (formData.get("circleTierTitle") as string) || "Amolih Circle's Progress Bar";
    const circlePageUrl = (formData.get("circlePageUrl") as string) || "amolih-circle-progress-bar";
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
        circlePageUrl,
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
  { label: "Internal Account Page (details, orders, amolih-circle-progress-bar, addresses)", value: "INTERNAL_PAGE" },
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
  const [fontFamily, setFontFamily] = useState(config.fontFamily || "inherit");
  const [supportUrl, setSupportUrl] = useState(config.supportUrl || "https://wa.me/918233905718");
  const [circleTierTitle, setCircleTierTitle] = useState(config.circleTierTitle || "Amolih Circle's Progress Bar");
  const [circlePageUrl, setCirclePageUrl] = useState((config as any).circlePageUrl || "amolih-circle-progress-bar");
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
  const dashboardUrl = `https://${shop}/apps/customerdashboard`;
  const appProxySettingsUrl = `https://admin.shopify.com/store/${storeHandle}/settings/apps`;

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
        circlePageUrl,
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
                Customer dashboard is served through App Proxy. Menus, links, and themes apply at /apps/customerdashboard.
              </Text>
            </BlockStack>
            <InlineStack gap="300">
              <Badge tone="success">App Proxy</Badge>
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
                      maxWidth: previewDevice === "mobile" ? "440px" : "100%",
                      width: "100%",
                      margin: previewDevice === "mobile" ? "0 auto" : "0",
                      border: "1px solid #CBD5E1",
                      borderRadius: "16px",
                      padding: previewDevice === "mobile" ? "14px 12px" : "24px",
                      backgroundColor: "#F8FAFC",
                      overflowX: "clip",
                      boxSizing: "border-box",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                    }}
                  >
                    <link
                      rel="stylesheet"
                      href="https://fonts.googleapis.com/css2?family=Bellefair&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=Open+Sans:wght@400;600&display=swap"
                    />

                    {/* Luxury Amolih Hero Welcome Banner */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 50%, #FAF7F2 100%)",
                        border: "1px solid rgba(197, 168, 128, 0.4)",
                        borderRadius: "12px",
                        padding: "20px 24px",
                        marginBottom: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#A8895E",
                            background: "#FFFFFF",
                            border: "1px solid rgba(197, 168, 128, 0.4)",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            marginBottom: "6px",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          ✦ AMOLIH PRIVÉ &bull; JAIPUR ATELIER
                        </div>
                        <h1
                          style={{
                            fontFamily: "'Bellefair', 'Cormorant Garamond', Georgia, serif",
                            fontSize: "26px",
                            color: textColor,
                            margin: 0,
                            fontWeight: 400,
                            lineHeight: 1.2,
                          }}
                        >
                          {welcomeMessage}, Sarah
                        </h1>
                        <p
                          style={{
                            color: "#64748B",
                            fontSize: "13px",
                            margin: "4px 0 0",
                            fontFamily: "'Inter', 'Open Sans', sans-serif",
                          }}
                        >
                          Jaipur Artisan Fine Jewelry &bull; Bespoke account dashboard & concierge
                        </p>
                      </div>

                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: "#FFFFFF",
                          border: "2px solid #C5A880",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Bellefair', serif",
                          fontSize: "20px",
                          color: primaryColor,
                          fontWeight: 500,
                          boxShadow: "0 4px 10px rgba(197, 168, 128, 0.25)",
                        }}
                      >
                        SJ
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: previewDevice === "mobile" ? "minmax(0, 1fr)" : "280px 1fr",
                        gap: previewDevice === "mobile" ? "14px" : "24px",
                        fontFamily: "'Inter', 'Open Sans', sans-serif",
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        overflowX: "clip",
                      }}
                    >
                      {/* DYNAMIC LEFT NAVIGATION (VERTICAL SIDEBAR ON DESKTOP, LINEAR HORIZONTAL SCROLL PILL BAR ON MOBILE) */}
                      <div
                        style={{
                          backgroundColor: sidebarBgColor,
                          border: "1px solid #E2E8F0",
                          borderRadius: previewDevice === "mobile" ? "16px" : "12px",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: previewDevice === "mobile" ? "row" : "column",
                          height: "fit-content",
                          width: "100%",
                          maxWidth: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                          ...(previewDevice === "mobile"
                            ? {
                                padding: "6px",
                                overflowX: "auto",
                                whiteSpace: "nowrap",
                                scrollbarWidth: "none",
                                touchAction: "pan-x",
                                overscrollBehaviorX: "contain",
                                gap: "8px",
                                alignItems: "center",
                              }
                            : {}),
                        }}
                      >
                        {/* Customer Profile Header (Desktop only) */}
                        {previewDevice !== "mobile" && (
                          <div
                            style={{
                              padding: "16px 18px",
                              borderBottom: "1px solid #E2E8F0",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              backgroundColor: "rgba(0,0,0,0.015)",
                            }}
                          >
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "#FFFFFF",
                                border: "1.5px solid #C5A880",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontFamily: "'Bellefair', serif",
                                fontSize: "15px",
                                color: primaryColor,
                              }}
                            >
                              SJ
                            </div>
                            <div>
                              <div
                                style={{
                                  fontFamily: "'Cormorant Garamond', 'Bellefair', serif",
                                  fontSize: "16px",
                                  fontWeight: 600,
                                  color: textColor,
                                }}
                              >
                                Sarah Jenkins
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748B" }}>sarah.j@amolih.com</div>
                            </div>
                          </div>
                        )}

                        {/* RENDER DYNAMICALLY CONFIGURED MENUS (LINEAR PILLS ON MOBILE, FULL ROWS ON DESKTOP) */}
                        <div
                          style={{
                            padding: previewDevice === "mobile" ? "0" : "8px",
                            display: "flex",
                            flexDirection: previewDevice === "mobile" ? "row" : "column",
                            gap: previewDevice === "mobile" ? "8px" : "4px",
                            overflowX: previewDevice === "mobile" ? "auto" : "visible",
                            width: previewDevice === "mobile" ? "100%" : "auto",
                          }}
                        >
                          {menuItems
                            .filter((item) => item.isEnabled)
                            .map((item, idx) => {
                              const isActive = simActiveTab === item.destination;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (item.linkType === "EXTERNAL_URL" || item.linkType === "SUPPORT_ACTION") {
                                      window.open(item.destination, "_blank");
                                    } else {
                                      setSimActiveTab(item.destination);
                                    }
                                  }}
                                  style={{
                                    flex: previewDevice === "mobile" ? "0 0 auto" : "none",
                                    backgroundColor: isActive ? primaryColor : (previewDevice === "mobile" ? "#FFFFFF" : "transparent"),
                                    color: isActive ? "#FFFFFF" : textColor,
                                    border: previewDevice === "mobile" ? (isActive ? `1px solid ${primaryColor}` : "1px solid #E2E8F0") : "none",
                                    padding: previewDevice === "mobile" ? "8px 16px" : "12px 14px",
                                    borderRadius: previewDevice === "mobile" ? "999px" : "8px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: previewDevice === "mobile" ? "center" : "space-between",
                                    gap: "8px",
                                    cursor: "pointer",
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: previewDevice === "mobile" ? "13px" : "14px",
                                    boxShadow: isActive ? "0 4px 12px rgba(53,94,89,0.22)" : (previewDevice === "mobile" ? "0 1px 3px rgba(0,0,0,0.03)" : "none"),
                                    transition: "all 0.15s ease",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "15px" }}>{item.icon}</span>
                                    <span>{item.label}</span>
                                  </div>

                                  {item.badgeText && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 600,
                                        padding: "1px 6px",
                                        borderRadius: "999px",
                                        backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#E2E8F0",
                                        color: isActive ? "#FFFFFF" : "#1E293B",
                                      }}
                                    >
                                      {item.badgeText}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>

                        {/* WhatsApp Concierge Strip (Desktop only) */}
                        {previewDevice !== "mobile" && (
                          <div
                            style={{
                              margin: "8px",
                              padding: "14px",
                              background: "#FFFFFF",
                              border: "1px solid #E2E8F0",
                              borderRadius: "8px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: "15px",
                                fontWeight: 600,
                                color: textColor,
                                marginBottom: "2px",
                              }}
                            >
                              Jaipur Atelier Concierge
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "8px" }}>
                              Bespoke sizing, styling & assistance
                            </div>
                            <a
                              href={supportUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "block",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                background: primaryColor,
                                color: "#fff",
                                textDecoration: "none",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              💬 Chat on WhatsApp
                            </a>
                          </div>
                        )}
                      </div>

                      {/* RIGHT SIMULATOR CANVAS: DYNAMIC CONTENT ACCORDING TO SELECTED MENU */}
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "12px",
                          padding: previewDevice === "mobile" ? "18px 14px" : "28px",
                          minHeight: previewDevice === "mobile" ? "auto" : "440px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                        }}
                      >
                        {simActiveTab === "details" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <h2
                                  style={{
                                    fontFamily: "'Bellefair', 'Cormorant Garamond', serif",
                                    fontSize: "24px",
                                    fontWeight: 400,
                                    margin: "0 0 4px 0",
                                    color: textColor,
                                    letterSpacing: "0.015em",
                                  }}
                                >
                                  Client Profile & Bespoke Contact
                                </h2>
                                <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
                                  Your registered client information, fine jewelry investment totals, and concierge details.
                                </p>
                              </div>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            {/* 4 Quick Metric Cards */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: previewDevice === "mobile" ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(130px, 1fr))",
                                gap: "12px",
                              }}
                            >
                              <div
                                style={{
                                  background: "#FAF7F2",
                                  border: "1px solid rgba(197, 168, 128, 0.4)",
                                  borderRadius: "8px",
                                  padding: previewDevice === "mobile" ? "10px 12px" : "14px",
                                }}
                              >
                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A8895E" }}>
                                  Lifetime Investment
                                </div>
                                <div style={{ fontFamily: "'Bellefair', serif", fontSize: previewDevice === "mobile" ? "20px" : "24px", color: primaryColor, marginTop: "2px" }}>
                                  ₹38,450.00
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Fine jewelry acquired</div>
                              </div>

                              <div
                                style={{
                                  background: "#FAF7F2",
                                  border: "1px solid rgba(197, 168, 128, 0.4)",
                                  borderRadius: "8px",
                                  padding: previewDevice === "mobile" ? "10px 12px" : "14px",
                                }}
                              >
                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A8895E" }}>
                                  Orders Placed
                                </div>
                                <div style={{ fontFamily: "'Bellefair', serif", fontSize: previewDevice === "mobile" ? "20px" : "24px", color: textColor, marginTop: "2px" }}>
                                  3
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Bespoke & ready pieces</div>
                              </div>

                              <div
                                style={{
                                  background: "#FAF7F2",
                                  border: "1px solid rgba(197, 168, 128, 0.4)",
                                  borderRadius: "8px",
                                  padding: previewDevice === "mobile" ? "10px 12px" : "14px",
                                }}
                              >
                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A8895E" }}>
                                  Privilege Status
                                </div>
                                <div style={{ fontFamily: "'Bellefair', serif", fontSize: previewDevice === "mobile" ? "18px" : "20px", color: textColor, marginTop: "2px" }}>
                                  Tier 2 Privé
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Amolih Circle VIP</div>
                              </div>

                              <div
                                style={{
                                  background: "#FAF7F2",
                                  border: "1px solid rgba(197, 168, 128, 0.4)",
                                  borderRadius: "8px",
                                  padding: previewDevice === "mobile" ? "10px 12px" : "14px",
                                }}
                              >
                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A8895E" }}>
                                  Primary Destination
                                </div>
                                <div style={{ fontSize: previewDevice === "mobile" ? "14px" : "15px", fontWeight: 600, color: textColor, marginTop: "4px" }}>
                                  Mumbai, IN
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>Insured Courier</div>
                              </div>
                            </div>

                            {/* Profile Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: previewDevice === "mobile" ? "1fr" : "1fr 1fr", gap: "14px" }}>
                              <div style={{ background: "#FAF7F2", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716C" }}>
                                  First Name
                                </label>
                                <div style={{ fontSize: "15px", fontWeight: 500, color: textColor, marginTop: "4px" }}>
                                  Sarah
                                </div>
                              </div>
                              <div style={{ background: "#FAF7F2", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716C" }}>
                                  Last Name
                                </label>
                                <div style={{ fontSize: "15px", fontWeight: 500, color: textColor, marginTop: "4px" }}>
                                  Jenkins
                                </div>
                              </div>
                              <div style={{ gridColumn: previewDevice === "mobile" ? "span 1" : "span 2", background: "#FAF7F2", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716C" }}>
                                  Email Address
                                </label>
                                <div style={{ fontSize: "15px", fontWeight: 500, color: textColor, marginTop: "4px" }}>
                                  sarah.j@amolih.com
                                </div>
                              </div>
                              <div style={{ gridColumn: previewDevice === "mobile" ? "span 1" : "span 2", background: "#FAF7F2", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px" }}>
                                <label style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716C" }}>
                                  Contact Phone
                                </label>
                                <div style={{ fontSize: "15px", fontWeight: 500, color: textColor, marginTop: "4px" }}>
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
                                <h2
                                  style={{
                                    fontFamily: "'Bellefair', 'Cormorant Garamond', serif",
                                    fontSize: "24px",
                                    fontWeight: 400,
                                    margin: "0 0 4px 0",
                                    color: textColor,
                                  }}
                                >
                                  Orders History
                                </h2>
                                <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
                                  3 fine jewelry orders recorded in your archive.
                                </p>
                              </div>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            <div
                              style={{
                                border: "1px solid #E2E8F0",
                                borderRadius: "12px",
                                padding: "18px 20px",
                                background: "#FFFFFF",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div>
                                  <span style={{ fontFamily: "'Bellefair', serif", fontSize: "18px", color: textColor }}>
                                    Order #1042
                                  </span>
                                  <div style={{ fontSize: "12px", color: "#64748B" }}>Placed on 28 Oct 2026 &bull; Air Courier</div>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <span style={{ padding: "3px 8px", borderRadius: "999px", background: "#F0FDF4", color: "#166534", fontSize: "11px", fontWeight: 600 }}>
                                    ● Paid
                                  </span>
                                  <span style={{ padding: "3px 8px", borderRadius: "999px", background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 600 }}>
                                    ● Fulfilled
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0" }}>
                                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 600 }}>
                                  Jaipur Solitaire Charm Necklace &times; 1
                                </span>
                                <span style={{ fontFamily: "'Bellefair', serif", fontSize: "20px", color: primaryColor }}>
                                  ₹3,450.00
                                </span>
                              </div>

                              <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #F1F5F9" }}>
                                <span style={{ padding: "5px 10px", borderRadius: "6px", background: primaryColor, color: "#fff", fontSize: "12px", fontWeight: 600 }}>
                                  Track Shipment ↗
                                </span>
                                <span style={{ padding: "5px 10px", borderRadius: "6px", background: "#FAF7F2", border: "1px solid #E2E8F0", color: textColor, fontSize: "12px", fontWeight: 500 }}>
                                  💬 Inquire on WhatsApp
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {(simActiveTab === "circle" || simActiveTab === "amolih-circle-progress-bar" || simActiveTab === circlePageUrl) && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                              <div>
                                <h2
                                  style={{
                                    fontFamily: "'Bellefair', 'Cormorant Garamond', serif",
                                    fontSize: "24px",
                                    fontWeight: 400,
                                    margin: "0 0 4px 0",
                                    color: textColor,
                                  }}
                                >
                                  {circleTierTitle}
                                </h2>
                                <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
                                  Jaipur Heritage Loyalty Tier &bull; /pages/{circlePageUrl.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/?pages\//i, "").replace(/^\/+|\/+$/g, "") || "amolih-circle-progress-bar"}
                                </p>
                              </div>
                              <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "999px", background: "rgba(53,94,89,0.1)", color: primaryColor, fontWeight: 600 }}>
                                ✦ Active Privileges
                              </span>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            {/* Loyalty Progress Tracker */}
                            <div
                              style={{
                                background: "linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 100%)",
                                border: "1px solid rgba(197, 168, 128, 0.4)",
                                borderRadius: "10px",
                                padding: "20px",
                              }}
                            >
                              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A8895E", fontWeight: 700 }}>
                                Current Membership Status
                              </div>
                              <div style={{ fontFamily: "'Bellefair', serif", fontSize: "22px", color: textColor, marginTop: "2px" }}>
                                Amolih Circle &bull; Tier 2 Privé
                              </div>

                              <div style={{ width: "100%", height: "12px", background: "#E7DFD5", borderRadius: "999px", overflow: "hidden", margin: "14px 0 8px" }}>
                                <div style={{ height: "100%", width: "65%", background: "linear-gradient(90deg, #355E59 0%, #C5A880 60%, #355E59 100%)", borderRadius: "999px" }} />
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, color: "#A8895E" }}>
                                <span>Tier 1: Silver Artisan</span>
                                <span>Tier 2: Royal Jaipur Privé</span>
                                <span>Tier 3: Imperial Heritage</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {simActiveTab === "addresses" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                              <h2
                                style={{
                                  fontFamily: "'Bellefair', 'Cormorant Garamond', serif",
                                  fontSize: "24px",
                                  fontWeight: 400,
                                  margin: "0 0 4px 0",
                                  color: textColor,
                                }}
                              >
                                Saved Delivery Locations
                              </h2>
                              <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
                                2 shipping addresses linked to your account.
                              </p>
                            </div>
                            <div style={{ borderBottom: "1px solid #E2E8F0" }} />

                            <div
                              style={{
                                border: "1px solid #E2E8F0",
                                borderRadius: "10px",
                                padding: "18px",
                                background: "#FFFFFF",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>
                                  Sarah Jenkins
                                </strong>
                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: "#ECFDF5", color: "#166534", fontWeight: 600 }}>
                                  ✦ Default Location
                                </span>
                              </div>
                              <div style={{ marginTop: "6px", fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
                                42 Marina Boulevard, Apt 9B<br />
                                Mumbai, Maharashtra 400001 &bull; India<br />
                                <span style={{ color: "#64748B", fontSize: "12px" }}>📞 +91 98234 56789</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {!["details", "orders", "circle", "addresses", "amolih-circle-progress-bar", circlePageUrl].includes(simActiveTab) && (
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

                    {/* Mobile Concierge Strip (Visible below content on mobile preview) */}
                    {previewDevice === "mobile" && (
                      <div
                        style={{
                          marginTop: "14px",
                          padding: "16px",
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "12px",
                          textAlign: "center",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: "16px",
                            fontWeight: 600,
                            color: textColor,
                            marginBottom: "2px",
                          }}
                        >
                          Jaipur Atelier Concierge
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "10px" }}>
                          Bespoke sizing, styling & assistance
                        </div>
                        <a
                          href={supportUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            background: primaryColor,
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          💬 Chat on WhatsApp
                        </a>
                        <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #F1F5F9" }}>
                          <span style={{ fontSize: "12px", color: "#94A3B8" }}>🚪 Sign out of account</span>
                        </div>
                      </div>
                    )}
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
                            label="Portal Typography (Front End Theme Font)"
                            options={[
                              { label: "👑 Amolih Luxury Signature (Bellefair, Cormorant Garamond, Inter, Open Sans)", value: "amolih" },
                              { label: "✨ Storefront Theme Typography (Inherit - Live Front End Font)", value: "inherit" },
                              { label: "Bellefair & Cormorant Garamond (Jaipur Heritage Serif)", value: "Bellefair, 'Cormorant Garamond', serif" },
                              { label: "Inter & Open Sans (Modern Clean Sans)", value: "Inter, 'Open Sans', -apple-system, sans-serif" },
                              { label: "Clean Geometric (Poppins)", value: "Poppins, -apple-system, sans-serif" },
                              { label: "Luxury Editorial Serif (Playfair Display)", value: "Playfair Display, Georgia, serif" },
                              { label: "Contemporary Modern (Montserrat)", value: "Montserrat, -apple-system, sans-serif" },
                              { label: "Modern Neutral (Plus Jakarta Sans)", value: "Plus Jakarta Sans, sans-serif" },
                            ]}
                            value={fontFamily}
                            onChange={setFontFamily}
                            helpText="Choose 'Amolih Luxury Signature' to automatically apply Bellefair/Cormorant Garamond for luxury headings and Inter/Open Sans for modern body text."
                          />
                          <TextField
                            label="Loyalty Program Menu Title"
                            value={circleTierTitle}
                            onChange={setCircleTierTitle}
                            autoComplete="off"
                          />
                          <TextField
                            label="Amolih Circle Page URL / Slug"
                            value={circlePageUrl}
                            onChange={setCirclePageUrl}
                            helpText="Assign the page URL or slug for Amolih Circle Progress Bar (e.g. 'amolih-circle-progress-bar' or '/pages/amolih-circle-progress-bar')."
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
              placeholder="e.g. details, orders, amolih-circle-progress-bar, addresses, https://wa.me/..."
              helpText="For Internal Pages: 'details', 'orders', 'amolih-circle-progress-bar', or 'addresses'. For External: full URL."
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
          content: "Open /apps/customerdashboard ↗",
          onAction: () => {
            window.open(dashboardUrl, "_blank");
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
            <Banner tone="info">
              <Text as="p" fontWeight="bold">
                Dashboard uses App Proxy
              </Text>
              <Text as="p">
                The customer portal renders inside your store theme at <strong>/apps/customerdashboard</strong>. Theme header and footer stay; the app fills the middle. Customers should be signed in on the storefront to see their data.
              </Text>
            </Banner>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingSm">
                      Step 1: Confirm App Proxy URL
                    </Text>
                    <Text as="p" tone="subdued">
                      In Shopify Admin &gt; Settings &gt; Apps, open this app and confirm the App Proxy path is <strong>apps/customerdashboard</strong> (Customize URL if this store was installed before the proxy was added).
                    </Text>
                  </BlockStack>
                  <Button
                    url={appProxySettingsUrl}
                    target="_blank"
                    variant="primary"
                  >
                    Open Apps ↗
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingSm">
                      Step 2: Open the live dashboard
                    </Text>
                    <Text as="p" tone="subdued">
                      Visit <strong>/apps/customerdashboard</strong> while signed in as a customer. You can also add that URL to a menu or account link in your theme.
                    </Text>
                  </BlockStack>
                  <Button
                    url={dashboardUrl}
                    target="_blank"
                    variant="secondary"
                  >
                    Visit dashboard ↗
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
