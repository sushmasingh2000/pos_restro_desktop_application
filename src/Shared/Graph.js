import React, { useEffect } from "react";

const DrawChart = ({ symbol = "DOT" }) => {
  useEffect(() => {
    // Check if script is already loaded
    if (!document.getElementById("tradingview-widget-script")) {
      const script = document.createElement("script");
      script.id = "tradingview-widget-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        // Initialize TradingView widget after script loads
        if (window.TradingView) {
          new window.TradingView.widget({
            width: 1000,
            height: 300,
            symbol: symbol,
            interval: "D",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: "tradingview_2d7e4",
          });
        }
      };
    } else {
      // If script is already loaded, initialize immediately
      if (window.TradingView) {
        new window.TradingView.widget({
          width: 400,
          height: 300,
          symbol: symbol,
          interval: "D",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: "tradingview_2d7e4",
        });
      }
    }
  }, [symbol]);

  return (
    <div className="tradingview-widget-container">
      <div id="tradingview_2d7e4"></div>
    </div>
  );
};

export default DrawChart;