import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const titles = {
  "/dashboard": "Dashboard",
  "/squad": "Játékoskeret",
  "/profile": "Saját profilom",
  "/seasons": "Szezonok",
  "/calendar": "Naptár",
  "/voting": "Szavazások",
  "/benefits": "Benefit Tracker",
  "/lineup": "Kezdő 11",
  "/matchday-xi": "Matchday XI",
  "/statistics": "Statisztikák",
  "/matches": "Mérkőzések",
  "/users": "Felhasználók",
  "/settings": "Beállítások",
  "/stream-overlay": "Élő közvetítés",
};

function Header({ onMenuClick }) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const title = titles[location.pathname] ?? "Ball of Duty HQ";
  const displayName = user?.displayName || user?.email || "Csapattag";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
  }

  return (
    <header className="topbar">
      <button
        className="icon-button menu-button"
        type="button"
        onClick={onMenuClick}
        aria-label="Menü megnyitása"
      >
        ☰
      </button>

      <div>
        <p className="eyebrow">Ball of Duty HQ</p>
        <h1>{title}</h1>
      </div>

      <div className="profile-menu" ref={profileMenuRef}>
        <button
          type="button"
          className={`profile-trigger ${menuOpen ? "profile-trigger--open" : ""}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <div className="avatar">{initials}</div>

          <div className="profile-copy">
            <strong>{displayName}</strong>
            <span>{isAdmin ? "Admin" : "Játékos"}</span>
          </div>

          <span className={`profile-chevron ${menuOpen ? "profile-chevron--open" : ""}`}>
            ▾
          </span>
        </button>

        {menuOpen && (
          <div className="profile-dropdown" role="menu">
            <div className="profile-dropdown__identity">
              <div className="avatar">{initials}</div>

              <div>
                <strong>{displayName}</strong>
                <span>{isAdmin ? "Adminisztrátor" : "Játékos"}</span>
              </div>
            </div>

            <div className="profile-dropdown__divider" />

            <Link
              to="/profile"
              className="profile-dropdown__item"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              <span>👤</span>
              <div>
                <strong>Saját profil</strong>
                <small>Profiladatok és profilkép</small>
              </div>
            </Link>

            <div className="profile-dropdown__divider" />

            <button
              type="button"
              className="profile-dropdown__item profile-dropdown__logout"
              role="menuitem"
              onClick={handleLogout}
            >
              <span>🚪</span>
              <div>
                <strong>Kilépés</strong>
                <small>Kijelentkezés a HQ-ból</small>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
