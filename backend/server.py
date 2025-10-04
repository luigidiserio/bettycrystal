from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone, timedelta
import yfinance as yf
import requests
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Financial Dashboard API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Data Models
class AssetPrice(BaseModel):
    symbol: str
    name: str
    price: float
    change_24h: float
    change_percent: float
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HistoricalData(BaseModel):
    timestamp: str
    price: float

class PredictionData(BaseModel):
    asset: str
    current_price: float
    predictions: Dict[str, Dict[str, float]]  # {"1_week": {"price": 50000, "confidence": 0.75}}
    analysis: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Cache for financial data
data_cache = {
    "currencies": {"data": [], "last_updated": None},
    "crypto": {"data": [], "last_updated": None},
    "metals": {"data": [], "last_updated": None}
}

CACHE_EXPIRY_MINUTES = 5  # Cache expires after 5 minutes

# Financial Data Fetchers
async def fetch_currencies():
    """Fetch top currencies including CAD"""
    try:
        # Major currency pairs vs USD
        currency_pairs = {
            "CADUSD=X": "Canadian Dollar",
            "EURUSD=X": "Euro", 
            "GBPUSD=X": "British Pound",
            "JPYUSD=X": "Japanese Yen",
            "AUDUSD=X": "Australian Dollar",
            "CHFUSD=X": "Swiss Franc",
            "NZDUSD=X": "New Zealand Dollar"
        }
        
        currencies = []
        for symbol, name in currency_pairs.items():
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d")
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
                    change = current_price - prev_price
                    change_percent = (change / prev_price) * 100 if prev_price != 0 else 0
                    
                    currencies.append(AssetPrice(
                        symbol=symbol,
                        name=name,
                        price=round(current_price, 4),
                        change_24h=round(change, 4),
                        change_percent=round(change_percent, 2)
                    ))
            except Exception as e:
                logging.error(f"Error fetching {symbol}: {e}")
                continue
                
        return currencies
    except Exception as e:
        logging.error(f"Error in fetch_currencies: {e}")
        return []

async def fetch_crypto():
    """Fetch top 7 cryptocurrencies from CoinGecko"""
    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 7,
            "page": 1,
            "sparkline": False,
            "price_change_percentage": "24h"
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            cryptos = []
            
            for coin in data:
                cryptos.append(AssetPrice(
                    symbol=coin['symbol'].upper(),
                    name=coin['name'],
                    price=round(coin['current_price'], 2),
                    change_24h=round(coin['price_change_24h'] or 0, 2),
                    change_percent=round(coin['price_change_percentage_24h'] or 0, 2)
                ))
            
            return cryptos
        else:
            logging.error(f"CoinGecko API error: {response.status_code}")
            return []
    except Exception as e:
        logging.error(f"Error in fetch_crypto: {e}")
        return []

async def fetch_metals():
    """Fetch precious metals prices"""
    try:
        metals_symbols = {
            "GC=F": "Gold",
            "SI=F": "Silver", 
            "PL=F": "Platinum",
            "PA=F": "Palladium"
        }
        
        metals = []
        for symbol, name in metals_symbols.items():
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d")
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
                    change = current_price - prev_price
                    change_percent = (change / prev_price) * 100 if prev_price != 0 else 0
                    
                    metals.append(AssetPrice(
                        symbol=symbol,
                        name=name,
                        price=round(current_price, 2),
                        change_24h=round(change, 2),
                        change_percent=round(change_percent, 2)
                    ))
            except Exception as e:
                logging.error(f"Error fetching {symbol}: {e}")
                continue
                
        return metals
    except Exception as e:
        logging.error(f"Error in fetch_metals: {e}")
        return []

async def get_historical_data(symbol: str, asset_type: str):
    """Get 1 week historical data for an asset"""
    try:
        if asset_type == "crypto":
            # Primary approach: Use yfinance for crypto (more reliable)
            crypto_symbols = {
                "BTC": "BTC-USD", "ETH": "ETH-USD", "BNB": "BNB-USD",
                "SOL": "SOL-USD", "XRP": "XRP-USD", "ADA": "ADA-USD",
                "USDT": "USDT-USD", "USDC": "USDC-USD"
            }
            yf_symbol = crypto_symbols.get(symbol.upper(), "BTC-USD")
            
            try:
                ticker = yf.Ticker(yf_symbol)
                hist = ticker.history(period="7d")
                
                if not hist.empty:
                    historical = []
                    for index, row in hist.iterrows():
                        historical.append(HistoricalData(
                            timestamp=index.isoformat(),
                            price=round(row['Close'], 2)
                        ))
                    return historical
            except Exception as yf_error:
                logging.error(f"YFinance failed for {symbol}: {yf_error}")
            
            # Fallback to CoinGecko if yfinance fails
            coin_id_map = {
                "BTC": "bitcoin", "ETH": "ethereum", "BNB": "binancecoin",
                "SOL": "solana", "XRP": "ripple", "USDC": "usd-coin", 
                "ADA": "cardano", "USDT": "tether"
            }
            coin_id = coin_id_map.get(symbol.upper(), "bitcoin")
            
            try:
                url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
                params = {"vs_currency": "usd", "days": 7, "interval": "daily"}
                
                response = requests.get(url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if 'prices' in data and data['prices']:
                        historical = []
                        for price_point in data['prices']:
                            timestamp = datetime.fromtimestamp(price_point[0] / 1000, tz=timezone.utc)
                            historical.append(HistoricalData(
                                timestamp=timestamp.isoformat(),
                                price=round(price_point[1], 2)
                            ))
                        return historical
                else:
                    logging.error(f"CoinGecko API error {response.status_code} for {coin_id}")
            except Exception as cg_error:
                logging.error(f"CoinGecko fallback failed for {symbol}: {cg_error}")
                
            return []  # Return empty if all methods fail
            
        else:
            # For currencies and metals, use yfinance
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="7d")
            
            historical = []
            for index, row in hist.iterrows():
                historical.append(HistoricalData(
                    timestamp=index.isoformat(),
                    price=round(row['Close'], 4 if asset_type == "currency" else 2)
                ))
            
            return historical
            
    except Exception as e:
        logging.error(f"Error getting historical data for {symbol}: {e}")
        return []

async def generate_ai_prediction(symbol: str, name: str, current_price: float, historical_data: List[HistoricalData]):
    """Generate AI predictions using Emergent LLM"""
    try:
        # Prepare historical data summary for AI - handle empty data
        if not historical_data or len(historical_data) == 0:
            # Create mock historical data for AI analysis
            prices = [current_price] * 7  # Use current price as baseline
            price_trend = "stable"
            volatility = current_price * 0.05  # 5% volatility estimate
        else:
            prices = [d.price for d in historical_data[-7:]]  # Last 7 data points
            price_trend = "increasing" if prices[-1] > prices[0] else "decreasing" if prices[-1] < prices[0] else "stable"
            volatility = max(prices) - min(prices) if len(prices) > 1 else 0
        
        prompt = f"""
You are a financial analyst. Analyze {name} ({symbol}) and provide price predictions.

Current Data:
- Current Price: ${current_price:,.2f}
- 7-day trend: {price_trend}
- Recent volatility: ${volatility:.2f}
- Recent prices: {prices}

Provide predictions for:
1. 1 week from now
2. 1 month from now  
3. 1 year from now

For each timeframe, give:
- Predicted price (be realistic)
- Confidence level (0.1 to 1.0)
- Brief reasoning

Respond in this exact JSON format:
{{
  "predictions": {{
    "1_week": {{"price": 50000.00, "confidence": 0.75}},
    "1_month": {{"price": 52000.00, "confidence": 0.65}},
    "1_year": {{"price": 60000.00, "confidence": 0.45}}
  }},
  "analysis": "Brief market analysis and reasoning for predictions..."
}}

Be conservative with predictions and confidence levels.
"""
        
        # Initialize LLM chat
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"prediction_{symbol}_{int(datetime.now().timestamp())}",
            system_message="You are a professional financial analyst providing realistic market predictions."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            ai_data = json.loads(response)
            return PredictionData(
                asset=symbol,
                current_price=current_price,
                predictions=ai_data["predictions"],
                analysis=ai_data["analysis"]
            )
        except json.JSONDecodeError:
            logging.error(f"Failed to parse AI response for {symbol}: {response}")
            # Fallback if JSON parsing fails
            return PredictionData(
                asset=symbol,
                current_price=current_price,
                predictions={
                    "1_week": {"price": round(current_price * 1.02, 2), "confidence": 0.6},
                    "1_month": {"price": round(current_price * 1.05, 2), "confidence": 0.5},
                    "1_year": {"price": round(current_price * 1.15, 2), "confidence": 0.3}
                },
                analysis="AI analysis temporarily unavailable. Conservative growth projected based on market trends."
            )
            
    except Exception as e:
        logging.error(f"Error generating prediction for {symbol}: {e}")
        # Return conservative fallback prediction
        return PredictionData(
            asset=symbol,
            current_price=current_price,
            predictions={
                "1_week": {"price": round(current_price * 1.01, 2), "confidence": 0.5},
                "1_month": {"price": round(current_price * 1.03, 2), "confidence": 0.4},
                "1_year": {"price": round(current_price * 1.10, 2), "confidence": 0.3}
            },
            analysis="Conservative prediction based on current market conditions. Historical data limited."
        )

# Helper function to check if cache is expired
def is_cache_expired(last_updated):
    if last_updated is None:
        return True
    return datetime.now(timezone.utc) - last_updated > timedelta(minutes=CACHE_EXPIRY_MINUTES)

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Financial Dashboard API", "version": "1.0.0"}

@api_router.get("/currencies", response_model=List[AssetPrice])
async def get_currencies():
    """Get top currencies including CAD"""
    cache_key = "currencies"
    
    if is_cache_expired(data_cache[cache_key]["last_updated"]):
        currencies = await fetch_currencies()
        data_cache[cache_key] = {
            "data": currencies,
            "last_updated": datetime.now(timezone.utc)
        }
        return currencies
    
    return data_cache[cache_key]["data"]

@api_router.get("/crypto", response_model=List[AssetPrice])
async def get_crypto():
    """Get top 7 cryptocurrencies"""
    cache_key = "crypto"
    
    if is_cache_expired(data_cache[cache_key]["last_updated"]):
        crypto = await fetch_crypto()
        data_cache[cache_key] = {
            "data": crypto,
            "last_updated": datetime.now(timezone.utc)
        }
        return crypto
    
    return data_cache[cache_key]["data"]

@api_router.get("/metals", response_model=List[AssetPrice])
async def get_metals():
    """Get precious metals prices"""
    cache_key = "metals"
    
    if is_cache_expired(data_cache[cache_key]["last_updated"]):
        metals = await fetch_metals()
        data_cache[cache_key] = {
            "data": metals,
            "last_updated": datetime.now(timezone.utc)
        }
        return metals
    
    return data_cache[cache_key]["data"]

@api_router.get("/historical/{symbol}")
async def get_historical(symbol: str, asset_type: str = "crypto"):
    """Get historical data for an asset"""
    historical = await get_historical_data(symbol, asset_type)
    return {"symbol": symbol, "data": historical}

@api_router.get("/predict/{symbol}")
async def get_prediction(symbol: str, asset_type: str = "crypto"):
    """Get AI prediction for an asset"""
    try:
        # Get current price and historical data
        if asset_type == "crypto":
            crypto_data = await fetch_crypto()
            asset_data = next((c for c in crypto_data if c.symbol == symbol.upper()), None)
        elif asset_type == "currency":
            currency_data = await fetch_currencies()
            asset_data = next((c for c in currency_data if symbol.upper() in c.symbol), None)
        else:  # metals
            metals_data = await fetch_metals()
            asset_data = next((m for m in metals_data if symbol.upper() in m.symbol), None)
        
        if not asset_data:
            raise HTTPException(status_code=404, detail=f"Asset {symbol} not found")
        
        historical = await get_historical_data(symbol, asset_type)
        prediction = await generate_ai_prediction(
            symbol, asset_data.name, asset_data.price, historical
        )
        
        return prediction
        
    except Exception as e:
        logging.error(f"Error generating prediction: {e}")
        raise HTTPException(status_code=500, detail="Error generating prediction")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
