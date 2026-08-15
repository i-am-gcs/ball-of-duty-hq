import { cert, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { config } from "./config.js";

const serviceAccount = JSON.parse(
  Buffer.from(config.firebaseServiceAccountBase64, "base64").toString("utf8"),
);

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: config.firebaseDatabaseUrl,
});

export const database = getDatabase();
