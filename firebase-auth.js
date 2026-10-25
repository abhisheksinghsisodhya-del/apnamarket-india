import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7xYjYeglLwQfpldf3z8fwT5-9vCU3SqA",
  authDomain: "apnamarket-india.firebaseapp.com",
  projectId: "apnamarket-india",
  storageBucket: "apnamarket-india.firebasestorage.app",
  messagingSenderId: "804227094458",
  appId: "1:804227094458:web:c2c4c4386cd3cb710eaf83"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const get = (id) => document.getElementById(id);
const loginSection = document.querySelector("section:has(#otp-phone)");

get("otp-send").style.display = "none";
get("otp-verify").style.display = "none";
get("otp-phone").style.display = "none";
get("otp-code").style.display = "none";
get("otp-recaptcha").style.display = "none";

const googleButton = document.createElement("button");
googleButton.textContent = "🔵 Continue with Google";
googleButton.style.cssText =
  "background:#4285F4;color:white;padding:14px;border:0;border-radius:10px;font-size:16px;cursor:pointer;";

loginSection.prepend(googleButton);

googleButton.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    get("otp-message").textContent = error.message;
  }
});

onAuthStateChanged(auth, (user) => {
  get("app").style.display = user ? "block" : "none";
  loginSection.style.display = user ? "none" : "block";

  get("otp-user").textContent = user
    ? "Logged in: " + (user.displayName || user.email)
    : "Not logged in";

  get("otp-signout").hidden = !user;
});

get("otp-signout").addEventListener("click", async () => {
  await signOut(auth);
});
