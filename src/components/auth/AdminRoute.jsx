import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function AdminRoute() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="auth-loading">Jogosultság ellenőrzése...</div>;
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default AdminRoute;
