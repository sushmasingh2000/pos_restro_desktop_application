export const isTokenValid = () => {
  const token = localStorage.getItem("token");
  const loginTime = localStorage.getItem("loginTime");

  if (!token || !loginTime) return false;

  const satDin = 7 * 24 * 60 * 60 * 1000;
  const expired = (Date.now() - parseInt(loginTime)) > satDin;

  if (expired) {
    localStorage.clear();
    return false;
  }

  return true;
};