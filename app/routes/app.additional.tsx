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
                Custlo-Inspired Shopify Customer Portal Architecture
              </Text>
              <Text as="p" tone="subdued">
                Manage menus, links, theme palettes, and extensions for Shopify New Customer Accounts.
              </Text>
            </BlockStack>
            <Badge tone="success">Production Ready</Badge>
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
                    From the <strong>Portal Dashboard &gt; Navigation &amp; Menu Builder</strong> tab, you can add unlimited custom menus with tailored destinations:
                  </Text>
                  <List type="bullet">
                    <List.Item>
                      <strong>Internal Account Pages:</strong> Use target slugs like <Code>details</Code> (Profile), <Code>orders</Code> (Order history), <Code>circle</Code> (Loyalty progress bar), or <Code>addresses</Code> (Shipping locations).
                    </List.Item>
                    <List.Item>
                      <strong>Shopify Storefront Links:</strong> Point directly to store catalog routes like <Code>/collections/all</Code>, <Code>/pages/about</Code>, or <Code>/pages/wishlist</Code>.
                    </List.Item>
                    <List.Item>
                      <strong>External Destinations:</strong> Connect third-party portals such as courier shipment tracking (<Code>https://track.aftership.com</Code>) or return portals.
                    </List.Item>
                    <List.Item>
                      <strong>Concierge &amp; Support Actions:</strong> Direct WhatsApp support (<Code>https://wa.me/...</Code>) or live chat widgets with one-click initiation.
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    2. Activating the Full-Page Extension in Shopify Admin
                  </Text>
                  <Divider />
                  <Text as="p" variant="bodyMd">
                    Shopify New Customer Accounts use sandboxed UI Extensions. Follow these steps to verify activation:
                  </Text>
                  <List type="number">
                    <List.Item>
                      In your Shopify Admin, navigate to <strong>Settings &gt; Customer Accounts</strong>.
                    </List.Item>
                    <List.Item>
                      Ensure <strong>New customer accounts</strong> is selected.
                    </List.Item>
                    <List.Item>
                      Click <strong>Customize</strong> in the Checkout and accounts editor.
                    </List.Item>
                    <List.Item>
                      Under the Account page dropdown, locate and enable the <strong>Customer Portal Page</strong> extension.
                    </List.Item>
                    <List.Item>
                      Save and publish the customer accounts editor.
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
                        url="https://shopify.dev/docs/apps/build/customer-accounts"
                        target="_blank"
                        removeUnderline
                      >
                        Shopify Customer Accounts Guide ↗
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link
                        url="https://shopify.dev/docs/api/customer-account-ui-extensions"
                        target="_blank"
                        removeUnderline
                      >
                        Customer Account UI Extensions API ↗
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
      <code>{children}</code>
    </Box>
  );
}
