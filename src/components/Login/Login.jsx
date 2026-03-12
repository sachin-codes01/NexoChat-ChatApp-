import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, signOut } from "firebase/auth";
import CircularProgress from "@mui/material/CircularProgress";
import "./Login.css";

import img1 from "../images/img1.jpg";
import img2 from "../images/img2.jpg";
import img3 from "../images/img3.jpg";

const Login = () => {
  const location = useLocation();

  const [email, setEmail]       = useState(location.state?.email || "");
  const [password, setPassword] = useState(location.state?.password || "");
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError]       = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    await login();
  };

  const login = async () => {
    try {
      setLoading(true);
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Block unverified users — sign them out immediately and show a clear message
      if (!user.emailVerified) {
        await signOut(auth);
        setError("Your email is not verified yet. Please check your inbox and click the verification link before signing in.");
        return;
      }

      navigate("/Dashboard");
    } catch (e) {
      setError(mapFirebaseError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const mapFirebaseError = (code) => {
    switch (code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential": return "Incorrect email or password.";
      case "auth/invalid-email":      return "Please enter a valid email address.";
      case "auth/too-many-requests":  return "Too many attempts. Please wait a moment and try again.";
      case "auth/network-request-failed": return "Network error. Check your internet connection.";
      default:                        return "Something went wrong. Please try again.";
    }
  };

  return (
    <div className="login-wrapper">
      {loading && (
        <div className="loading-overlay">
          <CircularProgress style={{ color: "#6C63FF" }} />
        </div>
      )}

      {/* LEFT PANEL */}
      <div className="left-panel">
        <div className="blob blob-top-right" />
        <div className="blob blob-bottom-left" />
        <div className="blob blob-mid-left" />

        <div className="illustration-stack">
          <div className="card card-left"><img src={img1} alt="Man with smartphone" /></div>
          <div className="card card-center"><img src={img2} alt="Woman with phone" /></div>
          <div className="card card-right"><img src={img3} alt="Person with laptop" /></div>
          <div className="online-badge">
            <span className="online-dot" />
            <span>2,400+ users online</span>
          </div>
        </div>

        <div className="hero-text">
          <h1>Connect, Chat,<br />Collaborate.</h1>
          <p>Your workspace for real-time messaging and seamless team communication.</p>
        </div>

        <div className="pagination-dots">
          <div className="dot dot-active" />
          <div className="dot" />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <Link to="/" className="brand-logo">
          <span className="brand-logo__icon">💬</span>
          <span className="brand-logo__text">NexoChat</span>
        </Link>

        <div className="form-container">
          <div className="form-header">
            <p className="form-eyebrow">Welcome back</p>
            <h2 className="form-title">Sign in to your account</h2>
            <p className="form-subtitle">
              Don't have an account?{" "}
              <Link to="/Register" className="form-link">Register free</Link>
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="error-banner">
              <span className="error-banner-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="fields">
            <div className="field-group">
              <label className="field-label">EMAIL ADDRESS</label>
              <input
                type="email" placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                disabled={loading}
                className={`field-input ${focused === "email" ? "field-input--focused" : ""}`}
              />
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label className="field-label">PASSWORD</label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
              <input
                type="password" placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onFocus={() => setFocused("pass")} onBlur={() => setFocused(null)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                disabled={loading}
                className={`field-input ${focused === "pass" ? "field-input--focused" : ""}`}
              />
            </div>

            <div className="remember-row" onClick={() => setRememberMe((v) => !v)}>
              <div className={`checkbox ${rememberMe ? "checkbox--checked" : ""}`}>
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="remember-label">Remember me for 30 days</span>
            </div>

            <button
              className={`submit-btn ${loading ? "submit-btn--loading" : ""}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" /> Signing in...</>
                : <>Sign in <span className="btn-arrow">→</span></>
              }
            </button>
          </div>

          <p className="form-footer">
            By signing in, you agree to our{" "}
            <a href="#" className="form-link">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;