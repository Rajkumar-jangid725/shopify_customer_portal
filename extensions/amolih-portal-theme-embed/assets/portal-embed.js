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

    // Ensure Google Fonts for Bellefair, Cormorant Garamond, Inter, Open Sans are loaded
    var fontLinkId = "amolih-store-fonts";
    if (!document.getElementById(fontLinkId)) {
      var link = document.createElement("link");
      link.id = fontLinkId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Bellefair&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap";
      document.head.appendChild(link);
    }

    var isInherit = !portalConfig.fontFamily || portalConfig.fontFamily === "inherit" || portalConfig.fontFamily === "amolih" || portalConfig.fontFamily.indexOf("inherit") !== -1 || portalConfig.fontFamily.indexOf("amolih") !== -1;
    if (isInherit) {
      s.setProperty("--amolih-font-family", "var(--font-body-family, 'Inter', 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)");
      s.setProperty("--amolih-heading-font", "var(--font-heading-family, 'Bellefair', 'Cormorant Garamond', Garamond, Georgia, serif)");
    } else {
      s.setProperty("--amolih-font-family", portalConfig.fontFamily);
      s.setProperty("--amolih-heading-font", portalConfig.fontFamily);
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

    var userInitials = (customerData.firstName ? customerData.firstName.charAt(0) : "A") + (customerData.lastName ? customerData.lastName.charAt(0) : "M");
    userInitials = userInitials.toUpperCase();

    var heroHtml = '<div class="amolih-hero-banner">' +
      '<div>' +
      '<h1 class="amolih-hero-title">' + (customerData.firstName ? esc(portalConfig.welcomeMessage || "Welcome back") + ", " + esc(customerData.firstName) : esc(portalConfig.portalTitle || "Amolih Customer Portal")) + '</h1>' +
      '</div>' +
      '<div class="amolih-avatar-circle" title="' + esc(customerData.name || "") + '">' + userInitials + '</div>' +
      '</div>';

    wrap.innerHTML = heroHtml +
      '<div class="amolih-portal-layout">' +
      '<div class="amolih-sidebar" id="amolih-sidebar">' +
      '<div class="amolih-sidebar-header">' +
      '<div class="amolih-avatar-circle" style="width:38px;height:38px;font-size:1rem;">' + userInitials + '</div>' +
      '<div>' +
      '<div class="amolih-user-name">' + (customerData.firstName ? esc(customerData.firstName) + " " + esc(customerData.lastName || "") : esc(portalConfig.welcomeMessage || "Welcome back")) + '</div>' +
      '<div class="amolih-user-email">' + esc(customerData.email || "") + '</div>' +
      '</div></div>' +
      '<ul class="amolih-nav-menu">' +
      items.map(function (item) {
        var act = activeTab === item.destination ? " amolih-active" : "";
        var badge = item.badgeText ? '<span class="amolih-nav-badge ' + esc(item.badgeTone || "info") + '">' + esc(item.badgeText) + '</span>' : '';
        return '<li><div class="amolih-nav-item' + act + '" data-dest="' + esc(item.destination) + '" data-type="' + esc(item.linkType) + '" data-newtab="' + (item.openInNewTab ? "true" : "false") + '">' +
          '<div class="amolih-nav-left"><span class="amolih-nav-icon">' + (item.icon || "🔗") + '</span><span class="amolih-nav-label">' + esc(item.label) + '</span></div>' + badge + '</div></li>';
      }).join("") +
      '</ul>' +

      '<div class="amolih-sidebar-footer"><a href="/account/logout" class="amolih-logout-link"><span>🚪</span><span>Sign out</span></a></div></div>' +
      '<div class="amolih-main-content" id="amolih-main-pane">' + renderTab() +
      '<div class="amolih-mobile-footer-actions">' +
      '<div style="text-align:center; padding:6px 0;"><a href="/account/logout" class="amolih-logout-link" style="justify-content:center;"><span>🚪</span><span>Sign out of account</span></a></div>' +
      '</div>' +
      '</div></div>';

    bindEvents();
  }

  function renderTab() {
    if (activeTab === "details") {
      var defaultCity = (customerData.defaultAddress && customerData.defaultAddress.city) ? customerData.defaultAddress.city : "No address saved";
      var defaultCountry = (customerData.defaultAddress && customerData.defaultAddress.country) ? customerData.defaultAddress.country : "Default address";

      return '<div><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:6px;">' +
        '<div style="display:flex;align-items:center;"><h2 class="amolih-pane-title" style="margin:0;line-height:1.2;position:relative;top:3px;">Profile Details</h2></div>' +
        '<a href="/account/addresses" class="amolih-order-action" style="margin:0;font-size:12px;padding:6px 14px;display:inline-flex;align-items:center;line-height:1;">Manage Locations</a></div><hr class="amolih-divider" />' +
        '<div class="amolih-metrics-grid">' +
        '<div class="amolih-metric-card"><div class="amolih-metric-label">Lifetime Investment</div><div class="amolih-metric-val">' + formatOrderPrice(customerData.totalSpent, customerData.currency, customerData.currencySymbol) + '</div><div class="amolih-metric-sub">Total spent</div></div>' +
        '<div class="amolih-metric-card"><div class="amolih-metric-label">Orders Placed</div><div class="amolih-metric-val">' + customerData.ordersCount + '</div><div class="amolih-metric-sub">Total orders</div></div>' +
        '<div class="amolih-metric-card"><div class="amolih-metric-label">Primary Destination</div><div class="amolih-metric-val" style="font-size:20px;font-family:var(--amolih-font-modern);">' + esc(defaultCity) + '</div><div class="amolih-metric-sub">' + esc(defaultCountry) + '</div></div>' +
        '</div>' +
        '<div class="amolih-profile-grid">' +
        '<div class="amolih-field-group"><label class="amolih-label">First Name</label><div class="amolih-value-box">' + esc(customerData.firstName || "-") + '</div></div>' +
        '<div class="amolih-field-group"><label class="amolih-label">Last Name</label><div class="amolih-value-box">' + esc(customerData.lastName || "-") + '</div></div>' +
        '<div class="amolih-field-group full-width"><label class="amolih-label">Email Address</label><div class="amolih-value-box">' + esc(customerData.email || "-") + '</div></div>' +
        '<div class="amolih-field-group full-width"><label class="amolih-label">Contact Phone</label><div class="amolih-value-box">' + esc(customerData.phone || "-") + '</div></div>' +
        '</div></div>';
    }
    if (activeTab === "orders") {
      var orders = customerData.orders || [];
      if (!orders.length) {
        return '<div><h2 class="amolih-pane-title">Orders History</h2><p class="amolih-pane-subtitle">You have not placed any fine jewelry orders yet.</p><hr class="amolih-divider" />' +
          '<div style="text-align:center;padding:48px 20px;background:#FAF7F2;border:1px dashed var(--amolih-gold-border);border-radius:var(--amolih-radius);">' +
          '<div style="font-size:42px;margin-bottom:12px;">💎</div>' +
          '<h3 style="font-family:var(--amolih-heading-font);font-size:24px;margin:0 0 8px;font-weight:400;">Your Jewelry Box is Waiting</h3>' +
          '<p style="color:var(--amolih-muted);max-width:400px;margin:0 auto 18px;font-family:var(--amolih-font-modern);">Discover our latest Jaipur handcrafted solitaires, bespoke charms, and customizable fine jewelry.</p>' +
          '<a href="/collections/all" class="amolih-order-action">Explore Atelier Collection</a></div></div>';
      }
      return '<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><div><h2 class="amolih-pane-title">Orders History</h2><p class="amolih-pane-subtitle">' + orders.length + ' fine jewelry order' + (orders.length > 1 ? "s" : "") + ' recorded in your archive.</p></div>' +
        '<a href="/collections/all" class="amolih-order-action" style="margin-top:0;font-size:12px;padding:6px 14px;">Explore New Arrivals ↗</a></div><hr class="amolih-divider" />' +
        orders.map(function (o) {
          var fPill = o.fulfillmentStatus === "Fulfilled" ? "fulfilled" : "unfulfilled";
          var orderPrice = formatOrderPrice(o.totalPrice, o.currency, o.currencySymbol);
          var itemsHtml = (o.lineItems || []).map(function (it) {
            var itPrice = formatOrderPrice(it.price, o.currency, o.currencySymbol);
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">' +
              '<div><span style="font-family:var(--amolih-font-editorial);font-size:16px;font-weight:500;">' + esc(it.title) + '</span>' +
              '<span style="font-size:12px;color:var(--amolih-muted);margin-left:6px;">&times; ' + it.quantity + '</span></div>' +
              '<span style="font-weight:600;font-size:14px;">' + itPrice + '</span></div>';
          }).join("");
          var trackBtn = o.statusUrl ? '<a href="' + o.statusUrl + '" target="_blank" rel="noopener" class="amolih-order-action" style="margin-top:0;font-size:12px;padding:6px 12px;">Track Shipment & Invoice ↗</a>' : '';
          var inquiryBtn = '<a href="https://wa.me/918233905718?text=Hi+Amolih%2C+I+have+a+question+regarding+my+Order+' + encodeURIComponent(o.name || "#" + o.orderNumber) + '." target="_blank" rel="noopener" class="amolih-order-action" style="margin-top:0;background:#FFFFFF;color:var(--amolih-text)!important;border:1px solid var(--amolih-border);font-size:12px;padding:6px 12px;">💬 Inquire on WhatsApp</a>';
          return '<div class="amolih-order-card">' +
            '<div class="amolih-order-header"><div><span class="amolih-order-name">' + esc(o.name || "#" + o.orderNumber) + '</span>' +
            '<div style="font-size:12px;color:var(--amolih-muted);margin-top:2px;">Placed on ' + esc(o.createdAt || "") + '</div></div>' +
            '<span class="amolih-order-price">' + orderPrice + '</span></div>' +
            '<div class="amolih-order-meta"><span class="amolih-status-pill ' + fPill + '">● ' + esc(o.fulfillmentStatus || "In Atelier") + '</span><span>Payment: ' + esc(o.financialStatus || "Paid") + '</span></div>' +
            (itemsHtml ? '<div class="amolih-order-items">' + itemsHtml + '</div>' : '') +
            '<div style="display:flex;gap:8px;margin-top:14px;padding-top:10px;border-top:1px solid var(--amolih-border-light);flex-wrap:wrap;">' + trackBtn + inquiryBtn + '</div>' +
            '</div>';
        }).join("") + '</div>';
    }
    var isCircle = activeTab === "circle" || activeTab === "amolih-circle-progress-bar" || activeTab === (portalConfig.circlePageUrl || "amolih-circle-progress-bar") || activeTab.indexOf("progress-bar") !== -1 || activeTab.indexOf("circle") !== -1;
    if (isCircle) {
      var rawTarget = portalConfig.circlePageUrl || "amolih-circle-progress-bar";
      var cleanHandle = rawTarget.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/?pages\//i, "").replace(/^\/+|\/+$/g, "").split("?")[0].split("#")[0] || "amolih-circle-progress-bar";
      var circleHref = "/pages/" + cleanHandle;
      setTimeout(function () {
        var container = document.getElementById("amolih-embed-circle-content");
        var loader = document.getElementById("amolih-embed-circle-loading");
        var frame = document.getElementById("amolih-embed-circle-frame");
        if (!container) return;
        fetch(circleHref).then(function (r) { return r.text(); }).then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, "text/html");
          var main = doc.querySelector("#MainContent .rte") || doc.querySelector("main .rte") || doc.querySelector("#MainContent") || doc.querySelector("main");
          if (main) {
            var unwanted = main.querySelectorAll("header, footer, nav, .announcement-bar, #shopify-section-header, #shopify-section-footer, .header-wrapper, .footer");
            unwanted.forEach(function (u) { u.remove(); });
            if (main.textContent.trim().length > 10 || main.querySelector("img, svg, video, form, table, [class*='loyalty'], [class*='progress'], [class*='tier']")) {
              container.innerHTML = main.innerHTML;
              if (loader) loader.style.display = "none";
              container.style.display = "block";
              return;
            }
          }
          if (loader) loader.style.display = "none";
          if (frame) frame.style.display = "block";
        }).catch(function () {
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
        renderPortalUI();
      });
    });

    // Horizontal swipe gesture containment (prevents dragging whole screen)
    var navMenu = document.querySelector(".amolih-nav-menu");
    if (navMenu) {
      var startX = 0;
      var startY = 0;
      navMenu.addEventListener("touchstart", function (e) {
        if (e.touches && e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }
      }, { passive: true });

      navMenu.addEventListener("touchmove", function (e) {
        if (e.touches && e.touches.length === 1) {
          var dx = Math.abs(e.touches[0].clientX - startX);
          var dy = Math.abs(e.touches[0].clientY - startY);
          if (dx > dy && dx > 3) {
            e.stopPropagation();
          }
        }
      }, { passive: false });

      // Mouse drag-to-scroll support
      var isDown = false;
      var mouseStartX = 0;
      var scrollInitial = 0;
      navMenu.addEventListener("mousedown", function (e) {
        isDown = true;
        mouseStartX = e.pageX - navMenu.offsetLeft;
        scrollInitial = navMenu.scrollLeft;
      });
      window.addEventListener("mouseup", function () { isDown = false; });
      navMenu.addEventListener("mousemove", function (e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - navMenu.offsetLeft;
        var walk = (x - mouseStartX) * 1.5;
        navMenu.scrollLeft = scrollInitial - walk;
      });
    }

    // Auto-scroll active horizontal nav item to center view
    var activeItem = document.querySelector(".amolih-nav-item.amolih-active");
    if (activeItem) {
      setTimeout(function () {
        activeItem.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      }, 100);
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
