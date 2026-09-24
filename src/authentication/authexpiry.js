export const isTokenValid = () => {
  const token = localStorage.getItem("token");
  const loginTime = localStorage.getItem("loginTime");

  if (!token || !loginTime) return false;

  // Backend ka login token ab 15 din ka hai (latest_backend/auth/index.js) —
  // yahan bhi 15 din hona chahiye, warna 7-15 din ke beech ye session ko
  // galat "expired" maan kar localStorage clear kar deta, chahe backend
  // token abhi bhi valid ho.
  const satDin = 15 * 24 * 60 * 60 * 1000;
  const expired = (Date.now() - parseInt(loginTime)) > satDin;

  if (expired) {
    localStorage.clear();
    return false;
  }

  return true;
};