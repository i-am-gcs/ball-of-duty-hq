import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function PlayerLinkedRoute() {
  const { isAdmin, profile, profileLoading } = useAuth();

  if (profileLoading) {
    return <div className="auth-loading">Játékosprofil ellenőrzése...</div>;
  }

  return isAdmin || profile?.playerId ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default PlayerLinkedRoute;
