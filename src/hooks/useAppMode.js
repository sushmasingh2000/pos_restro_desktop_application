import { useState, useEffect } from "react";
import { useQueryClient } from "react-query";
import { getAppMode, setAppMode, onAppModeChange } from "../utils/appMode";

const useAppMode = () => {
  const [appMode, setAppModeState] = useState(getAppMode());
  const [rawOnline, setRawOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

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

  // Mode switch hote hi poori app ka cached data (dashboard, orders, menu,
  // sab kuch) stale mark karke turant refetch karwao — warna offline mein
  // fetch hui purani/zero values online aane ke baad bhi screen pe atki
  // reh jaati hain jab tak page manually reload na ho.
  const startOfflineMode = () => {
    setAppMode("offline");
    queryClient.invalidateQueries();
  };
  const goOnlineMode = () => {
    setAppMode("online");
    queryClient.invalidateQueries();
  };

  return { appMode, rawOnline, startOfflineMode, goOnlineMode };
};

export default useAppMode;
