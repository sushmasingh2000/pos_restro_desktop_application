import axios from "axios";
import { frontend } from "../domain";

const isElectronApp = navigator.userAgent.toLowerCase().includes('electron');
const LIVE_DOMAIN = 'https://cbc.ferryinfotech.in';
const LOCAL_DOMAIN = 'http://localhost:9047';

const getActiveEndpoint = (endpoint) => {
  if (isElectronApp && !navigator.onLine) {
    return endpoint.replace(LIVE_DOMAIN, LOCAL_DOMAIN);
  }
  return endpoint;
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
