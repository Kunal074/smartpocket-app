import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { TrendingUp, TrendingDown, PieChart, BarChart2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';

const { width } = Dimensions.get('window');

const CATEGORY_META = {
  food:          { icon: '🍔', color: '#F59E0B' },
  transport:     { icon: '🚕', color: '#3B82F6' },
  shopping:      { icon: '🛍️', color: '#8B5CF6' },
  bills:         { icon: '📄', color: '#EF4444' },
  entertainment: { icon: '🎬', color: '#EC4899' },
  other:         { icon: '💸', color: '#6B7280' },
};

export default function AnalyticsScreen({ route }) {
  // If navigated from Dashboard with a filter
  const initialTimeframe = route?.params?.filter || 'month';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Personal'); // Personal | Groups
  const [timeframe, setTimeframe] = useState(initialTimeframe); // week | month | year

  useEffect(() => {
    if (route?.params?.filter) {
      setTimeframe(route.params.filter);
    }
  }, [route?.params?.filter]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get(`/analytics?timeframe=${timeframe}`);
      setData(res.data);
    } catch (e) {
      console.warn('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]));

  const onRefresh = () => { setRefreshing(true); fetchAnalytics(); };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5A67D8" />
        </View>
      </SafeAreaView>
    );
  }

  const trends = data?.trends || [];
  const byCategory = data?.byCategory || [];
  const byGroup = data?.byGroup || [];
  const comp = data?.comparison || { currentPeriod: 0, prevPeriod: 0, changePercent: 0 };
  const maxTrend = Math.max(...trends.map(m => m.total), 1);

  // Compute total for donut %
  const categoryTotal = byCategory.reduce((s, c) => s + c.total, 0);

  const getLabelForTimeframe = () => {
    if (timeframe === 'week') return { curr: 'This Week', prev: 'Last Week' };
    if (timeframe === 'year') return { curr: 'This Year', prev: 'Last Year' };
    return { curr: 'This Month', prev: 'Last Month' };
  };
  const labels = getLabelForTimeframe();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A67D8" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.headerTabs}>
            {['Personal', 'Groups'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.headerTab, activeTab === t && styles.headerTabActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.headerTabText, activeTab === t && styles.headerTabTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Timeframe Filter */}
        <View style={styles.filterContainer}>
          {['week', 'month', 'year'].map(tf => (
            <TouchableOpacity
              key={tf}
              style={[styles.filterBtn, timeframe === tf && styles.filterBtnActive]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[styles.filterText, timeframe === tf && styles.filterTextActive]}>
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Personal' ? (
          <>
            {/* This Period vs Last Period */}
            <View style={styles.compRow}>
              <View style={[styles.compCard, { backgroundColor: '#1E2340' }]}>
                <Text style={styles.compLabelDark}>{labels.curr} (Overall)</Text>
                <Text style={styles.compAmountDark}>₹{comp.currentPeriod.toFixed(0)}</Text>
                <View style={styles.compBadge}>
                  {comp.changePercent >= 0
                    ? <TrendingUp color="#EF4444" size={12} />
                    : <TrendingDown color="#10B981" size={12} />
                  }
                  <Text style={[styles.compBadgeText, { color: comp.changePercent >= 0 ? '#EF4444' : '#10B981' }]}>
                    {Math.abs(comp.changePercent)}%
                  </Text>
                </View>
              </View>
              <View style={styles.compCard}>
                <Text style={styles.compLabel}>{labels.prev}</Text>
                <Text style={styles.compAmount}>₹{comp.prevPeriod.toFixed(0)}</Text>
              </View>
            </View>

            {/* Trend Bar Chart */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <BarChart2 color="#5A67D8" size={18} />
                <Text style={styles.cardTitle}>Spending Trend</Text>
              </View>
              {trends.length === 0 ? (
                <Text style={styles.emptyText}>No data yet</Text>
              ) : (
                <View style={styles.barChart}>
                  {trends.map((m, i) => {
                    const barHeight = Math.max((m.total / maxTrend) * 120, 4);
                    return (
                      <View key={i} style={styles.barCol}>
                        <Text style={styles.barAmount}>₹{m.total >= 1000 ? (m.total / 1000).toFixed(1) + 'k' : m.total.toFixed(0)}</Text>
                        <View style={[styles.bar, { height: barHeight }]} />
                        <Text style={styles.barLabel}>{m.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Category Breakdown */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <PieChart color="#5A67D8" size={18} />
                <Text style={styles.cardTitle}>By Category</Text>
              </View>
              {byCategory.length === 0 ? (
                <Text style={styles.emptyText}>No expenses this {timeframe}</Text>
              ) : (
                byCategory.map((cat, i) => {
                  const meta = CATEGORY_META[cat.category] || CATEGORY_META.other;
                  const pct = categoryTotal > 0 ? ((cat.total / categoryTotal) * 100).toFixed(0) : 0;
                  return (
                    <View key={i} style={styles.catRow}>
                      <View style={[styles.catDot, { backgroundColor: meta.color }]} />
                      <Text style={styles.catIcon}>{meta.icon}</Text>
                      <Text style={styles.catName}>{cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</Text>
                      <View style={styles.catBarBg}>
                        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                      </View>
                      <Text style={styles.catPct}>{pct}%</Text>
                      <Text style={styles.catAmount}>₹{cat.total.toFixed(0)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          /* Groups Tab */
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BarChart2 color="#5A67D8" size={18} />
              <Text style={styles.cardTitle}>Group Spending (This {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)})</Text>
            </View>
            {byGroup.length === 0 ? (
              <Text style={styles.emptyText}>No group expenses this {timeframe}</Text>
            ) : (
              byGroup.map((g, i) => {
                const maxG = Math.max(...byGroup.map(x => x.total), 1);
                const pct = Math.max((g.total / maxG) * 100, 2);
                return (
                  <View key={i} style={styles.groupRow}>
                    <Text style={styles.groupRowName}>{g.groupName}</Text>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: '#5A67D8' }]} />
                    </View>
                    <Text style={styles.catAmount}>₹{g.total.toFixed(0)}</Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: colors.textPrimary, marginBottom: 14 },
  headerTabs: { flexDirection: 'row', backgroundColor: '#EAECF5', borderRadius: 12, padding: 4 },
  headerTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  headerTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  headerTabTextActive: { color: '#5A67D8', fontWeight: '800' },

  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#EAECF5' },
  filterBtnActive: { backgroundColor: '#5A67D8' },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#fff' },

  compRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 16 },
  compCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  compLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  compLabelDark: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  compAmount: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  compAmountDark: { fontSize: 22, fontWeight: '900', color: '#fff' },
  compBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  compBadgeText: { fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 16,
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },

  // Bar chart
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: 'space-between' },
  barCol: { flex: 1, alignItems: 'center' },
  barAmount: { fontSize: 9, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  bar: { width: '100%', maxWidth: 30, backgroundColor: '#5A67D8', borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 6, fontWeight: '600', textAlign: 'center' },

  // Category rows
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catIcon: { fontSize: 16 },
  catName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, width: 80 },
  catBarBg: { flex: 1, height: 8, backgroundColor: '#F4F6FF', borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },
  catPct: { fontSize: 11, color: colors.textSecondary, width: 30, textAlign: 'right' },
  catAmount: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, width: 60, textAlign: 'right' },

  // Group rows
  groupRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  groupRowName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, width: 80 },
});
