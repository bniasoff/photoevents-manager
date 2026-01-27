import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Event } from '../types/Event';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { fetchEvents } from '../services/api';
import {
  exportToCSV,
  exportToPDF,
  exportPaymentSummaryPDF,
  exportMonthlySummaryPDF,
  generatePaymentSummary,
  PaymentSummary,
} from '../services/exportService';
import { theme } from '../theme/theme';

export const ReportsScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
      const paymentSummary = generatePaymentSummary(data);
      setSummary(paymentSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadEvents();
  };

  const handleExport = async (type: 'csv' | 'pdf' | 'payment' | 'monthly') => {
    try {
      setIsExporting(type);

      switch (type) {
        case 'csv':
          await exportToCSV(events);
          Alert.alert('Success', 'Events exported to CSV successfully');
          break;
        case 'pdf':
          await exportToPDF(events);
          Alert.alert('Success', 'Events exported to PDF successfully');
          break;
        case 'payment':
          await exportPaymentSummaryPDF(events);
          Alert.alert('Success', 'Payment summary exported successfully');
          break;
        case 'monthly':
          await exportMonthlySummaryPDF(events);
          Alert.alert('Success', 'Monthly summary exported successfully');
          break;
      }
    } catch (err) {
      Alert.alert(
        'Export Failed',
        err instanceof Error ? err.message : 'Failed to export data'
      );
    } finally {
      setIsExporting(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading reports..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvents} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Export</Text>
        <Text style={styles.headerSubtitle}>
          Generate reports and export your event data
        </Text>
      </View>

      {/* Payment Summary Cards */}
      {summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Overview</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Events</Text>
              <Text style={[styles.summaryValue, styles.neutral]}>
                {summary.totalEvents}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text style={[styles.summaryValue, styles.neutral]}>
                ${summary.totalCharge.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Collected</Text>
              <Text style={[styles.summaryValue, styles.positive]}>
                ${summary.totalPaid.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text
                style={[
                  styles.summaryValue,
                  summary.totalBalance > 0 ? styles.negative : styles.positive,
                ]}
              >
                ${summary.totalBalance.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Paid Events</Text>
              <Text style={[styles.summaryValue, styles.positive]}>
                {summary.paidEvents}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Unpaid Events</Text>
              <Text style={[styles.summaryValue, styles.negative]}>
                {summary.unpaidEvents}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Charge</Text>
              <Text style={[styles.summaryValue, styles.neutral]}>
                ${summary.averageCharge.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Payment</Text>
              <Text style={[styles.summaryValue, styles.neutral]}>
                ${summary.averagePayment.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Export Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>

        {/* CSV Export */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('csv')}
          disabled={isExporting !== null}
        >
          <View style={styles.exportIcon}>
            <Text style={styles.exportEmoji}>📊</Text>
          </View>
          <View style={styles.exportContent}>
            <Text style={styles.exportTitle}>Export to CSV</Text>
            <Text style={styles.exportDescription}>
              Spreadsheet format with all event details
            </Text>
          </View>
          {isExporting === 'csv' ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.exportArrow}>›</Text>
          )}
        </TouchableOpacity>

        {/* PDF Export */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('pdf')}
          disabled={isExporting !== null}
        >
          <View style={styles.exportIcon}>
            <Text style={styles.exportEmoji}>📄</Text>
          </View>
          <View style={styles.exportContent}>
            <Text style={styles.exportTitle}>Export to PDF</Text>
            <Text style={styles.exportDescription}>
              Formatted document with all events
            </Text>
          </View>
          {isExporting === 'pdf' ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.exportArrow}>›</Text>
          )}
        </TouchableOpacity>

        {/* Payment Summary PDF */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('payment')}
          disabled={isExporting !== null}
        >
          <View style={styles.exportIcon}>
            <Text style={styles.exportEmoji}>💰</Text>
          </View>
          <View style={styles.exportContent}>
            <Text style={styles.exportTitle}>Payment Summary PDF</Text>
            <Text style={styles.exportDescription}>
              Financial overview and statistics
            </Text>
          </View>
          {isExporting === 'payment' ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.exportArrow}>›</Text>
          )}
        </TouchableOpacity>

        {/* Monthly Summary PDF */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('monthly')}
          disabled={isExporting !== null}
        >
          <View style={styles.exportIcon}>
            <Text style={styles.exportEmoji}>📅</Text>
          </View>
          <View style={styles.exportContent}>
            <Text style={styles.exportTitle}>Monthly Summary PDF</Text>
            <Text style={styles.exportDescription}>
              Events and revenue grouped by month
            </Text>
          </View>
          {isExporting === 'monthly' ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.exportArrow}>›</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          All exports use your current event data. Pull down to refresh before
          exporting for the latest information.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  section: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  summaryCard: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    textAlign: 'center',
  },
  positive: {
    color: theme.statusColors.paid,
  },
  negative: {
    color: theme.statusColors.unpaid,
  },
  neutral: {
    color: theme.colors.primary,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  exportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  exportEmoji: {
    fontSize: 24,
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  exportDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  exportArrow: {
    fontSize: 32,
    color: theme.colors.textTertiary,
    fontWeight: '300',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.cardBackgroundAlt,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bottomPadding: {
    height: theme.spacing.xl,
  },
});
