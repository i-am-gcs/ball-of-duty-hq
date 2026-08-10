import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const authErrors = {
  "auth/email-already-in-use": "Ehhez az e-mail-címhez már tartozik fiók.",
  "auth/invalid-credential": "Hibás e-mail-cím vagy jelszó.",
  "auth/invalid-email": "Az e-mail-cím formátuma nem megfelelő.",
  "auth/weak-password": "A jelszó legyen legalább 6 karakter hosszú.",
  "auth/too-many-requests": "Túl sok próbálkozás történt. Próbáld újra később.",
};

function Login() {
  const { user, login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (mode === "register" && !form.displayName.trim()) {
      setError("Add meg a megjelenítendő nevedet.");
      return;
    }
    if (mode === "register" && form.password !== form.confirmPassword) {
      setError("A két jelszó nem egyezik.");
      return;
    }

    try {
      setSaving(true);
      if (mode === "register") {
        await register(form);
      } else {
        await login(form.email.trim(), form.password);
      }
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (authError) {
      console.error("Sikertelen hitelesítés:", authError);
      setError(authErrors[authError.code] || "Nem sikerült bejelentkezni. Próbáld újra.");
    } finally {
      setSaving(false);
    }
  }

  async function googleLogin() {
    try {
      setSaving(true);
      setError("");
      await loginWithGoogle();
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (authError) {
      console.error("Sikertelen Google-hitelesítés:", authError);
      if (authError.code !== "auth/popup-closed-by-user") {
        setError(authErrors[authError.code] || "Nem sikerült a Google-belépés. Próbáld újra.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><img className="brand-logo" src="/assets/brand/bod-crest-v3.png" alt="Ball of Duty címer" /><div><strong>Ball of Duty</strong><span>Club HQ</span></div></div>
        <p className="eyebrow">Csapattagoknak</p>
        <h1>{mode === "login" ? "Üdv újra a HQ-ban" : "Fiók létrehozása"}</h1>
        <p className="auth-intro">{mode === "login" ? "Jelentkezz be a klub belső felületére." : "Regisztrálj a játékosoknak szánt klubfelületre."}</p>

        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Bejelentkezés</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>Regisztráció</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && <label><span>Megjelenítendő név</span><input name="displayName" autoComplete="name" value={form.displayName} onChange={updateForm} /></label>}
          <label><span>E-mail-cím</span><input type="email" name="email" autoComplete="email" value={form.email} onChange={updateForm} required /></label>
          <label><span>Jelszó</span><input type="password" name="password" minLength="6" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={updateForm} required /></label>
          {mode === "register" && <label><span>Jelszó újra</span><input type="password" name="confirmPassword" minLength="6" autoComplete="new-password" value={form.confirmPassword} onChange={updateForm} required /></label>}
          {error && <p className="error-message auth-error">{error}</p>}
          <button className="button auth-submit" disabled={saving}>{saving ? "Dolgozunk..." : mode === "login" ? "Bejelentkezés" : "Regisztráció"}</button>
        </form>

        <div className="auth-divider"><span>vagy</span></div>
        <button type="button" className="google-button" onClick={googleLogin} disabled={saving}>
          <span className="google-mark" aria-hidden="true">G</span>
          Folytatás Google-lel
        </button>
      </section>
    </main>
  );
}

export default Login;
