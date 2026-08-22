import React, { useState, useEffect } from 'react';
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
type TabType = 'home' | 'crop' | 'market' | 'alerts' | 'support' | 'risk-detail' | 'profile';
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
  const [language, setLanguage] = useState<LanguageType>('english');
  const [isVoicePlaying, setIsVoicePlaying] = useState<boolean>(false);
  const [hasFarm, setHasFarm] = useState<boolean>(localStorage.getItem('hasFarm') === 'true');
  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
const [mandiPrices, setMandiPrices] = useState<any[]>([]);
    const [priceHistoryData, setPriceHistoryData] = useState<any[]>([]);
    const [priceCrashStatus, setPriceCrashStatus] = useState<any>(null);
    const [selectedMandiId, setSelectedMandiId] = useState<number | null>(null);
    const [cashFlow, setCashFlow] = useState<any>(null);

  // Obligation Overlay Modal States
  const [showAddObligationModal, setShowAddObligationModal] = useState<boolean>(false);
  const [newObligationAmount, setNewObligationAmount] = useState<string>('30000');
  const [newObligationType, setNewObligationType] = useState<string>('loan');
  const [newObligationDate, setNewObligationDate] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Multiple Farms and Crops States
  const [farms, setFarms] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<any>(null);
  const [selectedCrop, setSelectedCrop] = useState<any>(null);

  // Modals overlays
  const [showAddFarmModal, setShowAddFarmModal] = useState<boolean>(false);
  const [showAddCropModal, setShowAddCropModal] = useState<boolean>(false);

  // Modal form states
  const [newFarmArea, setNewFarmArea] = useState<string>('2.5');
  const [newFarmSoil, setNewFarmSoil] = useState<string>('loam');
  const [newFarmIrrigation, setNewFarmIrrigation] = useState<string>('drip');
  const [newFarmLat, setNewFarmLat] = useState<string>('20.08');
  const [newFarmLon, setNewFarmLon] = useState<string>('74.11');
  const [newFarmBlock, setNewFarmBlock] = useState<string>('Niphad');
  const [newFarmDistrict, setNewFarmDistrict] = useState<string>('Nashik');
  
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
          
          const cropRes = await fetch(`http://127.0.0.1:8000/api/v1/farms/${currentFarm.id}/crops`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (cropRes.ok) {
            const cropData = await cropRes.json();
            setCrops(cropData);
            if (cropData.length > 0) {
              setSelectedCrop(selectedCrop || cropData[0]);
            } else {
              setSelectedCrop(null);
            }
          }
        } else {
          setFarms([]);
          setCrops([]);
          setSelectedFarm(null);
          setSelectedCrop(null);
        }
      }
    } catch (e) {
      console.warn("Offline fetch fallback for farms/crops", e);
      // Fallback mocks
      const mockFarm = { id: 1, area: 2.5, soil_type: 'loam', irrigation: 'drip', latitude: 20.08, longitude: 74.11 };
      const mockCrop = { id: 1, crop_type: 'tomato', variety: 'Nashik Premium', stage: 'Fruit Development', sowing_date: '2026-07-04', image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop' };
      setFarms([mockFarm]);
      setCrops([mockCrop]);
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

  useEffect(() => {
    if (token && selectedCrop) {
      fetchMandiPrices();
      fetchProjections();
    }
  }, [token, selectedCrop]);
  // Handle Logout
  const handleLogout = () => {
    setToken(null);
    setActiveTab('home');
  };

  // Mock Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPhone && loginPassword) {
      setToken('mock-jwt-token-sih');
    }
  };

  // Mock Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regName && regPhone && regPassword) {
      setToken('mock-jwt-token-sih');
    }
  };

  // Mock Voice Playback
  const handleVoicePlayback = () => {
    setIsVoicePlaying(true);
    const utterance = new SpeechSynthesisUtterance();
    
    let text = "Welcome to KrishiRakshak.";
    if (activeTab === 'home') {
      text = "Your farm distress risk is elevated. Skip irrigation today because rain is expected.";
    } else if (activeTab === 'market') {
      text = "Mandi C is recommended for your tomatoes with net realization of 2,290 rupees.";
    }
    
    utterance.text = text;
    utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-IN';
    utterance.onend = () => setIsVoicePlaying(false);
    window.speechSynthesis.speak(utterance);
  };

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
              <button 
                onClick={refreshWeatherFromApi}
                disabled={loadingWeather}
                className="bg-stable text-white hover:bg-stable-dark font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                <span className={`h-2.5 w-2.5 rounded-full bg-white ${loadingWeather ? 'animate-ping' : ''}`}></span>
                {loadingWeather ? 'Syncing Weather...' : 'Refresh Weather Forecast'}
              </button>
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
                    if (!selectedFarm) alert("Please register a farm first.");
                    else setShowAddCropModal(true);
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
                className="bg-high-light p-5 rounded-2xl border border-high-dark/20 shadow-sm text-left cursor-pointer hover:bg-high-light/80 transition-colors"
              >
                <div className="text-high mb-2"><AlertTriangle size={32} /></div>
                <h3 className="text-high-dark text-xs font-semibold uppercase tracking-wider">Distress Risk</h3>
                <p className="text-high-dark text-lg font-bold mt-1 my-0">82 <span className="text-sm font-normal">/ 100</span></p>
                <span className="bg-high text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 inline-block uppercase">High Risk</span>
              </div>
            </div>

            {/* What should I do today section */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">What should I do today?</h3>
              <div className="space-y-4">
                {advisories.length > 0 ? (
                  advisories.map((adv) => (
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
      case 'crop':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold my-0">My Crop Advisory</h2>
              <button 
                onClick={() => {
                  if (!selectedFarm) alert("Please register a farm first.");
                  else setShowAddCropModal(true);
                }}
                className="px-3 py-1.5 bg-stable text-white hover:bg-stable-dark rounded-lg text-xs font-bold transition-all"
              >
                + Add Another Crop
              </button>
            </div>

            {selectedCrop ? (
              <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-earth-200 shadow-sm">
                <img 
                  src={getCropImage(selectedCrop.crop_type, selectedCrop.image_url)} 
                  alt={selectedCrop.crop_type} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-5">
                  <div className="text-white text-left">
                    <span className="text-[10px] bg-stable px-2 py-0.5 rounded-full font-bold uppercase">Healthy</span>
                    <h3 className="text-xl font-bold mt-1 capitalize my-0">{selectedCrop.crop_type} ({selectedCrop.variety || 'Local'})</h3>
                    <p className="text-slate-200 text-xs mt-1 mb-0">Sown: {selectedCrop.sowing_date} ({getSowingDaysAgo(selectedCrop.sowing_date)} days ago) • Stage: {selectedCrop.stage}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-earth-50 rounded-xl border border-earth-200 text-center">
                <p className="text-slate-500 text-sm">No crops registered for this farm yet.</p>
                <button 
                  onClick={() => setShowAddCropModal(true)} 
                  className="mt-3 px-4 py-2 bg-stable text-white hover:bg-stable-dark rounded-xl text-xs font-bold transition-all"
                >
                  Register First Crop
                </button>
              </div>
            )}

            {/* Advisory History */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-left my-0">Advisory Feed</h3>
              <div className="border-l-2 border-stable pl-4 py-2 space-y-4 text-left">
                {advisories.filter(adv => adv.farm_id === selectedFarm?.id).length > 0 ? (
                  advisories.filter(adv => adv.farm_id === selectedFarm?.id).map((adv) => (
                    <div key={adv.id} className="relative">
                      <span className="absolute -left-[23px] top-1.5 bg-stable h-3 w-3 rounded-full border-2 border-white"></span>
                      <div className="bg-white p-3 rounded-xl border border-earth-200 shadow-xs">
                        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">{adv.category} • Alert</p>
                        <p className="text-slate-800 text-xs font-semibold mt-1">{adv.recommendation}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{adv.reason}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-xs py-2">
                    No active alerts or dynamic warnings for this crop. Continue standard crop maintenance and monitoring.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'market':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold my-0">Mandi Pricing & Net Realization</h2>
              <p className="text-slate-500 text-xs mt-1 mb-0">
                Optimized for net returns on crop: <span className="font-bold capitalize text-stable">{selectedCrop ? selectedCrop.crop_type : 'Tomato'}</span> (modal price minus transport/handling costs)
              </p>
            </div>

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
            <h2 className="text-xl font-bold">Alert Center</h2>
            <div className="space-y-4">
              {/* Financial Distress Alert (Baseline Simulation) */}
              <div className="flex gap-4 items-start p-4 bg-high-light rounded-xl border border-high-dark/10">
                <span className="bg-high text-white p-2.5 rounded-xl"><AlertTriangle size={20} /></span>
                <div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-high-dark text-sm">Distress Alert: Expected Income Shortfall</h4>
                    <span className="text-[10px] bg-high text-white font-bold px-2 py-0.5 rounded-full uppercase">Critical</span>
                  </div>
                  <p className="text-slate-600 text-xs mt-1">Due to cumulative rainfall deficit (-31%) and local tomato price crash (-22%), your projected income may not cover your upcoming loan obligation of ₹60,000 due in 12 days.</p>
                  <button onClick={() => setActiveTab('risk-detail')} className="text-xs font-semibold text-high-dark mt-2.5 flex items-center gap-0.5 hover:underline">
                    View Financial Resilience Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Dynamic Alerts (Pest Warnings) */}
              {alerts.length > 0 ? (
                alerts.map((al) => (
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
      case 'support':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold">Matched Government Support Schemes</h2>
              <p className="text-slate-500 text-xs mt-1">Eligibility estimates based on crop health warnings and regional location</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-earth-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">PM Fasal Bima Yojana (PMFBY)</h3>
                  <p className="text-xs text-slate-500 mt-1">Provides insurance coverage against yield losses from weather abnormalities.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] bg-stable-light text-stable font-bold px-2 py-0.5 rounded-full">Highly Match</span>
                  <a href="https://pmfby.gov.in" target="_blank" className="text-xs font-semibold text-stable hover:underline">Apply Portal</a>
                </div>
              </div>
            </div>
          </div>
        );
      case 'risk-detail':
        const normalIncome = cashFlow?.projected_net_income || 95000;
        const currentIncome = cashFlow?.projected_net_income || 62000;
        const stressIncome = Math.round(currentIncome * 0.7);
        const totalObligations = cashFlow?.total_obligations || 0;
        
        const getRatioText = (inc: number, ob: number) => {
          if (ob === 0) return "N/A (No Debt)";
          const r = inc / ob;
          if (r >= 1.2) return `${r.toFixed(2)}x (Secure)`;
          if (r >= 1.0) return `${r.toFixed(2)}x (Tight)`;
          return `${r.toFixed(2)}x (Deficit)`;
        };

        const getRatioColor = (inc: number, ob: number) => {
          if (ob === 0) return "text-stable";
          const r = inc / ob;
          if (r >= 1.2) return "text-stable";
          if (r >= 1.0) return "text-watch";
          return "text-high";
        };

        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6 text-left">
            <button onClick={() => setActiveTab('home')} className="text-xs font-semibold text-slate-500 hover:underline">← Back to Home</button>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold my-0">Farm Financial Resilience</h2>
              <span className={`text-white text-xs font-bold px-3 py-1 rounded-full uppercase ${
                cashFlow?.has_shortfall ? 'bg-high' : 'bg-stable'
              }`}>
                {cashFlow?.has_shortfall ? 'Deficit Risk' : 'Resilient'}
              </span>
            </div>

            <div className="p-4 bg-earth-50 rounded-xl border border-earth-200 text-xs">
              📊 **Resilience Definition:** Estimates whether expected farm earnings cover upcoming financial obligations under normal, current, and stressed scenarios.
            </div>

            {/* Scenarios Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Scenario</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Projected Net Income</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Obligations Due</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Coverage Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-semibold">Normal Baseline</td>
                    <td className="px-4 py-3 font-mono">₹{normalIncome}</td>
                    <td className="px-4 py-3 font-mono">₹{totalObligations}</td>
                    <td className={`px-4 py-3 font-bold ${getRatioColor(normalIncome, totalObligations)}`}>
                      {getRatioText(normalIncome, totalObligations)}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-semibold">Current Forecast</td>
                    <td className="px-4 py-3 font-mono">₹{currentIncome}</td>
                    <td className="px-4 py-3 font-mono">₹{totalObligations}</td>
                    <td className={`px-4 py-3 font-bold ${getRatioColor(currentIncome, totalObligations)}`}>
                      {getRatioText(currentIncome, totalObligations)}
                    </td>
                  </tr>
                  <tr className="bg-high-light font-semibold">
                    <td className="px-4 py-3 font-bold text-high-dark">Stress Scenario (-30%)</td>
                    <td className="px-4 py-3 text-high-dark font-mono">₹{stressIncome}</td>
                    <td className="px-4 py-3 text-high-dark font-mono">₹{totalObligations}</td>
                    <td className={`px-4 py-3 font-extrabold ${getRatioColor(stressIncome, totalObligations)}`}>
                      {getRatioText(stressIncome, totalObligations)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Obligations Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900 my-0">Upcoming Financial Obligations</h3>
                <button 
                  onClick={() => setShowAddObligationModal(true)}
                  className="px-3 py-1 bg-stable text-white hover:bg-stable-dark rounded-lg text-xs font-bold transition-all"
                >
                  + Add Obligation
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cashFlow?.obligations && cashFlow.obligations.length > 0 ? (
                  cashFlow.obligations.map((ob: any) => (
                    <div key={ob.id} className="p-4 rounded-xl border border-earth-200 bg-white flex justify-between items-center shadow-xs">
                      <div>
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase">{ob.type}</span>
                        <h4 className="font-bold text-slate-800 text-sm mt-1 mb-0">₹{ob.amount}</h4>
                        <p className="text-slate-400 text-[10px] mt-0.5 mb-0">Due Date: {ob.due_date}</p>
                      </div>
                      <span className="text-high bg-high-light p-2 rounded-lg"><AlertTriangle size={18} /></span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs py-2">No debt obligations registered. Your cash flows are fully unencumbered!</p>
                )}
              </div>
            </div>
          </div>
        );
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
                <label className="block text-slate-400 font-semibold text-xs uppercase mb-2">Change Language</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {(Object.keys(languageNames) as LanguageType[]).map((langKey) => (
                    <button
                      key={langKey}
                      onClick={() => setLanguage(langKey)}
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
                  <LogOut size={16} /> Sign Out Session
                </button>
              </div>
            </div>
          </div>
        );
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
    <div className="min-h-screen bg-earth-50 flex flex-col md:flex-row">
      {/* Sidebar Nav (Desktop widths >= md breakpoint) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-earth-200 p-6 space-y-8 flex-shrink-0">
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
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
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
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'profile' ? 'text-stable' : 'text-slate-400'}`}
        >
          <User size={20} /> <span className="mt-1">Profile</span>
        </button>
      </nav>

      {/* Floating Audio Assistance Trigger Button (Mobile-friendly Persistent) */}
      <button 
        onClick={handleVoicePlayback}
        className={`fixed bottom-20 right-6 md:bottom-8 md:right-8 bg-stable text-white p-4 rounded-full shadow-lg hover:scale-105 transition-all z-50 border-2 border-white flex items-center justify-center ${isVoicePlaying ? 'bg-high animate-bounce' : 'hover:bg-stable-dark'}`}
        aria-label="Speech Assist"
      >
        <Mic size={24} />
      </button>

      {/* Add Farm Modal Overlay */}
      {showAddFarmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-earth-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 my-0">Register New Farm</h3>
              <button 
                onClick={() => setShowAddFarmModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Area (Acres)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newFarmArea} 
                    onChange={(e) => setNewFarmArea(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Soil Type</label>
                  <select 
                    value={newFarmSoil} 
                    onChange={(e) => setNewFarmSoil(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                  >
                    <option value="loam">Loam</option>
                    <option value="clay">Clay</option>
                    <option value="sandy">Sandy</option>
                    <option value="black">Black Cotton</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Irrigation Method</label>
                <select 
                  value={newFarmIrrigation} 
                  onChange={(e) => setNewFarmIrrigation(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                >
                  <option value="drip">Drip Irrigation</option>
                  <option value="sprinkler">Sprinkler Irrigation</option>
                  <option value="flood">Flood Irrigation</option>
                  <option value="rainfed">Rainfed (None)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Block/Village</label>
                  <input 
                    type="text" 
                    value={newFarmBlock} 
                    onChange={(e) => setNewFarmBlock(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">District</label>
                  <input 
                    type="text" 
                    value={newFarmDistrict} 
                    onChange={(e) => setNewFarmDistrict(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">State</label>
                  <span className="block text-xs py-2 text-slate-500 font-bold uppercase">Maharashtra</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Latitude</label>
                  <input 
                    type="text" 
                    value={newFarmLat} 
                    onChange={(e) => setNewFarmLat(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Longitude</label>
                  <input 
                    type="text" 
                    value={newFarmLon} 
                    onChange={(e) => setNewFarmLon(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl font-mono"
                  />
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setNewFarmLat(position.coords.latitude.toFixed(4));
                        setNewFarmLon(position.coords.longitude.toFixed(4));
                      },
                      (err) => {
                        console.error(err);
                        alert("Could not retrieve GPS coordinates. Please input them manually.");
                      }
                    );
                  }
                }}
                className="w-full py-1.5 border border-stable/30 hover:bg-stable-light text-stable rounded-lg text-[10px] font-bold transition-all"
              >
                Auto-Detect coordinates via Device GPS
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowAddFarmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('http://127.0.0.1:8000/api/v1/farmers/me/farms', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        area: parseFloat(newFarmArea),
                        soil_type: newFarmSoil,
                        irrigation: newFarmIrrigation,
                        latitude: parseFloat(newFarmLat),
                        longitude: parseFloat(newFarmLon)
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setFarms(prev => [...prev, data]);
                      setSelectedFarm(data);
                      setShowAddFarmModal(false);
                      alert("Farm registered successfully!");
                    } else {
                      alert("Failed to register farm with backend.");
                    }
                  } catch {
                    alert("Network offline. Saved farm locally.");
                    const mockFarm = { 
                      id: Date.now(), 
                      area: parseFloat(newFarmArea), 
                      soil_type: newFarmSoil, 
                      irrigation: newFarmIrrigation,
                      latitude: parseFloat(newFarmLat),
                      longitude: parseFloat(newFarmLon)
                    };
                    setFarms(prev => [...prev, mockFarm]);
                    setSelectedFarm(mockFarm);
                    setShowAddFarmModal(false);
                  }
                }}
                className="px-4 py-2 bg-stable hover:bg-stable-dark text-white rounded-xl text-xs font-bold transition-all"
              >
                Register Farm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Crop Modal Overlay */}
      {showAddCropModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-earth-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 my-0">Register New Crop</h3>
              <button 
                onClick={() => setShowAddCropModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Crop Type</label>
                <select 
                  value={newCropType} 
                  onChange={(e) => setNewCropType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                >
                  <option value="tomato">Tomato</option>
                  <option value="wheat">Wheat</option>
                  <option value="onion">Onion</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Variety Name</label>
                <input 
                  type="text" 
                  value={newCropVariety} 
                  onChange={(e) => setNewCropVariety(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                  placeholder="e.g. PKM-1, Local Premium"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Sowing Date</label>
                <input 
                  type="date" 
                  value={newCropSowingDate} 
                  onChange={(e) => setNewCropSowingDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Crop Image URL (Optional)</label>
                <input 
                  type="url" 
                  value={newCropImageUrl} 
                  onChange={(e) => setNewCropImageUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-earth-200 bg-earth-50 rounded-xl font-mono"
                  placeholder="https://example.com/mycrop.jpg"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to auto-assign a beautiful stock farm photo based on selected crop.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowAddCropModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!selectedFarm) return;
                  try {
                    const res = await fetch(`http://127.0.0.1:8000/api/v1/farms/${selectedFarm.id}/crops`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        crop_type: newCropType,
                        variety: newCropVariety,
                        sowing_date: newCropSowingDate,
                        image_url: newCropImageUrl || null
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setCrops(prev => [...prev, data]);
                      setSelectedCrop(data);
                      setShowAddCropModal(false);
                      alert("Crop registered successfully!");
                    } else {
                      alert("Failed to register crop with backend.");
                    }
                  } catch {
                    alert("Network offline. Saved crop locally.");
                    const mockCrop = { 
                      id: Date.now(), 
                      crop_type: newCropType, 
                      variety: newCropVariety,
                      sowing_date: newCropSowingDate,
                      image_url: newCropImageUrl || null,
                      stage: 'Vegetative'
                    };
                    setCrops(prev => [...prev, mockCrop]);
                    setSelectedCrop(mockCrop);
                    setShowAddCropModal(false);
                  }
                }}
                className="px-4 py-2 bg-stable hover:bg-stable-dark text-white rounded-xl text-xs font-bold transition-all"
              >
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
                      alert("Obligation registered successfully!");
                      await fetchProjections();
                    } else {
                      alert("Failed to save obligation with backend.");
                    }
                  } catch {
                    alert("Saved obligation locally (demo mode).");
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
