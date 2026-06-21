import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "farmerpro_theme_preference";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedScheme: "light" | "dark";
  setTheme: (t: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? "light";
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    });
  }, []);

  const setTheme = useCallback(async (t: ThemePreference) => {
    setThemeState(t);
    await AsyncStorage.setItem(THEME_KEY, t);
  }, []);

  const resolvedScheme: "light" | "dark" =
    theme === "system" ? systemScheme : theme;

  const value = useMemo(
    () => ({ theme, resolvedScheme, setTheme }),
    [theme, resolvedScheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
