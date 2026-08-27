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
  homeRecommendedActions: string;
  homeFarmSummary: string;

  // Crop tab
  cropTitle: string;
  cropSowingDate: string;
  cropStage: string;
  cropDaysAgo: string;
  cropAddNew: string;
  cropAddNewFarm: string;
  cropSoilType: string;
  cropIrrigationType: string;

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
  supportSchemesTab: string;
  supportLoansTab: string;
  supportWhyFits: string;
  supportBenefits: string;
  supportTopMatch: string;
  supportOfficialPortal: string;

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

  // Weather & Metrics
  weatherMetrics: string;
  rainfall: string;
  humidity: string;
  windSpeed: string;

  // Common UI Actions
  btnSave: string;
  btnCancel: string;
  btnDelete: string;
  btnRefresh: string;
  btnApply: string;
  btnCalculate: string;
  lblLoading: string;

  // Agro Officer Portal
  roleFarmer: string;
  roleOfficer: string;
  officerPortalTitle: string;
  officerDesignation: string;
  officerLocality: string;
  officerState: string;
  officerDistrict: string;
  officerMunicipality: string;
  officerWard: string;
  officerTotalFarmers: string;
  officerCriticalDistress: string;
  officerElevatedDistress: string;
  officerStableCount: string;
  officerInterventionsActive: string;
  officerFilterAll: string;
  officerFarmerRoster: string;
  officerLocalityMap: string;
  officerInterventionStatus: string;
  officerUpdateIntervention: string;
  officerNotes: string;
  officerFarmerDetails: string;
  officerHighDistressAlert: string;

  // Financial Health Page
  finTitle: string;
  finSubtitle: string;
  finTabOverview: string;
  finTabLoan: string;
  finTotalIncome: string;
  finTotalCosts: string;
  finMoneyLeft: string;
  finPaymentsDue: string;
  finFromRegisteredCrops: string;
  finInputsFarmingCosts: string;
  finNetSurplus: string;
  finNetLoss: string;
  finUpcomingPaymentsCount: string;
  finFarmMoneyHealth: string;
  finHealthStrong: string;
  finHealthModerate: string;
  finHealthNeedsCare: string;
  finHealthRating: string;
  finProfitBreakdown: string;
  finViewIncomeExpenses: string;
  finByCrop: string;
  finByFarm: string;
  finNoCropsRegistered: string;
  finAddFarmCropsHint: string;
  finNoFarmsRegistered: string;
  finManageUpcomingPayments: string;
  finAddPayment: string;
  finNoUpcomingPayments: string;
  finAddPaymentHint: string;
  finLoanCheckTitle: string;
  finLoanCheckSubtitle: string;
  finViewGovSchemes: string;
  finLoanApproved: string;
  finNeedsReview: string;
  finHighRisk: string;
  finLoanRiskScore: string;
  finSuggestedSafeLimit: string;
  finTestLoanAmount: string;
  finRequestedLoanAmount: string;
  finAgtechToggles: string;
  finColdStorage: string;
  finPrecisionAgtech: string;
  finSellStubble: string;
  finProduceSorting: string;
  finCheckLoanSafety: string;
  finEstimatesSafeLimit: string;
  finShowDetailedCalc: string;
  finRiskAnalysisFactors: string;
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
    homeWeatherCard: 'Weather Advisor',
    homeMarketCard: 'Market Price',
    homeDistressCard: 'Distress Risk',
    homeWhatToDo: 'What should I do today?',
    homeNoAdvisories: 'No advisories at the moment. Your farm looks healthy!',
    homeRecommendedActions: 'Recommended actions for today',
    homeFarmSummary: "Today's Farm Summary",
    cropTitle: 'Registered Crops',
    cropSowingDate: 'Sown',
    cropStage: 'Stage',
    cropDaysAgo: 'days ago',
    cropAddNew: 'Add New Crop',
    cropAddNewFarm: 'Add New Farm',
    cropSoilType: 'Soil Type',
    cropIrrigationType: 'Irrigation System',
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
    supportTitle: 'Government Schemes & Agri Loans',
    supportSubtitle: 'Dynamic personalized recommendations based on your farm, crop & financial condition',
    supportApply: 'Apply Now',
    supportEligible: 'Eligible',
    supportSchemesTab: 'Government Schemes',
    supportLoansTab: 'Agricultural Loans',
    supportWhyFits: 'Why this fits your farm',
    supportBenefits: 'Key Benefits & Value',
    supportTopMatch: '⭐ Top Recommended Match',
    supportOfficialPortal: 'Official Portal',
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
    weatherMetrics: 'Weather Metrics',
    rainfall: 'Rainfall',
    humidity: 'Humidity',
    windSpeed: 'Wind Speed',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    btnDelete: 'Delete',
    btnRefresh: 'Sync Data',
    btnApply: 'Apply Now',
    btnCalculate: 'Calculate',
    lblLoading: 'Loading...',
    roleFarmer: 'Farmer',
    roleOfficer: 'Agro Officer',
    officerPortalTitle: 'Agricultural Officer Portal & Locality Distress Monitor',
    officerDesignation: 'Designation / Post',
    officerLocality: 'Jurisdiction Locality',
    officerState: 'State',
    officerDistrict: 'District',
    officerMunicipality: 'Municipality / Block',
    officerWard: 'Ward / Sub-locality',
    officerTotalFarmers: 'Total Farmers',
    officerCriticalDistress: 'Critical Distress',
    officerElevatedDistress: 'Elevated Distress',
    officerStableCount: 'Stable Farmers',
    officerInterventionsActive: 'Active Interventions',
    officerFilterAll: 'All Distress Levels',
    officerFarmerRoster: 'Locality Farmer Roster',
    officerLocalityMap: 'Locality Distress Distribution Map',
    officerInterventionStatus: 'Intervention Status',
    officerUpdateIntervention: 'Update Action Status',
    officerNotes: 'Officer Intervention Notes',
    officerFarmerDetails: 'Farmer Distress & Farm Details',
    officerHighDistressAlert: 'Critical Farmer Action Needed',

    // Financial Health Page
    finTitle: 'Financial Health',
    finSubtitle: "Simple overview of your farm's income, expenses, and loan safety",
    finTabOverview: 'Farm Overview',
    finTabLoan: 'Loan & Risk',
    finTotalIncome: 'Total Income',
    finTotalCosts: 'Total Costs',
    finMoneyLeft: 'Money Left',
    finPaymentsDue: 'Payments Due',
    finFromRegisteredCrops: 'From registered crops',
    finInputsFarmingCosts: 'Inputs & farming costs',
    finNetSurplus: 'Net Surplus',
    finNetLoss: 'Net Loss',
    finUpcomingPaymentsCount: 'upcoming payments',
    finFarmMoneyHealth: 'Farm Money Health',
    finHealthStrong: 'Strong',
    finHealthModerate: 'Moderate',
    finHealthNeedsCare: 'Needs Care',
    finHealthRating: 'Health Rating',
    finProfitBreakdown: 'Profit Breakdown',
    finViewIncomeExpenses: 'View income & expenses per crop or farm',
    finByCrop: 'By Crop',
    finByFarm: 'By Farm',
    finNoCropsRegistered: 'No crops registered yet',
    finAddFarmCropsHint: 'Add a farm and crops to see your profit breakdown',
    finNoFarmsRegistered: 'No farms registered yet',
    finManageUpcomingPayments: 'Manage upcoming loans & farm payments',
    finAddPayment: 'Add Payment',
    finNoUpcomingPayments: 'No upcoming payments due!',
    finAddPaymentHint: 'Click "+ Add Payment" above to record a payment.',
    finLoanCheckTitle: 'Loan Check',
    finLoanCheckSubtitle: 'Can I safely take a loan for my farm? Check your safe limit instantly',
    finViewGovSchemes: 'View Government Loan Schemes →',
    finLoanApproved: 'Loan Approved',
    finNeedsReview: 'Needs Review',
    finHighRisk: 'High Risk',
    finLoanRiskScore: 'Loan Risk Score',
    finSuggestedSafeLimit: 'Suggested Safe Limit',
    finTestLoanAmount: 'Test a Loan Amount & AgTech Assets',
    finRequestedLoanAmount: 'Requested Loan Amount (₹)',
    finAgtechToggles: 'AgTech & Infrastructure Toggles',
    finColdStorage: 'Cold Storage',
    finPrecisionAgtech: 'Precision AgTech',
    finSellStubble: 'Sell Stubble',
    finProduceSorting: 'Produce Sorting',
    finCheckLoanSafety: 'Check Loan Safety',
    finEstimatesSafeLimit: 'Estimates your safe loan limit based on farm capacity.',
    finShowDetailedCalc: 'Show Detailed Calculations & Analysis',
    finRiskAnalysisFactors: 'Risk Analysis Factors:',
  },

  hindi: {
    navHome: 'होम',
    navCrop: 'मेरी फसलें',
    navMarket: 'बाज़ार',
    navAlerts: 'चेतावनी',
    navSupport: 'सहायता',
    navProfile: 'प्रोफ़ाइल',
    homeGreeting: 'नमस्ते',
    homeWeatherCard: 'मौसम सलाहकार',
    homeMarketCard: 'बाज़ार मूल्य',
    homeDistressCard: 'संकट जोखिम',
    homeWhatToDo: 'आज मुझे क्या करना चाहिए?',
    homeNoAdvisories: 'अभी कोई सलाह नहीं है। आपका खेत स्वस्थ है!',
    homeRecommendedActions: 'आज के लिए अनुशंसित कार्य',
    homeFarmSummary: 'आज का कृषि सारांश',
    cropTitle: 'पंजीकृत फसलें',
    cropSowingDate: 'बुआई',
    cropStage: 'अवस्था',
    cropDaysAgo: 'दिन पहले',
    cropAddNew: 'नई फसल जोड़ें',
    cropAddNewFarm: 'नया खेत जोड़ें',
    cropSoilType: 'मिट्टी का प्रकार',
    cropIrrigationType: 'सिंचाई व्यवस्था',
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
    supportTitle: 'सरकारी योजनाएं और कृषि ऋण',
    supportSubtitle: 'आपकी फसल, खेत और वित्तीय स्थिति के आधार पर व्यक्तिगत सिफारिशें',
    supportApply: 'अभी आवेदन करें',
    supportEligible: 'पात्र',
    supportSchemesTab: 'सरकारी योजनाएं',
    supportLoansTab: 'कृषि ऋण',
    supportWhyFits: 'यह आपके खेत के लिए क्यों उपयुक्त है',
    supportBenefits: 'मुख्य लाभ और मूल्य',
    supportTopMatch: '⭐ शीर्ष अनुशंसित विकल्प',
    supportOfficialPortal: 'आधिकारिक पोर्टल',
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
    weatherMetrics: 'मौसम संकेतक',
    rainfall: 'वर्षा',
    humidity: 'नमी',
    windSpeed: 'हवा की गति',
    btnSave: 'सहेजें',
    btnCancel: 'रद्द करें',
    btnDelete: 'हटाएं',
    btnRefresh: 'डेटा अपडेट करें',
    btnApply: 'आवेदन करें',
    btnCalculate: 'गणना करें',
    lblLoading: 'लोड हो रहा है...',
    roleFarmer: 'किसान',
    roleOfficer: 'कृषि अधिकारी',
    officerPortalTitle: 'कृषि अधिकारी पोर्टल और स्थानीय संकट निगरानी',
    officerDesignation: 'पद / पदनाम',
    officerLocality: 'अधिकार क्षेत्र',
    officerState: 'राज्य',
    officerDistrict: 'जिला',
    officerMunicipality: 'नगरपालिका / ब्लॉक',
    officerWard: 'वार्ड / उप-क्षेत्र',
    officerTotalFarmers: 'कुल किसान',
    officerCriticalDistress: 'गंभीर संकट',
    officerElevatedDistress: 'बढ़ा हुआ संकट',
    officerStableCount: 'स्थिर किसान',
    officerInterventionsActive: 'सक्रिय हस्तक्षेप',
    officerFilterAll: 'सभी संकट स्तर',
    officerFarmerRoster: 'स्थानीय किसान सूची',
    officerLocalityMap: 'संकट वितरण मानचित्र',
    officerInterventionStatus: 'हस्तक्षेप स्थिति',
    officerUpdateIntervention: 'स्थिति अपडेट करें',
    officerNotes: 'अधिकारी हस्तक्षेप टिप्पणी',
    officerFarmerDetails: 'किसान संकट व विवरण',
    officerHighDistressAlert: 'तत्काल सहायता आवश्यक',

    // Financial Health Page
    finTitle: 'वित्तीय स्थिति',
    finSubtitle: 'आपकी खेती की आय, खर्च और ऋण सुरक्षा का सरल विवरण',
    finTabOverview: 'खेती का अवलोकन',
    finTabLoan: 'ऋण व जोखिम जाँच',
    finTotalIncome: 'कुल आय',
    finTotalCosts: 'कुल खर्च',
    finMoneyLeft: 'बचत राशि',
    finPaymentsDue: 'देय भुगतान',
    finFromRegisteredCrops: 'दर्ज फसलों से',
    finInputsFarmingCosts: 'लागत एवं खेती के खर्च',
    finNetSurplus: 'शुद्ध मुनाफा',
    finNetLoss: 'शुद्ध नुकसान',
    finUpcomingPaymentsCount: 'आगामी भुगतान',
    finFarmMoneyHealth: 'खेती की वित्तीय स्थिति',
    finHealthStrong: 'मजबूत',
    finHealthModerate: 'मध्यम',
    finHealthNeedsCare: 'ध्यान देने योग्य',
    finHealthRating: 'स्वास्थ्य रेटिंग',
    finProfitBreakdown: 'मुनाफा विवरण',
    finViewIncomeExpenses: 'फसल या खेत अनुसार आय और खर्च देखें',
    finByCrop: 'फसल अनुसार',
    finByFarm: 'खेत अनुसार',
    finNoCropsRegistered: 'अभी कोई फसल दर्ज नहीं है',
    finAddFarmCropsHint: 'मुनाफा विवरण देखने के लिए खेत और फसल जोड़ें',
    finNoFarmsRegistered: 'अभी कोई खेत दर्ज नहीं है',
    finManageUpcomingPayments: 'आगामी ऋण और खेती भुगतानों का प्रबंधन करें',
    finAddPayment: 'नया भुगतान जोड़ें',
    finNoUpcomingPayments: 'कोई आगामी देय भुगतान नहीं है!',
    finAddPaymentHint: 'भुगतान दर्ज करने के लिए ऊपर "+ नया भुगतान जोड़ें" पर क्लिक करें।',
    finLoanCheckTitle: 'ऋण सुरक्षा जाँच',
    finLoanCheckSubtitle: 'क्या मैं अपनी खेती के लिए सुरक्षित ऋण ले सकता हूँ? तुरंत अपनी सुरक्षित सीमा जांचें',
    finViewGovSchemes: 'सरकारी ऋण योजनाएं देखें →',
    finLoanApproved: 'ऋण स्वीकृत',
    finNeedsReview: 'समीक्षा की आवश्यकता',
    finHighRisk: 'उच्च जोखिम',
    finLoanRiskScore: 'ऋण जोखिम स्कोर',
    finSuggestedSafeLimit: 'सुझाई गई सुरक्षित सीमा',
    finTestLoanAmount: 'ऋण राशि और कृषि तकनीक संपत्ति जांचें',
    finRequestedLoanAmount: 'वांछित ऋण राशि (₹)',
    finAgtechToggles: 'कृषि तकनीक एवं बुनियादी ढांचा',
    finColdStorage: 'शीतगृह (Cold Storage)',
    finPrecisionAgtech: 'सटीक कृषि तकनीक',
    finSellStubble: 'पराली बेचना',
    finProduceSorting: 'उपज छंटाई (Sorting)',
    finCheckLoanSafety: 'ऋण सुरक्षा जांचें',
    finEstimatesSafeLimit: 'आपकी खेत क्षमता के आधार पर सुरक्षित ऋण सीमा का अनुमान लगाता है।',
    finShowDetailedCalc: 'विस्तृत गणना और विश्लेषण देखें',
    finRiskAnalysisFactors: 'जोखिम विश्लेषण कारक:',
  },

  marathi: {
    navHome: 'मुख्यपृष्ठ',
    navCrop: 'माझी पिके',
    navMarket: 'बाजार',
    navAlerts: 'सूचना',
    navSupport: 'मदत',
    navProfile: 'प्रोफाइल',
    homeGreeting: 'नमस्कार',
    homeWeatherCard: 'हवामान सल्लागार',
    homeMarketCard: 'बाजारभाव',
    homeDistressCard: 'संकट जोखीम',
    homeWhatToDo: 'आज मी काय करावे?',
    homeNoAdvisories: 'सध्या कोणतीही सल्ला नाही. आपले शेत निरोगी आहे!',
    homeRecommendedActions: 'आजसाठी शिफारस केलेल्या क्रिया',
    homeFarmSummary: 'आजचा शेती सारांश',
    cropTitle: 'नोंदणीकृत पिके',
    cropSowingDate: 'पेरणी',
    cropStage: 'अवस्था',
    cropDaysAgo: 'दिवसांपूर्वी',
    cropAddNew: 'नवीन पीक जोडा',
    cropAddNewFarm: 'नवीन शेत जोडा',
    cropSoilType: 'मातीचा प्रकार',
    cropIrrigationType: 'सिंचन पद्धत',
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
    supportTitle: 'सरकारी योजना आणि कृषी कर्जे',
    supportSubtitle: 'तुमचे शेत, पीक आणि आर्थिक परिस्थितीवर आधारित वैयक्तिक शिफारसी',
    supportApply: 'आता अर्ज करा',
    supportEligible: 'पात्र',
    supportSchemesTab: 'सरकारी योजना',
    supportLoansTab: 'कृषी कर्जे',
    supportWhyFits: 'हे तुमच्या शेतासाठी का योग्य आहे',
    supportBenefits: 'मुख्य फायदे आणि मूल्य',
    supportTopMatch: '⭐ सर्वोत्तम शिफारस',
    supportOfficialPortal: 'अधिकृत पोर्टल',
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
    weatherMetrics: 'हवामान मेट्रिक्स',
    rainfall: 'पाऊस',
    humidity: 'आर्द्रता',
    windSpeed: 'वाऱ्याचा वेग',
    btnSave: 'जतन करा',
    btnCancel: 'रद्द करा',
    btnDelete: 'काढून टाका',
    btnRefresh: 'डेटा अपडेट करा',
    btnApply: 'अर्ज करा',
    btnCalculate: 'गणना करा',
    lblLoading: 'लोड होत आहे...',
    roleFarmer: 'शेतकरी',
    roleOfficer: 'कृषी अधिकारी',
    officerPortalTitle: 'कृषी अधिकारी पोर्टल व स्थानिक संकट नियंत्रण',
    officerDesignation: 'पदनाम / पद',
    officerLocality: 'अधिकार क्षेत्र',
    officerState: 'राज्य',
    officerDistrict: 'जिल्हा',
    officerMunicipality: 'नगरपालिका / तालुका',
    officerWard: 'वॉर्ड / परिसर',
    officerTotalFarmers: 'एकूण शेतकरी',
    officerCriticalDistress: 'गंभीर संकट',
    officerElevatedDistress: 'वाढलेले संकट',
    officerStableCount: 'स्थिर शेतकरी',
    officerInterventionsActive: 'सक्रिय मदत',
    officerFilterAll: 'सर्व संकट स्तर',
    officerFarmerRoster: 'स्थानिक शेतकरी यादी',
    officerLocalityMap: 'संकट वितरण नकाशा',
    officerInterventionStatus: 'मदत स्थिती',
    officerUpdateIntervention: 'स्थिती अद्ययावत करा',
    officerNotes: 'अधिकारी टिप्पणी',
    officerFarmerDetails: 'शेतकरी संकट तपशील',
    officerHighDistressAlert: 'तत्काळ मदत आवश्यक',

    // Financial Health Page
    finTitle: 'आर्थिक आरोग्य',
    finSubtitle: 'आपल्या शेतीचे उत्पन्न, खर्च आणि कर्ज सुरक्षिततेचा सोपा आढावा',
    finTabOverview: 'शेतीचा आढावा',
    finTabLoan: 'कर्ज व जोखीम तपासणी',
    finTotalIncome: 'एकूण उत्पन्न',
    finTotalCosts: 'एकूण खर्च',
    finMoneyLeft: 'शिल्लक रक्कम',
    finPaymentsDue: 'देय देणी',
    finFromRegisteredCrops: 'नोंदणीकृत पिकांमधून',
    finInputsFarmingCosts: 'बियाणे, खते व शेती खर्च',
    finNetSurplus: 'निव्वळ नफा',
    finNetLoss: 'निव्वळ तोटा',
    finUpcomingPaymentsCount: 'येणारे देय हप्ते',
    finFarmMoneyHealth: 'शेतीचे आर्थिक आरोग्य',
    finHealthStrong: 'बळकट',
    finHealthModerate: 'मध्यम',
    finHealthNeedsCare: 'काळजी घेण्यासारखे',
    finHealthRating: 'आरोग्य रेटिंग',
    finProfitBreakdown: 'नफा-तोटा तपशील',
    finViewIncomeExpenses: 'पिकानुसार किंवा शेतानुसार उत्पन्न आणि खर्च पहा',
    finByCrop: 'पिकानुसार',
    finByFarm: 'शेतानुसार',
    finNoCropsRegistered: 'अद्याप कोणतेही पीक नोंदवलेले नाही',
    finAddFarmCropsHint: 'नफा तपशील पाहण्यासाठी शेत आणि पिके जोडा',
    finNoFarmsRegistered: 'अद्याप कोणतेही शेत नोंदवलेले नाही',
    finManageUpcomingPayments: 'येणारे कर्ज हप्ते व शेती देण्यांचे व्यवस्थापन करा',
    finAddPayment: 'नवीन हप्ता जोडा',
    finNoUpcomingPayments: 'कोणतेही येणारे देय हप्ते नाहीत!',
    finAddPaymentHint: 'नवीन देणी नोंदवण्यासाठी वरील "+ नवीन हप्ता जोडा" वर क्लिक करा.',
    finLoanCheckTitle: 'कर्ज सुरक्षा तपासणी',
    finLoanCheckSubtitle: 'मी माझ्या शेतीसाठी सुरक्षितपणे कर्ज घेऊ शकतो का? आपली सुरक्षित मर्यादा त्वरित तपासा',
    finViewGovSchemes: 'सरकारी कर्ज योजना पहा →',
    finLoanApproved: 'कर्ज मंजूर',
    finNeedsReview: 'पुनरावलोकनाची गरज',
    finHighRisk: 'जास्त जोखीम',
    finLoanRiskScore: 'कर्ज जोखीम गुण',
    finSuggestedSafeLimit: 'सुचवलेली सुरक्षित मर्यादा',
    finTestLoanAmount: 'कर्ज रक्कम आणि कृषी तंत्रज्ञान तपासा',
    finRequestedLoanAmount: 'अपेक्षित कर्ज रक्कम (₹)',
    finAgtechToggles: 'कृषी तंत्रज्ञान आणि सुविधा',
    finColdStorage: 'शीतगृह (Cold Storage)',
    finPrecisionAgtech: 'अचूक शेती तंत्रज्ञान',
    finSellStubble: 'काड/पराटी विक्री',
    finProduceSorting: 'माल प्रतवारी (Sorting)',
    finCheckLoanSafety: 'कर्ज सुरक्षितता तपासा',
    finEstimatesSafeLimit: 'आपल्या शेताच्या क्षमतेनुसार सुरक्षित कर्ज मर्यादेचा अंदाज लावतो.',
    finShowDetailedCalc: 'सविस्तर गणना आणि विश्लेषण पहा',
    finRiskAnalysisFactors: 'जोखीम विश्लेषण घटक:',
  },

  bengali: {
    navHome: 'হোম',
    navCrop: 'আমার ফসল',
    navMarket: 'বাজার',
    navAlerts: 'সতর্কতা',
    navSupport: 'সহায়তা',
    navProfile: 'প্রোফাইল',
    homeGreeting: 'নমস্কার',
    homeWeatherCard: 'আবহাওয়া উপদেষ্টা',
    homeMarketCard: 'বাজার মূল্য',
    homeDistressCard: 'সংকট ঝুঁকি',
    homeWhatToDo: 'আজ আমি কী করব?',
    homeNoAdvisories: 'এখন কোনো পরামর্শ নেই। আপনার খামার সুস্থ!',
    homeRecommendedActions: 'আজকের জন্য প্রস্তাবিত কাজ',
    homeFarmSummary: 'আজকের খামার সারাংশ',
    cropTitle: 'নিবন্ধিত ফসল',
    cropSowingDate: 'বপন',
    cropStage: 'পর্যায়',
    cropDaysAgo: 'দিন আগে',
    cropAddNew: 'নতুন ফসল যোগ করুন',
    cropAddNewFarm: 'নতুন খামার যোগ করুন',
    cropSoilType: 'মাটির ধরন',
    cropIrrigationType: 'সেচ ব্যবস্থা',
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
    supportTitle: 'সরকারি প্রকল্প ও কৃষি ঋণ',
    supportSubtitle: 'আপনার খামার, ফসল ও আর্থিক অবস্থার ভিত্তিতে ব্যক্তিগতকৃত পরামর্শ',
    supportApply: 'এখনই আবেদন করুন',
    supportEligible: 'যোগ্য',
    supportSchemesTab: 'সরকারি প্রকল্প',
    supportLoansTab: 'কৃষি ঋণ',
    supportWhyFits: 'কেন এটি আপনার খামারের উপযোগী',
    supportBenefits: 'মূল সুবিধা ও মান',
    supportTopMatch: '⭐ শীর্ষ প্রস্তাবিত বিকল্প',
    supportOfficialPortal: 'অফিসিয়াল পোর্টাল',
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
    weatherMetrics: 'আবহাওয়া সূচক',
    rainfall: 'বৃষ্টিপাত',
    humidity: 'আর্দ্রতা',
    windSpeed: 'বাতাসের গতি',
    btnSave: 'সংরক্ষণ করুন',
    btnCancel: 'বাতিল করুন',
    btnDelete: 'মুছে ফেলুন',
    btnRefresh: 'ডেটা আপডেট করুন',
    btnApply: 'আবেদন করুন',
    btnCalculate: 'গণনা করুন',
    lblLoading: 'লোড হচ্ছে...',
    roleFarmer: 'কৃষক',
    roleOfficer: 'কৃষি কর্মকর্তা',
    officerPortalTitle: 'কৃষি কর্মকর্তা পোর্টাল ও স্থানীয় সংকট পর্যবেক্ষণ',
    officerDesignation: 'পদবী',
    officerLocality: 'অধিক্ষেত্র',
    officerState: 'রাজ্য',
    officerDistrict: 'জেলা',
    officerMunicipality: 'পৌরসভা / ব্লক',
    officerWard: 'ওয়ার্ড / এলাকা',
    officerTotalFarmers: 'মোট কৃষক',
    officerCriticalDistress: 'গুরুতর সংকট',
    officerElevatedDistress: 'উচ্চ সংকট',
    officerStableCount: 'স্থিতিশীল কৃষক',
    officerInterventionsActive: 'সক্রিয় সহায়তা',
    officerFilterAll: 'সকল সংকট স্তর',
    officerFarmerRoster: 'স্থানীয় কৃষক তালিকা',
    officerLocalityMap: 'সংকট বণ্টন মানচিত্র',
    officerInterventionStatus: 'সহায়তার স্থিতি',
    officerUpdateIntervention: 'স্থিতি আপডেট করুন',
    officerNotes: 'কর্মকর্তার মন্তব্য',
    officerFarmerDetails: 'কৃষক সংকট ও খামারের তথ্য',
    officerHighDistressAlert: 'জরুরি সহায়তা প্রয়োজন',

    // Financial Health Page
    finTitle: 'আর্থিক স্বাস্থ্য',
    finSubtitle: 'আপনার খামারের আয়, ব্যয় এবং ঋণ সুরক্ষার সহজ বিবরণ',
    finTabOverview: 'খামারের সংক্ষিপ্তসার',
    finTabLoan: 'ঋণ ও ঝুঁকি পরীক্ষা',
    finTotalIncome: 'মোট আয়',
    finTotalCosts: 'মোট খরচ',
    finMoneyLeft: 'অবশিষ্ট টাকা',
    finPaymentsDue: 'বকেয়া পরিশোধ',
    finFromRegisteredCrops: 'নিবন্ধিত ফসল থেকে',
    finInputsFarmingCosts: 'বীজ, সার ও চাষের খরচ',
    finNetSurplus: 'নিট লাভ',
    finNetLoss: 'নিট ক্ষতি',
    finUpcomingPaymentsCount: 'আসন্ন বকেয়া পরিশোধ',
    finFarmMoneyHealth: 'খামারের আর্থিক অবস্থা',
    finHealthStrong: 'শক্তিশালী',
    finHealthModerate: 'মাঝারি',
    finHealthNeedsCare: 'যত্ন প্রয়োজন',
    finHealthRating: 'স্বাস্থ্য রেটিং',
    finProfitBreakdown: 'লাভ-ক্ষতির বিবরণ',
    finViewIncomeExpenses: 'ফসল বা খামার অনুযায়ী আয় ও ব্যয় দেখুন',
    finByCrop: 'ফসল অনুযায়ী',
    finByFarm: 'খামার অনুযায়ী',
    finNoCropsRegistered: 'এখনও কোনো ফসল নিবন্ধিত হয়নি',
    finAddFarmCropsHint: 'লাভের বিবরণ দেখতে খামার ও ফসল যোগ করুন',
    finNoFarmsRegistered: 'এখনও কোনো খামার নিবন্ধিত হয়নি',
    finManageUpcomingPayments: 'আসন্ন ঋণ ও খামারের বকেয়া পরিচালনা করুন',
    finAddPayment: 'নতুন বকেয়া যোগ করুন',
    finNoUpcomingPayments: 'কোনো আসন্ন বকেয়া নেই!',
    finAddPaymentHint: 'বকেয়া যোগ করতে উপরে "+ নতুন বকেয়া যোগ করুন" ক্লিক করুন।',
    finLoanCheckTitle: 'ঋণ সুরক্ষা পরীক্ষা',
    finLoanCheckSubtitle: 'আমি কি আমার খামারের জন্য নিরাপদে ঋণ নিতে পারি? অবিলম্বে আপনার নিরাপদ সীমা পরীক্ষা করুন',
    finViewGovSchemes: 'সরকারি ঋণ প্রকল্প দেখুন →',
    finLoanApproved: 'ঋণ অনুমোদিত',
    finNeedsReview: 'পর্যালোচনা প্রয়োজন',
    finHighRisk: 'উচ্চ ঝুঁকি',
    finLoanRiskScore: 'ঋণ ঝুঁকি স্কোর',
    finSuggestedSafeLimit: 'সুপারিশকৃত নিরাপদ সীমা',
    finTestLoanAmount: 'ঋণের পরিমাণ ও কৃষি প্রযুক্তি পরীক্ষা করুন',
    finRequestedLoanAmount: 'আবেদনকৃত ঋণের পরিমাণ (₹)',
    finAgtechToggles: 'কৃষি প্রযুক্তি ও অবকাঠামো',
    finColdStorage: 'হিমাগার (Cold Storage)',
    finPrecisionAgtech: 'সূক্ষ্ম কৃষি প্রযুক্তি',
    finSellStubble: 'খড় বিক্রি',
    finProduceSorting: 'ফসল বাছাইকরণ (Sorting)',
    finCheckLoanSafety: 'ঋণ সুরক্ষা পরীক্ষা করুন',
    finEstimatesSafeLimit: 'আপনার খামারের সক্ষমতার ভিত্তিতে নিরাপদ ঋণ সীমা অনুমান করে।',
    finShowDetailedCalc: 'বিস্তারিত হিসাব ও বিশ্লেষণ দেখুন',
    finRiskAnalysisFactors: 'ঝুঁকি বিশ্লেষণ উপাদান:',
  },

  odia: {
    navHome: 'ଘର',
    navCrop: 'ମୋ ଫସଲ',
    navMarket: 'ବଜାର',
    navAlerts: 'ସତର୍କତା',
    navSupport: 'ସହାୟତା',
    navProfile: 'ପ୍ରୋଫାଇଲ',
    homeGreeting: 'ନମସ୍କାର',
    homeWeatherCard: 'ପାଣିପାଗ ପରାମର୍ଶଦାତା',
    homeMarketCard: 'ବଜାର ମୂଲ୍ୟ',
    homeDistressCard: 'ସଙ୍କଟ ଆଶଙ୍କା',
    homeWhatToDo: 'ଆଜି ମୁଁ କ\'ଣ କରିବି?',
    homeNoAdvisories: 'ଏବେ କୌଣସି ପରାମର୍ଶ ନାହିଁ। ଆପଣଙ୍କ ଖାମାର ସୁସ୍ଥ!',
    homeRecommendedActions: 'ଆଜି ପାଇଁ ସୁପାରିଶ କାର୍ଯ୍ୟ',
    homeFarmSummary: 'ଆଜିର କୃଷି ସାରାଂଶ',
    cropTitle: 'ନିବନ୍ଧିତ ଫସଲ',
    cropSowingDate: 'ବୁଣା',
    cropStage: 'ଅବସ୍ଥା',
    cropDaysAgo: 'ଦିନ ପୂର୍ବରୁ',
    cropAddNew: 'ନୂଆ ଫସଲ ଯୋଡ଼ନ୍ତୁ',
    cropAddNewFarm: 'ନୂଆ ଖାମାର ଯୋଡ଼ନ୍ତୁ',
    cropSoilType: 'ମାଟିର ପ୍ରକାର',
    cropIrrigationType: 'ସିଞ୍ଚନ ବ୍ୟବସ୍ଥା',
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
    supportTitle: 'ସରକାରୀ ଯୋଜନା ଓ କୃଷି ଋଣ',
    supportSubtitle: 'ଆପଣଙ୍କ ଫସଲ, ଜମି ଓ ଆର୍ଥିକ ସ୍ଥିତି ଅନୁସାରେ ବ୍ୟକ୍ତିଗତ ସୁପାରିଶ',
    supportApply: 'ଆବେଦନ କରନ୍ତୁ',
    supportEligible: 'ଯୋଗ୍ୟ',
    supportSchemesTab: 'ସରକାରୀ ଯୋଜନା',
    supportLoansTab: 'କୃଷି ଋଣ',
    supportWhyFits: 'ଏହା ଆପଣଙ୍କ ଜମି ପାଇଁ କାହିଁକି ଉପଯୁକ୍ତ',
    supportBenefits: 'ମୁଖ୍ୟ ଲାଭ ଓ ମୂଲ୍ୟ',
    supportTopMatch: '⭐ ସର୍ବୋତ୍ତମ ସୁପାରିଶ',
    supportOfficialPortal: 'ଅଫିସିଆଲ ପୋର୍ଟାଲ',
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
    weatherMetrics: 'ପାଣିପାଗ ମାପଦଣ୍ଡ',
    rainfall: 'ବର୍ଷା',
    humidity: 'ଆର୍ଦ୍ରତା',
    windSpeed: 'ପବନ ବେଗ',
    btnSave: 'ସଂରକ୍ଷଣ କରନ୍ତୁ',
    btnCancel: 'ବାତିଲ କରନ୍ତୁ',
    btnDelete: 'ଲିଭାନ୍ତୁ',
    btnRefresh: 'ଡାଟା ଅପଡେଟ କରନ୍ତୁ',
    btnApply: 'ଆବେଦନ କରନ୍ତୁ',
    btnCalculate: 'ହିସାବ କରନ୍ତୁ',
    lblLoading: 'ଲୋଡ୍ ହେଉଛି...',
    roleFarmer: 'କୃଷକ',
    roleOfficer: 'କୃଷି ଅଧିକାରୀ',
    officerPortalTitle: 'କୃଷି ଅଧିକାରୀ ପୋର୍ଟାଲ ଓ ଆଞ୍ଚଳିକ ସଙ୍କଟ ନିରୀକ୍ଷଣ',
    officerDesignation: 'ପଦବୀ',
    officerLocality: 'ଅଞ୍ଚଳିକ କ୍ଷେତ୍ର',
    officerState: 'ରାଜ୍ୟ',
    officerDistrict: 'ଜିଲ୍ଲା',
    officerMunicipality: 'ପୌରପାଳିକା / ବ୍ଲକ',
    officerWard: 'ୱାର୍ଡ / ଅଞ୍ଚଳ',
    officerTotalFarmers: 'ମୋଟ କୃଷକ',
    officerCriticalDistress: 'ଗୁରୁତର ସଙ୍କଟ',
    officerElevatedDistress: 'ବୃଦ୍ଧିପ୍ରାପ୍ତ ସଙ୍କଟ',
    officerStableCount: 'ସ୍ଥିର କୃଷକ',
    officerInterventionsActive: 'ସକ୍ରିୟ ସହାୟତା',
    officerFilterAll: 'ସମସ୍ତ ସଙ୍କଟ ସ୍ତର',
    officerFarmerRoster: 'ଆଞ୍ଚଳିକ କୃଷକ ତାଲିକା',
    officerLocalityMap: 'ସଙ୍କଟ ବଣ୍ଟନ ମାନଚିତ୍ର',
    officerInterventionStatus: 'ସହାୟତା ସ୍ଥିତି',
    officerUpdateIntervention: 'ସ୍ଥିତି ଅପଡେଟ କରନ୍ତୁ',
    officerNotes: 'ଅଧିକାରୀ ଟିପ୍ପଣୀ',
    officerFarmerDetails: 'କୃଷକ ସଙ୍କଟ ବିବରଣୀ',
    officerHighDistressAlert: 'ତୁରନ୍ତ ସହାୟତା ଆବଶ୍ୟକ',

    // Financial Health Page
    finTitle: 'ଆର୍ଥିକ ସ୍ଥିତି',
    finSubtitle: 'ଆପଣଙ୍କ ଚାଷର ଆୟ, ଖର୍ଚ୍ଚ ଏବଂ ଋଣ ସୁରକ୍ଷାର ସରଳ ବିବରଣୀ',
    finTabOverview: 'ଚାଷର ଆଭାସ',
    finTabLoan: 'ଋଣ ଓ ଆଶଙ୍କା ଯାଞ୍ଚ',
    finTotalIncome: 'ମୋଟ ଆୟ',
    finTotalCosts: 'ମୋଟ ଖର୍ଚ୍ଚ',
    finMoneyLeft: 'ବଳକା ଟଙ୍କା',
    finPaymentsDue: 'ଦେୟ ଦେଣ',
    finFromRegisteredCrops: 'ପଞ୍ଜୀକୃତ ଫସଲରୁ',
    finInputsFarmingCosts: 'ବିହନ, ଖତ ଓ ଚାଷ ଖର୍ଚ୍ଚ',
    finNetSurplus: 'ନିଟ୍ ଲାଭ',
    finNetLoss: 'ନିଟ୍ କ୍ଷତି',
    finUpcomingPaymentsCount: 'ଆଗାମୀ ଦେୟ',
    finFarmMoneyHealth: 'ଚାଷର ଆର୍ଥିକ ସ୍ୱାସ୍ଥ୍ୟ',
    finHealthStrong: 'ମଜବୁତ',
    finHealthModerate: 'ମଧ୍ୟମ',
    finHealthNeedsCare: 'ଧ୍ୟାନ ଦେବା ଆବଶ୍ୟକ',
    finHealthRating: 'ସ୍ୱାସ୍ଥ୍ୟ ରେଟିଂ',
    finProfitBreakdown: 'ଲାଭ-କ୍ଷତି ବିବରଣୀ',
    finViewIncomeExpenses: 'ଫସଲ କିମ୍ବା ଜମି ଅନୁସାରେ ଆୟ ଓ ଖର୍ଚ୍ଚ ଦେଖନ୍ତୁ',
    finByCrop: 'ଫସଲ ଅନୁସାରେ',
    finByFarm: 'ଜମି ଅନୁସାରେ',
    finNoCropsRegistered: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଫସଲ ପଞ୍ଜୀକୃତ ହୋଇନାହିଁ',
    finAddFarmCropsHint: 'ଲାଭ ବିବରଣୀ ଦେଖିବା ପାଇଁ ଜମି ଓ ଫସଲ ଯୋଡନ୍ତୁ',
    finNoFarmsRegistered: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଜମି ପଞ୍ଜୀକୃତ ହୋଇନାହିଁ',
    finManageUpcomingPayments: 'ଆଗାମୀ ଋଣ ଓ ଚାଷ ଦେୟ ପରିଚାଳନା କରନ୍ତୁ',
    finAddPayment: 'ନୂଆ ଦେୟ ଯୋଡନ୍ତୁ',
    finNoUpcomingPayments: 'କୌଣସି ଆଗାମୀ ଦେୟ ନାହିଁ!',
    finAddPaymentHint: 'ଦେୟ ରେକର୍ଡ କରିବା ପାଇଁ ଉପରେ "+ ନୂଆ ଦେୟ ଯୋଡନ୍ତୁ" କ୍ଲିକ୍ କରନ୍ତୁ।',
    finLoanCheckTitle: 'ଋଣ ସୁରକ୍ଷା ଯାଞ୍ଚ',
    finLoanCheckSubtitle: 'ମୁଁ ମୋ ଚାଷ ପାଇଁ ସୁରକ୍ଷିତ ଭାବେ ଋଣ ନେଇପାରିବି କି? ଆପଣଙ୍କ ସୁରକ୍ଷିତ ସୀମା ଯାଞ୍ଚ କରନ୍ତୁ',
    finViewGovSchemes: 'ସରକାରୀ ଋଣ ଯୋଜନା ଦେଖନ୍ତୁ →',
    finLoanApproved: 'ଋଣ ଅନୁମୋଦିତ',
    finNeedsReview: 'ସମୀକ୍ଷା ଆବଶ୍ୟକ',
    finHighRisk: 'ଉଚ୍ଚ ଆଶଙ୍କା',
    finLoanRiskScore: 'ଋଣ ଆଶଙ୍କା ସ୍କୋର',
    finSuggestedSafeLimit: 'ସୁପାରିଶ କରାଯାଇଥିବା ସୁରକ୍ଷିତ ସୀମା',
    finTestLoanAmount: 'ଋଣ ପରିମାଣ ଓ କୃଷି ପ୍ରଯୁକ୍ତି ଯାଞ୍ଚ କରନ୍ତୁ',
    finRequestedLoanAmount: 'ଆବଶ୍ୟକ ଋଣ ପରିମାଣ (₹)',
    finAgtechToggles: 'କୃଷି ପ୍ରଯୁକ୍ତି ଓ ସୁବିଧା',
    finColdStorage: 'ଶୀତଳ ଭଣ୍ଡାର (Cold Storage)',
    finPrecisionAgtech: 'ସୂକ୍ଷ୍ମ କୃଷି ପ୍ରଯୁକ୍ତି',
    finSellStubble: 'ନଡା ବିକ୍ରି',
    finProduceSorting: 'ଫସଲ ବାଛକରଣ (Sorting)',
    finCheckLoanSafety: 'ଋଣ ସୁରକ୍ଷା ଯାଞ୍ଚ କରନ୍ତୁ',
    finEstimatesSafeLimit: 'ଆପଣଙ୍କ ଜମି କ୍ଷମତା ଅନୁସାରେ ସୁରକ୍ଷିତ ଋଣ ସୀମା ଆକଳନ କରେ।',
    finShowDetailedCalc: 'ବିସ୍ତୃତ ଗଣନା ଓ ବିଶ୍ଲେଷଣ ଦେଖନ୍ତୁ',
    finRiskAnalysisFactors: 'ଆଶଙ୍କା ବିଶ୍ଲେଷଣ କାରକ:',
  },
};
