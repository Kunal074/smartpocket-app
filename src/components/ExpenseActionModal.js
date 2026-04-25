import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Pencil, Trash2, MessageSquare, X, Check } from 'lucide-react-native';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

/**
 * ExpenseActionModal
 *
 * Props:
 *  - visible: bool
 *  - expense: { id, note, amount, date, categoryId, type, with_user }
 *    expense.type === 'personal' → uses /api/expenses/[id]
 *    expense.type === 'group'    → uses /api/group-expenses/[id]
 *  - onClose: () => void
 *  - onRefresh: () => void  (called after edit/delete/comment to reload data)
 */
export default function ExpenseActionModal({ visible, expense, onClose, onRefresh, isHistoryView }) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'edit' | 'comment'
  const [editNote, setEditNote] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();

  if (!expense) return null;

  const isUdhaarMila = expense.categoryId === 'udhaar' && expense.note === 'Udhaar Mila';
  const isUdhaarDiya = expense.categoryId === 'udhaar' && expense.note === 'Udhaar Diya';
  const amountColor = isUdhaarMila ? '#10B981' : isUdhaarDiya ? '#EF4444' : '#EF4444';

  const canEdit = true; // Everyone can edit
  const canDelete = expense.type === 'personal'; // No one can delete group expenses

  const handleOpen = (m) => {
    if (m === 'edit') {
      setEditNote(expense.note || '');
      setEditAmount(String(expense.amount || ''));
    }
    if (m === 'comment') {
      setComment(expense.note || '');
    }
    setMode(m);
  };

  const handleClose = () => {
    setMode('menu');
    setEditNote('');
    setEditAmount('');
    setComment('');
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Kya aap sach mein is expense ko delete karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (expense.type === 'personal') {
                await api.delete(`/expenses/${expense.id}`);
              } else {
                await api.delete(`/group-expenses/${expense.id}`);
              }
              Alert.alert('Deleted!', 'Expense delete ho gaya.');
              handleClose();
              onRefresh?.();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Delete failed');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editAmount || isNaN(editAmount) || parseFloat(editAmount) <= 0) {
      Alert.alert('Error', 'Valid amount daalen');
      return;
    }
    setLoading(true);
    try {
      if (expense.type === 'personal') {
        await api.put(`/expenses/${expense.id}`, {
          amount: parseFloat(editAmount),
          categoryId: expense.categoryId || 'other',
          date: expense.date,
          note: editNote,
        });
      } else {
        await api.put(`/group-expenses/${expense.id}`, {
          amount: parseFloat(editAmount),
          note: editNote,
        });
      }
      Alert.alert('Saved!', 'Expense update ho gaya.');
      handleClose();
      onRefresh?.();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComment = async () => {
    setLoading(true);
    try {
      if (expense.type === 'personal') {
        await api.put(`/expenses/${expense.id}`, {
          amount: expense.amount,
          categoryId: expense.categoryId || 'other',
          date: expense.date,
          note: comment,
        });
      } else {
        await api.put(`/group-expenses/${expense.id}`, { note: comment });
      }
      Alert.alert('Saved!', 'Comment add ho gaya.');
      handleClose();
      onRefresh?.();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to save comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <SafeAreaView style={styles.sheet}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.pill} />
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {expense.note || expense.categoryId || 'Expense'}
            {expense.with_user ? ` • ${expense.with_user}` : ''}
          </Text>
          <Text style={[styles.sheetAmount, { color: amountColor }]}>
            {isUdhaarMila ? '+' : '−'}₹{parseFloat(expense.amount).toFixed(0)}
          </Text>
        </View>

        {/* Menu Mode */}
        {mode === 'menu' && (
          <View style={styles.actionsRow}>
            {canEdit ? (
              <>
                {!isHistoryView && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpen('edit')}>
                    <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                      <Pencil color="#5A67D8" size={20} />
                    </View>
                    <Text style={styles.actionLabel}>Edit</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpen('comment')}>
                  <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
                    <MessageSquare color="#10B981" size={20} />
                  </View>
                  <Text style={styles.actionLabel}>Comment</Text>
                </TouchableOpacity>

                {canDelete && (
                  <TouchableOpacity style={styles.actionBtn} onPress={handleDelete} disabled={loading}>
                    <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
                      {loading ? <ActivityIndicator color="#EF4444" size="small" /> : <Trash2 color="#EF4444" size={20} />}
                    </View>
                    <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </View>
        )}

        {/* Edit Mode */}
        {mode === 'edit' && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.formInput}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
            />
            <Text style={styles.formLabel}>Title / Note</Text>
            <TextInput
              style={styles.formInput}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Enter note"
            />
            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('menu')}>
                <X color="#718096" size={18} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Check color="#fff" size={18} />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Comment Mode */}
        {mode === 'comment' && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Comment / Note</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={comment}
              onChangeText={setComment}
              placeholder="Kuch likhein..."
              multiline
            />
            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('menu')}>
                <X color="#718096" size={18} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveComment} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Check color="#fff" size={18} />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: 240,
  },
  pill: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16
  },
  sheetHeader: { alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1E2340', textAlign: 'center', marginBottom: 4 },
  sheetAmount: { fontSize: 28, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  actionBtn: { alignItems: 'center', gap: 8 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#4A5568' },

  formSection: { gap: 10 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#718096', marginTop: 8 },
  formInput: {
    backgroundColor: '#F8F9FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#EAECF5',
    fontSize: 15, color: '#1E2340'
  },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#F8F9FF',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#EAECF5'
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#718096' },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#5A67D8',
    borderRadius: 12, padding: 14,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
