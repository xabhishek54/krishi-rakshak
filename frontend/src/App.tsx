import React, { useState, useEffect, lazy, Suspense } from 'react';
import { translations } from './translations';
import { ToastContainer, useToast } from './Toast';
import { getStateList, getDistrictsForState, getDistrictCoords } from './india_locations';
import { speakText, stopSpeech, buildVoiceText, askGemini } from './voice';

// Lazy-loaded map picker — load once at module level to avoid remounting
const MapPickerComponent = lazy(() => import('./MapPicker'));
import { 
  Home as HomeIcon, 
  Sprout, 
  ShoppingCart, 
  Bell, 
  HelpCircle, 
  Mic, 
  User, 
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Lock,
  LogOut,
  CloudRain,
  Thermometer,
  Droplets
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Type declarations
type TabType = 'home' | 'crop' | 'market' | 'alerts' | 'support' | 'risk-detail' | 'profile' | 'community';
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
  // Translated dynamic content (advisories, alerts)
  const [translatedAdvisories, setTranslatedAdvisories] = useState<any[]>([]);
  const [translatedAlerts, setTranslatedAlerts] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
const [mandiPrices, setMandiPrices] = useState<any[]>([]);
    const [priceHistoryData, setPriceHistoryData] = useState<any[]>([]);
    const [priceCrashStatus, setPriceCrashStatus] = useState<any>(null);
    const [selectedMandiId, setSelectedMandiId] = useState<number | null>(null);
    const [cashFlow, setCashFlow] = useState<any>(null);
    const [distressData, setDistressData] = useState<any>(null);
    const [schemes, setSchemes] = useState<any[]>([]);

  // Yield Calculator state (top-level to follow React hooks rules)
  const [yieldCrop, setYieldCrop] = useState<string>('tomato');
  const [yieldArea, setYieldArea] = useState<number>(1.0);
  const [yieldRainfall, setYieldRainfall] = useState<number>(0);
  const [yieldSoil, setYieldSoil] = useState<string>('loam');
  const [yieldIrrigation, setYieldIrrigation] = useState<string>('drip');
  const [yieldResult, setYieldResult] = useState<any>(null);
  const [yieldLoading, setYieldLoading] = useState<boolean>(false);
  // Community Risk Map state (top-level to follow React hooks rules)
  const [communityData, setCommunityData] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState<boolean>(true);

  // Obligation Overlay Modal States
  const [showAddObligationModal, setShowAddObligationModal] = useState<boolean>(false);
  const [newObligationAmount, setNewObligationAmount] = useState<string>('30000');
  const [newObligationType, setNewObligationType] = useState<string>('loan');
  const [newObligationDate, setNewObligationDate] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Multiple Farms and Crops States
  const [farms, setFarms] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);         // crops for selected farm
  const [allCrops, setAllCrops] = useState<any[]>([]);   // ALL crops across ALL farms
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [selectedCrop, setSelectedCrop] = useState<any>(null);

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
  const t = translations[language];

  // Toast notifications
  const { toasts, removeToast, toast } = useToast();

  // Crop modal: which farm to add crop to (default to selectedFarm.id)
  const [cropFarmId, setCropFarmId] = useState<number | null>(null);

  const fetchFarmsAndCrops = async () => {
    if (!token) return;
    try {
      const farmRes = await fetch('http://127.0.0.1:8000/api/v1/farmers/me/farms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (farmRes.ok) {
        const farmData = await farmRes.json();
        setFarms(farmData);
        if (farmData.length > 0) {
          // If no farm selected yet, pick first
          const currentFarm = selectedFarm || farmData[0];
          setSelectedFarm(currentFarm);

          // Load crops from the selected farm (for modal UI)
          const cropRes = await fetch(`http://127.0.0.1:8000/api/v1/farms/${currentFarm.id}/crops`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (cropRes.ok) {
            const cropData = await cropRes.json();
            setCrops(cropData);
            if (cropData.length > 0) {
              setSelectedCrop(selectedCrop && cropData.some((c: any) => c.id === selectedCrop.id) ? selectedCrop : cropData[0]);
            } else {
              setSelectedCrop(null);
            }
          }

          // --- Load ALL crops from ALL farms (for home card grid + advisory) ---
          const allCropResults: any[] = [];
          await Promise.all(farmData.map(async (farm: any) => {
            try {
              const r = await fetch(`http://127.0.0.1:8000/api/v1/farms/${farm.id}/crops`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (r.ok) {
                const d = await r.json();
                // Attach farm info to each crop for display
                d.forEach((c: any) => {
                  allCropResults.push({ ...c, farm_name: farm.name || `Farm ${farm.id}`, farm_district: farm.district, farm_area: farm.area });
                });
              }
            } catch {}
          }));
          setAllCrops(allCropResults);
        } else {
          setFarms([]);
          setCrops([]);
          setAllCrops([]);
          setSelectedFarm(null);
          setSelectedCrop(null);
        }
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
    }
  };

// Sync token and load profiles
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      
      // Fetch profile
      fetch('http://127.0.0.1:8000/api/v1/farmers/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json()
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
        // Clear invalid token and fallback to mock
        setToken(null);
        // Fallback to mock
        setFarmer({
          name: regName || 'Ramesh Kumar',
          phone: loginPhone || regPhone || '+91 98765 43210',
          language: language,
          location_id: localStorage.getItem('onboardLocation') || 'Niphad_Nashik',
          risk_profile: 'High'
        });
        fetchFarmsAndCrops();
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
  }, [token]);

  // Fetch Weather
  const fetchWeather = async () => {
    if (!farmer?.location_id) return;
    setLoadingWeather(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/weather/${farmer.location_id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.observation) {
          setWeather(data);
          setLoadingWeather(false);
          return;
        }
      }
      throw new Error("No cached weather");
    } catch {
      // Offline/Error Fallback Mock Data
      setWeather({
        location_id: farmer.location_id,
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
      });
    }
    setLoadingWeather(false);
  };

  // Trigger weather refresh from API
  const refreshWeatherFromApi = async () => {
    if (!farmer?.location_id) return;
    setLoadingWeather(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/weather/${farmer.location_id}/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchWeather();
        await fetchAdvisoriesAndAlerts();
      }
    } catch (e) {
      console.error("Failed to refresh weather live. Using cache.", e);
    }
    setLoadingWeather(false);
  };

  // Fetch Advisories and Alerts
  const fetchAdvisoriesAndAlerts = async () => {
    try {
      const advRes = await fetch('http://127.0.0.1:8000/api/v1/advisories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (advRes.ok) {
        const data = await advRes.json();
        setAdvisories(data);
      }
      
      const alertRes = await fetch('http://127.0.0.1:8000/api/v1/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlerts(data);
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

  // Load crops when selected farm changes
  useEffect(() => {
    if (token && selectedFarm) {
      fetch(`http://127.0.0.1:8000/api/v1/farms/${selectedFarm.id}/crops`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("No crops");
      })
      .then(data => {
        setCrops(data);
        if (data.length > 0) {
          setSelectedCrop(data[0]);
        } else {
          setSelectedCrop(null);
        }
      })
      .catch(() => {
        // Fallback mock
        const mockCrop = { id: 1, crop_type: 'tomato', variety: 'Nashik Premium', stage: 'Fruit Development', sowing_date: '2026-07-04', image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop' };
        setCrops([mockCrop]);
        setSelectedCrop(mockCrop);
      });
    }
  }, [token, selectedFarm]);

  useEffect(() => {
    if (token && hasFarm && farmer?.location_id) {
      fetchWeather();
      fetchAdvisoriesAndAlerts();
    }
  }, [token, hasFarm, farmer?.location_id, selectedFarm, selectedCrop]);
  const fetchMandiPrices = async () => {
    if (!token || !selectedCrop) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/mandis/compare?crop=${selectedCrop.crop_type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMandiPrices(data);
        // Set selectedMandiId to the first mandi (highest net return due to sorting in backend)
        if (data.length > 0) {
          setSelectedMandiId(data[0].mandi_id);
        }
        // Fetch price history and price crash for the selected mandi
        await fetchPriceHistory();
        await fetchPriceCrash();
      }
    } catch {
      // Fallback mocks
      const mockData = [
        { mandi_id: 1, mandi_name: 'Lasalgaon APMC', distance_km: 12.0, sticker_price: 2620, transport_cost: 194, other_fees: 52.4, net_return: 2373.6 },
        { mandi_id: 2, mandi_name: 'Nashik APMC', distance_km: 15.0, sticker_price: 2600, transport_cost: 230, other_fees: 52.0, net_return: 2318.0 },
        { mandi_id: 3, mandi_name: 'Pimpalgaon APMC', distance_km: 35.0, sticker_price: 2850, transport_cost: 470, other_fees: 57.0, net_return: 2323.0 }
      ];
      setMandiPrices(mockData);
      // Set selectedMandiId to the first mandi in mock data
      setSelectedMandiId(1);
      // Fetch price history and price crash (will fallback to mocks)
      await fetchPriceHistory();
      await fetchPriceCrash();
    }
  };

  const fetchPriceHistory = async () => {
    if (!token || !selectedCrop || !selectedMandiId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/market/price-history?crop=${selectedCrop.crop_type}&mandi_id=${selectedMandiId}&window=30`, {
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

  const fetchPriceCrash = async () => {
    if (!token || !selectedCrop || !selectedMandiId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/market/price-crash?crop=${selectedCrop.crop_type}&mandi_id=${selectedMandiId}`, {
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
        baseline_30day_avg: 2600,
        reason: "Price changed -5.2% vs 30-day baseline"
      });
    }
  };

  const fetchProjections = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/farmers/me/projections', {
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
        fetch('http://127.0.0.1:8000/api/v1/farmers/me/distress', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://127.0.0.1:8000/api/v1/farmers/me/schemes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (distressRes.ok) setDistressData(await distressRes.json());
      if (schemesRes.ok) setSchemes(await schemesRes.json());
    } catch {
      // Fallback mocks
      setDistressData({
        score: 42.0, risk_level: 'Elevated',
        weather_component: 35.0, yield_component: 40.0,
        market_component: 55.0, financial_component: 45.0, urgency_component: 35.0
      });
      setSchemes([
        { id: 1, name: 'PM Fasal Bima Yojana (PMFBY)', state: 'All', support_type: 'Insurance (Crop Loss Compensation)', verification_url: 'https://pmfby.gov.in', conditions: '' },
        { id: 2, name: 'PM Kisan Samman Nidhi (PM-KISAN)', state: 'All', support_type: 'Direct Income Support (₹6,000/year)', verification_url: 'https://pmkisan.gov.in', conditions: '' },
        { id: 3, name: 'Kisan Credit Card (KCC)', state: 'All', support_type: 'Credit Access (Short-term Crop Loan)', verification_url: 'https://www.nabard.org', conditions: '' },
      ]);
    }
  };

  useEffect(() => {
    if (token && selectedCrop) {
      fetchMandiPrices();
      fetchProjections();
      fetchDistressAndSchemes();
    }
  }, [token, selectedCrop]);
  // Handle Logout
  const handleLogout = () => {
    setToken(null);
    setActiveTab('home');
  };

  // Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhone && loginPassword) {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            username: loginPhone,
            password: loginPassword
          })
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.access_token);
        } else {
          const errorData = await res.json();
          toast.error('Login failed', errorData.detail || 'Incorrect phone number or password');
        }
      } catch (err) {
        console.error(err);
        toast.error('Connection error', 'Cannot reach server. Please check backend is running.');
      }
    }
  };

  // Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regName && regPhone && regPassword) {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
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
          const loginRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              username: regPhone,
              password: regPassword
            })
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            setToken(loginData.access_token);
          } else {
            // If auto-login fails, still set token from registration response if it includes token
            // But our registration endpoint doesn't return token, so we rely on the login call above
            toast.warning('Registered!', 'Auto-login failed. Please log in manually.');
          }
        } else {
          const errorData = await res.json();
          toast.error('Registration failed', errorData.detail || 'Could not create account.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Connection error', 'Cannot reach server during registration.');
      }
    }
  };

  // Voice Playback — reads advisory text aloud (tab-aware)
  const handleVoicePlayback = async () => {
    if (isVoicePlaying) { stopSpeech(); setIsVoicePlaying(false); return; }
    setIsVoicePlaying(true);
    const text = buildVoiceText({ activeTab, advisories, distressData, mandiPrices, schemes, selectedCrop, language });
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

        const { translateText } = await import('./translate');
        const translated = await translateText(answer, language);
        await speakText(translated, language);

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
      if (e.error !== 'aborted') toast.warning('Mic error', `Could not capture audio: ${e.error}`);
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
      const { translateText } = await import('./translate');
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
      const { translateText } = await import('./translate');
      const out = await Promise.all(alerts.map(async (al: any) => ({
        ...al,
        reason: await translateText(al.reason || '', language),
        severity: await translateText(al.severity || '', language),
      })));
      if (!cancelled) setTranslatedAlerts(out);
    })();
    return () => { cancelled = true; };
  }, [alerts, language]);

  // Community risk map: fetch when tab becomes active
  useEffect(() => {
    if (activeTab !== 'community' || !token) return;
    setCommunityLoading(true);
    fetch(`${API_BASE}/api/v1/community/district-risk`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setCommunityData(d); setCommunityLoading(false); })
      .catch(() => setCommunityLoading(false));
  }, [activeTab, token]);

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
            {/* Header Greeting */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold font-sans my-0">Namaskar, {farmer?.name}!</h2>
                <p className="text-slate-500 font-sans text-sm mt-1 mb-0">Farm Location: {farmer?.location_id || 'Not Set'}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {/* Voice — read advisory */}
                <button
                  onClick={handleVoicePlayback}
                  title="Read today's advisory aloud"
                  className={`text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${isVoicePlaying ? 'bg-high text-white border-high animate-pulse' : 'bg-earth-50 text-earth-dark border-earth-200 hover:bg-stable hover:text-white hover:border-stable'}`}
                >
                  <span>🔊</span> {isVoicePlaying ? 'Stop' : 'Read Advisory'}
                </button>
                {/* Voice — ask Farm AI */}
                <button
                  onClick={handleInstantMic}
                  title="Speak a farming question"
                  className="text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border bg-stable-light text-stable-dark border-stable/30 hover:bg-stable hover:text-white"
                >
                  <span>🎙</span> Ask Gemini
                </button>
                {/* Weather refresh */}
                <button
                  onClick={refreshWeatherFromApi}
                  disabled={loadingWeather}
                  className="bg-slate-100 text-slate-600 hover:bg-stable hover:text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <span className={`h-2.5 w-2.5 rounded-full bg-stable ${loadingWeather ? 'animate-ping' : ''}`}></span>
                  {loadingWeather ? 'Syncing...' : 'Refresh Weather'}
                </button>
              </div>
            </div>

            {/* Farm & Crop Selector Strip */}
            <div className="bg-white p-4 rounded-2xl border border-earth-200 shadow-sm flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Farm Selector */}
                <div className="flex-1 sm:flex-none">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Active Farm</label>
                  <select 
                    value={selectedFarm?.id || ''}
                    onChange={(e) => {
                      const f = farms.find(farm => farm.id === parseInt(e.target.value));
                      if (f) setSelectedFarm(f);
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-earth-200 bg-earth-50 focus:outline-none w-full"
                  >
                    {farms.map((f, i) => (
                      <option key={f.id} value={f.id}>Farm #{i+1} ({f.area} Acres - {f.soil_type.toUpperCase()})</option>
                    ))}
                  </select>
                </div>

                {/* Crop Selector */}
                <div className="flex-1 sm:flex-none">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Active Crop</label>
                  {crops.length > 0 ? (
                    <select 
                      value={selectedCrop?.id || ''}
                      onChange={(e) => {
                        const cr = crops.find(crop => crop.id === parseInt(e.target.value));
                        if (cr) setSelectedCrop(cr);
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-earth-200 bg-earth-50 focus:outline-none w-full"
                    >
                      {crops.map((cr) => (
                        <option key={cr.id} value={cr.id}>{cr.crop_type.toUpperCase()} ({cr.variety || 'Local'})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-400 font-bold block py-1.5">No Crops Added</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setShowAddFarmModal(true)}
                  className="px-3 py-1.5 border border-stable/30 text-stable hover:bg-stable-light rounded-lg text-xs font-bold transition-all"
                >
                  + Add Farm
                </button>
                <button 
                  onClick={() => {
                    if (!selectedFarm) { toast.warning("No farm selected", "Please add a farm first."); return; }
                    setShowAddCropModal(true);
                  }}
                  className="px-3 py-1.5 bg-stable text-white hover:bg-stable-dark rounded-lg text-xs font-bold transition-all"
                >
                  + Add Crop
                </button>
              </div>
            </div>

            {/* 2x2 Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Weather Card */}
              <div className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm text-left">
                <div className="text-stable mb-2"><CloudRain size={32} /></div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Weather Today</h3>
                {weather?.observation ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-slate-900 text-lg font-bold flex items-center gap-1 my-0">
                      <Thermometer size={16} className="text-elevated" /> {weather.observation.temperature.toFixed(1)}°C
                    </p>
                    <div className="flex justify-between text-slate-500 text-[10px] mt-1.5">
                      <span className="flex items-center gap-0.5"><CloudRain size={12} className="text-slate-400" /> {weather.observation.rainfall.toFixed(1)} mm</span>
                      <span className="flex items-center gap-0.5"><Droplets size={12} className="text-slate-400" /> {weather.observation.humidity.toFixed(0)}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs mt-2 my-0">Loading weather...</p>
                )}
              </div>

              <button 
                onClick={() => setActiveTab('crop')}
                className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm hover:border-stable transition-colors text-left"
              >
                <div className="text-stable mb-2"><Sprout size={32} /></div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">My Crop</h3>
                <p className="text-slate-900 text-lg font-bold mt-1 my-0 capitalize">{selectedCrop ? selectedCrop.crop_type : 'Tomato'}</p>
                <span className="text-slate-400 text-xs mt-1 block">Stage: {selectedCrop ? selectedCrop.stage : 'Veg. Growth'}</span>
              </button>

              <button 
                onClick={() => setActiveTab('market')}
                className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm hover:border-stable transition-colors text-left"
              >
                <div className="text-elevated mb-2"><ShoppingCart size={32} /></div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Market Price</h3>
                <p className="text-slate-900 text-lg font-bold mt-1 my-0">₹2,290 <span className="text-xs font-normal text-slate-500">/q</span></p>
                <span className="text-high text-[10px] font-bold mt-1 block flex items-center gap-0.5">
                  <TrendingDown size={12} /> Price Crash (-22%)
                </span>
              </button>

              <div 
                onClick={() => setActiveTab('risk-detail')}
                className={`p-5 rounded-2xl border shadow-sm text-left cursor-pointer transition-colors ${
                  distressData?.risk_level === 'Critical' || distressData?.risk_level === 'High'
                    ? 'bg-high-light border-high-dark/20 hover:bg-high-light/80'
                    : distressData?.risk_level === 'Elevated'
                    ? 'bg-watch-light border-watch-dark/20 hover:bg-watch-light/80'
                    : 'bg-stable-light border-stable-dark/20 hover:bg-stable-light/80'
                }`}
              >
                <div className={`mb-2 ${
                  distressData?.risk_level === 'Critical' || distressData?.risk_level === 'High' ? 'text-high' :
                  distressData?.risk_level === 'Elevated' ? 'text-watch' : 'text-stable'
                }`}><AlertTriangle size={32} /></div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Distress Risk</h3>
                <p className="text-slate-900 text-lg font-bold mt-1 my-0">
                  {distressData?.score ?? '—'} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </p>
                <span className={`text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 inline-block uppercase ${
                  distressData?.risk_level === 'Critical' || distressData?.risk_level === 'High' ? 'bg-high' :
                  distressData?.risk_level === 'Elevated' ? 'bg-watch' :
                  distressData?.risk_level === 'Watch' ? 'bg-elevated' : 'bg-stable'
                }`}>{distressData?.risk_level ?? 'Loading…'}</span>
              </div>
            </div>

            {/* What should I do today section */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">{t.homeWhatToDo}</h3>
              <div className="space-y-4">
                {advisories.length > 0 ? (
                  (translatedAdvisories.length > 0 ? translatedAdvisories : advisories).map((adv) => (
                    <div key={adv.id} className="flex gap-4 items-start p-3 bg-earth-50 rounded-xl">
                      <span className={`p-2 rounded-lg mt-0.5 text-white flex items-center justify-center ${
                        adv.priority === 'high' ? 'bg-high' : adv.priority === 'medium' ? 'bg-elevated' : 'bg-stable'
                      }`}><AlertTriangle size={18} /></span>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">{adv.recommendation}</h4>
                        <p className="text-slate-500 text-xs mt-0.5">{adv.reason}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm py-2">No alerts or advisories for today. Your crops are in optimal condition!</p>
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

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold my-0">My Crops</h2>
                  <p className="text-slate-500 text-xs mt-1">
                    {allCrops.length > 0
                      ? `${allCrops.length} crop${allCrops.length > 1 ? 's' : ''} across ${farms.length} farm${farms.length > 1 ? 's' : ''}`
                      : 'No crops registered yet'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!selectedFarm) { toast.warning("No farm selected", "Please add a farm first."); return; }
                    setShowAddCropModal(true);
                  }}
                  className="px-3 py-2 bg-stable text-white hover:bg-stable-dark rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  + Add Crop
                </button>
              </div>
            </div>

            {/* All Crops Grid */}
            {allCrops.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCrops.map((crop: any) => (
                  <div
                    key={crop.id}
                    onClick={() => {
                      setSelectedCrop(crop);
                      const farm = farms.find((f: any) => f.id === crop.farm_id);
                      if (farm) setSelectedFarm(farm);
                    }}
                    className={`relative rounded-2xl overflow-hidden border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                      selectedCrop?.id === crop.id ? 'ring-2 ring-stable border-stable' : 'border-earth-200'
                    }`}
                  >
                    {/* Crop Image */}
                    <div className="relative h-40 w-full">
                      <img
                        src={getCropImage(crop.crop_type, crop.image_url)}
                        alt={crop.crop_type}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Stage badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`text-[9px] text-white font-bold px-2 py-1 rounded-full uppercase ${getCropStageColor(crop.stage || '')}`}>
                          {crop.stage || 'Unknown Stage'}
                        </span>
                      </div>
                      {/* Crop name */}
                      <div className="absolute bottom-3 left-3 text-white">
                        <div className="text-lg leading-none">
                          {cropEmojis[crop.crop_type?.toLowerCase()] || '🌱'}
                        </div>
                        <h3 className="font-bold text-sm capitalize mt-0.5 my-0">{crop.crop_type}</h3>
                        <p className="text-[10px] text-slate-200 my-0">{crop.variety || 'Local variety'}</p>
                      </div>
                    </div>

                    {/* Crop details */}
                    <div className="bg-white p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>🌱 Sown {getSowingDaysAgo(crop.sowing_date)} days ago</span>
                        <span className="text-[10px] bg-earth-100 text-earth-dark font-bold px-2 py-0.5 rounded-full">
                          {crop.farm_name || `Farm ${crop.farm_id}`}
                        </span>
                      </div>
                      {crop.farm_district && (
                        <p className="text-[10px] text-slate-400">📍 {crop.farm_district} · {crop.farm_area} acres</p>
                      )}
                      {/* Advisories for this crop */}
                      {advisories.filter((adv: any) => adv.farm_id === crop.farm_id).length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-elevated-dark uppercase tracking-wide">⚠ Advisory</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {advisories.filter((adv: any) => adv.farm_id === crop.farm_id)[0]?.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-earth-200 text-center">
                <p className="text-4xl mb-3">🌱</p>
                <p className="text-slate-500 text-sm font-medium">No crops registered yet</p>
                <p className="text-slate-400 text-xs mt-1 mb-4">Add your first farm and crop to get started</p>
                <button
                  onClick={() => setShowAddCropModal(true)}
                  className="px-5 py-2.5 bg-stable text-white hover:bg-stable-dark rounded-xl text-sm font-bold transition-all"
                >
                  Register First Crop
                </button>
              </div>
            )}

            {/* Advisory Feed — all farms */}
            {advisories.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 my-0">Advisory Feed (All Farms)</h3>
                <div className="border-l-2 border-stable pl-4 py-2 space-y-4">
                  {(translatedAdvisories.length > 0 ? translatedAdvisories : advisories).map((adv: any) => (
                    <div key={adv.id} className="relative">
                      <span className="absolute -left-[23px] top-1.5 bg-stable h-3 w-3 rounded-full border-2 border-white" />
                      <div className="bg-white p-3 rounded-xl border border-earth-200 shadow-xs">
                        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                          {adv.category} · Farm {adv.farm_id}
                        </p>
                        <p className="text-slate-800 text-xs font-semibold mt-1">{adv.recommendation}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{adv.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Yield Calculator ── */}
            {(()=> {
              const runYieldCalc = async () => {
                setYieldLoading(true);
                try {
                  const params = new URLSearchParams({
                    crop_type: yieldCrop,
                    area_acres: String(yieldArea),
                    rainfall_deviation: String(yieldRainfall),
                    soil_type: yieldSoil,
                    irrigation_type: yieldIrrigation,
                  });
                  const r = await fetch(`${API_BASE}/api/v1/yield/estimate?${params}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (r.ok) setYieldResult(await r.json());
                } catch (e) {}
                setYieldLoading(false);
              };

              return (
                <div className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 my-0">🧮 Yield Calculator</h3>
                    <span className="text-[10px] bg-stable/10 text-stable font-bold px-2 py-0.5 rounded-full">ML Model</span>
                  </div>
                  <p className="text-xs text-slate-400">Estimate your crop yield and projected revenue based on current conditions.</p>

                  {/* Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Crop</label>
                      <select
                        value={yieldCrop}
                        onChange={e => setYieldCrop(e.target.value)}
                        className="w-full text-xs border border-earth-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
                      >
                        {['tomato','onion','wheat','potato','maize','rice','cotton','soybean'].map(c => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Area (acres)</label>
                      <input
                        type="number" min="0.1" step="0.1"
                        value={yieldArea}
                        onChange={e => setYieldArea(Number(e.target.value))}
                        className="w-full text-xs border border-earth-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Soil Type</label>
                      <select
                        value={yieldSoil}
                        onChange={e => setYieldSoil(e.target.value)}
                        className="w-full text-xs border border-earth-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
                      >
                        {['loam','clay','sandy','black'].map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Irrigation</label>
                      <select
                        value={yieldIrrigation}
                        onChange={e => setYieldIrrigation(e.target.value)}
                        className="w-full text-xs border border-earth-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
                      >
                        {['drip','sprinkler','flood','rainfed'].map(i => (
                          <option key={i} value={i}>{i.charAt(0).toUpperCase()+i.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                        Rainfall vs. Normal: <span className={yieldRainfall < 0 ? 'text-high' : 'text-stable'}>{yieldRainfall > 0 ? '+' : ''}{yieldRainfall}%</span>
                      </label>
                      <input
                        type="range" min="-60" max="60" step="5"
                        value={yieldRainfall}
                        onChange={e => setYieldRainfall(Number(e.target.value))}
                        className="w-full accent-stable"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>−60% (severe drought)</span><span>0% (normal)</span><span>+60% (excess)</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={runYieldCalc}
                    disabled={yieldLoading}
                    className="w-full py-2.5 bg-stable text-white text-sm font-bold rounded-xl hover:bg-stable-dark transition-colors disabled:opacity-60"
                  >
                    {yieldLoading ? '⏳ Calculating…' : '🧮 Estimate Yield & Revenue'}
                  </button>

                  {/* Results */}
                  {yieldResult && (
                    <div className="space-y-3 pt-3 border-t border-earth-50">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-earth-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Yield/Acre</p>
                          <p className="text-lg font-black text-slate-900">{yieldResult.estimated_yield_q_per_acre}<span className="text-xs font-semibold text-slate-400"> q</span></p>
                          <p className="text-[10px] text-slate-400">baseline {yieldResult.baseline_yield_q_per_acre}q</p>
                        </div>
                        <div className="bg-earth-50 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Total Yield</p>
                          <p className="text-lg font-black text-slate-900">{yieldResult.estimated_total_yield_q}<span className="text-xs font-semibold text-slate-400"> q</span></p>
                          <p className="text-[10px] text-slate-400">{yieldResult.area_acres} acres</p>
                        </div>
                        <div className={`rounded-xl p-3 ${yieldResult.yield_deviation_pct < 0 ? 'bg-high-light' : 'bg-stable/10'}`}>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">ML Deviation</p>
                          <p className={`text-lg font-black ${yieldResult.yield_deviation_pct < 0 ? 'text-high' : 'text-stable'}`}>
                            {yieldResult.yield_deviation_pct > 0 ? '+' : ''}{yieldResult.yield_deviation_pct}%
                          </p>
                          <p className="text-[10px] text-slate-400">vs baseline</p>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="bg-gradient-to-r from-stable to-stable-dark text-white rounded-xl p-4">
                        <p className="text-xs font-bold opacity-70">Projected Gross Revenue</p>
                        <p className="text-2xl font-black">₹{yieldResult.projected_gross_revenue.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">
                          @ ₹{yieldResult.modal_price_per_q}/q · {yieldResult.price_source}
                        </p>
                      </div>

                      {/* Scenario bars */}
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Revenue Scenarios (±15%)</p>
                        {[
                          { label: 'Best Case (+15%)', val: yieldResult.scenario.best.revenue, color: '#22c55e', q: yieldResult.scenario.best.yield_q },
                          { label: 'Base Estimate',    val: yieldResult.scenario.base.revenue, color: '#3b82f6', q: yieldResult.scenario.base.yield_q },
                          { label: 'Worst Case (−15%)',val: yieldResult.scenario.worst.revenue,color: '#ef4444', q: yieldResult.scenario.worst.yield_q },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className="text-[10px] w-32 text-slate-500 shrink-0">{s.label}</span>
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(s.val / yieldResult.scenario.best.revenue) * 100}%`, background: s.color }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 w-20 text-right shrink-0">
                              ₹{Math.round(s.val).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
              <div className="text-xs bg-stable-light text-stable-dark font-semibold rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="capitalize">🌾 {selectedCrop.crop_type}</span>
                <span className="text-slate-400">·</span>
                <span>{selectedCrop.farm_name || `Farm ${selectedCrop.farm_id}`}</span>
                {selectedCrop.stage && <><span className="text-slate-400">·</span><span>{selectedCrop.stage}</span></>}
              </div>
            )}

            {/* Mandi comparison table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Mandi Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Distance</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Sticker Price</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Transport Cost</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Mandi Fees (2%)</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Net Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mandiPrices.length > 0 ? (
                    mandiPrices.map((m, idx) => (
                      <tr 
                        key={m.mandi_id || idx} 
                        className={idx === 0 ? "bg-stable-light font-semibold text-stable" : "bg-white text-slate-700"}
                      >
                        <td className="px-4 py-3 font-bold">
                          {m.mandi_name} {idx === 0 && <span className="text-[10px] bg-stable text-white px-1.5 py-0.5 rounded-md ml-1.5 uppercase tracking-wide">Best Value</span>}
                        </td>
                        <td className="px-4 py-3 font-mono">{m.distance_km} km</td>
                        <td className="px-4 py-3 font-mono">₹{m.sticker_price}</td>
                        <td className="px-4 py-3 font-mono">₹{m.transport_cost}</td>
                        <td className="px-4 py-3 font-mono">₹{m.other_fees}</td>
                        <td className="px-4 py-3 font-extrabold font-mono">₹{m.net_return}</td>
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

            {mandiPrices.length > 0 && (
              <div className="bg-stable-light p-3.5 rounded-xl border border-stable-dark/10 text-xs text-stable-dark text-left">
                💡 **System Tip:** Sell your crop at **{mandiPrices[0].mandi_name}**. Even though sticker prices vary across APMCs, selling here minimizes transportation overhead and commissions, netting you a peak return of **₹{mandiPrices[0].net_return} per quintal**.
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
                    <div><span className="font-bold text-slate-700">7-day avg:</span> ₹{priceCrashStatus.recent_7day_avg.toFixed(0)}/qtl</div>
                    <div><span className="font-bold text-slate-700">30-day baseline:</span> ₹{priceCrashStatus.baseline_30day_avg.toFixed(0)}/qtl</div>
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
                (translatedAlerts.length > 0 ? translatedAlerts : alerts).map((al) => (
                  <div key={al.id} className={`flex gap-4 items-start p-4 rounded-xl border ${
                    al.severity === 'Critical' ? 'bg-high-light border-high-dark/10' : 'bg-elevated-light border-elevated-dark/10'
                  }`}>
                    <span className={`p-2.5 rounded-xl text-white ${
                      al.severity === 'Critical' ? 'bg-high' : 'bg-elevated'
                    }`}><AlertTriangle size={20} /></span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-sm">Agricultural Alert</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          al.severity === 'Critical' ? 'bg-high text-white' : 'bg-elevated text-white'
                        }`}>{al.severity}</span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1">{al.reason}</p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        );
      case 'support': {
        const schemeTypeColors: Record<string, string> = {
          'Insurance': 'bg-blue-50 text-blue-700 border-blue-200',
          'Direct Income': 'bg-green-50 text-green-700 border-green-200',
          'Credit': 'bg-purple-50 text-purple-700 border-purple-200',
          'Market': 'bg-orange-50 text-orange-700 border-orange-200',
          'Subsidy': 'bg-yellow-50 text-yellow-700 border-yellow-200',
          'Price Support': 'bg-red-50 text-red-700 border-red-200',
          'State': 'bg-indigo-50 text-indigo-700 border-indigo-200',
          'Infrastructure': 'bg-teal-50 text-teal-700 border-teal-200',
        };
        const getSchemeColor = (supportType: string) => {
          for (const key of Object.keys(schemeTypeColors)) {
            if (supportType.includes(key)) return schemeTypeColors[key];
          }
          return 'bg-slate-50 text-slate-700 border-slate-200';
        };

        const recommendedSchemes = schemes.filter((s: any) => s.is_recommended);
        const otherSchemes = schemes.filter((s: any) => !s.is_recommended);

        const SchemeCard = ({ scheme, highlight }: { scheme: any; highlight?: boolean }) => {
          let description = '';
          try {
            const cond = JSON.parse(scheme.conditions || '{}');
            description = cond.description || '';
          } catch {}

          return (
            <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md
              ${highlight
                ? 'bg-gradient-to-br from-stable-light/60 to-white border-stable/30 shadow-sm'
                : 'bg-white border-earth-200 shadow-xs hover:border-stable/30'
              }`}>
              <div>
                <div className="flex items-start gap-2 mb-2 flex-wrap">
                  {highlight && (
                    <span className="text-[9px] bg-stable text-white font-bold px-2 py-0.5 rounded-full uppercase shrink-0 mt-0.5 flex items-center gap-0.5">
                      ⭐ Recommended
                    </span>
                  )}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 mt-0.5 border ${getSchemeColor(scheme.support_type)}`}>
                    {scheme.support_type.split('(')[0].trim()}
                  </span>
                  {scheme.state !== 'All' && (
                    <span className="text-[9px] bg-earth-100 text-earth-dark font-bold px-2 py-0.5 rounded-full uppercase shrink-0 mt-0.5">
                      {scheme.state} Only
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug my-0">{scheme.name}</h3>
                {description && (
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{description}</p>
                )}
                {/* Relevance score bar */}
                {scheme.relevance_score > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                      <span>Relevance</span>
                      <span className="font-bold text-stable">{scheme.relevance_score}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1">
                      <div
                        className="bg-stable rounded-full h-1 transition-all"
                        style={{ width: `${Math.min(scheme.relevance_score, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[9px] bg-stable-light text-stable font-bold px-2 py-0.5 rounded-full uppercase">
                  {highlight ? '✓ Best Match' : 'Eligible'}
                </span>
                {scheme.verification_url && (
                  <a href={scheme.verification_url} target="_blank" rel="noreferrer"
                     className="text-xs font-semibold text-stable hover:text-stable-dark hover:underline transition-colors">
                    Apply Portal →
                  </a>
                )}
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {/* Header + Distress Banner */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-4">
              <div>
                <h2 className="text-xl font-bold my-0">Government Support Schemes</h2>
                <p className="text-slate-500 text-xs mt-1 mb-0">AI-ranked by relevance to your crops, location & distress level</p>
              </div>
              {distressData && (
                <div className={`p-4 rounded-xl border text-sm flex gap-4 items-center ${
                  distressData.risk_level === 'Critical' || distressData.risk_level === 'High' ? 'bg-high-light border-high-dark/20 text-high-dark' :
                  distressData.risk_level === 'Elevated' ? 'bg-watch-light border-watch-dark/20 text-watch-dark' :
                  'bg-stable-light border-stable-dark/20 text-stable-dark'
                }`}>
                  <div className="text-3xl font-extrabold font-mono">{distressData.score}</div>
                  <div>
                    <div className="font-bold text-sm">Distress Level: {distressData.risk_level}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">Score 0-100 · Based on weather, yield, market, financial & urgency signals</div>
                  </div>
                </div>
              )}
            </div>

            {/* Recommended Section */}
            {recommendedSchemes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⭐</span>
                  <h3 className="text-base font-bold text-slate-900 my-0">Recommended for You</h3>
                  <span className="text-[10px] bg-stable text-white font-bold px-2 py-0.5 rounded-full">{recommendedSchemes.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedSchemes.map((scheme: any) => (
                    <SchemeCard key={scheme.id} scheme={scheme} highlight={true} />
                  ))}
                </div>
              </div>
            )}

            {/* All Schemes Section */}
            {otherSchemes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📋</span>
                  <h3 className="text-base font-bold text-slate-900 my-0">All Available Schemes</h3>
                  <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">{otherSchemes.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {otherSchemes.map((scheme: any) => (
                    <SchemeCard key={scheme.id} scheme={scheme} />
                  ))}
                </div>
              </div>
            )}

            {schemes.length === 0 && (
              <div className="bg-white p-12 rounded-2xl border border-earth-200 text-center text-slate-400 text-sm">
                Complete your farm profile to see matched schemes.
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
                        <span className={`p-2 rounded-lg ${urgent ? 'text-high bg-high-light' : 'text-elevated bg-elevated-light'}`}>
                          <AlertTriangle size={18} />
                        </span>
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

      case 'community': {
        // Phase 20: Community District Risk Map
        // State + fetch are at top-level (communityData, communityLoading, useEffect)

        const riskColor = (level: string) => {
          switch (level) {
            case 'Critical': return '#ef4444';
            case 'High': return '#f97316';
            case 'Elevated': return '#f59e0b';
            case 'Watch': return '#facc15';
            default: return '#22c55e';
          }
        };

        return (
          <div className="p-4 md:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 my-0">🗺️ Community Risk Map</h2>
                <p className="text-xs text-slate-500 mt-0.5">District-level farmer distress — anonymised aggregates</p>
              </div>
              <button
                onClick={() => setActiveTab('home')}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >← Back</button>
            </div>

            {communityLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-8 h-8 border-4 border-stable border-t-transparent rounded-full" />
              </div>
            ) : communityData.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="font-semibold">No community data yet</p>
                <p className="text-xs mt-1">More farmers need to join your district first</p>
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex flex-wrap gap-2">
                  {[['Critical','#ef4444'],['High','#f97316'],['Elevated','#f59e0b'],['Stable','#22c55e']].map(([l,c]) => (
                    <span key={l} className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-full px-2 py-0.5 shadow-xs">
                      <span style={{background:c}} className="w-2.5 h-2.5 rounded-full inline-block" />
                      {l}
                    </span>
                  ))}
                </div>

                {/* District cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {communityData.map((d: any, i: number) => (
                    <div key={i} className="bg-white rounded-2xl border border-earth-100 shadow-xs p-4 flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
                        style={{ background: riskColor(d.risk_level) }}
                      >
                        {Math.round(d.avg_score)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{d.district}</p>
                        <p className="text-xs text-slate-400">{d.state}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: riskColor(d.risk_level) }}
                          >{d.risk_level}</span>
                          <span className="text-[10px] text-slate-400">{d.farmer_count} farmer{d.farmer_count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {/* Mini score bar */}
                      <div className="w-24 flex-shrink-0">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(d.avg_score, 100)}%`, background: riskColor(d.risk_level) }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 text-right">{d.avg_score}/100</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                  All data is anonymised. District scores are averages across all farmers in that district.
                </p>
              </>
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

          {!isRegistering ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
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
                className="w-full bg-stable text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm hover:bg-stable-dark transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock size={16} /> Authenticate Account
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
                className="w-full bg-stable text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm hover:bg-stable-dark transition-colors"
              >
                Register & Verify
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
            <HomeIcon size={18} /> Home Summary
          </button>
          <button 
            onClick={() => setActiveTab('crop')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'crop' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Sprout size={18} /> My Crop
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'market' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <ShoppingCart size={18} /> Market & Mandis
          </button>
          <button 
            onClick={() => setActiveTab('alerts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'alerts' || activeTab === 'risk-detail' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Bell size={18} /> Alert Center
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'support' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <HelpCircle size={18} /> Schemes
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'community' ? 'bg-stable text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <span className="text-base">🗺️</span> Community Map
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <User size={16} /> Account Profile
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8 overflow-y-auto h-screen">
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
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'alerts' || activeTab === 'risk-detail' ? 'text-stable' : 'text-slate-400'}`}
        >
          <Bell size={20} /> <span className="mt-1">Alerts</span>
        </button>
        <button 
          onClick={() => setActiveTab('community')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'community' ? 'text-stable' : 'text-slate-400'}`}
        >
          <span className="text-xl">🗺️</span> <span className="mt-0.5">Map</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'profile' ? 'text-stable' : 'text-slate-400'}`}
        >
          <User size={20} /> <span className="mt-1">Profile</span>
        </button>
      </nav>


      {/* ── Floating Mic Button — tap = instant voice record → AI answer → speak ── */}
      <button
        onClick={handleInstantMic}
        title={
          voiceState === 'idle' ? 'Tap to speak a question' :
          voiceState === 'listening' ? 'Listening... tap to cancel' :
          voiceState === 'thinking' ? 'Processing...' : 'Tap to stop'
        }
        className={`fixed bottom-20 right-6 md:bottom-8 md:right-8 text-white p-4 rounded-full shadow-xl transition-all z-50 border-2 border-white flex items-center justify-center
          ${voiceState === 'listening' ? 'bg-high scale-110 animate-pulse' : ''}
          ${voiceState === 'thinking' ? 'bg-elevated scale-105' : ''}
          ${voiceState === 'speaking' ? 'bg-watch scale-110' : ''}
          ${voiceState === 'idle' && !isVoicePlaying ? 'bg-stable hover:bg-stable-dark hover:scale-105' : ''}
          ${isVoicePlaying && voiceState === 'idle' ? 'bg-watch animate-bounce' : ''}
        `}
        aria-label="Voice Assistant"
      >
        {voiceState === 'thinking' ? (
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : <Mic size={24} />}
      </button>

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
                const { translateText } = await import('./translate');
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
                    const translated = await import('./translate').then(m => m.translateText(ans, language));
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
                  rec.onerror = () => setVoiceListening(false);
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
                const translated = await import('./translate').then(m => m.translateText(ans, language));
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
                      const translated = await import('./translate').then(m => m.translateText(voiceAnswer, language));
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

                {/* Map Picker */}
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase mb-1">📍 Pinpoint Farm Location</label>
                  <Suspense fallback={<div className="h-60 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading map…</div>}>
                    <MapPickerComponent
                      initialLat={newFarmLat}
                      initialLon={newFarmLon}
                      onLocationSelect={(lat, lon) => { setNewFarmLat(lat); setNewFarmLon(lon); }}
                    />
                  </Suspense>
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
                    const res = await fetch('http://127.0.0.1:8000/api/v1/farmers/me/farms', {
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
                  <option value="tomato">🍅 Tomato</option>
                  <option value="wheat">🌾 Wheat</option>
                  <option value="onion">🧅 Onion</option>
                  <option value="rice">🌾 Rice / Paddy</option>
                  <option value="sugarcane">🎋 Sugarcane</option>
                  <option value="cotton">🌿 Cotton</option>
                  <option value="maize">🌽 Maize</option>
                  <option value="soybean">🫘 Soybean</option>
                  <option value="groundnut">🥜 Groundnut</option>
                  <option value="potato">🥔 Potato</option>
                  <option value="chilli">🌶 Chilli</option>
                  <option value="grapes">🍇 Grapes</option>
                  <option value="banana">🍌 Banana</option>
                  <option value="mango">🥭 Mango</option>
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
                    const res = await fetch(`http://127.0.0.1:8000/api/v1/farms/${farmId}/crops`, {
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
              <h3 className="text-lg font-bold text-slate-900 my-0">Register Financial Obligation</h3>
              <button 
                onClick={() => setShowAddObligationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Obligation Type</label>
                <select 
                  value={newObligationType} 
                  onChange={(e) => setNewObligationType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                >
                  <option value="loan">Bank Crop Loan (KCC)</option>
                  <option value="lease">Land Lease Rent</option>
                  <option value="inputs">Fertilizer/Seed Credit</option>
                  <option value="other">Other Debt</option>
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
                    const res = await fetch('http://127.0.0.1:8000/api/v1/farmers/me/obligations', {
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
                      toast.error("Save failed", "Could not save obligation. Check backend.");
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
        await fetch('http://127.0.0.1:8000/api/v1/farmers/me', {
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
        const farmRes = await fetch('http://127.0.0.1:8000/api/v1/farmers/me/farms', {
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
          await fetch(`http://127.0.0.1:8000/api/v1/farms/${farmData.id}/crops`, {
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
