import React, { useRef, useEffect } from 'react';

export default function Chart({ priceHistory = [], coinColor = '#00e5ff' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (priceHistory.length < 2) {
      // Draw placeholder text
      ctx.fillStyle = '#5c5f66';
      ctx.font = '12px Space Grotesk';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for price movement...', width / 2, height / 2);
      return;
    }

    const prices = priceHistory.map(h => h.price);
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);
    const valRange = maxVal - minVal || 1;

    // Expand margins slightly
    const padding = 15;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const points = priceHistory.map((h, i) => {
      const x = padding + (i / (priceHistory.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((h.price - minVal) / valRange) * chartHeight;
      return { x, y };
    });

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const yLine = padding + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, yLine);
      ctx.lineTo(width - padding, yLine);
      ctx.stroke();
    }

    // Draw gradient area underneath
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding);
    points.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, padding, 0, height - padding);
    areaGrad.addColorStop(0, `${coinColor}20`); // 12% opacity
    areaGrad.addColorStop(1, `${coinColor}00`); // transparent
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Draw the glow line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = coinColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = coinColor;
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw last point dot
    const lastPt = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = coinColor;
    ctx.fill();
    ctx.strokeStyle = '#08090c';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [priceHistory, coinColor]);

  return (
    <div style={{ width: '100%', height: '110px', marginTop: '12px' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
