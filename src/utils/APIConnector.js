import axios from "axios";
import { frontend } from "../domain";
import { getAppMode } from "./appMode";

const LIVE_DOMAIN = 'https://cbc.ferryinfotech.in';
const LOCAL_DOMAIN = 'http://localhost:9047';

// Routing now follows the manually-set app mode (staff switches it explicitly
// via the banner/button), not the raw navigator.onLine signal — avoids silent
// switching when the network flickers.
const getActiveEndpoint = (endpoint) => {
  if (getAppMode() === "offline") {
    return endpoint.replace(LIVE_DOMAIN, LOCAL_DOMAIN);
  }
  return endpoint;
};

// After an online login, tell the local backend in the background so it can
// build its offline cache (menu/tables/customers/offline_users). Fire-and-forget —
// nothing waits on this, so login isn't blocked even if the local backend is down.
export const cacheLoginLocally = (endpoint, reqBody) => {
  if (getAppMode() !== "online" || !endpoint.includes('/api/v1/login')) return;
  const localEndpoint = endpoint.replace(LIVE_DOMAIN, LOCAL_DOMAIN);
  axios.post(localEndpoint, reqBody, { timeout: 8000 }).catch(() => {});
};

// Har baar "Start Offline Order" dabane se pehle local backend ko fresh
// cache-pull karne ko kehte hain (live se latest active orders/items/bills/
// menu/tables khinch kar SQLite mein bhar deta hai) — isliye ye hamesha
// LOCAL_DOMAIN pe seedha jaata hai, appMode se independent.
export const triggerLocalCacheNow = async () => {
  try {
    await axios.post(`${LOCAL_DOMAIN}/api/v1/cache-now`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      timeout: 15000,
    });
    return true;
  } catch (e) {
    return false;
  }
};

// Live backend rejects a stale/other-device token with a 201 + "Invalid token"
// body (not a 401), so axios doesn't throw — check the body and send the user
// back to login. Panel runs from file:// with HashRouter, so "/" won't work;
// use the hash route. Skipped in offline mode (local backend has its own auth).
let redirectingToLogin = false;
const handleInvalidToken = (response) => {
  if (response?.data?.message !== "Invalid token") return false;
  if (getAppMode() === "offline") return false;
  if (!redirectingToLogin) {
    redirectingToLogin = true;
    const mode = localStorage.getItem("app_mode");
    localStorage.clear();
    sessionStorage.clear();
    if (mode) localStorage.setItem("app_mode", mode);
    window.location.hash = "#/";
    window.location.reload();
  }
  return true;
};

export const apiConnectorGet = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(getActiveEndpoint(endpoint), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-force-offline": getAppMode() === "offline" ? "true" : "false",
      },
      params: params,
    });
    if (handleInvalidToken(response)) return;
    return response;
  } catch (e) {
    return {
      msg: e?.message,
    };
  }
};

export const apiConnectorPost = async (endpoint, reqBody) => {
  try {
    const response = await axios.post(
      getActiveEndpoint(endpoint),
      reqBody,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-force-offline": getAppMode() === "offline" ? "true" : "false",
        },
      }
    );
    if (handleInvalidToken(response)) return;
    return response;
  } catch (e) {
    return {
      msg: e?.message,
    };
  }
};
