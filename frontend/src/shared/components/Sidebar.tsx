import { NavLink } from "react-router-dom";

interface NavItem { label: string; path: string; disabled?: boolean; }

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: "Market Data", items: [
    { label: "Symbol Management", path: "/symbols" },
    { label: "Price Explorer", path: "/prices" },
  ]},
  { title: "Analytics", items: [
    { label: "ATR Analysis", path: "/analytics/atr" },
    { label: "Turnover", path: "/analytics/turnover" },
    { label: "Worth Trade Screening", path: "/analytics/wtd" },
  ]},
  { title: "Backtesting", items: [
    { label: "Single Run", path: "/backtest", disabled: true },
    { label: "Bulk Sweep", path: "/backtest/bulk", disabled: true },
  ]},
  { title: "System", items: [
    { label: "Jobs & Tasks", path: "/jobs" },
    { label: "Cron Jobs", path: "/cron-jobs" },
  ]},
];

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-700 bg-slate-900 p-4 overflow-y-auto">
      <div className="text-lg font-bold mb-6 pb-3 border-b border-slate-700">TradeJutsu</div>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{section.title}</div>
          {section.items.map((item) =>
            item.disabled ? (
              <div key={item.path} className="block px-3 py-1.5 rounded text-sm text-slate-600 cursor-not-allowed">
                {item.label} <span className="text-xs">(Phase 2)</span>
              </div>
            ) : (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) => `block px-3 py-1.5 rounded text-sm transition-colors ${isActive ? "bg-blue-600/20 text-blue-400" : "text-slate-300 hover:bg-slate-800"}`}>
                {item.label}
              </NavLink>
            )
          )}
        </div>
      ))}
    </aside>
  );
}
