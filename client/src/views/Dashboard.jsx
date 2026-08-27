import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import Chart from '../components/Chart';
import Leaderboard from '../components/Leaderboard';
import TransactionHistory from '../components/TransactionHistory';
import Modal from '../components/Modal';

// Help helper for coin color mappings
const COIN_COLORS = {
  FROG: '#00ff87', // green
  PIZZA: '#ffbe0b', // gold/yellow
  STUPA: '#00e5ff', // cyan
  EXAM: '#ff3e6c'  // pink-red
};

export default function Dashboard() {
  const {
    gameState,
    coins,
    leaderboard,
    team,
    tradesHistory,
    newsHistory,
    activeNewsOverlay,
    buyMemeCoin,
    sellMemeCoin,
    logout,
    soundEnabled,
    setSoundEnabled
  } = useSocket();

  const [tradeType, setTradeType] = useState('BUY'); // 'BUY' or 'SELL'
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tradeError, setTradeError] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);

  if (!team) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <h3 className="pulse-glow-text" style={{ color: 'var(--neon-cyan)' }}>Connecting to your portfolio...</h3>
      </div>
    );
  }

  // Format timer remaining into mm:ss
  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (gameState.status) {
      case 'LIVE': return 'var(--neon-green)';
      case 'PAUSED': return 'var(--neon-gold)';
      case 'FINISHED': return 'var(--neon-red)';
      default: return 'var(--neon-cyan)';
    }
  };

  const openTradeModal = (type, coin) => {
    setTradeType(type);
    setSelectedCoin(coin);
    setQuantity(1);
    setTradeError('');
    setTradeLoading(false);
  };

  const handleConfirmTrade = async () => {
    if (quantity <= 0 || isNaN(quantity)) {
      setTradeError('Quantity must be greater than 0');
      return;
    }

    setTradeError('');
    setTradeLoading(true);

    let res;
    if (tradeType === 'BUY') {
      res = await buyMemeCoin(selectedCoin.id, quantity);
    } else {
      res = await sellMemeCoin(selectedCoin.id, quantity);
    }

    setTradeLoading(false);
    if (res.success) {
      setSelectedCoin(null); // Close modal
    } else {
      setTradeError(res.message);
    }
  };

  const calculateROI = () => {
    const pVal = team.portfolioValue || 1000;
    const diff = pVal - 1000;
    const roi = (diff / 1000) * 100;
    return {
      profit: diff,
      roi: Math.round(roi * 100) / 100
    };
  };

  const { profit, roi } = calculateROI();
  const isProfit = profit >= 0;

  return (
    <div style={{ position: 'relative' }}>
      
      {/* 1. Animated Breaking News Overlay */}
      {activeNewsOverlay && (
        <div className="news-overlay-container shake">
          <div className="news-flash-card glass-panel" style={{ borderColor: COIN_COLORS[activeNewsOverlay.coinId] || 'var(--neon-cyan)' }}>
            <h4 style={{ 
              color: 'var(--neon-red)', 
              fontSize: '1.5rem', 
              fontWeight: '800', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '15px',
              fontFamily: 'var(--font-title)'
            }}>
              🚨 BREAKING NEWS
            </h4>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '15px', color: '#fff' }}>
              {activeNewsOverlay.headline}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '1rem', lineHeight: '1.6' }}>
              {activeNewsOverlay.content}
            </p>

            {activeNewsOverlay.coinId && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.6rem' }}>{activeNewsOverlay.emoji}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${activeNewsOverlay.coinId}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>PRICE REACTION</div>
                  <div style={{ 
                    color: activeNewsOverlay.changePercent > 0 ? 'var(--neon-green)' : 'var(--neon-red)',
                    fontWeight: 'bold',
                    fontSize: '1.25rem'
                  }}>
                    ₹{activeNewsOverlay.oldPrice} → ₹{activeNewsOverlay.newPrice} 
                    ({activeNewsOverlay.changePercent > 0 ? '+' : ''}{activeNewsOverlay.changePercent}%)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Top News Banner Ticker */}
      <div className="ticker-tape">
        <div className="ticker-inner">
          <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--neon-cyan)', letterSpacing: '0.05em' }}>
            {newsHistory.length === 0 
              ? "🚨 WELCOME TO MEME COIN MARKET 🚨 THE GAME HAS STARTED! BUY THE DIP! DON'T PANIC! 💀" 
              : newsHistory.map((item, idx) => `[${item.emoji} ${item.headline} → $${item.coinId} price updated to ₹${item.newPrice}]`).join('   |   ')}
          </span>
        </div>
      </div>

      <div className="container">
        
        {/* Header Section */}
        <header className="app-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '2rem' }}>{team.emoji}</span>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>{team.name}</h1>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Rank: <strong>#{team.rank}</strong></span>
                  <span>•</span>
                  <span>ID: <strong>MC-{team._id.slice(-4).toUpperCase()}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            
            {/* Status Indicator */}
            <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: getStatusColor(),
                boxShadow: `0 0 10px ${getStatusColor()}`
              }}></span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                STATUS: {gameState.status}
              </span>
            </div>

            {/* Timer Card */}
            <div className="glass-panel" style={{ padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TIME REMAINING</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--neon-cyan)', fontFamily: 'var(--font-title)' }}>
                {formatTimer(gameState.timerRemaining)}
              </div>
            </div>

            {/* Sound Toggle */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="btn btn-outline"
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            >
              {soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND MUTED'}
            </button>

            {/* Exit/Logout */}
            <button 
              onClick={logout}
              className="btn btn-danger"
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            >
              LOGOUT
            </button>
          </div>
        </header>

        {/* Global Market Trading Warning if not LIVE */}
        {gameState.status !== 'LIVE' && (
          <div style={{ 
            background: 'rgba(255, 190, 11, 0.12)', 
            border: '1px solid var(--neon-gold)', 
            color: 'var(--neon-gold)', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '20px', 
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            ⚠️ Trading is currently {gameState.status === 'WAITING' ? 'disabled. Waiting for host to start the simulation!' : gameState.status === 'PAUSED' ? 'PAUSED. Hang tight!' : 'CLOSED. Game is finished! check final leaderboard.'}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid-dashboard">
          
          {/* Left Column: Portfolio & Meme Coins */}
          <div>
            
            {/* Portfolio Summary Card */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(15, 18, 25, 0.8) 0%, rgba(20, 25, 35, 0.9) 100%)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AVAILABLE CASH</span>
                  <h2 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: '800' }}>
                    ₹{Math.round(team.cash).toLocaleString()}
                  </h2>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PORTFOLIO VALUE</span>
                  <h2 style={{ fontSize: '1.8rem', color: 'var(--neon-cyan)', fontWeight: '800' }}>
                    ₹{Math.round(team.portfolioValue).toLocaleString()}
                  </h2>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SESSION PROFIT</span>
                  <h2 style={{ 
                    fontSize: '1.8rem', 
                    color: isProfit ? 'var(--neon-green)' : 'var(--neon-red)', 
                    fontWeight: '800' 
                  }}>
                    {isProfit ? '+' : ''}₹{Math.round(profit).toLocaleString()} 
                    <span style={{ fontSize: '0.9rem', marginLeft: '6px' }}>
                      ({isProfit ? '+' : ''}{roi}%)
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            {/* Meme Coin Cards */}
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>🪙 MARKET MEME COINS</h3>
            <div className="coin-grid">
              {coins.map((coin) => {
                const currentHoldings = (team.holdings && team.holdings[coin.id]) || 0;
                const valueOfHoldings = currentHoldings * coin.currentPrice;

                // Calculate price changes since starting ₹10
                const initialPrice = 10;
                const priceDiff = coin.currentPrice - initialPrice;
                const sessionChange = Math.round((priceDiff / initialPrice) * 100);
                const isPriceUp = sessionChange >= 0;

                const color = COIN_COLORS[coin.id] || 'var(--neon-cyan)';

                return (
                  <div key={coin.id} className="glass-panel coin-card" style={{ borderLeft: `3px solid ${color}` }}>
                    <div>
                      <div className="coin-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ position: 'relative', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: `1px solid ${color}` }}>
                            <img 
                              src={`/assets/${coin.id.toLowerCase()}.png`}
                              alt={coin.name}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                position: 'absolute',
                                top: 0,
                                left: 0
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <span style={{ fontSize: '1.4rem', zIndex: -1 }}>{coin.emoji}</span>
                          </div>
                          <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{coin.name}</h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                              ${coin.id}
                            </span>
                          </div>
                        </div>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold',
                          color: isPriceUp ? 'var(--neon-green)' : 'var(--neon-red)',
                          background: isPriceUp ? 'rgba(0, 255, 135, 0.08)' : 'rgba(255, 62, 108, 0.08)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {isPriceUp ? '▲' : '▼'} {Math.abs(sessionChange)}%
                        </span>
                      </div>

                      <div className="coin-card-info">
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>CURRENT PRICE</div>
                        <div className="price-text" style={{ color: color }}>
                          ₹{coin.currentPrice}
                        </div>
                      </div>

                      {/* Sparkline canvas chart */}
                      <Chart priceHistory={coin.priceHistory} coinColor={color} />
                    </div>

                    <div style={{ marginTop: '15px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.8rem', 
                        color: 'var(--text-secondary)',
                        marginBottom: '10px',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '10px'
                      }}>
                        <span>Your Holdings: <strong>{currentHoldings}</strong></span>
                        <span>Value: <strong>₹{Math.round(valueOfHoldings).toLocaleString()}</strong></span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button 
                          className="btn btn-green"
                          style={{ padding: '8px 0', fontSize: '0.85rem' }}
                          onClick={() => openTradeModal('BUY', coin)}
                          disabled={gameState.status !== 'LIVE' || gameState.tradingFrozen}
                        >
                          BUY
                        </button>
                        <button 
                          className="btn btn-red"
                          style={{ padding: '8px 0', fontSize: '0.85rem' }}
                          onClick={() => openTradeModal('SELL', coin)}
                          disabled={gameState.status !== 'LIVE' || currentHoldings <= 0 || gameState.tradingFrozen}
                        >
                          SELL
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right Column: Leaderboard & Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Leaderboard teams={leaderboard} currentTeamId={team._id} />
            <TransactionHistory trades={tradesHistory} />
          </div>

        </div>

      </div>

      {/* 3. Trade Modals */}
      {selectedCoin && (
        <Modal 
          isOpen={!!selectedCoin} 
          onClose={() => setSelectedCoin(null)}
          title={`${tradeType} $${selectedCoin.id}`}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '2.5rem' }}>{selectedCoin.emoji}</span>
            <h4 style={{ color: COIN_COLORS[selectedCoin.id] || 'var(--text-primary)' }}>
              {selectedCoin.name}
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
              Current Price: <strong>₹{selectedCoin.currentPrice}</strong>
            </p>
            {tradeType === 'SELL' && (
              <p style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', marginTop: '4px' }}>
                Your Holdings: <strong>{(team.holdings && team.holdings[selectedCoin.id]) || 0} units</strong>
              </p>
            )}
          </div>

          {tradeError && (
            <div style={{ 
              background: 'rgba(255, 62, 108, 0.1)', 
              border: '1px solid var(--neon-red)', 
              color: 'var(--neon-red)', 
              padding: '10px', 
              borderRadius: '8px', 
              marginBottom: '15px', 
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              ⚠️ {tradeError}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ENTER QUANTITY
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: '1.2rem', fontWeight: 'bold' }}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1 || tradeLoading}
              >
                -
              </button>
              
              <input 
                type="number"
                min="1"
                max={tradeType === 'SELL' ? ((team.holdings && team.holdings[selectedCoin.id]) || 1) : 999999}
                className="input-field"
                style={{ textAlign: 'center', maxWidth: '120px', fontSize: '1.2rem', fontWeight: 'bold' }}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={tradeLoading}
              />

              <button 
                type="button" 
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: '1.2rem', fontWeight: 'bold' }}
                onClick={() => {
                  if (tradeType === 'SELL') {
                    setQuantity(q => Math.min((team.holdings && team.holdings[selectedCoin.id]) || 0, q + 1));
                  } else {
                    setQuantity(q => q + 1);
                  }
                }}
                disabled={tradeLoading || (tradeType === 'SELL' && quantity >= ((team.holdings && team.holdings[selectedCoin.id]) || 0))}
              >
                +
              </button>
            </div>
            
            {/* Quick selectors */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
              <button 
                type="button"
                className="btn btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => {
                  if (tradeType === 'SELL') {
                    setQuantity((team.holdings && team.holdings[selectedCoin.id]) || 0);
                  } else {
                    setQuantity(Math.floor(team.cash / selectedCoin.currentPrice));
                  }
                }}
              >
                {tradeType === 'SELL' ? 'SELL ALL' : 'MAX BUY'}
              </button>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '12px', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL COST/REVENUE</span>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: tradeType === 'BUY' ? 'var(--neon-green)' : 'var(--neon-cyan)' 
            }}>
              ₹{Math.round(selectedCoin.currentPrice * quantity).toLocaleString()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => setSelectedCoin(null)}
              disabled={tradeLoading}
            >
              CANCEL
            </button>
            <button 
              type="button"
              className={tradeType === 'BUY' ? 'btn btn-green' : 'btn btn-primary'}
              onClick={handleConfirmTrade}
              disabled={tradeLoading}
            >
              {tradeLoading ? 'TRADING...' : `CONFIRM ${tradeType}`}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
