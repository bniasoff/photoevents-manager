import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AllEventsScreen } from '../screens/AllEventsScreen';
import { ByDateScreen } from '../screens/ByDateScreen';
import { ByCategoryScreen } from '../screens/ByCategoryScreen';
import { ByStatusScreen } from '../screens/ByStatusScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { theme } from '../theme/theme';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.backgroundSecondary,
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: {
            fontWeight: theme.fontWeight.bold,
            fontSize: theme.fontSize.lg,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.backgroundSecondary,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingTop: 8,
            paddingBottom: 8,
            height: 65,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: theme.fontWeight.medium,
            marginBottom: 4,
          },
        }}
      >
        <Tab.Screen
          name="All Events"
          component={AllEventsScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon emoji="📋" color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="By Date"
          component={ByDateScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon emoji="📅" color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="By Category"
          component={ByCategoryScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon emoji="📂" color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="By Status"
          component={ByStatusScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon emoji="⚡" color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon emoji="📆" color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <TabIcon emoji="📊" color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

// Simple emoji icon component
import { Text } from 'react-native';

const TabIcon: React.FC<{ emoji: string; color: string }> = ({ emoji }) => {
  return <Text style={{ fontSize: 24 }}>{emoji}</Text>;
};
