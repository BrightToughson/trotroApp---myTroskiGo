import { WebIcon } from "./WebIcon";
import { CustomButton } from "./customButton";
import MapPickerModal from "./MapPickerModal";
import { useTranslation } from "react-i18next";
import React, { useEffect, useState, useMemo } from "react";
import * as ExpoLocation from "expo-location";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SectionList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useTheme } from "../context/ThemeContext";
import {
    getCurrentUserLocation,
    searchLocations,
    STOP_MAP,
    getNearbyStops,
    OSM_STOPS,
    Location,
} from "../lib/LocationService";
import { FareService } from "../lib/FareService";



interface LocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: Location, fieldOverride?: 'origin' | 'destination' | 'stop' | 'transfer') => void;
  title: string;
  origin?: string;
  destination?: string;
  activeField?: 'origin' | 'destination' | 'stop' | 'transfer' | null;
}

const ResultItem = React.memo(({ 
  item, 
  onPress, 
  accentColor,
  origin,
  destination,
  activeField
}: { 
  item: Location, 
  onPress: (loc: Location) => void, 
  accentColor: string,
  origin?: string,
  destination?: string,
  activeField?: 'origin' | 'destination' | 'stop' | 'transfer' | null
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  
  // Categorization Logic
  const isBusStation = item.type === "bus_station";
  const isPickupStation = item.type === "pick_up_station";
  const isBusStop = item.type === "bus_stop";
  const isGenericStation = item.type === "station";
  const isAnyStation = isBusStation || isPickupStation || isBusStop || isGenericStation;

  const getStopDescription = () => {
    if (item.address) return item.address;
    if (isBusStation) return "Main Station Terminal";
    if (isPickupStation) return "Pick-up / Drop-off Hub";
    if (isBusStop) return "Local Roadside Stop";
    return isAnyStation ? t('major_hub') : t('neighborhood');
  };

  const getStopIcon = () => {
    if (isBusStation) return "business";
    if (isPickupStation) return "git-branch-outline";
    if (isBusStop) return "bus-outline";
    if (isGenericStation) return "bus";
    return "location-outline";
  };

  return (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => onPress(item)}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
        ]}
      >
        <WebIcon
          name={getStopIcon()}
          size={20}
          color={item.isVerified ? '#3b82f6' : (isAnyStation ? accentColor : colors.textSecondary)}
        />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.nameRow}>
            <Text style={[styles.resultName, { color: colors.text }]}>
            {item.name}
            </Text>
            {item.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: isBusStation ? '#10b98120' : (isPickupStation ? '#3b82f620' : '#64748b20') }]}>
                    <WebIcon 
                        name={isBusStation ? "business" : (isPickupStation ? "git-branch" : "bus")} 
                        size={12} 
                        color={isBusStation ? "#10b981" : (isPickupStation ? "#3b82f6" : "#64748b")} 
                        style={{ marginRight: 4 }} 
                    />
                    <Text style={[styles.verifiedBadgeText, { color: isBusStation ? "#10b981" : (isPickupStation ? "#3b82f6" : "#64748b") }]}>
                        {isBusStation ? "Verified Station" : (isPickupStation ? "Verified Hub" : "Verified Stop")}
                    </Text>
                </View>
            )}
        </View>
        <Text
            style={[styles.resultAddress, { color: colors.textSecondary }]}
            numberOfLines={1}
        >
            {getStopDescription()}
        </Text>
        {/* Fare badge removed per request */}
      </View>
    </TouchableOpacity>
  );
});

ResultItem.displayName = "ResultItem";

// RegionalExplorer logic moved to SectionList directly in LocationSearchModal

export const LocationSearchModal = ({
  visible,
  onClose,
  onSelectLocation,
  title,
  origin,
  destination,
  activeField,
}: LocationSearchModalProps) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: SCREEN_HEIGHT } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [nearbyStops, setNearbyStops] = useState<Location[]>([]);
  const [currentSnap, setCurrentSnap] = useState<Location | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [isMapPickerVisible, setIsMapPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("All");

  const isPickup = title.toLowerCase().includes("pickup") || title.toLowerCase().includes("origin") || title.toLowerCase().includes("start");
  const accentColor = isPickup ? "#10b981" : "#3b82f6"; // Switched Destination to Royal Blue for better contrast

  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    OSM_STOPS.forEach(s => {
      if (s.region) regions.add(s.region);
    });
    return ["All", ...Array.from(regions).sort()];
  }, []);

  const regionalSections = useMemo(() => {
    // Filter OSM_STOPS based on selectedRegion
    const filteredStops = selectedRegion === "All" 
      ? OSM_STOPS 
      : OSM_STOPS.filter(s => s.region === selectedRegion);

    const groups: Record<string, Location[]> = {};
    filteredStops.forEach(stop => {
      const letter = stop.name.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(stop);
    });
    
    return Object.keys(groups).sort().map(letter => {
      // Sort alphabetically within each letter group
      groups[letter].sort((a, b) => a.name.localeCompare(b.name));
      return {
        title: letter,
        data: groups[letter]
      };
    });
  }, [selectedRegion]);

  // GPS Optimization: Run only once per open, NOT on every keystroke
  useEffect(() => {
    const fetchNearby = async () => {
      if (isPickup && query.length < 2) {
        setNearbyLoading(true);
        try {
          const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (status === 'granted') {
             const snapped = await getCurrentUserLocation();
             if (snapped && snapped.coordinate) {
                 const stops = getNearbyStops(snapped.coordinate.latitude, snapped.coordinate.longitude, 4);
                 setNearbyStops(stops);
                 setCurrentSnap(snapped);
             }
          }
        } catch (e) {
          console.error("Nearby fetch error:", e);
        } finally {
          setNearbyLoading(false);
        }
      }
    };

    if (visible) {
        fetchNearby();
    }
  }, [isPickup, visible, query.length]); 

  // Debounced search logic
  useEffect(() => {
    if (query.trim().length > 0) {
      setLoading(true);
      const delayDebounce = setTimeout(async () => {
        try {
          const searchResults = await searchLocations(query);
          setResults(searchResults);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }, 150); // Reduced from 250ms for instant feel

      return () => clearTimeout(delayDebounce);
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query]);

  const handleSelect = (item: Location) => {
    onSelectLocation(item, activeField as "origin" | "destination");
    setQuery("");
    setResults([]);
    onClose();
  };

  const renderResultItem = ({ item }: { item: Location }) => (
    <ResultItem 
      item={item} 
      onPress={handleSelect} 
      accentColor={accentColor} 
      origin={origin}
      destination={destination}
      activeField={activeField}
    />
  );

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 10 }]} pointerEvents="box-none">
        <Animated.View entering={FadeIn} exiting={FadeOut} style={StyleSheet.absoluteFill}>
            <TouchableOpacity 
                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} 
                activeOpacity={1} 
                onPress={onClose} 
            />
        </Animated.View>
        <Animated.View
            entering={SlideInDown.springify().damping(25).stiffness(200)}
            exiting={SlideOutDown}
            style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%', justifyContent: 'flex-end' }}
            pointerEvents="box-none"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                style={[
                    styles.modalContent, 
                    { 
                        backgroundColor: colors.background, 
                        height: (Platform.OS !== 'web' || width < 600) ? '100%' : SCREEN_HEIGHT * 0.85,
                        marginTop: (Platform.OS !== 'web' || width < 600) ? 0 : SCREEN_HEIGHT * 0.15,
                        borderTopLeftRadius: (Platform.OS !== 'web' || width < 600) ? 0 : 32,
                        borderTopRightRadius: (Platform.OS !== 'web' || width < 600) ? 0 : 32,
                    },
                    Platform.OS === 'web' && width >= 600 && { maxWidth: 600, alignSelf: 'center', width: '100%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }
                ]}
            >
                {/* Grabber */}
                <View style={[styles.grabber, { backgroundColor: colors.border }]} />

                {/* Header */}
                <View style={[styles.header, { backgroundColor: accentColor + '08', paddingHorizontal: 20, paddingVertical: 14, marginHorizontal: -20, marginTop: -20, marginBottom: 15, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                          <View style={[styles.headerBadge, { backgroundColor: accentColor + '15' }]}>
                             <Text style={[styles.headerBadgeText, { color: accentColor }]}>
                                {isPickup ? t('start') : t('finish')}
                             </Text>
                          </View>
                        </View>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('browse_regions')}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
                        <WebIcon name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
 
                {/* Search Input */}
                <View
                    style={[
                    styles.searchContainer,
                    { backgroundColor: colors.surface, borderColor: accentColor + '60', borderWidth: query.length > 0 ? 2 : 1.5 },
                    ]}
                >
                    <WebIcon
                        name={isPickup ? "navigate" : "flag"}
                        size={20}
                        color={accentColor}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder={t('search_placeholder')}
                        placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus={true}
                        returnKeyType="search"
                    />
                    {loading ? (
                        <ActivityIndicator size="small" color={accentColor} style={styles.clearButton} />
                    ) : query.length > 0 ? (
                        <TouchableOpacity onPress={() => setQuery("")} style={styles.clearButton}>
                            <WebIcon
                                name="close-circle"
                                size={20}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Content */}
                {query.length < 1 ? (
                    <SectionList
                        sections={regionalSections}
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[styles.initialContent, { paddingBottom: Math.max(80, insets.bottom + 40) }]}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        initialNumToRender={10}
                        removeClippedSubviews={Platform.OS === 'android'}
                        renderSectionHeader={({ section: { title } }) => (
                            <View style={styles.regionSection}>
                               <Text style={[styles.regionSectionTitle, { color: accentColor }]}>{title}</Text>
                            </View>
                        )}
                        renderItem={({ item }) => (
                             <ResultItem 
                               item={item}
                               onPress={handleSelect}
                               accentColor={accentColor}
                               origin={origin}
                               destination={destination}
                               activeField={activeField}
                             />
                        )}
                        ListHeaderComponent={
                            <>
                                {/* Current Location Option */}
                                {isPickup && (
                                    <TouchableOpacity
                                        disabled={loading}
                                        style={[
                                            styles.currentLocationRow, 
                                            { 
                                                 backgroundColor: accentColor + '08',
                                                 borderColor: accentColor + '20'
                                            }
                                        ]}
                                        onPress={async () => {
                                            setLoading(true);
                                            try {
                                                const loc = await getCurrentUserLocation();
                                                if (loc) {
                                                    handleSelect(loc);
                                                } else {
                                                    Alert.alert("GPS Error", "We couldn't get your location. Please ensure location services are enabled for this app.");
                                                }
                                            } catch (e) {
                                                console.error(e);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                    >
                                        <View style={[styles.currentIconBox, { backgroundColor: accentColor }]}>
                                            {loading ? <ActivityIndicator size="small" color="#fff" /> : <WebIcon name="navigate" size={20} color="#fff" />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.currentLocationText, { color: colors.text }]}>
                                                {currentSnap ? currentSnap.name : t('use_current_location')}
                                            </Text>
                                            <Text style={[styles.currentLocationSub, { color: colors.textSecondary }]}>
                                                {currentSnap ? t('snapping_to_nearest') : t('find_closest_hub')}
                                            </Text>
                                        </View>
                                        <WebIcon name="chevron-forward" size={18} color={accentColor} opacity={0.5} />
                                    </TouchableOpacity>
                                )}

                                {/* Choose on Map Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.currentLocationRow, 
                                        { 
                                             backgroundColor: accentColor + '08',
                                             borderColor: accentColor + '20',
                                             marginTop: isPickup ? -10 : 0
                                        }
                                    ]}
                                    onPress={() => setIsMapPickerVisible(true)}
                                >
                                    <View style={[styles.currentIconBox, { backgroundColor: accentColor }]}>
                                        <WebIcon name="map" size={20} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.currentLocationText, { color: colors.text }]}>
                                            {t('choose_on_map', 'Choose on Map')}
                                        </Text>
                                        <Text style={[styles.currentLocationSub, { color: colors.textSecondary }]}>
                                            {t('pinpoint_location', 'Pinpoint exact location')}
                                        </Text>
                                    </View>
                                    <WebIcon name="chevron-forward" size={18} color={accentColor} opacity={0.5} />
                                </TouchableOpacity>

                                {isPickup && (nearbyLoading || nearbyStops.length > 0) && (
                                    <View style={styles.nearbySection}>
                                        <View style={styles.nearbyHeader}>
                                            <WebIcon name="bus" size={16} color={accentColor} />
                                            <Text style={[styles.nearbyTitle, { color: colors.text }]}>{t('nearby_hubs')}</Text>
                                            {nearbyLoading && <ActivityIndicator size="small" color={accentColor} style={{ marginLeft: 8 }} />}
                                        </View>
                                        <View style={styles.nearbyGrid}>
                                            {nearbyStops.map((stop, i) => {
                                                return (
                                                    <TouchableOpacity 
                                                        key={`nearby-${i}`}
                                                        style={[styles.nearbyChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                                        onPress={() => handleSelect(stop)}
                                                    >
                                                        <Text style={[styles.nearbyChipText, { color: colors.text }]} numberOfLines={1}>
                                                            {(stop?.name || "Unknown").split(' (')[0]}
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6, flexWrap: 'wrap' }}>
                                                            <View style={[styles.distanceLabel, { backgroundColor: accentColor + '15' }]}>
                                                                <WebIcon name="navigate-circle" size={10} color={accentColor} style={{ marginRight: 4 }} />
                                                                <Text style={[styles.distanceLabelText, { color: accentColor }]}>{stop.address?.replace('km away', 'km') || "Nearby"}</Text>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                <View style={styles.explorerContainer}>
                                  <View style={styles.nearbyHeader}>
                                      <WebIcon name="map" size={16} color={accentColor} />
                                      <Text style={[styles.nearbyTitle, { color: colors.text }]}>{t('choose_region')}</Text>
                                  </View>
                                  
                                  <ScrollView 
                                      horizontal 
                                      showsHorizontalScrollIndicator={false} 
                                      style={styles.regionScroll}
                                      contentContainerStyle={{ paddingRight: 20 }}
                                  >
                                      {availableRegions.map(region => {
                                          const isActive = selectedRegion === region;
                                          return (
                                              <TouchableOpacity
                                                  key={region}
                                                  style={[
                                                      styles.regionTab,
                                                      { 
                                                          backgroundColor: isActive ? accentColor : colors.surface,
                                                          borderColor: isActive ? accentColor : colors.border,
                                                          borderWidth: 1
                                                      }
                                                  ]}
                                                  onPress={() => setSelectedRegion(region)}
                                              >
                                                  <Text style={[styles.regionTabText, { color: isActive ? "#fff" : colors.text }]}>
                                                      {region === "All" ? t('all_regions', 'All Regions') : region}
                                                  </Text>
                                              </TouchableOpacity>
                                          );
                                      })}
                                  </ScrollView>
                                </View>
                            </>
                        }
                    />
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        renderItem={renderResultItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        // PERFORMANCE TUNING: Prevent JS thread congestion
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        initialNumToRender={8}
                        removeClippedSubviews={Platform.OS === 'android'}
                        ListEmptyComponent={
                            !loading ? (
                                <View style={styles.emptyContainer}>
                                    <WebIcon name="search-outline" size={48} color={colors.border} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No exact matches found.</Text>
                                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Try searching for a broader neighborhood.</Text>
                                </View>
                            ) : null
                        }
                    />
                )}
                {/* Spacer for keyboard */}
                <View style={{ height: 40 }} />
            </KeyboardAvoidingView>
        </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    elevation: 20,
    ...Platform.select({
        ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
        },
        android: {
            elevation: 20,
        }
    })
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0, // OS Fix
    outlineStyle: 'none' as any,
  },
  clearButton: {
      padding: 4,
  },
  initialContent: {
      // paddingBottom handled dynamically in component
  },
  currentLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 18,
      borderRadius: 22,
      marginBottom: 20,
      borderWidth: 1,
  },
  currentIconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
  },
  currentLocationText: {
      fontSize: 18,
      fontWeight: '800',
  },
  currentLocationSub: {
      fontSize: 14,
      fontWeight: '600',
      opacity: 0.8,
  },
  nearbySection: {
      marginBottom: 24,
  },
  nearbyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  nearbyTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginLeft: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  nearbyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
  },
  nearbyChip: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 18,
      marginBottom: 8,
      borderWidth: 1,
      width: '48.5%',
      gap: 6,
  },
  nearbyChipText: {
      fontSize: 16,
      fontWeight: '800',
      width: '100%',
  },
  distanceLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
  },
  distanceLabelText: {
      fontSize: 13,
      fontWeight: '900',
  },
  
  // REGIONAL EXPLORER STYLES
  explorerContainer: {
      flex: 1,
  },
  regionScroll: {
      maxHeight: 50,
      marginBottom: 20,
  },
  regionTab: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
      height: 40,
  },
  regionTabText: {
      fontSize: 15,
      fontWeight: '700',
      textTransform: 'capitalize',
  },
  townsList: {
      flex: 1,
  },
  regionSection: {
      marginBottom: 30,
  },
  regionSectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 16,
      opacity: 0.8,
  },
  townGroup: {
      marginBottom: 20,
      paddingLeft: 4,
  },
  townHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
  },
  townName: {
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 6,
  },
  stopsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
  },
  hubChip: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      width: '48.5%',
  },
  hubChipText: {
      fontSize: 15,
      fontWeight: '800',
      flex: 1,
  },
  hubChipContent: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  chipFareText: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
  },
  miniFareBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: 'flex-start',
  },
  miniFareText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#10b981',
  },
  inlineFareBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      marginTop: 6,
      gap: 6,
  },
  inlineFareText: {
      color: '#10b981',
      fontSize: 12,
      fontWeight: '800',
      padding: 0,
  },
  verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      marginLeft: 8,
  },
  verifiedBadgeText: {
      fontSize: 12,
      fontWeight: '900',
  },

  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
  },
  resultName: {
    fontSize: 18,
    fontWeight: "700",
  },
  typeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginLeft: 8,
  },
  typeBadgeText: {
      fontSize: 11,
      fontWeight: '900',
  },
  resultAddress: {
    fontSize: 16,
  },
  emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
