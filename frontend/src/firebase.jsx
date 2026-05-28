import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "PASTE",
  authDomain: "PASTE",
  projectId: "instagram-platform-4ca43",
  databaseURL: "PASTE YOUR REALTIME DB URL HERE",
  appId: "PASTE"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);