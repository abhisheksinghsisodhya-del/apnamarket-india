import { getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc,
  collection, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const el = id => document.getElementById(id);

let user = null;
let registeredShop = null;
let catalog = new Map();

const cartKey = "ami_firebase_cart_v2";

const readCart = () => {
  try {
    const c = JSON.parse(
      localStorage.getItem(cartKey) || "{}"
    );
    return c && typeof c === "object" &&
      !Array.isArray(c) ? c : {};
  } catch {
    return {};
  }
};

const writeCart = c => {
  localStorage.setItem(cartKey, JSON.stringify(c));
  renderCart();
};

// SELLER REGISTRATION

const seller = el("seller");
const oldSellerForm = seller.querySelector(".panel");

if (oldSellerForm) {
  oldSellerForm.style.display = "none";
}

const box = document.createElement("div");
box.className = "panel";

box.innerHTML = `
  <h3>🏪 Seller Registration</h3>
  <input id="real-shop"
    placeholder="Shop Name" maxlength="100">

  <button class="primary" id="register-shop">
    Register / Update Shop
  </button>

  <hr>

  <h3>📦 Add Product</h3>

  <input id="real-product"
    placeholder="Product Name" maxlength="120">

  <input id="real-price"
    type="number" min="1" max="10000000"
    placeholder="Price ₹">

  <select id="real-category">
    <option>Grocery</option>
    <option>Food</option>
    <option>Fashion</option>
    <option>Electronics</option>
  </select>

  <button class="primary" id="upload-product">
    Upload Product
  </button>

  <p id="market-status" role="status"></p>
`;

seller.insertBefore(box, oldSellerForm);

const status = msg => {
  el("market-status").textContent = msg;
};

onAuthStateChanged(auth, async current => {
  user = current;
  registeredShop = null;

  if (!user) {
    status("पहले Google Login करें।");
    return;
  }

  status("Google Login successful");

  try {
    const snap = await getDoc(
      doc(db, "shops", user.uid)
    );

    if (
      snap.exists() &&
      auth.currentUser?.uid === user.uid
    ) {
      registeredShop = snap.data().name;
      el("real-shop").value = registeredShop || "";

      status(
        "✅ Registered shop: " + registeredShop
      );
    }
  } catch (e) {
    status("Shop load error: " + e.message);
  }
});

el("register-shop").onclick = async () => {
  if (!user) {
    return status("पहले Google Login करें।");
  }

  const name = el("real-shop").value.trim();

  if (name.length < 2 || name.length > 100) {
    return status("दुकान का सही नाम लिखें।");
  }

  try {
    await setDoc(
      doc(db, "shops", user.uid),
      {
        ownerId: user.uid,
        name
      },
      { merge: true }
    );

    registeredShop = name;
    status("✅ Shop registered successfully!");

  } catch (e) {
    status
