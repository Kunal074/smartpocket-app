import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Platform,
  KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { X, Users, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';

const GROUP_TYPES = [
  { id: 'trip', icon: '✈️', label: 'Trip' },
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'food', icon: '🍽️', label: 'Food' },
  { id: 'work', icon: '💼', label: 'Work' },
  { id: 'other', icon: '👥', label: 'Other' },
];

export default function CreateGroupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState('other');
  const [isLoading, setIsLoading] = useState(false);

  const selectedType = GROUP_TYPES.find(t => t.id === groupType);

  const handleCreate = async () => {
    if (!name.trim()) { alert('Please enter a group name'); return; }
    setIsLoading(true);
    try {
      const { data } = await api.post('/groups', {
        name: `${selectedType.icon} ${name.trim()}`,
      });
      navigation.replace('GroupDetail', { groupId: data.id, groupName: data.name });
    } catch (err) {
      alert('Failed to create group: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <X color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Group</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.content}>
          <View style={styles.previewContainer}>
            <View style={styles.previewIcon}>
              <Text style={styles.previewEmoji}>{selectedType?.icon}</Text>
            </View>
            <Text style={styles.previewName}>{name || 'Group Name'}</Text>
          </View>

          <Text style={styles.label}>Group Name</Text>
          <View style={styles.inputContainer}>
            <Users color={colors.textMuted} size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Goa Trip, Flat 4B..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <Text style={[styles.label, { marginTop: 28 }]}>Type</Text>
          <View style={styles.typeGrid}>
            {GROUP_TYPES.map((type) => {
              const isSelected = groupType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                  onPress={() => setGroupType(type.id)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color={colors.surface} />
              : <><Check color={colors.surface} size={20} /><Text style={styles.createBtnText}>Create Group</Text></>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  iconBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: { padding: 24, flex: 1 },
  previewContainer: { alignItems: 'center', marginBottom: 36, marginTop: 8 },
  previewIcon: { width: 80, height: 80, borderRadius: 28, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(43,107,243,0.1)' },
  previewEmoji: { fontSize: 36 },
  previewName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.borderMedium, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, height: '100%' },
  typeGrid: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, gap: 6 },
  typeBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  typeLabelActive: { color: colors.primary },
  createBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 10 },
  createBtnText: { color: colors.surface, fontSize: 18, fontWeight: '700' },
});
