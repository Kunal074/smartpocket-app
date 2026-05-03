import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal, TextInput,
  Platform, Image, FlatList, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Trophy, Target, Users, Globe, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';
import { colors } from '../theme/colors';

const TIER_CONFIG = {
  bronze:   { label: 'Bronze',   emoji: '🥉', gradient: ['#CD7F32', '#B8761E'], range: '₹0 – ₹5K' },
  silver:   { label: 'Silver',   emoji: '🥈', gradient: ['#A8A9AD', '#8E8E93'], range: '₹5K – ₹20K' },
  gold:     { label: 'Gold',     emoji: '🥇', gradient: ['#FFD700', '#FFA500'], range: '₹20K – ₹1L' },
  platinum: { label: 'Platinum', emoji: '💎', gradient: ['#E5E4E2', '#A9A9A9'], range: '₹1L+' },
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ArenaScreen({ navigation }) {
  const [myChallenge, setMyChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [tier, setTier] = useState(null);
  const [filter, setFilter] = useState('global'); // 'global' | 'friends'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Join modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [loadingGoals, setLoadingGoals] = useState(false);

  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [challengeRes, lbRes] = await Promise.all([
        api.get('/arena/join'),
        api.get(`/arena/leaderboard?filter=${filter}`).catch(() => ({ data: { leaderboard: [], myRank: null } })),
      ]);
      setMyChallenge(challengeRes.data);
      setLeaderboard(lbRes.data.leaderboard || []);
      setMyRank(lbRes.data.myRank);
      setTier(lbRes.data.tier);
    } catch (e) {
      // No challenge joined yet
      setMyChallenge(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [filter]));

  const openJoinModal = async () => {
    setLoadingGoals(true);
    setSelectedGoalId(null);
    try {
      const res = await api.get('/savings');
      const goals = (res.data.goals || []).filter(g => !g.is_completed);
      
      if (goals.length === 0) {
        Alert.alert(
          'No Savings Goals',
          'You need at least one active savings goal to join the Arena. Create one now!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Goal', onPress: () => navigation.navigate('Savings') }
          ]
        );
        return;
      }
      
      setSavingsGoals(goals);
      setShowJoinModal(true);
    } catch (e) {
      Alert.alert('Error', 'Could not load savings goals');
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedGoalId) {
      Alert.alert('Select Goal', 'Please select a savings goal to compete with.');
      return;
    }
    
    setJoining(true);
    try {
      const selectedGoal = savingsGoals.find(g => g.id === selectedGoalId);
      const finalTarget = parseFloat(selectedGoal?.target_amount);
      const finalGoalName = selectedGoal?.name;

      if (!finalTarget || isNaN(finalTarget) || finalTarget <= 0) {
        Alert.alert('Invalid', 'Selected goal has an invalid target amount');
        setJoining(false);
        return;
      }

      await api.post('/arena/join', {
        target_amount: finalTarget,
        goal_name: finalGoalName,
      });
      
      setShowJoinModal(false);
      setSelectedGoalId(null);
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Challenge?',
      'Your progress will be removed from the leaderboard. Your savings goals remain unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/arena/leave');
              setMyChallenge(null);
              setLeaderboard([]);
              setMyRank(null);
              setTier(null);
            } catch (e) {
              Alert.alert('Error', 'Could not leave challenge.');
            }
          }
        }
      ]
    );
  };

  const handleCelebrate = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await api.post('/arena/celebrate', { imageBase64: base64Image });
        Alert.alert('🎊 Posted!', 'Your achievement photo is now live on the leaderboard!');
        fetchData();
      } catch (e) {
        Alert.alert('Error', 'Could not upload photo');
      }
    }
  };

  const tierConfig = tier ? TIER_CONFIG[tier] : null;
  const pct = myChallenge
    ? Math.min((parseFloat(myChallenge.saved_amount) / parseFloat(myChallenge.target_amount)) * 100, 100)
    : 0;

  const renderLeaderboardItem = ({ item, index }) => {
    const rankNum = parseInt(item.rank);
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    const isMe = item.user_id === myChallenge?.user_id;

    return (
      <View style={[styles.lbRow, isMe && styles.lbRowMe]}>
        <Text style={[styles.lbRank, rankNum <= 3 && { color: rankColors[rankNum - 1] }]}>
          {rankNum <= 3 ? ['🥇','🥈','🥉'][rankNum - 1] : `#${rankNum}`}
        </Text>
        <View style={styles.lbAvatar}>
          <Text style={styles.lbAvatarText}>{(item.name || 'U')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.lbInfo}>
          <Text style={styles.lbName}>{item.name}{isMe ? ' (You)' : ''}</Text>
          {item.goal_name ? <Text style={[styles.lbSub, { fontWeight: '600', color: '#5A67D8' }]}>{item.goal_name}</Text> : null}
          <Text style={styles.lbSub}>{item.pct}% • ₹{parseFloat(item.saved_amount).toFixed(0)} saved</Text>
        </View>
        <View style={styles.lbRight}>
          <Text style={styles.lbPoints}>{item.points}</Text>
          <Text style={styles.lbPtsLabel}>pts</Text>
          {item.is_completed && (
            <Text style={{ fontSize: 16 }}>🎊</Text>
          )}
        </View>
        {item.achievement_photo_url && (
          <Image source={{ uri: item.achievement_photo_url }} style={styles.lbPhoto} />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#5A67D8" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#1E2340" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Savings Arena 🏆</Text>
        {myChallenge ? (
          <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
            <Text style={styles.leaveBtnText}>Leave</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={(item, i) => `${item.user_id}-${i}`}
        renderItem={renderLeaderboardItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} />}
        ListHeaderComponent={
          <View>
            {/* My Challenge Card */}
            {myChallenge && tierConfig ? (
              <LinearGradient colors={tierConfig.gradient} style={styles.myCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.myCardTop}>
                  <View>
                    <Text style={styles.myTierBadge}>{tierConfig.emoji} {tierConfig.label} Tier</Text>
                    <Text style={styles.myRankText}>Rank #{myRank || '—'}</Text>
                    {myChallenge.goal_name ? (
                      <Text style={{ color: '#fff', fontSize: 13, marginTop: 4, fontWeight: '700' }}>
                        🎯 {myChallenge.goal_name}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.myPoints}>
                    <Text style={styles.myPointsNum}>{myChallenge.points}</Text>
                    <Text style={styles.myPointsLabel}>pts</Text>
                  </View>
                </View>

                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
                <View style={styles.myCardBot}>
                  <Text style={styles.myCardBotText}>
                    ₹{parseFloat(myChallenge.saved_amount).toFixed(0)} / ₹{parseFloat(myChallenge.target_amount).toFixed(0)}
                  </Text>
                  <Text style={styles.myCardBotText}>{daysLeft} days left ⏳</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={styles.addFundsBtn}
                    onPress={() => navigation.navigate('Savings')}
                  >
                    <Plus color="#fff" size={16} />
                    <Text style={styles.addFundsBtnText}>Add Savings</Text>
                  </TouchableOpacity>
                  {myChallenge.is_completed && !myChallenge.achievement_photo_url && (
                    <TouchableOpacity style={[styles.addFundsBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]} onPress={handleCelebrate}>
                      <Text style={{ color: '#fff', fontSize: 18 }}>📸</Text>
                      <Text style={styles.addFundsBtnText}>Share Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            ) : (
              <TouchableOpacity style={styles.joinCard} onPress={openJoinModal}>
                <Trophy color="#5A67D8" size={32} />
                <Text style={styles.joinTitle}>Join This Month's Challenge!</Text>
                <Text style={styles.joinSub}>Set a savings target and compete with others</Text>
                <View style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>Join Arena 🚀</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Filter Toggle */}
            {myChallenge && (
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterBtn, filter === 'global' && styles.filterBtnActive]}
                  onPress={() => setFilter('global')}
                >
                  <Globe color={filter === 'global' ? '#fff' : '#5A67D8'} size={14} />
                  <Text style={[styles.filterBtnText, filter === 'global' && { color: '#fff' }]}>Global</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterBtn, filter === 'friends' && styles.filterBtnActive]}
                  onPress={() => setFilter('friends')}
                >
                  <Users color={filter === 'friends' ? '#fff' : '#5A67D8'} size={14} />
                  <Text style={[styles.filterBtnText, filter === 'friends' && { color: '#fff' }]}>Friends</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tier Info */}
            {tierConfig && (
              <View style={styles.tierInfo}>
                <Text style={styles.tierInfoText}>
                  {tierConfig.emoji} {tierConfig.label} Tier · Target range: {tierConfig.range}
                </Text>
              </View>
            )}

            {leaderboard.length > 0 && (
              <Text style={styles.leaderboardTitle}>Leaderboard — {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          myChallenge ? (
            <View style={styles.emptyLeaderboard}>
              <Text style={{ fontSize: 40 }}>👀</Text>
              <Text style={styles.emptyText}>No one else in your tier yet!</Text>
              <Text style={styles.emptySub}>Be the first to top the {tier} leaderboard.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />

      {/* Join Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Join This Month's Arena 🏆</Text>
            <Text style={styles.modalSub}>Select a savings goal to compete with.</Text>

            {loadingGoals ? (
              <ActivityIndicator color="#5A67D8" style={{ marginVertical: 20 }} />
            ) : savingsGoals.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>Your Active Savings Goals</Text>
                <ScrollView style={{ maxHeight: 250, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                  {savingsGoals.map(goal => {
                    const isSelected = selectedGoalId === goal.id;
                    const tier = parseFloat(goal.target_amount) <= 5000 ? '🥉 Bronze' :
                                 parseFloat(goal.target_amount) <= 20000 ? '🥈 Silver' :
                                 parseFloat(goal.target_amount) <= 100000 ? '🥇 Gold' : '💎 Platinum';
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        style={[styles.goalSelectCard, isSelected && styles.goalSelectCardActive]}
                        onPress={() => setSelectedGoalId(goal.id)}
                      >
                        <Text style={{ fontSize: 22 }}>{goal.icon || '🎯'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.goalSelectName, isSelected && { color: '#5A67D8' }]}>{goal.name}</Text>
                          <Text style={styles.goalSelectMeta}>Target: ₹{parseFloat(goal.target_amount).toFixed(0)} • {tier}</Text>
                        </View>
                        {isSelected && <Text style={{ fontSize: 18 }}>✅</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            {selectedGoalId ? (
              <View style={styles.tierPreview}>
                <Text style={styles.tierPreviewText}>
                  {(() => {
                    const amt = parseFloat(savingsGoals.find(g => g.id === selectedGoalId)?.target_amount);
                    return `You'll compete in the ${
                      amt <= 5000 ? '🥉 Bronze' :
                      amt <= 20000 ? '🥈 Silver' :
                      amt <= 100000 ? '🥇 Gold' : '💎 Platinum'
                    } Tier!`;
                  })()}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity 
              style={[styles.saveBtn, !selectedGoalId && { opacity: 0.5 }]} 
              onPress={handleJoin} 
              disabled={joining || !selectedGoalId}
            >
              {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Join Challenge 🚀</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoinModal(false)}>
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

  list: { paddingBottom: 40 },

  leaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5' },
  leaveBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },

  myCard: { margin: 20, borderRadius: 24, padding: 20 },
  myCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  myTierBadge: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  myRankText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  myPoints: { alignItems: 'center' },
  myPointsNum: { fontSize: 32, fontWeight: '900', color: '#fff' },
  myPointsLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  myCardBot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  myCardBotText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  addFundsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 14 },
  addFundsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  joinCard: { margin: 20, backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#EAECF5', elevation: 3 },
  joinTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340', marginTop: 12, marginBottom: 6 },
  joinSub: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 20 },
  joinBtn: { backgroundColor: '#5A67D8', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  filterRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, gap: 10 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#5A67D8' },
  filterBtnActive: { backgroundColor: '#5A67D8' },
  filterBtnText: { color: '#5A67D8', fontWeight: '700', fontSize: 13 },

  tierInfo: { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 10 },
  tierInfoText: { color: '#5A67D8', fontWeight: '600', fontSize: 13, textAlign: 'center' },

  leaderboardTitle: { fontSize: 16, fontWeight: '800', color: '#1E2340', marginHorizontal: 20, marginBottom: 12 },

  lbRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 8, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#EAECF5' },
  lbRowMe: { borderColor: '#5A67D8', borderWidth: 2, backgroundColor: '#EEF2FF' },
  lbRank: { width: 36, fontSize: 16, fontWeight: '800', color: '#1E2340', textAlign: 'center' },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#5A67D8', justifyContent: 'center', alignItems: 'center' },
  lbAvatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: '700', color: '#1E2340' },
  lbSub: { fontSize: 12, color: '#718096', marginTop: 2 },
  lbRight: { alignItems: 'center' },
  lbPoints: { fontSize: 18, fontWeight: '900', color: '#5A67D8' },
  lbPtsLabel: { fontSize: 10, color: '#A0AEC0', fontWeight: '600' },
  lbPhoto: { width: 44, height: 44, borderRadius: 12 },

  emptyLeaderboard: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#1E2340', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  centerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  centerSheet: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E2340', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#718096', marginBottom: 20, lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#EAECF5', borderRadius: 14, padding: 14, fontSize: 16, color: '#1E2340', marginBottom: 16 },
  tierPreview: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, marginBottom: 16 },
  tierPreviewText: { color: '#5A67D8', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  saveBtn: { backgroundColor: '#5A67D8', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#718096', fontSize: 15, fontWeight: '600' },

  goalSelectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#EAECF5', backgroundColor: '#F8F9FF', marginBottom: 8 },
  goalSelectCardActive: { borderColor: '#5A67D8', backgroundColor: '#EEF2FF' },
  goalSelectName: { fontSize: 14, fontWeight: '700', color: '#1E2340', marginBottom: 2 },
  goalSelectMeta: { fontSize: 12, color: '#718096', fontWeight: '500' },
});
