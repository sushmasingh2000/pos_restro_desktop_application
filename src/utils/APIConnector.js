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

export const apiConnectorGet = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(getActiveEndpoint(endpoint), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      params: params,
    });
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
        },
      }
    );
    return response;
  } catch (e) {
    return {
      msg: e?.message,
    };
  }
};
