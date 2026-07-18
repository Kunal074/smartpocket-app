import 'react-native-gesture-handler';
import { NavigationContainer as NavContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Home, Users, PieChart, GitFork, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DashboardScreen from './src/screens/DashboardScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import BillsScreen from './src/screens/BillsScreen';
import BalancesScreen from './src/screens/BalancesScreen';
import LoginScreen from './src/screens/LoginScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SignupScreen from './src/screens/SignupScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import GroupAddExpenseScreen from './src/screens/GroupAddExpenseScreen';
import ExpenseDetailScreen from './src/screens/ExpenseDetailScreen';
import PersonBalanceDetailScreen from './src/screens/PersonBalanceDetailScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import GroupSettingsScreen from './src/screens/GroupSettingsScreen';
import GroupExpenseHistoryScreen from './src/screens/GroupExpenseHistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BudgetSetupScreen from './src/screens/BudgetSetupScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import SavingsScreen from './src/screens/SavingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ArenaScreen from './src/screens/ArenaScreen';
import { colors } from './src/theme/colors';
import { useAuth } from './src/store/useAuth';
import React, { useEffect } from 'react';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// ─── SmartSplit nested tab navigator ────────────────────────────────────────
function SmartSplitTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: 56 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#5A67D8',
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          tabBarIcon: ({ color }) => <Users color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Bills"
        component={BillsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <PieChart color={color} size={22} />
          ),
        }}
      />
      <Tab.Screen
        name="Balances"
        component={BalancesScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <GitFork color={color} size={22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Main bottom tab navigator ───────────────────────────────────────────────
function BottomTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 4 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="SmartSplit"
        component={SmartSplitTabs}
        options={{
          tabBarIcon: ({ color }) => <Users color={color} size={22} />,
          tabBarLabel: 'SmartSplit',
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color }) => <PieChart color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Settings color={color} size={22} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
import { useShareIntent } from 'expo-share-intent';
import { Alert, Vibration } from 'react-native';
import { api } from './src/api/client';
import { Accelerometer } from 'expo-sensors';

export default function App() {
  const { token, initAuth, isLoading, isFirstLaunch, shakeToAdd } = useAuth();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    let subscription = null;
    let lastShake = 0;

    if (token && shakeToAdd) {
      Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // 2.2G magnitude detection & 2 seconds debounce cooldown
        if (acceleration > 2.2 && now - lastShake > 2000) {
          lastShake = now;
          Vibration.vibrate(200);
          if (navigationRef.isReady()) {
            navigationRef.navigate('AddExpense');
          }
        }
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [token, shakeToAdd]);

  useEffect(() => {
    // If user is logged in and we received a text share intent
    if (token && hasShareIntent && shareIntent.value && shareIntent.type === 'text') {
      const processSharedText = async () => {
        try {
          // You could show a local toast here
          const res = await api.post('/expenses/text', { text: shareIntent.value });
          if (res.data && !res.data.error && res.data.amount) {
            
            // Actually save the expense to the DB!
            await api.post('/expenses', {
              amount: parseFloat(res.data.amount),
              categoryId: res.data.category || 'other',
              note: res.data.note || 'Shared Expense',
              date: res.data.date || new Date().toISOString().slice(0, 10)
            });

            Alert.alert(
              'Expense Added via Share! 🎉',
              `Added ₹${res.data.amount} for ${res.data.category}.\nNote: ${res.data.note}`
            );
          } else {
            Alert.alert('Could not parse shared text', res.data?.error || 'AI failed to understand.');
          }
        } catch (e) {
          Alert.alert('Error', 'Failed to process shared text.');
        } finally {
          resetShareIntent();
        }
      };
      processSharedText();
    } else if (hasShareIntent) {
      // If it's not text or user not logged in, just clear it
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, token]);

  if (isLoading || isFirstLaunch === null) {
    return null;
  }

  return (
    <NavContainer ref={navigationRef}>
      <StatusBar style="dark" backgroundColor="#F4F8FB" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {isFirstLaunch ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : token ? (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabs} />
            <Stack.Screen name="BudgetSetup" component={BudgetSetupScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="GroupAddExpense" component={GroupAddExpenseScreen} options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PersonBalanceDetail" component={PersonBalanceDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="GroupExpenseHistory" component={GroupExpenseHistoryScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Recurring" component={RecurringScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Savings" component={SavingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Arena" component={ArenaScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavContainer>
  );
}

