// components/ui/Input.jsx
import { cls } from '../../lib/utils';
import s from '../../styles/modules/Input.module.css';

export function Input({ label, error, icon, className, ...props }) {
  return (
    <label className={s.wrap}>
      {label && <span className={s.label}>{label}</span>}
      <span className={cls(s.field, error && s.err)}>
        {icon && <span className={s.ico}>{icon}</span>}
        <input className={cls(s.input, className)} {...props} />
      </span>
      {error && <span className={s.msg}>{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className, ...props }) {
  return (
    <label className={s.wrap}>
      {label && <span className={s.label}>{label}</span>}
      <textarea className={cls(s.input, s.ta, error && s.err, className)} {...props} />
      {error && <span className={s.msg}>{error}</span>}
    </label>
  );
}

export function Select({ label, error, options = [], className, children, ...props }) {
  return (
    <label className={s.wrap}>
      {label && <span className={s.label}>{label}</span>}
      <select className={cls(s.input, s.sel, error && s.err, className)} {...props}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
        {children}
      </select>
      {error && <span className={s.msg}>{error}</span>}
    </label>
  );
}
