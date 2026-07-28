import { useLocation } from "react-router-dom";

const titles = {
  "/dashboard": "Dashboard",
  "/squad": "Játékoskeret",
  "/seasons": "Szezonok",
  "/voting": "Szavazások",
  "/benefits": "Benefit Tracker",
  "/statistics": "Statisztikák",
  "/settings": "Beállítások"
};

function Header({ onMenuClick }) {
  const location = useLocation();
  const title = titles[location.pathname] ?? "Ball of Duty HQ";

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
        <div className="avatar">GC</div>
        <div className="profile-copy">
          <strong>IamGCS</strong>
          <span>Club Manager</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
