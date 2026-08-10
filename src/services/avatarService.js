const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error("A profilkep-feltoltes meg nincs beallitva. Hianyzik a Cloudinary konfiguracio.");
  }

  return { cloudName, uploadPreset };
}

export async function uploadPlayerAvatar(playerId, file) {
  if (!file) throw new Error("Valassz ki egy kepet.");
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Csak JPG, PNG vagy WebP kep toltheto fel.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A kep legfeljebb 3 MB lehet.");
  }

  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "ball-of-duty/avatars");
  formData.append("tags", `ball-of-duty,player-${playerId}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || "A profilkep feltoltese sikertelen.");
  }

  return {
    avatarUrl: result.secure_url,
    avatarPath: result.public_id,
  };
}

// Cloudinary-nal a bongeszos feltoltes nem torolhet biztonsagosan regi fajlt.
// A regi kepet kesobb egy admin API endpointtal takaritjuk majd ki.
export async function deletePlayerAvatar() {
  return undefined;
}
