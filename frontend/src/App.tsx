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
  Volume2,
  Lock,
  LogOut
} from 'lucide-react';

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


  // Form states for login/register
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // Mock fetch profile
      setFarmer({
        name: regName || 'Ramesh Kumar',
        phone: loginPhone || regPhone || '+91 98765 43210',
        language: language,
        location_id: 'Niphad, Nashik',
        risk_profile: 'High'
      });
    } else {
      localStorage.removeItem('token');
      setFarmer(null);
    }
  }, [token]);

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

  // Main UI shell if authenticated
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Header Greeting */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold font-sans">Namaskar, {farmer?.name}!</h2>
                <p className="text-slate-500 font-sans text-sm mt-1">Farm Location: {farmer?.location_id || 'Not Set'}</p>
              </div>
              <div className="bg-stable-light text-stable font-bold text-xs px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-stable-dark/20">
                <span className="h-2 w-2 rounded-full bg-stable animate-pulse"></span> Offline Mode Cached
              </div>
            </div>

            {/* 2x2 Responsive Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => setActiveTab('crop')}
                className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm hover:border-stable transition-colors text-left"
              >
                <div className="text-stable mb-2"><Sprout size={32} /></div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">My Crop</h3>
                <p className="text-slate-900 text-lg font-bold mt-1">Tomato</p>
                <span className="text-slate-400 text-xs mt-1 block">Stage: Fruiting</span>
              </button>

              <button 
                onClick={() => setActiveTab('market')}
                className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm hover:border-stable transition-colors text-left"
              >
                <div className="text-elevated mb-2"><ShoppingCart size={32} /></div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Market Price</h3>
                <p className="text-slate-900 text-lg font-bold mt-1">₹2,290 <span className="text-xs font-normal text-slate-500">/q</span></p>
                <span className="text-high text-xs font-bold mt-1 block flex items-center gap-1">
                  <TrendingDown size={14} /> Price Crash (-22%)
                </span>
              </button>

              <div 
                onClick={() => setActiveTab('risk-detail')}
                className="bg-high-light p-5 rounded-2xl border border-high-dark/20 shadow-sm text-left cursor-pointer hover:bg-high-light/80 transition-colors"
              >
                <div className="text-high mb-2"><AlertTriangle size={32} /></div>
                <h3 className="text-high-dark text-xs font-semibold uppercase tracking-wider">Distress Risk</h3>
                <p className="text-high-dark text-2xl font-bold mt-1">82 <span className="text-sm font-normal">/ 100</span></p>
                <span className="bg-high text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block uppercase">High Risk</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-earth-200 shadow-sm text-left">
                <div className="text-stable mb-2"><Volume2 size={32} /></div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Audio Assist</h3>
                <p className="text-slate-900 text-lg font-bold mt-1">Read Aloud</p>
                <button 
                  onClick={handleVoicePlayback} 
                  className={`mt-2 flex items-center gap-1.5 text-xs text-stable hover:underline font-semibold ${isVoicePlaying ? 'animate-pulse text-high' : ''}`}
                >
                  <Volume2 size={16} /> {isVoicePlaying ? 'Playing Audio...' : 'Click to Play'}
                </button>
              </div>
            </div>

            {/* What should I do today section */}
            <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">What should I do today?</h3>
              <div className="space-y-4">
                <div className="flex gap-4 items-start p-3 bg-earth-50 rounded-xl">
                  <span className="bg-high text-white p-2 rounded-lg mt-0.5"><AlertTriangle size={18} /></span>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">Stop Tomato Irrigation</h4>
                    <p className="text-slate-500 text-xs mt-0.5">Heavy rainfall of 40mm expected in Niphad block tomorrow. Skip irrigation today to prevent crop waterlogging.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-3 bg-earth-50 rounded-xl">
                  <span className="bg-elevated text-white p-2 rounded-lg mt-0.5"><ShoppingCart size={18} /></span>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">Check Mandi Prices</h4>
                    <p className="text-slate-500 text-xs mt-0.5">Tomato prices are down 22% locally. Compare transportation costs to choose the highest net realization sale option.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'crop':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold">My Crop Advisory</h2>
            <div className="p-4 bg-earth-50 rounded-xl border border-earth-200 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Crop</p>
                <h3 className="text-lg font-bold mt-0.5">Tomato (Nashik Premium)</h3>
                <p className="text-slate-500 text-xs">Sowed: 45 days ago (Tomato Stage: Fruit Development)</p>
              </div>
              <span className="bg-stable text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Healthy</span>
            </div>

            {/* Advisory History */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900">Advisory Feed</h3>
              <div className="border-l-2 border-stable pl-4 py-2 space-y-4">
                <div className="relative">
                  <span className="absolute -left-[23px] top-1.5 bg-stable h-3 w-3 rounded-full border-2 border-white"></span>
                  <div className="bg-white p-3 rounded-xl border border-earth-200 shadow-xs">
                    <p className="text-slate-400 text-[10px] font-semibold">Today • Weather Warning</p>
                    <p className="text-slate-800 text-xs mt-1">Do not irrigate for the next 48 hours. Heavy rain is expected. Check field drainage tomorrow morning because waterlogging during fruit development can damage roots.</p>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[23px] top-1.5 bg-slate-300 h-3 w-3 rounded-full border-2 border-white"></span>
                  <div className="bg-white p-3 rounded-xl border border-earth-200 shadow-xs">
                    <p className="text-slate-400 text-[10px] font-semibold">2 days ago • Soil Moisture</p>
                    <p className="text-slate-800 text-xs mt-1">Loam soil moisture status is High. Maintain optimal drainage grids.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'market':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold">Mandi Pricing & Net Realization</h2>
              <p className="text-slate-500 text-xs mt-1">Optimized for net returns (modal price minus transport/handling costs)</p>
            </div>

            {/* Mandi comparison table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Mandi</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Sticker Price</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Transport</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Other Fees</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Net Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-semibold">Mandi A</td>
                    <td className="px-4 py-3">₹2,700</td>
                    <td className="px-4 py-3">₹500</td>
                    <td className="px-4 py-3">₹100</td>
                    <td className="px-4 py-3 text-slate-900 font-bold">₹2,100</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-semibold">Mandi B</td>
                    <td className="px-4 py-3">₹2,850</td>
                    <td className="px-4 py-3">₹900</td>
                    <td className="px-4 py-3">₹100</td>
                    <td className="px-4 py-3 text-slate-900 font-bold">₹1,850</td>
                  </tr>
                  <tr className="bg-stable-light font-semibold">
                    <td className="px-4 py-3 font-bold text-stable">Mandi C (Best)</td>
                    <td className="px-4 py-3 text-stable">₹2,620</td>
                    <td className="px-4 py-3 text-stable">₹250</td>
                    <td className="px-4 py-3 text-stable">₹80</td>
                    <td className="px-4 py-3 text-stable font-extrabold">₹2,290</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-stable-light p-3.5 rounded-xl border border-stable-dark/10 text-xs text-stable-dark">
              💡 **System Tip:** Sell tomatoes at **Mandi C**. Although the listed sticker price (₹2,620) is lower than Mandi B (₹2,850), the shorter distance reduces transportation losses and expenses, giving you **₹440 extra net profit** per quintal.
            </div>
          </div>
        );
      case 'alerts':
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold">Alert Center</h2>
            <div className="space-y-4">
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
        return (
          <div className="bg-white p-6 rounded-2xl border border-earth-200 shadow-sm space-y-6">
            <button onClick={() => setActiveTab('home')} className="text-xs font-semibold text-slate-500 hover:underline">← Back to Home</button>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Farm Financial Resilience</h2>
              <span className="bg-high text-white text-xs font-bold px-3 py-1 rounded-full uppercase">High Risk (82)</span>
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
                    <td className="px-4 py-3">₹95,000</td>
                    <td className="px-4 py-3">₹60,000</td>
                    <td className="px-4 py-3 text-stable font-bold">1.58x (Secure)</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-semibold">Current Forecast</td>
                    <td className="px-4 py-3">₹62,000</td>
                    <td className="px-4 py-3">₹60,000</td>
                    <td className="px-4 py-3 text-watch font-bold">1.03x (Tight)</td>
                  </tr>
                  <tr className="bg-high-light font-semibold">
                    <td className="px-4 py-3 font-bold text-high-dark">Stress Scenario</td>
                    <td className="px-4 py-3 text-high-dark">₹42,000</td>
                    <td className="px-4 py-3 text-high-dark">₹60,000</td>
                    <td className="px-4 py-3 text-high font-extrabold">0.70x (Deficit)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="bg-high-light p-4 rounded-xl border border-high-dark/10 text-xs text-high-dark space-y-1">
              <h4 className="font-bold flex items-center gap-1"><AlertTriangle size={14} /> Risk Drivers Detected:</h4>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Rainfall: **-31% below seasonal norm**</li>
                <li>Expected Yield: **-18% projection reduction**</li>
                <li>Mandi Tomato Prices: **-22% local crash**</li>
              </ul>
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
    </div>
  );
}

export default App;
