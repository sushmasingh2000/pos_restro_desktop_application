// Check karo electron hai ya nahi
const isElectronApp = navigator.userAgent.toLowerCase().includes('electron');

export const domain = isElectronApp
  ? 'http://localhost:9047'      // ✅ Electron app — local backend
  : 'https://cbc.ferryinfotech.in'; // ✅ Browser — remote

export const frontend = domain; 
export const rupees = "₹";