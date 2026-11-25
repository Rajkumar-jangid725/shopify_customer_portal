import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
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
import { LiveStorefrontPreview } from "../components/LiveStorefrontPreview";

export const DEFAULT_APP_SETTINGS = {
  general: {
    appStatus: true,
    quickReorder: true,
    cancelOrder: true,
    totalSpent: true,
    allOrders: true,
    addresses: true,
    editProfile: true,
    downloadInvoice: true,
    payNowButton: false,
    addressSuggestions: true,
    newOrderStatus: false,
    ordersPerPage: 4,
    returnRequest: false,
  },
  forYou: {
    showRecommendations: true,
    showRecentlyViewed: true,
    showLoyaltyPerks: true,
    showWishlist: true,
  },
  colorTypography: {
    fullContainerBg: "#FAF7F2",
    halfContainerBg: "#FFFFFF",
    foreground: "#FFFFFF",
    foregroundText: "#000000",
    primaryBtnBg: "#000000",
    primaryBtnText: "#FFFFFF",
    primaryBtnHover: "#FFFFFF",
    textColor: "#4C4D4D",
    headingColor: "#000000",
    labelColor: "#000000",
    inputBgColor: "#F5F5F5",
    borderColor: "#E5E5E5",
    textSize: 16,
    headingSize: 40,
  },
  navigationStyle: {
    mobileStyle: "slides" as "toggle" | "slides",
    border: "#E5E5E5",
    customerName: "#1A1A1A",
    headerBg: "#FDF8F3",
    itemsBg: "#FDF8F3",
    itemText: "#1A1A1A",
    activeItemBg: "#426E6D",
    activeItemText: "#FFFFFF",
    hoverItemBg: "#C8A962",
    hoverItemText: "#FFFFFF",
    menuTextSize: 15,
  },
  address: {
    addressSuggestions: true,
    fields: {
      firstName: true,
      lastName: true,
      company: false,
      address: true,
      apartment: false,
      city: true,
      zip: true,
      phone: false,
    },
    allowedCountries: [] as string[],
  },
  customFields: [
    { id: "cf-1", label: "Date of Birth", type: "date" as const, required: false },
    { id: "cf-2", label: "GSTIN / Tax ID", type: "text" as const, required: false },
  ],
};

const COUNTRIES_LIST = [
  "Afghanistan", "Åland Islands", "Albania", "Algeria", "Andorra", "Angola", "Anguilla", "Antigua & Barbuda", "Argentina", "Armenia",
  "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belgium", "Belize",
  "Bermuda", "Bhutan", "Brazil", "Canada", "Denmark", "France", "Germany", "India", "Ireland", "Italy",
  "Japan", "Netherlands", "New Zealand", "Norway", "Singapore", "Spain", "Sweden", "Switzerland", "United Arab Emirates", "United Kingdom", "United States"
];

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
    const fontFamily = (formData.get("fontFamily") as string) || "inherit";
    const supportUrl = (formData.get("supportUrl") as string) || "https://wa.me/918233905718";
    const circleTierTitle = (formData.get("circleTierTitle") as string) || "Amolih Circle's Progress Bar";
    const circlePageUrl = (formData.get("circlePageUrl") as string) || "amolih-circle-progress-bar";
    const welcomeMessage = (formData.get("welcomeMessage") as string) || "Welcome back";
    const customCss = (formData.get("customCss") as string) || "";
    const settingsJson = (formData.get("settingsJson") as string) || "{}";

    let parsedSettings: any = {};
    try {
      parsedSettings = JSON.parse(settingsJson);
    } catch (e) {}

    const primaryColor =
      parsedSettings?.navigationStyle?.activeItemBg ||
      parsedSettings?.colorTypography?.primaryBtnBg ||
      "#426E6D";
    const sidebarBgColor =
      parsedSettings?.navigationStyle?.itemsBg ||
      parsedSettings?.colorTypography?.halfContainerBg ||
      "#FDF8F3";
    const textColor =
      parsedSettings?.colorTypography?.headingColor ||
      "#1A1A1A";

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
        customCss,
        baseFontSize: settingsJson,
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

function DragHandleIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      style={{
        width: "18px",
        height: "18px",
        fill: "#8C9196",
        display: "block",
      }}
      focusable="false"
      aria-hidden="true"
    >
      <path d="M7 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm6-12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
    </svg>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
  subLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  subLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      <div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>
          {label}
        </div>
        {subLabel && (
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
            {subLabel}
          </div>
        )}
      </div>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: "42px",
          height: "24px",
          backgroundColor: checked ? "#000000" : "#E2E8F0",
          borderRadius: "999px",
          cursor: "pointer",
          position: "relative",
          transition: "background-color 0.2s ease",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            backgroundColor: "#FFFFFF",
            borderRadius: "50%",
            position: "absolute",
            top: "3px",
            left: checked ? "21px" : "3px",
            transition: "left 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        />
      </div>
    </div>
  );
}

function ColorPickerField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  helpText?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <label style={{ fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>
          {label}
        </label>
        <span style={{ fontSize: "11px", color: "#94A3B8", cursor: "help" }} title={helpText || label}>
          ⓘ
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "6px 10px",
          border: "1px solid #CBD5E1",
          borderRadius: "6px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <input
          type="color"
          value={value && value.startsWith("#") ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "26px",
            height: "26px",
            border: "1px solid #E2E8F0",
            borderRadius: "4px",
            cursor: "pointer",
            padding: 0,
            background: "none",
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            fontSize: "13px",
            fontFamily: "monospace",
            color: "#334155",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "14px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>
          {label}
        </label>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: "#000000",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

export default function Index() {
  const { shop, config } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [selectedTab, setSelectedTab] = useState(0); // 0: General, 1: For you, 2: Color & Typography, 3: Navigation Style, 4: Address

  // Initial settings state parsing from baseFontSize or defaults
  const initialSettings = (() => {
    try {
      if (config.baseFontSize && config.baseFontSize.startsWith("{")) {
        const parsed = JSON.parse(config.baseFontSize);
        return {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          general: { ...DEFAULT_APP_SETTINGS.general, ...(parsed.general || {}) },
          forYou: { ...DEFAULT_APP_SETTINGS.forYou, ...(parsed.forYou || {}) },
          colorTypography: { ...DEFAULT_APP_SETTINGS.colorTypography, ...(parsed.colorTypography || {}) },
          navigationStyle: { ...DEFAULT_APP_SETTINGS.navigationStyle, ...(parsed.navigationStyle || {}) },
          address: {
            ...DEFAULT_APP_SETTINGS.address,
            ...(parsed.address || {}),
            fields: { ...DEFAULT_APP_SETTINGS.address.fields, ...(parsed.address?.fields || {}) },
          },
        };
      }
    } catch (e) {}
    return DEFAULT_APP_SETTINGS;
  })();

  const [settings, setSettings] = useState(initialSettings);
  const [customCss, setCustomCss] = useState<string>((config as any).customCss || "");
  const [fontFamily, setFontFamily] = useState(config.fontFamily || "inherit");
  const [countrySearch, setCountrySearch] = useState("");

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

  // Modals for Manage navigations & Custom fields
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [newCustomFieldType, setNewCustomFieldType] = useState<"text" | "number" | "date" | "select">("text");
  const [newCustomFieldRequired, setNewCustomFieldRequired] = useState(false);

  // Live Simulator View State
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTab, setPreviewTab] = useState(menuItems[0]?.destination || "orders");
  const [previewSearch, setPreviewSearch] = useState("");

  // Sync preview tab with active settings tab for instant feedback
  useEffect(() => {
    if (selectedTab === 0) setPreviewTab("orders");
    else if (selectedTab === 1) setPreviewTab("circle");
    else if (selectedTab === 4) setPreviewTab("addresses");
  }, [selectedTab]);

  // Drag and drop state for menu reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isSaving = fetcher.state === "submitting";

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const items = [...menuItems];
    const [removed] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, removed);
    items.forEach((item, idx) => (item.position = idx));
    setMenuItems(items);
    setDraggedIndex(null);
    setDragOverIndex(null);
    shopify.toast.show("Menu order updated");
  };

  const handleSaveAll = () => {
    fetcher.submit(
      {
        intent: "save_all",
        portalTitle: config.portalTitle || "Amolih Customer Portal",
        primaryColor: settings.navigationStyle.activeItemBg || "#426E6D",
        sidebarBgColor: settings.navigationStyle.itemsBg || "#FDF8F3",
        textColor: settings.colorTypography.headingColor || "#1A1A1A",
        fontFamily,
        supportUrl: config.supportUrl || "https://wa.me/918233905718",
        circleTierTitle: config.circleTierTitle || "Amolih Circle's Progress Bar",
        circlePageUrl: (config as any).circlePageUrl || "amolih-circle-progress-bar",
        welcomeMessage: config.welcomeMessage || "Welcome back",
        customCss,
        settingsJson: JSON.stringify(settings),
        menuItems: JSON.stringify(menuItems),
      },
      { method: "POST" }
    );
    shopify.toast.show("Portal settings & configurations published!");
  };

  const updateGeneral = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      general: { ...prev.general, [key]: value },
    }));
  };

  const updateForYou = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      forYou: { ...prev.forYou, [key]: value },
    }));
  };

  const updateColorTypography = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      colorTypography: { ...prev.colorTypography, [key]: value },
    }));
  };

  const updateNavigationStyle = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      navigationStyle: { ...prev.navigationStyle, [key]: value },
    }));
  };

  const updateAddress = (key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      address: { ...prev.address, [key]: value },
    }));
  };

  const updateAddressField = (field: string, value: boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        fields: { ...prev.address.fields, [field]: value },
      },
    }));
  };

  const toggleCountry = (country: string) => {
    setSettings((prev: any) => {
      const current = prev.address.allowedCountries || [];
      const updated = current.includes(country)
        ? current.filter((c: string) => c !== country)
        : [...current, country];
      return {
        ...prev,
        address: { ...prev.address, allowedCountries: updated },
      };
    });
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

  const handleAddCustomField = () => {
    if (!newCustomFieldLabel.trim()) {
      shopify.toast.show("Please enter a field label");
      return;
    }
    const newField = {
      id: `cf-${Date.now()}`,
      label: newCustomFieldLabel.trim(),
      type: newCustomFieldType,
      required: newCustomFieldRequired,
    };
    setSettings((prev: any) => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField],
    }));
    setNewCustomFieldLabel("");
    setNewCustomFieldRequired(false);
    shopify.toast.show("Custom field added");
  };

  const handleDeleteCustomField = (id: string) => {
    setSettings((prev: any) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((f: any) => f.id !== id),
    }));
    shopify.toast.show("Custom field removed");
  };

  const tabs = [
    { id: "general", content: "General" },
    { id: "for-you", content: "For you" },
    { id: "color-typography", content: "Color & Typography" },
    { id: "nav-style", content: "Navigation Style" },
    { id: "address", content: "Address" },
  ];

  const filteredCountries = COUNTRIES_LIST.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <Page fullWidth>
      <TitleBar title="Shopify Customer Portal Builder">
        <button variant="primary" onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? "Publishing Changes..." : "Save & Publish Changes"}
        </button>
      </TitleBar>

      <BlockStack gap="400">
        {/* Top Header Strip with Template name & Quick Manager actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 0 12px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px", color: "#64748B", cursor: "pointer" }}>←</span>
            <div>
              <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#1E293B" }}>
                Template 1
              </h1>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                Standard side navigation layout
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button onClick={() => setIsCustomFieldsModalOpen(true)}>
              Manage custom fields
            </Button>
            <Button onClick={() => setIsNavModalOpen(true)}>
              Manage navigations
            </Button>
            <Button variant="primary" onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? "Publishing Changes..." : "Save & Publish Changes"}
            </Button>
          </div>
        </div>

        {/* Top Settings Navigation Tabs */}
        <Card padding="0">
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box padding="500">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "360px 1fr",
                  gap: "24px",
                  alignItems: "start",
                }}
              >
                {/* ============================================================== */}
                {/* LEFT COLUMN: ACTIVE TAB SETTINGS CONTROLS */}
                {/* ============================================================== */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* TAB 0: GENERAL SETTINGS (IMAGE 1) */}
                  {selectedTab === 0 && (
                    <>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            General settings
                          </Text>
                          <Divider />

                          {/* App Status & Theme Activation Banner */}
                          <div
                            style={{
                              padding: "12px 14px",
                              borderRadius: "8px",
                              backgroundColor: settings.general.appStatus ? "#F0FDF4" : "#FFFBEB",
                              border: `1px solid ${settings.general.appStatus ? "#BBF7D0" : "#FDE68A"}`,
                              margin: "6px 0 10px 0",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: settings.general.appStatus ? "#16A34A" : "#D97706",
                                    display: "inline-block",
                                  }}
                                />
                                <strong style={{ fontSize: "13px", color: settings.general.appStatus ? "#166534" : "#92400E" }}>
                                  {settings.general.appStatus
                                    ? "Default Dashboard: ACTIVE"
                                    : "Default Dashboard: INACTIVE"}
                                </strong>
                              </div>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: settings.general.appStatus ? "#15803D" : "#B45309",
                                }}
                              >
                                {settings.general.appStatus ? "Replacing /account" : "Shopify Default"}
                              </span>
                            </div>

                            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#374151", lineHeight: 1.4 }}>
                              {settings.general.appStatus
                                ? "Logged-in customers visiting /account are automatically shown your customer portal. Ensure the Customer Portal Embed is activated in your Theme Editor."
                                : "Portal is currently turned off. Turn App status ON and click Save & Publish to replace Shopify's default account page."}
                            </p>

                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <Button
                                size="slim"
                                variant="secondary"
                                url={`https://admin.shopify.com/store/${shop.replace(".myshopify.com", "")}/themes/current/editor?context=apps&activateAppId=60fb9c6b-313f-25da-a0d5-3d74c0b2f6b1b4d58da5/portal_embed`}
                                target="_blank"
                              >
                                Activate in Theme Editor ↗
                              </Button>
                              <Button
                                size="slim"
                                url={`https://${shop}/apps/customerdashboard`}
                                target="_blank"
                              >
                                Test Live Dashboard ↗
                              </Button>
                            </div>
                          </div>

                          <SettingToggle
                            label="App status"
                            subLabel={
                              settings.general.appStatus
                                ? "Active: App replaces Shopify default /account for logged in users"
                                : "Disabled: Shopify's standard account page is visible"
                            }
                            checked={settings.general.appStatus}
                            onChange={(v) => updateGeneral("appStatus", v)}
                          />
                          <SettingToggle
                            label="Quick reorder"
                            checked={settings.general.quickReorder}
                            onChange={(v) => updateGeneral("quickReorder", v)}
                          />
                          <SettingToggle
                            label="Cancel order"
                            checked={settings.general.cancelOrder}
                            onChange={(v) => updateGeneral("cancelOrder", v)}
                          />
                          <SettingToggle
                            label="Total spent"
                            checked={settings.general.totalSpent}
                            onChange={(v) => updateGeneral("totalSpent", v)}
                          />
                          <SettingToggle
                            label="All orders"
                            checked={settings.general.allOrders}
                            onChange={(v) => updateGeneral("allOrders", v)}
                          />
                          <SettingToggle
                            label="Addresses"
                            checked={settings.general.addresses}
                            onChange={(v) => updateGeneral("addresses", v)}
                          />
                          <SettingToggle
                            label="Edit profile"
                            checked={settings.general.editProfile}
                            onChange={(v) => updateGeneral("editProfile", v)}
                          />
                          <SettingToggle
                            label="Download Invoice"
                            checked={settings.general.downloadInvoice}
                            onChange={(v) => updateGeneral("downloadInvoice", v)}
                          />
                          <SettingToggle
                            label="Pay Now Button"
                            checked={settings.general.payNowButton}
                            onChange={(v) => updateGeneral("payNowButton", v)}
                          />
                          <SettingToggle
                            label="Address suggestions"
                            checked={settings.general.addressSuggestions}
                            onChange={(v) => updateGeneral("addressSuggestions", v)}
                          />
                          <SettingToggle
                            label="New order status"
                            checked={settings.general.newOrderStatus}
                            onChange={(v) => updateGeneral("newOrderStatus", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            Orders per page
                          </Text>
                          <RangeSlider
                            label="Orders displayed in history"
                            value={settings.general.ordersPerPage}
                            min={1}
                            max={20}
                            unit="orders"
                            onChange={(v) => updateGeneral("ordersPerPage", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            Return request
                          </Text>
                          <SettingToggle
                            label="Return request"
                            subLabel="Allow customers to submit return requests"
                            checked={settings.general.returnRequest}
                            onChange={(v) => updateGeneral("returnRequest", v)}
                          />
                        </BlockStack>
                      </Card>
                    </>
                  )}

                  {/* TAB 1: FOR YOU SETTINGS */}
                  {selectedTab === 1 && (
                    <Card>
                      <BlockStack gap="300">
                        <Text as="h2" variant="headingMd">
                          For you & Recommendations
                        </Text>
                        <Text as="p" tone="subdued">
                          Configure dynamic personalized product feeds and VIP loyalty perks for your shoppers.
                        </Text>
                        <Divider />
                        <SettingToggle
                          label="Recommended Products feed"
                          subLabel="Show recommended products carousel based on order history"
                          checked={settings.forYou.showRecommendations}
                          onChange={(v) => updateForYou("showRecommendations", v)}
                        />
                        <SettingToggle
                          label="Recently viewed products"
                          subLabel="Track customer browsing and display recently viewed fine jewelry"
                          checked={settings.forYou.showRecentlyViewed}
                          onChange={(v) => updateForYou("showRecentlyViewed", v)}
                        />
                        <SettingToggle
                          label="Loyalty tier progress"
                          subLabel="Display Circle Progress Bar milestones in account header"
                          checked={settings.forYou.showLoyaltyPerks}
                          onChange={(v) => updateForYou("showLoyaltyPerks", v)}
                        />
                        <SettingToggle
                          label="Wishlist & Saved Items"
                          subLabel="Enable customer account wishlist integration"
                          checked={settings.forYou.showWishlist}
                          onChange={(v) => updateForYou("showWishlist", v)}
                        />
                      </BlockStack>
                    </Card>
                  )}

                  {/* TAB 2: COLOR & TYPOGRAPHY SETTINGS (IMAGE 2) */}
                  {selectedTab === 2 && (
                    <>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Container
                          </Text>
                          <Divider />
                          <ColorPickerField
                            label="Full Container Background"
                            value={settings.colorTypography.fullContainerBg}
                            onChange={(v) => updateColorTypography("fullContainerBg", v)}
                          />
                          <ColorPickerField
                            label="Half Container Background"
                            value={settings.colorTypography.halfContainerBg}
                            onChange={(v) => updateColorTypography("halfContainerBg", v)}
                          />
                          <ColorPickerField
                            label="Foreground"
                            value={settings.colorTypography.foreground}
                            onChange={(v) => updateColorTypography("foreground", v)}
                          />
                          <ColorPickerField
                            label="Foreground text"
                            value={settings.colorTypography.foregroundText}
                            onChange={(v) => updateColorTypography("foregroundText", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Primary button
                          </Text>
                          <Divider />
                          <ColorPickerField
                            label="Primary background button"
                            value={settings.colorTypography.primaryBtnBg}
                            onChange={(v) => updateColorTypography("primaryBtnBg", v)}
                          />
                          <ColorPickerField
                            label="Primary button text"
                            value={settings.colorTypography.primaryBtnText}
                            onChange={(v) => updateColorTypography("primaryBtnText", v)}
                          />
                          <ColorPickerField
                            label="Primary button hover"
                            value={settings.colorTypography.primaryBtnHover}
                            onChange={(v) => updateColorTypography("primaryBtnHover", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Text
                          </Text>
                          <Divider />
                          <ColorPickerField
                            label="Text"
                            value={settings.colorTypography.textColor}
                            onChange={(v) => updateColorTypography("textColor", v)}
                          />
                          <ColorPickerField
                            label="Heading"
                            value={settings.colorTypography.headingColor}
                            onChange={(v) => updateColorTypography("headingColor", v)}
                          />
                          <ColorPickerField
                            label="Label color"
                            value={settings.colorTypography.labelColor}
                            onChange={(v) => updateColorTypography("labelColor", v)}
                          />
                          <ColorPickerField
                            label="Input background color"
                            value={settings.colorTypography.inputBgColor}
                            onChange={(v) => updateColorTypography("inputBgColor", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Border
                          </Text>
                          <Divider />
                          <ColorPickerField
                            label="Border color"
                            value={settings.colorTypography.borderColor}
                            onChange={(v) => updateColorTypography("borderColor", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Font Family & Sizing
                          </Text>
                          <Divider />
                          <Select
                            label="Portal Font Family"
                            options={[
                              { label: "Amolih Luxury Signature (Bellefair & Inter)", value: "amolih" },
                              { label: "Theme Default (Inherit Store Font)", value: "inherit" },
                              { label: "Heritage Serif (Bellefair, Cormorant Garamond)", value: "Bellefair, 'Cormorant Garamond', serif" },
                              { label: "Modern Clean Sans (Inter, Open Sans)", value: "Inter, 'Open Sans', -apple-system, sans-serif" },
                              { label: "Poppins Clean Geometric", value: "Poppins, -apple-system, sans-serif" },
                              { label: "Playfair Display Editorial", value: "Playfair Display, Georgia, serif" },
                              { label: "Montserrat Modern", value: "Montserrat, -apple-system, sans-serif" },
                              { label: "Plus Jakarta Sans Neutral", value: "Plus Jakarta Sans, sans-serif" },
                            ]}
                            value={fontFamily}
                            onChange={setFontFamily}
                          />
                          <RangeSlider
                            label="Text size"
                            value={settings.colorTypography.textSize}
                            min={12}
                            max={22}
                            unit="px"
                            onChange={(v) => updateColorTypography("textSize", v)}
                          />
                          <RangeSlider
                            label="Heading size"
                            value={settings.colorTypography.headingSize}
                            min={24}
                            max={54}
                            unit="px"
                            onChange={(v) => updateColorTypography("headingSize", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Custom CSS
                          </Text>
                          <Text as="p" tone="subdued">
                            Add custom CSS rules applicable across the whole app.
                          </Text>
                          <Divider />
                          <div
                            style={{
                              borderRadius: "6px",
                              border: "1px solid #CBD5E1",
                              background: "#FFFFFF",
                              padding: "4px",
                            }}
                          >
                            <textarea
                              value={customCss}
                              onChange={(e) => setCustomCss(e.target.value)}
                              placeholder={`.ac-form-submit .ac-form-btn .ac-btn-text {\n  color: #ffffff;\n}\n#shopify-section-template {\n  color: #fff;\n}`}
                              spellCheck={false}
                              rows={8}
                              style={{
                                width: "100%",
                                border: "none",
                                outline: "none",
                                fontFamily: "monospace",
                                fontSize: "12px",
                                lineHeight: "1.5",
                                color: "#0F172A",
                                boxSizing: "border-box",
                                padding: "8px",
                              }}
                            />
                          </div>
                        </BlockStack>
                      </Card>
                    </>
                  )}

                  {/* TAB 3: NAVIGATION STYLE SETTINGS (IMAGE 3) */}
                  {selectedTab === 3 && (
                    <>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Mobile style
                          </Text>
                          <Divider />
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px" }}>
                              <input
                                type="radio"
                                name="mobileStyle"
                                value="toggle"
                                checked={settings.navigationStyle.mobileStyle === "toggle"}
                                onChange={() => updateNavigationStyle("mobileStyle", "toggle")}
                              />
                              <span>Toggle (Accordion dropdown)</span>
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px" }}>
                              <input
                                type="radio"
                                name="mobileStyle"
                                value="slides"
                                checked={settings.navigationStyle.mobileStyle === "slides"}
                                onChange={() => updateNavigationStyle("mobileStyle", "slides")}
                              />
                              <span>Slides (Linear horizontal pill bar)</span>
                            </label>
                          </div>
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Header
                          </Text>
                          <Divider />
                          <ColorPickerField
                            label="Border"
                            value={settings.navigationStyle.border}
                            onChange={(v) => updateNavigationStyle("border", v)}
                          />
                          <ColorPickerField
                            label="Customer name"
                            value={settings.navigationStyle.customerName}
                            onChange={(v) => updateNavigationStyle("customerName", v)}
                          />
                          <ColorPickerField
                            label="Header background"
                            value={settings.navigationStyle.headerBg}
                            onChange={(v) => updateNavigationStyle("headerBg", v)}
                          />
                          <ColorPickerField
                            label="Items background"
                            value={settings.navigationStyle.itemsBg}
                            onChange={(v) => updateNavigationStyle("itemsBg", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Item
                          </Text>
                          <Divider />
                          <ColorPickerField
                            label="Text"
                            value={settings.navigationStyle.itemText}
                            onChange={(v) => updateNavigationStyle("itemText", v)}
                          />
                          <ColorPickerField
                            label="Active item background"
                            value={settings.navigationStyle.activeItemBg}
                            onChange={(v) => updateNavigationStyle("activeItemBg", v)}
                          />
                          <ColorPickerField
                            label="Active item Text"
                            value={settings.navigationStyle.activeItemText}
                            onChange={(v) => updateNavigationStyle("activeItemText", v)}
                          />
                          <ColorPickerField
                            label="Hover item background"
                            value={settings.navigationStyle.hoverItemBg}
                            onChange={(v) => updateNavigationStyle("hoverItemBg", v)}
                          />
                          <ColorPickerField
                            label="Hover item text"
                            value={settings.navigationStyle.hoverItemText}
                            onChange={(v) => updateNavigationStyle("hoverItemText", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            Menu Text size
                          </Text>
                          <RangeSlider
                            label="Navigation item font size"
                            value={settings.navigationStyle.menuTextSize}
                            min={12}
                            max={22}
                            unit="px"
                            onChange={(v) => updateNavigationStyle("menuTextSize", v)}
                          />
                        </BlockStack>
                      </Card>
                    </>
                  )}

                  {/* TAB 4: ADDRESS SETTINGS (IMAGE 4) */}
                  {selectedTab === 4 && (
                    <>
                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Address suggestions
                          </Text>
                          <Divider />
                          <SettingToggle
                            label="Address suggestions"
                            subLabel="Enable Google address auto-suggestions on address forms"
                            checked={settings.address.addressSuggestions}
                            onChange={(v) => updateAddress("addressSuggestions", v)}
                          />
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Address Form Fields
                          </Text>
                          <Text as="p" tone="subdued">
                            Select which fields are mandatory for customers when saving an address.
                          </Text>
                          <Divider />
                          {[
                            { key: "firstName", label: "First name" },
                            { key: "lastName", label: "Last name" },
                            { key: "company", label: "Company" },
                            { key: "address", label: "Address" },
                            { key: "apartment", label: "Apartment" },
                            { key: "city", label: "City" },
                            { key: "zip", label: "Zip" },
                            { key: "phone", label: "Phone" },
                          ].map((f) => (
                            <div
                              key={f.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 0",
                                borderBottom: "1px solid #F1F5F9",
                              }}
                            >
                              <span style={{ fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>
                                {f.label}
                              </span>
                              <Checkbox
                                label="Required?"
                                checked={(settings.address.fields as any)[f.key] || false}
                                onChange={(val) => updateAddressField(f.key, val)}
                              />
                            </div>
                          ))}
                        </BlockStack>
                      </Card>

                      <Card>
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd">
                            Allowed Countries
                          </Text>
                          <Text as="p" tone="subdued">
                            Only the selected countries appear in the address form. Leave all unchecked to allow every country.
                          </Text>
                          <Divider />
                          <TextField
                            label=""
                            placeholder="Search countries"
                            value={countrySearch}
                            onChange={setCountrySearch}
                            autoComplete="off"
                          />
                          <div
                            style={{
                              maxHeight: "220px",
                              overflowY: "auto",
                              border: "1px solid #E2E8F0",
                              borderRadius: "6px",
                              padding: "8px 12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {filteredCountries.map((country) => (
                              <Checkbox
                                key={country}
                                label={country}
                                checked={(settings.address.allowedCountries || []).includes(country)}
                                onChange={() => toggleCountry(country)}
                              />
                            ))}
                          </div>
                        </BlockStack>
                      </Card>
                    </>
                  )}
                </div>

                {/* ============================================================== */}
                {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW (MATCHES LIVE APP VIEW) */}
                {/* ============================================================== */}
                <LiveStorefrontPreview
                  settings={settings}
                  customCss={customCss}
                  fontFamily={fontFamily}
                  menuItems={menuItems}
                  config={config}
                  previewDevice={previewDevice}
                  setPreviewDevice={setPreviewDevice}
                  previewTab={previewTab}
                  setPreviewTab={setPreviewTab}
                />
              </div>
            </Box>
          </Tabs>
        </Card>
      </BlockStack>

      {/* ============================================================== */}
      {/* MODAL: MANAGE NAVIGATIONS (DRAG-AND-DROP MENU BUILDER) */}
      {/* ============================================================== */}
      <Modal
        open={isNavModalOpen}
        onClose={() => setIsNavModalOpen(false)}
        title="Customer Account Navigation Builder"
        primaryAction={{
          content: "Done",
          onAction: () => setIsNavModalOpen(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="h3" variant="headingMd">
                  Configured Menus ({menuItems.length})
                </Text>
                <Text as="p" tone="subdued">
                  Drag menu items using the handle to reorder or click Edit to customize.
                </Text>
              </BlockStack>
              <Button variant="primary" onClick={handleOpenAddModal}>
                + Add Menu Item
              </Button>
            </InlineStack>
            <Divider />

            {/* Drag & Drop Menu Items List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {menuItems.map((item, idx) => (
                <div
                  key={idx}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: item.isEnabled ? "#FFFFFF" : "#F8FAFC",
                    border:
                      dragOverIndex === idx && draggedIndex !== idx
                        ? "2px dashed #426E6D"
                        : "1px solid #E2E8F0",
                    borderRadius: "8px",
                    opacity: draggedIndex === idx ? 0.35 : item.isEnabled ? 1 : 0.65,
                    cursor: "grab",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "grab",
                        padding: "4px 2px",
                        color: "#8C9196",
                      }}
                      title="Drag to reorder"
                    >
                      <DragHandleIcon />
                    </div>

                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "6px",
                        backgroundColor: settings.navigationStyle.itemsBg || "#FDF8F3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px", color: "#1E293B" }}>
                        {item.label}
                      </span>
                      {item.badgeText && (
                        <Badge tone={(item.badgeTone as any) || "info"}>
                          {item.badgeText}
                        </Badge>
                      )}
                      {!item.isEnabled && <Badge>Disabled</Badge>}
                    </div>
                  </div>

                  <InlineStack gap="200" blockAlign="center">
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

            {/* Quick 1-Click Presets */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #E2E8F0" }}>
              <Text as="h4" variant="headingSm">
                1-Click Presets
              </Text>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                <Button
                  size="slim"
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
                  + Track Package
                </Button>
                <Button
                  size="slim"
                  onClick={() =>
                    handleAddPreset({
                      label: "Return & Exchange",
                      icon: "🔄",
                      destination: "https://returns.yourbrand.com",
                      linkType: "EXTERNAL_URL",
                      badgeText: "Portal",
                      badgeTone: "info",
                      openInNewTab: true,
                    })
                  }
                >
                  + Return & Exchange
                </Button>
                <Button
                  size="slim"
                  onClick={() =>
                    handleAddPreset({
                      label: "Wishlist",
                      icon: "❤️",
                      destination: "/pages/wishlist",
                      linkType: "SHOPIFY_STORE",
                    })
                  }
                >
                  + Wishlist
                </Button>
                <Button
                  size="slim"
                  onClick={() =>
                    handleAddPreset({
                      label: "Chat with us",
                      icon: "💬",
                      destination: "https://wa.me/918233905718",
                      linkType: "SUPPORT_ACTION",
                      badgeText: "Online",
                      badgeTone: "success",
                      openInNewTab: true,
                    })
                  }
                >
                  + WhatsApp Concierge
                </Button>
              </div>
            </div>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: MANAGE CUSTOM FIELDS */}
      {/* ============================================================== */}
      <Modal
        open={isCustomFieldsModalOpen}
        onClose={() => setIsCustomFieldsModalOpen(false)}
        title="Manage Custom Profile Fields"
        primaryAction={{
          content: "Done",
          onAction: () => setIsCustomFieldsModalOpen(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" tone="subdued">
              Create custom profile attributes for your customer account page (e.g. Birthday, GSTIN, Anniversary).
            </Text>
            <Divider />

            {/* List of current custom fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(settings.customFields || []).map((field: any) => (
                <div
                  key={field.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{field.label}</span>
                    <Badge>{field.type}</Badge>
                    {field.required && <Badge tone="warning">Required</Badge>}
                  </div>
                  <Button
                    size="slim"
                    tone="critical"
                    variant="plain"
                    onClick={() => handleDeleteCustomField(field.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Custom Field Form */}
            <div style={{ background: "#FAF7F2", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px", marginTop: "12px" }}>
              <Text as="h4" variant="headingSm">
                + Add Custom Field
              </Text>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label=""
                    placeholder="Field Label (e.g. Birthday, Company Name)"
                    value={newCustomFieldLabel}
                    onChange={setNewCustomFieldLabel}
                    autoComplete="off"
                  />
                </div>
                <div style={{ width: "120px" }}>
                  <Select
                    label=""
                    options={[
                      { label: "Text", value: "text" },
                      { label: "Date", value: "date" },
                      { label: "Number", value: "number" },
                      { label: "Select", value: "select" },
                    ]}
                    value={newCustomFieldType}
                    onChange={(v) => setNewCustomFieldType(v as any)}
                  />
                </div>
                <Checkbox
                  label="Required"
                  checked={newCustomFieldRequired}
                  onChange={setNewCustomFieldRequired}
                />
                <Button onClick={handleAddCustomField}>Add Field</Button>
              </div>
            </div>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT SINGLE MENU ITEM */}
      {/* ============================================================== */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIndex !== null ? "Edit Menu Item" : "Add Menu Item"}
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
    </Page>
  );
}
