import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveRetrievalRequest,
  ALL_SESSIONS,
  ArchivedExaminationRecord,
  RetrievalType,
  SearchFilterState,
  SearchedUnitItem,
  VaultSettings,
  REQUEST_STEPS,
} from '../types';
import { ALL_PROGRAMMES, ALL_SCHOOLS, ALL_SEMESTERS, ALL_YEARS } from '../data/catalog';
import { insertArchive, listArchives, updateArchive } from '../services/archiveService';
import { insertLocationHistory, locationLabel } from '../services/locationHistoryService';
import { createNotification } from '../services/notificationService';
import {
  deleteRequest,
  findOpenRequest,
  insertRequest,
  listRequests,
  updateRequest,
} from '../services/requestService';
import { clearOwnHistory, insertHistory, listHistory } from '../services/historyService';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settingsService';
import { useAuth } from './AuthContext';

interface VaultContextType {
  ready: boolean;
  records: ArchivedExaminationRecord[];
  requests: ActiveRetrievalRequest[];
  historyItems: SearchedUnitItem[];
  settings: VaultSettings;
  searchFilter: SearchFilterState;
  setSearchFilter: React.Dispatch<React.SetStateAction<SearchFilterState>>;
  resetSearchFilter: () => void;
  requestBooklet: (
    id: string,
    type?: RetrievalType,
    record?: ArchivedExaminationRecord,
    reason?: string
  ) => Promise<string | null>;
  requestMissingBooklet: (
    filter: SearchFilterState,
    reason: string
  ) => Promise<string | null>;
  advanceRequest: (id: string) => void;
  assignRequest: (id: string, custodian: string) => void;
  cancelRequest: (id: string) => void;
  updateRecord: (record: ArchivedExaminationRecord) => Promise<void>;
  addRecord: (record: Omit<ArchivedExaminationRecord, 'id'>) => Promise<ArchivedExaminationRecord>;
  rememberArchives: (incoming: ArchivedExaminationRecord[]) => void;
  logSearch: (code: string, title: string, category: string) => void;
  saveFoundBooklet: (code: string, title: string, category: string, timeText: string) => void;
  selectHistoryItem: (item: SearchedUnitItem) => void;
  clearHistory: () => void;
  updateSettings: (patch: Partial<VaultSettings>) => Promise<void>;
}

const DEFAULT_FILTER: SearchFilterState = {
  faculty: ALL_SCHOOLS,
  programme: ALL_PROGRAMMES,
  session: ALL_SESSIONS,
  academicYear: ALL_YEARS,
  semester: ALL_SEMESTERS,
  quickQuery: '',
  unitCode: '',
  unitName: '',
  bundleCode: '',
  studentName: '',
  admissionNumber: '',
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [records, setRecords] = useState<ArchivedExaminationRecord[]>([]);
  const [requests, setRequests] = useState<ActiveRetrievalRequest[]>([]);
  const [historyItems, setHistoryItems] = useState<SearchedUnitItem[]>([]);
  const historyRef = useRef(historyItems);
  historyRef.current = historyItems;
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [searchFilter, setSearchFilter] = useState<SearchFilterState>(DEFAULT_FILTER);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setRequests([]);
      setHistoryItems([]);
      setSettings(DEFAULT_SETTINGS);
      setReady(true);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setReady(false);
      try {
        const [nextRecords, nextRequests, nextHistory, nextSettings] = await Promise.all([
          listArchives(),
          listRequests(),
          listHistory(),
          loadSettings(),
        ]);
        if (cancelled) return;
        setRecords(nextRecords);
        setRequests(nextRequests);
        setHistoryItems(nextHistory);
        setSettings(nextSettings);
      } catch {
        if (!cancelled) {
          setRecords([]);
          setRequests([]);
          setHistoryItems([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role !== 'Lecturer') return;
    const timer = setInterval(() => {
      listRequests()
        .then(setRequests)
        .catch(() => undefined);
    }, 15000);
    return () => clearInterval(timer);
  }, [user?.id, user?.role]);

  const rememberArchives = (incoming: ArchivedExaminationRecord[]) => {
    setRecords((current) => {
      const byId = new Map(current.map((row) => [row.id, row]));
      for (const row of incoming) byId.set(row.id, row);
      return [...byId.values()];
    });
  };

  const resetSearchFilter = () => setSearchFilter(DEFAULT_FILTER);

  const requestBooklet = async (
    id: string,
    type: RetrievalType = 'PHYSICAL RETRIEVAL',
    record?: ArchivedExaminationRecord,
    reason?: string
  ) => {
    if (!user) return 'You must be signed in.';
    if (user.role !== 'Lecturer') return 'Only a lecturer can request a booklet.';
    const rec = record ?? records.find((r) => r.id === id);
    if (!rec) return 'Record not found.';

    try {
      const duplicate = await findOpenRequest({
        requesterId: user.id,
        courseCode: rec.courseCode,
        session: rec.session,
        registrationNo: rec.admissionNumber,
        studentName: rec.studentName,
        archiveId: rec.id,
        requestKind: 'PHYSICAL_BOOKLET',
      });
      if (duplicate) return 'You already have an open request for this booklet.';

      const created = await insertRequest({
        recordId: rec.id,
        requesterId: user.id,
        requesterName: user.name,
        type,
        requestKind: 'PHYSICAL_BOOKLET',
        courseCode: rec.courseCode,
        courseTitle: `${rec.courseCode}: ${rec.courseName}${rec.programme ? ` · ${rec.programme}` : ''}`,
        session: rec.session,
        faculty: rec.faculty,
        regOrCohort: rec.admissionNumber,
        studentName: rec.studentName,
        currentStep: 1,
        totalSteps: 3,
        stepStatusText: 'Pending',
        shelfLocation: rec.shelf || undefined,
        rack: rec.rack || undefined,
        box: rec.box || undefined,
        position: rec.pos || undefined,
        officerStatus: 'Pending',
        lecturerNote: reason?.trim() || undefined,
      });
      setRequests((current) => [created, ...current]);
      setRecords((current) =>
        current.map((row) =>
          row.id === id ? { ...row, isRequested: true, vaultStatus: 'Requested' } : row
        )
      );
      await createNotification({
        audience: 'officer',
        title: 'New booklet request',
        body: `${user.name} requested ${rec.courseCode} · ${rec.studentName || rec.admissionNumber || 'booklet'}.`,
        requestId: created.id,
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not save the request.';
    }
  };

  const requestMissingBooklet = async (filter: SearchFilterState, reason: string) => {
    if (!user) return 'You must be signed in.';
    if (user.role !== 'Lecturer') return 'Only a lecturer can request a booklet.';
    const courseCode = filter.unitCode.trim() || 'Not specified';
    const session = filter.session === ALL_SESSIONS ? '' : filter.session;
    const faculty = filter.faculty === ALL_SCHOOLS ? '' : filter.faculty;
    const programme = filter.programme === ALL_PROGRAMMES ? '' : filter.programme;
    try {
      const duplicate = await findOpenRequest({
        requesterId: user.id,
        courseCode,
        session,
        registrationNo: filter.admissionNumber.trim(),
        studentName: filter.studentName.trim(),
        requestKind: 'MISSING_PDF_INVESTIGATION',
      });
      if (duplicate) return 'You already have an open request for this booklet.';
      const created = await insertRequest({
        recordId: '',
        requesterId: user.id,
        requesterName: user.name,
        type: 'PHYSICAL RETRIEVAL',
        requestKind: 'MISSING_PDF_INVESTIGATION',
        courseCode,
        courseTitle:
          [filter.unitName.trim(), programme].filter(Boolean).join(' · ') ||
          'Missing examination booklet',
        session,
        faculty,
        regOrCohort: filter.admissionNumber.trim(),
        studentName: filter.studentName.trim(),
        currentStep: 1,
        totalSteps: 3,
        stepStatusText: 'Pending',
        officerStatus: 'Pending',
        lecturerNote: reason.trim(),
      });
      setRequests((current) => [created, ...current]);
      logSearch(courseCode, created.courseTitle, faculty || 'Missing booklet');
      await createNotification({
        audience: 'officer',
        title: 'Missing booklet investigation',
        body: `${user.name} asked the office to locate ${courseCode}.`,
        requestId: created.id,
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not save the request.';
    }
  };

  const advanceRequest = (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req || req.currentStep >= 5) return;
    const nextStep = Math.min(req.currentStep + 1, 5);
    const officerStatus =
      nextStep >= 5 ? 'Fulfilled' : REQUEST_STEPS[Math.min(nextStep, 4) - 1] || 'Sent';
    const patched: ActiveRetrievalRequest = {
      ...req,
      currentStep: nextStep,
      stepStatusText: nextStep >= 5 ? 'Fulfilled' : `● Step ${Math.min(nextStep, 4)}/4`,
      officerStatus,
      readyEta: nextStep >= 3 && nextStep < 5 ? 'Ready in ~15m' : req.readyEta,
      custodian: req.custodian || user?.name,
      updatedAt: new Date().toISOString(),
    };
    setRequests((current) => current.map((row) => (row.id === id ? patched : row)));
    void updateRequest(patched).catch(() => undefined);
    const vaultStatus: ArchivedExaminationRecord['vaultStatus'] =
      nextStep >= 5 ? 'Dispatched' : nextStep >= 4 ? 'Staged in Vault' : 'Requested';
    setRecords((current) =>
      current.map((row) =>
        row.id === req.recordId ? { ...row, vaultStatus, isRequested: nextStep < 5 } : row
      )
    );
  };

  const assignRequest = (id: string, custodian: string) => {
    const req = requests.find((row) => row.id === id);
    if (!req) return;
    const patched: ActiveRetrievalRequest = {
      ...req,
      custodian,
      officerStatus: req.currentStep < 2 ? 'Officer Received' : req.officerStatus,
      currentStep: Math.max(req.currentStep, 2),
      stepStatusText: `● Step ${Math.max(req.currentStep, 2)}/4`,
      updatedAt: new Date().toISOString(),
    };
    setRequests((current) => current.map((row) => (row.id === id ? patched : row)));
    void updateRequest(patched).catch(() => undefined);
  };

  const cancelRequest = (id: string) => {
    const req = requests.find((row) => row.id === id);
    setRequests((current) => current.filter((row) => row.id !== id));
    if (req) {
      setRecords((current) =>
        current.map((row) =>
          row.id === req.recordId ? { ...row, isRequested: false, vaultStatus: 'Verified in Vault' } : row
        )
      );
    }
    void deleteRequest(id).catch(() => undefined);
  };

  const updateRecord = async (record: ArchivedExaminationRecord) => {
    const previous = records.find((row) => row.id === record.id);
    const fromLocation = previous
      ? locationLabel({
          shelf: previous.shelf,
          rack: previous.rack,
          box: previous.box,
          position: previous.pos,
        })
      : 'Location not recorded';
    const toLocation = locationLabel({
      shelf: record.shelf,
      rack: record.rack,
      box: record.box,
      position: record.pos,
    });
    const locationChanged =
      previous &&
      (previous.shelf !== record.shelf ||
        previous.rack !== record.rack ||
        previous.box !== record.box ||
        previous.pos !== record.pos);

    const next: ArchivedExaminationRecord = {
      ...record,
      custodyStatus: locationChanged ? 'Moved' : record.custodyStatus || previous?.custodyStatus || 'On shelf',
      lastVerifiedAt: new Date().toISOString(),
    };

    await updateArchive(next);
    if (locationChanged) {
      await insertLocationHistory({
        archiveId: record.id,
        fromLocation,
        toLocation,
        movedBy: user?.id,
      });
    }
    setRecords((current) => current.map((row) => (row.id === record.id ? next : row)));
  };

  const addRecord = async (record: Omit<ArchivedExaminationRecord, 'id'>) => {
    const created = await insertArchive(record);
    setRecords((current) => [created, ...current]);
    return created;
  };

  const logSearch = (code: string, title: string, category: string) => {
    if (!user) return;
    const item: Omit<SearchedUnitItem, 'id'> = {
      userId: user.id,
      code: code || 'Archive search',
      title: title || 'Filtered examination records',
      category,
      timeText: `Searched ${new Date().toLocaleString()}`,
      isToday: true,
      iconName: 'folder-outline',
      searchedAt: new Date().toISOString(),
    };
    void insertHistory(item)
      .then((saved) => {
        setHistoryItems((current) => [saved, ...current].slice(0, 50));
      })
      .catch(() => undefined);
  };

  const saveFoundBooklet = (code: string, title: string, category: string, timeText: string) => {
    if (!user) return;
    const alreadySaved = historyRef.current.some(
      (item) => item.userId === user.id && item.code === code && item.timeText === timeText
    );
    if (alreadySaved) return;
    const item: Omit<SearchedUnitItem, 'id'> = {
      userId: user.id,
      code: code || 'Archive search',
      title: title || 'Examination booklet',
      category,
      timeText,
      isToday: true,
      iconName: 'book-open-outline',
      searchedAt: new Date().toISOString(),
    };
    void insertHistory(item)
      .then((saved) => {
        setHistoryItems((current) => [saved, ...current].slice(0, 50));
      })
      .catch(() => undefined);
  };

  const selectHistoryItem = (item: SearchedUnitItem) => {
    setSearchFilter((prev) => ({
      ...prev,
      unitCode: item.code,
      unitName: item.title,
      faculty: settings.faculties.includes(item.category) ? item.category : prev.faculty,
    }));
  };

  const clearHistory = () => {
    if (!user) return;
    setHistoryItems((current) => current.filter((item) => item.userId !== user.id));
    void clearOwnHistory(user.id).catch(() => undefined);
  };

  const updateSettings = async (patch: Partial<VaultSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  };

  const value = useMemo(
    () => ({
      ready,
      records,
      requests,
      historyItems,
      settings,
      searchFilter,
      setSearchFilter,
      resetSearchFilter,
      requestBooklet,
      requestMissingBooklet,
      advanceRequest,
      assignRequest,
      cancelRequest,
      updateRecord,
      addRecord,
      rememberArchives,
      logSearch,
      saveFoundBooklet,
      selectHistoryItem,
      clearHistory,
      updateSettings,
    }),
    [ready, records, requests, historyItems, settings, searchFilter, user]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
