import { useEffect, useState } from 'react';
import { usePorts } from './PortsContext';
import { HomePage } from './pages/HomePage';
import { SignInPage } from './pages/SignInPage';

export function App() {
  const { auth } = usePorts();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sub = auth.session$.subscribe((session) => {
      setSignedIn(Boolean(session));
    });
    return () => sub.unsubscribe();
  }, [auth]);

  if (!signedIn) {
    return <SignInPage onSignedIn={() => setSignedIn(true)} />;
  }

  return <HomePage onSignedOut={() => setSignedIn(false)} />;
}
