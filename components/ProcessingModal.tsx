import { ms } from '../lib/metrics';
import React from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from
'react-native-reanimated';

interface ProcessingModalProps {
  visible: boolean;
  message?: string;
  isSuccess?: boolean;
}

export function ProcessingModal({ visible, message = "Processing...", isSuccess = false }: ProcessingModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(200)}
          style={[styles.modalBox, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}
        >
          {isSuccess ? (
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size= {50} color="#10b981" />
            </View>
          ) : (
            <View style={styles.iconContainer}>
              <ActivityIndicator size= "large" color={colors.primary} />
            </View>
          )}
          <Text style={[styles.message, { color: colors.text }]}>
            {message}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: ms(240),
    paddingVertical: ms(32),
    paddingHorizontal: ms(20),
    borderRadius: ms(24),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(10) },
    shadowOpacity: 0.25,
    shadowRadius: ms(15),
    elevation: 10,
  },
  iconContainer: {
    marginBottom: ms(20),
    height: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: ms(17),
    fontWeight: '600',
    textAlign: 'center',
  }
});
