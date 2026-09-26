import { ArrowLeft, ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAccount, login } from "../lib/api";
import { useAuth } from "../lib/auth_context";

type AccountFormProps = {
  mode: "login" | "create";
};

export function AccountPage({ mode }: AccountFormProps) {
  const create = mode === "create";
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"error" | "info" | "success">("error");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setSubmitting(true);

    try {
      const account = create
        ? await createAccount({
            first_name: String(form.get("first_name") ?? "").trim(),
            last_name: String(form.get("last_name") ?? "").trim(),
            email,
            password,
            confirm_password: String(form.get("confirm_password") ?? ""),
          })
        : await login({ email, password });
      setUser(account);
      setNoticeType("success");
      setNotice(create ? "Your account is ready. Welcome to Campus Customs." : "You’re signed in.");
      navigate("/", { replace: true });
    } catch (error) {
      setNoticeType("error");
      setNotice(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="account-page page-shell">
      <div className="account-card">
        <div className="account-card-side">
          <Link to="/" className="account-back"><ArrowLeft size={15} /> Back to the shop</Link>
          <div className="account-side-art"><span className="account-side-y">Y</span><span>YALE<br />BULLDOG<br />BLUE</span></div>
          <div className="account-side-copy"><span className="eyebrow">CAMPUS CUSTOMS</span><p>A familiar favorite is just around the corner.</p></div>
        </div>
        <div className="account-form-wrap">
          <span className="eyebrow">{create ? "JOIN THE CAMPUS CUSTOMS COMMUNITY" : "WELCOME BACK"}</span>
          <h1>{create ? "Create your account." : "Good to see you."}</h1>
          <p className="account-subtitle">{create ? "Keep your campus favorites close." : "Sign in to pick up where you left off."}</p>
          <form className="account-form" onSubmit={handleSubmit}>
            {create && <div className="account-name-row">
              <label><span>First name</span><div className="input-with-icon"><UserRound size={17} /><input name="first_name" autoComplete="given-name" placeholder="First name" maxLength={100} required /></div></label>
              <label><span>Last name</span><div className="input-with-icon"><input name="last_name" autoComplete="family-name" placeholder="Last name" maxLength={100} required /></div></label>
            </div>}
            <label><span>Email address</span><div className="input-with-icon"><Mail size={17} /><input type="email" name="email" autoComplete="email" placeholder="you@example.com" required /></div></label>
            <label><span>Password</span><div className="input-with-icon"><LockKeyhole size={17} /><input type="password" name="password" autoComplete={create ? "new-password" : "current-password"} placeholder="At least 8 characters" minLength={8} required /></div></label>
            {create && <label><span>Confirm password</span><div className="input-with-icon"><LockKeyhole size={17} /><input type="password" name="confirm_password" autoComplete="new-password" placeholder="Enter your password again" minLength={8} required /></div></label>}
            {!create && <button className="forgot-link" type="button" onClick={() => { setNoticeType("info"); setNotice("Password reset is not available yet. Contact the shop for help with your account."); }}>Forgot password?</button>}
            <button className="button button-blue account-submit" type="submit" disabled={submitting}>{submitting ? "Please wait…" : create ? "Create account" : "Sign in"}<ArrowRight size={17} /></button>
          </form>
          {notice && <p className={`form-notice ${noticeType}`} role={noticeType === "error" ? "alert" : "status"}>{notice}</p>}
          <p className="account-switch">{create ? "Already have an account?" : "New to Campus Customs?"} <Link to={create ? "/login" : "/create-account"}>{create ? "Sign in" : "Create an account"}</Link></p>
          <p className="account-legal">By continuing, you agree to the shop’s terms and privacy practices.</p>
        </div>
      </div>
    </main>
  );
}
