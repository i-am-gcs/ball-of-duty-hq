import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";

import Matches from "./pages/Matches";
import Dashboard from "./pages/Dashboard";
import Squad from "./pages/Squad";
import Voting from "./pages/Voting";
import BenefitTracker from "./pages/BenefitTracker";
import Statistics from "./pages/Statistics";
import MatchDetails from "./pages/MatchDetails";
import Login from "./pages/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import ApprovalRoute from "./components/auth/ApprovalRoute";
import Users from "./pages/Users";
import MyProfile from "./pages/MyProfile";
import Calendar from "./pages/Calendar";
import Seasons from "./pages/Seasons";
import SeasonDetails from "./pages/SeasonDetails";
import LineupBuilder from "./pages/LineupBuilder";
import MatchdayXIPage from "./pages/MatchdayXIPage";

function App() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC
      ===================================================== */}

      <Route path="/login" element={<Login />} />

      {/* =====================================================
          AUTHENTICATED + APPROVED
      ===================================================== */}

      <Route element={<ProtectedRoute />}>
        <Route element={<ApprovalRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* =================================================
                GENERAL
            ================================================= */}

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/squad" element={<Squad />} />

            <Route path="/profile" element={<MyProfile />} />

            <Route path="/calendar" element={<Calendar />} />

            <Route path="/seasons" element={<Seasons />} />

            <Route path="/voting" element={<Voting />} />

            <Route path="/benefits" element={<BenefitTracker />} />

            <Route path="/statistics" element={<Statistics />} />

            <Route path="/matches" element={<Matches />} />

            <Route path="/matches/:matchId" element={<MatchDetails />} />

            <Route path="/seasons/:seasonId" element={<SeasonDetails />} />

            {/* =================================================
                MATCHDAY XI

                Minden jóváhagyott felhasználó számára
                elérhető.

                Admin közvetlen linkből is meg tudja nyitni,
                de nincs külön menüpontja hozzá.
            ================================================= */}

            <Route path="/matchday-xi" element={<MatchdayXIPage />} />

            {/* =================================================
                ADMIN ONLY
            ================================================= */}

            <Route element={<AdminRoute />}>
              {/* Kezdő 11 Builder */}
              <Route path="/lineup" element={<LineupBuilder />} />

              {/* Felhasználók kezelése */}
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* =====================================================
          FALLBACK
      ===================================================== */}

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
