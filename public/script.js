const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const year = document.querySelector("[data-year]");
const ga4MeasurementId = window.DIGITAL_PRESENCE_GA4_ID || document.documentElement.dataset.ga4Id || "";
const gtmContainerId = window.DIGITAL_PRESENCE_GTM_ID || document.documentElement.dataset.gtmId || "";
const observedSections = new Set();
const observedScrollDepths = new Set();
const analyticsSearchParams = new URLSearchParams(window.location.search);
const analyticsDebugMode = analyticsSearchParams.has("codexAnalyticsDebug");
const analyticsInternalMode = Array.from(analyticsSearchParams.keys()).some((key) => key.toLowerCase().startsWith("codex"));
const analyticsInternalTrafficParams = analyticsInternalMode ? { traffic_type: "internal" } : {};
const analyticsAttributionParams = {
  utm_source: analyticsSearchParams.get("utm_source") || "",
  utm_medium: analyticsSearchParams.get("utm_medium") || "",
  utm_campaign: analyticsSearchParams.get("utm_campaign") || "",
  utm_content: analyticsSearchParams.get("utm_content") || "",
  entry_source: analyticsSearchParams.get("source") || analyticsSearchParams.get("origem") || ""
};
const compactAnalyticsAttributionParams = Object.fromEntries(
  Object.entries(analyticsAttributionParams).filter(([, value]) => value)
);

const getText = (element, fallback = "") => (
  element?.textContent?.trim().replace(/\s+/g, " ").slice(0, 90)
  || element?.getAttribute?.("aria-label")?.slice(0, 90)
  || fallback
);

const getPageType = () => {
  const path = window.location.pathname.replace(/\/index\.html$/, "/");

  if (path === "/" || path === "/index.html") {
    return "home";
  }

  if (path.includes("consulta-cardiologica")) {
    return "consulta_cardiologica";
  }

  if (path.includes("eletrocardiograma")) {
    return "eletrocardiograma";
  }

  if (path.includes("mapa-24h")) {
    return "mapa_24h";
  }

  if (path.includes("holter-24h")) {
    return "holter_24h";
  }

  if (path.includes("agendar")) {
    return "agendamento_gbp";
  }

  if (path.includes("sobre-dr-vitor")) {
    return "sobre";
  }

  if (path.includes("servicos")) {
    return "servicos";
  }

  if (path.includes("privacidade")) {
    return "privacidade";
  }

  return "site_page";
};

const getSectionContext = (element) => {
  const section = element?.closest?.("section, article, header, footer, nav");

  if (!section) {
    return {
      section_id: "page",
      section_label: "Pagina",
      section_type: "page"
    };
  }

  const heading = section.querySelector("h1, h2, h3");

  return {
    section_id: section.id || section.getAttribute("aria-label") || section.className?.toString().split(" ")[0] || section.tagName.toLowerCase(),
    section_label: getText(heading, section.getAttribute("aria-label") || section.tagName.toLowerCase()),
    section_type: section.tagName.toLowerCase()
  };
};

const sanitizeUrl = (href) => {
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, window.location.href);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return href.split("?")[0].split("#")[0];
  }
};

const getLinkMeta = (link) => {
  const rawHref = link?.getAttribute?.("href") || "";
  const sanitized = sanitizeUrl(rawHref);
  const hasHref = rawHref.length > 0;
  let parsedUrl;

  try {
    if (!hasHref) {
      throw new Error("missing href");
    }

    parsedUrl = new URL(rawHref, window.location.href);
  } catch {
    parsedUrl = null;
  }

  const isWhatsapp = parsedUrl?.hostname === "wa.me" || parsedUrl?.hostname.endsWith(".whatsapp.com");
  const isPhone = rawHref.startsWith("tel:");
  const isRoute = Boolean(parsedUrl?.hostname.includes("google.") && parsedUrl?.pathname.includes("/maps"));
  const isInternal = parsedUrl ? parsedUrl.hostname === window.location.hostname : rawHref.startsWith("#") || rawHref.startsWith("/");
  const isServiceInterest = Boolean(link?.closest?.(".service-card, .service-card-link, .service-detail-card"));

  return {
    link_url: sanitized,
    link_domain: parsedUrl?.hostname || "",
    link_path: parsedUrl?.pathname || "",
    link_text: getText(link, "link"),
    isWhatsapp,
    isPhone,
    isRoute,
    isInternal: hasHref ? isInternal : false,
    isServiceInterest
  };
};

const getClickBucket = (event) => {
  const doc = document.documentElement;
  const width = Math.max(doc.scrollWidth, window.innerWidth || 1);
  const height = Math.max(doc.scrollHeight, window.innerHeight || 1);
  const x = Math.max(0, Math.min(100, Math.round(((event.pageX || 0) / width) * 10) * 10));
  const y = Math.max(0, Math.min(100, Math.round(((event.pageY || 0) / height) * 10) * 10));

  return {
    click_x_bucket: x,
    click_y_bucket: y,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight
  };
};

const writeAnalyticsDebugEvent = (eventName, payload) => {
  if (!analyticsDebugMode) {
    return;
  }

  let events = [];

  try {
    events = JSON.parse(document.documentElement.dataset.analyticsEvents || "[]");
  } catch {
    events = [];
  }

  events.push({ eventName, payload });
  document.documentElement.dataset.analyticsEvents = JSON.stringify(events.slice(-50));
};

let requestGa4ScriptLoad = () => {};

const sendAnalyticsEvent = (eventName, payload = {}) => {
  const eventPayload = {
    event_version: "medical_local_presence_v2",
    page_path: window.location.pathname || "/",
    page_type: getPageType(),
    page_title: document.title,
    ...analyticsInternalTrafficParams,
    ...compactAnalyticsAttributionParams,
    ...payload
  };

  writeAnalyticsDebugEvent(eventName, eventPayload);

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, eventPayload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...eventPayload });
};

if (/^G-[A-Z0-9]+$/i.test(ga4MeasurementId) && !window.__digitalPresenceGa4Loaded) {
  window.__digitalPresenceGa4Loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", ga4MeasurementId, {
    anonymize_ip: true,
    send_page_view: true,
    ...analyticsInternalTrafficParams
  });

  requestGa4ScriptLoad = () => {
    if (window.__digitalPresenceGa4ScriptRequested) {
      return;
    }

    window.__digitalPresenceGa4ScriptRequested = true;

    const ga4Script = document.createElement("script");
    ga4Script.async = true;
    ga4Script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`;
    document.head.appendChild(ga4Script);
  };

  const scheduleGa4ScriptLoad = () => {
    const loadAfterInitialRender = () => window.setTimeout(requestGa4ScriptLoad, 3500);

    if (document.readyState === "complete") {
      loadAfterInitialRender();
    } else {
      window.addEventListener("load", loadAfterInitialRender, { once: true });
    }

    window.addEventListener("pointerdown", requestGa4ScriptLoad, { once: true, passive: true });
    window.addEventListener("touchstart", requestGa4ScriptLoad, { once: true, passive: true });
    window.addEventListener("scroll", requestGa4ScriptLoad, { once: true, passive: true });
    window.addEventListener("keydown", requestGa4ScriptLoad, { once: true });
  };

  scheduleGa4ScriptLoad();
}

if (/^GTM-[A-Z0-9]+$/i.test(gtmContainerId) && !window.__digitalPresenceGtmLoaded) {
  window.__digitalPresenceGtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js"
  });

  const gtmScript = document.createElement("script");
  gtmScript.async = true;
  gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmContainerId)}`;
  document.head.appendChild(gtmScript);
}

if (getPageType() === "agendamento_gbp") {
  sendAnalyticsEvent("gbp_booking_landing_view", {
    event_category: "acquisition",
    event_label: "Agendamento via Perfil da Empresa",
    funnel_step: "booking_landing",
    source_channel: "google_business_profile"
  });
}

const trackAdministrativeAction = (eventName, element, event = null) => {
  const linkMeta = getLinkMeta(element);
  const sectionContext = getSectionContext(element);
  const clickBucket = event ? getClickBucket(event) : {};
  const contactMethod = eventName.replace("_click", "").replace("map_embed_load", "map");
  const payload = {
    event_category: "administrative_contact",
    event_label: linkMeta.link_text || eventName,
    conversion_action: eventName,
    contact_method: contactMethod,
    funnel_step: "contact_intent",
    ...sectionContext,
    ...linkMeta,
    ...clickBucket
  };

  sendAnalyticsEvent(eventName, payload);
  sendAnalyticsEvent("lead_intent", payload);
};

if (year) {
  year.textContent = new Date().getFullYear();
}

const closeMenu = () => {
  document.body.classList.remove("nav-open");
  nav?.classList.remove("is-open");
  menuButton?.setAttribute("aria-expanded", "false");
};

menuButton?.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  nav?.classList.toggle("is-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  sendAnalyticsEvent(isOpen ? "menu_open" : "menu_close", {
    event_category: "navigation",
    event_label: isOpen ? "Abrir menu" : "Fechar menu",
    funnel_step: "navigation"
  });
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

window.addEventListener("scroll", () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}, { passive: true });

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const trackSectionView = (target) => {
  const context = getSectionContext(target);
  const key = `${context.section_id}:${context.section_label}`;

  if (observedSections.has(key)) {
    return;
  }

  observedSections.add(key);
  sendAnalyticsEvent("section_view", {
    event_category: "engagement",
    event_label: context.section_label,
    funnel_step: "section_view",
    ...context
  });
};

const sectionTargets = document.querySelectorAll("section, article.service-detail-card, footer.site-footer");

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        trackSectionView(entry.target);
        sectionObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.42 });

  sectionTargets.forEach((section) => sectionObserver.observe(section));
} else {
  sectionTargets.forEach(trackSectionView);
}

const trackScrollDepth = () => {
  const doc = document.documentElement;
  const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
  const currentDepth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));

  [25, 50, 75, 90].forEach((depth) => {
    if (currentDepth >= depth && !observedScrollDepths.has(depth)) {
      observedScrollDepths.add(depth);
      sendAnalyticsEvent("scroll_depth", {
        event_category: "engagement",
        event_label: `${depth}%`,
        funnel_step: "scroll_depth",
        scroll_depth: depth
      });
    }
  });
};

trackScrollDepth();
window.addEventListener("scroll", trackScrollDepth, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

document.querySelectorAll("[data-load-map]").forEach((button) => {
  button.addEventListener("click", (event) => {
    const shell = button.closest("[data-map-shell]");
    const src = button.getAttribute("data-map-src");

    if (!shell || !src) {
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.title = "Mapa do consultório do Dr. Vitor Pimenta Ribeiro";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.src = src;
    trackAdministrativeAction("map_embed_load", button, event);
    shell.replaceWith(iframe);
  });
});

document.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const linkMeta = getLinkMeta(link);
    const sectionContext = getSectionContext(link);
    const clickBucket = getClickBucket(event);
    const basePayload = {
      event_category: "navigation",
      event_label: linkMeta.link_text,
      funnel_step: "click",
      ...sectionContext,
      ...linkMeta,
      ...clickBucket
    };

    if (analyticsDebugMode && (linkMeta.isWhatsapp || linkMeta.isPhone || linkMeta.isRoute)) {
      event.preventDefault();
    }

    if (link.closest("[data-nav]")) {
      sendAnalyticsEvent("navigation_click", {
        ...basePayload,
        funnel_step: "navigation"
      });
    }

    if (
      link.classList.contains("button")
      || link.classList.contains("nav-cta")
      || link.classList.contains("floating-whatsapp")
      || link.closest(".contact-list")
    ) {
      sendAnalyticsEvent("cta_click", {
        ...basePayload,
        event_category: "call_to_action",
        funnel_step: "cta_click"
      });
    }

    if (linkMeta.isServiceInterest) {
      sendAnalyticsEvent("service_interest_click", {
        ...basePayload,
        event_category: "service_interest",
        funnel_step: "service_interest"
      });
    }

    if (linkMeta.isWhatsapp) {
      trackAdministrativeAction("whatsapp_click", link, event);
    } else if (linkMeta.isPhone) {
      trackAdministrativeAction("phone_click", link, event);
    } else if (linkMeta.isRoute) {
      trackAdministrativeAction("route_click", link, event);
    }
  });
});
