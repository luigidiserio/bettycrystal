import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
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
  const [authLoading, setAuthLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [activeTab, setActiveTab] = useState('crypto');
  
  // Betty Crystal states
  const [bettyCurrentWeek, setBettyCurrentWeek] = useState(null);
  const [bettyPredictions, setBettyPredictions] = useState(null);
  const [bettyHistory, setBettyHistory] = useState(null);
  const [showBettyPredictions, setShowBettyPredictions] = useState(false);
  const [showBettyHistory, setShowBettyHistory] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false);
  const [premiumInsights, setPremiumInsights] = useState(null);
  const [trialInsights, setTrialInsights] = useState(null);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState(null);
  const [loadingBetty, setLoadingBetty] = useState(false);
  
  // Asset analysis states (restore original functionality)
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [assetPrediction, setAssetPrediction] = useState(null);

  // Betty's accuracy data (loaded from backend)
  const [bettyAccuracy, setBettyAccuracy] = useState({
    overall: 83.3,  // 5/6 predictions correct
    thisWeek: 'Week 3',
    totalPredictions: 6,
    streak: 2
  });

  // Simple Login System
  const handleShowLogin = () => {
    setShowLoginForm(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API}/auth/login?username=${encodeURIComponent(loginForm.username)}&password=${encodeURIComponent(loginForm.password)}`, {}, {
        withCredentials: true
      });
      
      const userData = response.data.user;
      setUser({
        ...userData,
        name: userData.username === 'demo' ? 'Demo User' : 'Betty Lover',
        emailVerified: userData.email_verified,
        trialEndsAt: userData.trial_ends_at,
        trialActive: true  // Will check actual status separately
      });
      setShowLoginForm(false);
      setLoginForm({ username: '', password: '' });
      
    } catch (error) {
      if (error.response?.status === 401) {
        alert('Invalid credentials. Try: demo/demo or betty/crystal');
      } else {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setBettyPredictions(null);
      setShowBettyPredictions(false);
      setShowLoginForm(false);
    }
  };

  const handleLoginFormChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
  };

  const handleShowSignUp = () => {
    setShowSignUpForm(true);
    setShowLoginForm(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (signUpForm.password !== signUpForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/auth/register`, {
        username: signUpForm.username,
        email: signUpForm.email,
        password: signUpForm.password
      });
      
      alert('Account created successfully! Please log in.');
      setShowSignUpForm(false);
      setShowLoginForm(true);
      setSignUpForm({ username: '', email: '', password: '', confirmPassword: '' });
      
    } catch (error) {
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        console.error('Sign up error:', error);
        alert('Sign up failed. Please try again.');
      }
    }
  };

  const handleSignUpFormChange = (e) => {
    setSignUpForm({
      ...signUpForm,
      [e.target.name]: e.target.value
    });
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
      
      // Update accuracy data from backend
      if (response.data.overall_accuracy !== undefined) {
        setBettyAccuracy({
          overall: response.data.overall_accuracy,
          thisWeek: 'Week 3',
          totalPredictions: response.data.total_predictions || 6,
          streak: 2
        });
      }
    } catch (error) {
      console.error('Error fetching Betty data:', error);
    }
  };

  const fetchBettyHistory = async () => {
    try {
      const response = await axios.get(`${API}/betty/history`);
      setBettyHistory(response.data);
    } catch (error) {
      console.error('Error fetching Betty history:', error);
    }
  };

  const fetchTrialInsights = async () => {
    if (!user?.trialActive || !user?.emailVerified) {
      setShowVerifyEmailModal(true);
      return;
    }

    try {
      const response = await axios.get(`${API}/betty/premium-insights`, {
        withCredentials: true
      });
      setTrialInsights(response.data);
    } catch (error) {
      console.error('Error fetching trial insights:', error);
      if (error.response?.status === 403) {
        alert('Please verify your email to access Betty\'s insights!');
        setShowVerifyEmailModal(true);
      }
    }
  };

  const fetchPortfolioAnalysis = async () => {
    if (!user?.trialActive || !user?.emailVerified) {
      setShowVerifyEmailModal(true);
      return;
    }

    try {
      const response = await axios.get(`${API}/betty/portfolio-analysis`, {
        withCredentials: true
      });
      setPortfolioAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching portfolio analysis:', error);
      if (error.response?.status === 403) {
        alert('Please verify your email to access portfolio analysis!');
        setShowVerifyEmailModal(true);
      }
    }
  };

  const upgradeToPremium = async () => {
    try {
      if (!user) {
        handleShowLogin();
        return;
      }

      // Get current origin URL
      const originUrl = window.location.origin;
      
      const response = await axios.post(`${API}/payments/create-checkout`, {
        package_id: 'premium_monthly',
        origin_url: originUrl
      }, {
        withCredentials: true
      });
      
      // Redirect to Stripe Checkout
      window.location.href = response.data.checkout_url;
      
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to create payment session. Please try again.');
    }
  };

  // Payment status checking
  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return null;
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000; // 2 seconds

    if (attempts >= maxAttempts) {
      alert('Payment status check timed out. Please refresh the page or contact support.');
      return;
    }

    try {
      const paymentData = await checkPaymentStatus(sessionId);
      
      if (paymentData?.payment_status === 'paid') {
        // Payment successful - refresh user data
        await fetchUserProfile();
        setShowPremiumModal(false);
        alert('Payment successful! Welcome to Betty Crystal Premium! 🎉');
        return;
      } else if (paymentData?.status === 'expired') {
        alert('Payment session expired. Please try again.');
        return;
      }

      // Continue polling if still pending
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error during payment polling:', error);
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    }
  };

  // Check for payment return on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Start polling for payment status
      pollPaymentStatus(sessionId);
    }
  }, []);

  const fetchBettyPredictions = async () => {
    if (!user) {
      handleShowLogin();
      return;
    }
    
    try {
      setLoadingBetty(true);
      const response = await axios.get(`${API}/betty/predictions`, {
        withCredentials: true
      });
      setBettyPredictions(response.data);
      setShowBettyPredictions(true);
      
      // Also fetch history when user is authenticated
      await fetchBettyHistory();
    } catch (error) {
      console.error('Error fetching Betty predictions:', error);
      if (error.response?.status === 401) {
        // Clear user state if unauthorized
        setUser(null);
        handleShowLogin();
      }
    } finally {
      setLoadingBetty(false);
    }
  };

  // Initialize app
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          withCredentials: true
        });
        const userData = response.data;
        setUser({
          ...userData,
          name: userData.username === 'demo' ? 'Demo User' : 'Betty Lover',
          emailVerified: userData.email_verified,
          trialEndsAt: userData.trial_ends_at,
          trialActive: true  // Will fetch actual status
        });
        
        // Fetch trial status
        try {
          const trialResponse = await axios.get(`${API}/auth/trial-status`, {
            withCredentials: true
          });
          setUser(prev => ({
            ...prev,
            trialActive: trialResponse.data.trial_active,
            daysRemaining: trialResponse.data.days_remaining,
            emailVerified: trialResponse.data.email_verified
          }));
        } catch (trialError) {
          console.log('Could not fetch trial status');
        }
      } catch (error) {
        // No active session, user remains null
        console.log('No active session');
      } finally {
        setAuthLoading(false);
      }
    };
    
    checkSession();
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
        className="transition-all duration-300 hover:shadow-lg hover:scale-[1.01] bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
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
          
          <div className="space-y-3">
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
            
            {/* Analyze Button */}
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onClick(asset, type);
              }}
              size="sm"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Analyze
            </Button>
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
      <Card className="bg-gradient-to-br from-emerald-600/90 to-teal-600/90 border border-emerald-400/50 backdrop-blur-md shadow-2xl shadow-emerald-500/20">
        <CardContent className="p-3 text-center">
          <div className="flex items-center space-x-2 mb-1">
            <BettyCharacter size="small" />
            <div className="text-left">
              <p className="text-white font-bold text-sm">Betty's Record</p>
              <p className="text-emerald-200 text-xs">{bettyAccuracy.thisWeek}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{bettyAccuracy.overall}%</div>
            <p className="text-emerald-200 text-xs">Accuracy</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Betty's Accuracy Bubble */}
      <BettyAccuracyBubble />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900/90 via-emerald-950/20 to-slate-900/90 backdrop-blur-md border-b border-emerald-800/30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-clip-text text-transparent">
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
                  onClick={handleShowLogin}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
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
        <Card className="mb-8 bg-gradient-to-r from-emerald-900/15 via-amber-900/10 to-slate-900/20 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
          <CardHeader>
            <div className="text-center">
              <BettyCharacter size="large" />
              <CardTitle className="text-3xl font-bold text-transparent bg-gradient-to-r from-emerald-300 via-teal-300 to-amber-300 bg-clip-text flex items-center justify-center gap-2 mt-4">
                Meet Betty Crystal
              </CardTitle>
              <p className="text-slate-400 mt-2">Your friendly AI trading mentor making weekly predictions</p>
              <div 
                className="mt-4 p-4 bg-gradient-to-r from-emerald-900/10 to-teal-900/10 rounded-lg border border-emerald-500/20 cursor-pointer hover:border-emerald-400/40 transition-all"
                onClick={() => {
                  fetchBettyHistory();
                  setShowBettyHistory(true);
                  setShowBettyPredictions(false); // Close predictions if open
                }}
              >
                <p className="text-emerald-300 text-center font-semibold mb-2">📊 See Betty's Historical Picks and Accuracy</p>
                <p className="text-slate-400 text-sm text-center">View Betty's complete track record and future top three picks for the upcoming week</p>
                <p className="text-xs text-center text-slate-500 mt-2">
                  Current accuracy: {bettyAccuracy.overall}% • {bettyAccuracy.totalPredictions} predictions tracked
                </p>
              </div>
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
                
                {user ? (
                  <div>
                    <div className="mb-4 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                      <p className="text-emerald-400 text-sm flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Premium Access Unlocked! Welcome {user.username || user.name}
                      </p>
                    </div>
                    
                    {/* Different content based on user level */}
                    {user.username === 'betty' ? (
                      // Master access - show everything
                      <div>
                        <p className="text-sm text-slate-300 mb-3">Betty's Master Dashboard - Full Access:</p>
                        
                        {/* Current Week Predictions */}
                        <div className="mb-6">
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-cyan-400" />
                            Week 3 Predictions (October 2025)
                          </h4>
                          {bettyDemoPredictions.map((prediction) => (
                            <BettyDemoPredictionCard key={prediction.id} prediction={prediction} />
                          ))}
                        </div>
                        
                        {/* Historical Performance */}
                        {bettyHistory && (
                          <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">📈 Historical Performance</h4>
                            <div className="space-y-3">
                              {bettyHistory.weekly_results.slice(0, 2).map((week, index) => (
                                <div key={week.week_start} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-white">
                                      Week {index === 0 ? '2' : '1'} ({new Date(week.week_start).toLocaleDateString()})
                                    </span>
                                    <span className={`text-sm font-bold ${week.week_accuracy >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                      {week.correct_count}/{week.total_count} ({week.week_accuracy}%)
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Cumulative: {week.cumulative_accuracy}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 text-center">
                          <Button 
                            onClick={fetchBettyPredictions}
                            disabled={loadingBetty}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                          >
                            {loadingBetty ? (
                              <Activity className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4 mr-2" />
                            )}
                            {loadingBetty ? 'Refreshing Data...' : 'Refresh Live Data'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Demo access - show interface without picks
                      <div>
                        <p className="text-sm text-slate-300 mb-3">Demo Account - Preview Interface:</p>
                        <div className="p-6 bg-slate-800/30 border-2 border-dashed border-slate-600 rounded-lg text-center">
                          <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                          <p className="text-slate-400 mb-2">Demo Mode - Premium Features Locked</p>
                          <p className="text-xs text-slate-500">This is what the premium interface looks like.</p>
                          <p className="text-xs text-slate-500">Upgrade to see Betty's actual picks and historical data.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 mb-3">Sign in to see Betty's specific picks</p>
                    <div className="space-y-2 mb-4">
                      <p className="text-xs text-slate-500">• "Bitcoin will go UP 3% or more by end of week"</p>
                      <p className="text-xs text-slate-500">• "CAD will lose at least 1 cent by end of week"</p>
                      <p className="text-xs text-slate-500">• "Gold will rise 2% or more by end of week"</p>
                    </div>
                    <Button 
                      onClick={handleShowLogin}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
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

        {/* Premium Features Section */}
        {user && (
          <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text flex items-center justify-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                {user.isPremium ? "Premium Dashboard" : "Upgrade to Premium"}
              </CardTitle>
              {user.isPremium ? (
                <p className="text-slate-400 text-center">Access Betty's exclusive premium features</p>
              ) : (
                <p className="text-slate-400 text-center">Unlock advanced insights, portfolio analysis, and exclusive trading strategies</p>
              )}
            </CardHeader>
            <CardContent>
              {user.isPremium ? (
                // Premium User Interface
                <div className="space-y-6">
                  {/* Premium Features Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={fetchPremiumInsights}
                      disabled={loadingBetty}
                      className="h-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <div className="text-center">
                        <Zap className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-sm font-semibold">Premium Insights</div>
                        <div className="text-xs opacity-80">Advanced Market Analysis</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={fetchPortfolioAnalysis}
                      disabled={loadingBetty}
                      className="h-20 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                    >
                      <div className="text-center">
                        <Target className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-sm font-semibold">Portfolio Analysis</div>
                        <div className="text-xs opacity-80">Risk & Optimization</div>
                      </div>
                    </Button>
                  </div>

                  {/* Premium Content Display */}
                  {premiumInsights && (
                    <Card className="bg-slate-800/50 border border-purple-500/30">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-300">🔮 Premium Market Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-slate-300 whitespace-pre-line">
                          {premiumInsights.content}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {premiumInsights.premium_features?.map((feature, index) => (
                            <Badge key={index} className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {portfolioAnalysis && (
                    <Card className="bg-slate-800/50 border border-indigo-500/30">
                      <CardHeader>
                        <CardTitle className="text-lg text-indigo-300">📊 Portfolio Analysis</CardTitle>
                        <div className="flex gap-4 text-sm">
                          <span className="text-slate-400">Risk Score: 
                            <span className="text-indigo-400 font-semibold ml-1">{portfolioAnalysis.risk_score}/10</span>
                          </span>
                          <span className="text-slate-400">Diversification: 
                            <span className="text-emerald-400 font-semibold ml-1">{portfolioAnalysis.diversification_score}/10</span>
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {portfolioAnalysis.recommendations?.map((rec, index) => (
                            <div key={index} className="p-3 bg-slate-700/30 rounded border border-slate-600">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-semibold text-white">{rec.asset}</span>
                                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                                    rec.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                                    rec.action === 'SELL' ? 'bg-red-500/20 text-red-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {rec.action}
                                  </span>
                                </div>
                                <span className="text-indigo-400 font-semibold">{rec.allocation}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{rec.reasoning}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                // Non-Premium User Interface
                <div className="text-center space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <Zap className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <h4 className="font-semibold text-white text-sm">Advanced Insights</h4>
                      <p className="text-xs text-slate-400">Deep market analysis & predictions</p>
                    </div>
                    <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-500/30">
                      <Target className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                      <h4 className="font-semibold text-white text-sm">Portfolio Optimizer</h4>
                      <p className="text-xs text-slate-400">Risk assessment & allocation</p>
                    </div>
                    <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-500/30">
                      <Crown className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                      <h4 className="font-semibold text-white text-sm">Exclusive Strategies</h4>
                      <p className="text-xs text-slate-400">VIP trading recommendations</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setShowPremiumModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-3"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Premium - $9.99/month
                  </Button>
                  
                  <p className="text-xs text-slate-500">
                    ✨ 30-day money back guarantee • Cancel anytime • Exclusive Betty features
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Market Data */}
        <div className="grid grid-cols-1 gap-8">
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-emerald-700/30">
                <TabsTrigger 
                  value="crypto" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white flex items-center gap-2"
                  data-testid="crypto-tab"
                >
                  <Bitcoin className="w-4 h-4" />
                  Crypto
                </TabsTrigger>
                <TabsTrigger 
                  value="currencies"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white flex items-center gap-2"
                  data-testid="currencies-tab"
                >
                  <DollarSign className="w-4 h-4" />
                  Currencies
                </TabsTrigger>
                <TabsTrigger 
                  value="metals"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-500 data-[state=active]:text-white flex items-center gap-2"
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

        {/* Asset Analysis Panel */}
        {selectedAsset && (
          <Card className="mt-8 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-cyan-400" />
                  {selectedAsset.name} Analysis
                </CardTitle>
                <Button 
                  onClick={() => setSelectedAsset(null)}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Close
                </Button>
              </div>
              <p className="text-slate-400">
                Detailed analysis and predictions for {selectedAsset.symbol}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Price Chart */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Price History (24h)
                  </h3>
                  {historicalData.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historicalData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="time" 
                            stroke="#9CA3AF"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="#9CA3AF"
                            fontSize={12}
                            domain={['dataMin - 10', 'dataMax + 10']}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#F9FAFB'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#06B6D4" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-slate-800/30 rounded-lg">
                      <Activity className="w-8 h-8 text-slate-500 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* AI Prediction */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    AI Prediction
                  </h3>
                  {assetPrediction ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-400">Next 24h Prediction</span>
                          <Badge 
                            variant={assetPrediction.direction === 'up' ? "default" : "destructive"}
                            className={assetPrediction.direction === 'up' ? 
                              "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : 
                              "bg-red-500/20 text-red-400 border-red-500/30"
                            }
                          >
                            {assetPrediction.direction === 'up' ? '↗' : '↘'} {assetPrediction.direction?.toUpperCase() || 'N/A'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          ${assetPrediction.predicted_price?.toLocaleString() || 'N/A'}
                        </p>
                        <p className={`text-sm ${assetPrediction.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {assetPrediction.change_percent > 0 ? '+' : ''}{assetPrediction.change_percent?.toFixed(2) || '0.00'}% expected change
                        </p>
                      </div>
                      
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Confidence Level</h4>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${assetPrediction.confidence || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-300">{assetPrediction.confidence || 0}%</span>
                        </div>
                      </div>

                      {assetPrediction.reasoning && (
                        <div className="p-4 bg-slate-800/50 rounded-lg">
                          <h4 className="font-medium text-white mb-2">Analysis</h4>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {assetPrediction.reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-slate-800/30 rounded-lg">
                      <Zap className="w-8 h-8 text-slate-500 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Login Form Modal */}
      {showLoginForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white text-center">
                Sign In to Betty Crystal
              </CardTitle>
              <p className="text-slate-400 text-center">Access premium predictions and insights</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={loginForm.username}
                    onChange={handleLoginFormChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginFormChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-400 mb-2">Demo Credentials:</p>
                  <p className="text-xs text-emerald-400">• demo / demo</p>
                  <p className="text-xs text-emerald-400">• betty / crystal</p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  >
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowLoginForm(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                </div>
                
                <div className="text-center pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">Don't have an account?</p>
                  <Button
                    type="button"
                    onClick={handleShowSignUp}
                    variant="outline"
                    className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-900/30 hover:border-purple-400"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Create New Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sign Up Form Modal */}
      {showSignUpForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-gradient-to-br from-slate-900/95 to-purple-900/20 border border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white text-center">
                Join Betty Crystal
              </CardTitle>
              <p className="text-slate-400 text-center">Create your account to access premium features</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={signUpForm.username}
                    onChange={handleSignUpFormChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={signUpForm.email}
                    onChange={handleSignUpFormChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={signUpForm.password}
                    onChange={handleSignUpFormChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="Create a secure password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={signUpForm.confirmPassword}
                    onChange={handleSignUpFormChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                
                <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <p className="text-sm text-purple-300 font-semibold">Free Account Includes:</p>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1">
                    <li>• Market data & basic predictions</li>
                    <li>• Betty's historical performance</li>
                    <li>• Asset analysis charts</li>
                  </ul>
                  <p className="text-xs text-amber-300 mt-2">
                    ✨ Upgrade to Premium anytime for advanced features
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Create Account
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowSignUpForm(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                </div>
                
                <div className="text-center pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">Already have an account?</p>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowSignUpForm(false);
                      setShowLoginForm(true);
                    }}
                    variant="outline"
                    className="w-full border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/30 hover:border-emerald-400"
                  >
                    Sign In Instead
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900/90 via-emerald-950/10 to-slate-900/90 border-t border-emerald-800/20 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About Betty Crystal */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BettyCharacter size="small" />
                <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">About Betty Crystal</h3>
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
                  <a href="#market-data" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors">
                    Market Data
                  </a>
                </li>
                {!user && (
                  <li>
                    <button 
                      onClick={handleShowLogin}
                      className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
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

      {/* Betty History Modal */}
      <Dialog open={showBettyHistory} onOpenChange={setShowBettyHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10">
                <BettyCharacter size="small" />
              </div>
              Betty's Historical Performance & Future Predictions
            </DialogTitle>
            <p className="text-slate-400">
              Complete track record with date-stamped predictions and accuracy analysis
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Current Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/20 border border-emerald-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {bettyHistory?.overall_accuracy || bettyAccuracy.overall}%
                  </div>
                  <div className="text-sm text-slate-400">Overall Accuracy</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {bettyHistory?.total_predictions || bettyAccuracy.totalPredictions}
                  </div>
                  <div className="text-sm text-slate-400">Total Predictions</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-900/20 to-amber-800/20 border border-amber-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {bettyHistory?.total_correct || bettyAccuracy.streak}
                  </div>
                  <div className="text-sm text-slate-400">Total Correct</div>
                </CardContent>
              </Card>
            </div>

            {/* Historical Weeks */}
            {bettyHistory && bettyHistory.weekly_results && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Weekly Performance History
                </h3>
                <div className="space-y-4">
                  {bettyHistory.weekly_results.map((week, index) => (
                    <Card key={week.week_start} className="bg-slate-800/50 border border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold text-white">
                              Week {bettyHistory.weekly_results.length - index} 
                              ({new Date(week.week_start).toLocaleDateString('en-US', { 
                                month: 'short', day: 'numeric', year: 'numeric' 
                              })} - {new Date(new Date(week.week_start).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                                month: 'short', day: 'numeric' 
                              })})
                            </h4>
                            <p className="text-sm text-slate-400">
                              Generated: {new Date(week.week_start).toLocaleDateString('en-US', { 
                                weekday: 'long', month: 'long', day: 'numeric' 
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${week.week_accuracy >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                              {week.correct_count}/{week.total_count}
                            </div>
                            <div className="text-sm text-slate-400">{week.week_accuracy}% accuracy</div>
                          </div>
                        </div>
                        
                        {/* Show predictions if available */}
                        {week.predictions && week.predictions.length > 0 && (
                          <div className="space-y-2">
                            {week.predictions.map((prediction, predIndex) => (
                              <div key={predIndex} className="p-3 bg-slate-700/30 rounded border border-slate-600">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium text-white">{prediction.asset}</p>
                                    <p className="text-sm text-slate-300 mt-1">{prediction.prediction}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Confidence: {prediction.confidence}% • Target: {prediction.target_price ? `$${prediction.target_price}` : 'Price movement'}
                                    </p>
                                  </div>
                                  {prediction.is_correct !== undefined && (
                                    <Badge 
                                      variant={prediction.is_correct ? "default" : "destructive"}
                                      className={prediction.is_correct ? 
                                        "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : 
                                        "bg-red-500/20 text-red-400 border-red-500/30"
                                      }
                                    >
                                      {prediction.is_correct ? '✓ Correct' : '✗ Missed'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-3 text-xs text-slate-500">
                          Cumulative Accuracy: {week.cumulative_accuracy}%
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Future Predictions Preview */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                This Week's Upcoming Predictions
              </h3>
              <Card className="bg-gradient-to-br from-amber-900/10 to-orange-900/10 border border-amber-500/30">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-slate-300 mb-2">
                      New predictions will be available Monday morning
                    </p>
                    <p className="text-xs text-slate-500">
                      Week of {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                        month: 'long', day: 'numeric', year: 'numeric' 
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Close Button */}
            <div className="flex justify-center pt-4">
              <Button 
                onClick={() => setShowBettyHistory(false)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Close History
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Upgrade Modal */}
      <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-900 to-purple-900/50 border border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-400" />
              Upgrade to Betty Crystal Premium
            </DialogTitle>
            <p className="text-slate-400">
              Unlock Betty's most powerful features and advanced market intelligence
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Premium Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-purple-300">🚀 Advanced Features</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Deep Market Analysis with AI
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Portfolio Risk Assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Exclusive Trading Strategies
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Real-time Market Alerts
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-indigo-300">📊 Exclusive Access</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    Betty's Premium Predictions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    Advanced Chart Analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    Priority Customer Support
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    Monthly Strategy Reports
                  </li>
                </ul>
              </div>
            </div>

            {/* Pricing */}
            <div className="text-center p-6 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-500/30">
              <div className="text-3xl font-bold text-white mb-2">$9.99<span className="text-lg text-slate-400">/month</span></div>
              <p className="text-slate-400 text-sm mb-4">Cancel anytime • 30-day money back guarantee</p>
              
              <div className="space-y-3">
                <Button 
                  onClick={upgradeToPremium}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium Now
                </Button>
                
                <Button 
                  onClick={() => setShowPremiumModal(false)}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Maybe Later
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500">
                🔒 Secure payment processing • ✨ Instant access after upgrade
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
