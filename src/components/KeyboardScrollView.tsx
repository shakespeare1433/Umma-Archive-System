import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
  ScrollViewProps,
  StyleProp,
  View,
} from 'react-native';

type Props = ScrollViewProps & {
  /** Extra lift above the keyboard edge while typing. */
  bottomOffset?: number;
  /** When false, skips KeyboardAvoidingView and only uses scroll padding. */
  aware?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Form-friendly scroll view that keeps focused inputs above the keyboard
 * on both iOS and Android (including Expo Go).
 */
export const KeyboardScrollView = forwardRef<ScrollView, Props>(function KeyboardScrollView(
  {
    bottomOffset = 24,
    aware = true,
    containerStyle,
    contentContainerStyle,
    children,
    style,
    ...rest
  },
  ref
) {
  const localRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const setRefs = (node: ScrollView | null) => {
    localRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  // Centered auth-style layouts: after unpinning, scroll so lower fields stay visible.
  useEffect(() => {
    if (keyboardHeight <= 0) return;
    const base = StyleSheet.flatten(contentContainerStyle) || {};
    if (base.justifyContent !== 'center') return;
    const timer = setTimeout(() => {
      localRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [contentContainerStyle, keyboardHeight]);

  const mergedContentStyle = useMemo(() => {
    const base = StyleSheet.flatten(contentContainerStyle) || {};
    const basePad =
      typeof base.paddingBottom === 'number'
        ? base.paddingBottom
        : typeof base.padding === 'number'
          ? base.padding
          : 24;
    const open = keyboardHeight > 0;
    return [
      contentContainerStyle,
      open
        ? {
            paddingBottom: basePad + keyboardHeight + bottomOffset,
            // Centered layouts can't scroll the focused field up — unpin while typing.
            ...(base.justifyContent === 'center'
              ? { justifyContent: 'flex-start' as const, paddingTop: 20 }
              : null),
          }
        : null,
    ];
  }, [bottomOffset, contentContainerStyle, keyboardHeight]);

  const scroll = (
    <ScrollView
      ref={setRefs}
      style={[styles.fill, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={mergedContentStyle}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  if (!aware) {
    return <View style={[styles.fill, containerStyle]}>{scroll}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {scroll}
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
