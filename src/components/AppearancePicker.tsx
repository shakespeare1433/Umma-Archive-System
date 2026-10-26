import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemePreference, useTheme } from '../context/ThemeContext';
import { borderRadius, colors as tokens, control, spacing, typography } from '../theme';

const OPTIONS: { id: ThemePreference; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

const ICON_SIZE = 18;

export const AppearancePicker: React.FC = () => {
  const { theme, preference, setTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, dark && styles.labelDark]}>Appearance</Text>
      <View style={[styles.track, dark && styles.trackDark]}>
        {OPTIONS.map((option) => {
          const selected = preference === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.segment, selected && styles.segmentOn]}
              onPress={() => setTheme(option.id)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label} appearance`}
            >
              <Feather
                name={option.icon}
                size={ICON_SIZE}
                color={selected ? tokens.onPrimary : dark ? tokens.outlineVariant : tokens.outline}
              />
              <Text
                style={[
                  styles.segmentText,
                  dark && styles.segmentTextDark,
                  selected && styles.segmentTextOn,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: control.subtitle,
    fontWeight: '700',
    color: tokens.onSurface,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    fontFamily: typography.fontFamilySans,
  },
  labelDark: {
    color: tokens.surfaceContainerLowest,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    borderRadius: borderRadius.pill,
    padding: spacing.xs,
  },
  trackDark: {
    backgroundColor: tokens.primaryContainer,
    borderColor: tokens.primaryHover,
  },
  segment: {
    flex: 1,
    minHeight: control.minTap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
  },
  segmentOn: {
    backgroundColor: tokens.primary,
  },
  segmentText: {
    fontSize: control.body,
    fontWeight: '600',
    color: tokens.outline,
    fontFamily: typography.fontFamilySans,
  },
  segmentTextDark: {
    color: tokens.outlineVariant,
  },
  segmentTextOn: {
    color: tokens.onPrimary,
    fontWeight: '700',
  },
});
