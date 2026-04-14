/**
 * Always use the current browser origin so the app works on any domain
 * (Lovable preview, published .lovable.app, Vercel, custom domain, localhost).
 */
export const getCanonicalAppUrl = () =>
  window.location.origin.replace(/\/$/, "");

export const buildCanonicalUrl = (path = "/", search = "", hash = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getCanonicalAppUrl()}${normalizedPath}${search}${hash}`;
};
