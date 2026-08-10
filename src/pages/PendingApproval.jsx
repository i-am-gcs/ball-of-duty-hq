import { useAuth } from "../contexts/AuthContext";

function PendingApproval() {
  const { profile, user, logout } = useAuth();
  const rejected = profile?.status === "rejected";

  return (
    <main className="auth-page">
      <section className="auth-card pending-card">
        <div className="auth-brand"><img className="brand-logo" src="/assets/brand/bod-crest-v3.png" alt="Ball of Duty címer" /><div><strong>Ball of Duty</strong><span>Club HQ</span></div></div>
        <p className="eyebrow">{rejected ? "Hozzáférés elutasítva" : "Jóváhagyásra vár"}</p>
        <h1>{rejected ? "A fiók nem kapott hozzáférést" : "Már majdnem bent vagy"}</h1>
        <p className="auth-intro">
          {rejected
            ? "A klub adminisztrátora nem hagyta jóvá ezt a fiókot. Ha ez tévedés, keresd a csapat vezetőjét."
            : "A regisztrációd sikeres. A klubfelület akkor nyílik meg, amikor az admin jóváhagyja a fiókodat."}
        </p>
        <div className="pending-user"><strong>{user?.displayName || "Új csapattag"}</strong><span>{user?.email}</span></div>
        <button type="button" className="button button--secondary auth-submit" onClick={logout}>Kijelentkezés</button>
      </section>
    </main>
  );
}

export default PendingApproval;
