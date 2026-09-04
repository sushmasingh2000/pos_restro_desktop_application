
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import StoreIcon from "@mui/icons-material/Store";
import { GraphicEqSharp, Logout, Money, PeopleAlt } from "@mui/icons-material";
import UserProfileMenu from "../UserProfileMenu";
import { apiConnectorGet, apiConnectorPost } from "../../utils/APIConnector";
import { endpoint } from "../../utils/APIRoutes";

export default function Sidebar() {
  const navigate = useNavigate();
  const { data: branchProfileData } = useQuery(
    ["sidebar_branch_profile"],
    () => apiConnectorGet(endpoint.branch_profile_api),
    { refetchOnWindowFocus: false, retry: false, staleTime: 30 * 60 * 1000 }
  );
  const features = branchProfileData?.data?.result?.features || {};

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  }
  const role = localStorage.getItem("role");
  return (
    <aside className="main_sidebar w-64 h-screen sticky top-0 overflow-y-auto  text-white relative">
      <div className="sidebar_logo">
        <div className="logo_icon">
          <i className="ri-send-plane-line"></i>
        </div>
        <div>
          <h1>Ferry Restro</h1>
          <p>Restaurant Technology partner</p>
        </div>
      </div>

      {/* LINKS */}
      <ul className="space-y-3 relative z-10 sidebar_links">
        <SidebarLink to="/userdashboard" icon={<DashboardIcon fontSize="small" />} label="Dashboard" />
        <SidebarLink to="/all-orders" icon={<GraphicEqSharp fontSize="small" />} label="All Orders" />
        <SidebarLink to="/sales-summary" icon={<AssessmentIcon fontSize="small" />} label="Sales Summary" />
        <SidebarLink to="/payment-summary" icon={<Money fontSize="small" />} label="Payment Summary" />
        <SidebarLink to="/dine-in-order" icon={<LiveTvIcon fontSize="small" />} label="Dine In Orders" />
        {features.table_order && (
          <SidebarLink to="/take-away-order" icon={<StoreIcon fontSize="small" />} label="Takeaway" />
        )}
        {features.door_delivery && (
          <SidebarLink to="/door-dilevery-order" icon={<StoreIcon fontSize="small" />} label="Door Delivery" />
        )}
        <SidebarLink to="/lending-order" icon={<PeopleAlt fontSize="small" />} label="Lending Orders" />
        <SidebarLink to="/customer-ledger" icon={<LiveTvIcon fontSize="small" />} label="Customer Wallet" />
        <SidebarLink to="/customer-report" icon={<LiveTvIcon fontSize="small" />} label="Customer Report" />
        <SidebarLink to="/expense-report" icon={<LiveTvIcon fontSize="small" />} label="Expense Report" />
        <SidebarLink to="/cancelled-order" icon={<PeopleAlt fontSize="small" />} label="Cancelled Orders" />
     
        <SidebarLink to="/feedback" icon={<AssessmentIcon fontSize="small" />} label="Feedback" />
        <SidebarLink to="/support-tickets" icon={<AssessmentIcon fontSize="small" />} label="Support Tickets" />

      </ul>

      
      <div className="email_sidebar">
        <UserProfileMenu
          apiGet={apiConnectorGet}
          apiPost={apiConnectorPost}
          profileEndpoint={endpoint.user_profile_api}
          changePasswordEndpoint={endpoint.change_password_api}
        />
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