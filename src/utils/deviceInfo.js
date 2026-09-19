// Desktop app ka device ID/naam — login ke saath server ko bhejte hain taaki
// "Login Sessions" mein pata chale kaun sa computer login hai.
// Computer ka naam Electron se milta hai (logout par localStorage clear hone se
// bhi nahi mitta); purane build/browser mein random ID localStorage se.
const KEY = "device_id";

export const getDeviceCredentials = async () => {
  try {
    const info = await window.electronAPI?.getDeviceInfo?.();
    if (info?.hostname) {
      return {
        device_id: `app-${info.hostname}`.slice(0, 64),
        device_name: `Desktop App · ${info.hostname}`,
      };
    }
  } catch {}

  let id = null;
  try {
    id = localStorage.getItem(KEY);
    if (!id) {
      id = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(KEY, id);
    }
  } catch {}
  return { device_id: id };
};
