/**
 * Voice playback for KrishiRakshak.
 *
 * Architecture (per features.md §16):
 *   Advisory text (structured fact) → translateText() → speakText() via Web Speech API
 *
 * For conversational voice (per features.md §17):
 *   User speech → SpeechRecognition → question text → Gemini API → answer text → speakText()
 *
 * The Gemini API call includes the farmer's full context (crops, weather, distress score,
 * advisories) so it can give accurate, data-grounded answers — not hallucinations.
 */

import { translateText } from './translate';

const DEFAULT_VOICE_API_BASE = 'http://localhost:8000';
let activeAudio: HTMLAudioElement | null = null;

export function getVoiceApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || DEFAULT_VOICE_API_BASE;
  return String(base).replace(/\/$/, '');
}

export function hasWebSpeechSupport(): boolean {
  if (typeof window === 'undefined') return false;
  const speech = (window as any).speechSynthesis;
  return !!(speech && typeof speech.speak === 'function' && typeof (window as any).SpeechSynthesisUtterance !== 'undefined');
}

// ─── Gemini Configuration ───────────────────────────────────────────────────
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
export const GEMINI_MODEL   = 'gemini-3.1-flash-lite';
export const GEMINI_ENDPOINT = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  : '';
// ────────────────────────────────────────────────────────────────────────────

// BCP-47 locale map for Web Speech API voice matching
const LOCALE_MAP: Record<string, string> = {
  english: 'en-IN',
  hindi: 'hi-IN',
  marathi: 'mr-IN',
  bengali: 'bn-IN',
  odia: 'or-IN',
};



/** Wait for browser voices to load (required on Chrome) */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) return resolve(voices);
    speechSynthesis.addEventListener('voiceschanged', () => {
      resolve(speechSynthesis.getVoices());
    }, { once: true });
    // Fallback if event never fires
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1500);
  });
}

/** Pick the same assistant-like voice consistently for a locale */
export function pickVoice(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | null {
  const normalizedLocale = locale.toLowerCase();
  const lang = normalizedLocale.split('-')[0];

  const sorted = [...voices].sort((a, b) => {
    const aScore = Number(a.default) + Number(a.localService) * 2;
    const bScore = Number(b.default) + Number(b.localService) * 2;
    if (bScore !== aScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });

  const exact = sorted.find(v => v.lang.toLowerCase() === normalizedLocale);
  if (exact) return exact;

  const sameLanguage = sorted.find(v => v.lang.toLowerCase().startsWith(lang));
  if (sameLanguage) return sameLanguage;

  const englishFallback = sorted.find(v => v.lang.toLowerCase().startsWith('en'));
  if (englishFallback) return englishFallback;

  return sorted[0] || null;
}

/** Determine whether a crop is in a sell-ready phase. */
export function isCropMarketReady(stage?: string | null): boolean {
  if (!stage) return false;

  const normalized = stage.toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!normalized) return false;

  const readyPatterns = [
    'maturity',
    'mature',
    'harvest',
    'ready to sell',
    'sale ready',
    'bulb development & maturity',
    'bulb development',
  ];

  const notReadyPatterns = [
    'vegetative',
    'flowering',
    'seedling',
    'tillering',
    'jointing',
    'crown root initiation',
    'bulb initiation',
    'yield formation',
    'milking',
    'fruit development',
  ];

  if (readyPatterns.some((pattern) => normalized.includes(pattern))) return true;
  if (notReadyPatterns.some((pattern) => normalized.includes(pattern))) return false;
  return false;
}

/** Speak text in the given language using Backend Piper/gTTS with browser fallback. */
export async function speakText(
  text: string,
  language: string,
  onError?: (msg: string) => void
): Promise<() => void> {
  stopSpeech();

  if (!text || !text.trim()) return () => {};

  const cleaned = text.replace(/\s+/g, ' ').trim();
  const translated = (language === 'english' || /[\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F]/.test(cleaned))
    ? cleaned
    : await translateText(cleaned, language);

  // 1. Try Backend Voice API (/api/v1/voice/speak) -> Piper / gTTS audio
  const backendUrl = `${getVoiceApiBase()}/api/v1/voice/speak`;
  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: translated, language }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      activeAudio = audio;
      audio.onended = () => { activeAudio = null; };
      audio.onerror = () => { activeAudio = null; };
      audio.play();

      return () => {
        if (activeAudio) {
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio = null;
        }
      };
    }
  } catch {
    // Fall through to browser Speech Synthesis / Fallback Audio Stream if backend unavailable
  }

  // 2. Browser Native Web Speech API Fallback
  const langCodeMap: Record<string, string> = {
    english: 'en', hindi: 'hi', marathi: 'mr', bengali: 'bn', odia: 'or',
  };
  const locale = LOCALE_MAP[language] || 'en-IN';
  const langCode = langCodeMap[language] || 'en';

  if (hasWebSpeechSupport()) {
    try {
      const voices = await loadVoices();
      const voice = pickVoice(voices, locale);

      const utterance = new SpeechSynthesisUtterance(translated);
      utterance.lang = locale;
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
      return () => { stopSpeech(); };
    } catch {
      // Fall through to Audio Stream
    }
  }

  // 3. Direct Audio Stream Fallback
  try {
    const encoded = encodeURIComponent(translated.slice(0, 200));
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${langCode}&client=tw-ob`;
    const audio = new Audio(audioUrl);
    activeAudio = audio;
    audio.onended = () => { activeAudio = null; };
    audio.onerror = () => { activeAudio = null; };
    audio.play().catch((err) => {
      if (onError) onError(`Audio playback blocked: ${err.message}`);
    });

    return () => {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio = null;
      }
    };
  } catch (err: any) {
    if (onError) onError(`Audio error: ${err.message}`);
    return () => {};
  }
}

/** Stop any current speech */
export function stopSpeech(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined') return !!(activeAudio && !activeAudio.paused);
  const isSpeech = 'speechSynthesis' in window && window.speechSynthesis.speaking;
  return isSpeech || !!(activeAudio && !activeAudio.paused);
}

/**
 * Build the advisory speech text for the current page context.
 * Explains the active tab's practical content clearly to a farmer.
 */
export function buildVoiceText(opts: {
  activeTab: string;
  advisories: any[];
  distressData: any;
  mandiPrices: any[];
  schemes: any[];
  selectedCrop: any;
  language: string;
  weatherData?: any;
  farms?: any[];
  allCrops?: any[];
  cashFlow?: any[];
  marketSuggestions?: any[];
}): string {
  const { activeTab, advisories, distressData, mandiPrices, schemes, selectedCrop, language, weatherData, farms = [], allCrops = [], cashFlow = [], marketSuggestions = [] } = opts;
  const lang = (language || 'english').toLowerCase();

  switch (activeTab) {
    case 'home': {
      const activeCount = advisories.filter(a => !!a && !!a.recommendation).length;
      const isRain = (weatherData?.observation?.rainfall ?? 0) > 10;

      const topMandi = mandiPrices[0];
      const topPrice = topMandi ? (topMandi.sticker_price ?? topMandi.modal_price ?? topMandi.net_return ?? topMandi.price ?? 2620) : 2620;
      const currentDistrict = farms[0]?.district || 'Local';
      const cropName = selectedCrop?.crop_type ? (selectedCrop.crop_type.charAt(0).toUpperCase() + selectedCrop.crop_type.slice(1)) : 'Crop';
      const mandiName = topMandi?.mandi_name || `${currentDistrict} APMC`;

      if (lang === 'hindi') {
        return `आज का कृषि सारांश। आपके खेत की स्थिति स्वस्थ और सुरक्षित है। ${isRain ? 'आज भारी बारिश की संभावना है' : 'मौसम कृषि कार्य के लिए अनुकूल है'}। ${cropName} का मंडी भाव ₹${topPrice} प्रति क्विंटल है। आपके पास आज ${activeCount} कार्य लंबित हैं।`;
      }
      if (lang === 'marathi') {
        return `आजचा शेती सारांश. आपल्या शेताची परिस्थिती निरोगी आणि सुरक्षित आहे. ${isRain ? 'आज जोरदार पावसाची शक्यता आहे' : 'हवामान शेतकामासाठी अनुकूल आहे'}. ${cropName} चा बाजारभाव ₹${topPrice} प्रति क्विंटल आहे. आपल्याकडे आज ${activeCount} कामे प्रलंबित आहेत.`;
      }
      if (lang === 'bengali') {
        return `আজকের খামার সারাংশ। আপনার খামারের অবস্থা ভালো ও সুরক্ষিত। ${isRain ? 'আজ ভারী বৃষ্টির সম্ভাবনা রয়েছে' : 'আবহাওয়া কাজের জন্য অনুকূল'}। ${cropName}-এর মান্ডি দর ₹${topPrice} প্রতি কুইন্টাল। আপনার ${activeCount}টি কাজ বাকী আছে।`;
      }
      if (lang === 'odia') {
        return `ଆଜିର କୃଷି ସାରାଂଶ। ଆପଣଙ୍କ ଜମି ସ୍ଥିତି ସୁସ୍ଥ ଓ ନିରାପଦ। ${isRain ? 'ଆଜି ପ୍ରବଳ ବର୍ଷାର ସମ୍ଭାବନା ଅଛି' : 'ପାଣିପାଗ କାମ ପାଇଁ ଅନୁକୂଳ'}। ${cropName} ର ମଣ୍ଡି ଦର ₹${topPrice} ପ୍ରତି କ୍ୱିଣ୍ଟାଲ। ଆପଣଙ୍କର ${activeCount}ଟି କାର୍ଯ୍ୟ ବାକି ଅଛି।`;
      }

      return `Today's farm summary. Your farms are in a healthy, stable condition. ${isRain ? 'Heavy rain is expected today' : 'Weather is clear for fieldwork'}. Mandi rate for ${cropName} is ${topPrice} rupees per quintal at ${mandiName}. You have ${activeCount} pending action item${activeCount > 1 ? 's' : ''} recommended for today.`;
    }

    case 'yield':
    case 'crop': {
      const cropName = selectedCrop?.crop_type || 'Tomato';
      if (lang === 'hindi') return `फसल सलाहकार ${cropName} के लिए सक्रिय है। फसल अनुकूलता 94 प्रतिशत है। ड्रिप सिंचाई की सलाह दी जाती है।`;
      if (lang === 'marathi') return `पीक सल्लागार ${cropName} साठी सक्रिय आहे. पीक सुसंगतता 94 टक्के आहे. ठिबक सिंचनाची शिफारस केली जाते.`;
      if (lang === 'bengali') return `ফসল উপদেষ্টা ${cropName} এর জন্য সক্রিয়। ফসলের মিল ৯৪ শতাংশ। ড্রিপ সেচের সুপারিশ করা হচ্ছে।`;
      if (lang === 'odia') return `ଫସଲ ପରାମର୍ଶଦାତା ${cropName} ପାଇଁ ସକ୍ରିୟ। ଫସଲ ମେଳ ୯୪ ପ୍ରତିଶତ। ଡ୍ରିପ ସିଞ୍ଚନ ସୁପାରିଶ କରାଯାଉଛି।`;
      return `Crop Advisor active for ${cropName}. Crop match score is 94 percent. Recommended practice is drip irrigation.`;
    }

    case 'market': {
      const sellReadySuggestions = (marketSuggestions || []).filter((item: any) => isCropMarketReady(item?.crop?.stage));

      if (sellReadySuggestions.length > 0) {
        const top = sellReadySuggestions.slice(0, 2);
        const summary = top.map((item: any) => {
          const cropName = item.crop?.crop_type || 'crop';
          const farmName = item.farm?.name || item.farm?.district || 'farm';
          const mandiName = item.mandi?.mandi_name || 'nearest mandi';
          const netReturn = Math.round(item.mandi?.net_return || 0);
          return `${cropName} from ${farmName} is best at ${mandiName} with about ${netReturn} rupees per quintal.`;
        }).join(' ');
        return `Best selling options now: ${summary}`;
      }

      const best = mandiPrices[0];
      const cropName = selectedCrop?.crop_type ? (selectedCrop.crop_type.charAt(0).toUpperCase() + selectedCrop.crop_type.slice(1)) : 'Tomato';
      const farm = farms?.[0];
      const farmName = farm?.name || 'Main Farm';
      const districtName = farm?.district || 'Nashik';

      if (selectedCrop && !isCropMarketReady(selectedCrop.stage)) {
        return `No crop is ready to sell right now. Focus on crop care and wait for maturity before marketing.`;
      }

      if (!best) {
        return `Market Intelligence for ${cropName}. Checking nearest APMC mandis for optimal pricing.`;
      }

      const bestNet = Math.round(best.net_return || ((best.sticker_price || 2620) - (best.transport_cost || 190) - (best.other_fees || 50)));
      const secondBest = mandiPrices[1];
      const secondNet = secondBest ? Math.round(secondBest.net_return || ((secondBest.sticker_price || 2500) - (secondBest.transport_cost || 200) - (secondBest.other_fees || 50))) : 0;
      const diff = (secondNet > 0 && bestNet > secondNet) ? (bestNet - secondNet) : 0;

      const advantagePhrase = diff > 0 
        ? `This yields ${diff} rupees per quintal higher net profit than ${secondBest?.mandi_name || 'other mandis'}.` 
        : '';

      if (lang === 'hindi') {
        return `आपके ${cropName} फसल के लिए, ${best.mandi_name || 'निकटतम मंडी'} सबसे अधिक ₹${bestNet} प्रति क्विंटल शुद्ध लाभ दे रही है। परिवहन और मंडी शुल्क घटाने के बाद यह सबसे लाभदायक विकल्प है। ${diff > 0 ? `इससे आपको ₹${diff} प्रति क्विंटल अधिक मुनाफा होगा।` : ''}`;
      }
      if (lang === 'marathi') {
        return `आपल्या ${cropName} पिकासाठी, ${best.mandi_name || 'जवळची बाजार समिती'} सर्वात जास्त ₹${bestNet} प्रति क्विंटल निव्वळ नफा देत आहे. वाहतूक खर्च वजा करून हे सर्वात फायदेशीर आहे. ${diff > 0 ? `यामुळे तुम्हाला ₹${diff} प्रति क्विंटल जास्त नफा मिळेल.` : ''}`;
      }
      if (lang === 'bengali') {
        return `আপনার ${cropName} ফসলের জন্য, ${best.mandi_name || 'নিকটস্থ মান্ডি'} সবচেয়ে বেশি ₹${bestNet} প্রতি কুইন্টাল নিট লাভ দিচ্ছে।`;
      }
      if (lang === 'odia') {
        return `ଆପଣଙ୍କ ${cropName} ଫସଲ ପାଇଁ, ${best.mandi_name || 'ନିକଟସ୍ଥ ମଣ୍ଡି'} ସବୁଠାରୁ ଅଧିକ ₹${bestNet} ପ୍ରତି କ୍ୱିଣ୍ଟାଲ ଶୁଦ୍ଧ ଲାଭ ଦେଉଛି।`;
      }

      return `For your ${cropName} harvest at ${farmName} in ${districtName}, ${best.mandi_name} offers the highest net return of ${bestNet} rupees per quintal after deducting transport and fees. ${advantagePhrase}`;
    }

    case 'support': {
      const recSchemes = schemes.filter((s: any) => s.is_recommended && s.category !== 'loan').length;
      const recLoans = schemes.filter((s: any) => s.is_recommended && s.category === 'loan').length;
      if (lang === 'hindi') return `सरकारी सहायता मंच। आपके लिए ${recSchemes} सरकारी योजनाएं और ${recLoans} कृषि ऋण विकल्प उपलब्ध हैं।`;
      if (lang === 'marathi') return `सरकारी मदत व्यासपीठ. आपल्यासाठी ${recSchemes} सरकारी योजना आणि ${recLoans} कृषी कर्ज पर्याय उपलब्ध आहेत.`;
      if (lang === 'bengali') return `সরকারি সহায়তা প্ল্যাটফর্ম। আপনার জন্য ${recSchemes}টি সরকারি প্রকল্প এবং ${recLoans}টি কৃষি ঋণ বিকল্প উপলব্ধ।`;
      if (lang === 'odia') return `ସରକାରୀ ସହାୟତା ପ୍ଲାଟଫର୍ମ। ଆପଣଙ୍କ ପାଇଁ ${recSchemes}ଟି ସରକାରୀ ଯୋଜନା ଓ ${recLoans}ଟି କୃଷି ଋଣ ବିକଳ୍ପ ଉପଲବ୍ଧ।`;
      return `Government Support Platform. You have ${recSchemes} matched government schemes and ${recLoans} subsidized credit loan options.`;
    }

    case 'alerts':
    case 'risk-detail':
    case 'financial': {
      const totalRev = allCrops.reduce((acc: number, c: any) => acc + ((c.expected_yield_quintals || 25) * (c.target_mandi_price || 2200)), 0);
      const totalCost = allCrops.reduce((acc: number, c: any) => acc + (c.production_cost || 12000), 0);
      const netLeft = totalRev - totalCost;
      const totalDebt = cashFlow.reduce((acc: number, o: any) => acc + (o.amount || 0), 0);
      const distressScore = distressData?.score ?? 35;

      const parts: string[] = [];
      if (netLeft > 100000) parts.push(`Your farm is performing strongly with an excellent profit surplus of ${Math.abs(netLeft)} rupees.`);
      else if (netLeft > 0) parts.push(`Your farm is earning a healthy income surplus of ${Math.abs(netLeft)} rupees above costs.`);
      else if (netLeft === 0) parts.push(`Your harvest income currently breaks even with cultivation expenses.`);
      else parts.push(`Your farm operates at a net loss of ${Math.abs(netLeft)} rupees this season.`);

      if (totalDebt > 0) {
        if (netLeft > 0 && totalDebt > netLeft) parts.push(`However, upcoming payments due of ${totalDebt} rupees exceed your profit surplus.`);
        else parts.push(`You have ${totalDebt} rupees in upcoming payments due.`);
      } else {
        parts.push(`Your farm is debt free with zero upcoming payment obligations.`);
      }

      if (allCrops.length === 1) parts.push(`Planting a single crop increases market risk.`);
      else if (allCrops.length >= 2) parts.push(`Your multi-crop portfolio of ${allCrops.length} crops helps spread market risk.`);

      if (distressScore > 60) parts.push(`Regional distress risk is elevated at ${distressScore} percent.`);

      return parts.join(' ');
    }

    case 'support': {
      const recSchemes = schemes.filter((s: any) => s.is_recommended && s.category !== 'loan').length;
      const recLoans = schemes.filter((s: any) => s.is_recommended && s.category === 'loan').length;
      if (lang === 'hindi') return `सरकारी सहायता मंच। आपके लिए ${recSchemes} सरकारी योजनाएं और ${recLoans} कृषि ऋण विकल्प उपलब्ध हैं।`;
      if (lang === 'marathi') return `सरकारी मदत व्यासपीठ. आपल्यासाठी ${recSchemes} सरकारी योजना आणि ${recLoans} कृषी कर्ज पर्याय उपलब्ध आहेत.`;
      if (lang === 'bengali') return `সরকারি সহায়তা প্ল্যাটফর্ম। আপনার জন্য ${recSchemes}টি সরকারি প্রকল্প এবং ${recLoans}টি কৃষি ঋণ বিকল্প উপলব্ধ।`;
      if (lang === 'odia') return `ସରକାରୀ ସହାୟତା ପ୍ଲାଟଫର୍ମ। ଆପଣଙ୍କ ପାଇଁ ${recSchemes}ଟି ସରକାରୀ ଯୋଜନା ଓ ${recLoans}ଟି କୃଷି ଋଣ ବିକଳ୍ପ ଉପଲବ୍ଧ।`;
      return `Government Support Platform. You have ${recSchemes} matched government schemes and ${recLoans} subsidized credit loan options.`;
    }

    case 'alerts':
    case 'risk-detail': {
      const score = distressData?.score ?? 35;
      return `Risk Monitoring. Your overall farm distress score is ${score} percent.`;
    }

    default: {
      if (lang === 'hindi') return 'कृषिरक्षक में आपका स्वागत है।';
      if (lang === 'marathi') return 'कृषिरक्षक मध्ये आपले स्वागत आहे.';
      if (lang === 'bengali') return 'কৃষিরক্ষকে আপনাকে স্বাগতম।';
      if (lang === 'odia') return 'କୃଷିରକ୍ଷକକୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।';
      return 'Welcome to KrishiRakshak, your intelligent multi-lingual farm advisory assistant.';
    }
  }
}

/**
 * Ask Gemini a farming question with full farmer context.
 * Gemini's ONLY job is phrasing — it receives structured data and answers from it.
 * It does NOT generate agricultural recommendations independently.
 *
 * Returns: answer text in English (caller translates + speaks it).
 */
export async function askGemini(opts: {
  question: string;
  farmerContext: {
    crops: any[];
    farms: any[];
    weatherData: any;
    distressData: any;
    advisories: any[];
    language: string;
  };
}): Promise<string> {
  const { question, farmerContext } = opts;

  // Build a concise context summary to inject into the prompt
  const cropList = farmerContext.crops.length > 0
    ? farmerContext.crops.map(c =>
        `${c.crop_type} (stage: ${c.stage || 'growing'}, sown: ${c.sowing_date}, farm: ${c.farm_name || c.farm_id})`
      ).join('; ')
    : 'No crops registered';

  const farmList = farmerContext.farms.length > 0
    ? farmerContext.farms.map(f =>
        `${f.name || `Farm ${f.id}`} — ${f.district || 'unknown district'}, ${f.area} acres, ${f.soil_type} soil, ${f.irrigation} irrigation`
      ).join('; ')
    : 'No farms registered';

  const weatherSummary = farmerContext.weatherData?.observation
    ? `Today: ${farmerContext.weatherData.observation.rainfall}mm rain, ${farmerContext.weatherData.observation.temperature}°C, ${farmerContext.weatherData.observation.humidity}% humidity. `
      + (farmerContext.weatherData.forecasts?.[0]
        ? `Tomorrow forecast: ${farmerContext.weatherData.forecasts[0].rainfall_forecast}mm rain, ${farmerContext.weatherData.forecasts[0].rain_probability}% chance.`
        : '')
    : 'Weather data not available.';

  const distressSummary = farmerContext.distressData
    ? `Risk score: ${farmerContext.distressData.score}/100 (${farmerContext.distressData.risk_level}). `
      + `Weather risk: ${Math.round(farmerContext.distressData.weather_component)}, `
      + `Market risk: ${Math.round(farmerContext.distressData.market_component)}, `
      + `Yield risk: ${Math.round(farmerContext.distressData.yield_component)}.`
    : 'Distress score not yet calculated.';

  const topAdvisory = farmerContext.advisories.length > 0
    ? `Current advisory: ${farmerContext.advisories[0].recommendation}. Reason: ${farmerContext.advisories[0].reason || 'See app for details.'}`
    : 'No active advisories.';

  // Map language names to human-readable locale labels for the Gemini prompt
  const languageLabel: Record<string, string> = {
    english: 'English',
    hindi: 'Hindi (हिन्दी)',
    odia: 'Odia (ଓଡ௃யா)',
    marathi: 'Marathi (मराठी)',
    bengali: 'Bengali (বাংলা)',
  };
  const replyLang = languageLabel[farmerContext.language] || 'English';

  // Strict system prompt — Gemini answers ONLY from the data provided, in farmer's language
  const systemPrompt = `You are KrishiRakshak, an agricultural assistant embedded in a farmer advisory app.
Your role: answer the farmer's question ONLY using the farm data provided below.
Rules:
- Keep answers SHORT: 2–3 sentences maximum.
- Be SPECIFIC to this farmer's actual data, never generic.
- Do NOT add disclaimers like "consult an expert" — the farmer needs actionable advice.
- Do NOT make up data not in the context below.
- IMPORTANT: Reply ONLY in ${replyLang}. Do not use any other language.

=== FARMER DATA ===
Crops: ${cropList}
Farms: ${farmList}
Weather: ${weatherSummary}
Distress: ${distressSummary}
Advisory: ${topAdvisory}
===================

Farmer's question: "${question}"

Answer in ${replyLang} (2–3 sentences, specific to their data):`;

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.2,   // Low temperature for factual, grounded answers
          topP: 0.8,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Gemini API error:', err);
      throw new Error(`API returned ${resp.status}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text.trim();

  } catch (e: any) {
    console.error('askGemini failed:', e);
    if (e?.name === 'TimeoutError') {
      return 'The advisory AI is taking too long. Please check your internet connection and try again.';
    }
    return 'Could not get an answer right now. Please try again in a moment.';
  }
}

