import { ms } from '../lib/metrics';
import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useTheme, LightColors } from
'@/context/ThemeContext';

interface CodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
}

export function CodeInput({ value, onChangeText, length = 6 }: CodeInputProps) {
  const { colors, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  // Array of length to map over
  const codeArray = new Array(length).fill(0);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={handlePress}
        style={styles.inputContainer}
      >
        {codeArray.map((_, index) => {
          const char = value[index] || '';
          const isCurrentFocus = value.length === index;
          const isFilled = char !== '';

          return (
            <View 
              key={index} 
              style={[
                styles.cell,
                {
                  borderColor: isCurrentFocus ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                },
                isCurrentFocus && styles.cellFocused,
                isFilled && { borderColor: colors.primary }
              ]}
            >
              <Text style={[styles.cellText, { color: colors.text }]}>
                {char}
              </Text>
            </View>
          );
        })}
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          if (text.length <= length) {
             // Only allow digits
             onChangeText(text.replace(/[^0-9]/g, ''));
          }
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        style={styles.hiddenInput}
        caretHidden={true}
        autoFocus={Platform.OS === 'web'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: ms(20),
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cell: {
    width: ms(48),
    height: ms(58),
    borderRadius: ms(12),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellFocused: {
    borderWidth: ms(2),
  },
  cellText: {
    fontSize: ms(28),
    fontWeight: '600',
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    outlineStyle: 'none' as any,
  },
});
