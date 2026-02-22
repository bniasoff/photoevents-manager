import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEBREW_DATES_KEY = 'hebrew_calendar_dates';

export interface HebrewDate {
  date: string; // YYYY-MM-DD format
  title: string;
  description?: string;
}

/**
 * Parse ICS file content and extract events
 */
const parseICSFile = (icsContent: string): HebrewDate[] => {
  const events: HebrewDate[] = [];
  const lines = icsContent.split(/\r\n|\n|\r/);

  let currentEvent: Partial<HebrewDate> | null = null;
  let isInEvent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      isInEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.date && currentEvent.title) {
        events.push(currentEvent as HebrewDate);
      }
      currentEvent = null;
      isInEvent = false;
      continue;
    }

    if (!isInEvent || !currentEvent) continue;

    // Parse DTSTART (date)
    if (line.startsWith('DTSTART')) {
      const dateMatch = line.match(/DTSTART[;:].*?(\d{8})/);
      if (dateMatch) {
        const dateStr = dateMatch[1]; // YYYYMMDD
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        currentEvent.date = `${year}-${month}-${day}`;
      }
    }

    // Parse SUMMARY (title)
    if (line.startsWith('SUMMARY:')) {
      currentEvent.title = line.substring(8).trim();
    }

    // Parse DESCRIPTION
    if (line.startsWith('DESCRIPTION:')) {
      currentEvent.description = line.substring(12).trim();
    }
  }

  return events;
};

/**
 * Import Hebrew calendar from ICS file and store locally
 */
export const importHebrewCalendar = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    console.log('📅 Starting Hebrew calendar import...');

    // Pick ICS file
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/calendar', 'text/plain', '*/*'], // Accept all types since ICS can have different MIME types
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      console.log('Import cancelled by user');
      return { success: false, count: 0, error: 'Import cancelled' };
    }

    const fileUri = result.assets[0].uri;
    console.log('Reading ICS file:', fileUri);

    // Read file content using fetch (new API)
    const response = await fetch(fileUri);
    const icsContent = await response.text();

    // Parse ICS content
    const hebrewDates = parseICSFile(icsContent);
    console.log(`Parsed ${hebrewDates.length} Hebrew dates from ICS file`);

    if (hebrewDates.length === 0) {
      return { success: false, count: 0, error: 'No dates found in calendar file' };
    }

    // Store in AsyncStorage
    await AsyncStorage.setItem(HEBREW_DATES_KEY, JSON.stringify(hebrewDates));

    console.log(`✅ Successfully imported ${hebrewDates.length} Hebrew dates`);
    return { success: true, count: hebrewDates.length };

  } catch (error) {
    console.error('Error importing Hebrew calendar:', error);
    return { success: false, count: 0, error: String(error) };
  }
};

/**
 * Get all Hebrew dates from local storage
 */
export const getAllHebrewDates = async (): Promise<HebrewDate[]> => {
  try {
    const storedDates = await AsyncStorage.getItem(HEBREW_DATES_KEY);
    if (!storedDates) {
      return [];
    }
    return JSON.parse(storedDates);
  } catch (error) {
    console.error('Error fetching Hebrew dates:', error);
    return [];
  }
};

/**
 * Get Hebrew dates as a map of date string to HebrewDate for easy lookup
 */
export const getHebrewDatesMap = async (): Promise<Record<string, HebrewDate>> => {
  try {
    const dates = await getAllHebrewDates();
    const map: Record<string, HebrewDate> = {};
    dates.forEach((date) => {
      map[date.date] = date;
    });
    return map;
  } catch (error) {
    console.error('Error creating Hebrew dates map:', error);
    return {};
  }
};

/**
 * Check if a specific date is a Hebrew holiday
 */
export const isHebrewDate = async (date: string): Promise<HebrewDate | null> => {
  try {
    const dateOnly = date.split('T')[0];
    const datesMap = await getHebrewDatesMap();
    return datesMap[dateOnly] || null;
  } catch (error) {
    console.error('Error checking Hebrew date:', error);
    return null;
  }
};

/**
 * Delete all Hebrew dates (for re-importing)
 */
export const clearHebrewDates = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(HEBREW_DATES_KEY);
    console.log('✅ Hebrew dates cleared');
    return true;
  } catch (error) {
    console.error('Error clearing Hebrew dates:', error);
    return false;
  }
};

/**
 * Get Hebrew dates count
 */
export const getHebrewDatesCount = async (): Promise<number> => {
  try {
    const dates = await getAllHebrewDates();
    return dates.length;
  } catch (error) {
    console.error('Error getting Hebrew dates count:', error);
    return 0;
  }
};
