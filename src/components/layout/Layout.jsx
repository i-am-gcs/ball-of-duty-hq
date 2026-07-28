import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <Header onMenuClick={() => setSidebarOpen((value) => !value)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
