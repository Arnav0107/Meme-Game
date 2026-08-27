import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const BACKEND_URL = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState({
    status: 'WAITING',
    timerRemaining: 600,
    totalDuration: 600,
    automaticMode: true,
    tradingFrozen: false,
    activeNews: null
  });
  const [coins, setCoins] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [team, setTeam] = useState(null);
  const [tradesHistory, setTradesHistory] = useState([]);
  const [newsHistory, setNewsHistory] = useState([]);
  const [activeNewsOverlay, setActiveNewsOverlay] = useState(null);
  const [adminActivityLog, setAdminActivityLog] = useState([]);
  const [adminTeams, setAdminTeams] = useState([]);
  const [adminTrades, setAdminTrades] = useState([]);
  const [adminEvents, setAdminEvents] = useState([]);
  const [timeUntilNextEvent, setTimeUntilNextEvent] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play browser synth alert sounds
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'pump') {
        // High-pitch rising slide (happy)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'dump') {
        // Lower sliding sweep (panic)
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'news') {
        // Retro dual-tone beep beep
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        oscillator.frequency.setValueAtTime(698.46, audioCtx.currentTime + 0.1); // F5
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  };

  // Re-fetch local team details on refresh
  const fetchMyTeam = async (token) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/team/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
        fetchMyTrades(token);
      } else {
        localStorage.removeItem('teamToken');
        setTeam(null);
      }
    } catch (e) {
      console.error('Error fetching team context:', e);
    }
  };

  const fetchMyTrades = async (token) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/team/trades`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTradesHistory(data.trades);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // 1. Initial REST loads
    const initialLoad = async () => {
      try {
        const [coinsRes, stateRes, leaderboardRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/coins`),
          fetch(`${BACKEND_URL}/api/game-state`),
          fetch(`${BACKEND_URL}/api/leaderboard`)
        ]);
        const coinsData = await coinsRes.json();
        const stateData = await stateRes.json();
        const leaderboardData = await leaderboardRes.json();

        setCoins(coinsData);
        setGameState(stateData);
        setLeaderboard(leaderboardData);
      } catch (e) {
        console.error('Error loading initial game details:', e);
      }
    };
    initialLoad();

    // 2. Setup Socket.IO Client
    const s = io(BACKEND_URL, {
      withCredentials: true
    });
    setSocket(s);

    const localToken = localStorage.getItem('teamToken');
    if (localToken) {
      fetchMyTeam(localToken);
      s.emit('join_game', { teamId: JSON.parse(localToken).id });
    }

    // Socket Event Subscriptions
    s.on('connect', () => {
      console.log('Connected to simulation server via socket');
      const tokenObj = localStorage.getItem('teamToken');
      if (tokenObj) {
        s.emit('join_game', { teamId: JSON.parse(tokenObj).id });
      }
    });

    s.on('game_state_changed', (newState) => {
      setGameState(newState);
    });

    s.on('game_tick', ({ timerRemaining }) => {
      setGameState(prev => ({ ...prev, timerRemaining }));
    });

    s.on('event_countdown', ({ timeUntilNextEvent: sec }) => {
      setTimeUntilNextEvent(sec);
    });

    s.on('prices_updated', (updatedCoins) => {
      setCoins(updatedCoins);
    });

    s.on('leaderboard_updated', (updatedLeaderboard) => {
      setLeaderboard(updatedLeaderboard);
    });

    s.on('team_update', (updatedTeam) => {
      setTeam(updatedTeam);
      const token = localStorage.getItem('teamToken');
      if (token) fetchMyTrades(JSON.parse(token).token);
    });

    s.on('team_removed', () => {
      localStorage.removeItem('teamToken');
      setTeam(null);
      alert('Your team has been removed from the market by Admin.');
      window.location.reload();
    });

    s.on('news_flash', (news) => {
      playSound('news');
      setActiveNewsOverlay(news);
      setNewsHistory(prev => [news, ...prev]);

      // Play specific reaction sound
      setTimeout(() => {
        if (news.coinId) {
          if (news.changePercent > 0) {
            playSound('pump');
          } else {
            playSound('dump');
          }
        }
      }, 800);

      // Auto close after 6 seconds
      setTimeout(() => {
        setActiveNewsOverlay(null);
      }, 6500);
    });

    s.on('game_reset', () => {
      localStorage.removeItem('teamToken');
      setTeam(null);
      setTradesHistory([]);
      setNewsHistory([]);
      setActiveNewsOverlay(null);
      window.location.href = '/';
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // --- ACTIONS ---

  const joinTeam = async (name, emoji) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/team/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji })
      });
      const data = await res.json();
      if (data.success) {
        const tokenObj = { token: data.token, id: data.team._id };
        localStorage.setItem('teamToken', JSON.stringify(tokenObj));
        setTeam(data.team);
        if (socket) {
          socket.emit('join_game', { teamId: data.team._id });
        }
        fetchMyTrades(data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return { success: false, message: 'Server unreachable. Try again!' };
    }
  };

  const logout = () => {
    localStorage.removeItem('teamToken');
    setTeam(null);
    setTradesHistory([]);
    window.location.href = '/';
  };

  const buyMemeCoin = async (coinId, quantity) => {
    const tokenObj = localStorage.getItem('teamToken');
    if (!tokenObj) return { success: false, message: 'Session expired!' };
    const { token } = JSON.parse(tokenObj);

    try {
      const res = await fetch(`${BACKEND_URL}/api/trade/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ coinId, quantity })
      });
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
        fetchMyTrades(token);
        playSound('pump');
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return { success: false, message: 'Network error executing trade!' };
    }
  };

  const sellMemeCoin = async (coinId, quantity) => {
    const tokenObj = localStorage.getItem('teamToken');
    if (!tokenObj) return { success: false, message: 'Session expired!' };
    const { token } = JSON.parse(tokenObj);

    try {
      const res = await fetch(`${BACKEND_URL}/api/trade/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ coinId, quantity })
      });
      const data = await res.json();
      if (data.success) {
        setTeam(data.team);
        fetchMyTrades(token);
        playSound('dump');
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return { success: false, message: 'Network error executing trade!' };
    }
  };

  // --- ADMIN FUNCTION WRAPPERS ---

  const adminFetchTeams = async (adminToken) => {
    const res = await fetch(`${BACKEND_URL}/api/admin/teams`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.success) setAdminTeams(data.teams);
  };

  const adminFetchTrades = async (adminToken) => {
    const res = await fetch(`${BACKEND_URL}/api/admin/trades`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.success) setAdminTrades(data.trades);
  };

  const adminFetchEvents = async (adminToken) => {
    const res = await fetch(`${BACKEND_URL}/api/admin/events`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.success) setAdminEvents(data.events);
  };

  const adminCommand = async (endpoint, payload = {}, adminToken) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        // Refresh local admin stats
        adminFetchTeams(adminToken);
        adminFetchTrades(adminToken);
        return { success: true, data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return { success: false, message: 'Admin command failed.' };
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      gameState,
      coins,
      leaderboard,
      team,
      tradesHistory,
      newsHistory,
      activeNewsOverlay,
      adminActivityLog,
      adminTeams,
      adminTrades,
      adminEvents,
      timeUntilNextEvent,
      soundEnabled,
      setSoundEnabled,
      joinTeam,
      logout,
      buyMemeCoin,
      sellMemeCoin,
      adminFetchTeams,
      adminFetchTrades,
      adminFetchEvents,
      adminCommand,
      setAdminActivityLog,
      playSound
    }}>
      {children}
    </SocketContext.Provider>
  );
};
