import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutContextValue {
  tabbarHidden: boolean;
  setTabbarHidden: (hidden: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  tabbarHidden: false,
  setTabbarHidden: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [tabbarHidden, setTabbarHidden] = useState(false);
  return (
    <LayoutContext.Provider value={{ tabbarHidden, setTabbarHidden }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
