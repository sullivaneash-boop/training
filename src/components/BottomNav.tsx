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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg justify-around px-1 pt-1 pb-safe-bottom">
        {navItems.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                isActive ? 'font-semibold text-accent' : 'font-medium text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={isActive ? 'text-accent' : 'text-muted'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
