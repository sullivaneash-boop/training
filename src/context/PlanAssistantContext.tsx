import { createContext, useContext, useState, type ReactNode } from 'react';

type PlanAssistantContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
};

const PlanAssistantContext = createContext<PlanAssistantContextValue | null>(null);

export function PlanAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <PlanAssistantContext.Provider
      value={{
        isOpen,
        setOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
      }}
    >
      {children}
    </PlanAssistantContext.Provider>
  );
}

export function usePlanAssistant() {
  const ctx = useContext(PlanAssistantContext);
  if (!ctx) throw new Error('usePlanAssistant must be used within PlanAssistantProvider');
  return ctx;
}
