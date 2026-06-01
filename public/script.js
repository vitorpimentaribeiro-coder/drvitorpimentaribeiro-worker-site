const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const year = document.querySelector("[data-year]");
const ga4MeasurementId = window.DIGITAL_PRESENCE_GA4_ID || document.documentElement.dataset.ga4Id || "";

if (/^G-[A-Z0-9]+$/i.test(ga4MeasurementId) && !window.__digitalPresenceGa4Loaded) {
  window.__digitalPresenceGa4Loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", ga4MeasurementId, {
    anonymize_ip: true,
    send_page_view: true
  });

  const ga4Script = document.createElement("script");
  ga4Script.async = true;
  ga4Script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`;
  document.head.appendChild(ga4Script);
}

const trackAdministrativeAction = (eventName, element) => {
  const href = element?.getAttribute?.("href") || "";
  const payload = {
    event_category: "administrative_contact",
    event_label: element?.textContent?.trim().slice(0, 80) || element?.getAttribute?.("aria-label") || eventName,
    page_path: window.location.pathname,
    destination_url: href,
    conversion_action: eventName
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

document.querySelectorAll("[data-load-map]").forEach((button) => {
  button.addEventListener("click", () => {
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
    shell.replaceWith(iframe);
    trackAdministrativeAction("map_embed_load", button);
  });
});

document.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", () => {
    const href = link.getAttribute("href") || "";

    if (href.startsWith("https://wa.me/")) {
      trackAdministrativeAction("whatsapp_click", link);
    } else if (href.startsWith("tel:")) {
      trackAdministrativeAction("phone_click", link);
    } else if (href.includes("google.com/maps")) {
      trackAdministrativeAction("route_click", link);
    }
  });
});
