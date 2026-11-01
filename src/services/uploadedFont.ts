import i18n from '../i18n/config';
import { getFromCache, removeFromCache, saveToCache } from './db';

// src/services/uploadedFont.ts
// The machinery behind the fonts a user uploads: validate the file, keep one of them in IndexedDB
// and register it with `document.fonts`. The features that offer an uploaded font (the lyrics
// fallback font, the interface font) each create one store here, so neither copy of the IndexedDB
// and FontFace handling can drift from the other.

const SUPPORTED_FONT_EXTENSIONS = ['.woff2', '.woff', '.ttf', '.otf'];
const SUPPORTED_FONT_MIME_TYPES = new Set([
    'font/woff2',
    'font/woff',
    'font/ttf',
    'font/otf',
    'application/font-woff',
    'application/font-woff2',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/vnd.ms-opentype',
]);

/** One uploaded font file as it is kept in IndexedDB. */
export interface StoredUploadedFont {
    id: string;
    name: string;
    mimeType: string;
    blob: Blob;
    family: string;
    label: string;
    createdAt: number;
}

/** The registered font as the settings that chose it remember it. */
export interface UploadedFontMeta {
    source: 'uploaded';
    family: string;
    label: string;
    fontId: string;
}

export interface UploadedFontStoreOptions {
    /** The IndexedDB cache key this feature keeps its one uploaded font under. */
    cacheKey: string;
    /** The family names start with this, so the features' uploaded fonts cannot collide. */
    familyPrefix: string;
    maxSizeBytes: number;
}

const sanitizeUploadedFontId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

const stripFontExtension = (name: string, fallbackLabel: string) => {
    const trimmed = name.trim();
    const matchedExtension = SUPPORTED_FONT_EXTENSIONS.find(extension => trimmed.toLowerCase().endsWith(extension));
    if (!matchedExtension) {
        return trimmed || fallbackLabel;
    }

    return trimmed.slice(0, -matchedExtension.length) || fallbackLabel;
};

const getFontFaceConstructor = () => (globalThis as typeof globalThis & {
    FontFace?: new (family: string, source: BufferSource | string) => FontFace;
}).FontFace;

const getDocumentFonts = () => {
    if (typeof document === 'undefined' || !document.fonts?.add) {
        return null;
    }

    return document.fonts;
};

export const createUploadedFontStore = ({ cacheKey, familyPrefix, maxSizeBytes }: UploadedFontStoreOptions) => {
    const registeredFontIds = new Set<string>();

    const buildFamily = (id: string) => `${familyPrefix}_${sanitizeUploadedFontId(id)}`;

    const buildId = (file: File) => {
        const baseName = stripFontExtension(file.name, 'font').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${Date.now()}_${baseName || 'font'}`;
    };

    const isSupported = (file: File) => {
        const lowerName = file.name.toLowerCase();
        const hasSupportedExtension = SUPPORTED_FONT_EXTENSIONS.some(extension => lowerName.endsWith(extension));

        return hasSupportedExtension || SUPPORTED_FONT_MIME_TYPES.has(file.type);
    };

    const validate = (file: File): string | null => {
        if (!isSupported(file)) {
            return i18n.t('ui.unsupportedFontFormat');
        }

        if (file.size > maxSizeBytes) {
            return `Font file must not exceed ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`;
        }

        return null;
    };

    const build = (file: File): StoredUploadedFont => {
        const id = buildId(file);

        return {
            id,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            blob: file,
            family: buildFamily(id),
            label: stripFontExtension(file.name, 'Uploaded Font'),
            createdAt: Date.now(),
        };
    };

    const register = async (storedFont: StoredUploadedFont): Promise<UploadedFontMeta> => {
        if (registeredFontIds.has(storedFont.id)) {
            return {
                source: 'uploaded',
                family: storedFont.family,
                label: storedFont.label,
                fontId: storedFont.id,
            };
        }

        const FontFaceConstructor = getFontFaceConstructor();
        const documentFonts = getDocumentFonts();

        if (!FontFaceConstructor || !documentFonts) {
            throw new Error('This browser does not support loading uploaded fonts.');
        }

        const fontData = await storedFont.blob.arrayBuffer();
        const fontFace = new FontFaceConstructor(storedFont.family, fontData);
        await fontFace.load();
        documentFonts.add(fontFace);
        registeredFontIds.add(storedFont.id);

        return {
            source: 'uploaded',
            family: storedFont.family,
            label: storedFont.label,
            fontId: storedFont.id,
        };
    };

    const uploadAndRegister = async (file: File): Promise<{ meta: UploadedFontMeta; storedFont: StoredUploadedFont; }> => {
        const validationError = validate(file);
        if (validationError) {
            throw new Error(validationError);
        }

        const storedFont = build(file);
        const meta = await register(storedFont);
        await saveToCache(cacheKey, storedFont);

        return { meta, storedFont };
    };

    const getStored = async (): Promise<StoredUploadedFont | null> => {
        const stored = await getFromCache<StoredUploadedFont>(cacheKey);

        if (!stored?.id || !stored.family || !stored.label || !(stored.blob instanceof Blob)) {
            return null;
        }

        return stored;
    };

    const restore = async (fontId: string): Promise<UploadedFontMeta | null> => {
        const storedFont = await getStored();
        if (!storedFont || storedFont.id !== fontId) {
            return null;
        }

        return register(storedFont);
    };

    const clear = async (): Promise<void> => {
        registeredFontIds.clear();
        await removeFromCache(cacheKey);
    };

    return {
        cacheKey,
        familyPrefix,
        maxSizeBytes,
        isSupported,
        validate,
        build,
        register,
        uploadAndRegister,
        getStored,
        restore,
        clear,
    };
};

export type UploadedFontStore = ReturnType<typeof createUploadedFontStore>;
