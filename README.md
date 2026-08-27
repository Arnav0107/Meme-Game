# 🚨 MEME COIN MARKET 🚨
### Interactive Multiplayer Web3-Themed Simulation Trading Game

MEME COIN MARKET is a fast-paced, real-time multiplayer crypto trading simulator designed for college workshops. It creates a chaotic meme coin trading environment showing elements of FOMO, hype, panic selling, and market crashes.

---

## ⚡ Game Features

1. **Dynamic Teams**: No predefined limit on team count. Teams join on the landing page at any time before the game starts.
2. **Real-time Price Engine**: Price changes, breaking news tickers, and leaderboards update instantly across all screens via Socket.IO.
3. **Admin Regulation Dashboard**: Complete authoritative controller to start, pause, resume, reset, or end the game. Supports manual price edits, custom news alerts, and kicking/freezing teams.
4. **Auto & Manual Events**: Configured timeline events trigger automatically or can be fired manually by the Admin.
5. **Classroom View**: A dedicated `/winner-board` route displays live ranks with continuous confetti shower, optimized for projection screen displays.
6. **Mobile Responsive**: Custom-built with modern CSS Grid and Flexbox for native mobile trading experience.

---

## 🛠️ Technology Stack

- **Backend**: Node.js + Express + Socket.IO + Mongoose/MongoDB
- **Frontend**: React + Vite + Vanilla CSS
- **Session Auth**: JWT (JSON Web Tokens) for Admin, UUID Tokens for Teams

---

## 🚀 How to Run Locally

### Prerequisites
1. **Node.js** (v18+)
2. **MongoDB** (Ensure MongoDB is running locally at `mongodb://127.0.0.1:27017` or use a MongoDB Atlas connection string)

### Step 1: Clone and Install Dependencies
Install dependencies for root, server, and client concurrently using:
```bash
npm run install-all
```
*Alternatively, run `npm install` inside the root, `server/`, and `client/` directories individually.*

### Step 2: Configure Environment Variables
A default `.env` configuration is created inside the `server/` directory:

`server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/meme_coin_market
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=meme_coin_market_secret_key_9876
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Step 3: Run Development Server
Start both Express API and Vite React server concurrently with a single command from the root directory:
```bash
npm run dev
```

- **Player Interface**: `http://localhost:5173/`
- **Admin Console**: `http://localhost:5173/admin` (Username: `admin`, Password: `admin123`)
- **Presentation Winner Board**: `http://localhost:5173/winner-board`

---

## 🌍 Production Build & Deployment

For production deployments (e.g., Heroku, Render, AWS, DigitalOcean), you can compile the React client static assets and run them directly from the Express server on a single port.

### Step 1: Compile React Frontend
From the root directory, run:
```bash
npm run build
```
This outputs build files to `client/dist`.

### Step 2: Configure Production Environment
Set `NODE_ENV=production` or `SERVE_STATIC=true` in the environment variables. The server will automatically host the static files in `client/dist`.

### Step 3: Launch Production Server
```bash
npm start
```
The entire application will run unified on `http://localhost:5000` (or whatever `PORT` is defined).

---

## 🎮 Game Flow Timeline

1. **Setup**: Admin logs in at `/admin`. Game status is `WAITING`.
2. **Onboarding**: Students open `/` on mobile phones, type team names, choose emojis, and join.
3. **Start**: Admin starts the game. Sockets broadcast `LIVE` state and credits each wallet with ₹1,000 cash.
4. **Trading**: Teams trade 4 meme coins: `$FROG`, `$PIZZA`, `$STUPA`, and `$EXAM`.
5. **Timeline Events**: Automated events (such as $FROG going viral, rug pulls, or $EXAM cancelled) change prices and flash large breaking news overlays.
6. **Interventions**: Admin monitors live activities, pauses/resumes, triggers custom price updates, freezes trading, or edits the event timeline.
7. **End of Game**: Timer reaches zero (or Admin terminates manually). Leaderboard locks and final winners are announced on `/winner-board` with confetti rain.

---

## 🔒 Security Measures
- autoritative portfolio validation computed server-side to prevent negative cash/holdings or unauthorized trade manipulation.
- Team session tokens are stored in `localStorage` to handle network reconnections cleanly without exposing administrative capabilities to players.
