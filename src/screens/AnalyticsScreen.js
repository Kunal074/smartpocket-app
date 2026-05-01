import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl,
  Modal, FlatList, Alert, TextInput
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { TrendingUp, TrendingDown, PieChart, BarChart2, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import ExpenseActionModal from '../components/ExpenseActionModal';
import { useLanguageStore } from '../store/languageStore';

const { width } = Dimensions.get('window');

const CATEGORY_META = {
  food:          { icon: '🍔', color: '#F59E0B' },
  transport:     { icon: '🚕', color: '#3B82F6' },
  shopping:      { icon: '🛍️', color: '#8B5CF6' },
  bills:         { icon: '📄', color: '#EF4444' },
  entertainment: { icon: '🎬', color: '#EC4899' },
  udhaar:        { icon: '🤝', color: '#10B981' },
  other:         { icon: '💸', color: '#6B7280' },
};

export default function AnalyticsScreen({ route }) {
  const { t, language } = useLanguageStore();
  // If navigated from Dashboard with a filter
  const initialTimeframe = route?.params?.filter || 'month';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Personal');
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState(''); // DD/MM/YYYY
  const [customEndDate, setCustomEndDate] = useState('');     // DD/MM/YYYY
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  useEffect(() => {
    if (route?.params?.filter) {
      setTimeframe(route.params.filter);
    }
  }, [route?.params?.filter]);

  // Helper: parse DD/MM/YYYY → YYYY-MM-DD
  const parseDate = (str) => {
    const parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const d = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      let url = `/analytics?timeframe=${timeframe}`;
      if (timeframe === 'custom' && customStartDate && customEndDate) {
        const s = parseDate(customStartDate);
        const e = parseDate(customEndDate);
        if (s && e) url = `/analytics?timeframe=month&startDate=${s}&endDate=${e}`;
      }
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      console.warn('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe, customStartDate, customEndDate]);

  // Details Modal State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [categoryExpenses, setCategoryExpenses] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [selectedExpenseForAction, setSelectedExpenseForAction] = useState(null);

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(''); // DD/MM/YYYY
  const [exportEndDate, setExportEndDate] = useState(''); // DD/MM/YYYY

  // AI Insights State
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [insightsText, setInsightsText] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  const handleCategoryPress = async (category) => {
    setSelectedCategory(category);
    setLoadingCategory(true);
    try {
      const res = await api.get('/expenses');
      const allExpenses = res.data.expenses || [];
      const filtered = allExpenses.filter(e => {
        if (e.categoryId !== category) return false;
        
        const date = new Date(e.date);
        const now = new Date();
        if (timeframe === 'week') {
          return date >= new Date(now.setDate(now.getDate() - 7));
        } else if (timeframe === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          return date >= monthStart; 
        } else {
          return date >= new Date(now.getFullYear(), 0, 1);
        }
      });
      setCategoryExpenses(filtered);
    } catch (e) {
      console.warn('Failed to fetch category details', e);
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleGroupPress = async (group) => {
    setSelectedGroup(group);
    setLoadingCategory(true);
    try {
      const res = await api.get('/expenses');
      const allExpenses = res.data.expenses || [];
      const filtered = allExpenses.filter(e => {
        if (e.groupId !== group.groupId) return false;
        
        const date = new Date(e.date);
        const now = new Date();
        if (timeframe === 'week') {
          return date >= new Date(now.setDate(now.getDate() - 7));
        } else if (timeframe === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          return date >= monthStart; 
        } else {
          return date >= new Date(now.getFullYear(), 0, 1);
        }
      });
      setCategoryExpenses(filtered);
    } catch (e) {
      console.warn('Failed to fetch group details', e);
    } finally {
      setLoadingCategory(false);
    }
  };

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

  const handleExport = () => {
    // Default to current month start and end dates
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setExportStartDate(`${String(firstDay.getDate()).padStart(2, '0')}/${String(firstDay.getMonth() + 1).padStart(2, '0')}/${firstDay.getFullYear()}`);
    setExportEndDate(`${String(lastDay.getDate()).padStart(2, '0')}/${String(lastDay.getMonth() + 1).padStart(2, '0')}/${lastDay.getFullYear()}`);
    
    setShowExportModal(true);
  };

  const parseDateInput = (str) => {
    const parts = str.trim().split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const d = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  };

  const performExport = async (format) => {
    const parsedStart = parseDateInput(exportStartDate);
    const parsedEnd = parseDateInput(exportEndDate);

    if (!parsedStart || !parsedEnd) {
      Alert.alert('Error', 'Please enter valid dates in DD/MM/YYYY format');
      return;
    }

    setLoading(true);
    setShowExportModal(false);
    try {
      const res = await api.get(`/export?startDate=${parsedStart}&endDate=${parsedEnd}`);
      const exportData = res.data.data || [];
      
      if (exportData.length === 0) {
        Alert.alert('No Data', 'No expenses found for this month to export.');
        return;
      }

      if (format === 'csv') {
        const header = 'Date,Category,Note,Amount\n';
        const rows = exportData.map(r => `${new Date(r.date).toLocaleDateString('en-IN')},${r.category},"${r.note || ''}",${r.amount}`).join('\n');
        const csvContent = header + rows;
        
        const fileUri = FileSystem.documentDirectory + `SmartPocket_Export_${parsedStart}_to_${parsedEnd}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      } else {
        // PDF
        const totalAmount = exportData.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        
        let htmlContent = `
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1E2340; }
                .header { text-align: center; border-bottom: 2px solid #5A67D8; padding-bottom: 20px; margin-bottom: 30px; }
                .title { font-size: 28px; font-weight: bold; color: #5A67D8; margin: 0; }
                .subtitle { font-size: 16px; color: #718096; margin-top: 5px; }
                .summary { display: flex; justify-content: space-between; background-color: #F8F9FF; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
                .summary-box { text-align: center; }
                .summary-box .label { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 1px; }
                .summary-box .value { font-size: 24px; font-weight: bold; color: #1E2340; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; padding: 12px; border-bottom: 2px solid #E2E8F0; color: #4A5568; font-size: 14px; }
                td { padding: 12px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
                .amount { font-weight: bold; text-align: right; }
                th.amount { text-align: right; }
                .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #A0AEC0; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 class="title">SmartPocket Report</h1>
                <p class="subtitle">Expense Summary (${exportStartDate} - ${exportEndDate})</p>
              </div>
              
              <div class="summary">
                <div class="summary-box">
                  <div class="label">Total Expenses</div>
                  <div class="value">${exportData.length}</div>
                </div>
                <div class="summary-box">
                  <div class="label">Total Spent</div>
                  <div class="value">₹${totalAmount.toFixed(2)}</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th class="amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportData.map(r => `
                    <tr>
                      <td>${new Date(r.date).toLocaleDateString('en-IN')}</td>
                      <td style="text-transform: capitalize;">${r.category}</td>
                      <td>${r.note || '-'}</td>
                      <td class="amount">₹${parseFloat(r.amount).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="footer">
                Generated by SmartPocket • Automated Financial Reporting
              </div>
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        }
      }
    } catch (e) {
      console.warn('Export failed', e);
      Alert.alert('Export Failed', 'An error occurred while generating the report.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetInsights = async () => {
    setLoadingInsights(true);
    setShowInsightsModal(true);
    setInsightsText('');
    try {
      let url;
      if (timeframe === 'custom' && customStartDate && customEndDate) {
        const s = parseDate(customStartDate);
        const e = parseDate(customEndDate);
        if (s && e) {
          url = `/analytics/insights?startDate=${s}&endDate=${e}&lang=${language}`;
        } else {
          setInsightsText('Invalid custom dates. Please use DD/MM/YYYY format.');
          return;
        }
      } else {
        if (timeframe !== 'month') {
          Alert.alert('Notice', 'AI Insights work best for monthly or custom date views.');
        }
        const now = new Date();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const yearStr = now.getFullYear().toString();
        url = `/analytics/insights?month=${monthStr}&year=${yearStr}&lang=${language}`;
      }
      const res = await api.get(url);
      setInsightsText(res.data.insights || 'No insights available right now.');
    } catch (e) {
      console.warn('Failed to load insights', e);
      const details = e.response?.data?.details || e.message;
      setInsightsText(`Sorry, failed to generate insights at this time.\n\nError: ${details}`);
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A67D8" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
            <Text style={styles.headerTitle}>{t('analytics.title')}</Text>
            <TouchableOpacity onPress={handleExport} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Download color="#5A67D8" size={16} />
              <Text style={{ color: '#5A67D8', fontSize: 13, fontWeight: '700' }}>{t('analytics.export')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerTabs}>
            {[t('analytics.personal'), t('analytics.groups')].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.headerTab, (tab === t('analytics.personal') ? activeTab === 'Personal' : activeTab === 'Groups') && styles.headerTabActive]}
                onPress={() => setActiveTab(tab === t('analytics.personal') ? 'Personal' : 'Groups')}
              >
                <Text style={[styles.headerTabText, (tab === t('analytics.personal') ? activeTab === 'Personal' : activeTab === 'Groups') && styles.headerTabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Timeframe Filter */}
        <View style={styles.filterContainer}>
          {['week', 'month', 'year', 'custom'].map(tf => (
            <TouchableOpacity
              key={tf}
              style={[styles.filterBtn, timeframe === tf && styles.filterBtnActive]}
              onPress={() => {
                if (tf === 'custom') {
                  const now = new Date();
                  const firstDay = `01/${String(now.getMonth() + 1).padStart(2,'0')}/${now.getFullYear()}`;
                  const lastDay = `${String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,'0')}/${String(now.getMonth() + 1).padStart(2,'0')}/${now.getFullYear()}`;
                  if (!customStartDate) setCustomStartDate(firstDay);
                  if (!customEndDate) setCustomEndDate(lastDay);
                  setShowCustomDateModal(true);
                }
                setTimeframe(tf);
              }}
            >
              <Text style={[styles.filterText, timeframe === tf && styles.filterTextActive]}>
                {tf === 'custom' ? '📅 Custom' : tf.charAt(0).toUpperCase() + tf.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Date Range Label */}
        {timeframe === 'custom' && customStartDate && customEndDate && (
          <TouchableOpacity
            style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            onPress={() => setShowCustomDateModal(true)}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#5A67D8' }}>📅 {customStartDate} → {customEndDate}</Text>
            <Text style={{ fontSize: 11, color: '#5A67D8', marginLeft: 'auto' }}>Change</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'Personal' ? (
          <>
            {/* AI Insights Button */}
            <TouchableOpacity 
              style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: '#8B5CF6', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
              onPress={handleGetInsights}
            >
              <Text style={{ fontSize: 18 }}>✨</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{t('analytics.ask_ai')}</Text>
            </TouchableOpacity>

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
                <Text style={styles.cardTitle}>{t('analytics.spending_trend')}</Text>
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
                <Text style={styles.cardTitle}>{t('analytics.by_category')}</Text>
              </View>
              {byCategory.length === 0 ? (
                <Text style={styles.emptyText}>No expenses this {timeframe}</Text>
              ) : (
                byCategory.map((cat, i) => {
                  const meta = CATEGORY_META[cat.category] || CATEGORY_META.other;
                  const hasBudget = cat.budget && cat.budget > 0;
                  
                  let pct = 0;
                  let isOver = false;
                  if (hasBudget) {
                    pct = Math.min((cat.total / cat.budget) * 100, 100).toFixed(0);
                    isOver = cat.total > cat.budget;
                  } else {
                    pct = categoryTotal > 0 ? ((cat.total / categoryTotal) * 100).toFixed(0) : 0;
                  }

                  const barColor = isOver ? '#EF4444' : meta.color;
                  
                  return (
                    <TouchableOpacity 
                      key={i} 
                      style={styles.catRow}
                      activeOpacity={0.7}
                      onPress={() => handleCategoryPress(cat.category)}
                    >
                      <View style={[styles.catDot, { backgroundColor: meta.color }]} />
                      <Text style={styles.catIcon}>{meta.icon}</Text>
                      <View style={{ width: 80 }}>
                        <Text style={styles.catName}>{cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}</Text>
                        {hasBudget ? <Text style={{ fontSize: 9, color: '#718096', fontWeight: '600', marginTop: 2 }}>Limit: ₹{cat.budget}</Text> : null}
                      </View>
                      <View style={styles.catBarBg}>
                        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[styles.catPct, isOver && { color: '#EF4444', fontWeight: '700' }]}>{pct}%</Text>
                      <Text style={[styles.catAmount, isOver && { color: '#EF4444' }]}>₹{cat.total.toFixed(0)}</Text>
                    </TouchableOpacity>
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
                  <TouchableOpacity 
                    key={i} 
                    style={styles.groupRow}
                    activeOpacity={0.7}
                    onPress={() => handleGroupPress(g)}
                  >
                    <Text style={styles.groupRowName}>{g.groupName}</Text>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: '#5A67D8' }]} />
                    </View>
                    <Text style={styles.catAmount}>₹{g.total.toFixed(0)}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="slide" transparent onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Export Data</Text>
            
            <Text style={{ fontSize: 14, color: '#718096', marginBottom: 16 }}>
              Select the date range for your export.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="numeric"
                  maxLength={10}
                  value={exportStartDate}
                  onChangeText={setExportStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="numeric"
                  maxLength={10}
                  value={exportEndDate}
                  onChangeText={setExportEndDate}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Choose Format</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <TouchableOpacity 
                style={[styles.saveBtn, { flex: 1, backgroundColor: '#10B981', marginBottom: 0 }]} 
                onPress={() => performExport('csv')}
              >
                <Text style={styles.saveBtnText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, { flex: 1, backgroundColor: '#5A67D8', marginBottom: 0 }]} 
                onPress={() => performExport('pdf')}
              >
                <Text style={styles.saveBtnText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExportModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Insights Modal */}
      <Modal visible={showInsightsModal} animationType="slide" transparent onRequestClose={() => setShowInsightsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>AI Financial Insights ✨</Text>
            
            {loadingInsights ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={{ marginTop: 16, color: '#718096', fontWeight: '600' }}>Analyzing your spending patterns...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 16, color: '#1E2340', lineHeight: 26, fontWeight: '500' }}>
                  {insightsText}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: '#F1F5F9', marginTop: 24, marginBottom: 0 }]} 
              onPress={() => setShowInsightsModal(false)}
            >
              <Text style={[styles.saveBtnText, { color: '#475569' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Details Modal ───────────────────────── */}
      <Modal 
        visible={!!selectedCategory || !!selectedGroup} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => { setSelectedCategory(null); setSelectedGroup(null); }}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {selectedCategory && <Text style={{ fontSize: 24 }}>{(CATEGORY_META[selectedCategory] || CATEGORY_META.other).icon}</Text>}
              {selectedGroup && <Text style={{ fontSize: 24 }}>👥</Text>}
              <Text style={styles.modalTitle}>
                {selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : ''}
                {selectedGroup ? selectedGroup.groupName : ''} Details
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedCategory(null); setSelectedGroup(null); }}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
          </View>

          {loadingCategory ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : categoryExpenses.length === 0 ? (
            <Text style={[styles.emptyText, { marginTop: 40, textAlign: 'center' }]}>No detailed expenses found.</Text>
          ) : (
            <FlatList
              data={categoryExpenses}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={styles.detailsList}
              renderItem={({ item }) => {
                const isUM = item.categoryId === 'udhaar' && item.note === 'Udhaar Mila';
                const ac = isUM ? '#10B981' : '#EF4444';
                const ap = isUM ? '+' : '−';
                return (
                  <TouchableOpacity 
                    style={styles.detailRow}
                    activeOpacity={0.7}
                    onPress={() => setSelectedExpenseForAction(item)}
                  >
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailTitle} numberOfLines={1}>
                        {item.note || 'No Title'}
                        {item.with_user ? ` • ${item.with_user}` : ''}
                      </Text>
                      <Text style={styles.detailDate}>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {item.type}</Text>
                    </View>
                    <Text style={[styles.detailAmount, { color: ac }]}>{ap}₹{parseFloat(item.amount).toFixed(0)}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Expense Action Modal ───────────────────────── */}
      <ExpenseActionModal
        visible={!!selectedExpenseForAction}
        expense={selectedExpenseForAction}
        onClose={() => setSelectedExpenseForAction(null)}
        onRefresh={() => { setSelectedCategory(null); setSelectedGroup(null); fetchAnalytics(); }}
      />

      {/* ── Custom Date Range Modal ───────────────────── */}
      <Modal
        visible={showCustomDateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E2340', marginBottom: 20 }}>
              📅 Custom Date Range
            </Text>
            <Text style={styles.fieldLabel}>Start Date (DD/MM/YYYY)</Text>
            <TextInput
              style={styles.input}
              value={customStartDate}
              onChangeText={setCustomStartDate}
              placeholder="01/04/2025"
              placeholderTextColor="#A0AEC0"
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.fieldLabel}>End Date (DD/MM/YYYY)</Text>
            <TextInput
              style={styles.input}
              value={customEndDate}
              onChangeText={setCustomEndDate}
              placeholder="30/04/2025"
              placeholderTextColor="#A0AEC0"
              keyboardType="numeric"
              maxLength={10}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#5A67D8', marginTop: 8 }]}
              onPress={() => {
                const s = parseDate(customStartDate);
                const e = parseDate(customEndDate);
                if (!s || !e) {
                  Alert.alert('Invalid Dates', 'Please enter dates in DD/MM/YYYY format.');
                  return;
                }
                if (new Date(s) > new Date(e)) {
                  Alert.alert('Invalid Range', 'Start date must be before end date.');
                  return;
                }
                setShowCustomDateModal(false);
                fetchAnalytics();
              }}
            >
              <Text style={styles.saveBtnText}>Apply & View Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowCustomDateModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  groupRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  groupRowName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, width: 80 },

  // Category Details Modal Styles
  modalSafe: { flex: 1, backgroundColor: '#F8F9FF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAECF5' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340' },
  modalCancel: { fontSize: 16, fontWeight: '600', color: '#5A67D8' },
  detailsList: { padding: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAECF5' },
  detailInfo: { flex: 1, paddingRight: 16 },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#1E2340', marginBottom: 4 },
  detailDate: { fontSize: 13, color: '#718096', textTransform: 'capitalize' },
  detailAmount: { fontSize: 18, fontWeight: '800', color: '#EF4444' },

  // Bottom Sheet Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#EAECF5', borderRadius: 14, padding: 14, fontSize: 16, color: '#1E2340', marginBottom: 16 },
  saveBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#718096', fontSize: 15, fontWeight: '600' }
});
