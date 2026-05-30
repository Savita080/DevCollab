import React from "react";
import { Link } from "react-router-dom";

const NAV_COLS = [
  {
    t: "Product",
    links: [
      { label: "Features",    to: "/#features",  hash: true },
      { label: "Pricing",     to: "/#pricing",   hash: true },
      { label: "Get Started", to: "/register" },
    ],
  },
  {
    t: "Company",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Contact",  to: "/contact" },
    ],
  },
  {
    t: "Account",
    links: [
      { label: "Sign In",  to: "/login" },
      { label: "Register", to: "/register" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      className="py-16 px-6 relative overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        color: 'var(--text-3)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="absolute w-72 h-72 blur-[100px] rounded-full -bottom-20 -left-20 pointer-events-none" style={{ background: 'var(--accent-soft)' }} />
      <div className="absolute w-56 h-56 blur-[80px] rounded-full top-10 right-10 pointer-events-none" style={{ background: 'var(--accent-soft)' }} />

      <div
        className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10 pb-12 text-left"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Branding */}
        <div className="md:col-span-5 space-y-4">
          <div className="text-xl font-sans font-black tracking-tight" style={{ color: 'var(--text-1)' }}>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))' }}>Dev</span>Collab
          </div>
          <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            One workspace for student dev teams — Kanban, wiki, whiteboard, chat, code snippets, and AI, all in one tab.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Built for DevFusion 2.0 · by Aditya, Savita & Suhani
          </p>
        </div>

        {/* Link columns */}
        {NAV_COLS.map((col) => (
          <div key={col.t} className="md:col-span-2 space-y-3.5 text-sm">
            <div className="font-bold text-xs uppercase tracking-widest" style={{ color: 'var(--text-1)' }}>
              {col.t}
            </div>
            <ul className="space-y-2">
              {col.links.map((lnk) => (
                <li key={lnk.label}>
                  {lnk.hash ? (
                    <a
                      href={lnk.to}
                      className="transition-colors duration-200"
                      style={{ color: 'var(--text-3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                    >
                      {lnk.label}
                    </a>
                  ) : (
                    <Link
                      to={lnk.to}
                      className="transition-colors duration-200"
                      style={{ color: 'var(--text-3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                    >
                      {lnk.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-4 relative z-10">
        <div>&copy; {new Date().getFullYear()} DevCollab. Built with ☕ and panic for DevFusion 2.0.</div>
        <div style={{ color: 'var(--text-2)' }}>Made for developers, by developers.</div>
      </div>
    </footer>
  );
}
