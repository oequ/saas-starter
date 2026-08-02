import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { createDemoPorts, type DemoPorts } from './ports/create-demo-ports';

const PortsContext = createContext<DemoPorts | null>(null);

export function PortsProvider({ children }: { children: ReactNode }) {
  const ports = useMemo(() => createDemoPorts(), []);
  return (
    <PortsContext.Provider value={ports}>{children}</PortsContext.Provider>
  );
}

export function usePorts(): DemoPorts {
  const ports = useContext(PortsContext);
  if (!ports) {
    throw new Error('usePorts must be used within PortsProvider');
  }
  return ports;
}
