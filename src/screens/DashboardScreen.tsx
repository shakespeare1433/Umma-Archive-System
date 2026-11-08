import React, { useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { LecturerNoticeProvider } from '../context/LecturerNoticeContext';
import { RoleShell } from '../components/RoleShell';
import { LecturerHomeScreen } from './lecturer/LecturerHomeScreen';
import { SearchArchiveScreen } from './lecturer/SearchArchiveScreen';
import { LecturerHistoryScreen } from './lecturer/LecturerHistoryScreen';
import { LecturerProfileScreen } from './lecturer/LecturerProfileScreen';
import { OfficerPortal } from './officer/OfficerPortal';
import { AdminOverviewScreen } from './admin/AdminOverviewScreen';
import { AdminUsersScreen } from './admin/AdminUsersScreen';
import { AdminActivityScreen } from './admin/AdminActivityScreen';
import { AdminSettingsScreen } from './admin/AdminSettingsScreen';

type DashboardNavProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardNavProp;
}

const LECTURER_TABS = [
  { key: 'Home', label: 'Dashboard', icon: 'view-grid-outline' },
  { key: 'Search', label: 'Search', icon: 'search' },
  { key: 'History', label: 'History', icon: 'history' },
  { key: 'Profile', label: 'Profile', icon: 'user' },
];

const ADMIN_TABS = [
  { key: 'Overview', label: 'Home', icon: 'home-outline' },
  { key: 'Users', label: 'Users', icon: 'account-multiple-outline' },
  { key: 'Activity', label: 'Activity', icon: 'chart-bar' },
  { key: 'Settings', label: 'Settings', icon: 'cog-outline' },
];

export const DashboardScreen: React.FC<Props> = () => {
  const { user } = useAuth();

  if (user?.role === 'Examination Officer') {
    return <OfficerPortal />;
  }

  if (user?.role === 'Admin') {
    return <AdminDashboard />;
  }

  return <LecturerDashboard />;
};

function AdminDashboard() {
  const [activityFocus, setActivityFocus] = useState<'all' | 'upload' | 'download' | 'request' | undefined>();

  return (
    <RoleShell
      tabs={ADMIN_TABS}
      render={(tab, setTab) => {
        if (tab === 'Users') return <AdminUsersScreen />;
        if (tab === 'Activity') {
          return (
            <AdminActivityScreen
              initialFilter={activityFocus}
              onInitialFilterConsumed={() => setActivityFocus(undefined)}
            />
          );
        }
        if (tab === 'Settings') return <AdminSettingsScreen />;
        return (
          <AdminOverviewScreen
            onOpenActivity={() => {
              setActivityFocus('all');
              setTab('Activity');
            }}
            onOpenUsers={() => setTab('Users')}
            onOpenArchivedPdfs={() => {
              setActivityFocus('upload');
              setTab('Activity');
            }}
            onOpenLocateRequests={() => {
              setActivityFocus('request');
              setTab('Activity');
            }}
            onOpenDownloads={() => {
              setActivityFocus('download');
              setTab('Activity');
            }}
          />
        );
      }}
    />
  );
}

function LecturerDashboard() {
  const [tab, setTab] = useState('Home');
  const [focusRequestId, setFocusRequestId] = useState<string | null>(null);

  const openHistory = (requestId: string) => {
    setFocusRequestId(requestId);
    setTab('History');
  };

  const changeTab = (next: string) => {
    if (next !== 'History') setFocusRequestId(null);
    setTab(next);
  };

  return (
    <LecturerNoticeProvider focusRequestId={focusRequestId} openHistory={openHistory}>
      <RoleShell
        tabs={LECTURER_TABS}
        activeTab={tab}
        onTabChange={changeTab}
        render={(current, setCurrentTab) => {
          if (current === 'Search') return <SearchArchiveScreen />;
          if (current === 'History') return <LecturerHistoryScreen onOpenSearch={() => setCurrentTab('Search')} />;
          if (current === 'Profile') return <LecturerProfileScreen />;
          return (
            <LecturerHomeScreen
              onOpenSearch={() => setCurrentTab('Search')}
              onOpenHistory={() => setCurrentTab('History')}
            />
          );
        }}
      />
    </LecturerNoticeProvider>
  );
}
