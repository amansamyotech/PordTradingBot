const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Trade = require("../models/Trade");
const router = express.Router();
const { testBuyThenSell, runBotForUser } = require("../worker/botEngine");
const { sendTelegram } = require("../services/telegramService");

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.use(authMiddleware);

router.post("/keys", async (req, res) => {
  const { binanceApiKey, binanceApiSecret, botEnabled, telegramEnabled } =
    req.body;
  await User.findByIdAndUpdate(req.user.id, {
    binanceApiKey,
    binanceApiSecret,
    botEnabled,
    telegramEnabled,
  });
  res.json({ message: "Settings saved" });
});

router.get("/trades", async (req, res) => {
  const trades = await Trade.find({ userId: req.user.id }).sort({
    timestamp: -1,
  });
  res.json(trades);
});

router.get("/stats", async (req, res) => {
  const trades = await Trade.find({ userId: req.user.id });
  const total = trades.length;
  const wins = trades.filter((t) => t.type === "BUY").length; // placeholder logic
  const pnl = trades.reduce(
    (acc, t) => acc + (t.type === "BUY" ? 0.0001 : -0.00005),
    0
  ); // simulated
  res.json({ total, wins, pnl });
});

router.post("/start-bot", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await runBotForUser(user); // run your trading logic once for testing
    res.json({ message: "Bot started for user" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start bot" });
  }
});
router.post("/test-trade", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const res = await testBuyThenSell(user);

    res.json({ message: "Test buy & sell completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

