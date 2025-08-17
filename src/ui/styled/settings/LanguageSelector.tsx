'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { useUserManagement } from '@/lib/auth/UserManagementProvider';
import { getPlatformClasses } from '@/hooks/utils/usePlatformStyles';
import { Label } from '@/ui/primitives/label';

interface LanguageSelectorProps {
  minimal?: boolean;
}

export function LanguageSelector({ minimal = false }: LanguageSelectorProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { platform, isNative } = useUserManagement();

  const handleLanguageChange = (value: string): void => {
    i18n.changeLanguage(value);
  };

  const currentLanguage = i18n.language;

  const containerClasses = getPlatformClasses({
    base: "flex items-center space-x-2",
  }, { platform, isNative });

  const triggerClasses = getPlatformClasses({
    base: "min-w-[8rem]",
    mobile: "min-w-[6rem]"
  }, { platform, isNative });

  if (minimal) {
    return (
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-auto h-8 border-none shadow-none bg-transparent px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="es">Español</SelectItem>
          <SelectItem value="fr">Français</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={containerClasses}>
      <Label htmlFor="language-select" className="text-sm font-medium">
        {t('settings.language')}
      </Label>
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger id="language-select" className={triggerClasses}>
          <SelectValue placeholder={t('settings.language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="es">Español</SelectItem>
          <SelectItem value="fr">Français</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 