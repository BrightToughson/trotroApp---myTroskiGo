import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

/**
 * Theme System Configuration
 * This file manages the application-wide styling tokens and theme switching logic.
 */

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof LightColors;
}

// Design tokens for Light Mode
export const LightColors = {
  background: "#FFFFFF",
  text: "#1F2937",
  textSecondary: "#6B7280",
  surface: "#F3F4F6",
  surfaceSecondary: "#E5E7EB",
  primary: "#0286FF",
  border: "#F3F4F6",
  card: "#FFFFFF",
  shadow: "#000000",
};

// Design tokens for Dark Mode
const DarkColors = {
  background: "#111827",
  text: "#F9FAFB",
  textSecondary: "#9CA3AF",
  surface: "#1F2937",
  surfaceSecondary: "#374151",
  primary: "#3B82F6",
  border: "#374151",
  card: "#1F2937",
  shadow: "#000000",
};

// Create a safe default theme for hydration and early renders
const DefaultTheme: ThemeContextType = {
  theme: "light",
  isDark: false,
  colors: LightColors,
  toggleTheme: () => {},
};

// Create the context with the safe default
const ThemeContext = createContext<ThemeContextType>(DefaultTheme);

/**
 * ThemeProvider: Wraps the app to provide theme state to all children.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme(); // Detect OS preference
  const [theme, setTheme] = useState<Theme>(
    systemColorScheme === "dark" ? "dark" : "light"
  );

  // Sync theme with system settings on initialization or system change
  useEffect(() => {
    if (systemColorScheme === "dark" || systemColorScheme === "light") {
      setTheme(systemColorScheme);
    }
  }, [systemColorScheme]);

  /**
   * Manually switches between light and dark themes
   */
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";
  const colors = isDark ? DarkColors : LightColors;

  const value = React.useMemo(() => ({
    theme,
    isDark,
    toggleTheme,
    colors
  }), [theme, isDark, colors]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to access theme context
 * This is now "self-healing" and will never return undefined.
 * Usage: const { colors, isDark } = useTheme();
 */
export const useTheme = () => {
  return useContext(ThemeContext);
};
