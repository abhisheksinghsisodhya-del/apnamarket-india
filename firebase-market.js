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
const wishlistKey = "ami_wishlist_v1";

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function readCart() {
  return readJSON(cartKey, {});
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCart();
}

function readWishlist() {
  return readJSON(wishlistKey, []);
}

function saveWishlist(ids) {
  localStorage.setItem(wishlistKey, JSON.stringify(ids));
  renderProducts();
}

// SELLER PANEL

const seller = el("seller");
const oldForm = seller.querySelector(".panel");

if (oldForm) oldForm.style.display = "none";

const sellerBox = document.createElement("div");
sellerBox.className = "panel";

sellerBox.innerHTML = `
  <h2>🏪 Seller Dashboard</h2>

  <input id="real-shop"
    placeholder="Shop Name"
    maxlength="100">

  <button class="primary" id="register-shop">
    Register / Update Shop
  </button>

  <hr>
<label for="real-photo">📸 Product Photo</label>
<input
  id="real-photo"
  type="file"
  accept="image/*"
>
    <h3>📦 Upload Product</h3>

  <input id="real-product"
    placeholder="Product Name"
    maxlength="120">

  <input id="real-price"
    type="number"
    min="1"
    placeholder="Price ₹">

  <select id="real-category">
    <option>Grocery</option>
    <option>Food</option>
    <option>Fashion</option>
    <option>Electronics</option>
  </select>
<label for="real-photo">📸 Product Photo</label>

<input
  type="file"
  id="real-photo"
  accept="image/*"
  style="display:block;width:100%;margin:12px 0;"
>
  <button class="primary" id="upload-product">
    Upload Product
  </button>

  <p id="market-status"></p>
`;

seller.insertBefore(sellerBox, oldForm);

function status(message) {
  el("market-status").textContent = message;
}

// GOOGLE LOGIN

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

    if (snap.exists() && auth.currentUser?.uid === user.uid) {
      registeredShop = snap.data().name;
      el("real-shop").value = registeredShop || "";
      status("✅ Shop: " + registeredShop);
    }
  } catch (error) {
    status("Error: " + error.message);
  }
});

// REGISTER SHOP

el("register-shop").onclick = async () => {
  if (!user) {
    return status("पहले Google Login करें।");
  }

  const name = el("real-shop").value.trim();

  if (name.length < 2 || name.length > 100) {
    return status("सही दुकान का नाम लिखें।");
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
  } catch (error) {
    status("Error: " + error.message);
  }
};

// UPLOAD PRODUCT

el("upload-product").onclick = async () => {
  if (!user) {
    return status("पहले Google Login करें।");
  }

  if (!registeredShop) {
    return status("पहले Shop Register करें।");
  }

  const name = el("real-product").value.trim();
  const price = Number(el("real-price").value);
  const category = el("real-category").value;

  if (
    !name ||
    name.length > 120 ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 10000000
  ) {
    return status("सही Product और Price लिखें।");
  }

  try {
    await addDoc(collection(db, "products"), {
      sellerId: user.uid,
      name,
      price,
      shop: registeredShop,
      category,
      createdAt: serverTimestamp()
    });

    el("real-product").value = "";
    el("real-price").value = "";

    status("✅ Product uploaded successfully!");
  } catch (error) {
    status("Error: " + error.message);
  }
};

// PRODUCT SEARCH AND FILTER

const market = document.createElement("section");

market.innerHTML = `
  <h2>🛍️ ApnaMarket India Products</h2>

  <div class="panel">
    <input id="market-search"
      placeholder="🔍 Search products...">

    <select id="market-filter">
      <option value="all">All Categories</option>
      <option value="Grocery">Grocery</option>
      <option value="Food">Food</option>
      <option value="Fashion">Fashion</option>
      <option value="Electronics">Electronics</option>
    </select>

    <label>
      <input type="checkbox" id="wishlist-only">
      ❤️ Wishlist Only
    </label>
  </div>

  <div id="firebase-products"></div>
`;

el("shop").appendChild(market);

el("market-search").addEventListener("input", renderProducts);
el("market-filter").addEventListener("change", renderProducts);
el("wishlist-only").addEventListener("change", renderProducts);

// CART PANEL

const cartBox = document.createElement("div");
cartBox.className = "panel";

cartBox.innerHTML = `
  <h2>🛒 Online Products Cart</h2>

  <div id="real-cart-items"></div>

  <h3 id="real-cart-total">Total: ₹0</h3>

  <hr>

  <h3>📍 Delivery Details</h3>

  <input id="real-buyer"
    placeholder="Customer Name">

  <input id="real-mobile"
    placeholder="Mobile Number"
    inputmode="numeric">

  <input id="real-address"
    placeholder="Delivery Address">

  <p>
    💳 UPI Only — Secure payment setup pending.
    अभी कोई भुगतान या ऑर्डर सबमिट नहीं होगा।
  </p>

  <button class="primary" disabled>
    Checkout — Coming Soon
  </button>
`;

el("cart").prepend(cartBox);

// ADD TO CART

function addToCart(id) {
  const cart = readCart();

  cart[id] = Math.min(
    99,
    (Number(cart[id]) || 0) + 1
  );

  saveCart(cart);

  alert("✅ Product added to Cart!");
}

// RENDER CART

function renderCart() {
  const cart = readCart();
  const area = el("real-cart-items");

  area.replaceChildren();

  let total = 0;
  let count = 0;

  Object.entries(cart).forEach(([id, quantity]) => {
    const product = catalog.get(id);
    const qty = Math.max(
      0,
      Math.min(99, Number(quantity) || 0)
    );

    if (!product || !qty) return;

    total += product.price * qty;
    count += qty;

    const row = document.createElement("div");
    row.className = "panel";

    const title = document.createElement("p");
    title.textContent = `${product.name} × ${qty}`;

    const price = document.createElement("p");
    price.textContent =
      "₹" + (product.price * qty).toLocaleString("en-IN");

    const minus = document.createElement("button");
    minus.textContent = "➖";

    minus.onclick = () => {
      const c = readCart();

      if (c[id] <= 1) {
        delete c[id];
      } else {
        c[id]--;
      }

      saveCart(c);
    };

    const plus = document.createElement("button");
    plus.textContent = "➕";

    plus.onclick = () => {
      const c = readCart();
      c[id] = Math.min(99, (Number(c[id]) || 0) + 1);
      saveCart(c);
    };

    row.append(title, price, minus, plus);
    area.appendChild(row);
  });

  if (!count) {
    area.textContent = "आपका ऑनलाइन Cart खाली है।";
  }

  el("real-cart-total").textContent =
    `Items: ${count} | Total: ₹${total.toLocaleString("en-IN")}`;
}

// RENDER PRODUCTS

function renderProducts() {
  const area = el("firebase-products");
  area.replaceChildren();

  const search = el("market-search").value
    .trim().toLowerCase();

  const category = el("market-filter").value;
  const wishlistOnly = el("wishlist-only").checked;
  const wishlist = readWishlist();

  let shown = 0;

  catalog.forEach((product, id) => {
    const name = String(product.name || "");
    const shop = String(product.shop || "");

    if (
      search &&
      !`${name} ${shop}`.toLowerCase().includes(search)
    ) return;

    if (
      category !== "all" &&
      product.category !== category
    ) return;

    if (wishlistOnly && !wishlist.includes(id)) return;

    shown++;

    const card = document.createElement("div");
    card.className = "panel";

    const title = document.createElement("h3");
    title.textContent = name;

    const details = document.createElement("p");
    details.textContent =
      `🏪 ${shop} | ₹${product.price.toLocaleString("en-IN")}`;

    const addButton = document.createElement("button");
    addButton.className = "primary";
    addButton.textContent = "🛒 Add to Cart";
    addButton.onclick = () => addToCart(id);

    const wishButton = document.createElement("button");

    wishButton.textContent = wishlist.includes(id)
      ? "❤️ Saved"
      : "🤍 Wishlist";

    wishButton.onclick = () => {
      const ids = readWishlist();

      if (ids.includes(id)) {
        saveWishlist(ids.filter(x => x !== id));
      } else {
        saveWishlist([...ids, id]);
      }
    };

    card.append(title, details, addButton, wishButton);
    area.appendChild(card);
  });

  if (!shown) {
    area.textContent = "कोई प्रोडक्ट नहीं मिला।";
  }
}

// LIVE FIREBASE PRODUCTS

onSnapshot(
  collection(db, "products"),
  snapshot => {
    catalog = new Map();

    snapshot.forEach(item => {
      const p = item.data();

      if (
        typeof p.name !== "string" ||
        !Number.isFinite(p.price) ||
        p.price <= 0
      ) return;

      catalog.set(item.id, p);
    });

    renderProducts();
    renderCart();
  },
  error => {
    el("firebase-products").textContent =
      "Products load error: " + error.message;
  }
);
