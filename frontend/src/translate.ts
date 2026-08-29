/**
 * Translation engine for KrishiRakshak.
 *
 * Priority order (fastest → slowest, no heavy dependencies):
 *  1. Curated in-process DICTIONARY (instant, zero network, covers ~95% of UI)
 *  2. localStorage cache  (instant on repeat renders)
 *  3. translate.googleapis.com  (Google's own free endpoint, no API key,
 *     much higher limits than MyMemory, works on Render free tier)
 *  4. English text fallback (silent, no errors)
 */

const CACHE_PREFIX = 'kr_trans_';

// Google Translate free endpoint (unofficial but stable, used by many OSS projects)
// Format: /translate_a/single?client=gtx&sl=en&tl={code}&dt=t&q={text}
const GOOGLE_TRANSLATE_BASE = 'https://translate.googleapis.com/translate_a/single';

const LANG_CODES: Record<string, string> = {
  hindi: 'hi',
  marathi: 'mr',
  bengali: 'bn',
  odia: 'or',
};

function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) + text.charCodeAt(i);
    h = h & h;
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

/** ============================================================
 *  CURATED DICTIONARY
 *  All T-wrapped UI strings from App.tsx hand-translated.
 *  Covers ~95%+ of rendered UI; remainder falls to Google GTX.
 *  ============================================================ */
const DICTIONARY: Record<string, Record<string, string>> = {
  // ── Navigation & Tabs ────────────────────────────────────────
  "home": { hindi: "होम", marathi: "मुख्यपृष्ठ", bengali: "হোম", odia: "ଘର" },
  "crop": { hindi: "फसल", marathi: "पीक", bengali: "ফসল", odia: "ଫସଲ" },
  "market": { hindi: "बाज़ार", marathi: "बाजार", bengali: "বাজার", odia: "ବଜାର" },
  "support": { hindi: "सहायता", marathi: "मदत", bengali: "সহায়তা", odia: "ସହାୟତା" },
  "risk": { hindi: "जोखिम", marathi: "जोखीम", bengali: "ঝুঁকি", odia: "ଆଶଙ୍କା" },

  // ── Dashboard / Summary ──────────────────────────────────────
  "today's farm summary": { hindi: "आज का कृषि सारांश", marathi: "आजचा शेती सारांश", bengali: "আজকের খামার সারাংশ", odia: "ଆଜିର କୃଷି ସାରାଂଶ" },
  "daily executive snapshot for your farms": { hindi: "आपके खेतों के लिए दैनिक स्थिति सारांश", marathi: "आपल्या शेतांसाठी दैनंदिन स्थिती सारांश", bengali: "আপনার খামার সমূহের দৈনিক সারাংশ", odia: "ଆପଣଙ୍କ ଜମିର ଦୈନିକ ସାରାଂଶ" },
  "your farms are in a healthy, stable condition": { hindi: "आपके खेत स्वस्थ और सुरक्षित स्थिति में हैं", marathi: "आपली शेती निरोगी आणि सुरक्षित स्थितीत आहे", bengali: "আপনার খামার ভালো ও সুরক্ষিত অবস্থায় রয়েছে", odia: "ଆପଣଙ୍କ ଜମି ସୁସ୍ଥ ଓ ନିରାପଦ ସ୍ଥିତିରେ ଅଛି" },
  "your farms are in healthy condition overall": { hindi: "आपके खेत कुल मिलाकर स्वस्थ स्थिति में हैं", marathi: "आपली शेती एकंदरीत निरोगी स्थितीत आहे", bengali: "সামগ্রিকভাবে আপনার খামার ভালো অবস্থায় আছে", odia: "ସାମଗ୍ରିକ ଭାବେ ଆପଣଙ୍କ ଜମି ସୁସ୍ଥ ଅଛି" },
  "some risk factors require attention": { hindi: "कुछ जोखिम कारकों पर ध्यान देना आवश्यक है", marathi: "काही जोखीम घटकांकडे लक्ष देणे आवश्यक आहे", bengali: "কিছু ঝুঁকির বিষয়ে মনোযোগ প্রয়োজন", odia: "କିଛୁ ଆଶଙ୍କା ଉପାଦାନ ଉପରେ ଧ୍ୟାନ ଦେବା ଜରୁରୀ" },
  "🟢 healthy & stable": { hindi: "🟢 स्वस्थ एवं स्थिर", marathi: "🟢 निरोगी आणि स्थिर", bengali: "🟢 সুস্থ ও স্থিতিশীল", odia: "🟢 ସୁସ୍ଥ ଓ ସ୍ଥିର" },
  "🟡 moderate watch": { hindi: "🟡 सामान्य निगरानी", marathi: "🟡 मध्यम देखरेख", bengali: "🟡 মাঝারি পর্যবেক্ষণ", odia: "🟡 ମଧ୍ୟମ ନଜର" },
  "🔴 attention needed": { hindi: "🔴 तत्काल ध्यान चाहिए", marathi: "🔴 त्वरित लक्ष द्या", bengali: "🔴 মনোযোগ প্রয়োজন", odia: "🔴 ତୁରନ୍ତ ଧ୍ୟାନ ଦରକାର" },
  "farm health & risk": { hindi: "खेत का स्वास्थ्य एवं जोखिम", marathi: "शेत आरोग्य आणि जोखीम", bengali: "খামারের স্বাস্থ্য ও ঝুঁকি", odia: "ଜମିର ସ୍ୱାସ୍ଥ୍ୟ ଓ ଆଶଙ୍କା" },
  "farm health": { hindi: "खेत की स्वास्थ्य स्थिति", marathi: "शेताची आरोग्य स्थिती", bengali: "খামারের স্বাস্থ্য", odia: "ଜମିର ସ୍ୱାସ୍ଥ୍ୟ ସ୍ଥିତି" },
  "suitability & farm summary": { hindi: "उपयुक्तता एवं खेत सारांश", marathi: "योग्यता आणि शेत सारांश", bengali: "উপযুক্ততা ও খামার সারাংশ", odia: "ଉପଯୁକ୍ତତା ଓ ଜମି ସାରାଂଶ" },

  // ── Weather ───────────────────────────────────────────────────
  "weather": { hindi: "मौसम", marathi: "हवामान", bengali: "আবহাওয়া", odia: "ପାଣିପାଗ" },
  "weather advisor": { hindi: "मौसम सलाहकार", marathi: "हवामान सल्लागार", bengali: "আবহাওয়া পরামর্শদাতা", odia: "ପାଣିପାଗ ପରାମର୍ଶ" },
  "weather metrics": { hindi: "मौसम मापदंड", marathi: "हवामान मापे", bengali: "আবহাওয়া পরিমাপ", odia: "ପାଣିପାଗ ମାପ" },
  "weather is clear for fieldwork": { hindi: "मौसम कृषि कार्य के लिए अनुकूल है", marathi: "हवामान शेतकामासाठी अनुकूल आहे", bengali: "আবহাওয়া কাজের জন্য অনুকূল", odia: "ପାଣିପାଗ କାମ ପାଇଁ ଅନୁକୂଳ" },
  "good weather — optimal for fieldwork": { hindi: "अच्छा मौसम — खेत कार्य के लिए उत्तम", marathi: "चांगले हवामान — शेतकामासाठी उत्तम", bengali: "ভালো আবহাওয়া — মাঠকাজের জন্য আদর্শ", odia: "ଭଲ ପାଣିପାଗ — ଜମି କାମ ପାଇଁ ଉପଯୁକ୍ତ" },
  "heavy rain expected today": { hindi: "आज भारी बारिश की संभावना है", marathi: "आज जोरदार पावसाची शक्यता आहे", bengali: "আজ ভারী বৃষ্টির সম্ভাবনা রয়েছে", odia: "ଆଜି ପ୍ରବଳ ବର୍ଷାର ସମ୍ଭାବନା ଅଛି" },
  "heavy rain — postpone chemical spraying": { hindi: "भारी बारिश — रासायनिक छिड़काव टालें", marathi: "मुसळधार पाऊस — रासायनिक फवारणी पुढे ढकला", bengali: "ভারী বৃষ্টি — রাসায়নিক স্প্রে পিছিয়ে দিন", odia: "ଭାରୀ ବର୍ଷା — ରାସାୟନିକ ସ୍ପ୍ରେ ମୁଲ୍ତୁବି ରଖନ୍ତୁ" },
  "high humidity — inspect fungal disease risk": { hindi: "उच्च आर्द्रता — फफूंद रोग जोखिम जांचें", marathi: "जास्त आर्द्रता — बुरशी रोगाचा धोका तपासा", bengali: "উচ্চ আর্দ্রতা — ছত্রাক রোগের ঝুঁকি পরীক্ষা করুন", odia: "ଅଧିକ ଆର୍ଦ୍ରତା — ଛତ୍ରାକ ରୋଗ ଆଶଙ୍କା ଦେଖନ୍ତୁ" },
  "high wind — hold spraying fieldwork": { hindi: "तेज हवा — छिड़काव कार्य रोकें", marathi: "जोरदार वारा — फवारणी थांबवा", bengali: "তেজ বাতাস — স্প্রে করা বন্ধ রাখুন", odia: "ଶକ୍ତ ପବନ — ସ୍ପ୍ରେ କାର୍ଯ୍ୟ ବନ୍ଦ ରଖନ୍ତୁ" },
  "clear & sunny": { hindi: "साफ और धूप", marathi: "स्वच्छ आणि ऊन", bengali: "পরিষ্কার ও রোদেলা", odia: "ସ୍ୱଚ୍ଛ ଓ ଧୂପ" },
  "rainy": { hindi: "बारिश का मौसम", marathi: "पावसाळी", bengali: "বৃষ্টিময়", odia: "ବର୍ଷା" },
  "warm & moist": { hindi: "गर्म और आर्द्र", marathi: "उष्ण आणि ओलसर", bengali: "উষ্ণ ও আর্দ্র", odia: "ଉଷ୍ଣ ଓ ଆର୍ଦ୍ର" },

  // ── Crop Tab ─────────────────────────────────────────────────
  "crop care": { hindi: "फसल देखभाल एवं प्रबंधन", marathi: "पीक काळजी आणि व्यवस्थापन", bengali: "ফসল যত্ন ও পরিচালনা", odia: "ଫସଲ ଯତ୍ନ ଓ ପରିଚାଳନା" },
  "action items": { hindi: "अनुशंसित कार्य", marathi: "शिफारस केलेली कामे", bengali: "প্রস্তাবিত কাজ", odia: "ସୁପାରିଶ କାର୍ଯ୍ୟ" },
  "recommended practices": { hindi: "अनुशंसित कृषि पद्धतियाँ", marathi: "शिफारस केलेल्या कृषी पद्धती", bengali: "প্রস্তাবিত কৃষি পদ্ধতি", odia: "ସୁପାରିଶ କୃଷି ପ୍ରଣାଳୀ" },
  "recommended best practice": { hindi: "अनुशंसित सर्वोत्तम पद्धति", marathi: "शिफारस केलेली सर्वोत्तम पद्धती", bengali: "প্রস্তাবিত সেরা পদ্ধতি", odia: "ସୁପାରିଶ ସର୍ବୋତ୍ତମ ଅଭ୍ୟାସ" },
  "tailored field management guidance": { hindi: "आपकी फसल के लिए अनुकूलित खेत प्रबंधन मार्गदर्शन", marathi: "आपल्या पिकासाठी अनुकूलित शेत व्यवस्थापन मार्गदर्शन", bengali: "আপনার ফসলের জন্য কাস্টমাইজড মাঠ ব্যবস্থাপনা নির্দেশিকা", odia: "ଆପଣଙ୍କ ଫସଲ ପାଇଁ ଉପଯୁକ୍ତ ଜମି ପ୍ରବନ୍ଧ" },
  "field action plan for": { hindi: "के लिए कृषि कार्ययोजना", marathi: "साठी शेत कृती योजना", bengali: "জন্য মাঠ কর্ম পরিকল্পনা", odia: "ପାଇଁ ଜମି ଯୋଜନା" },
  "what crop should i grow right now?": { hindi: "अभी कौन सी फसल उगाऊं?", marathi: "आत्ता कोणते पीक घ्यावे?", bengali: "এখন কোন ফসল চাষ করব?", odia: "ଏବେ କୌଣସି ଫସଲ ଲଗାଇବ?" },
  "why this fits your farm context": { hindi: "यह आपके खेत के लिए क्यों उपयुक्त है", marathi: "हे आपल्या शेत संदर्भासाठी का योग्य आहे", bengali: "এটি আপনার খামারের জন্য কেন উপযুক্ত", odia: "ଏହା ଆପଣଙ୍କ ଜମି ପ୍ରସଙ୍ଗ ପାଇଁ ଉପଯୁକ୍ତ" },
  "crop compatibility": { hindi: "फसल अनुकूलता", marathi: "पीक सुसंगतता", bengali: "ফসল সামঞ্জস্য", odia: "ଫସଲ ଅନୁକୂଳତା" },
  "crops evaluated": { hindi: "मूल्यांकित फसलें", marathi: "मूल्यांकित पिके", bengali: "মূল্যায়িত ফসল", odia: "ମୂଲ୍ୟାୟନ ଫସଲ" },
  "top match": { hindi: "शीर्ष अनुशंसित", marathi: "सर्वोत्तम शिफारस", bengali: "সেরা মিল", odia: "ସର୍ବୋଚ୍ଚ ମିଳ" },
  "selected": { hindi: "चुना हुआ", marathi: "निवडलेले", bengali: "নির্বাচিত", odia: "ଚୟନ" },
  "match": { hindi: "मिलान", marathi: "जुळणी", bengali: "মিল", odia: "ମିଳ" },
  "seasonal fit": { hindi: "मौसमी अनुकूलता", marathi: "हंगामी योग्यता", bengali: "মৌসুমী উপযুক্ততা", odia: "ଋତୁ ଉପଯୁକ୍ତ" },
  "irrigation": { hindi: "सिंचाई", marathi: "सिंचन", bengali: "সেচ", odia: "ଜଳସେଚନ" },
  "fertilizer": { hindi: "उर्वरक", marathi: "खत", bengali: "সার", odia: "ସାର" },
  "pesticide": { hindi: "कीटनाशक", marathi: "कीटकनाशक", bengali: "কীটনাশক", odia: "କୀଟନାශକ" },
  "harvest": { hindi: "कटाई", marathi: "कापणी", bengali: "ফসল কাটা", odia: "ଅମଳ" },
  "sowing": { hindi: "बुवाई", marathi: "पेरणी", bengali: "বীজ বপন", odia: "ବୁଣିବା" },
  "soil health": { hindi: "मृदा स्वास्थ्य", marathi: "माती आरोग्य", bengali: "মাটির স্বাস্থ্য", odia: "ମାଟି ସ୍ୱାସ୍ଥ୍ୟ" },
  "soil type": { hindi: "मिट्टी का प्रकार", marathi: "मातीचा प्रकार", bengali: "মাটির ধরন", odia: "ମାଟି ପ୍ରକାର" },
  "soil & nutrient guidance": { hindi: "मृदा एवं पोषण मार्गदर्शन", marathi: "माती आणि पोषण मार्गदर्शन", bengali: "মাটি ও পুষ্টি নির্দেশিকা", odia: "ମାଟି ଓ ପୋଷଣ ନିର୍ଦ୍ଦେଶ" },
  "soil fit:": { hindi: "मृदा अनुकूलता:", marathi: "माती योग्यता:", bengali: "মাটির উপযুক্ততা:", odia: "ମାଟି ଉପଯୁକ୍ତ:" },
  "soil fit": { hindi: "मृदा अनुकूलता", marathi: "माती योग्यता", bengali: "মাটির উপযুক্ততা", odia: "ମାଟି ଉପଯୁକ୍ତ" },
  "irrigation guidance": { hindi: "सिंचाई मार्गदर्शन", marathi: "सिंचन मार्गदर्शन", bengali: "সেচ নির্দেশিকা", odia: "ଜଳସେଚନ ନିର୍ଦ୍ଦେଶ" },
  "irrigation system": { hindi: "सिंचाई प्रणाली", marathi: "सिंचन प्रणाली", bengali: "সেচ ব্যবস্থা", odia: "ଜଳସେଚନ ବ୍ୟବସ୍ଥା" },
  "water & irrigation optimizer": { hindi: "जल एवं सिंचाई अनुकूलक", marathi: "पाणी आणि सिंचन अनुकूलक", bengali: "জল ও সেচ অপ্টিমাইজার", odia: "ଜଳ ଓ ସେଚ ଅପ୍ଟିମାଇଜର" },
  "water advisor": { hindi: "जल सलाहकार", marathi: "पाणी सल्लागार", bengali: "জল পরামর্শদাতা", odia: "ଜଳ ପରାମର୍ଶ" },
  "water fit:": { hindi: "जल अनुकूलता:", marathi: "पाणी योग्यता:", bengali: "জলের উপযুক্ততা:", odia: "ଜଳ ଉପଯୁକ୍ତ:" },
  "current:": { hindi: "वर्तमान:", marathi: "सध्याचे:", bengali: "বর্তমান:", odia: "ବର୍ତ୍ତମାନ:" },
  "🟢 optimal": { hindi: "🟢 सर्वोत्तम", marathi: "🟢 सर्वोत्तम", bengali: "🟢 সর্বোত্তম", odia: "🟢 ସର୍ବୋତ୍ତମ" },
  "🟡 action recommended": { hindi: "🟡 कार्रवाई अनुशंसित", marathi: "🟡 कृती शिफारस", bengali: "🟡 পদক্ষেপ প্রস্তাবিত", odia: "🟡 କାର୍ଯ୍ୟ ସୁପାରିଶ" },
  "nutrient & fertilizers": { hindi: "पोषक तत्व एवं उर्वरक", marathi: "पोषक घटक आणि खते", bengali: "পুষ্টি ও সার", odia: "ପୋଷଣ ଓ ସାର" },
  "pest & disease protection": { hindi: "कीट एवं रोग सुरक्षा", marathi: "कीड आणि रोग संरक्षण", bengali: "কীটপতঙ্গ ও রোগ সুরক্ষা", odia: "ପୋକ ଓ ରୋଗ ସୁରକ୍ଷା" },
  "outcome forecast & parameter simulator": { hindi: "उत्पाद पूर्वानुमान एवं मापदंड सिमुलेटर", marathi: "उत्पन्न अंदाज आणि मापदंड सिम्युलेटर", bengali: "ফলাফল পূর্বাভাস ও সিমুলেটর", odia: "ଉତ୍ପାଦନ ପୂର୍ବାନୁମାନ" },
  "expected yield": { hindi: "अनुमानित उपज", marathi: "अपेक्षित उत्पादन", bengali: "প্রত্যাশিত ফলন", odia: "ଅନୁମାନିତ ଅମଳ" },
  "expected yield:": { hindi: "अनुमानित उपज:", marathi: "अपेक्षित उत्पादन:", bengali: "প্রত্যাশিত ফলন:", odia: "ଅନୁମାନିତ ଅମଳ:" },
  "mandi price": { hindi: "मंडी भाव", marathi: "बाजारभाव", bengali: "মান্ডি মূল্য", odia: "ମଣ୍ଡି ମୂଲ୍ୟ" },
  "mandi rate:": { hindi: "मंडी भाव:", marathi: "बाजारभाव:", bengali: "মান্ডি দর:", odia: "ମଣ୍ଡି ଦର:" },
  "est. profit / acre:": { hindi: "अनुमानित लाभ / एकड़:", marathi: "अंदाजे नफा / एकर:", bengali: "আনুমানিক লাভ / একর:", odia: "ଅନୁମାନିତ ଲାଭ / ଏକର:" },
  "profit return:": { hindi: "लाभ प्रतिफल:", marathi: "नफा परतावा:", bengali: "লাভের হার:", odia: "ଲାଭର ହାର:" },
  "market fit:": { hindi: "बाज़ार अनुकूलता:", marathi: "बाजार योग्यता:", bengali: "বাজার উপযুক্ততা:", odia: "ବଜାର ଉପଯୁକ୍ତତା:" },
  "total input cost": { hindi: "कुल इनपुट लागत", marathi: "एकूण निविष्ठा खर्च", bengali: "মোট ইনপুট খরচ", odia: "ମୋଟ ଇନପୁଟ ଖର୍ଚ୍ଚ" },
  "projected net income": { hindi: "अनुमानित शुद्ध आय", marathi: "अपेक्षित निव्वळ उत्पन्न", bengali: "প্রক্ষেপিত নিট আয়", odia: "ଅନୁମାନିତ ଶୁଦ୍ଧ ଆୟ" },
  "positive return": { hindi: "सकारात्मक लाभ", marathi: "सकारात्मक परतावा", bengali: "ইতিবাচক আয়", odia: "ସକାରାତ୍ମକ ଲାଭ" },
  "tweak parameters to re-estimate": { hindi: "पुनः अनुमान के लिए मापदंड बदलें", marathi: "पुन्हा अंदाज करण्यासाठी मापदंड बदला", bengali: "পুনরায় অনুমানের জন্য প্যারামিটার পরিবর্তন করুন", odia: "ପୁନଃ ଅନୁମାନ ପାଇଁ ମାପଦଣ୍ଡ ବଦଳାନ୍ତୁ" },
  "recalculate with ml model": { hindi: "ML मॉडल से पुनः गणना करें", marathi: "ML मॉडेलसह पुन्हा मोजा", bengali: "ML মডেল দিয়ে পুনরায় গণনা করুন", odia: "ML ମଡେଲ ସହିତ ପୁନଃ ଗଣନା" },
  "calculating ml model...": { hindi: "ML मॉडल गणना हो रही है...", marathi: "ML मॉडेल मोजत आहे...", bengali: "ML মডেল গণনা হচ্ছে...", odia: "ML ମଡେଲ ଗଣନା ହେଉଛି..." },
  "📊 live estimate": { hindi: "📊 लाइव अनुमान", marathi: "📊 थेट अंदाज", bengali: "📊 সরাসরি অনুমান", odia: "📊 ଲାଇଭ ଅନୁମାନ" },
  "area (acres)": { hindi: "क्षेत्र (एकड़)", marathi: "क्षेत्र (एकर)", bengali: "এলাকা (একর)", odia: "ଜମି (ଏକର)" },
  "acres": { hindi: "एकड़", marathi: "एकर", bengali: "একর", odia: "ଏକର" },
  "only": { hindi: "केवल", marathi: "फक्त", bengali: "শুধুমাত্র", odia: "କେବଳ" },
  "total:": { hindi: "कुल:", marathi: "एकूण:", bengali: "মোট:", odia: "ମୋଟ:" },

  // ── Market Tab ───────────────────────────────────────────────
  "where should i sell each crop?": { hindi: "मुझे प्रत्येक फसल कहाँ बेचनी चाहिए?", marathi: "मी प्रत्येक पीक कुठे विकावे?", bengali: "আমার প্রতিটি ফসল কোথায় বিক্রি করা উচিত?", odia: "ମୁଁ ପ୍ରତ୍ୟେକ ଫସଲ କେଉଁଠାରେ ବିକ୍ରି କରିବା ଉଚିତ?" },
  "live net-return recommendation by crop and farm.": { hindi: "फसल और खेत के अनुसार लाइव शुद्ध-लाभ अनुशंसा।", marathi: "पीक आणि शेतानुसार थेट निव्वळ नफा शिफारस.", bengali: "ফসল এবং খামার অনুযায়ী সরাসরি নিট লাভ পরামর্শ।", odia: "ଫସଲ ଓ ଜମି ଅନୁଯାୟୀ ଲାଇଭ ଶୁଦ୍ଧ-ଲାଭ ସୁପାରିଶ।" },
  "from": { hindi: "से", marathi: "पासून", bengali: "থেকে", odia: "ରୁ" },
  "sell at": { hindi: "में बेचें", marathi: "येथे विका", bengali: "বিক্রি করুন", odia: "ରେ ବିକ୍ରି କରନ୍ତୁ" },
  "checking which crops are ready to sell...": { hindi: "जांच की जा रही है कि कौन सी फसलें बेचने के लिए तैयार हैं...", marathi: "कोणती पिके विकण्यासाठी तयार आहेत हे तपासत आहे...", bengali: "কোন ফসল বিক্রি করার জন্য প্রস্তুত তা পরীক্ষা করা হচ্ছে...", odia: "କେଉଁ ଫସଲ ବିକ୍ରି ପାଇଁ ପ୍ରସ୍ତୁତ ତାହା ଯାଞ୍ଚ ହେଉଛି..." },
  "no crop is ready to sell yet. once a crop reaches maturity, the best mandi will appear here.": { hindi: "अभी कोई फसल बेचने के लिए तैयार नहीं है। फसल पकने पर सर्वश्रेष्ठ मंडी यहाँ दिखाई देगी।", marathi: "अद्याप कोणतेही पीक विकण्यासाठी तयार नाही. पीक परिपक्व झाल्यावर सर्वोत्तम बाजार येथे दिसेल.", bengali: "এখনো কোনো ফসল বিক্রির উপযোগী নয়। ফসল পরিপক্ক হলে সেরা মান্ডি এখানে দেখা যাবে।", odia: "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଫସଲ ବିକ୍ରି ପାଇଁ ପ୍ରସ୍ତୁତ ନୁହେଁ। ଫସଲ ପାଚିଲେ ସର୍ବୋତ୍ତମ ମଣ୍ଡି ଏଠାରେ ଦେଖାଯିବ।" },
  "origin farm:": { hindi: "मूल खेत:", marathi: "मूल शेत:", bengali: "উৎস খামার:", odia: "ଉତ୍ସ ଜମି:" },
  "distances calculated dynamically from farm gps": { hindi: "दूरी खेत जीपीएस से गतिशील रूप से गणना की गई", marathi: "अंतर शेत जीपीएस वरून मोजले गेले", bengali: "দূরত্ব খামার জিপিএস থেকে গণনা করা হয়েছে", odia: "ଦୂରତା ଜମି ଜିପିଏସ ରୁ ଗଣନା କରାଯାଇଛି" },
  "no mandi comparison data available. register crop above to evaluate apmcs.": { hindi: "कोई मंडी तुलना डेटा उपलब्ध नहीं है। एपीएमसी का मूल्यांकन करने के लिए ऊपर फसल पंजीकृत करें।", marathi: "कोणताही बाजार तुलना डेटा उपलब्ध नाही. बाजार समित्यांचे मूल्यमापन करण्यासाठी वर पीक नोंदवा.", bengali: "কোনো মান্ডি তুলনামূলক তথ্য নেই। মান্ডি মূল্যায়নের জন্য উপরে ফসল নিবন্ধন করুন।", odia: "କୌଣସି ମଣ୍ଡି ତୁଳନା ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ। ମଣ୍ଡି ମୂଲ୍ୟାୟନ ପାଇଁ ଉପରେ ଫସଲ ପଞ୍ଜୀକୃତ କରନ୍ତୁ।" },
  "show top 5 local mandis": { hindi: "शीर्ष 5 स्थानीय मंडियां दिखाएं", marathi: "सर्वोत्तम 5 स्थानिक बाजार दाखवा", bengali: "শীর্ষ ৫টি স্থানীয় মান্ডি দেখান", odia: "ସର୍ବୋଚ୍ଚ ୫ଟି ସ୍ଥାନୀୟ ମଣ୍ଡି ଦେଖାନ୍ତୁ" },
  "crop advisor": { hindi: "फसल सलाहकार", marathi: "पीक सल्लागार", bengali: "ফসল উপদেষ্টা", odia: "ଫସଲ ପରାମର୍ଶଦାତା" },
  "financial health": { hindi: "वित्तीय स्वास्थ्य", marathi: "आर्थिक आरोग्य", bengali: "আর্থিক স্বাস্থ্য", odia: "ଆର୍ଥିକ ସ୍ୱାସ୍ଥ୍ୟ" },
  "advisor": { hindi: "सलाहकार", marathi: "सल्लागार", bengali: "উপদেষ্টা", odia: "ପରାମର୍ଶ" },
  "finance": { hindi: "वित्त", marathi: "वित्त", bengali: "অর্থায়ন", odia: "ଆର୍ଥିକ" },
  "smart market selling advisory": { hindi: "स्मार्ट बाज़ार बिक्री सलाह", marathi: "स्मार्ट बाजार विक्री सल्ला", bengali: "স্মার্ট বাজার বিক্রি পরামর্শ", odia: "ସ୍ମାର୍ଟ ବଜାର ବିକ୍ରି ପରାମର୍ଶ" },
  "optimal apmc mandi realization for your farm": { hindi: "आपके खेत के लिए सर्वोत्तम एपीएमसी मंडी शुद्ध लाभ", marathi: "आपल्या शेतासाठी सर्वोत्तम एपीएमसी बाजार समिती निव्वळ नफा", bengali: "আপনার খামারের জন্য সর্বোত্তম এপিএমসি মান্ডি লাভ", odia: "ଆପଣଙ୍କ ଜମି ପାଇଁ ସର୍ବୋତ୍ତମ ଏପିଏମସି ମଣ୍ଡି ଲାଭ" },
  "mandi pricing & net realization": { hindi: "मंडी भाव एवं शुद्ध लाभ", marathi: "बाजारभाव आणि निव्वळ नफा", bengali: "মান্ডি মূল্য ও নিট লাভ", odia: "ମଣ୍ଡି ମୂଲ୍ୟ ଓ ଶୁଦ୍ଧ ଲାଭ" },
  "net returns after transport & handling costs": { hindi: "परिवहन और मंडी शुल्क घटाने के बाद शुद्ध लाभ", marathi: "वाहतूक आणि हाताळणी खर्च वजा करून निव्वळ नफा", bengali: "পরিবহন ও হ্যান্ডলিং খরচ বাদে নিট লাভ", odia: "ପରିବହନ ଓ ମଣ୍ଡି ଖର୍ଚ୍ଚ କାଟିବା ପରେ ଶୁଦ୍ଧ ଲାଭ" },
  "real-time apmc analysis": { hindi: "वास्तविक समय मंडी विश्लेषण", marathi: "प्रत्यक्ष वेळ बाजार समिती विश्लेषण", bengali: "রিয়েল-টাইম মান্ডি বিশ্লেষণ", odia: "ରିଅଲ-ଟାଇମ ମଣ୍ଡି ବିଶ୍ଳେଷଣ" },
  "market price": { hindi: "बाज़ार भाव", marathi: "बाजारभाव", bengali: "বাজার মূল্য", odia: "ବଜାର ମୂଲ୍ୟ" },
  "net realization": { hindi: "शुद्ध आय", marathi: "निव्वळ प्राप्ती", bengali: "নিট প্রাপ্তি", odia: "ଶୁଦ୍ଧ ଆୟ" },
  "transport cost": { hindi: "परिवहन लागत", marathi: "वाहतूक खर्च", bengali: "পরিবহন খরচ", odia: "ପରିବହନ ଖର୍ଚ୍ଚ" },
  "market fee": { hindi: "मंडी शुल्क", marathi: "बाजार शुल्क", bengali: "বাজার ফি", odia: "ବଜାର ଶୁଳ୍କ" },
  "sell now": { hindi: "अभी बेचें", marathi: "आत्ता विका", bengali: "এখনই বিক্রি করুন", odia: "ଏବେ ବିକ୍ରି କରନ୍ତୁ" },
  "hold": { hindi: "प्रतीक्षा करें", marathi: "थांबा", bengali: "অপেক্ষা করুন", odia: "ଅପେକ୍ଷା କରନ୍ତୁ" },

  // ── Risk / Financial ──────────────────────────────────────────
  "distress score": { hindi: "जोखिम सूचकांक", marathi: "जोखीम निर्देशांक", bengali: "ঝুঁকি সূচক", odia: "ଆଶଙ୍କା ସୂଚକାଙ୍କ" },
  "financial resilience": { hindi: "वित्तीय स्थिरता", marathi: "आर्थिक स्थिरता", bengali: "আর্থিক স্থিতিশীলতা", odia: "ଆର୍ଥିକ ସ୍ଥିରତା" },
  "farm money health": { hindi: "खेत का वित्तीय स्वास्थ्य", marathi: "शेत पैसे आरोग्य", bengali: "খামারের আর্থিক স্বাস্থ্য", odia: "ଜମିର ଆର୍ଥିକ ସ୍ୱାସ୍ଥ୍ୟ" },
  "farm overview": { hindi: "खेत अवलोकन", marathi: "शेत आढावा", bengali: "খামারের সংক্ষিপ্ত বিবরণ", odia: "ଜମି ଅବଲୋକନ" },
  "loan & risk": { hindi: "ऋण एवं जोखिम", marathi: "कर्ज आणि जोखीम", bengali: "ঋণ ও ঝুঁকি", odia: "ଋଣ ଓ ଆଶଙ୍କା" },
  "loan check": { hindi: "ऋण जांच", marathi: "कर्ज तपासणी", bengali: "ঋণ পরীক্ষা", odia: "ଋଣ ପରୀକ୍ଷା" },
  "can i safely take a loan for my farm? check your safe limit instantly": { hindi: "क्या मैं अपने खेत के लिए सुरक्षित ऋण ले सकता हूं? अभी जानें", marathi: "मी माझ्या शेतासाठी सुरक्षितपणे कर्ज घेऊ शकतो का? तत्काळ तपासा", bengali: "আমি কি নিরাপদে ঋণ নিতে পারি? এখনই দেখুন", odia: "ମୁଁ କି ମୋ ଜମି ପାଇଁ ନିରାପଦରେ ଋଣ ନେଇପାରିବି? ତୁରନ୍ତ ଦେଖନ୍ତୁ" },
  "simple overview of your farm's income, expenses, and loan safety": { hindi: "आपके खेत की आय, व्यय और ऋण सुरक्षा का सरल सारांश", marathi: "आपल्या शेताचे उत्पन्न, खर्च आणि कर्ज सुरक्षिततेचा सोपा आढावा", bengali: "আপনার খামারের আয়, ব্যয় ও ঋণ নিরাপত্তার সহজ বিবরণ", odia: "ଆପଣଙ୍କ ଜମିର ଆୟ, ବ୍ୟୟ ଓ ଋଣ ସୁରକ୍ଷାର ସରଳ ସାରାଂଶ" },
  "total income": { hindi: "कुल आय", marathi: "एकूण उत्पन्न", bengali: "মোট আয়", odia: "ମୋଟ ଆୟ" },
  "total costs": { hindi: "कुल लागत", marathi: "एकूण खर्च", bengali: "মোট খরচ", odia: "ମୋଟ ଖର୍ଚ୍ଚ" },
  "money left": { hindi: "शेष राशि", marathi: "शिल्लक रक्कम", bengali: "অবশিষ্ট অর্থ", odia: "ବାକି ଟଙ୍କା" },
  "net surplus": { hindi: "शुद्ध लाभ", marathi: "निव्वळ अतिरिक्त", bengali: "নিট উদ্বৃত্ত", odia: "ଶୁଦ୍ଧ ଲାଭ" },
  "net loss": { hindi: "शुद्ध हानि", marathi: "निव्वळ तोटा", bengali: "নিট ক্ষতি", odia: "ଶୁଦ୍ଧ କ୍ଷତି" },
  "payments due": { hindi: "देय भुगतान", marathi: "देय देयके", bengali: "প্রদেয় পেমেন্ট", odia: "ଦେୟ ପୈଠ" },
  "upcoming payments": { hindi: "आगामी भुगतान", marathi: "आगामी देयके", bengali: "আসন্ন পেমেন্ট", odia: "ଆଗାମୀ ପୈଠ" },
  "from registered crops": { hindi: "पंजीकृत फसलों से", marathi: "नोंदणीकृत पिकांपासून", bengali: "নিবন্ধিত ফসল থেকে", odia: "ପଞ୍ଜୀକୃତ ଫସଲରୁ" },
  "inputs & farming costs": { hindi: "निविष्ठाएं एवं कृषि लागत", marathi: "निविष्ठा आणि शेती खर्च", bengali: "ইনপুট ও কৃষি খরচ", odia: "ଇନପୁଟ ଓ କୃଷି ଖର୍ଚ୍ଚ" },
  "profit breakdown": { hindi: "लाभ विश्लेषण", marathi: "नफा विश्लेषण", bengali: "লাভের বিশ্লেষণ", odia: "ଲାଭ ବିଶ୍ଳେଷଣ" },
  "view income & expenses per crop or farm": { hindi: "प्रति फसल या खेत आय-व्यय देखें", marathi: "पीक किंवा शेतानुसार उत्पन्न-खर्च पहा", bengali: "ফসল বা খামার অনুযায়ী আয়-ব্যয় দেখুন", odia: "ଫସଲ ବା ଜମି ଅନୁଯାୟୀ ଆୟ-ବ୍ୟୟ ଦେଖନ୍ତୁ" },
  "view financial details": { hindi: "वित्तीय विवरण देखें", marathi: "आर्थिक तपशील पहा", bengali: "আর্থিক বিবরণ দেখুন", odia: "ଆର୍ଥିକ ବିବରଣୀ ଦେଖନ୍ତୁ" },
  "by crop": { hindi: "फसल अनुसार", marathi: "पिकानुसार", bengali: "ফসল অনুযায়ী", odia: "ଫସଲ ଅନୁଯାୟୀ" },
  "by farm": { hindi: "खेत अनुसार", marathi: "शेतानुसार", bengali: "খামার অনুযায়ী", odia: "ଜମି ଅନୁଯାୟୀ" },
  "add payment": { hindi: "भुगतान जोड़ें", marathi: "देयक जोडा", bengali: "পেমেন্ট যোগ করুন", odia: "ଦେୟ ଯୋଡ଼ନ୍ତୁ" },
  "add a farm and crops to see your profit breakdown": { hindi: "लाभ विश्लेषण देखने के लिए खेत और फसल जोड़ें", marathi: "नफा विश्लेषण पाहण्यासाठी शेत आणि पीक जोडा", bengali: "লাভের বিশ্লেষণ দেখতে খামার ও ফসল যোগ করুন", odia: "ଲାଭ ବିଶ୍ଳେଷଣ ପାଇଁ ଜମି ଓ ଫସଲ ଯୋଡ଼ନ୍ତୁ" },
  "actions pending": { hindi: "लंबित कार्य", marathi: "प्रलंबित कृती", bengali: "অনিষ্পন্ন কাজ", odia: "ବକେୟା କାର୍ଯ୍ୟ" },
  "risk level": { hindi: "जोखिम स्तर", marathi: "जोखीम पातळी", bengali: "ঝুঁকির মাত্রা", odia: "ଆଶଙ୍କା ସ୍ତର" },

  // ── Support Tab ──────────────────────────────────────────────
  "government support platform": { hindi: "सरकारी सहायता एवं किसान कल्याण मंच", marathi: "सरकारी मदत आणि शेतकरी कल्याण व्यासपीठ", bengali: "সরকারি সহায়তা ও কৃষক কল্যাণ প্ল্যাটফর্ম", odia: "ସରକାରୀ ସହାୟତା ଓ କୃଷକ କଲ୍ୟାଣ ମଞ୍ଚ" },
  "schemes": { hindi: "सरकारी योजनाएं", marathi: "सरकारी योजना", bengali: "সরকারি প্রকল্প", odia: "ସରକାରୀ ଯୋଜନା" },
  "loans & credit": { hindi: "ऋण एवं वित्त", marathi: "कर्ज आणि वित्त", bengali: "ঋণ ও অর্থায়ন", odia: "ଋଣ ଓ ଆর্থিক" },
  "apply now": { hindi: "अभी आवेदन करें", marathi: "आत्ता अर्ज करा", bengali: "এখনই আবেদন করুন", odia: "ଏବେ ଆବେଦନ କରନ୍ତୁ" },
  "eligibility": { hindi: "पात्रता", marathi: "पात्रता", bengali: "যোগ্যতা", odia: "ଯୋଗ୍ୟତା" },
  "benefit": { hindi: "लाभ", marathi: "फायदा", bengali: "সুবিধা", odia: "ଲାଭ" },
  "subsidy": { hindi: "सब्सिडी", marathi: "अनुदान", bengali: "ভর্তুকি", odia: "ଭର୍ତୁକି" },
  "loan amount": { hindi: "ऋण राशि", marathi: "कर्जाची रक्कम", bengali: "ঋণের পরিমাণ", odia: "ଋଣ ରାଶି" },
  "interest rate": { hindi: "ब्याज दर", marathi: "व्याज दर", bengali: "সুদের হার", odia: "ସୁଧ ହାର" },

  // ── Common UI ────────────────────────────────────────────────
  "loading": { hindi: "लोड हो रहा है...", marathi: "लोड होत आहे...", bengali: "লোড হচ্ছে...", odia: "ଲୋଡ ହେଉଛି..." },
  "no data available": { hindi: "कोई डेटा उपलब्ध नहीं", marathi: "कोणताही डेटा उपलब्ध नाही", bengali: "কোনো তথ্য নেই", odia: "କୌଣସି ତଥ୍ୟ ନାହିଁ" },
  "view details": { hindi: "विवरण देखें", marathi: "तपशील पहा", bengali: "বিস্তারিত দেখুন", odia: "ବিବরଣ ଦେଖନ୍ତୁ" },
  "refresh": { hindi: "ताज़ा करें", marathi: "रिफ्रेश करा", bengali: "রিফ্রেশ করুন", odia: "ତାଜା କରନ୍ତୁ" },
  "save": { hindi: "सहेजें", marathi: "जतन करा", bengali: "সংরক্ষণ করুন", odia: "ସଞ୍ଚୟ କରନ୍ତୁ" },
  "cancel": { hindi: "रद्द करें", marathi: "रद्द करा", bengali: "বাতিল করুন", odia: "ବାତିଲ କରନ୍ତୁ" },
  "submit": { hindi: "जमा करें", marathi: "सबमिट करा", bengali: "জমা দিন", odia: "ଦାଖଲ କରନ୍ତୁ" },
  "farmer": { hindi: "किसान", marathi: "शेतकरी", bengali: "কৃষক", odia: "କୃଷକ" },
  "farm": { hindi: "खेत", marathi: "शेत", bengali: "খামার", odia: "ଜମି" },
  "crops": { hindi: "फसलें", marathi: "पिके", bengali: "ফসল", odia: "ଫସଲ" },
  "advisory": { hindi: "कृषि सलाह", marathi: "कृषी सल्ला", bengali: "কৃষি পরামর্শ", odia: "କୃଷି ପରାମର୍ଶ" },
  "alert": { hindi: "चेतावनी", marathi: "सतर्कता", bengali: "সতর্কতা", odia: "ସତର୍କତା" },
  "sign out": { hindi: "लॉग आउट", marathi: "बाहेर पडा", bengali: "সাইন আউট", odia: "ସାଇନ ଆଉଟ" },
  "language": { hindi: "भाषा", marathi: "भाषा", bengali: "ভাষা", odia: "ଭାଷା" },
};

// ── Translation fetch with rate-limit awareness ──────────────────────────────
let _rateLimitedUntil = 0;

async function fetchGoogleTranslate(text: string, targetCode: string): Promise<string> {
  if (Date.now() < _rateLimitedUntil) return text;
  try {
    const url = `${GOOGLE_TRANSLATE_BASE}?client=gtx&sl=en&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (resp.status === 429) {
      _rateLimitedUntil = Date.now() + 120_000; // back off 2 minutes
      return text;
    }
    if (!resp.ok) return text;
    const data = await resp.json();
    // Response: [[["translated","original",...],...],...]
    const parts: string[] = (data[0] as Array<Array<string>>)
      .map((chunk) => chunk[0])
      .filter(Boolean);
    return parts.join('') || text;
  } catch {
    return text;
  }
}

export async function translateText(text: string, lang: string): Promise<string> {
  if (lang === 'english' || !text.trim()) return text;

  // 1. Curated dictionary — zero network, instant
  const key = text.trim().toLowerCase();
  if (DICTIONARY[key]?.[lang]) return DICTIONARY[key][lang];

  // 2. localStorage cache — zero network on repeat renders
  const cached = getCachedTranslation(lang, text);
  if (cached) return cached;

  // 3. Google Translate free endpoint (no API key, higher limits)
  const targetCode = LANG_CODES[lang];
  if (targetCode) {
    const translated = await fetchGoogleTranslate(text, targetCode);
    if (translated && translated !== text) {
      setCachedTranslation(lang, text, translated);
      return translated;
    }
  }

  // 4. Silent fallback — show English
  return text;
}

/**
 * Batch translate multiple strings. Cached items cost zero API calls.
 */
export async function translateBatch(texts: string[], lang: string): Promise<string[]> {
  if (lang === 'english') return texts;
  return Promise.all(texts.map(t => translateText(t, lang)));
}

/**
 * Clear any Google Translate cookies to ensure zero DOM mutation glitches.
 */
export function setGoogleTranslateLanguage(_lang: string): void {
  try {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
  } catch {
    // Ignore cookie errors
  }
}
