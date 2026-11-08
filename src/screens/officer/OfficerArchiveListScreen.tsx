import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { listArchives } from '../../services/archiveService';
import { formatLocationCode, isLocationRecorded } from '../../services/locationService';
import { formatPhysicalLocation } from '../../constants/booklets';
import { ArchivedExaminationRecord } from '../../types';
import { borderRadius, colors as tokens, spacing } from '../../theme';

export const OfficerArchiveListScreen: React.FC<{
  onNewBatch: () => void;
  onUpdateLocation: (archiveId: string) => void;
}> = ({ onNewBatch, onUpdateLocation }) => {
  const [rows, setRows] = useState<ArchivedExaminationRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setRows(await listArchives());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Archives could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.courseCode, row.courseName, row.studentName, row.admissionNumber, row.session, row.faculty]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [query, rows]);

  return (
    <KeyboardAvoidingView style={styles.stage} behavior="padding">
      <Text style={styles.title}>Archive</Text>
      <Text style={styles.subtitle}>Browse shelved batches and update locations.</Text>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search unit, student, session…"
        placeholderTextColor={tokens.placeholder}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.primary} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error || 'No archive records yet. Start a new batch to shelve booklets.'}
            </Text>
          }
          renderItem={({ item }) => {
            const hasLocation = isLocationRecorded({
              shelf: item.shelf,
              rack: item.rack,
              box: item.box,
              position: item.pos,
            });
            const code = hasLocation
              ? formatLocationCode({
                  shelf: item.shelf,
                  rack: item.rack,
                  box: item.box,
                  position: item.pos,
                })
              : 'Not shelved';
            const line = formatPhysicalLocation({
              shelf: item.shelf,
              rack: item.rack,
              box: item.box,
              position: item.pos,
            });
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.code}>{item.courseCode}</Text>
                  <Text style={[styles.badge, hasLocation ? styles.ok : styles.warn]}>
                    {hasLocation ? code : 'Not shelved'}
                  </Text>
                </View>
                <Text style={styles.name}>{item.courseName}</Text>
                <Text style={styles.meta}>
                  {item.session} · {item.faculty}
                </Text>
                <Text style={styles.meta}>
                  {item.studentName || 'Batch'}
                  {item.admissionNumber ? ` · ${item.admissionNumber}` : ''}
                  {item.scriptCount ? ` · ${item.scriptCount} scripts` : ''}
                </Text>
                <Text style={styles.location}>{line}</Text>
                <Text style={styles.meta}>
                  Custody: {item.custodyStatus || 'On shelf'}
                  {item.lastVerifiedAt
                    ? ` · Verified ${new Date(item.lastVerifiedAt).toLocaleDateString()}`
                    : ''}
                </Text>
                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={() => onUpdateLocation(item.id)}
                  activeOpacity={0.85}
                >
                  <Feather name="map-pin" size={14} color={tokens.primary} />
                  <Text style={styles.updateText}>Update location</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={onNewBatch} activeOpacity={0.85}>
        <Feather name="plus" size={18} color={tokens.onPrimary} />
        <Text style={styles.fabText}>Archive new batch</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: tokens.background },
  title: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    fontSize: 22,
    fontWeight: '800',
    color: tokens.onSurface,
  },
  subtitle: {
    marginHorizontal: spacing.md,
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    color: tokens.onSurfaceVariant,
  },
  search: {
    marginHorizontal: spacing.md,
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    paddingHorizontal: 12,
    color: tokens.onSurface,
    backgroundColor: tokens.surfaceContainerLowest,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: 100 },
  empty: { color: tokens.onSurfaceVariant, lineHeight: 20 },
  card: {
    backgroundColor: tokens.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: tokens.inputBorder,
    padding: 12,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 12, fontWeight: '800', color: tokens.secondary },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ok: { backgroundColor: tokens.statusVerifiedBg, color: tokens.statusVerifiedText },
  warn: { backgroundColor: tokens.statusPendingBg, color: tokens.statusPendingText },
  name: { marginTop: 4, fontSize: 15, fontWeight: '800', color: tokens.onSurface },
  meta: { marginTop: 4, fontSize: 12, color: tokens.onSurfaceVariant },
  location: { marginTop: 8, fontSize: 12, fontWeight: '700', color: tokens.primary },
  updateBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  updateText: { color: tokens.primary, fontWeight: '700', fontSize: 13 },
  fab: {
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
  fabText: { color: tokens.onPrimary, fontWeight: '800' },
});
