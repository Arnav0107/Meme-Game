import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

const AVAILABLE_EMOJIS = ['🚀', '🐸', '🍕', '🗿', '💀', '🤡', '🦍', '🐕', '💎', '👑', '🐋', '🦁'];

export default function LandingPage() {
  const { joinTeam } = useSocket();
  const [teamName, setTeamName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Please choose a valid Team Name!');
      return;
    }

    setLoading(true);
    const res = await joinTeam(teamName, selectedEmoji);
    setLoading(false);

    if (!res.success) {
      setError(res.message);
    }
  };

  return (
    <div className="container" style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      
      {/* Landing Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }} className="float-anim">
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: '800', 
          background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          🚨 MEME COIN MARKET 🚨
        </h1>
        <p style={{ 
          fontSize: '1.25rem', 
          color: 'var(--text-secondary)', 
          fontFamily: 'var(--font-title)', 
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          Buy. Sell. Panic. Survive.
        </p>
      </div>

      {/* Main Glass Joining Card */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '30px' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
          Create Your Team
        </h3>
        
        {error && (
          <div style={{ 
            background: 'rgba(255, 62, 108, 0.1)', 
            border: '1px solid var(--neon-red)', 
            color: 'var(--neon-red)', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '15px', 
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              TEAM NAME
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Crypto Chai / Moon Boys"
              maxLength={20}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              CHOOSE TEAM EMOJI
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(6, 1fr)', 
              gap: '10px', 
              background: 'rgba(0, 0, 0, 0.2)', 
              padding: '12px', 
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              {AVAILABLE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  style={{
                    fontSize: '1.6rem',
                    background: selectedEmoji === emoji ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                    border: selectedEmoji === emoji ? '1px solid var(--neon-cyan)' : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }}
            disabled={loading}
          >
            {loading ? 'Entering Market...' : '🚨 JOIN MARKET 🚨'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => setShowRules(true)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--neon-cyan)', 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            How to play? (20s guide)
          </button>
        </div>
      </div>

      <p style={{ marginTop: '40px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Educational simulation — no real money or cryptocurrency is involved.
      </p>

      {/* Rules Modal */}
      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', border: '1px solid var(--neon-cyan)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--neon-cyan)', marginBottom: '15px', textAlign: 'center' }}>
              ⚡ HOW TO PLAY
            </h3>
            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
              <li>💰 You start with <strong>₹1,000</strong> virtual cash.</li>
              <li>📈 Buy and sell meme coins in real-time.</li>
              <li>📰 Watch the breaking news. Prices will pump and crash.</li>
              <li>🚀 Final portfolio value determines the winner.</li>
              <li>🏆 <strong>Highest ROI wins!</strong> Survive the chaos.</li>
            </ul>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '20px' }}
              onClick={() => setShowRules(false)}
            >
              GOT IT! Let's Trade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
