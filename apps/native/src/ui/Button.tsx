import { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { tokens } from './tokens';

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(tokens.motion.pressScale, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        animatedStyle,
      ]}
    >
      <Text
        variant="body"
        tone={
          variant === 'primary' || variant === 'destructive'
            ? 'inverse'
            : 'default'
        }
        style={styles.label}
      >
        {children}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: tokens.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
  },
  primary: {
    backgroundColor: tokens.color.primary,
  },
  destructive: {
    backgroundColor: tokens.color.destructive,
  },
  secondary: {
    backgroundColor: tokens.color.muted,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: tokens.font.bodySemibold,
    fontSize: tokens.type.button,
  },
});
