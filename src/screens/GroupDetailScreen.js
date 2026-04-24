import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput,
  Image, Share, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Share2, Download, MessageSquare, Settings, Search, Plus } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { colors } from '../theme/colors';
import { api } from '../api/client';

const CATEGORIES = [
  { id: 'food', icon: '🍔' }, { id: 'transport', icon: '🚕' },
  { id: 'shopping', icon: '🛍️' }, { id: 'bills', icon: '📄' },
  { id: 'entertainment', icon: '🎬' }, { id: 'other', icon: '💸' }
];

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expense'); // expense, summary, balance
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

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
          setBalances(balRes.data?.simplifiedDebts ?? []);
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

  const navigateToAddExpense = () => {
    navigation.navigate('GroupAddExpense', { groupId, groupName, members });
  };

  const handleShare = async () => {
    try {
      const expenseSummary = expenses.map(e => `- ${e.title || e.note}: \u20B9${e.amount} (paid by ${e.paid_by_name || 'you'})`).join('\n');
      const balanceSummary = balances.map(b => `- ${b.from?.name} owes ${b.to?.name}: \u20B9${b.amount}`).join('\n');
      
      const message = `\uD83D\uDCCA *${groupName} Summary*\n\n*Expenses*\n${expenseSummary || 'No expenses yet.'}\n\n*Balances*\n${balanceSummary || 'All settled up!'}`;
      
      await Share.share({
        message,
        title: `${groupName} Summary`,
      });
    } catch (error) {
      console.error(error.message);
    }
  };

  const handleComingSoon = (feature) => {
    Alert.alert("Coming Soon", `${feature} will be available in the next update!`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const filteredExpenses = expenses.filter(e => e.title?.toLowerCase().includes(searchQuery.toLowerCase()) || e.note?.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No expenses yet</Text>
      
      <View style={styles.emptyIllustration}>
        <Text style={{ fontSize: 100 }}>🫂</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={navigateToAddExpense}>
        <Text style={styles.primaryBtnTitle}>Add Your First Expense</Text>
        <Text style={styles.primaryBtnSubtitle}>(Friends will be added automatically)</Text>
      </TouchableOpacity>
      
      <Text style={styles.orText}>OR</Text>
      
      <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenContacts}>
        <Text style={styles.secondaryBtnText}>Add Your Friends First</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
            <ChevronLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtnRight} onPress={handleShare}>
            <Share2 color={colors.primary} size={20} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={activeTab === 'expense' ? filteredExpenses : activeTab === 'balance' ? balances : members}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Hero Section */}
              <View style={styles.heroSection}>
                <Text style={styles.globeEmoji}>{group?.icon || '\uD83C\uDF0D'}</Text>
                <Text style={styles.groupTitle}>{groupName}</Text>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
                  <View style={styles.actionIconBg}>
                    <Download color={colors.primary} size={20} />
                  </View>
                  <Text style={styles.actionText}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem} onPress={() => handleComingSoon('Chat')}>
                  <View style={styles.actionIconBg}>
                    <MessageSquare color={colors.primary} size={20} />
                  </View>
                  <Text style={styles.actionText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem} onPress={() => handleComingSoon('Group Settings')}>
                  <View style={styles.actionIconBg}>
                    <Settings color={colors.primary} size={20} />
                  </View>
                  <Text style={styles.actionText}>Settings</Text>
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'expense' && styles.tabActive]} onPress={() => setActiveTab('expense')}>
                  <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'summary' && styles.tabActive]} onPress={() => setActiveTab('summary')}>
                  <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>Summary</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'balance' && styles.tabActive]} onPress={() => setActiveTab('balance')}>
                  <Text style={[styles.tabText, activeTab === 'balance' && styles.tabTextActive]}>Balance</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              {activeTab === 'expense' && expenses.length > 0 && (
                <View style={styles.searchContainer}>
                  <Search color={colors.primary} size={20} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search expenses..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <View style={styles.premiumTag}>
                    <Text style={styles.premiumTagText}>PREMIUM</Text>
                  </View>
                </View>
              )}
            </>
          }
          ListEmptyComponent={activeTab === 'expense' ? renderEmptyState() : null}
          renderItem={({ item }) => {
            if (activeTab === 'expense') {
              return (
                <View style={styles.expenseRow}>
                  <View style={styles.expenseIconBg}>
                    <Text>{CATEGORIES.find(c => c.id === item.category)?.icon ?? '💸'}</Text>
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseNote}>{item.title || item.note || 'Expense'}</Text>
                    <Text style={styles.expenseBy}>paid by {item.paid_by_name || 'you'}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>₹{parseFloat(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
              );
            }
            if (activeTab === 'balance') {
              return (
                <View style={styles.balanceRow}>
                  <View style={styles.balanceAvatar}>
                    <Text style={styles.balanceAvatarText}>{item.from?.name?.charAt(0) || '?'}</Text>
                  </View>
                  <Text style={styles.balanceText}>
                    <Text style={styles.balanceName}>{item.from?.name}</Text>
                    <Text> owes </Text>
                    <Text style={styles.balanceName}>{item.to?.name}</Text>
                  </Text>
                  <Text style={[styles.balanceAmount, { color: colors.danger }]}>₹{parseFloat(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
              );
            }
            if (activeTab === 'summary') {
              return (
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
              );
            }
            return null;
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      {/* Floating Action Button */}
      {activeTab === 'expense' && expenses.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={navigateToAddExpense}>
          <Plus color={colors.surface} size={32} />
        </TouchableOpacity>
      )}

      {/* Add Member Modal */}
      <Modal 
        visible={showAddMember} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddMember(false)}
      >
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
  safeArea: { flex: 1, backgroundColor: colors.surface, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  container: { flex: 1 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  navBtn: { width: 44, height: 44, backgroundColor: colors.background, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  navBtnRight: { width: 44, height: 44, backgroundColor: colors.primaryLight, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  heroSection: { alignItems: 'center', marginTop: 10, marginBottom: 24 },
  globeEmoji: { fontSize: 80, marginBottom: 12 },
  groupTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  premiumBannerText: { fontSize: 13, fontWeight: '600', color: colors.primary, textDecorationLine: 'underline' },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 20, marginBottom: 32 },
  actionItem: { alignItems: 'center', flex: 1 },
  actionIconBg: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  actionText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },

  tabsContainer: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: colors.background, borderRadius: 20, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16 },
  tabActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },

  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 24, paddingLeft: 16, paddingRight: 8, height: 56, borderWidth: 1, borderColor: colors.borderLight, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, marginBottom: 20 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary },
  premiumTag: { backgroundColor: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  premiumTagText: { color: colors.surface, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 24 },
  emptyIllustration: { marginBottom: 40 },
  primaryBtn: { backgroundColor: colors.primary, width: '100%', paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginBottom: 20 },
  primaryBtnTitle: { color: colors.surface, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  primaryBtnSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  orText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 20 },
  secondaryBtn: { backgroundColor: colors.surface, width: '100%', paddingVertical: 18, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight },
  secondaryBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },

  expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  expenseIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  expenseInfo: { flex: 1 },
  expenseNote: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  expenseBy: { fontSize: 13, color: colors.textSecondary },
  expenseAmount: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  
  balanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  balanceAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  balanceAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  balanceText: { flex: 1, fontSize: 14, color: colors.textSecondary },
  balanceName: { fontWeight: '700', color: colors.textPrimary },
  balanceAmount: { fontSize: 16, fontWeight: '800' },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },

  modalSafe: { flex: 1, backgroundColor: colors.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  modalCancel: { fontSize: 16, fontWeight: '600', color: colors.primary },
  
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  contactAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  contactName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  contactPhone: { fontSize: 13, color: colors.textSecondary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  
  contactSearchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 4, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 14, height: 48 },
  contactSearchIcon: { fontSize: 16, marginRight: 8 },
  contactSearchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  emailSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  emailSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  emailRow: { flexDirection: 'row', gap: 10 },
  emailInput: { flex: 1, backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.borderMedium, paddingHorizontal: 14, height: 48, fontSize: 15, color: colors.textPrimary },
  emailAddBtn: { backgroundColor: '#5a67d8', borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  emailAddBtnText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
});
