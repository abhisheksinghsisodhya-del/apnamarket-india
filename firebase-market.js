import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, addDoc,
  collection, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyA7xYjYeglLwQfpldf3z8fwT5-9vCU3SqA",
  authDomain: "apnamarket-india.firebaseapp.com",
  projectId: "apnamarket-india",
  appId: "1:804227094458:web:c2c4c4386cd3cb710eaf83"
}, "market");

const auth = getAuth(app);
const db = getFirestore(app);

let user = null;
let shopRegistered = false;

const seller = document.getElementById("seller");

// पुराना Demo Product Form छिपाएँ
const oldForm = seller.querySelector(".panel");
if (oldForm) oldForm.style.display = "none";

const box = document.createElement("div");
box.className = "panel";
seller.insertBefore(box, oldForm);

box.innerHTML = `
  <h3>🏪 Register Your Shop</h3>
  <input id="real-shop" placeholder="Shop Name">
  <button id="register-shop" class="primary">Register Shop</button>

  <hr>
  <h3>📦 Upload Product</h3>
  <input id="real-product" placeholder="Product Name">
  <input id="real-price" type="number" min="1" placeholder="Price ₹">
  <select id="real-category">
    <option>Grocery</option>
    <option>Food</option>
    <option>Fashion</option>
    <option>Electronics</option>
  </select>
  <button id="upload-product" class="primary">Upload Product</button>
  <p id="market-status"></p>
`;

const get = id => document.getElementById(id);
const status = msg => get("market-status").textContent = msg;

onAuthStateChanged(auth, async currentUser => {
  user = currentUser;
  shopRegistered = false;
  status(user ? "Google Login successful" : "Please login first");
});

get("register-shop").onclick = async () => {
  if (!user) return status("पहले Google Login करें।");

  const name = get("real-shop").value.trim();
  if (!name) return status("Shop Name लिखें।");

  try {
    await setDoc(doc(db, "shops", user.uid), {
      ownerId: user.uid,
      name: name
    }, { merge: true });

    shopRegistered = true;
    status("✅ Shop registered successfully!");
  } catch (e) {
    status("Error: " + e.message);
  }
};

get("upload-product").onclick = async () => {
  if (!user) return status("पहले Google Login करें।");
  if (!shopRegistered) return status("पहले दुकान Register करें।");

  const name = get("real-product").value.trim();
  const price = Number(get("real-price").value);
  const shop = get("real-shop").value.trim();

  if (!name || !shop || !Number.isFinite(price) || price <= 0)
    return status("सही Product Name और Price डालें।");

  try {
    await addDoc(collection(db, "products"), {
      sellerId: user.uid,
      name,
      price,
      shop,
      category: get("real-category").value,
      createdAt: serverTimestamp()
    });

    status("✅ Product uploaded successfully!");
    get("real-product").value = "";
    get("real-price").value = "";
  } catch (e) {
    status("Error: " + e.message);
  }
};

// सभी ग्राहकों को Firebase Products दिखाएँ
const listing = document.createElement("div");
listing.innerHTML = `
  <h2>🏪 Online Seller Products</h2>
  <div id="firebase-products"></div>
`;
document.getElementById("shop").appendChild(listing);

onSnapshot(collection(db, "products"), snapshot => {
  const area = get("firebase-products");
  area.replaceChildren();

  if (snapshot.empty) {
    area.textContent = "अभी कोई ऑनलाइन प्रोडक्ट नहीं है।";
    return;
  }

  snapshot.forEach(item => {
    const p = item.data();
    const card = document.createElement("div");
    card.className = "panel";

    const title = document.createElement("h3");
    title.textContent = p.name || "Product";

    const info = document.createElement("p");
    info.textContent =
      `🏪 ${p.shop || "Shop"} | ₹${p.price}`;

    card.append(title, info);
    area.appendChild(card);
  });
}, error => {
  get("firebase-products").textContent =
    "Products load error: " + error.message;
});
