import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth_context";
import { useCart } from "../lib/cart_context";

const links = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "About Us", to: "/about" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleSignOut() {
    try {
      await signOut();
      setSignOutError(false);
      closeMenu();
    } catch {
      setSignOutError(true);
    }
  }

  return (
    <>
      <div className="announcement-bar">
        <span>Yale spirit, made for every day</span>
        <span className="announcement-location">A New Haven shop · Est. 1975</span>
      </div>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Campus Customs home" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">CC</span>
          <span className="brand-copy">
            <strong>Campus Customs</strong>
            <small>YALE BULLDOG BLUE</small>
          </span>
        </Link>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={closeMenu}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="mobile-account-links">
            <Link className="mobile-cart-link" to="/cart" onClick={closeMenu}><ShoppingBag size={17} /><span>Cart</span><b>{itemCount}</b></Link>
            {user ? <><span className="mobile-user-greeting">Hi, {user.first_name}</span><button className="nav-link sign-out-link" type="button" onClick={() => void handleSignOut()}>Sign out</button>{signOutError && <span className="header-auth-error" role="status">Could not sign out. Try again.</span>}</> : <>
              <NavLink className="nav-link" to="/login" onClick={closeMenu}>Login</NavLink>
              <NavLink className="button button-small button-blue" to="/create-account" onClick={closeMenu}>Create Account</NavLink>
            </>}
          </div>
        </nav>

        <div className="header-actions">
          <Link className="header-cart-link" to="/cart" aria-label={`Shopping cart, ${itemCount} items`}><ShoppingBag size={19} /><span className="cart-count-badge">{itemCount}</span></Link>
          {user ? <><span className="header-user-greeting">Hi, {user.first_name}</span><button className="login-link sign-out-link" type="button" onClick={() => void handleSignOut()}>Sign out</button>{signOutError && <span className="header-auth-error" role="status">Could not sign out. Try again.</span>}</> : <>
            <Link className="login-link" to="/login">Login</Link>
            <Link className="button button-small button-blue" to="/create-account">Create Account</Link>
          </>}
        </div>
      </header>
    </>
  );
}
