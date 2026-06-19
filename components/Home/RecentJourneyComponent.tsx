import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { ms } from '../../lib/utils/metrics';
import { useTheme } from '../../context/ThemeContext';
import { WebIcon } from '../../components/WebIcon';
import { useTranslation } from 'react-i18next';
import { Ride } from '../../lib/history/HistoryService';

interface RecentJourneyComponentProps {
  recentRides: Ride[];
  isDark: boolean;
  liveLabelSize: number;
  liveTextSize: number;
  sectionMarginTop: number;
}

export const RecentJourneyComponent: React.FC<RecentJourneyComponentProps> = ({
  recentRides,
  isDark,
  liveLabelSize,
  liveTextSize,
  sectionMarginTop,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(withSequence(withTiming(1.5, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
  }, []);

  const animatedPulse = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(350).duration(600)} style={[styles.section, { marginTop: sectionMarginTop }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: ms(16) }]}>{t('recent_journey', 'Recent Journey')}</Text>
        {recentRides.length > 0 && (
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: colors.primary + '15', flexDirection: 'row', alignItems: 'center', gap: ms(4) }]}
            onPress={() => router.push("/(root)/(tabs)/history")}
          >
            <WebIcon name="time" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: ms(12), fontWeight: "800", textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('history')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {recentRides.length > 0 ? (
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/(root)/find-ride", params: recentRides[0] as Record<string, any> })}
          style={[styles.liveTicker, { backgroundColor: isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.7)", borderColor: colors.primary + '20' }]}
        >
          <Animated.View style={[styles.pulseDot, { backgroundColor: colors.primary, marginRight: ms(8) }, animatedPulse]} />
          <View style={[styles.iconBoxSmall, { backgroundColor: colors.primary + '15', marginRight: ms(12) }]}>
             <WebIcon name="bus" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.liveLabel, { color: colors.primary, fontSize: liveLabelSize }]} numberOfLines={1}>
              {recentRides[0].destination}
            </Text>
            <Text style={[styles.liveText, { color: colors.text, fontSize: liveTextSize }]} numberOfLines={1}>
              {t('from')} {recentRides[0].origin}
            </Text>
          </View>
          <View style={styles.liveMeta}>
             <Text style={[styles.liveTime, { color: colors.textSecondary }]}>{new Date(recentRides[0].date || Date.now()).toLocaleDateString()}</Text>
             <WebIcon name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.emptyRides, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)", borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, textAlign: "center" }}>{t('no_trips')}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: ms(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(12),
  },
  sectionTitle: {
    fontSize: ms(18),
    fontWeight: '700',
  },
  viewAllBtn: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(8),
  },
  liveTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(14),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  pulseDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  iconBoxSmall: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveLabel: {
    fontSize: ms(13),
    fontWeight: '700',
  },
  liveText: {
    fontSize: ms(12),
  },
  liveMeta: {
    marginLeft: ms(8),
    alignItems: 'flex-end',
  },
  liveTime: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  emptyRides: {
    padding: ms(20),
    borderRadius: ms(16),
    borderWidth: 1,
    alignItems: 'center',
  },
});