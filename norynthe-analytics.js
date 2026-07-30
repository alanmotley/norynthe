(function () {
  const PUBLIC_GA4_MEASUREMENT_ID = "G-H9T9WHCR5Y";
  const INVESTOR_GA4_MEASUREMENT_ID = "G-570981B382";
  const isInvestorSurface =
    window.location.hostname.replace(/^www\./, "").toLowerCase() === "investors.norynthe.com" ||
    window.location.pathname.toLowerCase().includes("norynthe-investors.html");
  const GA4_MEASUREMENT_ID = isInvestorSurface
    ? INVESTOR_GA4_MEASUREMENT_ID
    : PUBLIC_GA4_MEASUREMENT_ID;
  const EVENT_CATEGORY = "Norynthe Public Site";
  const FIRST_MATERIAL_KEY = "norynthe_public_first_material";
  const OWNER_MODE_KEY = "norynthe_pulse_owner_mode_v1";
  const OWNER_MODE_COOKIE = "norynthe_pulse_owner_mode";
  const OWNER_MODE_ENABLE_VALUES = ["1", "true", "yes", "on", "enable", "enabled"];
  const OWNER_MODE_DISABLE_VALUES = ["0", "false", "no", "off", "disable", "disabled"];
  const TALLY_FORM_ID = "ZjezPA";
  const TALLY_FORM_URL = "https://tally.so/r/" + TALLY_FORM_ID;
  const TALLY_FORM_NAME = "Norynthe inquiry";
  const PULSE_EVENT_NAME = "norynthe:pulse";

  const ownerModeCommand = applyOwnerModeCommand();
  const ownerModeEnabled = isOwnerModeEnabled();
  window.NORYNTHE_PULSE_OWNER_MODE_COMMAND = Boolean(window.NORYNTHE_PULSE_OWNER_MODE_COMMAND || ownerModeCommand);
  window.NORYNTHE_PULSE_OWNER_MODE = Boolean(window.NORYNTHE_PULSE_OWNER_MODE || ownerModeEnabled);

  if (window.NORYNTHE_PULSE_OWNER_MODE || window.NORYNTHE_PULSE_OWNER_MODE_COMMAND) return;
  if (!GA4_MEASUREMENT_ID || GA4_MEASUREMENT_ID === "G-XXXXXXXXXX") return;
  if (window.NORYNTHE_PUBLIC_ANALYTICS_INITIALIZED) return;
  window.NORYNTHE_PUBLIC_ANALYTICS_INITIALIZED = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_MEASUREMENT_ID);
    document.head.appendChild(tag);
  }

  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, {
    cookie_domain: "auto",
    content_group: contentGroup(),
    content_type: contentType(),
    page_name: pageName(),
    page_title: document.title,
    page_path: window.location.pathname + window.location.search,
    site_area: siteArea()
  });

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim().slice(0, 96);
  }

  function applyOwnerModeCommand() {
    const params = new URLSearchParams(window.location.search);
    const value = cleanText(params.get("pulse_owner")).toLowerCase();
    if (!OWNER_MODE_ENABLE_VALUES.includes(value) && !OWNER_MODE_DISABLE_VALUES.includes(value)) return false;

    const enabled = OWNER_MODE_ENABLE_VALUES.includes(value);
    try {
      if (enabled) {
        window.localStorage.setItem(OWNER_MODE_KEY, "1");
      } else {
        window.localStorage.removeItem(OWNER_MODE_KEY);
      }
    } catch (error) {}

    const parts = [
      OWNER_MODE_COOKIE + "=" + (enabled ? "1" : ""),
      "path=/",
      "max-age=" + (enabled ? 60 * 60 * 24 * 400 : 0),
      "SameSite=Lax"
    ];
    const host = window.location.hostname.replace(/^www\./, "");
    if (host.endsWith("norynthe.com")) parts.push("domain=.norynthe.com");
    if (host.endsWith("alanmotley.com")) parts.push("domain=.alanmotley.com");
    if (window.location.protocol === "https:") parts.push("Secure");
    document.cookie = parts.join("; ");

    try {
      params.delete("pulse_owner");
      const nextQuery = params.toString();
      window.history.replaceState(null, document.title, window.location.pathname + (nextQuery ? "?" + nextQuery : "") + window.location.hash);
    } catch (error) {}

    return true;
  }

  function isOwnerModeEnabled() {
    try {
      if (window.localStorage.getItem(OWNER_MODE_KEY) === "1") return true;
    } catch (error) {}

    return document.cookie.split(";").some(function (part) {
      return part.trim() === OWNER_MODE_COOKIE + "=1";
    });
  }

  function pageName() {
    return document.body.dataset.analyticsPage || cleanText(document.title.split("|")[0]) || "Public Site";
  }

  function siteArea() {
    const bodyOverride = cleanText(document.body.dataset.analyticsSite);
    if (bodyOverride) return bodyOverride;

    const host = window.location.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "papers.norynthe.com") return "Papers";
    if (host === "reports.norynthe.com") return "Reports";
    return "Main Site";
  }

  function contentGroup() {
    const bodyOverride = cleanText(document.body.dataset.analyticsContent);
    if (bodyOverride) return bodyOverride;

    const path = window.location.pathname.toLowerCase();
    const host = window.location.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "papers.norynthe.com") return "Research";
    if (host === "reports.norynthe.com") return "Score Board";
    if (path.includes("privacy")) return "Privacy";
    if (
      path.includes("independent-ai-model-evaluation") ||
      path.includes("ai-agent-harness-evaluation") ||
      path.includes("ai-model-evaluation-benchmarks") ||
      path.includes("ai-trust-scoring") ||
      path.includes("ai-governance-readiness")
    ) {
      return "AI Assurance";
    }
    return "Corporate";
  }

  function contentType() {
    const bodyOverride = cleanText(document.body.dataset.analyticsContentType);
    if (bodyOverride) return bodyOverride;

    const group = contentGroup();
    if (group === "AI Assurance") return "assurance_page";
    if (group === "Research") return "publication";
    if (group === "Score Board") return "signal_preview";
    return group.toLowerCase().replace(/\s+/g, "_");
  }

  function linkRole(link) {
    const explicitRole = cleanText(link.dataset.analyticsRole);
    if (explicitRole) return explicitRole;

    if (link.closest(".hero-actions, .hero-links, .button-row, .closing-actions, .contact-row")) {
      return "primary_cta";
    }

    if (link.closest(".company-card")) return "content_card";
    if (link.closest("nav")) return "navigation";
    if (link.closest("footer")) return "footer";
    return "inline";
  }

  function isMainSiteHomeHref(href) {
    if (href === "/" || href.toLowerCase().includes("index.html")) return true;

    try {
      const destination = new URL(href, window.location.href);
      const host = destination.hostname.replace(/^www\./, "").toLowerCase();
      return host === "norynthe.com" && (destination.pathname === "/" || destination.pathname === "");
    } catch (error) {
      return false;
    }
  }

  function materialForHref(href, text) {
    if (!href) return text || "Unknown";
    const normalizedHref = href.toLowerCase();
    if (normalizedHref.startsWith("mailto:")) return "Contact";
    if (normalizedHref.includes("tally.so/r/" + TALLY_FORM_ID.toLowerCase())) return "Contact Form";
    if (normalizedHref.includes("norynthe-investors.html")) return "Investor Overview";
    if (normalizedHref.includes("norynthe-founder-memo.html")) return "Founder Memo";
    if (normalizedHref.includes("market-position.html")) return "Market Position";
    if (normalizedHref.includes("independent-ai-model-evaluation")) return "Independent AI Assurance";
    if (normalizedHref.includes("ai-agent-harness-evaluation")) return "AI Agent Harness Evaluation";
    if (normalizedHref.includes("ai-model-evaluation-benchmarks")) return "AI Model Evaluation Benchmarks";
    if (normalizedHref.includes("ai-trust-scoring")) return "AI Trust Scoring";
    if (normalizedHref.includes("ai-governance-readiness")) return "AI Governance Readiness";
    if (normalizedHref.includes("reports.norynthe.com")) return "Norynthe.Score";
    if (normalizedHref.includes("papers.norynthe.com")) return "Norynthe Papers";
    if (normalizedHref.includes("#standard")) return "Benchmark Ledger";
    if (isMainSiteHomeHref(href)) return "Main Site";
    if (href.charAt(0) === "#") return href.replace("#", "") || text || "Page Section";
    return text || href;
  }

  function eventForHref(href) {
    const normalizedHref = href.toLowerCase();
    if (normalizedHref.startsWith("mailto:")) return "contact_clicked";
    if (normalizedHref.includes("tally.so/r/" + TALLY_FORM_ID.toLowerCase())) return "request_materials_clicked";
    if (normalizedHref.includes("norynthe-investors.html")) return "public_material_opened";
    if (normalizedHref.includes("norynthe-founder-memo.html")) return "public_material_opened";
    if (normalizedHref.includes("market-position.html")) return "public_material_opened";
    if (normalizedHref.includes("independent-ai-model-evaluation")) return "public_material_opened";
    if (normalizedHref.includes("ai-agent-harness-evaluation")) return "public_material_opened";
    if (normalizedHref.includes("ai-model-evaluation-benchmarks")) return "public_material_opened";
    if (normalizedHref.includes("ai-trust-scoring")) return "public_material_opened";
    if (normalizedHref.includes("ai-governance-readiness")) return "public_material_opened";
    if (normalizedHref.includes("reports.norynthe.com")) return "public_material_opened";
    if (normalizedHref.includes("papers.norynthe.com")) return "public_material_opened";
    if (normalizedHref.includes("#standard")) return "public_material_opened";
    if (isMainSiteHomeHref(href)) return "public_material_opened";
    if (href.charAt(0) === "#") return "page_section_opened";
    return "site_link_clicked";
  }

  function destinationHost(href) {
    if (!href) return "unknown";
    if (href.startsWith("mailto:")) return "email";
    if (href.charAt(0) === "#") return "same_page";

    try {
      return new URL(href, window.location.href).hostname.replace(/^www\./, "") || "same_site";
    } catch (error) {
      return "unknown";
    }
  }

  function isOutboundHref(href) {
    if (!href || href.startsWith("mailto:") || href.charAt(0) === "#") return false;

    try {
      return new URL(href, window.location.href).hostname !== window.location.hostname;
    } catch (error) {
      return false;
    }
  }

  function safeSessionGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSessionSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      return;
    }
  }

  function track(eventName, params, pulseEventId) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, Object.assign({
        content_group: contentGroup(),
        content_type: contentType(),
        event_category: EVENT_CATEGORY,
        site_area: siteArea(),
        page_name: pageName(),
        transport_type: "beacon"
      }, params));
    }

    if (eventName === "form_start" || eventName === "generate_lead") {
      trackPulseLifecycle(eventName, params, pulseEventId);
    }
  }

  function trackPulseLifecycle(eventName, params, eventId) {
    const payload = {
      eventId: eventId || createPulseEventId(eventName),
      formId: TALLY_FORM_ID,
      formName: TALLY_FORM_NAME,
      material: cleanText(params && params.material) || "Contact Form",
      requestType: cleanText(params && params.request_type) || "General inquiry",
      sourceArea: cleanText(params && params.source_area) || siteArea()
    };
    const bridge = window.NorynthePulse = window.NorynthePulse || {};

    if (typeof bridge.track === "function") {
      bridge.track(eventName, payload);
      return;
    }

    bridge.queue = Array.isArray(bridge.queue) ? bridge.queue : [];
    if (!bridge.queue.some(function (entry) {
      return entry && entry.payload && entry.payload.eventId === payload.eventId;
    })) {
      bridge.queue.push({ eventType: eventName, payload: payload });
    }

    try {
      window.dispatchEvent(new CustomEvent(PULSE_EVENT_NAME, {
        detail: { eventType: eventName, payload: payload }
      }));
    } catch (error) {}
  }

  function createPulseEventId(eventName) {
    const token = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return "norynthe:" + eventName + ":" + token;
  }

  function loadTallyWidget() {
    if (window.Tally && typeof window.Tally.openPopup === "function") {
      return Promise.resolve();
    }

    if (window.noryntheTallyReady) return window.noryntheTallyReady;

    window.noryntheTallyReady = new Promise(function (resolve, reject) {
      const existingScript = document.querySelector('script[src="https://tally.so/widgets/embed.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://tally.so/widgets/embed.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return window.noryntheTallyReady;
  }

  function openRequestForm(trigger) {
    const formJourneyId = createPulseEventId("inquiry");
    const linkText = cleanText(trigger.textContent || trigger.getAttribute("aria-label")) || "Request materials";
    const requestType = cleanText(trigger.dataset.requestType) || "General inquiry";
    const sourceArea = cleanText(trigger.dataset.sourceArea) || linkRole(trigger);
    const params = {
      destination_host: "tally.so",
      form_destination: TALLY_FORM_URL,
      form_id: TALLY_FORM_ID,
      form_name: TALLY_FORM_NAME,
      link_text: linkText,
      material: "Contact Form",
      request_type: requestType,
      source_area: sourceArea,
      destination: TALLY_FORM_URL
    };

    track("request_materials_clicked", params);

    function continueToHostedForm() {
      track("form_start", params, formJourneyId + ":form_start");
      window.location.href = TALLY_FORM_URL;
    }

    loadTallyWidget()
      .then(function () {
        if (!window.Tally || typeof window.Tally.openPopup !== "function") {
          continueToHostedForm();
          return;
        }

        let formStarted = false;
        let leadGenerated = false;

        window.Tally.openPopup(TALLY_FORM_ID, {
          layout: "modal",
          width: 700,
          overlay: true,
          hiddenFields: {
            source_page: pageName(),
            source_area: sourceArea,
            source_path: window.location.pathname,
            request_type: requestType
          },
          onOpen: function () {
            track("request_materials_opened", params);
            if (!formStarted) {
              formStarted = true;
              track("form_start", params, formJourneyId + ":form_start");
            }
          },
          onClose: function () {
            track("request_materials_closed", params);
          },
          onSubmit: function () {
            if (!leadGenerated) {
              leadGenerated = true;
              track("request_materials_submitted", params);
              track("generate_lead", params, formJourneyId + ":generate_lead");
            }
          }
        });
      })
      .catch(function () {
        continueToHostedForm();
      });
  }

  document.addEventListener("click", function (event) {
    const copyButton = event.target.closest("#copy-email");
    if (copyButton) {
      track("email_copied", {
        link_text: cleanText(copyButton.textContent) || "Copy email",
        material: "Contact",
        link_role: "footer",
        destination: "mailto:hello@norynthe.com"
      });
      return;
    }

    const tallyTrigger = event.target.closest("[data-tally-request]");
    if (tallyTrigger) {
      event.preventDefault();
      openRequestForm(tallyTrigger);
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const text = cleanText(link.textContent || link.getAttribute("aria-label"));
    const material = cleanText(link.dataset.analyticsMaterial) || materialForHref(href, text);
    const eventName = eventForHref(href);
    const params = {
      destination_host: destinationHost(href),
      link_text: text || material,
      material: material,
      link_role: linkRole(link),
      outbound: isOutboundHref(href),
      destination: href.startsWith("mailto:") ? "mailto:hello@norynthe.com" : href
    };

    track(eventName, params);

    if (eventName === "public_material_opened" && material !== "Main Site" && !safeSessionGet(FIRST_MATERIAL_KEY)) {
      safeSessionSet(FIRST_MATERIAL_KEY, material);
      track("first_public_material_opened", params);
    }
  });
}());
