import "animate.css";
import "aos/dist/aos.css";
import { Route, HashRouter as Router, Routes } from "react-router-dom";
import "../src/index.css";
import "./App.css";
import "./assets/css/style.css";
import "./assets/css/common.css";
import Login from "./authentication/login";
import { routes } from "./routes/Routes";
import { useEffect } from "react";
import { isTokenValid } from "./authentication/authexpiry";
import { Navigate } from "react-router-dom";
import { SubscriptionGuard } from "./component/pages/SubscriptionExpiredPage";
import SubscriptionExpiredPage from "./component/pages/SubscriptionExpiredPage";

const ProtectedRoute = ({ element }) => {
  if (!isTokenValid()) return <Navigate to="/" replace />;
  return <SubscriptionGuard>{element}</SubscriptionGuard>;
};

const App = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const branchToken = params.get("branch_token");
    if (branchToken) {
      localStorage.setItem("token", branchToken);
      localStorage.setItem("role", "branch_admin");
      window.history.replaceState({}, document.title, "/admindashboard");
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* ✅ Root pe token check */}
        <Route
          path="/"
          element={
            isTokenValid()
              ? <Navigate to="/userdashboard" replace />
              : <Login />
          }
        />

        {routes.map((route, i) => (
          <Route
            key={i}
            path={route.path}
            element={<ProtectedRoute element={route.element} />}
          />
        ))}

        {/* TEMP TEST — remove after preview */}
        <Route path="/test-expired" element={<SubscriptionExpiredPage sub={{ package_name: "Basic Plan", end_date: "2024-05-15", days_left: -5, status: "expired" }} isNoSub={false} />} />
        <Route path="/test-nosub" element={<SubscriptionExpiredPage sub={null} isNoSub={true} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;