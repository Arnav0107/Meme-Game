import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import Chart from '../components/Chart';
import confetti from 'canvas-confetti';

const COIN_COLORS = {
  FROG: '#00ff87',
  PIZZA: '#ffbe0b',
  STUPA: '#00e5ff',
  EXAM: '#ff3e6c'
};

export default function PresentationScreen() {
  const {
    gameState,
    coins,
    leaderboard,
    newsHistory,
    activeNewsOverlay,
    socket
  } = useSocket();

  const [lobbyTeams, setLobbyTeams] = useState([]);

  // Fetch all teams for the lobby view
  const fetchTeams = async () => {
    try {
      const res = await fetch(`${import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin}/api/leaderboard`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLobbyTeams(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Update lobby list in real time using socket leaderboard updates
  useEffect(() => {
    if (leaderboard && leaderboard.length > 0) {
      setLobbyTeams(leaderboard);
    }
  }, [leaderboard]);

  // Infinite Confetti Shower for the WINNER screen
  useEffect(() => {
    if (gameState.status !== 'FINISHED' || lobbyTeams.length === 0) return;

    const duration = 999999; // Arbitrary high number for continuous display
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 1000 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return;

      confetti({ ...defaults, particleCount: 30, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount: 30, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 300);

    return () => clearInterval(interval);
  }, [gameState.status, lobbyTeams]);

  // Format timer
  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // VIEW 1: WAITING LOBBY MODE
  // ==========================================
  if (gameState.status === 'WAITING') {
    return (
      <div className="container" style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }} className="float-anim">
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: '800', 
            background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px'
          }}>
            🚨 MEME COIN MARKET LOBBY 🚨
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.4rem', letterSpacing: '0.05em' }}>
            SCAN THE LECTURE SCREEN QR / OPEN LINK TO REGISTER YOUR TEAM!
          </p>
        </div>

        {/* Dynamic Teams Joined Widget */}
        <div className="glass-panel" style={{ padding: '30px', margin: '0 auto', width: '100%', maxWidth: '900px', border: '1px solid var(--neon-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--neon-cyan)' }}>👥 TEAMS PREPARING</h3>
            <span style={{ 
              background: 'rgba(0, 229, 255, 0.15)', 
              color: 'var(--neon-cyan)', 
              fontWeight: 'bold', 
              fontSize: '1.2rem', 
              padding: '6px 16px', 
              borderRadius: '20px',
              border: '1px solid var(--neon-cyan)'
            }}>
              COUNT: {lobbyTeams.length}
            </span>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
            gap: '15px', 
            maxHeight: '400px', 
            overflowY: 'auto',
            padding: '10px'
          }}>
            {lobbyTeams.length === 0 ? (
              <div style={{ gridColumn: 'span 4', textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0', fontSize: '1.1rem' }} className="pulse-glow-text">
                Waiting for the first team to enter the market... 🚀
              </div>
            ) : (
              lobbyTeams.map((t) => (
                <div 
                  key={t._id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '15px', 
                    textAlign: 'center', 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold', 
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '6px' }}>{t.emoji}</span>
                  <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h2 className="pulse-glow-text" style={{ color: 'var(--neon-gold)', fontFamily: 'var(--font-title)', letterSpacing: '0.1em' }}>
            🛰️ SIMULATION WAITING TO BEGIN...
          </h2>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FINAL WINNER PODIUM MODE
  // ==========================================
  if (gameState.status === 'FINISHED') {
    const winner = lobbyTeams[0];
    const runnersUp = lobbyTeams.slice(1, 5);

    return (
      <div className="container" style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '4rem', 
            fontWeight: '800', 
            background: 'linear-gradient(135deg, var(--neon-gold) 0%, #ff8c00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }} className="pulse-glow-text">
            🏆 CONTEST CONCLUDED 🏆
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', marginTop: '6px' }}>
            FINAL MULTIPLAYER LEADERBOARD RANKINGS
          </p>
        </div>

        {winner && (
          <div 
            className="glass-panel glow-gold" 
            style={{ 
              width: '100%', 
              maxWidth: '700px', 
              padding: '40px', 
              textAlign: 'center', 
              marginBottom: '35px',
              border: '2px solid var(--neon-gold)',
              background: 'linear-gradient(135deg, rgba(255, 190, 11, 0.1) 0%, rgba(15, 18, 25, 0.95) 100%)'
            }}
          >
            <span style={{ fontSize: '5rem', display: 'block', marginBottom: '8px' }} className="float-anim">👑</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--neon-gold)', fontWeight: 'bold', letterSpacing: '0.25em' }}>THE MARKET CHAMPION</span>
            <h2 style={{ fontSize: '3.2rem', fontWeight: '800', margin: '10px 0', color: '#fff' }}>
              <span style={{ marginRight: '10px' }}>{winner.emoji}</span>
              {winner.name}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '30px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '25px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>FINAL CASH</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                  ₹{Math.round(winner.cash).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PORTFOLIO VALUE</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
                  ₹{Math.round(winner.portfolioValue).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SESSION ROI</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>
                  +{winner.roi}%
                </div>
              </div>
            </div>
          </div>
        )}

        {runnersUp.length > 0 && (
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🥈 RUNNERS-UP PODIUM
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
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE LIVE TRADING SIMULATION MODE
  // ==========================================
  return (
    <div className="container" style={{ maxWidth: '1400px', position: 'relative' }}>
      
      {/* Dynamic News Alert Cover Overlay */}
      {activeNewsOverlay && (
        <div className="news-overlay-container shake" style={{ background: 'rgba(5, 6, 8, 0.92)' }}>
          <div className="news-flash-card glass-panel" style={{ maxWidth: '800px', padding: '40px', borderColor: COIN_COLORS[activeNewsOverlay.coinId] || 'var(--neon-cyan)', borderWidth: '3px' }}>
            <h4 style={{ color: 'var(--neon-red)', fontSize: '1.8rem', fontWeight: '800', marginBottom: '15px', fontFamily: 'var(--font-title)' }}>
              🚨 BREAKING MARKET NEWS 🚨
            </h4>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '20px', color: '#fff', lineHeight: '1.3' }}>
              {activeNewsOverlay.headline}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '1.25rem', lineHeight: '1.7' }}>
              {activeNewsOverlay.content}
            </p>

            {activeNewsOverlay.coinId && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '2.5rem' }}>{activeNewsOverlay.emoji}</span>
                  <span style={{ fontWeight: '800', fontSize: '1.6rem' }}>${activeNewsOverlay.coinId}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>MARKET REACTION</div>
                  <div style={{ 
                    color: activeNewsOverlay.changePercent > 0 ? 'var(--neon-green)' : 'var(--neon-red)',
                    fontWeight: '800',
                    fontSize: '1.8rem'
                  }}>
                    ₹{activeNewsOverlay.oldPrice} → ₹{activeNewsOverlay.newPrice} 
                    ({activeNewsOverlay.changePercent > 0 ? '+' : ''}{activeNewsOverlay.changePercent}%)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Active Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📊 MEME COIN MARKET CONTEST
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Educational Web3 Trading Simulation — Project Board
          </p>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* Status badge */}
          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '3px solid var(--neon-green)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-green)', boxShadow: '0 0 10px var(--neon-green)' }} className="pulse-glow-text"></span>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>MARKET: LIVE</span>
          </div>

          {/* Countdown Clock */}
          <div className="glass-panel" style={{ padding: '10px 24px', textAlign: 'center', minWidth: '150px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TIME REMAINING</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--neon-cyan)', fontFamily: 'var(--font-title)', lineHeight: '1.1' }}>
              {formatTimer(gameState.timerRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '25px', marginTop: '10px' }}>
        
        {/* Left Side: Active Coins */}
        <div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: 'var(--text-secondary)' }}>🪙 LIVE PRICES</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {coins.map((coin) => {
              const initialPrice = 10;
              const priceDiff = coin.currentPrice - initialPrice;
              const sessionChange = Math.round((priceDiff / initialPrice) * 100);
              const isPriceUp = sessionChange >= 0;
              const color = COIN_COLORS[coin.id] || 'var(--neon-cyan)';

              return (
                <div 
                  key={coin.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '24px', 
                    borderLeft: `4px solid ${color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '230px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: `1px solid ${color}` }}>
                        <img 
                          src={`/assets/${coin.id.toLowerCase()}.png`}
                          alt={coin.name}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            position: 'absolute',
                            top: 0,
                            left: 0
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span style={{ fontSize: '2rem', zIndex: -1 }}>{coin.emoji}</span>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{coin.name}</h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>${coin.id}</span>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 'bold',
                      color: isPriceUp ? 'var(--neon-green)' : 'var(--neon-red)',
                      background: isPriceUp ? 'rgba(0, 255, 135, 0.08)' : 'rgba(255, 62, 108, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {isPriceUp ? '▲' : '▼'} {Math.abs(sessionChange)}%
                    </span>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>CURRENT PRICE</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: '800', color: color, fontFamily: 'var(--font-title)', lineHeight: '1.1' }}>
                      ₹{coin.currentPrice}
                    </div>
                  </div>

                  {/* High Resolution Sparkline Canvas Chart */}
                  <Chart priceHistory={coin.priceHistory} coinColor={color} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Leaderboard Ranks list */}
        <div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: 'var(--text-secondary)' }}>🏆 STANDINGS LEADERBOARD</h3>
          
          <div className="glass-panel" style={{ padding: '25px', minHeight: '520px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Rank</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Team</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Portfolio</th>
                  <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '1rem' }}>ROI</th>
                </tr>
              </thead>
              <tbody>
                {lobbyTeams.slice(0, 7).map((t, index) => {
                  let rankEmoji = '';
                  let rankStyle = { fontSize: '1.1rem', fontWeight: 'bold' };
                  if (t.rank === 1) {
                    rankEmoji = '🥇 ';
                    rankStyle.color = 'var(--neon-gold)';
                  } else if (t.rank === 2) {
                    rankEmoji = '🥈 ';
                    rankStyle.color = '#e2e2e2';
                  } else if (t.rank === 3) {
                    rankEmoji = '🥉 ';
                    rankStyle.color = '#cd7f32';
                  }

                  return (
                    <tr key={t._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '16px 12px', ...rankStyle }}>
                        {rankEmoji}{t.rank}
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                        <span style={{ marginRight: '8px' }}>{t.emoji}</span>
                        {t.name}
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '1.1rem', fontWeight: '500' }}>
                        ₹{Math.round(t.portfolioValue).toLocaleString()}
                      </td>
                      <td style={{ 
                        padding: '16px 12px', 
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: t.roi >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' 
                      }}>
                        {t.roi >= 0 ? '+' : ''}{t.roi}%
                      </td>
                    </tr>
                  );
                })}
                {lobbyTeams.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0', fontSize: '1.1rem' }}>
                      No teams registered in stand yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Bottom News Ticker */}
      <div style={{ marginTop: '25px' }} className="ticker-tape">
        <div className="ticker-inner">
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--neon-cyan)', letterSpacing: '0.05em' }}>
            {newsHistory.length === 0 
              ? "🚨 MARKET NEWS FEED IS WAITING FOR ACTIVITY... 🚨" 
              : newsHistory.map((item, idx) => `[${item.emoji} ${item.headline} (${item.changePercent > 0 ? '+' : ''}${item.changePercent}%)]`).join('   |   ')}
          </span>
        </div>
      </div>

    </div>
  );
}
