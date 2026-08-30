import React, { useState, useEffect } from 'react';
import { translateText, getCachedTranslation } from './translate';
import { translations, type LanguageType } from './translations';
import { localizeDigits } from './i18n';

interface TranslatedProps {
  text?: string;
  children?: any;
  lang: LanguageType;
  className?: string;
}

// Memory map of common UI strings to static dictionary entries
const STATIC_LOOKUP: Record<string, keyof typeof translations.english> = {
  'Home': 'navHome',
  'My Crops': 'navCrop',
  'Market': 'navMarket',
  'Alerts': 'navAlerts',
  'Support': 'navSupport',
  'Profile': 'navProfile',
  'Weather Advisor': 'homeWeatherCard',
  'Market Price': 'homeMarketCard',
  'Distress Risk': 'homeDistressCard',
  'Registered Crops': 'cropTitle',
  'Add New Crop': 'cropAddNew',
  'Add New Farm': 'cropAddNewFarm',
  'Mandi Pricing & Net Realization': 'marketTitle',
  'Distance': 'marketDistance',
  'Sticker Price': 'marketStickerPrice',
  'Transport Cost': 'marketTransport',
  'Net Return': 'marketNetReturn',
  'Best Value': 'marketBestValue',
  'Active Alerts & Risk Warnings': 'alertsTitle',
  'Farmer Profile Settings': 'profileTitle',
  'Full Name': 'profileFullName',
  'Phone Number': 'profilePhone',
  'Language Choice': 'profileLanguage',
  'Change Language': 'profileChangeLanguage',
  'Sign Out Session': 'profileSignOut',
  'Stable': 'levelStable',
  'Watch': 'levelWatch',
  'Elevated': 'levelElevated',
  'High Risk': 'levelHigh',
  'Critical': 'levelCritical',
  "Today's Farm Summary": 'homeFarmSummary',
  'Weather Metrics': 'weatherMetrics',
  'Rainfall': 'rainfall',
  'Humidity': 'humidity',
  'Wind Speed': 'windSpeed',
  'Save': 'btnSave',
  'Cancel': 'btnCancel',
  'Delete': 'btnDelete',
  'Sync Data': 'btnRefresh',
  'Apply Now': 'btnApply',
  'Calculate': 'btnCalculate',
  'Loading...': 'lblLoading',
  'officerPortalTitle': 'officerPortalTitle',
  'officerDesignation': 'officerDesignation',
  'officerLocality': 'officerLocality',
  'officerState': 'officerState',
  'officerDistrict': 'officerDistrict',
  'officerMunicipality': 'officerMunicipality',
  'officerWard': 'officerWard',
  'officerTotalFarmers': 'officerTotalFarmers',
  'officerCriticalDistress': 'officerCriticalDistress',
  'officerElevatedDistress': 'officerElevatedDistress',
  'officerStableCount': 'officerStableCount',
  'officerInterventionsActive': 'officerInterventionsActive',
  'officerFilterAll': 'officerFilterAll',
  'officerFarmerRoster': 'officerFarmerRoster',
  'officerLocalityMap': 'officerLocalityMap',
  'officerInterventionStatus': 'officerInterventionStatus',
  'officerUpdateIntervention': 'officerUpdateIntervention',
  'officerNotes': 'officerNotes',
  'officerFarmerDetails': 'officerFarmerDetails',
  'officerHighDistressAlert': 'officerHighDistressAlert',
  'Financial Health': 'finTitle',
  "Simple overview of your farm's income, expenses, and loan safety": 'finSubtitle',
  'Farm Overview': 'finTabOverview',
  'Loan & Risk': 'finTabLoan',
  'Total Income': 'finTotalIncome',
  'Total Costs': 'finTotalCosts',
  'Money Left': 'finMoneyLeft',
  'Payments Due': 'finPaymentsDue',
  'From registered crops': 'finFromRegisteredCrops',
  'Inputs & farming costs': 'finInputsFarmingCosts',
  'Net Surplus': 'finNetSurplus',
  'Net Loss': 'finNetLoss',
  'upcoming payments': 'finUpcomingPaymentsCount',
  'Farm Money Health': 'finFarmMoneyHealth',
  'Strong': 'finHealthStrong',
  'Moderate': 'finHealthModerate',
  'Needs Care': 'finHealthNeedsCare',
  'Health Rating': 'finHealthRating',
  'Profit Breakdown': 'finProfitBreakdown',
  'View income & expenses per crop or farm': 'finViewIncomeExpenses',
  'By Crop': 'finByCrop',
  'By Farm': 'finByFarm',
  'No crops registered yet': 'finNoCropsRegistered',
  'Add a farm and crops to see your profit breakdown': 'finAddFarmCropsHint',
  'No farms registered yet': 'finNoFarmsRegistered',
  'Manage upcoming loans & farm payments': 'finManageUpcomingPayments',
  'Add Payment': 'finAddPayment',
  'No upcoming payments due!': 'finNoUpcomingPayments',
  'Click "+ Add Payment" above to record a payment.': 'finAddPaymentHint',
  'Loan Check': 'finLoanCheckTitle',
  'Can I safely take a loan for my farm? Check your safe limit instantly': 'finLoanCheckSubtitle',
  'View Government Loan Schemes →': 'finViewGovSchemes',
  'Loan Approved': 'finLoanApproved',
  'Needs Review': 'finNeedsReview',
  'Loan Risk Score': 'finLoanRiskScore',
  'Suggested Safe Limit': 'finSuggestedSafeLimit',
  'Test a Loan Amount & AgTech Assets': 'finTestLoanAmount',
  'Requested Loan Amount (₹)': 'finRequestedLoanAmount',
  'AgTech & Infrastructure Toggles': 'finAgtechToggles',
  'Cold Storage': 'finColdStorage',
  'Precision AgTech': 'finPrecisionAgtech',
  'Sell Stubble': 'finSellStubble',
  'Produce Sorting': 'finProduceSorting',
  'Check Loan Safety': 'finCheckLoanSafety',
  'Estimates your safe loan limit based on farm capacity.': 'finEstimatesSafeLimit',
  'Show Detailed Calculations & Analysis': 'finShowDetailedCalc',
  'Risk Analysis Factors:': 'finRiskAnalysisFactors',
};

function extractTextContent(text?: string, children?: any): string {
  if (typeof text === 'string' && text.length > 0) return text;
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children
      .map((c) => {
        if (typeof c === 'string' || typeof c === 'number') return String(c);
        if (React.isValidElement(c) && typeof (c.props as any)?.children === 'string') {
          return (c.props as any).children;
        }
        return '';
      })
      .join('');
  }
  return '';
}

export const T: React.FC<TranslatedProps> = ({ text, children, lang, className }) => {
  const content = extractTextContent(text, children);

  // 1. If English or empty, return raw content
  if (lang === 'english' || !content.trim()) {
    return <span className={className}>{content || children}</span>;
  }

  // 2. Check static lookup
  const trimmed = content.trim();
  const staticKey = STATIC_LOOKUP[trimmed];
  if (staticKey && translations[lang] && translations[lang][staticKey]) {
    return <span className={className}>{localizeDigits(translations[lang][staticKey], lang)}</span>;
  }

  // 3. State for dynamic translation
  const cached = getCachedTranslation(lang, trimmed);
  const [translated, setTranslated] = useState<string>(cached ? localizeDigits(cached, lang) : localizeDigits(trimmed, lang));

  useEffect(() => {
    if (!trimmed) {
      setTranslated(trimmed);
      return;
    }

    const cachedVal = getCachedTranslation(lang, trimmed);
    if (cachedVal) {
      setTranslated(localizeDigits(cachedVal, lang));
      return;
    }

    let isMounted = true;
    translateText(trimmed, lang).then((res) => {
      if (isMounted) {
        setTranslated(localizeDigits(res, lang));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [trimmed, lang]);

  return <span className={className}>{localizeDigits(translated, lang)}</span>;
};

export default T;
