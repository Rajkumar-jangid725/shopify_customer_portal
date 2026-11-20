import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  Banner,
  Divider,
  Badge,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function AdditionalPage() {
  return (
    <Page>
      <TitleBar title="Portal Documentation & Setup Guide" />
      <BlockStack gap="500">
        <Banner tone="success">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="p" fontWeight="bold">
                Shopify App Proxy Customer Dashboard
              </Text>
              <Text as="p" tone="subdued">
                Manage menus, links, and theme palettes for the storefront dashboard at /apps/customerdashboard.
              </Text>
            </BlockStack>
            <Badge tone="success">App Proxy</Badge>
          </InlineStack>
        </Banner>

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    1. How to Add Menus and Respective Links
                  </Text>
                  <Divider />
                  <Text as="p" variant="bodyMd">
                    From the <strong>Portal Dashboard &gt; Navigation &amp; Menu Builder</strong> tab, you can add custom menus with tailored destinations:
                  </Text>
                  <List type="bullet">
                    <List.Item>
                      <strong>Internal Account Pages:</strong> Use target slugs like <Code>details</Code> (Profile), <Code>orders</Code> (Order history), <Code>circle</Code> (Loyalty progress bar), or <Code>addresses</Code> (Shipping locations).
                    </List.Item>
                    <List.Item>
                      <strong>Shopify Storefront Links:</strong> Point directly to store catalog routes like <Code>/collections/all</Code>, <Code>/pages/about</Code>, or <Code>/pages/wishlist</Code>.
                    </List.Item>
                    <List.Item>
                      <strong>External Destinations:</strong> Connect third-party portals such as courier shipment tracking or return portals.
                    </List.Item>
                    <List.Item>
                      <strong>Concierge &amp; Support Actions:</strong> Direct WhatsApp support (<Code>https://wa.me/...</Code>) or live chat widgets.
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    2. Opening the dashboard on the storefront
                  </Text>
                  <Divider />
                  <Text as="p" variant="bodyMd">
                    This app uses Shopify App Proxy (not Customer Account UI Extensions). Follow these steps:
                  </Text>
                  <List type="number">
                    <List.Item>
                      Confirm App Proxy is set to <strong>apps / customerdashboard</strong> on the installed app.
                    </List.Item>
                    <List.Item>
                      Run <Code>shopify app dev</Code> (or deploy) so the proxy points at your app.
                    </List.Item>
                    <List.Item>
                      Open <Code>https://{"{shop}"}/apps/customerdashboard</Code> while signed in as a customer.
                    </List.Item>
                    <List.Item>
                      Optionally add that URL to a theme menu or account link.
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Helpful Links &amp; References
                  </Text>
                  <Divider />
                  <List>
                    <List.Item>
                      <Link
                        url="https://shopify.dev/docs/apps/build/online-store/app-proxies"
                        target="_blank"
                        removeUnderline
                      >
                        Shopify App Proxies Guide ↗
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link
                        url="https://shopify.dev/docs/apps/design-guidelines/navigation"
                        target="_blank"
                        removeUnderline
                      >
                        Polaris Design System Guidelines ↗
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="100"
      paddingInlineEnd="100"
      background="bg-surface-active"
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
    >
      <Text as="span" variant="bodySm" fontWeight="semibold">
        {children}
      </Text>
    </Box>
  );
}
