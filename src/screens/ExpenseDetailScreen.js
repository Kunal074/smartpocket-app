import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView,
  ActivityIndicator, Share, Alert, FlatList
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Edit2, Trash2, Share2, ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

const CATEGORIES = [
  { id: 'food', icon: '🍔' }, { id: 'transport', icon: '🚕' },
  { id: 'shopping', icon: '🛍️' }, { id: 'bills', icon: '📄' },
  { id: 'entertainment', icon: '🎬' }, { id: 'other', icon: '💸' }
];

export default function ExpenseDetailScreen({ route, navigation }) {
  const { groupId, groupName, expenseId, members } = route.params;
  const { user } = useAuth();
  
  const [expense, setExpense] = useState(null);
  const [splits, setSplits] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showSummary, setShowSummary] = useState(true);
  const [showBills, setShowBills] = useState(false);
  
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const fetchExpenseDetails = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/expenses/${expenseId}`);
      setExpense(data.expense);
      setSplits(data.splits);
      setComments(data.comments || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load expense details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchExpenseDetails();
    }, [expenseId])
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.error || 'Failed to delete expense');
            }
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    if (!expense) return;
    try {
      const splitInfo = splits.map(s => `- ${s.user_name}: \u20B9${parseFloat(s.amount).toFixed(0)}`).join('\n');
      const message = `\uD83D\uDCCA *${expense.title || expense.note || 'Expense'}* (\u20B9${expense.amount})\nPaid by: ${expense.paid_by_name || 'You'}\n\n*Splits*\n${splitInfo}`;
      
      await Share.share({ message, title: expense.title });
    } catch (error) {
      console.error(error.message);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/expenses/${expenseId}/comments`, {
        comment: newComment.trim()
      });
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
    } catch (e) {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  if (loading || !expense) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const expDate = new Date(expense.date || expense.created_at);
  const formattedDate = expDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const shortDate = expDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Main Top Card */}
          <View style={styles.topCard}>
            <View style={styles.topCardYellowBar} />
            
            <View style={styles.topCardHeader}>
              <View style={styles.badgeDate}>
                <Text style={styles.badgeDateText}>added on {shortDate}</Text>
              </View>
              <View style={styles.badgeGroup}>
                <Text style={styles.badgeGroupEmoji}>👥</Text>
                <Text style={styles.badgeGroupText}>{groupName}</Text>
              </View>
            </View>

            <View style={styles.topCardBody}>
              <View style={styles.cardIconBg}>
                <Text style={styles.cardIconText}>{CATEGORIES.find(c => c.id === expense.category)?.icon ?? '💸'}</Text>
              </View>
              
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{expense.title || expense.note || 'Expense'}</Text>
                <Text style={styles.cardSubtitle}>1 Bill</Text>
                <Text style={styles.cardDate}>{formattedDate}</Text>
                <Text style={styles.cardAmount}>₹{parseFloat(expense.amount).toFixed(0)}</Text>
              </View>
              
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.actionCircleBtn} 
                  onPress={() => navigation.navigate('GroupAddExpense', { 
                    groupId, groupName, members, editMode: true, expense, splits 
                  })}
                >
                  <Edit2 color={colors.primary} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCircleBtn} onPress={handleDelete}>
                  <Trash2 color={colors.primary} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCircleBtn} onPress={handleShare}>
                  <Share2 color={colors.primary} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Overall Summary Accordion */}
          <TouchableOpacity 
            style={styles.accordionHeader} 
            onPress={() => setShowSummary(!showSummary)}
            activeOpacity={0.7}
          >
            <Text style={styles.accordionTitle}>Overall Summary</Text>
            <View style={styles.accordionIconBg}>
              {showSummary ? <ChevronUp color={colors.textSecondary} size={20} /> : <ChevronDown color={colors.textSecondary} size={20} />}
            </View>
          </TouchableOpacity>

          {showSummary && (
            <View style={styles.accordionBody}>
              <Text style={styles.sectionHeading}>Paid By</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryAvatar}>
                  <Text style={styles.summaryAvatarText}>{expense.paid_by_name?.charAt(0) || '?'}</Text>
                </View>
                <Text style={styles.summaryName}>{expense.paid_by_name || 'You'}</Text>
                <Text style={styles.summaryAmount}>₹{parseFloat(expense.amount).toFixed(0)}</Text>
              </View>

              <View style={styles.dashedDivider} />

              <Text style={styles.sectionHeading}>Split Among</Text>
              {splits.map(s => (
                <View key={s.id} style={styles.summaryRow}>
                  <View style={styles.summaryAvatar}>
                    <Text style={styles.summaryAvatarText}>{s.user_name?.charAt(0) || '?'}</Text>
                  </View>
                  <Text style={styles.summaryName}>{s.user_name}</Text>
                  <Text style={styles.summaryAmount}>₹{parseFloat(s.amount).toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bills Accordion */}
          <TouchableOpacity 
            style={styles.accordionHeader} 
            onPress={() => setShowBills(!showBills)}
            activeOpacity={0.7}
          >
            <Text style={styles.accordionTitle}>Bills</Text>
            <View style={styles.accordionIconBg}>
              {showBills ? <ChevronUp color={colors.textSecondary} size={20} /> : <ChevronDown color={colors.textSecondary} size={20} />}
            </View>
          </TouchableOpacity>

          {showBills && (
            <View style={[styles.accordionBody, { alignItems: 'center', padding: 30 }]}>
              <Text style={{ color: colors.textMuted }}>No bill image attached.</Text>
            </View>
          )}
          
          <View style={styles.dashedDividerOuter} />

          {/* Comments List */}
          <View style={styles.commentsSection}>
            {comments.map(c => (
              <View key={c.id} style={styles.commentRow}>
                <View style={styles.summaryAvatar}>
                  <Text style={styles.summaryAvatarText}>{c.user_name?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentName}>{c.user_name}</Text>
                  <Text style={styles.commentText}>{c.comment}</Text>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* Sticky Comment Bar */}
        <View style={styles.commentBar}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment"
            placeholderTextColor={colors.textMuted}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={postingComment}>
            {postingComment ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.sendBtnText}>Send ➤</Text>}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 44, height: 44, backgroundColor: colors.background, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  
  content: { flex: 1, paddingHorizontal: 16 },
  
  topCard: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 24, marginTop: 10 },
  topCardYellowBar: { height: 6, backgroundColor: '#FFB800', width: '100%' },
  topCardHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 12 },
  badgeDate: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeDateText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  badgeGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  badgeGroupEmoji: { fontSize: 12 },
  badgeGroupText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  
  topCardBody: { flexDirection: 'row', padding: 20, alignItems: 'flex-start' },
  cardIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#FFE499' },
  cardIconText: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  cardDate: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  cardAmount: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  
  cardActions: { flexDirection: 'row', gap: 8 },
  actionCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },

  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  accordionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  accordionIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },

  accordionBody: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  summaryAvatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  summaryName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  summaryAmount: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  
  dashedDivider: { height: 1, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed', marginVertical: 16, marginHorizontal: -20 },
  dashedDividerOuter: { height: 1, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed', marginVertical: 16 },

  commentsSection: { paddingBottom: 24 },
  commentRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  commentBubble: { backgroundColor: colors.background, padding: 12, borderRadius: 16, borderBottomLeftRadius: 4, flex: 1 },
  commentName: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  commentText: { fontSize: 14, color: colors.textPrimary },

  commentBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight },
  commentInput: { flex: 1, fontSize: 15, color: colors.textPrimary, minHeight: 40, maxHeight: 100, paddingRight: 16 },
  sendBtn: { paddingBottom: 8 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
