import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform,
  ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Switch
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  User, Mail, Phone, Bell, Moon, Shield,
  LogOut, ChevronRight, Pencil, Check, X
} from 'lucide-react-native';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

export default function SettingsScreen({ navigation }) {
  const { user, logout, setUser } = useAuth();

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Preferences
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useFocusEffect(useCallback(() => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
  }, [user]));

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name nahi chhod sakte');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/users/me', {
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      if (setUser) setUser(res.data.user);
      Alert.alert('Saved!', 'Profile update ho gayi ✅');
      setEditing(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Kya aap logout karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row = ({ icon, label, value, onPress, rightEl, noBorder }) => (
    <TouchableOpacity
      style={[styles.row, noBorder && { borderBottomWidth: 0 }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>{icon}</View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
        {rightEl || (onPress ? <ChevronRight color="#CBD5E0" size={16} /> : null)}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          {!editing ? (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              {user?.phone ? <Text style={styles.profilePhone}>{user?.phone}</Text> : null}
              <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditing(true)}>
                <Pencil color="#5A67D8" size={14} />
                <Text style={styles.editProfileText}>Profile Edit Karen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileEditForm}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Naam"
                placeholderTextColor="#A0AEC0"
              />
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone Number"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
              />
              <View style={styles.editBtns}>
                <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditing(false)}>
                  <X color="#718096" size={16} />
                  <Text style={styles.editCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Check color="#fff" size={16} />
                      <Text style={styles.editSaveText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Account Section */}
        <Section title="Account">
          <Row
            icon={<User color="#5A67D8" size={18} />}
            label="Naam"
            value={user?.name}
            noBorder={false}
          />
          <Row
            icon={<Mail color="#10B981" size={18} />}
            label="Email"
            value={user?.email}
            noBorder={false}
          />
          <Row
            icon={<Phone color="#F59E0B" size={18} />}
            label="Phone"
            value={user?.phone || 'Add karen'}
            onPress={() => setEditing(true)}
            noBorder
          />
        </Section>

        {/* Preferences Section */}
        <Section title="Preferences">
          <Row
            icon={<Bell color="#EC4899" size={18} />}
            label="Notifications"
            noBorder={false}
            rightEl={
              <Switch
                value={notificationsOn}
                onValueChange={setNotificationsOn}
                trackColor={{ false: '#E2E8F0', true: '#5A67D8' }}
                thumbColor="#fff"
              />
            }
          />
          <Row
            icon={<Moon color="#6B7280" size={18} />}
            label="Dark Mode"
            noBorder
            rightEl={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#E2E8F0', true: '#1E2340' }}
                thumbColor="#fff"
              />
            }
          />
        </Section>

        {/* About Section */}
        <Section title="About">
          <Row
            icon={<Shield color="#10B981" size={18} />}
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Aapka data secure hai. Hum kisi ke saath share nahi karte.')}
            noBorder={false}
          />
          <Row
            icon={<Text style={{ fontSize: 18 }}>📱</Text>}
            label="App Version"
            value="1.0.0"
            noBorder
          />
        </Section>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#EF4444" size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FF', paddingTop: Platform.OS === 'android' ? 30 : 0 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#1E2340' },

  profileCard: {
    margin: 20, backgroundColor: '#fff', borderRadius: 20,
    padding: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    borderWidth: 1, borderColor: '#EAECF5',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#5A67D8', justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { fontSize: 26, fontWeight: '900', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '800', color: '#1E2340', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#718096', marginBottom: 2 },
  profilePhone: { fontSize: 13, color: '#718096', marginBottom: 10 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  editProfileText: { fontSize: 13, fontWeight: '700', color: '#5A67D8' },

  profileEditForm: { flex: 1, gap: 10 },
  editInput: {
    backgroundColor: '#F8F9FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#EAECF5',
    fontSize: 15, color: '#1E2340',
  },
  editBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editCancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#F8F9FF', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#EAECF5',
  },
  editCancelText: { fontSize: 13, fontWeight: '700', color: '#718096' },
  editSaveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#5A67D8', borderRadius: 10, padding: 10,
  },
  editSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#A0AEC0', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#EAECF5',
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F2F5',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F8F9FF', justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#1E2340' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontSize: 13, color: '#A0AEC0', maxWidth: 160 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 8, backgroundColor: '#FEF2F2',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 16, fontWeight: '800', color: '#EF4444' },
});
