import { describe, it, expect } from 'vitest';
import {
  LOCALE_INFO,
  formatNumber,
  formatInteger,
  formatCurrency,
  formatPerQuintal,
  formatCompact,
  translateCrop,
  translateStage,
  translateSoil,
  translateIrrigation,
  translateObligation,
  translateDistress,
  translateKey,
  formatDaysAgo,
  formatFarmSummary,
  useNativeDigits,
} from './i18n';
import { buildVoiceText, isCropMarketReady } from './voice';

describe('number & currency formatting', () => {
  it('formats integers with Indian grouping using Latin digits', () => {
    expect(formatInteger(1234567, 'english', false)).toBe('12,34,567');
  });

  it('formats decimals with Indian grouping using Latin digits', () => {
    expect(formatNumber(1234.5, 'english', false)).toBe('1,234.5');
  });

  it('renders native Devanagari digits for Hindi', () => {
    expect(formatInteger(5, 'hindi', true)).toBe('५');
    expect(formatInteger(1234567, 'hindi', true)).toBe('१२,३४,५६७');
  });

  it('renders native Bengali digits', () => {
    expect(formatNumber(25, 'bengali', true)).toBe('২৫');
  });

  it('renders native Odia digits', () => {
    expect(formatNumber(30, 'odia', true)).toBe('୩୦');
  });

  it('formats currency with rupee symbol', () => {
    expect(formatCurrency(2290, 'english', false)).toBe('₹2,290');
    expect(formatCurrency(2290, 'hindi', true)).toBe('₹२,२९०');
  });

  it('formats per-quintal price', () => {
    expect(formatPerQuintal(2290, 'english', false)).toBe('₹2,290/q');
  });

  it('formats compact lakh and crore amounts', () => {
    expect(formatCompact(1200000, 'english', false)).toBe('12L');
    expect(formatCompact(100000000, 'hindi', false)).toBe('10करोड़');
  });
});

describe('domain term translation', () => {
  it('translates crop codes semantically', () => {
    expect(translateCrop('hindi', 'tomato')).toBe('टमाटर');
    expect(translateCrop('bengali', 'wheat')).toBe('গম');
  });

  it('falls back to the slug for unknown crops', () => {
    expect(translateCrop('hindi', 'unknowncrop')).toBe('unknowncrop');
  });

  it('translates growth stages with case-insensitive matching', () => {
    expect(translateStage('marathi', 'Fruit Development')).toBe('फळधारणा');
    expect(translateStage('hindi', 'harvest')).toBe('कटाई');
  });

  it('translates soil and irrigation options', () => {
    expect(translateSoil('hindi', 'loam')).toBe('दोमट');
    expect(translateIrrigation('hindi', 'drip')).toBe('ड्रिप');
  });

  it('translates obligation types and distress levels', () => {
    expect(translateObligation('hindi', 'loan')).toBe('बैंक फसल ऋण (KCC)');
    expect(translateDistress('hindi', 'High')).toBe('उच्च जोखिम');
  });
});

describe('UI key translation', () => {
  it('returns translated UI strings', () => {
    expect(translateKey('hindi', 'navHome')).toBe('होम');
    expect(translateKey('english', 'navHome')).toBe('Home');
  });
});

describe('composed human strings', () => {
  it('formats days ago with pluralization', () => {
    expect(formatDaysAgo(1, 'english', false)).toBe('1 day ago');
    expect(formatDaysAgo(3, 'english', false)).toBe('3 days ago');
    expect(formatDaysAgo(3, 'hindi', false)).toBe('3 दिन पहले');
  });

  it('formats farm summary counts', () => {
    expect(formatFarmSummary(2, 3, 'english', false)).toBe('2 crops across 3 farms');
  });
});

describe('sell-ready crop filtering', () => {
  it('keeps only crops that are near harvest or ready to sell', () => {
    expect(isCropMarketReady('Vegetative')).toBe(false);
    expect(isCropMarketReady('Flowering')).toBe(false);
    expect(isCropMarketReady('Fruit Development')).toBe(false);
    expect(isCropMarketReady('Maturity')).toBe(true);
    expect(isCropMarketReady('Bulb Development & Maturity')).toBe(true);
  });

  it('uses concise natural market speech without numbered list spam', () => {
    const text = buildVoiceText({
      activeTab: 'market',
      advisories: [],
      distressData: { score: 30 },
      mandiPrices: [],
      schemes: [],
      selectedCrop: { crop_type: 'tomato' },
      language: 'english',
      marketSuggestions: [
        { crop: { crop_type: 'tomato', id: 1, stage: 'Maturity' }, farm: { name: 'North Farm' }, mandi: { mandi_name: 'Lasalgaon APMC', net_return: 2450 } },
        { crop: { crop_type: 'onion', id: 2, stage: 'Vegetative Growth' }, farm: { name: 'Main Farm' }, mandi: { mandi_name: 'Nashik APMC', net_return: 2100 } }
      ]
    });

    expect(text).toContain('Best selling options now');
    expect(text).toContain('Lasalgaon APMC');
    expect(text).not.toContain('Recommendation 1');
    expect(text).not.toContain('Recommendation 2');
  });

  it('reads the actual home summary wording instead of a generic script', () => {
    const text = buildVoiceText({
      activeTab: 'home',
      advisories: [{ id: 1, recommendation: 'Check soil moisture' }, { id: 2, recommendation: 'Inspect pest pressure' }],
      distressData: { score: 30 },
      mandiPrices: [{ modal_price: 2200, mandi_name: 'Nashik APMC' }],
      schemes: [],
      selectedCrop: { crop_type: 'tomato' },
      language: 'english',
      weatherData: { observation: { rainfall: 5 } },
      farms: [{ district: 'Nashik' }],
      allCrops: [],
      cashFlow: [],
      marketSuggestions: []
    });

    expect(text).toContain('Overall');
    expect(text).toContain('Mandi rate for Tomato');
    expect(text).toContain('pending action items');
    expect(text).not.toContain('Top action today');
  });
});

describe('locale metadata', () => {
  it('exposes BCP-47 tags and native digit capability', () => {
    expect(LOCALE_INFO.english.tag).toBe('en-IN');
    expect(useNativeDigits('hindi')).toBe(true);
    expect(useNativeDigits('english')).toBe(false);
  });
});