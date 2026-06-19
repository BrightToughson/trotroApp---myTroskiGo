import React, { Suspense, lazy } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Platform } from 'react-native';

// Web-specific lazy loaded components
export const LazyMapView = Platform.OS === 'web' ? lazy(() =>
  import('../components/MapViewWrapper/index.web').then(module => ({
    default: module.MapViewWrapper
  }))
) : lazy(() =>
  import('../components/MapViewWrapper/index').then(module => ({
    default: module.MapViewWrapper
  }))
);

export const LazySideMenu = lazy(() =>
  import('../components/SideMenu').then(module => ({
    default: module.default
  }))
);

export const LazyTutorialModal = lazy(() =>
  import('../components/TutorialModal').then(module => ({
    default: module.default
  }))
);

export const LazyOfficialAnnouncementsModal = lazy(() =>
  import('../components/OfficialAnnouncementsModal').then(module => ({
    default: module.default
  }))
);

// Loading component for lazy loaded components
export const WebLoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#0286FF" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Higher-order component for web-specific lazy loading
export const withWebLazyLoad = <P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ComponentType = WebLoadingFallback
) => {
  return (props: P) => {
    if (Platform.OS !== 'web') {
      return <Component {...props} />;
    }

    return (
      <Suspense fallback={<fallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
};

// Preload critical components
export const preloadCriticalComponents = () => {
  if (Platform.OS === 'web') {
    // Preload map component when idle
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        import('../components/MapViewWrapper/index.web');
      });
    }
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});