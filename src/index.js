const CANONICAL_HOST = "www.drvitorpimentaribeiro.com.br";
const APEX_HOST = "drvitorpimentaribeiro.com.br";

const LEGACY_REDIRECTS = new Map([
  ["/servicos.html", "/servicos"],
  ["/privacidade.html", "/privacidade"],
  ["/eletrocardiograma-nova-friburgo.html", "/eletrocardiograma-nova-friburgo"],
  ["/consulta-cardiologica-nova-friburgo.html", "/consulta-cardiologica-nova-friburgo"],
  ["/sobre-dr-vitor-pimenta-ribeiro.html", "/sobre-dr-vitor-pimenta-ribeiro"],
]);

function canonicalUrl(requestUrl, pathname = requestUrl.pathname) {
  const url = new URL(requestUrl);
  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  url.pathname = pathname;
  return url;
}

function shouldCanonicalize(url) {
  return url.hostname === APEX_HOST || url.hostname === CANONICAL_HOST && url.protocol !== "https:";
}

function applySecurityHeaders(headers) {
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), payment=(), usb=(), interest-cohort=()");
}

function applyCacheHeaders(headers, url, status) {
  if (status >= 400) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    return;
  }

  const extension = url.pathname.split(".").pop()?.toLowerCase() ?? "";
  const immutableExtensions = new Set(["avif", "webp", "jpg", "jpeg", "png", "svg", "ico"]);

  if (immutableExtensions.has(extension)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  if ((extension === "css" || extension === "js") && url.searchParams.has("v")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  if (extension === "css" || extension === "js") {
    headers.set("Cache-Control", "public, max-age=3600, must-revalidate");
    return;
  }

  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const legacyTarget = LEGACY_REDIRECTS.get(url.pathname);

    if (legacyTarget || shouldCanonicalize(url)) {
      return Response.redirect(canonicalUrl(url, legacyTarget ?? url.pathname).toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    applySecurityHeaders(headers);
    applyCacheHeaders(headers, url, response.status);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
