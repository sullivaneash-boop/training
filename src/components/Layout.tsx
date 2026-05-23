import { Outlet } from 'react-router-dom';
import { PlanAssistantProvider } from '../context/PlanAssistantContext';
import { AppShell } from './AppShell';
import { BottomNav } from './BottomNav';
import { PlanAssistantChat } from './PlanAssistantChat';

export function Layout() {
  return (
    <PlanAssistantProvider>
      <AppShell>
        <main className="flex-1 overflow-y-auto px-4 pb-32 pt-safe-top pt-4">
          <Outlet />
        </main>
        <PlanAssistantChat />
        <BottomNav />
      </AppShell>
    </PlanAssistantProvider>
  );
}
