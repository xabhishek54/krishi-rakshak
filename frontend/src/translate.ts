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
  "harvest readiness & market recommendations": { hindi: "फसल पकने की स्थिति एवं बाज़ार सिफारिशें", marathi: "पिक पक्वता आणि बाजार शिफारसी", bengali: "ফসল কাটার প্রস্তুতি ও বাজার সুপারিশ", odia: "ଫସଲ ଅମଳ ସ୍ଥିତି ଓ ବଜାର ସୁପାରିଶ" },
  "ready to sell now": { hindi: "बेचने के लिए तैयार", marathi: "विकण्यासाठी तयार", bengali: "বিক্রি করার জন্য প্রস্তুত", odia: "ବିକ୍ରି ପାଇଁ ପ୍ରସ୍ତୁତ" },
  "growing stage": { hindi: "वृद्धि चरण (विकास जारी)", marathi: "वाढीचा टप्पा", bengali: "বৃদ্ধির পর্যায়", odia: "ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟ" },
  "ready for sale only": { hindi: "केवल बिक्री योग्य फसलें", marathi: "फक्त विक्रीयोग्य पिके", bengali: "শুধুমাত্র বিক্রির উপযোগী ফসল", odia: "କେବଳ ବିକ୍ରି ଉପଯୋଗୀ ଫସଲ" },
  "all registered crops": { hindi: "सभी पंजीकृत फसलें", marathi: "सर्व नोंदणीकृत पिके", bengali: "সমস্ত নিবন্ধিত ফসল", odia: "ସମସ୍ତ ପଞ୍ଜୀକୃତ ଫସଲ" },
  "compare mandis": { hindi: "मंडी तुलना करें", marathi: "बाजार तुलना करा", bengali: "মান্ডি তুলনা করুন", odia: "ମଣ୍ଡି ତୁଳନା କରନ୍ତୁ" },
  "harvest maturity reached. peak net returns available at local mandis.": { hindi: "फसल पूरी तरह पक चुकी है। स्थानीय मंडियों में सर्वाधिक शुद्ध लाभ उपलब्ध है।", marathi: "पिक पूर्णपणे परिपक्व झाले आहे. स्थानिक बाजारात सर्वाधिक नफा उपलब्ध आहे.", bengali: "ফসল পরিপক্ক হয়েছে। স্থানীয় মান্ডিতে সর্বোচ্চ নিট লাভ পাওয়া যাচ্ছে।", odia: "ଫସଲ ସମ୍ପୂର୍ଣ୍ଣ ପାଚିଯାଇଛି। ସ୍ଥାନୀୟ ମଣ୍ଡିରେ ସର୍ବାଧିକ ଶୁଦ୍ଧ ଲାଭ ଉପଲବ୍ଧ।" },
  "currently in growth stage. estimated harvest maturity in ~2-3 weeks.": { hindi: "वर्तमान में वृद्धि चरण में है। लगभग 2-3 सप्ताह में फसल कटाई के लिए तैयार होगी।", marathi: "सध्या वाढीच्या टप्प्यात आहे. सुमारे 2-3 आठवड्यात काढणीसाठी तयार होईल.", bengali: "বর্তমানে বৃদ্ধির পর্যায়ে রয়েছে। আনুমানিক ২-৩ সপ্তাহে কাটার উপযোগী হবে।", odia: "ବର୍ତ୍ତମାନ ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟରେ ଅଛି। ପ୍ରାୟ ୨-୩ ସପ୍ତାହ ମଧ୍ୟରେ ଅମଳ ପାଇଁ ପ୍ରସ୍ତୁତ ହେବ।" },
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

  // ── Risk Alerts & Severity ────────────────────────────────────
  "active risk alerts": { hindi: "सक्रिय जोखिम चेतावनियाँ", marathi: "सक्रिय जोखीम इशारे", bengali: "সক্রিয় ঝুঁকি সতর্কতা", odia: "ସକ୍ରିୟ ସଙ୍କଟ ଚେତାବନୀ" },
  "no active risk alerts today.": { hindi: "आज कोई सक्रिय जोखिम चेतावनी नहीं है।", marathi: "आज कोणताही सक्रिय जोखीम इशारा नाही.", bengali: "আজ কোনো সক্রিয় ঝুঁকি সতর্কতা নেই।", odia: "ଆଜି କୌଣସି ସକ୍ରିୟ ସଙ୍କଟ ଚେତାବନୀ ନାହିଁ।" },
  "critical": { hindi: "गंभीर", marathi: "गंभीर", bengali: "গুরুতর", odia: "ଗୁରୁତର" },
  "elevated": { hindi: "उन्नत", marathi: "उन्नत", bengali: "উন্নত", odia: "ଉଚ୍ଚ" },
  "watch": { hindi: "सतर्क", marathi: "सावध", bengali: "সতর্ক", odia: "ସତର୍କ" },
  "high risk": { hindi: "उच्च जोखिम", marathi: "उच्च जोखीम", bengali: "উচ্চ ঝুঁকি", odia: "ଅଧିକ ଆଶଙ୍କା" },
  "alerts": { hindi: "चेतावनी", marathi: "इशारे", bengali: "সতর্কতা", odia: "ସତର୍କତା" },
  "flash flood & severe waterlogging alert — flash flood warning issued for local district. ensure deep drainage trenches around tomato & onion beds immediately to prevent root rot and crop loss.": {
    hindi: "आकस्मिक बाढ़ एवं गंभीर जलभराव चेतावनी — क्षेत्र में भारी बारिश की चेतावनी जारी। टमाटर और प्याज की क्यारियों के चारों ओर जल निकासी नाली बनाएं ताकि जड़ों के सड़ने और फसल नुकसान को रोका जा सके।",
    marathi: "अचानक पूर आणि पाणी साचण्याची चेतावणी — परिसरात मुसळधार पावसाचा इशारा. टोमॅटो आणि कांद्याच्या पाटांभोवती पाण्याचा निचरा करणारे चर खणा जेणेकरून मूळ कुजणे आणि पिकाचे नुकसान टाळता येईल.",
    bengali: "আকস্মিক বন্যা ও জলাবদ্ধতা সতর্কতা — এলাকায় ভারী বৃষ্টির সতর্কতা জারি। টমেটো ও পেঁয়াজ খেতের চারপাশে পানি নিষ্কাশন নালা তৈরি করুন যাতে মূল পচা ও ফসলের ক্ষতি রোধ করা যায়।",
    odia: "ଆକସ୍ମିକ ବନ୍ୟା ଓ ଜଳବନ୍ଧୀ ସତର୍କତା — ଅଞ୍ଚଳରେ ପ୍ରବଳ ବର୍ଷାର ସତର୍କତା। ଟମାଟୋ ଓ ପିଆଜ କିଆରୀ ଚାରିପାଖରେ ଜଳ ନିଷ୍କାସନ ନାଳ ଖୋଳନ୍ତୁ ଯାହାଫଳରେ ଚେର ସଢ଼ିବା ଓ ଫସଲ ନଷ୍ଟ ରୋକାଯାଇପାରିବ।"
  },
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
  "language": { hindi: "भाषा", marathi: "भाषा", bengali: "भाषा", odia: "ଭାଷା" },
  "disease": { hindi: "रोग एवं कीट सुरक्षा", marathi: "रोग आणि कीड सुरक्षा", bengali: "রোগ ও কীট সুরক্ষা", odia: "ରୋଗ ଓ କୀଟ ସୁରକ୍ଷା" },
  "state direct transfer (₹10,000/acre/season)": { hindi: "राज्य प्रत्यक्ष हस्तांतरण (₹10,000/एकड़/सीजन)", marathi: "राज्य थेट हस्तांतरण (₹10,000/एकर/हंगाम)", bengali: "রাজ্য সরাসরি সহায়তা (₹১০,০০০/একর/মরসুম)", odia: "ରାଜ୍ୟ ସିଧାସଳଖ ସହାୟତା (₹୧୦,୦୦୦/ଏକର/ଋତୁ)" },
  "pm micro food processing enterprises (pm-fme) credit": { hindi: "पीएम सूक्ष्म खाद्य उद्योग प्रसंस्करण (PM-FME) ऋण", marathi: "पीएम सूक्ष्म अन्न प्रक्रिया उद्योग (PM-FME) कर्ज", bengali: "পিএম মাইক্রো ফুড প্রসেসিং (PM-FME) ঋণ", odia: "ପିଏମ ମାଇକ୍ରୋ ଫୁଡ୍ ପ୍ରୋସେସିଂ (PM-FME) ଋଣ" },
  "universal agricultural assistance available for your farm profile": { hindi: "आपके खेत प्रोफ़ाइल के लिए कृषि सहायता उपलब्ध", marathi: "आपल्या शेत प्रोफाईलसाठी कृषी मदत उपलब्ध", bengali: "আপনার খামার প্রোফাইলের জন্য সর্বজনীন কৃষি সহায়তা উপলব্ধ", odia: "ଆପଣଙ୍କ ଜମି ପ୍ରୋଫାଇଲ୍ ପାଇଁ କୃଷି ସହାୟତା ଉପଲବ୍ଧ" },
  "mudra allied agriculture micro-credit": { hindi: "मुद्रा संबद्ध कृषि सूक्ष्म ऋण", marathi: "मुद्रा कृषी संलग्न सूक्ष्म कर्ज", bengali: "মুদ্রা কৃষি মাইক্রো ঋণ", odia: "ମୁଦ୍ରା କୃଷି ମାଇକ୍ରୋ ଋଣ" },
  "micro-irrigation drip subsidy (55-80%)": { hindi: "सूक्ष्म सिंचाई ड्रिप सब्सिडी (55-80%)", marathi: "सूक्ष्म सिंचन ठिबक अनुदान (55-80%)", bengali: "মাইক্রো সেচ ড্রিপ ভর্তুকি (৫৫-৮০%)", odia: "ସୂକ୍ଷ୍ମ ସିଞ୍ଚନ ଡ୍ରିପ୍ ଭର୍ତୁକି (୫୫-୮୦%)" },
  "drip irrigation prevents soil splash and reduces fungal leaf spot infection by 40%.": { hindi: "ड्रिप सिंचाई मिट्टी के छींटे को रोकती है और फंगल लीफ स्पॉट संक्रमण को 40% तक कम करती है।", marathi: "ठिबक सिंचन मातीचे उडणे रोखते आणि बुरशीजन्य पानांच्या ठिपक्यांचा संसर्ग 40% ने कमी करते.", bengali: "ড্রিপ সেচ মাটির ছেটানো রোধ করে এবং ছত্রাকজনিত পাতায় দাগের সংক্রমণ ৪০% হ্রাস করে।", odia: "ଡ୍ରିପ୍ ସିଞ୍ଚନ ମାଟି ଛିଟିକିବା ରୋକେ ଏବଂ ଛତ୍ରାକ ରୋଗ ସଂକ୍ରମଣ ୪୦% ହ୍ରାସ କରେ।" },
  "apply calcium nitrate & boron during flowering stage to prevent blossom end rot fruit cracking.": { hindi: "ब्लॉसम एंड रोट फलों को टूटने से बचाने के लिए पुष्पन चरण में कैल्शियम नाइट्रेट और बोरॉन डालें।", marathi: "फळे तडकणे रोखण्यासाठी फुलोऱ्याच्या टप्प्यात कॅल्शियम नायट्रेट आणि बोरॉन टाका.", bengali: "ফল ফাটা রোধ করতে ফুল ফোটার পর্যায়ে ক্যালসিয়াম নাইট্রেট এবং বোরন প্রয়োগ করুন।", odia: "ଫଳ ଫାଟିବା ରୋକିବା ପାଇଁ ଫୁଲ ଆସିବା ସମୟରେ କ୍ୟାଲସିୟମ୍ ନାଇଟ୍ରେଟ୍ ଏବଂ ବୋରନ୍ ଦିଅନ୍ତୁ।" },
  "high humidity (>78%) promotes early blight; spray copper oxychloride if lower leaves turn spotty.": { hindi: "उच्च आर्द्रता (>78%) अगेती झुलसा को बढ़ावा देती है; यदि निचली पत्तियों पर धब्बे दिखाई दें तो कॉपर ऑक्सीक्लोराइड का छिड़काव करें।", marathi: "जास्त आर्द्रता (>78%) लवकर येणाऱ्या करपा रोगास खतपाणी घालते; खालच्या पानांवर ठिपके दिसल्यास कॉपर ऑक्सिक्लोराईडची फवारणी करा.", bengali: "উচ্চ আর্দ্রতা (>৭৮%) আর্লি ব্লাইট বাড়ায়; নিচের পাতায় দাগ দেখা দিলে কপার অক্সিক্লোরাইড স্প্রে করুন।", odia: "ଅଧିକ ଆର୍ଦ୍ରତା (>୭୮%) ଅଗ୍ରିମ ଝୁଳସା ରୋଗ ବଢ଼ାଏ; ତଳ ପତ୍ରରେ ଦାଗ ଦେଖାଗଲେ କପର ଅକ୍ସିକ୍ଲୋରାଇଡ୍ ସ୍ପ୍ରେ କରନ୍ତୁ।" },
  "stop watering 15 days before harvesting to allow proper bulb hardening and prevent field rot.": { hindi: "कंद को सख्त करने और सड़न रोकने के लिए कटाई से 15 दिन पहले सिंचाई बंद कर दें।", marathi: "कांदा घट्ट होण्यासाठी आणि सड रोखण्यासाठी काढणीच्या १५ दिवस आधी पाणी देणे थांबवा.", bengali: "পেঁয়াজ শক্ত করতে এবং পচন রোধ করতে ফসল কাটার ১৫ দিন আগে জল দেওয়া বন্ধ করুন।", odia: "ପିଆଜ ଶକ୍ତ କରିବା ଓ ପଚନ ରୋକିବା ପାଇଁ ଅମଳର ୧୫ ଦିନ ପୂର୍ବରୁ ପାଣି ଦେବା ବନ୍ଦ କରନ୍ତୁ।" },
  "apply sulphur (20 kg/acre) along with potash to increase bulb pungency, size, and storage life.": { hindi: "कंद का तीखापन, आकार और भंडारण क्षमता बढ़ाने के लिए पोटाश के साथ सल्फर (20 किग्रा/एकड़) डालें।", marathi: "कांद्याचा आकार आणि साठवणूक क्षमता वाढवण्यासाठी पोटॅशसोबत सल्फर (२० किलो/एकर) द्या.", bengali: "পেঁয়াজের আকার ও স্থায়িত্ব বাড়াতে পটাশের সাথে সালফার (২০ কেজি/एकर) প্রয়োগ করুন।", odia: "ପିଆଜ ଆକାର ଓ ସଂରକ୍ଷଣ କ୍ଷମତା ବଢ଼ାଇବା ପାଇଁ ପଟାସ ସହିତ ସଲଫର (୨୦ କିଗ୍ରା/ଏକର) ଦିଅନ୍ତୁ।" },
  "watch for purple blotch during humid days. keep drainage channels clear to prevent waterlogging.": { hindi: "आर्द्र दिनों में पर्पल ब्लॉच पर नज़र रखें। जलजमाव रोकने के लिए जल निकासी नालियों को साफ रखें।", marathi: "दमट दिवसांत जांभळा करपा रोगावर लक्ष ठेवा. पाणी साचू नये म्हणून निचरा नद्या स्वच्छ ठेवा.", bengali: "আর্দ্র দিনে পার্পল ব্লচ রোগের দিকে নজর রাখুন। জলজট রোধ করতে ড্রেনেজ চ্যানেল পরিষ্কার রাখুন।", odia: "ଆର୍ଦ୍ର ଦିନରେ ବାଇଗଣୀ ଝୁଳସା ରୋଗ ଉପରେ ନଜର ରଖନ୍ତୁ। ଜଳନିଷ୍କାସନ ନାଳି ପରିଷ୍କାର ରଖନ୍ତୁ।" },
  "critical watering stage: crown root initiation (21 days) and flowering stage boost grain fill.": { hindi: "सिंचाई का महत्वपूर्ण चरण: क्राउन रूट इनिशिएशन (21 दिन) और पुष्पन चरण दानों का भराव बढ़ाते हैं।", marathi: "सिंचनाचा महत्त्वाचा टप्पा: मुकुट मूळ सुरुवात (२१ दिवस) आणि फुलोरा टप्पा दाणे भरण्यास मदत करतो.", bengali: "সেচের গুরুত্বপূর্ণ পর্যায়: ক্রাউন রুট সূচনা (২১ দিন) এবং ফুল ফোটার পর্যায় দানাপুষ্টি বাড়ায়।", odia: "ଜଳସେଚନର ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପର୍ଯ୍ୟାୟ: ମୂଳ ଆରମ୍ଭ (୨୧ ଦିନ) ଓ ଫୁଲ ଆସିବା ସମୟ ଦାନା ପୂର୍ଣ୍ଣ କରେ।" },
  "split dose of nitrogen: top-dress urea before 1st & 2nd irrigation for heavy, protein-rich grains.": { hindi: "नाइट्रोजन की विभाजित खुराक: भारी और प्रोटीन युक्त दानों के लिए पहली और दूसरी सिंचाई से पहले यूरिया डालें।", marathi: "नायट्रोजनचा विभागून डोस: चांगल्या दाण्यांसाठी पहिल्या व दुसऱ्या सिंचनापूर्वी युरिया द्या.", bengali: "নাইট্রোজেনের বিভক্ত মাত্রা: পুষ্টিকর দানার জন্য ১ম ও ২য় সেচের আগে ইউরিয়া প্রয়োগ করুন।", odia: "ନାଇଟ୍ରୋଜେନ୍ ବିଭାଜିତ ମାତ୍ରା: ଉତ୍ତମ ଦାନା ପାଇଁ ୧ମ ଓ ୨ୟ ସିଞ୍ଚନ ପୂର୍ବରୁ ୟୁରିଆ ଦିଅନ୍ତୁ।" },
  "inspect field edges for yellow/brown rust pustules during cool, misty morning weather.": { hindi: "ठंडी, कोहरे वाली सुबह के दौरान पीला/भूरा रतुआ के लक्षणों के लिए खेत के किनारों का निरीक्षण करें।", marathi: "गारठ्याच्या सकाळी पिवळा/तांबड्या तांबेरा रोगाच्या लक्षणांसाठी शेताच्या कडा तपासा.", bengali: "ঠান্ডা সকালে হলুদ/বাদামী মরিচা রোগের লক্ষণের জন্য খামারের সীমানা পরীক্ষা করুন.", odia: "ଥଣ୍ଡା ସକାଳେ ହଳଦିଆ/ବାଦାମୀ ରତୁଆ ରୋଗ ଲକ୍ଷଣ ପାଇଁ ଜମି କଡ଼ ଯାଞ୍ଚ କରନ୍ତୁ।" },
  "precision drip irrigation is mandatory. regulate water strictly post-pruning to induce uniform buds.": { hindi: "सटीक ड्रिप सिंचाई अनिवार्य है। एक समान कलियों के लिए छंटाई के बाद पानी को सख्ती से नियंत्रित करें।", marathi: "अचूक ठिबक सिंचन अनिवार्य आहे. छाटणीनंतर पाण्याचे तंतोतंत नियोजन करा.", bengali: "সঠিক ড্রিপ সেচ আবশ্যক। কুঁড়ি ফুটানোর জন্য ছাঁটাইয়ের পর জল নিয়ন্ত্রণ করুন।", odia: "ସଠିକ୍ ଡ୍ରିପ୍ ସିଞ୍ଚନ ବାଧ୍ୟତାମୂଳକ। କାଟିବା ପରେ ପାଣି ସନ୍ତୁଳିତ ରଖନ୍ତୁ।" },
  "apply potassium sulphate (sop) and phosphoric acid during berry development to raise °brix sugar.": { hindi: "शर्करा (°Brix) बढ़ाने के लिए फल विकास के दौरान पोटेशियम सल्फेट (SOP) और फास्फोरिक एसिड डालें।", marathi: "साखर प्रमाण (°Brix) वाढवण्यासाठी मण्यांच्या वाढीच्या काळात पोटॅशियम सल्फेट आणि फॉस्फोरिक ॲसिड द्या.", bengali: "মিষ্টতা (°Brix) বাড়াতে ফল বৃদ্ধির সময় পটাশিয়াম সালফেট এবং ফসফরিক অ্যাসিড প্রয়োগ করুন।", odia: "ମିଷ୍ଟତା (°Brix) ବଢ଼ାଇବା ପାଇଁ ଫଳ ବୃଦ୍ଧି ସମୟରେ ପୋଟାସିୟମ୍ ସଲଫେଟ୍ ଦିଅନ୍ତୁ।" },
  "high downy mildew risk in humid/rainy weather. spray systemic fungicide prior to bloom.": { hindi: "आर्द्र/बरसाती मौसम में डाउनी मिल्ड्यू का उच्च जोखिम। फूल आने से पहले प्रणालीगत कवकनाशी का छिड़काव करें।", marathi: "दमट/पावसाळी हवामानात केवडा रोगाचा मोठा धोका. फुलोऱ्याआधी बुरशीनाशकाची फवारणी करा.", bengali: "আর্দ্র/বৃষ্টির আবহাওয়ায় ডাউনি মিলডিউ রোগের ঝুঁকি বেশি। ফুল ফোটার আগে ছত্রাকনাশক স্প্রে করুন।", odia: "ଆର୍ଥିକ ପାଣିପାଗରେ ଛତ୍ରାକ ରୋଗ ଆଶଙ୍କା ଅଧିକ। ଫୁଲ ଆସିବା ପୂର୍ବରୁ ସ୍ପ୍ରେ କରନ୍ତୁ।" },
  "maintain 2-5 cm standing water during active tillering; drain field 10 days before harvesting.": { hindi: "सक्रिय कल्ले निकलने के दौरान 2-5 सेमी खड़ा पानी बनाए रखें; कटाई से 10 दिन पहले खेत सुखा दें।", marathi: "फुटवे येण्याच्या काळात २-५ सेमी पाणी साचवून ठेवा; काढणीच्या १० दिवस आधी शेत वाळवा.", bengali: "কুশি গজানোর সময় ২-৫ সেমি জল ধরে রাখুন; ফসল কাটার ১০ দিন আগে খামার শুকিয়ে নিন।", odia: "ଗଜା ହେବା ସମୟରେ ୨-୫ ସେମି ପାଣି ରଖନ୍ତୁ; ଅମଳର ୧୦ ଦିନ ପୂର୍ବରୁ ପାଣି ବାହାର କରନ୍ତୁ।" },
  "apply zinc sulphate (10 kg/acre) in clay soil to prevent khaira leaf bronzing.": { hindi: "खैरा रोग से बचाव के लिए चिकनी मिट्टी में जिंक सल्फेट (10 किग्रा/एकड़) का प्रयोग करें।", marathi: "खैरा रोग रोखण्यासाठी चिकणमातीत झिंक सल्फेट (१० किलो/एकर) द्या.", bengali: "খাইরা রোগ রোধ করতে কাদা মাটিতে জিঙ্ক সালফেট (১০ কেজি/একর) প্রয়োগ করুন।", odia: "ଖୈରା ରୋଗ ରୋକିବା ପାଇଁ କାଦୁଅ ମାଟିରେ ଜିଙ୍କ ସଲଫେଟ (୧୦ କିଗ୍ରା/ଏକର) ଦିଅନ୍ତୁ।" },
  "warm, humid conditions favor stem borer and blast. check tillers for whiteheads or dead hearts.": { hindi: "गर्म और आर्द्र स्थिति तना छेदक और झुलसा रोग के लिए अनुकूल है। मृत गोप के लिए पौधों की जांच करें।", marathi: "उष्ण व दमट हवामान खोडकिडा व करपा रोगास पोषक असते. सुकलेले अंकुर तपासा.", bengali: "উষ্ণ ও আর্দ্র আবহাওয়া কান্ড পচা ও ব্লাইট বাড়ায়। মরা ডালপালার জন্য পরীক্ষা করুন।", odia: "ଗରମ ଓ ଆର୍ଦ୍ର ପାଣିପାଗ କାଣ୍ଡ ବିନ୍ଧା ପୋକ ବଢ଼ାଏ। ସୁଖିଲା ଗଜା ଯାଞ୍ଚ କରନ୍ତୁ।" },
};

// ── Translation fetch with backend proxy & rate-limit awareness ─────────────
let _rateLimitedUntil = 0;

const DEFAULT_TRANSLATE_API_BASE = 'http://localhost:8000';
function getTranslateApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || DEFAULT_TRANSLATE_API_BASE;
  return String(base).replace(/\/$/, '');
}

async function fetchGoogleTranslate(text: string, targetCode: string, langName?: string): Promise<string> {
  // 1. Primary: Try Backend /api/v1/translate server-side proxy (zero CORS / zero client-side rate limits)
  try {
    const backendUrl = `${getTranslateApiBase()}/api/v1/translate`;
    const resp = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: langName || targetCode }),
      signal: AbortSignal.timeout(4000),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.translated && data.translated !== text) {
        return data.translated;
      }
    }
  } catch {
    // Backend offline / unreachable — fall through to client-side fallbacks
  }

  if (Date.now() < _rateLimitedUntil) return text;

  // 2. Secondary: Client-side MyMemory API Fallback (CORS-friendly API)
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetCode}`;
    const resp = await fetch(mmUrl, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json();
      const res = data?.responseData?.translatedText;
      if (res && res !== text) return res;
    }
  } catch {
    // Fall through to Google GTX
  }

  // 3. Client-side Google GTX (with rate limit protection)
  try {
    const url = `${GOOGLE_TRANSLATE_BASE}?client=gtx&sl=en&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (resp.status === 429) {
      _rateLimitedUntil = Date.now() + 120_000; // back off 2 minutes
      return text;
    }
    if (!resp.ok) return text;
    const data = await resp.json();
    const parts: string[] = (data[0] as Array<Array<string>>)
      .map((chunk) => chunk[0])
      .filter(Boolean);
    return parts.join('') || text;
  } catch {
    return text;
  }
}

import { localizeDigits } from './i18n';

export async function translateText(text: string, lang: string): Promise<string> {
  if (lang === 'english' || !text.trim()) return text;

  // 1. Curated dictionary — zero network, instant
  const key = text.trim().toLowerCase();
  if (DICTIONARY[key]?.[lang]) return localizeDigits(DICTIONARY[key][lang], lang as any);

  // 2. localStorage cache — zero network on repeat renders
  const cached = getCachedTranslation(lang, text);
  if (cached) return localizeDigits(cached, lang as any);

  // 3. Backend Proxy / Online Translation
  const targetCode = LANG_CODES[lang];
  if (targetCode) {
    const translated = await fetchGoogleTranslate(text, targetCode, lang);
    if (translated && translated !== text) {
      setCachedTranslation(lang, text, translated);
      return localizeDigits(translated, lang as any);
    }
  }

  // 4. Silent fallback — show English with localized digits
  return localizeDigits(text, lang as any);
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
