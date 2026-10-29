import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();

const PROJECT_ID = "apnamarket-india";
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const ALLOWED_ORIGIN =
  "https://apnamarket-india.onrender.com";

const firebaseKeys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

app.use(cors({
  origin: ALLOWED_ORIGIN
}));

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    app: "ApnaMarket India Photo API",
    status: "running"
  });
});

app.post("/api/photo-signature", async (req, res) => {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return res.status(503).json({
        error: "Cloudinary configuration missing"
      });
    }

    const authorization =
      req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const token = authorization.slice(7);

    const { payload } = await jwtVerify(
      token,
      firebaseKeys,
      {
        issuer:
          `https://securetoken.google.com/${PROJECT_ID}`,
        audience: PROJECT_ID,
        algorithms: ["RS256"]
      }
    );

    if (!payload.sub || !payload.user_id) {
      return res.status(401).json({
        error: "Invalid Firebase token"
      });
    }

    const uid = payload.sub;

    if (uid !== payload.user_id) {
      return res.status(401).json({
        error: "Invalid user"
      });
    }

    // Check that the logged-in user owns a shop.
    const shopUrl =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
      `/databases/(default)/documents/shops/${encodeURIComponent(uid)}`;

    const shopResponse = await fetch(shopUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!shopResponse.ok) {
      return res.status(403).json({
        error: "Registered seller required"
      });
    }

    const shop = await shopResponse.json();

    if (shop.fields?.ownerId?.stringValue !== uid) {
      return res.status(403).json({
        error: "Shop ownership verification failed"
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const folder = `apnamarket/products/${uid}`;

    const params = {
      folder,
      timestamp
    };

    const signatureString =
      Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join("&");

    const signature = crypto
      .createHash("sha1")
      .update(signatureString + API_SECRET)
      .digest("hex");

    return res.json({
      cloudName: CLOUD_NAME,
      apiKey: API_KEY,
      timestamp,
      folder,
      signature
    });

  } catch (error) {
    console.error("Photo signature error:", error.message);

    return res.status(401).json({
      error: "Photo authorization failed"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Photo API running on port ${PORT}`);
});
