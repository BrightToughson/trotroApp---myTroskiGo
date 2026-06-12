import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, LightColors } from '../context/ThemeContext';
import { Image } from 'expo-image';

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const { colors, isDark } = useTheme();

  const currentLanguage = i18n.language || 'en';

  const toggleLanguage = () => {
    i18n.changeLanguage(currentLanguage.startsWith('en') ? 'fr' : 'en');
  };

  const isFr = currentLanguage.startsWith('fr');
  const flagUrl = isFr ? 'https://flagcdn.com/w40/fr.png' : 'https://flagcdn.com/w40/gb.png';
  const langText = isFr ? 'FR' : 'EN';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          borderColor: colors.border
        }
      ]}
      onPress={toggleLanguage}
    >
      <Image 
        source={{ uri: flagUrl }} 
        style={styles.flagImage} 
        contentFit="cover"
      />
      <Text style={[styles.langText, { color: colors.text }]}>
        {langText}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 3,
  },
  flagImage: {
    width: 14,
    height: 8,
    borderRadius: 2,
  },
  langText: {
    fontSize: 13,
    fontWeight: 'bold',
  }
});

export default LanguageSelector;
