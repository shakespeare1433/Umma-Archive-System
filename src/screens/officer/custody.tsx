import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listArchives, updateArchiveLocation, updateArchiveLocationByIdentity } from '../../services/archiveService';
import { listRequests, patchRequest } from '../../services/requestService';
import { ActiveRetrievalRequest, ArchivedExaminationRecord } from '../../types';

export type RequestStatus = 'In Progress' | 'Pending Review' | 'Verified';
export type StatusFilter = 'All' | RequestStatus;
export type BookletIcon = 'doc' | 'law' | 'med';

export interface CustodyRequest {
  id: string;
  ref: string;
  unitCode: string;
  unitTitle: string;
  lecturer: string;
  school: string;
  shelf?: string;
  rack?: string;
  box?: string;
  booklets: number;
  status: RequestStatus;
  urgent: boolean;
  mode: 'custody' | 'moderation';
  moderationLabel?: string;
  createdAt: string;
}

export interface ArchivedBooklet {
  id: string;
  archiveId?: string;
  code: string;
  title: string;
  scripts: number;
  box: string;
  shelf: string;
  when: string;
  actor: string;
  icon: BookletIcon;
  archivedAt?: string;
}

export interface DashboardStats {
  pending: number;
  inProgress: number;
  newFromLecturers: number;
  locating: number;
  verifying: number;
  weeklyScripts: number;
  weeklyDelta: number;
  storageUsed: number;
  storageTotal: number;
}

export type TracerStatus = 'Pending' | 'Located' | 'Completed';
export type TracerFilter = 'All Requests' | 'Pending' | 'Located' | 'Completed';
export type ChipTone = 'dark' | 'green' | 'plain';

export interface CoordChip {
  title: string;
  detail?: string;
  extra?: string;
  tone: ChipTone;
}

export interface TracerRequest {
  id: string;
  student: string;
  reg: string;
  school: string;
  lecturer?: string;
  unitCode: string;
  unitTitle: string;
  status: TracerStatus;
  expedite?: boolean;
  session: string;
  sessionSub: string;
  venue: string;
  venueSub: string;
  leftMeta: string;
  rightMeta: string;
  leftAlert?: boolean;
  chips: CoordChip[];
}

export const TRACER_FILTERS: TracerFilter[] = ['All Requests', 'Pending', 'Located', 'Completed'];
export const SHELF_OPTIONS = ['Shelf B-01', 'Shelf A-02', 'Shelf A', 'Shelf C-04', 'Shelf H-02'];

export function tracerBadgeCount(tracers: TracerRequest[], onRequestsTab: boolean) {
  if (onRequestsTab) return tracers.length;
  return tracers.filter((item) => item.status === 'Pending').length;
}

export const NAVY = '#1B2744';
export const PAGE = '#F4F6F9';

const INITIAL_REQUESTS: CustodyRequest[] = [];

const INITIAL_BOOKLETS: ArchivedBooklet[] = [];

const INITIAL_TRACERS: TracerRequest[] = [];

const INITIAL_STATS: DashboardStats = {
  pending: 0,
  inProgress: 0,
  newFromLecturers: 0,
  locating: 0,
  verifying: 0,
  weeklyScripts: 0,
  weeklyDelta: 0,
  storageUsed: 0,
  storageTotal: 0,
};

interface LogBatchInput {
  code: string;
  title: string;
  scripts: number;
  box: string;
  shelf: string;
  archiveId?: string;
}

interface CustodyContextValue {
  requests: CustodyRequest[];
  booklets: ArchivedBooklet[];
  tracers: TracerRequest[];
  stats: DashboardStats;
  flash: string | null;
  clearFlash: () => void;
  verifyRequest: (id: string) => void;
  startRetrieval: (id: string) => void;
  logBatch: (input: LogBatchInput) => void;
  updateLocation: (id: string, shelf: string, box: string) => Promise<void>;
  locateTracer: (id: string) => void;
  moveTracerShelf: (id: string, shelf: string) => void;
  verifyTracer: (id: string) => void;
  reload: () => Promise<void>;
}

function shelfChip(shelf: string): Pick<CoordChip, 'title' | 'detail'> {
  const dash = shelf.lastIndexOf('-');
  if (dash > 0) {
    return { title: shelf.slice(0, dash + 1), detail: shelf.slice(dash + 1) };
  }
  const parts = shelf.split(' ');
  if (parts.length > 1) return { title: parts[0], detail: parts.slice(1).join(' ') };
  return { title: shelf };
}

function toCustodyRequest(row: ActiveRetrievalRequest): CustodyRequest {
  const status: RequestStatus = row.currentStep >= 5 ? 'Verified' : row.currentStep <= 1 ? 'Pending Review' : 'In Progress';
  return {
    id: row.id,
    ref: row.id.slice(0, 8).toUpperCase(),
    unitCode: row.courseCode,
    unitTitle: row.courseTitle,
    lecturer: row.requesterName,
    school: row.faculty,
    shelf: row.shelfLocation,
    rack: row.rack,
    box: row.box,
    booklets: 1,
    status,
    urgent: row.currentStep <= 1,
    mode: row.type === 'MODERATION PULL' ? 'moderation' : 'custody',
    createdAt: row.createdAt,
  };
}

function toBooklet(row: ArchivedExaminationRecord): ArchivedBooklet {
  return {
    id: row.id,
    archiveId: row.id,
    code: row.courseCode,
    title: row.courseName,
    scripts: row.scriptCount,
    box: row.box,
    shelf: row.shelf,
    when: row.archivedAt ? new Date(row.archivedAt).toLocaleString() : '',
    actor: '',
    icon: 'doc',
    archivedAt: row.archivedAt,
  };
}

function tracerStatusOf(row: ActiveRetrievalRequest): TracerStatus {
  const label = (row.officerStatus || '').toLowerCase();
  if (row.currentStep >= 5 || label === 'fulfilled' || label === 'completed' || label === 'dispatched') {
    return 'Completed';
  }
  if (row.currentStep >= 3 || label === 'located' || label === 'review') {
    return 'Located';
  }
  return 'Pending';
}

function toTracer(row: ActiveRetrievalRequest): TracerRequest {
  const status = tracerStatusOf(row);
  const shelf = shelfChip(row.shelfLocation || 'Vault');
  return {
    id: row.id,
    student: row.studentName || 'Student',
    reg: row.regOrCohort || '',
    school: row.faculty || '',
    lecturer: row.requesterName,
    unitCode: row.courseCode,
    unitTitle: row.courseTitle,
    status,
    expedite: status === 'Pending',
    session: row.session || '',
    sessionSub: row.type === 'MODERATION PULL' ? 'Moderation' : 'Retrieval',
    venue: row.box || 'Vault',
    venueSub: row.rack || '',
    leftMeta: status === 'Pending' ? 'Awaiting trace' : status === 'Located' ? 'Physically located' : 'Filed',
    rightMeta: row.officerStatus || status,
    chips: [
      { title: shelf.title, detail: shelf.detail, tone: 'dark' },
      ...(row.rack ? [{ title: 'Rack', detail: row.rack, tone: 'plain' as const }] : []),
      ...(row.box
        ? [{ title: 'Box', detail: row.box, tone: status === 'Pending' ? ('plain' as const) : ('green' as const) }]
        : []),
    ],
  };
}

function statsFrom(archives: ArchivedExaminationRecord[], openRequests: ActiveRetrievalRequest[]): DashboardStats {
  const pending = openRequests.filter((row) => row.currentStep <= 1).length;
  const inProgress = openRequests.filter((row) => row.currentStep > 1 && row.currentStep < 5).length;
  return {
    pending,
    inProgress,
    newFromLecturers: pending,
    locating: inProgress,
    verifying: pending,
    weeklyScripts: archives.reduce((sum, row) => sum + (row.scriptCount || 0), 0),
    weeklyDelta: 0,
    storageUsed: archives.length,
    storageTotal: Math.max(archives.length, 1),
  };
}

const CustodyContext = createContext<CustodyContextValue | undefined>(undefined);

export function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

export function storagePercent(stats: DashboardStats) {
  if (!stats.storageTotal) return 0;
  return Math.min(100, Math.round((stats.storageUsed / stats.storageTotal) * 100));
}

export const CustodyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<CustodyRequest[]>(INITIAL_REQUESTS);
  const [booklets, setBooklets] = useState<ArchivedBooklet[]>(INITIAL_BOOKLETS);
  const [tracers, setTracers] = useState<TracerRequest[]>(INITIAL_TRACERS);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [archives, openRequests] = await Promise.all([listArchives(), listRequests()]);
      setBooklets(archives.map(toBooklet));
      setRequests(openRequests.map(toCustodyRequest));
      setTracers(openRequests.map(toTracer));
      setStats(statsFrom(archives, openRequests));
    } catch {
      // Keep the list already on screen if the refresh fails.
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<CustodyContextValue>(() => {
    const verifyRequest = (id: string) => {
      const request = requests.find((item) => item.id === id);
      if (!request || request.status === 'Verified') return;
      setRequests((current) =>
        current.map((item) => (item.id === id ? { ...item, status: 'Verified', urgent: false } : item))
      );
      setBooklets((current) => [
        {
          id: `arch-${Date.now()}`,
          code: request.unitCode,
          title: request.unitTitle,
          scripts: request.booklets,
          box: request.box || 'Box —',
          shelf: request.shelf || 'Vault',
          when: 'Just now',
          actor: 'by You',
          icon: 'doc',
          archivedAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setStats((current) => ({
        ...current,
        inProgress: Math.max(0, current.inProgress - (request.status === 'In Progress' ? 1 : 0)),
        pending: Math.max(0, current.pending - (request.status === 'Pending Review' ? 1 : 0)),
        verifying: Math.max(0, current.verifying - 1),
        weeklyScripts: current.weeklyScripts + request.booklets,
        storageUsed: Math.min(current.storageTotal, current.storageUsed + 1),
      }));
      setFlash(`${request.ref} custody verified and archived.`);
      void patchRequest(id, {
        currentStep: 5,
        officerStatus: 'Fulfilled',
        stepStatusText: 'Fulfilled',
      }).catch(() => undefined);
    };

    const startRetrieval = (id: string) => {
      const request = requests.find((item) => item.id === id);
      if (!request || request.status === 'Verified') return;
      const wasPending = request.status === 'Pending Review';
      setRequests((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: 'In Progress', mode: item.mode } : item
        )
      );
      if (wasPending) {
        setStats((current) => ({
          ...current,
          pending: Math.max(0, current.pending - 1),
          inProgress: current.inProgress + 1,
          locating: current.locating + 1,
        }));
      }
      setFlash(`Vault retrieval started for ${request.ref}.`);
      if (request.status === 'Pending Review') {
        void patchRequest(id, {
          currentStep: 2,
          officerStatus: 'Received',
          stepStatusText: '● Step 2/4',
        }).catch(() => undefined);
      }
    };

    const logBatch = (input: LogBatchInput) => {
      setBooklets((current) => [
        {
          id: `batch-${Date.now()}`,
          archiveId: input.archiveId,
          code: input.code,
          title: input.title,
          scripts: input.scripts,
          box: input.box,
          shelf: input.shelf,
          when: 'Just now',
          actor: 'by You',
          icon: 'doc',
          archivedAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setStats((current) => ({
        ...current,
        weeklyScripts: current.weeklyScripts + input.scripts,
        storageUsed: Math.min(current.storageTotal, current.storageUsed + 1),
      }));
      setFlash(`${input.code} logged into the vault.`);
    };

    const locateTracer = (id: string) => {
      const tracer = tracers.find((item) => item.id === id);
      if (!tracer || tracer.status === 'Completed') return;
      if (tracer.status === 'Located') {
        setFlash(`${tracer.student} is already physically located.`);
        return;
      }
      setTracers((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: 'Located', expedite: false, rightMeta: 'Located' } : item
        )
      );
      setFlash(`${tracer.student} marked physically located.`);
      void patchRequest(id, {
        currentStep: 3,
        officerStatus: 'Located',
        stepStatusText: '● Step 3/4',
      }).catch(() => undefined);
    };

    const moveTracerShelf = (id: string, shelf: string) => {
      const tracer = tracers.find((item) => item.id === id);
      if (!tracer || tracer.status === 'Completed') return;
      const nextChip = shelfChip(shelf);
      setTracers((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          let replaced = false;
          const chips = item.chips.map((chip) => {
            if (chip.tone !== 'green' || replaced) return chip;
            replaced = true;
            return { ...chip, title: nextChip.title, detail: nextChip.detail, extra: undefined };
          });
          return {
            ...item,
            chips: replaced ? chips : [...chips, { ...nextChip, tone: 'green' as const }],
          };
        })
      );
      setFlash(`${tracer.student} moved to ${shelf}.`);
      void updateArchiveLocationByIdentity(
        {
          unitCode: tracer.unitCode,
          studentName: tracer.student,
          admissionNumber: tracer.reg,
        },
        { shelf }
      ).catch(() => undefined);
    };

    const verifyTracer = (id: string) => {
      const tracer = tracers.find((item) => item.id === id);
      if (!tracer || tracer.status === 'Completed') return;
      setTracers((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: 'Completed', expedite: false, rightMeta: 'Verified: Just now' }
            : item
        )
      );
      setFlash(`${tracer.student} verified and filed.`);
      void patchRequest(id, {
        currentStep: 5,
        officerStatus: 'Fulfilled',
        stepStatusText: 'Fulfilled',
      }).catch(() => undefined);
    };

    const updateLocation = async (id: string, shelf: string, box: string) => {
      const booklet = booklets.find((item) => item.id === id);
      if (!booklet) return;
      if (booklet.archiveId) {
        await updateArchiveLocation(booklet.archiveId, { shelf, box });
      }
      setBooklets((current) =>
        current.map((item) => (item.id === id ? { ...item, shelf, box, when: 'Just now', actor: 'by You' } : item))
      );
      setFlash(`${booklet.code} moved to ${box}, ${shelf}.`);
    };

    return {
      requests,
      booklets,
      tracers,
      stats,
      flash,
      clearFlash: () => setFlash(null),
      verifyRequest,
      startRetrieval,
      logBatch,
      updateLocation,
      locateTracer,
      moveTracerShelf,
      verifyTracer,
      reload,
    };
  }, [booklets, flash, reload, requests, stats, tracers]);

  return <CustodyContext.Provider value={value}>{children}</CustodyContext.Provider>;
};

export function useCustody() {
  const context = useContext(CustodyContext);
  if (!context) throw new Error('useCustody must be used within CustodyProvider');
  return context;
}
