// pages/AcceptInvite.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workspaces as wsApi } from '../lib/api';
import { useAuth } from '../store/auth';
import s from '../styles/modules/AcceptInvite.module.css';

export default function AcceptInvite() {
  const { token } = useParams();
  const { token: authToken } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | error | unauthenticated
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authToken) {
      setStatus('unauthenticated');
      return;
    }

    wsApi.acceptInvite(token)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message || 'Successfully joined the workspace!');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Invalid or expired invite link.');
      });
  }, [token, authToken]);

  return (
    <div className={s.page}>
      <div className={s.card}>
        <span className={s.logo}>RC</span>
        <h1 className={s.heading}>
          {status === 'loading' && 'Accepting Invite…'}
          {status === 'success' && '🎉 Welcome!'}
          {status === 'error' && '❌ Invite Failed'}
          {status === 'unauthenticated' && '🔐 Sign In Required'}
        </h1>

        {status === 'loading' && (
          <div className={s.spinner} />
        )}

        {(status === 'success' || status === 'error') && (
          <p className={s.msg}>{message}</p>
        )}

        {status === 'unauthenticated' && (
          <p className={s.msg}>You need to be logged in to accept this invite.</p>
        )}

        <div className={s.actions}>
          {status === 'success' && (
            <Link to="/dashboard" className={s.btn}>Go to Dashboard →</Link>
          )}
          {status === 'unauthenticated' && (
            <>
              <Link to={`/login?redirect=/invite/accept/${token}`} className={s.btn}>Sign In</Link>
              <Link to={`/register?redirect=/invite/accept/${token}`} className={s.btn}>Create Account</Link>
            </>
          )}
          {status === 'error' && (
            <Link to="/dashboard" className={s.btn}>Back to Dashboard</Link>
          )}
        </div>
      </div>
    </div>
  );
}
