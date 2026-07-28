import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Squad from "./pages/Squad";
import Seasons from "./pages/Seasons";
import Voting from "./pages/Voting";
import BenefitTracker from "./pages/BenefitTracker";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/squad" element={<Squad />} />
        <Route path="/seasons" element={<Seasons />} />
        <Route path="/voting" element={<Voting />} />
        <Route path="/benefits" element={<BenefitTracker />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
