export const colors = {
  // Background colors
  background: '#0A0E27',
  backgroundSecondary: '#151B2E',
  cardBackground: '#1E293B',
  cardBackgroundAlt: '#242F42',

  // Primary colors
  primary: '#3B82F6',
  primaryLight: '#60A5FA',

  // Status colors
  success: '#059669', // Darker green for better contrast
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',

  // Text colors
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',

  // UI elements
  border: '#334155',
  divider: '#1E293B',
  disabled: '#475569',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const statusColors = {
  paid: colors.success,      // Green
  unpaid: colors.error,       // Red
  ready: colors.success,      // Green
  notReady: colors.error,     // Red
  sent: colors.success,       // Green
  notSent: colors.error,      // Red
};
