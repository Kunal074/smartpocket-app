import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, TextInput,
  Platform, KeyboardAvoidingView, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Trash2, Target, CheckCircle2 } from 'lucide-react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { useLanguageStore } from '../store/languageStore';

const { width } = Dimensions.get('window');

const ICONS = ['🎯', '🚗', '✈️', '🏠', '📱', '🎓', '💍', '💰'];
const COLORS = ['#5A67D8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function SavingsScreen({ navigation }) {
  const { t } = useLanguageStore();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);

  // Add Goal State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState(''); // DD/MM/YYYY
  const [selectedIcon, setSelectedIcon] = useState('🎯');
  const [selectedColor, setSelectedColor] = useState('#5A67D8');

  // Add Funds State
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  const fetchGoals = async () => {
    try {
      const res = await api.get('/savings');
      setGoals(res.data.goals || []);
    } catch (e) {
      console.warn('Fetch savings error', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchGoals();
  }, []));

  const handleAddGoal = async () => {
    if (!name.trim() || !targetAmount || isNaN(targetAmount)) {
      Alert.alert('Error', 'Please enter a valid name and target amount');
      return;
    }
    setSaving(true);
    try {
      let parsedDate = null;
      if (targetDate.trim()) {
        const parts = targetDate.trim().split('/');
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          const d = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
          if (!isNaN(d.getTime())) parsedDate = d.toISOString().slice(0, 10);
        }
      }

      await api.post('/savings', {
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        target_date: parsedDate,
        icon: selectedIcon,
        color: selectedColor,
      });

      setShowAddModal(false);
      resetAddForm();
      fetchGoals();
    } catch (e) {
      Alert.alert('Error', 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFunds = async () => {
    if (!fundAmount || isNaN(fundAmount) || parseFloat(fundAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount to add');
      return;
    }
    setSaving(true);
    try {
      const newTotal = parseFloat(selectedGoal.saved_amount) + parseFloat(fundAmount);
      const isCompleted = newTotal >= parseFloat(selectedGoal.target_amount);

      await api.patch(`/savings/${selectedGoal.id}`, {
        saved_amount: newTotal,
        is_completed: isCompleted,
      });

      setShowFundModal(false);
      setFundAmount('');
      setSelectedGoal(null);
      fetchGoals();
      
      if (isCompleted) {
        Alert.alert('🎉 Goal Reached!', `Congratulations! You've reached your goal for ${selectedGoal.name}.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to add funds.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, goalName) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${goalName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/savings/${id}`);
            fetchGoals();
          } catch { Alert.alert('Error', 'Failed to delete.'); }
        }
      }
    ]);
  };

  const resetAddForm = () => {
    setName(''); setTargetAmount(''); setTargetDate('');
    setSelectedIcon('🎯'); setSelectedColor('#5A67D8');
  };

  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.saved_amount), 0);
  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target_amount), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#1E2340" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('savings.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Plus color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Overview Card */}
      <LinearGradient colors={['#10B981', '#059669']} style={styles.summaryCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.summaryLabel}>{t('savings.total_saved')}</Text>
        <Text style={styles.summaryAmount}>₹{totalSaved.toFixed(0)}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(overallProgress, 100)}%`, backgroundColor: '#fff' }]} />
          </View>
          <Text style={styles.progressText}>{overallProgress.toFixed(1)}% of ₹{totalTarget.toFixed(0)}</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>{t('savings.no_goals_title')}</Text>
              <Text style={styles.emptySubtitle}>{t('savings.no_goals_sub')}</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                <Plus color="#fff" size={18} />
                <Text style={styles.emptyBtnText}>{t('savings.create_goal')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            goals.map(goal => {
              const saved = parseFloat(goal.saved_amount);
              const target = parseFloat(goal.target_amount);
              const progress = Math.min((saved / target) * 100, 100);
              const isCompleted = goal.is_completed;

              return (
                <View key={goal.id} style={[styles.card, isCompleted && { borderColor: '#10B981', borderWidth: 2 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.iconBg, { backgroundColor: goal.color + '20' }]}>
                        <Text style={styles.iconText}>{goal.icon}</Text>
                      </View>
                      <View>
                        <Text style={styles.cardName}>{goal.name}</Text>
                        <Text style={styles.cardMeta}>
                          {isCompleted ? t('savings.goal_reached') : goal.target_date ? `Target: ${new Date(goal.target_date).toLocaleDateString('en-IN')}` : t('savings.no_deadline')}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(goal.id, goal.name)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                      <Trash2 color="#FCA5A5" size={18} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.goalProgressContainer}>
                    <View style={styles.goalAmounts}>
                      <Text style={styles.savedAmount}>₹{saved.toFixed(0)}</Text>
                      <Text style={styles.targetAmount}>of ₹{target.toFixed(0)}</Text>
                    </View>
                    <View style={styles.goalBarBg}>
                      <View style={[styles.goalBarFill, { width: `${progress}%`, backgroundColor: goal.color }]} />
                    </View>
                    <Text style={styles.pctText}>{progress.toFixed(0)}%</Text>
                  </View>

                  {!isCompleted && (
                    <TouchableOpacity 
                      style={[styles.addFundsBtn, { backgroundColor: goal.color + '15' }]}
                      onPress={() => { setSelectedGoal(goal); setShowFundModal(true); }}
                    >
                      <Plus color={goal.color} size={16} />
                      <Text style={[styles.addFundsText, { color: goal.color }]}>{t('savings.add_funds')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>{t('savings.new_goal')}</Text>

                <Text style={styles.fieldLabel}>{t('savings.goal_name')}</Text>
                <TextInput style={styles.input} placeholder="e.g. New MacBook" placeholderTextColor="#A0AEC0" value={name} onChangeText={setName} />

                <Text style={styles.fieldLabel}>{t('savings.target_amount')}</Text>
                <TextInput style={styles.input} placeholder="0" placeholderTextColor="#A0AEC0" keyboardType="numeric" value={targetAmount} onChangeText={setTargetAmount} />

                <Text style={styles.fieldLabel}>{t('savings.target_date')}</Text>
                <TextInput style={styles.input} placeholder="DD/MM/YYYY" placeholderTextColor="#A0AEC0" keyboardType="numeric" maxLength={10} value={targetDate} onChangeText={setTargetDate} />

                <Text style={styles.fieldLabel}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 16 }}>
                  {ICONS.map(i => (
                    <TouchableOpacity key={i} style={[styles.pickerItem, selectedIcon === i && styles.pickerItemActive]} onPress={() => setSelectedIcon(i)}>
                      <Text style={styles.pickerIcon}>{i}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 24 }}>
                  {COLORS.map(c => (
                    <TouchableOpacity key={c} style={[styles.colorItem, selectedColor === c && { borderColor: c, borderWidth: 2 }]} onPress={() => setSelectedColor(c)}>
                      <View style={[styles.colorCircle, { backgroundColor: c }]} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10B981' }]} onPress={handleAddGoal} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('savings.create_goal')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Funds Modal */}
      <Modal visible={showFundModal} animationType="fade" transparent onRequestClose={() => setShowFundModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
          <View style={styles.centerModalOverlay}>
            <View style={styles.centerModalSheet}>
              <Text style={styles.modalTitle}>{t('savings.add_funds')} — {selectedGoal?.name}</Text>
              
              <Text style={styles.fieldLabel}>{t('savings.amount_to_add')}</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0" 
                placeholderTextColor="#A0AEC0" 
                keyboardType="numeric" 
                value={fundAmount} 
                onChangeText={setFundAmount} 
                autoFocus
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.cancelBtn, { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12 }]} onPress={() => setShowFundModal(false)}>
                  <Text style={[styles.cancelBtnText, { color: '#475569' }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { flex: 1, marginBottom: 0, backgroundColor: selectedGoal?.color || '#10B981' }]} onPress={handleAddFunds} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('savings.add_funds')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },

  summaryCard: { marginHorizontal: 20, borderRadius: 20, padding: 24, marginBottom: 20 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 6 },
  summaryAmount: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 16 },
  progressContainer: { gap: 8 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

  list: { paddingHorizontal: 20, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EAECF5', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardHeaderLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 24 },
  cardName: { fontSize: 17, fontWeight: '800', color: '#1E2340', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#718096', fontWeight: '500' },

  goalProgressContainer: { marginBottom: 16 },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  savedAmount: { fontSize: 22, fontWeight: '800', color: '#1E2340' },
  targetAmount: { fontSize: 14, color: '#A0AEC0', fontWeight: '600' },
  goalBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  goalBarFill: { height: '100%', borderRadius: 4 },
  pctText: { fontSize: 12, color: '#718096', fontWeight: '700', textAlign: 'right' },

  addFundsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  addFundsText: { fontSize: 14, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340', marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#EAECF5', borderRadius: 14, padding: 14, fontSize: 16, color: '#1E2340', marginBottom: 16 },

  pickerItem: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#EAECF5' },
  pickerItemActive: { backgroundColor: '#EEF2FF', borderColor: '#5A67D8' },
  pickerIcon: { fontSize: 20 },

  colorItem: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, padding: 2 },
  colorCircle: { width: '100%', height: '100%', borderRadius: 20 },

  saveBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#718096', fontSize: 15, fontWeight: '600' },

  centerModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  centerModalSheet: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 5 },
});
