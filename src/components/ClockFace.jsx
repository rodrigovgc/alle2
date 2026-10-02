/** A simple analog clock drawn from { h, m }. Colours follow the theme. */
export function ClockFace({ h, m }) {
  const minuteAngle = m * 6;             // 360 / 60
  const hourAngle = (h % 12) * 30 + m * 0.5;
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg className="clock" viewBox="0 0 100 100" role="img" aria-label="Clock to read">
      <circle cx="50" cy="50" r="46" className="clock__face" />
      {ticks.map((a, i) => (
        <line
          key={a}
          x1="50" y1="8" x2="50" y2={i % 3 === 0 ? 15 : 12}
          className={`clock__tick ${i % 3 === 0 ? 'is-major' : ''}`}
          transform={`rotate(${a} 50 50)`}
        />
      ))}
      <line x1="50" y1="54" x2="50" y2="28" className="clock__hand clock__hand--hour" transform={`rotate(${hourAngle} 50 50)`} />
      <line x1="50" y1="56" x2="50" y2="16" className="clock__hand clock__hand--minute" transform={`rotate(${minuteAngle} 50 50)`} />
      <circle cx="50" cy="50" r="3" className="clock__pin" />
    </svg>
  );
}
