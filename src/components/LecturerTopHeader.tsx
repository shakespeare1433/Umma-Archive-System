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

  const page = dark ? '#0F172A' : '#F4F7FC';
  const card = dark ? '#152238' : '#FFFFFF';
  const ink = dark ? '#F8FAFC' : '#0F172A';
  const field = dark ? '#0F172A' : '#F4F6F9';
  const line = dark ? '#334155' : '#E8EDF3';
  const muted = dark ? '#94A3B8' : '#94A3B8';

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
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={selected ? () => setSelected(null) : closeScreen}
        statusBarTranslucent
      >
        <View style={[styles.stage, { backgroundColor: page }]}>
          <SafeAreaView style={styles.topSafe} edges={['top']}>
            <ExamArchiveBar
              subtitle={subtitle}
              onBell={closeScreen}
              showDot={unread > 0}
            />
          </SafeAreaView>

          <View style={[styles.backBar, { backgroundColor: card, borderBottomColor: line }]}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: field }]}
              onPress={selected ? () => setSelected(null) : closeScreen}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={selected ? 'Back to notifications' : 'Close notifications'}
            >
              <Feather name="arrow-left" size={18} color={ink} />
            </TouchableOpacity>
            <Text style={[styles.backTitle, { color: ink }]} numberOfLines={1}>
              {selected ? 'Notification' : 'Notifications'}
            </Text>
            {!selected ? (
              <TouchableOpacity
                onPress={handleClear}
                disabled={notes.length === 0}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear notifications"
                style={styles.backRight}
              >
                <Text
                  style={[
                    styles.backRightText,
                    { color: ink },
                    notes.length === 0 && { color: muted },
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backRight} />
            )}
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
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: page }} />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  stage: {
    flex: 1,
  },
  topSafe: {
    backgroundColor: ARCHIVE_BAR,
  },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  backRight: {
    minHeight: 34,
    minWidth: 52,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRightText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailPage: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
});
