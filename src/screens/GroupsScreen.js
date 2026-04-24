import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, FlatList, 
  TouchableOpacity, Platform, Modal, TextInput 
} from 'react-native';
import { Users, Plus, Search, ArrowRight, X, Contact as ContactIcon } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { colors } from '../theme/colors';

// Placeholder Groups Data
const DUMMY_GROUPS = [
  { id: '1', name: 'Goa Trip 🏖️', member_count: 5, color: '#E8F0FE', icon: '✈️' },
  { id: '2', name: 'Apartment 🏠', member_count: 3, color: '#D1FAE5', icon: '🏠' },
];

export default function GroupsScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          // Filter contacts with phone numbers and sort alphabetically
          const validContacts = data
            .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setContacts(validContacts);
        }
      } else {
        alert('Contact permission is required to add friends!');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleOpenAddFriend = () => {
    setShowAddFriend(true);
    fetchContacts();
  };

  const renderGroupCard = ({ item }) => (
    <TouchableOpacity style={styles.groupCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.groupIconBg, { backgroundColor: item.color }]}>
          <Text style={styles.groupIconText}>{item.icon}</Text>
        </View>
        <View style={styles.arrowBg}>
          <ArrowRight color={colors.primary} size={16} />
        </View>
      </View>
      
      <Text style={styles.groupName}>{item.name}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.memberBadge}>
          <Users color={colors.textSecondary} size={12} />
          <Text style={styles.memberCount}>{item.member_count} members</Text>
        </View>
        <Text style={styles.viewText}>View →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>SmartPocket</Text>
            <Text style={styles.subtitle}>Split bills and manage expenses</Text>
          </View>
          <TouchableOpacity style={styles.newGroupBtn}>
            <Plus color={colors.primary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search color={colors.primary} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Add Friend Banner (Testing Native Feature) */}
        <TouchableOpacity style={styles.addFriendBanner} onPress={handleOpenAddFriend}>
          <View style={styles.bannerIcon}>
            <ContactIcon color={colors.surface} size={20} />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Add friends via Phone Number</Text>
            <Text style={styles.bannerSubtitle}>Sync your contacts to split bills easily</Text>
          </View>
          <ArrowRight color={colors.primary} size={20} />
        </TouchableOpacity>

        {/* Groups Grid */}
        <FlatList
          data={DUMMY_GROUPS}
          keyExtractor={item => item.id}
          renderItem={renderGroupCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Native Contacts Modal */}
      <Modal visible={showAddFriend} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Friend</Text>
            <TouchableOpacity onPress={() => setShowAddFriend(false)} style={styles.closeBtn}>
              <X color={colors.textPrimary} size={24} />
            </TouchableOpacity>
          </View>
          
          {loadingContacts ? (
            <View style={styles.center}>
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactRow}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.avatarText}>
                      {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>
                      {item.phoneNumbers[0]?.number}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.addBtnSmall}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newGroupBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43, 107, 243, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  addFriendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(43, 107, 243, 0.1)',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.primary,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  groupCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  groupIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconText: {
    fontSize: 20,
  },
  arrowBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCount: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  addBtnSmall: {
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  }
});
