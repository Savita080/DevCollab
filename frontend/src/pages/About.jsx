// pages/About.jsx — About DevCollab
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Kanban, Sparkles, Code2, BookOpen, PenLine,
  MessageSquare, Bell, Users, CreditCard, ArrowRight,
} from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import Background3D from '../components/landing/Background3D';

const TEAM = [
  {
    name: 'Aditya Jain',
    role: 'Backend & Infrastructure',
    desc: 'Built the entire REST API, real-time Socket.IO layer, RBAC, billing, and deployment pipeline.',
    email: 'adityaalba27@gmail.com',
    initials: 'AJ',
    color: '#6366f1',
  },
  {
    name: 'Savita',
    role: 'Frontend & UI/UX',
    desc: 'Designed and built the React SPA — Kanban UI, whiteboard, wiki editor, live chat, and all pages.',
    email: '',
    initials: 'SV',
    color: '#06b6d4',
  },
  {
    name: 'Suhani Sharma',
    role: 'AI Services',
    desc: 'Built all 5 AI microservices — code reviewer, standup generator, bottleneck detector, progress summariser, and task breaker.',
    email: 'suhanisharma150708@gmail.com',
    initials: 'SS',
    color: '#8b5cf6',
  },
];

const WHAT_WE_DO = [
  {
    icon: Kanban,
    title: 'Live Kanban Board',
    desc: 'Drag-and-drop tasks across TODO → IN_PROGRESS → IN_REVIEW → DONE. Every move broadcasts instantly to every teammate via Socket.IO — no refresh, no lag.',
    color: '#6366f1',
  },
  {
    icon: Sparkles,
    title: 'AI Project Assistant',
    desc: 'One click generates a daily standup, a full project summary, a bottleneck report, or a backlog from a feature description. Powered by LangChain + Groq LLM.',
    color: '#ec4899',
  },
  {
    icon: Code2,
    title: 'Code Review & Snippets',
    desc: '6 specialist AI agents review your code in parallel for syntax, security, readability, performance, and robustness. Store reusable snippets with full syntax highlighting.',
    color: '#10b981',
  },
  {
    icon: BookOpen,
    title: 'Versioned Wiki',
    desc: 'Markdown pages with Git-style version history and required commit messages. Roll back any change at any time — like Confluence with real version control semantics.',
    color: '#f59e0b',
  },
  {
    icon: PenLine,
    title: 'Collaborative Whiteboard',
    desc: 'Excalidraw-powered canvas where every stroke broadcasts in real time. Redis caches live state; MongoDB persists every 10 seconds. Sketch architectures together.',
    color: '#06b6d4',
  },
  {
    icon: MessageSquare,
    title: 'Real-Time Chat',
    desc: 'Per-project and per-workspace channels built on Socket.IO with live typing indicators and online presence. Messages stay separate per context — no crossed wires.',
    color: '#8b5cf6',
  },
  {
    icon: Bell,
    title: '@Mentions & Notifications',
    desc: '@username in comments auto-detects, persists a notification to the DB, and pushes a live socket event if the user is online. Mark-all-read in one click.',
    color: '#ef4444',
  },
  {
    icon: Users,
    title: 'Two-Tier RBAC',
    desc: 'Workspace roles (OWNER / ADMIN / MEMBER / VIEWER) and project roles (CONTRIBUTOR / VIEWER). Email invites via Brevo. Ownership transfer. Fine-grained access at every layer.',
    color: '#f97316',
  },
  {
    icon: CreditCard,
    title: 'Hassle-Free Billing',
    desc: 'Razorpay Orders API with HMAC-SHA256 verification. Per-user PRO plan at ₹499/year — no KYC needed for dev, test keys work out of the box. Upgrades take effect instantly.',
    color: '#14b8a6',
  },
];

const STATS = [
  { value: '35+', label: 'API endpoints' },
  { value: '5', label: 'AI microservices' },
  { value: '16', label: 'Socket.IO events' },
  { value: '13', label: 'MongoDB models' },
];

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function About() {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ color: 'var(--text-1)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        body { font-family: 'DM Sans', sans-serif; background-color: var(--bg); }
        h1,h2,h3,h4,h5,h6 { font-family: 'Syne', sans-serif; }
        html { scroll-behavior: smooth; }
      `}</style>

      <Background3D />
      <Navbar />

      <main className="relative z-10 pt-28">

        {/* ── Hero ── */}
        <section className="max-w-5xl mx-auto px-6 py-24 text-center">
          <motion.div variants={fade} initial="hidden" animate="show" transition={{ duration: 0.6 }}>
            <span
              className="inline-block text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--indigo)' }}
            >
              About DevCollab
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
              One workspace.<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))' }}
              >
                Zero context-switching.
              </span>
            </h1>
            <p className="text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-2)' }}>
              DevCollab was built by a 3-person hackathon team who were tired of juggling Trello, Notion, GitHub, and Discord simultaneously.
              We built the tool we wished existed — everything a dev team needs, in a single tab.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
            variants={fade} initial="hidden" animate="show" transition={{ delay: 0.2 }}
          >
            {STATS.map(s => (
              <div
                key={s.label}
                className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
              >
                <div
                  className="text-4xl font-black mb-1"
                  style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  {s.value}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Story ── */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <motion.div
            className="rounded-3xl p-10 md:p-14"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-black mb-6" style={{ color: 'var(--text-1)' }}>Why we built this</h2>
            <div className="space-y-4 text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
              <p>
                Every student dev team we knew had the same problem. Tasks were in Trello. Notes were in Notion.
                Code discussions were dying in Discord threads. Nobody was writing standups because it meant
                summarising six different tools manually. Context-switching was eating more time than actual building.
              </p>
              <p>
                We built DevCollab for <strong style={{ color: 'var(--text-1)' }}>DevFusion 2.0</strong> to
                solve this exactly. A single platform that handles project management, documentation, code storage,
                real-time collaboration, <em>and</em> an AI layer that takes care of the busywork — standups,
                code reviews, bottleneck detection — so teams can spend time shipping instead of reporting.
              </p>
              <p>
                Every feature exists because we personally needed it. Nothing is padding.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ── What We Do ── */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <motion.h2
              className="text-4xl md:text-5xl font-black tracking-tight mb-4"
              initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              Everything your team needs
            </motion.h2>
            <p className="text-lg" style={{ color: 'var(--text-2)' }}>
              Nine tightly integrated features — no plugin juggling, no third-party mess.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHAT_WE_DO.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-2xl p-6 flex flex-col gap-4 group transition-all duration-300"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}
                >
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-1)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Team ── */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <motion.h2
              className="text-4xl md:text-5xl font-black tracking-tight mb-4"
              initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              The team
            </motion.h2>
            <p className="text-lg" style={{ color: 'var(--text-2)' }}>
              Three developers, ten days, one hackathon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEAM.map((m, i) => (
              <motion.div
                key={m.name}
                className="rounded-2xl p-7 flex flex-col gap-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}aa)` }}
                >
                  {m.initials}
                </div>
                <div>
                  <div className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{m.name}</div>
                  <div
                    className="text-xs font-bold uppercase tracking-wider mt-0.5 mb-3"
                    style={{ color: m.color }}
                  >
                    {m.role}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{m.desc}</p>
                </div>
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    className="text-xs mt-auto"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    {m.email}
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <motion.div
            className="rounded-3xl p-12"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--glow-indigo)',
            }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <h2 className="text-3xl font-black mb-4">Ready to ship faster?</h2>
            <p className="mb-8" style={{ color: 'var(--text-2)' }}>
              Free to start. No credit card. No setup time.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-white transition-all duration-300"
                style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))', boxShadow: 'var(--glow-indigo)' }}
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold transition-all duration-300"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              >
                Contact us
              </Link>
            </div>
          </motion.div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
