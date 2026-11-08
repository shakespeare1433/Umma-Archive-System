import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from '../../types';
import { BOOKLET_COPY } from '../../constants/booklets';
import {
  bookletFileName,
  createBookletSignedUrl,
  downloadBookletPdf,
  friendlyBookletError,
  getBooklet,
  logBookletAction,
  shareBookletFile,
} from '../../services/bookletService';
import { colors as tokens } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LecturerPdfViewer'>;

export const LecturerPdfViewerScreen: React.FC<Props> = ({ navigation, route }) => {
  const params = route.params;
  const startBound = params.startPage && params.startPage > 0 ? params.startPage : 1;
  const endBound =
    params.endPage && params.endPage >= startBound
      ? params.endPage
      : Math.max(params.pageCount || startBound, startBound);
  const totalPages = Math.max(endBound - startBound + 1, 1);

  const [page, setPage] = useState(startBound);
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState('');
  const [meta, setMeta] = useState({
    unitCode: params.unitCode || '',
    unitName: params.unitName || '',
    studentName: params.studentName || '',
    registrationNo: params.registrationNo || '',
  });

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setLoading(true);
      setError('');
      try {
        const booklet = await getBooklet(params.bookletId);
        if (cancelled) return;
        if (booklet) {
          setMeta({
            unitCode: params.unitCode || booklet.unitCode,
            unitName: params.unitName || booklet.unitName,
            studentName: params.studentName || booklet.studentName,
            registrationNo: params.registrationNo || booklet.registrationNo,
          });
        }
        if (!params.pdfPath && !booklet?.pdfPath) {
          setError(BOOKLET_COPY.missingFile);
          return;
        }
        const path = params.pdfPath || booklet!.pdfPath!;
        const url = await createBookletSignedUrl(path);
        if (cancelled) return;
        setSignedUrl(url);
        await logBookletAction(params.bookletId, 'view');
      } catch (caught) {
        if (!cancelled) setError(friendlyBookletError(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [params.bookletId, params.pdfPath, params.unitCode, params.unitName, params.studentName, params.registrationNo]);

  const viewerUri = useMemo(() => {
    if (!signedUrl) return '';
    // Prefer direct PDF on iOS; Android WebView often needs Google viewer for PDFs.
    if (Platform.OS === 'android') {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(signedUrl)}`;
    }
    return `${signedUrl}#page=${page}`;
  }, [signedUrl, page]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2800);
  };

  const download = async () => {
    setDownloading(true);
    try {
      const booklet = await getBooklet(params.bookletId);
      if (!booklet) {
        showToast(BOOKLET_COPY.missingFile);
        return;
      }
      const uri = await downloadBookletPdf({
        ...booklet,
        studentName: meta.studentName || booklet.studentName,
        registrationNo: meta.registrationNo || booklet.registrationNo,
        startPage: startBound,
        endPage: endBound,
      });
      await shareBookletFile(uri);
      showToast(BOOKLET_COPY.savedAs(bookletFileName(booklet)));
    } catch (caught) {
      showToast(friendlyBookletError(caught));
    } finally {
      setDownloading(false);
    }
  };

  const displayPage = Math.min(Math.max(page - startBound + 1, 1), totalPages);

  return (
    <View style={styles.stage}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1F4D" />
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back"
          >
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>View PDF</Text>
          <View style={styles.headerBtn} />
        </View>
      </SafeAreaView>

      <View style={styles.viewer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#93C5FD" />
            <Text style={styles.loadingText}>Loading booklet…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.retryText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.metaBanner}>
              <Text style={styles.metaLine} numberOfLines={1}>
                {meta.unitCode} · {meta.unitName}
              </Text>
              <Text style={styles.metaSub} numberOfLines={1}>
                {meta.studentName || 'Student'} · {meta.registrationNo || 'Reg. not recorded'}
              </Text>
            </View>
            <WebView
              key={`${viewerUri}-${page}`}
              source={{ uri: viewerUri }}
              style={styles.web}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webLoading}>
                  <ActivityIndicator color={tokens.primary} />
                </View>
              )}
              allowsFullscreenVideo
              scalesPageToFit
              originWhitelist={['*']}
            />
          </>
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
        <View style={styles.footer}>
          <View style={styles.pager}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= startBound && styles.pageBtnDisabled]}
              disabled={page <= startBound}
              onPress={() => setPage((current) => Math.max(startBound, current - 1))}
              accessibilityLabel="Previous page"
            >
              <Feather name="chevron-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.pagePill}>
              <Text style={styles.pagePillText}>
                {displayPage} / {totalPages}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.pageBtn, page >= endBound && styles.pageBtnDisabled]}
              disabled={page >= endBound}
              onPress={() => setPage((current) => Math.min(endBound, current + 1))}
              accessibilityLabel="Next page"
            >
              <Feather name="chevron-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => void download()}
              disabled={downloading || Boolean(error)}
            >
              {downloading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="download" size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>Download</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.goBack()}>
              <Feather name="x" size={18} color="#FFFFFF" />
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
          </View>

          {toast ? <Text style={styles.toast}>{toast}</Text> : null}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#0B1220' },
  topSafe: { backgroundColor: '#0B1F4D' },
  header: {
    height: 52,
    backgroundColor: '#0B1F4D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  viewer: { flex: 1, backgroundColor: '#111827' },
  metaBanner: {
    backgroundColor: '#152238',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  metaLine: { color: '#E2E8F0', fontWeight: '800', fontSize: 13 },
  metaSub: { marginTop: 2, color: '#93C5FD', fontWeight: '600', fontSize: 12 },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { color: '#93C5FD', fontWeight: '700' },
  errorText: { color: '#FCA5A5', fontWeight: '700', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E3A8A',
  },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  footerSafe: { backgroundColor: '#0B1F4D' },
  footer: {
    backgroundColor: '#0B1F4D',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.35 },
  pagePill: {
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  pagePillText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#00236F',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  toast: {
    textAlign: 'center',
    color: '#BBF7D0',
    fontWeight: '700',
    fontSize: 12,
  },
});
