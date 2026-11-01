import type { StoredCustomLyricsFont } from '../types';
import { createUploadedFontStore, type StoredUploadedFont, type UploadedFontMeta } from './uploadedFont';

// src/services/customLyricsFont.ts
// Persists and registers the mobile uploaded lyrics font fallback. The IndexedDB and FontFace
// handling is shared with the interface font in uploadedFont.ts.
const UPLOADED_LYRICS_FONT_KEY = 'lyrics_uploaded_font';
const MAX_UPLOADED_LYRICS_FONT_SIZE = 50 * 1024 * 1024;
const uploadedLyricsFont = createUploadedFontStore({
    cacheKey: UPLOADED_LYRICS_FONT_KEY,
    familyPrefix: 'FoliaUploadedLyricsFont',
    maxSizeBytes: MAX_UPLOADED_LYRICS_FONT_SIZE,
});

export type StoredUploadedLyricsFont = StoredUploadedFont;

export interface UploadLyricsFontResult {
    meta: StoredCustomLyricsFont;
    storedFont: StoredUploadedLyricsFont;
}

export const isSupportedLyricsFontFile = (file: File) => uploadedLyricsFont.isSupported(file);

export const validateUploadedLyricsFontFile = (file: File) => uploadedLyricsFont.validate(file);

export const buildStoredUploadedLyricsFont = (file: File): StoredUploadedLyricsFont => uploadedLyricsFont.build(file);

export const registerUploadedLyricsFont = async (storedFont: StoredUploadedLyricsFont): Promise<StoredCustomLyricsFont> => (
    uploadedLyricsFont.register(storedFont) as Promise<StoredCustomLyricsFont>
);

export const uploadAndRegisterLyricsFont = async (file: File): Promise<UploadLyricsFontResult> => {
    const { meta, storedFont } = await uploadedLyricsFont.uploadAndRegister(file);
    return { meta: meta as StoredCustomLyricsFont, storedFont };
};

export const getStoredUploadedLyricsFont = async (): Promise<StoredUploadedLyricsFont | null> => uploadedLyricsFont.getStored();

export const restoreUploadedLyricsFont = async (fontId: string): Promise<StoredCustomLyricsFont | null> => {
    const restored: UploadedFontMeta | null = await uploadedLyricsFont.restore(fontId);
    return restored;
};

export const clearUploadedLyricsFont = async (): Promise<void> => uploadedLyricsFont.clear();

export { MAX_UPLOADED_LYRICS_FONT_SIZE, UPLOADED_LYRICS_FONT_KEY };
