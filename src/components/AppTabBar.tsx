import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface TabItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
}

interface Props {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ACTIVE = '#31457A';
const ICON = 16;

export const AppTabBar: React.FC<Props> = ({ tabs, activeTab, onTabChange }) => {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return (
    <View style={styles.outer}>
      <View style={[styles.bar, dark && styles.barDark]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          const color = active ? '#FFFFFF' : '#64748B';
          return (
            <TouchableOpacity
              key={tab.key}
              style={active ? styles.active : styles.idle}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={1}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View>
                {tab.icon === 'search' || tab.icon === 'user' ? (
                  <Feather name={tab.icon} size={ICON} color={color} />
                ) : (
                  <MaterialCommunityIcons name={tab.icon as never} size={ICON} color={color} />
                )}
                {tab.badge && tab.badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={active ? styles.activeLabel : styles.label} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 4 : 10,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 4,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E6EBF3',
    shadowColor: '#1B2744',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  barDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  idle: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 1,
  },
  active: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACTIVE,
    borderRadius: 22,
    paddingHorizontal: 6,
    height: 40,
    gap: 4,
  },
  label: { fontSize: 10, fontWeight: '600', color: '#64748B' },
  activeLabel: { flexShrink: 1, fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
