import React, { createContext, useContext, useEffect, useState } from "react";
import en from "./translations/en.json";
import hi from "./translations/hi.json";

const translations: Record<string, Record<string, any>> = { en, hi };

interface LanguageContextType {
  language: "en" | "hi";
  setLanguage: (lang: "en" | "hi") => void;
  t: (key: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<"en" | "hi">(
    (localStorage.getItem("language") as "en" | "hi") || "en"
  );

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, defaultValue?: string): string => {
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return typeof value === "string" ? value : defaultValue || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageState, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
