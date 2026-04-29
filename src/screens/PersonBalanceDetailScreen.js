import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Linking
} from 'react-native';
import { ChevronLeft, Globe, Users, Home, Heart, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

export default function PersonBalanceDetailScreen({ route, navigation }) {
  const { person } = route.params;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Expenses'); // Expenses | Settlements
  const [activeSubTab, setActiveSubTab] = useState('Groups'); // Direct | Groups

  const [settleModal, setSettleModal] = useState(null); // stores the group object
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);

  const [settlements, setSettlements] = useState([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'Settlements') {
        fetchSettlements();
      }
    }, [activeTab])
  );

  const fetchSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const res = await api.get(`/settlements?userId=${person.userId}`);
      setSettlements(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSettlements(false);
    }
  };

  const owedToYou = person.net > 0;
  const amt = Math.abs(person.net).toFixed(2);
  const amtColor = owedToYou ? '#10B981' : '#E53E3E';

  const groupsBalance = (person.groups || []).reduce((s, g) => s + g.net, 0);
  // Direct = total net minus group net (simplified to 0 for now)
  const directBalance = parseFloat((person.net - groupsBalance).toFixed(2));

  const getGroupIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('trip') || n.includes('goa') || n.includes('travel')) return <Globe color="#E67E22" size={22} />;
    if (n.includes('home')) return <Home color="#3182CE" size={22} />;
    if (n.includes('couple')) return <Heart color="#E53E3E" size={22} />;
    return <Globe color="#718096" size={22} />;
  };

  const confirmSettle = async () => {
    if (!settleAmount || isNaN(settleAmount) || parseFloat(settleAmount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setSettling(true);
    try {
      const isOwed = settleModal.net > 0;
      await api.post(`/groups/${settleModal.groupId}/settlements`, {
        paid_by: isOwed ? person.userId : user.id,
        paid_to: isOwed ? user.id : person.userId,
        amount: parseFloat(settleAmount),
      });
      setSettleModal(null);
      if (activeTab === 'Settlements') fetchSettlements();
      Alert.alert('✅ Settled!', `Payment of \u20b9${settleAmount} recorded successfully.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to record settlement');
    } finally {
      setSettling(false);
    }
  };

  const handleUPIPayment = async () => {
    if (!settleAmount || isNaN(settleAmount) || parseFloat(settleAmount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    const upiId = person.upi_id;
    if (!upiId) {
      Alert.alert('No UPI ID', `${person.name} has not added their UPI ID.`);
      return;
    }
    const amount = parseFloat(settleAmount).toFixed(2);
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(person.name)}&am=${amount}&cu=INR`;
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) await Linking.openURL(upiUrl);
      else Alert.alert('Error', 'No UPI app found on your phone.');
    } catch (e) {
      Alert.alert('Error', 'Could not open UPI app.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.textPrimary} size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{person.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Banner */}
      <View style={styles.summaryBanner}>
        <View>
          <Text style={styles.summaryLabel}>
            {owedToYou ? 'OVERALL AAPKO MILEGA' : 'OVERALL AAPKO DENA HAI'}
          </Text>
          <Text style={[styles.summaryAmount, { color: amtColor }]}>₹{amt}</Text>
        </View>
        <View style={styles.summaryActions}>
          <TouchableOpacity
            style={styles.remindBtnOutline}
            onPress={() => Alert.alert('Remind', `Reminder sent to ${person.name}!`)}
          >
            <Text style={styles.remindBtnOutlineText}>Remind</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settleUpBtn}
            onPress={() => Alert.alert('Coming Soon', 'Settlement flow coming soon!')}
          >
            <Text style={styles.settleUpBtnText}>Settle Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar: Expenses | Settlements */}
      <View style={styles.tabBar}>
        {['Expenses', 'Settlements'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Expenses' && (
        <>
          {/* Sub Tabs: Direct | Groups */}
          <View style={styles.subTabBar}>
            <TouchableOpacity
              style={[styles.subTabBtn, activeSubTab === 'Direct' && styles.subTabBtnActive]}
              onPress={() => setActiveSubTab('Direct')}
            >
              <Text style={[styles.subTabText, activeSubTab === 'Direct' && styles.subTabTextActive]}>Direct</Text>
              <Text style={[styles.subTabAmount, activeSubTab === 'Direct' && styles.subTabAmountActive]}>
                ₹{Math.abs(directBalance).toFixed(2)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, activeSubTab === 'Groups' && styles.subTabBtnActive]}
              onPress={() => setActiveSubTab('Groups')}
            >
              <Text style={[styles.subTabText, activeSubTab === 'Groups' && styles.subTabTextActive]}>Groups</Text>
              <Text style={[styles.subTabAmount, activeSubTab === 'Groups' && styles.subTabAmountActive]}>
                ₹{Math.abs(groupsBalance).toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {activeSubTab === 'Groups' ? (
              (person.groups || []).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No group balances</Text>
                </View>
              ) : (
                (person.groups || []).map((group) => {
                  const groupOwedToYou = group.net > 0;
                  const groupAmt = Math.abs(group.net).toFixed(0);
                  return (
                    <View key={group.groupId} style={styles.groupCard}>
                      <View style={styles.groupCardTop}>
                        <View style={styles.groupIconBg}>
                          {getGroupIcon(group.groupName)}
                        </View>
                        <View style={styles.groupCardInfo}>
                          <Text style={styles.groupCardName}>{group.groupName}</Text>
                          <Text style={styles.groupCardMembers}>{group.memberCount} Members</Text>
                        </View>
                        <Text style={[styles.groupCardAmount, { color: groupOwedToYou ? '#10B981' : '#E53E3E' }]}>
                          {groupOwedToYou ? `Aapko milega ₹${groupAmt}` : `Aapko dena hai ₹${groupAmt}`}
                        </Text>
                      </View>
                      <View style={styles.groupCardDivider} />
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                          style={[styles.groupRemindBtn, { flex: 1 }]}
                          onPress={() => Alert.alert('Remind', `Reminder sent to ${person.name} for ${group.groupName}!`)}
                        >
                          <Text style={styles.groupRemindBtnText}>Remind</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.groupSettleBtn, { flex: 1 }]}
                          onPress={() => {
                            setSettleAmount(groupAmt);
                            setSettleModal(group);
                          }}
                        >
                          <Text style={styles.groupSettleBtnText}>Settle Up</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No direct expenses</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {activeTab === 'Settlements' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loadingSettlements ? (
            <ActivityIndicator size="large" color="#5A67D8" style={{ marginTop: 40 }} />
          ) : settlements.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No settlements yet</Text>
            </View>
          ) : (
            settlements.map((s, idx) => {
              const isYouPaid = s.paid_by === user.id;
              const dateObj = new Date(s.created_at);
              const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              return (
                <View key={s.id || idx} style={styles.settlementCard}>
                  <View style={styles.settlementIcon}>
                    <Text style={{ fontSize: 20 }}>💸</Text>
                  </View>
                  <View style={styles.settlementInfo}>
                    <Text style={styles.settlementTitle}>
                      {isYouPaid ? `You paid ${s.payee_name}` : `${s.payer_name} paid you`}
                    </Text>
                    <Text style={styles.settlementDate}>{dateStr} • {s.group_name}</Text>
                  </View>
                  <Text style={[styles.settlementAmount, { color: isYouPaid ? '#1E2340' : '#10B981' }]}>
                    ₹{parseFloat(s.amount).toFixed(0)}
                  </Text>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Settle Up Modal */}
      <Modal visible={!!settleModal} transparent animationType="slide" onRequestClose={() => setSettleModal(null)}>
        <TouchableOpacity style={styles.settleModalBackdrop} activeOpacity={1} onPress={() => setSettleModal(null)} />
        <View style={styles.settleModalSheet}>
          <View style={styles.settleModalPill} />
          <Text style={styles.settleModalTitle}>Record Settlement</Text>
          <Text style={styles.settleModalSub}>
            {settleModal?.net > 0 ? `${person.name} → Aap` : `Aap → ${person.name}`}
          </Text>
          <View style={styles.settleModalAmountRow}>
            <Text style={styles.settleModalCurrency}>₹</Text>
            <TextInput
              style={styles.settleModalInput}
              keyboardType="numeric"
              value={settleAmount}
              onChangeText={setSettleAmount}
              placeholder="0"
              placeholderTextColor="#A0AEC0"
            />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.settleModalBtn, { flex: 1, backgroundColor: '#EDF2F7' }, settling && { opacity: 0.7 }]}
              onPress={confirmSettle}
              disabled={settling}
            >
              {settling
                ? <ActivityIndicator color="#5A67D8" />
                : <Text style={[styles.settleModalBtnText, { color: '#4A5568' }]}>Already Paid</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settleModalBtn, { flex: 1, backgroundColor: '#10B981' }, (settleModal?.net > 0) && { opacity: 0.5 }]}
              onPress={handleUPIPayment}
              disabled={settleModal?.net > 0} // Can't pay them if they owe you
            >
              <Text style={styles.settleModalBtnText}>Pay via UPI</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.settleModalCancel} onPress={() => setSettleModal(null)}>
            <Text style={styles.settleModalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F4F8FB',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '800', color: colors.textPrimary,
  },

  summaryBanner: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  summaryAmount: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  summaryActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  remindBtnOutline: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#5A67D8',
  },
  remindBtnOutlineText: { fontSize: 14, fontWeight: '700', color: '#5A67D8' },
  settleUpBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#5A67D8',
  },
  settleUpBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabBtn: {
    flex: 1, paddingVertical: 14,
    alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#5A67D8' },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#5A67D8', fontWeight: '800' },

  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 30,
  },
  subTabBtn: { alignItems: 'center', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  subTabBtnActive: { borderBottomColor: '#5A67D8' },
  subTabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  subTabTextActive: { color: colors.textPrimary, fontWeight: '800' },
  subTabAmount: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  subTabAmountActive: { color: '#5A67D8', fontWeight: '700' },

  content: { flex: 1, padding: 16 },

  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  groupCardTop: { flexDirection: 'row', alignItems: 'center' },
  groupIconBg: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FDF2E9',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  groupCardInfo: { flex: 1 },
  groupCardName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  groupCardMembers: { fontSize: 12, color: colors.textSecondary },
  groupCardAmount: { fontSize: 14, fontWeight: '800' },
  groupCardDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 14 },
  groupRemindBtn: {
    backgroundColor: '#F0FFF4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  groupRemindBtnText: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  groupSettleBtn: {
    backgroundColor: '#5A67D8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  groupSettleBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: colors.textSecondary },

  settlementCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  settlementIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0FFF4',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  settlementInfo: { flex: 1 },
  settlementTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  settlementDate: { fontSize: 13, color: colors.textSecondary },
  settlementAmount: { fontSize: 16, fontWeight: '800' },

  settleModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  settleModalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    position: 'absolute', bottom: 0, width: '100%', alignItems: 'center',
  },
  settleModalPill: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', marginBottom: 20 },
  settleModalTitle: { fontSize: 20, fontWeight: '900', color: '#1E2340', marginBottom: 4 },
  settleModalSub: { fontSize: 14, color: '#718096', marginBottom: 24 },
  settleModalAmountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  settleModalCurrency: { fontSize: 32, fontWeight: '800', color: '#1E2340', marginRight: 8 },
  settleModalInput: { fontSize: 48, fontWeight: '900', color: '#1E2340', minWidth: 120, textAlign: 'center', borderBottomWidth: 3, borderBottomColor: '#5A67D8' },
  settleModalBtn: { backgroundColor: '#5A67D8', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', height: 56 },
  settleModalBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  settleModalCancel: { paddingVertical: 12 },
  settleModalCancelText: { color: '#A0AEC0', fontSize: 15, fontWeight: '600' },
});
