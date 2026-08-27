import mongoose from '../config/db.js';

const GameStateSchema = new mongoose.Schema({
  key: { 
    type: String, 
    default: 'global', 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['WAITING', 'LIVE', 'PAUSED', 'FINISHED'], 
    default: 'WAITING' 
  },
  timerRemaining: { 
    type: Number, 
    default: 600 
  }, // seconds (10 min)
  totalDuration: { 
    type: Number, 
    default: 600 
  },
  automaticMode: { 
    type: Boolean, 
    default: true 
  },
  tradingFrozen: { 
    type: Boolean, 
    default: false 
  },
  activeNews: {
    headline: { type: String, default: '' },
    content: { type: String, default: '' },
    coinId: { type: String, default: '' },
    changePercent: { type: Number, default: 0 },
    oldPrice: { type: Number, default: 0 },
    newPrice: { type: Number, default: 0 },
    emoji: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.model('GameState', GameStateSchema);
