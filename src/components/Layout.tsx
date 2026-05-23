import { NavLink, Outlet } from 'react-router-dom';
import { PlanAssistantProvider } from '../context/PlanAssistantContext';
import { PlanAssistantChat } from './PlanAssistantChat';

const navItems = [
  { to: '/', label: 'Today', end: true },
  { to: '/week', label: 'Week' },
  { to: '/log', label: 'Log' },
  { to: '/readiness', label: 'Ready' },
  { to: '/coach', label: 'Coach' },
  { to: '/settings', label: 'More' },
];

export function Layout() {
  return (
    <PlanAssistantProvider>
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-black text-white">
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-safe-top pt-4">
        <Outlet />
      </main>
      <PlanAssistantChat />
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg justify-around px-1 py-2 pb-safe-bottom">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                  isActive ? 'text-[#4a53ff]' : 'text-zinc-500'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
    </PlanAssistantProvider>
  );
}
