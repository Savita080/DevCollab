import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { ArrowRight, CheckCircle2, Circle, Clock, Zap, Users, MessageSquare, Code2, FileText, LayoutDashboard } from "lucide-react";

const TASKS = [
  { id: 1, title: "Design auth flow (JWT + refresh)", status: "Done", priority: "P0", assignee: "SR" },
  { id: 2, title: "WebSocket presence — joinProject()", status: "In Progress", priority: "P1", assignee: "AK" },
  { id: 3, title: "Octo AI standup generator", status: "In Review", priority: "P1", assignee: "SR" },
  { id: 4, title: "Kanban drag-and-drop (DnD)", status: "To Do", priority: "P2", assignee: "MV" },
];

const STATUS_COLOR = {
  "Done": "var(--status-success)",
  "In Progress": "var(--amber)",
  "In Review": "var(--cyan)",
  "To Do": "var(--text-3)",
};

const PRIORITY_COLOR = {
  "P0": "var(--status-danger)",
  "P1": "var(--amber)",
  "P2": "var(--indigo)",
};

const MEMBERS = [
  { initials: "SR", color: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
  { initials: "AK", color: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
  { initials: "MV", color: "linear-gradient(135deg,#10b981,#06b6d4)" },
];

const OCTO_LINES = [
  { t: 0,   text: "✦ Octo AI  ·  analysing sprint…",          color: "var(--text-3)" },
  { t: 800, text: "▸ Done: JWT auth, WebSocket presence",       color: "var(--status-success)" },
  { t: 1600,text: "▸ Today: Kanban DnD + wiki editor",          color: "var(--cyan)" },
  { t: 2400,text: "▸ Blockers: 0 — all systems nominal",        color: "var(--indigo)" },
];

function OctoTerminal() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = OCTO_LINES.map((l, i) =>
      setTimeout(() => setVisible(i + 1), l.t + 400)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="rounded-xl p-3 font-mono text-[11px] space-y-1.5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <AnimatePresence mode="wait">
        {OCTO_LINES.slice(0, visible).map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            style={{ color: l.color }}
          >
            {l.text}
          </motion.div>
        ))}
      </AnimatePresence>
      {visible === 0 && (
        <div style={{ color: "var(--text-3)" }}>✦ Octo AI  ·  ready…</div>
      )}
    </div>
  );
}

const PILLS = [
  { icon: LayoutDashboard, label: "Kanban Boards" },
  { icon: MessageSquare,   label: "Team Chat" },
  { icon: Code2,           label: "Code Snippets" },
  { icon: FileText,        label: "Project Wiki" },
  { icon: Zap,             label: "Octo AI" },
  { icon: Users,           label: "Live Presence" },
  { icon: Code2,           label: "Code Review" },
  { icon: FileText,        label: "Notes" },
  { icon: Zap,             label: "AI Standups" },
];

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col">
    <header className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-32 pb-12 flex-1">
      {/* Left: Branding & Copywriting */}
      <div className="lg:col-span-6 flex flex-col space-y-6 text-left items-start z-10">
        <h1
          className="text-5xl md:text-[68px] font-black leading-[1.05] tracking-tight font-sans"
          style={{ color: 'var(--text-1)' }}
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="block"
          >
            Where Developer
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, var(--text-1), var(--text-2), var(--text-3))' }}
          >
            Teams Actually
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="block bg-clip-text text-transparent italic font-serif"
            style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan), var(--green))' }}
          >
            Ship.
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg max-w-xl leading-relaxed"
          style={{ color: 'var(--text-2)' }}
        >
          Unify task workflows, interactive code repositories, whiteboards, and intelligent standups. A high-fidelity, futuristic environment built for peak-performance squads.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-4 pt-2 w-full sm:w-auto"
        >
          <motion.a
            href="/register"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 font-bold rounded-xl flex items-center gap-2 transition-all duration-300"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
              color: 'var(--bg)',
              boxShadow: 'var(--glow-indigo)',
            }}
          >
            Start Building Free <ArrowRight size={17} />
          </motion.a>
        </motion.div>


      </div>

      {/* Right: Realistic DevCollab App Mock */}
      <div className="lg:col-span-6 flex items-center justify-center relative min-h-[520px]">
        {/* Glow */}
        <div
          className="absolute w-80 h-80 blur-3xl rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ background: 'var(--accent-soft)' }}
        />

        <Tilt
          tiltMaxAngleX={10}
          tiltMaxAngleY={10}
          perspective={1000}
          transitionSpeed={1500}
          scale={1.02}
          className="w-full max-w-[500px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative rounded-3xl backdrop-blur-xl overflow-visible"
            style={{
              background: 'var(--hero-card-bg)',
              border: '1px solid var(--hero-card-border)',
              boxShadow: 'var(--hero-card-shadow)',
            }}
          >
            {/* Window chrome */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--status-danger)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--status-warning)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--status-success)' }} />
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                DevCollab · Auth System
              </div>
              {/* Live presence dots */}
              <div className="flex items-center gap-1.5">
                {MEMBERS.map((m) => (
                  <div
                    key={m.initials}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: m.color }}
                    title={m.initials}
                  >
                    {m.initials}
                  </div>
                ))}
                <div
                  className="w-2 h-2 rounded-full animate-pulse ml-1"
                  style={{ background: 'var(--status-success)' }}
                />
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Section label */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest font-mono"
                  style={{ color: 'var(--text-3)' }}
                >
                  Kanban · Sprint 3
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-soft)', color: 'var(--cyan)' }}
                >
                  4 tasks
                </span>
              </div>

              {/* Task rows */}
              <div className="space-y-2">
                {TASKS.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  >
                    {task.status === "Done"
                      ? <CheckCircle2 size={14} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
                      : <Circle size={14} style={{ color: STATUS_COLOR[task.status], flexShrink: 0 }} />
                    }
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-1)' }}>
                      {task.title}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{ color: PRIORITY_COLOR[task.priority], background: 'var(--accent-soft)' }}
                    >
                      {task.priority}
                    </span>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                      style={{ background: MEMBERS.find(m => m.initials === task.assignee)?.color || 'var(--indigo)' }}
                    >
                      {task.assignee}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Octo AI Standup */}
              <div>
                <div
                  className="text-[10px] font-bold uppercase tracking-widest font-mono mb-2"
                  style={{ color: 'var(--text-3)' }}
                >
                  ✦ Octo AI Standup
                </div>
                <OctoTerminal />
              </div>
            </div>

            {/* Floating widget — workspace info */}
            <div
              className="absolute -top-5 -right-7 p-3 rounded-2xl backdrop-blur-md flex items-center gap-2.5"
              style={{
                background: 'var(--bg-dropdown)',
                border: '1px solid var(--border-hover)',
                boxShadow: 'var(--shadow-card)',
                transform: "translateZ(30px)",
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ background: 'var(--status-success)' }} />
              <div className="text-left">
                <div className="text-[9px] font-bold uppercase font-mono" style={{ color: 'var(--text-3)' }}>Live Members</div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>3 Online Now</div>
              </div>
            </div>

            {/* Floating widget — AI blockers */}
            <div
              className="absolute -bottom-5 -left-7 p-3 rounded-2xl backdrop-blur-md flex items-center gap-2.5"
              style={{
                background: 'var(--bg-dropdown)',
                border: '1px solid var(--border-hover)',
                boxShadow: 'var(--shadow-card)',
                transform: "translateZ(40px)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'var(--accent-soft)', color: 'var(--indigo)' }}
              >
                ✦
              </div>
              <div className="text-left">
                <div className="text-[9px] font-bold uppercase font-mono" style={{ color: 'var(--text-3)' }}>Sprint Health</div>
                <div className="text-sm font-bold" style={{ color: 'var(--status-success)' }}>0 Blockers</div>
              </div>
            </div>
          </motion.div>
        </Tilt>
      </div>
    </header>

      {/* ── Infinite marquee ticker ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="w-full overflow-hidden py-5"
        style={{
          borderTop: '1px solid var(--border)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div className="flex" style={{ animation: 'ticker-scroll 28s linear infinite', width: 'max-content' }}>
          {[...PILLS, ...PILLS].map(({ icon: Icon, label }, i) => (
            <span
              key={i}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mx-2 flex-shrink-0"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--text-2)',
              }}
            >
              <Icon size={13} style={{ color: 'var(--cyan)' }} />
              {label}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
