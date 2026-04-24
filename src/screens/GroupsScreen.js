import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, FlatList, 
  TouchableOpacity, Platform, Modal, TextInput, ScrollView
} from 'react-native';
import { Users, Plus, Search, ArrowRight, X, Contact as ContactIcon, Globe, Home, Heart, User } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { colors } from '../theme/colors';
import { api } from '../api/client';

const CATEGORY_TABS = ['All', 'Home', 'Trip', 'Couple', 'Personal', 'Other'];

export default function GroupsScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data } = await api.get('/groups');
        setGroups(data);
      } catch (error) {
        console.error("Failed to fetch groups", error);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

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

  const renderGroupCard = ({ item }) => {
    const netBalance = parseFloat(item.net_balance || 0);
    const isOwed = netBalance > 0;
    const isOwing = netBalance < 0;
    const balanceColor = isOwed ? '#10B981' : isOwing ? colors.danger : colors.textSecondary;
    const balanceText = isOwed ? 'You are owed' : isOwing ? 'You owe' : 'Settled up';
    const amountText = netBalance !== 0 ? `₹${Math.abs(netBalance).toFixed(0)}` : '';

    const getIcon = () => {
      if (item.type === 'trip') return <Globe color="#E67E22" size={24} />;
      if (item.type === 'home') return <Home color="#3182CE" size={24} />;
      if (item.type === 'couple') return <Heart color="#E53E3E" size={24} />;
      if (item.type === 'personal') return <User color="#805AD5" size={24} />;
      return <Users color="#718096" size={24} />;
    };

    return (
      <TouchableOpacity 
        style={styles.groupCard} 
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.groupIconBg}>
            {getIcon()}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.memberCount}>{item.member_count} members</Text>
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>{balanceText}</Text>
            {amountText ? <Text style={[styles.balanceAmount, { color: balanceColor }]}>{amountText}</Text> : null}
          </View>
        </View>
        
        <View style={styles.cardDivider} />
        
        <View style={styles.cardFooter}>
          {netBalance !== 0 ? (
            <Text style={[styles.settlementText, { color: balanceColor }]}>
              {isOwed ? `The group pays you ${amountText}` : `You pay the group ${amountText}`}
            </Text>
          ) : (
            <Text style={styles.settlementText}>No outstanding balances</Text>
          )}
          <TouchableOpacity 
            style={styles.quickAddBtn}
            onPress={() => navigation.navigate('GroupAddExpense', { groupId: item.id, groupName: item.name, members: [] })} // Passing members ideally needs a fetch or derived list
          >
            <Plus color="#5A67D8" size={20} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || (g.type || 'other').toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Groups</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')}>
              <Text style={styles.createGroupText}>Create a group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchIconBtn}>
              <Search color="#5A67D8" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {CATEGORY_TABS.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.categoryBtn, activeCategory === cat && styles.categoryBtnActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Add Friend Banner (Hidden for now to match Premium UI) */}
        {/*
        <TouchableOpacity style={styles.addFriendBanner} onPress={handleOpenAddFriend}>
          ...
        </TouchableOpacity>
        */}

        {/* Groups Grid */}
        <FlatList
          data={filteredGroups}
          keyExtractor={item => item.id.toString()}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: colors.textMuted }}>No groups found</Text>
             </View>
          }
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
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  createGroupText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5A67D8',
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F8FB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  categoriesContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 16,
  },
  categoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  categoryBtnActive: {
    backgroundColor: '#5A67D8',
    borderColor: '#5A67D8',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryTextActive: {
    color: colors.surface,
  },

  listContent: {
    paddingBottom: 40,
  },
  groupCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FDF2E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  balanceInfo: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: 8,
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
