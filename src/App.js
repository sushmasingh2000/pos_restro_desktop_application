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
import QrMenuPage from "./component/pages/QRMenu";

const App = () => {

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const branchToken = params.get("branch_token");

    if (branchToken) {
      console.log("Branch Token मिला:", branchToken);
                
      // ✅ overwrite correct token
      localStorage.setItem("token", branchToken);
      localStorage.setItem("role", "branch_admin");

      // ✅ URL clean kar do (important)
      window.history.replaceState({}, document.title, "/admindashboard");
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/menu/:token" element={<QrMenuPage />} />
        <Route path="/" element={<Login role="staff" />} />
        {
          // user ? (
          routes.map((route, i) => (
            <Route key={i} path={route.path} element={route.element} />
          ))
          // ) : (
          //   <Route path="*" element={<Dashboard />} />
          // )
        }

      </Routes>
    </Router>
  );
};

export default App;
