
// ─── Navbar.jsx ───────────────────────────────────
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate, useLocation } from "react-router-dom";

const PosTab = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: "DINE IN", path: "/userdashboard" },
    // { name: "TAKE AWAY", path: "/pos/take-away" },
    // { name: "DOOR DELIVERY", path: "/pos/delivery" },
    { name: "DOOR DELIVERY ORDERS", path: "/online-delivery-order" },
    { name: "OR SCAN ORDERS", path: "/qr-order" },
    
    { name: "ONLINE ORDERS", path: "/online-order" },
    { name: "PENDING ORDERS", path: "/pending-order" },
  ];

  return (
    <>
      <div className="flex gap-1 main_tabs">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={` ${isActive
                  ? "acive_tab "
                  : ""
                }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>
      {/* <div className="stats-bar">
        <div className="stat-cell">
          <div className="stat-icon">🪑</div>
          <div>
            <div class="stat-val">6</div>
            <div class="stat-lbl">Total Tables</div>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-icon">🔴</div>
          <div>
            <div class="stat-val">6</div>
            <div class="stat-lbl">Busy</div>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-icon">✅</div>
          <div>
            <div class="stat-val">10</div>
            <div class="stat-lbl">Available</div>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-icon">⏱️</div>
          <div>
            <div class="stat-val">1h 5m</div>
            <div class="stat-lbl">Longest Wait</div>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-icon">📊</div>
          <div>
            <div class="stat-val">83%</div>
            <div class="stat-lbl">Availability</div>
          </div>
        </div>
       
      </div> */}
    </>

  );
};
export default PosTab;