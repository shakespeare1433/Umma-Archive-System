import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  NotificationInbox,
  officerNoticeIcon,
  officerNoticeLabel,
  officerNoticeTone,
} from '../../components/NotificationCard';
import { clearNotifications, listNotifications } from '../../services/notificationService';
import { AppNotification } from '../../types';
import { BackBar, BookletRow, FieldLabel, RequestCard } from './pieces';
import {
  ArchivedBooklet,
  NAVY,
  useCustody,
} from './custody';

export const OfficerSearchScreen: React.FC<{
  initialQuery: string;
  onBack: () => void;
  onOpenRequest: (id: string) => void;
  onVerify: (id: string) => void;
  onRetrieve: (id: string) => void;
  onOpenBooklet: (id: string) => void;
}> = ({ initialQuery, onBack, onOpenRequest, onVerify, onRetrieve, onOpenBooklet }) => {
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
    <View style={styles.fill}>
      <BackBar title="Search custody" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.input}
          placeholder="Exam code, unit, lecturer, box"
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <Text style={styles.group}>Requests ({matchedRequests.length})</Text>
        {matchedRequests.length === 0 ? <Text style={styles.empty}>No matching requests.</Text> : null}
        {matchedRequests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onOpen={() => onOpenRequest(request.id)}
            onVerify={() => onVerify(request.id)}
            onRetrieve={() => onRetrieve(request.id)}
          />
        ))}
        <Text style={styles.group}>Archive ({matchedBooklets.length})</Text>
        {matchedBooklets.map((item) => (
          <BookletRow key={item.id} item={item} onPress={() => onOpenBooklet(item.id)} />
        ))}
      </ScrollView>
    </View>
  );
};

export const OfficerRequestDetailScreen: React.FC<{
  id: string;
  onBack: () => void;
  onVerify: () => void;
  onRetrieve: () => void;
}> = ({ id, onBack, onVerify, onRetrieve }) => {
  const { requests, respondToRequest } = useCustody();
  const request = requests.find((item) => item.id === id);
  const [status, setStatus] = useState(request?.officerStatus || 'Pending');
  const [note, setNote] = useState(request?.officerNote || '');
  const [shelf, setShelf] = useState(request?.shelf || '');
  const [rack, setRack] = useState(request?.rack || '');
  const [box, setBox] = useState(request?.box || '');
  const [position, setPosition] = useState(request?.position || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!request) {
    return (
      <View style={styles.fill}>
        <BackBar title="Request" onBack={onBack} />
        <Text style={styles.missing}>This request is no longer on the queue.</Text>
      </View>
    );
  }

  const kindLabel =
    request.requestKind === 'MISSING_PDF_INVESTIGATION'
      ? 'Missing PDF investigation'
      : 'Physical booklet request';

  return (
    <View style={styles.fill}>
      <BackBar title={request.ref} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <Text style={styles.kicker}>{request.unitCode}</Text>
          <Text style={styles.panelTitle}>{request.unitTitle}</Text>
          <Row label="Request type" value={kindLabel} />
          <Row label="Lecturer" value={request.lecturer} />
          <Row label="Student" value={request.studentName || 'Not recorded'} />
          <Row label="Registration" value={request.registrationNo || 'Not recorded'} />
          <Row label="School" value={request.school || 'Not recorded'} />
          <Row label="Programme" value={request.programme || 'Not recorded'} />
          <Row label="Academic Session" value={request.session || 'Not recorded'} />
          <Row label="Unit" value={`${request.unitCode} · ${request.unitTitle}`} />
          <Row label="Requested" value={new Date(request.createdAt).toLocaleString()} />
          <Row label="Status" value={request.officerStatus || request.status} />
          {request.lecturerNote ? <Row label="Lecturer reason" value={request.lecturerNote} /> : null}
          {request.shelf ? <Row label="Shelf on record" value={request.shelf} /> : null}
          {request.rack ? <Row label="Rack on record" value={request.rack} /> : null}
          {request.box ? <Row label="Box on record" value={request.box} /> : null}
          {request.position ? <Row label="Position on record" value={request.position} /> : null}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Physical location feedback</Text>
          <Text style={styles.sub}>
            Locate the original physical booklet and send the exact storage details to the lecturer.
            Locating the booklet does not mark it as collected.
          </Text>
          {['Pending', 'Received', 'Located', 'Ready for Collection', 'Not Located', 'Fulfilled'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.pick, status === option && styles.pickOn]}
              onPress={() => setStatus(option)}
            >
              <Text style={styles.pickTitle}>{option}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.input}
            value={shelf}
            onChangeText={setShelf}
            placeholder="Shelf"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            style={styles.input}
            value={rack}
            onChangeText={setRack}
            placeholder="Rack"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            style={styles.input}
            value={box}
            onChangeText={setBox}
            placeholder="Box"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            style={styles.input}
            value={position}
            onChangeText={setPosition}
            placeholder="Position"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder="Feedback or collection instructions for the lecturer"
            placeholderTextColor="#94A3B8"
            multiline
          />
          {error ? <Text style={styles.empty}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.primary}
            disabled={saving}
            onPress={() => {
              setSaving(true);
              setError('');
              void respondToRequest(request.id, {
                officerStatus: status,
                officerNote: note,
                shelfLocation: shelf,
                rack,
                box,
                position,
              })
                .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not save the response.'))
                .finally(() => setSaving(false));
            }}
          >
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Send feedback to lecturer'}</Text>
          </TouchableOpacity>
        </View>
        {request.status === 'In Progress' ? (
          <TouchableOpacity style={styles.secondary} onPress={onVerify}>
            <Text style={styles.secondaryText}>Verify Custody</Text>
          </TouchableOpacity>
        ) : null}
        {request.status === 'Pending Review' ? (
          <TouchableOpacity style={styles.secondary} onPress={onRetrieve}>
            <Text style={styles.secondaryText}>Begin Vault Retrieval</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
};

export const OfficerVerifyScreen: React.FC<{
  id: string;
  onBack: () => void;
  onDone: () => void;
}> = ({ id, onBack, onDone }) => {
  const { requests, verifyRequest } = useCustody();
  const request = requests.find((item) => item.id === id);
  const [checks, setChecks] = useState([false, false, false]);

  if (!request) {
    return (
      <View style={styles.fill}>
        <BackBar title="Verify Custody" onBack={onBack} />
        <Text style={styles.missing}>Request not found.</Text>
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
    <View style={styles.fill}>
      <BackBar title="Verify Custody" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>{request.ref}</Text>
        <Text style={styles.sub}>
          {request.unitCode} • {request.unitTitle} — {request.lecturer}
        </Text>
        {items.map((label, index) => (
          <TouchableOpacity
            key={label}
            style={styles.checkRow}
            activeOpacity={0.8}
            onPress={() =>
              setChecks((current) => current.map((value, i) => (i === index ? !value : value)))
            }
          >
            <View style={[styles.box, checks[index] && styles.boxOn]}>
              {checks[index] ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.checkLabel}>{label}</Text>
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
  const { requests, startRetrieval } = useCustody();
  const request = requests.find((item) => item.id === id);
  const [step, setStep] = useState(0);

  if (!request) {
    return (
      <View style={styles.fill}>
        <BackBar title="Vault Retrieval" onBack={onBack} />
        <Text style={styles.missing}>Request not found.</Text>
      </View>
    );
  }

  const finished = step >= STEPS.length;

  return (
    <View style={styles.fill}>
      <BackBar title="Vault Retrieval" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>{request.ref}</Text>
        <Text style={styles.sub}>
          {request.moderationLabel || `${request.unitCode} • ${request.unitTitle}`} · {request.booklets} booklets
        </Text>
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <View key={label} style={styles.step}>
              <View style={[styles.stepDot, (done || current) && styles.stepDotOn]}>
                <Text style={[styles.stepNum, !(done || current) && styles.stepNumIdle]}>
                  {done ? '✓' : index + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, current && styles.stepCurrent]}>{label}</Text>
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
    <View style={styles.fill}>
      <BackBar title="Log New Batch" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <FieldLabel>Exam code</FieldLabel>
        <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="e.g. BIT 411" placeholderTextColor="#94A3B8" />
        <FieldLabel>Unit title</FieldLabel>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Distributed Systems" placeholderTextColor="#94A3B8" />
        <FieldLabel>Script count</FieldLabel>
        <TextInput style={styles.input} value={scripts} onChangeText={setScripts} placeholder="84" placeholderTextColor="#94A3B8" keyboardType="number-pad" />
        <FieldLabel>Box</FieldLabel>
        <TextInput style={styles.input} value={box} onChangeText={setBox} placeholder="Box B-14" placeholderTextColor="#94A3B8" />
        <FieldLabel>Shelf</FieldLabel>
        <TextInput style={styles.input} value={shelf} onChangeText={setShelf} placeholder="Shelf 03" placeholderTextColor="#94A3B8" />
        <TouchableOpacity style={styles.primary} onPress={save}>
          <Text style={styles.primaryText}>Save batch</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export const OfficerLocationScreen: React.FC<{
  bookletId?: string;
  onBack: () => void;
  onDone: () => void;
}> = ({ bookletId, onBack, onDone }) => {
  const { booklets, updateLocation } = useCustody();
  const [selected, setSelected] = useState(bookletId || booklets[0]?.id || '');
  const current = booklets.find((item) => item.id === selected);
  const [shelf, setShelf] = useState(current?.shelf || '');
  const [box, setBox] = useState(current?.box || '');

  const choose = (item: ArchivedBooklet) => {
    setSelected(item.id);
    setShelf(item.shelf);
    setBox(item.box);
  };

  const save = async () => {
    if (!selected || !shelf.trim() || !box.trim()) {
      Alert.alert('Missing location', 'Choose a booklet and enter the new shelf and box.');
      return;
    }
    try {
      await updateLocation(selected, shelf.trim(), box.trim());
      onDone();
    } catch (error) {
      Alert.alert('Location not saved', error instanceof Error ? error.message : 'The archive location could not be updated.');
    }
  };

  return (
    <View style={styles.fill}>
      <BackBar title="Update Location" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.sub}>Choose the booklet, then record its new shelf and box.</Text>
        {booklets.map((item) => {
          const on = item.id === selected;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.pick, on && styles.pickOn]}
              onPress={() => choose(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.pickTitle}>
                {item.code} · {item.title}
              </Text>
              <Text style={styles.pickMeta}>
                {item.box}, {item.shelf}
              </Text>
            </TouchableOpacity>
          );
        })}
        <FieldLabel>New shelf</FieldLabel>
        <TextInput style={styles.input} value={shelf} onChangeText={setShelf} placeholder="Shelf 03" placeholderTextColor="#94A3B8" />
        <FieldLabel>New box</FieldLabel>
        <TextInput style={styles.input} value={box} onChangeText={setBox} placeholder="Box B-14" placeholderTextColor="#94A3B8" />
        <TouchableOpacity style={styles.primary} onPress={save}>
          <Text style={styles.primaryText}>Save location</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export const OfficerBookletScreen: React.FC<{
  id: string;
  onBack: () => void;
  onUpdateLocation: () => void;
}> = ({ id, onBack, onUpdateLocation }) => {
  const { booklets } = useCustody();
  const item = booklets.find((booklet) => booklet.id === id);

  if (!item) {
    return (
      <View style={styles.fill}>
        <BackBar title="Booklet" onBack={onBack} />
        <Text style={styles.missing}>Booklet not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <BackBar title={item.code} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{item.title}</Text>
          <Row label="Scripts" value={String(item.scripts)} />
          <Row label="Box" value={item.box} />
          <Row label="Shelf" value={item.shelf} />
          <Row label="Logged" value={`${item.when}${item.actor ? ` ${item.actor}` : ''}`} />
          <Row label="Status" value="Verified" />
        </View>
        <TouchableOpacity style={styles.primary} onPress={onUpdateLocation}>
          <Text style={styles.primaryText}>Update Location</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export const OfficerNotificationsScreen: React.FC<{
  onBack: () => void;
  onOpenRequests: () => void;
  onVerify: (id: string) => void;
  onArchive: () => void;
}> = ({ onBack }) => {
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

  return (
    <View style={styles.fill}>
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
      />
    </View>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  pickOn: { borderColor: NAVY, backgroundColor: '#F8FAFC' },
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
