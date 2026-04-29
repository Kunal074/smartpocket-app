import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
  Linking, Modal, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Mail, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

export default function BalancesScreen({ navigation }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Friends');

  const [settleModal, setSettleModal] = useState(null); // { person, group }
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await api.get('/balances');
      setData(res.data);
    } catch (e) {
      console.error('Failed to fetch balances', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchBalances();
  }, [fetchBalances]));

  const confirmSettle = async () => {
    if (!settleAmount || isNaN(settleAmount) || parseFloat(settleAmount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setSettling(true);
    try {
      const isOwed = settleModal.group.net > 0;
      await api.post(`/groups/${settleModal.group.groupId}/settlements`, {
        paid_by: isOwed ? settleModal.person.userId : user.id,
        paid_to: isOwed ? user.id : settleModal.person.userId,
        amount: parseFloat(settleAmount),
      });
      setSettleModal(null);
      fetchBalances();
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
    const upiId = settleModal.person.upi_id;
    if (!upiId) {
      Alert.alert('No UPI ID', `${settleModal.person.name} has not added their UPI ID.`);
      return;
    }
    const amount = parseFloat(settleAmount).toFixed(2);
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(settleModal.person.name)}&am=${amount}&cu=INR`;
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) await Linking.openURL(upiUrl);
      else Alert.alert('Error', 'No UPI app found on your phone.');
    } catch (e) {
      Alert.alert('Error', 'Could not open UPI app.');
    }
  };

  const handleSettlePress = (person) => {
    if (!person.groups || person.groups.length === 0) {
       Alert.alert('No Group', 'No shared groups found to settle this balance.');
       return;
    }
    if (person.groups.length > 1) {
       // Multi-group: go to detail screen to settle specific groups
       navigation.navigate('PersonBalanceDetail', { person });
    } else {
       // Single group: settle directly
       setSettleAmount(Math.abs(person.groups[0].net).toFixed(0));
       setSettleModal({ person, group: person.groups[0] });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBalances();
  };

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const AVATAR_COLORS = ['#5A67D8', '#10B981', '#E67E22', '#E53E3E', '#805AD5', '#3182CE'];
  const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5A67D8" />
          <Text style={styles.loadingText}>Calculating balances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const byPerson = data?.byPerson || [];
  const total = (data?.owedToYou || 0) - (data?.youOwe || 0);
  const willPay = data?.youOwe || 0;
  const willGet = data?.owedToYou || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Balances</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Search color="#5A67D8" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5A67D8" />}
      >
        {/* Filter Pill */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterPillActive}>
            <Text style={styles.filterPillTextActive}>Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Boxes */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, styles.summaryBoxDark]}>
            <Text style={styles.summaryBoxLabelDark}>Total</Text>
            <Text style={styles.summaryBoxAmountDark}>₹{Math.abs(total).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxLabel}>Will Pay</Text>
            <Text style={[styles.summaryBoxAmount, { color: '#E53E3E' }]}>₹{willPay.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxLabel}>Will Get</Text>
            <Text style={[styles.summaryBoxAmount, { color: '#10B981' }]}>₹{willGet.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.summaryBox}>
            <Text style={styles.summaryBoxLabel}>Settled</Text>
          </TouchableOpacity>
        </View>

        {/* Invite Banner */}
        <TouchableOpacity style={styles.inviteBanner}>
          <View style={styles.inviteIconBg}>
            <Mail color="#5A67D8" size={20} />
          </View>
          <View style={styles.inviteText}>
            <Text style={styles.inviteTitle}>Invite Friends &amp; Earn</Text>
            <Text style={styles.inviteSubtitle}>Get rewards for every friend who joins</Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={20} />
        </TouchableOpacity>

        {/* Person Cards */}
        {byPerson.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>All settled up! 🎉</Text>
            <Text style={styles.emptySubtitle}>No outstanding balances with anyone.</Text>
          </View>
        ) : (
          byPerson.map(person => {
            const owedToYou = person.net > 0;
            const amt = Math.abs(person.net).toFixed(0);
            const avatarColor = getAvatarColor(person.name);

            return (
              <TouchableOpacity
                key={person.userId}
                style={styles.personCard}
                onPress={() => navigation.navigate('PersonBalanceDetail', { person })}
              >
                <View style={styles.personCardLeft}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{person.name}</Text>
                    {person.phone ? (
                      <Text style={styles.personPhone}>{person.phone}</Text>
                    ) : (
                      <Text style={styles.personPhone}>
                        {(person.groups || []).map(g => g.groupName).join(', ')}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.personCardRight}>
                  <Text style={[styles.personAmount, { color: owedToYou ? '#10B981' : '#E53E3E' }]}>
                    ₹{amt}
                  </Text>
                  <View style={styles.personActions}>
                    <TouchableOpacity
                      onPress={() => Alert.alert('Remind', `Reminder sent to ${person.name}!`)}
                    >
                      <Text style={styles.remindText}>Remind</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.settleUpBtn}
                      onPress={() => handleSettlePress(person)}
                    >
                      <Text style={styles.settleUpBtnText}>Settle Up</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Settle Up Modal */}
      <Modal visible={!!settleModal} transparent animationType="slide" onRequestClose={() => setSettleModal(null)}>
        <TouchableOpacity style={styles.settleModalBackdrop} activeOpacity={1} onPress={() => setSettleModal(null)} />
        <View style={styles.settleModalSheet}>
          <View style={styles.settleModalPill} />
          <Text style={styles.settleModalTitle}>Record Settlement</Text>
          <Text style={styles.settleModalSub}>
            {settleModal?.group?.net > 0 ? `${settleModal?.person?.name} → Aap` : `Aap → ${settleModal?.person?.name}`}
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
              style={[styles.settleModalBtn, { flex: 1, backgroundColor: '#10B981' }, (settleModal?.group?.net > 0) && { opacity: 0.5 }]}
              onPress={handleUPIPayment}
              disabled={settleModal?.group?.net > 0} // Can't pay them if they owe you
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 15 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 32, fontWeight: '900', color: colors.textPrimary },
  searchBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },

  filterRow: { paddingHorizontal: 20, marginBottom: 16 },
  filterPillActive: {
    alignSelf: 'flex-start',
    backgroundColor: '#5A67D8',
    paddingHorizontal: 22, paddingVertical: 9,
    borderRadius: 22,
  },
  filterPillTextActive: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  summaryBox: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 64,
  },
  summaryBoxDark: { backgroundColor: '#1E2340' },
  summaryBoxLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  summaryBoxLabelDark: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4 },
  summaryBoxAmount: { fontSize: 15, fontWeight: '800' },
  summaryBoxAmountDark: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Invite Banner
  inviteBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  inviteIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  inviteText: { flex: 1 },
  inviteTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
  inviteSubtitle: { fontSize: 12, color: colors.textSecondary },

  // Person Card
  personCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20, marginBottom: 12,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  personCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  personInfo: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  personPhone: { fontSize: 12, color: colors.textSecondary },

  personCardRight: { alignItems: 'flex-end' },
  personAmount: { fontSize: 18, fontWeight: '900', marginBottom: 8 },
  personActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  remindText: { fontSize: 13, fontWeight: '700', color: '#5A67D8' },
  settleUpBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#5A67D8',
  },
  settleUpBtnText: { color: '#5A67D8', fontSize: 13, fontWeight: '700' },

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

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary },
});
