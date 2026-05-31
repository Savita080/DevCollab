// pages/Contact.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ExternalLink, Send, MessageSquare } from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import Background3D from '../components/landing/Background3D';

const TEAM = [
  {
    name: 'Aditya Jain',
    role: 'Backend & Infrastructure',
    email: 'adityaalba27@gmail.com',
    linkedin: 'https://linkedin.com/in/adityajain',
    initials: 'AJ',
    color: '#6366f1',
  },
  {
    name: 'Savita',
    role: 'Frontend & UI/UX',
    email: 'svtdkd@gmail.com',
    linkedin: 'https://www.linkedin.com/in/savita-chaudhary219',
    initials: 'SV',
    color: '#06b6d4',
  },
  {
    name: 'Suhani Sharma',
    role: 'AI Services',
    email: 'suhanisharma150708@gmail.com',
    linkedin: 'https://www.linkedin.com/in/suhani-sharma-775945381',
    initials: 'SS',
    color: '#8b5cf6',
  },
];

export default function Contact() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = encodeURIComponent(`Name: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\n\n${form.message}`);
    const subject = encodeURIComponent(form.subject || 'DevCollab Inquiry');
    const a = document.createElement('a');
    a.href = `mailto:adityaalba27@gmail.com?subject=${subject}&body=${body}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSent(true);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ color: 'var(--text-1)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        body { font-family: 'DM Sans', sans-serif; background-color: var(--bg); }
        h1,h2,h3,h4,h5,h6 { font-family: 'Syne', sans-serif; }
      `}</style>

      <Background3D />
      <Navbar />

      <main className="relative z-10 pt-28">

        {/* ── Hero ── */}
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span
              className="inline-block text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--indigo)' }}
            >
              Get in Touch
            </span>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-5">
              We'd love to{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))' }}
              >
                hear from you
              </span>
            </h1>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-2)' }}>
              Questions, feedback, bug reports, or just want to say hi — reach out to the team directly.
            </p>
          </motion.div>
        </section>

        {/* ── Main layout: team cards + form ── */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Team cards — left column */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h2 className="text-lg font-black mb-2" style={{ color: 'var(--text-1)' }}>Core Team</h2>
              {TEAM.map((m, i) => (
                <motion.div
                  key={m.name}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}88)` }}
                    >
                      {m.initials}
                    </div>
                    <div>
                      <div className="font-black text-sm" style={{ color: 'var(--text-1)' }}>{m.name}</div>
                      <div className="text-xs font-bold" style={{ color: m.color }}>{m.role}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {m.email && (
                      <a
                        href={`mailto:${m.email}`}
                        className="flex items-center gap-2 text-xs transition-colors"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      >
                        <Mail size={12} />
                        <span className="truncate">{m.email}</span>
                      </a>
                    )}
                    {m.linkedin && (
                      <a
                        href={m.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs transition-colors"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      >
                        <ExternalLink size={12} />
                        LinkedIn Profile
                      </a>
                    )}
                    {!m.email && !m.linkedin && (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>via GitHub or team email</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Quick info */}
              <motion.div
                className="rounded-2xl p-5 mt-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} style={{ color: 'var(--indigo)' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Built for</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  DevFusion 2.0 Hackathon — crafted in 10 days. We're open to feedback, contributions, and collaboration.
                </p>
              </motion.div>
            </div>

            {/* Contact form — right column */}
            <motion.div
              className="lg:col-span-3 rounded-3xl p-8"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-xl font-black mb-1" style={{ color: 'var(--text-1)' }}>Send a message</h2>
              <p className="text-sm mb-7" style={{ color: 'var(--text-3)' }}>
                We typically respond within 24 hours.
              </p>

              {sent ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-16 gap-4 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent-soft)', border: '1px solid var(--focus-ring)' }}
                  >
                    <Send size={24} style={{ color: 'var(--indigo)' }} />
                  </div>
                  <h3 className="text-xl font-black">Message sent!</h3>
                  <p style={{ color: 'var(--text-2)' }}>Your email client should have opened. We'll get back to you soon.</p>
                  <button
                    onClick={() => { setSent(false); setForm({ firstName: '', lastName: '', email: '', subject: '', message: '' }); }}
                    className="mt-2 text-sm font-semibold"
                    style={{ color: 'var(--indigo)' }}
                  >
                    Send another
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>First Name</label>
                      <input
                        type="text" placeholder="Aditya" required
                        value={form.firstName} onChange={handleChange('firstName')}
                        className="rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--focus-ring)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Last Name</label>
                      <input
                        type="text" placeholder="Jain"
                        value={form.lastName} onChange={handleChange('lastName')}
                        className="rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--focus-ring)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Email</label>
                    <div className="relative">
                      <input
                        type="email" placeholder="you@example.com" required
                        value={form.email} onChange={handleChange('email')}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--focus-ring)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                      />
                      <Mail size={14} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Subject</label>
                    <input
                      type="text" placeholder="How can we help?"
                      value={form.subject} onChange={handleChange('subject')}
                      className="rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--focus-ring)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Message</label>
                    <textarea
                      rows={5} placeholder="Tell us about your needs, feedback, or questions…" required
                      value={form.message} onChange={handleChange('message')}
                      className="rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all"
                      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--focus-ring)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300"
                    style={{
                      backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
                      color: '#fff',
                      boxShadow: 'var(--glow-indigo)',
                    }}
                  >
                    Send Message <Send size={15} />
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
