import { ms } from '../lib/metrics';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebIcon } from './WebIcon';
import MapViewWrapper from './MapViewWrapper';
import { useTheme } from '../context/ThemeContext';
import { reverseGeocode, Location, getCurrentUserLocation } from '../lib/LocationService';
import { CustomButton } from './customButton';

interface MapPickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectLocation: (loc: Location) => void;
  initialCoordinate?: { latitude: number; longitude: number };
}

export default function MapPickerModal({ isVisible, onClose, onSelectLocation, initialCoordinate }: MapPickerModalProps) {
  const { colors, isDark } = useTheme();
  const [centerCoord, setCenterCoord] = useState(initialCoordinate || { latitude: 5.6037, longitude: -0.1870 });
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<any>(null);
  const mapZoom = useRef<number>(15);

  const zoomIn = () => {
    if (mapRef.current) {
      mapZoom.current = Math.min(mapZoom.current + 1, 21);
      mapRef.current.animateCamera({ zoom: mapZoom.current }, { duration: 300 });
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapZoom.current = Math.max(mapZoom.current - 1, 3);
      mapRef.current.animateCamera({ zoom: mapZoom.current }, { duration: 300 });
    }
  };

  const locateUser = async () => {
    setIsLocating(true);
    try {
      const loc = await getCurrentUserLocation();
      if (loc && loc.coordinate && mapRef.current) {
        setCenterCoord(loc.coordinate);
        mapZoom.current = 18;
        mapRef.current.animateCamera({
          center: loc.coordinate,
          zoom: mapZoom.current
        }, { duration: 800 });
      } else {
        Alert.alert("GPS Error", "Could not get your precise location. Please check your location permissions.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("GPS Error", "An error occurred while getting your location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    const address = await reverseGeocode(centerCoord.latitude, centerCoord.longitude);
    setIsLoading(false);
    
    const newLoc: Location = {
      name: address.split(',')[0] || "Selected Location",
      coordinate: centerCoord,
      address: address,
      type: "station" as any,
      isVerified: false
    };
    
    onSelectLocation(newLoc);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <WebIcon name="close" size= {24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Choose on Map</Text>
          <View style={{ width: ms(40) }} />
        </View>

        <View style={styles.mapContainer}>
          <MapViewWrapper
            ref={mapRef}
            style={{ flex: 1 }}
            initialCamera={{ center: centerCoord, zoom: mapZoom.current }}
            onCameraChanged={(e: any) => {
              if (e.properties && e.properties.center) {
                setCenterCoord({ longitude: e.properties.center[0], latitude: e.properties.center[1] });
              }
            }}
          />
          {/* Absolute centered pin */}
          <View style={styles.centerPin} pointerEvents="none">
             <WebIcon name="location" size={44} color={colors.primary} />
          </View>
          
          {/* Custom Map Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "#fff", borderColor: colors.border }]} onPress={zoomIn}>
              <WebIcon name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "#fff", borderColor: colors.border }]} onPress={zoomOut}>
              <WebIcon name="remove" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "#fff", borderColor: colors.border, marginTop: ms(10) }]} onPress={locateUser} disabled={isLocating}>
              {isLocating ? <ActivityIndicator size="small" color={colors.primary} /> : <WebIcon name="navigate" size={20} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
          <Text style={[styles.coordText, { color: colors.textSecondary }]}>
             {centerCoord.latitude.toFixed(5)}, {centerCoord.longitude.toFixed(5)}
          </Text>
          <CustomButton 
            title={isLoading ? "Loading..." : "Confirm Location"} 
            onPress={handleConfirm} 
            disabled={isLoading}
            containerStyle={{ width: '100%', height: ms(48) }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: ms(50),
    paddingBottom: ms(16),
    paddingHorizontal: ms(16),
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: ms(18),
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: ms(-22),
    marginTop: ms(-44), // offset by height to point directly at center
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.3,
    shadowRadius: ms(3),
  },
  footer: {
    padding: ms(24),
    paddingBottom: ms(40),
    borderTopWidth: 1,
    alignItems: 'center',
  },
  coordText: {
    fontSize: ms(13),
    marginBottom: ms(16),
    fontWeight: '600'
  },
  mapControls: {
    position: 'absolute',
    right: ms(16),
    bottom: ms(16),
    alignItems: 'center',
    gap: ms(8),
    zIndex: 20
  },
  mapBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.15,
    shadowRadius: ms(4),
    elevation: 4,
    borderWidth: 1,
  }
});
