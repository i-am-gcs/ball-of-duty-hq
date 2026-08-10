import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { config } from "./config.js";

initializeApp({
  credential: applicationDefault(),
  databaseURL: config.firebaseDatabaseUrl,
});

export const database = getDatabase();
