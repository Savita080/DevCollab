// pages/Subscribe.jsx — per-user Razorpay subscription management
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { subscriptions as subApi } from '../lib/api';
import Button from '../components/ui/Button';
import s from '../styles/modules/Subscribe.module.css';

const FREE_LIMIT = 10;
const PRO_LIMIT = 200;

const FREE_FEATURES = [
  '2 workspaces',
  '3 projects per workspace',
  '50 tasks per project',
  '10 AI requests / month',
  '4 members per workspace',
  'Kanban, Wiki, Snippets, Whiteboards',
  'Real-time collaboration',
];

const PRO_FEATURES = [
  'Unlimited workspaces',
  'Unlimited projects, tasks, wikis, snippets',
  '200 AI requests / month',
  'Up to 50 members per workspace',
  'Everything in FREE',
  'Priority email support',
];

export default function Subscribe() {
  const { user, setUser } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/workspaces');
  };

  const [status, setStatus]   = useState(null);  // { plan, aiRequestsUsed, ... }
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const refreshStatus = async () => {
    const { data } = await subApi.getStatus();
    setStatus(data);
    // Sync the auth store so the plan badge in the sidebar updates instantly.
    if (setUser && user) setUser({ ...user, subscription: { ...user.subscription, plan: data.plan } });
    return data;
  };

  useEffect(() => {
    setLoading(true);
    refreshStatus()
      .catch(() => setStatus({ plan: 'FREE', aiRequestsUsed: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async () => {
    setSubLoading(true);
    try {
      const { data } = await subApi.subscribe();
      const { orderId, amount, currency, keyId } = data;

      const loadRazorpay = () => new Promise(resolve => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast('Failed to load payment gateway', 'error');
        setSubLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'DevCollab',
        description: 'PRO Plan Subscription',
        prefill: { email: user?.email, name: user?.name },
        theme: { color: '#6366f1' },
        handler: async (response) => {
          try {
            await subApi.verify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            });
            toast('🎉 Upgraded to PRO!', 'success');
            await refreshStatus();
          } catch (err) {
            toast(err?.response?.data?.message || 'Payment verification failed', 'error');
          }
        },
        modal: { ondismiss: () => setSubLoading(false) },
      });
      rzp.open();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to initiate payment', 'error');
      setSubLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!(await confirm('Cancel your PRO subscription? Your account will revert to the FREE plan.'))) return;
    setCancelLoading(true);
    try {
      await subApi.cancel();
      await refreshStatus();
      toast('Subscription cancelled', 'info');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to cancel subscription', 'error');
    } finally { setCancelLoading(false); }
  };

  const isPro  = status?.plan === 'PRO';
  const used   = status?.aiRequestsUsed ?? 0;
  const limit  = isPro ? PRO_LIMIT : FREE_LIMIT;
  const pct    = Math.min(100, Math.round(used / limit * 100));

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <button type="button" className={s.backBtn} onClick={goBack}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className={s.header}>
        <h1 className={s.title}>Subscription</h1>
        <p className={s.subtitle}>Your plan applies across every workspace you own.</p>
      </div>

      {loading ? (
        <div className={s.loading}>Loading plan info…</div>
      ) : (
        <div className={s.statusCard}>
          <div className={s.planLeft}>
            <span className={`${s.planBadge} ${isPro ? s.pro : s.free}`}>
              {isPro ? '✦ PRO' : '◈ FREE'}
            </span>
            <div className={s.planName}>{user?.name || 'You'}</div>
            <div className={s.planDesc}>
              {isPro
                ? `Account plan: PRO — ${PRO_LIMIT} AI requests/month`
                : `Account plan: FREE — ${FREE_LIMIT} AI requests/month`}
            </div>
          </div>

          <div className={s.usageSection}>
            <span className={s.usageLabel}>AI Usage this month</span>
            <div className={s.barTrack}>
              <div
                className={s.barFill}
                style={{
                  width: `${pct}%`,
                  background: `var(${pct > 80 ? '--status-danger' : pct > 50 ? '--status-warning' : '--status-success'})`,
                }}
              />
            </div>
            <span className={s.barVal}>{used} / {limit} requests used</span>
          </div>
        </div>
      )}

      <div className={s.plansGrid}>
        <div className={`${s.planCard} ${!isPro ? s.current : ''}`}>
          <div className={s.planCardHeader}>
            <span className={s.planCardName}>FREE</span>
            <span className={s.planCardPrice}>₹0 <span>/ month</span></span>
          </div>
          <ul className={s.planFeatures}>
            {FREE_FEATURES.map(f => (
              <li key={f}><span>✓</span> {f}</li>
            ))}
          </ul>
          {!isPro && (
            <Button variant="ghost" size="sm" disabled>Current Plan</Button>
          )}
        </div>

        <div className={`${s.planCard} ${isPro ? s.current : s.recommended}`}>
          <div className={s.planCardHeader}>
            <div>
              <span className={s.planCardName}>PRO</span>
              {!isPro && <span className={s.planCardBadge}>RECOMMENDED</span>}
            </div>
            <span className={s.planCardPrice}>₹499 <span>/ year</span></span>
          </div>
          <ul className={s.planFeatures}>
            {PRO_FEATURES.map(f => (
              <li key={f}><span>✦</span> {f}</li>
            ))}
          </ul>
          {!isPro && (
            <Button variant="cyan" size="md" loading={subLoading} onClick={handleSubscribe}>
              Upgrade to PRO ↗
            </Button>
          )}
          {isPro && (
            <Button variant="ghost" size="sm" loading={cancelLoading} onClick={handleCancel}>
              Cancel Subscription
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
