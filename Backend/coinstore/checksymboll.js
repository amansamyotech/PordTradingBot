const crypto = require("crypto");
const axios = require("axios");

const apiKey = "460e56f22bedb4cbb9908603dcd6f7b1";
const secretKey = "31e4c0d4d894de2250c4e0c152cb8158";
const url = "https://api.coinstore.com/api/v2/public/config/spot/symbols";

const expires = Date.now(); // milliseconds
const expiresKey = Math.floor(expires / 30000).toString();

// Step 1: HMAC(secretKey, floor(expires / 30000))
const key = crypto
  .createHmac("sha256", Buffer.from(secretKey, "utf-8"))
  .update(Buffer.from(expiresKey, "utf-8"))
  .digest();

// Step 2: HMAC(key, payload)
const payload = JSON.stringify({});
const signature = crypto
  .createHmac("sha256", key)
  .update(Buffer.from(payload, "utf-8"))
  .digest("hex");

// Step 3: Prepare headers
const headers = {
  "X-CS-APIKEY": apiKey,
  "X-CS-SIGN": signature,
  "X-CS-EXPIRES": expires.toString(),
  "exch-language": "en_US",
  "Content-Type": "application/json",
  Accept: "*/*",
  Connection: "keep-alive",
};

// Step 4: Send the request
axios
  .post(url, {}, { headers })
  .then((res) => {
    console.log("✅ Success:", res.data);
  })
  .catch((err) => {
    console.error("❌ Error:", err.response?.data || err.message);
  });
