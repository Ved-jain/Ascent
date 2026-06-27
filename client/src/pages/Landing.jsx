import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect } from 'react';
import './Landing.css';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, skip landing page and go to dashboard
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-left">
          <div className="logo-badge">EF</div>
          <span className="logo-text">Ascent</span>
          <div className="nav-links">
            <a href="#product">Product</a>
            <a href="#analytics">Analytics</a>
            <a href="#pricing">Pricing</a>
            <a href="#support">Support</a>
          </div>
        </div>
        <div className="nav-right">
          <a href="#about" className="nav-about">About</a>
          <Link to="/login" className="btn-login">Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="hero-left">
          <h1 className="hero-title">Reach Your Competitive Peak</h1>
          <p className="hero-subtitle">
            Ascent brings rating predictions, weakness analysis, upsolve tracking, and 
            competitive insights into one deeply analytical, elite workspace built for 
            serious Codeforces competitors.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-get-started">Get Started</Link>
            <a href="#learn-more" className="btn-learn-more">Learn More</a>
          </div>
        </div>

        <div className="hero-right">
          <div className="mock-widget">
            <div className="widget-tabs">
              <span className="active-tab">Overview</span>
              <span>Submissions</span>
              <span>Trends</span>
            </div>
            
            <div className="widget-content">
              <div className="widget-header">
                <span className="widget-label">LIVE TRACKING</span>
                <span className="widget-value-title">Current Rating</span>
              </div>
              <div className="widget-rating">1942</div>
            </div>

            <div className="widget-bar-container">
              <div className="widget-bar-fill"></div>
            </div>

            <div className="widget-metrics">
              <div className="metric-box">
                <span className="m-label">Predictor</span>
                <span className="m-val green">+28</span>
              </div>
              <div className="metric-box">
                <span className="m-label">Total Solved</span>
                <span className="m-val green">1,402</span>
              </div>
              <div className="metric-box">
                <span className="m-label">Rank</span>
                <span className="m-val purple">Candidate Master</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="landing-features">
        <div className="features-header">
          <span className="features-eyebrow">DESIGNED FOR CODERS</span>
          <h2 className="features-title">Less generic tracking. More actionable clarity.</h2>
          <p className="features-desc">
            Ascent keeps the useful parts of Codeforces but reshapes the experience around 
            understanding your weaknesses, growth trajectory, and consistency.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="f-indicator"></div>
            <h3>Mathematical Predictor</h3>
            <p>A pure-math, weighted moving average engine predicts your next rating drop or rise before you even register for the contest.</p>
          </div>
          <div className="feature-card">
            <div className="f-indicator"></div>
            <h3>Weakness Analysis</h3>
            <p>See exactly which topics are quietly tanking your rating by analyzing failure rates across dynamic programming, graphs, and math.</p>
          </div>
          <div className="feature-card">
            <div className="f-indicator"></div>
            <h3>Targeted Recommendations</h3>
            <p>Review personalized practice problems generated via Cosine Similarity, directly matching your exact skill level and weak points.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
