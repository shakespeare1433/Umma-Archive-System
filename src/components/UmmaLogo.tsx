import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

interface UmmaLogoProps {
  size?: number;
}

export const UmmaLogo: React.FC<UmmaLogoProps> = ({ size = 96 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Radiant Green Fan / Palm Crest */}
      <View style={styles.fanWrapper}>
        <View style={[styles.fanRay, { transform: [{ rotate: '-60deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '-45deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '-30deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '-15deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '0deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '15deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '30deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '45deg' }] }]} />
        <View style={[styles.fanRay, { transform: [{ rotate: '60deg' }] }]} />
      </View>

      {/* Blue Open Book / Pen Base Shield */}
      <View style={styles.baseShield}>
        <View style={styles.leftWing} />
        <View style={styles.rightWing} />
        {/* Silver Pen Nib Center */}
        <View style={styles.penCenter}>
          <View style={styles.penNibCircle} />
          <View style={styles.penNibLine} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
  fanWrapper: {
    width: 64,
    height: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginBottom: 2,
  },
  fanRay: {
    position: 'absolute',
    bottom: 0,
    width: 3.5,
    height: 24,
    borderRadius: 2,
    backgroundColor: '#34A853',
    transformOrigin: 'bottom center',
  },
  baseShield: {
    width: 58,
    height: 48,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftWing: {
    width: 26,
    height: 44,
    borderWidth: 5,
    borderColor: '#00236F',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 18,
    borderRightWidth: 0,
    backgroundColor: '#1E3A8A',
    transform: [{ skewY: '-12deg' }],
  },
  rightWing: {
    width: 26,
    height: 44,
    borderWidth: 5,
    borderColor: '#00236F',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 18,
    borderLeftWidth: 0,
    backgroundColor: '#1E3A8A',
    transform: [{ skewY: '12deg' }],
  },
  penCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  penNibCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginBottom: -2,
  },
  penNibLine: {
    width: 2.5,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});
