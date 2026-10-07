export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect width="28" height="28" rx="7" fill="currentColor" />
      <path d="m8 8 12 12M20 8 8 20" stroke="white" strokeWidth="1.25" />
      {[
        [8, 8],
        [20, 8],
        [14, 14],
        [8, 20],
        [20, 20],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 2 ? 2.6 : 1.8} fill="white" />
      ))}
    </svg>
  );
}
