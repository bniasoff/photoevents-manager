import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  getAuthStatus,
  AuthStatus,
  authenticateWithGoogle,
  signOut,
} from '../services/googleCalendarBackendService';
import {
  areNotificationsEnabled,
  requestNotificationPermissions,
} from '../services/notificationService';
import {
  NavApp,
  getNavAppPreference,
  setNavAppPreference,
  SortOrder,
  getSortOrderPreference,
  setSortOrderPreference,
} from '../services/navigationPreference';
import { theme } from '../theme/theme';

const notificationsDisabled =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
  Platform.OS === 'ios';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${h}:${minutes} ${ampm}`;
};

const formatSessionDeadline = (signedInAt: string | null): { deadline: string; daysLeft: number } | null => {
  if (!signedInAt) return null;
  const signedIn = new Date(signedInAt).getTime();
  const deadline = signedIn + 7 * 24 * 60 * 60 * 1000;
  const msLeft = deadline - Date.now();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  return {
    deadline: formatDateTime(new Date(deadline).toISOString()),
    daysLeft,
  };
};

const APP_VERSION = '1.0.0';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ visible, onClose }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [navApp, setNavApp] = useState<NavApp>('waze');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const googleConnected = !!(authStatus?.authenticated && authStatus?.hasRefreshToken);

  const loadStatuses = async () => {
    setIsCheckingGoogle(true);
    try {
      const [status, notif, nav, sort] = await Promise.all([
        getAuthStatus(),
        areNotificationsEnabled(),
        getNavAppPreference(),
        getSortOrderPreference(),
      ]);
      setAuthStatus(status);
      setNotificationsEnabled(notif);
      setNavApp(nav);
      setSortOrder(sort);
    } finally {
      setIsCheckingGoogle(false);
    }
  };

  const handleNavAppSelect = async (app: NavApp) => {
    await setNavAppPreference(app);
    setNavApp(app);
  };

  const handleSortOrderSelect = async (order: SortOrder) => {
    await setSortOrderPreference(order);
    setSortOrder(order);
    DeviceEventEmitter.emit('preferencesChanged');
  };

  useEffect(() => {
    if (visible) {
      loadStatuses();
    }
  }, [visible]);

  const handleGoogleSignIn = async () => {
    await authenticateWithGoogle();
    // Give user time to complete OAuth in browser then recheck
    setTimeout(async () => {
      const status = await getAuthStatus();
      setAuthStatus(status);
    }, 5000);
  };

  const handleGoogleSignOut = () => {
    Alert.alert('Sign Out', 'Disconnect Google Calendar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await signOut();
            setAuthStatus(null);
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermissions();
    setNotificationsEnabled(granted);
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your phone Settings app.',
      );
    }
  };

  const handleTestNotification = async () => {
    if (notificationsDisabled) return;
    try {
      const Notifications = require('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📸 Photo Events',
          body: 'Notifications are working!',
          sound: true,
        },
        trigger: { seconds: 3, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
      });
      Alert.alert('Test Sent', 'You will receive a test notification in 3 seconds.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification.');
    }
  };

  const handleRefreshStatus = async () => {
    await loadStatuses();
    Alert.alert('Refreshed', 'Connection status updated.');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Settings</Text>
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Google Calendar ── */}
          <Text style={styles.sectionTitle}>GOOGLE CALENDAR</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>📅</Text>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Google Calendar</Text>
              {isCheckingGoogle ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: googleConnected ? '#166534' : '#7f1d1d' },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: googleConnected ? '#4ade80' : '#fca5a5' }]}>
                    {googleConnected ? '● Connected' : '○ Not connected'}
                  </Text>
                </View>
              )}
            </View>

            {googleConnected && authStatus?.signedInAt && (() => {
              const session = formatSessionDeadline(authStatus.signedInAt);
              if (!session) return null;
              const urgent = session.daysLeft <= 1;
              const expired = session.daysLeft <= 0;
              return (
                <>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.rowIcon}>📅</Text>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel}>Signed in</Text>
                      <Text style={styles.rowValue}>{formatDate(authStatus.signedInAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.rowIcon}>{expired ? '⚠️' : urgent ? '⏰' : '🔐'}</Text>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel}>Re-sign required by</Text>
                      <Text style={[styles.rowValue, {
                        color: expired ? theme.colors.error : urgent ? theme.colors.warning : theme.colors.success
                      }]}>
                        {session.deadline}
                        {expired
                          ? ' — session expired, please sign in'
                          : session.daysLeft === 1
                            ? ' (tomorrow!)'
                            : ` (${session.daysLeft} days left)`}
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}

            <View style={styles.divider} />

            {googleConnected ? (
              <TouchableOpacity
                style={styles.row}
                onPress={handleGoogleSignOut}
                disabled={isSigningOut}
              >
                <Text style={styles.rowIcon}>🚪</Text>
                <Text style={[styles.rowLabel, { color: theme.colors.error }]}>
                  {isSigningOut ? 'Signing out…' : 'Sign Out of Google'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.row} onPress={handleGoogleSignIn}>
                <Text style={styles.rowIcon}>🔗</Text>
                <Text style={[styles.rowLabel, { color: theme.colors.primary }]}>
                  Connect Google Calendar
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Notifications ── */}
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>🔔</Text>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Push Notifications</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: notificationsEnabled ? '#166534' : '#7f1d1d' },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: notificationsEnabled ? '#4ade80' : '#fca5a5' }]}>
                  {notificationsEnabled ? '● Enabled' : '○ Disabled'}
                </Text>
              </View>
            </View>

            {!notificationsEnabled && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.row} onPress={handleEnableNotifications}>
                  <Text style={styles.rowIcon}>✅</Text>
                  <Text style={[styles.rowLabel, { color: theme.colors.primary }]}>
                    Enable Notifications
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {notificationsEnabled && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.row} onPress={handleTestNotification}>
                  <Text style={styles.rowIcon}>🧪</Text>
                  <Text style={styles.rowLabel}>Send Test Notification</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Data ── */}
          <Text style={styles.sectionTitle}>DATA</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.row} onPress={handleRefreshStatus}>
              <Text style={styles.rowIcon}>🔄</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Refresh Status</Text>
                <Text style={styles.rowValue}>Re-check connections</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowIcon}>💡</Text>
              <Text style={styles.rowHint}>
                Pull down on any list screen to refresh event data.
              </Text>
            </View>
          </View>

          {/* ── Display ── */}
          <Text style={styles.sectionTitle}>DISPLAY</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>🗂️</Text>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Sort events by date</Text>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSortOrderSelect('asc')}
            >
              <Text style={styles.rowIcon}>⬆️</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Oldest first</Text>
                <Text style={styles.rowValue}>Earliest dates at the top</Text>
              </View>
              {sortOrder === 'asc' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSortOrderSelect('desc')}
            >
              <Text style={styles.rowIcon}>⬇️</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Newest first</Text>
                <Text style={styles.rowValue}>Latest dates at the top</Text>
              </View>
              {sortOrder === 'desc' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>

          {/* ── Navigation App ── */}
          <Text style={styles.sectionTitle}>NAVIGATION</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>🗺️</Text>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Open addresses in</Text>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleNavAppSelect('waze')}
            >
              <Text style={styles.rowIcon}>🔵</Text>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Waze</Text>
              {navApp === 'waze' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleNavAppSelect('google_maps')}
            >
              <Text style={styles.rowIcon}>📍</Text>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Google Maps</Text>
              {navApp === 'google_maps' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>

          {/* ── About ── */}
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>📸</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Photo Events Manager</Text>
                <Text style={styles.rowValue}>Version {APP_VERSION}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowIcon}>⚡</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Built with</Text>
                <Text style={styles.rowValue}>React Native · Expo · Supabase</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  doneButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  doneButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  section: {
    backgroundColor: theme.colors.cardBackground,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  rowIcon: {
    fontSize: 22,
    marginRight: theme.spacing.md,
    width: 30,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  rowValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rowValueRight: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  rowHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 58,
  },
  checkmark: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
    marginRight: 4,
  },
});
