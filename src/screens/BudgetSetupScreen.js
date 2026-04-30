import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';

const CATEGORY_META = {
  food: { icon: '🍔', label: 'Food & Dining', color: '#F59E0B' },
  transport: { icon: '🚕', label: 'Transport', color: '#3B82F6' },
  shopping: { icon: '🛍️', label: 'Shopping', color: '#8B5CF6' },
  bills: { icon: '📄', label: 'Bills & Utilities', color: '#EF4444' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#EC4899' },
  other: { icon: '💸', label: 'Other', color: '#6B7280' },
};

export default function BudgetSetupScreen({ navigation }) {
  const [budgets, setBudgets] = useState({
    food: '', transport: '', shopping: '', bills: '', entertainment: '', other: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await api.get('/budgets');
      const loadedBudgets = res.data.budgets || {};
      setBudgets(prev => ({
        ...prev,
        ...Object.keys(loadedBudgets).reduce((acc, key) => {
          if (CATEGORY_META[key]) acc[key] = loadedBudgets[key].toString();
          return acc;
        }, {})
      }));
    } catch (e) {
      console.warn('Failed to fetch budgets', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all budgets in sequence
      const promises = Object.entries(budgets).map(async ([cat, amount]) => {
        if (!amount || amount === '0') return; // Skip empty
        return api.post('/budgets', { category: cat, amount: parseFloat(amount) });
      });
      await Promise.all(promises);
      
      Alert.alert('Success', 'Budgets updated successfully!');
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to save budgets', e);
      Alert.alert('Error', 'Failed to save budgets. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}><ActivityIndicator size="large" color="#5A67D8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monthly Budgets</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.infoCard}>
            <CheckCircle2 color="#10B981" size={24} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Set Your Limits</Text>
              <Text style={styles.infoDesc}>Enter the maximum amount you want to spend in each category this month.</Text>
            </View>
          </View>

          <View style={styles.form}>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <View key={key} style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <View style={[styles.iconBg, { backgroundColor: meta.color + '20' }]}>
                    <Text style={styles.iconText}>{meta.icon}</Text>
                  </View>
                  <Text style={styles.labelText}>{meta.label}</Text>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="numeric"
                    value={budgets[key]}
                    onChangeText={(val) => setBudgets(prev => ({ ...prev, [key]: val }))}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save color="#fff" size={20} />
                <Text style={styles.saveBtnText}>Save Budgets</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  scrollContent: { padding: 20 },
  infoCard: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, gap: 12, marginBottom: 24, borderWidth: 1, borderColor: '#D1FAE5' },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#065F46', marginBottom: 4 },
  infoDesc: { fontSize: 13, color: '#047857', lineHeight: 18 },
  form: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#EAECF5', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18 },
  labelText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 12, height: 44, width: 120, borderWidth: 1, borderColor: '#EAECF5' },
  currencyPrefix: { fontSize: 16, fontWeight: '600', color: '#718096', marginRight: 4 },
  input: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary, padding: 0 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EAECF5' },
  saveBtn: { backgroundColor: '#5A67D8', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#5A67D8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' }
});
