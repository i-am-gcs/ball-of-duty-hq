import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PendingApproval from "../../pages/PendingApproval";

function ApprovalRoute() {
  const { isApproved, profileLoading } = useAuth();
  if (profileLoading) return <div className="auth-loading">Profil ellenőrzése...</div>;
  return isApproved ? <Outlet /> : <PendingApproval />;
}

export default ApprovalRoute;
