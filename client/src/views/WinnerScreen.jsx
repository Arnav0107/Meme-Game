import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import confetti from 'canvas-confetti';

const BACKEND_URL = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export default function WinnerScreen() {
  const { leaderboard } = useSocket();
  const [localLeaderboard, setLocalLeaderboard] = useState([]);

  useEffect(() => {
    // Fetch initial leaderboard directly on mount
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/leaderboard`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalLeaderboard(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLeaderboard();
  }, []);

  // Update local leaderboard when global socket triggers updates
  useEffect(() => {
    if (leaderboard && leaderboard.length > 0) {
      setLocalLeaderboard(leaderboard);
    }
  }, [leaderboard]);

  // Trigger continuous confetti showers for classroom projection
  useEffect(() => {
    if (localLeaderboard.length === 0) return;

    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        // Reset animation end to run indefinitely for classroom projection
        // We'll reset it to keep the hype going!
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      // Confetti from left and right sides
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, [localLeaderboard]);

  if (localLeaderboard.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90vh' }}>
        <h2 className="pulse-glow-text" style={{ color: 'var(--neon-cyan)' }}>Computing Final Portfolios...</h2>
      </div>
    );
  }

  const winner = localLeaderboard[0];
  const runnersUp = localLeaderboard.slice(1, 5);

  return (
    <div className="container" style={{ minHeight: '95vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontWeight: '800', 
          background: 'linear-gradient(135deg, var(--neon-gold) 0%, #ff8c00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }} className="pulse-glow-text">
          🏆 MARKET CLOSED 🏆
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginTop: '8px', letterSpacing: '0.1em' }}>
          THE CONTEST HAS CONCLUDED. ALL TRADES RECORDED.
        </p>
      </div>

      {/* Winner Spotlight Card */}
      {winner && (
        <div 
          className="glass-panel glow-gold" 
          style={{ 
            width: '100%', 
            maxWidth: '650px', 
            padding: '40px', 
            textAlign: 'center', 
            marginBottom: '40px',
            border: '2px solid var(--neon-gold)',
            background: 'linear-gradient(135deg, rgba(255, 190, 11, 0.1) 0%, rgba(15, 18, 25, 0.9) 100%)'
          }}
        >
          <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '10px' }} className="float-anim">👑</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--neon-gold)', fontWeight: 'bold', letterSpacing: '0.2em' }}>THE WINNER IS...</span>
          <h2 style={{ fontSize: '3rem', fontWeight: '800', margin: '10px 0', color: '#fff' }}>
            <span style={{ marginRight: '10px' }}>{winner.emoji}</span>
            {winner.name}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Wallet ID: MC-{winner._id.slice(-4).toUpperCase()}
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '30px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '25px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>FINAL CASH</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#fff' }}>
                ₹{Math.round(winner.cash).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PORTFOLIO VALUE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
                ₹{Math.round(winner.portfolioValue).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL RETURN</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>
                +{winner.roi}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Runner-ups list */}
      {runnersUp.length > 0 && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🥈 TOP 5 LEADERBOARD RUNNERS-UP
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {runnersUp.map((team, index) => (
              <div 
                key={team._id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    #{index + 2}
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>{team.emoji}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{team.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    ₹{Math.round(team.portfolioValue).toLocaleString()}
                  </span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: team.roi >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' 
                  }}>
                    {team.roi >= 0 ? '+' : ''}{team.roi}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: '30px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Educational simulation — no real money or cryptocurrency is involved.
      </p>
    </div>
  );
}
