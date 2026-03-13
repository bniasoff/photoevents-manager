import AsyncStorage from '@react-native-async-storage/async-storage';

export type NavApp = 'waze' | 'google_maps';

export type UserLocation =
  | 'lakewood'
  | 'brooklyn'
  | 'crown_heights'
  | 'monsey'
  | 'five_towns'
  | 'queens'
  | 'passaic'
  | 'teaneck'
  | 'staten_island';

const ALL_LOCATIONS: UserLocation[] = [
  'lakewood', 'brooklyn', 'crown_heights', 'monsey',
  'five_towns', 'queens', 'passaic', 'teaneck', 'staten_island',
];

const LOCATION_KEY = 'user_location_preference';
const DEFAULT_LOCATION: UserLocation = 'lakewood';

export const getUserLocationPreference = async (): Promise<UserLocation> => {
  try {
    const value = await AsyncStorage.getItem(LOCATION_KEY);
    if (value && ALL_LOCATIONS.includes(value as UserLocation)) return value as UserLocation;
    return DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
};

export const setUserLocationPreference = async (loc: UserLocation): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOCATION_KEY, loc);
  } catch {
    // ignore
  }
};

// ── Notification reminder preferences ────────────────────────────────────────
export type ReminderMinutes = 10 | 30 | 60;

const REMINDER_ENABLED_KEY = 'reminder_enabled';
const REMINDER_MINUTES_KEY = 'reminder_minutes';

export const getReminderEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(REMINDER_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

export const setReminderEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch { /* ignore */ }
};

export const getReminderMinutes = async (): Promise<ReminderMinutes> => {
  try {
    const value = await AsyncStorage.getItem(REMINDER_MINUTES_KEY);
    if (value === '10' || value === '30' || value === '60') return parseInt(value) as ReminderMinutes;
    return 30;
  } catch {
    return 30;
  }
};

export const setReminderMinutes = async (minutes: ReminderMinutes): Promise<void> => {
  try {
    await AsyncStorage.setItem(REMINDER_MINUTES_KEY, String(minutes));
  } catch { /* ignore */ }
};

// ── Sort order ────────────────────────────────────────────────────────────────
export type SortOrder = 'asc' | 'desc' | 'name-asc' | 'name-desc';
const SORT_KEY = 'sort_order_preference';
const DEFAULT_SORT: SortOrder = 'asc';

export const getSortOrderPreference = async (): Promise<SortOrder> => {
  try {
    const value = await AsyncStorage.getItem(SORT_KEY);
    if (value === 'asc' || value === 'desc' || value === 'name-asc' || value === 'name-desc') return value as SortOrder;
    return DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
};

export const setSortOrderPreference = async (order: SortOrder): Promise<void> => {
  try {
    await AsyncStorage.setItem(SORT_KEY, order);
  } catch {
    // ignore
  }
};

const KEY = 'nav_app_preference';
const DEFAULT: NavApp = 'waze';

export const getNavAppPreference = async (): Promise<NavApp> => {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (value === 'waze' || value === 'google_maps') return value;
    return DEFAULT;
  } catch {
    return DEFAULT;
  }
};

export const setNavAppPreference = async (app: NavApp): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, app);
  } catch {
    // ignore
  }
};

export const openAddressInNavApp = async (address: string): Promise<void> => {
  const { Linking } = await import('react-native');
  const app = await getNavAppPreference();
  const query = encodeURIComponent(address);

  if (app === 'google_maps') {
    const deepLink = `comgooglemaps://?q=${query}`;
    const canOpen = await Linking.canOpenURL(deepLink);
    if (canOpen) {
      Linking.openURL(deepLink);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
  } else {
    const deepLink = `waze://?q=${query}&navigate=yes`;
    const canOpen = await Linking.canOpenURL(deepLink);
    if (canOpen) {
      Linking.openURL(deepLink);
    } else {
      Linking.openURL(`https://waze.com/ul?q=${query}&navigate=yes`);
    }
  }
};
