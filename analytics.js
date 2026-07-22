(function () {
  "use strict";

  const DOMAIN = "alexvonderluft.com";
  const WEBSITE_ID = "13e0d910-b220-4778-8b9b-09d75f1f795f";
  const TRACKER_URL = "https://cloud.umami.is/script.js";
  const SAFE_CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "src"];
  const SOURCE_ALIASES = { ig: "instagram", instagram: "instagram", snap: "snapchat", snapchat: "snapchat", tg: "telegram", telegram: "telegram", x: "twitter", twitter: "twitter", of: "onlyfans", onlyfans: "onlyfans" };
  const isDevelopment = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname.endsWith(".local");
  let enabled = false;
  let listenersAttached = false;
  let errorCount = 0;
  let trackerPromise = null;
  const pendingEvents = [];

  function safeStorage(storage, action, key, value) {
    try {
      if (action === "get") return storage.getItem(key);
      if (action === "set") storage.setItem(key, value);
      if (action === "remove") storage.removeItem(key);
    } catch (_) {}
    return null;
  }

  function clean(value, fallback) {
    if (typeof value !== "string") return fallback || "";
    const result = value.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 80);
    return result || fallback || "";
  }

  function campaignValue(value, fallback) {
    if (typeof value !== "string" || !value) return fallback || "";
    if (value.includes("@") || /(?:token|password|passwd|secret|auth|email)=?/i.test(value)) return "redacted";
    return clean(value, fallback);
  }

  function canonicalPath(pathname) {
    if (pathname === "/index.html" || pathname === "") return "/";
    return pathname.replace(/\/{2,}/g, "/");
  }

  function safePagePath() {
    const url = new URL(location.origin + canonicalPath(location.pathname));
    SAFE_CAMPAIGN_KEYS.forEach(key => {
      const value = new URLSearchParams(location.search).get(key);
      if (value) url.searchParams.set(key, campaignValue(value, "redacted"));
    });
    return url.pathname + url.search;
  }

  function safeReferrer() {
    if (!document.referrer) return "";
    try {
      const referrer = new URL(document.referrer);
      return referrer.origin + canonicalPath(referrer.pathname);
    } catch (_) { return ""; }
  }

  function sourceFromReferrer() {
    if (!document.referrer) return { source: "direct", medium: "none" };
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host === location.hostname) return { source: "direct", medium: "none" };
      if (host.includes("instagram.com")) return { source: "instagram", medium: "social" };
      if (host.includes("snapchat.com")) return { source: "snapchat", medium: "social" };
      if (host === "t.me" || host.includes("telegram.")) return { source: "telegram", medium: "community" };
      if (host === "t.co" || host.includes("twitter.com") || host === "x.com") return { source: "twitter", medium: "social" };
      if (host.includes("onlyfans.com")) return { source: "onlyfans", medium: "creator" };
      if (host.includes("google.")) return { source: "google", medium: "organic" };
      if (host.includes("bing.com")) return { source: "bing", medium: "organic" };
      return { source: "referral", medium: "referral" };
    } catch (_) { return { source: "unknown", medium: "unknown" }; }
  }

  function currentTouch() {
    const params = new URLSearchParams(location.search);
    const utmSource = campaignValue(params.get("utm_source") || "");
    const shortSource = SOURCE_ALIASES[campaignValue(params.get("src") || "")];
    const referrer = sourceFromReferrer();
    const source = SOURCE_ALIASES[utmSource] || utmSource || shortSource || referrer.source;
    const defaultMedium = source === "telegram" ? "community" : ["instagram", "snapchat", "twitter"].includes(source) ? "social" : source === "onlyfans" ? "creator" : referrer.medium;
    return {
      source: clean(source, "unknown"),
      medium: campaignValue(params.get("utm_medium") || defaultMedium, "unknown"),
      campaign: campaignValue(params.get("utm_campaign") || "none", "none"),
      content: campaignValue(params.get("utm_content") || "none", "none")
    };
  }

  function deviceType() {
    const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  }

  function commonProps() {
    const current = currentTouch();
    return {
      page_path: canonicalPath(location.pathname),
      page_title: clean(document.title, "untitled"),
      source: current.source,
      medium: current.medium,
      campaign: current.campaign,
      content: current.content,
      device_type: deviceType(),
      language: clean((navigator.language || "unknown").split("-")[0], "unknown")
    };
  }

  function analyticsIgnored() {
    return safeStorage(localStorage, "get", "alex_analytics_ignore") === "true";
  }

  function clearLegacyAnalyticsStorage() {
    ["alex_analytics_consent", "alex_analytics_first_touch", "alex_analytics_last_touch", "alex_analytics_visited"]
      .forEach(key => safeStorage(localStorage, "remove", key));
    safeStorage(sessionStorage, "remove", "alex_analytics_session");
  }

  function flushEvents() {
    if (!window.umami) return;
    while (pendingEvents.length) {
      const event = pendingEvents.shift();
      try { window.umami.track(event.name, event.props); } catch (_) {}
    }
  }

  function loadTracker() {
    if (trackerPromise) return trackerPromise;
    trackerPromise = new Promise(resolve => {
      if (window.umami) { resolve(window.umami); return; }
      const script = document.createElement("script");
      script.src = TRACKER_URL;
      script.async = true;
      script.dataset.websiteId = WEBSITE_ID;
      script.dataset.autoTrack = "false";
      script.dataset.domains = DOMAIN + ",www." + DOMAIN;
      script.dataset.excludeHash = "true";
      script.dataset.performance = "true";
      script.addEventListener("load", () => resolve(window.umami || null), { once: true });
      script.addEventListener("error", () => resolve(null), { once: true });
      document.head.appendChild(script);
    });
    return trackerPromise;
  }

  function send(name, props) {
    if (!enabled || isDevelopment || analyticsIgnored()) return false;
    const event = { name: clean(name, "outbound_click"), props: Object.assign(commonProps(), props || {}) };
    if (window.umami) {
      try { window.umami.track(event.name, event.props); return true; } catch (_) { return false; }
    }
    pendingEvents.push(event);
    loadTracker();
    return true;
  }

  function sendPageView() {
    if (!enabled || isDevelopment || analyticsIgnored()) return Promise.resolve();
    return loadTracker().then(tracker => {
      if (!tracker) return;
      try {
        tracker.track(defaults => Object.assign({}, defaults, {
          url: safePagePath(),
          title: document.title,
          referrer: safeReferrer()
        }));
        flushEvents();
      } catch (_) {}
    });
  }

  function destinationMeta(link) {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("mailto:")) return { destination_domain: "email", destination_type: "email" };
    try {
      const url = new URL(href, location.href);
      return { destination_domain: clean(url.hostname, "internal"), destination_type: url.origin === location.origin ? "internal" : "external" };
    } catch (_) { return { destination_domain: "unknown", destination_type: "unknown" }; }
  }

  function handleTrackedClick(event) {
    const link = event.target.closest("[data-track-event]");
    if (!link) return;
    const meta = destinationMeta(link);
    send(clean(link.dataset.trackEvent, "outbound_click"), {
      platform: clean(link.dataset.platform || "none", "none"),
      link_name: clean(link.dataset.linkName || link.textContent || "link", "link"),
      link_position: clean(link.dataset.position || "unknown", "unknown"),
      destination_type: clean(link.dataset.destinationType || meta.destination_type, "unknown"),
      destination_domain: meta.destination_domain
    });
  }

  function trackScrollDepth() {
    const reached = new Set();
    let queued = false;
    function measure() {
      queued = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const percent = max <= 0 ? 100 : Math.round((scrollY / max) * 100);
      [25, 50, 75, 90].forEach(depth => {
        if (percent >= depth && !reached.has(depth)) {
          reached.add(depth);
          send("scroll_depth", { depth: String(depth) }, false);
        }
      });
    }
    addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    }, { passive: true });
    measure();
  }

  function startAnalytics() {
    if (enabled || isDevelopment) return;
    enabled = true;
    sendPageView();
    if (!listenersAttached) {
      listenersAttached = true;
      document.addEventListener("click", handleTrackedClick, { capture: true });
      trackScrollDepth();
    }
  }

  window.addEventListener("error", event => {
    if (errorCount >= 3) return;
    errorCount += 1;
    send("javascript_error", { error_type: event.error ? "runtime" : "resource" }, false);
  }, true);

  window.alexAnalytics = { trackEvent: send, getTrafficSource: currentTouch, getCampaignData: currentTouch, canonicalPath };

  function init() {
    clearLegacyAnalyticsStorage();
    if (isDevelopment) return;
    startAnalytics();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
