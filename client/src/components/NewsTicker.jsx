import React from 'react';

export default function NewsTicker({ newsHistory = [] }) {
  // Fallback default message when no news is available yet
  const defaultMessage = "🚨 WELCOME TO MEME COIN MARKET 🚨 CHOOSE YOUR COINS WISELY... WATCH THE NEWS... DON'T PANIC SELL... OR DO! 💀";

  const getTickerText = () => {
    if (newsHistory.length === 0) return defaultMessage;
    return newsHistory.map((item, idx) => {
      const direction = item.changePercent > 0 ? '▲' : item.changePercent < 0 ? '▼' : '';
      const percentStr = item.changePercent ? ` (${direction}${Math.abs(item.changePercent)}%)` : '';
      const coinStr = item.coinId ? ` $${item.coinId}` : '';
      return `${item.emoji || '📰'} [${item.headline}${coinStr}${percentStr}]`;
    }).join('  |  ');
  };

  return (
    <div className="ticker-tape">
      <div className="ticker-inner">
        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--neon-cyan)', letterSpacing: '0.05em' }}>
          {getTickerText()}
        </span>
        {/* Repeat text once to create smooth wrapping scrolling animation */}
        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--neon-cyan)', letterSpacing: '0.05em', marginLeft: '100px' }}>
          {getTickerText()}
        </span>
      </div>
    </div>
  );
}
