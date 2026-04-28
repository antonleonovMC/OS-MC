import { useState } from 'react';

export default function Avatar({ user, size = 32, radius = 8, fontSize }) {
  const [err, setErr] = useState(false);
  const fs = fontSize || Math.round(size * 0.34);

  if (user?.photo_url && !err) {
    return (
      <img
        src={user.photo_url}
        alt={user.name}
        onError={() => setErr(true)}
        style={{
          width: size, height: size, borderRadius: radius,
          objectFit: 'cover', flexShrink: 0, display: 'block',
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: user?.color || '#0d9488',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: fs, fontWeight: 700,
      flexShrink: 0, userSelect: 'none',
    }}>
      {user?.av || '?'}
    </div>
  );
}
