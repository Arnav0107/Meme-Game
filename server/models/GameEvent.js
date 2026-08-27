import mongoose from '../config/db.js';

const GameEventSchema = new mongoose.Schema({
  eventName: { 
    type: String, 
    required: true 
  },
  headline: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  coinId: { 
    type: String, 
    required: true 
  }, // e.g. 'FROG'
  newPrice: { 
    type: Number, 
    required: true 
  },
  delay: { 
    type: Number, 
    required: true 
  }, // Delay in seconds before triggering this event
  emoji: { 
    type: String, 
    default: '📢' 
  },
  soundEffect: { 
    type: String, 
    default: 'news' 
  },
  order: { 
    type: Number, 
    required: true 
  },
  isTriggered: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

export default mongoose.model('GameEvent', GameEventSchema);
