// Manual online/offline mode — staff explicitly switches, nothing auto-switches silently.
const MODE_KEY = "app_mode"; // 'online' | 'offline'
const MODE_EVENT = "appmodechange";

export const getAppMode = () => localStorage.getItem(MODE_KEY) || "online";

export const setAppMode = (mode) => {
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: mode }));
};

export const onAppModeChange = (callback) => {
  const handler = (e) => callback(e.detail);
  window.addEventListener(MODE_EVENT, handler);
  return () => window.removeEventListener(MODE_EVENT, handler);
};
