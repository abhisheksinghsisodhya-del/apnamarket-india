import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();

const allowedOrigin =
  "https://apnamarket-india.onrender.com";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    app: "ApnaMarket India Photo API",
    status: "running"
  });
});

// Firebase login token verification will be added
// before enabling photo upload signatures.

app.post("/api/photo-signature", (req, res) => {
  res.status(503).json({
    error: "Photo uploads are not enabled yet."
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Photo API running on port ${PORT}`);
});
