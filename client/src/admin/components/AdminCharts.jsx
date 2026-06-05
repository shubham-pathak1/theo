export function Breakdown({ rows }) {
  const total = rows.reduce((sum, [, value]) => sum + value, 0) || 1;

  return (
    <div className="space-y-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="capitalize text-[#c9c3ba]">{label}</span>
            <span className="text-[#8f887f]">{value}</span>
          </div>
          <div className="h-2 bg-white/10">
            <div className="h-full bg-[#f4f1ea]" style={{ width: `${Math.max(3, (value / total) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ series }) {
  const width = 720;
  const height = 220;
  const allValues = series.flatMap((item) => item.values.map((point) => point.count));
  const max = Math.max(1, ...allValues);
  const pointsFor = (values) =>
    values
      .map((point, index) => {
        const x = (index / Math.max(1, values.length - 1)) * width;
        const y = height - (point.count / max) * (height - 24) - 12;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <line key={tick} x1="0" x2={width} y1={height * tick} y2={height * tick} stroke="rgba(255,255,255,0.08)" />
        ))}
        {series.map((item, index) => (
          <polyline
            key={item.label}
            fill="none"
            stroke={index === 0 ? "#f4f1ea" : "#d9895f"}
            strokeWidth="3"
            points={pointsFor(item.values)}
          />
        ))}
      </svg>
      <div className="flex gap-4 text-xs text-[#8f887f]">
        {series.map((item, index) => (
          <span key={item.label} className="flex items-center gap-2">
            <span className="h-2 w-2" style={{ background: index === 0 ? "#f4f1ea" : "#d9895f" }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AreaBars({ data, tone = "default" }) {
  const max = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className="flex h-56 items-end gap-2">
      {data.map((item) => (
        <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
          <div
            className={tone === "warning" ? "w-full bg-[#d9895f]" : "w-full bg-[#f4f1ea]"}
            style={{ height: `${Math.max(4, (item.count / max) * 190)}px` }}
            title={`${item.day}: ${item.count}`}
          />
          <span className="hidden -rotate-45 text-[10px] text-[#6f6960] sm:block">{item.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}
