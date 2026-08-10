import "dotenv/config";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

const email = process.argv[2]?.trim().toLowerCase();
const confirmed = process.argv.includes("--yes");
const databaseURL = process.env.FIREBASE_DATABASE_URL?.trim();

if (!email || !confirmed) {
  console.error("Hasznalat: npm run delete-user -- email@pelda.hu --yes");
  console.error("A parancs torli a Firebase Authentication fiokot es a kapcsolodo adatbazisrekordot.");
  process.exit(1);
}

if (!databaseURL) {
  console.error("Hianyzik a FIREBASE_DATABASE_URL a bot/.env fajlbol.");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), databaseURL });

try {
  const auth = getAuth();
  const database = getDatabase();
  const user = await auth.getUserByEmail(email);

  if (user.customClaims?.admin === true) {
    throw new Error("Admin jogosultsagu fiok nem torolheto ezzel a parancssal.");
  }

  const userSnapshot = await database.ref(`users/${user.uid}`).get();
  const playerId = userSnapshot.val()?.playerId;
  const changes = { [`users/${user.uid}`]: null };

  if (playerId) changes[`players/${playerId}/userId`] = null;

  await database.ref().update(changes);
  await auth.deleteUser(user.uid);

  console.log(`Felhasznalo torolve: ${email}`);
  if (playerId) console.log(`Jatekosprofil kapcsolat megszuntetve: ${playerId}`);
} catch (error) {
  console.error("Nem sikerult torolni a felhasznalot:", error.message);
  process.exit(1);
}
