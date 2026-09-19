const getBusyDuration = (startTime) => {
  if (!startTime) return "0m 0s";

  const start = new Date(startTime);
  const now = new Date();

  // ❗ safety check (Invalid Date fix)
  if (isNaN(start.getTime())) return "0m 0s";

  const diff = now.getTime() - start.getTime();

  if (diff <= 0) return "0m 0s";

  const totalSec = Math.floor(diff / 1000);

  const hr = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;

  if (hr > 0) return `${hr}h ${min}m`;
  return `${min}m ${sec}s`;
};

// "Aaj" ki date device ke local timezone mein (YYYY-MM-DD). new Date().toISOString()
// UTC deta hai — India mein raat 12 se subah 5:30 tak wo kal ki date nikalta hai.
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default getBusyDuration;