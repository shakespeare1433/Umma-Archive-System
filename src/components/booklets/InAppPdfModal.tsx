import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Booklet } from '../../types';
import { BOOKLET_COPY } from '../../constants/booklets';
import {
  createBookletSignedUrl,
  friendlyBookletError,
  logBookletAction,
} from '../../services/bookletService';
import { colors as tokens } from '../../theme';

interface Props {
  visible: boolean;
  booklet: Booklet | null;
  onClose: () => void;
}

export const InAppPdfModal: React.FC<Props> = ({ visible, booklet, onClose }) => {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const startBound = booklet?.startPage && booklet.startPage > 0 ? booklet.startPage : 1;
  const endBound =
    booklet?.endPage && booklet.endPage >= startBound
      ? booklet.endPage
      : Math.max(booklet?.pageCount || startBound, startBound);
  const totalPages = Math.max(endBound - startBound + 1, 1);

  useEffect(() => {
    if (!visible || !booklet) {
      setSignedUrl('');
      setError('');
      setLoading(false);
      setPage(startBound);
      return;
    }

    let cancelled = false;
    const boot = async () => {
      setLoading(true);
      setError('');
      setPage(startBound);
      try {
        if (!booklet.pdfPath) {
          setError(BOOKLET_COPY.missingFile);
          return;
        }
        const url = await createBookletSignedUrl(booklet.pdfPath);
        if (cancelled) return;
        setSignedUrl(url);
        await logBookletAction(booklet.id, 'view');
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
  }, [visible, booklet?.id, booklet?.pdfPath, startBound]);

  const viewerUri = useMemo(() => {
    if (!signedUrl) return '';
    if (Platform.OS === 'android') {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(signedUrl)}`;
    }
    return `${signedUrl}#page=${page}`;
  }, [signedUrl, page]);

  const displayPage = Math.min(Math.max(page - startBound + 1, 1), totalPages);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.stage}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1F4D" />
        <SafeAreaView edges={['top']} style={styles.topSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={onClose} accessibilityLabel="Close">
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
              <TouchableOpacity style={styles.retryBtn} onPress={onClose}>
                <Text style={styles.retryText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.metaBanner}>
                <Text style={styles.metaLine} numberOfLines={1}>
                  {booklet?.unitCode} · {booklet?.unitName}
                </Text>
                <Text style={styles.metaSub} numberOfLines={1}>
                  {booklet?.studentName || 'Student'} · {booklet?.registrationNo || 'Reg. not recorded'}
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
                disabled={page <= startBound || Boolean(error) || loading}
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
                disabled={page >= endBound || Boolean(error) || loading}
                onPress={() => setPage((current) => Math.min(endBound, current + 1))}
                accessibilityLabel="Next page"
              >
                <Feather name="chevron-right" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color="#FFFFFF" />
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
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
    fontWeight: '700',
  },
  viewer: { flex: 1, backgroundColor: '#0B1220' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { color: '#93C5FD', fontWeight: '600' },
  errorText: { color: '#FCA5A5', textAlign: 'center', fontWeight: '600', lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  metaBanner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  metaLine: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  metaSub: { marginTop: 2, color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  web: { flex: 1, backgroundColor: '#0B1220' },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1220',
  },
  footerSafe: { backgroundColor: '#0B1F4D' },
  footer: {
    backgroundColor: '#0B1F4D',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.35 },
  pagePill: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  pagePillText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  closeBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closeText: { color: '#FFFFFF', fontWeight: '700' },
});
