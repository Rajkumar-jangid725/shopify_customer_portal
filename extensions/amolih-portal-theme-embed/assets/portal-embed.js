(function () {
  "use strict";
  var rootEl = document.getElementById("amolih-customer-portal-root");
  if (!rootEl) return;
  var shop = rootEl.getAttribute("data-shop") || window.location.hostname;
  var shouldOverride = rootEl.getAttribute("data-override") === "true";
  var customAppDomain = rootEl.getAttribute("data-app-domain") || "";
  var path = window.location.pathname;

  // Never run on auth/login/register/recover pages
  if (path.indexOf("/login") !== -1 || path.indexOf("/register") !== -1 || path.indexOf("/recover") !== -1 || path.indexOf("/reset") !== -1) {
    return;
  }

  if (!shouldOverride || (!path.startsWith("/account") && !path.includes("/customers/"))) return;

  var isLoggedIn = rootEl.getAttribute("data-logged-in") === "true";
  if (!isLoggedIn) {
    // If not logged in on /account, redirect to login
    window.location.href = "/account/login?return_to=" + encodeURIComponent(window.location.pathname);
    return;
  }

  var customerData = { name: "Customer", email: "", phone: "", ordersCount: 0, totalSpent: "₹0.00", defaultAddress: null, addresses: [], orders: [] };
  var scriptTag = document.getElementById("amolih-customer-data");
  if (scriptTag) {
    try { customerData = JSON.parse(scriptTag.textContent || "{}"); } catch (e) { }
  }

  function formatOrderPrice(priceStr, currency, symbol) {
    if (!priceStr) return "";
    var sym = symbol;
    if (!sym) {
      if (currency === "INR") sym = "₹";
      else if (currency === "GBP") sym = "£";
      else if (currency === "USD") sym = "$";
      else if (currency === "EUR") sym = "€";
      else if (currency === "CAD") sym = "CA$";
      else if (currency === "AUD") sym = "AU$";
      else sym = (currency ? currency + " " : "$");
    }
    var s = String(priceStr).trim();
    if (s.indexOf("$") === 0 && sym !== "$") {
      s = sym + s.substring(1).trim();
    }
    var match = s.match(/^([^0-9]*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (match) {
      var prefix = match[1] || sym;
      var numPart = match[2].replace(/,/g, "");
      var suffix = match[3] || "";
      var num = parseFloat(numPart);
      if (!isNaN(num)) {
        var locale = "en-US";
        if (currency === "INR") locale = "en-IN";
        else if (currency === "GBP") locale = "en-GB";
        return prefix + num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix;
      }
    }
    return s;
  }

  var portalConfig = {
    portalTitle: "Customer Portal",
    primaryColor: "#355E59",
    sidebarBgColor: "#FBF8F5",
    textColor: "#1A1A1A",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    baseFontSize: "14px",
    customCss: "",
    circleTierTitle: "Amolih Circle's Progress Bar",
    welcomeMessage: "Welcome back",
    supportUrl: "https://wa.me/918233905718",
    menuItems: [
      { label: "My Details", icon: "👤", destination: "details", linkType: "INTERNAL_PAGE", position: 0, isEnabled: true },
      { label: "Orders History", icon: "🛒", destination: "orders", linkType: "INTERNAL_PAGE", position: 1, isEnabled: true },
      { label: "Loyalty Tier", icon: "🏅", destination: "circle", linkType: "INTERNAL_PAGE", position: 2, isEnabled: true },
      { label: "Addresses", icon: "📍", destination: "addresses", linkType: "INTERNAL_PAGE", position: 3, isEnabled: true },
      { label: "Chat with us", icon: "💬", destination: "https://wa.me/918233905718", linkType: "SUPPORT_ACTION", position: 4, isEnabled: true }
    ]
  };

  try {
    var cached = localStorage.getItem("amolih_portal_config_" + shop);
    if (cached) portalConfig = Object.assign({}, portalConfig, JSON.parse(cached));
  } catch (e) { }

  function fetchLatestConfig() {
    if (!customAppDomain) return;
    var endpoint = customAppDomain.replace(/\/$/, "") + "/api/portal-config?shop=" + encodeURIComponent(shop);
    fetch(endpoint).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.config) {
        portalConfig = Object.assign({}, portalConfig, data.config);
        try { localStorage.setItem("amolih_portal_config_" + shop, JSON.stringify(data.config)); } catch (err) { }
        applyStylesAndConfig();
        renderPortalUI();
      }
    }).catch(function () { });
  }

  function applyStylesAndConfig() {
    var s = document.documentElement.style;
    s.setProperty("--amolih-primary", portalConfig.primaryColor || "#355E59");
    s.setProperty("--amolih-sidebar-bg", portalConfig.sidebarBgColor || "#FBF8F5");
    s.setProperty("--amolih-text", portalConfig.textColor || "#1A1A1A");

    var isInherit = !portalConfig.fontFamily || portalConfig.fontFamily === "inherit" || portalConfig.fontFamily.indexOf("inherit") !== -1;
    if (isInherit) {
      s.setProperty("--amolih-font-family", "var(--font-body-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)");
      s.setProperty("--amolih-heading-font", "var(--font-heading-family, var(--font-body-family, inherit))");
    } else {
      s.setProperty("--amolih-font-family", portalConfig.fontFamily);
      s.setProperty("--amolih-heading-font", portalConfig.fontFamily);
      if (!portalConfig.fontFamily.includes("-apple-system")) {
        var fontName = portalConfig.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        var id = "amolih-font-" + fontName.toLowerCase().replace(/\s+/g, "-");
        if (!document.getElementById(id)) {
          var link = document.createElement("link");
          link.id = id;
          link.rel = "stylesheet";
          link.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(fontName) + ":wght@400;500;600;700&display=swap";
          document.head.appendChild(link);
        }
      }
    }
    s.setProperty("--amolih-font-size", portalConfig.baseFontSize || "14px");

    var customCssEl = document.getElementById("amolih-portal-custom-css");
    if (!customCssEl) {
      customCssEl = document.createElement("style");
      customCssEl.id = "amolih-portal-custom-css";
      document.head.appendChild(customCssEl);
    }
    customCssEl.textContent = portalConfig.customCss || "";
  }

  var activeTab = "details";
  var hash = window.location.hash.replace("#", "");
  if (hash && ["details", "orders", "circle", "addresses"].indexOf(hash) !== -1) activeTab = hash;

  function renderPortalUI() {
    [".customer", ".shopify-section-main-account", ".shopify-section-main-addresses", ".shopify-section-main-order", ".account-page", "main > .customer", "#MainContent > .customer"].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.style.display = "none"; });
    });

    var wrap = document.getElementById("amolih-portal-wrapper");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "amolih-portal-wrapper";
      var parent = document.querySelector("main") || document.getElementById("MainContent") || document.body;
      parent.insertBefore(wrap, parent.firstChild);
    }

    var items = (portalConfig.menuItems || []).filter(function (i) { return i.isEnabled; });
    var cur = items.filter(function (i) { return i.destination === activeTab; })[0] || items[0] || { label: "My Account", icon: "👤" };

    wrap.innerHTML = '<button class="amolih-mobile-toggle" id="amolih-mobile-menu-btn" type="button">' +
      '<span style="display:flex;align-items:center;gap:10px;"><span>' + (cur.icon || "👤") + '</span><span>' + esc(cur.label) + '</span></span>' +
      '<span style="font-size:12px;color:var(--amolih-muted);">Menu ▾</span></button>' +
      '<div class="amolih-portal-layout">' +
      '<div class="amolih-sidebar" id="amolih-sidebar">' +
      '<div class="amolih-sidebar-header"><div class="amolih-user-name">' + (customerData.firstName ? esc(customerData.firstName) + " " + esc(customerData.lastName || "") : esc(portalConfig.welcomeMessage || "Welcome back")) + '</div>' +
      '<div class="amolih-user-email">' + esc(customerData.email || "") + '</div></div>' +
      '<ul class="amolih-nav-menu">' +
      items.map(function (item) {
        var act = activeTab === item.destination ? " amolih-active" : "";
        var badge = item.badgeText ? '<span class="amolih-nav-badge ' + esc(item.badgeTone || "info") + '">' + esc(item.badgeText) + '</span>' : '';
        return '<li><div class="amolih-nav-item' + act + '" data-dest="' + esc(item.destination) + '" data-type="' + esc(item.linkType) + '" data-newtab="' + (item.openInNewTab ? "true" : "false") + '">' +
          '<div class="amolih-nav-left"><span class="amolih-nav-icon">' + (item.icon || "🔗") + '</span><span class="amolih-nav-label">' + esc(item.label) + '</span></div>' + badge + '</div></li>';
      }).join("") +
      '</ul><div class="amolih-sidebar-footer"><a href="/account/logout" class="amolih-logout-link"><span>🚪</span><span>Log out</span></a></div></div>' +
      '<div class="amolih-main-content" id="amolih-main-pane">' + renderTab() + '</div></div>';

    bindEvents();
  }

  function renderTab() {
    if (activeTab === "details") {
      return '<div><h2 class="amolih-pane-title">Profile Details</h2><p class="amolih-pane-subtitle">Manage your personal account information and primary contact details.</p><hr class="amolih-divider" />' +
        '<div class="amolih-profile-grid">' +
        '<div class="amolih-field-group"><label class="amolih-label">First Name</label><div class="amolih-value-box">' + esc(customerData.firstName || "-") + '</div></div>' +
        '<div class="amolih-field-group"><label class="amolih-label">Last Name</label><div class="amolih-value-box">' + esc(customerData.lastName || "-") + '</div></div>' +
        '<div class="amolih-field-group full-width"><label class="amolih-label">Email Address</label><div class="amolih-value-box">' + esc(customerData.email || "-") + '</div></div>' +
        '<div class="amolih-field-group full-width"><label class="amolih-label">Contact Phone</label><div class="amolih-value-box">' + esc(customerData.phone || "-") + '</div></div>' +
        '<div class="amolih-field-group"><label class="amolih-label">Total Orders</label><div class="amolih-value-box">' + customerData.ordersCount + ' orders</div></div>' +
        '<div class="amolih-field-group"><label class="amolih-label">Total Spent</label><div class="amolih-value-box" style="font-weight:700;color:var(--amolih-primary);">' + formatOrderPrice(customerData.totalSpent, customerData.currency, customerData.currencySymbol) + '</div></div>' +
        '</div></div>';
    }
    if (activeTab === "orders") {
      var orders = customerData.orders || [];
      if (!orders.length) {
        return '<div><h2 class="amolih-pane-title">Orders History</h2><p class="amolih-pane-subtitle">You have not placed any orders yet.</p><hr class="amolih-divider" /><div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:12px;">🛒</div><p style="color:var(--amolih-muted);">When you make a purchase, your tracking details and receipts will appear here.</p><a href="/collections/all" class="amolih-order-action">Start Shopping</a></div></div>';
      }
      return '<div><h2 class="amolih-pane-title">Orders History</h2><p class="amolih-pane-subtitle">' + orders.length + ' order' + (orders.length > 1 ? "s" : "") + ' recorded.</p><hr class="amolih-divider" />' +
        orders.map(function (o) {
          var fPill = o.fulfillmentStatus === "Fulfilled" ? "fulfilled" : "unfulfilled";
          var orderPrice = formatOrderPrice(o.totalPrice, o.currency, o.currencySymbol);
          var itemsHtml = (o.lineItems || []).map(function (it) {
            var itPrice = formatOrderPrice(it.price, o.currency, o.currencySymbol);
            return '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + esc(it.title) + ' &times; ' + it.quantity + '</span><span style="font-weight:600;">' + itPrice + '</span></div>';
          }).join("");
          var trackBtn = o.statusUrl ? '<div style="margin-top:14px;"><a href="' + o.statusUrl + '" target="_blank" class="amolih-order-action">View Tracking ↗</a></div>' : '';
          return '<div class="amolih-order-card"><div class="amolih-order-header"><div><span class="amolih-order-name">' + esc(o.name || "#" + o.orderNumber) + '</span><div style="font-size:12px;color:var(--amolih-muted);">' + esc(o.createdAt || "") + '</div></div><span class="amolih-order-price">' + orderPrice + '</span></div>' +
            '<div class="amolih-order-meta"><span class="amolih-status-pill ' + fPill + '">' + esc(o.fulfillmentStatus || "Unfulfilled") + '</span><span>Payment: ' + esc(o.financialStatus || "Paid") + '</span></div>' +
            (itemsHtml ? '<div class="amolih-order-items">' + itemsHtml + '</div>' : '') + trackBtn + '</div>';
        }).join("") + '</div>';
    }
    var isCircle = activeTab === "circle" || activeTab === "amolih-circle-progress-bar" || activeTab === (portalConfig.circlePageUrl || "amolih-circle-progress-bar") || activeTab.indexOf("progress-bar") !== -1 || activeTab.indexOf("circle") !== -1;
    if (isCircle) {
      var rawTarget = portalConfig.circlePageUrl || "amolih-circle-progress-bar";
      var cleanHandle = rawTarget.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/?pages\//i, "").replace(/^\/+|\/+$/g, "").split("?")[0].split("#")[0] || "amolih-circle-progress-bar";
      var circleHref = "/pages/" + cleanHandle;
      setTimeout(function() {
        var container = document.getElementById("amolih-embed-circle-content");
        var loader = document.getElementById("amolih-embed-circle-loading");
        var frame = document.getElementById("amolih-embed-circle-frame");
        if (!container) return;
        fetch(circleHref).then(function(r) { return r.text(); }).then(function(html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, "text/html");
          var main = doc.querySelector("#MainContent .rte") || doc.querySelector("main .rte") || doc.querySelector("#MainContent") || doc.querySelector("main");
          if (main) {
            var unwanted = main.querySelectorAll("header, footer, nav, .announcement-bar, #shopify-section-header, #shopify-section-footer, .header-wrapper, .footer");
            unwanted.forEach(function(u) { u.remove(); });
            if (main.textContent.trim().length > 10 || main.querySelector("img, svg, video, form, table, [class*='loyalty'], [class*='progress'], [class*='tier']")) {
              container.innerHTML = main.innerHTML;
              if (loader) loader.style.display = "none";
              container.style.display = "block";
              return;
            }
          }
          if (loader) loader.style.display = "none";
          if (frame) frame.style.display = "block";
        }).catch(function() {
          if (loader) loader.style.display = "none";
          if (frame) frame.style.display = "block";
        });
      }, 50);

      return '<div><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;"><div><h2 class="amolih-pane-title">' + esc(portalConfig.circleTierTitle || "Amolih Circle's Progress Bar") + '</h2><p class="amolih-pane-subtitle">/pages/' + esc(cleanHandle) + '</p></div>' +
        '<a href="' + esc(circleHref) + '" target="_blank" rel="noopener" class="amolih-order-action">Open Full Page ↗</a></div><hr class="amolih-divider" />' +
        '<div id="amolih-embed-circle-wrapper" style="min-height:250px;">' +
        '<div id="amolih-embed-circle-loading" style="text-align:center;padding:40px 20px;color:var(--amolih-muted);"><div style="font-size:28px;margin-bottom:8px;">⏳</div>Loading /pages/' + esc(cleanHandle) + '...</div>' +
        '<div id="amolih-embed-circle-content" class="rte" style="display:none;line-height:1.6;"></div>' +
        '<iframe id="amolih-embed-circle-frame" src="' + esc(circleHref) + '" style="display:none;width:100%;min-height:600px;border:1px solid #E2E8F0;border-radius:8px;" loading="lazy"></iframe>' +
        '</div></div>';
    }
    if (activeTab === "addresses") {
      var addrs = customerData.addresses || [];
      return '<div><div style="display:flex;justify-content:space-between;align-items:center;"><div><h2 class="amolih-pane-title">Saved Addresses</h2><p class="amolih-pane-subtitle">' + addrs.length + ' address' + (addrs.length > 1 ? "es" : "") + ' on file.</p></div><a href="/account/addresses" class="amolih-order-action">+ Manage Addresses</a></div><hr class="amolih-divider" />' +
        (!addrs.length ? '<div style="text-align:center;padding:40px 20px;"><div style="font-size:40px;margin-bottom:12px;">📍</div><p style="color:var(--amolih-muted);">No shipping addresses saved yet.</p></div>' : addrs.map(function (a) {
          return '<div class="amolih-address-card"><div class="amolih-address-header"><strong>' + (a.isDefault ? "Default Address" : "Address") + '</strong>' + (a.isDefault ? '<span class="amolih-nav-badge success">Default</span>' : '') + '</div>' +
            '<div style="font-size:14px;line-height:1.6;">' + (a.address1 ? esc(a.address1) + '<br/>' : '') + (a.address2 ? esc(a.address2) + '<br/>' : '') + esc(a.city || "") + ', ' + esc(a.province || "") + ' ' + esc(a.zip || "") + '<br/>' + esc(a.country || "") + '</div></div>';
        }).join("")) + '</div>';
    }
    return '<div><h2 class="amolih-pane-title">' + esc(activeTab) + '</h2><hr class="amolih-divider" /><div style="text-align:center;padding:40px 20px;"><div style="font-size:36px;margin-bottom:12px;">🔗</div><p style="color:var(--amolih-muted);">Navigating to destination...</p></div></div>';
  }

  function bindEvents() {
    document.querySelectorAll(".amolih-nav-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var dest = this.getAttribute("data-dest");
        var type = this.getAttribute("data-type");
        var newTab = this.getAttribute("data-newtab") === "true";
        if (type === "EXTERNAL_URL" || type === "SUPPORT_ACTION") { window.open(dest, newTab ? "_blank" : "_self"); return; }
        if (type === "SHOPIFY_STORE") { window.location.href = dest; return; }
        activeTab = dest;
        window.location.hash = dest;
        var sb = document.getElementById("amolih-sidebar");
        if (sb) sb.classList.remove("mobile-open");
        renderPortalUI();
      });
    });
    var btn = document.getElementById("amolih-mobile-menu-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        var sb = document.getElementById("amolih-sidebar");
        if (sb) sb.classList.toggle("mobile-open");
      });
    }
  }

  function esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  applyStylesAndConfig();
  renderPortalUI();
  fetchLatestConfig();
})();
