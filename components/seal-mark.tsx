type SealMarkProps = {
  size?: number;
  accent?: boolean;
  className?: string;
};

export function SealMark({ size = 22, accent = false, className }: SealMarkProps) {
  const stroke = accent ? "var(--accent)" : "currentColor";
  const fill = accent ? "var(--accent)" : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <clipPath id="seal-mark-clip">
          <circle cx="12" cy="12" r="10" />
        </clipPath>
      </defs>
      <g clipPath="url(#seal-mark-clip)">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r = 10.5;
          return (
            <circle
              key={i}
              cx={12 + Math.cos(a) * r}
              cy={12 + Math.sin(a) * r}
              r="0.9"
              fill={stroke}
              opacity="0.85"
            />
          );
        })}
      </g>
      <circle cx="12" cy="12" r="7.2" fill="none" stroke={stroke} strokeWidth="1.3" />
      <path
        d="M14.6 9.2c-1.0 -1.0 -2.6 -1.0 -3.6 0c-1.0 1.0 -1.0 2.6 0 3.6l1.6 1.6c1.0 1.0 1.0 2.6 0 3.6c-1.0 1.0 -2.6 1.0 -3.6 0"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="0.9" fill={fill} />
    </svg>
  );
}
