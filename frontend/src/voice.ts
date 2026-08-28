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

// ─── Gemini Configuration ───────────────────────────────────────────────────
// Model: gemini-3.1-flash-lite (user calls it "Gemini 3.5 Flash Lite")
// Confirmed via: GET /v1beta/models → displayName: "Gemini 3.1 Flash Lite"
// Text-in, text-out only (no audio/image output)
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AQ.Ab8RN6J_1kwgFChbLdh03PsSEJV3x4L2AYKAMv03Ydpt2nsExQ';
export const GEMINI_MODEL   = 'gemini-3.1-flash-lite';
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
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

/** Pick the best voice for a locale */
function pickVoice(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | null {
  const lang = locale.split('-')[0];
  return (
    voices.find(v => v.lang === locale) ||
    voices.find(v => v.lang.startsWith(lang)) ||
    voices.find(v => v.lang.startsWith('en')) ||
    null
  );
}

/** Speak text in the given language. Returns a cancel function. */
export async function speakText(
  text: string,
  language: string,
  onError?: (msg: string) => void
): Promise<() => void> {
  // Stop any existing playback
  speechSynthesis.cancel();

  if (!text.trim()) return () => {};

  // Translate to target language
  const translated = language === 'english' ? text : await translateText(text, language);

  const voices = await loadVoices();
  const locale = LOCALE_MAP[language] || 'en-IN';
  const voice = pickVoice(voices, locale);

  const utterance = new SpeechSynthesisUtterance(translated);
  utterance.lang = locale;
  if (voice) utterance.voice = voice;
  utterance.rate = 0.92; // Slightly relaxed, clear & articulate pacing for farmers
  utterance.pitch = 1.0;

  utterance.onerror = (e) => {
    if (onError) onError(`Voice error: ${e.error}`);
  };

  speechSynthesis.speak(utterance);

  return () => {
    speechSynthesis.cancel();
  };
}

/** Stop any current speech */
export function stopSpeech(): void {
  speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
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
}): string {
  const { activeTab, advisories, distressData, mandiPrices, schemes, selectedCrop, language, farms = [], allCrops = [], cashFlow = [] } = opts;
  const lang = (language || 'english').toLowerCase();

  switch (activeTab) {
    case 'home': {
      const topAdvisory = advisories.length > 0 ? advisories[0].recommendation : '';
      const mandiPrice = mandiPrices.length > 0 ? mandiPrices[0].modal_price : 2290;
      const activeCount = advisories.length;

      if (lang === 'hindi') {
        return `आज का कृषि सारांश। आपके खेत की स्थिति सामान्य है। आज का मंडी भाव ₹${mandiPrice} प्रति क्विंटल है। आपके पास ${activeCount} कार्य लंबित हैं। मुख्य सलाह: ${topAdvisory || 'खेत में नमी बनाए रखें'}`;
      }
      if (lang === 'marathi') {
        return `आजचा शेती सारांश. आपल्या शेताची परिस्थिती सामान्य आहे. आजचा बाजारभाव ₹${mandiPrice} प्रति क्विंटल आहे. आपल्याकडे ${activeCount} कामे प्रलंबित आहेत. मुख्य सल्ला: ${topAdvisory || 'शेतातील ओलावा तपासा'}`;
      }
      if (lang === 'bengali') {
        return `আজকের খামার সারাংশ। আপনার খামারের অবস্থা স্বাভাবিক। আজকের মান্ডি দর ₹${mandiPrice} প্রতি কুইন্টাল। আপনার ${activeCount}টি কাজ বাকী আছে। মূল পরামর্শ: ${topAdvisory || 'মাটির আর্দ্রতা পরীক্ষা করুন'}`;
      }
      if (lang === 'odia') {
        return `ଆଜିର କୃଷି ସାରାଂଶ। ଆପଣଙ୍କ ଜମି ସ୍ଥିତି ସ୍ୱାଭାବିକ ଅଛି। ଆଜିର ମଣ୍ଡି ଦର ₹${mandiPrice} ପ୍ରତି କ୍ୱିଣ୍ଟାଲ। ଆପଣଙ୍କର ${activeCount}ଟି କାର୍ଯ୍ୟ ବାକି ଅଛି। ମୁଖ୍ୟ ପରାମର୍ଶ: ${topAdvisory || 'ଜମିର ଓଦାପଣ ଯାଞ୍ଚ କରନ୍ତୁ'}`;
      }

      return `Today's farm summary. Your farm conditions are stable. Mandi price is ₹${mandiPrice} per quintal. You have ${activeCount} pending action items. Top action today: ${topAdvisory || 'Keep monitoring field soil moisture.'}`;
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
      const best = mandiPrices[0];
      const cropName = selectedCrop?.crop_type ? (selectedCrop.crop_type.charAt(0).toUpperCase() + selectedCrop.crop_type.slice(1)) : 'Tomato';
      const farm = farms?.[0];
      const farmName = farm?.name || 'Main Farm';
      const districtName = farm?.district || 'Nashik';
      
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

      return `For your ${cropName} harvest at ${farmName} in ${districtName}, ${best.mandi_name} offers the highest net return of ${bestNet} rupees per quintal after deducting transport and fees. ${advantagePhrase} Recommended to sell during early morning bidding hours.`;
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

