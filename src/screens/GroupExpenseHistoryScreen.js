import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  FlatList, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, History, FileText } from 'lucide-react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';

export default function GroupExpenseHistoryScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      async function fetchHistory() {
        try {
          const res = await api.get(`/groups/${groupId}/history`);
          if (isActive) setHistory(res.data.history || []);
        } catch (e) {
          console.warn('History fetch error', e);
        } finally {
          if (isActive) setLoading(false);
        }
      }
      fetchHistory();
      return () => { isActive = false; };
    }, [groupId])
  );

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <FileText color="#5A67D8" size={18} />
          </View>
          <View style={styles.titleArea}>
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.actionText}>updated {item.expense_title || item.expense_note || 'an expense'}</Text>
          </View>
        </View>
        <View style={styles.detailsArea}>
          <Text style={styles.changesText}>{item.changes_summary}</Text>
          <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5A67D8" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <History color="#A0AEC0" size={48} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No edits yet.</Text>
              <Text style={styles.emptySub}>All updates to expenses will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#EAECF5'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E2340' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  
  historyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EAECF5',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center'
  },
  titleArea: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#1E2340' },
  actionText: { fontSize: 13, color: '#718096' },
  
  detailsArea: { backgroundColor: '#F8F9FF', padding: 12, borderRadius: 12 },
  changesText: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  timeText: { fontSize: 11, color: '#A0AEC0', textAlign: 'right' },
  
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#4A5568' },
  emptySub: { fontSize: 14, color: '#A0AEC0', marginTop: 4 }
});
