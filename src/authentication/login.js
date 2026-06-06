import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { endpoint } from "../utils/APIRoutes";
import { apiConnectorPost } from "../utils/APIConnector";
import toast from "react-hot-toast";
import { FaUserAlt, FaLock, FaEye, FaEyeSlash, FaUserShield, FaUserCog } from "react-icons/fa";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import loginImg from '../assets/images/login/login-cover.svg';

const Login = ({ role }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── Reset form on tab switch ──────────────────────
  const switchTab = (tab) => {
    setUsername("");
    setPassword("");
    setShowPassword(false);
  };

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Email aur password daalo!");
      return;
    }
    setLoading(true);

    try {
      const res = await apiConnectorPost(endpoint?.login_api, {
        email: username,
        password: password,
      });
      if (!res?.data?.success) {
        toast.error(res?.data?.message || "Login failed");
        setLoading(false);
        return;
      }

      const user = res?.data?.result?.[0];
      if (user?.role !== role) {
        toast.error("Invalid credentials");
        setLoading(false);
        return;
      }


      const userRole = user?.role;
      // =========================
      // SAVE DATA
      // =========================
      localStorage.setItem("token", user?.token);
      localStorage.setItem("loginTime", Date.now().toString());
      // console.log("✅ fron mein save:", user?.token);

      localStorage.setItem("role", userRole);
      if (userRole === "business_owner") {
        localStorage.setItem("business", user?.business_id);
      }

      toast.success("Login successful");

      // =========================
      // NAVIGATION
      // =========================
      if (userRole === "master_admin") navigate("/masterdashboard");
      else if (userRole === "business_owner") navigate("/ownerdashboard");
      else if (userRole === "branch_admin") navigate("/admindashboard");
      else if (userRole === "staff") navigate("/userdashboard");

      // window.location.reload();

    } catch (e) {
      console.error("Login error:", e);
      toast.error("Server error, try again");
    }

    setLoading(false);
  };


  return (
    <section className="login_section">
      <Row className="main_row">
        <Col md={8} className="loin_img_box">
          <div className="loin_img">
            <h1>
              {role === "master_admin" && "Master Admin Login"}
              {role === "business_owner" && "Business Owner Login"}
              {role === "branch_admin" && "Branch Admin Login"}
              {role === "staff" && "Staff Login"}
            </h1>
            <img src={loginImg} alt="Login Illustration" />
          </div>
        </Col>

        <Col md={4} className="login_form_box">
          {/* ── Card ── */}
          <div className="login_card">
            {/* ── Header ── */}
            <div className="login_header">
              <h1>Ferry Restro</h1>
              <p>Restaurant Management System</p>
            </div>

            {/* ── Form ── */}
            <div className="px-8 pb-8 space-y-4">

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label>Email</label>
                <div className="relative login_input_box">
                  <FaUserAlt className="absolute left-0 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
                  <input
                    type="text"
                    placeholder="Enter your Email"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="login_input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label>Password</label>
                <div className="relative login_input_box">
                  <FaLock className="absolute left-0 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    className="login_input"

                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                  >
                    {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 mt-5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                style={{
                  background: "var(--primary-color)",
                  color: "#000",
                  boxShadow: loading ? "none" : "0 8px 25px #c5a37757",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>

                    Logging in...
                  </span>
                ) : (
                  <>
                    Login
                    <i className="fa-solid fa-arrow-right-long ms-2"></i>
                  </>
                )}
              </button>

            </div>

            {/* ── Footer ── */}
            <div class="divider">
              <div class="div-line"></div>
              <span class="div-text">© 2026 Ferry Restro Panel · All rights reserved</span>
              <div class="div-line"></div>
            </div>

          </div>
        </Col>
      </Row>
    </section>
  );
};

export default Login;