const PUBLISHED_URL = "https://orbit-crm-34.lovable.app";

const normalizeUrl = (value: string) => value.replace(/\/$/, "");

const isLocalhost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1";

export const getCanonicalAppUrl = () => {
  const currentOrigin = normalizeUrl(window.location.origin);

  if (isLocalhost(window.location.hostname)) {
    return currentOrigin;
  }

  return PUBLISHED_URL;
};

export const shouldRedirectToCanonicalApp = () => {
  if (isLocalhost(window.location.hostname)) {
    return false;
  }

  return normalizeUrl(window.location.origin) !== PUBLISHED_URL;
};

export const buildCanonicalUrl = (path = "/", search = "", hash = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getCanonicalAppUrl()}${normalizedPath}${search}${hash}`;
};