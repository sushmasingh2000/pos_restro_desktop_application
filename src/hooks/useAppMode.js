import { useState, useEffect } from "react";
import { getAppMode, setAppMode, onAppModeChange } from "../utils/appMode";

const useAppMode = () => {
  const [appMode, setAppModeState] = useState(getAppMode());
  const [rawOnline, setRawOnline] = useState(navigator.onLine);

  useEffect(() => {
    const offModeChange = onAppModeChange((mode) => setAppModeState(mode));
    const handleOnline = () => setRawOnline(true);
    const handleOffline = () => setRawOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      offModeChange();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const startOfflineMode = () => setAppMode("offline");
  const goOnlineMode = () => setAppMode("online");

  return { appMode, rawOnline, startOfflineMode, goOnlineMode };
};

export default useAppMode;
