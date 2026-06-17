import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutContextValue {
  tabbarHidden: boolean;
  setTabbarHidden: (hidden: boolean) => void;
  backHandler: (() => boolean) | null;
  setBackHandler: (handler: (() => boolean) | null) => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  tabbarHidden: false,
  setTabbarHidden: () => {},
  backHandler: null,
  setBackHandler: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [tabbarHidden, setTabbarHidden] = useState(false);
  const [backHandler, setBackHandler] = useState<(() => boolean) | null>(null);
  return (
    <LayoutContext.Provider value={{ tabbarHidden, setTabbarHidden, backHandler, setBackHandler }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
