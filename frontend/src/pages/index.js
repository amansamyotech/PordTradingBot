import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: 50 }}>
      <img src="/logo.png" width="100" />
      <h1>Binance Bot Dashboard</h1>
      <Link href="/login"><button style={{ marginTop: 20 }}>Go to Login</button></Link>
    </div>
  );
}
