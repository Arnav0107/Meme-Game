import mongoose from '../config/db.js';

const TradeSchema = new mongoose.Schema({
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team', 
    required: true 
  },
  teamName: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['BUY', 'SELL'], 
    required: true 
  },
  coinId: { 
    type: String, 
    required: true 
  }, // e.g. 'FROG'
  quantity: { 
    type: Number, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  total: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

export default mongoose.model('Trade', TradeSchema);
