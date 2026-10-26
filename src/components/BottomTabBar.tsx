import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LecturerTab } from '../types';

interface BottomTabBarProps {
  activeTab: LecturerTab;
  onTabChange: (tab: LecturerTab) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.bar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Home' && styles.activeTabPill]}
          onPress={() => onTabChange('Home')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={activeTab === 'Home' ? 'view-grid' : 'view-grid-outline'}
            size={activeTab === 'Home' ? 19 : 20}
            color={activeTab === 'Home' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.activeTabLabel]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Search */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Search' && styles.activeTabPill]}
          onPress={() => onTabChange('Search')}
          activeOpacity={0.8}
        >
          <Feather
            name="search"
            size={activeTab === 'Search' ? 19 : 20}
            color={activeTab === 'Search' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Search' && styles.activeTabLabel]}>
            Search
          </Text>
        </TouchableOpacity>

        {/* Tab 3: History */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'History' && styles.activeTabPill]}
          onPress={() => onTabChange('History')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="history"
            size={activeTab === 'History' ? 20 : 21}
            color={activeTab === 'History' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabLabel, activeTab === 'History' && styles.activeTabLabel]}>
            History
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Profile */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Profile' && styles.activeTabPill]}
          onPress={() => onTabChange('Profile')}
          activeOpacity={0.8}
        >
          <Feather
            name="user"
            size={activeTab === 'Profile' ? 19 : 20}
            color={activeTab === 'Profile' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.activeTabLabel]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 54,
  },
  tabButton: {
    minWidth: 64,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  activeTabPill: {
    backgroundColor: '#35477B',
    paddingHorizontal: 18,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
