import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App Error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", background: "#f8fafc",
        fontFamily: "sans-serif", padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: "#1e293b", marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: "#64748b", marginBottom: 24, maxWidth: 400 }}>
          An unexpected error occurred. Please refresh the page to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 28px", background: "#6366f1", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 15, cursor: "pointer",
          }}
        >
          Refresh Page
        </button>
        {process.env.NODE_ENV === "development" && (
          <pre style={{
            marginTop: 24, padding: 16, background: "#fef2f2", color: "#dc2626",
            borderRadius: 8, fontSize: 12, maxWidth: 600, overflowX: "auto",
            textAlign: "left", whiteSpace: "pre-wrap",
          }}>
            {this.state.error?.toString()}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
