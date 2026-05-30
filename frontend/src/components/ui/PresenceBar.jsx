// components/ui/PresenceBar.jsx — stacked avatars of users currently present
// in a given scope (project / chat / whiteboard). Purely presentational; the
// caller supplies the `users` list from usePresence / useScopedPresence.
import { Avatar } from './Badge';

export default function PresenceBar({ users = [], max = 5, size = 26, label }) {
  if (!users.length) return null;
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={users.map(u => u.name).join(', ')}>
      <div style={{ display: 'flex', paddingLeft: 8 }}>
        {shown.map((u, i) => (
          <div
            key={u._id || u.userId || i}
            style={{ display: 'flex', marginLeft: -8, border: '2px solid var(--bg)', borderRadius: '50%', zIndex: shown.length - i }}
          >
            <Avatar name={u.name} src={u.avatar} online size={size} />
          </div>
        ))}
        {rest > 0 && (
          <div
            style={{
              marginLeft: -8, width: size, height: size, borderRadius: '50%',
              border: '2px solid var(--bg)', background: 'var(--bg-2, rgba(0,0,0,0.08))',
              color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            +{rest}
          </div>
        )}
      </div>
      {label && (
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {users.length} {label}
        </span>
      )}
    </div>
  );
}
