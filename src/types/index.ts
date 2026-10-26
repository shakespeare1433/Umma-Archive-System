export type UserRole = 'Lecturer' | 'Examination Officer' | 'Admin';

export type LecturerTab = 'Home' | 'Search' | 'History' | 'Profile';
export type OfficerTab = 'Home' | 'Uploads' | 'Archive' | 'Profile';
export type AdminTab = 'Overview' | 'Users' | 'Activity' | 'Settings';

export interface SearchFilterState {
  faculty: string;
  programme: string;
  session: string;
  unitCode: string;
  unitName: string;
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
  LecturerBookletDetails: { bookletId: string };
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
  shelf: string;
  rack: string;
  box: string;
  pos: string;
  status: VaultItemStatus;
  vaultStatus: VaultLifecycle;
  scriptCount: number;
  isRequested?: boolean;
  archivedAt?: string;
}

export type RetrievalType = 'PHYSICAL RETRIEVAL' | 'MODERATION PULL';

export interface ActiveRetrievalRequest {
  id: string;
  recordId: string;
  requesterId: string;
  requesterName: string;
  type: RetrievalType;
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
  readyEta?: string;
  custodian?: string;
  officerStatus?: string;
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
  createdAt: string;
}

export interface BookletDownload {
  id: string;
  bookletId: string;
  lecturerId: string;
  action: BookletDownloadAction;
  createdAt: string;
}

export const ALL_FACULTIES = 'All faculties';
export const ALL_SESSIONS = 'All sessions';

export const REQUEST_STEPS = ['Sent', 'Received', 'Located', 'Review'] as const;
