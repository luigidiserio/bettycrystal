# Betty Crystal Financial Dashboard

## Overview

A comprehensive financial dashboard featuring real-time market data and AI-powered predictions from Betty Crystal, your friendly trading mentor.

## Features

### 🔮 Betty Crystal AI Trading Bot
- **Weekly Predictions**: 3 carefully selected commodity predictions every Monday
- **Self-Improving Accuracy**: Betty learns from her mistakes and gets better over time
- **Friendly Personality**: Approachable trading mentor with crystal ball theme
- **Confidence Tracking**: Betty adjusts her risk level based on past performance

### 📊 Real-Time Market Data
- **Cryptocurrencies**: Top 7 crypto assets with live prices
- **Currencies**: Major currency pairs including Canadian Dollar (prominently featured)
- **Precious Metals**: Gold, Silver, Platinum, Palladium prices
- **Auto-Refresh**: Updates every 5 minutes

### 🔐 Authentication System
- **Google OAuth**: Secure login via Emergent authentication
- **Gated Content**: Free users see last week's results, premium users get current predictions
- **Session Management**: Secure 7-day sessions with httpOnly cookies

### 🎨 Modern UI/UX
- **Sleek Trader Interface**: Dark theme with cyan and purple accents
- **Responsive Design**: Works perfectly on desktop and mobile
- **Smooth Animations**: Floating crystal ball, sparkles, and transitions
- **Glassmorphism Effects**: Modern card designs with backdrop blur

## Architecture

### Backend (FastAPI + MongoDB)
```
/api/
├── auth/               # Authentication endpoints
│   ├── session        # Create session from OAuth
│   ├── me             # Get current user
│   └── logout         # End session
├── betty/             # Betty Crystal endpoints
│   ├── current-week   # Public: last week's performance
│   ├── predictions    # Protected: current week's predictions
│   └── evaluate       # Admin: accuracy evaluation
├── currencies         # Currency data
├── crypto            # Cryptocurrency data
└── metals            # Precious metals data
```

### Frontend (React + Tailwind CSS)
```
src/
├── App.js            # Main application component
├── App.css           # Custom styles and animations
└── components/ui/    # Shadcn UI components
```

## Data Models

### Betty Prediction
```typescript
interface BettyPrediction {
  id: string;
  week_start: datetime;
  asset_symbol: string;
  asset_name: string;
  asset_type: "crypto" | "currency" | "metal";
  current_price: number;
  direction: "up" | "down";
  predicted_change_percent: number;
  predicted_target_price: number;
  confidence_level: number; // 0.0 to 1.0
  reasoning: string;
}
```

### Betty Accuracy
```typescript
interface BettyAccuracy {
  prediction_id: string;
  actual_price: number;
  actual_change_percent: number;
  accuracy_score: number; // 0.0 to 1.0
  was_direction_correct: boolean;
  price_difference_percent: number;
}
```

## Betty Crystal's AI Learning System

### Prediction Generation
1. **Market Analysis**: Betty analyzes current prices and recent trends
2. **Track Record Review**: Considers her past accuracy to adjust confidence
3. **Risk Adjustment**: Makes easier predictions if accuracy is low, bolder if high
4. **AI Reasoning**: Uses GPT-4o to provide friendly, mentor-like explanations

### Accuracy Evaluation
- **Direction Score**: 50% weight for correct up/down prediction
- **Price Accuracy**: 50% weight based on how close the percentage was
- **Self-Improvement**: Betty uses accuracy data to refine future predictions

### Weekly Cycle
1. **Monday**: New predictions generated (if user authenticated)
2. **During Week**: Predictions locked, users can view analysis
3. **Next Monday**: Previous week evaluated, new cycle begins
4. **Continuous Learning**: Betty's confidence and approach evolve

## Authentication Flow

1. **Login**: Redirect to Emergent OAuth
2. **Callback**: Process session_id from URL fragment
3. **Session Creation**: Store user and session in MongoDB
4. **Cookie Management**: Set httpOnly cookie for 7 days
5. **Protected Routes**: Betty's predictions require valid session

## API Integrations

### Market Data Sources
- **CoinGecko API**: Cryptocurrency data (with yfinance fallback)
- **Yahoo Finance**: Currency pairs and precious metals
- **Caching**: 5-minute cache to reduce API calls

### AI Integration
- **Emergent LLM**: GPT-4o for Betty's predictions and reasoning
- **Fallback Handling**: Conservative predictions if AI fails
- **Context Awareness**: Betty considers her past performance

## Deployment

### Environment Variables
```bash
# Backend
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY="your_emergent_key"

# Frontend
REACT_APP_BACKEND_URL="https://your-app.com"
```

### Services
- **Backend**: FastAPI on port 8001
- **Frontend**: React on port 3000
- **Database**: MongoDB for users, sessions, and predictions

## Files Included

1. **index.html**: Standalone dashboard page (can be uploaded anywhere)
2. **betty_icon.svg**: Custom Betty Crystal icon with animations
3. **Enhanced React App**: Full-featured dashboard with authentication
4. **Backend API**: Complete FastAPI server with Betty's brain

## Future Enhancements

- **Payment Integration**: Premium subscriptions for advanced features
- **Email Notifications**: Weekly prediction summaries
- **Historical Charts**: Visual prediction accuracy over time
- **Portfolio Tracking**: Let users follow Betty's picks
- **Advanced Analytics**: Sector analysis and market sentiment

## Betty's Personality

Betty Crystal is designed to be:
- **Friendly & Approachable**: Not intimidating like typical trading bots
- **Honest**: Admits mistakes and learns from them publicly
- **Educational**: Explains reasoning behind predictions
- **Adaptive**: Gets more confident as accuracy improves
- **Mystical**: Crystal ball theme adds personality and fun

---

*Built with ❤️ using FastAPI, React, and Betty Crystal's AI magic* 🔮