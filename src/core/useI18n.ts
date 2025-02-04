import { getTranslation } from '../core/Translations';
import type { TranslationKey } from '../types/translations';

export function useI18n() {
    const t = (key: TranslationKey) => getTranslation(key);
    return { t };
} 