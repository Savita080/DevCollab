// components/layout/Navbar.jsx
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import { Avatar } from '../ui/Badge';
import { useClickOutside } from '../../lib/hooks';
import NotificationDropdown from './NotificationDropdown';
import ProfileCardBadge from './ProfileCardBadge';
import s from '../../styles/modules/Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useUI();
  const { current: ws, workspaces, setWorkspace } = useWorkspace();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  const notifRef = useRef(null);
  useClickOutside(userRef, () => setUserOpen(false));
  useClickOutside(notifRef, () => setNotifOpen(false));

  const toggleNotif = () => {
    setNotifOpen(o => {
      const next = !o;
      if (next) setUserOpen(false);
      return next;
    });
  };

  const toggleUser = () => {
    setUserOpen(o => {
      const next = !o;
      if (next) setNotifOpen(false);
      return next;
    });
  };

  return (
    <header className={s.bar}>
      {/* Brand */}
      <Link to="/dashboard" className={s.brand}>
        <span className={s.wordmark}>
          <span className={s.brandReal}>Dev</span>Collab
        </span>
      </Link>

      {/* Workspace selector */}
      {ws && (
        <select
          className={s.wsSelect}
          value={ws._id}
          onChange={e => setWorkspace(e.target.value)}
          aria-label="Switch workspace"
        >
          {workspaces.map(w => (
            <option key={w._id} value={w._id}>{w.name}</option>
          ))}
        </select>
      )}

      <div className={s.right}>
        {/* Notification bell */}
        <div className={s.notifWrap} ref={notifRef}>
          <button
            className={s.iconBtn}
            onClick={toggleNotif}
            aria-label="Notifications"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className={s.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User menu */}
        <div className={s.userWrap} ref={userRef}>
          <button className={s.userBtn} onClick={toggleUser}>
            <Avatar name={user?.name || 'U'} src={user?.avatar} size={30} />
          </button>
          {userOpen && (
            <ProfileCardBadge
              user={user}
              onClose={() => setUserOpen(false)}
              onLogout={logout}
              style={{ top: 'calc(100% + 9px)', right: '0' }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
