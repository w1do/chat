/** Три прыгающие точки — индикатор набора текста. */
export function Dots({ color, size = 5 }: { color: string; size?: number }) {
  return (
    <span className="inline-flex items-end gap-1" aria-hidden="true" style={{ height: size * 2 }}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="dot"
          style={{
            width: size,
            height: size,
            borderRadius: size,
            background: color,
            animationDelay: `${index * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}
