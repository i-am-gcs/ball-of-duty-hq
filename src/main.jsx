import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";

import "./styles/dashboard.css";
import "./styles/squad.css";
import "./styles/voting.css";
import "./styles/benefit-tracker.css";
import "./styles/statistics.css";
import "./styles/settings.css";
import "./styles/seasons.css";
import "./styles/matches.css";

import "./styles/responsive.css";
import "./styles/theme.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
