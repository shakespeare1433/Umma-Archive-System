import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import {
  NotificationInbox,
  officerNoticeIcon,
  officerNoticeLabel,
  officerNoticeTone,
} from '../../components/NotificationCard';
import { clearNotifications, listNotifications } from '../../services/notificationService';
import { AppNotification, Booklet } from '../../types';
import { useVault } from '../../context/VaultContext';
import {
  findArchiveAtLocation,
  formatLocationCode,
  racksForSchoolFromDb,
  shelvesForSchoolFromDb,
} from '../../services/locationService';
import { updateArchiveLocation } from '../../services/archiveService';
import { friendlyBookletError, getBooklet } from '../../services/bookletService';
import { createNotification } from '../../services/notificationService';
import { formatPhysicalLocation, bookletHasPdf } from '../../constants/booklets';
import { InAppPdfModal } from '../../components/booklets/InAppPdfModal';
import { useAuth } from '../../context/AuthContext';
import { officerPalette, useTheme } from '../../context/ThemeContext';
import { BackBar, BookletRow, FieldLabel, RequestCard } from './pieces';
import {
  NAVY,
  useCustody,
} from './custody';

function useOfficerChrome() {
  const { theme } = useTheme();
  const palette = officerPalette(theme);
  return {
    palette,
    fill: { backgroundColor: palette.page } as const,
    page: { backgroundColor: palette.page } as const,
    card: { backgroundColor: palette.card, borderColor: palette.line } as const,
    ink: { color: palette.ink } as const,
    muted: { color: palette.muted } as const,
    field: {
      backgroundColor: palette.card,
      borderColor: palette.line,
      color: palette.ink,
    } as const,
  };
}

export const OfficerSearchScreen: React.FC<{
  initialQuery: string;
  onBack: () => void;
  onOpenRequest: (id: string) => void;
  onVerify: (id: string) => void;
  onRetrieve: (id: string) => void;
  onOpenBooklet: (id: string) => void;
}> = ({ initialQuery, onBack, onOpenRequest, onVerify, onRetrieve, onOpenBooklet }) => {
  const chrome = useOfficerChrome();
  const { requests, booklets } = useCustody();
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();

  const matchedRequests = useMemo(
    () =>
      requests.filter((item) => {
        if (!q) return true;
        return (
          item.ref.toLowerCase().includes(q) ||
          item.unitCode.toLowerCase().includes(q) ||
          item.unitTitle.toLowerCase().includes(q) ||
          item.lecturer.toLowerCase().includes(q) ||
          item.school.toLowerCase().includes(q)
        );
      }),
    [q, requests]
  );
  const matchedBooklets = useMemo(
    () =>
      booklets.filter((item) => {
        if (!q) return true;
        return (
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.box.toLowerCase().includes(q) ||
          item.shelf.toLowerCase().includes(q)
        );
      }),
    [booklets, q]
  );

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar title="Search custody" onBack={onBack} />
      <KeyboardScrollView contentContainerStyle={[styles.page, chrome.page]}>
        <TextInput
          style={[styles.input, chrome.field]}
          placeholder="Exam code, unit, lecturer, box"
          placeholderTextColor={chrome.palette.muted}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <Text style={[styles.group, chrome.ink]}>Requests ({matchedRequests.length})</Text>
        {matchedRequests.length === 0 ? (
          <Text style={[styles.empty, chrome.muted]}>No matching requests.</Text>
        ) : null}
        {matchedRequests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onOpen={() => onOpenRequest(request.id)}
            onVerify={() => onVerify(request.id)}
            onRetrieve={() => onRetrieve(request.id)}
          />
        ))}
        <Text style={[styles.group, chrome.ink]}>Archive ({matchedBooklets.length})</Text>
        {matchedBooklets.map((item) => (
          <BookletRow key={item.id} item={item} onPress={() => onOpenBooklet(item.id)} />
        ))}
      </KeyboardScrollView>
    </View>
  );
};

export const OfficerRequestDetailScreen: React.FC<{
  id: string;
  onBack: () => void;
  onVerify: () => void;
  onRetrieve: () => void;
}> = ({ id, onBack }) => {
  const chrome = useOfficerChrome();
  const { requests, respondToRequest } = useCustody();
  const request = requests.find((item) => item.id === id);
  const liveStatus = (() => {
    const raw = (request?.officerStatus || 'Pending').toLowerCase();
    if (raw === 'completed' || raw === 'fulfilled') return 'Completed' as const;
    if (raw === 'located' || raw.includes('ready')) return 'Located' as const;
    return 'Pending' as const;
  })();
  const [note, setNote] = useState(request?.officerNote || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  if (!request) {
    return (
      <View style={[styles.fill, chrome.fill]}>
        <BackBar title="Request Details" onBack={onBack} />
        <Text style={[styles.missing, chrome.muted]}>This request is no longer on the queue.</Text>
      </View>
    );
  }

  const kindLabel =
    request.requestKind === 'MISSING_PDF_INVESTIGATION'
      ? 'Missing PDF Investigation'
      : 'Physical Booklet Request';

  const statusCopy =
    liveStatus === 'Completed'
      ? 'Completed — Booklet handed over'
      : liveStatus === 'Located'
        ? 'Located — Ready for the lecturer'
        : 'Pending — Awaiting officer response';

  const statusColors =
    liveStatus === 'Completed'
      ? { badgeBg: '#14532D', badgeText: '#BBF7D0', boxBg: '#DCFCE7', boxText: '#166534' }
      : liveStatus === 'Located'
        ? { badgeBg: '#1E3A8A', badgeText: '#BFDBFE', boxBg: '#DBEAFE', boxText: '#1E3A8A' }
        : { badgeBg: '#92400E', badgeText: '#FEF3C7', boxBg: '#FEF3C7', boxText: '#92400E' };

  const save = async (nextStatus: 'Located' | 'Completed') => {
    setSaving(true);
    setError('');
    setFlash('');
    try {
      const result = await respondToRequest(request.id, {
        officerStatus: nextStatus,
        officerNote: note,
        shelfLocation: request.shelf || '',
        rack: request.rack || '',
        box: request.box || '',
        position: request.position || '',
      });
      setFlash(
        result.notified
          ? nextStatus === 'Located'
            ? 'Location confirmed. Lecturer received feedback immediately.'
            : 'Marked completed. Lecturer received feedback immediately.'
          : nextStatus === 'Located'
            ? 'Location confirmed, but the lecturer notification failed.'
            : 'Marked completed, but the lecturer notification failed.'
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the response.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar title="Request Details" onBack={onBack} />
      <KeyboardScrollView contentContainerStyle={detailStyles.page}>
        <View style={detailStyles.hero}>
          <View style={detailStyles.heroCopy}>
            <Text style={detailStyles.heroTitle}>{kindLabel}</Text>
            <Text style={detailStyles.heroSub}>Request from Lecturer</Text>
          </View>
          <View style={[detailStyles.badge, { backgroundColor: statusColors.badgeBg }]}>
            <Text style={[detailStyles.badgeText, { color: statusColors.badgeText }]}>{liveStatus}</Text>
          </View>
        </View>

        <View style={detailStyles.steps}>
          <StepDot label="1. Pending" active={liveStatus === 'Pending'} done={liveStatus !== 'Pending'} />
          <View style={detailStyles.stepLine} />
          <StepDot label="2. Located" active={liveStatus === 'Located'} done={liveStatus === 'Completed'} />
          <View style={detailStyles.stepLine} />
          <StepDot label="3. Completed" active={liveStatus === 'Completed'} done={liveStatus === 'Completed'} />
        </View>

        <DetailBlock title="Lecturer Information" palette={chrome.palette}>
          <DetailRow label="Name" value={request.lecturer} palette={chrome.palette} />
          <DetailRow
            label="Reg Number"
            value={request.registrationNo || request.studentName || 'Not recorded'}
            palette={chrome.palette}
          />
        </DetailBlock>

        <DetailBlock title="Examination Details" palette={chrome.palette}>
          <DetailRow label="School" value={request.school || 'Not recorded'} palette={chrome.palette} />
          <DetailRow label="Programme" value={request.programme || 'Not recorded'} palette={chrome.palette} />
          <DetailRow label="Session" value={request.session || 'Not recorded'} palette={chrome.palette} />
          <DetailRow label="Unit Code" value={request.unitCode} palette={chrome.palette} />
          <DetailRow label="Unit Name" value={request.unitTitle} palette={chrome.palette} />
        </DetailBlock>

        <DetailBlock title="Reason for Request" palette={chrome.palette}>
          <Text style={[detailStyles.reason, chrome.ink]}>
            {request.lecturerNote?.trim() || 'No reason was provided with this request.'}
          </Text>
          <Text style={[detailStyles.when, chrome.muted]}>{new Date(request.createdAt).toLocaleString()}</Text>
        </DetailBlock>

        <View style={[detailStyles.statusBox, { backgroundColor: statusColors.boxBg }]}>
          <Feather
            name={liveStatus === 'Pending' ? 'clock' : liveStatus === 'Located' ? 'map-pin' : 'check-circle'}
            size={16}
            color={statusColors.boxText}
          />
          <Text style={[detailStyles.statusText, { color: statusColors.boxText }]}>{statusCopy}</Text>
        </View>

        {liveStatus !== 'Completed' ? (
          <View style={[detailStyles.actionCard, chrome.card]}>
            <View style={detailStyles.actionHead}>
              <MaterialCommunityIcons name="message-text-outline" size={22} color={chrome.palette.ink} />
              <Text style={[detailStyles.actionTitle, chrome.ink]}>Feedback to lecturer</Text>
            </View>
            <Text style={[detailStyles.actionBody, chrome.muted]}>
              Optional note. It is sent to the lecturer as soon as you confirm location or mark completed.
            </Text>
            <TextInput
              style={[detailStyles.feedbackInput, chrome.field]}
              value={note}
              onChangeText={setNote}
              placeholder="Enter your feedback (optional)…"
              placeholderTextColor={chrome.palette.muted}
              multiline
            />

            {liveStatus === 'Pending' ? (
              <>
                <Text style={[detailStyles.actionBody, chrome.muted]}>
                  Step 1 — Confirm the booklet has been located in the store. The lecturer is notified immediately.
                </Text>
                <TouchableOpacity
                  style={detailStyles.primaryBtn}
                  disabled={saving}
                  onPress={() => void save('Located')}
                  activeOpacity={0.85}
                >
                  <Feather name="map-pin" size={18} color="#FFFFFF" />
                  <Text style={detailStyles.primaryBtnText}>
                    {saving ? 'Notifying lecturer…' : 'Confirm Location'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[detailStyles.actionBody, chrome.muted]}>
                  Step 2 — Mark completed when the booklet is ready / handed over. The lecturer is notified immediately.
                </Text>
                <TouchableOpacity
                  style={detailStyles.primaryBtn}
                  disabled={saving}
                  onPress={() => void save('Completed')}
                  activeOpacity={0.85}
                >
                  <Feather name="check-circle" size={18} color="#FFFFFF" />
                  <Text style={detailStyles.primaryBtnText}>
                    {saving ? 'Notifying lecturer…' : 'Mark Completed'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={[detailStyles.actionCard, chrome.card]}>
            <Text style={[detailStyles.actionBody, chrome.muted]}>
              This request is completed. The lecturer already received the final update.
            </Text>
            {request.officerNote ? (
              <Text style={[detailStyles.reason, chrome.ink]}>Officer note: {request.officerNote}</Text>
            ) : null}
          </View>
        )}

        {flash ? <Text style={detailStyles.flash}>{flash}</Text> : null}
        {error ? <Text style={detailStyles.error}>{error}</Text> : null}

        <TouchableOpacity style={detailStyles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Feather name="arrow-left" size={16} color={chrome.palette.ink} />
          <Text style={[detailStyles.backBtnText, chrome.ink]}>Back</Text>
        </TouchableOpacity>
      </KeyboardScrollView>
    </View>
  );
};

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <View style={detailStyles.stepItem}>
      <View
        style={[
          detailStyles.stepDot,
          (active || done) && detailStyles.stepDotOn,
          done && !active && detailStyles.stepDotDone,
        ]}
      />
      <Text style={[detailStyles.stepLabel, (active || done) && detailStyles.stepLabelOn]}>{label}</Text>
    </View>
  );
}

function DetailBlock({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: ReturnType<typeof officerPalette>;
}) {
  return (
    <View style={[detailStyles.block, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Text style={[detailStyles.blockTitle, { color: palette.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof officerPalette>;
}) {
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.rowLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[detailStyles.rowValue, { color: palette.ink }]}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  stage: { backgroundColor: '#DCE3EF' },
  page: { padding: 16, paddingBottom: 28, gap: 12 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#0B1F4D',
    borderRadius: 16,
    padding: 14,
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { marginTop: 3, fontSize: 12, fontWeight: '600', color: '#93C5FD' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1F4D',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#64748B',
  },
  stepDotOn: { backgroundColor: '#60A5FA' },
  stepDotDone: { backgroundColor: '#34D399' },
  stepLine: { width: 18, height: 2, backgroundColor: '#475569', marginBottom: 18 },
  stepLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },
  stepLabelOn: { color: '#E2E8F0' },
  block: {
    backgroundColor: '#E8EEF8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B8C7DE',
  },
  blockTitle: { fontSize: 13, fontWeight: '800', color: '#00236F', marginBottom: 10 },
  row: { marginBottom: 8 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 2 },
  rowValue: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  reason: { fontSize: 13, fontWeight: '600', color: '#1E293B', lineHeight: 19 },
  when: { marginTop: 8, fontSize: 11, fontWeight: '600', color: '#64748B' },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statusText: { flex: 1, fontSize: 12, fontWeight: '800' },
  actionCard: {
    backgroundColor: '#F1F5FB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B8C7DE',
  },
  actionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  actionTitle: { fontSize: 14, fontWeight: '800', color: '#00236F' },
  actionBody: { fontSize: 12, fontWeight: '600', color: '#334155', lineHeight: 18, marginBottom: 12 },
  feedbackInput: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
  },
  primaryBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#00236F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  flash: { color: '#166534', fontWeight: '700', fontSize: 12 },
  error: { color: '#B91C1C', fontWeight: '700', fontSize: 12 },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backBtnText: { color: '#00236F', fontWeight: '800', fontSize: 14 },
});

export const OfficerVerifyScreen: React.FC<{
  id: string;
  onBack: () => void;
  onDone: () => void;
}> = ({ id, onBack, onDone }) => {
  const chrome = useOfficerChrome();
  const { requests, verifyRequest } = useCustody();
  const request = requests.find((item) => item.id === id);
  const [checks, setChecks] = useState([false, false, false]);

  if (!request) {
    return (
      <View style={[styles.fill, chrome.fill]}>
        <BackBar title="Verify Custody" onBack={onBack} />
        <Text style={[styles.missing, chrome.muted]}>Request not found.</Text>
      </View>
    );
  }

  const items = [
    `Location confirmed${request.shelf ? `: ${request.shelf} ${request.rack || ''}` : ''}`,
    `Box seal checked${request.box ? `: ${request.box}` : ''}`,
    `${request.booklets} booklets counted`,
  ];
  const ready = checks.every(Boolean);

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar title="Verify Custody" onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.page, chrome.page]}>
        <Text style={[styles.title, chrome.ink]}>{request.ref}</Text>
        <Text style={[styles.sub, chrome.muted]}>
          {request.unitCode} • {request.unitTitle} — {request.lecturer}
        </Text>
        {items.map((label, index) => (
          <TouchableOpacity
            key={label}
            style={[styles.checkRow, chrome.card]}
            activeOpacity={0.8}
            onPress={() =>
              setChecks((current) => current.map((value, i) => (i === index ? !value : value)))
            }
          >
            <View style={[styles.box, checks[index] && styles.boxOn]}>
              {checks[index] ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
            </View>
            <Text style={[styles.checkLabel, chrome.ink]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.primary, !ready && styles.disabled]}
          disabled={!ready}
          onPress={() => {
            verifyRequest(request.id);
            onDone();
          }}
        >
          <Text style={styles.primaryText}>Confirm custody</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const STEPS = ['Request received', 'Locate in vault', 'Stage booklets', 'Ready for dispatch'];

export const OfficerRetrievalScreen: React.FC<{
  id: string;
  onBack: () => void;
  onDone: () => void;
}> = ({ id, onBack, onDone }) => {
  const chrome = useOfficerChrome();
  const { requests, startRetrieval } = useCustody();
  const request = requests.find((item) => item.id === id);
  const [step, setStep] = useState(0);

  if (!request) {
    return (
      <View style={[styles.fill, chrome.fill]}>
        <BackBar title="Vault Retrieval" onBack={onBack} />
        <Text style={[styles.missing, chrome.muted]}>Request not found.</Text>
      </View>
    );
  }

  const finished = step >= STEPS.length;

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar title="Vault Retrieval" onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.page, chrome.page]}>
        <Text style={[styles.title, chrome.ink]}>{request.ref}</Text>
        <Text style={[styles.sub, chrome.muted]}>
          {request.moderationLabel || `${request.unitCode} • ${request.unitTitle}`} · {request.booklets} booklets
        </Text>
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <View key={label} style={[styles.step, chrome.card]}>
              <View style={[styles.stepDot, (done || current) && styles.stepDotOn]}>
                <Text style={[styles.stepNum, !(done || current) && styles.stepNumIdle]}>
                  {done ? '✓' : index + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, chrome.ink, current && styles.stepCurrent]}>{label}</Text>
            </View>
          );
        })}
        <TouchableOpacity
          style={styles.primary}
          onPress={() => {
            if (!finished) {
              setStep((value) => value + 1);
              return;
            }
            startRetrieval(request.id);
            onDone();
          }}
        >
          <Text style={styles.primaryText}>{finished ? 'Mark retrieval in progress' : 'Complete this step'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export const OfficerLogBatchScreen: React.FC<{
  onBack: () => void;
  onDone: () => void;
}> = ({ onBack, onDone }) => {
  const chrome = useOfficerChrome();
  const { logBatch } = useCustody();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [scripts, setScripts] = useState('');
  const [box, setBox] = useState('');
  const [shelf, setShelf] = useState('');

  const save = () => {
    const count = Number(scripts);
    if (!code.trim() || !title.trim() || !box.trim() || !shelf.trim() || !Number.isFinite(count) || count <= 0) {
      Alert.alert('Missing details', 'Enter the exam code, title, script count, box, and shelf.');
      return;
    }
    logBatch({
      code: code.trim(),
      title: title.trim(),
      scripts: count,
      box: box.trim(),
      shelf: shelf.trim(),
    });
    onDone();
  };

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar title="Log New Batch" onBack={onBack} />
      <KeyboardScrollView contentContainerStyle={[styles.page, chrome.page]}>
        <FieldLabel>Exam code</FieldLabel>
        <TextInput
          style={[styles.input, chrome.field]}
          value={code}
          onChangeText={setCode}
          placeholder="e.g. BIT 411"
          placeholderTextColor={chrome.palette.muted}
        />
        <FieldLabel>Unit title</FieldLabel>
        <TextInput
          style={[styles.input, chrome.field]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Distributed Systems"
          placeholderTextColor={chrome.palette.muted}
        />
        <FieldLabel>Script count</FieldLabel>
        <TextInput
          style={[styles.input, chrome.field]}
          value={scripts}
          onChangeText={setScripts}
          placeholder="84"
          placeholderTextColor={chrome.palette.muted}
          keyboardType="number-pad"
        />
        <FieldLabel>Box</FieldLabel>
        <TextInput
          style={[styles.input, chrome.field]}
          value={box}
          onChangeText={setBox}
          placeholder="Box B-14"
          placeholderTextColor={chrome.palette.muted}
        />
        <FieldLabel>Shelf</FieldLabel>
        <TextInput
          style={[styles.input, chrome.field]}
          value={shelf}
          onChangeText={setShelf}
          placeholder="Shelf 03"
          placeholderTextColor={chrome.palette.muted}
        />
        <TouchableOpacity style={styles.primary} onPress={save}>
          <Text style={styles.primaryText}>Save batch</Text>
        </TouchableOpacity>
      </KeyboardScrollView>
    </View>
  );
};

export const OfficerLocationScreen: React.FC<{
  bookletId?: string;
  archiveId?: string;
  onBack: () => void;
  onDone: () => void;
}> = ({ bookletId, archiveId, onBack, onDone }) => {
  const chrome = useOfficerChrome();
  const { user } = useAuth();
  const { records, updateRecord, rememberArchives } = useVault();
  const focused = Boolean(archiveId || bookletId);
  const [selected, setSelected] = useState(archiveId || '');
  const [school, setSchool] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [resolving, setResolving] = useState(Boolean(archiveId || bookletId));
  const [saving, setSaving] = useState(false);
  const current = records.find((item) => item.id === selected);
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [box, setBox] = useState('');
  const [position, setPosition] = useState('');
  const [rackChoices, setRackChoices] = useState<string[]>([]);
  const [shelfChoices, setShelfChoices] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const resolveTarget = async () => {
      if (!archiveId && !bookletId) {
        const first = records[0];
        if (first && !selected) {
          setSelected(first.id);
          setSchool(first.faculty || '');
          setUnitLabel(`${first.courseCode} · ${first.courseName}`);
          setRack(first.rack || '');
          setShelf(first.shelf || '');
          setBox(first.box || '');
          setPosition(first.pos || '');
        }
        setResolving(false);
        return;
      }

      setResolving(true);
      try {
        let nextArchiveId = archiveId || '';
        let nextSchool = '';
        let nextLabel = '';
        let nextRack = '';
        let nextShelf = '';
        let nextBox = '';
        let nextPos = '';

        if (bookletId) {
          const booklet = await getBooklet(bookletId);
          if (!booklet?.archiveId) {
            if (!cancelled) {
              Alert.alert(
                'No archive link',
                'This upload is not linked to a physical archive record yet, so its location cannot be updated.'
              );
              setResolving(false);
            }
            return;
          }
          nextArchiveId = booklet.archiveId;
          nextSchool = booklet.school || '';
          nextLabel = `${booklet.unitCode} · ${booklet.unitName}`;
          nextRack = booklet.rack || '';
          nextShelf = booklet.shelf || '';
          nextBox = booklet.box || '';
          nextPos = booklet.position || '';
        }

        const existing = records.find((row) => row.id === nextArchiveId);
        if (existing) {
          nextSchool = existing.faculty || nextSchool;
          nextLabel = `${existing.courseCode} · ${existing.courseName}`;
          nextRack = existing.rack || nextRack;
          nextShelf = existing.shelf || nextShelf;
          nextBox = existing.box || nextBox;
          nextPos = existing.pos || nextPos;
        }

        if (!cancelled) {
          setSelected(nextArchiveId);
          setSchool(nextSchool);
          setUnitLabel(nextLabel);
          setRack(nextRack);
          setShelf(nextShelf);
          setBox(nextBox);
          setPosition(nextPos);
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert(
            'Could not open location',
            error instanceof Error ? error.message : 'The archive record could not be loaded.'
          );
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    };
    void resolveTarget();
    return () => {
      cancelled = true;
    };
    // Resolve once for the focused booklet/archive; list mode still reacts to empty selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveId, bookletId]);

  useEffect(() => {
    const faculty = school || current?.faculty || '';
    if (!faculty) {
      setRackChoices([]);
      setShelfChoices([]);
      return;
    }
    void racksForSchoolFromDb(faculty).then(setRackChoices);
    void shelvesForSchoolFromDb(faculty).then(setShelfChoices);
  }, [school, current?.faculty]);

  const choose = (id: string) => {
    const item = records.find((row) => row.id === id);
    setSelected(id);
    setSchool(item?.faculty || '');
    setUnitLabel(item ? `${item.courseCode} · ${item.courseName}` : '');
    setRack(item?.rack || '');
    setShelf(item?.shelf || '');
    setBox(item?.box || '');
    setPosition(item?.pos || '');
  };

  const save = async () => {
    if (!selected || !rack.trim() || !shelf.trim() || !box.trim() || !position.trim()) {
      Alert.alert('Missing location', 'Enter rack, shelf, box and position.');
      return;
    }
    const occupied = await findArchiveAtLocation({
      shelf: shelf.trim(),
      rack: rack.trim(),
      box: box.trim(),
      position: position.trim(),
      excludeId: selected,
    });
    const apply = async () => {
      setSaving(true);
      try {
        const item = records.find((row) => row.id === selected);
        if (item) {
          await updateRecord({
            ...item,
            shelf: shelf.trim(),
            rack: rack.trim(),
            box: box.trim(),
            pos: position.trim(),
          });
        } else {
          await updateArchiveLocation(selected, {
            shelf: shelf.trim(),
            rack: rack.trim(),
            box: box.trim(),
            position: position.trim(),
          });
          rememberArchives([
            {
              id: selected,
              faculty: school,
              programme: '',
              session: '',
              courseCode: unitLabel.split(' · ')[0] || '',
              courseName: unitLabel.split(' · ').slice(1).join(' · ') || unitLabel,
              studentName: '',
              admissionNumber: '',
              bundleId: '',
              scriptCount: 0,
              shelf: shelf.trim(),
              rack: rack.trim(),
              box: box.trim(),
              pos: position.trim(),
              status: 'Digitized Copy',
              vaultStatus: 'Verified in Vault',
              custodyStatus: 'On shelf',
              lastVerifiedAt: null,
              isRequested: false,
              archivedAt: new Date().toISOString(),
            },
          ]);
        }
        const savedLocationCode = formatLocationCode({
          shelf: shelf.trim(),
          rack: rack.trim(),
          box: box.trim(),
          position: position.trim(),
        });
        await createNotification({
          audience: 'admin',
          title: 'Vault location updated',
          body: `${user?.name || 'Examination Officer'} updated ${unitLabel || 'a booklet'} to ${savedLocationCode}.`,
          skipAdminMirror: true,
        });
        onDone();
      } catch (error) {
        Alert.alert(
          'Location not saved',
          error instanceof Error ? error.message : 'The archive location could not be updated.'
        );
      } finally {
        setSaving(false);
      }
    };
    if (occupied) {
      Alert.alert(
        'Location already used',
        `Already used by ${occupied.unitCode} · ${occupied.unitName}. Save anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save anyway', onPress: () => void apply() },
        ]
      );
      return;
    }
    await apply();
  };

  const code = formatLocationCode({
    shelf: shelf || 'X',
    rack: rack || '0',
    box: box || '0',
    position: position || '0',
  });

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar title="Update Location" onBack={onBack} />
      <KeyboardScrollView contentContainerStyle={[styles.page, chrome.page]}>
        {resolving ? (
          <ActivityIndicator color={NAVY} style={{ marginTop: 24 }} />
        ) : (
          <>
            <Text style={[styles.sub, chrome.muted]}>
              {focused
                ? 'Update the physical vault location for this uploaded booklet.'
                : 'Choose an archive batch, then set rack · shelf · box · position.'}
            </Text>
            {unitLabel ? (
              <Text style={[styles.sub, { fontWeight: '800', color: chrome.palette.ink }]}>{unitLabel}</Text>
            ) : null}
            <Text style={[styles.sub, { fontWeight: '800', color: chrome.palette.ink }]}>Code: {code}</Text>
            {!focused
              ? records.map((item) => {
                  const on = item.id === selected;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pick, chrome.card, on && styles.pickOn]}
                      onPress={() => choose(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pickTitle, chrome.ink]}>
                        {item.courseCode} · {item.courseName}
                      </Text>
                      <Text style={[styles.pickMeta, chrome.muted]}>
                        {item.rack} · {item.shelf} · {item.box} · {item.pos}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              : null}
            <FieldLabel>Rack</FieldLabel>
            {rackChoices.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {rackChoices.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.pick, chrome.card, rack === option && styles.pickOn, { marginRight: 8 }]}
                    onPress={() => setRack(option)}
                  >
                    <Text style={[styles.pickTitle, chrome.ink]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <TextInput
                style={[styles.input, chrome.field]}
                value={rack}
                onChangeText={setRack}
                placeholder="Rack A"
                placeholderTextColor={chrome.palette.muted}
              />
            )}
            <FieldLabel>Shelf</FieldLabel>
            {shelfChoices.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {shelfChoices.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.pick, chrome.card, shelf === option && styles.pickOn, { marginRight: 8 }]}
                    onPress={() => setShelf(option)}
                  >
                    <Text style={[styles.pickTitle, chrome.ink]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <TextInput
                style={[styles.input, chrome.field]}
                value={shelf}
                onChangeText={setShelf}
                placeholder="Shelf 1"
                placeholderTextColor={chrome.palette.muted}
              />
            )}
            <FieldLabel>Box number</FieldLabel>
            <TextInput
              style={[styles.input, chrome.field]}
              value={box}
              onChangeText={setBox}
              placeholder="05"
              placeholderTextColor={chrome.palette.muted}
            />
            <FieldLabel>Position of bundle</FieldLabel>
            <TextInput
              style={[styles.input, chrome.field]}
              value={position}
              onChangeText={setPosition}
              placeholder="3"
              placeholderTextColor={chrome.palette.muted}
            />
            <TouchableOpacity
              style={[styles.primary, saving && styles.disabled]}
              disabled={saving}
              onPress={() => void save()}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Save location</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </KeyboardScrollView>
    </View>
  );
};

export const OfficerBookletScreen: React.FC<{
  id: string;
  onBack: () => void;
  onUpdateLocation: () => void;
}> = ({ id, onBack, onUpdateLocation }) => {
  const chrome = useOfficerChrome();
  const [item, setItem] = useState<Booklet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getBooklet(id)
      .then((row) => {
        if (cancelled) return;
        setItem(row);
        if (!row) setError('Booklet not found.');
      })
      .catch((caught) => {
        if (cancelled) return;
        setItem(null);
        setError(friendlyBookletError(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.fill, chrome.fill]}>
        <BackBar title="Booklet" onBack={onBack} />
        <ActivityIndicator color={NAVY} style={{ marginTop: 32 }} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.fill, chrome.fill]}>
        <BackBar title="Booklet" onBack={onBack} />
        <Text style={[styles.missing, chrome.muted]}>{error || 'Booklet not found.'}</Text>
      </View>
    );
  }

  const location = formatPhysicalLocation(item);
  const canUpdateLocation = Boolean(item.archiveId);

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar title={item.unitCode || 'Booklet'} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.page, chrome.page]}>
        <View style={[styles.panel, chrome.card]}>
          <Text style={[styles.panelTitle, chrome.ink]}>{item.unitName || item.unitCode}</Text>
          <Row label="Student" value={item.studentName || 'Not recorded'} palette={chrome.palette} />
          <Row label="Registration" value={item.registrationNo || 'Not recorded'} palette={chrome.palette} />
          <Row label="School" value={item.school || 'Not recorded'} palette={chrome.palette} />
          <Row label="Programme" value={item.programme || 'Not recorded'} palette={chrome.palette} />
          <Row label="Session" value={item.academicSession || 'Not recorded'} palette={chrome.palette} />
          <Row label="Location" value={location} palette={chrome.palette} />
          <Row
            label="PDF"
            value={bookletHasPdf(item) ? 'Attached' : 'Missing'}
            palette={chrome.palette}
          />
        </View>
        {bookletHasPdf(item) ? (
          <TouchableOpacity style={styles.primary} onPress={() => setPdfOpen(true)}>
            <Feather name="eye" size={16} color="#FFFFFF" />
            <Text style={styles.primaryText}>View PDF</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.secondary, !canUpdateLocation && styles.disabled]}
          disabled={!canUpdateLocation}
          onPress={onUpdateLocation}
        >
          <Text style={styles.secondaryText}>Update Location</Text>
        </TouchableOpacity>
        {!canUpdateLocation ? (
          <Text style={[styles.sub, chrome.muted]}>
            This upload is not linked to a physical archive record yet.
          </Text>
        ) : null}
      </ScrollView>
      <InAppPdfModal visible={pdfOpen} booklet={item} onClose={() => setPdfOpen(false)} />
    </View>
  );
};

export const OfficerNotificationsScreen: React.FC<{
  onBack: () => void;
  onOpenRequests: () => void;
  onOpenRequest: (id: string) => void;
  onVerify: (id: string) => void;
  onArchive: () => void;
}> = ({ onBack, onOpenRequest, onOpenRequests }) => {
  const chrome = useOfficerChrome();
  const [notes, setNotes] = useState<AppNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    listNotifications()
      .then((rows) => {
        if (!cancelled) setNotes(rows);
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClear = () => {
    if (notes.length === 0) return;
    Alert.alert('Clear notifications', 'Remove all notifications from this list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const ids = notes.map((note) => note.id);
          setNotes([]);
          try {
            await clearNotifications(ids);
          } catch {
            listNotifications()
              .then(setNotes)
              .catch(() => setNotes([]));
          }
        },
      },
    ]);
  };

  const openNote = (note: AppNotification) => {
    const label = officerNoticeLabel(note.title, note.body);
    const isRequestNotice =
      Boolean(note.requestId) ||
      label === 'Request' ||
      /request|booklet|investigation/i.test(`${note.title} ${note.body}`);

    if (note.requestId && isRequestNotice) {
      onOpenRequest(note.requestId);
      return;
    }
    if (isRequestNotice) {
      onOpenRequests();
    }
  };

  return (
    <View style={[styles.fill, chrome.fill]}>
      <BackBar
        title="Notifications"
        onBack={onBack}
        rightLabel="Clear"
        onRight={handleClear}
        rightDisabled={notes.length === 0}
      />
      <NotificationInbox
        notes={notes}
        empty="New lecturer requests and status changes will appear here."
        statusOf={(note) => ({
          label: officerNoticeLabel(note.title, note.body),
          tone: officerNoticeTone(note.title, note.body),
          icon: officerNoticeIcon(note.title, note.body),
        })}
        onPressNote={openNote}
      />
    </View>
  );
};

function Row({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof officerPalette>;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: palette.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F4F6F9' },
  page: { padding: 16, paddingBottom: 28, backgroundColor: '#F4F6F9' },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  sub: { marginTop: 4, marginBottom: 12, fontSize: 13, color: '#64748B' },
  chips: { gap: 8, paddingBottom: 14 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipOn: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipTextOn: { color: '#FFFFFF' },
  empty: { color: '#64748B', marginBottom: 12 },
  missing: { padding: 16, color: '#64748B' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    color: '#0F172A',
    marginBottom: 4,
  },
  group: { marginTop: 8, marginBottom: 10, fontSize: 14, fontWeight: '800', color: '#0F172A' },
  primary: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.45 },
  secondary: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryText: { color: NAVY, fontWeight: '700' },
  danger: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  dangerText: { color: '#DC2626', fontWeight: '700' },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginBottom: 12,
  },
  kicker: { color: NAVY, fontWeight: '800', fontSize: 12 },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rowLabel: { color: '#64748B', fontSize: 13 },
  rowValue: { flex: 1, textAlign: 'right', color: '#0F172A', fontWeight: '700', fontSize: 13 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: NAVY, borderColor: NAVY },
  checkLabel: { flex: 1, color: '#0F172A', fontWeight: '600' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotOn: { backgroundColor: NAVY },
  stepNum: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  stepNumIdle: { color: '#475569' },
  stepLabel: { fontSize: 15, color: '#475569', fontWeight: '600' },
  stepCurrent: { color: '#0F172A' },
  pick: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickOn: { borderColor: NAVY },
  pickTitle: { fontWeight: '700', color: '#0F172A' },
  pickMeta: { marginTop: 2, color: '#64748B', fontSize: 12 },
  officerCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  officerName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  officerRole: { color: '#C9D2E3', marginTop: 4 },
});
