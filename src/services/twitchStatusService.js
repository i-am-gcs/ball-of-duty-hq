import { onValue, ref } from "firebase/database";
import { database } from "../firebase/firebase";

export function subscribeToTwitchStatus(callback) {
  return onValue(ref(database, "twitchStatus/current"), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}
