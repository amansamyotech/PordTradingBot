import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, wins: 0, pnl: 0 });
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState({
    binanceApiKey: "",
    binanceApiSecret: "",
    botEnabled: false,
    telegramEnabled: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`http://localhost:5000/api/binance/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setStats);

    fetch(`http://localhost:5000/api/binance/trades`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setTrades);
  }, []);

  const updateSettings = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:5000/api/binance/keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert("Settings saved!");

      // Start the bot right after saving
      const startRes = await fetch(
        `http://localhost:5000/api/binance/test-trade`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (startRes.ok) {
        alert("Bot started!");
      } else {
        alert("Failed to start bot.");
      }
    } else {
      alert("Failed to save settings.");
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Binance Trading Bot</h1>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: 30 }}>
        <h2>API Key</h2>
        <input
          placeholder="API Key"
          style={{ width: 300 }}
          value={form.binanceApiKey}
          onChange={(e) => setForm({ ...form, binanceApiKey: e.target.value })}
        />
        <br />
        <br />
        <input
          placeholder="API Secret"
          style={{ width: 300 }}
          value={form.binanceApiSecret}
          onChange={(e) =>
            setForm({ ...form, binanceApiSecret: e.target.value })
          }
        />
        <br />
        <br />
        <label>
          <input
            type="checkbox"
            checked={form.botEnabled}
            onChange={(e) => setForm({ ...form, botEnabled: e.target.checked })}
          />{" "}
          Enable Bot
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={form.telegramEnabled}
            onChange={(e) =>
              setForm({ ...form, telegramEnabled: e.target.checked })
            }
          />{" "}
          Telegram Alerts
        </label>
        <br />
        <br />
        <button
          style={{ background: "#007bff", color: "white", padding: 10 }}
          onClick={updateSettings}
        >
          Save
        </button>
      </div>

      <div style={{ marginTop: 50 }}>
        <h2>Dashboard</h2>
        <p>
          Total Trades: <strong>{stats.total}</strong>
        </p>
        <p>
          Winning Trades: <strong>{stats.wins}</strong>
        </p>
        <p>
          Profit/Loss: <strong>{stats.pnl.toFixed(5)} BTC</strong>
        </p>
      </div>

      <div style={{ marginTop: 50 }}>
        <h2>Trade History</h2>
        <table
          border="1"
          cellPadding="10"
          style={{ width: "100%", marginTop: 10 }}
        >
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Type</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={i}>
                <td>{new Date(t.timestamp).toLocaleString()}</td>
                <td>{t.symbol}</td>
                <td>{t.type}</td>
                <td>{t.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
