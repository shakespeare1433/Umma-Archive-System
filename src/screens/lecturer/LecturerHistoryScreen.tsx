import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { KeyboardScrollView } from '../../components/KeyboardScrollView';
import { LecturerTopHeader } from '../../components/LecturerTopHeader';
import { useAuth } from '../../context/AuthContext';
import { useLecturerNotice } from '../../context/LecturerNoticeContext';
import { lecturerPalette, useTheme } from '../../context/ThemeContext';
import { useVault } from '../../context/VaultContext';
import { getRequest } from '../../services/requestService';
import { searchArchives } from '../../services/archiveService';
import { ActiveRetrievalRequest, ArchivedExaminationRecord, SearchedUnitItem } from '../../types';

interface Props {
  onOpenSearch?: () => void;
}

export const LecturerHistoryScreen: React.FC<Props> = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = lecturerPalette(theme);
  const styles = useMemo(() => createHistoryStyles(colors.dark), [colors.dark]);
  const { historyItems, clearHistory, saveFoundBooklet, requests } = useVault();
  const { focusRequestId } = useLecturerNotice();
  const [filterText, setFilterText] = useState('');
  const [selected, setSelected] = useState<SearchedUnitItem | null>(null);
  const [detail, setDetail] = useState<ArchivedExaminationRecord | null>(null);
  const [detailRequest, setDetailRequest] = useState<ActiveRetrievalRequest | null>(null);

  useEffect(() => {
    if (!focusRequestId) return;
    let cancelled = false;
    getRequest(focusRequestId)
      .then((request) => {
        if (cancelled || !request) return;
        const place = bookletPlace(request);
        const timeText = place.startsWith('Location') ? place : `Found at ${place}`;
        setFilterText(request.courseCode);
        saveFoundBooklet(request.courseCode, request.courseTitle, request.officerStatus || 'Located', timeText);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [focusRequestId]);

  const myHistory = historyItems.filter((item) => item.userId === user?.id);

  const displayedItems = myHistory.filter((item) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Search History',
      'Are you sure you want to clear your recent examination archive search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ]
    );
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'folder-outline':
        return <MaterialCommunityIcons name="folder-outline" size={20} color="#2563EB" />;
      case 'calculator-variant-outline':
        return <MaterialCommunityIcons name="calculator-variant-outline" size={20} color="#2563EB" />;
      case 'code-tags':
        return <MaterialCommunityIcons name="code-tags" size={20} color="#2563EB" />;
      case 'chart-box-outline':
        return <MaterialCommunityIcons name="chart-box-outline" size={20} color="#2563EB" />;
      case 'scale-balance':
        return <MaterialCommunityIcons name="scale-balance" size={20} color="#2563EB" />;
      case 'chart-line':
        return <MaterialCommunityIcons name="chart-line" size={20} color="#2563EB" />;
      default:
        return <MaterialCommunityIcons name="book-open-outline" size={20} color="#2563EB" />;
    }
  };

  const openUnit = (item: SearchedUnitItem) => {
    setSelected(item);
    setDetail(null);
    const linked = requests.find(
      (request) => request.courseCode === item.code || request.courseTitle.includes(item.title)
    );
    setDetailRequest(linked ?? null);
    const query = item.code === 'Archive search' ? item.title : item.code;
    void searchArchives({ unitCode: query })
      .then((rows) => {
        setDetail(
          rows.find((row) => row.courseCode === item.code) ||
            rows.find((row) => row.courseName === item.title) ||
            rows[0] ||
            null
        );
      })
      .catch(() => setDetail(null));
  };

  const locationText = () => {
    if (selected?.timeText.startsWith('Found at ')) return selected.timeText.replace(/^Found at /, '');
    if (detailRequest) {
      const place = bookletPlace(detailRequest);
      if (!place.startsWith('Location')) return place;
    }
    if (detail) return [detail.shelf, detail.rack, detail.box, detail.pos].filter(Boolean).join(' → ');
    return 'Location has not been recorded yet.';
  };

  return (
    <View style={styles.screenContainer}>
      <LecturerTopHeader subtitle="Lecturer Portal" />

      <KeyboardScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selected ? (
          <View>
            <TouchableOpacity style={styles.backRow} onPress={() => setSelected(null)} activeOpacity={0.8}>
              <Feather name="arrow-left" size={16} color={colors.ink} />
              <Text style={styles.backText}>Searched units</Text>
            </TouchableOpacity>
            <Text style={styles.detailCode}>{detail?.courseCode || selected.code}</Text>
            <Text style={styles.detailTitle}>{detail?.courseName || selected.title}</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>School</Text>
                <Text style={styles.detailValue}>{detail?.faculty || selected.category}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Programme</Text>
                <Text style={styles.detailValue}>{detail?.programme || 'Not recorded'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Session</Text>
                <Text style={styles.detailValue}>{detail?.session || 'Not recorded'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Student</Text>
                <Text style={styles.detailValue}>{detail?.studentName || 'Not recorded'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Admission number</Text>
                <Text style={styles.detailValue}>{detail?.admissionNumber || 'Not recorded'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{detailRequest?.officerStatus || detail?.vaultStatus || 'Searched'}</Text>
              </View>
              {detailRequest?.requestKind ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Request type</Text>
                  <Text style={styles.detailValue}>
                    {detailRequest.requestKind === 'MISSING_PDF_INVESTIGATION'
                      ? 'Missing PDF investigation'
                      : 'Physical booklet'}
                  </Text>
                </View>
              ) : null}
              {detailRequest?.officerNote ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Officer feedback</Text>
                  <Text style={styles.detailValue}>{detailRequest.officerNote}</Text>
                </View>
              ) : null}
              {detailRequest?.lecturerNote ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Your request</Text>
                  <Text style={styles.detailValue}>{detailRequest.lecturerNote}</Text>
                </View>
              ) : null}
              {detailRequest?.updatedAt ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Response date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(detailRequest.updatedAt).toLocaleString()}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.detailRow, styles.detailRowLast]}>
                <Text style={styles.detailLabel}>Physical location</Text>
                <Text style={styles.detailValue}>{locationText()}</Text>
              </View>
            </View>
          </View>
        ) : (
        <>
        {/* Header Title Section */}
        <View style={styles.topHeaderSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <View style={styles.greenLiveDot} />
              <Text style={styles.mainTitle}>Searched Units</Text>
            </View>
            <View style={styles.archiveLogBadge}>
              <Text style={styles.archiveLogBadgeText}>Archive Log</Text>
            </View>
          </View>

          <Text style={styles.subTitle}>Recent booklets you viewed</Text>

          {/* Search Filter Input */}
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Filter searched units or code..."
              placeholderTextColor="#94A3B8"
              value={filterText}
              onChangeText={setFilterText}
            />
            {filterText.length > 0 && (
              <TouchableOpacity onPress={() => setFilterText('')}>
                <Feather name="x" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Subheader: Count and Clear */}
        <View style={styles.subHeaderRow}>
          <Text style={styles.countText}>
            Showing {displayedItems.length} recent units
          </Text>

          {myHistory.length > 0 && (
            <TouchableOpacity
              onPress={handleClearHistory}
              style={styles.clearHistoryBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="delete-outline" size={15} color={colors.ink} />
              <Text style={styles.clearHistoryBtnText}>Clear History</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* History Cards List */}
        {displayedItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.historyCard}
            onPress={() => openUnit(item)}
            activeOpacity={0.8}
          >
            {/* Left Icon in light blue box */}
            <View style={styles.iconBox}>{renderIcon(item.iconName)}</View>

            {/* Middle Content */}
            <View style={styles.cardContent}>
              <View style={styles.badgeRow}>
                <View style={styles.codePill}>
                  <Text style={styles.codePillText}>{item.code}</Text>
                </View>

                {item.isToday ? (
                  <View style={styles.todayPill}>
                    <View style={styles.todayGreenDot} />
                    <Text style={styles.todayText}>Today</Text>
                  </View>
                ) : (
                  <Text style={styles.categoryText}>{item.category}</Text>
                )}
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>

              <View style={styles.timeRow}>
                <Feather
                  name={item.timeText.startsWith('Found at') ? 'map-pin' : item.timeText.includes('today') || item.timeText.includes('yesterday') ? 'clock' : 'calendar'}
                  size={12}
                  color={item.timeText.startsWith('Found at') ? '#15803D' : colors.muted}
                />
                <Text style={[styles.timeText, item.timeText.startsWith('Found at') && styles.foundText]}>
                  {item.timeText}
                </Text>
              </View>
            </View>

            {/* Right arrow button */}
            <View style={styles.arrowCircle}>
              <Feather name="arrow-right" size={16} color={colors.ink} />
            </View>
          </TouchableOpacity>
        ))}

        {displayedItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={44} color={colors.muted} />
            <Text style={styles.emptyTitle}>No search records found</Text>
            <Text style={styles.emptySub}>
              Booklets you open on the dashboard or in Search appear here.
            </Text>
          </View>
        )}
        </>
        )}
      </KeyboardScrollView>
    </View>
  );
};

function bookletPlace(request: ActiveRetrievalRequest) {
  const shelf = request.shelfLocation?.trim() || '';
  const extra = [request.rack, request.box, request.position].flatMap((part) => {
    const value = part?.trim();
    if (!value || shelf.includes(value)) return [];
    return [value];
  });
  const parts = [shelf, ...extra].filter(Boolean);
  return parts.length > 0 ? parts.join(' → ') : 'Location has not been recorded yet.';
}

function createHistoryStyles(dark: boolean) {
  const page = dark ? '#0F172A' : '#F4F7FC';
  const card = dark ? '#1E293B' : '#FFFFFF';
  const ink = dark ? '#F8FAFC' : '#1E2B58';
  const body = dark ? '#E2E8F0' : '#111827';
  const muted = dark ? '#94A3B8' : '#64748B';
  const line = dark ? '#334155' : '#E2E8F0';
  const field = dark ? '#0F172A' : '#FFFFFF';
  const wash = dark ? '#334155' : '#EFF6FF';
  return StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: page,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  topHeaderSection: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  mainTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  archiveLogBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  archiveLogBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  subTitle: {
    fontSize: 12,
    color: muted,
    marginBottom: 14,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: field,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: line,
    paddingHorizontal: 16,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: body,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  countText: {
    fontSize: 12,
    color: muted,
    fontWeight: '500',
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearHistoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ink,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  codePill: {
    backgroundColor: '#35477B',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  codePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  todayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  categoryText: {
    fontSize: 11,
    color: muted,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: body,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11.5,
    color: muted,
  },
  foundText: {
    color: '#15803D',
    fontWeight: '700',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: ink,
  },
  detailCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ink,
    marginBottom: 14,
  },
  detailCard: {
    backgroundColor: card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: line,
    paddingHorizontal: 14,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: line,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    color: muted,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: body,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: wash,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  emptyContainer: {
    backgroundColor: card,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ink,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: muted,
    textAlign: 'center',
    marginTop: 4,
  },
});
}
