import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
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

let confirmationResult;
let recaptchaVerifier;

const get = (id) => document.getElementById(id);

function showMessage(message) {
  get("otp-message").textContent = message;
}

onAuthStateChanged(auth, (user) => {
  get("otp-user").textContent = user
    ? "Logged in: " + user.phoneNumber
    : "Not logged in";

  get("otp-signout").hidden = !user;
});

get("otp-send").addEventListener("click", async () => {
  try {
    const phone = get("otp-phone").value.trim();

    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      throw new Error(
        "Enter mobile number with +91, e.g. +919876543210"
      );
    }

    if (!recaptchaVerifier) {
      recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "otp-recaptcha",
        { size: "normal" }
      );
    }

    confirmationResult = await signInWithPhoneNumber(
      auth,
      phone,
      recaptchaVerifier
    );

    showMessage("OTP भेज दिया गया है।");

  } catch (error) {
    showMessage(error.message);

    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
  }
});

get("otp-verify").addEventListener("click", async () => {
  try {
    if (!confirmationResult) {
      throw new Error("पहले OTP भेजें।");
    }

    const otp = get("otp-code").value.trim();

    await confirmationResult.confirm(otp);

    showMessage("मोबाइल नंबर सफलतापूर्वक Verify हो गया!");

  } catch (error) {
    showMessage(error.message);
  }
});

get("otp-signout").addEventListener("click", async () => {
  await signOut(auth);
});
