from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, BackgroundTasks
from fastapi.security import HTTPBearer
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
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Betty Crystal Financial Dashboard API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Authentication
security = HTTPBearer(auto_error=False)

# Enums
class PredictionDirection(str, Enum):
    UP = "up"
    DOWN = "down"

class AssetType(str, Enum):
    CRYPTO = "crypto"
    CURRENCY = "currency"
    METAL = "metal"

# Data Models
class User(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# Betty Crystal Models
class BettyPrediction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week_start: datetime  # Monday of the prediction week
    asset_symbol: str
    asset_name: str
    asset_type: AssetType
    current_price: float
    direction: PredictionDirection
    predicted_change_percent: float
    predicted_target_price: float
    confidence_level: float
    reasoning: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class BettyAccuracy(BaseModel):
    prediction_id: str
    actual_price: float
    actual_change_percent: float
    accuracy_score: float  # 0.0 to 1.0
    was_direction_correct: bool
    price_difference_percent: float
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BettyWeeklyReport(BaseModel):
    week_start: datetime
    predictions: List[BettyPrediction]
    accuracy_scores: List[BettyAccuracy] = []
    overall_accuracy: float = 0.0
    betty_confidence: float = 0.7  # Betty's confidence in her abilities
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Cache for financial data
data_cache = {
    "currencies": {"data": [], "last_updated": None},
    "crypto": {"data": [], "last_updated": None},
    "metals": {"data": [], "last_updated": None}
}

CACHE_EXPIRY_MINUTES = 5  # Cache expires after 5 minutes

# Authentication Functions
async def get_session_from_cookie(request: Request) -> Optional[str]:
    """Extract session token from httpOnly cookie"""
    return request.cookies.get("session_token")

async def get_session_from_header(credentials = Depends(security)) -> Optional[str]:
    """Extract session token from Authorization header"""
    if credentials:
        return credentials.credentials
    return None

async def get_current_user(request: Request, credentials = Depends(security)) -> Optional[User]:
    """Get current authenticated user from session"""
    # Try cookie first, then header
    session_token = await get_session_from_cookie(request)
    if not session_token:
        session_token = await get_session_from_header(credentials)
    
    if not session_token:
        return None
    
    # Check if session exists and is not expired
    session_doc = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not session_doc:
        return None
    
    # Get user data
    user_doc = await db.users.find_one({"_id": session_doc["user_id"]})
    if not user_doc:
        return None
    
    user_doc["id"] = user_doc.pop("_id")  # Rename _id to id for Pydantic
    return User(**user_doc)

async def require_auth(user: User = Depends(get_current_user)) -> User:
    """Require authentication for protected endpoints"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

# Financial Data Fetchers (same as before)
async def fetch_currencies():
    """Fetch top currencies including CAD"""
    try:
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
    """Fetch specific cryptocurrencies from CoinGecko (BTC, ETH, BNB, SOL, XRP, DOT, ADA, DOGE)"""
    try:
        # Get specific coins instead of top 7 by market cap
        coin_ids = "bitcoin,ethereum,binancecoin,solana,ripple,polkadot,cardano,dogecoin"
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "usd",
            "ids": coin_ids,
            "order": "market_cap_desc",
            "per_page": 8,
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

# Betty Crystal Functions
async def get_monday_of_week(date: datetime = None) -> datetime:
    """Get Monday of the current or specified week"""
    if date is None:
        date = datetime.now(timezone.utc)
    
    # Get Monday of this week (0=Monday, 6=Sunday)
    days_since_monday = date.weekday()
    monday = date - timedelta(days=days_since_monday)
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)

async def betty_generate_predictions() -> List[BettyPrediction]:
    """Betty generates her 3 weekly predictions using AI"""
    try:
        # Get current market data
        currencies = await fetch_currencies()
        crypto = await fetch_crypto()
        metals = await fetch_metals()
        
        all_assets = []
        
        # Format assets for Betty's analysis
        for asset in crypto[:5]:  # Top 5 crypto
            all_assets.append({
                "symbol": asset.symbol,
                "name": asset.name,
                "type": "crypto",
                "price": asset.price,
                "change_percent": asset.change_percent
            })
            
        for asset in currencies[:4]:  # Top 4 currencies
            all_assets.append({
                "symbol": asset.symbol,
                "name": asset.name,
                "type": "currency",
                "price": asset.price,
                "change_percent": asset.change_percent
            })
            
        for asset in metals:  # All metals
            all_assets.append({
                "symbol": asset.symbol,
                "name": asset.name,
                "type": "metal",
                "price": asset.price,
                "change_percent": asset.change_percent
            })
        
        # Get Betty's previous accuracy to adjust confidence
        previous_reports = await db.betty_reports.find().sort("week_start", -1).limit(3).to_list(3)
        avg_accuracy = 0.7  # Default
        if previous_reports:
            accuracies = [report.get("overall_accuracy", 0.7) for report in previous_reports]
            avg_accuracy = sum(accuracies) / len(accuracies)
        
        # Adjust Betty's approach based on her track record
        if avg_accuracy < 0.5:
            difficulty_level = "conservative - make easier, safer predictions"
        elif avg_accuracy > 0.8:
            difficulty_level = "confident - can make bolder predictions"
        else:
            difficulty_level = "balanced - moderate risk predictions"
        
        prompt = f"""You are Betty Crystal, a friendly AI trading mentor. You need to make exactly 3 predictions for this week.

Your current track record: {avg_accuracy:.1%} accuracy
Recommended approach: {difficulty_level}

Available assets for prediction:
{json.dumps(all_assets, indent=2)}

Rules:
1. Pick exactly 3 different assets from the list
2. Predict direction (up/down) and percentage change for the WEEK
3. Be realistic - weekly changes are usually 2-15% for crypto, 0.5-5% for currencies/metals
4. Give confidence level 0.1-1.0 based on your track record
5. Provide friendly, mentor-like reasoning

Respond in this JSON format:
{{
  "predictions": [
    {{
      "asset_symbol": "BTC",
      "asset_name": "Bitcoin",
      "asset_type": "crypto",
      "current_price": 121000,
      "direction": "up",
      "predicted_change_percent": 5.2,
      "confidence_level": 0.75,
      "reasoning": "Betty's friendly explanation..."
    }}
  ]
}}"""
        
        # Get AI response
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"betty_predictions_{datetime.now().timestamp()}",
            system_message="You are Betty Crystal, a friendly and approachable AI trading mentor who makes weekly market predictions."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response - handle markdown code blocks
        try:
            # Remove markdown code blocks if present
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]  # Remove ```json
            if response_text.endswith("```"):
                response_text = response_text[:-3]  # Remove ```
            response_text = response_text.strip()
            
            ai_data = json.loads(response_text)
            predictions = []
            
            week_start = await get_monday_of_week()
            
            for pred_data in ai_data["predictions"][:3]:  # Ensure only 3
                direction = PredictionDirection.UP if pred_data["direction"].lower() == "up" else PredictionDirection.DOWN
                
                # Calculate target price
                current_price = pred_data["current_price"]
                change_percent = pred_data["predicted_change_percent"]
                if direction == PredictionDirection.DOWN:
                    change_percent = -abs(change_percent)
                
                target_price = current_price * (1 + change_percent / 100)
                
                prediction = BettyPrediction(
                    week_start=week_start,
                    asset_symbol=pred_data["asset_symbol"],
                    asset_name=pred_data["asset_name"],
                    asset_type=AssetType(pred_data["asset_type"]),
                    current_price=current_price,
                    direction=direction,
                    predicted_change_percent=abs(change_percent),
                    predicted_target_price=round(target_price, 2),
                    confidence_level=pred_data["confidence_level"],
                    reasoning=pred_data["reasoning"]
                )
                predictions.append(prediction)
            
            return predictions
            
        except json.JSONDecodeError:
            logging.error(f"Failed to parse Betty's AI response: {response}")
            return []
            
    except Exception as e:
        logging.error(f"Error generating Betty's predictions: {e}")
        return []

async def betty_evaluate_accuracy(prediction: BettyPrediction) -> BettyAccuracy:
    """Evaluate accuracy of Betty's prediction"""
    try:
        # Get current price for the asset
        current_price = 0.0
        
        if prediction.asset_type == AssetType.CRYPTO:
            crypto_data = await fetch_crypto()
            asset = next((c for c in crypto_data if c.symbol == prediction.asset_symbol), None)
        elif prediction.asset_type == AssetType.CURRENCY:
            currency_data = await fetch_currencies()
            asset = next((c for c in currency_data if prediction.asset_symbol in c.symbol), None)
        else:  # METAL
            metals_data = await fetch_metals()
            asset = next((m for m in metals_data if prediction.asset_symbol in m.symbol), None)
        
        if asset:
            current_price = asset.price
        else:
            logging.error(f"Could not find current price for {prediction.asset_symbol}")
            current_price = prediction.current_price  # Fallback
        
        # Calculate actual change
        actual_change_percent = ((current_price - prediction.current_price) / prediction.current_price) * 100
        
        # Check direction accuracy
        predicted_direction_up = prediction.direction == PredictionDirection.UP
        actual_direction_up = actual_change_percent > 0
        was_direction_correct = predicted_direction_up == actual_direction_up
        
        # Calculate accuracy score (0.0 to 1.0)
        # Direction correctness = 50% of score
        direction_score = 0.5 if was_direction_correct else 0.0
        
        # Price accuracy = 50% of score (based on how close the percentage prediction was)
        predicted_abs_change = prediction.predicted_change_percent
        actual_abs_change = abs(actual_change_percent)
        
        price_diff = abs(predicted_abs_change - actual_abs_change)
        # Score decreases as difference increases (max error of 20% = 0 score)
        price_accuracy = max(0.0, (20.0 - price_diff) / 20.0) * 0.5
        
        accuracy_score = direction_score + price_accuracy
        
        return BettyAccuracy(
            prediction_id=prediction.id,
            actual_price=current_price,
            actual_change_percent=round(actual_change_percent, 2),
            accuracy_score=round(accuracy_score, 3),
            was_direction_correct=was_direction_correct,
            price_difference_percent=round(price_diff, 2)
        )
        
    except Exception as e:
        logging.error(f"Error evaluating prediction accuracy: {e}")
        return BettyAccuracy(
            prediction_id=prediction.id,
            actual_price=prediction.current_price,
            actual_change_percent=0.0,
            accuracy_score=0.0,
            was_direction_correct=False,
            price_difference_percent=0.0
        )

# Helper function to check if cache is expired
def is_cache_expired(last_updated):
    if last_updated is None:
        return True
    return datetime.now(timezone.utc) - last_updated > timedelta(minutes=CACHE_EXPIRY_MINUTES)

# Authentication Endpoints
@api_router.post("/auth/session")
async def create_session(session_data: dict, response: Response):
    """Create user session from Emergent OAuth"""
    try:
        # Extract user data
        user_id = session_data.get("id")
        email = session_data.get("email")
        name = session_data.get("name")
        picture = session_data.get("picture")
        session_token = session_data.get("session_token")
        
        if not all([user_id, email, name, session_token]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Check if user exists, if not create
        existing_user = await db.users.find_one({"_id": user_id})
        if not existing_user:
            user_doc = {
                "_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(user_doc)
        
        # Create session
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        }
        await db.user_sessions.insert_one(session_doc)
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            max_age=7*24*60*60,  # 7 days
            httponly=True,
            secure=True,
            samesite="none",
            path="/"
        )
        
        return {"message": "Session created successfully"}
        
    except Exception as e:
        logging.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@api_router.get("/auth/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current user info"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_from_cookie(request)
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# Market Data Endpoints (same as before but with authentication for some)
@api_router.get("/")
async def root():
    return {"message": "Betty Crystal Financial Dashboard API", "version": "2.0.0"}

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
    """Get specific cryptocurrencies (BTC, ETH, BNB, SOL, XRP, DOT, ADA, DOGE)"""
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

# Betty Crystal Endpoints
@api_router.get("/betty/current-week")
async def get_betty_current_week():
    """Get Betty's predictions for current week (public - last week's accuracy)"""
    try:
        current_monday = await get_monday_of_week()
        last_monday = current_monday - timedelta(days=7)
        
        # Get last week's report for public display
        last_report = await db.betty_reports.find_one(
            {"week_start": last_monday},
            sort=[("created_at", -1)]
        )
        
        # Get current week's report (for checking if exists)
        current_report = await db.betty_reports.find_one(
            {"week_start": current_monday}
        )
        
        return {
            "current_week_start": current_monday.isoformat(),
            "has_current_predictions": current_report is not None,
            "last_week_report": last_report,
            "betty_status": "Ready for new predictions!" if not current_report else "This week's predictions available"
        }
        
    except Exception as e:
        logging.error(f"Error getting Betty's current week: {e}")
        raise HTTPException(status_code=500, detail="Failed to get Betty's status")

@api_router.get("/betty/predictions", dependencies=[Depends(require_auth)])
async def get_betty_predictions(user: User = Depends(require_auth)):
    """Get Betty's predictions for this week (requires authentication)"""
    try:
        current_monday = await get_monday_of_week()
        
        # Check if predictions exist for this week
        existing_report = await db.betty_reports.find_one({"week_start": current_monday})
        
        if existing_report:
            return existing_report
        
        # Generate new predictions
        predictions = await betty_generate_predictions()
        if not predictions:
            raise HTTPException(status_code=500, detail="Failed to generate predictions")
        
        # Save predictions to database
        prediction_docs = [pred.dict() for pred in predictions]
        await db.betty_predictions.insert_many(prediction_docs)
        
        # Create weekly report
        report = BettyWeeklyReport(
            week_start=current_monday,
            predictions=predictions
        )
        
        await db.betty_reports.insert_one(report.dict())
        
        return report
        
    except Exception as e:
        logging.error(f"Error getting Betty's predictions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get predictions")

@api_router.post("/betty/evaluate", dependencies=[Depends(require_auth)])
async def evaluate_betty_accuracy():
    """Evaluate Betty's accuracy for completed weeks (admin function)"""
    try:
        # Get last week's predictions that haven't been evaluated
        last_monday = await get_monday_of_week() - timedelta(days=7)
        
        report = await db.betty_reports.find_one({"week_start": last_monday})
        if not report or report.get("accuracy_scores"):
            return {"message": "No predictions to evaluate or already evaluated"}
        
        # Evaluate each prediction
        accuracy_scores = []
        predictions = [BettyPrediction(**pred) for pred in report["predictions"]]
        
        for prediction in predictions:
            accuracy = await betty_evaluate_accuracy(prediction)
            accuracy_scores.append(accuracy)
            
            # Save accuracy to database
            await db.betty_accuracy.insert_one(accuracy.dict())
        
        # Calculate overall accuracy
        overall_accuracy = sum(acc.accuracy_score for acc in accuracy_scores) / len(accuracy_scores)
        
        # Update report with accuracy scores
        await db.betty_reports.update_one(
            {"week_start": last_monday},
            {"$set": {
                "accuracy_scores": [acc.dict() for acc in accuracy_scores],
                "overall_accuracy": overall_accuracy
            }}
        )
        
        return {
            "message": "Accuracy evaluated successfully",
            "overall_accuracy": overall_accuracy,
            "individual_scores": accuracy_scores
        }
        
    except Exception as e:
        logging.error(f"Error evaluating accuracy: {e}")
        raise HTTPException(status_code=500, detail="Failed to evaluate accuracy")

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
