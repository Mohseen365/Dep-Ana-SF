import { createContext, useContext, ReactNode } from 'react';
import { useGraphSelection } from '../hooks/useGraphSelection';

type SelectionContextType = ReturnType<typeof useGraphSelection>;

const SelectionContext = createContext<SelectionContextType | null>(null);

export interface SelectionProviderProps {
  children: ReactNode;
  value?: SelectionContextType;
}

export function SelectionProvider({ children, value }: SelectionProviderProps): JSX.Element {
  const defaultSelection = useGraphSelection();
  const selection = value ?? defaultSelection;

  return (
    <SelectionContext.Provider value={selection}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextType {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
