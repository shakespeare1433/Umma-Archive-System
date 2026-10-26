import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ARCHIVE_BAR, ExamArchiveBar } from './ExamArchiveBar';
import {
  NotificationCard,
  NotificationInbox,
  iconForNotice,
  labelForNotice,
  noticeKindFromText,
  toneForNotice,
} from './NotificationCard';
import { useAuth } from '../context/AuthContext';
import { useLecturerNotice } from '../context/LecturerNoticeContext';
import { useTheme } from '../context/ThemeContext';
import { clearNotifications, listNotifications, markNotificationsRead } from '../services/notificationService';
import { AppNotification } from '../types';
import { colors as tokens } from '../theme';

interface LecturerTopHeaderProps {
  subtitle?: string;
  onNotificationPress?: () => void;
}

function emptyCopy(role?: string) {
  if (role === 'Admin') {
    return 'No notifications yet. Lecturer requests and vault updates will appear here.';
  }
  if (role === 'Examination Officer') {
    return 'New lecturer requests and status changes will appear here.';
  }
  return 'No notifications yet. A sent request and examination officer updates will appear here.';
}

export const LecturerTopHeader: React.FC<LecturerTopHeaderProps> = ({
  subtitle = 'Lecturer Portal',
  onNotificationPress,
}) => {
  const { user } = useAuth();
  const { openHistory } = useLecturerNotice();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const lecturer = user?.role === 'Lecturer';
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await listNotifications();
      setNotes(rows);
    } catch {
      // Keep the last list if a refresh fails.
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
    const timer = setInterval(() => {
      void load();
    }, 12000);
    return () => clearInterval(timer);
  }, [user, load]);

  const unread = notes.filter((note) => !note.readAt).length;

  const handleBellPress = async () => {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }

    setOpen(true);
    setSelected(null);
    setLoading(true);
    setError('');
    try {
      const rows = await listNotifications();
      setNotes(rows);
      const unreadIds = rows.filter((note) => !note.readAt).map((note) => note.id);
      if (unreadIds.length > 0) {
        try {
          await markNotificationsRead(unreadIds);
          const readAt = new Date().toISOString();
          setNotes(rows.map((note) => (unreadIds.includes(note.id) ? { ...note, readAt } : note)));
        } catch {
          // The list is already visible. The badge clears on the next successful open.
        }
      }
    } catch {
      setError('Notifications could not be loaded. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const closeScreen = () => {
    setSelected(null);
    setOpen(false);
  };

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
          setSelected(null);
          try {
            await clearNotifications(ids);
          } catch {
            void load();
          }
        },
      },
    ]);
  };

  const openNote = (note: AppNotification) => {
    const kind = noticeKindFromText(note.title, note.body);
    const feedback = lecturer && Boolean(note.requestId) && kind !== 'sent';
    if (feedback && note.requestId) {
      closeScreen();
      openHistory(note.requestId);
      return;
    }
    setSelected(note);
  };

  return (
    <>
      <ExamArchiveBar subtitle={subtitle} onBell={handleBellPress} showDot={unread > 0} />
      <Modal visible={open} animationType="slide" onRequestClose={selected ? () => setSelected(null) : closeScreen} statusBarTranslucent>
        <SafeAreaView style={[styles.screen, dark && styles.screenDark]} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.back}
              onPress={selected ? () => setSelected(null) : closeScreen}
              accessibilityRole="button"
              accessibilityLabel={selected ? 'Back to notifications' : 'Close notifications'}
            >
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.topCopy}>
              <Text style={styles.topTitle}>{selected ? 'Notification' : 'Notifications'}</Text>
              <Text style={styles.topSub}>{subtitle}</Text>
            </View>
            {!selected ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClear}
                disabled={notes.length === 0}
                accessibilityRole="button"
                accessibilityLabel="Clear notifications"
              >
                <Text style={[styles.clearText, notes.length === 0 && styles.clearTextOff]}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {selected ? (
            <ScrollView contentContainerStyle={styles.detailPage}>
              <NotificationCard
                title={selected.title}
                body={selected.body}
                createdAt={selected.createdAt}
                statusLabel={labelForNotice(selected.title, selected.body)}
                tone={toneForNotice(selected.title, selected.body)}
                icon={iconForNotice(selected.title, selected.body)}
                unread={!selected.readAt}
                large
              />
            </ScrollView>
          ) : (
            <NotificationInbox
              notes={notes}
              loading={loading}
              error={error}
              empty={emptyCopy(user?.role)}
              dark={dark}
              statusOf={(note) => ({
                label: labelForNotice(note.title, note.body),
                tone: toneForNotice(note.title, note.body),
                icon: iconForNotice(note.title, note.body),
              })}
              onPressNote={openNote}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  screenDark: {
    backgroundColor: '#0F172A',
  },
  topBar: {
    backgroundColor: ARCHIVE_BAR,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: {
    flex: 1,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  topSub: {
    color: '#E2E8F0',
    fontSize: 11,
    marginTop: 2,
  },
  clearBtn: {
    minHeight: 42,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  clearTextOff: {
    color: 'rgba(255,255,255,0.4)',
  },
  detailPage: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
});
