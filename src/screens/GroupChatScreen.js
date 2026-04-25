import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Alert
} from 'react-native';
import { Send, ArrowLeft, Users } from 'lucide-react-native';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

export default function GroupChatScreen({ navigation, route }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/group-messages/${groupId}`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.warn('Failed to fetch messages', e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMessages();
    // Poll every 4 seconds for new messages
    pollingRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollingRef.current);
  }, [fetchMessages]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setSending(true);

    // Optimistic UI
    const optimistic = {
      id: `temp-${Date.now()}`,
      message: msg,
      sender_id: user.id,
      sender_name: user.name,
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await api.post(`/group-messages/${groupId}`, { message: msg });
      setMessages(prev =>
        prev.map(m => (m.id === optimistic.id ? res.data.message : m))
      );
    } catch (e) {
      Alert.alert('Error', 'Message send nahi hua. Try again.');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Aaj';
    if (d.toDateString() === yesterday.toDateString()) return 'Kal';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === user.id;
    const prevMsg = messages[index - 1];
    const showDate =
      !prevMsg ||
      new Date(item.created_at).toDateString() !==
        new Date(prevMsg.created_at).toDateString();
    const showSender = !isMe && (!prevMsg || prevMsg.sender_id !== item.sender_id || showDate);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
          {!isMe && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.sender_name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {showSender && (
              <Text style={styles.senderName}>{item.sender_name}</Text>
            )}
            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.message}</Text>
            <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#1E2340" size={22} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.groupIcon}>
            <Users color="#5A67D8" size={18} />
          </View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
            <Text style={styles.headerSub}>Group Chat</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#5A67D8" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>Koi message nahi abhi tak.</Text>
                <Text style={styles.emptyHint}>Pehla message bhejo!</Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Kuch likhein..."
            placeholderTextColor="#A0AEC0"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send color="#fff" size={18} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EAECF5',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1E2340' },
  headerSub: { fontSize: 12, color: '#A0AEC0', fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: {
    backgroundColor: '#DBEAFE', color: '#3B82F6',
    fontSize: 11, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 20,
  },

  msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#5A67D8' },

  bubble: {
    maxWidth: '72%', padding: 12, borderRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#5A67D8',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  senderName: { fontSize: 11, fontWeight: '700', color: '#5A67D8', marginBottom: 4 },
  msgText: { fontSize: 15, color: '#1E2340', lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#A0AEC0', marginTop: 4, textAlign: 'right' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#4A5568' },
  emptyHint: { fontSize: 13, color: '#A0AEC0', marginTop: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#EAECF5',
  },
  input: {
    flex: 1, backgroundColor: '#F8F9FF',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#1E2340',
    borderWidth: 1, borderColor: '#EAECF5',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#5A67D8', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C3C9F0' },
});
