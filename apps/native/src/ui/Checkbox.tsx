import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  error?: string;
};

export function Checkbox({ label, checked, onChange, error }: CheckboxProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? (
            <Text variant="caption" tone="inverse" style={styles.mark}>
              ✓
            </Text>
          ) : null}
        </View>
        <Text variant="caption" tone="muted" style={styles.label}>
          {label}
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" tone="destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: tokens.color.primary,
    borderColor: tokens.color.primary,
  },
  mark: {
    fontSize: 12,
    lineHeight: 14,
  },
  label: {
    flex: 1,
    lineHeight: 20,
  },
});
