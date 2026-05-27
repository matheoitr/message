// firebase-config.js
// ⚠️ Remplacez ces valeurs par celles de votre projet Firebase
// Guide complet dans README.md

const firebaseConfig = {
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId:         "VOTRE_PROJECT_ID",
  storageBucket:     "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId:             "VOTRE_APP_ID"
};

// Initialisation Firebase (SDK v9 compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

export { db };
