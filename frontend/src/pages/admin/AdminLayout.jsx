import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Plus, ShieldCheck } from 'lucide-react';

const tabs = [
  { to: 'analytics', label: 'Analytics', icon: LayoutDashboard },
  { to: 'record-investment', label: 'Record Investment', icon: Plus },
];

function AdminLayout() {
  return (
    <div className="page-container py-12 animate-fade-in">
      <div className="mb-12">
        <span className="eyebrow-amber mb-5"><ShieldCheck className="w-4 h-4" /> Admin Access</span>
        <h1 className="text-5xl sm:text-6xl mb-4">Admin Panel</h1>
        <p className="text-xl text-slate-400 font-light">Manage investments and monitor on-chain activity.</p>
      </div>

      <div className="border-b border-slate-800 mb-12">
        <nav className="flex gap-2 -mb-px">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `font-display inline-flex items-center gap-2 px-6 py-4 text-base font-bold border-b-2 transition-colors tracking-tight ${
                    isActive
                      ? 'text-emerald-300 border-emerald-400'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
                  }`
                }
              >
                <TabIcon className="w-5 h-5" />
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}

export default AdminLayout;
