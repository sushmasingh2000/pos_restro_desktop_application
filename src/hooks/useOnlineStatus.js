// import { useState, useEffect } from "react";

// const useOnlineStatus = () => {
//   const [isOnline, setIsOnline] = useState(navigator.onLine);

//   useEffect(() => {
//     const handleOnline = () => setIsOnline(true);
//     const handleOffline = () => setIsOnline(false);

//     window.addEventListener("online", handleOnline);
//     window.addEventListener("offline", handleOffline);

//     return () => {
//       window.removeEventListener("online", handleOnline);
//       window.removeEventListener("offline", handleOffline);
//     };
//   }, []);

//   return isOnline;
// };

// export default useOnlineStatus;

import { useState, useEffect } from "react";

const isElectronApp = navigator.userAgent.toLowerCase().includes('electron');

const getDomain = (isOnline) => {
  if (isElectronApp) {
    return isOnline
      ? 'https://cbc.ferryinfotech.in'  // Net hai → Live
      : 'http://localhost:9047';         // Net nahi → Local
  }
  return 'https://cbc.ferryinfotech.in'; // Browser → Live
};

const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [domain, setDomain] = useState(getDomain(navigator.onLine));

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDomain(getDomain(true));
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDomain(getDomain(false));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, domain };
};

export default useOnlineStatus;