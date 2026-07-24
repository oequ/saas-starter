import {
  forwardRef,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Text } from './Text';
import { tokens } from './tokens';

export type SheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type SheetProps = {
  title: string;
  children?: ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  primaryDestructive?: boolean;
};

export const Sheet = forwardRef<SheetHandle, SheetProps>(function Sheet(
  {
    title,
    children,
    primaryLabel,
    secondaryLabel = 'Cancel',
    onPrimary,
    onSecondary,
    primaryDestructive = false,
  },
  ref,
) {
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['32%'], []);

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetView
        style={[styles.content, { paddingBottom: Math.max(insets.bottom, tokens.space.lg) }]}
      >
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
        {children}
        <View style={styles.actions}>
          <Button
            variant={primaryDestructive ? 'destructive' : 'primary'}
            onPress={() => {
              onPrimary();
              modalRef.current?.dismiss();
            }}
          >
            {primaryLabel}
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              onSecondary?.();
              modalRef.current?.dismiss();
            }}
          >
            {secondaryLabel}
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: tokens.color.sheet,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
  },
  handle: {
    backgroundColor: tokens.color.border,
    width: 40,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  actions: {
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
  },
});
