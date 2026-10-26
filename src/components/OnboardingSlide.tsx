import React, { useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  source: ImageSourcePropType;
  ctaLabel: string;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
}

export const OnboardingSlide: React.FC<Props> = ({ source, ctaLabel, onNext, onSkip, onBack }) => {
  const [artHeight, setArtHeight] = useState(0);
  const onNextRef = useRef(onNext);
  const onBackRef = useRef(onBack);
  onNextRef.current = onNext;
  onBackRef.current = onBack;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 28 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -60) onNextRef.current();
        else if (gesture.dx >= 60 && onBackRef.current) onBackRef.current();
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.fill} {...pan.panHandlers}>
        <View
          style={styles.art}
          onLayout={(event) => setArtHeight(event.nativeEvent.layout.height)}
        >
          <Image
            source={source}
            style={[styles.image, artHeight > 0 ? { height: artHeight } : null]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity
            onPress={onSkip}
            style={styles.skipButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={onNext}
            activeOpacity={0.88}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EBF4F6',
  },
  fill: {
    flex: 1,
    backgroundColor: '#EBF4F6',
  },
  art: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#EBF4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 2,
    zIndex: 2,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#1B3A6B',
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 18,
    backgroundColor: '#EBF4F6',
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: '#16305C',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
