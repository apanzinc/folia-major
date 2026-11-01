import {
    UI_FONT_CUSTOM_STORAGE_KEY,
    UI_FONT_MODE_STORAGE_KEY,
    useUiFontSettingsStore,
    type UiFontSettingsState,
} from '../stores/useUiFontSettingsStore';

// src/services/uiFont.ts
// Applies the interface font chosen in 外观: resolves the settings into a CSS font-family stack and
// writes it to --font-ui on <html>, which index.css hands to body. Every surface this bundle mounts
// (main window, login window, remote control, OBS overlays) installs this at boot and follows the
// settings from then on.

/** The family the bundled variable font is declared under in index.css. */
export const MISANS_UI_FONT_FAMILY = 'MiSans UI';

/** The system choice: the stack index.css starts with, kept in one place. */
export const SYSTEM_UI_FONT_STACK = '\'Inter\', "Segoe UI", system-ui, var(--font-cjk-sans), sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

// After the chosen family: the CJK stack index.css declares, then the emoji fonts. Segoe UI comes
// before it for Vietnamese, whose combining letters the CJK fonts on Windows lack (see the note on
// :root:lang(vi) in index.css). A glyph the chosen font does not have falls through this list.
const FALLBACK_TAIL = '"Segoe UI", var(--font-cjk-sans), sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

const quoteFontFamily = (family: string) => `"${family.replace(/["\\]/g, '\\$&')}"`;

/** The CSS font-family value for a set of settings. */
export const resolveUiFontStack = (settings: Pick<UiFontSettingsState, 'uiFontMode' | 'uiFontCustomFont'>): string => {
    if (settings.uiFontMode === 'custom' && settings.uiFontCustomFont) {
        return `${quoteFontFamily(settings.uiFontCustomFont.family)}, ${FALLBACK_TAIL}`;
    }

    if (settings.uiFontMode === 'system') {
        return SYSTEM_UI_FONT_STACK;
    }

    return `${quoteFontFamily(MISANS_UI_FONT_FAMILY)}, ${FALLBACK_TAIL}`;
};

/** Writes the current settings onto <html>. Safe to call in any window, as often as needed. */
export const applyUiFont = (settings: Pick<UiFontSettingsState, 'uiFontMode' | 'uiFontCustomFont'> = useUiFontSettingsStore.getState()) => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.style.setProperty('--font-ui', resolveUiFontStack(settings));
};

/**
 * Called once per window before the first render: applies the saved choice and keeps it applied
 * when the settings change, here or in another window.
 */
export const installUiFont = () => {
    if (typeof window === 'undefined') {
        return;
    }

    applyUiFont();
    useUiFontSettingsStore.subscribe(() => applyUiFont());
    // The settings are shared by every window of the app; a change made elsewhere reaches this one
    // as a storage event. Re-read the keys first: the store here still holds the old choice.
    window.addEventListener('storage', (event) => {
        if (event.key !== null && event.key !== UI_FONT_MODE_STORAGE_KEY && event.key !== UI_FONT_CUSTOM_STORAGE_KEY) {
            return;
        }
        useUiFontSettingsStore.getState().syncUiFontFromStorage();
    });
};
