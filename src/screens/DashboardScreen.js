import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Plus, Users, MessageSquare, Globe, RefreshCw, User, ChevronRight, Wallet } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function DashboardScreen({ navigation }) {
  // Placeholder data - we'll hook this up to the backend later
  const todaySpend = 720;
  const monthSpend = 34580;
  const youGet = 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header / Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening 👋</Text>
            <Text style={styles.name}>there</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <User color={colors.primary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardDark]}>
            <Text style={styles.metricLabelDark}>Today</Text>
            <Text style={styles.metricValueDark}>₹{todaySpend}</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardDark]}>
            <Text style={styles.metricLabelDark}>This Month</Text>
            <Text style={styles.metricValueDark}>₹{monthSpend.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLight]}>
            <Text style={styles.metricLabelLight}>You get</Text>
            <Text style={styles.metricValueLight}>₹{youGet}</Text>
          </View>
        </View>

        {/* Recent Groups Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Groups</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.groupCard}
            onPress={() => navigation.navigate('Groups')}
          >
            <View style={styles.groupCardLeft}>
              <View style={styles.groupIconBg}>
                <Users color={colors.surface} size={20} />
              </View>
              <View>
                <Text style={styles.groupTitle}>View all groups</Text>
                <Text style={styles.groupSubtitle}>Track shared expenses</Text>
              </View>
            </View>
            <View style={styles.groupAddBtn}>
              <Plus color={colors.surface} size={16} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Groups')}
          >
            <Users color={colors.textPrimary} size={18} />
            <Text style={styles.btnSecondaryText}>Create a Group</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnPrimary}>
            <Plus color={colors.surface} size={18} />
            <Text style={styles.btnPrimaryText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryLight }]}>
              <MessageSquare color={colors.primary} size={22} />
            </View>
            <Text style={styles.quickActionText}>Fetch From SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentGreenLight }]}>
              <Globe color={colors.accentGreen} size={22} />
            </View>
            <Text style={styles.quickActionText}>Fetch Online Bills</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentPurpleLight }]}>
              <RefreshCw color={colors.accentPurple} size={22} />
            </View>
            <Text style={styles.quickActionText}>Add Recurring</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentOrangeLight }]}>
              <User color={colors.accentOrange} size={22} />
            </View>
            <Text style={styles.quickActionText}>Personal Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity style={styles.flexRow}>
              <Text style={styles.seeAll}>See All</Text>
              <ChevronRight color={colors.primary} size={14} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.emptyTransactions}>
            <View style={styles.emptyIconBg}>
              <Wallet color={colors.primary} size={28} />
            </View>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>Add your first expense to get started</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43, 107, 243, 0.15)',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  metricCardDark: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  metricCardLight: {
    backgroundColor: colors.primaryLight,
    borderColor: 'rgba(43, 107, 243, 0.1)',
  },
  metricLabelDark: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    fontWeight: '500',
  },
  metricValueDark: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  metricLabelLight: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 8,
    fontWeight: '500',
  },
  metricValueLight: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '800',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: 20,
    padding: 16,
  },
  groupCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  groupIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  groupSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  groupAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.surface,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyTransactions: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
