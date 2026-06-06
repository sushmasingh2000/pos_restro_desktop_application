
import { NavLink, useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import StoreIcon from "@mui/icons-material/Store";
import { GraphicEqSharp, Logout, Money, PeopleAlt } from "@mui/icons-material";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  }
  const role = localStorage.getItem("role");
  return (
    <aside className="main_sidebar w-64 h-screen sticky top-0 overflow-y-auto  text-white relative">
      <div className="mb-8 flex items-center gap-3 logo_sidebar">
        <img src="../assets/images/logo/logo.png" alt="Logo" />
        <div>
          <h3 className="text-lg font-bold">CBC Restro Panel</h3>
          {/* <p className="text-xs text-white/50">Welcome, {role.replace("_", " ").toUpperCase()}</p> */}
        </div>
      </div>

      {/* LINKS */}
      <ul className="space-y-3 relative z-10 sidebar_links">
        <SidebarLink to="/userdashboard" icon={<DashboardIcon fontSize="small" />} label="Dashboard" />
        <SidebarLink to="/all-orders" icon={<GraphicEqSharp fontSize="small" />} label="All Orders" />
        <SidebarLink to="/sales-summary" icon={<AssessmentIcon fontSize="small" />} label="Sales Summary" />
        <SidebarLink to="/payment-summary" icon={<Money fontSize="small" />} label="Payment Summary" />
        <SidebarLink to="/dine-in-order" icon={<LiveTvIcon fontSize="small" />} label="Dine In Orders" />
        <SidebarLink to="/lending-order" icon={<PeopleAlt fontSize="small" />} label="Lending Orders" />
        <SidebarLink to="/customer-ledger" icon={<LiveTvIcon fontSize="small" />} label="Customer Wallet" />
        <SidebarLink to="/customer-report" icon={<LiveTvIcon fontSize="small" />} label="Customer Report" />
        <SidebarLink to="/expense-report" icon={<LiveTvIcon fontSize="small" />} label="Expense Report" />
        <SidebarLink to="/take-away-order" icon={<PeopleAlt fontSize="small" />} label="Take Away Orders" />
        <SidebarLink to="/door-dilevery-order" icon={<StoreIcon fontSize="small" />} label="Door Delivery" />
        <SidebarLink to="/cancelled-order" icon={<PeopleAlt fontSize="small" />} label="Cancelled Orders" />
        <SidebarLink to="/kitchen-order" icon={<LiveTvIcon fontSize="small" />} label="Kitchen Orders" />

      </ul>

      {/* LOGOUT */}
      <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
        <li>
          <button onClick={handleLogout} className="w-full text-left">
            <div className="group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all backdrop-blur-md border bg-red-500/10 text-red-400 border-red-400/20 hover:bg-red-500/20">

              <span className="text-red-400 group-hover:text-red-500">
                <Logout fontSize="small" />
              </span>

              <span>Logout</span>
            </div>
          </button>
        </li>
      </div>

    </aside>
  );
}


function SidebarLink({ to, icon, label, danger, small = false }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex items-center 
    
              ${isActive
            ? "bg-white !text-black"
            : "bg-white/5 hover:bg-white/15"
          }
    
              ${small ? " " : ""}`
        }
      >
        {icon && <span className="opacity-90">{icon}</span>}
        <span className="truncate">{label}</span>
      </NavLink>
    </li>
  );
}