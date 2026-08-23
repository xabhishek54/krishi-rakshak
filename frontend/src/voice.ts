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
export const GEMINI_API_KEY = 'AQ.Ab8RN6J_1kwgFChbLdh03PsSEJV3x4L2AYKAMv03Ydpt2nsExQ';
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
  const translated = await translateText(text, language);

  const voices = await loadVoices();
  const locale = LOCALE_MAP[language] || 'en-IN';
  const voice = pickVoice(voices, locale);

  const utterance = new SpeechSynthesisUtterance(translated);
  utterance.lang = locale;
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
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
 * Build the advisory speech text for the current context.
 * Picks the most relevant content based on active tab.
 */
export function buildVoiceText(opts: {
  activeTab: string;
  advisories: any[];
  distressData: any;
  mandiPrices: any[];
  schemes: any[];
  selectedCrop: any;
  language: string;
}): string {
  const { activeTab, advisories, distressData, mandiPrices, schemes, selectedCrop } = opts;

  switch (activeTab) {
    case 'home':
    case 'crop': {
      // Read the top advisory recommendation
      if (advisories.length > 0) {
        const top = advisories[0];
        return `${top.recommendation}. ${top.reason || ''}`;
      }
      if (selectedCrop) {
        return `Your ${selectedCrop.crop_type} is currently in the ${selectedCrop.stage || 'growing'} stage. No active alerts today.`;
      }
      return 'No advisory available. Please register your crop to get personalized recommendations.';
    }

    case 'alerts': {
      if (distressData && distressData.score >= 30) {
        return `Your distress score is ${distressData.score} out of 100, rated ${distressData.risk_level}. ${
          distressData.weather_component > 25 ? 'Rainfall conditions are below normal. ' : ''
        }${
          distressData.market_component > 25 ? 'Market prices are lower than baseline. ' : ''
        }Check the risk details for more information.`;
      }
      return 'Your farm is in stable condition. No critical alerts at this time.';
    }

    case 'market': {
      if (mandiPrices.length > 0) {
        const best = mandiPrices[0];
        return `The best mandi for you is ${best.mandi_name}, ${best.distance_km} kilometers away. Net return after transport is ${best.net_return} rupees per quintal.`;
      }
      return 'No mandi comparison data available. Register your crop to see prices.';
    }

    case 'support': {
      const recommended = schemes.filter((s: any) => s.is_recommended);
      if (recommended.length > 0) {
        return `You have ${recommended.length} recommended government schemes. Top recommendation: ${recommended[0].name}. ${recommended[0].support_type}.`;
      }
      return 'Check the Support tab for government schemes available for your crops.';
    }

    default:
      return 'Welcome to KrishiRakshak. Your agricultural risk intelligence system.';
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

  // Strict system prompt — Gemini answers ONLY from the data provided
  const systemPrompt = `You are KrishiRakshak, an agricultural assistant embedded in a farmer advisory app.
Your role: answer the farmer's question ONLY using the farm data provided below.
Rules:
- Keep answers SHORT: 2–3 sentences maximum.
- Be SPECIFIC to this farmer's actual data, never generic.
- Do NOT add disclaimers like "consult an expert" — the farmer needs actionable advice.
- Do NOT make up data not in the context below.
- Answer in English only (the app will translate and speak it).

=== FARMER DATA ===
Crops: ${cropList}
Farms: ${farmList}
Weather: ${weatherSummary}
Distress: ${distressSummary}
Advisory: ${topAdvisory}
===================

Farmer's question: "${question}"

Answer (2–3 sentences, specific to their data):`;

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

