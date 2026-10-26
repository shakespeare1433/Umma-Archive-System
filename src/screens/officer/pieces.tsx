import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { UmmaLogo } from '../../components/UmmaLogo';
import {
  ArchivedBooklet,
  BookletIcon,
  CustodyRequest,
  NAVY,
  RequestStatus,
} from './custody';

export function OfficerHeader({
  onBell,
  subtitle = 'Officer Portal',
  variant = 'navy',
  dot = 'red',
  onMenu,
  onShield,
}: {
  onBell: () => void;
  subtitle?: string;
  variant?: 'navy' | 'light';
  dot?: 'red' | 'green';
  onMenu?: () => void;
  onShield?: () => void;
}) {
  const light = variant === 'light';
  const ink = light ? '#0F172A' : '#FFFFFF';
  const sub = light ? '#64748B' : '#C9D2E3';
  return (
    <View style={[styles.header, light && styles.headerLight]}>
      <View style={styles.headerLeft}>
        <View style={[styles.logoSquare, light && styles.logoSquareLight]}>
          <UmmaLogo size={30} />
        </View>
        <View>
          <Text style={[styles.appName, { color: ink }]}>Exam Archive</Text>
          <Text style={[styles.portal, { color: sub }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.bell} onPress={onBell} activeOpacity={0.7} accessibilityLabel="Notifications">
          <Feather name="bell" size={22} color={ink} />
          <View style={[styles.redDot, dot === 'green' && styles.greenDot, light && styles.dotLight]} />
        </TouchableOpacity>
        {onShield ? (
          <TouchableOpacity style={styles.bell} onPress={onShield} activeOpacity={0.7} accessibilityLabel="Officer profile">
            <MaterialCommunityIcons name="shield-outline" size={22} color={ink} />
          </TouchableOpacity>
        ) : null}
        {onMenu ? (
          <TouchableOpacity style={styles.bell} onPress={onMenu} activeOpacity={0.7} accessibilityLabel="Profile menu">
            <Feather name="more-vertical" size={22} color={ink} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function BackBar({
  title,
  onBack,
  rightLabel,
  onRight,
  rightDisabled,
}: {
  title: string;
  onBack: () => void;
  rightLabel?: string;
  onRight?: () => void;
  rightDisabled?: boolean;
}) {
  return (
    <View style={styles.backBar}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7} accessibilityLabel="Go back">
        <Feather name="arrow-left" size={18} color={NAVY} />
      </TouchableOpacity>
      <Text style={styles.backTitle} numberOfLines={1}>
        {title}
      </Text>
      {rightLabel && onRight ? (
        <TouchableOpacity
          onPress={onRight}
          disabled={rightDisabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
          style={styles.backRight}
        >
          <Text style={[styles.backRightText, rightDisabled && styles.backRightOff]}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  const palette =
    status === 'In Progress'
      ? { bg: '#DBEAFE', fg: '#1D4ED8' }
      : status === 'Pending Review'
        ? { bg: '#FEF3C7', fg: '#B45309' }
        : { bg: '#DCFCE7', fg: '#15803D' };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{status}</Text>
    </View>
  );
}

export function RequestCard({
  request,
  onOpen,
  onVerify,
  onRetrieve,
}: {
  request: CustodyRequest;
  onOpen: () => void;
  onVerify: () => void;
  onRetrieve: () => void;
}) {
  const showVerify = request.status === 'In Progress';
  const showRetrieve = request.status === 'Pending Review';

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.92} onPress={onOpen}>
      <View style={styles.cardTop}>
        <Text style={styles.ref}>{request.ref}</Text>
        <Text style={styles.unit} numberOfLines={1}>
          {request.unitCode} • {request.unitTitle}
        </Text>
        <StatusPill status={request.status} />
      </View>
      <Text style={styles.lecturer}>{request.lecturer}</Text>
      <Text style={styles.school}>{request.school}</Text>

      {request.mode === 'custody' && request.shelf ? (
        <View style={styles.metaRow}>
          <View style={styles.locChip}>
            <Feather name="map-pin" size={12} color="#475569" />
            <Text style={styles.locText}>
              Loc  {request.shelf}  {request.rack}
            </Text>
          </View>
          {request.box ? (
            <View style={styles.boxChip}>
              <MaterialCommunityIcons name="cube-outline" size={13} color="#047857" />
              <Text style={styles.boxText}>{request.box}</Text>
            </View>
          ) : null}
          <Text style={styles.bookletCount}>{request.booklets} Booklets</Text>
        </View>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.moderation}>{request.moderationLabel}</Text>
          <Text style={styles.bookletCount}>{request.booklets} Booklets</Text>
        </View>
      )}
      </TouchableOpacity>

      {showVerify ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8} onPress={onOpen}>
            <Text style={styles.outlineText}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fillBtn} activeOpacity={0.85} onPress={onVerify}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#FFFFFF" />
            <Text style={styles.fillText}>Verify Custody</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showRetrieve ? (
        <TouchableOpacity style={styles.wideOutline} activeOpacity={0.85} onPress={onRetrieve}>
          <Text style={styles.outlineText}>Begin Vault Retrieval</Text>
        </TouchableOpacity>
      ) : null}

      {request.status === 'Verified' ? (
        <View style={styles.verifiedNote}>
          <Feather name="check-circle" size={14} color="#15803D" />
          <Text style={styles.verifiedNoteText}>Custody verified and sent to the archive</Text>
        </View>
      ) : null}
    </View>
  );
}

const ICONS: Record<BookletIcon, { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; bg: string; fg: string }> = {
  doc: { name: 'file-document-outline', bg: '#047857', fg: '#FFFFFF' },
  law: { name: 'scale-balance', bg: '#6B21A8', fg: '#FFFFFF' },
  med: { name: 'medical-bag', bg: '#0369A1', fg: '#FFFFFF' },
};

export function BookletRow({ item, onPress }: { item: ArchivedBooklet; onPress: () => void }) {
  const icon = ICONS[item.icon];
  return (
    <TouchableOpacity style={styles.booklet} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.bookletIcon, { backgroundColor: icon.bg }]}>
        <MaterialCommunityIcons name={icon.name} size={20} color={icon.fg} />
      </View>
      <View style={styles.bookletBody}>
        <Text style={styles.bookletTitle} numberOfLines={1}>
          <Text style={styles.bookletCode}>{item.code} </Text>
          {item.title}
        </Text>
        <Text style={styles.scripts}>{item.scripts} scripts</Text>
        <Text style={styles.bookletMeta} numberOfLines={1}>
          {item.box}, {item.shelf} • {item.when}
          {item.actor ? ` ${item.actor}` : ''}
        </Text>
      </View>
      <View style={styles.verifiedPill}>
        <Feather name="check" size={11} color="#15803D" />
        <Text style={styles.verifiedText}>Verified</Text>
      </View>
    </TouchableOpacity>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 4,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoSquare: {
    width: 38,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  portal: { color: '#C9D2E3', fontSize: 12, marginTop: 1 },
  headerLight: { backgroundColor: '#FFFFFF' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  logoSquareLight: { borderWidth: 1, borderColor: '#E5E7EB' },
  bell: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  redDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: NAVY,
  },
  greenDot: { backgroundColor: '#22C55E' },
  dotLight: { borderColor: '#FFFFFF' },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F9',
    marginRight: 8,
  },
  backTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backRight: {
    minHeight: 34,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRightText: { fontSize: 14, fontWeight: '700', color: NAVY },
  backRightOff: { color: '#94A3B8' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#1B2744',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ref: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  unit: { flex: 1, fontSize: 12, color: '#64748B', fontWeight: '500' },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: '700' },
  lecturer: { marginTop: 10, fontSize: 15, fontWeight: '700', color: '#0F172A' },
  school: { marginTop: 2, fontSize: 12, color: '#64748B' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  locChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  locText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  boxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  boxText: { fontSize: 11, color: '#047857', fontWeight: '700' },
  bookletCount: { marginLeft: 'auto', fontSize: 12, color: '#64748B', fontWeight: '600' },
  moderation: { flex: 1, fontSize: 12, color: '#475569', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  outlineBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineText: { color: NAVY, fontWeight: '700', fontSize: 13 },
  fillBtn: {
    flex: 1.35,
    height: 42,
    borderRadius: 12,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  wideOutline: {
    marginTop: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  verifiedNote: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedNoteText: { color: '#15803D', fontSize: 12, fontWeight: '600' },
  booklet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  bookletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bookletBody: { flex: 1, marginRight: 8 },
  bookletTitle: { fontSize: 13, color: '#64748B' },
  bookletCode: { fontWeight: '800', color: '#0F172A' },
  scripts: { fontSize: 12, color: '#334155', marginTop: 2 },
  bookletMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  verifiedText: { color: '#15803D', fontSize: 11, fontWeight: '700' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
});
