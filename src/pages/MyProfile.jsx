import { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import { getPlayer, updatePlayer } from "../services/playerService";
import { uploadPlayerAvatar } from "../services/avatarService";
import { useAuth } from "../contexts/AuthContext";

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
          vpgUsername: data?.vpgUsername || "",
          preferredFoot: data?.preferredFoot || "Jobb",
          secondaryPositions: (data?.secondaryPositions || []).join(", "),
          bio: data?.bio || "",
        });
      })
      .catch(() => setError("Nem sikerült betölteni a játékosprofilodat."))
      .finally(() => setLoading(false));
  }, [profile?.playerId]);

  function selectAvatar(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function submit(event) {
    event.preventDefault();

    if (!player || !form) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const changes = {
        eaId: form.eaId.trim(),

        discordName: form.discordName.trim(),

        vpgUsername: form.vpgUsername.trim(),

        preferredFoot: form.preferredFoot,

        secondaryPositions: form.secondaryPositions
          .split(",")
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean),

        bio: form.bio.trim(),
      };

      if (avatarFile) {
        Object.assign(changes, await uploadPlayerAvatar(player.id, avatarFile));
      }

      await updatePlayer(player.id, changes);

      const updated = {
        ...player,
        ...changes,
      };

      setPlayer(updated);
      setAvatarFile(null);
      setPreviewUrl(null);

      setMessage("A profilodat sikeresen mentettük.");
    } catch (submitError) {
      setError(submitError.message || "Nem sikerült menteni a profilodat.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="panel crud-state">Profil betöltése...</section>;
  }

  if (!profile?.playerId) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="My profile"
          title="Saját profilom"
          description="A profilod még nincs játékoshoz rendelve."
        />

        <section className="panel crud-state">
          Kérj egy admint, hogy hozzá a fiókodat a megfelelő játékosprofilhoz.
        </section>
      </div>
    );
  }

  if (!player || !form) {
    return (
      <section className="panel crud-state">
        {error || "A profil nem elérhető."}
      </section>
    );
  }

  const avatarUrl = previewUrl || player.avatarUrl;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="My profile"
        title="Saját profilom"
        description="Itt szerkesztheted a saját játékosadataidat és a profilképedet."
      />

      <form className="panel my-profile" onSubmit={submit}>
        <div className="my-profile__hero">
          <div className="my-profile__avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${player.nickname} profilképe`} />
            ) : (
              player.nickname?.slice(0, 2).toUpperCase()
            )}
          </div>

          <div>
            <p className="eyebrow">
              {player.primaryPosition || player.position || "Játékos"}
            </p>

            <h3>{player.nickname}</h3>

            <p>{player.name}</p>
          </div>

          <label className="button button--secondary my-profile__avatar-button">
            Profilkép cseréje
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectAvatar}
            />
          </label>
        </div>

        <label>
          <span>EA ID</span>

          <input
            value={form.eaId}
            onChange={(event) =>
              setForm({
                ...form,
                eaId: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Discord név</span>

          <input
            value={form.discordName}
            onChange={(event) =>
              setForm({
                ...form,
                discordName: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>VPG Username</span>

          <input
            value={form.vpgUsername}
            onChange={(event) =>
              setForm({
                ...form,
                vpgUsername: event.target.value,
              })
            }
            placeholder="Például: Kowi97"
          />

          <small>
            A VPG-n használt pontos felhasználóneved. Ez alapján kapcsoljuk
            össze a VPG statisztikáiddal.
          </small>
        </label>

        <label>
          <span>Preferált láb</span>

          <select
            value={form.preferredFoot}
            onChange={(event) =>
              setForm({
                ...form,
                preferredFoot: event.target.value,
              })
            }
          >
            <option value="Jobb">Jobb</option>

            <option value="Bal">Bal</option>

            <option value="Mindketto">Mindkettő</option>
          </select>
        </label>

        <label>
          <span>Másodlagos pozíciók</span>

          <input
            value={form.secondaryPositions}
            onChange={(event) =>
              setForm({
                ...form,
                secondaryPositions: event.target.value,
              })
            }
            placeholder="Például: CM, CDM"
          />

          <small>Vesszővel elválasztva.</small>
        </label>

        <label className="my-profile__wide">
          <span>Bemutatkozás</span>

          <textarea
            rows="4"
            value={form.bio}
            onChange={(event) =>
              setForm({
                ...form,
                bio: event.target.value,
              })
            }
            placeholder="Pár sor magadról a csapatnak..."
          />
        </label>

        <div className="form-actions my-profile__wide">
          <button className="button" disabled={saving}>
            {saving ? "Mentés..." : "Profil mentése"}
          </button>

          {message && <span className="success-message">{message}</span>}

          {error && <span className="error-message">{error}</span>}
        </div>
      </form>
    </div>
  );
}

export default MyProfile;
