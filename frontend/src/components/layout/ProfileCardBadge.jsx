// components/layout/ProfileCardBadge.jsx
import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClickOutside } from '../../lib/hooks';
import s from '../../styles/modules/ProfileCardBadge.module.css';

export default function ProfileCardBadge({ user, onClose, onLogout, style }) {
  const cardRef = useRef(null);
  useClickOutside(cardRef, onClose);

  const idNum = user?._id || user?.id || 'u1234567';
  const displayId = `ID: ${idNum.substring(idNum.length - 8).toUpperCase()}`;

  // Get primary title from skills, bio, or show empty fallback
  const primaryTitle = user?.skills?.[0] || 'No skills listed';

  return (
    <div className={s.wrapper} style={style}>
      {/* Lanyard Strap */}
      <div className={s.strap} />

      {/* Realistic Swivel Clasp/Hook */}
      <div className={s.clasp}>
        <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Silver metallic gradient definitions */}
          <defs>
            <linearGradient id="metal" x1="0" y1="0" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="40%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="strapGrad" x1="0" y1="0" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>
          {/* Metal keyring loop */}
          <circle cx="20" cy="12" r="10" stroke="url(#metal)" strokeWidth="3.5" fill="none" />
          {/* Connector bar */}
          <rect x="17" y="19" width="6" height="12" rx="1.5" fill="url(#metal)" />
          {/* Swivel trigger clip hook */}
          <path d="M20 28 C15 32, 14 42, 20 48 C24 52, 26 48, 26 46 C26 43, 20 44, 20 38 C20 35, 23 35, 24 38 L25 35 C23 31, 20 30, 20 28 Z" fill="url(#metal)" />
          {/* Metallic hook overlay */}
          <path d="M19 31 L21 31 L21 44 L19 44 Z" fill="#64748b" opacity="0.3" />
        </svg>
      </div>

      {/* Hanging Badge Card */}
      <div className={s.badgeCard} ref={cardRef}>
        {/* Clip Hole inside Card */}
        <div className={s.clipHole} />

        {/* Top Half of Card (Indigo Brand & Info) */}
        <div className={s.topHalf}>
          <div className={s.cardBrand}>DevCollab</div>
          
          <div className={s.avatarContainer}>
            <div className={s.photoBorder}>
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className={s.avatarImg}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;
                  }}
                />
              ) : (
                <div className={s.avatarPlaceholder}>
                  {(user?.name || 'U').substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <h2 className={s.cardName}>{user?.name || 'User'}</h2>
          <span className={s.cardTitle}>{primaryTitle}</span>
        </div>

        {/* Bottom Half of Card (White details & QR) */}
        <div className={s.bottomHalf}>
          <div className={s.cardDetails}>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>MEMBER ID</span>
              <span className={s.detailValue}>{displayId}</span>
            </div>

            <div className={s.detailRow}>
              <span className={s.detailLabel}>EMAIL</span>
              <span className={s.detailValue} title={user?.email}>{user?.email || '—'}</span>
            </div>

            <div className={s.detailRow}>
              <span className={s.detailLabel}>GITHUB</span>
              <span className={s.detailValue}>
                {user?.githubUrl ? (
                  <a href={user.githubUrl} target="_blank" rel="noopener noreferrer" className={s.githubLink}>
                    {user.githubUrl.replace('https://github.com/', '')}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-3)', fontStyle: 'italic', fontWeight: 'normal' }}>—</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className={s.actions}>
          <Link to="/profile" className={s.actionBtn} onClick={onClose}>
            Edit Profile
          </Link>
          <div className={s.divider} />
          <button className={s.actionBtn} onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
