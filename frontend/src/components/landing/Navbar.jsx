import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ThemeQuickPick from "../layout/ThemeQuickPick";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl"
      style={{ background: 'var(--bg-glass)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer group">
          <span
            className="font-sans font-black text-xl tracking-tight transition-colors duration-300"
            style={{ color: 'var(--text-1)' }}
          >
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))' }}
            >
              Dev
            </span>
            Collab
          </span>
        </Link>

        {/* Mid Navigation Links */}
        <div className="hidden md:flex items-right gap-9 font-bold text-lg">
          {/* Hash anchors use <a> so the browser handles scroll; routes use <Link> */}
          {[
            { label: 'Features', href: '/#features',  isHash: true },
            { label: 'Pricing',  href: '/#pricing',   isHash: true },
            { label: 'About',    href: '/about',       isHash: false },
            { label: 'Contact',  href: '/contact',     isHash: false },
          ].map((n) => {
            const cls = "relative transition-colors duration-300 group";
            const style = { color: 'var(--text-2)' };
            const underline = (
              <span
                className="absolute bottom-[-4px] left-0 w-0 h-[2px] transition-all duration-300 group-hover:w-full"
                style={{ backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))' }}
              />
            );
            return n.isHash ? (
              <a
                key={n.label}
                href={n.href}
                className={cls}
                style={style}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
              >
                {n.label}{underline}
              </a>
            ) : (
              <Link
                key={n.label}
                to={n.href}
                className={cls}
                style={style}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
              >
                {n.label}{underline}
              </Link>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <ThemeQuickPick />
          <Link
            to="/login"
            className="px-5 py-2 text-lg font-semibold rounded-xl border transition-all duration-300"
            style={{ color: 'var(--text-2)', borderColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-1)';
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-2)';
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            Login
          </Link>
          <Link to="/login">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 text-lg font-bold rounded-full inline-block transition-all duration-300"
              style={{
                color: 'var(--bg)',
                backgroundImage: 'linear-gradient(to right, var(--indigo), var(--cyan))',
                boxShadow: 'var(--glow-indigo)',
              }}
            >
              Get Started
            </motion.span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
