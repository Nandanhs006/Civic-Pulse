import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
}

const PALETTE = [
  'hsl(222, 60%, 45%)',
  'hsl(28, 80%, 48%)',
  'hsl(142, 45%, 38%)',
  'hsl(280, 45%, 48%)',
  'hsl(190, 60%, 40%)',
  'hsl(340, 55%, 50%)',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** MP photo with a graceful initials fallback (many MPs have no Commons image). */
const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, size = 48 }) => {
  const [broken, setBroken] = useState(false);
  const color = PALETTE[Math.abs(hash(name)) % PALETTE.length];

  if (photoUrl && !broken) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setBroken(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid var(--border-card)',
          background: 'var(--bg-card-hover)',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: color,
        color: 'white',
        fontWeight: 700,
        fontSize: size * 0.36,
        fontFamily: 'var(--font-display)',
        flexShrink: 0,
        border: '2px solid var(--border-card)',
      }}
    >
      {initials(name)}
    </div>
  );
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export default Avatar;
