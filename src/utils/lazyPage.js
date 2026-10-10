import React, { lazy, Suspense } from "react";

const RELOAD_KEY = "chunk_reload_at";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const loadWithRetry = async (factory, tries = 3) => {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await factory();
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) await wait(400 * (i + 1));
    }
  }
  // Stale build: reload once (max once per 30s) to fetch the fresh chunks.
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (navigator.onLine && Date.now() - last > 30000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
      return new Promise(() => {}); // page is reloading
    }
  } catch (e) {
    /* storage unavailable - fall through to the error card */
  }
  throw lastErr;
};

export const PageLoader = () => (
  <div
    style={{
      minHeight: "50vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <style>{"@keyframes lp-spin{to{transform:rotate(360deg)}}"}</style>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: "3px solid rgba(128,128,128,0.25)",
        borderTopColor: "#8a4e22",
        animation: "lp-spin 0.8s linear infinite",
      }}
    />
  </div>
);

class PageErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          textAlign: "center",
          padding: 16,
        }}
      >
        <p style={{ margin: 0 }}>
          Page load nahi ho paya. Internet check karke dobara try karein.
        </p>
        <button
          className="update_btn"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
}

// lazyPage(() => import("./Page"))                      -> default export
// lazyPage(() => import("./Page"), "NamedExport")       -> named export
// lazyPage(() => import("./Page"), null, { preload: true })
//   preload: download the chunk in the background once the app is idle, so
//   opening that page later is instant.
export const lazyPage = (factory, exportName = null, { preload = false } = {}) => {
  const pick = exportName
    ? () => factory().then((m) => ({ default: m[exportName] }))
    : factory;

  const Lazy = lazy(() => loadWithRetry(pick));

  if (preload && typeof window !== "undefined") {
    const run = () => pick().catch(() => {});
    window.addEventListener("load", () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 5000 });
      else setTimeout(run, 3000);
    });
  }

  const Page = (props) => (
    <PageErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Lazy {...props} />
      </Suspense>
    </PageErrorBoundary>
  );
  return Page;
};
