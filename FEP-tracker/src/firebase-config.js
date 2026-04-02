// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAsZIG9SxdtNaVHreR2ifKLcEGtA6wZ11g",
  authDomain: "fep-tracker.firebaseapp.com",
  projectId: "fep-tracker",
  storageBucket: "fep-tracker.firebasestorage.app",
  messagingSenderId: "330729366554",
  appId: "1:330729366554:web:6188051b66988f56349da3",
  measurementId: "G-22797BTXDV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  hd: "augustana.edu"
});
provider.addScope('https://www.googleapis.com/auth/calendar.events');

export { database, auth, provider };