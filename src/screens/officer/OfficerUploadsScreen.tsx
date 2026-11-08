import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { InAppPdfModal } from '../../components/booklets/InAppPdfModal';
import { officerPalette, useTheme } from '../../context/ThemeContext';
import { listOfficerUploads } from '../../services/bookletService';
import { bookletHasPdf, formatPhysicalLocation } from '../../constants/booklets';
import { isLocationRecorded } from '../../services/locationService';
import { Booklet } from '../../types';
import { borderRadius, colors as tokens, spacing } from '../../theme';

type UploadFilter = 'all' | 'uploaded' | 'unshelved' | 'failed';

const FILTERS: { key: UploadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'uploaded', label: 'Shelved' },
  { key: 'unshelved', label: 'Not shelved' },
  { key: 'failed', label: 'Failed' },
];

function isShelved(item: Booklet): boolean {
  return isLocationRecorded({
    shelf: item.shelf,
    rack: item.rack,
    box: item.box,
    position: item.position,
  });
}

function statusOf(item: Booklet): Exclude<UploadFilter, 'all'> {
  if (!(item.digitised && item.pdfPath)) return 'failed';
  if (!isShelved(item)) return 'unshelved';
  return 'uploaded';
}

function isToday(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const OfficerUploadsScreen: React.FC<{
  onScan?: () => void;
  onOpenBooklet?: (id: string) => void;
  onUpdateLocation?: (id: string) => void;
}> = ({ onScan, onOpenBooklet, onUpdateLocation }) => {
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UploadFilter>('all');
  const [rows, setRows] = useState<Booklet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pdfBooklet, setPdfBooklet] = useState<Booklet | null>(null);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    setError('');
    try {
      setRows(await listOfficerUploads());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Uploads could not be loaded.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((item) => {
      const status = statusOf(item);
      if (filter !== 'all' && status !== filter) return false;
      if (!needle) return true;
      return (
        item.unitCode.toLowerCase().includes(needle) ||
        item.unitName.toLowerCase().includes(needle) ||
        item.registrationNo.toLowerCase().includes(needle) ||
        item.studentName.toLowerCase().includes(needle) ||
        item.school.toLowerCase().includes(needle) ||
        item.programme.toLowerCase().includes(needle)
      );
    });
  }, [filter, query, rows]);

  const today = visible.filter((item) => isToday(item.createdAt));
  const earlier = visible.filter((item) => !isToday(item.createdAt));
  const unshelvedCount = rows.filter((row) => statusOf(row) === 'unshelved').length;

  return (
    <View style={[styles.stage, { backgroundColor: palette.page }]}>
      <KeyboardScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={tokens.primary}
          />
        }
      >
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: palette.ink }]}>Uploads</Text>
        <Text style={[styles.pageSub, { color: palette.muted }]}>
          Booklets archived with PDFs and physical location details
        </Text>
      </View>

      <TextInput
        style={[
          styles.search,
          { backgroundColor: palette.card, borderColor: palette.line, color: palette.ink },
        ]}
        value={query}
        onChangeText={setQuery}
        placeholder="Search unit, student, school, or registration"
        placeholderTextColor={palette.muted}
      />
      {unshelvedCount > 0 ? (
        <Text style={styles.banner}>
          {unshelvedCount} upload{unshelvedCount === 1 ? '' : 's'} not yet shelved — use Update location on each card.
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((item) => {
          const on = filter === item.key;
          const count =
            item.key === 'all' ? rows.length : rows.filter((row) => statusOf(row) === item.key).length;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.chip,
                { backgroundColor: palette.soft },
                on && styles.chipOn,
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.chipText, { color: palette.ink }, on && styles.chipTextOn]} numberOfLines={1}>
                {item.key === 'all' ? `All · ${count}` : `${item.label} · ${count}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {visible.length === 0 ? (
          <Text style={[styles.empty, { color: palette.muted }]}>
            No uploads yet. Archive a new batch with a PDF to add it here.
          </Text>
        ) : null}
        {today.length > 0 ? (
          <View style={styles.group}>
            <Text style={[styles.groupLabel, { color: palette.muted }]}>TODAY</Text>
            {today.map((item) => (
              <UploadCard
                key={item.id}
                item={item}
                onPress={() => onOpenBooklet?.(item.id)}
                onViewPdf={() => setPdfBooklet(item)}
                onUpdateLocation={() => onUpdateLocation?.(item.id)}
              />
            ))}
          </View>
        ) : null}
        {earlier.length > 0 ? (
          <View style={styles.group}>
            <Text style={[styles.groupLabel, { color: palette.muted }]}>EARLIER</Text>
            {earlier.map((item) => (
              <UploadCard
                key={item.id}
                item={item}
                onPress={() => onOpenBooklet?.(item.id)}
                onViewPdf={() => setPdfBooklet(item)}
                onUpdateLocation={() => onUpdateLocation?.(item.id)}
              />
            ))}
          </View>
        ) : null}
      {onScan ? (
        <TouchableOpacity style={styles.scan} onPress={onScan} activeOpacity={0.85}>
          <Feather name="upload" size={16} color={tokens.onPrimary} />
          <Text style={styles.scanText}>Archive new batch</Text>
        </TouchableOpacity>
      ) : null}
      </KeyboardScrollView>
      <InAppPdfModal
        visible={Boolean(pdfBooklet)}
        booklet={pdfBooklet}
        onClose={() => setPdfBooklet(null)}
      />
    </View>
  );
};

function UploadCard({
  item,
  onPress,
  onViewPdf,
  onUpdateLocation,
}: {
  item: Booklet;
  onPress?: () => void;
  onViewPdf?: () => void;
  onUpdateLocation?: () => void;
}) {
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  const status = statusOf(item);
  const location = formatPhysicalLocation(item);
  const unshelved = status === 'unshelved';
  const hasPdf = bookletHasPdf(item);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${item.unitCode} ${item.unitName}`}
      >
        <View style={styles.cardTop}>
          <View style={styles.codeRow}>
            <MaterialCommunityIcons name="file-pdf-box" size={18} color={tokens.error} />
            <Text style={[styles.code, { color: palette.ink }]}>{item.unitCode}</Text>
          </View>
          <Text
            style={[
              styles.badge,
              status === 'uploaded' ? styles.ok : status === 'unshelved' ? styles.wait : styles.fail,
            ]}
          >
            {status === 'uploaded' ? 'Shelved' : status === 'unshelved' ? 'Not yet shelved' : 'Failed'}
          </Text>
        </View>
        <Text style={[styles.title, { color: palette.ink }]}>{item.unitName}</Text>
        <DetailRow icon="account-outline" text={`${item.studentName} · ${item.registrationNo}`} muted={palette.muted} />
        <DetailRow
          icon="school-outline"
          text={`${item.school || 'School not set'}${item.programme ? ` · ${item.programme}` : ''}`}
          muted={palette.muted}
        />
        <DetailRow icon="calendar-month-outline" text={item.academicSession || 'Session not set'} muted={palette.muted} />
        <DetailRow
          icon="map-marker-outline"
          text={location}
          muted={palette.muted}
          emphasize
          emphasizeColor={tokens.primary}
        />
        <View style={[styles.cardFooter, { borderTopColor: palette.line }]}>
          <Text style={[styles.when, { color: palette.muted }]}>{formatWhen(item.createdAt)}</Text>
          {hasPdf ? (
            <Text style={[styles.pdfHint, { color: palette.muted }]}>PDF attached</Text>
          ) : (
            <Text style={styles.pdfMissing}>No PDF</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnFlex,
            {
              backgroundColor: hasPdf ? tokens.primary : palette.soft,
              borderColor: hasPdf ? tokens.primary : palette.line,
              opacity: hasPdf ? 1 : 0.55,
            },
          ]}
          onPress={onViewPdf}
          disabled={!hasPdf}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="View PDF"
        >
          <Feather name="eye" size={14} color={hasPdf ? tokens.onPrimary : palette.muted} />
          <Text
            style={[
              styles.locationBtnText,
              { color: hasPdf ? tokens.onPrimary : palette.muted },
            ]}
          >
            View PDF
          </Text>
        </TouchableOpacity>
        {onUpdateLocation ? (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnFlex,
              {
                backgroundColor: unshelved ? tokens.primary : palette.soft,
                borderColor: unshelved ? tokens.primary : palette.line,
              },
            ]}
            onPress={onUpdateLocation}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Update location"
          >
            <Feather name="map-pin" size={14} color={unshelved ? tokens.onPrimary : tokens.primary} />
            <Text
              style={[
                styles.locationBtnText,
                { color: unshelved ? tokens.onPrimary : tokens.primary },
              ]}
            >
              {unshelved ? 'Set location' : 'Update location'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  text,
  muted,
  emphasize,
  emphasizeColor,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  text: string;
  muted: string;
  emphasize?: boolean;
  emphasizeColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon} size={14} color={emphasize ? emphasizeColor || muted : muted} />
      <Text
        style={[styles.detailText, { color: emphasize ? emphasizeColor || muted : muted }, emphasize && styles.detailStrong]}
        numberOfLines={2}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: tokens.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  pageTitle: { fontSize: 22, fontWeight: '800', color: tokens.onSurface },
  pageSub: { marginTop: 4, fontSize: 13, color: tokens.onSurfaceVariant, marginBottom: 4 },
  search: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 12,
    color: tokens.onSurface,
  },
  banner: {
    marginHorizontal: spacing.md,
    marginTop: 10,
    padding: 10,
    borderRadius: borderRadius.md,
    backgroundColor: tokens.statusPendingBg,
    color: tokens.statusPendingText,
    fontSize: 12,
    fontWeight: '700',
  },
  chips: { gap: 8, paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 4 },
  chip: {
    height: 34,
    borderRadius: 17,
    backgroundColor: tokens.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipOn: { backgroundColor: tokens.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: tokens.onSurfaceVariant },
  chipTextOn: { color: tokens.onPrimary },
  page: { padding: spacing.md, paddingBottom: 90 },
  group: { marginBottom: 16 },
  groupLabel: { fontSize: 11, fontWeight: '800', color: tokens.onSurfaceVariant, marginBottom: 8 },
  empty: { color: tokens.onSurfaceVariant, lineHeight: 20 },
  error: { color: tokens.error, fontWeight: '600', marginBottom: 10 },
  card: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  code: { fontSize: 13, fontWeight: '800', color: tokens.secondary },
  title: { marginTop: 6, fontSize: 15, fontWeight: '800', color: tokens.onSurface },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 },
  detailText: { flex: 1, fontSize: 12, color: tokens.onSurfaceVariant, lineHeight: 17 },
  detailStrong: { fontWeight: '700' },
  cardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: tokens.inputBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  when: { fontSize: 11, fontWeight: '600', color: tokens.onSurfaceVariant },
  pdfHint: { fontSize: 11, fontWeight: '700', color: tokens.onSurfaceVariant },
  pdfMissing: { fontSize: 11, fontWeight: '700', color: tokens.error },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  actionBtnFlex: { flex: 1 },
  locationBtnText: { fontSize: 12, fontWeight: '800' },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ok: { backgroundColor: '#DCFCE7', color: '#166534' },
  wait: { backgroundColor: '#FEF3C7', color: '#92400E' },
  fail: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  scan: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 48,
    borderRadius: borderRadius.pill,
    backgroundColor: tokens.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanText: { color: tokens.onPrimary, fontWeight: '800' },
});
