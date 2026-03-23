import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDmQXMm_mqBXSvysTtxYonyPP4FaendVI",
  authDomain: "impact-app-c99e6.firebaseapp.com",
  projectId: "impact-app-c99e6",
  storageBucket: "impact-app-c99e6.firebasestorage.app",
  messagingSenderId: "777588941727",
  appId: "1:777588941727:web:cbc09784f5fc606da853aa"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();