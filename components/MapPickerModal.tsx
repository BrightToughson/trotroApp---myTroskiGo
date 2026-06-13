import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { WebIcon } from './WebIcon';
import MapViewWrapper from './MapViewWrapper';
import { useTheme } from '../context/ThemeContext';
import { reverseGeocode, Location } from '../lib/LocationService';
import { CustomButton } from './customButton';

interface MapPickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectLocation: (loc: Location) => void;
  initialCoordinate?: { latitude: number; longitude: number };
}

export default function MapPickerModal({ isVisible, onClose, onSelectLocation, initialCoordinate }: MapPickerModalProps) {
  const { colors, isDark } = useTheme();
  // Default to Accra center
  const [centerCoord, setCenterCoord] = useState(initialCoordinate || { latitude: 5.6037, longitude: -0.1870 });
  const [isLoading, setIsLoading] = useState(false);

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
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.mapContainer}>
          <MapViewWrapper
            initialCamera={{ center: centerCoord, zoom: 15 }}
            onCameraChanged={(e: any) => {
              if (e.properties && e.properties.center) {
                setCenterCoord({ longitude: e.properties.center[0], latitude: e.properties.center[1] });
              }
            }}
          />
          {/* Absolute centered pin */}
          <View style={styles.centerPin} pointerEvents="none">
             <WebIcon name="location" size= {44} color={colors.primary} />
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
            containerStyle={{ width: '100%', height: 48 }}
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
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
    marginLeft: -22,
    marginTop: -44, // offset by height to point directly at center
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  coordText: {
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '600'
  }
});
