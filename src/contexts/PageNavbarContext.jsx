import { createContext, useContext, useState, useCallback } from 'react';

const PageNavbarContext = createContext(null);

export function PageNavbarProvider({ children }) {
  const [title, setTitle] = useState('');
  const [rightActions, setRightActions] = useState(null);

  const setPageNavbar = useCallback(({ title: t, rightActions: a }) => {
    setTitle(t ?? '');
    setRightActions(a ?? null);
  }, []);

  return (
    <PageNavbarContext.Provider value={{ title, rightActions, setPageNavbar }}>
      {children}
    </PageNavbarContext.Provider>
  );
}

export function usePageNavbar() {
  const ctx = useContext(PageNavbarContext);
  if (!ctx) return { setPageNavbar: () => {} };
  return ctx;
}
