import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const titles = {
  "/dashboard": "Dashboard",
  "/squad": "Játékoskeret",
  "/profile": "Saját profilom",
  "/seasons": "Szezonok",
  "/voting": "Szavazások",
  "/benefits": "Benefit Tracker",
  "/statistics": "Statisztikák",
  "/settings": "Beállítások",
  "/users": "Felhasználók",
};

function Header({ onMenuClick }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const title = titles[location.pathname] ?? "Ball of Duty HQ";
  const displayName = user?.displayName || user?.email || "Csapattag";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <button className="icon-button menu-button" type="button" onClick={onMenuClick} aria-label="Menü megnyitása">
        ☰
      </button>
      <div>
        <p className="eyebrow">Ball of Duty HQ</p>
        <h1>{title}</h1>
      </div>
      <div className="profile-box">
        <div className="avatar">{initials}</div>
        <div className="profile-copy">
          <strong>{displayName}</strong>
          <span>{isAdmin ? "Admin" : "Játékos"}</span>
        </div>
        <button type="button" className="logout-button" onClick={logout}>Kilépés</button>
      </div>
    </header>
  );
}

export default Header;
