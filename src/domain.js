// // Check karo electron hai ya nahi
// const isElectronApp = navigator.userAgent.toLowerCase().includes('electron');

// export const domain = isElectronApp
//   ? 'http://localhost:9047'      // ✅ Electron app — local backend
//   : 'https://cbc.ferryinfotech.in'; // ✅ Browser — remote

// export const frontend = domain; 
// export const rupees = "₹";


const isOnline = navigator.onLine;
const isElectron = navigator.userAgent.toLowerCase().includes('electron');

export const domain = isElectron
  ? (isOnline 
      ? 'https://cbc.ferryinfotech.in'  // Net hai → Live
      : 'http://localhost:9047')         // Net nahi → Local
  : 'https://cbc.ferryinfotech.in';     // Browser → Live

  // ? (isOnline 
  //     ? 'http://192.168.18.101:9047'  // Net hai → Live
  //     : 'http://192.168.18.101:9047')         // Net nahi → Local
  // : 'http://192.168.18.101:9047'; 

export const frontend = domain;
export const rupees = "₹";