import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowRight, User, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../store/auth";
import { cn } from "../lib/utils";
import GoogleAuthButton from "../components/GoogleAuthButton";
import ThemeQuickPick from "../components/layout/ThemeQuickPick";

const dots = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  duration: Math.random() * 6 + 4,
  delay: Math.random() * 4,
}));

function FloatingInput({ id, label, type, value, onChange, error, icon: Icon }) {
  const [focused, setFocused] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const inputRef = useRef(null);
  const isPassword = type === "password";
  const hasValue = value.length > 0;
  const lifted = focused || autofilled || hasValue;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    let stopped = false;
    const sync = () => {
      if (stopped || !inputRef.current) return;
      const node = inputRef.current;
      let isAutofill = false;
      try { isAutofill = node.matches(':-webkit-autofill'); } catch {}
      if (isAutofill) setAutofilled(true);
      if (node.value && node.value !== (value ?? '') && onChange) {
        onChange({ target: { value: node.value, name: node.name } });
      }
    };
    sync();
    const id = setInterval(sync, 150);
    const stop = setTimeout(() => { clearInterval(id); stopped = true; }, 3000);
    return () => { clearInterval(id); clearTimeout(stop); stopped = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const borderColor = focused
    ? 'var(--violet)'
    : error
    ? 'var(--status-danger)'
    : 'var(--border)';

  return (
    <div>
      <div
        className="relative rounded-xl backdrop-blur-sm transition-all duration-300"
        style={{
          border: `1px solid ${borderColor}`,
          background: 'var(--bg-card)',
          boxShadow: focused ? 'var(--glow-indigo)' : 'none',
        }}
      >
        <Icon
          size={15}
          className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300"
          style={{ color: focused ? 'var(--violet)' : 'var(--text-3)' }}
        />

        <label
          htmlFor={id}
          className="absolute left-11 pointer-events-none transition-all duration-200 select-none"
          style={
            lifted
              ? {
                  top: '8px',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--violet)',
                }
              : {
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: 'var(--text-3)',
                }
          }
        >
          {label}
        </label>

        <input
          id={id}
          ref={inputRef}
          type={isPassword ? (showPw ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onAnimationStart={(e) => {
            if (e.animationName === 'rc-autofill-start') setAutofilled(true);
          }}
          className="w-full bg-transparent pl-11 pr-10 pb-3 text-sm outline-none rc-floating-input"
          style={{
            color: 'var(--text-1)',
            paddingTop: lifted ? '24px' : '16px',
          }}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--violet)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1 pl-1 text-[11px]"
            style={{ color: 'var(--status-danger)' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;

  const passed = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colorTokens = ['', 'var(--status-danger)', 'var(--amber)', 'var(--amber)', 'var(--status-success)'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const tokenColor = colorTokens[passed];
  const label = labels[passed];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-1">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(n => (
          <div
            key={n}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: n <= passed ? tokenColor : 'var(--bg-hover)' }}
          />
        ))}
      </div>
      <p className="text-[11px]" style={{ color: tokenColor }}>{label} password</p>
    </motion.div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [agreed, setAgreed]     = useState(false);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  function validate() {
    const e = {};
    if (!name.trim())                        e.name     = "Full name is required";
    if (!/\S+@\S+\.\S+/.test(email))        e.email    = "Enter a valid email";
    if (password.length < 8)                 e.password = "Minimum 8 characters";
    if (confirm !== password)                e.confirm  = "Passwords do not match";
    if (!agreed)                             e.agree    = "You must accept the terms";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setErrors(errs);

    setErrors({});
    setLoading(true);
    try {
      await register({ name, email, password });
      toast.success("Account created! Welcome");
      navigate(redirectTo);
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong.";
      toast.error(msg);
      setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeQuickPick />
      </div>

      {/* background glows */}
      <div
        className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'var(--orb-2)' }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'var(--orb-1)' }}
      />

      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "linear-gradient(var(--text-1) 1px, transparent 1px), linear-gradient(90deg, var(--text-1) 1px, transparent 1px)",
        backgroundSize: "50px 50px"
      }} />

      {/* floating particles */}
      {dots.map(dot => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            background: 'var(--cyan)',
            opacity: 0.25,
          }}
          animate={{ opacity: [0, 1, 0], y: [0, -40, -80] }}
          transition={{ duration: dot.duration, delay: dot.delay, repeat: Infinity }}
        />
      ))}

      {/* card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* top glow line on card */}
        <div
          className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px"
          style={{ background: 'linear-gradient(to right, transparent, var(--violet), transparent)' }}
        />

        <div
          className="rounded-2xl backdrop-blur-2xl p-8"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg-glass)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* logo + heading */}
          <div className="text-center mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 mb-5 font-bold text-xl"
              style={{ color: 'var(--text-1)' }}
            >
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to right, var(--violet), var(--indigo))' }}
              >
                Dev
              </span>
              Collab
            </Link>
            <h1
              className="text-2xl font-black tracking-tight"
              style={{ color: 'var(--text-1)' }}
            >
              Create your account
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
              Join 2,400+ teams already shipping faster
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FloatingInput id="name"     label="Full name"        type="text"     icon={User} value={name}     onChange={e => setName(e.target.value)}     error={errors.name} />
            <FloatingInput id="email"    label="Work email"       type="email"    icon={Mail} value={email}    onChange={e => setEmail(e.target.value)}    error={errors.email} />
            <div>
              <FloatingInput id="password" label="Password"       type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} error={errors.password} />
              <PasswordStrength password={password} />
            </div>
            <FloatingInput id="confirm"  label="Confirm password" type="password" icon={Lock} value={confirm}  onChange={e => setConfirm(e.target.value)}  error={errors.confirm} />

            {/* terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setAgreed(v => !v)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 rounded transition-all flex items-center justify-center"
                  style={{
                    background: agreed ? 'var(--violet)' : 'transparent',
                    border: `1px solid ${agreed ? 'var(--violet)' : 'var(--border-hover)'}`,
                  }}
                >
                  {agreed && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  I agree to the{" "}
                  <span className="underline underline-offset-2" style={{ color: 'var(--violet)' }}>Terms</span>
                  {" "}and{" "}
                  <span className="underline underline-offset-2" style={{ color: 'var(--violet)' }}>Privacy Policy</span>
                </span>
              </label>
              <AnimatePresence>
                {errors.agree && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mt-1 pl-7 text-[11px]"
                    style={{ color: 'var(--status-danger)' }}
                  >
                    {errors.agree}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--violet), var(--indigo), var(--cyan))',
                color: 'var(--bg)',
                boxShadow: 'var(--glow-indigo)',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <> Create Account <ArrowRight size={15} /></>}
            </motion.button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span
              className="text-[11px] uppercase tracking-widest"
              style={{ color: 'var(--text-3)' }}
            >
              or
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <GoogleAuthButton label="Sign up with Google" redirectTo={redirectTo} />

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-3)' }}>
            Already have an account?{" "}
            <Link
              to={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
              className="transition-colors font-medium"
              style={{ color: 'var(--violet)' }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <div
          className="absolute -bottom-px left-1/2 -translate-x-1/2 w-1/3 h-px"
          style={{ background: 'linear-gradient(to right, transparent, var(--cyan), transparent)' }}
        />
      </motion.div>
    </div>
  );
}
