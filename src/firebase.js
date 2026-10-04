import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAbyc83PAANYhoAvn68uMTj6jE4N4B-q4c",
  authDomain: "studynest-1371b.firebaseapp.com",
  projectId: "studynest-1371b",
  storageBucket: "studynest-1371b.firebasestorage.app",
  messagingSenderId: "467881173018",
  appId: "1:467881173018:web:3f3e1a0b6cb149fb7bb1a3",
  measurementId: "G-87K126N82R",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);