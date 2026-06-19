import { createContext, useContext, useState, type ReactNode } from 'react';
import type { NavBadges } from '../lib/participantSnapshot';

interface LayoutContextValue {
  tabbarHidden: boolean;
  setTabbarHidden: (hidden: boolean) => void;
  backHandler: (() => boolean) | null;
  setBackHandler: (handler: (() => boolean) | null) => void;
  navBadges: NavBadges;
  setNavBadges: (badges: NavBadges) => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  tabbarHidden: false,
  setTabbarHidden: () => {},
  backHandler: null,
  setBackHandler: () => {},
  navBadges: { tasks: 0, questions: 0 },
  setNavBadges: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [tabbarHidden, setTabbarHidden] = useState(false);
  const [backHandler, setBackHandler] = useState<(() => boolean) | null>(null);
  const [navBadges, setNavBadges] = useState<NavBadges>({ tasks: 0, questions: 0 });
  return (
    <LayoutContext.Provider value={{ tabbarHidden, setTabbarHidden, backHandler, setBackHandler, navBadges, setNavBadges }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
