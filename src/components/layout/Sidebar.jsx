import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { subscribeToTwitchStatus } from "../../services/twitchStatusService";

const menuItems = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/squad", label: "Játékoskeret", icon: "♟" },
  { to: "/seasons", label: "Szezonok", icon: "▣" },
  { to: "/calendar", label: "Naptár", icon: "◫" },
  { to: "/voting", label: "Szavazások", icon: "✓" },
  { to: "/benefits", label: "Benefit Tracker", icon: "★" },
  { to: "/statistics", label: "Statisztikák", icon: "↗" },
  { to: "/stream-overlay", label: "Élő közvetítés", icon: "●" },
  { to: "/tactics", label: "Taktikák", icon: "◇", linkedPlayerOnly: true },
  { to: "/settings", label: "Beállítások", icon: "⚙", adminOnly: true },
  { to: "/lineup", label: "Kezdő 11", icon: "⚽", adminOnly: true },
  { to: "/matchday-xi", label: "Matchday XI", icon: "🏆", playerOnly: true },
  { to: "/users", label: "Felhasználók", icon: "♙", adminOnly: true },
];

function Sidebar({ open, onClose }) {
  const { isAdmin, profile } = useAuth();
  const [twitchStatus, setTwitchStatus] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeToTwitchStatus(setTwitchStatus);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);

    return () => {
      unsubscribe();
      window.clearInterval(clock);
    };
  }, []);

  const checkedAt = Date.parse(twitchStatus?.checkedAt || "");
  const isTwitchLive = Boolean(
    twitchStatus?.isLive && Number.isFinite(checkedAt) && now - checkedAt < 180_000,
  );
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.linkedPlayerOnly) return isAdmin || Boolean(profile?.playerId);
    if (item.playerOnly) return !isAdmin;
    return true;
  });

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/assets/brand/bod-crest-v3.png" alt="Ball of Duty címer" />
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
              className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.to === "/stream-overlay" && isTwitchLive && (
                <span className="nav-live-badge">
                  <span className="nav-live-dot" />
                  LIVE
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && (
        <button className="sidebar-backdrop" type="button" onClick={onClose} aria-label="Menü bezárása" />
      )}
    </>
  );
}

export default Sidebar;
