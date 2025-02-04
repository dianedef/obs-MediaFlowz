import { Notice } from 'obsidian';

export const NOTICE_DURATIONS = {
    SHORT: 2000,    // 2 secondes
    MEDIUM: 4000,   // 4 secondes
    LONG: 6000,     // 6 secondes
    UPLOAD: 8000,   // 8 secondes pour les uploads
    ERROR: 10000    // 10 secondes pour les erreurs
} as const;

export function showNotice(message: string, duration: number = NOTICE_DURATIONS.MEDIUM): Notice {
    return new Notice(message, duration);
} 