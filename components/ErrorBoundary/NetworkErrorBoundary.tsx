import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WebIcon } from '../WebIcon';
import { useTheme } from '../../context/ThemeContext';
import { CustomButton } from '../customButton';

export function NetworkErrorBoundary({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [hasInitialCheck, setHasInitialCheck] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // NetInfo might return null for isConnected in some edge cases
      setIsConnected(state.isConnected ?? true);
    });

    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? true);
      setHasInitialCheck(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Wait for initial network check before rendering children to prevent
  // Clerk JS from trying to load when offline and throwing a Promise Rejection
  if (!hasInitialCheck) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} />
    );
  }

  if (isConnected === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WebIcon name="cloud-offline-outline" size={80} color="#FF3B30" />
        <Text style={[styles.title, { color: colors.text }]}>No Internet Connection</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please check your network connection and try again. myTroski Go requires an active internet connection to work.
        </Text>
        <CustomButton
          title="Try Again"
          onPress={() => {
            NetInfo.fetch().then(state => {
              setIsConnected(state.isConnected ?? true);
            });
          }}
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
});
