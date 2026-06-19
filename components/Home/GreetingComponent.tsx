import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ms } from '../../lib/utils/metrics';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

interface GreetingComponentProps {
  userName?: string;
}

export const GreetingComponent: React.FC<GreetingComponentProps> = ({ userName }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const hours = new Date().getHours();
  let textKey = "goodMorning";
  if (hours < 12) textKey = "goodMorning";
  else if (hours < 17) textKey = "goodAfternoon";
  else textKey = "goodEvening";

  const greetingText = t(textKey) || (hours < 12 ? "Good Morning" : hours < 17 ? "Good Afternoon" : "Good Evening");

  return (
    <View style={styles.container}>
      <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greetingText}, </Text>
      {userName && <Text style={[styles.greeting, { color: colors.text }]}>{userName}</Text>}
      {Platform.OS === 'web' ? (
        <Image source={{ uri: 'https://flagcdn.com/w40/gh.png' }} style={styles.flag} />
      ) : (
        <Text style={styles.flagEmoji}>🇬🇭</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: ms(14),
    fontWeight: '600',
  },
  flag: {
    width: ms(22),
    height: ms(16),
    marginLeft: ms(4),
    borderRadius: ms(2),
  },
  flagEmoji: {
    fontSize: ms(16),
    marginLeft: ms(4),
  },
});