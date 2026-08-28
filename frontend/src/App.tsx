import React, { useState, useEffect } from 'react';
import { translations } from './translations';
import {
  formatCurrency,
  formatInteger,
  formatPerQuintal,
  translateCrop,
  translateStage,
  translateSoil,
  translateIrrigation,
  translateObligation,
  formatDaysAgo,
  formatFarmSummary,
  useNativeDigits,
  capitalize,
} from './i18n';
import { ToastContainer, useToast } from './Toast';
import { getStateList, getDistrictsForState, getDistrictCoords } from './india_locations';
import { speakText, stopSpeech, buildVoiceText, askGemini } from './voice';
import T from './Translated';
import { translateText, setGoogleTranslateLanguage } from './translate';

// Lazy-loaded map picker — load once at module level to avoid remounting
import MapPickerComponent from './MapPicker';
import CommunityMap from './CommunityMap';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
import { 
  Home as HomeIcon, 
  Sprout, 
  ShoppingCart, 
  Bell, 
  HelpCircle, 
  Mic, 
  MessageSquare,
  User, 
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Lock,
  LogOut,
  CloudRain,
  Wind,
  Droplets,
  Trash2,
  Calculator,
  PiggyBank,
  BarChart3,
  Layers,
  Building2,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Circle,
  ExternalLink,
  Volume2,
  Radio,
  Search,
  Plus,
  X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Type declarations
type TabType = 'home' | 'crop' | 'market' | 'alerts' | 'support' | 'risk-detail' | 'profile' | 'community' | 'yield' | 'financial';
type LanguageType = 'english' | 'hindi' | 'odia' | 'bengali' | 'marathi';

interface FarmerProfile {
  name: string;
  phone: string;
  language: LanguageType;
  location_id?: string;
  risk_profile?: string;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isVoicePlaying, setIsVoicePlaying] = useState<boolean>(false);
  const [hasFarm, setHasFarm] = useState<boolean>(localStorage.getItem('hasFarm') === 'true');

  // Voice — instant tap flow (no modal)
  const [voiceState, setVoiceState] = useState<'idle'|'listening'|'thinking'|'speaking'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceAnswerText, setVoiceAnswerText] = useState<string>('');
  // Legacy modal — kept for "Ask a Question" explicit entry
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [voiceQuestion, setVoiceQuestion] = useState<string>('');
  const [voiceAnswer, setVoiceAnswer] = useState<string>('');
  const [voiceListening, setVoiceListening] = useState<boolean>(false);
  const [voiceLoading, setVoiceLoading] = useState<boolean>(false);
  // Translated dynamic content (advisories, alerts, schemes)
  const [translatedAdvisories, setTranslatedAdvisories] = useState<any[]>([]);
  const [translatedAlerts, setTranslatedAlerts] = useState<any[]>([]);
  const [translatedSchemes, setTranslatedSchemes] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(() => {
    try { const c = localStorage.getItem('kr_cached_weather'); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [advisories, setAdvisories] = useState<any[]>(() => {
    try { const c = localStorage.getItem('kr_cached_advisories'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [alerts, setAlerts] = useState<any[]>(() => {
    try { const c = localStorage.getItem('kr_cached_alerts'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [mandiPrices, setMandiPrices] = useState<any[]>([]);
  const [priceHistoryData, setPriceHistoryData] = useState<any[]>([]);
  const [priceCrashStatus, setPriceCrashStatus] = useState<any>(null);
  const [selectedMandiId, setSelectedMandiId] = useState<number | null>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [distressData, setDistressData] = useState<any>(null);
  const [schemes, setSchemes] = useState<any[]>(() => {
    try { const c = localStorage.getItem('kr_cached_schemes'); if (c) return JSON.parse(c); } catch {}
    return [
      { id: 1, name: 'PM Fasal Bima Yojana (PMFBY)', state: 'All', support_type: 'Insurance (Crop Loss Compensation)', verification_url: 'https://pmfby.gov.in', conditions: '' },
      { id: 2, name: 'PM Kisan Samman Nidhi (PM-KISAN)', state: 'All', support_type: 'Direct Income Support (₹6,000/year)', verification_url: 'https://pmkisan.gov.in', conditions: '' },
      { id: 3, name: 'Kisan Credit Card (KCC)', state: 'All', support_type: 'Credit Access (Short-term Crop Loan)', verification_url: 'https://www.nabard.org', conditions: '' },
    ];
  });
  // My Crop View Grouping state ('crop' | 'farm')
  const [cropViewGroup, setCropViewGroup] = useState<'crop' | 'farm'>('crop');
  const [expandedCropGroups, setExpandedCropGroups] = useState<Record<string, boolean>>({});

  // Action completion & UI detail toggle states
  const [completedAdvisoryIds, setCompletedAdvisoryIds] = useState<number[]>([]);
  const [expandedAdvisoryIds, setExpandedAdvisoryIds] = useState<Record<string, boolean>>({});
  const [showRawWeatherMetrics, setShowRawWeatherMetrics] = useState<boolean>(false);
  const [showCompletedAdvisories, setShowCompletedAdvisories] = useState<boolean>(false);

  // Role & Agro Officer state
  const [userRole, setUserRole] = useState<'farmer' | 'officer'>(
    (localStorage.getItem('krishi_auth_role') as 'farmer' | 'officer') || 'farmer'
  );
  const [authRoleToggle, setAuthRoleToggle] = useState<'farmer' | 'officer'>('farmer');
  
  // Agro Officer Registration State
  const [officerRegName, setOfficerRegName] = useState<string>('');
  const [officerRegPhone, setOfficerRegPhone] = useState<string>('');
  const [officerRegEmail, setOfficerRegEmail] = useState<string>('');
  const [officerRegPassword, setOfficerRegPassword] = useState<string>('');
  const [officerRegDesignation, setOfficerRegDesignation] = useState<string>('Senior Block Agricultural Officer');
  const [officerRegState, setOfficerRegState] = useState<string>('Maharashtra');
  const [officerRegDistrict, setOfficerRegDistrict] = useState<string>('Nashik');
  const [officerRegMunicipality, setOfficerRegMunicipality] = useState<string>('Niphad Block');
  const [officerRegWard, setOfficerRegWard] = useState<string>('Ward #4');

  // Agro Officer Dashboard State
  const [officerProfile, setOfficerProfile] = useState<any>(null);
  const [localityFarmers, setLocalityFarmers] = useState<any[]>([]);
  const [localityMapPoints, setLocalityMapPoints] = useState<any[]>([]);
  const [officerRiskFilter, setOfficerRiskFilter] = useState<string>('all');
  const [officerStatusFilter, setOfficerStatusFilter] = useState<string>('all');
  const [officerSearchQuery, setOfficerSearchQuery] = useState<string>('');
  const [officerActiveView, setOfficerActiveView] = useState<'roster' | 'map'>('roster');
  
  // Selected farmer detail modal
  const [selectedFarmerDetail, setSelectedFarmerDetail] = useState<any>(null);
  const [isFarmerDetailOpen, setIsFarmerDetailOpen] = useState<boolean>(false);
  const [interventionStatusInput, setInterventionStatusInput] = useState<string>('Pending');
  const [interventionNotesInput, setInterventionNotesInput] = useState<string>('');
  const [isSavingIntervention, setIsSavingIntervention] = useState<boolean>(false);

  // Officer scheme recommendation state
  const [officerSchemes, setOfficerSchemes] = useState<any[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null);
  const [schemeRecommendNote, setSchemeRecommendNote] = useState<string>('');
  const [isSavingScheme, setIsSavingScheme] = useState<boolean>(false);
  const [farmerRecommendedSchemes, setFarmerRecommendedSchemes] = useState<any[]>([]);
  const [officerDetailTab, setOfficerDetailTab] = useState<'overview' | 'action'>('overview');

  // Alternative Credit Scoring (Feature 20) state
  const [creditAssessment, setCreditAssessment] = useState<any>(null);
  const [creditLoading, setCreditLoading] = useState<boolean>(false);
  const [loanRequestedInput, setLoanRequestedInput] = useState<number>(50000);
  const [infraColdStorage, setInfraColdStorage] = useState<boolean>(false);
  const [infraPrecisionTech, setInfraPrecisionTech] = useState<boolean>(false);
  const [infraSellsStubble, setInfraSellsStubble] = useState<boolean>(false);
  const [infraDoesSorting, setInfraDoesSorting] = useState<boolean>(false);


  const toggleCompleteAdvisory = (id: number) => {
    setCompletedAdvisoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleExpandAdvisory = (id: string | number) => {
    const key = String(id);
    setExpandedAdvisoryIds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Crop Advisor sub-tab state ('overview' | 'recommendation' | 'water' | 'simulator')
  const [advisorSubTab, setAdvisorSubTab] = useState<'overview' | 'recommendation' | 'water' | 'simulator'>('overview');

  // Financial Health sub-tab state ('overview' | 'loan')
  const [finSubTab, setFinSubTab] = useState<'overview' | 'loan'>('overview');
  const [finBreakdownView, setFinBreakdownView] = useState<'crop' | 'farm'>('crop');
  const [showLoanDetails, setShowLoanDetails] = useState<boolean>(false);
  // Government Assistance Platform sub-tab state ('schemes' | 'loans')
  const [supportSubTab, setSupportSubTab] = useState<'schemes' | 'loans'>('schemes');

  // Yield Calculator state (top-level to follow React hooks rules)
  const [yieldCrop, setYieldCrop] = useState<string>('tomato');
  const [yieldArea, setYieldArea] = useState<number>(1.0);
  const [yieldRainfall, _setYieldRainfall] = useState<number>(0);
  const [yieldSoil, setYieldSoil] = useState<string>('loam');
  const [yieldIrrigation, setYieldIrrigation] = useState<string>('drip');
  const [yieldResult, setYieldResult] = useState<any>(null);
  const [yieldLoading, setYieldLoading] = useState<boolean>(false);
  // PWA offline indicator
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  // Force-sync button loading state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Authentication & Registration Loading states
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isRegisteringSubmit, setIsRegisteringSubmit] = useState<boolean>(false);
  const [isAuthInitialLoading, setIsAuthInitialLoading] = useState<boolean>(false);
  // Background refresh indicator (subtle, non-blocking)
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState<boolean>(false);

  // Backend Health Status State
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backendPingTime, setBackendPingTime] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const res = await fetch(`${API_BASE}/`);
        if (res.ok && isMounted) {
          setBackendPingTime(Date.now() - start);
          setBackendStatus('connected');
        } else if (isMounted) {
          setBackendStatus('disconnected');
        }
      } catch {
        if (isMounted) setBackendStatus('disconnected');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Obligation Overlay Modal States
  const [showAddObligationModal, setShowAddObligationModal] = useState<boolean>(false);
  const [newObligationAmount, setNewObligationAmount] = useState<string>('30000');
  const [newObligationType, setNewObligationType] = useState<string>('loan');
  const [newObligationDate, setNewObligationDate] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Multiple Farms and Crops States
  const [farms, setFarms] = useState<any[]>(() => {
    try { const c = localStorage.getItem('kr_cached_farms'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [crops, setCrops] = useState<any[]>(() => {
    try { const c = localStorage.getItem('kr_cached_crops'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [allCrops, setAllCrops] = useState<any[]>(() => {
    try { const c = localStorage.getItem('kr_cached_allCrops'); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [selectedFarm, setSelectedFarm] = useState<any>(() => {
    try { const c = localStorage.getItem('kr_cached_farms'); const arr = c ? JSON.parse(c) : []; return arr[0] || null; } catch { return null; }
  });
  const [selectedCrop, setSelectedCrop] = useState<any>(() => {
    try { const c = localStorage.getItem('kr_cached_crops'); const arr = c ? JSON.parse(c) : []; return arr[0] || null; } catch { return null; }
  });

  // Modals overlays
  const [showAddFarmModal, setShowAddFarmModal] = useState<boolean>(false);
  const [showAddCropModal, setShowAddCropModal] = useState<boolean>(false);

  // Modal form states
  const [newFarmArea, setNewFarmArea] = useState<string>('2.5');
  const [newFarmSoil, setNewFarmSoil] = useState<string>('loam');
  const [newFarmIrrigation, setNewFarmIrrigation] = useState<string>('drip');
  const [newFarmLat, setNewFarmLat] = useState<number>(20.08);
  const [newFarmLon, setNewFarmLon] = useState<number>(74.11);
  const [newFarmState, setNewFarmState] = useState<string>('Maharashtra');
  const [newFarmDistrict, setNewFarmDistrict] = useState<string>('Nashik');
  const [newFarmName, setNewFarmName] = useState<string>('');
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isSearchingAddress, setIsSearchingAddress] = useState<boolean>(false);
  
  const [newCropType, setNewCropType] = useState<string>('tomato');
  const [newCropVariety, setNewCropVariety] = useState<string>('PKM-1');
  const [newCropSowingDate, setNewCropSowingDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newCropImageUrl, setNewCropImageUrl] = useState<string>('');

  // Form states for login/register
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [language, setLanguage] = useState<LanguageType>(
    (localStorage.getItem('kr_language') as LanguageType) || 'english'
  );

  // Sync Google Translate Web Element whenever language selector is changed
  useEffect(() => {
    localStorage.setItem('kr_language', language);
    setGoogleTranslateLanguage(language);
  }, [language]);
  const [showNotificationPanel, setShowNotificationPanel] = useState<boolean>(false);
  const t = translations[language] || translations['english'] || ({} as any);
  const nativeDigits = useNativeDigits(language);

  // Toast notifications
  const { toasts, removeToast, toast } = useToast();

  // Crop modal: which farm to add crop to (default to selectedFarm.id)
  const [cropFarmId, setCropFarmId] = useState<number | null>(null);
  const [showAllMandis, setShowAllMandis] = useState<boolean>(false);

  const fetchFarmsAndCrops = async () => {
    if (!token) return;
    try {
      const farmRes = await fetch(`${API_BASE}/api/v1/farmers/me/farms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (farmRes.ok) {
        const farmData = await farmRes.json();
        setFarms(farmData);
        try { localStorage.setItem('kr_cached_farms', JSON.stringify(farmData)); } catch {}

        if (farmData.length > 0) {
          const currentFarm = selectedFarm ? farmData.find((f: any) => f.id === selectedFarm.id) || farmData[0] : farmData[0];
          setSelectedFarm(currentFarm);
          setCropFarmId(currentFarm.id);
          localStorage.setItem('hasFarm', 'true');
          setHasFarm(true);

          // ✅ FAST SIGN-IN: dismiss loading gate immediately once we know farms exist.
          // Dashboard shows from localStorage cache while fresh data loads in background.
          setIsAuthInitialLoading(false);

          // Background: fetch crops + all farm crops in parallel (non-blocking)
          setIsBackgroundRefreshing(true);
          const [cropRes] = await Promise.all([
            fetch(`${API_BASE}/api/v1/farms/${currentFarm.id}/crops`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
          ]);
          if (cropRes.ok) {
            const cropData = await cropRes.json();
            setCrops(cropData);
            try { localStorage.setItem('kr_cached_crops', JSON.stringify(cropData)); } catch {}
            if (cropData.length > 0 && !selectedCrop) {
              setSelectedCrop(cropData[0]);
            }
          }

          // Also fetch ALL crops across ALL farms for "My Crop" grouped views
          const allCropResults: any[] = [];
          await Promise.all(farmData.map(async (farm: any) => {
            try {
              const r = await fetch(`${API_BASE}/api/v1/farms/${farm.id}/crops`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (r.ok) {
                const d = await r.json();
                d.forEach((c: any) => {
                  allCropResults.push({ ...c, farm_name: farm.name || `Farm ${farm.id}`, farm_district: farm.district, farm_area: farm.area });
                });
              }
            } catch {}
          }));
          setAllCrops(allCropResults);
          try { localStorage.setItem('kr_cached_allCrops', JSON.stringify(allCropResults)); } catch {}
        } else {
          setFarms([]);
          setCrops([]);
          setAllCrops([]);
          setSelectedFarm(null);
          setSelectedCrop(null);
          setIsAuthInitialLoading(false);
        }
      } else {
        setIsAuthInitialLoading(false);
      }
    } catch (e) {
      console.warn("Offline fetch fallback for farms/crops", e);
      const mockFarm = { id: 1, area: 2.5, soil_type: 'loam', irrigation: 'drip', latitude: 20.08, longitude: 74.11, name: 'Main Farm', district: 'Nashik' };
      const mockCrop = { id: 1, crop_type: 'tomato', variety: 'Nashik Premium', stage: 'Fruit Development', sowing_date: '2026-07-04', image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop', farm_name: 'Main Farm', farm_district: 'Nashik' };
      setFarms([mockFarm]);
      setCrops([mockCrop]);
      setAllCrops([mockCrop]);
      setSelectedFarm(mockFarm);
      setSelectedCrop(mockCrop);
      setIsAuthInitialLoading(false);
    } finally {
      setIsBackgroundRefreshing(false);
    }
  };

// Sync token and load profiles
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      
      const storedRole = localStorage.getItem('krishi_auth_role');
      if (userRole === 'officer' || storedRole === 'officer') {
        fetchOfficerDashboardData();
        return;
      }
      
      // Fetch profile for farmers only
      fetch(`${API_BASE}/api/v1/farmers/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("API failed");
      })
      .then(data => {
        setFarmer({
          name: data.name,
          phone: data.phone,
          language: data.language as LanguageType,
          location_id: data.location_id || undefined,
          risk_profile: data.risk_profile || 'Stable'
        });
        if (data.location_id) {
          localStorage.setItem('hasFarm', 'true');
          setHasFarm(true);
        }
        fetchFarmsAndCrops();
      })
      .catch(() => {
        if (localStorage.getItem('krishi_auth_role') !== 'officer') {
          setToken(null);
          setFarmer({
            name: regName || 'Ramesh Kumar',
            phone: loginPhone || regPhone || '+91 98765 43210',
            language: language,
            location_id: localStorage.getItem('onboardLocation') || 'Niphad_Nashik',
            risk_profile: 'High'
          });
          fetchFarmsAndCrops();
        }
      });
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('hasFarm');
      localStorage.removeItem('onboardLocation');
      setFarmer(null);
      setHasFarm(false);
      setWeather(null);
      setFarms([]);
      setCrops([]);
      setSelectedFarm(null);
      setSelectedCrop(null);
    }
  }, [token, userRole]);

  const getActiveLocationId = (farmObj?: any) => {
    const targetFarm = (farmObj && typeof farmObj === 'object' && farmObj.id) ? farmObj : selectedFarm;
    if (targetFarm) {
      if (targetFarm.latitude && targetFarm.longitude) {
        return `${targetFarm.latitude},${targetFarm.longitude}`;
      }
      if (targetFarm.district) {
        return targetFarm.district;
      }
      if (targetFarm.name) {
        return targetFarm.name;
      }
    }
    return farmer?.location_id || 'Nashik_Maharashtra';
  };

  // Fetch Weather for active farm / location
  const fetchWeather = async (targetLocId?: any) => {
    const validLocId = (typeof targetLocId === 'string' && targetLocId && !targetLocId.includes('[object')) 
      ? targetLocId 
      : getActiveLocationId();
    if (!validLocId) return;
    setLoadingWeather(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/weather/${encodeURIComponent(validLocId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.observation) {
          setWeather(data);
          try { localStorage.setItem('kr_cached_weather', JSON.stringify(data)); } catch {}
          setLoadingWeather(false);
          return;
        }
      }
      throw new Error("No cached weather");
    } catch {
      // Offline/Error Fallback Mock Data
      const fallbackWeather = {
        location_id: validLocId,
        observation: {
          rainfall: 8.0,
          temperature: 26.0,
          humidity: 78.0
        },
        forecasts: [
          { date: new Date().toISOString().split('T')[0], rainfall_forecast: 12.0, temperature: 27.5, rain_probability: 65.0 },
          { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], rainfall_forecast: 40.0, temperature: 24.0, rain_probability: 90.0 },
          { date: new Date(Date.now() + 172800000).toISOString().split('T')[0], rainfall_forecast: 5.0, temperature: 28.0, rain_probability: 30.0 }
        ],
        generated_at: new Date().toISOString()
      };
      setWeather(fallbackWeather);
      try { localStorage.setItem('kr_cached_weather', JSON.stringify(fallbackWeather)); } catch {}
    }
    setLoadingWeather(false);
  };

  // Trigger weather refresh from API for active farm / location
  const refreshWeatherFromApi = async (targetLocId?: any) => {
    const validLocId = (typeof targetLocId === 'string' && targetLocId && !targetLocId.includes('[object')) 
      ? targetLocId 
      : getActiveLocationId();
    if (!validLocId) return;
    setLoadingWeather(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/weather/${encodeURIComponent(validLocId)}/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchWeather(validLocId);
        await fetchAdvisoriesAndAlerts();
      }
    } catch (e) {
      console.error("Failed to refresh weather live. Using cache.", e);
    }
    setLoadingWeather(false);
  };

  // Fetch Advisories and Alerts — parallel fetch for speed
  const fetchAdvisoriesAndAlerts = async () => {
    try {
      const [advRes, alertRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/advisories`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/v1/alerts`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (advRes.ok) {
        const data = await advRes.json();
        setAdvisories(data);
        try { localStorage.setItem('kr_cached_advisories', JSON.stringify(data)); } catch {}
      }
      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlerts(data);
        try { localStorage.setItem('kr_cached_alerts', JSON.stringify(data)); } catch {}
      }
    } catch {
      // Fallback mocks if offline
      setAdvisories([
        { id: 1, category: 'irrigation', priority: 'high', recommendation: 'Stop Tomato Irrigation', reason: 'Heavy rainfall expected tomorrow. Skip irrigation today to prevent crop waterlogging.' }
      ]);
      setAlerts([
        { id: 1, severity: 'Critical', reason: 'Late Blight Risk: Humidity has exceeded 80% for 3 consecutive days. Apply preventive fungicide.' }
      ]);
    }
  };

  // Fetch Weather + Advisories whenever active farm or location changes
  useEffect(() => {
    if (userRole === 'officer' || localStorage.getItem('krishi_auth_role') === 'officer') return;
    if (token && (hasFarm || farmer?.location_id)) {
      fetchWeather();
      fetchAdvisoriesAndAlerts();
    }
  }, [token, userRole, hasFarm, selectedFarm?.id, selectedFarm?.district, selectedFarm?.latitude, selectedFarm?.longitude, farmer?.location_id]);

  useEffect(() => {
    if (userRole === 'officer' || localStorage.getItem('krishi_auth_role') === 'officer') return;
    if (token) {
      fetchDistressAndSchemes();
    }
  }, [token, userRole, selectedCrop, selectedFarm?.id, activeTab]);

  // Auto-translate Advisories, Alerts, and Schemes whenever language or source data updates
  useEffect(() => {
    if (language === 'english') {
      setTranslatedAdvisories([]);
      setTranslatedAlerts([]);
      setTranslatedSchemes([]);
      return;
    }

    let isMounted = true;

    async function doTranslateAll() {
      // 1. Advisories
      if (advisories.length > 0) {
        const advPromises = advisories.map(async (adv) => {
          const [recT, reasonT] = await Promise.all([
            translateText(adv.recommendation || '', language),
            translateText(adv.reason || '', language),
          ]);
          return { ...adv, recommendation: recT || adv.recommendation, reason: reasonT || adv.reason };
        });
        const resAdv = await Promise.all(advPromises);
        if (isMounted) setTranslatedAdvisories(resAdv);
      }

      // 2. Alerts
      if (alerts.length > 0) {
        const alertPromises = alerts.map(async (al) => {
          const [msgT, recT] = await Promise.all([
            translateText(al.reason || al.message || '', language),
            translateText(al.recommendation || '', language),
          ]);
          return { ...al, reason: msgT || al.reason, message: msgT || al.message, recommendation: recT || al.recommendation };
        });
        const resAl = await Promise.all(alertPromises);
        if (isMounted) setTranslatedAlerts(resAl);
      }

      // 3. Government Schemes & Loans
      if (schemes.length > 0) {
        const schemePromises = schemes.map(async (sch) => {
          const [nameT, fitT, sumT, typeT] = await Promise.all([
            translateText(sch.name || '', language),
            translateText(sch.why_recommended || sch.why_fits || '', language),
            translateText(sch.benefit_summary || sch.support_type || '', language),
            translateText(sch.support_type || '', language),
          ]);
          return {
            ...sch,
            name: nameT || sch.name,
            why_recommended: fitT || sch.why_recommended || sch.why_fits,
            why_fits: fitT || sch.why_fits || sch.why_recommended,
            benefit_summary: sumT || sch.benefit_summary,
            support_type: typeT || sch.support_type,
          };
        });
        const resSch = await Promise.all(schemePromises);
        if (isMounted) setTranslatedSchemes(resSch);
      }
    }

    doTranslateAll();

    return () => {
      isMounted = false;
    };
  }, [language, advisories, alerts, schemes]);

  useEffect(() => {
    if (userRole === 'officer' || localStorage.getItem('krishi_auth_role') === 'officer') return;
    if (token && selectedCrop) {
      fetchMandiPrices();
      fetchProjections();
    }
  }, [token, userRole, selectedCrop]);

  // Fetch latest Credit Assessment for farmer
  useEffect(() => {
    if (token && (userRole === 'farmer' || localStorage.getItem('krishi_auth_role') === 'farmer')) {
      fetch(`${API_BASE}/api/v1/credit/latest`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setCreditAssessment(data);
            if (data.loan_requested) setLoanRequestedInput(data.loan_requested);
            setInfraColdStorage(!!data.has_cold_storage);
            setInfraPrecisionTech(!!data.uses_precision_tech);
            setInfraSellsStubble(!!data.sells_stubble);
            setInfraDoesSorting(!!data.does_sorting);
          }
        })
        .catch(() => {});
    }
  }, [token, userRole]);

  const handleAssessCredit = async () => {
    if (!token) return;
    setCreditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/credit/assess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          loan_requested: Number(loanRequestedInput) || 50000,
          has_cold_storage: infraColdStorage ? 1 : 0,
          uses_precision_tech: infraPrecisionTech ? 1 : 0,
          sells_stubble: infraSellsStubble ? 1 : 0,
          does_sorting: infraDoesSorting ? 1 : 0
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCreditAssessment(data);
      }
    } catch (e) {
      console.error('Credit assessment error:', e);
    } finally {
      setCreditLoading(false);
    }
  };

  const fetchMandiPrices = async () => {
    if (!token || !selectedCrop) return;
    try {
      const farmParam = selectedCrop.farm_id ? `&farm_id=${selectedCrop.farm_id}` : '';
      const res = await fetch(`${API_BASE}/api/v1/mandis/compare?crop=${selectedCrop.crop_type}${farmParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMandiPrices(data);
        const targetId = (data.length > 0) ? data[0].mandi_id : selectedMandiId;
        if (data.length > 0) {
          setSelectedMandiId(data[0].mandi_id);
        }
        if (targetId) {
          await fetchPriceHistory(targetId);
          await fetchPriceCrash(targetId);
        }
      }
    } catch {
      // Fallback mocks
      const mockData = [
        { mandi_id: 1, mandi_name: 'Lasalgaon APMC', distance_km: 12.0, sticker_price: 2620, transport_cost: 194, other_fees: 52.4, net_return: 2373.6 },
        { mandi_id: 2, mandi_name: 'Nashik APMC', distance_km: 15.0, sticker_price: 2600, transport_cost: 230, other_fees: 52.0, net_return: 2318.0 },
        { mandi_id: 3, mandi_name: 'Pimpalgaon APMC', distance_km: 35.0, sticker_price: 2850, transport_cost: 470, other_fees: 57.0, net_return: 2323.0 }
      ];
      setMandiPrices(mockData);
      setSelectedMandiId(1);
      await fetchPriceHistory(1);
      await fetchPriceCrash(1);
    }
  };

  const fetchPriceHistory = async (overrideMandiId?: number) => {
    const targetMandiId = overrideMandiId || selectedMandiId;
    if (!token || !selectedCrop || !targetMandiId) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/market/price-history?crop=${selectedCrop.crop_type}&mandi_id=${targetMandiId}&window=30`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPriceHistoryData(data);
      }
    } catch {
      // Fallback mocks: generate 30 days of mock data
      const mockData = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const basePrice = 2600; // example base price for tomato
        const variation = Math.sin(i) * 100;
        const modal = basePrice + variation;
        mockData.push({
          date: date.toISOString().split('T')[0],
          min_price: modal * 0.9,
          max_price: modal * 1.1,
          modal_price: modal,
          arrivals: 100 + i * 5
        });
      }
      setPriceHistoryData(mockData.reverse()); // oldest first
    }
  };

  const fetchPriceCrash = async (overrideMandiId?: number) => {
    const targetMandiId = overrideMandiId || selectedMandiId;
    if (!token || !selectedCrop || !targetMandiId) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/market/price-crash?crop=${selectedCrop.crop_type}&mandi_id=${targetMandiId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPriceCrashStatus(data);
      }
    } catch {
      // Fallback mock
      setPriceCrashStatus({
        price_crash: false,
        price_change_pct: -5.2,
        recent_7day_avg: 2500,
        historical_30day_avg: 2637.1
      });
    }
  };

  useEffect(() => {
    if (token && selectedCrop && selectedMandiId) {
      fetchPriceHistory(selectedMandiId);
      fetchPriceCrash(selectedMandiId);
    }
  }, [selectedMandiId]);

  const fetchProjections = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/farmers/me/projections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCashFlow(data);
      }
    } catch {
      // Fallback mocks
      setCashFlow({
        projected_yield_quintals: 30.0,
        expected_price_per_quintal: 2600.0,
        projected_revenue: 78000.0,
        cultivation_cost: 30000.0,
        projected_net_income: 48000.0,
        total_obligations: 60000.0,
        cash_flow_surplus: -12000.0,
        has_shortfall: true,
        obligations: [
          { id: 1, amount: 60000, due_date: '2026-09-04', type: 'loan' }
        ]
      });
    }
  };

  const fetchDistressAndSchemes = async () => {
    if (!token) return;
    try {
      const [distressRes, schemesRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/farmers/me/distress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/v1/farmers/me/schemes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (distressRes.ok) setDistressData(await distressRes.json());
      if (schemesRes.ok) {
        const sData = await schemesRes.json();
        setSchemes(sData);
        try { localStorage.setItem('kr_cached_schemes', JSON.stringify(sData)); } catch {}
      }
    } catch {
      // Fallback mocks
      setDistressData({
        score: 42.0, risk_level: 'Elevated',
        weather_component: 35.0, yield_component: 40.0,
        market_component: 55.0, financial_component: 45.0, urgency_component: 35.0
      });
      const fallbackSchemes = [
        { id: 1, name: 'PM Fasal Bima Yojana (PMFBY)', state: 'All', support_type: 'Insurance (Crop Loss Compensation)', verification_url: 'https://pmfby.gov.in', conditions: '' },
        { id: 2, name: 'PM Kisan Samman Nidhi (PM-KISAN)', state: 'All', support_type: 'Direct Income Support (₹6,000/year)', verification_url: 'https://pmkisan.gov.in', conditions: '' },
        { id: 3, name: 'Kisan Credit Card (KCC)', state: 'All', support_type: 'Credit Access (Short-term Crop Loan)', verification_url: 'https://www.nabard.org', conditions: '' },
      ];
      setSchemes(fallbackSchemes);
      try { localStorage.setItem('kr_cached_schemes', JSON.stringify(fallbackSchemes)); } catch {}
    }
  };

  useEffect(() => {
    if (userRole === 'officer' || localStorage.getItem('krishi_auth_role') === 'officer') return;
    if (token) {
      fetchDistressAndSchemes();
    }
    if (token && selectedCrop) {
      fetchMandiPrices();
      fetchProjections();
    }
  }, [token, userRole, selectedCrop]);

  // Force-sync: invalidate server-side cache then re-fetch everything fresh
  const forceSyncAll = async () => {
    if (!token || isSyncing) return;
    setIsSyncing(true);
    try {
      // Tell the backend to drop its in-memory TTL cache for this farmer
      await fetch(`${API_BASE}/api/v1/cache/invalidate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch { /* non-critical */ }
    // Re-fetch all data in parallel
    await Promise.all([
      fetchWeather(),
      fetchAdvisoriesAndAlerts(),
      fetchMandiPrices(),
      fetchProjections(),
      fetchDistressAndSchemes(),
      fetchFarmsAndCrops(),
    ]);
    setLastSyncTime(new Date().toLocaleTimeString());
    setIsSyncing(false);
    toast.success('Synced!', 'All data refreshed from server.');
  };

  // Handle Logout
  const handleLogout = () => {
    setToken(null);
    setActiveTab('home');
  };

  // ── Delete handlers ────────────────────────────────────────────────────────
  const handleDeleteFarm = async (farmId: number) => {
    if (!window.confirm('Delete this farm and all its crops? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/farms/${farmId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = farms.filter(f => f.id !== farmId);
        setFarms(updated);
        setSelectedFarm(updated[0] || null);
        setCrops([]);
        setSelectedCrop(null);
        toast.success('Farm deleted', 'Farm and its crops have been removed.');
        fetchProjections();
        fetchDistressAndSchemes();
      } else {
        toast.error('Delete failed', 'Could not delete farm. Try again.');
      }
    } catch (err) {
      toast.error('Error', 'Network error while deleting farm.');
    }
  };

  const handleDeleteCrop = async (cropId: number) => {
    if (!window.confirm('Delete this crop? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/crops/${cropId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedCrops = crops.filter(c => c.id !== cropId);
        setCrops(updatedCrops);
        setSelectedCrop(updatedCrops[0] || null);
        toast.success('Crop deleted', 'Crop entry removed successfully.');
        fetchProjections();
        fetchDistressAndSchemes();
      } else {
        toast.error('Delete failed', 'Could not delete crop. Try again.');
      }
    } catch (err) {
      toast.error('Error', 'Network error while deleting crop.');
    }
  };

  const handleDeleteObligation = async (obligationId: number) => {
    if (!window.confirm('Delete this obligation?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/obligations/${obligationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        // Refresh projections (which includes the obligations list)
        fetchProjections();
        fetchDistressAndSchemes();
        toast.success('Obligation deleted', 'Financial obligation removed.');
      } else {
        toast.error('Delete failed', 'Could not delete obligation.');
      }
    } catch (err) {
      toast.error('Error', 'Network error while deleting obligation.');
    }
  };

  // Fetch Officer Profile & Locality Farmers Data
  const fetchOfficerDashboardData = async () => {
    if (!token || userRole !== 'officer') return;
    try {
      const meRes = await fetch(`${API_BASE}/api/v1/officers/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        setOfficerProfile(meData);
      }

      const farmersRes = await fetch(`${API_BASE}/api/v1/officers/locality-farmers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (farmersRes.ok) {
        const farmersData = await farmersRes.json();
        setLocalityFarmers(farmersData);
      }

      const mapRes = await fetch(`${API_BASE}/api/v1/officers/locality-map`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setLocalityMapPoints(mapData);
      }

      // Load all available schemes for scheme recommender
      const schemesRes = await fetch(`${API_BASE}/api/v1/officers/schemes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (schemesRes.ok) {
        const schemesData = await schemesRes.json();
        setOfficerSchemes(schemesData);
      }
    } catch (e) {
      console.error("Error loading Agro Officer dashboard data:", e);
    }
  };

  useEffect(() => {
    if (token && userRole === 'officer') {
      fetchOfficerDashboardData();
    }
  }, [token, userRole]);

  const handleOpenFarmerDetail = async (farmerId: number) => {
    if (!token) return;
    setOfficerDetailTab('overview');
    setSelectedSchemeId(null);
    setSchemeRecommendNote('');
    try {
      const [detailRes, schemeRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/officers/farmers/${farmerId}/details`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/v1/officers/farmers/${farmerId}/recommended-schemes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (detailRes.ok) {
        const data = await detailRes.json();
        setSelectedFarmerDetail(data);
        setInterventionStatusInput(data.intervention?.status || 'Pending');
        setInterventionNotesInput(data.intervention?.notes || '');
        setIsFarmerDetailOpen(true);
      }
      if (schemeRes.ok) {
        const schemeData = await schemeRes.json();
        setFarmerRecommendedSchemes(schemeData);
      }
    } catch (e) {
      toast.error('Error', 'Could not fetch farmer detailed record.');
    }
  };

  const handleRecommendScheme = async (farmerId: number) => {
    if (!token || !selectedSchemeId) return;
    const chosenScheme = officerSchemes.find(s => s.id === selectedSchemeId);
    if (!chosenScheme) return;
    setIsSavingScheme(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/officers/farmers/${farmerId}/recommend-scheme`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheme_id: chosenScheme.id,
          scheme_name: chosenScheme.name,
          scheme_type: chosenScheme.support_type?.toLowerCase().includes('loan') ? 'loan' : 'scheme',
          notes: schemeRecommendNote
        })
      });
      if (res.ok) {
        toast.success('Scheme Recommended!', `${chosenScheme.name} recommended to farmer.`);
        const updated = await fetch(`${API_BASE}/api/v1/officers/farmers/${farmerId}/recommended-schemes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (updated.ok) setFarmerRecommendedSchemes(await updated.json());
        setSelectedSchemeId(null);
        setSchemeRecommendNote('');
      } else {
        toast.error('Failed', 'Could not save scheme recommendation.');
      }
    } catch {
      toast.error('Error', 'Connection failed.');
    } finally {
      setIsSavingScheme(false);
    }
  };

  const handleSaveIntervention = async (farmerId: number) => {
    if (!token) return;
    setIsSavingIntervention(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/officers/farmers/${farmerId}/intervention`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: interventionStatusInput,
          notes: interventionNotesInput
        })
      });
      if (res.ok) {
        toast.success('Updated!', 'Officer action & intervention status updated successfully.');
        fetchOfficerDashboardData();
        setIsFarmerDetailOpen(false);
      } else {
        toast.error('Failed', 'Could not save intervention status.');
      }
    } catch (e) {
      toast.error('Error', 'Connection failed while updating intervention.');
    } finally {
      setIsSavingIntervention(false);
    }
  };

  // Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhone && loginPassword) {
      setIsAuthenticating(true);
      const endpoint = authRoleToggle === 'officer' 
        ? `${API_BASE}/api/v1/auth/officer/login`
        : `${API_BASE}/api/v1/auth/login`;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            username: loginPhone,
            password: loginPassword
          })
        });
        if (res.ok) {
          const data = await res.json();
          setUserRole(authRoleToggle);
          localStorage.setItem('krishi_auth_role', authRoleToggle);
          setIsAuthInitialLoading(true);
          setToken(data.access_token);
        } else {
          const errorData = await res.json();
          toast.error('Login failed', errorData.detail || 'Incorrect phone number or password');
        }
      } catch (err) {
        console.error(err);
        toast.error('Connection error', 'Cannot reach server. Please check backend is running.');
      } finally {
        setIsAuthenticating(false);
      }
    }
  };

  // Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegisteringSubmit(true);
    if (authRoleToggle === 'officer') {
      if (!officerRegName || !officerRegPhone || !officerRegPassword || !officerRegDesignation || !officerRegDistrict) {
        toast.warning('Incomplete', 'Please fill all required Agro Officer fields.');
        setIsRegisteringSubmit(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/officer/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: officerRegName,
            phone: officerRegPhone,
            email: officerRegEmail,
            password: officerRegPassword,
            designation: officerRegDesignation,
            state: officerRegState,
            district: officerRegDistrict,
            municipality: officerRegMunicipality,
            ward: officerRegWard
          })
        });
        if (res.ok) {
          const loginRes = await fetch(`${API_BASE}/api/v1/auth/officer/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              username: officerRegPhone,
              password: officerRegPassword
            })
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            setUserRole('officer');
            localStorage.setItem('krishi_auth_role', 'officer');
            setIsAuthInitialLoading(true);
            setToken(loginData.access_token);
          } else {
            toast.warning('Registered!', 'Auto-login failed. Please log in manually.');
          }
        } else {
          const errorData = await res.json();
          toast.error('Registration failed', errorData.detail || 'Could not create Agro Officer account.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Connection error', 'Cannot reach server during Agro Officer registration.');
      } finally {
        setIsRegisteringSubmit(false);
      }
      return;
    }

    if (regName && regPhone && regPassword) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            phone: regPhone,
            password: regPassword,
            language: language
          })
        });
        if (res.ok) {
          await res.json();
          // Auto-login after registration
          const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              username: regPhone,
              password: regPassword
            })
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            setUserRole('farmer');
            localStorage.setItem('krishi_auth_role', 'farmer');
            setIsAuthInitialLoading(true);
            setToken(loginData.access_token);
          } else {
            toast.warning('Registered!', 'Auto-login failed. Please log in manually.');
          }
        } else {
          const errorData = await res.json();
          toast.error('Registration failed', errorData.detail || 'Could not create account.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Connection error', 'Cannot reach server during registration.');
      } finally {
        setIsRegisteringSubmit(false);
      }
    } else {
      setIsRegisteringSubmit(false);
    }
  };

  // Voice Playback — reads advisory text aloud (tab-aware)
  const handleVoicePlayback = async () => {
    if (isVoicePlaying) { stopSpeech(); setIsVoicePlaying(false); return; }
    setIsVoicePlaying(true);
    const text = buildVoiceText({ activeTab, advisories, distressData, mandiPrices, schemes, selectedCrop, language, weatherData: weather, farms, allCrops, cashFlow });
    try {
      await speakText(text, language, (err) => { setIsVoicePlaying(false); toast.error('Voice error', err); });
      const checkDone = setInterval(() => {
        if (!window.speechSynthesis.speaking) { setIsVoicePlaying(false); clearInterval(checkDone); }
      }, 300);
    } catch { setIsVoicePlaying(false); }
  };

  // Instant voice: tap mic → immediately record → AI answer → speak
  const handleInstantMic = async () => {
    // If currently playing, stop
    if (voiceState === 'speaking' || isVoicePlaying) {
      stopSpeech(); setVoiceState('idle'); setIsVoicePlaying(false); return;
    }
    if (voiceState === 'thinking') return; // wait for AI

    const localeMap: Record<string, string> = {
      english: 'en-IN', hindi: 'hi-IN', marathi: 'mr-IN', bengali: 'bn-IN', odia: 'or-IN'
    };

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      // Fallback: just play the advisory text aloud
      toast.info('Tip', 'Voice input not supported in this browser — playing advisory instead.');
      handleVoicePlayback();
      return;
    }

    setVoiceState('listening');
    setVoiceTranscript('');
    setVoiceAnswerText('');

    const rec = new SR();
    rec.lang = localeMap[language] || 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = async (e: any) => {
      const q = e.results[0][0].transcript;
      setVoiceTranscript(q);
      setVoiceState('thinking');

      try {
        const answer = await askGemini({
          question: q,
          farmerContext: { crops: allCrops, farms, weatherData: weather, distressData, advisories, language },
        });
        setVoiceAnswerText(answer);
        setVoiceState('speaking');

        // Gemini already replies in the target language — speak directly, no double-translate
        await speakText(answer, language);

        // Auto-reset after speech ends
        const check = setInterval(() => {
          if (!window.speechSynthesis.speaking) { setVoiceState('idle'); clearInterval(check); }
        }, 300);
      } catch {
        setVoiceState('idle');
      }
    };

    rec.onerror = (e: any) => {
      console.warn('SpeechRecognition error:', e.error);
      if (e.error === 'network') {
        toast.warning('Voice needs internet', 'Chrome voice recognition requires internet. Opening chat so you can type your question.');
        setShowVoiceModal(true);
      } else if (e.error === 'not-allowed') {
        toast.warning('Permission Denied', 'Please allow microphone access in your browser settings.');
      } else if (e.error !== 'aborted') {
        toast.warning('Mic error', `Could not capture audio: ${e.error}`);
      }
      setVoiceState('idle');
    };
    rec.onend = () => {
      if (voiceState === 'listening') setVoiceState('idle');
    };

    try { rec.start(); } catch (err) {
      toast.warning('Mic unavailable', 'Could not access microphone.');
      setVoiceState('idle');
    }
  };

  // Translate dynamic advisory/alert text whenever language or data changes
  useEffect(() => {
    if (language === 'english' || advisories.length === 0) {
      setTranslatedAdvisories(advisories);
      return;
    }
    let cancelled = false;
    (async () => {
      const out = await Promise.all(advisories.map(async (adv: any) => ({
        ...adv,
        recommendation: await translateText(adv.recommendation || '', language),
        reason: adv.reason ? await translateText(adv.reason, language) : '',
        category: await translateText(adv.category || '', language),
      })));
      if (!cancelled) setTranslatedAdvisories(out);
    })();
    return () => { cancelled = true; };
  }, [advisories, language]);

  useEffect(() => {
    if (language === 'english' || alerts.length === 0) {
      setTranslatedAlerts(alerts);
      return;
    }
    let cancelled = false;
    (async () => {
      const out = await Promise.all(alerts.map(async (al: any) => ({
        ...al,
        reason: await translateText(al.reason || '', language),
        severity: await translateText(al.severity || '', language),
      })));
      if (!cancelled) setTranslatedAlerts(out);
    })();
    return () => { cancelled = true; };
  }, [alerts, language]);

  // PWA: online/offline detection
  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  setLastSyncTime(new Date().toLocaleTimeString('en-IN')); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Language mapping
  const languageNames: Record<LanguageType, string> = {
    english: 'English',
    hindi: 'हिन्दी (Hindi)',
    odia: 'ଓଡ଼ିଆ (Odia)',
    bengali: 'বাংলা (Bengali)',
    marathi: 'मराठी (Marathi)'
  };

  const getSowingDaysAgo = (sowingDateStr: string) => {
    try {
      const sowing = new Date(sowingDateStr);
      const diffTime = Math.abs(Date.now() - sowing.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 30;
    }
  };

  const getCropImage = (type: string, url?: string) => {
    if (url && url.trim().length > 0) return url;
    const c = type.toLowerCase();
    if (c.includes('tomato')) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop';
    if (c.includes('wheat')) return 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop';
    if (c.includes('onion')) return 'https://images.unsplash.com/photo-1508747703725-719ae25db3e4?w=600&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop';
  };

  // Main UI shell if authenticated
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* 1. Today's Farm Summary Row (TOP OF HOMEPAGE) */}
            <div className="bg-gradient-to-r from-earth-50 via-white to-earth-50 p-5 rounded-2xl border border-earth-200 shadow-sm text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-earth-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌟</span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg my-0"><T lang={language}>Today's Farm Summary</T></h3>
                    <p className="text-slate-500 text-xs my-0"><T lang={language}>Daily executive snapshot for your farms</T></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    distressData?.score >= 50 ? 'bg-high-light text-high-dark border-high/20' :
                    distressData?.score >= 30 ? 'bg-watch-light text-watch-dark border-watch/20' :
                    'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {distressData?.score >= 50 ? <T lang={language}>🔴 High Risk</T> : distressData?.score >= 30 ? <T lang={language}>🟡 Moderate Watch</T> : <T lang={language}>🟢 Healthy & Stable</T>}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                    ⛅ <T lang={language}>Weather Ready</T>
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    💰 <T lang={language}>Mandi Price</T>: ₹{formatInteger(mandiPrices[0]?.sticker_price ?? mandiPrices[0]?.modal_price ?? mandiPrices[0]?.net_return ?? 2620, language)}/q
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stable-light text-stable-dark border border-stable/20">
                    ⚡ {advisories.filter(a => !completedAdvisoryIds.includes(a.id)).length} <T lang={language}>Actions Pending</T>
                  </span>
                </div>
              </div>

              <p className="text-slate-800 text-sm font-medium leading-relaxed my-0">
                {(() => {
                  const activeCount = advisories.filter(a => !completedAdvisoryIds.includes(a.id)).length;
                  const weatherText = (weather?.observation?.rainfall ?? 0) > 10 ? "heavy rain expected today" : "weather is clear for fieldwork";
                  const riskText = distressData?.score >= 50 ? "some risk factors require attention" : "your farms are in healthy condition overall";
                  
                  const topMandi = mandiPrices[0];
                  const topPrice = topMandi ? (topMandi.sticker_price ?? topMandi.modal_price ?? topMandi.net_return ?? topMandi.price ?? 2620) : 2620;
                  const cropName = selectedCrop ? capitalize(selectedCrop.crop_type) : 'Tomato';
                  const mandiName = topMandi?.mandi_name || 'Lasalgaon APMC';

                  let mandiNote = `Mandi rate for ${cropName} is ₹${formatInteger(topPrice, language)}/q at ${mandiName}.`;

                  if (priceHistoryData && priceHistoryData.length >= 2) {
                    const pLatest = priceHistoryData[0]?.modal_price ?? priceHistoryData[0]?.price ?? topPrice;
                    const pPrev = priceHistoryData[Math.min(6, priceHistoryData.length - 1)]?.modal_price ?? priceHistoryData[Math.min(6, priceHistoryData.length - 1)]?.price;
                    if (pLatest && pPrev && pPrev > 0) {
                      const diff = pLatest - pPrev;
                      const pct = ((diff / pPrev) * 100).toFixed(1);
                      if (diff > 10) {
                        mandiNote = `${cropName} rates increased by ₹${Math.round(diff)}/q (+${pct}%) to ₹${formatInteger(pLatest, language)}/q at ${mandiName}.`;
                      } else if (diff < -10) {
                        mandiNote = `${cropName} rates dropped by ₹${Math.abs(Math.round(diff))}/q (${pct}%) to ₹${formatInteger(pLatest, language)}/q at ${mandiName}.`;
                      }
                    }
                  }
                  
                  const summaryStr = activeCount === 0
                    ? `🎉 All tasks completed for today! ${capitalize(riskText)}, and ${weatherText}. ${mandiNote}`
                    : `Overall, ${riskText}. ${capitalize(weatherText)}. ${mandiNote} You have ${activeCount} pending action item${activeCount > 1 ? 's' : ''} recommended for today below.`;

                  return <T lang={language}>{summaryStr}</T>;
                })()}
              </p>
            </div>

            {/* 2. 2-Column Dashboard Grid (Weather Advisor & Farm Health Risk) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Farm Weather Advisor */}
              <div className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm text-left hover:border-stable transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sky-500 flex items-center gap-2">
                      <CloudRain size={24} />
                      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider my-0"><T lang={language}>Weather Advisor</T></h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {farms.length > 1 && (
                        <select 
                          value={selectedFarm?.id || ''}
                          onChange={(e) => {
                            const f = farms.find(farm => farm.id === parseInt(e.target.value));
                            if (f) {
                              setSelectedFarm(f);
                              const locId = f.latitude && f.longitude ? `${f.latitude},${f.longitude}` : (f.district || f.name);
                              fetchWeather(locId);
                            }
                          }}
                          className="text-xs font-bold px-2 py-1 rounded-lg border border-earth-200 bg-earth-50 text-slate-700 focus:outline-none max-w-[120px] truncate"
                          title="Select farm for weather details"
                        >
                          {farms.map((f, i) => (
                            <option key={f.id} value={f.id}>
                              {f.name || f.district || `Farm #${i+1}`}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => refreshWeatherFromApi()}
                        disabled={loadingWeather}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                        title="Sync weather"
                      >
                        <RefreshCw size={14} className={loadingWeather ? 'animate-spin text-sky-500' : ''} />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs font-medium my-0 flex items-center gap-1">
                    <MapPin size={13} className="text-amber-500" />
                    <span className="font-semibold text-slate-800">
                      {selectedFarm?.name && selectedFarm.name !== selectedFarm?.district
                        ? selectedFarm.name
                        : (selectedFarm?.district || 'Main Farm')}
                    </span>
                    <span>·</span>
                    <span>
                      {selectedFarm?.district 
                        ? `${selectedFarm.district}${selectedFarm.state ? ', ' + selectedFarm.state : ''}`
                        : (farmer?.location_id ? farmer.location_id.replace('_', ', ') : 'Nashik')
                      }
                    </span>
                  </p>

                  <div className="flex items-baseline justify-between mt-2">
                    <p className="text-slate-900 text-3xl font-black my-0">
                      {weather?.observation?.temperature != null ? `${weather.observation.temperature.toFixed(1)}°C` : '27.0°C'}
                    </p>
                    <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                      {(() => {
                        const rain = weather?.observation?.rainfall ?? 0;
                        const hum = weather?.observation?.humidity ?? 80;
                        if (rain > 10) return <T lang={language}>Rainy</T>;
                        if (hum > 78) return <T lang={language}>Warm & Moist</T>;
                        return <T lang={language}>Clear & Sunny</T>;
                      })()}
                    </span>
                  </div>

                  {/* Toggleable Raw Weather Metrics */}
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowRawWeatherMetrics(!showRawWeatherMetrics)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center justify-between w-full"
                    >
                      <span><T lang={language}>Weather Metrics</T></span>
                      <ChevronDown size={14} className={`transition-transform ${showRawWeatherMetrics ? 'rotate-180' : ''}`} />
                    </button>

                    {showRawWeatherMetrics && (
                      <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mt-2 pt-1">
                        <span className="flex items-center gap-1"><CloudRain size={12} className="text-sky-500" /> {weather?.observation?.rainfall != null ? (weather.observation.rainfall > 0 ? `${weather.observation.rainfall.toFixed(1)}mm` : '0mm') : '5mm'}</span>
                        <span className="flex items-center gap-1"><Droplets size={12} className="text-blue-500" /> {weather?.observation?.humidity != null ? `${weather.observation.humidity.toFixed(0)}%` : '82%'}</span>
                        <span className="flex items-center gap-1"><Wind size={12} className="text-teal-500" /> {weather?.observation?.wind_speed != null ? `${weather.observation.wind_speed.toFixed(0)}km/h` : '14km/h'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Weather Action Guidance Pill */}
                {(() => {
                  const rain = weather?.observation?.rainfall ?? 5.0;
                  const wind = weather?.observation?.wind_speed ?? 14.0;
                  const hum = weather?.observation?.humidity ?? 82.0;

                  if (rain > 10 || (weather?.forecasts && weather.forecasts[0]?.rainfall_forecast > 15)) {
                    return (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-100 text-red-800 border border-red-200 mt-3 block">
                        🔴 <T lang={language}>Heavy Rain — Postpone Chemical Spraying</T>
                      </span>
                    );
                  } else if (wind > 15) {
                    return (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 mt-3 block">
                        🟠 <T lang={language}>High Wind — Hold Spraying Fieldwork</T>
                      </span>
                    );
                  } else if (hum > 78) {
                    return (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 mt-3 block">
                        🟠 <T lang={language}>High Humidity — Inspect Fungal Disease Risk</T>
                      </span>
                    );
                  }
                  return (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 mt-3 block">
                      🟢 <T lang={language}>Good Weather — Optimal for Fieldwork</T>
                    </span>
                  );
                })()}
              </div>

              {/* Card 2: Distress Risk */}
              <div 
                onClick={() => setActiveTab('risk-detail')}
                className={`p-5 rounded-2xl border shadow-sm text-left cursor-pointer transition-colors flex flex-col justify-between ${
                  distressData?.score >= 50
                    ? 'bg-high-light border-high-dark/20 hover:bg-high-light/80'
                    : distressData?.score >= 30
                    ? 'bg-watch-light border-watch-dark/20 hover:bg-watch-light/80'
                    : 'bg-stable-light border-stable-dark/20 hover:bg-stable-light/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`flex items-center gap-2 ${
                      distressData?.score >= 50 ? 'text-high' :
                      distressData?.score >= 30 ? 'text-watch' : 'text-stable'
                    }`}>
                      <AlertTriangle size={24} />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 my-0"><T lang={language}>Farm Health & Risk</T></h3>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-900 text-lg mt-1 my-0">
                    {distressData?.score >= 50 ? <T lang={language}>🔴 Attention Needed</T> : distressData?.score >= 30 ? <T lang={language}>🟡 Moderate Watch</T> : <T lang={language}>🟢 Healthy & Stable</T>}
                  </p>
                  <p className="text-slate-600 text-xs mt-1 my-0 font-medium leading-snug">
                    <T lang={language}>
                      {distressData?.score >= 50
                        ? 'Multiple stress factors detected. Review recommendations below.'
                        : distressData?.score >= 30
                        ? 'Market price fluctuations are currently the primary concern.'
                        : 'All farm conditions, soil, and financial indicators are healthy.'
                      }
                    </T>
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 mt-3 inline-flex items-center gap-1">
                  <T lang={language}>View Financial Details</T> <ChevronRight size={13} />
                </span>
              </div>
            </div>

            {/* What should I do today section */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 my-0">{t.homeWhatToDo}</h3>
                  <p className="text-slate-500 text-xs mt-0.5 my-0">Check off actions as you complete them on your farm</p>
                </div>
                <div className="flex items-center gap-2">
                  {completedAdvisoryIds.length > 0 && (
                    <button
                      onClick={() => setShowCompletedAdvisories(!showCompletedAdvisories)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      {showCompletedAdvisories ? 'Hide Completed' : `View Completed (${completedAdvisoryIds.length})`}
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-600 bg-earth-50 px-2.5 py-1 rounded-full border border-earth-200">
                    All Farms ({farms.length})
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {advisories.length > 0 ? (
                  (() => {
                    const priorityOrderMap: Record<string, number> = { high: 1, medium: 2, low: 3 };
                    const rawList = translatedAdvisories.length > 0 ? translatedAdvisories : advisories;
                    const filteredList = showCompletedAdvisories 
                      ? rawList 
                      : rawList.filter(a => !completedAdvisoryIds.includes(a.id));

                    const sortedList = [...filteredList].sort((a, b) => {
                      const pA = priorityOrderMap[(a.priority || '').toLowerCase()] || 4;
                      const pB = priorityOrderMap[(b.priority || '').toLowerCase()] || 4;
                      return pA - pB;
                    });

                    if (sortedList.length === 0) {
                      return (
                        <div className="p-8 text-center bg-emerald-50/60 rounded-xl border border-emerald-200">
                          <p className="text-3xl mb-2 my-0">🎉</p>
                          <h4 className="font-bold text-emerald-900 text-base my-0">All Actions Completed!</h4>
                          <p className="text-emerald-700 text-xs mt-1 my-0 font-medium">You have checked off all recommendations for today. Your crops are well managed!</p>
                        </div>
                      );
                    }

                    return sortedList.map((adv) => {
                      const isDone = completedAdvisoryIds.includes(adv.id);
                      const isExpanded = !!expandedAdvisoryIds[adv.id];
                      const farmObj = farms.find((f: any) => f.id === adv.farm_id);
                      const matchedCrop = adv.crop_name 
                        ? allCrops.find((c: any) => c.farm_id === adv.farm_id && c.crop_type.toLowerCase() === adv.crop_name.toLowerCase())
                        : allCrops.find((c: any) => c.farm_id === adv.farm_id);
                      const farmLabel = farmObj?.name || (farmObj?.district ? `${farmObj.district} Farm` : `Farm #${adv.farm_id}`);
                      const cropLabel = adv.crop_name 
                        ? `${capitalize(adv.crop_name)}${matchedCrop?.variety ? ` (${matchedCrop.variety})` : ''}` 
                        : (matchedCrop ? `${capitalize(matchedCrop.crop_type)} (${matchedCrop.variety || 'Local'})` : null);

                      return (
                        <div key={adv.id} className={`flex gap-3 items-start p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isDone ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-earth-50/70 border-earth-200 hover:border-stable/40 hover:shadow-xs'
                        }`}>
                          {/* Left Column: Checkbox + Downward Chevron Arrow directly below it */}
                          <div className="flex flex-col items-center shrink-0 gap-1 mt-0.5">
                            <button
                              onClick={() => toggleCompleteAdvisory(adv.id)}
                              title={isDone ? "Mark as pending" : "Mark action as completed"}
                              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                isDone ? 'text-emerald-600 bg-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {isDone ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                            </button>

                            {adv.reason && (
                              <button
                                onClick={() => toggleExpandAdvisory(adv.id)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Toggle detailed explanation"
                              >
                                <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>

                          {/* Right Content Column */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs bg-stable/10 text-stable-dark font-bold px-2.5 py-0.5 rounded-full border border-stable/20 flex items-center gap-1">
                                📍 {farmLabel}
                              </span>
                              {cropLabel && (
                                <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                  🌱 {cropLabel}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase text-white ml-auto ${
                                adv.priority === 'high' ? 'bg-high' : adv.priority === 'medium' ? 'bg-elevated' : 'bg-stable'
                              }`}>
                                {adv.priority} Priority
                              </span>
                            </div>

                            {/* Prominent Action Recommendation Heading */}
                            <h4 className={`font-extrabold text-base sm:text-lg leading-snug my-0 ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {adv.recommendation}
                            </h4>

                            {/* Collapsible Reason Box */}
                            {adv.reason && (
                              <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                  <p className="text-slate-600 text-xs sm:text-sm p-3 bg-white rounded-xl border border-earth-200 leading-relaxed my-0">
                                    {adv.reason}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <p className="text-slate-400 text-sm py-2 my-0">No alerts or advisories for today. Your crops are in optimal condition!</p>
                )}
              </div>
            </div>
              </div>
            );
          case 'crop': {
            const cropStageColors: Record<string, string> = {
              'Germination': 'bg-blue-500',
              'Vegetative Growth': 'bg-green-500',
              'Flowering': 'bg-yellow-500',
              'Fruit Development': 'bg-orange-500',
              'Maturity': 'bg-red-500',
              'Harvest': 'bg-stable',
            };
            const getCropStageColor = (stage: string) => {
              for (const [k, v] of Object.entries(cropStageColors)) {
                if ((stage || '').includes(k.split(' ')[0])) return v;
              }
              return 'bg-slate-400';
            };

            const cropEmojis: Record<string, string> = {
              tomato: '🍅', wheat: '🌾', rice: '🌾', onion: '🧅', potato: '🥔',
              maize: '🌽', sugarcane: '🎋', cotton: '🌿', soybean: '🫘',
              groundnut: '🥜', chilli: '🌶️', grapes: '🍇', banana: '🍌', mango: '🥭',
            };

            // Group crops by Crop Type
            const cropsByType: Record<string, any[]> = {};
            allCrops.forEach((c: any) => {
              const key = (c.crop_type || 'unknown').toLowerCase();
              if (!cropsByType[key]) cropsByType[key] = [];
              cropsByType[key].push(c);
            });

            // Group crops by Farm ID
            const cropsByFarm: Record<string, { farm: any; crops: any[] }> = {};
            farms.forEach((f: any) => {
              cropsByFarm[f.id] = { farm: f, crops: [] };
            });
            allCrops.forEach((c: any) => {
              if (cropsByFarm[c.farm_id]) {
                cropsByFarm[c.farm_id].crops.push(c);
              } else {
                cropsByFarm[c.farm_id] = {
                  farm: { id: c.farm_id, name: c.farm_name || `Farm ${c.farm_id}`, district: c.farm_district, area: c.farm_area },
                  crops: [c]
                };
              }
            });

            const toggleGroupExpand = (key: string) => {
              setExpandedCropGroups(prev => ({ ...prev, [key]: !prev[key] }));
            };

            // Render helper for Crop Plot Details (NO repeated crop image in Group by Crop expanded view)
            const renderCropPlotDetailCard = (crop: any) => {
              const farmAdvisories = advisories.filter((adv: any) => adv.farm_id === crop.farm_id);

              return (
                <div
                  key={crop.id}
                  onClick={() => {
                    setSelectedCrop(crop);
                    const farm = farms.find((f: any) => f.id === crop.farm_id);
                    if (farm) setSelectedFarm(farm);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-md bg-white text-left ${
                    selectedCrop?.id === crop.id ? 'ring-2 ring-stable border-stable' : 'border-earth-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-[10px] bg-stable/10 text-stable-dark font-bold px-2 py-0.5 rounded-full border border-stable/20 inline-block mb-1">
                        📍 {crop.farm_name || `Farm #${crop.farm_id}`}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm my-0">
                        {crop.variety || 'Standard Variety'}
                      </h4>
                      <p className="text-[11px] text-slate-500 my-0 mt-0.5">
                        📍 {crop.farm_district || 'District'} · {crop.farm_area || 1.0} acres
                      </p>
                    </div>
                    <span className={`text-[9px] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${getCropStageColor(crop.stage || '')}`}>
                      {translateStage(language, crop.stage) || 'Veg. Growth'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium pt-2 border-t border-slate-100">
                    <span>🌱 {t.cropSowingDate} {formatDaysAgo(getSowingDaysAgo(crop.sowing_date), language, nativeDigits)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCrop(crop.id);
                      }}
                      title="Delete crop plot"
                      className="text-slate-400 hover:text-high p-1 rounded transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {farmAdvisories.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1 my-0">
                        <AlertTriangle size={11} className="text-amber-600" /> Advisory Alert
                      </p>
                      <p className="text-xs text-slate-700 mt-0.5 line-clamp-2 my-0 leading-snug">
                        {farmAdvisories[0].recommendation}
                      </p>
                    </div>
                  )}
                </div>
              );
            };

            // Render helper for Visual Crop Image Card (used in Group by Farm expanded view)
            const renderCropImageCard = (crop: any) => {
              const farmAdvisories = advisories.filter((adv: any) => adv.farm_id === crop.farm_id);

              return (
                <div
                  key={crop.id}
                  onClick={() => {
                    setSelectedCrop(crop);
                    const farm = farms.find((f: any) => f.id === crop.farm_id);
                    if (farm) setSelectedFarm(farm);
                  }}
                  className={`relative rounded-2xl overflow-hidden border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 bg-white ${
                    selectedCrop?.id === crop.id ? 'ring-2 ring-stable border-stable' : 'border-earth-200'
                  }`}
                >
                  {/* Crop Background Image & Badges */}
                  <div className="relative h-40 w-full">
                    <img
                      src={getCropImage(crop.crop_type, crop.image_url)}
                      alt={crop.crop_type}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    {/* Stage badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`text-[9px] text-white font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm backdrop-blur-xs ${getCropStageColor(crop.stage || '')}`}>
                        {translateStage(language, crop.stage) || 'Veg. Growth'}
                      </span>
                    </div>
                    {/* Crop info overlay naturally blended */}
                    <div className="absolute bottom-3 left-3 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      <div className="text-lg leading-none">
                        {cropEmojis[crop.crop_type?.toLowerCase()] || '🌱'}
                      </div>
                      <h3 className="font-extrabold text-white text-base capitalize mt-0.5 my-0">{capitalize(translateCrop(language, crop.crop_type))}</h3>
                      <p className="text-[11px] text-slate-200 my-0 font-medium opacity-95">{crop.variety || 'Local variety'}</p>
                    </div>
                  </div>

                  {/* Card Footer Details */}
                  <div className="p-4 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>🌱 {t.cropSowingDate} {formatDaysAgo(getSowingDaysAgo(crop.sowing_date), language, nativeDigits)}</span>
                      <span className="text-[10px] bg-earth-100 text-earth-dark font-bold px-2 py-0.5 rounded-full">
                        {crop.farm_name || `Farm ${crop.farm_id}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>📍 {crop.farm_district || 'Nashik'} · {crop.farm_area || 1.0} acres</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCrop(crop.id);
                        }}
                        title="Delete crop plot"
                        className="text-slate-400 hover:text-high p-1 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Advisory preview if applicable */}
                    {farmAdvisories.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1 my-0">
                          <AlertTriangle size={11} className="text-amber-600" /> Advisory Alert
                        </p>
                        <p className="text-xs text-slate-700 mt-0.5 line-clamp-2 my-0 leading-snug">
                          {farmAdvisories[0].recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-6 text-left">
                {/* Header & Grouping Selector */}
                <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold my-0">{t.cropTitle}</h2>
                    <p className="text-slate-500 text-xs mt-1 my-0">
                      {allCrops.length > 0
                        ? formatFarmSummary(allCrops.length, farms.length, language, nativeDigits)
                        : t.cropTitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Grouping Toggle Pills */}
                    <div className="bg-earth-100 p-1 rounded-xl flex items-center border border-earth-200">
                      <button
                        onClick={() => setCropViewGroup('crop')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          cropViewGroup === 'crop'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Layers size={14} className={cropViewGroup === 'crop' ? 'text-stable' : ''} />
                        Group by Crop
                      </button>
                      <button
                        onClick={() => setCropViewGroup('farm')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          cropViewGroup === 'farm'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building2 size={14} className={cropViewGroup === 'farm' ? 'text-stable' : ''} />
                        Group by Farm
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowAddFarmModal(true)}
                        className="px-3 py-2 border border-stable/40 text-stable hover:bg-stable-light rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                      >
                        + Add Farm
                      </button>
                      <button
                        onClick={() => {
                          if (!selectedFarm && farms.length === 0) {
                            toast.warning("No farm available", "Please add a farm first.");
                            setShowAddFarmModal(true);
                            return;
                          }
                          setShowAddCropModal(true);
                        }}
                        className="px-3 py-2 bg-stable text-white hover:bg-stable-dark rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                      >
                        + {t.cropAddNew}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content view depending on group toggle */}
                {allCrops.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-earth-200 text-center">
                    <p className="text-4xl mb-3">🌱</p>
                    <p className="text-slate-500 text-sm font-medium">{t.cropTitle}</p>
                    <p className="text-slate-400 text-xs mt-1 mb-4">{t.cropAddNewFarm}</p>
                    <button
                      onClick={() => setShowAddCropModal(true)}
                      className="px-5 py-2.5 bg-stable text-white hover:bg-stable-dark rounded-xl text-sm font-bold transition-all"
                    >
                      Register First Crop
                    </button>
                  </div>
                ) : cropViewGroup === 'crop' ? (
                  /* GROUP BY CROP VIEW WITH VISUAL COVER CARDS IN A 3-COLUMN GRID */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                    {Object.entries(cropsByType).map(([cropTypeKey, cropItems]) => {
                      const isExpanded = !!expandedCropGroups[`crop_${cropTypeKey}`]; // Default collapsed
                      const totalAcres = cropItems.reduce((acc, c) => acc + (c.farm_area || 0), 0);
                      const emoji = cropEmojis[cropTypeKey] || '🌱';
                      const sampleImage = cropItems[0]?.image_url;

                      return (
                        <div key={cropTypeKey} className="bg-white rounded-2xl border border-earth-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                          {/* Visual Cover Header */}
                          <div 
                            onClick={() => toggleGroupExpand(`crop_${cropTypeKey}`)}
                            className="relative h-36 w-full cursor-pointer group overflow-hidden"
                          >
                            <img
                              src={getCropImage(cropTypeKey, sampleImage)}
                              alt={cropTypeKey}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                            
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-xs border border-white/20 shadow-sm">
                                {cropItems.length} plot{cropItems.length > 1 ? 's' : ''}
                              </span>
                              <span className="bg-black/40 text-white p-1 rounded-full backdrop-blur-xs border border-white/20 shadow-sm transition-transform duration-300">
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            </div>

                            <div className="absolute bottom-3 left-3 right-3 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xl leading-none">{emoji}</span>
                                <h3 className="font-extrabold text-white text-base capitalize leading-tight my-0">
                                  {capitalize(translateCrop(language, cropTypeKey))}
                                </h3>
                              </div>
                              <p className="text-[10px] text-slate-200 my-0 mt-0.5 font-medium opacity-95">
                                {totalAcres.toFixed(1)} total acres across farms
                              </p>
                            </div>
                          </div>

                          {/* Smooth Expanded Plot Details */}
                          <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-earth-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                              <div className="p-4 bg-earth-50/50 space-y-3">
                                {cropItems.map(renderCropPlotDetailCard)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* GROUP BY FARM VIEW WITH COMPACT CARDS IN A 3-COLUMN GRID */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                    {Object.values(cropsByFarm).map(({ farm, crops }) => {
                      const isExpanded = !!expandedCropGroups[`farm_${farm.id}`]; // Default collapsed
                      const farmTotalAcres = farm.area || farm.farm_area || 0;

                      return (
                        <div key={farm.id} className="bg-white rounded-2xl border border-earth-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                          {/* Compact Text-Based Farm Header */}
                          <div
                            onClick={() => toggleGroupExpand(`farm_${farm.id}`)}
                            className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white cursor-pointer hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="bg-white/10 p-2 rounded-xl text-amber-400 shrink-0">
                                  <Building2 size={18} />
                                </span>
                                <div>
                                  <h3 className="font-bold text-white text-base leading-snug my-0 flex items-center gap-2">
                                    {farm.name || `Farm ${farm.id}`}
                                  </h3>
                                  <p className="text-[11px] text-slate-300 my-0 font-medium flex items-center gap-1">
                                    📍 {farm.district || farm.location_id?.replace('_', ', ') || 'Nashik'}
                                  </p>
                                </div>
                              </div>

                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 border border-slate-600 shrink-0">
                                {crops.length} crop{crops.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs text-slate-300">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span>{farmTotalAcres} acres</span>
                                {farm.soil_type && <><span>·</span><span className="capitalize">{farm.soil_type}</span></>}
                                {farm.irrigation && <><span>·</span><span className="capitalize">{farm.irrigation}</span></>}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFarm(farm.id);
                                  }}
                                  title="Delete farm"
                                  className="text-red-300 hover:text-white p-1 rounded transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                                <span className="text-slate-400">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Smooth Expanded Crops Grid */}
                          <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-earth-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                              <div className="p-4 bg-earth-50/50">
                                {crops.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-2 my-0">No crops registered under this farm yet.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {crops.map(renderCropImageCard)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Advisory Feed — all farms, priority ordered with true farm names */}
                {advisories.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-lg my-0">Advisory Feed (Priority Ordered)</h3>
                      <span className="text-xs font-semibold text-slate-500 bg-earth-50 px-2.5 py-1 rounded-full border border-earth-200">
                        Sorted by Priority
                      </span>
                    </div>
                    <div className="border-l-2 border-stable pl-4 py-2 space-y-4">
                      {(() => {
                        const priorityOrderMap: Record<string, number> = { high: 1, medium: 2, low: 3 };
                        const sortedList = [...(translatedAdvisories.length > 0 ? translatedAdvisories : advisories)].sort((a, b) => {
                          const pA = priorityOrderMap[(a.priority || '').toLowerCase()] || 4;
                          const pB = priorityOrderMap[(b.priority || '').toLowerCase()] || 4;
                          return pA - pB;
                        });

                        return sortedList.map((adv: any) => {
                          const farmObj = farms.find((f: any) => f.id === adv.farm_id);
                          const cropObj = allCrops.find((c: any) => c.farm_id === adv.farm_id);
                          const farmName = farmObj?.name || (farmObj?.district ? `${farmObj.district} Farm` : `Farm #${adv.farm_id}`);
                          const cropName = cropObj ? `${capitalize(cropObj.crop_type)} (${cropObj.variety || 'Local'})` : null;

                          return (
                            <div key={adv.id} className="relative">
                              <span className={`absolute -left-[23px] top-2 h-3.5 w-3.5 rounded-full border-2 border-white ${
                                adv.priority === 'high' ? 'bg-high' : adv.priority === 'medium' ? 'bg-elevated' : 'bg-stable'
                              }`} />
                              <div className="bg-earth-50/60 p-4 rounded-xl border border-earth-200 shadow-2xs space-y-1.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold bg-stable/10 text-stable-dark px-2 py-0.5 rounded-full border border-stable/20">
                                      📍 {farmName}
                                    </span>
                                    {cropName && (
                                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                        🌱 {cropName}
                                      </span>
                                    )}
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                      · {adv.category}
                                    </span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase text-white ${
                                    adv.priority === 'high' ? 'bg-high' : adv.priority === 'medium' ? 'bg-elevated' : 'bg-stable'
                                  }`}>
                                    {adv.priority} Priority
                                  </span>
                                </div>
                                <p className="text-slate-900 text-sm font-semibold mt-1 my-0">{adv.recommendation}</p>
                                <p className="text-slate-500 text-xs mt-0.5 my-0 leading-relaxed">{adv.reason}</p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          }
      case 'market':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <h2 className="text-xl font-bold my-0">Mandi Pricing &amp; Net Realization</h2>
                <p className="text-slate-500 text-xs mt-1 mb-0">
                  Net returns after transport &amp; handling costs
                </p>
              </div>
              {allCrops.length > 1 && (
                <select
                  value={selectedCrop?.id || ''}
                  onChange={(e) => {
                    const crop = allCrops.find((c: any) => c.id === Number(e.target.value));
                    if (crop) {
                      setSelectedCrop(crop);
                      const farm = farms.find((f: any) => f.id === crop.farm_id);
                      if (farm) setSelectedFarm(farm);
                    }
                  }}
                  className="text-xs border border-earth-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium"
                >
                  {allCrops.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.crop_type} — {c.farm_name || `Farm ${c.farm_id}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedCrop && (
              <div className="text-xs bg-stable-light text-stable-dark font-semibold rounded-lg px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="capitalize">🌾 {selectedCrop.crop_type}</span>
                  <span className="text-slate-400">·</span>
                  <span>📍 Origin Farm: <strong>{selectedFarm?.name || `Farm #${selectedCrop.farm_id}`}</strong> ({selectedFarm?.district || 'Nashik'})</span>
                  {selectedCrop.stage && <><span className="text-slate-400">·</span><span>{selectedCrop.stage}</span></>}
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Distances calculated dynamically from farm GPS</span>
              </div>
            )}

            {/* Mandi comparison table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">{t.marketMandiName}</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">{t.marketDistance}</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">{t.marketStickerPrice}</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">{t.marketTransport}</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">{t.marketFees}</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">{t.marketNetReturn}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mandiPrices.length > 0 ? (
                    (showAllMandis ? mandiPrices : mandiPrices.slice(0, 5)).map((m, idx) => (
                      <tr 
                        key={m.mandi_id || idx} 
                        className={idx === 0 ? "bg-stable-light font-semibold text-stable" : "bg-white text-slate-700"}
                      >
                        <td className="px-4 py-3 font-bold">
                          {m.mandi_name} {idx === 0 && <span className="text-[10px] bg-stable text-white px-1.5 py-0.5 rounded-md ml-1.5 uppercase tracking-wide">{t.marketBestValue}</span>}
                        </td>
                        <td className="px-4 py-3 font-mono">{formatInteger(m.distance_km, language, nativeDigits)} km</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(m.sticker_price, language, nativeDigits)}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(m.transport_cost, language, nativeDigits)}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(m.other_fees, language, nativeDigits)}</td>
                        <td className="px-4 py-3 font-extrabold font-mono">{formatCurrency(m.net_return, language, nativeDigits)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No mandi comparison data available. Register crop above to evaluate APMCs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* View More Mandis Button */}
            {mandiPrices.length > 5 && (
              <div className="flex justify-center pt-1">
                <button
                  onClick={() => setShowAllMandis(!showAllMandis)}
                  className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  {showAllMandis ? 'Show Top 5 Local Mandis' : `View More Mandis (+${mandiPrices.length - 5} More)`}
                </button>
              </div>
            )}

            {mandiPrices.length > 0 && (
              <div className="bg-stable-light p-3.5 rounded-xl border border-stable-dark/10 text-xs text-stable-dark text-left">
                💡 **System Tip:** Sell your crop at **{mandiPrices[0].mandi_name}**. Even though sticker prices vary across APMCs, selling here minimizes transportation overhead and commissions, netting you a peak return of **{formatCurrency(mandiPrices[0].net_return, language, nativeDigits)} per quintal**.
              </div>
            )}

            {/* Price Crash Banner */}
            {priceCrashStatus && priceCrashStatus.price_crash && (
              <div className="flex gap-4 items-start p-4 bg-high-light rounded-xl border border-high-dark/10">
                <span className="bg-high text-white p-2.5 rounded-xl shrink-0"><TrendingDown size={20} /></span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-high-dark text-sm">Price Crash Alert</h4>
                    <span className="text-[10px] bg-high text-white font-bold px-2 py-0.5 rounded-full uppercase">Critical</span>
                  </div>
                  <p className="text-slate-600 text-xs mt-1">
                    {priceCrashStatus.reason || `Recent 7-day average price has dropped ${priceCrashStatus.price_change_pct.toFixed(1)}% compared to the 30-day baseline. Consider holding stock or exploring alternative mandis.`}
                  </p>
                  <div className="mt-3 flex gap-3 text-xs text-slate-500">
                    <div><span className="font-bold text-slate-700">7-day avg:</span> {formatPerQuintal(priceCrashStatus.recent_7day_avg, language, nativeDigits)}</div>
                    <div><span className="font-bold text-slate-700">30-day baseline:</span> {formatPerQuintal(priceCrashStatus.baseline_30day_avg, language, nativeDigits)}</div>
                    <div className={priceCrashStatus.price_change_pct < 0 ? 'font-bold text-high-dark' : 'font-bold text-stable'}>
                      Change: {priceCrashStatus.price_change_pct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Price History Chart */}
            {priceHistoryData.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-earth-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Price Trend (30-Day History)</h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {selectedCrop ? <span className="capitalize">{selectedCrop.crop_type}</span> : null}
                      {mandiPrices.find(m => m.mandi_id === selectedMandiId) ? ` · ${mandiPrices.find(m => m.mandi_id === selectedMandiId)!.mandi_name}` : ''}
                    </p>
                  </div>
                </div>
                {(() => {
                  const chartData = priceHistoryData.map(p => ({
                    date: p.date,
                    'Modal Price': p.modal_price,
                    'Min Price': p.min_price,
                    'Max Price': p.max_price
                  }));
                  return (
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={(v: string) => v ? v.substring(5) : ''}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={(v: number) => `₹${Math.round(v)}`}
                          />
                          <Tooltip
                            contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            formatter={(value: any) => value !== null && value !== undefined ? `₹${parseFloat(value).toFixed(2)}` : ''}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Line type="monotone" dataKey="Modal Price" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="Min Price" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                          <Line type="monotone" dataKey="Max Price" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      case 'alerts':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold">{t.alertsTitle}</h2>
            <div className="space-y-4">
              {/* Dynamic Distress Alert — only shown when score > 30 */}
              {distressData && distressData.score >= 30 && (
                <div className={`flex gap-4 items-start p-4 rounded-xl border ${
                  distressData.score >= 70 ? 'bg-high-light border-high-dark/10' :
                  distressData.score >= 50 ? 'bg-elevated-light border-elevated-dark/10' :
                  'bg-watch-light border-watch-dark/10'
                }`}>
                  <span className={`p-2.5 rounded-xl text-white ${
                    distressData.score >= 70 ? 'bg-high' : distressData.score >= 50 ? 'bg-elevated' : 'bg-watch'
                  }`}><AlertTriangle size={20} /></span>
                  <div>
                    <div className="flex justify-between items-center">
                      <h4 className={`font-bold text-sm ${distressData.score >= 70 ? 'text-high-dark' : 'text-elevated-dark'}`}>
                        Distress Alert: {distressData.risk_level} Risk Level
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase text-white ${
                        distressData.score >= 70 ? 'bg-high' : 'bg-elevated'
                      }`}>{distressData.risk_level}</span>
                    </div>
                    {/* Dynamic narrative built from actual component scores */}
                    <p className="text-slate-600 text-xs mt-1">
                      {[
                        distressData.weather_component > 25
                          ? `Rainfall deficit is contributing to crop stress (weather risk: ${Math.round(distressData.weather_component)}/100)`
                          : null,
                        distressData.market_component > 25
                          ? `${allCrops[0]?.crop_type || 'Crop'} market prices are below baseline (market risk: ${Math.round(distressData.market_component)}/100)`
                          : null,
                        distressData.yield_component > 25
                          ? `Expected yield is lower than normal (yield risk: ${Math.round(distressData.yield_component)}/100)`
                          : null,
                        distressData.financial_component > 25 && cashFlow?.total_obligations > 0
                          ? `Financial coverage ratio is tight (financial risk: ${Math.round(distressData.financial_component)}/100)`
                          : null,
                        distressData.urgency_component > 25 && cashFlow?.obligations?.length > 0
                          ? `An obligation is due soon — check your financial resilience tab`
                          : null,
                      ].filter(Boolean).join('. ') || `Overall distress score is ${distressData.score}/100 — monitor conditions closely.`}
                    </p>
                    <button onClick={() => setActiveTab('risk-detail')} className="text-xs font-semibold text-high-dark mt-2.5 flex items-center gap-0.5 hover:underline">
                      View Financial Resilience Details <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Alerts (Pest Warnings) */}
              {alerts.length > 0 ? (
                (translatedAlerts.length > 0 ? translatedAlerts : alerts).map((al) => {
                  const matchingCrop = allCrops.find((c: any) => 
                    al.reason.toLowerCase().includes(c.crop_type.toLowerCase()) || 
                    (c.farm_name && al.reason.toLowerCase().includes(c.farm_name.toLowerCase()))
                  );
                  const matchingFarm = matchingCrop 
                    ? farms.find((f: any) => f.id === matchingCrop.farm_id) 
                    : (farms.length > 0 ? farms[0] : null);

                  return (
                    <div key={al.id} className={`flex gap-4 items-start p-4 rounded-xl border ${
                      al.severity === 'Critical' ? 'bg-high-light border-high-dark/10' : 'bg-elevated-light border-elevated-dark/10'
                    }`}>
                      <span className={`p-2.5 rounded-xl text-white ${
                        al.severity === 'Critical' ? 'bg-high' : 'bg-elevated'
                      }`}><AlertTriangle size={20} /></span>
                      <div className="flex-1 text-left">
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-800 text-sm my-0">Agricultural Risk Alert</h4>
                            {matchingFarm && (
                              <span className="text-[10px] bg-white text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                📍 {matchingFarm.name || matchingFarm.district || 'All Farms'}
                              </span>
                            )}
                            {matchingCrop && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                🌱 {capitalize(matchingCrop.crop_type)}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            al.severity === 'Critical' ? 'bg-high text-white' : 'bg-elevated text-white'
                          }`}>{al.severity}</span>
                        </div>
                        <p className="text-slate-600 text-xs mt-1 my-0 leading-relaxed">{al.reason}</p>
                      </div>
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>
        );
      // ── GOVERNMENT SUPPORT & FARMER ASSISTANCE PLATFORM ─────────────────────
      case 'support': {
        const currentFarm = selectedFarm || farms[0] || { name: 'Main Farm', district: 'Nashik', state: 'Maharashtra', area: 1.0, soil_type: 'loam', irrigation: 'drip' };

        const fallbackItems = [
          {
            id: 101, name: 'PM Fasal Bima Yojana (PMFBY)', category: 'scheme',
            support_type: 'Crop Loss Compensation Insurance',
            benefit_summary: 'Comprehensive risk coverage for standing crops against natural calamities, severe drought, and unseasonal rainfall.',
            why_recommended: 'Essential protection for your standing crop against yield loss & climate risk.',
            is_recommended: true, verification_url: 'https://pmfby.gov.in'
          },
          {
            id: 102, name: 'PM Kisan Samman Nidhi (PM-KISAN)', category: 'scheme',
            support_type: 'Direct Income Support (₹6,000/yr)',
            benefit_summary: 'Direct income support of ₹6,000 per year paid in three equal installments of ₹2,000 directly into farmer bank accounts.',
            why_recommended: 'Guaranteed annual financial support for agricultural input purchases.',
            is_recommended: true, verification_url: 'https://pmkisan.gov.in'
          },
          {
            id: 103, name: 'PM Krishi Sinchayee Yojana (PMKSY)', category: 'scheme',
            support_type: 'Micro-Irrigation Drip Subsidy (55-80%)',
            benefit_summary: 'Up to 55% to 80% subsidy for installing drip and sprinkler micro-irrigation systems in crop fields.',
            why_recommended: 'High water conservation efficiency & lower electricity expenses.',
            is_recommended: false, verification_url: 'https://pmksy.gov.in'
          },
          {
            id: 201, name: 'Kisan Credit Card (KCC) Crop Loan', category: 'loan',
            support_type: 'Subsidized Working Capital Loan @ 4%',
            benefit_summary: 'Concessional crop credit up to ₹3 Lakh at 4% effective interest rate with 3% prompt repayment incentive.',
            why_recommended: 'Cheapest working capital financing for seeds, fertilizers, and field labor expenses.',
            is_recommended: true, verification_url: 'https://www.nabard.org'
          },
          {
            id: 202, name: 'NABARD Agri-Infrastructure Credit', category: 'loan',
            support_type: 'Post-Harvest Infrastructure Loan (3% Subvention)',
            benefit_summary: 'Interest subvention of 3% per annum for loans up to ₹2 Crore for setting up cold storages, polyhouses & sorting sheds.',
            why_recommended: 'Ideal for building on-farm storage to prevent distress selling of produce.',
            is_recommended: false, verification_url: 'https://www.nabard.org'
          },
          {
            id: 203, name: 'MUDRA Agricultural Machinery Finance', category: 'loan',
            support_type: 'Collateral-Free Equipment Loan',
            benefit_summary: 'Collateral-free loans up to ₹10 Lakh for purchasing tractors, solar pumps, tillers, and spraying equipment.',
            why_recommended: 'No mortgage collateral required for farm mechanization & tools.',
            is_recommended: false, verification_url: 'https://www.mudra.org.in'
          }
        ];

        const rawList = translatedSchemes.length > 0 ? translatedSchemes : (schemes.length > 0 ? schemes : fallbackItems);
        
        // Dynamic helper to identify loans vs schemes
        const isLoanItem = (s: any) => {
          const cat = (s.category || '').toLowerCase();
          const type = (s.support_type || '').toLowerCase();
          const name = (s.name || '').toLowerCase();
          return cat === 'loan' || type.includes('loan') || type.includes('credit') || name.includes('kcc') || name.includes('loan') || name.includes('credit');
        };

        const governmentSchemes = rawList.filter((s: any) => !isLoanItem(s));
        const agriLoans = rawList.filter((s: any) => isLoanItem(s));

        const activeItems = supportSubTab === 'schemes' 
          ? (governmentSchemes.length > 0 ? governmentSchemes : fallbackItems.filter(s => s.category === 'scheme'))
          : (agriLoans.length > 0 ? agriLoans : fallbackItems.filter(s => s.category === 'loan'));

        const recommendedItems = activeItems.filter((s: any) => s.is_recommended);
        const otherItems = activeItems.filter((s: any) => !s.is_recommended);

        // Helper to format descriptions into concise main bullet points
        const getBenefitBullets = (text: string) => {
          if (!text) return [];
          const sentences = text.split(/[.;]/).map(s => s.trim()).filter(s => s.length > 3);
          if (sentences.length <= 1) return [text];
          return sentences;
        };

        const AssistanceCard = ({ item, isHighPriority }: { item: any; isHighPriority?: boolean }) => {
          const rawDescription = item.benefit_summary || item.support_type;
          const benefitBullets = getBenefitBullets(rawDescription);

          return (
            <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all space-y-4 ${
              isHighPriority
                ? 'bg-gradient-to-br from-emerald-50/90 via-white to-earth-50/70 border-emerald-300 shadow-sm hover:shadow-md'
                : 'bg-white border-earth-200 shadow-xs hover:border-stable/40'
            }`}>
              <div className="space-y-3">
                {/* Header Badge Strip */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isHighPriority && (
                      <span className="text-xs font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        ⭐ <T lang={language}>Top Match</T>
                      </span>
                    )}
                    <span className="text-xs font-extrabold bg-earth-100 text-slate-800 px-3 py-1 rounded-full border border-earth-200 uppercase">
                      {item.support_type}
                    </span>
                    {item.state && item.state !== 'All' && (
                      <span className="text-xs font-extrabold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300 uppercase">
                        📍 {item.state} <T lang={language}>Only</T>
                      </span>
                    )}
                    {creditAssessment && (item.category === 'loan' || supportSubTab === 'loans') && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        creditAssessment.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        creditAssessment.status === 'MANUAL REVIEW' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-red-100 text-red-900 border-red-300'
                      }`}>
                        💳 Credit: {creditAssessment.status} ({creditAssessment.credit_score}/900)
                      </span>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-black text-emerald-900 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-300">
                    {item.relevance_score > 0 ? `${item.relevance_score}% Match` : <T lang={language}>Eligible</T>}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-extrabold text-slate-900 text-lg md:text-xl my-0 leading-snug">
                  {item.name}
                </h3>

                {/* Plain-Language Relevance Reason Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm space-y-1 text-left">
                  <p className="text-slate-500 font-extrabold uppercase my-0 tracking-wider text-[11px]">💡 <T lang={language}>Why This Fits Your Farm Context</T></p>
                  <p className="text-slate-900 font-semibold my-0 leading-relaxed">
                    {item.why_recommended || item.why_fits || `Matched for ${currentFarm.name} in ${currentFarm.district || 'your region'} with active crops.`}
                  </p>
                </div>

                {/* Main Points / Bullet Benefits Box */}
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs md:text-sm space-y-1.5 text-left">
                  <p className="text-emerald-900 font-extrabold uppercase my-0 tracking-wider text-[11px]">💰 <T lang={language}>Key Benefit Highlights</T></p>
                  <ul className="space-y-1 pl-0 my-0 list-none font-semibold text-emerald-950">
                    {benefitBullets.map((bullet: string, bIdx: number) => (
                      <li key={bIdx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-emerald-600 font-black text-sm select-none">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button & Verification Portal Link */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500">
                  <T lang={language}>Official Portal</T>
                </span>
                {item.verification_url && (
                  <a
                    href={item.verification_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs md:text-sm font-extrabold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <T lang={language}>Apply on Official Portal</T> <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6 text-left pb-8">
            {/* Sticky Sub-Tab Bar: Schemes vs Loans (Pinned flush at absolute top edge when scrolling) */}
            <div className="sticky -top-4 md:-top-8 z-20 bg-earth-50/95 backdrop-blur-md pt-3 pb-3 border-b border-earth-200 shadow-xs -mx-4 md:-mx-8 px-4 md:px-8">
              <div className="grid grid-cols-2 md:flex md:items-center gap-3">
                <button
                  onClick={() => setSupportSubTab('schemes')}
                  className={`w-full md:w-auto px-5 py-3 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                    supportSubTab === 'schemes'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-earth-200 hover:bg-earth-50'
                  }`}
                >
                  <span>🏛️ {t.supportSchemesTab}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    supportSubTab === 'schemes' ? 'bg-white/20 text-white' : 'bg-earth-100 text-slate-800'
                  }`}>
                    {governmentSchemes.length}
                  </span>
                </button>

                <button
                  onClick={() => setSupportSubTab('loans')}
                  className={`w-full md:w-auto px-5 py-3 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                    supportSubTab === 'loans'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-earth-200 hover:bg-earth-50'
                  }`}
                >
                  <span>🏦 Agricultural Loans &amp; Credit</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    supportSubTab === 'loans' ? 'bg-white/20 text-white' : 'bg-earth-100 text-slate-800'
                  }`}>
                    {agriLoans.length}
                  </span>
                </button>
              </div>
            </div>

            {/* TOP RECOMMENDED SECTION */}
            {recommendedItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <h3 className="text-lg font-extrabold text-slate-900 my-0">
                    Top Recommended {supportSubTab === 'schemes' ? 'Schemes' : 'Credit Options'} for Your Farm
                  </h3>
                  <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {recommendedItems.length} Matched
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {recommendedItems.map((item: any) => (
                    <AssistanceCard key={item.id} item={item} isHighPriority={true} />
                  ))}
                </div>
              </div>
            )}

            {/* OTHER ELIGIBLE SECTION */}
            {otherItems.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{supportSubTab === 'schemes' ? '📋' : '💳'}</span>
                  <h3 className="text-lg font-extrabold text-slate-900 my-0">
                    All Available {supportSubTab === 'schemes' ? 'Government Schemes' : 'Loan Programs'}
                  </h3>
                  <span className="text-xs font-black bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                    {otherItems.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {otherItems.map((item: any) => (
                    <AssistanceCard key={item.id} item={item} isHighPriority={false} />
                  ))}
                </div>
              </div>
            )}

            {activeItems.length === 0 && (
              <div className="bg-white p-12 rounded-2xl border border-earth-200 text-center text-slate-500 font-semibold text-sm">
                No {supportSubTab === 'schemes' ? 'schemes' : 'loans'} matched yet. Complete your farm profile to view eligible programs.
              </div>
            )}
          </div>
        );
      }



      case 'risk-detail': {
        const normalIncome   = cashFlow?.projected_net_income || 95000;
        const currentIncome  = cashFlow?.projected_net_income || 62000;
        const stressIncome   = Math.round(currentIncome * 0.7);
        const totalObligations = cashFlow?.total_obligations || 0;

        const getRatioText = (inc: number, ob: number) => {
          if (ob === 0) return 'N/A (No Debt)';
          const r = inc / ob;
          if (r >= 1.2) return `${r.toFixed(2)}× (Secure)`;
          if (r >= 1.0) return `${r.toFixed(2)}× (Tight)`;
          return `${r.toFixed(2)}× (Deficit)`;
        };
        const getRatioColor = (inc: number, ob: number) => {
          if (ob === 0) return 'text-stable';
          const r = inc / ob;
          if (r >= 1.2) return 'text-stable';
          if (r >= 1.0) return 'text-watch';
          return 'text-high';
        };

        // 5-pillar data from distressData
        const pillars = [
          {
            key: 'weather',
            label: '🌦️ Weather Risk',
            score: distressData?.weather_component ?? null,
            weight: '25%',
            color: '#3b82f6',
            what: 'Measures cumulative rainfall deficit/surplus and temperature extremes over the past 30 days relative to seasonal norms.',
            how: 'Score = max(0, min(100, |(Actual Rain − Expected Rain)| / Expected × 100 + TempDeviation × 2))',
            causes: [
              'Rainfall deficit >30% from seasonal average',
              'Heatwave days (>40°C) during crop growth',
              'Excess rainfall >50% causing waterlogging risk',
              'High humidity (>80%) sustained for >3 days',
            ],
          },
          {
            key: 'market',
            label: '📉 Market Risk',
            score: distressData?.market_component ?? null,
            weight: '25%',
            color: '#f97316',
            what: `Tracks price crash severity for the farmer's crops vs. the 30-day rolling average at nearest mandis.`,
            how: 'Score = max(0, min(100, Price Drop % × 2.5)) summed across all crops × weighted by area',
            causes: [
              'Tomato/onion price crash >15% in 7 days',
              'Bumper harvest in nearby districts (supply glut)',
              'Transport strike affecting mandi arrivals',
              'Import of competing produce reducing prices',
            ],
          },
          {
            key: 'yield',
            label: '🌾 Yield Risk',
            score: distressData?.yield_component ?? null,
            weight: '20%',
            color: '#22c55e',
            what: 'Predicts yield deviation from baseline using weather anomalies, pest alerts, and crop growth stage.',
            how: 'Score = Σ (Stage Risk Factor × Weather Anomaly × Pest Alert Weight) across all active crops',
            causes: [
              'Active pest/disease alert (Late Blight, aphids)',
              'Waterlogging during flowering stage',
              'Heat stress above 40°C at fruit development',
              'Insufficient irrigation during critical stages',
            ],
          },
          {
            key: 'financial',
            label: '💰 Financial Pressure',
            score: distressData?.financial_component ?? null,
            weight: '20%',
            color: '#ef4444',
            what: 'Evaluates upcoming loan obligations vs. projected income under current and stress scenarios.',
            how: 'Score = max(0, 100 − (Projected Income / Total Obligations × 50))',
            causes: [
              'KCC loan or input credit due within 30 days',
              'Projected income below obligation amount',
              'Multiple overlapping debt deadlines',
              'Rising input costs (fertiliser, diesel) reducing margins',
            ],
          },
          {
            key: 'urgency',
            label: '⏰ Urgency Factor',
            score: distressData?.urgency_component ?? null,
            weight: '10%',
            color: '#a855f7',
            what: 'Time-pressure amplifier — obligations due within 15 days increase the overall distress score significantly.',
            how: 'Score = (Obligations due <7 days × 30) + (Obligations due 7–15 days × 20) + (Obligations due 15–30 days × 10)',
            causes: [
              'Input credit due within 5 days',
              'KCC loan approaching deadline',
              'Multiple obligations within the same 2-week window',
              'Harvest not yet complete before obligation date',
            ],
          },
        ];

        const overallScore = distressData?.score ?? null;
        const riskLevel = distressData?.risk_level ?? 'Unknown';
        const riskBg = riskLevel === 'Critical' ? 'bg-high' : riskLevel === 'High' ? 'bg-high' :
                       riskLevel === 'Elevated' ? 'bg-watch' : riskLevel === 'Watch' ? 'bg-elevated' : 'bg-stable';

        return (
          <div className="p-4 md:p-6 space-y-6 text-left">
            <button onClick={() => setActiveTab('home')} className="text-xs font-semibold text-slate-500 hover:underline flex items-center gap-1">
              ← Back to Home
            </button>

            {/* ── Overall Score Card ── */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Composite Distress Score</p>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-5xl font-black">{overallScore !== null ? Math.round(overallScore) : '—'}</span>
                    <span className="text-slate-400 text-sm pb-1.5">/100</span>
                  </div>
                </div>
                <div className={`${riskBg} px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wide shadow`}>
                  {riskLevel}
                </div>
              </div>
              {/* Overall bar */}
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(overallScore ?? 0, 100)}%`,
                    background: overallScore !== null && overallScore >= 75 ? '#ef4444' :
                                overallScore !== null && overallScore >= 55 ? '#f97316' :
                                overallScore !== null && overallScore >= 40 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Formula: Distress Score = Weather(25%) + Market(25%) + Yield(20%) + Financial(20%) + Urgency(10%)
              </p>
            </div>

            {/* ── 5-Pillar Breakdown ── */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Pillar-Level Breakdown</h3>
              {pillars.map(p => (
                <div key={p.key} className="bg-white rounded-2xl border border-earth-100 shadow-xs overflow-hidden">
                  {/* Pillar header */}
                  <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{p.label}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{p.weight} weight</span>
                    </div>
                    <span className="text-xl font-black" style={{ color: p.color }}>
                      {p.score !== null ? Math.round(p.score) : '—'}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="px-4 pb-2">
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(p.score ?? 0, 100)}%`, background: p.color }}
                      />
                    </div>
                  </div>
                  {/* Detail */}
                  <details className="group">
                    <summary className="px-4 pb-3 text-[11px] text-stable font-semibold cursor-pointer hover:underline list-none flex items-center gap-1">
                      <span className="group-open:hidden">▶ What drives this?</span>
                      <span className="hidden group-open:inline">▼ Hide detail</span>
                    </summary>
                    <div className="px-4 pb-4 space-y-3 border-t border-earth-50 pt-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">What it measures</p>
                        <p className="text-xs text-slate-700">{p.what}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Calculation</p>
                        <code className="text-[10px] text-stable-dark bg-earth-50 px-2 py-1 rounded-lg block font-mono">{p.how}</code>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Common causes</p>
                        <ul className="space-y-1">
                          {p.causes.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-slate-300">•</span>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                </div>
              ))}
            </div>

            {/* ── Financial Scenarios Table ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 my-0">Financial Resilience Scenarios</h3>
                <span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase ${cashFlow?.has_shortfall ? 'bg-high' : 'bg-stable'}`}>
                  {cashFlow?.has_shortfall ? 'Deficit Risk' : 'Resilient'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Shows whether projected farm income covers your upcoming loan/input obligations under 3 scenarios.</p>
              <div className="overflow-x-auto rounded-xl border border-earth-100">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Scenario</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Net Income</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Obligations</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Coverage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {[
                      { label: '📈 Normal Baseline', inc: normalIncome, cls: '' },
                      { label: '🌤 Current Forecast', inc: currentIncome, cls: '' },
                      { label: '⚠️ Stress (−30%)', inc: stressIncome, cls: 'bg-high-light' },
                    ].map(row => (
                      <tr key={row.label} className={row.cls}>
                        <td className="px-4 py-3 font-semibold text-xs">{row.label}</td>
                        <td className="px-4 py-3 font-mono text-xs">₹{row.inc.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-mono text-xs">₹{totalObligations.toLocaleString('en-IN')}</td>
                        <td className={`px-4 py-3 font-bold text-xs ${getRatioColor(row.inc, totalObligations)}`}>
                          {getRatioText(row.inc, totalObligations)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Obligations ── */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900 my-0">Upcoming Obligations</h3>
                <button
                  onClick={() => setShowAddObligationModal(true)}
                  className="px-3 py-1 bg-stable text-white hover:bg-stable-dark rounded-lg text-xs font-bold transition-all"
                >+ Add</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cashFlow?.obligations && cashFlow.obligations.length > 0 ? (
                  cashFlow.obligations.map((ob: any) => {
                    const dueDate = new Date(ob.due_date);
                    const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
                    const urgent = daysLeft <= 7;
                    return (
                      <div key={ob.id} className={`p-4 rounded-xl border flex justify-between items-center shadow-xs ${urgent ? 'bg-high-light border-high-dark/10' : 'bg-white border-earth-200'}`}>
                        <div>
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase">{ob.type}</span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1 mb-0">₹{Number(ob.amount).toLocaleString('en-IN')}</h4>
                          <p className="text-slate-400 text-[10px] mt-0.5">
                            Due: {ob.due_date} · <span className={urgent ? 'text-high font-bold' : 'text-slate-400'}>{daysLeft > 0 ? `${daysLeft} days` : 'Overdue'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`p-2 rounded-lg ${urgent ? 'text-high bg-high-light' : 'text-elevated bg-elevated-light'}`}>
                            <AlertTriangle size={18} />
                          </span>
                          <button
                            onClick={() => handleDeleteObligation(ob.id)}
                            title="Delete obligation"
                            className="p-2 rounded-lg text-high hover:bg-high-light transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-400 text-xs py-2 col-span-2">No debt obligations registered. Cash flows are unencumbered.</p>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'profile':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold">Farmer Profile Settings</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-left">
                <div>
                  <p className="text-slate-400 font-semibold text-xs uppercase">Full Name</p>
                  <p className="text-slate-900 font-bold mt-0.5">{farmer?.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold text-xs uppercase">Phone Number</p>
                  <p className="text-slate-900 font-bold mt-0.5">{farmer?.phone}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold text-xs uppercase">Language Choice</p>
                  <p className="text-slate-900 font-bold mt-0.5">{languageNames[language]}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold text-xs uppercase">Default Block</p>
                  <p className="text-slate-900 font-bold mt-0.5">{farmer?.location_id}</p>
                </div>
              </div>

              {/* Language Switcher */}
              <div className="pt-4 border-t border-slate-100 text-left">
                <label className="block text-slate-400 font-semibold text-xs uppercase mb-2">{t.profileChangeLanguage}</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {(Object.keys(languageNames) as LanguageType[]).map((langKey) => (
                    <button
                      key={langKey}
                      onClick={() => {
                        setLanguage(langKey);
                        localStorage.setItem('kr_language', langKey);
                      }}
                      className={`text-xs py-2 px-3 rounded-xl border text-center transition-colors ${language === langKey ? 'bg-stable text-white border-stable font-semibold' : 'bg-white border-earth-200 hover:bg-slate-50'}`}
                    >
                      {languageNames[langKey]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-high border border-high/20 px-4 py-2.5 rounded-xl hover:bg-high-light font-semibold"
                >
                  <LogOut size={16} /> {t.profileSignOut}
                </button>
              </div>
            </div>
          </div>
        );


      // ── CROP ADVISOR TAB (formerly Yield Calculator) ─────────────────────────
      case 'yield': {
        // Globally limited to 5 primary crops
        const CROP_DEFAULTS: Record<string, { baseYield: number; costPerAcre: number; msp: number; unit: string; bestSoil: string; waterReq: string; emoji: string }> = {
          tomato: { baseYield: 120, costPerAcre: 18000, msp: 800,  unit: 'q/acre', bestSoil: 'loam', waterReq: 'Moderate', emoji: '🍅' },
          onion:  { baseYield: 80,  costPerAcre: 16000, msp: 600,  unit: 'q/acre', bestSoil: 'loam', waterReq: 'Moderate', emoji: '🧅' },
          wheat:  { baseYield: 20,  costPerAcre: 12000, msp: 2275, unit: 'q/acre', bestSoil: 'black', waterReq: 'Low-Moderate', emoji: '🌾' },
          grapes: { baseYield: 90,  costPerAcre: 45000, msp: 3500, unit: 'q/acre', bestSoil: 'loam', waterReq: 'High-Precision', emoji: '🍇' },
          rice:   { baseYield: 22,  costPerAcre: 14000, msp: 2183, unit: 'q/acre', bestSoil: 'clay', waterReq: 'High', emoji: '🌾' },
        };

        // Soil affinity matrix for 5 crops
        const soilMatrix: Record<string, Record<string, number>> = {
          tomato: { loam: 100, black: 90, clay: 75, sandy: 65, red: 75 },
          onion:  { loam: 100, black: 85, clay: 65, sandy: 85, red: 75 },
          wheat:  { black: 100, loam: 95, clay: 85, sandy: 60, red: 75 },
          grapes: { loam: 100, black: 95, clay: 70, sandy: 75, red: 80 },
          rice:   { clay: 100, loam: 80, black: 85, sandy: 40, red: 70 },
        };

        // Irrigation affinity matrix for 5 crops
        const irrigMatrix: Record<string, Record<string, number>> = {
          tomato: { drip: 98, sprinkler: 85, flood: 70, none: 50 },
          onion:  { drip: 95, sprinkler: 90, flood: 75, none: 55 },
          wheat:  { sprinkler: 98, drip: 90, flood: 85, none: 60 },
          grapes: { drip: 100, sprinkler: 70, flood: 50, none: 40 },
          rice:   { flood: 98, sprinkler: 75, drip: 80, none: 50 },
        };

        // Detailed crop-specific insights map
        const cropInsights: Record<string, { irrigationTip: string; nutrientTip: string; protectionTip: string }> = {
          tomato: {
            irrigationTip: "Drip irrigation prevents soil splash and reduces fungal leaf spot infection by 40%.",
            nutrientTip: "Apply Calcium Nitrate & Boron during flowering stage to prevent Blossom End Rot fruit cracking.",
            protectionTip: "High humidity (>78%) promotes Early Blight; spray Copper Oxychloride if lower leaves turn spotty."
          },
          onion: {
            irrigationTip: "Stop watering 15 days before harvesting to allow proper bulb hardening and prevent field rot.",
            nutrientTip: "Apply Sulphur (20 kg/acre) along with Potash to increase bulb pungency, size, and storage life.",
            protectionTip: "Watch for Purple Blotch during humid days. Keep drainage channels clear to prevent waterlogging."
          },
          wheat: {
            irrigationTip: "Critical watering stage: Crown Root Initiation (21 days) and flowering stage boost grain fill.",
            nutrientTip: "Split dose of Nitrogen: Top-dress Urea before 1st & 2nd irrigation for heavy, protein-rich grains.",
            protectionTip: "Inspect field edges for Yellow/Brown Rust pustules during cool, misty morning weather."
          },
          grapes: {
            irrigationTip: "Precision drip irrigation is mandatory. Regulate water strictly post-pruning to induce uniform buds.",
            nutrientTip: "Apply Potassium Sulphate (SOP) and Phosphoric Acid during berry development to raise °Brix sugar.",
            protectionTip: "High Downy Mildew risk in humid/rainy weather. Spray systemic fungicide prior to bloom."
          },
          rice: {
            irrigationTip: "Maintain 2-5 cm standing water during active tillering; drain field 10 days before harvesting.",
            nutrientTip: "Apply Zinc Sulphate (10 kg/acre) in clay soil to prevent Khaira leaf bronzing.",
            protectionTip: "Warm, humid conditions favor Stem Borer and Blast. Check tillers for whiteheads or dead hearts."
          }
        };

        // Current active farm context
        const currentFarm = selectedFarm || farms[0] || { id: 1, name: 'Main Farm', district: 'Nashik', soil_type: 'loam', irrigation: 'drip', area: 1.0 };
        const currentSoil = (yieldSoil || currentFarm.soil_type || 'loam').toLowerCase();
        const currentIrrigation = (yieldIrrigation || currentFarm.irrigation || currentFarm.irrigation_type || 'drip').toLowerCase();
        const currentArea = yieldArea > 0 ? yieldArea : (currentFarm.area || currentFarm.farm_area || 1.0);
        
        // Registered crop for this farm
        const registeredCropObj = allCrops.find(c => c.farm_id === currentFarm.id) || allCrops[0];
        const activeCropKey = CROP_DEFAULTS[(yieldCrop || registeredCropObj?.crop_type || 'tomato').toLowerCase()] ? (yieldCrop || registeredCropObj?.crop_type || 'tomato').toLowerCase() : 'tomato';

        // Dynamic Crop Suitability Evaluator (MCDA Model)
        const evaluateCropSuitability = (cropKey: string) => {
          const def = CROP_DEFAULTS[cropKey] || CROP_DEFAULTS.tomato;
          const soilScore = soilMatrix[cropKey]?.[currentSoil] || 75;
          const irrigScore = irrigMatrix[cropKey]?.[currentIrrigation] || 70;
          
          // Live weather score
          const rain = weather?.observation?.rainfall ?? 0;
          const hum = weather?.observation?.humidity ?? 80;
          let weatherScore = 85;
          if (cropKey === 'rice' && rain > 15) weatherScore = 98;
          if (cropKey === 'grapes' && hum > 78) weatherScore = 65;
          if (cropKey === 'wheat' && hum < 75) weatherScore = 92;

          // Market score
          const mandiPrice = mandiPrices.find(p => p.commodity?.toLowerCase().includes(cropKey.slice(0, 4)))?.modal_price || def.msp;
          const marketScore = mandiPrice > def.msp * 1.15 ? 95 : mandiPrice >= def.msp ? 85 : 65;

          // Net profit per acre calculation
          const yieldPerAcre = Math.round(def.baseYield * (irrigScore / 85) * (soilScore / 85));
          const grossRev = yieldPerAcre * mandiPrice;
          const netProfit = grossRev - def.costPerAcre;

          // Economic Score Index (normalized based on profit per acre)
          const econScore = Math.min(98, Math.max(55, Math.round(50 + netProfit / 4000)));

          // Balanced MCDA Weighted Score (35% Agronomic, 35% Economic, 15% Market, 15% Resource/Irrigation)
          const totalMatch = Math.round(soilScore * 0.35 + econScore * 0.35 + marketScore * 0.15 + irrigScore * 0.15);

          return {
            cropKey,
            totalMatch: Math.min(99, Math.max(55, totalMatch)),
            soilScore,
            econScore,
            irrigScore,
            weatherScore,
            marketScore,
            yieldPerAcre,
            mandiPrice,
            grossRev,
            inputCost: def.costPerAcre,
            netProfit,
            def,
            insights: cropInsights[cropKey] || cropInsights.tomato
          };
        };

        const currentCropEval = evaluateCropSuitability(activeCropKey);

        // Ranked 5 crops for recommendation
        const rankedCrops = Object.keys(CROP_DEFAULTS)
          .map(c => evaluateCropSuitability(c))
          .sort((a, b) => b.totalMatch - a.totalMatch);

        const top3Crops = rankedCrops.slice(0, 3);

        const calcYield = async () => {
          setYieldLoading(true);
          const defaults = CROP_DEFAULTS[yieldCrop] || CROP_DEFAULTS.tomato;
          const irrigMult = (irrigMatrix[yieldCrop]?.[yieldIrrigation] || 80) / 85;
          const soilMult = (soilMatrix[yieldCrop]?.[yieldSoil] || 80) / 85;
          const localQPerAcre = parseFloat((defaults.baseYield * irrigMult * soilMult).toFixed(1));
          const localTotalQ = parseFloat((localQPerAcre * yieldArea).toFixed(1));
          const pricePerQ = mandiPrices.find(p => p.commodity?.toLowerCase().includes(yieldCrop.slice(0,4)))?.modal_price || defaults.msp;
          const localRevenue = Math.round(localTotalQ * pricePerQ);
          const inputCost = Math.round(defaults.costPerAcre * yieldArea);
          const localProfit = localRevenue - inputCost;
          const localRoi = inputCost > 0 ? ((localProfit / inputCost) * 100).toFixed(1) : '0';

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          try {
            const params = new URLSearchParams({
              crop_type: yieldCrop,
              area_acres: String(yieldArea),
              rainfall_deviation: String(yieldRainfall),
              soil_type: yieldSoil,
              irrigation_type: yieldIrrigation,
            });
            const res = await fetch(`${API_BASE}/api/v1/yield/estimate?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              const profit = Math.round(data.projected_gross_revenue - inputCost);
              const roi = inputCost > 0 ? ((profit / inputCost) * 100).toFixed(1) : '0';
              setYieldResult({
                qPerAcre: data.estimated_yield_q_per_acre,
                totalQ: data.estimated_total_yield_q,
                pricePerQ: data.modal_price_per_q,
                revenue: data.projected_gross_revenue,
                inputCost,
                profit,
                roi,
                defaults,
                isML: true
              });
              toast.success("Yield calculated", `Updated via ML model: ~${data.estimated_yield_q_per_acre} q/ac.`);
              setYieldLoading(false);
              return;
            }
          } catch {
            // Instant local calculation fallback
          }

          setYieldResult({
            qPerAcre: localQPerAcre,
            totalQ: localTotalQ,
            pricePerQ,
            revenue: localRevenue,
            inputCost,
            profit: localProfit,
            roi: localRoi,
            defaults,
            isML: false
          });
          toast.success("Yield calculated", `Updated estimate: ~${localQPerAcre} q/ac.`);
          setYieldLoading(false);
        };

        return (
          <div className="space-y-6 pb-8 text-left">
            {/* Sub-Tab Navigation Header (Sticky Flush at absolute top edge on Scroll) */}
            <div className="sticky -top-4 md:-top-8 z-20 bg-earth-50/95 backdrop-blur-md pt-3 pb-3 border-b border-earth-200 shadow-xs -mx-4 md:-mx-8 px-4 md:px-8">
              <div className="grid grid-cols-2 md:flex md:items-center gap-2">
                {[
                  { id: 'overview', label: 'Executive Overview', icon: '📋' },
                  { id: 'recommendation', label: 'Crop Recommendation', icon: '💡' },
                  { id: 'water', label: 'Water & Soil Optimizer', icon: '💧' },
                  { id: 'simulator', label: 'Yield & Profit Simulator', icon: '📊' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAdvisorSubTab(tab.id as any)}
                    className={`w-full md:w-auto px-3.5 sm:px-5 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all text-center justify-center flex items-center gap-1.5 ${
                      advisorSubTab === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-earth-200 hover:bg-earth-50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <T lang={language}>{tab.label}</T>
                  </button>
                ))}
              </div>
            </div>

            {/* SUB-TAB 1: EXECUTIVE OVERVIEW */}
            {advisorSubTab === 'overview' && (
              <div className="space-y-6">
                {/* Dynamic Executive Decision Summary Banner */}
                <div className="bg-gradient-to-r from-stable-light via-white to-earth-50 p-6 rounded-2xl border border-stable/30 shadow-sm space-y-4">
                  {/* Compact Farm & Crop Selector Strip */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stable/20">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Farm Selector */}
                      {farms.length > 0 && (
                        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-earth-200 shadow-xs">
                          <MapPin size={16} className="text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-500 uppercase">Farm:</span>
                          <select
                            value={currentFarm.id}
                            onChange={(e) => {
                              const f = farms.find(farm => farm.id === parseInt(e.target.value));
                              if (f) {
                                setSelectedFarm(f);
                                setYieldSoil(f.soil_type || 'loam');
                                setYieldIrrigation(f.irrigation || f.irrigation_type || 'drip');
                                setYieldArea(f.area || f.farm_area || 1.0);
                                const farmCrop = allCrops.find(c => c.farm_id === f.id)?.crop_type;
                                if (farmCrop && CROP_DEFAULTS[farmCrop.toLowerCase()]) {
                                  setYieldCrop(farmCrop.toLowerCase());
                                }
                              }
                            }}
                            className="text-xs font-extrabold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
                          >
                            {farms.map((f, i) => (
                              <option key={f.id} value={f.id}>
                                📍 {f.name || f.district || `Farm #${i+1}`} ({f.area || f.farm_area || 1} ac)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Crop Selector */}
                      <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-earth-200 shadow-xs">
                        <Sprout size={16} className="text-stable shrink-0" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Crop:</span>
                        <select
                          value={activeCropKey}
                          onChange={(e) => setYieldCrop(e.target.value)}
                          className="text-xs font-extrabold bg-transparent text-slate-900 focus:outline-none cursor-pointer capitalize"
                        >
                          {Object.entries(CROP_DEFAULTS).map(([key, def]) => (
                            <option key={key} value={key}>
                              {def.emoji} {capitalize(translateCrop(language, key))}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <span className={`text-xs md:text-sm font-extrabold px-3.5 py-1 rounded-full border ${
                      currentCropEval.totalMatch >= 85 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                      currentCropEval.totalMatch >= 70 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                      'bg-red-100 text-red-900 border-red-300'
                    }`}>
                      {currentCropEval.totalMatch}% {currentCropEval.totalMatch >= 85 ? 'Excellent Match' : 'Moderate Match'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{currentCropEval.def.emoji}</span>
                    <h3 className="font-extrabold text-slate-900 text-lg md:text-xl my-0">
                      {capitalize(translateCrop(language, activeCropKey))} <T lang={language}>Suitability & Farm Summary</T>
                    </h3>
                  </div>

                  <p className="text-slate-900 text-base md:text-lg font-medium leading-relaxed my-0">
                    <T lang={language}>{`For ${currentFarm.name || currentFarm.district || 'Main Farm'} (${translateSoil(language, currentSoil)} Soil, ${translateIrrigation(language, currentIrrigation)} Irrigation), growing ${translateCrop(language, activeCropKey)} yields ~${currentCropEval.yieldPerAcre} q/acre with expected net profit of ₹${formatInteger(currentCropEval.netProfit * currentArea, language)} across ${currentArea} acres. Mandi price: ₹${currentCropEval.mandiPrice}/q.`}</T>
                  </p>
                </div>

                {/* Side-by-side Grid: Compatibility (Left) & Field Action Plan (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Suitability Gauge & 4 Key Factor Chips */}
                  <div className="bg-white p-6 md:p-7 rounded-2xl border border-earth-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <h3 className="text-base md:text-lg font-extrabold text-slate-900 my-0"><T lang={language}>Crop Compatibility</T> ({capitalize(translateCrop(language, activeCropKey))})</h3>
                        <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                          {currentCropEval.totalMatch}% <T lang={language}>Match</T>
                        </span>
                      </div>

                      {/* Progress Gauge */}
                      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200 mb-4">
                        <div 
                          className="bg-gradient-to-r from-stable via-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${currentCropEval.totalMatch}%` }}
                        />
                      </div>
                    </div>

                    {/* 4 Factor Chips Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-earth-50 p-3.5 rounded-xl border border-earth-200 text-center">
                        <p className="text-xs text-slate-500 font-bold uppercase my-0">🧪 <T lang={language}>Soil Fit</T></p>
                        <p className="text-xl font-black text-slate-900 mt-1 my-0">{currentCropEval.soilScore}%</p>
                        <p className="text-xs text-slate-600 font-bold my-0 capitalize">{translateSoil(language, currentSoil)}</p>
                      </div>
                      <div className="bg-earth-50 p-3.5 rounded-xl border border-earth-200 text-center">
                        <p className="text-xs text-slate-500 font-bold uppercase my-0">💧 <T lang={language}>Irrigation System</T></p>
                        <p className="text-xl font-black text-slate-900 mt-1 my-0">{currentCropEval.irrigScore}%</p>
                        <p className="text-xs text-slate-600 font-bold my-0 capitalize">{translateIrrigation(language, currentIrrigation)}</p>
                      </div>
                      <div className="bg-earth-50 p-3.5 rounded-xl border border-earth-200 text-center">
                        <p className="text-xs text-slate-500 font-bold uppercase my-0">⛅ <T lang={language}>Weather</T></p>
                        <p className="text-xl font-black text-slate-900 mt-1 my-0">{currentCropEval.weatherScore}%</p>
                        <p className="text-xs text-slate-600 font-bold my-0"><T lang={language}>Seasonal fit</T></p>
                      </div>
                      <div className="bg-earth-50 p-3.5 rounded-xl border border-earth-200 text-center">
                        <p className="text-xs text-slate-500 font-bold uppercase my-0">💰 <T lang={language}>Market Price</T></p>
                        <p className="text-xl font-black text-slate-900 mt-1 my-0">{currentCropEval.marketScore}%</p>
                        <p className="text-xs text-slate-600 font-bold my-0">₹{currentCropEval.mandiPrice}/q</p>
                      </div>
                    </div>
                  </div>

                  {/* Crop-Specific Action Plan */}
                  <div className="bg-white p-6 md:p-7 rounded-2xl border border-earth-200 shadow-sm space-y-3">
                    <div className="border-b border-slate-100 pb-2.5">
                      <h3 className="text-base md:text-lg font-extrabold text-slate-900 my-0"><T lang={language}>Field Action Plan for</T> {capitalize(translateCrop(language, activeCropKey))}</h3>
                      <p className="text-slate-600 text-xs mt-0.5 my-0 font-medium"><T lang={language}>Tailored field management guidance</T></p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-earth-50/90 border border-earth-200 text-left flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">💧</span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider my-0"><T lang={language}>Irrigation Guidance</T></h4>
                          <p className="text-slate-800 text-xs mt-1 my-0 leading-relaxed font-semibold">
                            <T lang={language}>{currentCropEval.insights.irrigationTip}</T>
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-earth-50/90 border border-earth-200 text-left flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">🧪</span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider my-0"><T lang={language}>Nutrient & Fertilizers</T></h4>
                          <p className="text-slate-800 text-xs mt-1 my-0 leading-relaxed font-semibold">
                            <T lang={language}>{currentCropEval.insights.nutrientTip}</T>
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-earth-50/90 border border-earth-200 text-left flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">🛡️</span>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider my-0"><T lang={language}>Pest & Disease Protection</T></h4>
                          <p className="text-slate-800 text-xs mt-1 my-0 leading-relaxed font-semibold">
                            <T lang={language}>{currentCropEval.insights.protectionTip}</T>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: CROP RECOMMENDATIONS */}
            {advisorSubTab === 'recommendation' && (
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-earth-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 my-0"><T lang={language}>What Crop Should I Grow Right Now?</T></h3>
                    <p className="text-slate-600 text-sm mt-1 my-0 font-semibold"><T lang={language}>{`Top recommended crops evaluated for ${currentFarm.name} (${translateSoil(language, currentSoil)} Soil, ${translateIrrigation(language, currentIrrigation)} Irrigation)`}</T></p>
                  </div>
                  <span className="text-xs md:text-sm font-extrabold text-slate-700 bg-earth-100 px-3 py-1.5 rounded-full border border-earth-200">
                    5 <T lang={language}>Crops Evaluated</T>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {top3Crops.map((item, idx) => {
                    const medal = idx === 0 ? '🥇 Best Match' : idx === 1 ? '🥈 2nd Choice' : '🥉 3rd Choice';
                    const isCurrent = item.cropKey === activeCropKey;
                    const isExpanded = !!expandedAdvisoryIds[`rec_${item.cropKey}`];

                    return (
                      <div key={item.cropKey} className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        idx === 0 ? 'bg-emerald-50/60 border-emerald-300 shadow-xs' : 'bg-earth-50/60 border-earth-200'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-3">
                            <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-slate-900 text-white">
                              <T lang={language}>{medal}</T>
                            </span>
                            <span className="text-xs md:text-sm font-black text-emerald-900 bg-emerald-200 px-2.5 py-1 rounded-full">
                              {item.totalMatch}% <T lang={language}>Match</T>
                            </span>
                          </div>

                          <h4 className="font-black text-xl text-slate-900 capitalize my-0 flex items-center gap-2">
                            {item.def.emoji} {capitalize(translateCrop(language, item.cropKey))}
                            {isCurrent && <span className="text-xs font-bold px-2 py-0.5 bg-stable text-white rounded-md"><T lang={language}>Selected</T></span>}
                          </h4>

                          <div className="mt-4 space-y-2 text-sm text-slate-800 font-semibold">
                            <div className="flex justify-between">
                              <span className="text-slate-500"><T lang={language}>Expected Yield:</T></span>
                              <span className="font-extrabold text-slate-900">{item.yieldPerAcre} q / acre</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500"><T lang={language}>Mandi Rate:</T></span>
                              <span className="font-extrabold text-slate-900">₹{item.mandiPrice} / q</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                              <span className="text-slate-600 font-bold"><T lang={language}>Est. Profit / Acre:</T></span>
                              <span className="font-black text-emerald-800 text-base">₹{formatInteger(item.netProfit, language)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Chevron toggle for "Why this crop?" (NO TEXT, JUST ICON) */}
                        <div className="mt-4 pt-2 border-t border-slate-200/80">
                          <button
                            onClick={() => toggleExpandAdvisory(`rec_${item.cropKey}`)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors inline-flex items-center justify-center"
                            title="Toggle suitability breakdown"
                          >
                            <ChevronDown size={20} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                              <div className="p-3.5 bg-white rounded-xl border border-earth-200 text-xs md:text-sm space-y-1.5 text-slate-700 font-semibold">
                                <p className="my-0">💰 <strong><T lang={language}>Profit Return:</T></strong> {item.econScore}% (₹{formatInteger(item.netProfit, language)}/acre)</p>
                                <p className="my-0">🧪 <strong><T lang={language}>Soil Fit:</T></strong> {item.soilScore}% on {translateSoil(language, currentSoil)}</p>
                                <p className="my-0">💧 <strong><T lang={language}>Water Fit:</T></strong> {item.irrigScore}% with {translateIrrigation(language, currentIrrigation)}</p>
                                <p className="my-0">📈 <strong><T lang={language}>Market Fit:</T></strong> Mandi score {item.marketScore}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: WATER & SOIL OPTIMIZER */}
            {advisorSubTab === 'water' && (
              <div className="space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-earth-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 my-0"><T lang={language}>Water & Irrigation Optimizer</T></h3>
                      <p className="text-slate-600 text-sm mt-1 my-0 font-semibold"><T lang={language}>{`Comparison for ${translateSoil(language, currentSoil)} soil with ${translateCrop(language, activeCropKey)}`}</T></p>
                    </div>
                    <span className="text-xs md:text-sm font-extrabold text-slate-700 bg-earth-100 px-3 py-1.5 rounded-full border border-earth-200">
                      <T lang={language}>Water Advisor</T>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-300 text-left">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-emerald-200 text-emerald-900">
                          <T lang={language}>Current:</T> {translateIrrigation(language, currentIrrigation)}
                        </span>
                        <span className="text-xs md:text-sm font-bold text-emerald-800">
                          {currentIrrigation === 'drip' ? <T lang={language}>🟢 Optimal</T> : <T lang={language}>🟡 Action Recommended</T>}
                        </span>
                      </div>
                      <p className="text-slate-900 text-base font-semibold my-0 leading-relaxed">
                        <T lang={language}>{currentCropEval.insights.irrigationTip}</T>
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-sky-50/80 border border-sky-300 text-left">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-sky-200 text-sky-900">
                          <T lang={language}>Recommended Best Practice</T>
                        </span>
                        <span className="text-xs md:text-sm font-extrabold text-sky-800">{translateIrrigation(language, 'drip')}</span>
                      </div>
                      <p className="text-slate-900 text-base font-semibold my-0 leading-relaxed">
                        <T lang={language}>
                          {currentIrrigation === 'drip'
                            ? 'Keep current Drip Irrigation system active. Clean dripper nozzles bi-weekly.'
                            : 'Switching from Flood to Drip saves ~35% water and boosts net return by ₹14,500/acre.'
                          }
                        </T>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-2xl border border-earth-200 shadow-sm space-y-4">
                  <h3 className="text-lg font-extrabold text-slate-900 my-0"><T lang={language}>Soil & Nutrient Guidance</T> ({translateSoil(language, currentSoil)})</h3>
                  <div className="p-5 rounded-2xl bg-earth-50 border border-earth-200">
                    <p className="text-slate-900 text-base font-semibold leading-relaxed my-0">
                      <T lang={language}>{currentCropEval.insights.nutrientTip}</T>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: YIELD & PROFIT SIMULATOR */}
            {advisorSubTab === 'simulator' && (
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-earth-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 my-0"><T lang={language}>Outcome Forecast & Parameter Simulator</T></h3>
                    <p className="text-slate-600 text-sm mt-1 my-0 font-semibold"><T lang={language}>{`Expected yield, input costs, and projected net income for ${translateCrop(language, activeCropKey)}`}</T></p>
                  </div>
                  <span className={`text-xs md:text-sm font-extrabold px-3 py-1 rounded-full border ${
                    yieldResult ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-earth-100 text-slate-700 border-earth-200'
                  }`}>
                    {yieldResult ? `✨ ML Model Calculated (+${yieldResult.roi}% ROI)` : <T lang={language}>📊 Live Estimate</T>}
                  </span>
                </div>

                {/* Unified Single Stat Chips Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-earth-50 p-5 rounded-2xl border border-earth-200 text-center">
                    <p className="text-3xl mb-1 my-0">{currentCropEval.def.emoji}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase my-0"><T lang={language}>Expected Yield</T></p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1 my-0">
                      {yieldResult ? yieldResult.qPerAcre : currentCropEval.yieldPerAcre} q/ac
                    </p>
                    <p className="text-xs text-slate-600 my-0 font-bold">
                      <T lang={language}>Total:</T> {yieldResult ? yieldResult.totalQ : (currentCropEval.yieldPerAcre * currentArea).toFixed(1)} q
                    </p>
                  </div>

                  <div className="bg-earth-50 p-5 rounded-2xl border border-earth-200 text-center">
                    <p className="text-3xl mb-1 my-0">📊</p>
                    <p className="text-xs text-slate-500 font-bold uppercase my-0"><T lang={language}>Mandi Price</T></p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1 my-0">
                      ₹{yieldResult ? yieldResult.pricePerQ : currentCropEval.mandiPrice}/q
                    </p>
                    <p className="text-xs text-slate-600 my-0 font-bold">Pimpalgaon Mandi</p>
                  </div>

                  <div className="bg-earth-50 p-5 rounded-2xl border border-earth-200 text-center">
                    <p className="text-3xl mb-1 my-0">📉</p>
                    <p className="text-xs text-slate-500 font-bold uppercase my-0"><T lang={language}>Total Input Cost</T></p>
                    <p className="text-2xl md:text-3xl font-black text-high mt-1 my-0">
                      ₹{formatInteger(yieldResult ? yieldResult.inputCost : currentCropEval.inputCost * currentArea, language)}
                    </p>
                    <p className="text-xs text-slate-600 my-0 font-bold">
                      ₹{formatInteger(currentCropEval.inputCost, language)} / acre
                    </p>
                  </div>

                  <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 text-center">
                    <p className="text-3xl mb-1 my-0">💰</p>
                    <p className="text-xs text-emerald-800 font-bold uppercase my-0"><T lang={language}>Projected Net Income</T></p>
                    <p className="text-2xl md:text-3xl font-black text-emerald-900 mt-1 my-0">
                      ₹{formatInteger(yieldResult ? yieldResult.profit : currentCropEval.netProfit * currentArea, language)}
                    </p>
                    <p className="text-xs text-emerald-700 my-0 font-black"><T lang={language}>Positive Return</T></p>
                  </div>
                </div>

                {/* Interactive Parameter Adjuster (Form) */}
                <div className="p-5 rounded-2xl bg-earth-50/70 border border-earth-200 space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider my-0"><T lang={language}>Tweak Parameters to Re-estimate</T></h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><T lang={language}>Crop</T></label>
                      <select value={yieldCrop} onChange={e => setYieldCrop(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-stable/40 bg-white">
                        {Object.keys(CROP_DEFAULTS).map(c => <option key={c} value={c}>{translateCrop(language, c)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><T lang={language}>Area (Acres)</T></label>
                      <input type="number" min={0.1} step={0.1} value={yieldArea} onChange={e => setYieldArea(parseFloat(e.target.value)||1)}
                        className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-stable/40 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><T lang={language}>Soil Type</T></label>
                      <select value={yieldSoil} onChange={e => setYieldSoil(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-stable/40 bg-white">
                        <option value="loam">{translateSoil(language, 'loam')}</option>
                        <option value="black">{translateSoil(language, 'black')}</option>
                        <option value="clay">{translateSoil(language, 'clay')}</option>
                        <option value="sandy">{translateSoil(language, 'sandy')}</option>
                        <option value="red">{translateSoil(language, 'red')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1"><T lang={language}>Irrigation System</T></label>
                      <select value={yieldIrrigation} onChange={e => setYieldIrrigation(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-stable/40 bg-white">
                        {['drip', 'sprinkler', 'flood', 'none'].map(ir => (
                          <option key={ir} value={ir}>{translateIrrigation(language, ir)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={calcYield}
                      disabled={yieldLoading}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {yieldLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Calculator size={15} />
                      )}
                      {yieldLoading ? <T lang={language}>Calculating ML Model...</T> : <T lang={language}>Recalculate with ML Model</T>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── FINANCIAL HEALTH TAB (Redesigned & Simplified) ───────────────────────────
      case 'financial': {
        const totalFarmArea = farms.reduce((s: number, f: any) => s + (f.area || 0), 0);
        const totalObligations = cashFlow?.obligations?.reduce((s: number, o: any) => s + o.amount, 0) || 0;
        const avgDistress = distressData?.score ?? 0;

        // Estimate annual income from all crops using current mandi prices
        const cropRevenues = allCrops.map((cr: any) => {
          const matchFarm = farms.find((f: any) => f.id === cr.farm_id);
          const area = matchFarm?.area || 1;
          const farmName = matchFarm?.name || 'Main Farm';
          const CROP_YIELD: Record<string, number> = {
            tomato:80, wheat:20, rice:22, onion:70, potato:90, soybean:12, maize:25, cotton:10, sugarcane:350, mustard:10
          };
          const COST: Record<string, number> = {
            tomato:18000, wheat:12000, rice:14000, onion:16000, potato:15000, soybean:8000, maize:9000, cotton:20000, sugarcane:22000, mustard:7000
          };
          const MSP: Record<string, number> = {
            tomato:800, wheat:2275, rice:2183, onion:600, potato:500, soybean:4600, maize:1870, cotton:6620, sugarcane:315, mustard:5650
          };
          const ct = cr.crop_type?.toLowerCase() || 'wheat';
          const baseQ = (CROP_YIELD[ct] || 20) * area;
          const pricePerQ = MSP[ct] || 2000;
          const revenue = Math.round(baseQ * pricePerQ);
          const cost = Math.round((COST[ct] || 12000) * area);
          return { id: cr.id, crop: cr.crop_type, farmId: cr.farm_id, farmName, area, revenue, cost, profit: revenue - cost };
        });

        // Farm level grouping
        const farmRevenuesMap: Record<string, { farmName: string; area: number; revenue: number; cost: number; profit: number; cropsCount: number }> = {};
        cropRevenues.forEach((cr: any) => {
          if (!farmRevenuesMap[cr.farmName]) {
            farmRevenuesMap[cr.farmName] = { farmName: cr.farmName, area: 0, revenue: 0, cost: 0, profit: 0, cropsCount: 0 };
          }
          farmRevenuesMap[cr.farmName].area += cr.area;
          farmRevenuesMap[cr.farmName].revenue += cr.revenue;
          farmRevenuesMap[cr.farmName].cost += cr.cost;
          farmRevenuesMap[cr.farmName].profit += cr.profit;
          farmRevenuesMap[cr.farmName].cropsCount += 1;
        });
        const farmRevenues = Object.values(farmRevenuesMap);

        const totalRevenue = cropRevenues.reduce((s: number, c: any) => s + c.revenue, 0);
        const totalCost = cropRevenues.reduce((s: number, c: any) => s + c.cost, 0);
        const netMoneyLeft = totalRevenue - totalCost - totalObligations;

        const resilienceScore = Math.max(0, Math.min(100,
          50
          + (netMoneyLeft > 0 ? 20 : -20)
          + (totalFarmArea >= 5 ? 10 : totalFarmArea >= 2 ? 5 : 0)
          + (totalObligations === 0 ? 15 : totalObligations < 50000 ? 5 : -10)
          - Math.round(avgDistress * 0.3)
        ));

        const rColor = resilienceScore >= 70 ? '#16a34a' : resilienceScore >= 45 ? '#d97706' : '#dc2626';
        const rLabel = resilienceScore >= 70 ? 'Strong' : resilienceScore >= 45 ? 'Moderate' : 'Needs Care';

        // Dynamic natural-language reasoning summary for farm financial health (rich, contextual & multi-scenario)
        const generateFinancialSummaryText = () => {
          const parts: string[] = [];

          // 1. Earning & Profitability Analysis
          if (netMoneyLeft > 100000) {
            parts.push(`Your farm is performing strongly with an excellent profit surplus of ₹${Math.abs(netMoneyLeft).toLocaleString('en-IN')} after crop expenses.`);
          } else if (netMoneyLeft > 30000) {
            parts.push(`Your farm is earning a healthy income surplus of ₹${Math.abs(netMoneyLeft).toLocaleString('en-IN')} above costs.`);
          } else if (netMoneyLeft > 0) {
            parts.push(`Your farm is maintaining a positive cash margin of ₹${Math.abs(netMoneyLeft).toLocaleString('en-IN')}.`);
          } else if (netMoneyLeft === 0) {
            parts.push(`Your harvest income currently breaks even with cultivation expenses.`);
          } else {
            parts.push(`Your farm operates at a net loss of ₹${Math.abs(netMoneyLeft).toLocaleString('en-IN')} this season due to cultivation costs exceeding current returns.`);
          }

          // 2. Debt & Obligations Liquidity Analysis
          if (totalObligations > 0) {
            if (netMoneyLeft > 0 && totalObligations > netMoneyLeft) {
              parts.push(`However, you have ₹${totalObligations.toLocaleString('en-IN')} in upcoming payments due, which exceeds your profit surplus and requires careful cash flow management.`);
            } else if (netMoneyLeft > 0) {
              parts.push(`You have ₹${totalObligations.toLocaleString('en-IN')} in upcoming payments due, which your farm surplus can comfortably cover.`);
            } else {
              parts.push(`In addition, you have ₹${totalObligations.toLocaleString('en-IN')} in upcoming debt obligations due, increasing financial strain.`);
            }
          } else {
            parts.push(`Encouragingly, your farm is debt-free with zero upcoming payment obligations.`);
          }

          // 3. Crop Diversification & Risk Exposure
          if (allCrops.length === 1) {
            const cropName = allCrops[0]?.crop_type || 'single crop';
            parts.push(`Planting a single crop (${cropName}) increases market price risk; consider crop diversification next season.`);
          } else if (allCrops.length >= 2) {
            parts.push(`Your multi-crop portfolio (${allCrops.length} crops) helps spread market and weather risks.`);
          }

          // 4. Land Acreage Efficiency Context
          if (totalFarmArea < 2.0) {
            parts.push(`On a small holding of ${totalFarmArea.toFixed(1)} acres, strict input cost control is key.`);
          } else if (totalFarmArea >= 5.0) {
            parts.push(`Your larger farm area (${totalFarmArea.toFixed(1)} acres) provides scale and financial buffer.`);
          }

          // 5. Regional Distress & Weather Exposure
          if (avgDistress > 60) {
            parts.push(`High regional distress (${avgDistress}%) signals potential weather or pest risk.`);
          }

          return parts.join(' ');
        };
        const farmSummaryText = generateFinancialSummaryText();

        return (
          <div className="space-y-6 pb-8">
            {/* Header Title & 2-Tab Navigation Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 md:p-5 rounded-2xl border border-earth-200 shadow-sm">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 my-0 flex items-center gap-2">
                  <PiggyBank size={26} className="text-emerald-600" />
                  <T lang={language}>Financial Health</T>
                </h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5 my-0">
                  <T lang={language}>Simple overview of your farm's income, expenses, and loan safety</T>
                </p>
              </div>

              {/* 2-Tab Navigation Switcher */}
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 w-full md:w-auto border border-slate-200">
                <button
                  onClick={() => setFinSubTab('overview')}
                  className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                    finSubTab === 'overview'
                      ? 'bg-white text-indigo-950 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🌾</span> <T lang={language}>Farm Overview</T>
                </button>
                <button
                  onClick={() => setFinSubTab('loan')}
                  className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                    finSubTab === 'loan'
                      ? 'bg-white text-indigo-950 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🛡️</span> <T lang={language}>Loan & Risk</T>
                </button>
              </div>
            </div>

            {/* TAB 1: FARM OVERVIEW */}
            {finSubTab === 'overview' && (
              <div className="space-y-6">
                {/* 1. TOP CARD: Farm Money Health Score & Dynamic Reasoning Summary */}
                <div className="bg-gradient-to-br from-white via-white to-earth-50/50 p-5 md:p-6 rounded-2xl border border-earth-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                  <div className="flex items-start md:items-center gap-5">
                    <div className="relative shrink-0">
                      <svg width={84} height={84} viewBox="0 0 100 100">
                        <circle cx={50} cy={50} r={42} fill="none" stroke="#f1f5f9" strokeWidth={10} />
                        <circle cx={50} cy={50} r={42} fill="none" stroke={rColor} strokeWidth={10}
                          strokeDasharray={`${(resilienceScore / 100) * 263.8} 263.8`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)" />
                        <text x={50} y={56} textAnchor="middle" fontSize={22} fontWeight="black" fill="#0f172a">{resilienceScore}</text>
                      </svg>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center flex-wrap gap-2.5">
                        <h3 className="text-lg md:text-xl font-black text-slate-900 my-0">
                          <T lang={language}>Farm Money Health</T> — <span style={{ color: rColor }}><T lang={language}>{rLabel}</T></span>
                        </h3>
                      </div>

                      <p className="text-xs md:text-sm text-slate-700 font-semibold my-0 leading-relaxed max-w-2xl">
                        <T lang={language}>{farmSummaryText}</T>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 bg-slate-50 border border-slate-200/70 p-3 rounded-xl text-center self-stretch md:self-auto flex flex-row md:flex-col justify-between items-center md:justify-center">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400 my-0">Health Rating</p>
                    <p className="text-sm font-black my-0" style={{ color: rColor }}>
                      <T lang={language}>{rLabel}</T> ({resilienceScore}/100)
                    </p>
                  </div>
                </div>

                {/* 2. SECOND ROW: 4 Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {/* Total Income */}
                  <div className="bg-gradient-to-br from-emerald-50/80 via-white to-white p-4 md:p-5 rounded-2xl border border-emerald-100 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide"><T lang={language}>Total Income</T></span>
                      <span className="text-xl">💰</span>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-emerald-950 my-0">
                      ₹{totalRevenue.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 my-0">
                      <T lang={language}>From registered crops</T> ({totalFarmArea.toFixed(1)} <T lang={language}>acres</T>)
                    </p>
                  </div>

                  {/* Total Costs */}
                  <div className="bg-gradient-to-br from-rose-50/80 via-white to-white p-4 md:p-5 rounded-2xl border border-rose-100 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wide"><T lang={language}>Total Costs</T></span>
                      <span className="text-xl">📉</span>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-rose-950 my-0">
                      ₹{totalCost.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 my-0">
                      <T lang={language}>Inputs & farming costs</T>
                    </p>
                  </div>

                  {/* Money Left / Net Profit */}
                  <div className={`bg-gradient-to-br ${netMoneyLeft >= 0 ? 'from-emerald-50/80 via-white to-white border-emerald-200' : 'from-rose-50/80 via-white to-white border-rose-200'} p-4 md:p-5 rounded-2xl border shadow-sm text-left`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-extrabold uppercase tracking-wide ${netMoneyLeft >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        <T lang={language}>Money Left</T>
                      </span>
                      <span className="text-xl">{netMoneyLeft >= 0 ? '🟢' : '🔴'}</span>
                    </div>
                    <p className={`text-lg md:text-2xl font-black my-0 ${netMoneyLeft >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {netMoneyLeft >= 0 ? '+' : '−'}₹{Math.abs(netMoneyLeft).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold mt-1 my-0">
                      {netMoneyLeft >= 0 ? <span className="text-emerald-600">🎉 <T lang={language}>Net Surplus</T></span> : <span className="text-rose-600">⚠️ <T lang={language}>Net Loss</T></span>}
                    </p>
                  </div>

                  {/* Payments Due */}
                  <div className="bg-gradient-to-br from-amber-50/80 via-white to-white p-4 md:p-5 rounded-2xl border border-amber-200/80 shadow-sm text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide"><T lang={language}>Payments Due</T></span>
                      <span className="text-xl">💳</span>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-amber-950 my-0">
                      ₹{totalObligations.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 my-0">
                      {cashFlow?.obligations?.length || 0} <T lang={language}>upcoming payments</T>
                    </p>
                  </div>
                </div>

                {/* 2-Column Side-by-Side Grid Row: Profit Breakdown & Payments Due */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                  {/* Left Column: Profit Breakdown */}
                  <div className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base my-0 flex items-center gap-2">
                          <BarChart3 size={18} className="text-indigo-600" /> <T lang={language}>Profit Breakdown</T>
                        </h3>
                        <p className="text-xs text-slate-500 my-0"><T lang={language}>View income & expenses per crop or farm</T></p>
                      </div>

                      {/* View Switcher: By Crop / By Farm */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                        <button
                          onClick={() => setFinBreakdownView('crop')}
                          className={`px-3 py-1 rounded-lg transition-all ${
                            finBreakdownView === 'crop' ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <T lang={language}>By Crop</T>
                        </button>
                        <button
                          onClick={() => setFinBreakdownView('farm')}
                          className={`px-3 py-1 rounded-lg transition-all ${
                            finBreakdownView === 'farm' ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <T lang={language}>By Farm</T>
                        </button>
                      </div>
                    </div>

                    {/* Breakdown List */}
                    {finBreakdownView === 'crop' ? (
                      cropRevenues.length > 0 ? (
                        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                          {cropRevenues.map((cr: any, i: number) => {
                            const pct = totalRevenue > 0 ? (cr.revenue / totalRevenue) * 100 : 0;
                            return (
                              <div key={i} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="capitalize text-slate-800">
                                    {translateCrop(language, cr.crop)} <span className="text-slate-400 font-normal">({cr.area} ac · {cr.farmName})</span>
                                  </span>
                                  <span className={cr.profit >= 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                                    {cr.profit >= 0 ? '+' : '−'}₹{Math.abs(cr.profit).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>

                                <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                                  <span><T lang={language}>Total Income</T>: ₹{cr.revenue.toLocaleString('en-IN')}</span>
                                  <span><T lang={language}>Total Costs</T>: ₹{cr.cost.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <p className="font-semibold text-sm my-0"><T lang={language}>No crops registered yet</T></p>
                          <p className="text-xs mt-1"><T lang={language}>Add a farm and crops to see your profit breakdown</T></p>
                        </div>
                      )
                    ) : (
                      farmRevenues.length > 0 ? (
                        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                          {farmRevenues.map((fr: any, i: number) => {
                            const pct = totalRevenue > 0 ? (fr.revenue / totalRevenue) * 100 : 0;
                            return (
                              <div key={i} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-bold">
                                  <span className="text-slate-800 font-extrabold">
                                    📍 {fr.farmName} <span className="text-slate-400 font-normal">({fr.area} ac · {fr.cropsCount} crops)</span>
                                  </span>
                                  <span className={fr.profit >= 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                                    {fr.profit >= 0 ? '+' : '−'}₹{Math.abs(fr.profit).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>

                                <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                                  <span><T lang={language}>Total Income</T>: ₹{fr.revenue.toLocaleString('en-IN')}</span>
                                  <span><T lang={language}>Total Costs</T>: ₹{fr.cost.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <p className="font-semibold text-sm my-0"><T lang={language}>No farms registered yet</T></p>
                        </div>
                      )
                    )}
                  </div>

                  {/* Right Column: Payments Due */}
                  <div className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base my-0 flex items-center gap-2">
                          <span>💳</span> <T lang={language}>Payments Due</T>
                        </h3>
                        <p className="text-xs text-slate-500 my-0"><T lang={language}>Manage upcoming loans & farm payments</T></p>
                      </div>

                      <button
                        onClick={() => setShowAddObligationModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <Plus size={14} /> <T lang={language}>Add Payment</T>
                      </button>
                    </div>

                    {cashFlow?.obligations?.length > 0 ? (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {cashFlow.obligations.map((ob: any) => (
                          <div key={ob.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">
                                {ob.type === 'loan' ? '🏦' : ob.type === 'inputs' ? '🌱' : ob.type === 'lease' ? '🚜' : '📦'}
                              </span>
                              <div>
                                <p className="font-extrabold text-slate-800 text-xs my-0 capitalize">
                                  {translateObligation(language, ob.type)}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium my-0">Due: {ob.due_date}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span className="font-black text-rose-600 text-xs md:text-sm">
                                ₹{Number(ob.amount).toLocaleString('en-IN')}
                              </span>
                              <button
                                onClick={() => handleDeleteObligation(ob.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Delete payment"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-500 my-0">🎉 No upcoming payments due!</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Add Payment" above to record a payment.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LOAN & RISK */}
            {finSubTab === 'loan' && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-gradient-to-br from-indigo-50/80 via-white to-earth-50/60 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2 border-b border-indigo-100/60 pb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg md:text-xl my-0 flex items-center gap-2">
                        <span>🛡️</span> <T lang={language}>Loan Check</T>
                      </h3>
                      <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                        <T lang={language}>Can I safely take a loan for my farm? Check your safe limit instantly</T>
                      </p>
                    </div>
                    <button
                      onClick={() => { setActiveTab('support'); setSupportSubTab('loans'); }}
                      className="text-xs font-extrabold text-indigo-700 bg-indigo-100/80 hover:bg-indigo-200 px-3.5 py-1.5 rounded-full transition-colors"
                    >
                      View Government Loan Schemes →
                    </button>
                  </div>

                  {/* Loan Risk Score Gauge & Result Banner */}
                  {(() => {
                    const cScore = creditAssessment?.credit_score || 730;
                    const cStatus = creditAssessment?.status || 'MANUAL REVIEW';
                    const cColor = cScore >= 750 ? '#16a34a' : cScore >= 600 ? '#d97706' : '#dc2626';

                    return (
                      <div className="space-y-4">
                        {/* Summary Result Banner */}
                        <div className={`p-4 md:p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                          cStatus === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' :
                          cStatus === 'MANUAL REVIEW' ? 'bg-amber-50 border-amber-200 text-amber-950' :
                          'bg-rose-50 border-rose-200 text-rose-950'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <svg width={68} height={68} viewBox="0 0 100 100">
                                <circle cx={50} cy={50} r={42} fill="none" stroke="#e2e8f0" strokeWidth={10} />
                                <circle cx={50} cy={50} r={42} fill="none" stroke={cColor} strokeWidth={10}
                                  strokeDasharray={`${(Math.max(0, Math.min(100, ((cScore - 300) / 600) * 100)) / 100) * 263.8} 263.8`}
                                  strokeLinecap="round"
                                  transform="rotate(-90 50 50)" />
                                <text x={50} y={56} textAnchor="middle" fontSize={20} fontWeight="black" fill="#0f172a">{cScore}</text>
                              </svg>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base md:text-lg font-black uppercase tracking-wide" style={{ color: cColor }}>
                                  {cStatus === 'APPROVED' ? '✅ Loan Approved' : cStatus === 'MANUAL REVIEW' ? '⚠️ Needs Review' : '❌ High Risk'}
                                </span>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/90 border border-current text-slate-700">
                                  Loan Risk: {cScore} / 900
                                </span>
                              </div>
                              <p className="text-xs md:text-sm font-bold mt-1 my-0 text-slate-800">
                                {cStatus === 'APPROVED' ? (
                                  `🎉 Your requested loan of ₹${Number(creditAssessment?.loan_requested || loanRequestedInput).toLocaleString('en-IN')} is safe for your farm!`
                                ) : (
                                  `Based on your farm size and harvest income, a safer loan amount is ₹${Number(creditAssessment?.approved_amount || 56000).toLocaleString('en-IN')}.`
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="bg-white/90 px-4 py-2.5 rounded-xl border border-current/20 shrink-0 text-right">
                            <p className="text-[10px] uppercase font-extrabold text-slate-500 my-0">Suggested Safe Limit</p>
                            <p className="text-xl font-black my-0 text-slate-900">
                              ₹{Number(creditAssessment?.approved_amount || 56000).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Interactive Assessor Form */}
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-indigo-100/80 space-y-4">
                    <h4 className="font-extrabold text-slate-900 text-sm my-0">Test a Loan Amount & AgTech Assets</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">Requested Loan Amount (₹)</label>
                        <input
                          type="number"
                          value={loanRequestedInput}
                          onChange={(e) => setLoanRequestedInput(Number(e.target.value))}
                          className="w-full text-base font-extrabold px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="50000"
                          min={5000}
                          step={5000}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">AgTech & Infrastructure Toggles</label>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                          <label className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={infraColdStorage}
                              onChange={(e) => setInfraColdStorage(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>❄️ Cold Storage</span>
                          </label>
                          <label className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={infraPrecisionTech}
                              onChange={(e) => setInfraPrecisionTech(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>🛰️ Precision AgTech</span>
                          </label>
                          <label className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={infraSellsStubble}
                              onChange={(e) => setInfraSellsStubble(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>🌾 Sell Stubble</span>
                          </label>
                          <label className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={infraDoesSorting}
                              onChange={(e) => setInfraDoesSorting(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>🏷️ Produce Sorting</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 flex-wrap gap-3">
                      <button
                        onClick={handleAssessCredit}
                        disabled={creditLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs md:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2"
                      >
                        {creditLoading ? <RefreshCw size={16} className="animate-spin" /> : '⚡ Check Loan Safety'}
                      </button>

                      <p className="text-[11px] text-slate-400 italic my-0 font-medium">
                        Estimates your safe loan limit based on farm capacity.
                      </p>
                    </div>
                  </div>

                  {/* Expandable Detailed Calculations & Contributing Factors */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowLoanDetails(!showLoanDetails)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100/70 transition-colors text-xs font-extrabold text-indigo-900"
                    >
                      <span className="flex items-center gap-2">
                        <span>🔍</span> Show Detailed Calculations & Analysis
                      </span>
                      {showLoanDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showLoanDetails && (
                      <div className="mt-3 p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs text-slate-700 animate-fade-in">
                        <p className="font-extrabold text-slate-900 uppercase tracking-wide my-0">Risk Analysis Factors:</p>
                        {creditAssessment?.reason_codes?.length > 0 ? (
                          <div className="space-y-1.5">
                            {creditAssessment.reason_codes.map((rc: string, idx: number) => (
                              <p key={idx} className="my-0 font-medium leading-relaxed flex items-start gap-1.5">
                                <span>{rc}</span>
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 italic my-0">Standard profile evaluation based on land area and harvest capacity.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return <div>Not found</div>;
    }

  };

  // Auth layout if token is missing
  if (!token) {
    return (
      <div className="min-h-screen bg-earth-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-earth-200 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 my-0">KrishiRakshak</h1>
            <p className="text-xs text-slate-500 font-sans uppercase tracking-wider font-semibold">Agricultural Early-Warning & Risk Intelligence</p>
          </div>

          {/* Role Switcher: Farmer vs Agro Officer */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">Select Account Role</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setAuthRoleToggle('farmer')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  authRoleToggle === 'farmer' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👨‍🌾 Farmer
              </button>
              <button
                type="button"
                onClick={() => setAuthRoleToggle('officer')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  authRoleToggle === 'officer' ? 'bg-indigo-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🏛️ Agro Officer
              </button>
            </div>
          </div>

          <div className="flex bg-earth-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setIsRegistering(false)}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${!isRegistering ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsRegistering(true)}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${isRegistering ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Register Account
            </button>
          </div>

          {/* Live Backend Connection Indicator */}
          <div className={`p-3 rounded-2xl mb-4 border flex items-center justify-between transition-all ${
            backendStatus === 'connected' 
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-xs' 
              : backendStatus === 'checking'
              ? 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-xs'
              : 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-xs'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className={`w-2.5 h-2.5 rounded-full ${
                backendStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : backendStatus === 'checking' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
              }`} />
              <span>
                {backendStatus === 'connected' && `Backend Live (${backendPingTime}ms)`}
                {backendStatus === 'checking' && 'Connecting to Backend...'}
                {backendStatus === 'disconnected' && 'Backend Offline / Waking Up'}
              </span>
            </div>
            <span className="text-[10px] font-mono opacity-75 truncate max-w-[150px]" title={API_BASE}>
              {API_BASE.replace('https://', '')}
            </span>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">
                  {authRoleToggle === 'officer' ? 'Officer Phone Number' : 'Farmer Phone Number'}
                </label>
                <input
                  type="text"
                  placeholder={authRoleToggle === 'officer' ? 'e.g. +91 99887 76655' : 'e.g. +91 98765 43210'}
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-earth-200 focus:outline-none focus:border-stable bg-earth-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-earth-200 focus:outline-none focus:border-stable bg-earth-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAuthenticating}
                className={`w-full text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 ${
                  isAuthenticating ? 'opacity-70 cursor-not-allowed' : ''
                } ${
                  authRoleToggle === 'officer' ? 'bg-indigo-950 hover:bg-indigo-900' : 'bg-stable hover:bg-stable-dark'
                }`}
              >
                {isAuthenticating ? (
                  <><span className="animate-spin text-base">⏳</span> Authenticating...</>
                ) : (
                  <><Lock size={16} /> Authenticate {authRoleToggle === 'officer' ? 'Officer Account' : 'Farmer Account'}</>
                )}
              </button>

              {/* Demo Account Quick Fill */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-earth-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold">or try demo</span>
                </div>
              </div>

              {authRoleToggle === 'officer' ? (
                <button
                  type="button"
                  onClick={() => { setLoginPhone('+919988776655'); setLoginPassword('officer123'); }}
                  className="w-full border border-indigo-200 bg-indigo-50/50 text-indigo-900 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  🏛️ Try Demo Agro Officer Account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setLoginPhone('+919876543210'); setLoginPassword('demo1234'); }}
                  className="w-full border border-earth-200 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-earth-50 transition-colors flex items-center justify-center gap-2"
                >
                  🚜 Try Demo Farmer Account
                </button>
              )}
            </form>
          ) : authRoleToggle === 'officer' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left text-xs">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Full Officer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Aniket Deshmukh"
                  value={officerRegName}
                  onChange={(e) => setOfficerRegName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Phone Number *</label>
                <input
                  type="text"
                  placeholder="e.g. +919988776655"
                  value={officerRegPhone}
                  onChange={(e) => setOfficerRegPhone(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Official Email</label>
                <input
                  type="email"
                  placeholder="e.g. officer@krishi.gov.in"
                  value={officerRegEmail}
                  onChange={(e) => setOfficerRegEmail(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Designation / Role Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Block Agricultural Extension Officer"
                  value={officerRegDesignation}
                  onChange={(e) => setOfficerRegDesignation(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">State *</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={officerRegState}
                    onChange={(e) => setOfficerRegState(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">District *</label>
                  <input
                    type="text"
                    placeholder="e.g. Nashik"
                    value={officerRegDistrict}
                    onChange={(e) => setOfficerRegDistrict(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">Municipality / Block *</label>
                  <input
                    type="text"
                    placeholder="e.g. Niphad Block"
                    value={officerRegMunicipality}
                    onChange={(e) => setOfficerRegMunicipality(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">Ward / Sub-locality</label>
                  <input
                    type="text"
                    placeholder="e.g. Ward #4"
                    value={officerRegWard}
                    onChange={(e) => setOfficerRegWard(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Create Password *</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={officerRegPassword}
                  onChange={(e) => setOfficerRegPassword(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-earth-200 focus:outline-none focus:border-indigo-600 bg-earth-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isRegisteringSubmit}
                className={`w-full bg-indigo-950 text-white py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-indigo-900 transition-colors flex items-center justify-center gap-2 ${
                  isRegisteringSubmit ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isRegisteringSubmit ? (
                  <><span className="animate-spin text-base">⏳</span> Creating Account...</>
                ) : (
                  'Register Officer Account'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Farmer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-earth-200 focus:outline-none focus:border-stable bg-earth-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +919876543210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-earth-200 focus:outline-none focus:border-stable bg-earth-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Create Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full text-sm px-4 py-3 rounded-xl border border-earth-200 focus:outline-none focus:border-stable bg-earth-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isRegisteringSubmit}
                className={`w-full bg-stable text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm hover:bg-stable-dark transition-colors flex items-center justify-center gap-2 ${
                  isRegisteringSubmit ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isRegisteringSubmit ? (
                  <><span className="animate-spin text-base">⏳</span> Creating Account...</>
                ) : (
                  'Register & Verify'
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center text-xs text-slate-400">
            🔒 Fully encrypted. Secure communication.
          </div>
        </div>
      </div>
    );
  }

  // Agro Officer Portal Layout
  if (token && userRole === 'officer') {
    const criticalFarmers = localityFarmers.filter(f => f.distress_level.toLowerCase() === 'critical');
    const elevatedFarmers = localityFarmers.filter(f => f.distress_level.toLowerCase() === 'elevated');
    const stableFarmers = localityFarmers.filter(f => f.distress_level.toLowerCase() === 'stable' || f.distress_level.toLowerCase() === 'watch');
    const activeInterventions = localityFarmers.filter(f => f.intervention_status && f.intervention_status !== 'Pending');

    const filteredRoster = localityFarmers.filter(f => {
      if (officerRiskFilter !== 'all' && f.distress_level.toLowerCase() !== officerRiskFilter.toLowerCase()) {
        return false;
      }
      if (officerStatusFilter !== 'all' && (f.intervention_status || 'Pending').toLowerCase() !== officerStatusFilter.toLowerCase()) {
        return false;
      }
      if (officerSearchQuery) {
        const q = officerSearchQuery.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.phone.includes(q) || f.location_id.toLowerCase().includes(q);
      }
      return true;
    });

    const handleSignOutOfficer = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('krishi_auth_role');
      setToken(null);
      setUserRole('farmer');
      setOfficerProfile(null);
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-24 md:pb-8">
        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Administrative Header Bar */}
        <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-4 md:px-8 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-sm">
              <Building2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight">KrishiRakshak</h1>
                <span className="bg-indigo-900 border border-indigo-500 text-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Agro Officer
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {officerProfile?.name || 'Officer'} · <span className="text-indigo-300 font-semibold">{officerProfile?.designation || 'Block Officer'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageType)}
              className="bg-slate-800 border border-slate-700 text-white text-xs md:text-sm px-3 py-2 rounded-xl focus:outline-none font-semibold"
            >
              <option value="english">English</option>
              <option value="hindi">हिंदी</option>
              <option value="marathi">मराठी</option>
              <option value="bengali">বাংলা</option>
              <option value="odia">ଓଡ଼ିଆ</option>
            </select>

            <button
              onClick={handleSignOutOfficer}
              className="flex items-center gap-1.5 bg-red-900/80 border border-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto space-y-6">

          {/* Location & Sync Banner */}
          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs uppercase tracking-wider">
                <MapPin size={16} />
                <span>{officerProfile?.municipality || 'Niphad'}, {officerProfile?.district || 'Nashik'} ({officerProfile?.state || 'Maharashtra'})</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 tracking-tight">
                🏛️ {translations[language]?.officerPortalTitle || 'Agricultural Officer Portal & Locality Distress Monitor'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Web & Mobile Tab Switcher */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1 w-full md:w-auto">
                <button
                  onClick={() => setOfficerActiveView('roster')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
                    officerActiveView === 'roster'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <User size={16} /> 📋 Farmer Roster
                </button>
                <button
                  onClick={() => setOfficerActiveView('map')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all ${
                    officerActiveView === 'map'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <MapPin size={16} /> 🗺️ Locality Map
                </button>
              </div>

              <button
                onClick={fetchOfficerDashboardData}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-extrabold px-4 py-2.5 rounded-2xl shadow-sm transition-all active:scale-95"
              >
                <RefreshCw size={16} /> Sync Data
              </button>
            </div>
          </div>

          {/* Critical Emergency Alert Banner */}
          {criticalFarmers.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 text-red-950 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-600 rounded-2xl text-white mt-0.5 shadow-sm shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-red-900 tracking-tight">
                    ⚠️ High Vulnerability Alert ({criticalFarmers.length} Farmers)
                  </h3>
                  <p className="text-xs md:text-sm text-red-800 mt-1 font-medium">
                    Immediate extension visit & scheme allocation required for: <strong>{criticalFarmers.map(f => f.name).join(', ')}</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setOfficerRiskFilter('critical'); setOfficerActiveView('roster'); }}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs md:text-sm px-4 py-3 rounded-2xl shadow-sm transition-all text-center whitespace-nowrap"
              >
                View Critical List →
              </button>
            </div>
          )}

          {/* 2 Summary KPI Cards (Consolidated & Readable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Locality Farmers & Risk Distribution */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Locality Summary</span>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">{localityFarmers.length} Farmers</h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-700 border border-indigo-100">
                  <User size={24} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-2xl">
                  <p className="text-xs font-bold text-red-700">Critical</p>
                  <p className="text-lg font-black text-red-700 mt-0.5">{criticalFarmers.length}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-2xl">
                  <p className="text-xs font-bold text-amber-700">Elevated</p>
                  <p className="text-lg font-black text-amber-700 mt-0.5">{elevatedFarmers.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-700">Stable</p>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{stableFarmers.length}</p>
                </div>
              </div>
            </div>

            {/* Card 2: Government Intervention & Action Status */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Government Support</span>
                  <h3 className="text-3xl font-black text-indigo-900 mt-1">{activeInterventions.length} Interventions</h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-700 border border-indigo-100">
                  <Building2 size={24} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
                <span>Coverage: <strong>{localityFarmers.length > 0 ? Math.round(activeInterventions.length / localityFarmers.length * 100) : 0}%</strong> of farmers</span>
                <span className="bg-indigo-100 text-indigo-900 px-3 py-1 rounded-full font-extrabold text-[11px]">Active Extension</span>
              </div>
            </div>

          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search farmer name or phone..."
                  value={officerSearchQuery}
                  onChange={(e) => setOfficerSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:border-indigo-600 text-sm font-medium"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={officerRiskFilter}
                  onChange={(e) => setOfficerRiskFilter(e.target.value)}
                  className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 text-slate-800 px-3 py-3 rounded-2xl focus:outline-none text-xs md:text-sm font-bold"
                >
                  <option value="all">Risk: All</option>
                  <option value="critical">Critical</option>
                  <option value="elevated">Elevated</option>
                  <option value="stable">Stable</option>
                </select>

                <select
                  value={officerStatusFilter}
                  onChange={(e) => setOfficerStatusFilter(e.target.value)}
                  className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 text-slate-800 px-3 py-3 rounded-2xl focus:outline-none text-xs md:text-sm font-bold"
                >
                  <option value="all">Status: All</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="contacted">Contacted</option>
                  <option value="assistance provided">Assistance</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roster Tab vs Map Tab View */}
          {officerActiveView === 'map' ? (
            <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-extrabold text-sm md:text-base text-slate-900 uppercase tracking-wider">
                  🗺️ Locality Community Map
                </h3>
              </div>
              <div className="h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                <CommunityMap districts={localityMapPoints.map(p => ({
                  district: p.district || 'Nashik',
                  state: 'Maharashtra',
                  avg_score: p.distress_score,
                  risk_level: p.distress_level,
                  farmer_count: 1,
                  lat: p.latitude || 20.0,
                  lon: p.longitude || 74.0
                }))} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-base md:text-lg text-slate-900">
                  Farmers in Locality ({filteredRoster.length})
                </h3>
              </div>

              {filteredRoster.length === 0 ? (
                <div className="bg-white border border-slate-200 p-12 text-center rounded-3xl text-slate-500 font-medium">
                  <User size={40} className="mx-auto mb-2 text-slate-300" />
                  No farmer records found matching criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredRoster.map((f: any) => {
                    const levelLower = f.distress_level.toLowerCase();
                    let badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    if (levelLower === 'critical') badgeStyle = 'bg-red-100 text-red-900 border-red-300 font-extrabold';
                    else if (levelLower === 'elevated') badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';

                    let statusStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (f.intervention_status === 'Resolved') statusStyle = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    else if (f.intervention_status === 'Assistance Provided') statusStyle = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                    else if (f.intervention_status === 'Contacted') statusStyle = 'bg-sky-100 text-sky-900 border-sky-300';

                    return (
                      <div
                        key={f.farmer_id}
                        className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="text-lg font-black text-slate-900">{f.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs border ${badgeStyle}`}>
                              Distress Score: {f.distress_score} · {f.distress_level}
                            </span>
                            {f.credit_score && (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                f.credit_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                f.credit_status === 'MANUAL REVIEW' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                'bg-red-50 text-red-800 border-red-200'
                              }`}>
                                💳 Credit: {f.credit_score}/900 · {f.credit_status}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs md:text-sm text-slate-600 flex-wrap font-medium">
                            <span className="font-mono text-slate-800">📞 {f.phone}</span>
                            <span>📍 {f.location_id}</span>
                            <span>🌱 {f.total_acreage} Acres ({f.active_crops.length > 0 ? f.active_crops.join(', ') : 'No crops registered'})</span>
                          </div>
                        </div>

                        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                          <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase border ${statusStyle}`}>
                            {f.intervention_status || 'Pending'}
                          </span>
                          <button
                            onClick={() => handleOpenFarmerDetail(f.farmer_id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs md:text-sm px-4 py-2.5 rounded-2xl shadow-sm transition-all active:scale-95 whitespace-nowrap"
                          >
                            Inspect & Assist →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>

        {/* Mobile Sticky Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-3.5 z-50 flex justify-around items-center text-white shadow-2xl">
          <button
            onClick={() => setOfficerActiveView('roster')}
            className={`flex flex-col items-center gap-1 text-xs font-extrabold transition-all ${officerActiveView === 'roster' ? 'text-indigo-400 scale-105' : 'text-slate-400'}`}
          >
            <User size={22} />
            <span>Farmers</span>
          </button>
          <button
            onClick={() => setOfficerActiveView('map')}
            className={`flex flex-col items-center gap-1 text-xs font-extrabold transition-all ${officerActiveView === 'map' ? 'text-indigo-400 scale-105' : 'text-slate-400'}`}
          >
            <MapPin size={22} />
            <span>Locality Map</span>
          </button>
        </div>

        {/* Farmer Inspection & Scheme Recommendation Sheet / Modal */}
        {isFarmerDetailOpen && selectedFarmerDetail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white border border-slate-200 max-w-2xl w-full max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
              
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-lg md:text-xl font-black text-white">
                    👨‍🌾 {selectedFarmerDetail.name}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Phone: <span className="font-mono text-indigo-300">{selectedFarmerDetail.phone}</span> · Location: {selectedFarmerDetail.location_id || 'Niphad'}
                  </p>
                </div>
                <button
                  onClick={() => setIsFarmerDetailOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sub-tabs inside modal */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-extrabold">
                <button
                  onClick={() => setOfficerDetailTab('overview')}
                  className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all ${
                    officerDetailTab === 'overview'
                      ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📊 Distress & Profile
                </button>
                <button
                  onClick={() => setOfficerDetailTab('action')}
                  className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all ${
                    officerDetailTab === 'action'
                      ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🏛️ Recommend Schemes & Actions
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs md:text-sm bg-slate-50/50">

                {officerDetailTab === 'overview' ? (
                  <>
                    {/* Distress Score Component breakdown */}
                    {selectedFarmerDetail.distress_score && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">
                            Distress Score: {selectedFarmerDetail.distress_score.score} / 100
                          </h4>
                          <span className="bg-red-100 text-red-900 border border-red-300 px-3 py-1 rounded-full text-xs font-bold">
                            {selectedFarmerDetail.distress_score.risk_level} Risk
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Weather Vulnerability</p>
                            <p className="text-base font-black text-sky-700">{selectedFarmerDetail.distress_score.weather_component} / 100</p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Market Price Risk</p>
                            <p className="text-base font-black text-amber-700">{selectedFarmerDetail.distress_score.market_component} / 100</p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Financial Debt Load</p>
                            <p className="text-base font-black text-red-700">{selectedFarmerDetail.distress_score.financial_component} / 100</p>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Crop Failure Risk</p>
                            <p className="text-base font-black text-emerald-700">{selectedFarmerDetail.distress_score.yield_component} / 100</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Farms & Registered Crops */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                      <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Registered Farms ({selectedFarmerDetail.farms?.length || 0})</h4>
                      {selectedFarmerDetail.farms?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedFarmerDetail.farms.map((f: any) => (
                            <div key={f.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-slate-900">{f.name || `Farm #${f.id}`}</p>
                                <p className="text-slate-500 text-xs">{f.area} Acres · Soil: {f.soil_type}</p>
                              </div>
                              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs px-2.5 py-1 rounded-lg font-bold">
                                {f.district || 'Nashik'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-xs">No registered farms found in database.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Scheme Recommendation Form */}
                    <div className="bg-indigo-50/90 border-2 border-indigo-200 p-4 rounded-2xl space-y-3">
                      <h4 className="font-black text-sm text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        🏛️ Recommend Government Scheme / Loan
                      </h4>

                      <div>
                        <label className="block text-indigo-900 text-xs font-extrabold uppercase mb-1">Select Scheme or Loan *</label>
                        <select
                          value={selectedSchemeId || ''}
                          onChange={(e) => setSelectedSchemeId(Number(e.target.value) || null)}
                          className="w-full bg-white border border-slate-300 text-slate-900 font-bold px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                        >
                          <option value="">-- Pick Scheme / Relief Credit --</option>
                          {officerSchemes.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.support_type || 'Scheme'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-indigo-900 text-xs font-extrabold uppercase mb-1">Recommendation Note</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Approved for priority PM-KISAN relief & 4% interest subvention loan..."
                          value={schemeRecommendNote}
                          onChange={(e) => setSchemeRecommendNote(e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-600 font-medium"
                        />
                      </div>

                      <button
                        onClick={() => handleRecommendScheme(selectedFarmerDetail.farmer_id)}
                        disabled={!selectedSchemeId || isSavingScheme}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl shadow-xs transition-all text-xs"
                      >
                        {isSavingScheme ? 'Saving...' : '✉️ Issue Scheme Recommendation to Farmer'}
                      </button>
                    </div>

                    {/* Previously Recommended Schemes for this Farmer */}
                    {farmerRecommendedSchemes.length > 0 && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                        <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-wider">Issued Recommendations ({farmerRecommendedSchemes.length})</h4>
                        <div className="space-y-2">
                          {farmerRecommendedSchemes.map((rec: any) => (
                            <div key={rec.id} className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-950 space-y-1">
                              <p className="font-bold text-emerald-900">✅ {rec.scheme_name}</p>
                              {rec.notes && <p className="text-emerald-800 text-[11px] italic">"{rec.notes}"</p>}
                              <p className="text-slate-400 text-[10px]">{new Date(rec.created_at).toLocaleDateString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extension Intervention Status Form */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wider">Update Locality Extension Status</h4>

                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase mb-1">Status</label>
                        <select
                          value={interventionStatusInput}
                          onChange={(e) => setInterventionStatusInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                        >
                          <option value="Pending">Pending Review</option>
                          <option value="Reviewed">Reviewed</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Assistance Provided">Assistance Provided</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase mb-1">Officer Extension Notes</label>
                        <textarea
                          rows={2}
                          placeholder="Type notes from field visit or officer consultation..."
                          value={interventionNotesInput}
                          onChange={(e) => setInterventionNotesInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-xl text-xs focus:outline-none font-medium"
                        />
                      </div>

                      <button
                        onClick={() => handleSaveIntervention(selectedFarmerDetail.farmer_id)}
                        disabled={isSavingIntervention}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl shadow-xs transition-all text-xs"
                      >
                        {isSavingIntervention ? 'Saving...' : '💾 Save Extension Status'}
                      </button>
                    </div>
                  </>
                )}

              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // 1. Initial Authentication Splash / Loader while checking farms & profile
  if (token && isAuthInitialLoading) {
    return (
      <div className="h-screen w-screen bg-earth-50 flex flex-col items-center justify-center p-6 text-center z-[300]">
        <div className="bg-white p-8 rounded-3xl border border-earth-200 shadow-2xl max-w-sm w-full space-y-4 flex flex-col items-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-stable/10 text-stable flex items-center justify-center animate-bounce">
            <Sprout size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 my-0">Syncing KrishiRakshak...</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">Loading your farm profile, advisories & market data</p>
          </div>
          <div className="w-full bg-earth-100 h-2 rounded-full overflow-hidden">
            <div className="bg-stable h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Onboarding wizard layout if farm setup is missing
  if (token && !hasFarm) {
    const handleOnboardComplete = (location: string, _cropType: string) => {
      localStorage.setItem('hasFarm', 'true');
      localStorage.setItem('onboardLocation', location);
      setHasFarm(true);
      if (farmer) {
        setFarmer({
          ...farmer,
          location_id: location
        });
      }
    };
    return <OnboardingWizard onComplete={handleOnboardComplete} token={token} />;
  }

  return (
    <div className="h-screen bg-earth-50 flex flex-col md:flex-row overflow-hidden">
      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-slate-900 text-white text-xs font-bold text-center py-2 px-4 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-high animate-pulse inline-block" />
          You're offline — showing cached data{lastSyncTime ? ` · Last synced ${lastSyncTime}` : ''}
        </div>
      )}

      {/* Sidebar Nav — fixed height, does NOT scroll with content */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-earth-200 p-6 space-y-8 flex-shrink-0 h-screen overflow-y-auto">
        <div>
          <h1 className="text-xl font-black text-stable tracking-tight my-0">KrishiRakshak</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Farm Risk Intelligence</p>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <HomeIcon size={18} /> {t.navHome}
          </button>
          <button 
            onClick={() => setActiveTab('crop')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'crop' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Sprout size={18} /> {t.navCrop}
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'market' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <ShoppingCart size={18} /> {t.navMarket}
          </button>
          <button 
            onClick={() => setActiveTab('yield')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'yield' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Sprout size={18} /> Crop Advisor
          </button>
          <button 
            onClick={() => setActiveTab('financial')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'financial' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <PiggyBank size={18} /> Financial Health
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'support' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <HelpCircle size={18} /> {t.navSupport}
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <User size={16} /> {t.navProfile}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8 overflow-y-auto h-screen relative">
        <header className="w-full max-w-full overflow-hidden flex justify-between items-center mb-6 pb-4 border-b border-earth-200 gap-1.5 sm:gap-4">
          <div className="md:hidden flex-shrink min-w-0">
            <h1 className="text-sm font-black text-stable tracking-tight my-0 truncate" title="KrishiRakshak">KrishiRakshak</h1>
          </div>
          <div className="hidden md:block">
            {/* Breadcrumb or current tab name */}
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Dashboard / {activeTab === 'home' ? 'Home Summary' : activeTab === 'crop' ? 'My Crop' : activeTab === 'market' ? 'Market & Mandis' : activeTab === 'yield' ? 'Crop Advisor' : activeTab === 'financial' ? 'Financial Health' : activeTab === 'support' ? 'Schemes' : activeTab === 'community' ? 'Community Map' : activeTab.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Language Selector in Header */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-xl border border-earth-200 bg-white text-slate-600 focus:outline-none max-w-[85px] sm:max-w-none text-ellipsis overflow-hidden"
            >
              {Object.entries({ english: '🇬🇧 EN', hindi: '🇮🇳 HI', marathi: '🇮🇳 MR', bengali: '🇮🇳 BN', odia: '🇮🇳 OR' }).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>

            {/* Sync Button — force-refresh all cached data */}
            {token && (
              <button
                onClick={forceSyncAll}
                disabled={isSyncing || isBackgroundRefreshing}
                title={lastSyncTime ? `Last synced ${lastSyncTime} · Click to refresh` : 'Sync all data'}
                className={`p-1.5 sm:p-2.5 rounded-xl bg-earth-50 text-slate-500 hover:bg-earth-100 hover:text-stable transition-all flex items-center justify-center ${(isSyncing || isBackgroundRefreshing) ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <RefreshCw size={16} className={(isSyncing || isBackgroundRefreshing) ? 'animate-spin' : ''} />
              </button>
            )}

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="relative p-1.5 sm:p-2.5 rounded-xl bg-earth-50 text-slate-600 hover:bg-earth-100 hover:text-stable transition-all flex items-center justify-center"
                title="View Alerts"
              >
                <Bell size={16} />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-high text-white text-[9px] font-black flex items-center justify-center border-2 border-white animate-bounce">
                    {alerts.length}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotificationPanel && (
                <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-earth-200 p-4 z-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm my-0">Active Risk Alerts</h4>
                    <span className="text-[10px] font-bold text-slate-400">{alerts.length} alerts</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {alerts.length > 0 ? (
                      alerts.map((a: any) => (
                        <div key={a.id} className={`p-3 rounded-xl border text-xs ${
                          a.severity === 'Critical' ? 'bg-high-light border-high/20 text-high' : 'bg-elevated-light border-elevated/20 text-elevated'
                        }`}>
                          <p className="font-bold my-0 flex items-center gap-1">
                            {a.severity === 'Critical' ? '🚨' : '⚠️'} {a.severity}
                          </p>
                          <p className="mt-1 mb-0 leading-relaxed font-semibold text-slate-700">{a.reason}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No active risk alerts today.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Button in Header */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`p-1.5 sm:p-2.5 rounded-xl transition-all flex items-center justify-center ${
                activeTab === 'profile'
                  ? 'bg-stable text-white shadow-xs'
                  : 'bg-earth-50 text-slate-600 hover:bg-earth-100 hover:text-stable'
              }`}
              title="Farmer Profile & Settings"
            >
              <User size={16} />
            </button>
          </div>
        </header>

        {renderTabContent()}
      </main>

      {/* Bottom Nav Bar (Mobile widths < md breakpoint) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-earth-200 flex justify-around py-3 px-2 z-40">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'home' ? 'text-stable' : 'text-slate-400'}`}
        >
          <HomeIcon size={20} /> <span className="mt-1">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('crop')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'crop' ? 'text-stable' : 'text-slate-400'}`}
        >
          <Sprout size={20} /> <span className="mt-1">Crop</span>
        </button>
        <button 
          onClick={() => setActiveTab('market')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'market' ? 'text-stable' : 'text-slate-400'}`}
        >
          <ShoppingCart size={20} /> <span className="mt-1">Market</span>
        </button>
         <button 
          onClick={() => setActiveTab('yield')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'yield' ? 'text-stable' : 'text-slate-400'}`}
        >
          <Sprout size={20} /> <span className="mt-1">Advisor</span>
        </button>
        <button 
          onClick={() => setActiveTab('financial')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'financial' ? 'text-stable' : 'text-slate-400'}`}
        >
          <PiggyBank size={20} /> <span className="mt-1">Finance</span>
        </button>
        <button 
          onClick={() => setActiveTab('support')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'support' ? 'text-stable' : 'text-slate-400'}`}
        >
          <HelpCircle size={20} /> <span className="mt-1">Support</span>
        </button>
      </nav>


      {/* ── Floating Mic Button — tap = instant voice record → AI answer → speak ── */}
      {/* ── Floating Voice Assistant — Radio broadcast icon + mic icon ── */}
      <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-slate-900/95 text-white backdrop-blur-md px-3 py-2.5 rounded-full shadow-2xl border border-white/15 transition-all">

        {/* Large Radio/Broadcast Button — explains current page */}
        <button
          onClick={handleVoicePlayback}
          title="Broadcast page summary"
          className={`flex items-center gap-2.5 text-xs md:text-sm font-extrabold bg-transparent border-none text-white cursor-pointer`}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${
            isVoicePlaying
              ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-300'
              : 'bg-stable hover:bg-stable-dark'
          }`}>
            {isVoicePlaying
              ? <Volume2 size={22} className="text-white" />
              : <Radio size={22} className="text-white" />}
          </div>
          <span className="whitespace-nowrap hidden sm:inline">
            {isVoicePlaying ? 'Stop' : capitalize(activeTab === 'yield' ? 'Advisor' : activeTab === 'support' ? 'Support' : activeTab)}
          </span>
        </button>

        {/* Divider */}
        <span className="w-px h-6 bg-white/20" />

        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="bg-white/15 text-white text-xs font-black px-2 py-1 rounded-full border border-white/20 focus:outline-none cursor-pointer"
        >
          <option value="english" className="text-slate-900">EN</option>
          <option value="hindi" className="text-slate-900">हिन्दी</option>
          <option value="odia" className="text-slate-900">ଓଡ଼ିଆ</option>
          <option value="marathi" className="text-slate-900">मराठी</option>
          <option value="bengali" className="text-slate-900">বাংলা</option>
        </select>

        {/* Divider */}
        <span className="w-px h-6 bg-white/20" />

        {/* Mic Button — Ask Gemini by voice */}
        <button
          onClick={handleInstantMic}
          title={voiceState === 'listening' ? 'Listening...' : voiceState === 'thinking' ? 'Thinking...' : 'Ask a question by voice'}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
            voiceState === 'listening' ? 'bg-amber-500 animate-pulse ring-2 ring-amber-300' :
            voiceState === 'thinking' ? 'bg-indigo-500 animate-spin' :
            voiceState === 'speaking' ? 'bg-emerald-500 animate-pulse' :
            'bg-white/15 hover:bg-white/30 text-amber-300'
          }`}
        >
          <Mic size={18} />
        </button>

        {/* Chat / Text Q&A Button — Ask question by text */}
        <button
          onClick={() => setShowVoiceModal(true)}
          title="Ask a question by text chat"
          className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all shrink-0"
        >
          <MessageSquare size={18} />
        </button>

      </div>

      {/* Floating voice answer card — shows listening animation + answer */}
      {(voiceState !== 'idle' || voiceAnswerText) && (
        <div className="fixed bottom-36 right-4 md:bottom-24 md:right-8 bg-white rounded-2xl shadow-2xl border border-earth-200 p-4 w-72 z-50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              {voiceState === 'listening' && <span className="text-high animate-pulse">🎙 Listening</span>}
              {voiceState === 'thinking' && <span className="text-elevated animate-pulse">⏳ Processing</span>}
              {voiceState === 'speaking' && <span className="text-watch">🔊 Speaking</span>}
              {voiceState === 'idle' && voiceAnswerText && <span className="text-stable">✓ Done</span>}
            </p>
            <button
              onClick={() => { stopSpeech(); setVoiceState('idle'); setVoiceAnswerText(''); setVoiceTranscript(''); }}
              className="text-slate-300 hover:text-slate-600 text-xs font-bold"
            >✕</button>
          </div>
          {voiceState === 'listening' && (
            <div className="flex gap-1 items-end justify-center py-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-1.5 bg-high rounded-full animate-bounce" style={{height:`${10+i*5}px`,animationDelay:`${i*0.1}s`}} />
              ))}
            </div>
          )}
          {voiceTranscript && (
            <p className="text-xs text-slate-400 italic border-l-2 border-earth-200 pl-2">"{voiceTranscript}"</p>
          )}
          {voiceAnswerText && (
            <p className="text-sm text-slate-800 leading-relaxed">{voiceAnswerText}</p>
          )}
          {voiceState === 'idle' && voiceAnswerText && (
            <button
              onClick={async () => {
                const tr = await translateText(voiceAnswerText, language);
                speakText(tr, language);
              }}
              className="text-xs text-stable font-semibold flex items-center gap-1 hover:underline"
            >
              🔊 Play again
            </button>
          )}
        </div>
      )}

      {/* ── Voice Q&A Modal ─────────────────────────────────────────────── */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-earth-200 shadow-2xl space-y-5">

            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900 my-0 flex items-center gap-2">
                  <span className="text-2xl">🎙</span> Ask Your Farm Advisor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-powered farm advisor · Speaks in your language
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVoiceModal(false);
                  setVoiceQuestion('');
                  setVoiceAnswer('');
                  stopSpeech();
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none"
              >✕</button>
            </div>

            {/* Suggestion chips */}
            {!voiceAnswer && (
              <div className="flex flex-wrap gap-2">
                {[
                  'Should I irrigate today?',
                  'Is it safe to sell now?',
                  'What pest risk do I have?',
                  'What schemes am I eligible for?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setVoiceQuestion(q)}
                    className="text-xs bg-earth-50 text-earth-dark border border-earth-200 px-3 py-1.5 rounded-full hover:bg-stable hover:text-white hover:border-stable transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Text input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={voiceQuestion}
                onChange={(e) => setVoiceQuestion(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && voiceQuestion.trim() && !voiceLoading) {
                    setVoiceLoading(true);
                    setVoiceAnswer('');
                    const ans = await askGemini({
                      question: voiceQuestion,
                      farmerContext: { crops: allCrops, farms, weatherData: weather, distressData, advisories, language },
                    });
                    setVoiceAnswer(ans);
                    setVoiceLoading(false);
                    // Speak the answer in farmer's language
                    const translated = await translateText(ans, language);
                    speakText(translated, language);
                  }
                }}
                placeholder="Type or ask a farming question..."
                className="flex-1 border border-earth-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-stable"
                disabled={voiceLoading}
              />

              {/* Mic button — speech recognition */}
              <button
                onClick={() => {
                  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SR) { toast.warning('Not supported', 'Voice input not supported in this browser. Please type your question.'); return; }
                  const rec = new SR();
                  rec.lang = language === 'hindi' ? 'hi-IN' : language === 'marathi' ? 'mr-IN' : language === 'bengali' ? 'bn-IN' : language === 'odia' ? 'or-IN' : 'en-IN';
                  rec.interimResults = false;
                  rec.maxAlternatives = 1;
                  setVoiceListening(true);
                  rec.start();
                  rec.onresult = (e: any) => {
                    const transcript = e.results[0][0].transcript;
                    setVoiceQuestion(transcript);
                    setVoiceListening(false);
                  };
                  rec.onerror = (err: any) => {
                    console.warn('SpeechRecognition error:', err.error);
                    if (err.error === 'network') {
                      toast.warning('Network Issue', 'Voice speech recognition requires internet connection. Please type your question.');
                    } else if (err.error === 'not-allowed') {
                      toast.warning('Permission Denied', 'Please allow microphone access in your browser settings.');
                    }
                    setVoiceListening(false);
                  };
                  rec.onend = () => setVoiceListening(false);
                }}
                disabled={voiceListening || voiceLoading}
                className={`p-2.5 rounded-xl border text-white transition-all ${voiceListening ? 'bg-high border-high animate-pulse' : 'bg-stable border-stable hover:bg-stable-dark'}`}
                title="Speak your question"
              >
                <Mic size={18} />
              </button>
            </div>

            {/* Status indicators */}
            {voiceListening && (
              <p className="text-xs text-high font-semibold text-center animate-pulse">
                🎙 Listening... speak your question
              </p>
            )}

            {/* Ask button */}
            <button
              disabled={!voiceQuestion.trim() || voiceLoading}
              onClick={async () => {
                if (!voiceQuestion.trim()) return;
                setVoiceLoading(true);
                setVoiceAnswer('');
                const ans = await askGemini({
                  question: voiceQuestion,
                  farmerContext: { crops: allCrops, farms, weatherData: weather, distressData, advisories, language },
                });
                setVoiceAnswer(ans);
                setVoiceLoading(false);
                const translated = await translateText(ans, language);
                speakText(translated, language);
              }}
              className="w-full py-3 bg-stable text-white rounded-xl font-bold text-sm hover:bg-stable-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {voiceLoading ? (
                <><span className="animate-spin text-base">⏳</span> Getting answer...</>
              ) : (
                <><span>🎙</span> Ask Farm AI</>
              )}
            </button>

            {/* Answer display */}
            {voiceAnswer && (
              <div className="bg-stable-light border border-stable/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-stable-dark uppercase tracking-widest">Farm Advisor Response</p>
                  <button
                    onClick={async () => {
                      const translated = await translateText(voiceAnswer, language);
                      speakText(translated, language);
                    }}
                    className="text-xs text-stable font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>🔊</span> Play
                  </button>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">{voiceAnswer}</p>
                <button
                  onClick={() => { setVoiceQuestion(''); setVoiceAnswer(''); stopSpeech(); }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Ask another question
                </button>
              </div>
            )}

            {/* Tip */}
            <p className="text-[10px] text-slate-400 text-center">
              💡 Answers based on your real farm data — not generic advice
            </p>
          </div>
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────── */}

      {/* Add Farm Modal Overlay */}

      {showAddFarmModal && (() => {
        // MapPickerComponent is declared at module level above
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 z-50 animate-fade-in text-left">
            <div className="bg-white rounded-3xl p-5 max-w-lg w-full border border-earth-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 my-0">🌾 Register New Farm</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pin your farm on the map for accurate weather & advisory</p>
                </div>
                <button onClick={() => setShowAddFarmModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
              </div>

              <div className="space-y-3">
                {/* Farm Name */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Farm Name (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Nashik Vineyard, Main Field…"
                    value={newFarmName}
                    onChange={(e) => setNewFarmName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                  />
                </div>

                {/* State + District row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase mb-1">State</label>
                    <select
                      value={newFarmState}
                      onChange={(e) => {
                        setNewFarmState(e.target.value);
                        const dists = getDistrictsForState(e.target.value);
                        if (dists.length > 0) {
                          setNewFarmDistrict(dists[0].name);
                          setNewFarmLat(dists[0].lat);
                          setNewFarmLon(dists[0].lon);
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                    >
                      {getStateList().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase mb-1">District</label>
                    <select
                      value={newFarmDistrict}
                      onChange={(e) => {
                        setNewFarmDistrict(e.target.value);
                        const coords = getDistrictCoords(newFarmState, e.target.value);
                        if (coords) { setNewFarmLat(coords.lat); setNewFarmLon(coords.lon); }
                      }}
                      className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                    >
                      {getDistrictsForState(newFarmState).map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Map Picker with Live Address Search */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase mb-1">📍 Pinpoint Farm Location</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Search city, town, or village (e.g., Rourkela, Niphad)..."
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && searchAddress.trim()) {
                          e.preventDefault();
                          setIsSearchingAddress(true);
                          try {
                            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchAddress.trim())}&count=1`);
                            if (res.ok) {
                              const data = await res.json();
                              if (data.results && data.results.length > 0) {
                                const match = data.results[0];
                                setNewFarmLat(parseFloat(match.latitude.toFixed(6)));
                                setNewFarmLon(parseFloat(match.longitude.toFixed(6)));
                                if (match.admin1) setNewFarmState(match.admin1);
                                if (match.name) setNewFarmDistrict(match.name);
                                toast.success("Location found!", `Centered map on ${match.name}, ${match.admin1 || ''}`);
                              } else {
                                toast.warning("Location not found", "Try searching another city or village name.");
                              }
                            }
                          } catch {
                            toast.error("Geocoding failed", "Could not reach address search service.");
                          }
                          setIsSearchingAddress(false);
                        }
                      }}
                      className="flex-1 text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl focus:outline-none focus:border-stable"
                    />
                    <button
                      type="button"
                      disabled={isSearchingAddress}
                      onClick={async () => {
                        if (!searchAddress.trim()) return;
                        setIsSearchingAddress(true);
                        try {
                          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchAddress.trim())}&count=1`);
                          if (res.ok) {
                            const data = await res.json();
                            if (data.results && data.results.length > 0) {
                              const match = data.results[0];
                              setNewFarmLat(parseFloat(match.latitude.toFixed(6)));
                              setNewFarmLon(parseFloat(match.longitude.toFixed(6)));
                              if (match.admin1) setNewFarmState(match.admin1);
                              if (match.name) setNewFarmDistrict(match.name);
                              toast.success("Location found!", `Centered map on ${match.name}, ${match.admin1 || ''}`);
                            } else {
                              toast.warning("Location not found", "Try searching another city or village name.");
                            }
                          }
                        } catch {
                          toast.error("Geocoding failed", "Could not reach address search service.");
                        }
                        setIsSearchingAddress(false);
                      }}
                      className="px-3 py-2 bg-stable hover:bg-stable-dark text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                    >
                      {isSearchingAddress ? 'Searching...' : '🔍 Search Location'}
                    </button>
                  </div>
                  <MapPickerComponent
                    initialLat={newFarmLat}
                    initialLon={newFarmLon}
                    onLocationSelect={(lat, lon) => { setNewFarmLat(lat); setNewFarmLon(lon); }}
                  />
                </div>

                {/* Area + Soil row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Area (Acres)</label>
                    <input
                      type="number" step="0.1"
                      value={newFarmArea}
                      onChange={(e) => setNewFarmArea(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Soil Type</label>
                    <select value={newFarmSoil} onChange={(e) => setNewFarmSoil(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl">
                      <option value="loam">Loam</option>
                      <option value="clay">Clay</option>
                      <option value="sandy">Sandy</option>
                      <option value="black">Black Cotton</option>
                      <option value="red">Red Laterite</option>
                      <option value="alluvial">Alluvial</option>
                    </select>
                  </div>
                </div>

                {/* Irrigation */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Irrigation Method</label>
                  <select value={newFarmIrrigation} onChange={(e) => setNewFarmIrrigation(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl">
                    <option value="drip">Drip Irrigation</option>
                    <option value="sprinkler">Sprinkler</option>
                    <option value="flood">Flood / Canal</option>
                    <option value="rainfed">Rainfed (No irrigation)</option>
                    <option value="well">Well / Borewell</option>
                  </select>
                </div>

                {/* GPS auto-detect button */}
                <button type="button" onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => { setNewFarmLat(parseFloat(pos.coords.latitude.toFixed(6))); setNewFarmLon(parseFloat(pos.coords.longitude.toFixed(6))); },
                      () => toast.warning("GPS unavailable", "Could not get device location. Pin manually on the map.")
                    );
                  }
                }} className="w-full py-1.5 border border-stable/30 hover:bg-stable/5 text-stable rounded-lg text-[10px] font-bold transition-all">
                  📡 Use Device GPS to auto-centre map
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => setShowAddFarmModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all">
                  Cancel
                </button>
                <button onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/api/v1/farmers/me/farms`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({
                        area: parseFloat(newFarmArea),
                        soil_type: newFarmSoil,
                        irrigation: newFarmIrrigation,
                        latitude: newFarmLat,
                        longitude: newFarmLon,
                        state: newFarmState,
                        district: newFarmDistrict,
                        name: newFarmName || `${newFarmDistrict} Farm`
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setFarms(prev => [...prev, data]);
                      setSelectedFarm(data);
                      setNewFarmName('');
                      setSearchAddress('');
                      setShowAddFarmModal(false);
                      setHasFarm(true);
                      localStorage.setItem('hasFarm', 'true');
                      toast.success("Farm registered!", `${newFarmName || newFarmDistrict + ' Farm'} added successfully.`);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast.error("Farm registration failed", err.detail || `Server error ${res.status}. Please try again.`);
                    }
                  } catch (e) {
                    toast.error("Connection failed", "Cannot reach backend on port 8000. Is uvicorn running?");
                  }
                }} className="px-4 py-2 bg-stable hover:bg-stable-dark text-white rounded-xl text-xs font-bold transition-all">
                  Register Farm
                </button>
              </div>
            </div>
          </div>
        );
      })()}







      {/* Add Crop Modal Overlay */}
      {showAddCropModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-earth-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 my-0">🌱 Register New Crop</h3>
                <p className="text-xs text-slate-400 mt-0.5">Add a crop to one of your farms</p>
              </div>
              <button onClick={() => setShowAddCropModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3">
              {/* Farm selector — always shown so user can pick which farm */}
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Select Farm</label>
                {farms.length === 0 ? (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    ⚠ No farms registered yet. Please add a farm first.
                  </div>
                ) : (
                  <select
                    value={cropFarmId ?? selectedFarm?.id ?? farms[0]?.id ?? ''}
                    onChange={(e) => setCropFarmId(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl font-medium"
                  >
                    {farms.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.name || `Farm #${f.id}`} — {f.district || f.soil_type} ({f.area} ac)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Crop type */}
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Crop Type</label>
                <select value={newCropType} onChange={(e) => setNewCropType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl">
                  <option value="tomato">🍅 {translateCrop(language, 'tomato')}</option>
                  <option value="wheat">🌾 {translateCrop(language, 'wheat')}</option>
                  <option value="onion">🧅 {translateCrop(language, 'onion')}</option>
                  <option value="rice">🌾 {translateCrop(language, 'rice')}</option>
                  <option value="sugarcane">🎋 {translateCrop(language, 'sugarcane')}</option>
                  <option value="cotton">🌿 {translateCrop(language, 'cotton')}</option>
                  <option value="maize">🌽 {translateCrop(language, 'maize')}</option>
                  <option value="soybean">🫘 {translateCrop(language, 'soybean')}</option>
                  <option value="groundnut">🥜 {translateCrop(language, 'groundnut')}</option>
                  <option value="potato">🥔 {translateCrop(language, 'potato')}</option>
                  <option value="chilli">🌶 {translateCrop(language, 'chilli')}</option>
                  <option value="grapes">🍇 {translateCrop(language, 'grapes')}</option>
                  <option value="banana">🍌 {translateCrop(language, 'banana')}</option>
                  <option value="mango">🥭 {translateCrop(language, 'mango')}</option>
                </select>
              </div>

              {/* Variety */}
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Variety Name</label>
                <input type="text" value={newCropVariety} onChange={(e) => setNewCropVariety(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                  placeholder="e.g. PKM-1, Local Premium, Hybrid-7" />
              </div>

              {/* Sowing Date */}
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Sowing Date</label>
                <input type="date" value={newCropSowingDate} onChange={(e) => setNewCropSowingDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl" />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Crop Image URL (Optional)</label>
                <input type="url" value={newCropImageUrl} onChange={(e) => setNewCropImageUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl font-mono"
                  placeholder="https://example.com/mycrop.jpg" />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to auto-assign a stock photo based on crop type.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowAddCropModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all">
                Cancel
              </button>
              <button
                disabled={farms.length === 0}
                onClick={async () => {
                  const farmId = cropFarmId ?? selectedFarm?.id ?? farms[0]?.id;
                  if (!farmId) { toast.error("No farm selected", "Please add a farm first before registering a crop."); return; }
                  try {
                    const res = await fetch(`${API_BASE}/api/v1/farms/${farmId}/crops`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({
                        crop_type: newCropType,
                        variety: newCropVariety,
                        sowing_date: newCropSowingDate,
                        image_url: newCropImageUrl || null
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      // Refresh if this is the currently selected farm
                      if (farmId === selectedFarm?.id) {
                        setCrops(prev => [...prev, data]);
                        setSelectedCrop(data);
                      }
                      setShowAddCropModal(false);
                      toast.success("Crop registered!", `${newCropType} added to farm #${farmId}.`);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast.error("Crop registration failed", err.detail || `Error ${res.status}. Check farm ownership.`);
                    }
                  } catch {
                    toast.error("Connection failed", "Cannot reach backend on port 8000. Is uvicorn running?");
                  }
                }}
                className="px-4 py-2 bg-stable hover:bg-stable-dark text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Register Crop
              </button>
            </div>
          </div>
        </div>
      )}









      {/* Add Obligation Modal Overlay */}
      {showAddObligationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-earth-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 my-0">💳 Add New Payment</h3>
              <button 
                onClick={() => setShowAddObligationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Payment Category</label>
                <select 
                  value={newObligationType} 
                  onChange={(e) => setNewObligationType(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-earth-200 bg-earth-50 rounded-xl font-semibold text-slate-800"
                >
                  <option value="loan">🏦 Loan Payment</option>
                  <option value="inputs">🌱 Input Payment (seeds, fertilizer, spraying)</option>
                  <option value="lease">🚜 Rent / Lease Payment</option>
                  <option value="other">📦 Other Farm Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Amount Due (₹)</label>
                <input 
                  type="number" 
                  value={newObligationAmount} 
                  onChange={(e) => setNewObligationAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl font-bold"
                  placeholder="e.g. 50000"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={newObligationDate} 
                  onChange={(e) => setNewObligationDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowAddObligationModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_BASE}/api/v1/farmers/me/obligations`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        amount: parseFloat(newObligationAmount),
                        due_date: newObligationDate,
                        type: newObligationType
                      })
                    });
                    if (res.ok) {
                      setShowAddObligationModal(false);
                      toast.success("Obligation saved!", "Financial obligation added successfully.");
                      await fetchProjections();
                    } else {
                      const errData = await res.json().catch(() => ({}));
                      const msg = errData?.detail
                        ? (Array.isArray(errData.detail)
                            ? errData.detail.map((d: any) => d.msg).join(', ')
                            : String(errData.detail))
                        : 'Could not save obligation.';
                      toast.error("Save failed", msg);
                    }
                  } catch {
                    toast.info("Demo mode", "Obligation saved locally. Start the backend to persist.");
                    const mockOb = { 
                      id: Date.now(), 
                      amount: parseFloat(newObligationAmount), 
                      due_date: newObligationDate, 
                      type: newObligationType 
                    };
                    setCashFlow((prev: any) => {
                      if (!prev) return prev;
                      const nextObs = [...(prev.obligations || []), mockOb];
                      const totalOb = nextObs.reduce((sum, o) => sum + o.amount, 0);
                      const surplus = prev.projected_net_income - totalOb;
                      return {
                        ...prev,
                        total_obligations: totalOb,
                        cash_flow_surplus: surplus,
                        has_shortfall: surplus < 0,
                        obligations: nextObs
                      };
                    });
                    setShowAddObligationModal(false);
                  }
                }}
                className="px-4 py-2 bg-stable hover:bg-stable-dark text-white rounded-xl text-xs font-bold transition-all"
              >
                Record Obligation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OnboardingWizardProps {
  onComplete: (location: string, crop: string) => void;
  token: string;
}

function OnboardingWizard({ onComplete, token }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [state, setState] = useState<string>('Maharashtra');
  const [district, setDistrict] = useState<string>('Nashik');
  const [block, setBlock] = useState<string>('Niphad');
  const [lat, setLat] = useState<string>('20.08');
  const [lon, setLon] = useState<string>('74.11');
  
  const [area, setArea] = useState<string>('2.5');
  const [soilType, setSoilType] = useState<string>('loam');
  const [irrigation, setIrrigation] = useState<string>('drip');
  
  const [cropType, setCropType] = useState<string>('tomato');
  const [variety, setVariety] = useState<string>('Nashik Premium');
  const [sowingDate, setSowingDate] = useState<string>(
    new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // default 45 days ago
  );

  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  const handleDetectGps = () => {
    setDetectingGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(4));
          setLon(position.coords.longitude.toFixed(4));
          setDetectingGps(false);
        },
        (error) => {
          console.error("GPS Detection failed, falling back to default Nashik/Niphad coordinates.", error);
          setLat('20.08');
          setLon('74.11');
          setDetectingGps(false);
        }
      );
    } else {
      setLat('20.08');
      setLon('74.11');
      setDetectingGps(false);
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setSubmitting(true);
      const loc_id = `${block}_${district}`.replace(/\s+/g, '_');
      try {
        // 1. Update farmer location
        await fetch(`${API_BASE}/api/v1/farmers/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            location_id: loc_id
          })
        });

        // 2. Create farm
        const farmRes = await fetch(`${API_BASE}/api/v1/farmers/me/farms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            area: parseFloat(area),
            soil_type: soilType,
            irrigation: irrigation,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          })
        });
        
        if (farmRes.ok) {
          const farmData = await farmRes.json();
          // 3. Create crop
          await fetch(`${API_BASE}/api/v1/farms/${farmData.id}/crops`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              crop_type: cropType,
              variety: variety || null,
              sowing_date: sowingDate
            })
          });
        }
      } catch (e) {
        console.warn("Could not save to live backend, proceeding in offline mode.", e);
      }
      setSubmitting(false);
      onComplete(loc_id, cropType);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 flex items-center justify-center p-4 w-full">
      <div className="bg-white max-w-lg w-full p-8 rounded-3xl border border-earth-200 shadow-sm space-y-6">
        {/* Step Indicator */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold font-sans my-0">Farm Onboarding Setup</h2>
            <p className="text-slate-500 text-xs mt-0.5 mb-0">Define your farm profile to calibrate advisories</p>
          </div>
          <span className="text-stable font-bold text-xs bg-stable-light px-3 py-1.5 rounded-full uppercase">
            Step {step} of 3
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-stable h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        {/* Steps Content */}
        {step === 1 && (
          <div className="space-y-4 text-left">
            <h3 className="font-bold text-slate-800 text-sm uppercase my-0">1. Location Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Village / Block</label>
              <input
                type="text"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
                required
              />
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDetectGps}
                className="w-full py-2.5 border border-stable/30 hover:bg-stable-light text-stable rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mic size={16} /> {detectingGps ? "Detecting GPS Coordinates..." : "Detect Current GPS Location"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Latitude</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50 text-slate-500"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Longitude</label>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50 text-slate-500"
                  readOnly
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-left">
            <h3 className="font-bold text-slate-800 text-sm uppercase my-0">2. Farm Attributes</h3>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Farm Size (Acres)</label>
              <input
                type="number"
                step="0.1"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
                required
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Soil Type</label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
              >
                <option value="loam">Loam / Medium Soil</option>
                <option value="clay">Clay / Heavy Soil</option>
                <option value="sandy">Sandy / Light Soil</option>
                <option value="black_cotton">Black Cotton Soil</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Irrigation Setup</label>
              <select
                value={irrigation}
                onChange={(e) => setIrrigation(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
              >
                <option value="drip">Drip Irrigation</option>
                <option value="sprinkler">Sprinkler Irrigation</option>
                <option value="flood">Flood Irrigation</option>
                <option value="rainfed">Rainfed (No Irrigation)</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-left">
            <h3 className="font-bold text-slate-800 text-sm uppercase my-0">3. Crop Details</h3>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Active Crop Type</label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
              >
                <option value="tomato">Tomato</option>
                <option value="wheat">Wheat</option>
                <option value="onion">Onion</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Crop Variety</label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
                placeholder="e.g. PKM-1, Arka Vikas"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Sowing Date</label>
              <input
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-earth-200 bg-earth-50"
                required
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 pt-4 border-t border-slate-100">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="flex-1 bg-stable text-white py-3 rounded-2xl text-sm font-bold shadow-sm hover:bg-stable-dark transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? "Saving Profile..." : step === 3 ? "Finish & Sync Profiles" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
