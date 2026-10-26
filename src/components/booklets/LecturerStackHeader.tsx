import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { BOOKLET_COPY } from '../../constants/booklets';
import { borderRadius, colors as tokens, control, spacing, typography } from '../../theme';

interface Props {
  title: string;
  onBack: () => void;
  onDownload?: () => void;
  downloadDisabled?: boolean;
}

export const LecturerStackHeader: React.FC<Props> = ({
  title,
  onBack,
  onDownload,
  downloadDisabled,
}) => {
  const { theme } = useTheme();
  const palette = lecturerPalette(theme);
  const styles = useMemo(() => createStyles(palette), [theme]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={BOOKLET_COPY.back}
        >
          <Feather name="arrow-left" size={22} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {onDownload ? (
          <TouchableOpacity
            onPress={onDownload}
            disabled={downloadDisabled}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={BOOKLET_COPY.downloadPdf}
            accessibilityState={{ disabled: Boolean(downloadDisabled) }}
          >
            <Feather
              name="download"
              size={20}
              color={downloadDisabled ? palette.muted : tokens.secondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
    </SafeAreaView>
  );
};

function createStyles(palette: ReturnType<typeof lecturerPalette>) {
  return StyleSheet.create({
    safe: {
      backgroundColor: palette.page,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      minHeight: control.minTap,
    },
    iconBtn: {
      width: control.minTap,
      height: control.minTap,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
      color: palette.ink,
      fontFamily: typography.fontFamilySans,
    },
  });
}
