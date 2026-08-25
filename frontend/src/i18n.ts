import { translations, type LanguageType, type Translations } from './translations';

/**
 * Comprehensive regional localization + translation core.
 *
 * Beyond plain UI-string translation (handled by `translations.ts`), this
 * module brings:
 *   - Locale-aware numerical & currency formatting that preserves Indian
 *     grouping (lakh/crore) and can render digits in the active regional
 *     script (Devanagari, Bengali, Odia, ...).
 *   - A domain term catalog (crops, growth stages, soil types, irrigation
 *     methods, obligations, distress levels) so domain language is translated
 *     semantically rather than left untranslated.
 *   - Helpers to compose human-readable counts and durations that agree with
 *     the active language's grammar.
 */

export type LocaleId = LanguageType;

/** Locale metadata used for Intl formatting and native script rendering. */
export interface LocaleInfo {
  /** BCP-47 locale tag for Intl APIs. */
  tag: string;
  /** Indian vs western grouping is identical here, but kept explicit. */
  currency: string;
  /** Native-script numeric glyphs indexed 0..9. Empty means Latin digits. */
  digits: string[];
  /** Display name of the language in its own script. */
  localName: string;
}

const EN = '0123456789';
const DE = '०१२३४५६७८९';
const BN = '০১২৩৪৫৬৭৮৯';
const OR = '୦୧୨୩୪୫୬୭୮୯';

/** Full locale descriptor for every supported language. */
export const LOCALE_INFO: Record<LocaleId, LocaleInfo> = {
  english: { tag: 'en-IN', currency: 'INR', digits: [...EN], localName: 'English' },
  hindi:   { tag: 'hi-IN', currency: 'INR', digits: [...DE], localName: 'हिन्दी' },
  marathi: { tag: 'mr-IN', currency: 'INR', digits: [...DE], localName: 'मराठी' },
  bengali: { tag: 'bn-IN', currency: 'INR', digits: [...BN], localName: 'বাংলা' },
  odia:    { tag: 'or-IN', currency: 'INR', digits: [...OR], localName: 'ଓଡ଼ିଆ' },
};

/** Map each digit to its native-roman equivalent for composing grouped strings. */
function toNativeDigits(locale: LocaleInfo, latin: string): string {
  if (locale.digits.length < 10) return latin;
  let out = '';
  for (const ch of latin) {
    const idx = ch.charCodeAt(0) - 48;
    out += idx >= 0 && idx < 10 ? locale.digits[idx] : ch;
  }
  return out;
}

function isIndianDigitScript(locale: LocaleInfo): boolean {
  return locale.digits.length === 10 && locale.digits[0] !== '0';
}

/**
 * Format a number using Indian grouping (12,34,567) in the active locale's
 * script. When `nativeDigits` is false (default), a Latin-digit Indian format
 * is produced (e.g. "12,34,567").
 */
export function formatNumber(value: number, lang: LocaleId, nativeDigits = false): string {
  const info = LOCALE_INFO[lang] || LOCALE_INFO.english;
  const formatter = new Intl.NumberFormat(info.tag, { maximumFractionDigits: 2 });
  const grouped = formatter.format(Number.isFinite(value) ? value : 0);
  if (nativeDigits && isIndianDigitScript(info)) return toNativeDigits(info, grouped);
  return grouped;
}

/**
 * Format a number as a whole integer (no fraction) respecting Indian grouping,
 * e.g. 1234567 -> "12,34,567".
 */
export function formatInteger(value: number, lang: LocaleId, nativeDigits = false): string {
  const info = LOCALE_INFO[lang] || LOCALE_INFO.english;
  const formatter = new Intl.NumberFormat(info.tag, { maximumFractionDigits: 0 });
  const grouped = formatter.format(Number.isFinite(value) ? Math.round(value) : 0);
  if (nativeDigits && isIndianDigitScript(info)) return toNativeDigits(info, grouped);
  return grouped;
}

/** Compact human-readable suffix for Indian grouping in the active language. */
const COMPACT: Record<LocaleId, { lakh: string; crore: string }> = {
  english: { lakh: 'L', crore: 'Cr' },
  hindi:   { lakh: 'लाख', crore: 'करोड़' },
  marathi: { lakh: 'लाख', crore: 'कोटी' },
  bengali: { lakh: 'লাখ', crore: 'কোটি' },
  odia:    { lakh: 'ଲକ୍ଷ', crore: 'କୋଟି' },
};

/** Format a whole number compactly (e.g. 12,00,000 -> "12L"). */
export function formatCompact(value: number, lang: LocaleId, nativeDigits = false): string {
  const info = LOCALE_INFO[lang] || LOCALE_INFO.english;
  const abs = Math.abs(value);
  let suffix = '';
  let scaled = value;
  if (abs >= 1e7) {
    scaled = value / 1e7;
    suffix = COMPACT[lang].crore;
  } else if (abs >= 1e5) {
    scaled = value / 1e5;
    suffix = COMPACT[lang].lakh;
  }
  const body = new Intl.NumberFormat(info.tag, { maximumFractionDigits: scaled % 1 !== 0 ? 1 : 0 }).format(scaled);
  const rendered = nativeDigits && isIndianDigitScript(info) ? toNativeDigits(info, body) : body;
  return `${rendered}${suffix}`;
}

/**
 * Format a monetary amount using Indian grouping with a currency label in the
 * active language's script. `mode` controls whether the amount appears in
 * native digits (e.g. Devanagari) or Latin digits.
 */
export function formatCurrency(value: number, lang: LocaleId, nativeDigits = false): string {
  const grouped = formatNumber(value, lang, nativeDigits);
  return `₹${grouped}`;
}

/**
 * Render a per-quintal price commonly used across market screens, e.g.
 * "₹2,290/q".
 */
export function formatPerQuintal(value: number, lang: LocaleId, nativeDigits = false): string {
  return `${formatCurrency(value, lang, nativeDigits)}/q`;
}

/** Translate a UI string key for the active language. */
export function translateKey(lang: LocaleId, key: keyof Translations): string {
  const table: Translations = translations[lang] || translations.english;
  return table[key] ?? key;
}

/** Shortcut bound to a language; pass a key to receive the translation. */
export function makeT(lang: LocaleId): (key: keyof Translations) => string {
  return (key) => translateKey(lang, key);
}

/**
 * Domain term catalog. Keys are stable English slugs (crop codes, stage names
 * as emitted by the backend, soil/irrigation option values, obligation types).
 * Values list the term in each language. `english` is always present so any new
 * language degrades gracefully to English.
 */
export interface DomainTerms {
  crops: Record<string, Record<LocaleId, string>>;
  stages: Record<string, Record<LocaleId, string>>;
  soils: Record<string, Record<LocaleId, string>>;
  irrigation: Record<string, Record<LocaleId, string>>;
  obligations: Record<string, Record<LocaleId, string>>;
  distress: Record<string, Record<LocaleId, string>>;
}

export const DOMAIN_TERMS: DomainTerms = {
  crops: {
    tomato:    { english: 'Tomato',    hindi: 'टमाटर',      marathi: 'टोमॅटो',      bengali: 'টমেটো',      odia: 'ଟମାଟୋ' },
    wheat:     { english: 'Wheat',     hindi: 'गेहूँ',        marathi: 'गहू',          bengali: 'গম',           odia: 'ଗହମ' },
    rice:      { english: 'Rice',      hindi: 'चावल / धान',   marathi: 'तांदूळ / भात', bengali: 'ধান / চাল', odia: 'ଚାଉଳ / ଧାନ' },
    onion:     { english: 'Onion',     hindi: 'प्याज़',       marathi: 'कांदा',        bengali: 'পেঁয়াজ',      odia: 'ପିଆଜ' },
    potato:    { english: 'Potato',    hindi: 'आलू',         marathi: 'बटाटा',        bengali: 'আলু',          odia: 'ଆଳୁ' },
    maize:     { english: 'Maize',     hindi: 'मक्का',        marathi: 'मका',          bengali: 'ভুট্টা',        odia: 'ମକା' },
    sugarcane: { english: 'Sugarcane', hindi: 'गन्ना',        marathi: 'ऊस',           bengali: 'আখ',           odia: 'ଆଖୁଗଛ' },
    cotton:    { english: 'Cotton',    hindi: 'कपास',         marathi: 'कापूस',        bengali: 'তুলা',          odia: 'କପା' },
    soybean:   { english: 'Soybean',   hindi: 'सोयाबीन',      marathi: 'सोयाबीन',      bengali: 'সয়াবিন',       odia: 'ସୋୟାବିନ' },
    groundnut: { english: 'Groundnut', hindi: 'मूंगफली',      marathi: 'शेंगदाणा',     bengali: 'চিনাবাদাম',     odia: 'ବାଦାମ' },
    chilli:    { english: 'Chilli',    hindi: 'मिर्च',        marathi: 'मिरची',        bengali: 'লঙ্কা',         odia: 'ଲଙ୍କା' },
    grapes:    { english: 'Grapes',    hindi: 'अंगूर',        marathi: 'द्राक्षे',      bengali: 'আঙুর',         odia: 'ଅଙ୍ଗୁର' },
    banana:    { english: 'Banana',    hindi: 'केला',         marathi: 'केळी',         bengali: 'কলা',           odia: 'କଦଳୀ' },
    mango:     { english: 'Mango',     hindi: 'आम',           marathi: 'आंबा',         bengali: 'আম',            odia: 'ଆମ୍ବ' },
    mustard:   { english: 'Mustard',   hindi: 'सरसों',        marathi: 'मोहरी',        bengali: 'সরিষা',         odia: 'ସୋରିଷ' },
  },
  stages: {
    'vegetative':      { english: 'Vegetative',     hindi: 'वानस्पतिक',     marathi: 'वानस्पतिक',     bengali: 'খনালেমাল',      odia: 'ବୃକ୍ଷ ଅବସ୍ଥା' },
    'germination':     { english: 'Germination',    hindi: 'अंकुरण',         marathi: 'अंकुरण',         bengali: 'অঙ্কুরোদগম',    odia: 'ଅଙ୍କୁରୋଦ୍ଗମ' },
    'flowering':       { english: 'Flowering',      hindi: 'पुष्पन',         marathi: 'फुलोरा',         bengali: 'ফুল ধরা',       odia: 'ଫୁଲ ଆସିବା' },
    'fruit development': { english: 'Fruit Development', hindi: 'फल विकास',   marathi: 'फळधारणा',       bengali: 'ফল বিকাশ',      odia: 'ଫଳ ବୃଦ୍ଧି' },
    'maturity':        { english: 'Maturity',       hindi: 'परिपक्वता',      marathi: 'परिपक्वता',     bengali: 'পরিপক্বতা',     odia: 'ପରିପକ୍ୱତା' },
    'harvest':         { english: 'Harvest',        hindi: 'कटाई',           marathi: 'कापणी',         bengali: 'ফসল চাষ',      odia: 'ଅମଳ' },
    'growing':         { english: 'Growing',        hindi: 'बढ़ती',          marathi: 'वाढ',           bengali: 'বৃদ্ধি',       odia: 'ବୃଦ୍ଧି' },
  },
  soils: {
    loam:   { english: 'Loam',        hindi: 'दोमट',            marathi: 'गाळ',       bengali: 'দোআঁশ',         odia: 'ଦୋମାଟ' },
    clay:   { english: 'Clay',        hindi: 'चिकनी मिट्टी',    marathi: 'चिकणमाती',  bengali: 'পলিমাটি',        odia: 'କାଦୁଅ' },
    sandy:  { english: 'Sandy',       hindi: 'रेतीली',          marathi: 'वालुकामय',  bengali: 'বালুকাময়',      odia: 'ବାଲିମାଟି' },
    black:  { english: 'Black Cotton', hindi: 'काली कपास',      marathi: 'काळी माती',  bengali: 'কালো মাটি',      odia: 'କଳା ମାଟି' },
    red:    { english: 'Red Laterite', hindi: 'लाल लैटराइट',    marathi: 'लाल माती',   bengali: 'লাল মাটি',       odia: 'ନାଲି ମାଟି' },
    alluvial: { english: 'Alluvial',  hindi: 'जलोढ़',           marathi: 'गाळयुक्त',   bengali: 'পলিমাটি',        odia: 'ପାଳି' },
  },
  irrigation: {
    flood:     { english: 'Flood',     hindi: 'बाढ़ सिंचाई',  marathi: 'पुर सिंचन',   bengali: 'বন্যা সেচ',       odia: 'ବନ୍ୟା ସିଞ୍ଚନ' },
    drip:      { english: 'Drip',      hindi: 'ड्रिप',        marathi: 'ठिबक',        bengali: 'ড্রিপ',          odia: 'ଡ୍ରିପ' },
    sprinkler: { english: 'Sprinkler', hindi: 'फवारा',        marathi: 'कोळशाची',     bengali: 'স্প্রিংকলার',    odia: 'ସ୍ପ୍ରିଙ୍କଲେଡ' },
    none:      { english: 'Rain-fed',  hindi: 'वर्षा आधारित',  marathi: 'पावसावर',     bengali: 'বৃষ্টিনির্ভর',   odia: 'ବର୍ଷା' },
    rainfed:   { english: 'Rainfed',   hindi: 'बिना सिंचाई',   marathi: 'पावसावर आधारित', bengali: 'বৃষ্টিনির্ভর', odia: 'ବର୍ଷା ଭିତ୍ତିକ' },
    well:      { english: 'Well / Borewell', hindi: 'कुआँ / बोरवेल', marathi: 'विहीर / बोरवेल', bengali: 'কূপ/বোরওয়েল', odia: 'କୂଅ/ବୋରୱେଲ' },
  },
  obligations: {
    loan:    { english: 'Bank Crop Loan (KCC)', hindi: 'बैंक फसल ऋण (KCC)', marathi: 'बँक पीक कर्ज (KCC)', bengali: 'ব্যাংক ফসল ঋণ (KCC)', odia: 'ବ୍ୟାଙ୍କ ଫସଲ ଋଣ (KCC)' },
    lease:   { english: 'Land Lease Rent',   hindi: 'भूमि पट्टा किराया',   marathi: 'जमीन भाडे',    bengali: 'জমি লিজ ভাড়া',  odia: 'ଜମି ଲିଜ୍ ଭଡ଼ା' },
    inputs:  { english: 'Fertilizer/Seed Credit', hindi: 'खाद/बीज ऋण', marathi: 'खते/बियाणे कर्ज', bengali: 'সার/বীজ ঋণ', odia: 'ସାର/ବୀଜ ଋଣ' },
    other:   { english: 'Other Debt',        hindi: 'अन्य ऋण',           marathi: 'इतर कर्ज',      bengali: 'অন্যান্য ঋণ',    odia: 'ଅନ୍ୟ ଋଣ' },
  },
  distress: {
    stable: { english: 'Stable',   hindi: 'स्थिर',   marathi: 'स्थिर',   bengali: 'স্থিতিশীল', odia: 'ସ୍ଥିର' },
    watch:  { english: 'Watch',    hindi: 'सतर्क',   marathi: 'सावध',    bengali: 'সতর্ক',     odia: 'ସତର୍କ' },
    elevated: { english: 'Elevated', hindi: 'उन्नत', marathi: 'उन्नत',    bengali: 'উন্নত',     odia: 'ଉଚ୍ଚ' },
    high:   { english: 'High Risk', hindi: 'उच्च जोखिम', marathi: 'उच्च जोखीम', bengali: 'উচ্চ ঝুঁকি', odia: 'ଅଧିକ ଆଶଙ୍କା' },
    critical: { english: 'Critical', hindi: 'गंभीर', marathi: 'गंभीर',    bengali: 'গুরুতর',     odia: 'ଗୁରୁତର' },
  },
};

/** Resolve a term from a catalog by its English slug, falling back to input. */
export function translateTerm(
  catalog: Record<string, Record<LocaleId, string>>,
  lang: LocaleId,
  slug: string | undefined | null,
): string {
  if (!slug) return '';
  const key = String(slug).toLowerCase().trim();
  const entry = catalog[key];
  if (!entry) return String(slug);
  return entry[lang] ?? entry.english ?? key;
}

/** Translate a crop code (e.g. "tomato") to the active language. */
export function translateCrop(lang: LocaleId, crop: string): string {
  return translateTerm(DOMAIN_TERMS.crops, lang, crop);
}

/** Translate a growth stage (backend stage string) to the active language. */
export function translateStage(lang: LocaleId, stage: string | undefined | null): string {
  return translateTerm(DOMAIN_TERMS.stages, lang, stage);
}

/** Translate a soil type option value. */
export function translateSoil(lang: LocaleId, soil: string): string {
  return translateTerm(DOMAIN_TERMS.soils, lang, soil);
}

/** Translate an irrigation type option value. */
export function translateIrrigation(lang: LocaleId, irrigation: string): string {
  return translateTerm(DOMAIN_TERMS.irrigation, lang, irrigation);
}

/** Translate an obligation type option value. */
export function translateObligation(lang: LocaleId, obligation: string): string {
  return translateTerm(DOMAIN_TERMS.obligations, lang, obligation);
}

/** Translate a distress level label. */
export function translateDistress(lang: LocaleId, level: string): string {
  return translateTerm(DOMAIN_TERMS.distress, lang, level);
}

/** Capitalize the first character of a string (used for display-only text). */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format "N days ago" in the active language, handling singular/plural and
 * producing grammatically natural output in the script.
 */
export function formatDaysAgo(days: number, lang: LocaleId, nativeDigits = false): string {
  const n = formatInteger(days, lang, nativeDigits);
  switch (lang) {
    case 'hindi':
      return `${n} दिन पहले`;
    case 'marathi':
      return `${n} दिवसांपूर्वी`;
    case 'bengali':
      return `${n} দিন আগে`;
    case 'odia':
      return `${n} ଦିନ ପୂର୍ବରୁ`;
    default:
      return `${n} ${days === 1 ? 'day' : 'days'} ago`;
  }
}

/**
 * Compose a "N crops across M farms" summary with correct pluralization and
 * native digits where requested.
 */
export function formatFarmSummary(cropCount: number, farmCount: number, lang: LocaleId, nativeDigits = false): string {
  const crops = formatInteger(cropCount, lang, nativeDigits);
  const farms = formatInteger(farmCount, lang, nativeDigits);
  switch (lang) {
    case 'hindi':
      return `${crops} फसल${cropCount > 1 ? 'ें' : ''} में ${farms} खेत`;
    case 'marathi':
      return `${crops} पिके, ${farms} शेत`;
    case 'bengali':
      return `${crops}টি ফসল, ${farms} খামার`;
    case 'odia':
      return `${crops} ଫସଲ, ${farms} ଖାମାର`;
    default:
      return `${crops} crop${cropCount > 1 ? 's' : ''} across ${farms} farm${farmCount > 1 ? 's' : ''}`;
  }
}

/** Whether the active script should render native digits (Devanagari etc.). */
export function useNativeDigits(lang: LocaleId): boolean {
  return isIndianDigitScript(LOCALE_INFO[lang] || LOCALE_INFO.english);
}