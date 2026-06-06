(function () {
  const GA4_MEASUREMENT_ID = "G-570981B382";
  const EVENT_CATEGORY = "Norynthe Public Site";
  const FIRST_MATERIAL_KEY = "norynthe_public_first_material";
  const TALLY_FORM_ID = "ZjezPA";
  const TALLY_FORM_URL = "https://tally.so/r/" + TALLY_FORM_ID;

  if (!GA4_MEASUREMENT_ID || GA4_MEASUREMENT_ID === "G-XXXXXXXXXX") return;

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
    page_title: document.title,
    page_path: window.location.pathname + window.location.search + window.location.hash
  });

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim().slice(0, 96);
  }

  function pageName() {
    return document.body.dataset.analyticsPage || cleanText(document.title.split("|")[0]) || "Public Site";
  }

  function linkRole(link) {
    if (link.closest(".hero-actions, .hero-links, .button-row, .closing-actions, .contact-row")) {
      return "primary_cta";
    }

    if (link.closest(".company-card")) return "content_card";
    if (link.closest("nav")) return "navigation";
    if (link.closest("footer")) return "footer";
    return "inline";
  }

  function materialForHref(href, text) {
    if (!href) return text || "Unknown";
    if (href.startsWith("mailto:")) return "Contact";
    if (href.includes("norynthe-investors.html")) return "Investor Overview";
    if (href.includes("norynthe-founder-memo.html")) return "Founder Memo";
    if (href.includes("market-position.html")) return "Market Position";
    if (href.includes("#standard")) return "Benchmark Ledger";
    if (href === "/" || href.includes("index.html")) return "Main Site";
    if (href.charAt(0) === "#") return href.replace("#", "") || text || "Page Section";
    return text || href;
  }

  function eventForHref(href) {
    if (href.startsWith("mailto:")) return "contact_clicked";
    if (href.includes("norynthe-investors.html")) return "public_material_opened";
    if (href.includes("norynthe-founder-memo.html")) return "public_material_opened";
    if (href.includes("market-position.html")) return "public_material_opened";
    if (href.includes("#standard")) return "public_material_opened";
    if (href === "/" || href.includes("index.html")) return "public_material_opened";
    if (href.charAt(0) === "#") return "page_section_opened";
    return "site_link_clicked";
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

  function track(eventName, params) {
    if (typeof window.gtag !== "function") return;

    window.gtag("event", eventName, Object.assign({
      event_category: EVENT_CATEGORY,
      site_area: "Public Site",
      page_name: pageName(),
      transport_type: "beacon"
    }, params));
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
    const linkText = cleanText(trigger.textContent || trigger.getAttribute("aria-label")) || "Request materials";
    const requestType = cleanText(trigger.dataset.requestType) || "General inquiry";
    const sourceArea = cleanText(trigger.dataset.sourceArea) || linkRole(trigger);
    const params = {
      link_text: linkText,
      request_type: requestType,
      source_area: sourceArea,
      destination: TALLY_FORM_URL
    };

    track("request_materials_clicked", params);

    loadTallyWidget()
      .then(function () {
        if (!window.Tally || typeof window.Tally.openPopup !== "function") {
          window.location.href = TALLY_FORM_URL;
          return;
        }

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
          },
          onClose: function () {
            track("request_materials_closed", params);
          },
          onSubmit: function () {
            track("request_materials_submitted", params);
          }
        });
      })
      .catch(function () {
        window.location.href = TALLY_FORM_URL;
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
    const material = materialForHref(href, text);
    const eventName = eventForHref(href);
    const params = {
      link_text: text || material,
      material: material,
      link_role: linkRole(link),
      destination: href.startsWith("mailto:") ? "mailto:hello@norynthe.com" : href
    };

    track(eventName, params);

    if (eventName === "public_material_opened" && material !== "Main Site" && !safeSessionGet(FIRST_MATERIAL_KEY)) {
      safeSessionSet(FIRST_MATERIAL_KEY, material);
      track("first_public_material_opened", params);
    }
  });
}());
