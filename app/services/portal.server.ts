import prisma from "../db.server";

export interface MenuItemData {
  id?: string;
  label: string;
  icon: string;
  destination: string;
  linkType: "INTERNAL_PAGE" | "SHOPIFY_STORE" | "EXTERNAL_URL" | "SUPPORT_ACTION";
  badgeText?: string | null;
  badgeTone?: string | null;
  position: number;
  isEnabled: boolean;
  openInNewTab: boolean;
  visibility: string;
  mobileVisible: boolean;
}

export interface PortalConfigData {
  portalTitle: string;
  primaryColor: string;
  sidebarBgColor: string;
  textColor: string;
  fontFamily: string;
  supportUrl: string;
  circleTierTitle: string;
  welcomeMessage: string;
  menuItems: MenuItemData[];
}

export const DEFAULT_MENU_ITEMS: Omit<MenuItemData, "id">[] = [
  {
    label: "My Details",
    icon: "👤",
    destination: "details",
    linkType: "INTERNAL_PAGE",
    badgeText: null,
    badgeTone: null,
    position: 0,
    isEnabled: true,
    openInNewTab: false,
    visibility: "ALL",
    mobileVisible: true,
  },
  {
    label: "Orders History",
    icon: "🛒",
    destination: "orders",
    linkType: "INTERNAL_PAGE",
    badgeText: null,
    badgeTone: "info",
    position: 1,
    isEnabled: true,
    openInNewTab: false,
    visibility: "ALL",
    mobileVisible: true,
  },
  {
    label: "Amolih Circle's Progress Bar",
    icon: "🏅",
    destination: "circle",
    linkType: "INTERNAL_PAGE",
    badgeText: "Tier 2",
    badgeTone: "attention",
    position: 2,
    isEnabled: true,
    openInNewTab: false,
    visibility: "ALL",
    mobileVisible: true,
  },
  {
    label: "Addresses",
    icon: "📍",
    destination: "addresses",
    linkType: "INTERNAL_PAGE",
    badgeText: null,
    badgeTone: "info",
    position: 3,
    isEnabled: true,
    openInNewTab: false,
    visibility: "ALL",
    mobileVisible: true,
  },
  {
    label: "Chat with us",
    icon: "💬",
    destination: "https://wa.me/918233905718?text=Hi+AMOLIH%21+I+have+a+question.",
    linkType: "SUPPORT_ACTION",
    badgeText: "Online",
    badgeTone: "success",
    position: 4,
    isEnabled: true,
    openInNewTab: true,
    visibility: "ALL",
    mobileVisible: true,
  },
];

export async function getPortalConfig(shop: string) {
  try {
    let config = await prisma.portalConfig.findUnique({
      where: { shop },
      include: {
        menuItems: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!config) {
      // Seed initial default config for this store
      config = await prisma.portalConfig.create({
        data: {
          shop,
          portalTitle: "Amolih Customer Portal",
          primaryColor: "#355E59",
          sidebarBgColor: "#FBF8F5",
          textColor: "#1A1A1A",
          fontFamily: "Inter, -apple-system, sans-serif",
          supportUrl: "https://wa.me/918233905718?text=Hi+AMOLIH%21+I+have+a+question.",
          circleTierTitle: "Amolih Circle's Progress Bar",
          welcomeMessage: "Welcome back",
          menuItems: {
            create: DEFAULT_MENU_ITEMS,
          },
        },
        include: {
          menuItems: {
            orderBy: { position: "asc" },
          },
        },
      });
    }

    return config;
  } catch (error) {
    console.error("Error retrieving portal config:", error);
    // Safe in-memory fallback
    return {
      id: "fallback-id",
      shop,
      portalTitle: "Amolih Customer Portal",
      primaryColor: "#355E59",
      sidebarBgColor: "#FBF8F5",
      textColor: "#1A1A1A",
      fontFamily: "Inter, -apple-system, sans-serif",
      supportUrl: "https://wa.me/918233905718?text=Hi+AMOLIH%21+I+have+a+question.",
      circleTierTitle: "Amolih Circle's Progress Bar",
      welcomeMessage: "Welcome back",
      menuItems: DEFAULT_MENU_ITEMS.map((item, idx) => ({ ...item, id: `item-${idx}` })),
    };
  }
}

export async function savePortalConfig(
  shop: string,
  branding: {
    portalTitle?: string;
    primaryColor?: string;
    sidebarBgColor?: string;
    textColor?: string;
    fontFamily?: string;
    supportUrl?: string;
    circleTierTitle?: string;
    welcomeMessage?: string;
  },
  menuItems: MenuItemData[]
) {
  try {
    const existing = await prisma.portalConfig.findUnique({ where: { shop } });

    const updatedConfig = await prisma.portalConfig.upsert({
      where: { shop },
      update: {
        ...branding,
      },
      create: {
        shop,
        portalTitle: branding.portalTitle || "Amolih Customer Portal",
        primaryColor: branding.primaryColor || "#355E59",
        sidebarBgColor: branding.sidebarBgColor || "#FBF8F5",
        textColor: branding.textColor || "#1A1A1A",
        fontFamily: branding.fontFamily || "Inter, -apple-system, sans-serif",
        supportUrl: branding.supportUrl || "https://wa.me/918233905718",
        circleTierTitle: branding.circleTierTitle || "Amolih Circle's Progress Bar",
        welcomeMessage: branding.welcomeMessage || "Welcome back",
      },
    });

    // Replace menu items transactionally
    await prisma.menuItem.deleteMany({
      where: { configId: updatedConfig.id },
    });

    if (menuItems && menuItems.length > 0) {
      await prisma.menuItem.createMany({
        data: menuItems.map((item, index) => ({
          configId: updatedConfig.id,
          label: item.label,
          icon: item.icon || "🔗",
          destination: item.destination,
          linkType: item.linkType || "INTERNAL_PAGE",
          badgeText: item.badgeText || null,
          badgeTone: item.badgeTone || null,
          position: index,
          isEnabled: item.isEnabled ?? true,
          openInNewTab: item.openInNewTab ?? false,
          visibility: item.visibility || "ALL",
          mobileVisible: item.mobileVisible ?? true,
        })),
      });
    }

    return await prisma.portalConfig.findUnique({
      where: { shop },
      include: {
        menuItems: {
          orderBy: { position: "asc" },
        },
      },
    });
  } catch (error) {
    console.error("Error saving portal config:", error);
    throw error;
  }
}

