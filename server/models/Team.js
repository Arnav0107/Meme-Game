import mongoose from '../config/db.js';

const TeamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  emoji: { 
    type: String, 
    default: '🚀' 
  },
  token: { 
    type: String, 
    required: true 
  },
  cash: { 
    type: Number, 
    default: 1000 
  },
  holdings: {
    RAVI: { type: Number, default: 0 },
    CHUNAID: { type: Number, default: 0 },
    VARUN: { type: Number, default: 0 },
    ARJUN: { type: Number, default: 0 }
  },
  portfolioValue: { 
    type: Number, 
    default: 1000 
  },
  profit: { 
    type: Number, 
    default: 0 
  },
  roi: { 
    type: Number, 
    default: 0 
  },
  rank: { 
    type: Number, 
    default: 1 
  },
  isFrozen: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

export default mongoose.model('Team', TeamSchema);
