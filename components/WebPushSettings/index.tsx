import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ms } from '../lib/utils/metrics';
import { useWebPushNotifications } from '../../hooks/useWebPushNotifications';
import { WebIcon } from '../WebIcon';

export const WebPushSettings: React.FC = () => {
  const { colors } = useTheme();
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = useWebPushNotifications();
  const [loading, setLoading] = useState(false);

  if (Platform.OS !== 'web' || !isSupported) {
    return null;
  }

  const handleToggleSubscription = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          Alert.alert('Success', 'Push notifications disabled');
        } else {
          Alert.alert('Error', 'Failed to disable notifications');
        }
      } else {
        if (permission === 'denied') {
          Alert.alert(
            'Permission Denied',
            'Please enable notifications in your browser settings to receive push notifications.',
            [
              { text: 'OK' },
              { text: 'Open Settings', onPress: () => openNotificationSettings() }
            ]
          );
          setLoading(false);
          return;
        }

        const success = await subscribe();
        if (success) {
          Alert.alert('Success', 'Push notifications enabled! You\'ll receive updates about routes, traffic, and community alerts.');
        } else {
          Alert.alert('Error', 'Failed to enable notifications');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const openNotificationSettings = () => {
    // Try to open browser notification settings
    // This is browser-dependent and may not work in all browsers
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'notifications' }).then((result) => {
        console.log('Notification permission state:', result.state);
      });
    }
  };

  const getPermissionText = () => {
    switch (permission) {
      case 'granted':
        return 'Notifications are enabled';
      case 'denied':
        return 'Notifications are blocked';
      case 'default':
        return 'Notifications not configured';
      default:
        return 'Unknown permission status';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <WebIcon name="notifications" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Push Notifications</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {getPermissionText()}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.content}>
        <View style={styles.item}>
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>
              Enable Push Notifications
            </Text>
            <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
              Receive real-time updates about routes, traffic conditions, and community alerts
            </Text>
          </View>
          <Switch
            value={isSubscribed}
            onValueChange={handleToggleSubscription}
            disabled={loading}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isSubscribed ? '#fff' : colors.textSecondary}
          />
        </View>

        {isSubscribed && (
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
            <WebIcon name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Push notifications are enabled. You'll receive updates even when the app is closed.
            </Text>
          </View>
        )}

        {permission === 'denied' && (
          <TouchableOpacity style={[styles.enableButton, { backgroundColor: colors.primary }]} onPress={openNotificationSettings}>
            <Text style={styles.enableButtonText}>Enable in Browser Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(16),
    padding: ms(20),
    marginVertical: ms(12),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(16),
  },
  iconContainer: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(12),
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: ms(16),
    fontWeight: '700',
    marginBottom: ms(4),
  },
  subtitle: {
    fontSize: ms(12),
    lineHeight: ms(16),
  },
  divider: {
    height: 1,
    marginBottom: ms(16),
  },
  content: {
    gap: ms(16),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    flex: 1,
    marginRight: ms(12),
  },
  itemTitle: {
    fontSize: ms(14),
    fontWeight: '600',
    marginBottom: ms(4),
  },
  itemDescription: {
    fontSize: ms(12),
    lineHeight: ms(16),
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: ms(12),
    borderRadius: ms(12),
    borderWidth: 1,
    gap: ms(8),
  },
  infoText: {
    flex: 1,
    fontSize: ms(12),
    lineHeight: ms(16),
  },
  enableButton: {
    padding: ms(14),
    borderRadius: ms(12),
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '600',
  },
});