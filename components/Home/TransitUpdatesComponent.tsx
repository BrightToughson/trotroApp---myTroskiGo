import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import Animated, { FadeInUp, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { ms } from '../../lib/utils/metrics';
import { useTheme } from '../../context/ThemeContext';
import { WebIcon } from '../../components/WebIcon';
import { useTranslation } from 'react-i18next';
import { CityPulse } from '../../lib/pulse/PulseService';
import Swiper from 'react-native-swiper';
import { Image, ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface TransitUpdatesComponentProps {
  cityPulses: CityPulse[];
  activeNewsIndex: number;
  handleNewsScroll: (e: any) => void;
  isDark: boolean;
  sectionMarginTop: number;
  sectionTitleSize: number;
}

const MOCK_NEWS = [
  {
    id: "expressway",
    tag: "highway",
    title: "Accra-Kumasi Expressway begins as military clear 17.75km land for project",
    excerpt: "The military has commenced clearing of the 17.75km land for the Accra-Kumasi Expressway project.",
    image_url: "https://cdn.ghanaweb.com/imagelib/pics/838/83884814.jpg",
    color: "#3B82F6",
    url: "https://www.ghanaweb.com/GhanaHomePage/NewsArchive/Accra-Kumasi-Expressway-begins-as-military-clear-17-75km-land-for-project-2033030"
  },
  {
    id: "fares",
    tag: "transport",
    title: "Transport Ministry to meet GRTCC, GPRTU over proposed 20% fare increase",
    excerpt: "The Ministry of Transport will engage the leadership of the transport unions over the proposed transport fare increment.",
    image_url: "https://cdn.ghanaweb.com/imagelib/pics/869/86950294.jpg",
    color: "#FBBF24",
    url: "https://www.ghanaweb.com/"
  },
  {
    id: "brt",
    tag: "transit",
    title: "New BRT buses arrive to ease traffic congestion in Accra",
    excerpt: "Government has procured 100 new buses to augment the fleet of the Metro Mass Transit.",
    image_url: "https://cdn.ghanaweb.com/imagelib/pics/156/15643445.jpg",
    color: "#10B981",
    url: "https://www.ghanaweb.com/"
  }
];

export const TransitUpdatesComponent: React.FC<TransitUpdatesComponentProps> = ({
  cityPulses,
  activeNewsIndex,
  handleNewsScroll,
  isDark,
  sectionMarginTop,
  sectionTitleSize,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [containerWidth, setContainerWidth] = React.useState(0);

  const displayItems = cityPulses.length > 0 ? cityPulses.slice(0, 3) : (MOCK_NEWS as CityPulse[]).slice(0, 3);

  return (
    <Animated.View entering={FadeInUp.delay(550).duration(600)} style={[styles.section, { marginTop: sectionMarginTop * 1.5 }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: sectionTitleSize }]}>{t('transit_updates', 'Transit Updates')}</Text>
          <Text style={{ fontSize: ms(13), color: colors.textSecondary, fontWeight: '600', marginTop: ms(-4) }}>{t('stay_informed_transit', 'Stay informed with the latest transit news')}</Text>
        </View>
        {cityPulses.length > 3 && (
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: colors.primary + '15', flexDirection: 'row', alignItems: 'center', gap: ms(4) }]}
            onPress={() => router.push("/(root)/city-pulse-list")}
          >
            <Text style={{ color: colors.primary, fontSize: ms(12), fontWeight: "800", textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('view_all', 'View All')}</Text>
            <WebIcon name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View 
        style={[styles.swiperContainer, { height: Platform.OS === 'web' ? 300 : 280 }]}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <Swiper
            key={`swiper-${cityPulses.length}`}
            autoplay={true}
            autoplayTimeout={5}
            showsPagination={false}
            showsButtons={false}
            loop={true}
            bounces={true}
            width={containerWidth}
            height={Platform.OS === 'web' ? 300 : 280}
            removeClippedSubviews={false}
            onScroll={handleNewsScroll}
            scrollEventThrottle={16}
            renderPagination={(index, total, swiper) => {
              return (
                <View style={{ position: 'absolute', top: ms(16), right: ms(16), flexDirection: 'row', alignItems: 'center' }} pointerEvents="none">
                  {Array.from({ length: total }).map((_, i) => {
                    const isActive = i === activeNewsIndex;
                    return (
                      <Animated.View
                        key={i}
                        style={{
                          backgroundColor: isActive ? colors.primary : 'rgba(255,255,255,0.6)',
                          width: withTiming(isActive ? ms(32) : ms(12), { duration: 300 }),
                          height: ms(6),
                          borderRadius: ms(3),
                          marginHorizontal: ms(4),
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.8,
                          shadowRadius: ms(2),
                          elevation: 3,
                        }}
                      />
                    );
                  })}
                </View>
              );
            }}
          >
            {displayItems.map((item) => (
              <View
                key={item.id}
                style={[styles.newsCard, { flex: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
                pointerEvents="box-none"
              >
                <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient
                  colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)", isDark ? "rgba(2, 6, 23, 1)" : "rgba(15, 23, 42, 0.98)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.newsTopRow} pointerEvents="none">
                  <View style={[styles.newsGlassTag, { backgroundColor: item.color + 'CC', borderColor: 'rgba(255,255,255,0.3)' }]}>
                    <Text style={styles.newsTagText}>{t(`news_tag_${item.tag.toLowerCase()}`, { defaultValue: item.tag }) as string}</Text>
                  </View>
                </View>

                <View style={styles.newsContentOverlay} pointerEvents="box-none">
                  <Text style={styles.newsTitlePremium} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.newsExcerptPremium} numberOfLines={2}>{item.excerpt}</Text>

                  <View style={styles.newsFooter} pointerEvents="box-none">
                     <View style={styles.newsAuthorRow}>
                        <View style={[styles.authorAvatar, { backgroundColor: item.color }]}>
                           <Text style={styles.authorInitial}>M</Text>
                        </View>
                        <Text style={styles.authorName}>myTroski News</Text>
                     </View>
                     <TouchableOpacity
                       style={styles.readMorePill}
                       activeOpacity={0.8}
                       onPress={() => Linking.openURL(item.url)}
                     >
                        <Text style={styles.readMorePillText}>{t('read_more')}</Text>
                        <WebIcon name="arrow-forward" size={16} color="#fff" />
                     </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </Swiper>
        )}
      </View>
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
  swiperContainer: {
    borderRadius: ms(20),
    overflow: 'hidden',
    borderWidth: 1,
  },
  newsCard: {
    borderRadius: ms(20),
    overflow: 'hidden',
  },
  newsTopRow: {
    position: 'absolute',
    top: ms(16),
    left: ms(16),
    right: ms(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsGlassTag: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(20),
    borderWidth: 1,
  },
  newsTagText: {
    color: '#fff',
    fontSize: ms(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newsContentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: ms(20),
  },
  newsTitlePremium: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '800',
    marginBottom: ms(8),
    lineHeight: ms(24),
  },
  newsExcerptPremium: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: ms(13),
    lineHeight: ms(18),
    marginBottom: ms(16),
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(8),
  },
  authorInitial: {
    color: '#fff',
    fontSize: ms(12),
    fontWeight: '800',
  },
  authorName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: ms(12),
    fontWeight: '600',
  },
  readMorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    borderRadius: ms(20),
  },
  readMorePillText: {
    color: '#fff',
    fontSize: ms(12),
    fontWeight: '700',
    marginRight: ms(6),
  },
});