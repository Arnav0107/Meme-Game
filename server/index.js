import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';
import { 
  setIoInstance, 
  seedGameData, 
  recalculateLeaderboard 
} from './controllers/gameController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable CORS with dynamic origin matching to prevent production CORS blocks
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));

app.use(express.json());

// Database connection
await connectDB();

// Seed initial coins and game timeline events
await seedGameData();

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setIoInstance(io);

// API Routes
app.use('/api', apiRoutes);

// Socket.io connections handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Client requests initial state
  socket.on('join_game', async (data) => {
    try {
      if (data && data.teamId) {
        // Team socket joins their unique team room
        socket.join(`team_${data.teamId}`);
        console.log(`Socket ${socket.id} joined room team_${data.teamId}`);
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Admin registers their socket
  socket.on('join_admin', () => {
    socket.join('admin');
    console.log(`Socket ${socket.id} joined admin room`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Serve frontend assets in production mode
if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
  console.log('Serving production static build from client/dist');
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Meme Coin Market Server API is Running. Enable dev mode or run Vite client.');
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
