import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { OfficerTab } from '../../types';
import { AppTabBar } from '../../components/AppTabBar';
import { useAuth } from '../../context/AuthContext';
import { ARCHIVE_BAR, ExamArchiveBar } from '../../components/ExamArchiveBar';
import { CustodyProvider, PAGE } from './custody';
import { OfficerHomeScreen } from './OfficerHomeScreen';
import { OfficerArchiveFormScreen } from './OfficerArchiveFormScreen';
import { OfficerUploadsScreen } from './OfficerUploadsScreen';
import { OfficerProfileView } from './OfficerProfileView';
import {
  OfficerBookletScreen,
  OfficerLocationScreen,
  OfficerLogBatchScreen,
  OfficerNotificationsScreen,
  OfficerRequestDetailScreen,
  OfficerRetrievalScreen,
  OfficerSearchScreen,
  OfficerVerifyScreen,
} from './OfficerFlows';

type Route =
  | { name: 'tabs' }
  | { name: 'search'; query: string }
  | { name: 'log' }
  | { name: 'location'; bookletId?: string }
  | { name: 'request'; id: string }
  | { name: 'verify'; id: string }
  | { name: 'retrieve'; id: string }
  | { name: 'booklet'; id: string }
  | { name: 'notifications' };

const OFFICER_TABS: { key: OfficerTab; label: string; icon: string }[] = [
  { key: 'Home', label: 'Home', icon: 'home-outline' },
  { key: 'Uploads', label: 'Uploads', icon: 'upload-outline' },
  { key: 'Archive', label: 'Archive', icon: 'archive-outline' },
  { key: 'Profile', label: 'Profile', icon: 'account-outline' },
];

export const OfficerPortal: React.FC = () => {
  return (
    <CustodyProvider>
      <OfficerShell />
    </CustodyProvider>
  );
};

const OfficerShell: React.FC = () => {
  const { logout } = useAuth();
  const [tab, setTab] = useState<OfficerTab>('Home');
  const [stack, setStack] = useState<Route[]>([{ name: 'tabs' }]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileIntent, setProfileIntent] = useState<'edit' | 'password' | 'privacy' | null>(null);
  const route = stack[stack.length - 1];

  const push = (next: Route) => setStack((current) => [...current, next]);
  const back = () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  const goTab = (next: OfficerTab) => {
    setMenuOpen(false);
    setTab(next);
    setStack([{ name: 'tabs' }]);
  };

  const showTabs = route.name === 'tabs';

  return (
    <View style={styles.stage}>
      <StatusBar style="light" />
      <View style={styles.phone}>
        <SafeAreaView style={styles.top} edges={['top']}>
          <ExamArchiveBar
            subtitle="Exam Officer Portal"
            onBell={() => {
              setMenuOpen(false);
              push({ name: 'notifications' });
            }}
          />
        </SafeAreaView>
        {menuOpen && showTabs && tab === 'Profile' ? (
          <View style={styles.menuWrap}>
            <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
            <View style={styles.menu}>
              <MenuItem
                label="Edit Profile"
                onPress={() => {
                  setMenuOpen(false);
                  setProfileIntent('edit');
                }}
              />
              <MenuItem
                label="Change Password"
                onPress={() => {
                  setMenuOpen(false);
                  setProfileIntent('password');
                }}
              />
              <MenuItem
                label="Privacy and Security"
                onPress={() => {
                  setMenuOpen(false);
                  setProfileIntent('privacy');
                }}
              />
              <MenuItem
                label="Log Out"
                danger
                onPress={() => {
                  setMenuOpen(false);
                  Alert.alert('Log out', 'Leave the officer portal?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log Out', style: 'destructive', onPress: () => logout() },
                  ]);
                }}
              />
            </View>
          </View>
        ) : null}
        <View style={styles.body}>
          {route.name === 'tabs' && tab === 'Home' ? (
            <OfficerHomeScreen
              onSearch={(query) => push({ name: 'search', query })}
              onLogBatch={() => push({ name: 'log' })}
              onArchive={() => goTab('Archive')}
              onUpdateLocation={() => push({ name: 'location' })}
              onOpenUploads={() => goTab('Uploads')}
              onOpenRequest={(id) => push({ name: 'request', id })}
              onVerify={(id) => push({ name: 'verify', id })}
              onRetrieve={(id) => push({ name: 'retrieve', id })}
              onOpenBooklet={(id) => push({ name: 'booklet', id })}
            />
          ) : null}
          {route.name === 'tabs' && tab === 'Uploads' ? (
            <OfficerUploadsScreen onScan={() => goTab('Archive')} />
          ) : null}
          {route.name === 'tabs' && tab === 'Archive' ? (
            <OfficerArchiveFormScreen onClose={() => goTab('Home')} onDone={() => goTab('Uploads')} />
          ) : null}
          {route.name === 'tabs' && tab === 'Profile' ? (
            <ProfilePane intent={profileIntent} onIntentHandled={() => setProfileIntent(null)} />
          ) : null}
          {route.name === 'search' ? (
            <OfficerSearchScreen
              initialQuery={route.query}
              onBack={back}
              onOpenRequest={(id) => push({ name: 'request', id })}
              onVerify={(id) => push({ name: 'verify', id })}
              onRetrieve={(id) => push({ name: 'retrieve', id })}
              onOpenBooklet={(id) => push({ name: 'booklet', id })}
            />
          ) : null}
          {route.name === 'log' ? <OfficerLogBatchScreen onBack={back} onDone={() => goTab('Home')} /> : null}
          {route.name === 'location' ? (
            <OfficerLocationScreen bookletId={route.bookletId} onBack={back} onDone={back} />
          ) : null}
          {route.name === 'request' ? (
            <OfficerRequestDetailScreen
              id={route.id}
              onBack={back}
              onVerify={() => push({ name: 'verify', id: route.id })}
              onRetrieve={() => push({ name: 'retrieve', id: route.id })}
            />
          ) : null}
          {route.name === 'verify' ? (
            <OfficerVerifyScreen id={route.id} onBack={back} onDone={() => goTab('Home')} />
          ) : null}
          {route.name === 'retrieve' ? (
            <OfficerRetrievalScreen id={route.id} onBack={back} onDone={() => goTab('Home')} />
          ) : null}
          {route.name === 'booklet' ? (
            <OfficerBookletScreen
              id={route.id}
              onBack={back}
              onUpdateLocation={() => push({ name: 'location', bookletId: route.id })}
            />
          ) : null}
          {route.name === 'notifications' ? (
            <OfficerNotificationsScreen
              onBack={back}
              onOpenRequests={() => goTab('Home')}
              onVerify={(id) => push({ name: 'verify', id })}
              onArchive={() => goTab('Archive')}
            />
          ) : null}
        </View>
        {showTabs ? (
          <SafeAreaView edges={['bottom']} style={styles.tabSafe}>
            <AppTabBar
              tabs={OFFICER_TABS}
              activeTab={tab}
              onTabChange={(key) => goTab(key as OfficerTab)}
            />
          </SafeAreaView>
        ) : (
          <SafeAreaView edges={['bottom']} style={styles.tabSafe} />
        )}
      </View>
    </View>
  );
};

function ProfilePane({
  intent,
  onIntentHandled,
}: {
  intent: 'edit' | 'password' | 'privacy' | null;
  onIntentHandled: () => void;
}) {
  return <OfficerProfileView intent={intent} onIntentHandled={onIntentHandled} />;
}

function MenuItem({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.menuText, danger && styles.menuDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#D5DBE6',
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: ARCHIVE_BAR,
  },
  top: { backgroundColor: ARCHIVE_BAR },
  body: { flex: 1, backgroundColor: PAGE },
  tabSafe: { backgroundColor: PAGE },
  menuWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  menu: {
    position: 'absolute',
    top: 96,
    right: 16,
    width: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  menuText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  menuDanger: { color: '#DC2626' },
});
