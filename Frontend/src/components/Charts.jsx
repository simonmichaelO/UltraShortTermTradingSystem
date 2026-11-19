import { useId, useState } from 'react';
import { SERIES, usd } from '../services/preview-model.js';
import { PanelHeading } from './ui.jsx';

export function Sparkline({ points, tone = 'lime' }) {
  const low = Math.min(...points);
  const high = Math.max(...points);
  const coordinates = points.map((v, i) => `${3 + i * 84 / (points.length - 1)},${30 - (v - low) * 26 / (high - low || 1)}`);
  const gradient = useId();
  return <svg className={`sparkline spark-${tone}`} viewBox="0 0 90 34" fill="none" aria-hidden="true">
    <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="currentColor" stopOpacity=".24" />
      <stop offset="1" stopColor="currentColor" stopOpacity="0" />
    </linearGradient></defs>
    <polygon points={`3,34 ${coordinates.join(' ')} 87,34`} fill={`url(#${gradient})`} />
    <polyline points={coordinates.join(' ')} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
  </svg>;
}

const FULL_AXIS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const DATE_AXIS = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
const END = Date.parse('2026-11-17T14:30:32Z');

export function EquityChart() {
  const [range, setRange] = useState('7D');
  const [inspected, inspect] = useState(null);
  const gradient = useId();
  const { values, ticks, labels, start } = SERIES[range];
  const coords = values.map((value, index) => ({
    x: 1 + 98 * index / (values.length - 1),
    y: 100 * (ticks[0] - value) / (ticks[0] - ticks.at(-1)),
  }));
  const polyline = coords.map(({ x, y }) => `${x * 10},${y * 2}`).join(' ');
  const active = coords[inspected ?? coords.length - 1];
  const stamp = inspected === null ? '' : DATE_AXIS.format(Date.parse(start) + (END - Date.parse(start)) * inspected / (values.length - 1));

  function inspectPointer(event) {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const fraction = (((event.clientX - left) * 100 / width) - 1) / 98;
    inspect(Math.min(coords.length - 1, Math.max(0, Math.round(fraction * (coords.length - 1)))));
  }

  return <section className="panel chart-panel" aria-labelledby="equity-heading">
    <PanelHeading id="equity-heading" title="Equity curve" description="Simulated account value over time" action={
      <div className="segmented" role="group" aria-label="Equity time range">
        {Object.keys(SERIES).map(option => <button className={range === option ? 'is-active' : ''} aria-pressed={range === option}
          type="button" key={option} onClick={() => { setRange(option); inspect(null); }}>{option}</button>)}
      </div>}
    />
    <div className="chart-frame">
      <div className="axis-y" aria-hidden="true">{ticks.map(tick => <span key={tick}>{FULL_AXIS.format(tick)}</span>)}</div>
      <div className="plot" tabIndex={0} role="group" aria-label={`Simulated equity, ${range} range. Use arrow keys to inspect values.`}
        onPointerMove={inspectPointer} onPointerLeave={() => inspect(null)} onBlur={() => inspect(null)}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            inspect(index => Math.max(0, Math.min(coords.length - 1, (index ?? coords.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))));
          }
          if (event.key === 'Escape') inspect(null);
        }}>
        <div className="plot-grid" aria-hidden="true">{ticks.map(tick => <span key={tick} />)}</div>
        <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="equity-svg" aria-hidden="true">
          <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#b7f34a" stopOpacity=".245" />
            <stop offset="1" stopColor="#9dd43f" stopOpacity=".027" />
          </linearGradient></defs>
          <polygon points={`10,200 ${polyline} 990,200`} fill={`url(#${gradient})`} />
          <polyline points={polyline} vectorEffect="non-scaling-stroke" stroke="#c8f66a" strokeWidth="2.05" strokeLinejoin="round" strokeLinecap="round" fill="none" />
        </svg>
        {inspected !== null && <span className="chart-crosshair" style={{ left: `${active.x}%` }} />}
        <span className="chart-dot" style={{ left: `${active.x}%`, top: `${active.y}%` }} />
        {inspected !== null && <div className="chart-tooltip" role="status" style={{ left: `${Math.min(79, Math.max(21, active.x))}%`, top: active.y < 45 ? '55%' : '12%' }}>
          <span>{stamp} UTC · Sample</span><strong>{usd(values[inspected])}</strong>
        </div>}
      </div>
      <div className="axis-x" aria-hidden="true">{labels.map(label => <span key={label}>{label}</span>)}</div>
    </div>
    <div className="chart-footer"><span className="chart-legend"><span />Account equity</span><span className="chart-units">USD <span>·</span> UTC</span></div>
  </section>;
}
