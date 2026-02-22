import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Event } from '../types/Event';
import { theme } from '../theme/theme';
import { getCategoryIcon } from '../utils/categoryHelpers';
import { createEvent, fetchPlaces } from '../services/api';
import {
  authenticateWithGoogle,
  exportToGoogleCalendar,
  isAuthenticated,
} from '../services/googleCalendarBackendService';

interface CreateEventModalProps {
  visible: boolean;
  selectedDate: string; // yyyy-MM-dd
  onClose: () => void;
  onEventCreated: (event: Event) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  selectedDate,
  onClose,
  onEventCreated,
}) => {
  const [category, setCategory] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryText, setNewCategoryText] = useState('');
  const [startHour, setStartHour] = useState('');
  const [startMin, setStartMin] = useState('');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('PM');
  const [endHour, setEndHour] = useState('');
  const [endMin, setEndMin] = useState('');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('PM');
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [simchaInitiative, setSimchaInitiative] = useState(false);
  const [projector, setProjector] = useState(false);
  const [weinman, setWeinman] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isPlaceOpen, setIsPlaceOpen] = useState(false);
  const [customPlaces, setCustomPlaces] = useState<string[]>([]);
  const [newPlaceText, setNewPlaceText] = useState('');
  const [dbPlaces, setDbPlaces] = useState<Record<string, string> | null>(null);
  const [showCreatedToast, setShowCreatedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const scrollRef = useRef<ScrollView | null>(null);
  const placeYRef = useRef<number>(0);
  const searchInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (visible) {
      fetchPlaces().then((map) => {
        if (Object.keys(map).length > 0) setDbPlaces(map);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (isPlaceOpen) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: placeYRef.current - 40, animated: true });
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isPlaceOpen]);

  const categories: string[] = [
    'Bar Mitzvah',
    'Bat Mitzvah',
    'Vort',
    'Bris',
    'Pidyon Haben',
    'School',
    'Photoshoot',
    'Wedding',
    'CM',
    'Parlor Meeting',
    'Siyum',
    "L'Chaim",
    'Advertisements',
    'Beis Medrash',
    'Birthday',
    'Chanukas Habayis',
    'Chumesh Mesiba',
    'Chumesh Party',
    'Conference',
    'Dinner',
    'Even Hapina',
    'Hachnosas Sefer Torah',
    'Kollel',
    'Melava Malka',
    'Opsherin',
    'Presentation',
    'Seudas Hodah',
    'Sheva Brachos',
    'Shiur',
    'Vachtnact',
    'Yeshiva',
    'Yorzeit',
  ];

  const places: string[] = [
    'Ahavas Yonoson',
    'Albert Shul',
    'Ateres Esther',
    'Ateres Leah Yehudis',
    'Ateres Malka',
    'Ateres Yeshaya',
    'Beis Ahron',
    'Beis Elazar',
    'Beis Eliazer',
    'Beis Horah',
    'Beis Medrash of Lakewood Commons',
    'Beis Noson Tzvi',
    'Beis Pinchas',
    'Beis Shabsi',
    'Beis Shalom',
    'Beis Shapsee',
    'Beis Sholom',
    'Beis Tova',
    'Biton Shul',
    'Bnos Devorah',
    'Bnos Esther Malka',
    'Bnos Sarah',
    'Bnos Yaakov',
    'Cheder Toras Zev',
    'Cheshek Sholomo',
    'Circa',
    'Colel Chezek Sholomo',
    'Eagle Ridge',
    'Esther Gerber',
    'Esther Gerber Hall',
    'Estrea',
    'Gissinger',
    'Glatt Ambiance',
    'Gratter Hall',
    'Holly Oaks Park',
    'House',
    'Kamenitz',
    'Kesser Moshe Yehuda',
    'Keter Torah',
    'Khal Bnei Torah',
    'Khal Neustadt',
    'Lake Shenandoah County Park',
    'Lake Terrace',
    'Lakewood Commons Shul',
    'Lekach Tov',
    'Madison Manor',
    'Mesores Avos',
    'Ohel Shulamit',
    'Ohr Meir',
    'Ohr Tuvia',
    'Oros Beis Yaackov',
    'Park',
    'Percal Residence',
    'Pine St Shul',
    'Rabbi Forshimer',
    'Restaurant',
    'Ridge Terrace Hall',
    "Robert's Shul",
    'Shagas Aryeh',
    'Shearis Adas Yisroel',
    'Shul',
    'Shvilei Dovid',
    'Spruce St Shul',
    'Sqver Hall',
    'Stolin',
    'Tashbar',
    'The Cheder',
    'The Residence',
    'The River Terrace',
    'Tiferes Beis Yaackov',
    'Tomahork',
    'Toras Menachem',
    'Visnitz',
    'Vyelipol Hall',
    'Westgate Hall',
    'Westgate Simcha Hall',
    'Williams Street Shul',
    'Willow Court Shul',
    'YTT',
    'Yeshiva K\'Tana School',
    'Yeshiva Orchas Chaim',
    'Zichron Schneur',
  ];

  const placeAddresses: Record<string, string> = {
    'Ahavas Yonoson': '1995 Swathmore Ave, Lakewood NJ, 08701',
    'Albert Shul': '699 Albert Ave, Lakewood NJ, 08701',
    'Ateres Esther': '1142 East County Line Road, Lakewood NJ, 08701',
    'Ateres Leah Yehudis': '971 Caldwell Ave, Lakewood, NJ 08701',
    'Ateres Malka': '140 Lehigh Ave, Lakewood NJ 08701',
    'Ateres Yeshaya': '908 East County Line Road, Lakewood, NJ 08701',
    'Beis Ahron': '345 9th Avenue, Lakewood NJ, 08701',
    'Beis Elazar': '185 Miller Road, Lakewood, NJ 08701',
    'Beis Eliazer': '185 Miller Road, Lakewood NJ 08701',
    'Beis Horah': '401 Madison Ave, Lakewood, NJ 08701',
    'Beis Medrash of Lakewood Commons': '44 Coles Way, Lakewood NJ, 08701',
    'Beis Noson Tzvi': '1445 14th Street, Lakewood NJ, 08701',
    'Beis Pinchas': '1951 New Central Ave, Lakewood, NJ 08701',
    'Beis Shabsi': '61 Pawnee Road, Lakewood, NJ 08701',
    'Beis Shalom': '345 9th Avenue, Lakewood NJ, 08701',
    'Beis Shapsee': '61 Pawnee Rd, Lakewood, NJ 08701',
    'Beis Sholom': '345 9th Avenue, Lakewood NJ, 08701',
    'Beis Tova': '555 Oak Street, Lakewood, NJ 08701',
    'Biton Shul': '701 Princeton Ave, Lakewood NJ, 08701',
    'Bnos Devorah': '360 Oak St, Lakewood, NJ 08701',
    'Bnos Esther Malka': '506 New Egypt Road, Lakewood NJ, 08701',
    'Bnos Sarah': '1462 Pinemere Avenue, Lakewood, NJ',
    'Bnos Yaakov': '2 Kent Road, Lakewood NJ, 08701',
    'Cheder Toras Zev': '1000 Cross St, Lakewood, NJ 08701',
    'Cheshek Sholomo': '506 New Egypt Road, Lakewood NJ 08701',
    'Circa': '415 Cedar Bridge Ave, Lakewood NJ, 08701',
    'Colel Chezek Sholomo': '506 Egypt Road, Lakewood NJ 08701',
    'Eagle Ridge': '2 Augusta Blvd, Lakewood NJ 08701',
    'Esther Gerber': '590 Madison Ave, Lakewood NJ, 08701',
    'Esther Gerber Hall': '590 Madison Ave, Lakewood, NJ 08701',
    'Estrea': '978 River Ave, Lakewood, NJ 08701',
    'Gissinger': '175 Sunset Rd, Lakewood, NJ 08701',
    'Glatt Ambiance': '179 East Kennady Blvd, Lakewood, NJ 08701',
    'Gratter Hall': '200 Park Ave South, Lakewood NJ, 08701',
    'Holly Oaks Park': 'Eleanor Rd, Manchester Township, NJ 08759',
    'House': '8 Cortelyou, Jackson, NJ 08701',
    'Kamenitz': '831 Ridge Ave, Lakewood NJ, 08701',
    'Kesser Moshe Yehuda': '725 Vasser Ave, Lakewood NJ 08701',
    'Keter Torah': '5 Meridian Road, Eatontown, NJ 08701',
    'Khal Bnei Torah': '304 Monmouth Ave, Lakewood, NJ 08701',
    'Khal Neustadt': '615 East County Line Road, Lakewood NJ 08701',
    'Lake Shenandoah County Park': '660 Ocean Avenue, Lakewood, NJ 08701',
    'Lake Terrace': '1690 Oak Street, Lakewood, NJ 08701',
    'Lakewood Commons Shul': '347 Coles Way, Lakewood, NJ 08701',
    'Lekach Tov': '830 Cross Street, Lakewood, NJ',
    'Madison Manor': '401 Madison Ave, Lakewood, NJ 08701',
    'Mesores Avos': '23 Congress Street, Lakewood, NJ 08701',
    'Ohel Shulamit': '38 Spruce Street, Lakewood, NJ 08701',
    'Ohr Meir': '30 5th Street, Lakewood NJ 08701',
    'Ohr Tuvia': '969 East End Ave, Lakewood, NJ 08701',
    'Oros Beis Yaackov': '1995 Rutgers University Blvd, Lakewood, NJ',
    'Park': 'Lake Shenandoah County Park, Lakewood, NJ 08701',
    'Percal Residence': '165 Regent Place, Lakewood, NJ',
    'Pine St Shul': '613 Pine St, Lakewood NJ 08701',
    'Rabbi Forshimer': '418 5th Street, Lakewood NJ, 08701',
    'Restaurant': 'S Hope Chapel Rd, Jackson Township, NJ 08527',
    'Ridge Terrace Hall': '831 Ridge Ave, Lakewood, NJ 08701',
    "Robert's Shul": '104 Arbutus Drive, Lakewood NJ, 08701',
    'Shagas Aryeh': '975 Cross St, Lakewood NJ 08701',
    'Shearis Adas Yisroel': '425 5th Street, Lakewood NJ, 08701',
    'Shul': '15 Widerman St, Spring Valley, NY',
    'Shvilei Dovid': '78 Broadway, Lakewood NJ, 08701',
    'Spruce St Shul': '177 Spruce Street, Lakewood NJ, 08701',
    'Sqver Hall': '537 County Line Road, Lakewood NJ, 08701',
    'Stolin': '153 East 7th Street, Lakewood, NJ 08701',
    'Tashbar': '82 Oak St, Lakewood, NJ 08701',
    'The Cheder': '725 Vasser Ave, Lakewood, NJ 08701',
    'The Residence': '68 Madison Ave, Lakewood, NJ 08701',
    'The River Terrace': '1094 River Ave, Lakewood NJ 08701',
    'Tiferes Beis Yaackov': '613 Oak Street, Lakewood, NJ 08701',
    'Tomahork': '700 Cedarbridge Ave Unit 4, Lakewood NJ 08701',
    'Toras Menachem': '1990 Swathmore Ave, Lakewood, NJ 08701',
    'Visnitz': '1501 Clifton Ave, Lakewood, NJ',
    'Vyelipol Hall': '1142 East County Line Road, Lakewood, NJ 08701',
    'Westgate Hall': '100 Ropshitz CT, Lakewood, NJ 08701',
    'Westgate Simcha Hall': '8 Westgate, Lakewood, NJ 08701',
    'Williams Street Shul': '60 Williams Street, Lakewood, NJ 08701',
    'Willow Court Shul': '1445 14th Street, Lakewood, NJ 08701',
    'YTT': '873 Vine Ave, Lakewood, NJ 08701',
    "Yeshiva K'Tana School": '120 2nd Street, Lakewood, NJ 08701',
    'Yeshiva Orchas Chaim': '410 Oberlin Ave South, Lakewood, NJ 08701',
    'Zichron Schneur': '282 Oak Knoll Road, Lakewood, NJ 08701',
  };

  const formatPhone = (raw: string): string => {
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const effectivePlaces = dbPlaces ? Object.keys(dbPlaces).sort() : places;
  const effectiveAddresses = dbPlaces || placeAddresses;

  const to24Hour = (hour: string, minute: string, period: 'AM' | 'PM'): string => {
    let h = parseInt(hour) || 0;
    const m = parseInt(minute) || 0;
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  };

  const applyDuration = (hours: number) => {
    const h = parseInt(startHour) || 0;
    const m = parseInt(startMin) || 0;
    if (!startHour && !startMin) return;

    let startH24 = h;
    if (startPeriod === 'PM' && h !== 12) startH24 += 12;
    if (startPeriod === 'AM' && h === 12) startH24 = 0;

    let totalMinutes = (startH24 * 60 + m + hours * 60) % (24 * 60);
    const endH24 = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;

    let endH12 = endH24 % 12;
    if (endH12 === 0) endH12 = 12;

    setEndHour(endH12.toString());
    setEndMin(endM.toString().padStart(2, '0'));
    setEndPeriod(endH24 >= 12 ? 'PM' : 'AM');
    setSelectedDuration(hours);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const startTime = startHour ? to24Hour(startHour, startMin, startPeriod) : '';
      const endTime = endHour ? to24Hour(endHour, endMin, endPeriod) : '';
      const eventDate = `${selectedDate}T${startTime || '00:00:00'}`;

      const newEvent = await createEvent({
        Name: name.trim(),
        Category: category || '',
        EventDate: eventDate,
        Start: startTime,
        End: endTime,
        Place: place.trim(),
        Address: address.trim(),
        Phone: phone.trim(),
        Info: notes.trim(),
        SimchaInitiative: simchaInitiative,
        Projector: projector,
        Weinman: weinman,
        Charge: 0,
        Payment: 0,
        Paid: false,
        Ready: false,
        Sent: false,
      });

      onEventCreated(newEvent);

      // Auto-export to Google Calendar for all events
      console.log('Auto-exporting new event to Google Calendar...');

      // Check if user is authenticated
      const authenticated = await isAuthenticated();

      if (authenticated) {
        const exportResult = await exportToGoogleCalendar(newEvent);

        if (exportResult === 'success') {
          setToastMessage('✓ Created & Exported');
        } else if (exportResult === 'needsReauth') {
          setToastMessage('✓ Created');
          setTimeout(() => {
            Alert.alert(
              'Google Sign-in Expired',
              'Your Google access has expired. Open the event and tap "Export to Google Calendar" to sign in again.',
              [{ text: 'OK' }]
            );
          }, 2100);
        } else {
          setToastMessage('✓ Created');
        }

        setShowCreatedToast(true);
        setTimeout(() => {
          setShowCreatedToast(false);
          resetForm();
          onClose();
        }, 2000);
      } else {
        setToastMessage('✓ Created');
        setShowCreatedToast(true);
        setTimeout(() => {
          setShowCreatedToast(false);
          resetForm();
          onClose();
        }, 2000);

        setTimeout(() => {
          Alert.alert(
            'Export to Google Calendar?',
            'Would you like to sign in and export this event to Google Calendar?',
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Sign In',
                onPress: async () => {
                  await authenticateWithGoogle();
                  Alert.alert('Browser Opened', 'Complete sign-in in your browser, then export from event details.');
                },
              },
            ]
          );
        }, 2100);
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setCategory(null);
    setStartHour('');
    setStartMin('');
    setStartPeriod('AM');
    setEndHour('');
    setEndMin('');
    setEndPeriod('PM');
    setName('');
    setPlace('');
    setAddress('');
    setPhone('');
    setNotes('');
    setSimchaInitiative(false);
    setProjector(false);
    setWeinman(false);
  };

  const displayDate = (() => {
    try {
      const d = new Date(selectedDate + 'T12:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  })();

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
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Event</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !name.trim()}
            style={styles.headerBtn}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Created Toast Message */}
        {showCreatedToast && (
          <View style={styles.toastContainer}>
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          </View>
        )}

        <ScrollView ref={scrollRef} style={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!isPlaceOpen && !isCategoryOpen}>
          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeIcon}>📅</Text>
            <Text style={styles.dateBadgeText}>{displayDate}</Text>
          </View>

          {/* Name */}
          <View style={styles.nameSection}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Add name"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={[styles.comboBox, isCategoryOpen && styles.comboBoxOpen]}
              onPress={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <View style={styles.comboBoxValue}>
                {category ? (
                  <>
                    <Text style={styles.comboBoxIcon}>{getCategoryIcon(category)}</Text>
                    <Text style={styles.comboBoxText}>{category}</Text>
                  </>
                ) : (
                  <Text style={styles.comboBoxPlaceholder}>Select a category...</Text>
                )}
              </View>
              <Text style={styles.comboBoxArrow}>{isCategoryOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isCategoryOpen && (
              <View style={styles.comboBoxDropdown}>
                <ScrollView
                  style={styles.comboBoxList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.comboBoxItem, category === cat && styles.comboBoxItemActive]}
                      onPress={() => {
                        setCategory(cat);
                        setIsCategoryOpen(false);
                      }}
                    >
                      <Text style={styles.comboBoxItemIcon}>{getCategoryIcon(cat)}</Text>
                      <Text style={[styles.comboBoxItemText, category === cat && styles.comboBoxItemTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {customCategories.map((cat) => (
                    <TouchableOpacity
                      key={`custom-${cat}`}
                      style={[styles.comboBoxItem, category === cat && styles.comboBoxItemActive]}
                      onPress={() => {
                        setCategory(cat);
                        setIsCategoryOpen(false);
                      }}
                    >
                      <Text style={styles.comboBoxItemIcon}>📌</Text>
                      <Text style={[styles.comboBoxItemText, category === cat && styles.comboBoxItemTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.addCategoryRow}>
                  <TextInput
                    style={styles.addCategoryInput}
                    value={newCategoryText}
                    onChangeText={setNewCategoryText}
                    placeholder="Add new category..."
                    placeholderTextColor={theme.colors.textTertiary}
                    onSubmitEditing={() => {
                      const trimmed = newCategoryText.trim();
                      if (trimmed && !categories.includes(trimmed) && !customCategories.includes(trimmed)) {
                        setCustomCategories((prev) => [...prev, trimmed]);
                        setCategory(trimmed);
                        setNewCategoryText('');
                        setIsCategoryOpen(false);
                      }
                    }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.addCategoryBtn, !newCategoryText.trim() && styles.addCategoryBtnDisabled]}
                    onPress={() => {
                      const trimmed = newCategoryText.trim();
                      if (trimmed && !categories.includes(trimmed) && !customCategories.includes(trimmed)) {
                        setCustomCategories((prev) => [...prev, trimmed]);
                        setCategory(trimmed);
                        setNewCategoryText('');
                        setIsCategoryOpen(false);
                      }
                    }}
                    disabled={!newCategoryText.trim()}
                  >
                    <Text style={styles.addCategoryBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Time</Text>
            <View style={styles.timeContainer}>
              {/* Start */}
              <View style={styles.timeRow}>
                <Text style={styles.timeRowLabel}>From</Text>
                <View style={styles.timeInputGroup}>
                  <TextInput
                    style={styles.timeInput}
                    value={startHour}
                    onChangeText={(t) => setStartHour(t.replace(/\D/g, '').slice(0, 2))}
                    placeholder="--"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                  <Text style={styles.colon}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={startMin}
                    onChangeText={(t) => setStartMin(t.replace(/\D/g, '').slice(0, 2))}
                    placeholder="--"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                  <View style={styles.periodToggle}>
                    <TouchableOpacity
                      onPress={() => setStartPeriod('AM')}
                      style={[styles.periodBtn, startPeriod === 'AM' && styles.periodBtnActive]}
                    >
                      <Text
                        style={[styles.periodText, startPeriod === 'AM' && styles.periodTextActive]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setStartPeriod('PM')}
                      style={[styles.periodBtn, startPeriod === 'PM' && styles.periodBtnActive]}
                    >
                      <Text
                        style={[styles.periodText, startPeriod === 'PM' && styles.periodTextActive]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.timeDivider} />

              {/* Duration Quick-Select */}
              <View style={styles.durationRow}>
                {[1, 2, 3, 4].map((hrs) => (
                  <TouchableOpacity
                    key={hrs}
                    style={[styles.durationBtn, selectedDuration === hrs && styles.durationBtnActive]}
                    onPress={() => applyDuration(hrs)}
                  >
                    <Text style={[styles.durationBtnText, selectedDuration === hrs && styles.durationBtnTextActive]}>
                      {hrs} {hrs === 1 ? 'hr' : 'hrs'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* End */}
              <View style={styles.timeRow}>
                <Text style={styles.timeRowLabel}>To</Text>
                <View style={styles.timeInputGroup}>
                  <TextInput
                    style={styles.timeInput}
                    value={endHour}
                    onChangeText={(t) => setEndHour(t.replace(/\D/g, '').slice(0, 2))}
                    placeholder="--"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                  <Text style={styles.colon}>:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={endMin}
                    onChangeText={(t) => setEndMin(t.replace(/\D/g, '').slice(0, 2))}
                    placeholder="--"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                  <View style={styles.periodToggle}>
                    <TouchableOpacity
                      onPress={() => setEndPeriod('AM')}
                      style={[styles.periodBtn, endPeriod === 'AM' && styles.periodBtnActive]}
                    >
                      <Text
                        style={[styles.periodText, endPeriod === 'AM' && styles.periodTextActive]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEndPeriod('PM')}
                      style={[styles.periodBtn, endPeriod === 'PM' && styles.periodBtnActive]}
                    >
                      <Text
                        style={[styles.periodText, endPeriod === 'PM' && styles.periodTextActive]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Place */}
          <View style={styles.section} onLayout={(e) => { placeYRef.current = e.nativeEvent.layout.y; }}>
            <Text style={styles.label}>Place</Text>
            <View style={styles.placeComboRow}>
              <TouchableOpacity
                style={[styles.comboBox, isPlaceOpen && styles.comboBoxOpen, styles.placeComboFlex]}
                onPress={() => setIsPlaceOpen(!isPlaceOpen)}
              >
                <View style={styles.comboBoxValue}>
                  {place ? (
                    <Text style={styles.comboBoxText}>{place}</Text>
                  ) : (
                    <Text style={styles.comboBoxPlaceholder}>Select a place...</Text>
                  )}
                </View>
                <Text style={styles.comboBoxArrow}>{isPlaceOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {place ? (
                <TouchableOpacity onPress={() => { setPlace(''); setAddress(''); }}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {isPlaceOpen && (() => {
              const search = newPlaceText.toLowerCase();
              const allPlaces = [...effectivePlaces, ...customPlaces];
              const filtered = search
                ? allPlaces.filter((p) => p.toLowerCase().includes(search))
                : allPlaces;
              const canAdd = newPlaceText.trim() && !allPlaces.some((p) => p.toLowerCase() === newPlaceText.trim().toLowerCase());
              return (
                <View style={styles.comboBoxDropdown}>
                  <View style={styles.searchRow}>
                    <TextInput
                      ref={searchInputRef}
                      style={styles.searchInput}
                      value={newPlaceText}
                      onChangeText={setNewPlaceText}
                      placeholder="Search or add place..."
                      placeholderTextColor={theme.colors.textTertiary}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (canAdd) {
                          setCustomPlaces((prev) => [...prev, newPlaceText.trim()]);
                          setPlace(newPlaceText.trim());
                          setNewPlaceText('');
                          setIsPlaceOpen(false);
                        }
                      }}
                    />
                    {newPlaceText ? (
                      <TouchableOpacity onPress={() => setNewPlaceText('')}>
                        <Text style={styles.searchClear}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <ScrollView
                    style={styles.comboBoxList}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {filtered.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.comboBoxItem, place === p && styles.comboBoxItemActive]}
                        onPress={() => {
                          setPlace(p);
                          if (effectiveAddresses[p]) setAddress(effectiveAddresses[p]);
                          setNewPlaceText('');
                          setIsPlaceOpen(false);
                        }}
                      >
                        <Text style={[styles.comboBoxItemText, place === p && styles.comboBoxItemTextActive]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {canAdd && (
                      <TouchableOpacity
                        style={styles.comboBoxItem}
                        onPress={() => {
                          setCustomPlaces((prev) => [...prev, newPlaceText.trim()]);
                          setPlace(newPlaceText.trim());
                          setNewPlaceText('');
                          setIsPlaceOpen(false);
                        }}
                      >
                        <Text style={styles.addNewPlaceText}>+ Add "{newPlaceText.trim()}"</Text>
                      </TouchableOpacity>
                    )}
                    {filtered.length === 0 && !canAdd && (
                      <View style={styles.comboBoxItem}>
                        <Text style={styles.comboBoxItemText}>No matches</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              );
            })()}
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main Street, City, State"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          {/* Phone */}
          <View style={styles.section}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => setPhone(formatPhone(t))}
              placeholder="(555) 123-4567"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>

          {/* Options */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSimchaInitiative(!simchaInitiative)}
            >
              <View style={[styles.checkbox, simchaInitiative && styles.checkboxChecked]}>
                {simchaInitiative && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Simcha Initiative</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setProjector(!projector)}
            >
              <View style={[styles.checkbox, projector && styles.checkboxChecked]}>
                {projector && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Projector</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setWeinman(!weinman)}
            >
              <View style={[styles.checkbox, weinman && styles.checkboxChecked]}>
                {weinman && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Weinman</Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: theme.spacing.xl }} />
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerBtn: {
    minWidth: 60,
  },
  cancelText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  saveText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: theme.colors.disabled,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
    ...theme.shadows.small,
  },
  dateBadgeIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  dateBadgeText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },

  // Category combo box
  comboBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  comboBoxOpen: {
    borderColor: theme.colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  comboBoxValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comboBoxIcon: {
    fontSize: 18,
    marginRight: theme.spacing.sm,
  },
  comboBoxText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
  },
  comboBoxPlaceholder: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textTertiary,
  },
  comboBoxArrow: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  comboBoxDropdown: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.primary,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  comboBoxList: {
    maxHeight: 180,
  },
  comboBoxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  comboBoxItemActive: {
    backgroundColor: theme.colors.cardBackgroundAlt,
  },
  comboBoxItemIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
    width: 24,
  },
  comboBoxItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  comboBoxItemTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  addCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  addCategoryInput: {
    flex: 1,
    height: 36,
    backgroundColor: theme.colors.cardBackgroundAlt,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addCategoryBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCategoryBtnDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  addCategoryBtnText: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.bold,
    lineHeight: 24,
  },

  // Time
  timeContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.small,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  timeRowLabel: {
    width: 42,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    width: 54,
    height: 48,
    backgroundColor: theme.colors.cardBackgroundAlt,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colon: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    marginHorizontal: 3,
  },
  periodToggle: {
    flexDirection: 'row',
    marginLeft: theme.spacing.sm,
    backgroundColor: theme.colors.cardBackgroundAlt,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  periodBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  periodBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  periodText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textTertiary,
  },
  periodTextActive: {
    color: theme.colors.textPrimary,
  },
  timeDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  durationRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  durationBtn: {
    flex: 1,
    backgroundColor: theme.colors.cardBackgroundAlt,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  durationBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationBtnText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  durationBtnTextActive: {
    color: theme.colors.textPrimary,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 34,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  searchClear: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    paddingHorizontal: 4,
  },
  addNewPlaceText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },

  // Name
  nameSection: {
    marginTop: theme.spacing.lg,
    minHeight: 56,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 52,
  },

  // Text inputs
  input: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 46,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: theme.spacing.sm,
  },

  // Place clear button
  placeComboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  placeComboFlex: {
    flex: 1,
  },

  // Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: theme.fontWeight.bold,
  },
  checkboxLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  toastContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    backgroundColor: '#22c55e',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});
