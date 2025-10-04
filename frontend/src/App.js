import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Bitcoin, Coins, Gem, BarChart3, Activity, Zap, Eye, Star, Lock, LogOut, User, Crown, Target, Award } from 'lucide-react';
import BettyCharacter from './components/BettyCharacter';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const AUTH_URL = 'https://auth.emergentagent.com';

function App() {
  const [currencies, setCurrencies] = useState([]);
  const [crypto, setCrypto] = useState([]);
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('crypto');
  
  // Betty Crystal states
  const [bettyCurrentWeek, setBettyCurrentWeek] = useState(null);
  const [bettyPredictions, setBettyPredictions] = useState(null);
  const [showBettyPredictions, setShowBettyPredictions] = useState(false);
  const [loadingBetty, setLoadingBetty] = useState(false);
  
  // Asset analysis states (restore original functionality)
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [assetPrediction, setAssetPrediction] = useState(null);

  // Betty's mock accuracy for demo (in real app, this would come from backend)
  const [bettyAccuracy] = useState({
    overall: 73,
    thisWeek: 'Week 1',
    totalPredictions: 0,
    streak: 0
  });

  // Authentication functions
  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = () => {
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${AUTH_URL}/?redirect=${redirectUrl}`;
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
      setUser(null);
      setBettyPredictions(null);
      setShowBettyPredictions(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const processSessionId = async (sessionId) => {
    try {
      const response = await axios.get(
        'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
        { headers: { 'X-Session-ID': sessionId } }
      );
      
      // Create session in our backend
      await axios.post(`${API}/auth/session`, response.data);
      
      // Clean URL and check auth status
      window.history.replaceState({}, document.title, window.location.pathname);
      await checkAuthStatus();
    } catch (error) {
      console.error('Session processing error:', error);
      setAuthLoading(false);
    }
  };

  // Asset analysis functions (restored)
  const handleAssetSelect = async (asset, type) => {
    try {
      setSelectedAsset({ ...asset, type });
      
      // Get symbol for API call
      let symbol = asset.symbol;
      if (type === 'currency') {
        symbol = asset.symbol.replace('USD=X', '').replace('=X', '');
      } else if (type === 'metals') {
        symbol = asset.symbol.replace('=F', '');
      }
      
      const [historicalRes, predictionRes] = await Promise.all([
        axios.get(`${API}/historical/${symbol}?asset_type=${type}`),
        axios.get(`${API}/predict/${symbol}?asset_type=${type}`)
      ]);
      
      // Format historical data for charts
      const formattedData = historicalRes.data.data.map((item, index) => ({
        time: new Date(item.timestamp).toLocaleDateString('en-US', { 
          month: 'short', day: 'numeric', hour: '2-digit' 
        }),
        price: item.price,
        index
      }));
      
      setHistoricalData(formattedData);
      setAssetPrediction(predictionRes.data);
    } catch (error) {
      console.error('Error fetching asset details:', error);
    }
  };

  // Betty Crystal functions
  const fetchBettyCurrentWeek = async () => {
    try {
      const response = await axios.get(`${API}/betty/current-week`);
      setBettyCurrentWeek(response.data);
    } catch (error) {
      console.error('Error fetching Betty data:', error);
    }
  };

  const fetchBettyPredictions = async () => {
    if (!user) {
      handleLogin();
      return;
    }
    
    try {
      setLoadingBetty(true);
      const response = await axios.get(`${API}/betty/predictions`);
      setBettyPredictions(response.data);
      setShowBettyPredictions(true);
    } catch (error) {
      console.error('Error fetching Betty predictions:', error);
    } finally {
      setLoadingBetty(false);
    }
  };

  // Initialize app
  useEffect(() => {
    // Check for session ID in URL fragment
    const urlFragment = window.location.hash.substring(1);
    const params = new URLSearchParams(urlFragment);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
      processSessionId(sessionId);
    } else {
      checkAuthStatus();
    }
  }, []);

  // Fetch market data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [currencyRes, cryptoRes, metalsRes] = await Promise.all([
          axios.get(`${API}/currencies`),
          axios.get(`${API}/crypto`), 
          axios.get(`${API}/metals`)
        ]);
        
        setCurrencies(currencyRes.data);
        setCrypto(cryptoRes.data);
        setMetals(metalsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchBettyCurrentWeek();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchData();
      fetchBettyCurrentWeek();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Betty's First Predictions (demo data)
  const bettyDemoPredictions = [
    {
      id: 1,
      asset: 'Bitcoin (BTC)',
      prediction: 'Will go UP 3% or more by end of week',
      confidence: 75,
      reasoning: 'Strong institutional adoption signals and technical breakout patterns suggest upward momentum.',
      isUp: true,
      currentPrice: 121697
    },
    {
      id: 2,
      asset: 'Canadian Dollar (CAD)',
      prediction: 'Will lose at least 1 cent by end of week',
      confidence: 68,
      reasoning: 'Bank of Canada dovish stance and weak oil prices creating downward pressure on CAD.',
      isUp: false,
      currentPrice: 0.717
    },
    {
      id: 3,
      asset: 'Gold (GLD)',
      prediction: 'Will rise 2% or more by end of week',
      confidence: 82,
      reasoning: 'Global uncertainty and inflation concerns driving safe-haven demand for precious metals.',
      isUp: true,
      currentPrice: 3880
    }
  ];

  // Asset card component
  const AssetCard = ({ asset, type, onClick }) => {
    const isPositive = asset.change_percent >= 0;
    
    return (
      <Card 
        className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
        onClick={() => onClick(asset, type)}
        data-testid={`asset-card-${asset.symbol}`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-white text-lg">{asset.name}</h3>
              <p className="text-slate-400 text-sm">{asset.symbol}</p>
            </div>
            {isPositive ? 
              <TrendingUp className="w-5 h-5 text-emerald-400" /> : 
              <TrendingDown className="w-5 h-5 text-red-400" />
            }
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">
              ${asset.price.toLocaleString()}
            </p>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={isPositive ? "default" : "destructive"}
                className={isPositive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}
              >
                {isPositive ? '+' : ''}{asset.change_percent.toFixed(2)}%
              </Badge>
              <span className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}${asset.change_24h.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Betty Prediction Card for Demo
  const BettyDemoPredictionCard = ({ prediction }) => {
    return (
      <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 hover:border-purple-400/50 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-bold text-white text-sm">{prediction.asset}</h4>
              <p className={`text-sm font-medium mt-1 ${prediction.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {prediction.prediction}
              </p>
            </div>
            {prediction.isUp ? 
              <TrendingUp className="w-4 h-4 text-emerald-400 mt-1" /> : 
              <TrendingDown className="w-4 h-4 text-red-400 mt-1" />
            }
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Confidence</span>
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`w-2.5 h-2.5 ${i < prediction.confidence / 20 ? 'text-yellow-400 fill-current' : 'text-slate-600'}`}
                />
              ))}
              <span className="text-xs text-slate-400 ml-1">{prediction.confidence}%</span>
            </div>
          </div>
          
          <p className="text-xs text-slate-300 leading-relaxed">
            {prediction.reasoning}
          </p>
        </CardContent>
      </Card>
    );
  };

  // Betty Accuracy Bubble
  const BettyAccuracyBubble = () => (
    <div className="fixed top-20 right-6 z-50">
      <Card className="bg-gradient-to-br from-purple-600/90 to-blue-600/90 border border-purple-400/50 backdrop-blur-md shadow-2xl">
        <CardContent className="p-3 text-center">
          <div className="flex items-center space-x-2 mb-1">
            <BettyCharacter size="small" />
            <div className="text-left">
              <p className="text-white font-bold text-sm">Betty's Record</p>
              <p className="text-purple-200 text-xs">{bettyAccuracy.thisWeek}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{bettyAccuracy.overall}%</div>
            <p className="text-purple-200 text-xs">Accuracy</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl font-semibold">Loading Market Data...</p>
          <p className="text-slate-400 mt-2">Fetching real-time prices and Betty's insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Betty's Accuracy Bubble */}
      <BettyAccuracyBubble />
      
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Financial Dashboard
                </h1>
                <p className="text-slate-400">Real-time market data & Betty's AI predictions</p>
              </div>
            </div>
            
            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">Last updated</p>
                <p className="text-white font-medium">{new Date().toLocaleTimeString()}</p>
              </div>
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-white">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user.name}</span>
                  </div>
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleLogin}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Betty Crystal Section */}
        <Card className="mb-8 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-cyan-900/20 border border-purple-500/30">
          <CardHeader>
            <div className="text-center">
              <BettyCharacter size="large" />
              <CardTitle className="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text flex items-center justify-center gap-2 mt-4">
                Meet Betty Crystal
              </CardTitle>
              <p className="text-slate-400 mt-2">Your friendly AI trading mentor making weekly predictions</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Free Predictions Preview */}
              <div>
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  This Week's Market Outlook (Free)
                </h4>
                
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 mb-3">Betty's general market analysis for this week:</p>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      📈 <strong>Crypto:</strong> Bitcoin showing bullish momentum with institutional interest growing. Expect volatility but upward bias.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      💰 <strong>Currencies:</strong> CAD facing pressure from dovish Bank of Canada stance. USD strength continuing.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      🥇 <strong>Metals:</strong> Gold benefiting from uncertainty, safe-haven flows expected to continue.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Betty's Top 3 Picks (Gated) */}
              <div>
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  Betty's Top 3 Picks (Premium)
                </h4>
                
                {user && showBettyPredictions && bettyPredictions ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 mb-3">Week of {new Date().toLocaleDateString()}</p>
                    {bettyDemoPredictions.map((prediction) => (
                      <BettyDemoPredictionCard key={prediction.id} prediction={prediction} />
                    ))}
                  </div>
                ) : user ? (
                  <div>
                    <p className="text-sm text-slate-300 mb-3">Betty's specific picks with exact targets:</p>
                    {bettyDemoPredictions.map((prediction) => (
                      <BettyDemoPredictionCard key={prediction.id} prediction={prediction} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 mb-3">Sign in to see Betty's specific picks</p>
                    <div className="space-y-2 mb-4">
                      <p className="text-xs text-slate-500">• Exact price targets</p>
                      <p className="text-xs text-slate-500">• Confidence levels</p>
                      <p className="text-xs text-slate-500">• Detailed reasoning</p>
                    </div>
                    <Button 
                      onClick={handleLogin}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Unlock Betty's Picks
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Data */}
        <div className="grid grid-cols-1 gap-8">
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700">
                <TabsTrigger 
                  value="crypto" 
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white flex items-center gap-2"
                  data-testid="crypto-tab"
                >
                  <Bitcoin className="w-4 h-4" />
                  Crypto
                </TabsTrigger>
                <TabsTrigger 
                  value="currencies"
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white flex items-center gap-2"
                  data-testid="currencies-tab"
                >
                  <DollarSign className="w-4 h-4" />
                  Currencies
                </TabsTrigger>
                <TabsTrigger 
                  value="metals"
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white flex items-center gap-2"
                  data-testid="metals-tab"
                >
                  <Gem className="w-4 h-4" />
                  Metals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="crypto" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {crypto.map((asset) => (
                    <AssetCard 
                      key={asset.symbol} 
                      asset={asset} 
                      type="crypto"
                      onClick={handleAssetSelect}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="currencies" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currencies.map((asset) => (
                    <AssetCard 
                      key={asset.symbol} 
                      asset={asset} 
                      type="currency"
                      onClick={handleAssetSelect}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="metals" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metals.map((asset) => (
                    <AssetCard 
                      key={asset.symbol} 
                      asset={asset} 
                      type="metals"
                      onClick={handleAssetSelect}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-700 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About Betty Crystal */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BettyCharacter size="small" />
                <h3 className="text-xl font-bold text-white">About Betty Crystal</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Betty Crystal is your friendly AI trading mentor who combines advanced market analysis 
                with mystical intuition to provide weekly predictions on cryptocurrencies, currencies, 
                and precious metals.
              </p>
              <p className="text-slate-500 text-xs">
                Betty learns from every prediction, constantly improving her accuracy 
                to help you make better trading decisions.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-slate-400 hover:text-cyan-400 text-sm transition-colors"
                  >
                    ↑ Top of Page
                  </button>
                </li>
                <li>
                  <a href="#betty-section" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">
                    Betty's Predictions
                  </a>
                </li>
                <li>
                  <a href="#market-data" className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">
                    Market Data
                  </a>
                </li>
                {!user && (
                  <li>
                    <button 
                      onClick={handleLogin}
                      className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                    >
                      Sign In for Premium
                    </button>
                  </li>
                )}
              </ul>
            </div>
            
            {/* Copyright & Legal */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Legal</h3>
              <div className="space-y-2">
                <p className="text-slate-500 text-xs leading-relaxed">
                  © 2025 Betty Crystal Financial Dashboard. All rights reserved.
                </p>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Powered by AI • Real-time market data
                </p>
                <p className="text-slate-600 text-xs leading-relaxed mt-4">
                  <strong>Disclaimer:</strong> Betty's predictions are for educational purposes only. 
                  Not financial advice. Trade at your own risk.
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="border-t border-slate-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-500 text-xs mb-4 md:mb-0">
              Made with 💜 by Betty Crystal • AI-Powered Trading Predictions
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-slate-600 text-xs">Current Accuracy: {bettyAccuracy.overall}%</span>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-slate-600 text-xs">Live Data</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
