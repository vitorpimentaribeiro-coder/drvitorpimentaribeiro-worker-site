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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const legacyTarget = LEGACY_REDIRECTS.get(url.pathname);

    if (legacyTarget || shouldCanonicalize(url)) {
      return Response.redirect(canonicalUrl(url, legacyTarget ?? url.pathname).toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
