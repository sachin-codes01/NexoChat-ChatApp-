import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, reload } from "firebase/auth";
import CircularProgress from "@mui/material/CircularProgress";
import "./Register.css";

import img1 from "../images/img1.jpg";
import img2 from "../images/img2.jpg";
import img3 from "../images/img3.jpg";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [focused, setFocused] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const navigate = useNavigate();

  //Validation
  const validateEmail = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const validateFields = (fields = ["name", "email", "password"]) => {
    const newErrors = {};
    if (fields.includes("name")) {
      const trimmed = name.trim();
      if (!trimmed) {
        newErrors.name = "Full name is required.";
      } else if (trimmed.length < 2) {
        newErrors.name = "Name must be at least 2 characters.";
      } else if (trimmed.length > 50) {
        newErrors.name = "Name must be 50 characters or fewer.";
      } else if (!/^[a-zA-Z\s'\-]+$/.test(trimmed)) {
        newErrors.name = "Name can only contain letters, spaces, hyphens, and apostrophes.";
      } else if (!/^[a-zA-Z'\-]/.test(trimmed)) {
        newErrors.name = "Name must start with a letter.";
      }
    }
    if (fields.includes("email")) {
      if (!email.trim()) newErrors.email = "Email address is required.";
      else if (!validateEmail(email)) newErrors.email = "Please enter a valid email address.";
    }
    if (fields.includes("password")) {
      if (!password) newErrors.password = "Password is required.";
      else if (password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    }
    return newErrors;
  };

  // Live single-field validation on blur
  const handleBlur = (field) => {
    setFocused(null);
    const fieldErrors = validateFields([field]);
    setErrors((prev) => ({
      ...prev,
      [field]: fieldErrors[field] || undefined,
    }));
  };

  //Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!isVerified) {
      setErrors((prev) => ({ ...prev, verify: "Please verify your email first." }));
      return;
    }
    await register();
  };

  const handleVerifyEmail = async () => {
    setServerError("");
    const fieldErrors = validateFields(["name", "email", "password"]);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setTempUser(user);
      await sendEmailVerification(user);

      const interval = setInterval(async () => {
        await reload(user);
        if (user.emailVerified) {
          clearInterval(interval);
          setIsVerified(true);
          setErrors({});
        }
      }, 3000);
    } catch (e) {
      const msg = mapFirebaseError(e.code);
      setErrors((prev) => ({ ...prev, email: msg }));
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    try {
      setLoading(true);
      await updateProfile(tempUser, { displayName: name });
      await setDoc(doc(db, "users", tempUser.uid), {
        name,
        email,
        uid: tempUser.uid,
        contacts: [],
      });
      navigate("/Login", { state: { email, password } });
    } catch (e) {
      setServerError(mapFirebaseError(e.code) || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Map Firebase error codes
  const mapFirebaseError = (code) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Try signing in.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  return (
    <div className="login-wrapper">
      {loading && (
        <div className="loading-overlay">
          <CircularProgress style={{ color: "#6C63FF" }} />
        </div>
      )}

      {/*LEFT PANEL*/}
      <div className="left-panel">
        <div className="blob blob-top-right" />
        <div className="blob blob-bottom-left" />
        <div className="blob blob-mid-left" />

        <div className="illustration-stack">
          <div className="card card-left">
            <img src={img1} alt="Man with smartphone" />
          </div>
          <div className="card card-center">
            <img src={img2} alt="Woman with phone" />
          </div>
          <div className="card card-right">
            <img src={img3} alt="Person with laptop" />
          </div>

          <div className="online-badge">
            <span className="online-dot" />
            <span>2,400+ users online</span>
          </div>
        </div>

        <div className="hero-text">
          <h1>Join the<br />Conversation.</h1>
          <p>
            Create your free account and start connecting with your team in real time.
          </p>
        </div>

        <div className="pagination-dots">
          <div className="dot" />
          <div className="dot dot-active" />
        </div>
      </div>

      {/*RIGHT PANEL*/}
      <div className="right-panel">

        {/* NexoChat Logo — links to Home */}
        <Link to="/" className="brand-logo">
          <span className="brand-logo__icon">💬</span>
          <span className="brand-logo__text">NexoChat</span>
        </Link>

        <div className="form-container">

          <div className="form-header">
            <p className="form-eyebrow">Get started</p>
            <h2 className="form-title">Create your account</h2>
            <p className="form-subtitle">
              Already have an account?{" "}
              <Link to="/Login" className="form-link">Sign in</Link>
            </p>
          </div>

          {serverError && (
            <div className="error-banner">
              <span className="error-banner-icon">⚠</span>
              {serverError}
            </div>
          )}

          <div className="fields">

            {/*Name */}
            <div className="field-group">
              <label className="field-label">FULL NAME</label>
              <input type="text" placeholder="John Doe" value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                onFocus={() => setFocused("name")} onBlur={() => handleBlur("name")}
                disabled={loading || isVerified}
                className={`field-input ${focused === "name" ? "field-input--focused" : ""} ${errors.name ? "field-input--error" : ""}`}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="field-group">
              <label className="field-label">EMAIL ADDRESS</label>
              <div className={`email-verify-wrapper ${errors.email ? "email-verify-wrapper--error" : ""}`}>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined, verify: undefined })); }}
                  onFocus={() => setFocused("email")} onBlur={() => handleBlur("email")}
                  disabled={loading || isVerified}
                  className={`field-input ${focused === "email" ? "field-input--focused" : ""} ${errors.email ? "field-input--error" : ""}`}
                />
                <button
                  type="button"
                  className={`verify-btn ${isVerified ? "verify-btn--verified" : ""}`}
                  onClick={handleVerifyEmail} disabled={loading || isVerified}
                >
                  {isVerified ? "✓ Verified" : "Verify"}
                </button>
              </div>
              {errors.email && <p className="field-error">{errors.email}</p>}
              {isVerified && <p className="field-success">✓ Email verified successfully!</p>}
              {!isVerified && !errors.email && tempUser && (
                <p className="field-info">📧 Check your inbox or spam and click the verification link.</p>
              )}
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label">PASSWORD</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                onFocus={() => setFocused("pass")} onBlur={() => handleBlur("password")}
                disabled={loading || isVerified}
                className={`field-input ${focused === "pass" ? "field-input--focused" : ""} ${errors.password ? "field-input--error" : ""}`}
              />
              {errors.password && <p className="field-error">{errors.password}</p>}

              {/* Password strength indicator */}
              {password && !errors.password && !isVerified && (
                <div className="password-strength">
                  <div className={`strength-bar strength-bar--${getPasswordStrength(password).level}`} />
                  <span className={`strength-label strength-label--${getPasswordStrength(password).level}`}>
                    {getPasswordStrength(password).label}
                  </span>
                </div>
              )}
            </div>

            {/* Verify*/}
            {errors.verify && <p className="field-error field-error--standalone">{errors.verify}</p>}

            {/* Submit */}
            <button
              type="button"
              className={`submit-btn ${loading ? "submit-btn--loading" : ""}`}
              onClick={handleSubmit}
              disabled={loading || !isVerified}
            >
              {loading ? (
                <><span className="spinner" /> Creating account...</>
              ) : (
                <>Create account <span className="btn-arrow">→</span></>
              )}
            </button>
          </div>

          <p className="form-footer">
            By signing up, you agree to our{" "}
            <a href="#" className="form-link">Terms of Service</a> 
          </p>
        </div>
      </div>
    </div>
  );
};

// Password strength helper
const getPasswordStrength = (pwd) => {
  if (pwd.length < 6) return { level: "weak", label: "Too short" };
  const strong = /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd) && pwd.length >= 10;
  const medium = (pwd.length >= 8 && /[A-Z]/.test(pwd)) || (pwd.length >= 8 && /[0-9]/.test(pwd));
  if (strong) return { level: "strong", label: "Strong" };
  if (medium) return { level: "medium", label: "Medium" };
  return { level: "weak", label: "Weak" };
};

export default Register;