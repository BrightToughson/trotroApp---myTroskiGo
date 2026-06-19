import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { ms } from '../../lib/utils/metrics';
import { useTheme } from '../../context/ThemeContext';
import { WebIcon } from '../../components/WebIcon';
import { useTranslation } from 'react-i18next';
import { Notification } from '../../lib/notifications/NotificationService';

interface CommunityUpdateComponentProps {
  latestReport: Notification | null;
  translatedReportText: string;
  showInAppAlert: Notification | null;
  setShowInAppAlert: (alert: Notification | null) => void;
  isDark: boolean;
  liveLabelSize: number;
  liveTextSize: number;
  tickerMarginTop: number;
  paddingVerticalSmall: number;
}

export const CommunityUpdateComponent: React.FC<CommunityUpdateComponentProps> = ({
  latestReport,
  translatedReportText,
  showInAppAlert,
  setShowInAppAlert,
  isDark,
  liveLabelSize,
  liveTextSize,
  tickerMarginTop,
  paddingVerticalSmall,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(withSequence(withTiming(1.5, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
  }, []);

  const animatedPulse = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  return (
    <>
      {latestReport && (
        <Animated.View entering={FadeInUp.delay(450).duration(600)} style={[styles.section, { marginTop: tickerMarginTop }]}>
          <TouchableOpacity onPress={() => router.push("/(root)/(tabs)/communitypost")} style={[styles.liveTicker, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', paddingVertical: paddingVerticalSmall }]}>
            <Animated.View style={[styles.pulseDot, { backgroundColor: colors.primary }, animatedPulse]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveLabel, { color: colors.primary, fontSize: liveLabelSize }]} numberOfLines={1}>
                {`${latestReport.title} (@${latestReport.username || latestReport.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()})`} • {t('live_update')}
              </Text>
              <Text style={[styles.liveText, { color: colors.text, fontSize: liveTextSize }]} numberOfLines={1}>{translatedReportText || latestReport.message}</Text>
            </View>
            <WebIcon name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {showInAppAlert && (
        <Animated.View entering={FadeInDown} exiting={FadeInUp} style={[styles.inAppAlert, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <TouchableOpacity style={styles.inAppAlertContent} onPress={() => { setShowInAppAlert(null); router.push("/(root)/(tabs)/communitypost"); }}>
            <View style={[styles.iconBoxSmall, { backgroundColor: colors.primary + '20' }]}>
              <WebIcon name="chatbubble-ellipses" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: ms(12) }}>
              <Text style={[styles.alertTitle, { color: colors.text }]}>{showInAppAlert.title}</Text>
              <Text style={[styles.alertMessage, { color: colors.textSecondary }]} numberOfLines={1}>{showInAppAlert.message}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowInAppAlert(null)}>
              <WebIcon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: ms(20),
  },
  liveTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(14),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  pulseDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  liveLabel: {
    fontSize: ms(13),
    fontWeight: '700',
  },
  liveText: {
    fontSize: ms(12),
  },
  inAppAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: ms(12),
    borderRadius: ms(12),
    borderWidth: 1,
    zIndex: 100,
  },
  inAppAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBoxSmall: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: ms(14),
    fontWeight: '700',
  },
  alertMessage: {
    fontSize: ms(12),
  },
});