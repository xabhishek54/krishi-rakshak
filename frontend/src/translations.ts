export type LanguageType = 'english' | 'hindi' | 'odia' | 'bengali' | 'marathi';

export interface Translations {
  // Nav
  navHome: string;
  navCrop: string;
  navMarket: string;
  navAlerts: string;
  navSupport: string;
  navProfile: string;

  // Home
  homeGreeting: string;
  homeWeatherCard: string;
  homeMarketCard: string;
  homeDistressCard: string;
  homeWhatToDo: string;
  homeNoAdvisories: string;

  // Crop tab
  cropTitle: string;
  cropSowingDate: string;
  cropStage: string;
  cropDaysAgo: string;
  cropAddNew: string;
  cropAddNewFarm: string;

  // Market tab
  marketTitle: string;
  marketMandiName: string;
  marketDistance: string;
  marketStickerPrice: string;
  marketTransport: string;
  marketFees: string;
  marketNetReturn: string;
  marketBestValue: string;

  // Alerts tab
  alertsTitle: string;
  alertsNoAlerts: string;

  // Support tab
  supportTitle: string;
  supportSubtitle: string;
  supportApply: string;
  supportEligible: string;

  // Risk tab
  riskTitle: string;
  riskScenarioNormal: string;
  riskScenarioCurrent: string;
  riskScenarioStress: string;
  riskNetIncome: string;
  riskObligations: string;
  riskCoverage: string;
  riskAddObligation: string;
  riskObligationTitle: string;

  // Profile tab
  profileTitle: string;
  profileFullName: string;
  profilePhone: string;
  profileLanguage: string;
  profileLocation: string;
  profileChangeLanguage: string;
  profileSignOut: string;

  // Distress levels
  levelStable: string;
  levelWatch: string;
  levelElevated: string;
  levelHigh: string;
  levelCritical: string;
}

export const translations: Record<LanguageType, Translations> = {
  english: {
    navHome: 'Home',
    navCrop: 'My Crops',
    navMarket: 'Market',
    navAlerts: 'Alerts',
    navSupport: 'Support',
    navProfile: 'Profile',
    homeGreeting: 'Good morning',
    homeWeatherCard: 'Weather',
    homeMarketCard: 'Market Price',
    homeDistressCard: 'Distress Risk',
    homeWhatToDo: 'What should I do today?',
    homeNoAdvisories: 'No advisories at the moment. Your farm looks healthy!',
    cropTitle: 'Registered Crops',
    cropSowingDate: 'Sown',
    cropStage: 'Stage',
    cropDaysAgo: 'days ago',
    cropAddNew: 'Add New Crop',
    cropAddNewFarm: 'Add New Farm',
    marketTitle: 'Mandi Pricing & Net Realization',
    marketMandiName: 'Mandi Name',
    marketDistance: 'Distance',
    marketStickerPrice: 'Sticker Price',
    marketTransport: 'Transport Cost',
    marketFees: 'Mandi Fees (2%)',
    marketNetReturn: 'Net Return',
    marketBestValue: 'Best Value',
    alertsTitle: 'Active Alerts & Risk Warnings',
    alertsNoAlerts: 'No active alerts. Your farm conditions are stable.',
    supportTitle: 'Matched Government Support Schemes',
    supportSubtitle: 'Eligibility based on crop type, distress score, and location',
    supportApply: 'Apply Portal',
    supportEligible: 'Eligible',
    riskTitle: 'Farm Financial Resilience',
    riskScenarioNormal: 'Normal Baseline',
    riskScenarioCurrent: 'Current Forecast',
    riskScenarioStress: 'Stress Scenario (-30%)',
    riskNetIncome: 'Projected Net Income',
    riskObligations: 'Obligations Due',
    riskCoverage: 'Coverage Ratio',
    riskAddObligation: '+ Add Obligation',
    riskObligationTitle: 'Upcoming Financial Obligations',
    profileTitle: 'Farmer Profile Settings',
    profileFullName: 'Full Name',
    profilePhone: 'Phone Number',
    profileLanguage: 'Language Choice',
    profileLocation: 'Default Block',
    profileChangeLanguage: 'Change Language',
    profileSignOut: 'Sign Out Session',
    levelStable: 'Stable',
    levelWatch: 'Watch',
    levelElevated: 'Elevated',
    levelHigh: 'High Risk',
    levelCritical: 'Critical',
  },

  hindi: {
    navHome: 'होम',
    navCrop: 'मेरी फसलें',
    navMarket: 'बाज़ार',
    navAlerts: 'चेतावनी',
    navSupport: 'सहायता',
    navProfile: 'प्रोफ़ाइल',
    homeGreeting: 'सुप्रभात',
    homeWeatherCard: 'मौसम',
    homeMarketCard: 'बाज़ार मूल्य',
    homeDistressCard: 'संकट जोखिम',
    homeWhatToDo: 'आज मुझे क्या करना चाहिए?',
    homeNoAdvisories: 'अभी कोई सलाह नहीं है। आपका खेत स्वस्थ है!',
    cropTitle: 'पंजीकृत फसलें',
    cropSowingDate: 'बुआई',
    cropStage: 'अवस्था',
    cropDaysAgo: 'दिन पहले',
    cropAddNew: 'नई फसल जोड़ें',
    cropAddNewFarm: 'नया खेत जोड़ें',
    marketTitle: 'मंडी मूल्य और शुद्ध प्राप्ति',
    marketMandiName: 'मंडी नाम',
    marketDistance: 'दूरी',
    marketStickerPrice: 'बाज़ार भाव',
    marketTransport: 'परिवहन खर्च',
    marketFees: 'मंडी शुल्क (2%)',
    marketNetReturn: 'शुद्ध आय',
    marketBestValue: 'सर्वोत्तम मूल्य',
    alertsTitle: 'सक्रिय चेतावनियाँ',
    alertsNoAlerts: 'कोई चेतावनी नहीं। आपका खेत सुरक्षित है।',
    supportTitle: 'मिलान की गई सरकारी योजनाएँ',
    supportSubtitle: 'फसल प्रकार, संकट स्कोर और स्थान के आधार पर पात्रता',
    supportApply: 'आवेदन पोर्टल',
    supportEligible: 'पात्र',
    riskTitle: 'कृषि वित्तीय लचीलापन',
    riskScenarioNormal: 'सामान्य आधार',
    riskScenarioCurrent: 'वर्तमान पूर्वानुमान',
    riskScenarioStress: 'तनाव परिदृश्य (-30%)',
    riskNetIncome: 'अनुमानित शुद्ध आय',
    riskObligations: 'देय दायित्व',
    riskCoverage: 'कवरेज अनुपात',
    riskAddObligation: '+ दायित्व जोड़ें',
    riskObligationTitle: 'आगामी वित्तीय दायित्व',
    profileTitle: 'किसान प्रोफ़ाइल सेटिंग्स',
    profileFullName: 'पूरा नाम',
    profilePhone: 'फ़ोन नंबर',
    profileLanguage: 'भाषा चयन',
    profileLocation: 'डिफ़ॉल्ट ब्लॉक',
    profileChangeLanguage: 'भाषा बदलें',
    profileSignOut: 'सत्र समाप्त करें',
    levelStable: 'स्थिर',
    levelWatch: 'सतर्क',
    levelElevated: 'उन्नत',
    levelHigh: 'उच्च जोखिम',
    levelCritical: 'गंभीर',
  },

  marathi: {
    navHome: 'मुख्यपृष्ठ',
    navCrop: 'माझी पिके',
    navMarket: 'बाजार',
    navAlerts: 'सूचना',
    navSupport: 'मदत',
    navProfile: 'प्रोफाइल',
    homeGreeting: 'शुभ सकाळ',
    homeWeatherCard: 'हवामान',
    homeMarketCard: 'बाजारभाव',
    homeDistressCard: 'संकट जोखीम',
    homeWhatToDo: 'आज मी काय करावे?',
    homeNoAdvisories: 'सध्या कोणतीही सल्ला नाही. आपले शेत निरोगी आहे!',
    cropTitle: 'नोंदणीकृत पिके',
    cropSowingDate: 'पेरणी',
    cropStage: 'अवस्था',
    cropDaysAgo: 'दिवसांपूर्वी',
    cropAddNew: 'नवीन पीक जोडा',
    cropAddNewFarm: 'नवीन शेत जोडा',
    marketTitle: 'बाजार दर आणि निव्वळ परतावा',
    marketMandiName: 'बाजार नाव',
    marketDistance: 'अंतर',
    marketStickerPrice: 'बाजारभाव',
    marketTransport: 'वाहतूक खर्च',
    marketFees: 'बाजार शुल्क (2%)',
    marketNetReturn: 'निव्वळ उत्पन्न',
    marketBestValue: 'सर्वोत्तम मूल्य',
    alertsTitle: 'सक्रिय सूचना',
    alertsNoAlerts: 'कोणतीही सूचना नाही. शेत सुरक्षित आहे.',
    supportTitle: 'जुळलेल्या सरकारी योजना',
    supportSubtitle: 'पीक प्रकार, संकट गुण आणि स्थानावर आधारित पात्रता',
    supportApply: 'अर्ज पोर्टल',
    supportEligible: 'पात्र',
    riskTitle: 'कृषी आर्थिक लवचिकता',
    riskScenarioNormal: 'सामान्य आधाररेषा',
    riskScenarioCurrent: 'सध्याचा अंदाज',
    riskScenarioStress: 'ताण परिस्थिती (-30%)',
    riskNetIncome: 'अपेक्षित निव्वळ उत्पन्न',
    riskObligations: 'देय जबाबदाऱ्या',
    riskCoverage: 'कवरेज प्रमाण',
    riskAddObligation: '+ जबाबदारी जोडा',
    riskObligationTitle: 'आगामी आर्थिक जबाबदाऱ्या',
    profileTitle: 'शेतकरी प्रोफाइल सेटिंग्ज',
    profileFullName: 'पूर्ण नाव',
    profilePhone: 'फोन नंबर',
    profileLanguage: 'भाषा निवड',
    profileLocation: 'डिफॉल्ट ब्लॉक',
    profileChangeLanguage: 'भाषा बदला',
    profileSignOut: 'सत्र संपवा',
    levelStable: 'स्थिर',
    levelWatch: 'सावध',
    levelElevated: 'उन्नत',
    levelHigh: 'उच्च जोखीम',
    levelCritical: 'गंभीर',
  },

  bengali: {
    navHome: 'হোম',
    navCrop: 'আমার ফসল',
    navMarket: 'বাজার',
    navAlerts: 'সতর্কতা',
    navSupport: 'সহায়তা',
    navProfile: 'প্রোফাইল',
    homeGreeting: 'শুভ সকাল',
    homeWeatherCard: 'আবহাওয়া',
    homeMarketCard: 'বাজার মূল্য',
    homeDistressCard: 'সংকট ঝুঁকি',
    homeWhatToDo: 'আজ আমি কী করব?',
    homeNoAdvisories: 'এখন কোনো পরামর্শ নেই। আপনার খামার সুস্থ!',
    cropTitle: 'নিবন্ধিত ফসল',
    cropSowingDate: 'বপন',
    cropStage: 'পর্যায়',
    cropDaysAgo: 'দিন আগে',
    cropAddNew: 'নতুন ফসল যোগ করুন',
    cropAddNewFarm: 'নতুন খামার যোগ করুন',
    marketTitle: 'মান্ডি মূল্য ও নিট আয়',
    marketMandiName: 'মান্ডির নাম',
    marketDistance: 'দূরত্ব',
    marketStickerPrice: 'বাজার মূল্য',
    marketTransport: 'পরিবহন খরচ',
    marketFees: 'মান্ডি ফি (২%)',
    marketNetReturn: 'নিট আয়',
    marketBestValue: 'সেরা মূল্য',
    alertsTitle: 'সক্রিয় সতর্কতা',
    alertsNoAlerts: 'কোনো সতর্কতা নেই। খামার নিরাপদ।',
    supportTitle: 'মিলানো সরকারি সহায়তা প্রকল্প',
    supportSubtitle: 'ফসলের ধরন, সংকট স্কোর এবং অবস্থানের ভিত্তিতে যোগ্যতা',
    supportApply: 'আবেদন পোর্টাল',
    supportEligible: 'যোগ্য',
    riskTitle: 'কৃষি আর্থিক স্থিতিস্থাপকতা',
    riskScenarioNormal: 'স্বাভাবিক ভিত্তি',
    riskScenarioCurrent: 'বর্তমান পূর্বাভাস',
    riskScenarioStress: 'চাপের পরিস্থিতি (-৩০%)',
    riskNetIncome: 'অনুমানিত নিট আয়',
    riskObligations: 'প্রদেয় বাধ্যবাধকতা',
    riskCoverage: 'কভারেজ অনুপাত',
    riskAddObligation: '+ বাধ্যবাধকতা যোগ করুন',
    riskObligationTitle: 'আসন্ন আর্থিক বাধ্যবাধকতা',
    profileTitle: 'কৃষক প্রোফাইল সেটিংস',
    profileFullName: 'পুরো নাম',
    profilePhone: 'ফোন নম্বর',
    profileLanguage: 'ভাষা নির্বাচন',
    profileLocation: 'ডিফল্ট ব্লক',
    profileChangeLanguage: 'ভাষা পরিবর্তন করুন',
    profileSignOut: 'সেশন শেষ করুন',
    levelStable: 'স্থিতিশীল',
    levelWatch: 'সতর্ক',
    levelElevated: 'উন্নত',
    levelHigh: 'উচ্চ ঝুঁকি',
    levelCritical: 'গুরুতর',
  },

  odia: {
    navHome: 'ଘର',
    navCrop: 'ମୋ ଫସଲ',
    navMarket: 'ବଜାର',
    navAlerts: 'ସତର୍କତା',
    navSupport: 'ସହାୟତା',
    navProfile: 'ପ୍ରୋଫାଇଲ',
    homeGreeting: 'ଶୁଭ ସକାଳ',
    homeWeatherCard: 'ପାଣିପାଗ',
    homeMarketCard: 'ବଜାର ମୂଲ୍ୟ',
    homeDistressCard: 'ସଙ୍କଟ ଆଶଙ୍କା',
    homeWhatToDo: 'ଆଜି ମୁଁ କ\'ଣ କରିବି?',
    homeNoAdvisories: 'ଏବେ କୌଣସି ପରାମର୍ଶ ନାହିଁ। ଆପଣଙ୍କ ଖାମାର ସୁସ୍ଥ!',
    cropTitle: 'ନିବନ୍ଧିତ ଫସଲ',
    cropSowingDate: 'ବୁଣା',
    cropStage: 'ଅବସ୍ଥା',
    cropDaysAgo: 'ଦିନ ପୂର୍ବରୁ',
    cropAddNew: 'ନୂଆ ଫସଲ ଯୋଡ଼ନ୍ତୁ',
    cropAddNewFarm: 'ନୂଆ ଖାମାର ଯୋଡ଼ନ୍ତୁ',
    marketTitle: 'ମଣ୍ଡି ମୂଲ୍ୟ ଏବଂ ଶୁଦ୍ଧ ଆୟ',
    marketMandiName: 'ମଣ୍ଡି ନାମ',
    marketDistance: 'ଦୂରତ୍ୱ',
    marketStickerPrice: 'ବଜାର ଦର',
    marketTransport: 'ପରିବହନ ଖର୍ଚ',
    marketFees: 'ମଣ୍ଡି ଶୁଳ୍କ (2%)',
    marketNetReturn: 'ଶୁଦ୍ଧ ଆୟ',
    marketBestValue: 'ସର୍ବୋତ୍ତମ ମୂଲ୍ୟ',
    alertsTitle: 'ସକ୍ରିୟ ସତର୍କତା',
    alertsNoAlerts: 'କୌଣସି ସତର୍କତା ନାହିଁ। ଖାମାର ସୁରକ୍ଷିତ।',
    supportTitle: 'ଯୋଗ୍ୟ ସରକାରୀ ଯୋଜନା',
    supportSubtitle: 'ଫସଲ ପ୍ରକାର, ସଙ୍କଟ ସ୍କୋର ଏବଂ ସ୍ଥାନ ଭିତ୍ତିରେ ଯୋଗ୍ୟତା',
    supportApply: 'ଆବେଦନ ପୋର୍ଟାଲ',
    supportEligible: 'ଯୋଗ୍ୟ',
    riskTitle: 'କୃଷି ଆର୍ଥିକ ଲଚ୍ଚିଲ ଶକ୍ତି',
    riskScenarioNormal: 'ସ୍ୱାଭାବିକ ଆଧାର',
    riskScenarioCurrent: 'ବର୍ତ୍ତମାନ ପୂର୍ବାନୁମାନ',
    riskScenarioStress: 'ଚାପ ପରିସ୍ଥିତି (-30%)',
    riskNetIncome: 'ଅନୁମାନିତ ଶୁଦ୍ଧ ଆୟ',
    riskObligations: 'ଦେୟ ଦାୟିତ୍ୱ',
    riskCoverage: 'ଆଚ୍ଛାଦନ ଅନୁପାତ',
    riskAddObligation: '+ ଦାୟିତ୍ୱ ଯୋଡ଼ନ୍ତୁ',
    riskObligationTitle: 'ଆଗାମୀ ଆର୍ଥିକ ଦାୟିତ୍ୱ',
    profileTitle: 'କୃଷକ ପ୍ରୋଫାଇଲ ସେଟିଂ',
    profileFullName: 'ପୂର୍ଣ ନାମ',
    profilePhone: 'ଫୋନ ନମ୍ବର',
    profileLanguage: 'ଭାଷା ଚୟନ',
    profileLocation: 'ଡିଫଲ୍ଟ ଖଣ୍ଡ',
    profileChangeLanguage: 'ଭାଷା ପରିବର୍ତ୍ତନ',
    profileSignOut: 'ସେଶନ ଶେଷ କରନ୍ତୁ',
    levelStable: 'ସ୍ଥିର',
    levelWatch: 'ସତର୍କ',
    levelElevated: 'ଉଚ୍ଚ',
    levelHigh: 'ଅଧିକ ଆଶଙ୍କା',
    levelCritical: 'ଗୁରୁତର',
  },
};
