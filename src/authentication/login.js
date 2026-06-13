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

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Email and Password required");
      return;
    }
    setLoading(true);
    try {
      const res = await apiConnectorPost(endpoint.login_api, {
        email: username.trim(),
        password,
      });

      if (!res?.data?.success) {
        toast.error(res?.data?.message || "Login failed");
        return;
      }
      const user = res?.data?.result?.[0];
      if (!user) {
        toast.error("User not found");
        return;
      }
      if (user.role !== "staff") {
        toast.error("Only staff login is allowed");
        return;
      }
      localStorage.setItem("token", user.token);
      localStorage.setItem("role", "staff");
      localStorage.setItem("user_name", user?.name || "");
      localStorage.setItem("user_email", user?.email || "");
      localStorage.setItem("loginTime", Date.now().toString());
      toast.success("Login successful");
      navigate("/userdashboard");

    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Server error, try again");
    } finally {
      setLoading(false);
    }
  };


  return (
    <section className="login_section">
      <div className="container">
        <Col lg={9} className="mx-auto">
          <Row>
            <Col md={6} className="px-0 d-md-block d-none">
              <div className="loin_Left_Box">
                <div className="login_logo">
                  <div className="logo_icon">
                    <i class="ri-send-plane-line"></i>
                  </div>
                  <div>
                    <h1>Ferry Restro</h1>
                    <p>Restaurant Technology partner</p>
                  </div>
                </div>
                <h3>Manage your restaurant with confidence</h3>
                <p>One platform for orders, inventory, staff and sales — all in real time.</p>
                <ul>
                  <li>
                    <div class="feat-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B5D4F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                    </div>
                    Live order tracking
                  </li>
                  <li>
                    <div class="feat-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B5D4F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                    </div>
                    Sales &amp; revenue analytics
                  </li>
                  <li>
                    <div class="feat-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B5D4F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                    </div>
                    Inventory management
                  </li>
                  <li>
                    <div class="feat-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B5D4F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </div>
                    Table &amp; reservation control
                  </li>
                  <li>
                    <div class="feat-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B5D4F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    Staff management
                  </li>

                </ul>
                <div class="panel-footer">© 2026 Ferry Restro &nbsp;·&nbsp; admin@ferryrestro.in</div>
              </div>
            </Col>

            <Col md={6} className="px-md-0">
              {/* ── Card ── */}
              <div className="login_card">
                {/* ── Header ── */}
                <div className="login_header">
                  <h1>Welcome back</h1>
                  <p>Sign in to your branch account</p>
                </div>

                {/* ── Form ── */}
                <div className="space-y-4">

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label>Email address</label>
                    <div className="relative login_input_box">
                      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
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
                      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
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

                  <div class="row-between">
                    <label class="remember">
                      <input type="checkbox" id="remember" /> Remember me
                    </label>
                    <button class="forgot" type="button">Forgot password?</button>
                  </div>

                  {/* Login Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="login-btn w-full disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
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
                        <i class="ri-contract-right-line"></i>
                        Sign in
                      </>
                    )}
                  </button>

                  <div class="divider">or continue with</div>

                  {/* ── Footer ── */}
                  <button class="google-btn" type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Sign in with Google
                  </button>
                  <div class="signup-row">Don't have an account? <a href="#">Contact your admin</a></div>
                </div>

              </div>
            </Col>
          </Row>
        </Col>
      </div>
    </section>
  );
};

export default Login;