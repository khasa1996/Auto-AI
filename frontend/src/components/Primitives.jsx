/**
 * Small presentational primitives shared by the app pages.
 */
export function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold mb-2">{label}</div>
      {children}
    </label>
  );
}

export function Pill({ children, c }) {
  return (
    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 border font-bold" style={{ color: c, borderColor: c + "50" }}>
      {children}
    </span>
  );
}
