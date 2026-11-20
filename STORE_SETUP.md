# Enable Amolih Customer Panel on a New Store

This app serves the customer dashboard through **Shopify App Proxy** (not Customer Account UI Extensions).

- Storefront URL: `https://{your-shop}.myshopify.com/apps/customerdashboard`
- Theme header and footer stay; the app fills the middle content
- Portal menus and branding are configured in the embedded admin app

---

## Prerequisites

- Node.js `>= 20.19` (see `package.json` engines)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started)
- Access to the Partner app **Amolih-customer-portal** (or your linked app)
- A Shopify store (development or production) where you can install the app

Optional (Windows, if Cloudflare tunnel fails):

```powershell
$env:SHOPIFY_CLI_CLOUDFLARED_PATH="C:\Users\idarv\AppData\Local\shopify-cloudflared\cloudflared.exe"
```

---

## 1. Install dependencies

From the repo root:

```bash
npm install
npm run setup
```

`setup` runs Prisma generate + migrate for the local SQLite database used by portal config.

---

## 2. Link / create a store config (optional but recommended)

For a named store config (example already used for `dev-amolih`):

```bash
shopify app config link
# or copy shopify.app.toml → shopify.app.{store-name}.toml and edit
```

Ensure the TOML includes App Proxy and scopes:

```toml
[access_scopes]
scopes = "read_customers,write_customers,read_orders,write_app_proxy"

[app_proxy]
url = "/customerdashboard"
prefix = "apps"
subpath = "customerdashboard"
```

- `url` = path on **your Remix app**
- Storefront path = `/{prefix}/{subpath}` → `/apps/customerdashboard`

---

## 3. Start the app on the store

### Development

```bash
shopify app dev --config {your-config} --store {your-shop}.myshopify.com
```

Example:

```bash
shopify app dev --config dev-amolih --store dev-amolih.myshopify.com
```

CLI will:

1. Open install / update URLs
2. Request scopes (including `write_app_proxy`)
3. Tunnel your local app
4. Point App Proxy at the tunnel

Approve the install in the browser when prompted.

### Production

1. Host the Remix app and set real `application_url` / auth redirect URLs in TOML
2. Deploy:

```bash
shopify app deploy --config {your-config}
```

3. Install the app on the store from Partner Dashboard or the install link

---

## 4. Confirm App Proxy on the store

Prefix/subpath from TOML apply fully on **new installs**. On a store that already had the app installed before App Proxy was added:

1. Shopify Admin → **Settings → Apps and sales channels**
2. Open **Amolih-customer-portal** (or your app name)
3. Under **App proxy**, click **Customize URL**
4. Set:
   - Prefix: `apps`
   - Subpath: `customerdashboard`

---

## 5. Open the customer panel

1. Sign in as a **customer** on the storefront (theme Account / login)
2. Visit:

```text
https://{your-shop}.myshopify.com/apps/customerdashboard
```

You should see the store theme chrome with the Amolih dashboard in the middle.

Optional: add that URL to a theme menu, footer, or account link so customers can find it.

---

## 6. Configure menus and branding

1. Open the embedded app in Admin (CLI Preview URL, or **Apps → Amolih-customer-portal**)
2. Use **Navigation & Menu Builder** and theme/color settings
3. Click **Save & Publish Changes**

Config is stored in the app database for that shop and applied on the App Proxy page.

---

## Checklist for a brand-new store

| Step | Done |
|------|------|
| `npm install` + `npm run setup` | |
| TOML has `write_app_proxy` + `[app_proxy]` | |
| `shopify app dev` (or deploy + install) on the store | |
| Scopes approved | |
| App Proxy path = `apps/customerdashboard` | |
| Customer logged in on storefront | |
| `/apps/customerdashboard` loads | |
| Menus/branding saved in admin app | |

---

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| 404 on `/apps/customerdashboard` | Customize App Proxy URL, or uninstall/reinstall so prefix/subpath apply |
| Yellow “Please sign in” banner | Log in via the **storefront** account (theme), then reopen the dashboard URL |
| Orders/addresses empty | That customer may have no orders/addresses; badges use live Liquid counts |
| Tunnel / cloudflared errors | Set `SHOPIFY_CLI_CLOUDFLARED_PATH` or update Shopify CLI |
| Prisma `EPERM` on Windows | Stop other Node/`shopify app dev` processes, then start again |
| Old Customer Account extensions still visible | This project no longer ships UI extensions; run `shopify app deploy` to push a version without them |

---

## Architecture (short)

```text
Customer browser
  → https://{shop}/apps/customerdashboard
  → Shopify App Proxy (signed request)
  → Remix route: app/routes/customerdashboard.tsx
  → Liquid response (theme layout + dashboard HTML)
  → Portal config from Prisma (getPortalConfig)
  → Customer PII/orders/addresses from Liquid `customer`
```

Admin customization lives in `app/routes/app._index.tsx` and `app/services/portal.server.ts`.
