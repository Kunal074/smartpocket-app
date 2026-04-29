import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, ActivityIndicator, Alert, Dimensions, TextInput,
  KeyboardAvoidingView, Modal, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users, Plus, TrendingUp, TrendingDown, ArrowRight,
  Wallet, Bell, ChevronRight, Receipt, GitFork, Zap
} from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { colors } from '../theme/colors';
import ExpenseActionModal from '../components/ExpenseActionModal';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

const { width } = Dimensions.get('window');

const CATEGORY_ICONS = {
  food: '🍔', transport: '🚕', shopping: '🛍️',
  bills: '📄', entertainment: '🎬', udhaar: '🤝', other: '💸'
};

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balanceData, setBalanceData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Udhaar Modal State
  const [showUdhaarModal, setShowUdhaarModal] = useState(false);
  const [udhaarFriendId, setUdhaarFriendId] = useState(null);
  const [udhaarAmount, setUdhaarAmount] = useState('');
  const [udhaarType, setUdhaarType] = useState('gave'); // 'gave' | 'got'
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Direct Add Friend State
  const [newFriendContact, setNewFriendContact] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // Contacts Modal State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [nativeContacts, setNativeContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Friend Details State
  const [selectedFriendForDetails, setSelectedFriendForDetails] = useState(null);
  const [friendExpenses, setFriendExpenses] = useState([]);

  // Expense Action Modal State
  const [selectedExpenseForAction, setSelectedExpenseForAction] = useState(null);

  const handleFriendClick = (friend) => {
    setSelectedFriendForDetails(friend);
    const filtered = expenses.filter(e => e.with_user === friend.name);
    setFriendExpenses(filtered);
  };

  const refreshExpenses = async () => {
    try {
      const expRes = await api.get('/expenses');
      const list = expRes.data.expenses ?? (Array.isArray(expRes.data) ? expRes.data : []);
      setExpenses(list);
    } catch (e) { console.warn('refresh failed', e); }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchAll = async () => {
        try {
          const [expRes, balRes, grpRes, friendsRes] = await Promise.all([
            api.get('/expenses'),
            api.get('/balances').catch(() => ({ data: { owedToYou: 0, youOwe: 0, totalNetBalance: 0, byPerson: [] } })),
            api.get('/groups').catch(() => ({ data: [] })),
            api.get('/friends').catch(() => ({ data: [] })),
          ]);
          if (isActive) {
            const list = expRes.data.expenses ?? (Array.isArray(expRes.data) ? expRes.data : []);
            setExpenses(list);
            setBalanceData(balRes.data);
            setGroups(grpRes.data.slice(0, 3));
            setFriends(friendsRes.data || []);
          }
        } catch (error) {
          if (error.response?.status === 401 && isActive) logout();
        } finally {
          if (isActive) setIsLoading(false);
        }
      };
      fetchAll();
      return () => { isActive = false; };
    }, [logout])
  );

  const handleAddUdhaar = async () => {
    if (!udhaarFriendId) { Alert.alert('Error', 'Please select a friend'); return; }
    if (!udhaarAmount || isNaN(udhaarAmount) || parseFloat(udhaarAmount) <= 0) { Alert.alert('Error', 'Please enter a valid amount'); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        title: udhaarType === 'gave' ? 'Udhaar Diya' : 'Udhaar Mila',
        amount: parseFloat(udhaarAmount),
        split_type: 'custom',
        category: 'udhaar',
        note: 'Quick Udhaar',
        paid_by: udhaarType === 'gave' ? user.id : udhaarFriendId,
        members: [{ user_id: udhaarType === 'gave' ? udhaarFriendId : user.id, amount: parseFloat(udhaarAmount) }]
      };
      await api.post('/expenses/direct', payload);
      setShowUdhaarModal(false);
      setUdhaarAmount('');
      setUdhaarFriendId(null);
      // Soft reload
      const balRes = await api.get('/balances');
      setBalanceData(balRes.data);
      refreshExpenses();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenContacts = async () => {
    setShowAddContactModal(true);
    setContactSearch('');
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const valid = data.filter(c => c.phoneNumbers?.length > 0).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setNativeContacts(valid);
      } else {
        Alert.alert('Permission required');
      }
    } catch (e) { console.error(e); }
    finally { setLoadingContacts(false); }
  };

  const handleAddFriendDirectly = async (contactStr) => {
    if (!contactStr) return;
    
    setIsAddingFriend(true);
    try {
      const isEmail = contactStr.includes('@');
      const payload = isEmail ? { email: contactStr } : { phone: contactStr };
      
      await api.post('/friends', payload);
      Alert.alert('Success', 'Friend added!');
      setNewFriendContact('');
      setShowAddContactModal(false);
      
      // Refresh friends list
      const friendsRes = await api.get('/friends');
      const newList = friendsRes.data || [];
      setFriends(newList);
      
      // Auto-select if it's the only one or newly added
      if (newList.length > 0) {
        setUdhaarFriendId(newList[newList.length - 1].user_id);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleAddFromNativeContact = (contact) => {
    const phone = contact.phoneNumbers?.[0]?.number?.replace(/\s/g, '');
    if (!phone) { Alert.alert('Error', 'This contact has no phone number'); return; }
    handleAddFriendDirectly(phone);
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);
  const firstName = user?.name?.split(' ')[0] || 'there';

  const todaySpend = expenses
    .filter(e => e.date?.slice(0, 10) === today)
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const monthSpend = expenses
    .filter(e => e.date?.slice(0, 7) === month)
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const netBalance = balanceData?.totalNetBalance || 0;
  const owedToYou = balanceData?.owedToYou || 0;
  const youOwe = balanceData?.youOwe || 0;
  const isPositive = netBalance >= 0;

  const recent = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  const udhaarList = [];
  if (balanceData?.byPerson) {
    balanceData.byPerson.forEach(person => {
      const directGroup = person.groups?.find(g => g.groupName === 'Udhaar (Direct)');
      if (directGroup && Math.abs(directGroup.net) > 0.01) {
        udhaarList.push({
          userId: person.userId,
          name: person.name,
          net: directGroup.net
        });
      }
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#5A67D8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ───────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>{(user?.name || 'U')[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Brand Hero Card ──────────────────────────── */}
        <LinearGradient
          colors={['#1E2340', '#2D3561', '#3D4E8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Brand label */}
          <View style={styles.heroBrand}>
            <View style={styles.heroBrandDot} />
            <Text style={styles.heroBrandText}>SmartPocket</Text>
          </View>

          {/* Net Balance */}
          <Text style={styles.heroLabel}>Net Balance</Text>
          <Text style={[styles.heroAmount, { color: isPositive ? '#6EE7B7' : '#FCA5A5' }]}>
            {isPositive ? '+' : ''}₹{Math.abs(netBalance).toFixed(0)}
          </Text>

          {/* Owed / Owe row */}
          <View style={styles.heroRow}>
            <TouchableOpacity 
              style={styles.heroStat}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MainTabs', { screen: 'SmartSplit', params: { screen: 'Balances' } })}
            >
              <TrendingUp color="#6EE7B7" size={14} />
              <Text style={styles.heroStatLabel}>Aapko Lena Hai</Text>
              <Text style={[styles.heroStatAmount, { color: '#6EE7B7' }]}>₹{owedToYou.toFixed(0)}</Text>
            </TouchableOpacity>
            <View style={styles.heroStatDivider} />
            <TouchableOpacity 
              style={styles.heroStat}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MainTabs', { screen: 'SmartSplit', params: { screen: 'Balances' } })}
            >
              <TrendingDown color="#FCA5A5" size={14} />
              <Text style={styles.heroStatLabel}>Aapko Dena Hai</Text>
              <Text style={[styles.heroStatAmount, { color: '#FCA5A5' }]}>₹{youOwe.toFixed(0)}</Text>
            </TouchableOpacity>
            <View style={styles.heroStatDivider} />
            <TouchableOpacity 
              style={styles.heroStat}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Analytics', { filter: 'month' })}
            >
              <Wallet color="#A5B4FC" size={14} />
              <Text style={styles.heroStatLabel}>This Month</Text>
              <Text style={[styles.heroStatAmount, { color: '#A5B4FC' }]}>₹{monthSpend.toFixed(0)}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── SmartSplit Entry Card ────────────────────── */}
        <TouchableOpacity
          style={styles.smartSplitCard}
          onPress={() => navigation.navigate('MainTabs', { screen: 'SmartSplit' })}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#5A67D8', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.smartSplitGradient}
          >
            <View style={styles.smartSplitLeft}>
              <View style={styles.smartSplitIconBg}>
                <GitFork color="#fff" size={22} />
              </View>
              <View>
                <Text style={styles.smartSplitTitle}>SmartSplit</Text>
                <Text style={styles.smartSplitSubtitle}>
                  {groups.length > 0
                    ? `${groups.length} active group${groups.length > 1 ? 's' : ''} · ${balanceData?.byPerson?.length || 0} pending`
                    : 'Split bills with friends & groups'}
                </Text>
              </View>
            </View>
            <View style={styles.smartSplitArrow}>
              <ArrowRight color="#fff" size={20} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Quick Actions ────────────────────────────── */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AddExpense')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#EEF2FF' }]}>
              <Plus color="#5A67D8" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'SmartSplit', params: { screen: 'Groups' } })}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#F0FDF4' }]}>
              <Users color="#10B981" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('CreateGroup')}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#FFF7ED' }]}>
              <Zap color="#F59E0B" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>New Group</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'SmartSplit', params: { screen: 'Balances' } })}>
            <View style={[styles.quickBtnIcon, { backgroundColor: '#FDF4FF' }]}>
              <Receipt color="#A855F7" size={20} />
            </View>
            <Text style={styles.quickBtnLabel}>Balances</Text>
          </TouchableOpacity>
        </View>

        {/* ── Udhaar (Direct Balances) ─────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Udhaar</Text>
              <Text style={styles.sectionSubtitle}>Direct Friends</Text>
            </View>
            <TouchableOpacity style={styles.addUdhaarBtn} onPress={() => setShowUdhaarModal(true)}>
              <Plus color={colors.primary} size={16} />
              <Text style={styles.addUdhaarText}>Add</Text>
            </TouchableOpacity>
          </View>
          {udhaarList.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8, paddingBottom: 10 }} style={{ marginHorizontal: -20 }}>
              {udhaarList.map((friend) => {
                const isOwed = friend.net > 0;
                return (
                  <TouchableOpacity 
                    key={friend.userId} 
                    style={styles.udhaarCard}
                    activeOpacity={0.7}
                    onPress={() => handleFriendClick(friend)}
                  >
                    <View style={styles.udhaarAvatar}>
                      <Text style={styles.udhaarInitials}>{friend.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.udhaarName} numberOfLines={1}>{friend.name.split(' ')[0]}</Text>
                    <View style={[styles.udhaarBadge, { backgroundColor: isOwed ? '#ECFDF5' : '#FEF2F2' }]}>
                      <Text style={[styles.udhaarAmount, { color: isOwed ? '#10B981' : '#EF4444' }]}>
                        {isOwed ? '+' : '-'}₹{Math.abs(friend.net).toFixed(0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyUdhaar}>
              <Text style={styles.emptyUdhaarText}>No direct Udhaar. Add friends in Non-Group expenses!</Text>
            </View>
          )}
        </View>

        {/* ── Active Groups Preview ─────────────────────── */}
        {groups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Groups</Text>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('MainTabs', { screen: 'SmartSplit', params: { screen: 'Groups' } })}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight color="#5A67D8" size={14} />
              </TouchableOpacity>
            </View>
            {groups.map((group, i) => {
              const net = parseFloat(group.net_balance || 0);
              const isOwed = net > 0;
              return (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupRow}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id, groupName: group.name })}
                >
                  <View style={[styles.groupIconBg, { backgroundColor: ['#EEF2FF', '#F0FDF4', '#FFF7ED'][i % 3] }]}>
                    <Users color={['#5A67D8', '#10B981', '#F59E0B'][i % 3]} size={18} />
                  </View>
                  <View style={styles.groupRowInfo}>
                    <Text style={styles.groupRowName}>{group.name}</Text>
                    <Text style={styles.groupRowMeta}>{group.member_count} members</Text>
                  </View>
                  {net !== 0 && (
                    <Text style={[styles.groupRowBal, { color: isOwed ? '#10B981' : '#EF4444' }]}>
                      {isOwed ? '+' : '-'}₹{Math.abs(net).toFixed(0)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Recent Transactions ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
          </View>
          {recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyText}>No personal expenses yet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddExpense')}>
                <Text style={styles.emptyAction}>+ Add your first one</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recent.map(expense => {
              const isToday = expense.date?.slice(0, 10) === today;
              const expDate = new Date(expense.date);
              const icon = CATEGORY_ICONS[expense.categoryId] || '💸';
              const isUdhaarMila = expense.categoryId === 'udhaar' && expense.note === 'Udhaar Mila';
              const isUdhaarDiya = expense.categoryId === 'udhaar' && expense.note === 'Udhaar Diya';
              const amountColor = isUdhaarMila ? '#10B981' : '#EF4444';
              const amountPrefix = isUdhaarMila ? '+' : '−';
              return (
                <TouchableOpacity 
                  key={expense.id} 
                  style={styles.txRow}
                  activeOpacity={0.7}
                  onPress={() => setSelectedExpenseForAction(expense)}
                >
                  <View style={styles.txIconBg}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>
                      {expense.note || expense.categoryId || 'Expense'}
                      {expense.with_user ? ` • ${expense.with_user}` : ''}
                    </Text>
                    <Text style={styles.txDate}>
                      {isToday ? 'Today' : expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: amountColor }]}>{amountPrefix}₹{parseFloat(expense.amount).toFixed(0)}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Quick Udhaar Modal ───────────────────────── */}
      {showUdhaarModal && (
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Udhaar</Text>
              <TouchableOpacity onPress={() => setShowUdhaarModal(false)}>
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.udhaarToggleRow}>
              <TouchableOpacity 
                style={[styles.udhaarToggleBtn, udhaarType === 'gave' && styles.udhaarToggleBtnActive]}
                onPress={() => setUdhaarType('gave')}
              >
                <TrendingUp color={udhaarType === 'gave' ? '#fff' : '#10B981'} size={18} style={{ marginRight: 6 }} />
                <Text style={[styles.udhaarToggleText, udhaarType === 'gave' && { color: '#fff' }]}>I Gave</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.udhaarToggleBtn, udhaarType === 'got' && styles.udhaarToggleBtnActive]}
                onPress={() => setUdhaarType('got')}
              >
                <TrendingDown color={udhaarType === 'got' ? '#fff' : '#EF4444'} size={18} style={{ marginRight: 6 }} />
                <Text style={[styles.udhaarToggleText, udhaarType === 'got' && { color: '#fff' }]}>I Got</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalLabel, { marginBottom: 0 }]}>Select Friend</Text>
            </View>

            {friends.length === 0 ? (
              <View style={styles.addFriendDirectContainer}>
                <Text style={styles.noFriendsText}>Add a friend to start Udhaar</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsStrip}>
                {friends.map(f => (
                  <TouchableOpacity 
                    key={f.user_id} 
                    style={[styles.friendSelectCard, udhaarFriendId === f.user_id && styles.friendSelectCardActive]}
                    onPress={() => setUdhaarFriendId(f.user_id)}
                  >
                    <View style={[styles.friendAvatar, udhaarFriendId === f.user_id && styles.friendAvatarActive]}>
                      <Text style={[styles.friendInitials, udhaarFriendId === f.user_id && { color: '#fff' }]}>
                        {f.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.friendName, udhaarFriendId === f.user_id && { color: colors.primary }]}>
                      {f.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.quickAddFriendRow}>
              <TouchableOpacity 
                style={[styles.quickAddFriendBtn, { flex: 1, backgroundColor: '#EEF2FF', paddingVertical: 14 }]}
                onPress={handleOpenContacts}
              >
                <Text style={[styles.quickAddFriendBtnText, { color: '#5A67D8' }]}>+ Browse Contacts / Add Email</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { marginTop: 20 }]}>Amount</Text>
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputSymbol}>₹</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={udhaarAmount}
                onChangeText={setUdhaarAmount}
              />
            </View>

            <TouchableOpacity 
              style={styles.modalSubmitBtn} 
              onPress={handleAddUdhaar}
              disabled={isSubmitting || friends.length === 0}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Save Udhaar</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── Add Contact Modal ───────────────────────── */}
      {showAddContactModal && (
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { flex: 0.9 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity onPress={() => setShowAddContactModal(false)}>
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
                  value={newFriendContact}
                  onChangeText={setNewFriendContact}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.emailAddBtn} 
                  onPress={() => handleAddFriendDirectly(newFriendContact.trim())}
                  disabled={isAddingFriend}
                >
                  {isAddingFriend ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.emailAddBtnText}>Add</Text>}
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

            {/* Contacts List */}
            {loadingContacts ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.contactsList}>
                {nativeContacts
                  .filter(c => c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || 
                               c.phoneNumbers?.[0]?.number?.includes(contactSearch))
                  .map(c => {
                    const phone = c.phoneNumbers?.[0]?.number;
                    return (
                      <TouchableOpacity 
                        key={c.id} 
                        style={styles.contactRow}
                        onPress={() => handleAddFromNativeContact(c)}
                      >
                        <View style={styles.contactAvatar}>
                          <Text style={styles.contactInitials}>{c.name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactName}>{c.name}</Text>
                          <Text style={styles.contactPhone}>{phone}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                })}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── Friend Details Modal ───────────────────────── */}
      <Modal 
        visible={!!selectedFriendForDetails} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedFriendForDetails(null)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24 }}>👤</Text>
              <Text style={styles.modalTitle}>{selectedFriendForDetails?.name}'s Details</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFriendForDetails(null)}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
          </View>

          {friendExpenses.length === 0 ? (
            <Text style={[styles.emptyText, { marginTop: 40 }]}>No recent transactions found with this friend.</Text>
          ) : (
            <FlatList
              data={friendExpenses}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={styles.detailsList}
              renderItem={({ item }) => {
                const isUM = item.categoryId === 'udhaar' && item.note === 'Udhaar Mila';
                const isUD = item.categoryId === 'udhaar' && item.note === 'Udhaar Diya';
                const ac = isUM ? '#10B981' : '#EF4444';
                const ap = isUM ? '+' : '−';
                return (
                  <TouchableOpacity 
                    style={styles.detailRow}
                    activeOpacity={0.7}
                    onPress={() => setSelectedExpenseForAction(item)}
                  >
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailTitle} numberOfLines={1}>{item.note || item.categoryId || 'Expense'}</Text>
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
        onRefresh={refreshExpenses}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: '#5A67D8', fontWeight: '600', marginBottom: 2 },
  userName: { fontSize: 26, fontWeight: '900', color: '#1E2340', letterSpacing: -0.5 },
  profileBtn: { padding: 2 },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#5A67D8', justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },

  // Hero card
  heroCard: {
    marginHorizontal: 20, borderRadius: 24, padding: 22, marginBottom: 16,
  },
  heroBrand: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  heroBrandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6EE7B7' },
  heroBrandText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: '600' },
  heroAmount: { fontSize: 44, fontWeight: '900', letterSpacing: -2, marginBottom: 20 },
  heroRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 14,
    justifyContent: 'space-around',
  },
  heroStat: { alignItems: 'center', gap: 4 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 4 },
  heroStatAmount: { fontSize: 15, fontWeight: '800' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  // SmartSplit card
  smartSplitCard: { marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  smartSplitGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 18,
  },
  smartSplitLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  smartSplitIconBg: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  smartSplitTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 3 },
  smartSplitSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  smartSplitArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 24,
  },
  quickBtn: { alignItems: 'center', gap: 8 },
  quickBtnIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  quickBtnLabel: { fontSize: 11, fontWeight: '700', color: '#4A5568' },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E2340' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#5A67D8' },

  // Group rows
  groupRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#EAECF5',
  },
  groupIconBg: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  groupRowInfo: { flex: 1 },
  groupRowName: { fontSize: 15, fontWeight: '700', color: '#1E2340', marginBottom: 2 },
  groupRowMeta: { fontSize: 12, color: '#718096' },
  groupRowBal: { fontSize: 16, fontWeight: '800' },

  // Udhaar / Direct Friends
  sectionSubtitle: { fontSize: 12, color: '#718096', fontWeight: '600' },
  udhaarCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14, marginRight: 12,
    width: 100, alignItems: 'center', borderWidth: 1, borderColor: '#EAECF5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1
  },
  udhaarAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  udhaarInitials: { fontSize: 18, fontWeight: '800', color: '#5A67D8' },
  udhaarName: { fontSize: 13, fontWeight: '700', color: '#1E2340', marginBottom: 6 },
  udhaarBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  udhaarAmount: { fontSize: 12, fontWeight: '800' },
  emptyUdhaar: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#EAECF5',
  },
  emptyUdhaarText: { fontSize: 13, color: '#718096' },

  // Transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#EAECF5',
  },
  txIconBg: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#EEF2FF', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: '700', color: '#1E2340', marginBottom: 3 },
  txDate: { fontSize: 12, color: '#718096' },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#EF4444' },

  // Empty
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: '#EAECF5',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#718096', marginBottom: 8 },
  emptyAction: { fontSize: 14, fontWeight: '700', color: '#5A67D8' },

  // Quick Udhaar Modal
  addUdhaarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  addUdhaarText: { fontSize: 12, fontWeight: '700', color: '#5A67D8' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 100 },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E2340' },
  modalCancel: { fontSize: 15, fontWeight: '600', color: '#718096' },
  udhaarToggleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  udhaarToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#EAECF5' },
  udhaarToggleBtnActive: { backgroundColor: '#1E2340', borderColor: '#1E2340' },
  udhaarToggleText: { fontSize: 14, fontWeight: '700', color: '#4A5568' },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#4A5568', marginBottom: 12 },
  noFriendsText: { fontSize: 13, color: '#718096', lineHeight: 20, backgroundColor: '#F8F9FF', padding: 14, borderRadius: 12 },
  friendsStrip: { marginHorizontal: -24, paddingHorizontal: 24 },
  friendSelectCard: { alignItems: 'center', marginRight: 16, opacity: 0.5 },
  friendSelectCardActive: { opacity: 1 },
  friendAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  friendAvatarActive: { backgroundColor: '#5A67D8' },
  friendInitials: { fontSize: 18, fontWeight: '800', color: '#5A67D8' },
  friendName: { fontSize: 13, fontWeight: '600', color: '#718096' },
  modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FF', borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#EAECF5', marginBottom: 24 },
  modalInputSymbol: { fontSize: 24, fontWeight: '600', color: '#718096', marginRight: 8 },
  modalInput: { flex: 1, fontSize: 24, fontWeight: '800', color: '#1E2340', paddingVertical: 16 },
  modalSubmitBtn: { backgroundColor: '#5A67D8', borderRadius: 16, padding: 18, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  // Quick Add Friend inside Modal
  addFriendDirectContainer: { marginBottom: 12 },
  quickAddFriendRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 10 },
  quickAddFriendInput: { flex: 1, backgroundColor: '#F8F9FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#EAECF5', fontSize: 13, color: '#1E2340' },
  quickAddFriendBtn: { backgroundColor: '#5A67D8', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  quickAddFriendBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Contacts Modal Styles
  emailSection: { backgroundColor: '#F8F9FF', borderRadius: 16, padding: 16, marginBottom: 20 },
  emailSectionTitle: { fontSize: 13, fontWeight: '700', color: '#4A5568', marginBottom: 10 },
  emailRow: { flexDirection: 'row', gap: 10 },
  emailInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAECF5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1E2340' },
  emailAddBtn: { backgroundColor: '#1E2340', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  emailAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EAECF5' },
  dividerText: { marginHorizontal: 14, fontSize: 12, fontWeight: '600', color: '#A0AEC0', textTransform: 'uppercase' },
  contactSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FF', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#EAECF5', marginBottom: 16 },
  contactSearchIcon: { fontSize: 16, marginRight: 8 },
  contactSearchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1E2340' },
  contactsList: { flex: 1 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  contactInitials: { fontSize: 16, fontWeight: '700', color: '#5A67D8' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '600', color: '#1E2340', marginBottom: 4 },
  contactPhone: { fontSize: 13, color: '#718096' },

  // Details Modal Styles
  modalSafe: { flex: 1, backgroundColor: '#F8F9FF' },
  detailsList: { padding: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAECF5' },
  detailInfo: { flex: 1, paddingRight: 16 },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#1E2340', marginBottom: 4 },
  detailDate: { fontSize: 13, color: '#718096', textTransform: 'capitalize' },
  detailAmount: { fontSize: 18, fontWeight: '800', color: '#EF4444' }
});
