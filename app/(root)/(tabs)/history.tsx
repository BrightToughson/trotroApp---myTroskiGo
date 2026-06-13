import { WebIcon } from "../../../components/WebIcon";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@clerk/clerk-expo";
import React, { useCallback, useState, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, LightColors } from "../../../context/ThemeContext";
import { HistoryService, Ride } from "../../../lib/HistoryService";

export default function History() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
   const [history, setHistory] = useState<Ride[]>([]);
  const insets = useSafeAreaInsets();

  const stats = useMemo(() => {
    let totalSpent = 0;
    const destinationCounts: Record<string, number> = {};

    history.forEach(ride => {
      if (ride.price) {
        const matches = ride.price.match(/[\d.]+/g);
        if (matches && matches.length > 0) {
          const nums = matches.map(m => parseFloat(m)).filter(n => !isNaN(n));
          if (nums.length > 0) {
            const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
            totalSpent += avg;
          }
        }
      }

      if (ride.destination) {
        destinationCounts[ride.destination] = (destinationCounts[ride.destination] || 0) + 1;
      }
    });

    let topDestination = "None";
    let maxCount = 0;
    Object.entries(destinationCounts).forEach(([dest, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topDestination = dest;
      }
    });

    return {
      totalTrips: history.length,
      totalSpent: totalSpent.toFixed(2),
      topDestination
    };
  }, [history]);

  const drift1 = useSharedValue(0);
  const drift2 = useSharedValue(0);

  React.useEffect(() => {
    drift1.value = withRepeat(withTiming(30, { duration: 10000 }), -1, true);
    drift2.value = withRepeat(withTiming(-25, { duration: 12000 }), -1, true);
  }, [drift1, drift2]);

  const animatedDrift1 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift1.value }, { translateY: drift2.value }],
  }));

  const animatedDrift2 = useAnimatedStyle(() => ({
    transform: [{ translateX: drift2.value }, { translateY: drift1.value }],
  }));

  const loadHistory = async () => {
    const data = await HistoryService.getHistory();
    setHistory(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  const { userId } = useAuth();

  const handleClear = async () => {
    if (userId) {
      await HistoryService.clearHistory(userId);
    } else {
      await HistoryService.clearHistory();
    }
    setHistory([]);
  };

  const renderItem = ({ item, index }: { item: Ride; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <WebIcon name="bus" size= {22} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.date, { color: colors.text }]}>
            {item?.date ? new Date(item.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }) : "N/A"}
          </Text>
          <View style={styles.timeStatusRow}>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {item?.date ? new Date(item.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) : "N/A"}
            </Text>
            {item?.status && item.status !== "completed" && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: "#fee2e2",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: "#991b1b" },
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {item?.price || "GHS 0.00"}
          </Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.locationRow}>
          <View
            style={[styles.dot, { backgroundColor: colors.textSecondary }]}
          />
          <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
            {item?.origin || "Unknown Start"}
          </Text>
        </View>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
            {item?.destination || "Unknown Destination"}
          </Text>
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      <TouchableOpacity
        style={[styles.viewJourneyBtn, { backgroundColor: colors.primary + "10" }]}
        onPress={() => {
          router.push({
            pathname: "/find-ride",
            params: {
              origin: item.origin,
              destination: item.destination,
              originCoords: item.originCoords,
              destCoords: item.destCoords,
            },
          });
        }}
      >
        <Text style={[styles.viewJourneyText, { color: colors.primary }]}>
          View Journey
        </Text>
        <WebIcon name="chevron-forward" size= {16} color={colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[
          colors.background,
          isDark ? "#0f172a" : "#f0f4ff",
          isDark ? "#020617" : "#e0e7ff",
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Drift Elements */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift1,
            {
              backgroundColor: "#0286FF",
              top: -80,
              right: -50,
              width: 300,
              height: 300,
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            animatedDrift2,
            {
              backgroundColor: "#FFD700",
              bottom: "10%",
              left: -100,
              width: 250,
              height: 250,
              opacity: isDark ? 0.5 : 0.25,
            },
          ]}
        />
      </View>

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Animated.Text
              entering={FadeInDown.duration(600).springify()}
              style={[styles.title, { color: colors.text }]}
            >
              {t('history_title')}
            </Animated.Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 4 }}>
               Manage your past journeys and re-plan routes easily.
            </Text>
          </View>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={[styles.clearBtn, { backgroundColor: colors.primary + '10' }]}>
              <WebIcon name="trash-outline" size= {18} color={colors.primary} />
              <Text style={[styles.clearBtnText, { color: colors.primary }]}>
                {t('clear', 'CLEAR')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length > 0 && (
          <Animated.View 
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={styles.statsContainer}
          >
            <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff" }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: colors.primary + '15' }]}>
                <WebIcon name="car" size= {18} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalTrips}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trips</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff" }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#10b98115' }]}>
                <WebIcon name="wallet" size= {18} color="#10b981" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>GHS {stats.totalSpent}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Est. Spent</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff" }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#8b5cf615' }]}>
                <WebIcon name="location" size= {18} color="#8b5cf6" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{stats.topDestination}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Top Dest</Text>
            </View>
          </Animated.View>
        )}

        {history.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(200).duration(800).springify()}
            style={styles.emptyState}
          >
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <WebIcon
                name="time-outline"
                size= {64}
                color={colors.textSecondary}
              />
            </View>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('no_history')}
            </Text>
            <Text
              style={[styles.emptySubtext, { color: colors.textSecondary }]}
            >
              {t('no_trips')}
            </Text>
          </Animated.View>
        ) : (
          <Animated.FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            itemLayoutAnimation={Layout.springify()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: -0.8,
    flex: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    gap: 6,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#3b82f6', // Fallback, usually overridden by theme
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.05)",
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 140,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerText: {
    flex: 1,
    justifyContent: "center",
  },
  timeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  date: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  time: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  routeContainer: {
    marginLeft: 6,
    marginVertical: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 16,
  },
  line: {
    width: 2,
    height: 16,
    marginLeft: 3,
    marginVertical: 2,
    opacity: 0.3,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    maxWidth: "80%",
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  decorativeCircle: {
    position: "absolute",
    borderRadius: 999,
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.2,
  },
  viewJourneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  viewJourneyText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
