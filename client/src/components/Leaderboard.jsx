import React from 'react';

export default function Leaderboard({ teams = [], currentTeamId = null }) {
  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🏆 LEADERBOARD
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ color: 'var(--text-secondary)' }}>Rank</th>
              <th style={{ color: 'var(--text-secondary)' }}>Team</th>
              <th style={{ color: 'var(--text-secondary)' }}>Cash</th>
              <th style={{ color: 'var(--text-secondary)' }}>Portfolio</th>
              <th style={{ color: 'var(--text-secondary)' }}>ROI</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  No teams joined yet. Be the first!
                </td>
              </tr>
            ) : (
              teams.map((t) => {
                const isMyTeam = currentTeamId === t._id;
                const isPositive = t.profit >= 0;
                
                // Style ranks dynamically
                let rankEmoji = '';
                let rankStyle = {};
                if (t.rank === 1) {
                  rankEmoji = '🥇 ';
                  rankStyle = { color: 'var(--neon-gold)', fontWeight: 'bold' };
                } else if (t.rank === 2) {
                  rankEmoji = '🥈 ';
                  rankStyle = { color: '#e2e2e2', fontWeight: 'bold' };
                } else if (t.rank === 3) {
                  rankEmoji = '🥉 ';
                  rankStyle = { color: '#cd7f32', fontWeight: 'bold' };
                }

                return (
                  <tr 
                    key={t._id} 
                    className={isMyTeam ? 'glow-cyan' : ''}
                    style={{ 
                      background: isMyTeam ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                      borderLeft: isMyTeam ? '4px solid var(--neon-cyan)' : 'none'
                    }}
                  >
                    <td style={rankStyle}>
                      {rankEmoji}{t.rank}
                    </td>
                    <td style={{ fontWeight: isMyTeam ? 'bold' : 'normal' }}>
                      <span style={{ marginRight: '6px' }}>{t.emoji}</span>
                      {t.name} {isMyTeam && <span style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', border: '1px solid var(--neon-cyan)', padding: '1px 4px', borderRadius: '4px', marginLeft: '6px' }}>YOU</span>}
                    </td>
                    <td>₹{Math.round(t.cash).toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{Math.round(t.portfolioValue).toLocaleString()}</td>
                    <td style={{ color: isPositive ? 'var(--neon-green)' : 'var(--neon-red)', fontWeight: 'bold' }}>
                      {isPositive ? '+' : ''}{t.roi}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
