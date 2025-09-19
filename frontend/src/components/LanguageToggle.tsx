"use client";

import React, { useState } from "react";
import { useLocalization, Language } from "../contexts/LocalizationContext";
import { ChevronDownIcon, LanguageIcon } from "@heroicons/react/24/outline";

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { value: Language; label: string; nativeLabel: string }[] = [
    { value: 'en', label: 'English', nativeLabel: 'English' },
    { value: 'ur', label: 'Urdu', nativeLabel: 'اردو' }
  ];

  const currentLanguage = languages.find(lang => lang.value === language);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title={t('language.toggle')}
      >
        <LanguageIcon className="w-4 h-4" />
        <span>{currentLanguage?.nativeLabel || language.toUpperCase()}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {t('language.toggle')}
              </p>
            </div>
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-3 ${
                    language === lang.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{lang.nativeLabel}</div>
                    <div className="text-xs text-gray-500">{lang.label}</div>
                  </div>
                  {language === lang.value && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
