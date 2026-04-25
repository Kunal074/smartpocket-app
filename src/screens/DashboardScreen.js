import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, Plus, TrendingUp, TrendingDown, ArrowRight,
  Wallet, Bell, ChevronRight, Receipt, GitFork, Zap
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

const { width } = Dimensions.get('window');

const CATEGORY_ICONS = {
  food: '🍔', transport: '🚕', shopping: '🛍️',
  bills: '📄', entertainment: '🎬', other: '💸'
};

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balanceData, setBalanceData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchAll = async () => {
        try {
          const [expRes, balRes, grpRes] = await Promise.all([
            api.get('/expenses'),
            api.get('/balances').catch(() => ({ data: { owedToYou: 0, youOwe: 0, totalNetBalance: 0, byPerson: [] } })),
            api.get('/groups').catch(() => ({ data: [] })),
          ]);
          if (isActive) {
            const list = expRes.data.expenses ?? (Array.isArray(expRes.data) ? expRes.data : []);
            setExpenses(list);
            setBalanceData(balRes.data);
            setGroups(grpRes.data.slice(0, 3));
          }
        } catch (error) {
          if (error.response?.status === 401 && isActive) logout();
        } finally {
          if (isActive) setIsLoading(false);
        }
      };
      fetchAll();
      return () => { isActive = false; };
    }, [logout])
  );

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const todaySpend = expenses
    .filter(e => e.date?.slice(0, 10) === today)
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const monthSpend = expenses
    .filter(e => e.date?.slice(0, 7) === month)
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const netBalance = balanceData?.totalNetBalance || 0;
  const owedToYou = balanceData?.owedToYou || 0;
  const youOwe = balanceData?.youOwe || 0;
  const isPositive = netBalance >= 0;

  const recent = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  const udhaarList = [];
  if (balanceData?.byPerson) {
    balanceData.byPerson.forEach(person => {
      const directGroup = person.groups?.find(g => g.groupName === 'Udhaar (Direct)');
      if (directGroup && Math.abs(directGroup.net) > 0.01) {
        udhaarList.push({
          userId: person.userId,
          name: person.name,
          net: directGroup.net
        });
      }
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#5A67D8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ───────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => Alert.alert('Profile', 'Log out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: logout },
            ])}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>{(user?.name || 'U')[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Brand Hero Card ──────────────────────────── */}
        <LinearGradient
          colors={['#1E2340', '#2D3561', '#3D4E8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Brand label */}
          <View style={styles.heroBrand}>
            <View style={styles.heroBrandDot} />
            <Text style={styles.heroBrandText}>SmartPocket</Text>
          </View>

          {/* Net Balance */}
          <Text style={styles.heroLabel}>Net Balance</Text>
          <Text style={[styles.heroAmount, { color: isPositive ? '#6EE7B7' : '#FCA5A5' }]}>
            {isPositive ? '+' : ''}₹{Math.abs(netBalance).toFixed(0)}
          </Text>

          {/* Owed / Owe row */}
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <TrendingUp color="#6EE7B7" size={14} />
              <Text style={styles.heroStatLabel}>Aapko Lena Hai</Text>
              <Text style={[styles.heroStatAmount, { color: '#6EE7B7' }]}>₹{owedToYou.toFixed(0)}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <TrendingDown color="#FCA5A5" size={14} />
              <Text style={styles.heroStatLabel}>Aapko Dena Hai</Text>
              <Text style={[styles.heroStatAmount, { color: '#FCA5A5' }]}>₹{youOwe.toFixed(0)}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <TouchableOpacity 
              style={styles.heroStat}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Analytics', { filter: 'month' })}
            >
              <Wallet color="#A5B4FC" size={14} />
              <Text style={styles.heroStatLabel}>This Month</Text>
              <Text style={[styles.heroStatAmount, { color: '#A5B4FC' }]}>₹{monthSpend.toFixed(0)}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── SmartSplit Entry Card ────────────────────── */}
        <TouchableOpacity
          style={styles.smartSplitCard}
          onPress={() => navigation.navigate('SmartSplit')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#5A67D8', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.smartSplitGradient}
          >
            <View style={styles.smartSplitLeft}>
              <View style={styles.smartSplitIconBg}>
                <GitFork color="#fff" size={22} />
              </View>
              <View>
                <Text style={styles.smartSplitTitle}>SmartSplit</Text>
                <Text style={styles.smartSplitSubtitle}>
                  {groups.length > 0
                    ? `${groups.length} active group${groups.length > 1 ? 's' : ''} · ${balanceData?.byPerson?.length || 0} pending`
                    : 'Split bills with friends & groups'}
                </Text>
              </View>
            </View>
            <View style={styles.smartSplitArrow}>
              <ArrowRight color="#fff" size={20} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Quick Actions ────────────────────────────── */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AddExpense')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#EEF2FF' }]}>
              <Plus color="#5A67D8" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('SmartSplit', { screen: 'Groups' })}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#F0FDF4' }]}>
              <Users color="#10B981" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('CreateGroup')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#FFF7ED' }]}>
              <Zap color="#F59E0B" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>New Group</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('SmartSplit', { screen: 'Balances' })}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#FDF4FF' }]}>
              <Receipt color="#A855F7" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>Balances</Text>
          </TouchableOpacity>
        </View>

        {/* ── Udhaar (Direct Balances) ─────────────────── */}
        {udhaarList.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Udhaar</Text>
              <Text style={styles.sectionSubtitle}>Direct Friends</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8, paddingBottom: 10 }} style={{ marginHorizontal: -20 }}>
              {udhaarList.map((friend) => {
                const isOwed = friend.net > 0;
                return (
                  <View key={friend.userId} style={styles.udhaarCard}>
                    <View style={styles.udhaarAvatar}>
                      <Text style={styles.udhaarInitials}>{friend.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.udhaarName} numberOfLines={1}>{friend.name.split(' ')[0]}</Text>
                    <View style={[styles.udhaarBadge, { backgroundColor: isOwed ? '#ECFDF5' : '#FEF2F2' }]}>
                      <Text style={[styles.udhaarAmount, { color: isOwed ? '#10B981' : '#EF4444' }]}>
                        {isOwed ? '+' : '-'}₹{Math.abs(friend.net).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Active Groups Preview ─────────────────────── */}
        {groups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Groups</Text>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('SmartSplit', { screen: 'Groups' })}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight color="#5A67D8" size={14} />
              </TouchableOpacity>
            </View>
            {groups.map((group, i) => {
              const net = parseFloat(group.net_balance || 0);
              const isOwed = net > 0;
              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupRow}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id, groupName: group.name })}
                >
                  <View style={[styles.groupIconBg, { backgroundColor: ['#EEF2FF', '#F0FDF4', '#FFF7ED'][i % 3] }]}>
                    <Users color={['#5A67D8', '#10B981', '#F59E0B'][i % 3]} size={18} />
                  </View>
                  <View style={styles.groupRowInfo}>
                    <Text style={styles.groupRowName}>{group.name}</Text>
                    <Text style={styles.groupRowMeta}>{group.member_count} members</Text>
                  </View>
                  {net !== 0 && (
                    <Text style={[styles.groupRowBal, { color: isOwed ? '#10B981' : '#EF4444' }]}>
                      {isOwed ? '+' : '-'}₹{Math.abs(net).toFixed(0)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Recent Transactions ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
          </View>
          {recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyText}>No personal expenses yet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddExpense')}>
                <Text style={styles.emptyAction}>+ Add your first one</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recent.map(expense => {
              const isToday = expense.date?.slice(0, 10) === today;
              const expDate = new Date(expense.date);
              const icon = CATEGORY_ICONS[expense.categoryId] || '💸';
              return (
                <View key={expense.id} style={styles.txRow}>
                  <View style={styles.txIconBg}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>{expense.note || expense.categoryId || 'Expense'}</Text>
                    <Text style={styles.txDate}>
                      {isToday ? 'Today' : expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={styles.txAmount}>−₹{parseFloat(expense.amount).toFixed(0)}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: '#5A67D8', fontWeight: '600', marginBottom: 2 },
  userName: { fontSize: 26, fontWeight: '900', color: '#1E2340', letterSpacing: -0.5 },
  profileBtn: { padding: 2 },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#5A67D8', justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },

  // Hero card
  heroCard: {
    marginHorizontal: 20, borderRadius: 24, padding: 22, marginBottom: 16,
  },
  heroBrand: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  heroBrandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6EE7B7' },
  heroBrandText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: '600' },
  heroAmount: { fontSize: 44, fontWeight: '900', letterSpacing: -2, marginBottom: 20 },
  heroRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 14,
    justifyContent: 'space-around',
  },
  heroStat: { alignItems: 'center', gap: 4 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 4 },
  heroStatAmount: { fontSize: 15, fontWeight: '800' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  // SmartSplit card
  smartSplitCard: { marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  smartSplitGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 18,
  },
  smartSplitLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  smartSplitIconBg: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  smartSplitTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  smartSplitSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  smartSplitArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 24,
  },
  quickBtn: { alignItems: 'center', gap: 8 },
  quickBtnIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  quickBtnLabel: { fontSize: 11, fontWeight: '700', color: '#4A5568' },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E2340' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#5A67D8' },

  // Group rows
  groupRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#EAECF5',
  },
  groupIconBg: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  groupRowInfo: { flex: 1 },
  groupRowName: { fontSize: 15, fontWeight: '700', color: '#1E2340', marginBottom: 2 },
  groupRowMeta: { fontSize: 12, color: '#718096' },
  groupRowBal: { fontSize: 16, fontWeight: '800' },

  // Udhaar / Direct Friends
  sectionSubtitle: { fontSize: 12, color: '#718096', fontWeight: '600' },
  udhaarCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginRight: 12,
    width: 100, alignItems: 'center', borderWidth: 1, borderColor: '#EAECF5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1
  },
  udhaarAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  udhaarInitials: { fontSize: 18, fontWeight: '800', color: '#5A67D8' },
  udhaarName: { fontSize: 13, fontWeight: '700', color: '#1E2340', marginBottom: 6 },
  udhaarBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  udhaarAmount: { fontSize: 12, fontWeight: '800' },

  // Transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#EAECF5',
  },
  txIconBg: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#EEF2FF', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '700', color: '#1E2340', marginBottom: 3 },
  txDate: { fontSize: 12, color: '#718096' },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#EF4444' },

  // Empty
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: '#EAECF5',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#718096', marginBottom: 8 },
  emptyAction: { fontSize: 14, fontWeight: '700', color: '#5A67D8' },
});
