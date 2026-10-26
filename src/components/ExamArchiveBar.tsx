import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const ARCHIVE_BAR = '#5B6A94';

interface Props {
  subtitle: string;
  onBell?: () => void;
  showDot?: boolean;
}

export const ExamArchiveBar: React.FC<Props> = ({ subtitle, onBell, showDot = true }) => {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <View style={styles.logoBox}>
          <Image source={require('../../assets/exam-archive-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.title}>Exam Archive</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.bell}
        onPress={onBell}
        activeOpacity={0.75}
        accessibilityLabel="Notifications"
      >
        <Feather name="bell" size={20} color="#FFFFFF" />
        {showDot ? <View style={styles.dot} /> : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: ARCHIVE_BAR,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logo: { width: 36, height: 36 },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: { color: '#E2E8F0', fontSize: 13, marginTop: 1 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#6D7CAA',
  },
});
