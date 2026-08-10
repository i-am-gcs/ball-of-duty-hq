import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { getPlayer, updatePlayer } from "../services/playerService";
import { uploadPlayerAvatar } from "../services/avatarService";
import { useAuth } from "../contexts/AuthContext";

const editableFields = ["eaId", "discordName", "preferredFoot", "secondaryPositions", "bio"];

function MyProfile() {
  const { profile } = useAuth();
  const [player, setPlayer] = useState(null);
  const [form, setForm] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.playerId) {
      setLoading(false);
      return;
    }
    getPlayer(profile.playerId)
      .then((data) => {
        setPlayer(data);
        setForm({
          eaId: data?.eaId || "",
          discordName: data?.discordName || "",
          preferredFoot: data?.preferredFoot || "Jobb",
          secondaryPositions: (data?.secondaryPositions || []).join(", "),
          bio: data?.bio || "",
        });
      })
      .catch(() => setError("Nem sikerult betolteni a jatekosprofilodat."))
      .finally(() => setLoading(false));
  }, [profile?.playerId]);

  function selectAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function submit(event) {
    event.preventDefault();
    if (!player || !form) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const changes = {
        eaId: form.eaId.trim(),
        discordName: form.discordName.trim(),
        preferredFoot: form.preferredFoot,
        secondaryPositions: form.secondaryPositions.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean),
        bio: form.bio.trim(),
      };
      if (avatarFile) Object.assign(changes, await uploadPlayerAvatar(player.id, avatarFile));
      await updatePlayer(player.id, changes);
      const updated = { ...player, ...changes };
      setPlayer(updated);
      setAvatarFile(null);
      setPreviewUrl(null);
      setMessage("A profilodat sikeresen mentettuk.");
    } catch (submitError) {
      setError(submitError.message || "Nem sikerult menteni a profilodat.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="panel crud-state">Profil betoltese...</section>;
  if (!profile?.playerId) return <div className="page-stack"><PageHeader eyebrow="My profile" title="Sajat profilom" description="A profilod meg nincs jatekoshoz rendelve." /><section className="panel crud-state">Kerj egy admint, hogy hozza a fiokodat a megfelelo jatekosprofilhoz.</section></div>;
  if (!player || !form) return <section className="panel crud-state">{error || "A profil nem elerheto."}</section>;

  const avatarUrl = previewUrl || player.avatarUrl;
  return <div className="page-stack">
    <PageHeader eyebrow="My profile" title="Sajat profilom" description="Itt szerkesztheted a sajat jatekosadataidat es a profilkepedet." />
    <form className="panel my-profile" onSubmit={submit}>
      <div className="my-profile__hero">
        <div className="my-profile__avatar">{avatarUrl ? <img src={avatarUrl} alt={`${player.nickname} profilkepe`} /> : player.nickname?.slice(0, 2).toUpperCase()}</div>
        <div><p className="eyebrow">{player.primaryPosition || player.position || "Jatekos"}</p><h3>{player.nickname}</h3><p>{player.name}</p></div>
        <label className="button button--secondary my-profile__avatar-button">Profilkep csereje<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} /></label>
      </div>
      <label><span>EA ID</span><input value={form.eaId} onChange={(event) => setForm({ ...form, eaId: event.target.value })} /></label>
      <label><span>Discord nev</span><input value={form.discordName} onChange={(event) => setForm({ ...form, discordName: event.target.value })} /></label>
      <label><span>Preferalt lab</span><select value={form.preferredFoot} onChange={(event) => setForm({ ...form, preferredFoot: event.target.value })}><option value="Jobb">Jobb</option><option value="Bal">Bal</option><option value="Mindketto">Mindketto</option></select></label>
      <label><span>Masodlagos poziciok</span><input value={form.secondaryPositions} onChange={(event) => setForm({ ...form, secondaryPositions: event.target.value })} placeholder="Peldául: CM, CDM" /><small>Vesszovel elvalasztva.</small></label>
      <label className="my-profile__wide"><span>Bemutatkozas</span><textarea rows="4" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Par sor magadrol a csapatnak..." /></label>
      <div className="form-actions my-profile__wide"><button className="button" disabled={saving}>{saving ? "Mentes..." : "Profil mentese"}</button>{message && <span className="success-message">{message}</span>}{error && <span className="error-message">{error}</span>}</div>
    </form>
  </div>;
}

export default MyProfile;
