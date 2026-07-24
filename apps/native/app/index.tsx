import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/auth/auth-context';
import { tokens } from '../src/ui/tokens';

export default function Index() {
  const { session, ready } = useAuth();
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.color.background,
        }}
      >
        <ActivityIndicator color={tokens.color.foreground} />
      </View>
    );
  }
  return <Redirect href={session ? '/home' : '/login'} />;
}
