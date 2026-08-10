import "dotenv/config";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2]?.trim();

if (!email) {
  console.error("Használat: npm run make-admin -- email@pelda.hu");
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });

try {
  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, {
    ...user.customClaims,
    admin: true,
  });
  console.log(`Admin jogosultság beállítva: ${email}`);
  console.log("A felhasználónak ki-, majd újra be kell jelentkeznie.");
} catch (error) {
  console.error("Nem sikerült beállítani az admin jogosultságot:", error.message);
  process.exit(1);
}
