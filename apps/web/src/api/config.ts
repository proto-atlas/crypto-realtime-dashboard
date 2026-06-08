const PRODUCTION_BFF_ORIGIN = "https://crypto-realtime-dashboard-bff.atlas-lab.workers.dev";
const PRODUCTION_PAGES_HOST = "crypto-realtime-dashboard.pages.dev";

export function getBffOrigin() {
  const origin = import.meta.env.VITE_BFF_ORIGIN?.trim() ?? "";

  return resolveBffOrigin(origin, readCurrentHost());
}

export function normalizeBffOrigin(origin: string) {
  const trimmedOrigin = origin.trim();

  if (trimmedOrigin === "") {
    return "";
  }

  return trimmedOrigin.replace(/\/+$/, "");
}

export function resolveBffOrigin(origin: string, currentHost: string) {
  const normalizedOrigin = normalizeBffOrigin(origin);

  if (normalizedOrigin !== "") {
    return normalizedOrigin;
  }

  if (isProductionPagesHost(currentHost)) {
    return PRODUCTION_BFF_ORIGIN;
  }

  return "";
}

function isProductionPagesHost(host: string) {
  return host === PRODUCTION_PAGES_HOST || host.endsWith(`.${PRODUCTION_PAGES_HOST}`);
}

function readCurrentHost() {
  if (typeof globalThis.location?.host !== "string") {
    return "";
  }

  return globalThis.location.host;
}
