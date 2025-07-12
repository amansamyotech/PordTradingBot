import React, { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    const res = await fetch(`http://localhost:5000/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } else {
      alert(data.error);
    }
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#e0f0ff'
    }}>
      <div style={{
        background: '#fff', padding: 30, borderRadius: 10,
        boxShadow: '0 0 10px rgba(0,0,0,0.1)', textAlign: 'center'
      }}>
        <img src="/logo.png" width="80" />
        <h2 style={{ margin: '20px 0' }}>Login</h2>
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: 250, padding: 10, marginBottom: 10 }}
        /><br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: 250, padding: 10, marginBottom: 20 }}
        /><br />
        <button onClick={handleLogin} style={{
          padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: 5
        }}>Login</button>
      </div>
    </div>
  );
}
