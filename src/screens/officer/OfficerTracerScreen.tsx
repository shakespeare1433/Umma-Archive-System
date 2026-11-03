import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  CoordChip,
  SHELF_OPTIONS,
  TRACER_FILTERS,
  TracerFilter,
  TracerRequest,
  TracerStatus,
  useCustody,
} from './custody';

const GREEN = '#17803D';

export const OfficerTracerScreen: React.FC<{
  filter: TracerFilter;
  onFilter: (filter: TracerFilter) => void;
}> = ({ filter, onFilter }) => {
  const { tracers, flash, clearFlash, locateTracer, moveTracerShelf, verifyTracer, reload } = useCustody();
  const [movingId, setMovingId] = useState<string | null>(null);
  const visible = tracers.filter((item) => filter === 'All Requests' || item.status === filter);
  const moving = tracers.find((item) => item.id === movingId);
  const groups: TracerStatus[] =
    filter === 'Pending' || filter === 'Located' || filter === 'Completed'
      ? [filter]
      : ['Pending', 'Located', 'Completed'];

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <View style={styles.fill}>
      <View style={styles.filterBar}>
        {TRACER_FILTERS.map((item) => {
          const on = filter === item;
          const count =
            item === 'All Requests'
              ? tracers.length
              : tracers.filter((row) => row.status === item).length;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filter, on && styles.filterOn]}
              onPress={() => onFilter(item)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${item}, ${count}`}
            >
              <Text style={[styles.filterText, on && styles.filterTextOn]} numberOfLines={1}>
                {item === 'All Requests' ? 'All' : item} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.registryRow}>
          <Text style={styles.registry}>ACTIVE TRACER REGISTRY</Text>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>{tracers.length} requests active</Text>
          </View>
        </View>

        {flash ? (
          <TouchableOpacity style={styles.flash} onPress={clearFlash} activeOpacity={0.85}>
            <Feather name="check-circle" size={15} color="#15803D" />
            <Text style={styles.flashText}>{flash}</Text>
          </TouchableOpacity>
        ) : null}

        {groups.map((status) => {
          const rows = visible.filter((item) => item.status === status);
          return (
            <View key={status} style={styles.group}>
              <Text style={styles.groupTitle}>{status}</Text>
              {rows.length === 0 ? (
                <Text style={styles.empty}>No {status.toLowerCase()} requests.</Text>
              ) : (
                rows.map((item) => (
                  <TracerCard
                    key={item.id}
                    item={item}
                    onLocate={() => locateTracer(item.id)}
                    onMove={() => setMovingId(item.id)}
                    onVerify={() => verifyTracer(item.id)}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!moving} transparent animationType="fade" onRequestClose={() => setMovingId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMovingId(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Move Shelf</Text>
            <Text style={styles.sheetSub}>{moving?.student}</Text>
            {SHELF_OPTIONS.map((shelf) => (
              <TouchableOpacity
                key={shelf}
                style={styles.shelfOption}
                activeOpacity={0.8}
                onPress={() => {
                  if (moving) moveTracerShelf(moving.id, shelf);
                  setMovingId(null);
                }}
              >
                <Feather name="map-pin" size={16} color={GREEN} />
                <Text style={styles.shelfOptionText}>{shelf}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setMovingId(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

function TracerCard({
  item,
  onLocate,
  onMove,
  onVerify,
}: {
  item: TracerRequest;
  onLocate: () => void;
  onMove: () => void;
  onVerify: () => void;
}) {
  const hot = !!item.expedite && item.status === 'Pending';
  const located = item.status === 'Located';
  const done = item.status === 'Completed';
  const badge = done
    ? 'COMPLETED'
    : located
      ? 'PHYSICALLY LOCATED'
      : hot
        ? 'Expedite'
        : 'Pending Physical Trace';

  return (
    <View style={[styles.card, hot && styles.cardHot, located && styles.cardLocated]}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadMain}>
          <Text style={styles.student}>{item.student}</Text>
          <Text style={styles.reg}>
            {item.reg} • {item.school}
          </Text>
        </View>
        {item.lecturer ? (
          <View style={styles.lecturerBlock}>
            <Text style={styles.lecturerKicker}>Lecturer</Text>
            <Text style={styles.lecturer}>{item.lecturer}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.unitBox, hot && styles.unitHot, located && styles.unitLocated]}>
        {hot ? <MaterialCommunityIcons name="alert-octagon-outline" size={16} color="#DC2626" /> : null}
        <Text style={styles.unit} numberOfLines={2}>
          {item.unitCode}: {item.unitTitle}
        </Text>
        <View style={[styles.badge, hot && styles.badgeHot, located && styles.badgeLocated, done && styles.badgeLocated]}>
          <Text style={[styles.badgeText, hot && styles.badgeTextHot, (located || done) && styles.badgeTextLocated]}>
            {badge}
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaCol}>
          <Text style={styles.metaStrong}>{item.session}</Text>
          {item.sessionSub ? <Text style={styles.metaSoft}>{item.sessionSub}</Text> : null}
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaStrong}>{item.venue}</Text>
          {item.venueSub ? <Text style={styles.metaSoft}>{item.venueSub}</Text> : null}
        </View>
        <Text style={[styles.metaLine, item.leftAlert && styles.metaAlert]}>{item.leftMeta}</Text>
        <Text style={[styles.metaLine, styles.metaRight]}>{item.rightMeta}</Text>
      </View>

      <Text style={styles.coordLabel}>PHYSICAL COORDINATE INDEX</Text>
      <View style={styles.coordRow}>
        {item.chips.map((chip, index) => (
          <React.Fragment key={`${chip.title}-${index}`}>
            {index > 0 ? <Feather name="arrow-right" size={14} color="#CBD5E1" /> : null}
            <CoordBox chip={chip} />
          </React.Fragment>
        ))}
      </View>

      {done ? (
        <View style={styles.doneRow}>
          <Feather name="check-circle" size={15} color={GREEN} />
          <Text style={styles.doneText}>Verified and filed</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.locate} activeOpacity={0.85} onPress={onLocate}>
            <Feather name="map-pin" size={15} color="#FFFFFF" />
            <Text style={styles.locateText}>Locate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghost} activeOpacity={0.85} onPress={onMove}>
            <MaterialCommunityIcons name="swap-vertical" size={16} color="#0F766E" />
            <Text style={styles.ghostText}>Move{'\n'}Shelf</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghost} activeOpacity={0.85} onPress={onVerify}>
            <Feather name="check-square" size={15} color="#334155" />
            <Text style={styles.verifyText}>Verify</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CoordBox({ chip }: { chip: CoordChip }) {
  const dark = chip.tone === 'dark';
  const green = chip.tone === 'green';
  return (
    <View style={[styles.coord, dark && styles.coordDark, green && styles.coordGreen, chip.tone === 'plain' && styles.coordPlain]}>
      <Text style={[styles.coordTitle, dark && styles.coordTitleDark, green && styles.coordTitleGreen]} numberOfLines={2}>
        {chip.title}
      </Text>
      {chip.detail ? (
        <Text style={[styles.coordDetail, dark && styles.coordDetailDark, green && styles.coordDetailGreen]}>
          {chip.detail}
        </Text>
      ) : null}
      {chip.extra ? (
        <Text style={[styles.coordExtra, dark && styles.coordExtraDark, green && styles.coordExtraGreen]}>{chip.extra}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F4F7FB' },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#F4F7FB',
  },
  page: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 24 },
  registryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  registry: { flex: 1, fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.4 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  activeText: { color: '#16A34A', fontSize: 12, fontWeight: '700' },
  filter: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  filterOn: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTextOn: { color: '#FFFFFF' },
  traced: { textAlign: 'right', color: '#94A3B8', fontSize: 12, marginBottom: 10 },
  tracedName: { color: '#334155', fontWeight: '700' },
  flash: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  flashText: { flex: 1, color: '#166534', fontSize: 13, fontWeight: '600' },
  group: { marginTop: 14 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  empty: { color: '#64748B', marginBottom: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EDF5',
  },
  cardHot: { borderColor: '#F3C0C0', backgroundColor: '#FFFBFB' },
  cardLocated: { borderColor: '#B7E7C9', backgroundColor: '#F7FDF9' },
  cardHead: { gap: 8 },
  cardHeadMain: { flex: 1 },
  student: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  reg: { marginTop: 2, fontSize: 11, color: '#64748B' },
  lecturerBlock: { alignItems: 'flex-start' },
  lecturerKicker: { fontSize: 10, color: '#94A3B8' },
  lecturer: { fontSize: 12, fontWeight: '700', color: '#334155' },
  unitBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  unitHot: { backgroundColor: '#FEF2F2' },
  unitLocated: { backgroundColor: '#ECFDF3' },
  unit: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#DBEAFE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeHot: { backgroundColor: '#FEE2E2' },
  badgeLocated: { backgroundColor: '#D1FAE5' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#2563EB', textAlign: 'center' },
  badgeTextHot: { color: '#DC2626' },
  badgeTextLocated: { color: '#15803D' },
  meta: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' },
  metaCol: { width: '50%', marginBottom: 6 },
  metaStrong: { fontSize: 12, fontWeight: '700', color: '#334155' },
  metaSoft: { fontSize: 11, color: '#94A3B8' },
  metaLine: { width: '50%', fontSize: 11, color: '#64748B', marginTop: 2 },
  metaRight: { textAlign: 'right' },
  metaAlert: { color: '#DC2626', fontWeight: '700' },
  coordLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  coordRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  coord: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: 'center',
  },
  coordDark: { backgroundColor: '#1F2937' },
  coordGreen: { backgroundColor: '#D1FAE5' },
  coordPlain: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5E7EB' },
  coordTitle: { fontSize: 10, fontWeight: '700', color: '#475569', textAlign: 'center' },
  coordTitleDark: { color: '#E5E7EB' },
  coordTitleGreen: { color: '#166534' },
  coordDetail: { fontSize: 12, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  coordDetailDark: { color: '#FFFFFF' },
  coordDetailGreen: { color: '#15803D' },
  coordExtra: { fontSize: 10, color: '#64748B', textAlign: 'center' },
  coordExtraDark: { color: '#D1D5DB' },
  coordExtraGreen: { color: '#166534' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  locate: {
    flex: 1.15,
    height: 46,
    borderRadius: 12,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  locateText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  ghost: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  ghostText: { color: '#0F766E', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  verifyText: { color: '#334155', fontWeight: '800', fontSize: 13 },
  doneRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneText: { color: GREEN, fontWeight: '700', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 28,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sheetSub: { marginTop: 4, marginBottom: 12, color: '#64748B' },
  shelfOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shelfOptionText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  sheetCancel: { marginTop: 8, alignItems: 'center', paddingVertical: 10 },
  sheetCancelText: { color: '#64748B', fontWeight: '700' },
});
