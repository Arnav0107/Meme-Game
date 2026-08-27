import express from 'express';
import crypto from 'crypto';
import Team from '../models/Team.js';
import Coin from '../models/Coin.js';
import Trade from '../models/Trade.js';
import GameEvent from '../models/GameEvent.js';
import GameState from '../models/GameState.js';
import { adminLogin, verifyAdminToken } from '../controllers/authController.js';
import { 
  getCoins, 
  getGameState, 
  getLeaderboard, 
  buyCoin, 
  sellCoin,
  startGame,
  pauseGame,
  resumeGame,
  resetGame,
  finishGame,
  manualPriceChange,
  manualBroadcastNews,
  toggleTradingFreeze,
  toggleTeamFreeze,
  removeTeam,
  resetTeam
} from '../controllers/gameController.js';

const router = express.Router();

// Middleware: Verify Team Token
const verifyTeamToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ success: false, message: 'Authorization token required!' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const team = await Team.findOne({ token });
    if (!team) {
      return res.status(401).json({ success: false, message: 'Invalid team session!' });
    }
    req.team = team;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- PUBLIC ROUTES ---
router.post('/auth/login', adminLogin);
router.get('/coins', getCoins);
router.get('/game-state', getGameState);
router.get('/leaderboard', getLeaderboard);

// --- TEAM JOIN ---
router.post('/team/join', async (req, res) => {
  try {
    const { name, emoji } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Team Name is required!' });
    }

    const trimmedName = name.trim();
    const existing = await Team.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Team name is already taken!' });
    }

    // Check if game status is WAITING
    const state = await GameState.findOne({ key: 'global' });
    if (state && state.status !== 'WAITING') {
      return res.status(400).json({ success: false, message: 'Game has already started or finished! Cannot join now.' });
    }

    const token = crypto.randomUUID();
    const newTeam = await Team.create({
      name: trimmedName,
      emoji: emoji || '🚀',
      token
    });

    res.status(201).json({
      success: true,
      team: {
        _id: newTeam._id,
        name: newTeam.name,
        emoji: newTeam.emoji,
        cash: newTeam.cash,
        holdings: newTeam.holdings
      },
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- TEAM SECURED ROUTES ---
router.get('/team/me', verifyTeamToken, (req, res) => {
  res.json({ success: true, team: req.team });
});

router.get('/team/trades', verifyTeamToken, async (req, res) => {
  try {
    const trades = await Trade.find({ teamId: req.team._id }).sort({ timestamp: -1 });
    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/trade/buy', verifyTeamToken, async (req, res) => {
  try {
    const { coinId, quantity } = req.body;
    const qty = parseInt(quantity);
    const result = await buyCoin(req.team._id, coinId, qty);
    res.json({ success: true, team: result.team, trade: result.trade });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/trade/sell', verifyTeamToken, async (req, res) => {
  try {
    const { coinId, quantity } = req.body;
    const qty = parseInt(quantity);
    const result = await sellCoin(req.team._id, coinId, qty);
    res.json({ success: true, team: result.team, trade: result.trade });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// --- ADMIN SECURED ROUTES ---
router.post('/admin/game/start', verifyAdminToken, async (req, res) => {
  try {
    const state = await startGame();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/game/pause', verifyAdminToken, async (req, res) => {
  try {
    const state = await pauseGame();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/game/resume', verifyAdminToken, async (req, res) => {
  try {
    const state = await resumeGame();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/game/finish', verifyAdminToken, async (req, res) => {
  try {
    const state = await finishGame();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/game/reset', verifyAdminToken, async (req, res) => {
  try {
    const state = await resetGame();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/game/freeze-trading', verifyAdminToken, async (req, res) => {
  try {
    const state = await toggleTradingFreeze();
    res.json({ success: true, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/price/change', verifyAdminToken, async (req, res) => {
  try {
    const { coinId, newPrice } = req.body;
    await manualPriceChange(coinId, parseFloat(newPrice));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/admin/news/broadcast', verifyAdminToken, async (req, res) => {
  try {
    const { headline, content } = req.body;
    await manualBroadcastNews(headline, content);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/admin/teams', verifyAdminToken, async (req, res) => {
  try {
    const teams = await Team.find().sort({ portfolioValue: -1 });
    res.json({ success: true, teams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/teams/:id/freeze', verifyAdminToken, async (req, res) => {
  try {
    const team = await toggleTeamFreeze(req.params.id);
    res.json({ success: true, team });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/admin/teams/:id/reset', verifyAdminToken, async (req, res) => {
  try {
    const team = await resetTeam(req.params.id);
    res.json({ success: true, team });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/admin/teams/:id', verifyAdminToken, async (req, res) => {
  try {
    await removeTeam(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get Event Timeline Config
router.get('/admin/events', verifyAdminToken, async (req, res) => {
  try {
    const events = await GameEvent.find().sort({ order: 1 });
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update or Create Game Event Config
router.post('/admin/events', verifyAdminToken, async (req, res) => {
  try {
    const { _id, order, eventName, headline, description, coinId, newPrice, delay, emoji } = req.body;
    let event;
    if (_id) {
      event = await GameEvent.findByIdAndUpdate(_id, {
        order, eventName, headline, description, coinId, newPrice, delay, emoji
      }, { new: true });
    } else {
      event = await GameEvent.create({
        order, eventName, headline, description, coinId, newPrice, delay, emoji
      });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Trigger timeline event manually early
router.post('/admin/events/:id/trigger', verifyAdminToken, async (req, res) => {
  try {
    const event = await GameEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    event.isTriggered = true;
    await event.save();
    await triggerEvent(event);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Reset event triggers
router.post('/admin/events/reset-triggers', verifyAdminToken, async (req, res) => {
  try {
    await GameEvent.updateMany({}, { isTriggered: false });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get live trades history log (last 50 for admin display)
router.get('/admin/trades', verifyAdminToken, async (req, res) => {
  try {
    const trades = await Trade.find().sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
