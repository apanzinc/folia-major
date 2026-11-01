import type { StoredCustomUiFont } from '../types';
import { createUploadedFontStore } from './uploadedFont';

// src/services/customUiFont.ts
// Persists and registers the interface font the user uploads in settings (the bundled MiSans
// variable font needs none of this). Shares the IndexedDB and FontFace handling with the lyrics
// fallback font in uploadedFont.ts.
const UPLOADED_UI_FONT_KEY = 'ui_uploaded_font';
const MAX_UPLOADED_UI_FONT_SIZE = 50 * 1024 * 1024;
const uploadedUiFont = createUploadedFontStore({
    cacheKey: UPLOADED_UI_FONT_KEY,
    familyPrefix: 'FoliaUploadedUiFont',
    maxSizeBytes: MAX_UPLOADED_UI_FONT_SIZE,
});

export const isSupportedUiFontFile = (file: File) => uploadedUiFont.isSupported(file);

export const validateUploadedUiFontFile = (file: File) => uploadedUiFont.validate(file);

export const uploadAndRegisterUiFont = async (file: File): Promise<StoredCustomUiFont> => {
    const { meta } = await uploadedUiFont.uploadAndRegister(file);
    return meta as StoredCustomUiFont;
};

export const restoreUploadedUiFont = async (fontId: string): Promise<StoredCustomUiFont | null> => {
    const restored = await uploadedUiFont.restore(fontId);
    return restored as StoredCustomUiFont | null;
};

export const clearUploadedUiFont = async (): Promise<void> => uploadedUiFont.clear();

export { MAX_UPLOADED_UI_FONT_SIZE, UPLOADED_UI_FONT_KEY };
