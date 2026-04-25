import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert
} from 'react-native';
import { ChevronLeft, Save, Trash2 } from 'lucide-react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';

const GROUP_TYPES = ['trip', 'home', 'couple', 'other'];
const TYPE_LABELS = {
  trip: 'Trip',
  home: 'Home',
  couple: 'Couple',
  other: 'Other'
};

export default function GroupSettingsScreen({ route, navigation }) {
  const { groupId, groupName: initialName, groupData } = route.params;
  
  const [name, setName] = useState(groupData?.name || initialName || '');
  const [description, setDescription] = useState(groupData?.description || '');
  const [type, setType] = useState(groupData?.type || 'other');
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const isAdmin = groupData?.myRole === 'admin';

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/groups/${groupId}`, {
        name: name.trim(),
        description: description.trim(),
        type
      });
      Alert.alert('Success', 'Group updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/groups/${groupId}`);
              Alert.alert('Success', 'Group deleted');
              navigation.navigate('SmartSplit', { screen: 'Groups' });
            } catch (error) {
              console.error(error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete group');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter group name"
            editable={isAdmin}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description"
            multiline
            numberOfLines={3}
            editable={isAdmin}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Group Type</Text>
          <View style={styles.typeContainer}>
            {GROUP_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, type === t && styles.typePillActive]}
                onPress={() => isAdmin && setType(t)}
                disabled={!isAdmin}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!isAdmin && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Only group admins can change these settings.</Text>
          </View>
        )}

        {isAdmin && (
          <>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Save color="#fff" size={20} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#EF4444" /> : (
                  <>
                    <Trash2 color="#EF4444" size={20} />
                    <Text style={styles.deleteBtnText}>Delete Group</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#EAECF5'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E2340' },
  
  content: { padding: 20 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#4A5568', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: '#EAECF5', fontSize: 16, color: '#1E2340'
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typePill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAECF5'
  },
  typePillActive: { backgroundColor: '#5A67D8', borderColor: '#5A67D8' },
  typeText: { fontSize: 14, fontWeight: '600', color: '#4A5568' },
  typeTextActive: { color: '#fff' },

  warningBox: {
    backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, marginTop: 10,
    borderWidth: 1, borderColor: '#FDE68A'
  },
  warningText: { color: '#92400E', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  saveBtn: {
    backgroundColor: '#5A67D8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, gap: 8, marginTop: 10
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  dangerZone: { marginTop: 40, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#EAECF5' },
  dangerTitle: { fontSize: 14, fontWeight: '800', color: '#EF4444', marginBottom: 12, textTransform: 'uppercase' },
  deleteBtn: {
    backgroundColor: '#FEF2F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, gap: 8, borderWidth: 1, borderColor: '#FECACA'
  },
  deleteBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '700' }
});
