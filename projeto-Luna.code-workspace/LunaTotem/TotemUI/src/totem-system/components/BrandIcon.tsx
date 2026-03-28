export function BrandIcon({ size = 32 }: { size?: number }) {
  const stroke = '#F4E1D3';
  const fill = '#D3A67F';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Lunavita">
      <circle cx="32" cy="32" r="30" stroke={fill} strokeWidth="2" fill="none" opacity="0.7" />
      {[0, 90, 180, 270].map((rotation) => (
        <ellipse
          key={rotation}
          cx="32"
          cy="12"
          rx="5"
          ry="10"
          fill={fill}
          opacity="0.85"
          transform={`rotate(${rotation} 32 32)`}
        />
      ))}
      <path
        d="M32 26 L36.5 32 H27.5 Z"
        fill={fill}
        opacity="0.9"
      />
    </svg>
  );
}
