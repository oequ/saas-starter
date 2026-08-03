import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  createAppPorts,
  type AppPorts,
} from './ports/create-web-ports';

const PortsContext = createContext<AppPorts | null>(null);

export function PortsProvider({ children }: { children: ReactNode }) {
  const ports = useMemo(() => createAppPorts(), []);
  return (
    <PortsContext.Provider value={ports}>{children}</PortsContext.Provider>
  );
}

export function usePorts(): AppPorts {
  const ports = useContext(PortsContext);
  if (!ports) {
    throw new Error('usePorts must be used within PortsProvider');
  }
  return ports;
}
