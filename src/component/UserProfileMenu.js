import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// ── helpers ──────────────────────────────────────────────────────────
const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "U").toUpperCase();
};

const roleColor = {
  master_admin: "#7c3aed",
  business_owner: "#0891b2",
  branch_admin: "#1d4ed8",
  staff: "#16a34a",
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

// ── MyProfile Modal ───────────────────────────────────────────────────
const MyProfileModal = ({ show, onClose, profile, loading }) => {
  if (!show) return null;
  const initials = getInitials(profile?.name || "");
  const color = roleColor[profile?.role] || "#16a34a";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="Order_Details_modal w-full max-w-lg">
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">👤</div>
            <div><h2>My Profile</h2></div>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "76vh" }}>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="profile-spinner" />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="profile-avatar-lg" style={{ background: color }}>
                  {initials}
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg" style={{ color: "#185FA5" }}>
                    {profile?.name || "—"}
                  </h3>
                  <span className="profile-role-badge" style={{ background: color + "1a", color }}>
                    {profile?.role_display || "—"}
                  </span>
                </div>
              </div>

              <div className="profile-info-grid">
                <ProfileRow icon="ri-user-line" label="Full Name" value={profile?.name} />
                <ProfileRow icon="ri-mail-line" label="Email Address" value={profile?.email} />
                <ProfileRow icon="ri-phone-line" label="Mobile Number" value={profile?.phone || "Not set"} />
                <ProfileRow icon="ri-shield-user-line" label="Role" value={profile?.role_display} />
                <ProfileRow
                  icon="ri-radio-button-line"
                  label="Status"
                  value={
                    <span className={`profile-status-dot ${profile?.status === "active" ? "active" : "inactive"}`}>
                      <span className="dot" />
                      {profile?.status === "active" ? "Active" : "Inactive"}
                    </span>
                  }
                />
                <ProfileRow icon="ri-calendar-line" label="Joining Date" value={formatDate(profile?.joining_date)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfileRow = ({ icon, label, value }) => (
  <div className="profile-info-row">
    <div className="profile-info-label">
      <i className={icon} />
      <span>{label}</span>
    </div>
    <div className="profile-info-value">{value || "—"}</div>
  </div>
);

// ── ChangePassword Modal ──────────────────────────────────────────────
const ChangePasswordModal = ({ show, onClose, apiPost, changePasswordEndpoint }) => {
  const [form, setForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [show_, setShow_] = useState({ current: false, newPwd: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setForm({ current: "", newPwd: "", confirm: "" });
    setShow_({ current: false, newPwd: false, confirm: false });
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.current || !form.newPwd || !form.confirm) {
      toast.error("All fields are required");
      return;
    }
    if (form.newPwd.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (form.newPwd !== form.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost(changePasswordEndpoint, {
        current_password: form.current,
        new_password: form.newPwd,
      });
      if (res?.data?.success) {
        toast.success("Password changed successfully");
        handleClose();
      } else {
        toast.error(res?.data?.message || "Failed to change password");
      }
    } catch {
      toast.error("Server error, please try again");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const EyeBtn = ({ field }) => (
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      onClick={() => setShow_((p) => ({ ...p, [field]: !p[field] }))}
    >
      <i className={`ri-eye${show_[field] ? "-off" : ""}-line text-sm`} />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="Order_Details_modal w-full max-w-md">
        <div className="Order_Details_modal_header">
          <div className="flex items-center gap-3">
            <div className="modal_header_icon">🔑</div>
            <div><h2>Change Password</h2></div>
          </div>
          <button onClick={handleClose}>×</button>
        </div>

        <div className="p-6 space-y-4">
          {[
            { key: "current", label: "Current Password", placeholder: "Enter current password" },
            { key: "newPwd", label: "New Password", placeholder: "Min. 6 characters" },
            { key: "confirm", label: "Confirm New Password", placeholder: "Re-enter new password" },
          ].map(({ key, label, placeholder }) => (
            <div className="main_input" key={key}>
              <label>{label} <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={show_[key] ? "text" : "password"}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="pr-10"
                />
                <EyeBtn field={key} />
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button onClick={handleClose} className="update_btn flex-1" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="main_btn flex-1 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <><span className="profile-spinner-sm" />Updating...</>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main UserProfileMenu ──────────────────────────────────────────────
const UserProfileMenu = ({ apiGet, apiPost, profileEndpoint, changePasswordEndpoint }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const menuRef = useRef();

  const cachedName = localStorage.getItem("user_name") || "";
  const role = localStorage.getItem("role") || "staff";

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchProfile = async () => {
    if (profile) return;
    setProfileLoading(true);
    try {
      const res = await apiGet(profileEndpoint);
      if (res?.data?.success) {
        setProfile(res.data.result);
        if (res.data.result?.name) {
          localStorage.setItem("user_name", res.data.result.name);
        }
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenProfile = () => {
    setMenuOpen(false);
    fetchProfile();
    setShowProfile(true);
  };

  const handleOpenChangePwd = () => {
    setMenuOpen(false);
    setShowChangePwd(true);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const displayName = profile?.name || cachedName || role;
  const initials = getInitials(displayName);
  const color = roleColor[role] || "#16a34a";

  return (
    <>
      <div ref={menuRef} className="relative flex items-center gap-2">
          <div className="email_sidebar cursor-pointer"  onClick={() => setMenuOpen((p) => !p)}>
        <div className="ba_mails"> {initials}</div>
        <div>
          <h6> {displayName}</h6>
        </div>
      </div>

        <button
          className="profile-three-dot"
          onClick={() => setMenuOpen((p) => !p)}
          aria-label="Profile menu"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="7" cy="2.5" r="1.4" />
            <circle cx="7" cy="7" r="1.4" />
            <circle cx="7" cy="11.5" r="1.4" />
          </svg>
        </button>

        {menuOpen && (
          <div className="profile-dropdown">
            <div className="profile-dropdown-header">
              <div className="profile-avatar-xs" style={{ background: color }}>
                {initials}
              </div>
              <div>
                <div className="font-semibold text-sm text-black">{displayName}</div>
                <div className="text-xs" style={{ color: "#6b7280" }}>
                  {profile?.email || localStorage.getItem("user_email") || ""}
                </div>
              </div>
            </div>

            <div className="profile-dropdown-divider" />

            <button className="profile-dropdown-item" onClick={handleOpenProfile}>
              <i className="ri-user-3-line" />
              My Profile
            </button>
            <button className="profile-dropdown-item" onClick={handleOpenChangePwd}>
              <i className="ri-lock-password-line" />
              Change Password
            </button>

            <div className="profile-dropdown-divider" />

            <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
              <i className="ri-logout-box-r-line" />
              Logout
            </button>
          </div>
        )}
      </div>

      <MyProfileModal
        show={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        loading={profileLoading}
      />
      <ChangePasswordModal
        show={showChangePwd}
        onClose={() => setShowChangePwd(false)}
        apiPost={apiPost}
        changePasswordEndpoint={changePasswordEndpoint}
      />
    </>
  );
};

export default UserProfileMenu;
