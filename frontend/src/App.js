import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Bitcoin, Coins, Gem, BarChart3, Activity, Zap, Eye, Star, Lock, LogOut, User, Crown } from 'lucide-react';

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

  // Asset card component
  const AssetCard = ({ asset, type }) => {
    const isPositive = asset.change_percent >= 0;
    
    return (
      <Card 
        className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
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

  // Betty Crystal Icon Component
  const BettyIcon = () => (
    <div className="relative w-16 h-16 mx-auto mb-4">
      {/* Crystal Ball */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-300 via-blue-300 to-cyan-300 opacity-80 animate-pulse"></div>
      
      {/* Inner glow */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/30 to-transparent"></div>
      
      {/* Sparkles */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-300 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
    </div>
  );

  // Betty Prediction Card
  const BettyPredictionCard = ({ prediction }) => {
    const isUp = prediction.direction === 'up';
    
    return (
      <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">{prediction.asset_name}</h4>
              <p className="text-purple-300 text-sm">{prediction.asset_symbol}</p>
            </div>
            {isUp ? 
              <TrendingUp className="w-5 h-5 text-emerald-400" /> : 
              <TrendingDown className="w-5 h-5 text-red-400" />
            }
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Current</span>
              <span className="text-white font-semibold">${prediction.current_price.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Target</span>
              <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                ${prediction.predicted_target_price.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Expected</span>
              <Badge className={isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                {isUp ? '+' : '-'}{prediction.predicted_change_percent.toFixed(1)}%
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Confidence</span>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i}
                    className={`w-3 h-3 ${i < prediction.confidence_level * 5 ? 'text-yellow-400 fill-current' : 'text-slate-600'}`}
                  />
                ))}
                <span className="text-xs text-slate-400 ml-2">
                  {Math.round(prediction.confidence_level * 100)}%
                </span>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-300 leading-relaxed">
                {prediction.reasoning}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
                <p className="text-slate-400">Real-time market data & AI predictions</p>
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
              <BettyIcon />
              <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text flex items-center justify-center gap-2">
                <Crystal className="w-6 h-6 text-purple-400" />
                Meet Betty Crystal
              </CardTitle>
              <p className="text-slate-400 mt-2">Your friendly AI trading mentor making weekly predictions</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Last Week's Performance */}
              <div>
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Last Week's Performance
                </h4>
                
                {bettyCurrentWeek?.last_week_report ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">Accuracy Score</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        {Math.round((bettyCurrentWeek.last_week_report.overall_accuracy || 0) * 100)}%
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {bettyCurrentWeek.last_week_report.predictions?.slice(0, 3).map((pred, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-slate-800/30 rounded">
                          <span className="text-sm text-slate-300">{pred.asset_name}</span>
                          <Badge className="bg-slate-700 text-slate-300">
                            {pred.direction === 'up' ? '↗️' : '↘️'} {pred.predicted_change_percent.toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Crystal className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-slate-400">Betty is preparing her first predictions...</p>
                  </div>
                )}
              </div>
              
              {/* This Week's Predictions */}
              <div>
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-cyan-400" />
                  This Week's Predictions
                </h4>
                
                {showBettyPredictions && bettyPredictions ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 mb-3">Week of {new Date(bettyPredictions.week_start).toLocaleDateString()}</p>
                    {bettyPredictions.predictions.map((prediction, index) => (
                      <BettyPredictionCard key={index} prediction={prediction} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    {user ? (
                      <div>
                        <Crystal className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                        <p className="text-slate-300 mb-3">Ready to see Betty's predictions?</p>
                        <Button 
                          onClick={fetchBettyPredictions}
                          disabled={loadingBetty}
                          className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
                        >
                          {loadingBetty ? (
                            <Activity className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4 mr-2" />
                          )}
                          {loadingBetty ? 'Generating...' : 'View This Week\'s Predictions'}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400 mb-3">Sign in to unlock Betty's weekly predictions</p>
                        <Button 
                          onClick={handleLogin}
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                        >
                          Sign In for Predictions
                        </Button>
                      </div>
                    )}
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
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
