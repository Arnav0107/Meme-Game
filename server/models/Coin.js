import mongoose from '../config/db.js';

const PriceHistorySchema = new mongoose.Schema({
  price: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

const CoinSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  }, // e.g., 'FROG', 'PIZZA', 'STUPA', 'EXAM'
  name: { 
    type: String, 
    required: true 
  },
  emoji: { 
    type: String, 
    required: true 
  },
  currentPrice: { 
    type: Number, 
    default: 10 
  },
  priceHistory: [PriceHistorySchema]
}, { timestamps: true });

export default mongoose.model('Coin', CoinSchema);
