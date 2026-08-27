import realMongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Determine if we should use mock database
const useMock = process.env.USE_MOCK_DB === 'true' || !process.env.MONGODB_URI;

// Memory storage setup for offline mock mode
const DATA_DIR = path.resolve('./db_data');
if (useMock && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Model defaults map to replicate Mongoose schema defaults in Mock mode
const MODEL_DEFAULTS = {
  Team: {
    emoji: '🚀',
    cash: 1000,
    holdings: { RAVI: 0, CHUNAID: 0, VARUN: 0, ARJUN: 0 },
    portfolioValue: 1000,
    profit: 0,
    roi: 0,
    rank: 1,
    isFrozen: false
  },
  Coin: {
    currentPrice: 10,
    priceHistory: []
  },
  GameState: {
    status: 'WAITING',
    timerRemaining: 600,
    totalDuration: 600,
    automaticMode: true,
    tradingFrozen: false,
    activeNews: { headline: '', content: '', coinId: '', changePercent: 0, oldPrice: 0, newPrice: 0, emoji: '' }
  },
  GameEvent: {
    description: '',
    emoji: '📢',
    soundEffect: 'news',
    isTriggered: false
  }
};

class MockDocument {
  constructor(modelName, data) {
    this._modelName = modelName;
    Object.assign(this, JSON.parse(JSON.stringify(data)));
    if (!this._id) {
      this._id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    }
  }

  async save() {
    return MockModel.saveDocument(this._modelName, this);
  }

  markModified() {
    // No-op for mock
  }
}

// Chainable query builder to support Mongoose .sort() and .limit() calls
class MockQuery {
  constructor(colPromise, isFindOne = false) {
    this.promise = colPromise;
    this.isFindOne = isFindOne;
  }

  sort(sortObj) {
    const next = this.promise.then(results => {
      return [...results].sort((a, b) => {
        for (const [key, dir] of Object.entries(sortObj)) {
          if (a[key] === b[key]) continue;
          const valA = a[key] !== undefined ? a[key] : 0;
          const valB = b[key] !== undefined ? b[key] : 0;
          if (dir === -1) {
            return valA < valB ? 1 : -1;
          } else {
            return valA > valB ? 1 : -1;
          }
        }
        return 0;
      });
    });
    return new MockQuery(next, this.isFindOne);
  }

  limit(num) {
    const next = this.promise.then(results => {
      return results.slice(0, num);
    });
    return new MockQuery(next, this.isFindOne);
  }

  // Thenable interface so this object can be directly awaited
  then(onFulfilled, onRejected) {
    const finalPromise = this.promise.then(results => {
      if (this.isFindOne) {
        return results[0] || null;
      }
      return results;
    });
    return finalPromise.then(onFulfilled, onRejected);
  }
}

class MockModel {
  static collections = {};

  static loadCollection(name) {
    if (!this.collections[name]) {
      const file = path.join(DATA_DIR, `${name}.json`);
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, 'utf8');
          this.collections[name] = JSON.parse(raw);
        } catch (e) {
          this.collections[name] = [];
        }
      } else {
        this.collections[name] = [];
      }
    }
    return this.collections[name];
  }

  static saveCollection(name) {
    const file = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(this.collections[name] || [], null, 2));
  }

  static saveDocument(name, doc) {
    const col = this.loadCollection(name);
    const idx = col.findIndex(x => x._id === doc._id);
    const plain = { ...doc };
    delete plain._modelName;
    if (idx >= 0) {
      col[idx] = plain;
    } else {
      col.push(plain);
    }
    this.saveCollection(name);
    return doc;
  }

  constructor(name) {
    this.name = name;
  }

  _rawFind(query = {}) {
    const col = MockModel.loadCollection(this.name);
    const defaults = MODEL_DEFAULTS[this.name] || {};
    
    // Normalize and merge defaults for all items in the collection dynamically
    const normalized = col.map(item => {
      const merged = JSON.parse(JSON.stringify(defaults));
      const newItem = Object.assign(merged, item);
      if (item.holdings && defaults.holdings) {
        newItem.holdings = Object.assign({}, defaults.holdings, item.holdings);
      }
      return newItem;
    });

    let results = normalized;

    if (query && Object.keys(query).length > 0) {
      results = normalized.filter(item => {
        return Object.entries(query).every(([k, v]) => {
          if (v && typeof v === 'object' && v.$regex) {
            return new RegExp(v.$regex).test(item[k]);
          }
          return item[k] === v;
        });
      });
    }

    return Promise.resolve(results.map(item => new MockDocument(this.name, item)));
  }

  find(query = {}) {
    return new MockQuery(this._rawFind(query), false);
  }

  findOne(query = {}) {
    return new MockQuery(this._rawFind(query), true);
  }

  findById(id) {
    if (!id) return new MockQuery(Promise.resolve([]), true);
    return new MockQuery(this._rawFind({ _id: id.toString() }), true);
  }

  async create(data) {
    const defaults = MODEL_DEFAULTS[this.name] || {};
    // Deep clone defaults to prevent reference sharing
    const merged = JSON.parse(JSON.stringify(defaults));
    Object.assign(merged, data);
    const doc = new MockDocument(this.name, merged);
    await doc.save();
    return doc;
  }

  async deleteMany(query = {}) {
    const col = MockModel.loadCollection(this.name);
    let initialCount = col.length;
    
    if (Object.keys(query).length === 0) {
      MockModel.collections[this.name] = [];
    } else {
      MockModel.collections[this.name] = col.filter(item => {
        return !Object.entries(query).every(([k, v]) => item[k] === v);
      });
    }
    MockModel.saveCollection(this.name);
    return { deletedCount: initialCount - MockModel.loadCollection(this.name).length };
  }

  async countDocuments(query = {}) {
    const items = await this._rawFind(query);
    return items.length;
  }

  async findByIdAndDelete(id) {
    const doc = await this.findById(id);
    if (doc) {
      const col = MockModel.loadCollection(this.name);
      MockModel.collections[this.name] = col.filter(x => x._id !== id.toString());
      MockModel.saveCollection(this.name);
    }
    return doc;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const doc = await this.findById(id);
    if (doc) {
      Object.assign(doc, update);
      await doc.save();
    }
    return doc;
  }

  async updateMany(query, update) {
    const items = await this._rawFind(query);
    for (let item of items) {
      Object.assign(item, update);
      await item.save();
    }
    return { modifiedCount: items.length };
  }
}

// Mock Mongoose Interface
const mockMongoose = {
  Schema: class {
    constructor(definition) {
      this.definition = definition;
    }
  },
  model(name) {
    return new MockModel(name);
  },
  connect: async () => {
    console.log('MOCK DATABASE: Successfully initialized JSON file-based database store in ./db_data');
    return { connection: { host: 'Offline-JSON-Storage' } };
  }
};

mockMongoose.Schema.Types = {
  ObjectId: String
};

// Dynamic Mongoose Router
const mongooseWrapper = {
  Schema: class {
    constructor(def) {
      if (useMock) {
        return new mockMongoose.Schema(def);
      }
      return new realMongoose.Schema(def);
    }
  },
  model(name, schema) {
    if (useMock) {
      return mockMongoose.model(name, schema);
    }
    return realMongoose.model(name, schema);
  },
  connect: async (uri) => {
    if (useMock) {
      return mockMongoose.connect();
    }
    try {
      console.log(`Connecting to MongoDB at: ${uri}`);
      const conn = await realMongoose.connect(uri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`MongoDB connection failed: ${error.message}`);
      console.warn('Falling back to local offline JSON database...');
      return mockMongoose.connect();
    }
  }
};

mongooseWrapper.Schema.Types = {
  ObjectId: String
};

export const connectDB = async () => {
  const connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meme_coin_market';
  await mongooseWrapper.connect(connString);
};

export default mongooseWrapper;
