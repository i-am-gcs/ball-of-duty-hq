import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
