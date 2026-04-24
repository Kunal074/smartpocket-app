import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Home, Users, PieChart, Receipt, User } from 'lucide-react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} />
        }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={22} />
        }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <PieChart color={color} size={22} />
        }}
      />
      <Tab.Screen 
        name="Activity" 
        component={AnalyticsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={22} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AnalyticsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={22} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor="#F4F8FB" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="MainTabs" component={BottomTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
