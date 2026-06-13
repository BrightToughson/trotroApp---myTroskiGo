import { ms } from '../../lib/metrics';
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ImageBackground, 
  Linking,
  Platform,
  RefreshControl
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { PulseService, CityPulse } from "../../lib/PulseService";
import { useTheme } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebIcon } from "../../components/WebIcon";
import { router } from
"expo-router";

export default function CityPulseList() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [pulses, setPulses] = useState<CityPulse[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPulses = async () => {
    const data = await PulseService.getPulses();
    setPulses(data);
  };

  useEffect(() => {
    loadPulses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPulses();
    setRefreshing(false);
  };

  const handleReadMore = (url: string) => {
    if (url) Linking.openURL(url);
  };

  const renderItem = ({ item }: { item: CityPulse }) => (
    <TouchableOpacity 
      style={[styles.listItem, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
      onPress={() => handleReadMore(item.url)}
      activeOpacity={0.7}
    >
      <ImageBackground 
        source={{ uri: item.image_url }} 
        style={styles.thumbnail} 
        imageStyle={{ borderRadius: ms(16) }}
      >
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.2)"]} style={StyleSheet.absoluteFill} />
      </ImageBackground>

      <View style={styles.textContent}>
        <View style={styles.listTopRow}>
          <View style={[styles.tagPill, { backgroundColor: item.color + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: item.color }]} />
            <Text style={[styles.tagText, { color: item.color }]}>{item.tag}</Text>
          </View>
        </View>

        <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={3}>{item.title}</Text>
        
        <View style={styles.listFooter}>
          <Text style={{ color: colors.textSecondary, fontSize: ms(12), fontWeight: '600' }}>{t('news_desk', 'News Desk')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <WebIcon name="arrow-back" size= {24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('city_pulse', 'City Pulse')}</Text>
        <View style={{ width: ms(44) }} />
      </View>

      <FlatList
        data={pulses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.textSecondary }}>No news available right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    paddingVertical: ms(16),
    borderBottomWidth: 1,
  },
  backButton: {
    width: ms(44),
    height: ms(44),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: 'bold',
  },
  listContent: {
    padding: ms(16),
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: ms(12),
  },
  emptyContainer: {
    padding: ms(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    width: '100%',
    flexDirection: 'row',
    padding: ms(12),
    borderRadius: ms(24),
    borderWidth: 1,
    gap: ms(16),
    ...Platform.select({
      web: {},
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: ms(2) }, shadowOpacity: 0.05, shadowRadius: ms(8) }
    })
  },
  thumbnail: {
    width: ms(100),
    height: ms(110),
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listTopRow: {
    flexDirection: 'row',
    marginBottom: ms(8),
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(8),
  },
  statusDot: { width: ms(6), height: ms(6), borderRadius: ms(3), marginRight: ms(4) },
  tagText: { fontSize: ms(10), fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  listTitle: {
    fontSize: ms(16),
    fontWeight: "800",
    lineHeight: ms(22),
    marginBottom: ms(12),
    letterSpacing: -0.2,
  },
  listFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});
