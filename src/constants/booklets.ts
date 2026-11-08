export const BOOKLET_BUCKET = 'booklets';
export const BOOKLET_PAGE_SIZE = 20;
export const BOOKLET_DOWNLOAD_CAP = 20;
export const BOOKLET_SIGNED_TTL_SEC = 60;
/** Longer TTL for in-app viewing so the PDF does not expire mid-read. */
export const BOOKLET_VIEW_TTL_SEC = 60 * 30;

export const BOOKLET_COPY = {
  resultsTitle: 'Search Results',
  detailsTitle: 'Booklet Details',
  found: (count: number) => `${count} booklet${count === 1 ? '' : 's'} found`,
  sort: 'Sort',
  sortNewest: 'Newest',
  sortUnitCode: 'Unit code',
  sortSession: 'Session',
  pdfReady: 'PDF available',
  notDigitised: 'Physical only',
  locationLabel: 'Physical location',
  locationMissing: 'Location not recorded',
  download: 'Download',
  downloadPdf: 'Download PDF',
  downloadAll: (count: number) => `Download all (${count} PDFs)`,
  downloadCap: (cap: number) =>
    `Download all is limited to ${cap} PDFs at a time. Narrow the search and try again.`,
  viewFullScreen: 'View full screen',
  requestPhysical: 'Request Physical Booklet',
  requestPhysicalHint:
    'Ask the Examination Officer for the original physical booklet. You can still use the digital PDF.',
  submitRequest: 'Submit request',
  changeFilters: 'Change filters',
  retry: 'Retry',
  close: 'Close',
  back: 'Back',
  emptyTitle: 'No matching examination booklet found.',
  emptyBody: 'You can ask the Examination Officer to locate the physical booklet.',
  requestOfficer: 'Request from Examination Officer',
  requestReason: 'Reason for request',
  requestReasonHint: 'Add a short explanation for the examination office.',
  requestSent: 'Your request was sent to the Examination Officer.',
  requestAlreadyOpen: 'You already have an open request for this booklet.',
  pages: 'Pages',
  pagesOf: (start?: number | null, end?: number | null) =>
    start && end ? `Pages ${start}–${end}` : start ? `From page ${start}` : 'Pages not recorded',
  notScanned: 'Physical booklet is archived',
  notScannedBody:
    'No digital PDF is attached yet. You can still request the original physical booklet from the examination office.',
  previewPlaceholder: 'First page preview',
  openPdf: 'Open PDF',
  pageOf: (current: number, total: number) => `${current} / ${total}`,
  courseUnit: 'Course unit',
  registrationNo: 'Registration number',
  studentName: 'Student name',
  session: 'Session',
  pageCount: 'Page count',
  missingValue: 'Not recorded',
  emptyFilterTitle: 'Add a search detail',
  emptyFilter:
    'Type in the search bar, or choose a school, programme, or academic session filter.',
  savedAs: (name: string) => `Saved as ${name}`,
  downloading: 'Downloading…',
  downloadingN: (current: number, total: number) => `Downloading ${current} of ${total}…`,
  offline: 'No internet connection. Check your network and try again.',
  missingFile: 'This PDF is not in the archive yet.',
  permissionDenied: 'You do not have permission to open this booklet.',
  shareUnavailable: 'Sharing is not available on this device.',
  genericError: 'Something went wrong. Please try again.',
  requested: 'Physical retrieval requested.',
  noArchive: 'This booklet is not in the physical vault yet, so it cannot be requested.',
} as const;

/** Treat empty or placeholder vault values as missing. */
export function isRecordedLocationPart(value?: string | null): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return lower !== 'not recorded' && lower !== 'n/a' && lower !== '-';
}

/** Example: "Rack A - Shelf 3 - Box 05 - Position 2" */
export function formatPhysicalLocation(parts: {
  shelf?: string | null;
  rack?: string | null;
  box?: string | null;
  position?: string | null;
}): string {
  const segments: string[] = [];
  if (isRecordedLocationPart(parts.rack)) {
    const rack = parts.rack!.trim();
    segments.push(/^rack\b/i.test(rack) ? rack : `Rack ${rack}`);
  }
  if (isRecordedLocationPart(parts.shelf)) {
    const shelf = parts.shelf!.trim();
    segments.push(/^shelf\b/i.test(shelf) ? shelf : `Shelf ${shelf}`);
  }
  if (isRecordedLocationPart(parts.box)) {
    const box = parts.box!.trim();
    segments.push(/^box\b/i.test(box) ? box : `Box ${box}`);
  }
  if (isRecordedLocationPart(parts.position)) {
    const pos = parts.position!.trim();
    segments.push(/^(slot|position)\b/i.test(pos) ? pos : `Position ${pos}`);
  }
  return segments.length ? segments.join(' - ') : BOOKLET_COPY.locationMissing;
}

export function bookletHasPdf(booklet: { digitised?: boolean; pdfPath?: string | null }): boolean {
  return Boolean(booklet.digitised && booklet.pdfPath);
}
