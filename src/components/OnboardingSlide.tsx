import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Mockups are portrait phone frames (~9:16). */
const IMAGE_ASPECT = 9 / 16;

interface Props {
  source: ImageSourcePropType;
  ctaLabel: string;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
}

type Frame = { x: number; y: number; width: number; height: number };

function containFrame(boxW: number, boxH: number, aspect: number): Frame {
  if (boxW <= 0 || boxH <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  const boxAspect = boxW / boxH;
  if (boxAspect > aspect) {
    const height = boxH;
    const width = height * aspect;
    return { x: (boxW - width) / 2, y: 0, width, height };
  }
  const width = boxW;
  const height = width / aspect;
  return { x: 0, y: (boxH - height) / 2, width, height };
}

export const OnboardingSlide: React.FC<Props> = ({
  source,
  ctaLabel,
  onNext,
  onSkip,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const onNextRef = useRef(onNext);
  const onBackRef = useRef(onBack);
  onNextRef.current = onNext;
  onBackRef.current = onBack;

  const frame = useMemo(
    () => containFrame(box.width, box.height, IMAGE_ASPECT),
    [box.height, box.width]
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -50) onNextRef.current();
        else if (gesture.dx >= 50 && onBackRef.current) onBackRef.current();
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };

  const skipStyle = frame.width
    ? {
        top: frame.y + frame.height * 0.015,
        right: box.width - (frame.x + frame.width) + frame.width * 0.04,
        width: Math.max(96, frame.width * 0.28),
        height: Math.max(48, frame.height * 0.06),
      }
    : styles.skipFallback;

  const ctaStyle = frame.width
    ? {
        left: frame.x + frame.width * 0.08,
        width: frame.width * 0.84,
        bottom: box.height - (frame.y + frame.height) + frame.height * 0.035,
        height: Math.max(56, frame.height * 0.075),
      }
    : styles.ctaFallback;

  return (
    <View style={styles.root} onLayout={onLayout} {...pan.panHandlers}>
      <Image source={source} style={styles.image} resizeMode="contain" />

      {frame.width > 0 ? (
        <>
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [styles.hit, skipStyle, pressed && styles.hitPressed]}
            accessibilityRole="button"
            accessibilityLabel="Skip"
            hitSlop={8}
            android_ripple={{ color: 'transparent' }}
          />
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [styles.hit, ctaStyle, pressed && styles.hitPressed]}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            hitSlop={8}
            android_ripple={{ color: 'transparent' }}
          />
        </>
      ) : null}

      {/* Keep Skip clear of status bar / notch */}
      <View style={{ height: insets.top }} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#C5EDE6',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  hit: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'transparent',
  },
  hitPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skipFallback: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 100,
    height: 48,
    zIndex: 5,
  },
  ctaFallback: {
    position: 'absolute',
    left: '8%',
    width: '84%',
    bottom: 36,
    height: 58,
    zIndex: 5,
  },
});
