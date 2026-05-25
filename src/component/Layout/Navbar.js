
// ─── Navbar.jsx ───────────────────────────────────
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate, useLocation } from "react-router-dom";
import useOnlineStatus from "../../hooks/useOnlineStatus";

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();


  return (
    <nav
      className="flex items-center justify-between">
      {/* Left — hamburger + nav links */}
      <div className="tottle_btn desktop_btn">
        <button onClick={toggleSidebar} >
          <MenuIcon fontSize="small" />
        </button>
      </div>

      {/* Right — user */}
      <div className="flex items-center gap-3">
        {isOnline ? (
          <span style={{
            background: "#22c55e",
            color: "white",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold"
          }}>
            🟢 Online
          </span>
        ) : (
          <span style={{
            background: "#ef4444",
            color: "white",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold"
          }}>
            🔴 Offline
          </span>
        )}
        <div className="usermile">
          <AccountCircleIcon />
          <span>CBC Restro</span>
        </div>
        <button className="p-1.5 rounded-xl hover:bg-white/10 transition text-white/50">
          <MoreVertIcon fontSize="small" />
        </button>
        <div className="tottle_btn mobile_btn">
          <button onClick={toggleSidebar} >
            <MenuIcon fontSize="small" />
          </button>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;