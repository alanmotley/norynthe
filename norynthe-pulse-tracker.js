(function () {
  if (window.NORYNTHE_PULSE_TRACKER_INITIALIZED) return;
  window.NORYNTHE_PULSE_TRACKER_INITIALIZED = true;

  const ENDPOINT = window.NORYNTHE_PULSE_ENDPOINT || "https://norynthe-pulse-tracker.alanmotley.workers.dev/track";
  const TRACKER_HOST = new URL(ENDPOINT).hostname;
  const SESSION_KEY = "norynthe_pulse_session_id_v1";
  const PUBLIC_GA_SESSION_KEY = "norynthe_pulse_ga_session_id_v1_H9T9WHCR5Y";
  const INVESTOR_GA_SESSION_KEY = "norynthe_pulse_ga_session_id_v1_570981B382";
  const PUBLIC_GA_SESSION_COOKIE = "_ga_H9T9WHCR5Y";
  const INVESTOR_GA_SESSION_COOKIE = "_ga_570981B382";
  const OWNER_MODE_KEY = "norynthe_pulse_owner_mode_v1";
  const OWNER_MODE_COOKIE = "norynthe_pulse_owner_mode";
  const OWNER_MODE_ENABLE_VALUES = ["1", "true", "yes", "on", "enable", "enabled"];
  const OWNER_MODE_DISABLE_VALUES = ["0", "false", "no", "off", "disable", "disabled"];
  const HOST_SITE = {
    "www.norynthe.com": "norynthe",
    "norynthe.com": "norynthe",
    "investors.norynthe.com": "investor",
    "reports.norynthe.com": "reports",
    "papers.norynthe.com": "papers",
    "www.alanmotley.com": "alanmotley",
    "alanmotley.com": "alanmotley"
  };

  const currentScript = document.currentScript;
  const investorSurface = isInvestorSurface();
  const site = investorSurface
    ? "investor"
    : currentScript?.dataset?.pulseSite || HOST_SITE[window.location.hostname] || "unknown";
  const gaSessionKey = investorSurface ? INVESTOR_GA_SESSION_KEY : PUBLIC_GA_SESSION_KEY;
  const gaSessionCookie = investorSurface ? INVESTOR_GA_SESSION_COOKIE : PUBLIC_GA_SESSION_COOKIE;
  const ownerModeCommand = applyOwnerModeCommand();
  const ownerModeEnabled = isOwnerModeEnabled();
  const ownerModeCommandSeen = Boolean(window.NORYNTHE_PULSE_OWNER_MODE_COMMAND || ownerModeCommand);
  window.NORYNTHE_PULSE_OWNER_MODE = Boolean(window.NORYNTHE_PULSE_OWNER_MODE || ownerModeEnabled);
  window.NORYNTHE_PULSE_OWNER_MODE_COMMAND = ownerModeCommandSeen;
  if (window.NORYNTHE_PULSE_OWNER_MODE || ownerModeCommandSeen) {
    return;
  }

  const sessionId = getSessionId();
  const device = detectDevice();
  const utm = readUtm();
  const seenPulseEventIds = new Set();

  function send(payload) {
    const referrer = payload?.referrer ?? document.referrer;
    const body = JSON.stringify(Object.assign({
      site,
      eventType: "page_view",
      sessionId,
      gaClientId: getGaClientId(),
      gaSessionId: getGaSessionId(),
      page: window.location.pathname + window.location.search,
      pageLocation: window.location.href,
      title: document.title,
      referrer,
      referrerDomain: domainFromUrl(referrer),
      utmSource: utm.source,
      utmMedium: utm.medium,
      utmCampaign: utm.campaign,
      utmTerm: utm.term,
      utmContent: utm.content,
      deviceType: device.type,
      browser: device.browser,
      os: device.os
    }, payload));

    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain;charset=UTF-8" }));
      return;
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
      keepalive: true
    }).catch(function () {});
  }

  const pulseBridge = window.NorynthePulse = window.NorynthePulse || {};
  const queuedPulseEvents = Array.isArray(pulseBridge.queue) ? pulseBridge.queue.slice() : [];
  pulseBridge.queue = [];
  pulseBridge.track = trackPulseEvent;
  pulseBridge.ready = true;

  window.addEventListener("norynthe:pulse", function (event) {
    const detail = event && event.detail && typeof event.detail === "object" ? event.detail : {};
    pulseBridge.track(detail.eventType, detail.payload || detail);
  });

  queuedPulseEvents.forEach(function (entry) {
    if (!entry || typeof entry !== "object") return;
    pulseBridge.track(entry.eventType, entry.payload || {});
  });

  send({
    assetName: assetNameFromPage(window.location.pathname, document.title)
  });
  tagClaritySession();

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const directDownloadUrl = directDownloadHref(href);
    if (directDownloadUrl) {
      link.href = withSessionParams(directDownloadUrl).toString();
      return;
    }

    const isPdf = /\.pdf(?:[?#].*)?$/i.test(href) || link.hasAttribute("download");
    if (!isPdf) return;

    let page = href;
    try {
      page = new URL(href, window.location.href).pathname;
    } catch (error) {
      page = href;
    }

    const label = cleanText(link.textContent || link.getAttribute("aria-label") || "PDF", 120) || "PDF";
    send({
      eventType: "pdf_download",
      page,
      title: "Download: " + label,
      referrer: window.location.href,
      referrerDomain: window.location.hostname.replace(/^www\./, ""),
      assetName: assetNameFromLink(href, label)
    });
    emitClarityEvent("pulse_pdf_download");
  }, { capture: true });

  function getSessionId() {
    try {
      const existing = window.sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;

      const next = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : "session-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.sessionStorage.setItem(SESSION_KEY, next);
      return next;
    } catch (error) {
      return "session-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  function getGaClientId() {
    const value = readCookie("_ga");
    if (!value) return "";

    const parts = value.split(".");
    if (parts.length >= 4 && /^GA\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      return cleanText(parts.slice(-2).join("."), 100);
    }

    return /^\d+\.\d+$/.test(value) ? cleanText(value, 100) : "";
  }

  function getGaSessionId() {
    const parsed = parseGaSessionCookie(readCookie(gaSessionCookie));
    if (parsed) return parsed;

    try {
      const existing = window.sessionStorage.getItem(gaSessionKey);
      if (/^\d+$/.test(existing || "")) return existing;

      const next = String(Math.floor(Date.now() / 1000));
      window.sessionStorage.setItem(gaSessionKey, next);
      return next;
    } catch (error) {
      return String(Math.floor(Date.now() / 1000));
    }
  }

  function parseGaSessionCookie(value) {
    if (!value) return "";

    const gs2Session = value.match(/(?:^|[.$])s(\d{9,})(?:[$.]|$)/);
    if (gs2Session) return gs2Session[1];

    const parts = value.split(".");
    if (/^GS\d+$/.test(parts[0] || "") && /^\d+$/.test(parts[2] || "")) return parts[2];

    return "";
  }

  function readCookie(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function applyOwnerModeCommand() {
    const params = new URLSearchParams(window.location.search);
    const value = cleanText(params.get("pulse_owner"), 32).toLowerCase();
    if (!value) return "";

    if (OWNER_MODE_ENABLE_VALUES.includes(value)) {
      setOwnerMode(true);
      stripOwnerModeParam(params);
      return "enabled";
    }

    if (OWNER_MODE_DISABLE_VALUES.includes(value)) {
      setOwnerMode(false);
      stripOwnerModeParam(params);
      return "disabled";
    }

    return "";
  }

  function isOwnerModeEnabled() {
    try {
      if (window.localStorage.getItem(OWNER_MODE_KEY) === "1") return true;
    } catch (error) {}

    return document.cookie.split(";").some(function (part) {
      return part.trim() === OWNER_MODE_COOKIE + "=1";
    });
  }

  function setOwnerMode(enabled) {
    try {
      if (enabled) {
        window.localStorage.setItem(OWNER_MODE_KEY, "1");
      } else {
        window.localStorage.removeItem(OWNER_MODE_KEY);
      }
    } catch (error) {}

    const maxAge = enabled ? 60 * 60 * 24 * 400 : 0;
    const cookieParts = [
      OWNER_MODE_COOKIE + "=" + (enabled ? "1" : ""),
      "path=/",
      "max-age=" + maxAge,
      "SameSite=Lax"
    ];
    const domain = ownerCookieDomain();
    if (domain) cookieParts.push("domain=" + domain);
    if (window.location.protocol === "https:") cookieParts.push("Secure");
    document.cookie = cookieParts.join("; ");
  }

  function ownerCookieDomain() {
    const host = window.location.hostname.replace(/^www\./, "");
    if (host.endsWith("norynthe.com")) return ".norynthe.com";
    if (host.endsWith("alanmotley.com")) return ".alanmotley.com";
    return "";
  }

  function stripOwnerModeParam(params) {
    try {
      params.delete("pulse_owner");
      const nextQuery = params.toString();
      const nextUrl = window.location.pathname + (nextQuery ? "?" + nextQuery : "") + window.location.hash;
      window.history.replaceState(null, document.title, nextUrl);
    } catch (error) {}
  }

  function readUtm() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: cleanText(params.get("utm_source"), 120),
      medium: cleanText(params.get("utm_medium"), 120),
      campaign: cleanText(params.get("utm_campaign"), 160),
      term: cleanText(params.get("utm_term"), 160),
      content: cleanText(params.get("utm_content"), 160)
    };
  }

  function detectDevice() {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isTablet = /ipad|tablet|playbook|silk/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isMobile = !isTablet && /mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua);

    return {
      type: isTablet ? "tablet" : isMobile ? "mobile" : "desktop",
      browser: detectBrowser(ua),
      os: detectOs(ua, platform)
    };
  }

  function detectBrowser(ua) {
    if (/edg\//i.test(ua)) return "Edge";
    if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
    if (/firefox\//i.test(ua)) return "Firefox";
    if (/chrome\//i.test(ua) || /crios\//i.test(ua)) return "Chrome";
    if (/safari\//i.test(ua)) return "Safari";
    return "Unknown";
  }

  function detectOs(ua, platform) {
    if (/iphone|ipad|ipod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iOS";
    if (/android/i.test(ua)) return "Android";
    if (/windows/i.test(ua)) return "Windows";
    if (/mac os x|macintosh|macintel/i.test(ua) || /mac/i.test(platform)) return "macOS";
    if (/linux/i.test(ua)) return "Linux";
    return "Unknown";
  }

  function assetNameFromLink(href, label) {
    const combined = `${href} ${label}`.toLowerCase();
    if (combined.includes("investor") && combined.includes("packet")) return "Investor Packet";
    if (combined.includes("white")) return "White Paper";
    if (combined.includes("raise")) return "Raise Plan";
    if (combined.includes("financial")) return "Financial Model";
    if (combined.includes("report")) return "Report";
    return label || "PDF";
  }

  function directDownloadHref(href) {
    try {
      const url = new URL(href, window.location.href);
      return url.hostname === TRACKER_HOST && url.pathname.startsWith("/download/")
        ? url
        : null;
    } catch (error) {
      return null;
    }
  }

  function withSessionParams(url) {
    const next = new URL(url.toString());
    const gaClientId = getGaClientId();
    const gaSessionId = getGaSessionId();
    next.searchParams.set("session_id", sessionId);
    next.searchParams.set("site", site);
    next.searchParams.set("page_location", window.location.href);
    if (gaClientId) next.searchParams.set("ga_client_id", gaClientId);
    if (gaSessionId) next.searchParams.set("ga_session_id", gaSessionId);
    for (const [key, value] of [
      ["utm_source", utm.source],
      ["utm_medium", utm.medium],
      ["utm_campaign", utm.campaign],
      ["utm_term", utm.term],
      ["utm_content", utm.content]
    ]) {
      if (value) next.searchParams.set(key, value);
    }
    return next;
  }

  function trackPulseEvent(eventType, payload) {
    const type = cleanText(eventType, 48);
    if (type !== "form_start" && type !== "generate_lead" && type !== "support_click") return false;

    const details = payload && typeof payload === "object" ? payload : {};
    const eventId = cleanText(details.eventId || details.event_id, 160);
    if (eventId && seenPulseEventIds.has(eventId)) return false;
    if (eventId) seenPulseEventIds.add(eventId);

    const requestType = cleanText(details.requestType || details.request_type || details.material, 120)
      || (type === "support_click" ? "The Norynthe Papers" : "General inquiry");
    const sourceArea = cleanText(details.sourceArea || details.source_area, 120) || site;
    const titlePrefix = type === "generate_lead"
      ? "Lead generated"
      : type === "support_click"
        ? "Support clicked"
        : "Form started";

    send({
      eventType: type,
      assetName: requestType,
      title: titlePrefix + ": " + requestType + " · " + sourceArea,
      referrer: window.location.href,
      referrerDomain: window.location.hostname.replace(/^www\./, "")
    });
    emitClarityEvent("pulse_" + type);
    return true;
  }

  function tagClaritySession() {
    withClarity(function (clarity) {
      const pageId = cleanText(window.location.pathname || "/", 120) || "/";
      clarity("identify", "pulse:" + sessionId, sessionId, pageId, site);
      clarity("set", "pulse_site", site);
      clarity("set", "pulse_session", sessionId);
      clarity("set", "pulse_page", pageId);
      if (utm.source) clarity("set", "pulse_utm_source", utm.source);
      if (utm.medium) clarity("set", "pulse_utm_medium", utm.medium);
      if (utm.campaign) clarity("set", "pulse_utm_campaign", utm.campaign);
    });
  }

  function emitClarityEvent(eventName) {
    withClarity(function (clarity) {
      clarity("event", eventName);
    });
  }

  function withClarity(callback, attempt) {
    const count = attempt || 0;
    if (typeof window.clarity === "function") {
      callback(window.clarity);
      return;
    }

    if (count < 20) {
      window.setTimeout(function () {
        withClarity(callback, count + 1);
      }, 250);
    }
  }

  function assetNameFromPage(path, title) {
    const combined = `${path} ${title}`.toLowerCase();
    if (combined.includes("white-paper") || combined.includes("white paper")) return "White Paper";
    if (combined.includes("raise-plan") || combined.includes("raise plan")) return "Raise Plan";
    if (combined.includes("business-model") || combined.includes("business model")) return "Business Model";
    if (combined.includes("run-console") || combined.includes("console")) return "MVP Console";
    if (combined.includes("investor") && combined.includes("packet")) return "Investor Packet";
    return "";
  }

  function isInvestorSurface() {
    const host = window.location.hostname.replace(/^www\./, "").toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return host === "investors.norynthe.com" || path.includes("norynthe-investors.html");
  }

  function domainFromUrl(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch (error) {
      return "";
    }
  }

  function cleanText(value, maxLength) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }
}());
