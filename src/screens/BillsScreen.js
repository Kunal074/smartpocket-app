import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Search, Clock, User, Globe, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

export default function BillsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTopTab, setActiveTopTab] = useState('Expenses');
  const [activeSideTab, setActiveSideTab] = useState('Non Group');
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (e) {
      console.warn('Failed to fetch groups for Bills sidebar', e);
    }
  };

  const TOP_TABS = ['Expenses', 'Drafts', 'Recurring', 'Priority'];

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyTitle}>No bills found!</Text>
      <Text style={styles.emptySubtitle}>Tap '+' below to start adding expenses.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bills</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Search color={colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      {/* Top Pills */}
      <View style={styles.topTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topTabsScroll}>
          {TOP_TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.topTabBtn, activeTopTab === tab && styles.topTabBtnActive]}
              onPress={() => setActiveTopTab(tab)}
            >
              <Text style={[styles.topTabText, activeTopTab === tab && styles.topTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Split Layout */}
      <View style={styles.splitLayout}>
        
        {/* Left Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Recent */}
            <TouchableOpacity 
              style={styles.sidebarItem}
              onPress={() => setActiveSideTab('Recent')}
            >
              <View style={[styles.sidebarIconBg, { backgroundColor: '#FDF2E9' }]}>
                <Clock color="#E67E22" size={24} />
              </View>
              <Text style={styles.sidebarText}>Recent</Text>
            </TouchableOpacity>

            {/* Non Group */}
            <TouchableOpacity 
              style={[styles.sidebarItem, activeSideTab === 'Non Group' && styles.sidebarItemActive]}
              onPress={() => setActiveSideTab('Non Group')}
            >
              <View style={[styles.sidebarIconBg, { backgroundColor: activeSideTab === 'Non Group' ? colors.primaryLight : '#EDF2F7' }]}>
                <User color={activeSideTab === 'Non Group' ? colors.primary : colors.textSecondary} size={24} />
              </View>
              <Text style={styles.sidebarText}>Non Group</Text>
            </TouchableOpacity>

            {/* Groups Section */}
            <View style={styles.sidebarSectionHeader}>
              <View style={styles.sidebarSectionLine} />
              <Text style={styles.sidebarSectionTitle}>GROUPS ({groups.length})</Text>
            </View>

            {groups.map(group => (
              <TouchableOpacity 
                key={group.id} 
                style={[styles.sidebarItem, activeSideTab === group.id && styles.sidebarItemActive]}
                onPress={() => setActiveSideTab(group.id)}
              >
                <View style={[styles.sidebarIconBg, { backgroundColor: '#EBF8FF' }]}>
                  <Globe color="#3182CE" size={24} />
                </View>
                <Text style={styles.sidebarText} numberOfLines={1}>{group.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Right Main Content */}
        <View style={styles.mainContent}>
          {renderEmptyState()}

          <View style={styles.bottomActionContainer}>
            <TouchableOpacity 
              style={styles.addExpenseBtn}
              onPress={async () => {
                if (activeSideTab === 'Non Group') {
                  navigation.navigate('GroupAddExpense', { members: [], groupId: null, groupName: null });
                } else if (activeSideTab === 'Recent') {
                  alert('Select a group or non-group first!');
                } else {
                  const group = groups.find(g => g.id === activeSideTab);
                  if (group) {
                    try {
                      const res = await api.get(`/groups/${group.id}/members`);
                      navigation.navigate('GroupAddExpense', { groupId: group.id, groupName: group.name, members: res.data });
                    } catch {
                      navigation.navigate('GroupAddExpense', { groupId: group.id, groupName: group.name, members: [] });
                    }
                  }
                }
              }}
            >
              <Text style={styles.addExpenseBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F8FB', justifyContent: 'center', alignItems: 'center' },
  
  topTabsContainer: { borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12 },
  topTabsScroll: { paddingHorizontal: 20, gap: 12 },
  topTabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.borderMedium },
  topTabBtnActive: { backgroundColor: '#5A67D8', borderColor: '#5A67D8' },
  topTabText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  topTabTextActive: { color: colors.surface },

  splitLayout: { flex: 1, flexDirection: 'row' },
  
  sidebar: { width: 90, borderRightWidth: 1, borderRightColor: colors.borderLight, backgroundColor: colors.surface, paddingVertical: 16 },
  sidebarItem: { alignItems: 'center', marginBottom: 24, marginHorizontal: 8, borderRadius: 12, paddingVertical: 8 },
  sidebarItemActive: { backgroundColor: '#F4F8FB' },
  sidebarIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sidebarText: { fontSize: 11, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  sidebarSectionHeader: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sidebarSectionLine: { width: 4, height: 16, backgroundColor: '#5A67D8', position: 'absolute', left: 0, top: 0, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  sidebarSectionTitle: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },

  mainContent: { flex: 1, backgroundColor: '#FAFAFA', padding: 20 },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  bottomActionContainer: { marginTop: 'auto', paddingBottom: 16 },
  addExpenseBtn: { backgroundColor: '#5A67D8', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  addExpenseBtnText: { fontSize: 16, fontWeight: '700', color: colors.surface },
});
