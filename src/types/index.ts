export type UserRole = 'Lecturer' | 'Examination Officer' | 'Admin';

export type LecturerTab = 'Home' | 'Search' | 'History' | 'Profile';
export type OfficerTab = 'Home' | 'Requests' | 'Archive' | 'Uploads' | 'Profile';
export type AdminTab = 'Overview' | 'Users' | 'Activity' | 'Settings';

export interface SearchFilterState {
  faculty: string;
  programme: string;
  session: string;
  academicYear: string;
  semester: string;
  /** Free-text bar: unit code/name, student name, or registration number. */
  quickQuery: string;
  unitCode: string;
  unitName: string;
  bundleCode: string;
  studentName: string;
  admissionNumber: string;
}

export type RootStackParamList = {
  Splash: undefined;
  OnboardingArchive: undefined;
  OnboardingSearch: undefined;
  OnboardingLocate: undefined;
  SignIn: undefined;
  ForgotPassword: { emailOrUser?: string } | undefined;
  Dashboard: { initialTab?: LecturerTab } | undefined;
  LecturerSearchResults: { filter: SearchFilterState };
  LecturerBookletDetails: {
    bookletId: string;
    startPage?: number;
    endPage?: number;
    studentName?: string;
    registrationNo?: string;
  };
  LecturerPdfViewer: {
    bookletId: string;
    pdfPath: string;
    startPage?: number;
    endPage?: number;
    pageCount?: number | null;
    studentName?: string;
    registrationNo?: string;
    unitCode?: string;
    unitName?: string;
  };
  LecturerRequestPhysical: {
    bookletId: string;
    archiveId?: string | null;
    studentName?: string;
    registrationNo?: string;
    school?: string;
    programme?: string;
    academicSession?: string;
    unitCode?: string;
    unitName?: string;
  };
};

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatarUrl: string;
  role: UserRole;
  department: string;
  faculty: string;
  status: 'Active' | 'Suspended';
  createdAt: string;
}

export type VaultItemStatus = 'Original Booklet' | 'Digitized Copy';
export type VaultLifecycle =
  | 'Verified in Vault'
  | 'Requested'
  | 'Staged in Vault'
  | 'Dispatched'
  | 'Checked Out';
/** Physical custody of the original booklet in the vault. */
export type CustodyStatus = 'On shelf' | 'Taken out' | 'Moved';
/** Lecturer request workflow for Phase 5. */
export type RequestWorkflowStatus = 'Pending' | 'Located' | 'Completed';

export interface ExamBookletRecord {
  id: string;
  courseCode: string;
  courseTitle: string;
  academicYear: string;
  semester: string;
  bookletCode: string;
  shelfLocation: string;
  boxNumber: string;
  status: 'Verified' | 'In Shelf' | 'Audited' | 'Pending Review';
  scriptCount: number;
  lecturerName: string;
  lastUpdated: string;
}

export interface ArchivedExaminationRecord {
  id: string;
  courseCode: string;
  courseName: string;
  session: string;
  faculty: string;
  programme?: string;
  studentName: string;
  admissionNumber: string;
  bundleId?: string;
  shelf: string;
  rack: string;
  box: string;
  pos: string;
  status: VaultItemStatus;
  vaultStatus: VaultLifecycle;
  custodyStatus?: CustodyStatus;
  lastVerifiedAt?: string | null;
  scriptCount: number;
  isRequested?: boolean;
  archivedAt?: string;
}

export type RetrievalType = 'PHYSICAL RETRIEVAL' | 'MODERATION PULL';
export type RetrievalRequestKind = 'PHYSICAL_BOOKLET' | 'MISSING_PDF_INVESTIGATION';

export interface ActiveRetrievalRequest {
  id: string;
  recordId: string;
  bundleId?: string;
  requesterId: string;
  requesterName: string;
  type: RetrievalType;
  requestKind?: RetrievalRequestKind;
  courseCode: string;
  courseTitle: string;
  session: string;
  faculty: string;
  regOrCohort: string;
  studentName: string;
  currentStep: number;
  totalSteps: number;
  stepStatusText?: string;
  shelfLocation?: string;
  rack?: string;
  box?: string;
  position?: string;
  readyEta?: string;
  custodian?: string;
  officerStatus?: string;
  lecturerNote?: string;
  officerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string | null;
  audience: 'user' | 'officer' | 'admin' | 'lecturer';
  title: string;
  body: string;
  requestId: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface SearchedUnitItem {
  id: string;
  userId: string;
  code: string;
  title: string;
  category: string;
  timeText: string;
  isToday?: boolean;
  iconName: string;
  searchedAt: string;
}

export interface VaultSettings {
  faculties: string[];
  sessions: string[];
  academicYear: string;
  dispatchHours: number;
}

export type BookletDownloadAction = 'view' | 'download';
export type BookletSort = 'newest' | 'unit_code' | 'session';

export interface Booklet {
  id: string;
  unitCode: string;
  unitName: string;
  programme: string;
  school: string;
  academicSession: string;
  registrationNo: string;
  studentName: string;
  pdfPath: string | null;
  pageCount: number | null;
  digitised: boolean;
  uploadedBy: string | null;
  archiveId: string | null;
  startPage?: number | null;
  endPage?: number | null;
  scriptCount?: number | null;
  /** Physical vault location from examination_archives (when linked). */
  shelf?: string | null;
  rack?: string | null;
  box?: string | null;
  position?: string | null;
  createdAt: string;
}

/** Student page index inside a combined PDF (Phase 3). */
export interface ArchivedScript {
  id: string;
  archiveId: string;
  bookletId: string | null;
  studentName: string;
  registrationNumber: string;
  firstPage: number | null;
  lastPage: number | null;
}

export interface BookletDownload {
  id: string;
  bookletId: string;
  lecturerId: string;
  action: BookletDownloadAction;
  createdAt: string;
}

export interface ExamBundle {
  id: string;
  bundleCode: string;
  qrToken: string;
  qrActive: boolean;
  school: string;
  programme: string;
  academicYear: string;
  semester: string;
  unitCode: string;
  unitName: string;
  studentName: string;
  registrationNo: string;
  store: string;
  shelf: string;
  rack: string;
  position: string;
  bookletCount: number;
  createdAt: string;
}

export interface BundleBooklet {
  id: string;
  bundleId: string;
  studentName: string;
  registrationNo: string;
  school: string;
  programme: string;
  academicYear: string;
  semester: string;
  unitCode: string;
  unitName: string;
  coverPath: string | null;
  coverUrl?: string | null;
  createdAt: string;
}

export const ALL_FACULTIES = 'All faculties';
export const ALL_SESSIONS = 'All sessions';

export const REQUEST_STEPS = ['Sent', 'Received', 'Located', 'Review'] as const;
