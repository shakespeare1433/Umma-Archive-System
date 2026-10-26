import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTabBar, TabItem } from './AppTabBar';
import { ARCHIVE_BAR } from './ExamArchiveBar';
import { useTheme } from '../context/ThemeContext';

interface Props {
  tabs: TabItem[];
  initialTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  render: (tab: string, setTab: (tab: string) => void) => React.ReactNode;
}

export const RoleShell: React.FC<Props> = ({
  tabs,
  initialTab,
  activeTab: controlledTab,
  onTabChange,
  render,
}) => {
  const { theme } = useTheme();
  const page = theme === 'dark' ? '#0F172A' : '#F4F7FC';
  const [internalTab, setInternalTab] = useState(initialTab || tabs[0]?.key || '');
  const activeTab = controlledTab ?? internalTab;

  const setTab = (tab: string) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={ARCHIVE_BAR} />
      <SafeAreaView edges={['top']} style={styles.topInset} />
      <View style={[styles.tabContentContainer, { backgroundColor: page }]}>{render(activeTab, setTab)}</View>
      <View style={[styles.bottom, { backgroundColor: page }]}>
        <AppTabBar tabs={tabs} activeTab={activeTab} onTabChange={setTab} />
        <SafeAreaView edges={['bottom']} style={[styles.bottomInset, { backgroundColor: page }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ARCHIVE_BAR,
  },
  topInset: { backgroundColor: ARCHIVE_BAR },
  tabContentContainer: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  bottom: { backgroundColor: '#F4F7FC' },
  bottomInset: { backgroundColor: '#F4F7FC' },
});
