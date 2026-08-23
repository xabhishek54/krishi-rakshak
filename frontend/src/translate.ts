/**
 * Translation cache using MyMemory free API.
 * Stores all translations in localStorage to avoid repeated API calls.
 * Cache key format: `kr_trans_${lang}_${text_hash}`
 */

const CACHE_PREFIX = 'kr_trans_';
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

// Language codes for MyMemory API
const LANG_CODES: Record<string, string> = {
  english: 'en',
  hindi: 'hi',
  marathi: 'mr',
  bengali: 'bn',
  odia: 'or',
};

function hashText(text: string): string {
  // Simple djb2 hash for cache keys
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) + text.charCodeAt(i);
    h = h & h; // Convert to 32bit integer
  }
  return Math.abs(h).toString(36);
}

function getCacheKey(lang: string, text: string): string {
  return `${CACHE_PREFIX}${lang}_${hashText(text)}`;
}

export function getCachedTranslation(lang: string, text: string): string | null {
  if (lang === 'english') return text;
  try {
    return localStorage.getItem(getCacheKey(lang, text));
  } catch {
    return null;
  }
}

function setCachedTranslation(lang: string, text: string, translated: string): void {
  try {
    localStorage.setItem(getCacheKey(lang, text), translated);
  } catch {
    // Ignore storage quota errors
  }
}

export async function translateText(text: string, lang: string): Promise<string> {
  if (lang === 'english' || !text.trim()) return text;

  // Check cache first
  const cached = getCachedTranslation(lang, text);
  if (cached) return cached;

  const langCode = LANG_CODES[lang] || 'hi';

  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error('Translation API failed');
    const data = await resp.json();
    const translated = data?.responseData?.translatedText;
    if (translated && translated !== text) {
      setCachedTranslation(lang, text, translated);
      return translated;
    }
  } catch {
    // Silently fallback to original text
  }

  return text;
}

/**
 * Batch translate multiple strings. Returns an array in the same order.
 * Already-cached items do NOT count toward API quota.
 */
export async function translateBatch(texts: string[], lang: string): Promise<string[]> {
  if (lang === 'english') return texts;
  return Promise.all(texts.map(t => translateText(t, lang)));
}
