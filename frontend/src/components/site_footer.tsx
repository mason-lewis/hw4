import { ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-block">
          <Link className="brand brand-light" to="/">
            <span className="brand-mark" aria-hidden="true">CC</span>
            <span className="brand-copy">
              <strong>Campus Customs</strong>
              <small>YALE BULLDOG BLUE</small>
            </span>
          </Link>
          <p>Campus favorites and everyday layers, picked with Bulldog pride.</p>
        </div>
        <div className="footer-nav">
          <span className="footer-label">Explore</span>
          <Link to="/products">Shop all products</Link>
          <Link to="/about">Our story</Link>
          <Link to="/login">Your account</Link>
        </div>
        <div className="footer-visit">
          <span className="footer-label">Find us in New Haven</span>
          <p><MapPin size={16} /> 57 Broadway<br /><span>New Haven, CT 06511</span></p>
          <a href="https://maps.google.com/?q=57+Broadway+New+Haven+CT" target="_blank" rel="noreferrer">
            Get directions <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Campus Customs</span>
        <span>Made for the days that bring us together.</span>
      </div>
    </footer>
  );
}
