import { Text as RNText, StyleSheet, TextProps as RNTextProps } from 'react-native';
import { tokens } from './tokens';

type Variant = 'title' | 'body' | 'caption';

type AppTextProps = RNTextProps & {
  variant?: Variant;
  tone?: 'default' | 'muted' | 'destructive' | 'inverse';
};

export function Text({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: AppTextProps) {
  return (
    <RNText
      style={[styles.base, styles[variant], styles[`tone_${tone}`], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: tokens.color.foreground,
  },
  title: {
    fontFamily: tokens.font.display,
    fontSize: tokens.type.title,
    lineHeight: 34,
  },
  body: {
    fontFamily: tokens.font.body,
    fontSize: tokens.type.body,
    lineHeight: 24,
  },
  caption: {
    fontFamily: tokens.font.body,
    fontSize: tokens.type.caption,
    lineHeight: 18,
  },
  tone_default: {
    color: tokens.color.foreground,
  },
  tone_muted: {
    color: tokens.color.mutedForeground,
  },
  tone_destructive: {
    color: tokens.color.destructive,
  },
  tone_inverse: {
    color: tokens.color.primaryForeground,
  },
});
