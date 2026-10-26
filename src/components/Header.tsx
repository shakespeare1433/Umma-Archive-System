import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

interface HeaderProps {
  stepText?: string;
  onSkip?: () => void;
  showSkip?: boolean;
  showVerifiedBadge?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stepText = 'Step 1 of 4',
  onSkip,
  showSkip = true,
  showVerifiedBadge = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        {showVerifiedBadge && (
          <View style={styles.badge}>
            <MaterialIcons name="verified" size={14} color={colors.primary} />
            <Text style={styles.badgeText}>UMMA</Text>
          </View>
        )}
        <View style={styles.stepPill}>
          <MaterialIcons name="school" size={14} color={colors.primary} />
          <Text style={styles.stepText}>{stepText}</Text>
        </View>
      </View>

      {showSkip && onSkip ? (
        <TouchableOpacity
          onPress={onSkip}
          style={styles.skipButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.outline} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 5,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.outline,
  },
});
