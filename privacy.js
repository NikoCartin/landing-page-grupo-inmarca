(() => {
  "use strict";

  const config = window.inmarcaAnalyticsConfig || {};
  const measurementId = /^G-[A-Z0-9]+$/.test(config.measurementId || "") ? config.measurementId : "";
  const production = (config.productionDomains || []).includes(location.hostname.toLowerCase());
  const storageKey = "inmarca_privacy_preferences";
  const version = `1:${measurementId || "not-connected"}`;
  const retention = 180 * 24 * 60 * 60 * 1000;
  const banner = document.querySelector("#consent-banner");
  const dialog = document.querySelector("#consent-dialog");
  const form = document.querySelector("#consent-form");
  const analyticsInput = document.querySelector("#consent-analytics");
  const externalInput = document.querySelector("#consent-external");
  const map = document.querySelector(".contact-map iframe[data-consent-src]");
  const mapPlaceholder = document.querySelector("[data-map-placeholder]");
  if (!banner || !dialog || !form || !analyticsInput || !externalInput) return;

  let analyticsStarted = false;
  let previousFocus = null;
  let preferences = { analytics: false, external: false };
  let hasChoice = false;

  const validRecord = (value) => value && value.version === version &&
    Number.isFinite(value.savedAt) && Number.isFinite(value.expiresAt) &&
    value.savedAt <= Date.now() && value.expiresAt > Date.now() &&
    value.expiresAt - value.savedAt <= retention &&
    typeof value.analytics === "boolean" && typeof value.external === "boolean";

  const readChoice = () => {
    try {
      const record = JSON.parse(localStorage.getItem(storageKey));
      return validRecord(record) ? record : null;
    } catch {
      // Private browsing or blocked storage must not grant optional consent.
      return null;
    }
  };

  const stored = readChoice();
  if (stored) {
    preferences = { analytics: Boolean(measurementId) && stored.analytics, external: stored.external };
    hasChoice = true;
  }

  const canonicalPage = "https://www.grupoinmarca.com/";
  const safeReferrer = () => {
    try {
      const url = new URL(document.referrer);
      if (url.origin === location.origin) return "";
      return `${url.origin}/`;
    } catch {
      return "";
    }
  };

  const clearAnalyticsCookies = () => {
    const names = document.cookie.split(";").map((part) => part.trim().split("=")[0]);
    const host = location.hostname;
    const domains = ["", host, `.${host}`, "grupoinmarca.com", ".grupoinmarca.com"];
    names.filter((name) => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)).forEach((name) => {
      domains.forEach((domain) => {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}${location.protocol === "https:" ? "; Secure" : ""}`;
      });
    });
  };

  const sendEvent = (name, parameters = {}) => {
    if (!preferences.analytics || !production || !analyticsStarted || !measurementId) return;
    window.gtag("event", name, {
      ...parameters,
      send_to: measurementId,
      page_location: canonicalPage,
      page_referrer: safeReferrer(),
    });
  };

  const startAnalytics = () => {
    if (!measurementId || !production || !preferences.analytics || analyticsStarted) return;
    window[`ga-disable-${measurementId}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("set", {
      page_location: canonicalPage,
      page_referrer: safeReferrer(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    window.gtag("config", measurementId, {
      send_page_view: false,
      page_location: canonicalPage,
      page_referrer: safeReferrer(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: retention / 1000,
      cookie_update: false,
    });
    analyticsStarted = true;
    sendEvent("page_view", { page_title: document.title });
    const script = document.createElement("script");
    script.id = "inmarca-ga4-tag";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(script);
  };

  const applyConsent = () => {
    if (map) {
      if (preferences.external) {
        if (!map.hasAttribute("src")) map.src = map.dataset.consentSrc;
        map.hidden = false;
        if (mapPlaceholder) mapPlaceholder.hidden = true;
      } else {
        map.removeAttribute("src");
        map.hidden = true;
        if (mapPlaceholder) mapPlaceholder.hidden = false;
      }
    }
    if (preferences.analytics) startAnalytics();
    else {
      if (measurementId) window[`ga-disable-${measurementId}`] = true;
      clearAnalyticsCookies();
    }
  };

  const updateBannerHeight = () => {
    document.documentElement.style.setProperty("--consent-banner-height", `${banner.hidden ? 0 : banner.getBoundingClientRect().height}px`);
  };
  const showBanner = (visible) => {
    banner.hidden = !visible;
    document.body.classList.toggle("consent-banner-open", visible);
    updateBannerHeight();
  };
  if ("ResizeObserver" in window) new ResizeObserver(updateBannerHeight).observe(banner);
  window.addEventListener("resize", updateBannerHeight);

  analyticsInput.disabled = !measurementId;
  document.querySelectorAll("[data-analytics-status]").forEach((element) => {
    element.textContent = !measurementId ? "La analítica aún no está conectada." :
      (!production ? "La medición solo se activa en el sitio de producción, no en Preview." : "Google Analytics 4, solo con tu permiso.");
  });

  const closeSettings = () => {
    if (dialog.open) dialog.close();
  };
  const openSettings = () => {
    previousFocus = document.activeElement;
    analyticsInput.checked = preferences.analytics;
    externalInput.checked = preferences.external;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("consent-dialog-open");
  };
  dialog.addEventListener("close", () => {
    document.body.classList.remove("consent-dialog-open");
    if (previousFocus?.isConnected && !previousFocus.closest("[hidden]")) previousFocus.focus({ preventScroll: true });
  });

  const saveChoice = (choice) => {
    const mustReload = analyticsStarted && !choice.analytics;
    preferences = { analytics: Boolean(measurementId) && choice.analytics, external: choice.external };
    hasChoice = true;
    const savedAt = Date.now();
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version, savedAt, expiresAt: savedAt + retention, ...preferences }));
    } catch {
      // Keep the choice in memory for this page if browser storage is unavailable.
    }
    if (mustReload) {
      window[`ga-disable-${measurementId}`] = true;
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
    applyConsent();
    closeSettings();
    showBanner(false);
    if (mustReload) {
      document.querySelector("#inmarca-ga4-tag")?.remove();
      location.reload();
    }
  };

  document.querySelectorAll("[data-open-consent]").forEach((button) => button.addEventListener("click", openSettings));
  document.querySelectorAll("[data-close-consent]").forEach((button) => button.addEventListener("click", closeSettings));
  document.querySelectorAll("[data-consent-reject]").forEach((button) => button.addEventListener("click", () => saveChoice({ analytics: false, external: false })));
  document.querySelectorAll("[data-consent-accept]").forEach((button) => button.addEventListener("click", () => saveChoice({ analytics: Boolean(measurementId), external: true })));
  document.querySelectorAll("[data-consent-info]").forEach((link) => link.addEventListener("click", closeSettings));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveChoice({ analytics: analyticsInput.checked, external: externalInput.checked });
  });

  // Track fixed labels only. Never send link URLs, WhatsApp messages or form values.
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    let destination = "";
    if (/^https:\/\/wa\.me\//.test(href)) destination = "whatsapp";
    else if (/^mailto:/.test(href)) destination = "email";
    else if (/^https:\/\/(www\.)?google\.com\/maps/.test(href)) destination = "maps";
    else if (/^https:\/\/nossocr\.com(?:\/|$)/.test(href)) destination = "nosso";
    else if (/^https:\/\/marbellacr\.com(?:\/|$)/.test(href)) destination = "marbella";
    if (destination) {
      const placement = link.closest(".melissa-feature") ? "melissa_campaign" :
        (link.classList.contains("whatsapp-float") ? "floating" :
          (link.closest(".hero-actions") ? "hero" : "page"));
      sendEvent("contact_click", { destination, placement });
    }
  });

  applyConsent();
  showBanner(!hasChoice);
})();
