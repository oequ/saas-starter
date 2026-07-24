import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <TextInput
        placeholderTextColor={tokens.color.mutedForeground}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
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
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.control,
    paddingHorizontal: tokens.space.md,
    fontFamily: tokens.font.body,
    fontSize: tokens.type.body,
    color: tokens.color.foreground,
    backgroundColor: tokens.color.background,
  },
  inputError: {
    borderColor: tokens.color.destructive,
  },
});
