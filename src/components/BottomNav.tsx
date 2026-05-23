import { NavLink } from 'react-router-dom';
import { IconCoach, IconLog, IconSettings, IconToday, IconWeek } from './TabIcons';

const navItems: {
  to: string;
  label: string;
  Icon: typeof IconToday;
  end?: boolean;
}[] = [
  { to: '/', label: 'Today', end: true, Icon: IconToday },
  { to: '/week', label: 'Week', end: false, Icon: IconWeek },
  { to: '/log', label: 'Log', end: false, Icon: IconLog },
  { to: '/coach', label: 'Coach', end: false, Icon: IconCoach },
  { to: '/settings', label: 'Settings', end: false, Icon: IconSettings },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/90 bg-surface/90 shadow-[0_-4px_16px_rgba(17,24,39,0.05)] backdrop-blur-md"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg justify-around px-1 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.3rem)]">
        {navItems.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[56px] min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                isActive
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`rounded-full p-1.5 transition-colors ${
                    isActive ? 'bg-teal-50 text-accent' : 'text-muted'
                  }`}
                >
                  <Icon className={isActive ? 'text-accent' : 'text-muted'} />
                </span>
                <span className={isActive ? 'text-foreground' : 'text-muted'}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
