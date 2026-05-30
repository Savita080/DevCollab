import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import mascot from "../../assets/mascot.png";
export default function LeftPanel() {
  const orbs = [
    { size: 420, x: "-10%", y: "-15%", color: 'var(--orb-1)', dur: 18 },
    { size: 300, x: "55%",  y: "50%",  color: 'var(--orb-2)', dur: 14 },
    { size: 200, x: "20%",  y: "65%",  color: 'var(--accent-soft)',  dur: 22 },
  ];

  return (
    <div
      className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden p-14"
      style={{ background: 'var(--bg)' }}
    >
      {/* animated mesh background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, var(--orb-1) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, var(--orb-2) 0%, transparent 60%)",
        }}
      />

      {/* floating orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[80px] pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-1) 1px, transparent 1px), linear-gradient(90deg, var(--text-1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* content top */}
      <div className="relative z-10 flex-none">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
          style={{ color: 'var(--text-1)' }}
        >
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, var(--cyan), var(--indigo))' }}
          >
            Dev
          </span>
          Collab
        </Link>
      </div>

      {/* Mascot centered */}
      <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none mt-8 mb-8">
        <motion.img
          src={mascot}
          alt="DevCollab Mascot"
          className="w-72 lg:w-96 object-contain drop-shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
          transition={{
            opacity: { duration: 1 },
            scale: { duration: 1 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      </div>

      {/* content bottom */}
      <div className="relative z-10 space-y-6 flex-none">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2
            className="text-5xl font-black leading-[1.05] tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            Ship faster,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, var(--cyan), var(--indigo))' }}
            >
              together.
            </span>
          </h2>
          <p
            className="mt-4 text-base leading-relaxed max-w-xs"
            style={{ color: 'var(--text-2)' }}
          >
            Your team's mission control. Tasks, code, wikis, and standups — unified.
          </p>
        </motion.div>

        {/* stat pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-3 flex-wrap"
        >
          {[
            { label: "2,400+ Teams" },
            { label: "50k+ Tasks Shipped" },
            { label: "99.9% Uptime" },
          ].map((s) => (
            <div
              key={s.label}
              className="px-3 py-1.5 rounded-full backdrop-blur-sm text-xs"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-2)',
              }}
            >
              {s.label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg), transparent)' }}
      />
    </div>
  );
}
