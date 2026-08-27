import React, { useState } from 'react';

const BACKEND_URL = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        onLoginSuccess(data.token);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection failed. Server offline?');
    }
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px', border: '1px solid var(--neon-purple)' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <span style={{ fontSize: '2.5rem' }}>🔐</span>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginTop: '8px' }}>ADMIN CONSOLE</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Verify credentials to access market controls</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(255, 62, 108, 0.1)', 
            border: '1px solid var(--neon-red)', 
            color: 'var(--neon-red)', 
            padding: '10px', 
            borderRadius: '8px', 
            marginBottom: '15px', 
            fontSize: '0.85rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              USERNAME
            </label>
            <input 
              type="text" 
              className="input-field" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              PASSWORD
            </label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, var(--neon-purple) 0%, #6f2dbd 100%)',
              boxShadow: '0 4px 15px rgba(157, 78, 221, 0.3)',
              color: '#fff'
            }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'UNLOCK PANEL'}
          </button>
        </form>
      </div>
    </div>
  );
}
