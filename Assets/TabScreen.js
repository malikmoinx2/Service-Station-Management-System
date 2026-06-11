import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Aapki screens ka import
import Dashboard from './Dashboard';
import notification from './notification';
import userprofile from './userprofile';

const Tab = createBottomTabNavigator();

export default function TabScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'limegreen',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { 
          height: 65, 
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: 'lightgrey'
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        }
      }}
    >
      {/* DASHBOARD TAB */}
      <Tab.Screen 
        name="Dashboard" 
        component={Dashboard} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>🏠</Text>
          ),
        }} 
      />

      {/* NOTIFICATION TAB */}
      <Tab.Screen 
        name="notification" 
        component={notification} 
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>🔔</Text>
          ),
        }} 
      />

      {/* PROFILE TAB */}
      <Tab.Screen 
        name="userprofile" 
        component={userprofile} 
        options={{
          tabBarLabel: 'Profile',
          tabBarStyle: { display: 'none' },                     //yeh tab bar ko hide krta hai
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>👤</Text>
          ),
        }} 
      />
    </Tab.Navigator>
  );
}