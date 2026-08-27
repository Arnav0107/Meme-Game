import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/Modal';

const BACKEND_URL = import.meta.env.VITE_API_URL || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://localhost:5000' 
    : window.location.origin);

export default function AdminDashboard({ adminToken, onLogout }) {
  const {
    gameState,
    coins,
    timeUntilNextEvent,
    adminTeams,
    adminTrades,
    adminEvents,
    adminFetchTeams,
    adminFetchTrades,
    adminFetchEvents,
    adminCommand,
    socket
  } = useSocket();

  // Manual pricing and news state
  const [selectedCoin, setSelectedCoin] = useState('FROG');
  const [manualPrice, setManualPrice] = useState('10');
  
  const [customHeadline, setCustomHeadline] = useState('');
  const [customContent, setCustomContent] = useState('');

  // Timeline Event creator state
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventOrder, setEventOrder] = useState('1');
  const [eventName, setEventName] = useState('');
  const [eventHeadline, setEventHeadline] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCoinId, setEventCoinId] = useState('FROG');
  const [eventNewPrice, setEventNewPrice] = useState('10');
  const [eventDelay, setEventDelay] = useState('45');
  const [eventEmoji, setEventEmoji] = useState('📢');

  // Confirmation state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState(null);
  const [resetConfirmTeam, setResetConfirmTeam] = useState(null);

  // Live log stream
  const [localActivityLog, setLocalActivityLog] = useState([]);
  const logContainerRef = useRef(null);

  // Initial load
  useEffect(() => {
    if (adminToken) {
      adminFetchTeams(adminToken);
      adminFetchTrades(adminToken);
      adminFetchEvents(adminToken);
    }
  }, [adminToken]);

  // Join Socket admin room and bind events
  useEffect(() => {
    if (socket) {
      socket.emit('join_admin');

      const handleLiveActivity = (activity) => {
        setLocalActivityLog(prev => [...prev.slice(-99), activity]);
      };

      const handleLeaderboard = () => {
        adminFetchTeams(adminToken);
      };

      const handlePrices = () => {
        adminFetchTeams(adminToken);
        adminFetchEvents(adminToken);
      };

      const handleState = () => {
        adminFetchEvents(adminToken);
      };

      socket.on('live_activity', handleLiveActivity);
      socket.on('leaderboard_updated', handleLeaderboard);
      socket.on('prices_updated', handlePrices);
      socket.on('game_state_changed', handleState);

      return () => {
        socket.off('live_activity', handleLiveActivity);
        socket.off('leaderboard_updated', handleLeaderboard);
        socket.off('prices_updated', handlePrices);
        socket.off('game_state_changed', handleState);
      };
    }
  }, [socket, adminToken]);

  // Auto scroll log to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [localActivityLog]);

  // Quick state actions
  const triggerStateAction = async (action) => {
    const res = await adminCommand(`game/${action}`, {}, adminToken);
    if (!res.success) alert(res.message);
  };

  const handleResetGame = async () => {
    setResetConfirmOpen(false);
    const res = await adminCommand('game/reset', {}, adminToken);
    if (res.success) {
      setLocalActivityLog([]);
      alert('Game fully reset successfully!');
    } else {
      alert(res.message);
    }
  };

  const handleManualPriceChange = async (e) => {
    e.preventDefault();
    if (!manualPrice || isNaN(manualPrice)) return;
    const res = await adminCommand('price/change', { coinId: selectedCoin, newPrice: manualPrice }, adminToken);
    if (res.success) {
      setManualPrice('');
      alert(`Successfully updated $${selectedCoin} price manually!`);
    } else {
      alert(res.message);
    }
  };

  const handleManualNewsBroadcast = async (e) => {
    e.preventDefault();
    if (!customHeadline.trim()) return;
    const res = await adminCommand('news/broadcast', { headline: customHeadline, content: customContent }, adminToken);
    if (res.success) {
      setCustomHeadline('');
      setCustomContent('');
      alert('Successfully broadcasted custom news event!');
    } else {
      alert(res.message);
    }
  };

  // Trigger event immediately
  const handleTriggerEvent = async (eventId) => {
    const res = await adminCommand(`events/${eventId}/trigger`, {}, adminToken);
    if (res.success) {
      alert('Timeline event triggered early successfully!');
    } else {
      alert(res.message);
    }
  };

  // Trigger next event early
  const handleTriggerNextEvent = async () => {
    // Find next untriggered event
    const next = adminEvents.find(ev => !ev.isTriggered);
    if (next) {
      handleTriggerEvent(next._id);
    } else {
      alert('No pending events left in the timeline!');
    }
  };

  // Reset triggers
  const handleResetEventTriggers = async () => {
    const res = await adminCommand('events/reset-triggers', {}, adminToken);
    if (res.success) {
      adminFetchEvents(adminToken);
      alert('Timeline event states reset successfully!');
    } else {
      alert(res.message);
    }
  };

  // Save Event creation/editing
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim() || !eventHeadline.trim()) return;

    const res = await adminCommand('events', {
      _id: editingEventId,
      order: parseInt(eventOrder),
      eventName,
      headline: eventHeadline,
      description: eventDesc,
      coinId: eventCoinId,
      newPrice: parseFloat(eventNewPrice),
      delay: parseInt(eventDelay),
      emoji: eventEmoji
    }, adminToken);

    if (res.success) {
      adminFetchEvents(adminToken);
      // Clear fields
      setEditingEventId(null);
      setEventName('');
      setEventHeadline('');
      setEventDesc('');
      setEventOrder(parseInt(eventOrder) + 1 + '');
      alert('Event saved successfully!');
    } else {
      alert(res.message);
    }
  };

  const handleEditEventClick = (event) => {
    setEditingEventId(event._id);
    setEventOrder(event.order + '');
    setEventName(event.eventName);
    setEventHeadline(event.headline);
    setEventDesc(event.description);
    setEventCoinId(event.coinId);
    setEventNewPrice(event.newPrice + '');
    setEventDelay(event.delay + '');
    setEventEmoji(event.emoji);
  };

  // Team Management calls
  const handleFreezeTeam = async (teamId) => {
    await adminCommand(`teams/${teamId}/freeze`, {}, adminToken);
  };

  const handleConfirmResetTeam = async () => {
    if (!resetConfirmTeam) return;
    const res = await adminCommand(`teams/${resetConfirmTeam._id}/reset`, {}, adminToken);
    setResetConfirmTeam(null);
    if (!res.success) alert(res.message);
  };

  const handleConfirmDeleteTeam = async () => {
    if (!deleteConfirmTeam) return;
    const res = await adminCommand(`teams/${deleteConfirmTeam._id}`, {}, adminToken, 'DELETE');
    // Note: our controller DELETE endpoint maps to DELETE method, let's execute properly
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/teams/${deleteConfirmTeam._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await response.json();
      setDeleteConfirmTeam(null);
      if (data.success) {
        adminFetchTeams(adminToken);
        adminFetchTrades(adminToken);
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('Error removing team');
    }
  };

  const formatTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1400px' }}>
      
      {/* Admin Title bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--neon-purple)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⚙️ ADMIN CONTROL DASHBOARD
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Multiplayer Meme Market Live Regulation Engine
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
            onClick={() => window.open('/winner-board', '_blank')}
          >
            📺 PRESENTATION SCREEN
          </button>
          <button className="btn btn-danger" onClick={onLogout}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* Main Grid: State & Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', marginBottom: '25px' }}>
        
        {/* Game State Panel */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--neon-purple)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--neon-purple)' }}>🕹️ GAME CONTROL PANEL</h3>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ flex: '1', background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GAME STATE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{gameState.status}</div>
            </div>
            <div style={{ flex: '1', background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TIMER COUNTDOWN</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>
                {Math.floor(gameState.timerRemaining / 60)}:{(gameState.timerRemaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <button className="btn btn-green" onClick={() => triggerStateAction('start')} disabled={gameState.status === 'LIVE'}>
              START GAME
            </button>
            <button className="btn btn-red" onClick={() => triggerStateAction('finish')} disabled={gameState.status === 'FINISHED'}>
              FINISH GAME
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <button className="btn btn-outline" onClick={() => triggerStateAction('pause')} disabled={gameState.status !== 'LIVE'}>
              ⏸️ PAUSE TIMER
            </button>
            <button className="btn btn-outline" onClick={() => triggerStateAction('resume')} disabled={gameState.status !== 'PAUSED'}>
              ▶️ RESUME TIMER
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-danger" onClick={() => setResetConfirmOpen(true)}>
              💥 RESET GAME
            </button>
            <button 
              className="btn btn-outline" 
              style={{ borderColor: gameState.tradingFrozen ? 'var(--neon-green)' : 'var(--neon-red)', color: gameState.tradingFrozen ? 'var(--neon-green)' : 'var(--neon-red)' }}
              onClick={() => triggerStateAction('freeze-trading')}
            >
              {gameState.tradingFrozen ? '🔓 UNFREEZE TRADING' : '🔒 FREEZE TRADING'}
            </button>
          </div>
        </div>

        {/* Manual Price Override */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--neon-cyan)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--neon-cyan)' }}>💹 PRICE OVERRIDE</h3>
          <form onSubmit={handleManualPriceChange}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>COIN</label>
              <select 
                className="input-field" 
                value={selectedCoin} 
                onChange={(e) => setSelectedCoin(e.target.value)}
              >
                {coins.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name} (${c.id}) - Current: ₹{c.currentPrice}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>NEW PRICE (₹)</label>
              <input 
                type="number"
                step="0.01" 
                className="input-field" 
                placeholder="e.g. 25"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              FORCE PRICE UPDATE
            </button>
          </form>
        </div>

        {/* Manual News Flash Broadcast */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--neon-red)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--neon-red)' }}>📣 NEWS BROADCAST</h3>
          <form onSubmit={handleManualNewsBroadcast}>
            <div style={{ marginBottom: '10px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="News Headline (e.g. Whale dumps $FROG!)"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <textarea 
                className="input-field" 
                rows="2"
                style={{ resize: 'none' }}
                placeholder="News Description content detailing the impact..."
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-red" style={{ width: '100%' }}>
              🚨 BROADCAST NEWS FLASH
            </button>
          </form>
        </div>

      </div>

      {/* Grid: Events timeline & Live logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '25px' }}>
        
        {/* Timeline Manager */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>📅 AUTOMATED EVENTS TIMELINE</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleResetEventTriggers}>
                RESET STATES
              </button>
              <button 
                className="btn btn-primary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--neon-green) 0%, #00b359 100%)', boxShadow: 'none' }}
                onClick={handleTriggerNextEvent}
              >
                TRIGGER NEXT EVENT
              </button>
            </div>
          </div>

          {gameState.automaticMode && gameState.status === 'LIVE' && (
            <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid var(--neon-cyan)', borderRadius: '8px', padding: '10px', marginBottom: '15px', fontSize: '0.9rem', color: 'var(--neon-cyan)' }}>
              ⏳ Auto Mode Active: Next event fires in <strong>{timeUntilNextEvent} seconds</strong>
            </div>
          )}

          <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Ord</th>
                  <th style={{ padding: '8px' }}>Emoji</th>
                  <th style={{ padding: '8px' }}>Event Name</th>
                  <th style={{ padding: '8px' }}>Headline</th>
                  <th style={{ padding: '8px' }}>Target Price</th>
                  <th style={{ padding: '8px' }}>Delay (s)</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminEvents.map((ev) => (
                  <tr key={ev._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{ev.order}</td>
                    <td style={{ padding: '8px', fontSize: '1.2rem' }}>{ev.emoji}</td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{ev.eventName}</td>
                    <td style={{ padding: '8px', fontWeight: '500', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.headline}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                      ${ev.coinId} → ₹{ev.newPrice}
                    </td>
                    <td style={{ padding: '8px' }}>{ev.delay}s</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ 
                        color: ev.isTriggered ? 'var(--neon-green)' : 'var(--text-muted)', 
                        fontWeight: 'bold' 
                      }}>
                        {ev.isTriggered ? 'TRIGGERED' : 'PENDING'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleTriggerEvent(ev._id)}
                        disabled={ev.isTriggered}
                      >
                        FIRE NOW
                      </button>
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleEditEventClick(ev)}
                      >
                        EDIT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Logs activity stream */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '15px', color: 'var(--neon-cyan)' }}>📊 LIVE MARKET TRADE FEED</h3>
          
          <div 
            ref={logContainerRef}
            style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              borderRadius: '10px', 
              padding: '12px', 
              height: '350px', 
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              fontFamily: 'monospace',
              fontSize: '0.85rem'
            }}
          >
            {localActivityLog.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '50px 0' }}>
                Waiting for trading activity...
              </div>
            ) : (
              localActivityLog.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>[{formatTime(log.timestamp)}]</span>
                  <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{log.teamName}:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Team Management panel */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '25px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '15px' }}>👥 TEAM PORTFOLIO MANAGEMENT</h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Rank</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Team Name (ID)</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Cash</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Holdings</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Portfolio</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>ROI</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminTeams.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    No teams have joined yet. Share the link with players!
                  </td>
                </tr>
              ) : (
                adminTeams.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>#{t.rank}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ marginRight: '6px' }}>{t.emoji}</span>
                      <strong>{t.name}</strong> 
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', block: 'inline', marginLeft: '6px' }}>
                        (MC-{t._id.slice(-4).toUpperCase()})
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>₹{Math.round(t.cash).toLocaleString()}</td>
                    <td style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      🐸:{(t.holdings && t.holdings.FROG) || 0} | 🍕:{(t.holdings && t.holdings.PIZZA) || 0} | 🗿:{(t.holdings && t.holdings.STUPA) || 0} | 💀:{(t.holdings && t.holdings.EXAM) || 0}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>₹{Math.round(t.portfolioValue).toLocaleString()}</td>
                    <td style={{ padding: '10px', color: t.profit >= 0 ? 'var(--neon-green)' : 'var(--neon-red)', fontWeight: 'bold' }}>
                      {t.profit >= 0 ? '+' : ''}{t.roi}%
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        color: t.isFrozen ? 'var(--neon-red)' : 'var(--neon-green)', 
                        fontWeight: 'bold',
                        fontSize: '0.8rem'
                      }}>
                        {t.isFrozen ? 'FROZEN' : 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: t.isFrozen ? 'var(--neon-green)' : 'var(--neon-gold)', color: t.isFrozen ? 'var(--neon-green)' : 'var(--neon-gold)' }}
                        onClick={() => handleFreezeTeam(t._id)}
                      >
                        {t.isFrozen ? 'UNFREEZE' : 'FREEZE'}
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                        onClick={() => setResetConfirmTeam(t)}
                      >
                        RESET
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => setDeleteConfirmTeam(t)}
                      >
                        KICK
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Timeline Creator Editor Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '15px', color: 'var(--neon-purple)' }}>
          {editingEventId ? '✏️ EDIT TIMELINE EVENT' : '➕ CREATE TIMELINE EVENT'}
        </h3>
        
        <form onSubmit={handleSaveEvent} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          
          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ORDER</label>
            <input 
              type="number" 
              className="input-field" 
              value={eventOrder} 
              onChange={(e) => setEventOrder(e.target.value)} 
              required
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>EVENT NAME</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. FROG_PUMP" 
              value={eventName} 
              onChange={(e) => setEventName(e.target.value)} 
              required
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>EVENT EMOJI</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. 🚀" 
              value={eventEmoji} 
              onChange={(e) => setEventEmoji(e.target.value)} 
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>DELAY (SEC)</label>
            <input 
              type="number" 
              className="input-field" 
              value={eventDelay} 
              onChange={(e) => setEventDelay(e.target.value)} 
              required
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>NEWS HEADLINE</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="News headlines displayed on overlay..." 
              value={eventHeadline} 
              onChange={(e) => setEventHeadline(e.target.value)} 
              required
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>NEWS DESCRIPTION</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Details regarding event news content..." 
              value={eventDesc} 
              onChange={(e) => setEventDesc(e.target.value)} 
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TARGET COIN</label>
            <select className="input-field" value={eventCoinId} onChange={(e) => setEventCoinId(e.target.value)}>
              <option value="FROG">$FROG</option>
              <option value="PIZZA">$PIZZA</option>
              <option value="STUPA">$STUPA</option>
              <option value="EXAM">$EXAM</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>TARGET NEW PRICE (₹)</label>
            <input 
              type="number" 
              step="0.01" 
              className="input-field" 
              value={eventNewPrice} 
              onChange={(e) => setEventNewPrice(e.target.value)} 
              required
            />
          </div>

          <div style={{ gridColumn: 'span 4', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            {editingEventId && (
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setEditingEventId(null);
                  setEventName('');
                  setEventHeadline('');
                  setEventDesc('');
                }}
              >
                CANCEL EDIT
              </button>
            )}
            <button type="submit" className="btn btn-green">
              {editingEventId ? 'SAVE CHANGES' : 'CREATE EVENT'}
            </button>
          </div>

        </form>
      </div>

      {/* CONFIRMATION MODALS */}
      
      {/* Reset game confirm */}
      <Modal isOpen={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} title="🚨 RESET GAME CONFIRMATION">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
          Are you sure you want to reset the game? This will <strong>permanently delete all team registrations, wallets, portfolios, transaction logs, and reset coin prices</strong> back to ₹10!
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" style={{ flex: '1' }} onClick={() => setResetConfirmOpen(false)}>
            CANCEL
          </button>
          <button className="btn btn-red" style={{ flex: '1' }} onClick={handleResetGame}>
            CONFIRM FULL RESET
          </button>
        </div>
      </Modal>

      {/* Team delete confirm */}
      {deleteConfirmTeam && (
        <Modal isOpen={!!deleteConfirmTeam} onClose={() => setDeleteConfirmTeam(null)} title="Kick Team">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Are you sure you want to remove team <strong>{deleteConfirmTeam.name}</strong> from the market? Their balance and holdings will be completely wiped out.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" style={{ flex: '1' }} onClick={() => setDeleteConfirmTeam(null)}>
              CANCEL
            </button>
            <button className="btn btn-red" style={{ flex: '1' }} onClick={handleConfirmDeleteTeam}>
              REMOVE TEAM
            </button>
          </div>
        </Modal>
      )}

      {/* Team reset confirm */}
      {resetConfirmTeam && (
        <Modal isOpen={!!resetConfirmTeam} onClose={() => setResetConfirmTeam(null)} title="Reset Team Portfolio">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Are you sure you want to reset team <strong>{resetConfirmTeam.name}</strong>? Their wallet cash will return to ₹1,000, and holdings/trades will be wiped clean.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" style={{ flex: '1' }} onClick={() => setResetConfirmTeam(null)}>
              CANCEL
            </button>
            <button className="btn btn-primary" style={{ flex: '1' }} onClick={handleConfirmResetTeam}>
              RESET PORTFOLIO
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
