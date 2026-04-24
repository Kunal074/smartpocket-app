import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Users, Receipt, Check } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { colors } from '../theme/colors';
import { api } from '../api/client';

const CATEGORIES = [
  { id: 'food', icon: '🍔' }, { id: 'transport', icon: '🚕' },
  { id: 'shopping', icon: '🛍️' }, { id: 'bills', icon: '📄' },
  { id: 'entertainment', icon: '🎬' },
];

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');
  const [reloadKey, setReloadKey] = useState(0);

  // Add Expense Modal
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expCategory, setExpCategory] = useState('food');
  const [saving, setSaving] = useState(false);

  // Add Member Modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadData() {
        setLoading(true);
        try {
          const [grpRes, expRes, balRes, memRes] = await Promise.all([
            api.get(`/groups/${groupId}`),
            api.get(`/groups/${groupId}/expenses`),
            api.get(`/groups/${groupId}/balances`),
            api.get(`/groups/${groupId}/members`),
          ]);
          if (!isActive) return;
          setGroup(grpRes.data);
          const expList = Array.isArray(expRes.data) ? expRes.data : (expRes.data.expenses ?? []);
          setExpenses(expList);
          setBalances(Array.isArray(balRes.data) ? balRes.data : (balRes.data.balances ?? []));
          setMembers(Array.isArray(memRes.data) ? memRes.data : []);
        } catch (e) {
          console.warn('GroupDetail fetch error:', e.message);
        } finally {
          if (isActive) setLoading(false);
        }
      }

      loadData();

      return () => { isActive = false; };
    }, [groupId, reloadKey])
  );

  const handleAddExpense = async () => {
    if (!expAmount || isNaN(expAmount)) { alert('Enter a valid amount'); return; }
    if (members.length === 0) { alert('Add at least one member first'); return; }
    setSaving(true);
    try {
      await api.post(`/groups/${groupId}/expenses`, {
        title: expNote || 'Group expense',
        amount: parseFloat(expAmount),
        category: expCategory,
        split_type: 'equal',
        note: expNote || '',
        date: new Date().toISOString().slice(0, 10),
        members: members.map(m => ({ user_id: m.user_id })),
      });
      setShowAddExpense(false);
      setExpAmount(''); setExpNote(''); setExpCategory('food');
      setReloadKey(k => k + 1);
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenContacts = async () => {
    setShowAddMember(true);
    setContactSearch('');
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const valid = data.filter(c => c.phoneNumbers?.length > 0).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setContacts(valid);
      } else {
        alert('Permission required');
      }
    } catch (e) { console.error(e); }
    finally { setLoadingContacts(false); }
  };

  const handleAddMember = async (contact) => {
    const phone = contact.phoneNumbers?.[0]?.number?.replace(/\s/g, '');
    if (!phone) { alert('This contact has no phone number'); return; }
    try {
      await api.post(`/groups/${groupId}/members`, { phone });
      alert(`\u2705 ${contact.name} added to the group!`);
      setReloadKey(k => k + 1);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const handleAddByEmail = async () => {
    const email = memberEmail.trim();
    if (!email || !email.includes('@')) { alert('Enter a valid email address'); return; }
    try {
      await api.post(`/groups/${groupId}/members`, { email });
      alert(`\u2705 Member added successfully!`);
      setMemberEmail('');
      setReloadKey(k => k + 1);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const totalSpend = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
        <TouchableOpacity onPress={handleOpenContacts} style={styles.iconBtn}>
          <Users color={colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.textPrimary }]}>
          <Text style={styles.statLabelDark}>Total Spend</Text>
          <Text style={styles.statValueDark}>₹{totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: 'rgba(43,107,243,0.1)' }]}>
          <Text style={styles.statLabelLight}>Members</Text>
          <Text style={styles.statValueLight}>{group?.member_count ?? '–'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'expenses' && styles.tabActive]} onPress={() => setActiveTab('expenses')}>
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'balances' && styles.tabActive]} onPress={() => setActiveTab('balances')}>
          <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>Balances</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'members' && styles.tabActive]} onPress={() => setActiveTab('members')}>
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>Members</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'expenses' ? (
        <FlatList
          data={expenses}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to add the first one</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.expenseRow}>
              <View style={styles.expenseIconBg}>
                <Text>{CATEGORIES.find(c => c.id === item.categoryId)?.icon ?? '💸'}</Text>
              </View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseNote}>{item.note || 'Expense'}</Text>
                <Text style={styles.expenseBy}>paid by {item.paidByName || 'you'}</Text>
              </View>
              <Text style={styles.expenseAmount}>₹{parseFloat(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
          )}
        />
      ) : activeTab === 'members' ? (
        <FlatList
          data={members}
          keyExtractor={(item, i) => i.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No members yet</Text>
              <Text style={styles.emptySubtitle}>Tap the people icon to add members</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.expenseRow}>
              <View style={[styles.expenseIconBg, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
                  {item.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseNote}>{item.name}</Text>
                <Text style={styles.expenseBy}>{item.email}</Text>
              </View>
              <View style={[styles.expenseIconBg, { backgroundColor: item.role === 'admin' ? colors.primaryLight : colors.background }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: item.role === 'admin' ? colors.primary : colors.textMuted }}>
                  {item.role}
                </Text>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={balances}
          keyExtractor={(item, i) => i.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyTitle}>All settled up! 🎉</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.balanceRow}>
              <View style={styles.balanceAvatar}>
                <Text style={styles.balanceAvatarText}>{item.fromName?.charAt(0) || '?'}</Text>
              </View>
              <Text style={styles.balanceText}>
                <Text style={styles.balanceName}>{item.fromName}</Text>
                <Text> owes </Text>
                <Text style={styles.balanceName}>{item.toName}</Text>
              </Text>
              <Text style={[styles.balanceAmount, { color: colors.danger }]}>₹{parseFloat(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddExpense(true)}>
        <Plus color={colors.surface} size={28} />
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal visible={showAddExpense} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Group Expense</Text>
            <TouchableOpacity onPress={() => setShowAddExpense(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput style={styles.amountInput} placeholder="0" placeholderTextColor={colors.borderMedium} keyboardType="numeric" value={expAmount} onChangeText={setExpAmount} autoFocus />
            </View>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.id} style={[styles.catBtn, expCategory === c.id && styles.catBtnActive]} onPress={() => setExpCategory(c.id)}>
                  <Text style={styles.catIcon}>{c.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.noteInput} placeholder="What was this for?" placeholderTextColor={colors.textMuted} value={expNote} onChangeText={setExpNote} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddExpense} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.surface} /> : <><Check color={colors.surface} size={20} /><Text style={styles.saveBtnText}>Save</Text></>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={showAddMember} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <TouchableOpacity onPress={() => setShowAddMember(false)}>
              <Text style={styles.modalCancel}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Email Input Section */}
          <View style={styles.emailSection}>
            <Text style={styles.emailSectionTitle}>Add by Email</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={styles.emailInput}
                placeholder="friend@email.com"
                placeholderTextColor={colors.textMuted}
                value={memberEmail}
                onChangeText={setMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.emailAddBtn} onPress={handleAddByEmail}>
                <Text style={styles.emailAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or pick from contacts</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Search Bar */}
          <View style={styles.contactSearchContainer}>
            <Text style={styles.contactSearchIcon}>🔍</Text>
            <TextInput
              style={styles.contactSearchInput}
              placeholder="Search contacts..."
              placeholderTextColor={colors.textMuted}
              value={contactSearch}
              onChangeText={setContactSearch}
              autoCorrect={false}
            />
            {contactSearch.length > 0 && (
              <TouchableOpacity onPress={() => setContactSearch('')}>
                <Text style={{ color: colors.textMuted, fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingContacts
            ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            : <FlatList
                data={contacts.filter(c => {
                  const q = contactSearch.toLowerCase();
                  if (!q) return true;
                  const nameMatch = (c.name || '').toLowerCase().includes(q);
                  const phoneMatch = (c.phoneNumbers?.[0]?.number || '').includes(q);
                  return nameMatch || phoneMatch;
                })}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 15 }}>No contacts found</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.contactRow} onPress={() => handleAddMember(item)}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>{item.name?.charAt(0) || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactPhone}>{item.phoneNumbers[0]?.number}</Text>
                    </View>
                    <View style={styles.addBtn}>
                      <Plus color={colors.surface} size={16} />
                    </View>
                  </TouchableOpacity>
                )}
              />
          }
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
  iconBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 16 },
  statLabelDark: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  statValueDark: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statLabelLight: { fontSize: 11, color: colors.primary, marginBottom: 6 },
  statValueLight: { fontSize: 22, fontWeight: '800', color: colors.primary },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.borderLight },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.surface },
  list: { padding: 16, paddingBottom: 100 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  expenseIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseNote: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  expenseBy: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  balanceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  balanceAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  balanceAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  balanceText: { flex: 1, fontSize: 14, color: colors.textSecondary },
  balanceName: { fontWeight: '700', color: colors.textPrimary },
  balanceAmount: { fontSize: 16, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  modalSafe: { flex: 1, backgroundColor: colors.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  modalCancel: { fontSize: 16, fontWeight: '600', color: colors.primary },
  modalContent: { padding: 24 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  rupee: { fontSize: 40, fontWeight: '700', color: colors.textPrimary, marginRight: 4 },
  amountInput: { fontSize: 56, fontWeight: '800', color: colors.textPrimary, minWidth: 100 },
  catRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  catBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  catBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  catIcon: { fontSize: 22 },
  noteInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 16, padding: 16, fontSize: 16, color: colors.textPrimary, marginBottom: 24 },
  saveBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveBtnText: { color: colors.surface, fontSize: 18, fontWeight: '700' },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  contactAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  contactName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  contactPhone: { fontSize: 13, color: colors.textSecondary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  contactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 4,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    height: 48,
  },
  contactSearchIcon: { fontSize: 16, marginRight: 8 },
  contactSearchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  emailSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emailInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: colors.textPrimary,
  },
  emailAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailAddBtnText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
