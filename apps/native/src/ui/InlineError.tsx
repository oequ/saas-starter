import { StyleSheet } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';

type InlineErrorProps = {
  message: string;
};

export function InlineError({ message }: InlineErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <Text variant="caption" tone="destructive" style={styles.text}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: tokens.space.xs,
  },
});
