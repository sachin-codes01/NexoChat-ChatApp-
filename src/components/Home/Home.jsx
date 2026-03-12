import { useState, useEffect } from "react";
import "./Home.css";
import InstagramIcon from '@mui/icons-material/Instagram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useNavigate } from "react-router-dom";

import img1 from "../images/img1.jpg";
import img2 from "../images/img2.jpg";
import img3 from "../images/img3.jpg";

const features = [
  { icon: "⚡", title: "Instant Messaging", desc: "Real-time delivery with zero lag. Messages appear the moment they are sent." },
  { icon: "🔒", title: "End-to-End Encrypted", desc: "Every message stays completely private and secure between you and the recipient." },
  { icon: "📁", title: "File Sharing", desc: "Send photos, videos, and documents effortlessly with in-app preview." },
  { icon: "👥", title: "Group Channels", desc: "Create dedicated spaces for your teams, topics, or friend groups." },
];

const reviews = [
  { name: "Alex Morgan", role: "Product Designer", text: "NexoChat is the cleanest chat app I have used. Love the speed and simplicity.", stars: 5, avatar: "AM" },
  { name: "Priya Sharma", role: "Software Engineer", text: "Fast, reliable, and the UI just feels right. Our team switched and never looked back.", stars: 5, avatar: "PS" },
  { name: "James Okafor", role: "Startup Founder", text: "File sharing and group channels work flawlessly. Highly recommend it to any team.", stars: 5, avatar: "JO" },
  { name: "Luna Chen", role: "Freelance Writer", text: "Clean, modern and personal. Every conversation is an absolute pleasure.", stars: 4, avatar: "LC" },
  { name: "Marco Ricci", role: "UX Researcher", text: "Simple but powerful. No bloat, no confusion - just great fast messaging.", stars: 5, avatar: "MR" },
  { name: "Fatima Al-Amin", role: "Digital Marketer", text: "Read receipts and status updates made my client communication so much easier.", stars: 5, avatar: "FA" },
];

const steps = [
  { num: "01", title: "Create an Account", desc: "Sign up in seconds. No credit card needed, no setup headaches.", img: img1 },
  { num: "02", title: "Find Your People", desc: "Search for friends or invite teammates and connect instantly.", img: img2 },
  { num: "03", title: "Start Chatting", desc: "Send messages, share files, react, and collaborate in real time.", img: img3 },
];

const socialLinks = [
  { Icon: InstagramIcon, label: "Instagram", href: "https://www.instagram.com/sachin_28022005?igsh=MTNtY2kzaTlqaDl6cw==", color: "#E1306C" },
  { Icon: WhatsAppIcon, label: "WhatsApp", href: "#", color: "#25D366" },
  { Icon: FacebookIcon, label: "Facebook", href: "#", color: "#1877F2" },
  { Icon: LinkedInIcon, label: "LinkedIn", href: "https://www.linkedin.com/in/sachin-kumar-b814683a9", color: "#0A66C2" },
  { Icon: GitHubIcon, label: "GitHub", href: "https://github.com/sachin-codes01", color: "#333333" },
];

function Stars({ count }) {
  return (
    <div className="stars">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < count ? "star star--filled" : "star"}>★</span>
      ))}
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="page">

      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}>
        <div className="navbar__logo">
          <span className="navbar__logo-icon brand-logo__icon">💬</span>
          NexoChat
        </div>
        <div className="navbar__links">
          <a href="#how">How It Works</a>
          <a href="#features">Features</a>
          <a href="#reviews">Reviews</a>
        </div>
        <div className="navbar__actions">
          <button className="btn btn--ghost" onClick={() => navigate('/Login')}>Login</button>
          <button className="btn btn--primary" onClick={() => navigate('/Register')}>Sign Up Free</button>
        </div>
        <button className="navbar__burger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-menu">
          <a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#reviews" onClick={() => setMenuOpen(false)}>Reviews</a>
          <div className="mobile-menu__actions">
            <button className="btn btn--ghost" onClick={() => navigate('/Login')}>Login</button>
            <button className="btn btn--primary" onClick={() => navigate('/Register')}>Sign Up Free</button>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="hero">
        <div className="container hero__inner">

          <div className="hero__badge-top">
            <span className="badge">✨ Modern Messaging Platform</span>
          </div>

          <div className="hero__text">
            <span className="badge hero__badge-desktop">✨ Modern Messaging Platform</span>
            <h1>Chat smarter.<br /><span className="hero__accent">Connect faster.</span></h1>
            <p className="hero__sub">
              Real-time messaging, encrypted channels, and seamless file sharing all in one beautifully simple app.
            </p>
            <div className="hero__stats">
              <div className="hero__stat">
                <strong>2M+</strong>
                <span>Active Users</span>
              </div>
              <div className="hero__stat-divider" />
              <div className="hero__stat">
                <strong>99.9%</strong>
                <span>Uptime</span>
              </div>
              <div className="hero__stat-divider" />
              <div className="hero__stat">
                <strong>&lt;50ms</strong>
                <span>Latency</span>
              </div>
            </div>
            <div className="hero__btns">
              <button className="btn btn--primary btn--lg" onClick={() => navigate('/Register')}>Get Started Free</button>
              <button className="btn btn--ghost btn--lg" onClick={() => navigate('/Login')}>Login to Account</button>
            </div>
          </div>

          <div className="hero__visuals">
            <div className="hero__img-card hero__img-card--1">
              <img src={img1} alt="User messaging" />
            </div>
            <div className="hero__img-card hero__img-card--2">
              <img src={img2} alt="User chatting" />
            </div>
            <div className="hero__img-card hero__img-card--3">
              <img src={img3} alt="User on laptop" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section bg-light" id="how">
        <div className="container">
          <div className="section__header">
            <span className="section__label">Simple Process</span>
            <h2 className="section__title">How NexoChat Works</h2>
            <p className="section__sub">Up and running in minutes with no learning curve required.</p>
          </div>
          <div className="steps">
            {steps.map((s, i) => (
              <div className="step-card" key={i}>
                <div className="step-card__img-wrap">
                  <img src={s.img} alt={s.title} />
                </div>
                <div className="step-card__body">
                  <span className="step-card__num">{s.num}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="container">
          <div className="section__header">
            <span className="section__label">What You Get</span>
            <h2 className="section__title color_change">Everything You Need</h2>
            <p className="section__sub">Powerful features packed into a clean, simple interface.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-card__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section bg-light" id="reviews">
        <div className="container">
          <div className="section__header">
            <span className="section__label">Loved Globally</span>
            <h2 className="section__title">What Our Users Say</h2>
            <p className="section__sub">Join over 2 million people who trust NexoChat every day.</p>
          </div>
          <div className="reviews-grid">
            {reviews.map((rv, i) => (
              <div className="review-card" key={i}>
                <Stars count={rv.stars} />
                <p className="review-card__text">"{rv.text}"</p>
                <div className="review-card__author">
                  <div className="review-card__avatar">{rv.avatar}</div>
                  <div>
                    <strong>{rv.name}</strong>
                    <span>{rv.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-section__inner">
          <h2>Ready to get started?</h2>
          <p>Free forever for personal use. No credit card required.</p>
          <button className="btn btn--primary btn--lg" onClick={() => navigate('/Register')}>Create Your Free Account →</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer__top">
            <div className="footer__brand">
              <div className="footer__logo">💬 NexoChat</div>
              <p>Modern messaging built for speed, privacy, and beautiful design.</p>
              <div className="footer__socials">
                {socialLinks.map(({ Icon, label, href, color }) => (
                  <a key={label} href={href} aria-label={label} className="social-icon"
                    style={{ "--brand-color": color }} rel="noopener noreferrer">
                    <Icon fontSize="small" />
                  </a>
                ))}
              </div>
            </div>

            <div className="footer__links">
              <div className="footer__col">
                <h4>Product</h4>
                <a href="#">Features</a>
                <a href="#">Pricing</a>
                <a href="#">Changelog</a>
                <a href="#">Roadmap</a>
              </div>
              <div className="footer__col">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Blog</a>
                <a href="#">Careers</a>
                <a href="#">Press</a>
              </div>
              <div className="footer__col">
                <h4>Support</h4>
                <a href="#">Help Center</a>
                <a href="#">Community</a>
                <a href="#">Contact</a>
                <a href="#">Status</a>
              </div>
            </div>

          </div>

          <div className="footer__bottom">
            <span>© 2026 NexoChat. All rights reserved.</span>
            <div className="footer__legal">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}