import React, { useState, useRef } from "react";
import { Modal, StyleSheet, View, Text, TouchableWithoutFeedback, TouchableOpacity, Keyboard, KeyboardAvoidingView, Platform, Alert, ScrollView, PanResponder, Dimensions } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useTheme } from "../context/ThemeContext";
import InputField from "./InputField";
import { CustomButton } from "./customButton";
import { ContributionService } from "../lib/ContributionService";
import { WebIcon } from "./WebIcon";
import { LocationSearchModal } from "./LocationSearchModal";
import * as ExpoLocation from "expo-location";
import MapViewWrapper, { Polyline } from "./MapViewWrapper";
import { useUser } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";

interface ContributionModalProps {
  isVisible: boolean;
  onClose: () => void;
  type: "price" | "route" | "stop" | "general" | null;
  initialData?: any; // any to avoid complex type dependencies here, represents Contribution
}

export default function ContributionModal({ isVisible, onClose, type, initialData }: ContributionModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useUser();
  const { t } = useTranslation();

  // Shared state for all forms (in a real app, use form libraries or specific states)
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [field3, setField3] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLocationSearchVisible, setIsLocationSearchVisible] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'origin' | 'destination' | 'stop' | 'transfer' | null>(null);
  const [routeStops, setRouteStops] = useState<{name: string, coordinate: {latitude: number, longitude: number}}[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [trackedCoords, setTrackedCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [completedLegs, setCompletedLegs] = useState<{ origin: string, destination: string, fare: number, coords: any[] }[]>([]);
  const [showTransferPrompt, setShowTransferPrompt] = useState(false);
  const [tempTransferStop, setTempTransferStop] = useState("");
  const [tempTransferFare, setTempTransferFare] = useState("");
  const [manualLegs, setManualLegs] = useState<{ origin: string, destination: string, fare: number, stops: { name: string, coordinate: { latitude: number, longitude: number } }[] }[]>([]);
  const [tempManualOrigin, setTempManualOrigin] = useState("");
  const [tempManualDestination, setTempManualDestination] = useState("");
  const [tempManualFare, setTempManualFare] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [journeyType, setJourneyType] = useState<"straight" | "transfer">("straight");
  const [transferLocation, setTransferLocation] = useState("");
  const trackingSubRef = useRef<ExpoLocation.LocationSubscription | null>(null);

  React.useEffect(() => {
    if (isVisible && initialData) {
      if (type === 'price') {
        setField1(initialData.payload.origin || '');
        setField2(initialData.payload.destination || '');
        setField3(initialData.payload.actual_fare?.toString() || '');
      } else if (type === 'route') {
        setField1(initialData.payload.origin || '');
        setField2(initialData.payload.destination || '');
        setField3(initialData.payload.fare?.toString() || '');
        setJourneyType(initialData.payload.journey_type || 'straight');
        setTransferLocation(initialData.payload.transfer_location || '');
        setRouteStops(initialData.payload.stops || []);
        if (initialData.payload.legs) {
          setCompletedLegs(initialData.payload.legs);
        } else if (initialData.payload.tracked_path) {
          try {
            setTrackedCoords(JSON.parse(initialData.payload.tracked_path));
          } catch(e){}
        }
      } else if (type === 'stop') {
        setField1(initialData.payload.stop_name || '');
        const routeParts = initialData.payload.route_name?.split(' to ') || [];
        setField2(routeParts[0] || '');
        setField3(routeParts[1] || '');
      } else if (type === 'general') {
        setField1(initialData.payload.message || '');
      }
    }
  }, [isVisible, initialData, type]);

  const toggleTracking = async () => {
    if (isTracking) {
      if (trackingSubRef.current) {
        try {
          trackingSubRef.current.remove();
        } catch (e) {
          console.warn("Failed to remove location subscription (common on Web).", e);
        }
        trackingSubRef.current = null;
      }
      setIsTracking(false);
    } else {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to track a route.');
        return;
      }
      // Keep existing coords if they want to pause/resume, or clear them? Better to clear for a new recording.
      if (trackedCoords.length === 0) {
        setTrackedCoords([]);
      }
      setIsTracking(true);
      trackingSubRef.current = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          setTrackedCoords((prev) => [
            ...prev,
            {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }
          ]);
        }
      );
    }
  };

  const openLocationSearch = (field: 'origin' | 'destination' | 'stop' | 'transfer') => {
    setActiveSearchField(field);
    setIsLocationSearchVisible(true);
  };

  const handleLocationSelect = (location: any, fieldOverride?: 'origin' | 'destination' | 'stop' | 'transfer') => {
    const fieldToUpdate = fieldOverride || activeSearchField;
    if (fieldToUpdate === 'origin') {
      setField1(location.name);
    } else if (fieldToUpdate === 'destination') {
      setField2(location.name);
    } else if (fieldToUpdate === 'transfer') {
      setTransferLocation(location.name);
    } else if (fieldToUpdate === 'stop') {
      if (!routeStops.some(s => s.name === location.name)) {
        setRouteStops([...routeStops, { name: location.name, coordinate: location.coordinate }]);
      } else {
        Alert.alert("Duplicate Stop", "You have already added this stop to the route.");
      }
    }
    setIsLocationSearchVisible(false);
  };

  const handleSwapRoute = () => {
    const temp = field1;
    setField1(field2);
    setField2(temp);
  };

  const handleClose = () => {
    if (trackingSubRef.current) {
      try {
        trackingSubRef.current.remove();
      } catch (e) {}
      trackingSubRef.current = null;
    }
    setIsTracking(false);
    setShowTransferPrompt(false);
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setField1("");
      setField2("");
      setField3("");
      setJourneyType("straight");
      setTransferLocation("");
      setRouteStops([]);
      setTrackedCoords([]);
      setCompletedLegs([]);
      setManualLegs([]);
      setTempManualOrigin("");
      setTempManualDestination("");
      setTempManualFare("");
      setTempTransferStop("");
      setTempTransferFare("");
      setIsSuccess(false);
      setErrorMessage("");
    }, 300);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only claim the gesture if the user is swiping down significantly
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 || gestureState.vy > 1.0) {
          handleClose();
        }
      },
    })
  ).current;

  const handleSubmit = async () => {
    setErrorMessage("");
    // Basic validation
    if (type === "price" || type === "route") {
      if (type === "route" && journeyType === "straight") {
        if (!field1.trim() || !field2.trim()) {
          setErrorMessage("Origin and Destination are required.");
          return;
        }
        if (!field3 || isNaN(parseFloat(field3))) {
          setErrorMessage("Please enter a valid fare.");
          return;
        }
        if (routeStops.length < 3) {
          setErrorMessage("Please add at least 3 intermediate stops for the trotro.");
          return;
        }
      } else if (type === "route" && journeyType === "transfer") {
        if (completedLegs.length === 0 && manualLegs.length === 0 && trackedCoords.length === 0) {
          setErrorMessage("Please add legs or start tracking.");
          return;
        }
      }
    } else if (type === "stop") {
      if (!field1.trim() || !field2.trim() || !field3.trim()) {
        setErrorMessage("Stop Name, Origin, and Destination are required.");
        return;
      }
    } else if (type === "general" && !field1.trim()) {
      setErrorMessage("Please enter your feedback.");
      return;
    }

    setIsLoading(true);
    let payload: any = {};
      
    if (type === "price") {
      payload.origin = field1;
      payload.destination = field2;
      payload.actual_fare = parseFloat(field3);
    } else if (type === "route") {
      payload.journey_type = journeyType;
      
      if (journeyType === "straight") {
        payload.origin = field1;
        payload.destination = field2;
        payload.stops = routeStops.map(s => s.name); // Store just the names in the legacy text[] column for visibility
        payload.trotros = [{
          origin: field1,
          destination: field2,
          fare: parseFloat(field3),
          stops: routeStops, // Stores the full objects with coordinates in the jsonb column
          coords: trackedCoords.length > 0 ? trackedCoords : []
        }];
      } else if (journeyType === "transfer") {
        // Set global origin and destination for the entire journey
        payload.origin = field1;
        payload.destination = field2;

        // Build payload from manual legs or live tracked legs
        if (completedLegs.length > 0 || trackedCoords.length > 0) {
          let finalLegs = [...completedLegs];
          if (trackedCoords.length > 0) {
             const lastTransfer = completedLegs.length > 0 ? completedLegs[completedLegs.length - 1].destination : field1;
             finalLegs.push({
               origin: lastTransfer,
               destination: field2 || "Unknown Destination",
               fare: 0,
               coords: trackedCoords
             });
          }
          payload.trotros = finalLegs;
        } else if (manualLegs.length > 0) {
          payload.trotros = manualLegs.map(leg => ({ ...leg, coords: [] }));
        }
      }
    } else if (type === "stop") {
      payload.stop_name = field1;
      payload.route_name = `${field2} to ${field3}`;
    } else if (type === 'general') {
      payload.message = field1;
    }

    try {
      if (initialData) {
        await ContributionService.updateContributionPayload(initialData.id, type!, payload);
      } else {
        await ContributionService.submitContribution(type!, payload, user?.id);
      }
      setIsSuccess(true);
    } catch (e: any) {
      console.error("Submission error:", e);
      setErrorMessage(e?.message || "There was an error submitting your contribution. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormContent = () => {
    switch (type) {
      case "price":
        return (
          <>
            <InputField
              label="Origin (Start Location)"
              value={field1}
              onChangeText={setField1}
              placeholder="Where did you board?"
              icon={<WebIcon name="map-outline" size= {20} color={colors.primary} />}
              onIconPress={() => openLocationSearch('origin')}
            />
            <InputField
              label="Destination (End Location)"
              value={field2}
              onChangeText={setField2}
              placeholder="Where did you alight?"
              icon={<WebIcon name="map-outline" size= {20} color={colors.primary} />}
              onIconPress={() => openLocationSearch('destination')}
            />
            <InputField
              label="Actual Fare Paid (GHS)"
              value={field3}
              onChangeText={(text) => {
                let cleaned = text.replace(/[^0-9.]/g, '');
                const parts = cleaned.split('.');
                // Keep up to 2 decimal digits while typing
                if (parts.length > 1) {
                  cleaned = parts[0] + '.' + parts[1].slice(0, 2);
                }
                setField3(cleaned);
              }}
              onBlur={() => {
                if (field3) {
                  const num = parseFloat(field3);
                  if (!isNaN(num)) {
                    setField3(num.toFixed(2));
                  }
                }
              }}
              keyboardType="numeric"
              placeholder="e.g. 8.50"
            />
          </>
        );
      case "route":
        return (
          <>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 14, fontWeight: '600' }}>Journey Type</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    padding: 12, 
                    borderRadius: 12, 
                    borderWidth: 1, 
                    borderColor: journeyType === "straight" ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    backgroundColor: journeyType === "straight" ? `${colors.primary}15` : colors.surface,
                    alignItems: 'center'
                  }}
                  onPress={() => setJourneyType("straight")}
                >
                  <WebIcon name="car" size= {24} color={journeyType === "straight" ? colors.primary : colors.textSecondary} />
                  <Text style={{ marginTop: 4, fontWeight: '600', color: journeyType === "straight" ? colors.primary : colors.textSecondary }}>{t('straight_trotro', 'Straight Trotro')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ 
                    flex: 1, 
                    padding: 12, 
                    borderRadius: 12, 
                    borderWidth: 1, 
                    borderColor: journeyType === "transfer" ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    backgroundColor: journeyType === "transfer" ? `${colors.primary}15` : colors.surface,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                     setJourneyType("transfer");
                     if (field1 && !tempManualOrigin) setTempManualOrigin(field1);
                  }}
                >
                  <WebIcon name="git-network" size= {24} color={journeyType === "transfer" ? colors.primary : colors.textSecondary} />
                  <Text style={{ marginTop: 4, fontWeight: '600', color: journeyType === "transfer" ? colors.primary : colors.textSecondary }}>{t('multiple_trotros', 'Multiple Trotros')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Global Origin and Destination */}
            <InputField
              label={journeyType === "transfer" ? "Overall Origin (Start Location)" : "Origin (Start Location)"}
              value={field1}
              onChangeText={setField1}
              placeholder="Where does the route start?"
              icon={<WebIcon name="map-outline" size= {20} color={colors.primary} />}
              onIconPress={() => openLocationSearch('origin')}
            />
            
            <View style={{ alignItems: 'center', marginVertical: -5, zIndex: 10 }}>
              <TouchableOpacity 
                onPress={handleSwapRoute}
                style={{ 
                  backgroundColor: colors.surface, 
                  borderRadius: 20, 
                  padding: 8,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <WebIcon name="swap-vertical" size= {20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <InputField
              label={journeyType === "transfer" ? "Overall Destination (End Location)" : "Destination (End Location)"}
              value={field2}
              onChangeText={setField2}
              placeholder="Where does it end?"
              icon={<WebIcon name="map-outline" size= {20} color={colors.primary} />}
              onIconPress={() => openLocationSearch('destination')}
            />

            {journeyType === "straight" && (
              <>
                <InputField
                  label="Estimated Fare (GHS)"
                  value={field3}
                  onChangeText={(text) => {
                    let cleaned = text.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 1) {
                      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
                    }
                    setField3(cleaned);
                  }}
                  onBlur={() => {
                    if (field3) {
                      const num = parseFloat(field3);
                      if (!isNaN(num)) {
                        setField3(num.toFixed(2));
                      }
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="e.g. 8.50"
                  icon={<WebIcon name="pricetag" size= {20} color={colors.primary} />}
                />
                
                {/* Intermediate Stops */}
                <View style={{ marginTop: 16 }}>
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Option 1: Add Intermediate Stops</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>Manually list the stops if you know them</Text>
                  </View>
                  
                  {routeStops.map((stop, index) => (
                    <View key={index} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      backgroundColor: colors.surface,
                      padding: 12,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}>
                      <WebIcon name="bus" size= {18} color={colors.primary} style={{ marginRight: 12 }} />
                      <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{stop.name}</Text>
                      <TouchableOpacity 
                        onPress={() => setRouteStops(routeStops.filter((_, i) => i !== index))}
                        style={{ padding: 4 }}
                      >
                        <WebIcon name="close-circle" size= {20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity 
                    onPress={() => openLocationSearch('stop')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      borderStyle: 'dashed',
                      marginTop: 4,
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)'
                    }}
                  >
                    <WebIcon name="add-circle-outline" size= {20} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>Add Stop</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {journeyType === "transfer" && (
              <View style={{ marginTop: 8 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('option_1_add_details', 'Option 1: Add Details per Trotro')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{t('manually_enter_details', 'Manually enter details for each trotro you take')}</Text>
                </View>

                {manualLegs.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    {manualLegs.map((leg, idx) => (
                      <View key={idx} style={{ padding: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{t('trotro_number', 'Trotro {{number}}', { number: idx + 1 })}</Text>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{leg.origin} ➔ {leg.destination}</Text>
                        <Text style={{ color: colors.primary, fontSize: 13, marginTop: 4, fontWeight: '600' }}>Fare: GHS {leg.fare}</Text>
                        {leg.stops && leg.stops.length > 0 && (
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Via: {leg.stops.map(s => s.name).join(', ')}</Text>
                        )}
                        <TouchableOpacity 
                          onPress={() => setManualLegs(manualLegs.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: 8, right: 8, padding: 4 }}
                        >
                          <WebIcon name="trash" size= {16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ padding: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                    {manualLegs.length > 0 ? t('add_trotro_number', 'Add Trotro {{number}}', { number: manualLegs.length + 1 }) : t('trotro_1', 'Trotro 1')}
                  </Text>
                  <InputField
                    label="Origin"
                    value={tempManualOrigin}
                    onChangeText={setTempManualOrigin}
                    placeholder={t('where_board_trotro', 'Where do you board this trotro?')}
                  />
                  <InputField
                    label="Destination"
                    value={tempManualDestination}
                    onChangeText={setTempManualDestination}
                    placeholder={t('where_get_off', 'Where do you get off?')}
                  />
                  <InputField
                    label="Fare (GHS)"
                    value={tempManualFare}
                    onChangeText={setTempManualFare}
                    keyboardType="numeric"
                    placeholder="e.g. 5.50"
                  />
                  
                  <View style={{ marginTop: 8, marginBottom: 4 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Intermediate Stops</Text>
                    {routeStops.map((stop, index) => (
                      <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', padding: 8, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <WebIcon name="bus" size= {14} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>{stop.name}</Text>
                        <TouchableOpacity onPress={() => setRouteStops(routeStops.filter((_, i) => i !== index))} style={{ padding: 4 }}>
                          <WebIcon name="close-circle" size= {16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => openLocationSearch('stop')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)' }}>
                      <WebIcon name="add-circle-outline" size= {16} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{t('add_stop_for_trotro', 'Add Stop for this Trotro')}</Text>
                    </TouchableOpacity>
                  </View>

                  <CustomButton 
                    title={t('add_trotro', 'Add Trotro')} 
                    onPress={() => {
                      if (!tempManualOrigin.trim() || !tempManualDestination.trim() || !tempManualFare.trim()) {
                        Alert.alert(t('missing_fields', 'Missing Fields'), t('missing_trotro_fields', 'Please fill in Origin, Destination, and Fare for this trotro.'));
                        return;
                      }
                      if (routeStops.length < 3) {
                        Alert.alert("Missing Stops", "Please add at least 3 intermediate stops for this trotro.");
                        return;
                      }
                      setManualLegs([...manualLegs, {
                        origin: tempManualOrigin,
                        destination: tempManualDestination,
                        fare: parseFloat(tempManualFare) || 0,
                        stops: routeStops
                      }]);
                      setTempManualOrigin(tempManualDestination); // Pre-fill origin with previous destination
                      setTempManualDestination("");
                      setTempManualFare("");
                      setRouteStops([]); // Clear stops for the next leg
                    }}
                    bgVariant="secondary" textVariant="secondary"
                    containerStyle={{ marginTop: 8, height: 44, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}
                    textStyle={{ fontSize: 14 }}
                  />
                </View>
              </View>
            )}



            {/* GPS Tracking UI */}
            <View style={{ marginTop: 24, padding: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ backgroundColor: isTracking ? '#ef444420' : '#10b98120', padding: 8, borderRadius: 8, marginRight: 12 }}>
                  <WebIcon name="location" size= {20} color={isTracking ? '#ef4444' : '#10b981'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Option 2: Live GPS Tracking</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    {isTracking 
                      ? `Recording... (${trackedCoords.length} points)` 
                      : trackedCoords.length > 0 
                        ? `Recorded ${trackedCoords.length} points` 
                        : t('recommended_draw_route', 'Recommended: Draw the route by riding the trotro')}
                  </Text>
                </View>
              </View>

              {(isTracking || trackedCoords.length > 0) && (
                <View style={{ height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                  <MapViewWrapper 
                    showsUserLocation 
                    pitchEnabled={false}
                    initialCamera={trackedCoords.length > 0 ? { center: trackedCoords[trackedCoords.length - 1], zoom: 15 } : undefined}
                  >
                    {trackedCoords.length > 1 && (
                      <Polyline 
                        coordinates={trackedCoords} 
                        strokeColor={colors.primary} 
                        strokeWidth={4} 
                      />
                    )}
                  </MapViewWrapper>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={toggleTracking}
                  style={{
                    flex: 1,
                    backgroundColor: isTracking ? '#ef4444' : colors.primary,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center'
                  }}
                >
                  <WebIcon name={isTracking ? "stop-circle" : "play-circle"} size= {20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                    {isTracking ? "Stop Recording" : trackedCoords.length > 0 ? "Resume" : "Start Tracking"}
                  </Text>
                </TouchableOpacity>

                {isTracking && journeyType === "transfer" && (
                  <TouchableOpacity
                    onPress={() => {
                       setIsTracking(false);
                       if (trackingSubRef.current) {
                         try { trackingSubRef.current.remove(); } catch(e){}
                         trackingSubRef.current = null;
                       }
                       setShowTransferPrompt(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#f59e0b',
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center'
                    }}
                  >
                    <WebIcon name="git-commit" size= {20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                      Mark Transfer
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {completedLegs.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 13, fontWeight: '600' }}>Completed Legs</Text>
                  {completedLegs.map((leg, idx) => (
                    <Text key={idx} style={{ color: colors.text, fontSize: 13, marginBottom: 4 }}>
                      ✓ {leg.origin} to {leg.destination} ({leg.coords.length} points)
                    </Text>
                  ))}
                </View>
              )}

              {trackedCoords.length > 0 && !isTracking && !showTransferPrompt && (
                <TouchableOpacity
                  onPress={() => { setTrackedCoords([]); setCompletedLegs([]); }}
                  style={{ marginTop: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Clear All Recording</Text>
                </TouchableOpacity>
              )}

              {showTransferPrompt && (
                <View style={{ marginTop: 16, padding: 16, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.primary }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Save Leg & Continue</Text>
                  <InputField
                    label="Transfer Station Name"
                    value={tempTransferStop}
                    onChangeText={setTempTransferStop}
                    placeholder="e.g. Circle"
                  />
                  <InputField
                    label="Fare paid for this leg (GHS)"
                    value={tempTransferFare}
                    onChangeText={setTempTransferFare}
                    keyboardType="numeric"
                    placeholder="e.g. 5.50"
                  />
                  <CustomButton 
                    title="Save & Start Next Leg" 
                    onPress={() => {
                      if (!tempTransferStop.trim()) {
                        Alert.alert("Required", "Please enter the transfer station name.");
                        return;
                      }
                      const currentOrigin = completedLegs.length > 0 ? completedLegs[completedLegs.length - 1].destination : field1;
                      setCompletedLegs([...completedLegs, {
                        origin: currentOrigin,
                        destination: tempTransferStop,
                        fare: parseFloat(tempTransferFare) || 0,
                        coords: trackedCoords
                      }]);
                      setTrackedCoords([]);
                      setTempTransferStop("");
                      setTempTransferFare("");
                      setShowTransferPrompt(false);
                      // Optionally Auto-resume tracking here, but user can just click Start Tracking again
                    }}
                    containerStyle={{ marginTop: 8, height: 44, backgroundColor: colors.primary }}
                    textStyle={{ fontSize: 14 }}
                  />
                  <CustomButton 
                    title="Cancel" 
                    onPress={() => setShowTransferPrompt(false)}
                    bgVariant="secondary" textVariant="secondary"
                    containerStyle={{ marginTop: 8, height: 44 }}
                    textStyle={{ fontSize: 14 }}
                  />
                </View>
              )}
            </View>
          </>
        );
      case "stop":
        return (
          <>
            <InputField
              label="Missing Stop Name"
              value={field1}
              onChangeText={setField1}
              placeholder={t('name_of_trotro_stop', 'Name of the trotro stop')}
            />
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 14, fontWeight: '600' }}>Which route is this stop on?</Text>
              <InputField
                label="Origin"
                value={field2}
                onChangeText={setField2}
                placeholder="Where does the route start?"
                icon={<WebIcon name="map-outline" size= {20} color={colors.primary} />}
                onIconPress={() => openLocationSearch('origin')}
              />
              <InputField
                label="Destination"
                value={field3}
                onChangeText={setField3}
                placeholder="Where does it end?"
                icon={<WebIcon name="map-outline" size= {20} color={colors.primary} />}
                onIconPress={() => openLocationSearch('destination')}
              />
            </View>
          </>
        );
      case "general":
        return (
          <>
            <InputField
              label="Your Feedback / Suggestion"
              value={field1}
              onChangeText={setField1}
              placeholder="Tell us what's on your mind..."
              multiline
              containerStyle={{ minHeight: 120 }}
            />
          </>
        );
      default:
        return null;
    }
  };

  const renderSuccessState = () => {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <WebIcon name="checkmark-circle" size= {48} color="#10b981" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 }}>Thank You!</Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
          Your contribution has been {initialData ? 'updated' : 'received'}. We appreciate your help in making myTroskiGo better!
        </Text>
        <CustomButton
          title="Done"
          onPress={handleClose}
          containerStyle={{ width: '100%', height: 56, marginBottom: 12, backgroundColor: colors.primary }}
          textStyle={{ fontSize: 18, fontWeight: "700" }}
        />
        {!initialData && (
          <CustomButton
            title="Submit Another"
            onPress={() => {
              setField1("");
              setField2("");
              setField3("");
              setRouteStops([]);
              setIsSuccess(false);
            }}
            bgVariant="secondary"
            textVariant="secondary"
            containerStyle={{ width: '100%', height: 56, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}
            textStyle={{ fontSize: 16, fontWeight: "600" }}
          />
        )}
      </View>
    );
  };

  const getHeaderDetails = () => {
    switch (type) {
      case "price": return { title: "Update Fare", icon: "pricetag", color: "#10b981" };
      case "route": return { title: "New Route", icon: "map", color: "#8b5cf6" };
      case "stop": return { title: "Missing Stop", icon: "location", color: "#ef4444" };
      case "general": return { title: "Feedback", icon: "bulb", color: "#f59e0b" };
      default: return { title: "Contribution", icon: "help", color: colors.primary };
    }
  };

  const header = getHeaderDetails();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={() => { Keyboard.dismiss(); handleClose(); }} 
        />
        <Animated.View 
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOutDown.springify()}
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
            <View {...panResponder.panHandlers} style={{ width: '100%', backgroundColor: 'transparent' }}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={handleClose} 
                style={styles.dragHandleContainer}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <View style={styles.dragHandle} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.85 }} keyboardShouldPersistTaps="handled">
              <View style={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                    <WebIcon name={header.icon} size= {20} color={header.color} />
                  </View>
                  <Text style={[styles.title, { color: colors.text, marginLeft: 16 }]}>{header.title}</Text>
                </View>

                {isSuccess ? renderSuccessState() : renderFormContent()}
              </View>
            </ScrollView>

            {!isSuccess && (
              <View style={styles.footerContainer}>
                {!!errorMessage && (
                  <View style={{ backgroundColor: '#ef444420', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                    <WebIcon name="alert-circle" size= {20} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#ef4444', fontWeight: '600', flex: 1 }}>{errorMessage}</Text>
                  </View>
                )}
                <CustomButton
                  title="Submit"
                  onPress={handleSubmit}
                  loading={isLoading}
                  containerStyle={{ width: '100%', height: 60, marginBottom: 12, backgroundColor: header.color, shadowColor: header.color }}
                  textStyle={{ fontSize: 18, fontWeight: "700" }}
                />
                <CustomButton
                  title="Cancel"
                  onPress={handleClose}
                  bgVariant="secondary"
                  textVariant="secondary"
                  containerStyle={{ width: '100%', height: 60, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}
                  textStyle={{ fontSize: 18, fontWeight: "700" }}
                />
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>

        <LocationSearchModal
          visible={isLocationSearchVisible}
          onClose={() => setIsLocationSearchVisible(false)}
          onSelectLocation={handleLocationSelect}
          title={
            activeSearchField === 'origin' 
              ? "Select Origin" 
              : activeSearchField === 'destination' 
                ? "Select Destination" 
                : activeSearchField === 'transfer'
                  ? "Select Transfer Location"
                  : "Add Stop"
          }
          activeField={activeSearchField}
        />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    minHeight: '60%',
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  dragHandleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignSelf: "center",
    marginTop: -16,
    marginBottom: 8,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(150, 150, 150, 0.4)",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  formScroll: {
    paddingBottom: 20,
  },
  footerContainer: {
    flexDirection: "column",
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: "rgba(150,150,150,0.1)",
  }
});
