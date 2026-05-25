import axios from "axios";
import toast from "react-hot-toast";
import { frontend } from "../domain";



export const apiConnectorGet = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      params: params,
    });
    // if (response?.data?.message === "Invalid token") {
    //   alert("Login in another device ", { id: 1 });
    //   localStorage.clear();
    //   window.location.href = `${frontend}`;
    //   return;
    // }
    return response;
  } catch (e) {
    return {
      msg: e?.message,
    };
  }
};
export const apiConnectorPost = async (endpoint, reqBody) => {
  try {
    const response = await axios?.post(
      endpoint,
      reqBody,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    // if (response?.data?.message === "Invalid token") {
    //   alert("Login in another device ", { id: 1 });
    //   localStorage.clear();
    //   window.location.href = `${frontend}`;
    //   return;
    // }
    return response;
  } catch (e) {
    return {
      msg: e?.message,
    };
  }
};