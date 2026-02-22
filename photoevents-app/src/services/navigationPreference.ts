import AsyncStorage from '@react-native-async-storage/async-storage';

export type NavApp = 'waze' | 'google_maps';

export type SortOrder = 'asc' | 'desc';
const SORT_KEY = 'sort_order_preference';
const DEFAULT_SORT: SortOrder = 'asc';

export const getSortOrderPreference = async (): Promise<SortOrder> => {
  try {
    const value = await AsyncStorage.getItem(SORT_KEY);
    if (value === 'asc' || value === 'desc') return value;
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
