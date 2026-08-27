import GameState from '../models/GameState.js';
import Team from '../models/Team.js';
import Coin from '../models/Coin.js';
import Trade from '../models/Trade.js';
import GameEvent from '../models/GameEvent.js';

let ioInstance = null;
let gameInterval = null;
let timeUntilNextEvent = 0; // seconds

const DEFAULT_COINS = [
  { id: 'RAVI', name: 'Ravi Kishan Token', emoji: '🎬', currentPrice: 10 },
  { id: 'CHUNAID', name: 'Chunaid Khan', emoji: '📽️', currentPrice: 10 },
  { id: 'VARUN', name: 'Varun Dhawan', emoji: '🕺', currentPrice: 10 },
  { id: 'ARJUN', name: 'Arjun Kapoor', emoji: '🎭', currentPrice: 10 }
];

const DEFAULT_EVENTS_TEMPLATE = [
  {
    eventName: 'CHUNAID_MUMMY',
    headline: '👩‍👦 chunaid khan ki new mummy ane wali hain! 📈',
    description: 'Chunaid Khan is getting a new mummy. Celebrations erupt as token price rises!',
    coinId: 'CHUNAID',
    newPrice: 30,
    delay: 45,
    emoji: '👩‍👦'
  },
  {
    eventName: 'CHUNAID_DIVORCE',
    headline: '💔 aamir khan ka divorce ho gaya! 📉',
    description: 'Shocking family update. Market panics and dumps Chunaid Khan token!',
    coinId: 'CHUNAID',
    newPrice: 12,
    delay: 45,
    emoji: '💔'
  },
  {
    eventName: 'CHUNAID_MOVIE',
    headline: '📽️ chunaid khan ko mili new movie! 🚀',
    description: 'Critics are hyping the casting. Major Bollywood studio backs Junaid!',
    coinId: 'CHUNAID',
    newPrice: 35,
    delay: 45,
    emoji: '📽️'
  },
  {
    eventName: 'RAVI_TOM_CRUISE',
    headline: '🕶️ ravi kishan bana naya tom cruise! 🚀',
    description: 'Ravi Kishan seen doing stunts on a bike. Hollywood is calling!',
    coinId: 'RAVI',
    newPrice: 40,
    delay: 45,
    emoji: '🕶️'
  },
  {
    eventName: 'RAVI_EMERGENCY',
    headline: '🚨 ravi kishan lost due to nation emergency! 📉',
    description: 'Market liquidity halts due to national emergency. Token takes a hit.',
    coinId: 'RAVI',
    newPrice: 15,
    delay: 45,
    emoji: '🚨'
  },
  {
    eventName: 'RAVI_KIDNAP',
    headline: '🕵️ raj shamani ne kiya ravi kishan ko kidnap! 💀',
    description: 'Breaking news: Ravi Kishan is missing after his podcast shoot with Raj Shamani!',
    coinId: 'RAVI',
    newPrice: 3,
    delay: 45,
    emoji: '🕵️'
  },
  {
    eventName: 'VARUN_LOVE',
    headline: '💖 varun dhawan ko mila ishq wala love! 📈',
    description: 'Romantic vibes drive token hype. Fans buy Varun Dhawan token in mass!',
    coinId: 'VARUN',
    newPrice: 30,
    delay: 45,
    emoji: '💖'
  },
  {
    eventName: 'VARUN_SWEENEY',
    headline: '😍 varun dhawan smile dekh kar hui sydney sweeney! 🚀',
    description: 'Varun Dhawan\'s smile goes viral globally, grabbing Sydney Sweeney\'s attention!',
    coinId: 'VARUN',
    newPrice: 55,
    delay: 45,
    emoji: '😍'
  },
  {
    eventName: 'VARUN_DOWNFALL',
    headline: '📉 varun dhawan ka downfall hi chal raha iski new kiya dikhao! 💀',
    description: 'Series of box office flops. Token crashes as sentiment hits rock bottom!',
    coinId: 'VARUN',
    newPrice: 8,
    delay: 45,
    emoji: '📉'
  },
  {
    eventName: 'ARJUN_ENTERS',
    headline: '🚪 arjun kapoor enters! 💀',
    description: 'Arjun Kapoor enters the room. Market immediately panics and dumps the token!',
    coinId: 'ARJUN',
    newPrice: 5,
    delay: 45,
    emoji: '🚪'
  },
  {
    eventName: 'ARJUN_MOVIE',
    headline: '🎭 arjun kapoor ko mili movie! 📉',
    description: 'Studio announces new project with Arjun Kapoor. Shareholders dump in panic!',
    coinId: 'ARJUN',
    newPrice: 1,
    delay: 45,
    emoji: '🎭'
  }
];

// Fisher-Yates de-duplicating event shuffler
const getShuffledEvents = () => {
  const events = JSON.parse(JSON.stringify(DEFAULT_EVENTS_TEMPLATE));

  // Shuffler
  for (let i = events.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [events[i], events[j]] = [events[j], events[i]];
  }

  // De-duplicate consecutive coin events to ensure varied celebrity arrangement
  for (let i = 0; i < events.length - 1; i++) {
    if (events[i].coinId === events[i + 1].coinId) {
      for (let j = i + 2; j < events.length; j++) {
        if (events[j].coinId !== events[i].coinId) {
          [events[i + 1], events[j]] = [events[j], events[i + 1]];
          break;
        }
      }
    }
  }

  // Assign order numbering sequentially (1, 2, 3, ...)
  return events.map((ev, idx) => ({
    ...ev,
    order: idx + 1
  }));
};

export const setIoInstance = (io) => {
  ioInstance = io;
};

// Helper: Get or create global game state
const getOrCreateGameState = async () => {
  let state = await GameState.findOne({ key: 'global' });
  if (!state) {
    state = await GameState.create({ key: 'global' });
  }
  return state;
};

// Recalculate and broadcast leaderboard
export const recalculateLeaderboard = async () => {
  try {
    const teams = await Team.find();
    const coins = await Coin.find();
    const coinPriceMap = coins.reduce((acc, coin) => {
      acc[coin.id] = coin.currentPrice;
      return acc;
    }, {});

    // Recalculate each team's portfolio value
    for (let team of teams) {
      let value = team.cash;
      for (const [coinId, quantity] of Object.entries(team.holdings)) {
        const price = coinPriceMap[coinId] || 0;
        value += quantity * price;
      }
      team.portfolioValue = Math.round(value * 100) / 100;
      team.profit = Math.round((team.portfolioValue - 1000) * 100) / 100;
      team.roi = Math.round(((team.portfolioValue - 1000) / 10) * 100) / 100; // ROI = ((v - 1000) / 1000) * 100
      await team.save();
    }

    // Sort and assign ranks
    const sortedTeams = await Team.find().sort({ portfolioValue: -1, roi: -1 });
    for (let i = 0; i < sortedTeams.length; i++) {
      sortedTeams[i].rank = i + 1;
      await sortedTeams[i].save();
      // Emit team update specifically
      if (ioInstance) {
        ioInstance.to(`team_${sortedTeams[i]._id}`).emit('team_update', sortedTeams[i]);
      }
    }

    if (ioInstance) {
      ioInstance.emit('leaderboard_updated', sortedTeams);
    }
    return sortedTeams;
  } catch (error) {
    console.error('Error recalculating leaderboard:', error);
  }
};

// Seed coins and events if empty
export const seedGameData = async () => {
  try {
    // Coins
    const coinCount = await Coin.countDocuments();
    if (coinCount === 0) {
      console.log('Seeding default coins...');
      for (const coinData of DEFAULT_COINS) {
        await Coin.create({
          id: coinData.id,
          name: coinData.name,
          emoji: coinData.emoji,
          currentPrice: coinData.currentPrice,
          priceHistory: [{ price: coinData.currentPrice, timestamp: new Date() }]
        });
      }
    }

    // Predefined Events
    const eventCount = await GameEvent.countDocuments();
    if (eventCount === 0) {
      console.log('Seeding default game events...');
      for (const eventData of getShuffledEvents()) {
        await GameEvent.create(eventData);
      }
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Trigger a specific game event
export const triggerEvent = async (event) => {
  try {
    const coin = await Coin.findOne({ id: event.coinId });
    if (!coin) return;

    const oldPrice = coin.currentPrice;
    coin.currentPrice = event.newPrice;
    coin.priceHistory.push({ price: event.newPrice, timestamp: new Date() });
    await coin.save();

    const changePercent = Math.round(((event.newPrice - oldPrice) / oldPrice) * 100);

    const gameState = await getOrCreateGameState();
    gameState.activeNews = {
      headline: event.headline,
      content: event.description,
      coinId: event.coinId,
      changePercent,
      oldPrice,
      newPrice: event.newPrice,
      emoji: event.emoji || '📢'
    };
    await gameState.save();

    // Log this news event
    // Keep a local log on client by broadcasting
    if (ioInstance) {
      ioInstance.emit('news_flash', gameState.activeNews);
      ioInstance.emit('prices_updated', await Coin.find());
      ioInstance.emit('game_state_changed', gameState);
    }

    // Recalculate leaderboard
    await recalculateLeaderboard();

    console.log(`Event triggered: ${event.eventName}. ${event.coinId} updated to ₹${event.newPrice}`);
  } catch (error) {
    console.error('Error triggering event:', error);
  }
};

// Main Game Loop Tick
const gameTick = async () => {
  try {
    const state = await getOrCreateGameState();
    if (state.status !== 'LIVE') return;

    // Tick timer
    if (state.timerRemaining > 0) {
      state.timerRemaining -= 1;
      await state.save();

      // Emit game state tick
      if (ioInstance) {
        ioInstance.emit('game_tick', { timerRemaining: state.timerRemaining });
      }

      // Check Automatic Mode events
      if (state.automaticMode) {
        if (timeUntilNextEvent > 0) {
          timeUntilNextEvent -= 1;
          if (ioInstance) {
            ioInstance.emit('event_countdown', { timeUntilNextEvent });
          }
        } else {
          // Trigger next untriggered event
          const nextEvent = await GameEvent.findOne({ isTriggered: false }).sort({ order: 1 });
          if (nextEvent) {
            nextEvent.isTriggered = true;
            await nextEvent.save();

            // Trigger it
            await triggerEvent(nextEvent);

            // Fetch following event to get its delay
            const followingEvent = await GameEvent.findOne({ isTriggered: false }).sort({ order: 1 });
            timeUntilNextEvent = followingEvent ? followingEvent.delay : 999999; // Arbitrary high number if no more events
          }
        }
      }
    } else {
      // Game ended naturally
      await finishGame();
    }
  } catch (error) {
    console.error('Error in game tick:', error);
  }
};

// Actions
export const startGame = async () => {
  const state = await getOrCreateGameState();
  if (state.status === 'LIVE') return state;

  state.status = 'LIVE';
  await state.save();

  // Initialize time until next event if starting
  if (timeUntilNextEvent <= 0) {
    const nextEvent = await GameEvent.findOne({ isTriggered: false }).sort({ order: 1 });
    timeUntilNextEvent = nextEvent ? nextEvent.delay : 60;
  }

  // Start Interval
  if (!gameInterval) {
    gameInterval = setInterval(gameTick, 1000);
  }

  if (ioInstance) {
    ioInstance.emit('game_state_changed', state);
  }
  return state;
};

export const pauseGame = async () => {
  const state = await getOrCreateGameState();
  if (state.status !== 'LIVE') return state;

  state.status = 'PAUSED';
  await state.save();

  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }

  if (ioInstance) {
    ioInstance.emit('game_state_changed', state);
  }
  return state;
};

export const resumeGame = async () => {
  const state = await getOrCreateGameState();
  if (state.status !== 'PAUSED') return state;

  state.status = 'LIVE';
  await state.save();

  if (!gameInterval) {
    gameInterval = setInterval(gameTick, 1000);
  }

  if (ioInstance) {
    ioInstance.emit('game_state_changed', state);
  }
  return state;
};

export const finishGame = async () => {
  const state = await getOrCreateGameState();
  state.status = 'FINISHED';
  await state.save();

  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }

  // Recalculate one final time
  const finalLeaderboard = await recalculateLeaderboard();

  if (ioInstance) {
    ioInstance.emit('game_state_changed', state);
    ioInstance.emit('game_finished', finalLeaderboard);
  }
  return state;
};

export const resetGame = async () => {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }

  // Reset coins
  await Coin.deleteMany({});
  for (const coinData of DEFAULT_COINS) {
    await Coin.create({
      id: coinData.id,
      name: coinData.name,
      emoji: coinData.emoji,
      currentPrice: coinData.currentPrice,
      priceHistory: [{ price: coinData.currentPrice, timestamp: new Date() }]
    });
  }

  // Reset events
  await GameEvent.deleteMany({});
  for (const eventData of getShuffledEvents()) {
    await GameEvent.create(eventData);
  }

  // Reset state
  const state = await getOrCreateGameState();
  state.status = 'WAITING';
  state.timerRemaining = state.totalDuration;
  state.tradingFrozen = false;
  state.activeNews = { headline: '', content: '', coinId: '', changePercent: 0, oldPrice: 0, newPrice: 0, emoji: '' };
  await state.save();

  // Clear trades and teams
  await Trade.deleteMany({});
  await Team.deleteMany({});

  timeUntilNextEvent = 0;

  if (ioInstance) {
    ioInstance.emit('game_reset');
    ioInstance.emit('prices_updated', await Coin.find());
    ioInstance.emit('game_state_changed', state);
    ioInstance.emit('leaderboard_updated', []);
  }
  return state;
};

export const getCoins = async (req, res) => {
  try {
    const coins = await Coin.find();
    res.json(coins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getGameState = async (req, res) => {
  try {
    const state = await getOrCreateGameState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const teams = await Team.find().sort({ portfolioValue: -1, roi: -1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Trading Engine Operations
export const buyCoin = async (teamId, coinId, quantity) => {
  // Validate game state
  const state = await getOrCreateGameState();
  if (state.status !== 'LIVE') {
    throw new Error('Trading is only enabled while market is LIVE!');
  }
  if (state.tradingFrozen) {
    throw new Error('Trading has been frozen by the Admin!');
  }

  // Validate team
  const team = await Team.findById(teamId);
  if (!team) {
    throw new Error('Team not found!');
  }
  if (team.isFrozen) {
    throw new Error('Your team trading is frozen by Admin!');
  }

  // Validate coin
  const coin = await Coin.findOne({ id: coinId });
  if (!coin) {
    throw new Error('Coin not found!');
  }

  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero!');
  }

  const cost = coin.currentPrice * quantity;
  if (team.cash < cost) {
    throw new Error('Insufficient cash balance!');
  }

  // Deduct cash and update holdings
  team.cash = Math.round((team.cash - cost) * 100) / 100;
  const currentHolding = team.holdings[coinId] || 0;
  team.holdings[coinId] = currentHolding + quantity;

  // Mark modified because it is a subdocument/nested map
  team.markModified('holdings');
  await team.save();

  // Save Trade log
  const trade = await Trade.create({
    teamId: team._id,
    teamName: team.name,
    type: 'BUY',
    coinId,
    quantity,
    price: coin.currentPrice,
    total: cost
  });

  // Log activity for Admin live stream
  if (ioInstance) {
    ioInstance.to('admin').emit('live_activity', {
      teamName: team.name,
      message: `bought ${quantity} $${coinId} at ₹${coin.currentPrice} (Total: ₹${Math.round(cost)})`,
      timestamp: new Date()
    });
  }

  // Recalculate
  await recalculateLeaderboard();

  return { team, trade };
};

export const sellCoin = async (teamId, coinId, quantity) => {
  // Validate game state
  const state = await getOrCreateGameState();
  if (state.status !== 'LIVE') {
    throw new Error('Trading is only enabled while market is LIVE!');
  }
  if (state.tradingFrozen) {
    throw new Error('Trading has been frozen by the Admin!');
  }

  // Validate team
  const team = await Team.findById(teamId);
  if (!team) {
    throw new Error('Team not found!');
  }
  if (team.isFrozen) {
    throw new Error('Your team trading is frozen by Admin!');
  }

  // Validate coin
  const coin = await Coin.findOne({ id: coinId });
  if (!coin) {
    throw new Error('Coin not found!');
  }

  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero!');
  }

  const currentHolding = team.holdings[coinId] || 0;
  if (currentHolding < quantity) {
    throw new Error('Insufficient coin holdings!');
  }

  const revenue = coin.currentPrice * quantity;

  // Add cash and deduct holdings
  team.cash = Math.round((team.cash + revenue) * 100) / 100;
  team.holdings[coinId] = currentHolding - quantity;

  // Mark modified
  team.markModified('holdings');
  await team.save();

  // Save Trade log
  const trade = await Trade.create({
    teamId: team._id,
    teamName: team.name,
    type: 'SELL',
    coinId,
    quantity,
    price: coin.currentPrice,
    total: revenue
  });

  // Log activity for Admin
  if (ioInstance) {
    ioInstance.to('admin').emit('live_activity', {
      teamName: team.name,
      message: `sold ${quantity} $${coinId} at ₹${coin.currentPrice} (Total: ₹${Math.round(revenue)})`,
      timestamp: new Date()
    });
  }

  // Recalculate
  await recalculateLeaderboard();

  return { team, trade };
};

// Admin overrides
export const manualPriceChange = async (coinId, newPrice) => {
  const coin = await Coin.findOne({ id: coinId });
  if (!coin) throw new Error('Coin not found');

  const oldPrice = coin.currentPrice;
  coin.currentPrice = newPrice;
  coin.priceHistory.push({ price: newPrice, timestamp: new Date() });
  await coin.save();

  const changePercent = Math.round(((newPrice - oldPrice) / oldPrice) * 100);

  const gameState = await getOrCreateGameState();
  gameState.activeNews = {
    headline: `📢 Market Alert: $${coinId} price manual adjustment!`,
    content: `The price of $${coinId} has been manually set to ₹${newPrice} by the regulators.`,
    coinId,
    changePercent,
    oldPrice,
    newPrice,
    emoji: coin.emoji
  };
  await gameState.save();

  if (ioInstance) {
    ioInstance.emit('news_flash', gameState.activeNews);
    ioInstance.emit('prices_updated', await Coin.find());
    ioInstance.emit('game_state_changed', gameState);
  }

  await recalculateLeaderboard();
};

export const manualBroadcastNews = async (headline, content) => {
  const gameState = await getOrCreateGameState();
  gameState.activeNews = {
    headline,
    content,
    coinId: '',
    changePercent: 0,
    oldPrice: 0,
    newPrice: 0,
    emoji: '🐋'
  };
  await gameState.save();

  if (ioInstance) {
    ioInstance.emit('news_flash', gameState.activeNews);
    ioInstance.emit('game_state_changed', gameState);
    ioInstance.to('admin').emit('live_activity', {
      teamName: 'SYSTEM',
      message: `Broadcasted news: "${headline}"`,
      timestamp: new Date()
    });
  }
};

export const toggleTradingFreeze = async () => {
  const state = await getOrCreateGameState();
  state.tradingFrozen = !state.tradingFrozen;
  await state.save();

  if (ioInstance) {
    ioInstance.emit('game_state_changed', state);
    ioInstance.to('admin').emit('live_activity', {
      teamName: 'SYSTEM',
      message: `Trading ${state.tradingFrozen ? 'FROZEN' : 'UNFROZEN'} globally`,
      timestamp: new Date()
    });
  }
  return state;
};

export const toggleTeamFreeze = async (teamId) => {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  team.isFrozen = !team.isFrozen;
  await team.save();

  if (ioInstance) {
    ioInstance.to(`team_${team._id}`).emit('team_update', team);
    ioInstance.to('admin').emit('live_activity', {
      teamName: 'SYSTEM',
      message: `Team ${team.name} trading ${team.isFrozen ? 'FROZEN' : 'UNFROZEN'}`,
      timestamp: new Date()
    });
  }
  return team;
};

export const removeTeam = async (teamId) => {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  await Team.findByIdAndDelete(teamId);
  await Trade.deleteMany({ teamId });

  if (ioInstance) {
    ioInstance.to(`team_${teamId}`).emit('team_removed');
    ioInstance.to('admin').emit('live_activity', {
      teamName: 'SYSTEM',
      message: `Removed team ${team.name} from the market`,
      timestamp: new Date()
    });
  }

  await recalculateLeaderboard();
};

export const resetTeam = async (teamId) => {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  team.cash = 1000;
  team.holdings = { RAVI: 0, CHUNAID: 0, VARUN: 0, ARJUN: 0 };
  team.portfolioValue = 1000;
  team.profit = 0;
  team.roi = 0;
  team.isFrozen = false;
  team.markModified('holdings');
  await team.save();

  await Trade.deleteMany({ teamId });

  if (ioInstance) {
    ioInstance.to(`team_${team._id}`).emit('team_update', team);
    ioInstance.to('admin').emit('live_activity', {
      teamName: 'SYSTEM',
      message: `Reset team ${team.name} balance & transactions`,
      timestamp: new Date()
    });
  }

  await recalculateLeaderboard();
  return team;
};
