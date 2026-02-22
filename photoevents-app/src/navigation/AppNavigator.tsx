import React, { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AllEventsScreen } from '../screens/AllEventsScreen';
import { ByDateScreen } from '../screens/ByDateScreen';
import { ByCategoryScreen } from '../screens/ByCategoryScreen';
import { ByStatusScreen } from '../screens/ByStatusScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { theme } from '../theme/theme';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 57 + insets.bottom;
  const [settingsVisible, setSettingsVisible] = useState(false);

  const GearButton = () => (
    <TouchableOpacity
      onPress={() => setSettingsVisible(true)}
      style={{ marginRight: 16, padding: 4 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ fontSize: 22 }}>⚙️</Text>
    </TouchableOpacity>
  );

  return (
    <>
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
            headerRight: () => <GearButton />,
            tabBarStyle: {
              backgroundColor: theme.colors.backgroundSecondary,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              paddingTop: 8,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
              height: tabBarHeight,
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
            options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} /> }}
          />
          <Tab.Screen
            name="By Date"
            component={ByDateScreen}
            options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} /> }}
          />
          <Tab.Screen
            name="By Category"
            component={ByCategoryScreen}
            options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📂" color={color} /> }}
          />
          <Tab.Screen
            name="By Status"
            component={ByStatusScreen}
            options={{ tabBarIcon: ({ color }) => <TabIcon emoji="⚡" color={color} /> }}
          />
          <Tab.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📆" color={color} /> }}
          />
          <Tab.Screen
            name="Reports"
            component={ReportsScreen}
            options={{ tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }}
          />
        </Tab.Navigator>
      </NavigationContainer>

      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </>
  );
};

const TabIcon: React.FC<{ emoji: string; color: string }> = ({ emoji }) => (
  <Text style={{ fontSize: 24 }}>{emoji}</Text>
);
