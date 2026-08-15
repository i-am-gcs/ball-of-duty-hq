import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
const navigationItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: "▦",
  },
  {
    label: "Játékoskeret",
    path: "/squad",
    icon: "♟",
  },
  {
    label: "Szezonok",
    path: "/seasons",
    icon: "▣",
  },
  {
    label: "Mérkőzések",
    path: "/matches",
    icon: "⚔",
  },
  {
    label: "Szavazások",
    path: "/voting",
    icon: "✓",
  },
];

const menuItems = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/squad", label: "Játékoskeret", icon: "♟" },
  { to: "/seasons", label: "Szezonok", icon: "◫" },
  {
    to: "/calendar",
    label: "Naptár",
    icon: "▦",
  },
  { to: "/voting", label: "Szavazások", icon: "✓" },
  { to: "/benefits", label: "Benefit Tracker", icon: "★" },
  { to: "/statistics", label: "Statisztikák", icon: "⌁" },
  { to: "/users", label: "Felhasználók", icon: "♙", adminOnly: true },
  { to: "/settings", label: "Beállítások", icon: "⚙" },
];

function Sidebar({ open, onClose }) {
  const { isAdmin } = useAuth();
  const visibleMenuItems = menuItems.filter(
    (item) => (!item.adminOnly && item.to !== "/settings") || isAdmin,
  );
  return (
    <>
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand">
          <img
            className="brand-logo"
            src="/assets/brand/bod-crest-v3.png"
            alt="Ball of Duty címer"
          />
          <div>
            <strong>Ball of Duty</strong>
            <span>Club HQ</span>
          </div>
        </div>
        <nav className="navigation" aria-label="Fő navigáció">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link--active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="season-mini">
          <span>Aktív szezon</span>
          <strong>Ball of Duty III.</strong>
          <small>2026 / folyamatban</small>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          type="button"
          onClick={onClose}
          aria-label="Menü bezárása"
        />
      )}
    </>
  );
}

export default Sidebar;
