import React from 'react';
import { TouchableOpacity, View, Text, Platform, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ms } from '../../lib/utils/metrics';
import { useTheme } from '../../context/ThemeContext';
import { WebIcon } from '../../components/WebIcon';
import { useTranslation } from 'react-i18next';

interface InstallPromptComponentProps {
  isInstallable: boolean;
  handleInstallClick: () => void;
  liveLabelSize: number;
  liveTextSize: number;
  isSmallScreen: boolean;
}

export const InstallPromptComponent: React.FC<InstallPromptComponentProps> = ({
  isInstallable,
  handleInstallClick,
  liveLabelSize,
  liveTextSize,
  isSmallScreen,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (!isInstallable || Platform.OS !== 'web') {
    return null;
  }

  return (
    <Animated.View entering={FadeInUp.delay(250).duration(600)} style={[styles.installPrompt, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', marginTop: isSmallScreen ? ms(16) : ms(28) }]}>
      <TouchableOpacity
        style={styles.installContent}
        onPress={handleInstallClick}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.liveLabel, { color: colors.primary, fontSize: liveLabelSize }]}>{t('install_app')}</Text>
          <Text style={[styles.liveText, { color: colors.text, fontSize: liveTextSize, opacity: 0.9 }]} numberOfLines={2}>
            {t('install_app_desc')}
          </Text>
        </View>
        <WebIcon name="add-circle" size={24} color={colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  installPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(14),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  installContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  liveLabel: {
    fontSize: ms(13),
    fontWeight: '700',
  },
  liveText: {
    fontSize: ms(12),
  },
});