import React from 'react';

export default function TransactionHistory({ trades = [] }) {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📜 TRANSACTION HISTORY
      </h3>
      <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Type</th>
              <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Coin</th>
              <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Qty</th>
              <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Price</th>
              <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Total</th>
              <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  No trades completed yet. Make a move!
                </td>
              </tr>
            ) : (
              trades.map((trade) => {
                const isBuy = trade.type === 'BUY';
                return (
                  <tr key={trade._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ 
                      padding: '8px', 
                      color: isBuy ? 'var(--neon-green)' : 'var(--neon-red)',
                      fontWeight: 'bold'
                    }}>
                      {trade.type}
                    </td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>${trade.coinId}</td>
                    <td style={{ padding: '8px' }}>{trade.quantity}</td>
                    <td style={{ padding: '8px' }}>₹{trade.price}</td>
                    <td style={{ padding: '8px' }}>₹{Math.round(trade.total).toLocaleString()}</td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                      {formatTime(trade.timestamp)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
