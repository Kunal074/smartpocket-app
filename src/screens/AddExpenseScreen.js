import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, SafeAreaView, Platform, KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';

export default function AddExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('food'); // Default category
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { id: 'food', icon: '🍔', label: 'Food' },
    { id: 'transport', icon: '🚕', label: 'Transport' },
    { id: 'shopping', icon: '🛍️', label: 'Shopping' },
    { id: 'bills', icon: '📄', label: 'Bills' },
    { id: 'entertainment', icon: '🎬', label: 'Fun' },
  ];

  const handleSave = async () => {
    if (!amount || isNaN(amount)) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/expenses', {
        amount: parseFloat(amount),
        categoryId: category,          // backend expects camelCase
        note: note || 'Expense',
        date: new Date().toISOString().slice(0, 10)  // send YYYY-MM-DD only
      });
      
      navigation.goBack();
    } catch (error) {
      const msg = error.response?.data?.error || error.message;
      console.error('Failed to add expense:', msg);
      alert('Failed to save expense: ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <X color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={styles.iconBtn} /> {/* Empty view for balance */}
        </View>

        <View style={styles.content}>
          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.borderMedium}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          {/* Categories Grid */}
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.categoryBtn, isSelected && styles.categoryBtnActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Note Input */}
          <Text style={styles.sectionLabel}>Note</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="What was this for?"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Check color={colors.surface} size={20} />
                <Text style={styles.saveBtnText}>Save Expense</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: 24,
    flex: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.textPrimary,
    minWidth: 100,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  categoryBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 'auto',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  saveBtnText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
  },
});
