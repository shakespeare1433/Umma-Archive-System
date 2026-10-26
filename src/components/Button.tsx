import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  iconName?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  iconName,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const containerStyle = [
    styles.base,
    isOutline
      ? styles.outlineBase
      : isSecondary
      ? styles.secondaryBase
      : styles.primaryBase,
    disabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.baseText,
    isOutline
      ? styles.outlineText
      : isSecondary
      ? styles.secondaryText
      : styles.primaryText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isOutline ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.content}>
          <Text style={labelStyle}>{title}</Text>
          {iconName && (
            <MaterialIcons
              name={iconName}
              size={18}
              color={isOutline ? colors.primary : '#FFFFFF'}
              style={styles.icon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBase: {
    backgroundColor: colors.primary,
  },
  secondaryBase: {
    backgroundColor: colors.secondary,
  },
  outlineBase: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    shadowOpacity: 0.05,
    elevation: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  primaryText: {
    color: colors.onPrimary,
  },
  secondaryText: {
    color: colors.onSecondary,
  },
  outlineText: {
    color: colors.onSurface,
  },
  icon: {
    marginLeft: 8,
  },
});
