import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { WebIcon } from './WebIcon';
import { useTheme, LightColors } from '../context/ThemeContext';
import { Notification, NotificationService } from '../lib/NotificationService';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, SlideInDown, SlideOutDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { translateText } from '../lib/translate';
import { isAdminUser } from '../constants/admins';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

const OfficialNotificationItem = React.memo(({ item, index, colors, t, i18n, isAdmin, onDelete }: any) => {
  const [translated, setTranslated] = useState(item.message);
  const { isDark } = useTheme();

  useEffect(() => {
    if (i18n.language !== 'en' && !String(item.id).startsWith('mock_')) {
      translateText(item.message, i18n.language).then(setTranslated);
    } else {
      setTranslated(item.message);
    }
  }, [item.message, i18n.language]);

  return (
    <Animated.View 
      entering={FadeInDown.delay(100 + index * 50).springify()} 
      style={[
        styles.card, 
        { 
          backgroundColor: colors.surface, 
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
          shadowColor: item.color || colors.primary,
        }
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: (item.color || colors.primary) + '15' }]}>
          <WebIcon name={item.icon as any} size={22} color={item.color || colors.primary} />
        </View>
        <View style={styles.headerText}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => onDelete(item.id)} 
                style={styles.trashBtn}
              >
                <WebIcon name="trash-outline" size={16} color="#FF5252" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.time, { color: colors.textSecondary }]}>{item.time}</Text>
        </View>
      </View>

      <View style={[styles.messageContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }]}>
        <Text style={[styles.message, { color: colors.text, lineHeight: 22 }]}>{translated}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.badge, { backgroundColor: (item.color || colors.primary) + '10', borderColor: (item.color || colors.primary) + '30' }]}>
          <WebIcon name="shield-checkmark" size={12} color={item.color || colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: item.color || colors.primary }]}>
            {t('official_update').toUpperCase()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

export default function OfficialAnnouncementsModal({ isVisible, onClose }: Props) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const isAdmin = isAdminUser(user?.primaryEmailAddress?.emailAddress, user?.id);

  const loadData = useCallback(async () => {
    const all = await NotificationService.getNotifications();
    const official = all.filter(n => 
      n.type === 'official' || 
      n.type === 'system' || 
      n.type === 'news_update'
    );
    setNotifications(official);
    if (isVisible) {
      NotificationService.markCategoryAsRead('official');
    }
  }, [isVisible]);

  const handleDelete = useCallback(async (id: string) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(t('delete_confirm'));
      if (confirmed) {
        await NotificationService.deleteNotification(id);
        loadData();
      }
      return;
    }

    Alert.alert(t('delete_post'), t('delete_confirm'), [
      { text: t('cancel', 'Cancel'), style: "cancel" },
      {
        text: t('delete', 'Delete'),
        style: "destructive",
        onPress: async () => {
          await NotificationService.deleteNotification(id);
          loadData();
        },
      },
    ]);
  }, [loadData, t]);

  const handleDeleteAll = useCallback(async () => {
    if (notifications.length === 0) return;
    
    const confirmMsg = "Are you sure you want to clear all official announcements?";
    
    if (Platform.OS === "web") {
      if (window.confirm(confirmMsg)) {
        await NotificationService.deleteCategoryNotifications('official');
        loadData();
      }
      return;
    }

    Alert.alert("Clear All", confirmMsg, [
      { text: t('cancel'), style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await NotificationService.deleteCategoryNotifications('official');
          loadData();
        },
      },
    ]);
  }, [loadData, notifications.length, t]);

  useEffect(() => {
    if (isVisible) loadData();
  }, [isVisible, loadData]);

  if (!isVisible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 10 }]} pointerEvents="box-none">
      <Animated.View entering={FadeIn} exiting={FadeOut} style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      
      <Animated.View 
        entering={SlideInDown.springify().damping(25).stiffness(200)}
        exiting={SlideOutDown}
        style={[styles.content, { backgroundColor: colors.card, position: 'absolute', bottom: 0, alignSelf: 'center' }]}
      >
        <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Official Hub</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Direct updates from myTroski Go</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={handleDeleteAll} style={[styles.clearBtn, { borderColor: colors.primary + '30' }]}>
                  <WebIcon name="trash-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.border + '30' }]}>
                <WebIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <OfficialNotificationItem 
                item={item} 
                index={index} 
                colors={colors} 
                t={t} 
                i18n={i18n} 
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <WebIcon name="notifications-off-outline" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 10, fontWeight: '600' }}>No official alerts yet.</Text>
              </View>
            }
          />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center', // Center for web
  },
  content: {
    height: '80%',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  messageContainer: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trashBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
    opacity: 0.6,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
