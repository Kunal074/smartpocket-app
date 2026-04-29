import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, SafeAreaView, Platform,
  KeyboardAvoidingView, ScrollView, ActivityIndicator,
  Modal, Alert, FlatList
} from 'react-native';
import { ChevronLeft, Plus, ChevronDown, Camera, Calendar, CheckSquare, Square } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { useAuth } from '../store/useAuth';

const PAYMENT_APPS = [
  { id: 'phonepe', name: 'Pe', color: '#5f259f' },
  { id: 'gpay', name: 'G', color: '#4285F4' },
  { id: 'paytm', name: 'pay', color: '#00BAF2' },
  { id: 'cred', name: 'C', color: '#000000' },
  { id: 'swiggy', name: 'S', color: '#fc8019' },
  { id: 'zomato', name: 'Z', color: '#cb202d' },
  { id: 'zepto', name: 'z', color: '#3A1459' },
  { id: 'instamart', name: 'im', color: '#e23744' },
];

const CATEGORIES = [
  { label: 'Food & Dining', value: 'food' },
  { label: 'Transport', value: 'transport' },
  { label: 'Shopping', value: 'shopping' },
  { label: 'Misc.', value: 'other' },
];

export default function GroupAddExpenseScreen({ route, navigation }) {
  const { groupId, groupName: routeGroupName, members: initialMembers = [], editMode, expense, splits = [] } = route.params || {};
  const { user } = useAuth();
  
  const isPersonal = !groupId;

  const [members, setMembers] = useState(initialMembers);
  const [description, setDescription] = useState(editMode ? (expense?.title || expense?.note) : '');
  const [category, setCategory] = useState(editMode ? expense?.category : 'other');
  const [price, setPrice] = useState(editMode ? parseFloat(expense?.amount).toFixed(0) : '');
  const [paidBy, setPaidBy] = useState(editMode ? expense?.paid_by : user?.id);
  const [splitType, setSplitType] = useState(editMode && expense?.split_type !== 'equal' ? 'unequal' : 'equal'); // equal, unequal, item
  const [selectedMembers, setSelectedMembers] = useState(
    editMode ? splits.map(s => s.user_id) : (isPersonal ? [user?.id] : initialMembers.map(m => m.user_id))
  );
  const [saving, setSaving] = useState(false);

  // Unequal Modal State
  const [showUnequalModal, setShowUnequalModal] = useState(false);
  const initialUnequalMode = editMode && expense?.split_type === 'percentage' ? 'shares' : 'amount';
  const [unequalMode, setUnequalMode] = useState(initialUnequalMode); // 'amount' or 'shares'
  
  const [customAmounts, setCustomAmounts] = useState(() => {
    if (editMode && expense?.split_type === 'custom') {
      return splits.reduce((acc, s) => ({ ...acc, [s.user_id]: parseFloat(s.amount).toFixed(0) }), {});
    }
    return {};
  });

  const [customShares, setCustomShares] = useState(() => {
    if (editMode && expense?.split_type === 'percentage') {
      return splits.reduce((acc, s) => ({ ...acc, [s.user_id]: parseFloat(s.percentage).toFixed(0) }), {});
    }
    return initialMembers.reduce((acc, m) => ({ ...acc, [m.user_id]: '1' }), {});
  });
  
  const [editedAmounts, setEditedAmounts] = useState(new Set());

  // Multiple Bills State
  const [bills, setBills] = useState([]);
  const [activeBillIndex, setActiveBillIndex] = useState(0);

  const [pickerModal, setPickerModal] = useState(null); // 'category' | 'payer'

  const saveCurrentToBills = (targetBills, targetIndex) => {
    targetBills[targetIndex] = {
      description, category, price, paidBy, splitType,
      selectedMembers, customAmounts, customShares, editedAmounts, unequalMode
    };
  };

  const loadBillToState = (bill) => {
    setDescription(bill.description);
    setCategory(bill.category);
    setPrice(bill.price);
    setPaidBy(bill.paidBy);
    setSplitType(bill.splitType);
    setSelectedMembers(bill.selectedMembers);
    setCustomAmounts(bill.customAmounts);
    setCustomShares(bill.customShares);
    setEditedAmounts(bill.editedAmounts);
    setUnequalMode(bill.unequalMode);
  };

  const handleAddBill = () => {
    const newBills = [...bills];
    saveCurrentToBills(newBills, activeBillIndex);
    setBills(newBills);
    
    setActiveBillIndex(newBills.length);
    setDescription('');
    setCategory('other');
    setPrice('');
    setSplitType('equal');
    setCustomAmounts({});
    setEditedAmounts(new Set());
    setUnequalMode('amount');
  };

  const switchBill = (index) => {
    if (index === activeBillIndex) return;
    const newBills = [...bills];
    saveCurrentToBills(newBills, activeBillIndex);
    setBills(newBills);
    setActiveBillIndex(index);
    loadBillToState(newBills[index]);
  };

  // Add Member Modal State
  const [showAddMember, setShowAddMember] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const handleOpenContacts = async () => {
    setShowAddMember(true);
    setContactSearch('');
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const valid = data.filter(c => c.phoneNumbers?.length > 0).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setContacts(valid);
      } else {
        Alert.alert('Permission required');
      }
    } catch (e) { console.error(e); }
    finally { setLoadingContacts(false); }
  };

  const refreshMembers = async () => {
    try {
      const { data } = await api.get(isPersonal ? '/friends' : `/groups/${groupId}/members`);
      const newMembers = Array.isArray(data) ? data : [];
      setMembers(newMembers);
      
      // Auto-select the newly added members
      const newMemberIds = newMembers.map(m => m.user_id);
      setSelectedMembers(prev => [...new Set([...prev, ...newMemberIds])]);
      
      // Update customShares to ensure new members have a default share
      setCustomShares(prev => {
        const updated = { ...prev };
        newMembers.forEach(m => {
          if (!updated[m.user_id]) updated[m.user_id] = '1';
        });
        return updated;
      });
    } catch (e) {
      console.warn('Failed to refresh members', e);
    }
  };

  const handleAddMember = async (contact) => {
    const phone = contact.phoneNumbers?.[0]?.number?.replace(/\s/g, '');
    if (!phone) { Alert.alert('Error', 'This contact has no phone number'); return; }
    try {
      if (isPersonal) await api.post('/friends', { phone });
      else await api.post(`/groups/${groupId}/members`, { phone });
      Alert.alert('Success', `\u2705 ${contact.name} added!`);
      refreshMembers();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    }
  };

  const handleAddByContact = async () => {
    const input = memberEmail.trim();
    if (!input) { Alert.alert('Error', 'Enter an email or phone number'); return; }
    const isEmail = input.includes('@');
    if (!isEmail && input.replace(/\D/g, '').length < 10) {
      Alert.alert('Error', 'Enter a valid 10-digit phone number or email address');
      return;
    }
    const payload = isEmail ? { email: input } : { phone: input.replace(/\s|-/g, '') };
    try {
      if (isPersonal) await api.post('/friends', payload);
      else await api.post(`/groups/${groupId}/members`, payload);
      Alert.alert('Success', '\u2705 Member added!');
      setMemberEmail('');
      refreshMembers();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    }
  };

  const toggleMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      if (selectedMembers.length > 1) {
        setSelectedMembers(selectedMembers.filter(id => id !== memberId));
        setEditedAmounts(prev => {
          const next = new Set(prev);
          next.delete(memberId);
          return next;
        });
      }
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const getSplitAmount = (userId) => {
    if (!price || isNaN(price)) return '0';
    if (!selectedMembers.includes(userId)) return '0';
    
    if (splitType === 'equal') {
      const total = parseFloat(price);
      if (selectedMembers.length === 0) return '0';
      return (total / selectedMembers.length).toFixed(0);
    } else if (splitType === 'unequal') {
      if (unequalMode === 'amount') {
        return parseFloat(customAmounts[userId] || 0).toFixed(0);
      } else if (unequalMode === 'shares') {
        const totalShares = selectedMembers.reduce((sum, id) => sum + parseFloat(customShares[id] || 0), 0);
        if (totalShares === 0) return '0';
        const userShare = parseFloat(customShares[userId] || 0);
        return ((userShare / totalShares) * parseFloat(price)).toFixed(0);
      }
    }
    return '0';
  };

  const handleAmountChange = (userId, val) => {
    const newAmounts = { ...customAmounts, [userId]: val };
    const newEdited = new Set(editedAmounts);
    newEdited.add(userId);
    setEditedAmounts(newEdited);
    setCustomAmounts(newAmounts);

    const totalPrice = parseFloat(price || 0);
    let manuallyAssignedTotal = 0;
    newEdited.forEach(id => {
      if (selectedMembers.includes(id)) {
        manuallyAssignedTotal += parseFloat(newAmounts[id] || 0);
      }
    });

    const remaining = Math.max(0, totalPrice - manuallyAssignedTotal);
    const uneditedUsers = selectedMembers.filter(id => !newEdited.has(id));
    
    if (uneditedUsers.length > 0) {
      const splitForUnedited = (remaining / uneditedUsers.length).toFixed(0);
      const autoDistributedAmounts = { ...newAmounts };
      uneditedUsers.forEach(id => {
        autoDistributedAmounts[id] = splitForUnedited.toString();
      });
      setCustomAmounts(autoDistributedAmounts);
    }
  };

  const handleSplitTypePress = (type) => {
    setSplitType(type);
    if (type === 'unequal') {
      if (!price || isNaN(price)) {
        Alert.alert('Price Required', 'Please enter a price before setting unequal splits.');
        setSplitType('equal');
        return;
      }
      setShowUnequalModal(true);
    } else if (type === 'item') {
      Alert.alert("Coming Soon", "Item wise splitting is currently under development.");
      setSplitType('equal');
    }
  };

  const handleSubmit = async () => {
    // Save current active bill to the array before validation
    const allBills = [...bills];
    saveCurrentToBills(allBills, activeBillIndex);
    
    // Validate all bills
    const payloads = [];
    for (let i = 0; i < allBills.length; i++) {
      const b = allBills[i];
      if (!b.price || isNaN(b.price)) { alert(`Enter a valid price for Bill ${i + 1}`); return; }
      if (!b.description.trim()) { alert(`Enter a description for Bill ${i + 1}`); return; }
      if (b.selectedMembers.length === 0) { alert(`Select at least one member for Bill ${i + 1}`); return; }

      let backendSplitType = 'equal';
      let membersPayload = [];

      if (b.splitType === 'equal') {
        membersPayload = b.selectedMembers.map(id => ({ user_id: id }));
      } else if (b.splitType === 'unequal') {
        if (b.unequalMode === 'amount') {
          backendSplitType = 'custom';
          let sum = 0;
          membersPayload = b.selectedMembers.map(id => {
            const amt = parseFloat(b.customAmounts[id] || 0);
            sum += amt;
            return { user_id: id, amount: amt };
          });
          if (Math.abs(sum - parseFloat(b.price)) > 0.01) {
            Alert.alert('Amount Mismatch', `In Bill ${i + 1}, custom amounts sum (\u20B9${sum}) must equal the total price (\u20B9${b.price})`);
            if (activeBillIndex !== i) switchBill(i);
            setShowUnequalModal(true);
            return;
          }
        } else if (b.unequalMode === 'shares') {
          backendSplitType = 'percentage';
          let totalShares = 0;
          b.selectedMembers.forEach(id => totalShares += parseFloat(b.customShares[id] || 0));
          if (totalShares === 0) {
            Alert.alert('Invalid Shares', `Total shares cannot be 0 in Bill ${i + 1}.`);
            return;
          }
          membersPayload = b.selectedMembers.map(id => {
            const share = parseFloat(b.customShares[id] || 0);
            return { user_id: id, percentage: (share / totalShares) * 100 };
          });
        }
      }

      if (isPersonal && b.selectedMembers.length === 1 && b.selectedMembers[0] === user?.id) {
        payloads.push({
          type: 'personal',
          payload: {
            title: b.description, amount: parseFloat(b.price), categoryId: b.category, note: b.description, date: new Date().toISOString().slice(0, 10)
          }
        });
      } else {
        payloads.push({
          type: 'group',
          payload: {
            title: b.description, amount: parseFloat(b.price), category: b.category, split_type: backendSplitType, note: b.description, paid_by: b.paidBy, members: membersPayload
          }
        });
      }
    }

    setSaving(true);
    try {
      const promises = payloads.map(item => {
        if (item.type === 'personal') return api.post('/expenses', item.payload);
        if (isPersonal) return api.post('/expenses/direct', item.payload);
        if (editMode) return api.put(`/groups/${groupId}/expenses/${expense.id}`, item.payload);
        return api.post(`/groups/${groupId}/expenses`, item.payload);
      });
      await Promise.all(promises);
      // Navigate back and signal GroupDetail to reload
      if (editMode) {
        navigation.goBack();
      } else {
        navigation.navigate('GroupDetail', { groupId, groupName: routeGroupName, forceReload: Date.now() });
      }
    } catch (e) {
      Alert.alert('Failed', e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };


  // Calculate remaining amount for unequal modal
  const totalEnteredAmount = selectedMembers.reduce((sum, id) => sum + parseFloat(customAmounts[id] || 0), 0);
  const remainingAmount = (parseFloat(price || 0) - totalEnteredAmount).toFixed(0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isPersonal ? (editMode ? 'Edit Bill' : 'Add Bill') : (editMode ? 'Edit Expense' : 'Add Expense')}
          </Text>
          {!isPersonal && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{routeGroupName}</Text>
            </View>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Members Strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersStrip}>
            <TouchableOpacity style={styles.addFriendCircle} onPress={handleOpenContacts}>
              <Plus color={colors.surface} size={24} />
            </TouchableOpacity>
            
            {members.filter(m => m && m.user_id).map(m => (
              <View key={m.user_id} style={styles.memberAvatarContainer}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarInitials}>{m.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <Text style={styles.memberName}>{m.user_id === user?.id ? 'You' : (m.name?.split(' ')[0] || '?')}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Bill Action Row */}
          <View style={styles.billActionRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {Array.from({ length: Math.max(bills.length, activeBillIndex + 1) }).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.billBadge, activeBillIndex === i ? styles.billBadgeActive : styles.billBadgeInactive]}
                  onPress={() => switchBill(i)}
                >
                  <Text style={[styles.billBadgeText, activeBillIndex === i ? styles.billBadgeTextActive : styles.billBadgeTextInactive]}>
                    Bill {i + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {!editMode && (
              <TouchableOpacity style={styles.addBillBtn} onPress={handleAddBill}>
                <Plus color={colors.primary} size={16} />
                <Text style={styles.addBillText}>Add bill</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            
            {/* Payment Apps Strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.appsStrip}>
              {PAYMENT_APPS.map(app => (
                <TouchableOpacity key={app.id} style={[styles.appIcon, { borderColor: app.color }]}>
                  <Text style={[styles.appIconText, { color: app.color }]}>{app.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.divider}>
              <Text style={styles.dividerText}>OR</Text>
            </View>

            {/* Form Grid */}
            <View style={styles.formGrid}>
              <View style={styles.formCol}>
                <Text style={styles.label}>Description</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Add a description" 
                  placeholderTextColor={colors.textPrimary}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
              <View style={styles.formCol}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setPickerModal('category')}>
                  <Text style={styles.dropdownText}>
                    {CATEGORIES.find(c => c.value === category)?.label || 'Misc.'}
                  </Text>
                  <ChevronDown color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.formGrid, { marginTop: 24 }]}>
              <View style={styles.formCol}>
                <Text style={styles.label}>Price</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceSymbol}>₹</Text>
                  <TextInput 
                    style={styles.priceInput} 
                    placeholder="Enter price" 
                    placeholderTextColor={colors.textPrimary}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={(val) => {
                      setPrice(val);
                      if (splitType === 'unequal') setSplitType('equal'); // Reset split if price changes
                    }}
                  />
                </View>
              </View>
              <View style={styles.formCol}>
                <Text style={styles.label}>Paid By</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setPickerModal('payer')}>
                  <Text style={styles.dropdownText}>
                    {members.find(m => m.user_id === paidBy)?.name === user?.name ? 'You' : (members.find(m => m.user_id === paidBy)?.name || 'You')}
                  </Text>
                  <ChevronDown color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Split Section */}
            <View style={styles.splitSection}>
              <Text style={styles.label}>Split</Text>
              <View style={styles.splitToggles}>
                <TouchableOpacity style={[styles.splitBtn, splitType === 'equal' && styles.splitBtnActive]} onPress={() => handleSplitTypePress('equal')}>
                  <Text style={[styles.splitBtnText, splitType === 'equal' && styles.splitBtnTextActive]}>Equally</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.splitBtn, splitType === 'unequal' && styles.splitBtnActive]} onPress={() => handleSplitTypePress('unequal')}>
                  <Text style={[styles.splitBtnText, splitType === 'unequal' && styles.splitBtnTextActive]}>Unequally</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.splitBtn, splitType === 'item' && styles.splitBtnActive]} onPress={() => handleSplitTypePress('item')}>
                  <Text style={[styles.splitBtnText, splitType === 'item' && styles.splitBtnTextActive]}>Item wise</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Split Among (Visible on main screen) */}
            {splitType !== 'item' && (
              <View style={styles.splitAmongSection}>
                <Text style={styles.label}>Split among <Text style={styles.labelLight}>( Tap to unselect )</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.splitMembersList}>
                  {members.filter(m => m && m.user_id).map(m => {
                    const isSelected = selectedMembers.includes(m.user_id);
                    return (
                      <TouchableOpacity 
                        key={m.user_id} 
                        style={[styles.splitMemberCard, isSelected && styles.splitMemberCardActive]}
                        onPress={() => toggleMember(m.user_id)}
                      >
                        <View style={[styles.splitMemberTop, isSelected && styles.splitMemberTopActive]}>
                          <Text style={[styles.splitMemberName, isSelected && styles.splitMemberNameActive]}>
                            {m.user_id === user?.id ? 'You' : (m.name?.split(' ')[0] || '?')}
                          </Text>
                        </View>
                        <View style={styles.splitMemberBottom}>
                          <Text style={styles.splitMemberAmount}>
                            {getSplitAmount(m.user_id)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.dashedDivider} />

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.imageUploadBtn}>
                <Camera color={colors.textSecondary} size={18} />
                <Text style={styles.imageUploadText}>Add an image of the bill</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateBtn}>
                <Calendar color={colors.primary} size={16} style={{ marginRight: 6 }} />
                <Text style={styles.dateText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Submit Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{editMode ? 'Save Changes' : 'Submit expense'}</Text>}
          </TouchableOpacity>
        </View>

        {/* Unequal Split Bottom Sheet Modal */}
        <Modal 
          visible={showUnequalModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowUnequalModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              
              {/* Modal Drag Handle */}
              <View style={styles.modalHandle} />

              {/* Top Toggle */}
              <View style={styles.modalToggleRow}>
                <TouchableOpacity 
                  style={[styles.modalToggleBtn, unequalMode === 'amount' && styles.modalToggleBtnActive]}
                  onPress={() => setUnequalMode('amount')}
                >
                  <Text style={[styles.modalToggleText, unequalMode === 'amount' && styles.modalToggleTextActive]}>By amount</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalToggleBtn, unequalMode === 'shares' && styles.modalToggleBtnActive]}
                  onPress={() => setUnequalMode('shares')}
                >
                  <Text style={[styles.modalToggleText, unequalMode === 'shares' && styles.modalToggleTextActive]}>By shares</Text>
                </TouchableOpacity>
              </View>

              {/* Members List Header */}
              <View style={styles.modalListHeader}>
                <Text style={styles.label}>Split Among <Text style={styles.labelLight}>( Tap to unselect )</Text></Text>
                <Text style={styles.label}>{unequalMode === 'amount' ? 'Enter Amount' : 'Enter Shares'}</Text>
              </View>

              {/* Members List */}
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {members.map(m => {
                  const isSelected = selectedMembers.includes(m.user_id);
                  return (
                    <View key={m.user_id} style={[styles.modalMemberRow, !isSelected && { opacity: 0.5 }]}>
                      <TouchableOpacity onPress={() => toggleMember(m.user_id)} style={styles.modalCheckbox}>
                        {isSelected ? <CheckSquare color={colors.primary} size={24} /> : <Square color={colors.textMuted} size={24} />}
                      </TouchableOpacity>
                      
                      <View style={styles.modalMemberAvatar}>
                        <Text style={styles.memberAvatarInitials}>{m.name?.charAt(0).toUpperCase()}</Text>
                      </View>
                      
                      <Text style={styles.modalMemberName}>{m.user_id === user.id ? 'You' : m.name}</Text>
                      
                      {isSelected && (
                        <View style={styles.modalInputContainer}>
                          {unequalMode === 'amount' && <Text style={styles.modalInputSymbol}>₹</Text>}
                          <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={unequalMode === 'amount' ? String(customAmounts[m.user_id] || '') : String(customShares[m.user_id] || '')}
                            onChangeText={(val) => {
                              if (unequalMode === 'amount') {
                                handleAmountChange(m.user_id, val);
                              } else {
                                setCustomShares(prev => ({ ...prev, [m.user_id]: val }));
                              }
                            }}
                            placeholder="0"
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <Text style={styles.modalFooterText}>People : {selectedMembers.length} / {members.length}</Text>
                {unequalMode === 'amount' && (
                  <Text style={styles.modalFooterText}>
                    Remaining: <Text style={{ color: remainingAmount == 0 ? colors.primary : colors.danger }}>₹{remainingAmount}</Text>/{price}
                  </Text>
                )}
              </View>

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setShowUnequalModal(false)}>
                <Text style={styles.modalSubmitBtnText}>Submit</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

        {/* Add Member Modal (Duplicated for convenience) */}
        <Modal 
          visible={showAddMember} 
          animationType="slide" 
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddMember(false)}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Member</Text>
              <TouchableOpacity onPress={() => setShowAddMember(false)}>
                <Text style={styles.modalCancel}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Email / Phone Input Section */}
            <View style={styles.emailSection}>
              <Text style={styles.emailSectionTitle}>Add by Email or Phone</Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="email or 10-digit phone number"
                  placeholderTextColor={colors.textMuted}
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  keyboardType="default"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.emailAddBtn} onPress={handleAddByContact}>
                  <Text style={styles.emailAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or pick from contacts</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Search Bar */}
            <View style={styles.contactSearchContainer}>
              <Text style={styles.contactSearchIcon}>🔍</Text>
              <TextInput
                style={styles.contactSearchInput}
                placeholder="Search contacts..."
                placeholderTextColor={colors.textMuted}
                value={contactSearch}
                onChangeText={setContactSearch}
                autoCorrect={false}
              />
              {contactSearch.length > 0 && (
                <TouchableOpacity onPress={() => setContactSearch('')}>
                  <Text style={{ color: colors.textMuted, fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingContacts
              ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              : <FlatList
                  data={contacts.filter(c => {
                    const q = contactSearch.toLowerCase();
                    if (!q) return true;
                    const nameMatch = (c.name || '').toLowerCase().includes(q);
                    const phoneMatch = (c.phoneNumbers?.[0]?.number || '').includes(q);
                    return nameMatch || phoneMatch;
                  })}
                  keyExtractor={item => item.id}
                  contentContainerStyle={{ padding: 16 }}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 15 }}>No contacts found</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.contactRow} onPress={() => handleAddMember(item)}>
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>{item.name?.charAt(0) || '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <Text style={styles.contactPhone}>{item.phoneNumbers[0]?.number}</Text>
                      </View>
                      <View style={styles.addBtn}>
                        <Plus color={colors.surface} size={16} />
                      </View>
                    </TouchableOpacity>
                  )}
                />
            }
          </SafeAreaView>
        </Modal>

        {/* Picker Modal for Category and Payer */}
        <Modal visible={!!pickerModal} transparent animationType="slide" onRequestClose={() => setPickerModal(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerModal(null)}>
            <View style={[styles.modalContent, { maxHeight: '50%' }]}>
              <View style={styles.modalHandle} />
              <Text style={[styles.label, { marginBottom: 16 }]}>
                {pickerModal === 'category' ? 'Select Category' : 'Select Payer'}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {pickerModal === 'category' && CATEGORIES.map(c => (
                  <TouchableOpacity key={c.value} style={styles.pickerItem} onPress={() => { setCategory(c.value); setPickerModal(null); }}>
                    <Text style={styles.pickerItemText}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
                {pickerModal === 'payer' && members.filter(m => m && m.user_id).map(m => (
                  <TouchableOpacity key={m.user_id} style={styles.pickerItem} onPress={() => { setPaidBy(m.user_id); setPickerModal(null); }}>
                    <Text style={styles.pickerItemText}>{m.user_id === user?.id ? 'You' : (m.name || '?')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, backgroundColor: colors.surface, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginLeft: 16, flex: 1 },
  groupBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  groupBadgeText: { fontSize: 13, fontWeight: '700', color: colors.surface },
  
  content: { flex: 1, paddingHorizontal: 16 },
  
  membersStrip: { marginTop: 16, marginBottom: 24, flexDirection: 'row' },
  addFriendCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.textPrimary, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  memberAvatarContainer: { alignItems: 'center', marginRight: 20 },
  memberAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  memberAvatarInitials: { fontSize: 20, fontWeight: '700', color: colors.primary },
  memberName: { fontSize: 12, fontWeight: '500', color: colors.textPrimary, marginTop: 8 },

  billActionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  billBadge: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  billBadgeText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
  addBillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, gap: 6 },
  addBillText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  appsStrip: { flexDirection: 'row', marginBottom: 20 },
  appIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: colors.surface },
  appIconText: { fontSize: 14, fontWeight: '800' },
  
  divider: { alignItems: 'center', marginVertical: 8 },
  dividerText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, backgroundColor: colors.surface, paddingHorizontal: 8, zIndex: 1 },
  
  formGrid: { flexDirection: 'row', gap: 20 },
  formCol: { flex: 1 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  labelLight: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  input: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  priceContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingVertical: 4 },
  priceSymbol: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.textPrimary },

  splitSection: { marginTop: 32 },
  splitToggles: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 20, padding: 4 },
  splitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 16 },
  splitBtnActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  splitBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  splitBtnTextActive: { color: colors.surface },

  splitAmongSection: { marginTop: 32 },
  splitMembersList: { flexDirection: 'row', paddingTop: 8 },
  splitMemberCard: { width: 72, marginRight: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  splitMemberCardActive: { borderColor: colors.primary },
  splitMemberTop: { backgroundColor: colors.background, paddingVertical: 8, alignItems: 'center' },
  splitMemberTopActive: { backgroundColor: colors.primary },
  splitMemberName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  splitMemberNameActive: { color: colors.surface },
  splitMemberBottom: { paddingVertical: 12, alignItems: 'center', backgroundColor: colors.surface },
  splitMemberAmount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  dashedDivider: { height: 1, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed', marginVertical: 24 },
  
  bottomActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  imageUploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 8 },
  imageUploadText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  dateText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  footer: { padding: 16, backgroundColor: colors.surface },
  submitBtn: { backgroundColor: colors.textPrimary, paddingVertical: 20, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: colors.surface, fontSize: 16, fontWeight: '700' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.borderMedium, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalToggleRow: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 24, padding: 4, marginBottom: 24 },
  modalToggleBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 20 },
  modalToggleBtnActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  modalToggleText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  modalToggleTextActive: { color: colors.surface },
  modalListHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalList: { maxHeight: 300 },
  modalMemberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5E1', borderRadius: 16, padding: 12, marginBottom: 12 },
  modalCheckbox: { marginRight: 12 },
  modalMemberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalMemberName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 100, borderWidth: 1, borderColor: colors.borderLight },
  modalInputSymbol: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginRight: 4 },
  modalInput: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, marginBottom: 24, paddingHorizontal: 8 },
  modalFooterText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  modalSubmitBtn: { backgroundColor: '#000', paddingVertical: 20, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  modalSubmitBtnText: { color: colors.surface, fontSize: 16, fontWeight: '700' },

  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  contactAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  contactName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  contactPhone: { fontSize: 13, color: colors.textSecondary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  
  contactSearchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 4, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 14, height: 48 },
  contactSearchIcon: { fontSize: 16, marginRight: 8 },
  contactSearchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  emailSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  emailSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  emailRow: { flexDirection: 'row', gap: 10 },
  emailInput: { flex: 1, backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.borderMedium, paddingHorizontal: 14, height: 48, fontSize: 15, color: colors.textPrimary },
  emailAddBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  emailAddBtnText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
});
