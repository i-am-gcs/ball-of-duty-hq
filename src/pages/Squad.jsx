import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import {
  createPlayer,
  deletePlayer,
  getPlayers,
  updatePlayer,
} from "../services/playerService";
import { useAuth } from "../contexts/AuthContext";
import { deletePlayerAvatar, uploadPlayerAvatar } from "../services/avatarService";

const emptyPlayerForm = {
  name: "",
  nickname: "",
  primaryPosition: "",
  secondaryPositions: [],
  status: "Aktív",
  preferredFoot: "Jobb",
  eaId: "",
  discordName: "",
  joinedAt: "",
  squadNumber: "",
  role: "Játékos",
  notes: "",
};

const positionOptions = [
  "GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM",
  "CAM", "LM", "RM", "LW", "RW", "ST",
];

function Squad() {
  const { isAdmin, profile } = useAuth();
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState("Összes");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [playerForm, setPlayerForm] = useState(emptyPlayerForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [secondaryPositionInput, setSecondaryPositionInput] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        setLoading(true);
        setError(null);

        const playerData = await getPlayers();

        setPlayers(playerData);
      } catch (error) {
        console.error("Hiba a játékosok betöltésekor:", error);

        setError("Nem sikerült betölteni a játékosokat.");
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  function updatePlayerForm(event) {
    const { name, value } = event.target;

    setPlayerForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function addSecondaryPosition() {
    const newPosition = secondaryPositionInput.trim().toUpperCase();

    if (!newPosition) {
      return;
    }

    setPlayerForm((currentForm) => {
      if (currentForm.secondaryPositions.includes(newPosition)) {
        return currentForm;
      }

      return {
        ...currentForm,
        secondaryPositions: [...currentForm.secondaryPositions, newPosition],
      };
    });
    setSecondaryPositionInput("");
  }

  function removeSecondaryPosition(positionToRemove) {
    setPlayerForm((currentForm) => ({
      ...currentForm,
      secondaryPositions: currentForm.secondaryPositions.filter(
        (position) => position !== positionToRemove,
      ),
    }));
  }

  function openAddPlayerForm() {
    setEditingPlayerId(null);
    setPlayerForm(emptyPlayerForm);
    setSecondaryPositionInput("");
    setFormError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowPlayerForm(true);
  }

  function openEditPlayerForm(player) {
    setEditingPlayerId(player.id);
    setPlayerForm({
      name: player.name || "",
      nickname: player.nickname || "",
      primaryPosition: player.primaryPosition || player.position || "",
      secondaryPositions: Array.isArray(player.secondaryPositions)
        ? player.secondaryPositions
        : [],
      status: player.status || "Aktív",
      preferredFoot: player.preferredFoot || "Jobb",
      eaId: player.eaId || "",
      discordName: player.discordName || "",
      joinedAt: player.joinedAt || "",
      squadNumber: player.squadNumber || "",
      role: player.role || "Játékos",
      notes: player.notes || "",
    });
    setAvatarFile(null);
    setAvatarPreview(player.avatarUrl || null);
    setSecondaryPositionInput("");
    setFormError(null);
    setShowPlayerForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closePlayerForm() {
    setShowPlayerForm(false);
    setEditingPlayerId(null);
    setPlayerForm(emptyPlayerForm);
    setSecondaryPositionInput("");
    setFormError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  }

  function selectAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormError("Csak JPG, PNG vagy WebP kep toltheto fel.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setFormError("A profilkep legfeljebb 3 MB lehet.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setFormError(null);
  }

  async function changeOwnAvatar(player, file) {
    if (!file) return;
    try {
      setUploadingAvatarId(player.id);
      setActionError(null);
      const previousPath = player.avatarPath;
      const avatar = await uploadPlayerAvatar(player.id, file);
      await updatePlayer(player.id, avatar);
      if (previousPath && previousPath !== avatar.avatarPath) {
        await deletePlayerAvatar(previousPath).catch(() => undefined);
      }
      setPlayers((currentPlayers) => currentPlayers.map((currentPlayer) =>
        currentPlayer.id === player.id ? { ...currentPlayer, ...avatar } : currentPlayer
      ));
    } catch (error) {
      console.error("Hiba a profilkep feltoltesekor:", error);
      setActionError(error.message || "Nem sikerult feltolteni a profilkepet.");
    } finally {
      setUploadingAvatarId(null);
    }
  }

  async function removePlayer(player) {
    const shouldDelete = window.confirm(
      `Biztosan törölni szeretnéd ${player.nickname} játékost? Ez a művelet nem vonható vissza.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingPlayerId(player.id);
      setActionError(null);

      await deletePlayer(player.id);

      setPlayers((currentPlayers) =>
        currentPlayers.filter((currentPlayer) => currentPlayer.id !== player.id),
      );

      if (editingPlayerId === player.id) {
        closePlayerForm();
      }
    } catch (error) {
      console.error("Hiba a játékos törlésekor:", error);
      setActionError("Nem sikerült törölni a játékost.");
    } finally {
      setDeletingPlayerId(null);
    }
  }

  async function submitPlayer(event) {
    event.preventDefault();

    const playerData = {
      name: playerForm.name.trim(),
      nickname: playerForm.nickname.trim(),
      primaryPosition: playerForm.primaryPosition,
      secondaryPositions: playerForm.secondaryPositions,
      status: playerForm.status,
      preferredFoot: playerForm.preferredFoot,
      eaId: playerForm.eaId.trim(),
      discordName: playerForm.discordName.trim(),
      joinedAt: playerForm.joinedAt,
      squadNumber: playerForm.squadNumber.trim(),
      role: playerForm.role,
      notes: playerForm.notes.trim(),
    };

    if (!playerData.name || !playerData.nickname || !playerData.primaryPosition) {
      setFormError("A név, becenév és elsődleges pozíció megadása kötelező.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      if (editingPlayerId) {
        let finalPlayerData = playerData;
        const previousPlayer = players.find((player) => player.id === editingPlayerId);
        if (avatarFile) {
          const avatar = await uploadPlayerAvatar(editingPlayerId, avatarFile);
          finalPlayerData = { ...playerData, ...avatar };
          if (previousPlayer?.avatarPath && previousPlayer.avatarPath !== avatar.avatarPath) {
            await deletePlayerAvatar(previousPlayer.avatarPath).catch(() => undefined);
          }
        }
        const updatedPlayer = await updatePlayer(editingPlayerId, finalPlayerData);

        setPlayers((currentPlayers) =>
          currentPlayers.map((player) =>
            player.id === editingPlayerId
              ? { ...player, ...updatedPlayer }
              : player,
          ),
        );
      } else {
        let createdPlayer = await createPlayer(playerData);
        if (avatarFile) {
          const avatar = await uploadPlayerAvatar(createdPlayer.id, avatarFile);
          createdPlayer = await updatePlayer(createdPlayer.id, { ...playerData, ...avatar });
        }

        setPlayers((currentPlayers) => [...currentPlayers, createdPlayer]);
      }

      closePlayerForm();
    } catch (error) {
      console.error("Hiba a játékos mentésekor:", error);
      setFormError("Nem sikerült elmenteni a játékost.");
    } finally {
      setSaving(false);
    }
  }

  const positions = useMemo(() => {
    const playerPositions = players
      .map((player) => player.primaryPosition || player.position)
      .filter(Boolean);

    return ["Összes", ...new Set(playerPositions)];
  }, [players]);

  const visiblePlayers = useMemo(() => {
    return players.filter((player) => {
      const playerPosition = player.primaryPosition || player.position;
      const matchesPosition = filter === "Összes" || playerPosition === filter;

      const query = search.trim().toLowerCase();

      const playerName = player.name?.toLowerCase() || "";
      const playerNickname = player.nickname?.toLowerCase() || "";

      const matchesSearch =
        playerName.includes(query) || playerNickname.includes(query);

      return matchesPosition && matchesSearch;
    });
  }, [players, filter, search]);

  if (loading) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Squad management"
          title="Játékoskeret"
          description="Keresés, pozíció szerinti szűrés és teljesítményadatok."
        />

        <section className="panel">
          <p>Játékosok betöltése...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <PageHeader
          eyebrow="Squad management"
          title="Játékoskeret"
          description="Keresés, pozíció szerinti szűrés és teljesítményadatok."
        />

        <section className="panel">
          <p>{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Squad management"
        title="Játékoskeret"
        description="Keresés, pozíció szerinti szűrés és teljesítményadatok."
      />

      {isAdmin && <div className="squad-actions">
        {showPlayerForm ? (
          <button type="button" className="button button--secondary" onClick={closePlayerForm}>
            Mégse
          </button>
        ) : (
          <button type="button" className="button" onClick={openAddPlayerForm}>
            + Játékos hozzáadása
          </button>
        )}
      </div>}

      {isAdmin && showPlayerForm && (
        <form className="panel player-form" onSubmit={submitPlayer}>
          <div className="player-form__heading player-form__wide">
            <div>
              <p className="eyebrow">Player management</p>
              <h3>{editingPlayerId ? "Játékos szerkesztése" : "Új játékos"}</h3>
            </div>
          </div>
          <label>
            <span>Teljes név</span>
            <input
              name="name"
              value={playerForm.name}
              onChange={updatePlayerForm}
              placeholder="Például: Molnár Viktor"
            />
          </label>

          <label>
            <span>Becenév</span>
            <input
              name="nickname"
              value={playerForm.nickname}
              onChange={updatePlayerForm}
              placeholder="Például: Magickacsa"
            />
          </label>

          <label>
            <span>Elsődleges pozíció</span>
            <select
              name="primaryPosition"
              value={playerForm.primaryPosition}
              onChange={updatePlayerForm}
            >
              <option value="">Válassz pozíciót</option>
              {positionOptions.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Státusz</span>
            <select name="status" value={playerForm.status} onChange={updatePlayerForm}>
              <option value="Aktív">Aktív</option>
              <option value="Inaktív">Inaktív</option>
            </select>
          </label>

          <div className="player-form__wide player-form__secondary">
            <span className="player-form__label">Másodlagos pozíciók</span>
            <div className="secondary-position-control">
              <input
                value={secondaryPositionInput}
                onChange={(event) => setSecondaryPositionInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSecondaryPosition();
                  }
                }}
                placeholder="Írj be egy pozíciót, például: CM"
              />
              <button type="button" className="button button--secondary" onClick={addSecondaryPosition}>
                Hozzáadás
              </button>
            </div>

            {playerForm.secondaryPositions.length > 0 && (
              <div className="position-tags">
                {playerForm.secondaryPositions.map((position) => (
                  <button
                    type="button"
                    className="position-tag"
                    key={position}
                    onClick={() => removeSecondaryPosition(position)}
                    aria-label={`${position} eltávolítása`}
                  >
                    {position} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <label>
            <span>Preferált láb</span>
            <select name="preferredFoot" value={playerForm.preferredFoot} onChange={updatePlayerForm}>
              <option value="Jobb">Jobb</option>
              <option value="Bal">Bal</option>
              <option value="Mindkettő">Mindkettő</option>
            </select>
          </label>

          <label>
            <span>Szerepkör</span>
            <select name="role" value={playerForm.role} onChange={updatePlayerForm}>
              <option value="Játékos">Játékos</option>
              <option value="All rounder">All rounder</option>
              <option value="Csapatkapitány">Csapatkapitány</option>
              <option value="Menedzser">Menedzser</option>
            </select>
          </label>

          <label>
            <span>EA ID</span>
            <input name="eaId" value={playerForm.eaId} onChange={updatePlayerForm} />
          </label>

          <label>
            <span>Discord-név</span>
            <input name="discordName" value={playerForm.discordName} onChange={updatePlayerForm} />
          </label>

          <label>
            <span>Csatlakozás dátuma</span>
            <input type="date" name="joinedAt" value={playerForm.joinedAt} onChange={updatePlayerForm} />
          </label>

          <label>
            <span>Mezszám</span>
            <input type="number" min="1" max="99" name="squadNumber" value={playerForm.squadNumber} onChange={updatePlayerForm} />
          </label>

          <label className="player-form__wide">
            <span>Megjegyzés</span>
            <textarea name="notes" value={playerForm.notes} onChange={updatePlayerForm} rows="3" />
          </label>

          <div className="player-form__wide avatar-upload-field">
            <span className="player-form__label">Profilkép</span>
            <div className="avatar-upload-field__content">
              <div className="player-avatar player-avatar--preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profilkép előnézet" />
                ) : (
                  playerForm.nickname?.slice(0, 2).toUpperCase() || "?"
                )}
              </div>
              <label className="button button--secondary avatar-upload-button">
                Kép választása
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} />
              </label>
              <small>JPG, PNG vagy WebP, legfeljebb 3 MB. Automatikusan négyzetre vágjuk.</small>
            </div>
          </div>

          <div className="form-actions player-form__actions">
            <button className="button" disabled={saving}>
              {saving
                ? "Mentés..."
                : editingPlayerId
                  ? "Módosítások mentése"
                  : "Játékos mentése"}
            </button>
            {formError && <span className="error-message">{formError}</span>}
          </div>
        </form>
      )}

      <section className="toolbar panel">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Játékos keresése..."
        />

        <div className="filter-row">
          {positions.map((position) => (
            <button
              key={position}
              className={filter === position ? "active" : ""}
              onClick={() => setFilter(position)}
            >
              {position}
            </button>
          ))}
        </div>
      </section>

      {actionError && <p className="error-message squad-action-error">{actionError}</p>}

      {visiblePlayers.length === 0 ? (
        <section className="panel">
          <p>Nem található a feltételeknek megfelelő játékos.</p>
        </section>
      ) : (
        <section className="player-grid">
          {visiblePlayers.map((player) => {
            const playerPosition = player.primaryPosition || player.position;

            return (
              <article className="player-card panel" key={player.id}>
                <div className="player-top">
                  <span className="position-badge">{playerPosition || "N/A"}</span>

                  <span
                    className={`status-dot ${
                      player.status === "Aktív" ? "status-dot--active" : ""
                    }`}
                  >
                    {player.status}
                  </span>
                </div>

                <div className={`player-avatar ${player.avatarUrl ? "player-avatar--image" : ""}`}>
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt={`${player.nickname} profilképe`} />
                  ) : (
                    player.nickname?.slice(0, 2).toUpperCase()
                  )}
                </div>

                {!isAdmin && profile?.playerId === player.id && (
                  <label className="player-avatar-change">
                    {uploadingAvatarId === player.id ? "Feltöltés..." : "Profilkép cseréje"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingAvatarId === player.id}
                      onChange={(event) => changeOwnAvatar(player, event.target.files?.[0])}
                    />
                  </label>
                )}

                <h3>{player.nickname}</h3>

                <p>{player.name}</p>

                {(player.role || player.secondaryPositions?.length > 0) && (
                  <div className="player-meta">
                    {player.role && <span>{player.role}</span>}
                    {player.secondaryPositions?.length > 0 && (
                      <span>Másodlagos: {player.secondaryPositions.join(", ")}</span>
                    )}
                    {isAdmin && <span>{player.userId ? "✓ Fiókkal összekötve" : "Nincs felhasználói fiók"}</span>}
                  </div>
                )}

                <div className="rating">
                  <span>Overall</span>
                  <strong>{player.rating ?? "–"}</strong>
                </div>

                <div className="player-stats">
                  <div>
                    <strong>{player.appearances ?? "–"}</strong>
                    <span>Meccs</span>
                  </div>

                  <div>
                    <strong>{player.goals ?? "–"}</strong>
                    <span>Gól</span>
                  </div>

                  <div>
                    <strong>{player.assists ?? "–"}</strong>
                    <span>Gólpassz</span>
                  </div>
                </div>

                {isAdmin && <div className="player-card__actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => openEditPlayerForm(player)}
                  >
                    Szerkesztés
                  </button>
                  <button
                    type="button"
                    className="button player-card__delete"
                    disabled={deletingPlayerId === player.id}
                    onClick={() => removePlayer(player)}
                  >
                    {deletingPlayerId === player.id ? "Törlés..." : "Törlés"}
                  </button>
                </div>}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default Squad;
