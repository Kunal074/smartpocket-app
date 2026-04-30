import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, TextInput,
  Platform, Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Trash2, RefreshCw, Calendar, ChevronRight } from 'lucide-react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';

const CATEGORY_META = {
  food:          { icon: '🍔', color: '#F59E0B' },
  transport:     { icon: '🚕', color: '#3B82F6' },
  shopping:      { icon: '🛍️', color: '#8B5CF6' },
  bills:         { icon: '📄', color: '#EF4444' },
  entertainment: { icon: '🎬', color: '#EC4899' },
  other:         { icon: '💸', color: '#6B7280' },
};

const FREQUENCIES = [
  { id: 'daily',   label: 'Daily' },
  { id: 'weekly',  label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly',  label: 'Yearly' },
];

const CATEGORIES = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'other'];

export default function RecurringScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('bills');
  const [frequency, setFrequency] = useState('monthly');

  const fetchRecurring = async () => {
    try {
      const res = await api.get('/recurring');
      setItems(res.data.recurring || []);
    } catch (e) {
      console.warn('Fetch recurring error', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchRecurring();
  }, []));

  const handleAdd = async () => {
    if (!note.trim() || !amount || isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid name and amount');
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/recurring', {
        note: note.trim(),
        amount: parseFloat(amount),
        category_id: category,
        frequency,
        start_date: today,
      });
      setShowModal(false);
      setNote(''); setAmount(''); setCategory('bills'); setFrequency('monthly');
      fetchRecurring();
    } catch (e) {
      Alert.alert('Error', 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('Delete', `Remove "${name}" from recurring?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/recurring/${id}`);
            fetchRecurring();
          } catch { Alert.alert('Error', 'Failed to delete.'); }
        }
      }
    ]);
  };

  const handleToggle = async (id, currentValue) => {
    try {
      await api.patch(`/recurring/${id}`, { is_active: !currentValue });
      fetchRecurring();
    } catch { Alert.alert('Error', 'Failed to update.'); }
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(dateStr); due.setHours(0,0,0,0);
    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Due today!';
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return `in ${diff} day${diff > 1 ? 's' : ''}`;
  };

  const totalMonthly = items
    .filter(i => i.is_active)
    .reduce((sum, i) => {
      const amt = parseFloat(i.amount);
      if (i.frequency === 'daily') return sum + amt * 30;
      if (i.frequency === 'weekly') return sum + amt * 4;
      if (i.frequency === 'yearly') return sum + amt / 12;
      return sum + amt;
    }, 0);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#1E2340" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recurring</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <LinearGradient colors={['#5A67D8', '#7C3AED']} style={styles.summaryCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.summaryLabel}>Monthly Recurring Spend</Text>
        <Text style={styles.summaryAmount}>₹{totalMonthly.toFixed(0)}</Text>
        <Text style={styles.summarySubtitle}>{items.filter(i => i.is_active).length} active subscription{items.filter(i => i.is_active).length !== 1 ? 's' : ''}</Text>
      </LinearGradient>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#5A67D8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔄</Text>
              <Text style={styles.emptyTitle}>No Recurring Expenses</Text>
              <Text style={styles.emptySubtitle}>Add subscriptions, rent, or bills that repeat automatically.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
                <Plus color="#fff" size={18} />
                <Text style={styles.emptyBtnText}>Add First Recurring</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((item) => {
              const meta = CATEGORY_META[item.category_id] || CATEGORY_META.other;
              const daysUntil = getDaysUntil(item.next_date);
              const isOverdue = daysUntil.includes('overdue');
              const isDueToday = daysUntil.includes('today');

              return (
                <View key={item.id} style={[styles.card, !item.is_active && styles.cardDisabled]}>
                  <View style={[styles.iconBg, { backgroundColor: meta.color + '20' }]}>
                    <Text style={styles.iconText}>{meta.icon}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, !item.is_active && { color: '#A0AEC0' }]}>{item.note}</Text>
                    <View style={styles.cardMeta}>
                      <View style={[styles.freqBadge, { backgroundColor: meta.color + '15' }]}>
                        <RefreshCw color={meta.color} size={10} />
                        <Text style={[styles.freqText, { color: meta.color }]}>{item.frequency}</Text>
                      </View>
                      <View style={[styles.dueBadge, { backgroundColor: isOverdue ? '#FEF2F2' : isDueToday ? '#FFFBEB' : '#F0FDF4' }]}>
                        <Calendar color={isOverdue ? '#EF4444' : isDueToday ? '#F59E0B' : '#10B981'} size={10} />
                        <Text style={[styles.dueText, { color: isOverdue ? '#EF4444' : isDueToday ? '#F59E0B' : '#10B981' }]}>{daysUntil}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardAmount, !item.is_active && { color: '#A0AEC0' }]}>₹{parseFloat(item.amount).toFixed(0)}</Text>
                    <View style={styles.cardActions}>
                      <Switch
                        value={item.is_active}
                        onValueChange={() => handleToggle(item.id, item.is_active)}
                        trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
                        thumbColor={item.is_active ? '#5A67D8' : '#A0AEC0'}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                      <TouchableOpacity onPress={() => handleDelete(item.id, item.note)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Trash2 color="#FCA5A5" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Recurring Expense</Text>

            <Text style={styles.fieldLabel}>Name / Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Netflix, Gym, Rent"
              placeholderTextColor="#A0AEC0"
              value={note}
              onChangeText={setNote}
            />

            <Text style={styles.fieldLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#A0AEC0"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map(cat => {
                const meta = CATEGORY_META[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, category === cat && { backgroundColor: meta.color, borderColor: meta.color }]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={styles.catChipIcon}>{meta.icon}</Text>
                    <Text style={[styles.catChipText, category === cat && { color: '#fff' }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {FREQUENCIES.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.freqChip, frequency === f.id && styles.freqChipActive]}
                  onPress={() => setFrequency(f.id)}
                >
                  <Text style={[styles.freqChipText, frequency === f.id && styles.freqChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Recurring</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#5A67D8', justifyContent: 'center', alignItems: 'center' },

  summaryCard: { marginHorizontal: 20, borderRadius: 20, padding: 24, marginBottom: 20 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 6 },
  summaryAmount: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 4 },
  summarySubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  list: { paddingHorizontal: 20, paddingBottom: 40 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAECF5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardDisabled: { opacity: 0.55 },
  iconBg: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1E2340', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 6 },
  freqBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  freqText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dueText: { fontSize: 10, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: { fontSize: 17, fontWeight: '800', color: '#1E2340' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#5A67D8', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340', marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#EAECF5', borderRadius: 14, padding: 14, fontSize: 16, color: '#1E2340', marginBottom: 16 },

  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EAECF5', marginRight: 8, backgroundColor: '#F8F9FF' },
  catChipIcon: { fontSize: 16 },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#4A5568', textTransform: 'capitalize' },

  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  freqChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#EAECF5', alignItems: 'center', backgroundColor: '#F8F9FF' },
  freqChipActive: { backgroundColor: '#5A67D8', borderColor: '#5A67D8' },
  freqChipText: { fontSize: 13, fontWeight: '600', color: '#4A5568' },
  freqChipTextActive: { color: '#fff' },

  saveBtn: { backgroundColor: '#5A67D8', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#718096', fontSize: 15, fontWeight: '600' },
});
