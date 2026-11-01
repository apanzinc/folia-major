import { create } from 'zustand';
import i18n from '../i18n/config';
import { clearUploadedUiFont, uploadAndRegisterUiFont } from '../services/customUiFont';
import { type StatusMessage, type StoredCustomUiFont, type UiFontMode } from '../types';
import { removeStoredKey, setStoredString } from './storagePrimitives';
import { setStatusMessage } from './useStatusMessageStore';

// src/stores/useUiFontSettingsStore.ts
// The interface font: the bundled MiSans variable font (the default), the system stack, or a family
// the user names or uploads. services/uiFont.ts applies the choice as the --font-ui CSS variable;
// this store only owns the values, like every other settings store.

export const UI_FONT_MODE_STORAGE_KEY = 'ui_font_mode';
export const UI_FONT_CUSTOM_STORAGE_KEY = 'ui_font_custom';

const UI_FONT_MODES: readonly UiFontMode[] = ['misans', 'system', 'custom'];

const parseStoredCustomUiFont = (raw: unknown): StoredCustomUiFont | null => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const value = raw as Partial<StoredCustomUiFont>;
    const family = typeof value.family === 'string' ? value.family.trim() : '';
    if (!family) {
        return null;
    }

    if (value.source === 'uploaded') {
        const fontId = 'fontId' in value && typeof value.fontId === 'string' ? value.fontId.trim() : '';
        if (!fontId) {
            return null;
        }
        const label = 'label' in value && typeof value.label === 'string' && value.label.trim() ? value.label : family;
        return { source: 'uploaded', family, label, fontId };
    }

    return { source: 'system', family };
};

const readStoredUiFontMode = (): UiFontMode => {
    if (typeof window === 'undefined') {
        return 'misans';
    }

    const saved = localStorage.getItem(UI_FONT_MODE_STORAGE_KEY);
    return UI_FONT_MODES.includes(saved as UiFontMode) ? saved as UiFontMode : 'misans';
};

const readStoredCustomUiFont = (): StoredCustomUiFont | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const saved = localStorage.getItem(UI_FONT_CUSTOM_STORAGE_KEY);
    if (!saved) {
        return null;
    }

    try {
        return parseStoredCustomUiFont(JSON.parse(saved));
    } catch {
        return null;
    }
};

const writeCustomUiFont = (font: StoredCustomUiFont | null) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (font) {
        setStoredString(UI_FONT_CUSTOM_STORAGE_KEY, JSON.stringify(font));
        return;
    }

    removeStoredKey(UI_FONT_CUSTOM_STORAGE_KEY);
};

export type UiFontSettingsState = {
    uiFontMode: UiFontMode;
    uiFontCustomFont: StoredCustomUiFont | null;
    handleSetUiFontMode: (mode: UiFontMode) => void;
    handleSetUiFontCustomFamily: (family: string) => void;
    handleUploadUiFont: (file: File) => Promise<{ ok: boolean; error?: string; }>;
    handleClearUiFont: () => Promise<void>;
    clearUiFontAfterRestoreFailure: (message: StatusMessage) => void;
    syncUiFontFromStorage: () => void;
};

export const useUiFontSettingsStore = create<UiFontSettingsState>((set) => ({
    uiFontMode: readStoredUiFontMode(),
    uiFontCustomFont: readStoredCustomUiFont(),
    handleSetUiFontMode: (mode) => {
        if (!UI_FONT_MODES.includes(mode)) {
            return;
        }
        setStoredString(UI_FONT_MODE_STORAGE_KEY, mode);
        set({ uiFontMode: mode });
    },
    handleSetUiFontCustomFamily: (family) => {
        const trimmed = family.trim();
        if (!trimmed) {
            void clearUploadedUiFont();
            writeCustomUiFont(null);
            set({ uiFontCustomFont: null });
            return;
        }

        const next: StoredCustomUiFont = { source: 'system', family: trimmed };
        // A named family replaces an uploaded one: the file in IndexedDB would only be stale.
        void clearUploadedUiFont();
        writeCustomUiFont(next);
        set({ uiFontCustomFont: next, uiFontMode: 'custom' });
        setStoredString(UI_FONT_MODE_STORAGE_KEY, 'custom');
    },
    handleUploadUiFont: async (file) => {
        try {
            const meta = await uploadAndRegisterUiFont(file);
            writeCustomUiFont(meta);
            setStoredString(UI_FONT_MODE_STORAGE_KEY, 'custom');
            set({ uiFontCustomFont: meta, uiFontMode: 'custom' });
            setStatusMessage({
                type: 'success',
                text: i18n.t('notifications.fontEnabled', { fontName: meta.source === 'uploaded' ? meta.label : meta.family }),
            });

            return { ok: true };
        } catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : i18n.t('notifications.fontUploadFailed');
            setStatusMessage({ type: 'error', text: message });

            return { ok: false, error: message };
        }
    },
    handleClearUiFont: async () => {
        await clearUploadedUiFont();
        writeCustomUiFont(null);
        setStoredString(UI_FONT_MODE_STORAGE_KEY, 'misans');
        set({ uiFontCustomFont: null, uiFontMode: 'misans' });
    },
    clearUiFontAfterRestoreFailure: (message) => {
        writeCustomUiFont(null);
        set({ uiFontCustomFont: null });
        setStatusMessage(message);
    },
    syncUiFontFromStorage: () => {
        set({ uiFontMode: readStoredUiFontMode(), uiFontCustomFont: readStoredCustomUiFont() });
    },
}));

export const selectUiFontSettingsSnapshot = (state: UiFontSettingsState) => ({
    uiFontMode: state.uiFontMode,
    uiFontCustomFont: state.uiFontCustomFont,
    handleSetUiFontMode: state.handleSetUiFontMode,
    handleSetUiFontCustomFamily: state.handleSetUiFontCustomFamily,
    handleUploadUiFont: state.handleUploadUiFont,
    handleClearUiFont: state.handleClearUiFont,
});
