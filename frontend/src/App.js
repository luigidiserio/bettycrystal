import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Bitcoin, Coins, Gem, BarChart3, Activity, Zap, Eye } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [currencies, setCurrencies] = useState([]);
  const [crypto, setCrypto] = useState([]);
  const [metals, setMetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [activeTab, setActiveTab] = useState('crypto');

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
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch historical data and predictions for selected asset
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
      setPrediction(predictionRes.data);
    } catch (error) {
      console.error('Error fetching asset details:', error);
    }
  };

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

  // Chart component with predictions
  const PredictionChart = ({ data, prediction }) => {
    if (!data.length || !prediction) return null;

    const lastPrice = data[data.length - 1].price;
    const predictions = [
      { 
        time: '1W', 
        price: prediction.predictions['1_week']?.price || lastPrice,
        isPrediction: true,
        confidence: prediction.predictions['1_week']?.confidence || 0.5
      },
      { 
        time: '1M', 
        price: prediction.predictions['1_month']?.price || lastPrice,
        isPrediction: true,
        confidence: prediction.predictions['1_month']?.confidence || 0.5
      },
      { 
        time: '1Y', 
        price: prediction.predictions['1_year']?.price || lastPrice,
        isPrediction: true,
        confidence: prediction.predictions['1_year']?.confidence || 0.3
      }
    ];

    const chartData = [
      ...data.slice(-20), // Last 20 historical points
      ...predictions
    ];

    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc'
              }}
              formatter={(value, name) => [
                `$${value.toLocaleString()}`,
                name === 'price' ? 'Price' : name
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#06b6d4" 
              strokeWidth={2}
              dot={(props) => {
                if (props.payload?.isPrediction) {
                  return (
                    <circle 
                      cx={props.cx} 
                      cy={props.cy} 
                      r={4} 
                      fill="#f59e0b" 
                      stroke="#fbbf24" 
                      strokeWidth={2}
                    />
                  );
                }
                return <circle cx={props.cx} cy={props.cy} r={2} fill="#06b6d4" />;
              }}
              strokeDasharray={(entry) => entry?.isPrediction ? "5 5" : "0 0"}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Prediction details */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(prediction.predictions).map(([timeframe, pred]) => (
            <Card key={timeframe} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wide">
                  {timeframe.replace('_', ' ')}
                </p>
                <p className="text-xl font-bold text-white">
                  ${pred.price?.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">
                  {Math.round(pred.confidence * 100)}% confidence
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* AI Analysis */}
        <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-300 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI Market Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm leading-relaxed">
              {prediction.analysis}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl font-semibold">Loading Market Data...</p>
          <p className="text-slate-400 mt-2">Fetching real-time prices and predictions</p>
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
            <div className="text-right">
              <p className="text-sm text-slate-400">Last updated</p>
              <p className="text-white font-medium">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Market Data Panel */}
          <div className="xl:col-span-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Analysis Panel */}
          <div className="xl:col-span-1">
            <Card className="bg-slate-900/50 border-slate-700 h-fit">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  Market Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAsset ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white">{selectedAsset.name}</h3>
                      <p className="text-slate-400">{selectedAsset.symbol}</p>
                      <p className="text-3xl font-bold text-cyan-400 mt-2">
                        ${selectedAsset.price.toLocaleString()}
                      </p>
                    </div>
                    
                    <PredictionChart data={historicalData} prediction={prediction} />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Coins className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Select an asset to view</p>
                    <p className="text-slate-500 text-sm mt-1">detailed analysis & predictions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
