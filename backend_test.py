import requests
import sys
import json
from datetime import datetime
import time

class BettyCrystalTester:
    def __init__(self, base_url="https://betty-crystal.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_api_health(self):
        """Test basic API health"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"API version: {data.get('version', 'unknown')}"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("API Health Check", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_currencies_endpoint(self):
        """Test currencies data endpoint"""
        try:
            response = requests.get(f"{self.api_url}/currencies", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check for Canadian Dollar specifically
                    cad_found = any("Canadian" in item.get("name", "") for item in data)
                    required_fields = ["symbol", "name", "price", "change_24h", "change_percent"]
                    
                    first_item = data[0]
                    has_required_fields = all(field in first_item for field in required_fields)
                    
                    if cad_found and has_required_fields:
                        details = f"Found {len(data)} currencies, CAD included, all required fields present"
                    else:
                        success = False
                        details = f"Missing CAD: {not cad_found}, Missing fields: {not has_required_fields}"
                else:
                    success = False
                    details = "Empty or invalid response format"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Currencies Endpoint", success, details, response.text if not success else None)
            return success, data if success else []
            
        except Exception as e:
            self.log_test("Currencies Endpoint", False, f"Error: {str(e)}")
            return False, []

    def test_crypto_endpoint(self):
        """Test crypto data endpoint"""
        try:
            response = requests.get(f"{self.api_url}/crypto", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list) and len(data) >= 7:
                    # Check for major cryptos
                    symbols = [item.get("symbol", "").upper() for item in data]
                    major_cryptos = ["BTC", "ETH"]
                    has_major_cryptos = all(crypto in symbols for crypto in major_cryptos)
                    
                    required_fields = ["symbol", "name", "price", "change_24h", "change_percent"]
                    first_item = data[0]
                    has_required_fields = all(field in first_item for field in required_fields)
                    
                    if has_major_cryptos and has_required_fields:
                        details = f"Found {len(data)} cryptos, major cryptos included, all required fields present"
                    else:
                        success = False
                        details = f"Missing major cryptos: {not has_major_cryptos}, Missing fields: {not has_required_fields}"
                else:
                    success = False
                    details = f"Expected at least 7 cryptos, got {len(data) if isinstance(data, list) else 'invalid format'}"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Crypto Endpoint", success, details, response.text if not success else None)
            return success, data if success else []
            
        except Exception as e:
            self.log_test("Crypto Endpoint", False, f"Error: {str(e)}")
            return False, []

    def test_metals_endpoint(self):
        """Test precious metals data endpoint"""
        try:
            response = requests.get(f"{self.api_url}/metals", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list) and len(data) >= 4:
                    # Check for required metals
                    names = [item.get("name", "").lower() for item in data]
                    required_metals = ["gold", "silver", "platinum", "palladium"]
                    has_required_metals = all(metal in " ".join(names) for metal in required_metals)
                    
                    required_fields = ["symbol", "name", "price", "change_24h", "change_percent"]
                    first_item = data[0]
                    has_required_fields = all(field in first_item for field in required_fields)
                    
                    if has_required_metals and has_required_fields:
                        details = f"Found {len(data)} metals, all required metals included, all required fields present"
                    else:
                        success = False
                        details = f"Missing metals: {not has_required_metals}, Missing fields: {not has_required_fields}"
                else:
                    success = False
                    details = f"Expected at least 4 metals, got {len(data) if isinstance(data, list) else 'invalid format'}"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Metals Endpoint", success, details, response.text if not success else None)
            return success, data if success else []
            
        except Exception as e:
            self.log_test("Metals Endpoint", False, f"Error: {str(e)}")
            return False, []

    def test_betty_current_week(self):
        """Test Betty's current week status endpoint (public)"""
        try:
            response = requests.get(f"{self.api_url}/betty/current-week", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["current_week_start", "has_current_predictions", "betty_status"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    details = f"Betty status: {data['betty_status']}, Has predictions: {data['has_current_predictions']}"
                else:
                    success = False
                    details = "Missing required fields in Betty status response"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Betty Current Week Status", success, details, response.text if not success else None)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Betty Current Week Status", False, f"Error: {str(e)}")
            return False, {}

    def test_betty_predictions_without_auth(self):
        """Test Betty's predictions endpoint without authentication (should fail)"""
        try:
            response = requests.get(f"{self.api_url}/betty/predictions", timeout=15)
            success = response.status_code == 401  # Should be unauthorized
            
            if success:
                details = "Correctly requires authentication (401 Unauthorized)"
            else:
                details = f"Unexpected status code: {response.status_code} (expected 401)"
                
            self.log_test("Betty Predictions Auth Protection", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Betty Predictions Auth Protection", False, f"Error: {str(e)}")
            return False

    def create_test_session(self):
        """Create a test user session for authenticated endpoints"""
        try:
            # First register a test user
            timestamp = int(datetime.now().timestamp())
            username = f"testuser{timestamp}"
            email = f"test.user.{timestamp}@example.com"
            password = "testpassword123"
            
            # Register user
            register_params = {
                "username": username,
                "email": email,
                "password": password
            }
            
            register_response = requests.post(f"{self.api_url}/auth/register", 
                                            params=register_params, timeout=10)
            
            if register_response.status_code != 200:
                self.log_test("Create Test Session", False, 
                            f"Failed to register user: {register_response.status_code}", 
                            register_response.text)
                return False, None
            
            # Now login to get session
            login_params = {
                "username": username,
                "password": password
            }
            
            login_response = requests.post(f"{self.api_url}/auth/login", 
                                         params=login_params, timeout=10)
            
            success = login_response.status_code == 200
            
            if success:
                # Extract session token from cookies
                session_token = None
                if 'Set-Cookie' in login_response.headers:
                    cookies = login_response.headers['Set-Cookie']
                    if 'session_token=' in cookies:
                        # Extract session token from cookie
                        start = cookies.find('session_token=') + len('session_token=')
                        end = cookies.find(';', start)
                        if end == -1:
                            end = len(cookies)
                        session_token = cookies[start:end]
                
                if session_token:
                    details = f"Test user registered and logged in: {username}"
                    self.test_session_token = session_token
                else:
                    success = False
                    details = "Login successful but no session token found"
                    self.test_session_token = None
            else:
                details = f"Failed to login: {login_response.status_code}"
                self.test_session_token = None
                
            self.log_test("Create Test Session", success, details, 
                         login_response.text if not success else None)
            return success, session_token if success else None
            
        except Exception as e:
            self.log_test("Create Test Session", False, f"Error: {str(e)}")
            return False, None

    def test_betty_predictions_with_auth(self, session_token):
        """Test Betty's predictions endpoint with authentication"""
        try:
            headers = {"Authorization": f"Bearer {session_token}"}
            print("Testing Betty's AI prediction generation (this may take 15-30 seconds)...")
            response = requests.get(f"{self.api_url}/betty/predictions", headers=headers, timeout=45)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["week_start", "predictions", "betty_confidence"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    predictions = data["predictions"]
                    if isinstance(predictions, list) and len(predictions) == 3:
                        # Check prediction structure
                        first_pred = predictions[0]
                        pred_fields = ["asset_symbol", "asset_name", "direction", "predicted_change_percent", 
                                     "confidence_level", "reasoning", "predicted_target_price"]
                        has_pred_fields = all(field in first_pred for field in pred_fields)
                        
                        if has_pred_fields:
                            details = f"Betty generated {len(predictions)} predictions with full reasoning"
                        else:
                            success = False
                            details = "Predictions missing required fields"
                    else:
                        success = False
                        details = f"Expected 3 predictions, got {len(predictions) if isinstance(predictions, list) else 'invalid format'}"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Betty Predictions with Auth", success, details, response.text if not success else None)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Betty Predictions with Auth", False, f"Error: {str(e)}")
            return False, {}

    def test_auth_me_endpoint(self, session_token):
        """Test the auth/me endpoint"""
        try:
            headers = {"Authorization": f"Bearer {session_token}"}
            response = requests.get(f"{self.api_url}/auth/me", headers=headers, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Check for either "id" or "_id" field (MongoDB uses _id)
                has_id = "id" in data or "_id" in data
                required_fields = ["email", "username"]
                has_required_fields = all(field in data for field in required_fields) and has_id
                
                if has_required_fields:
                    details = f"User authenticated: {data['username']} ({data['email']})"
                else:
                    success = False
                    details = "User data missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Auth Me Endpoint", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Auth Me Endpoint", False, f"Error: {str(e)}")
            return False

    def test_auth_me_without_token(self):
        """Test the auth/me endpoint without authentication (should return 401)"""
        try:
            response = requests.get(f"{self.api_url}/auth/me", timeout=10)
            success = response.status_code == 401  # Should be unauthorized
            
            if success:
                details = "Correctly requires authentication (401 Unauthorized)"
            else:
                details = f"Unexpected status code: {response.status_code} (expected 401)"
                
            self.log_test("Auth Me Without Token", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Auth Me Without Token", False, f"Error: {str(e)}")
            return False

    def test_historical_data_endpoint(self):
        """Test historical data endpoint for Bitcoin"""
        try:
            response = requests.get(f"{self.api_url}/historical/BTC?asset_type=crypto", timeout=20)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["symbol", "asset_type", "data", "period", "last_updated"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    historical_data = data["data"]
                    if isinstance(historical_data, list) and len(historical_data) > 0:
                        # Check data structure
                        first_point = historical_data[0]
                        data_fields = ["timestamp", "price"]
                        has_data_fields = all(field in first_point for field in data_fields)
                        
                        if has_data_fields and data["symbol"] == "BTC":
                            details = f"BTC historical data: {len(historical_data)} data points, period: {data['period']}"
                        else:
                            success = False
                            details = "Historical data points missing required fields or wrong symbol"
                    else:
                        success = False
                        details = "No historical data points returned"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Historical Data Endpoint (BTC)", success, details, response.text if not success else None)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Historical Data Endpoint (BTC)", False, f"Error: {str(e)}")
            return False, {}

    def test_prediction_endpoint(self):
        """Test prediction endpoint for Bitcoin"""
        try:
            print("Testing Bitcoin AI prediction generation (this may take 15-30 seconds)...")
            response = requests.get(f"{self.api_url}/predict/BTC?asset_type=crypto", timeout=45)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["symbol", "asset_type", "current_price", "prediction", "generated_at"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    prediction = data["prediction"]
                    pred_fields = ["analysis", "probability", "confidence", "timeframes"]
                    has_pred_fields = all(field in prediction for field in pred_fields)
                    
                    if has_pred_fields and data["symbol"] == "BTC":
                        details = f"BTC prediction generated: {prediction['confidence']} confidence, {prediction['probability']}% probability"
                    else:
                        success = False
                        details = "Prediction data missing required fields or wrong symbol"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Prediction Endpoint (BTC)", success, details, response.text if not success else None)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Prediction Endpoint (BTC)", False, f"Error: {str(e)}")
            return False, {}

    def test_betty_history_endpoint(self):
        """Test Betty's historical performance endpoint"""
        try:
            response = requests.get(f"{self.api_url}/betty/history", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["total_predictions", "total_correct", "overall_accuracy", "weekly_results"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    weekly_results = data["weekly_results"]
                    if isinstance(weekly_results, list) and len(weekly_results) > 0:
                        # Check weekly result structure
                        first_week = weekly_results[0]
                        week_fields = ["week_start", "predictions", "correct_count", "total_count", "week_accuracy"]
                        has_week_fields = all(field in first_week for field in week_fields)
                        
                        if has_week_fields:
                            details = f"Betty history: {data['overall_accuracy']}% accuracy, {data['total_predictions']} total predictions, {len(weekly_results)} weeks"
                        else:
                            success = False
                            details = "Weekly results missing required fields"
                    else:
                        success = False
                        details = "No weekly results returned"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Betty History Endpoint", success, details, response.text if not success else None)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Betty History Endpoint", False, f"Error: {str(e)}")
            return False, {}

    def test_payment_create_checkout_valid(self):
        """Test payment checkout creation with valid package_id"""
        try:
            payload = {
                "package_id": "premium_monthly",
                "origin_url": self.base_url
            }
            
            response = requests.post(f"{self.api_url}/payments/create-checkout", 
                                   json=payload, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["checkout_url", "session_id", "amount", "currency"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    # Verify expected values
                    if (data["amount"] == 9.99 and 
                        data["currency"] == "usd" and 
                        "stripe.com" in data["checkout_url"] and
                        len(data["session_id"]) > 10):
                        details = f"Checkout created: ${data['amount']} {data['currency']}, session: {data['session_id'][:20]}..."
                        self.test_session_id = data["session_id"]  # Store for status test
                    else:
                        success = False
                        details = "Invalid checkout data values"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Payment Create Checkout (Valid)", success, details, response.text if not success else None)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Payment Create Checkout (Valid)", False, f"Error: {str(e)}")
            return False, {}

    def test_payment_create_checkout_invalid_package(self):
        """Test payment checkout creation with invalid package_id"""
        try:
            payload = {
                "package_id": "invalid_package",
                "origin_url": self.base_url
            }
            
            response = requests.post(f"{self.api_url}/payments/create-checkout", 
                                   json=payload, timeout=15)
            success = response.status_code == 400  # Should be bad request
            
            if success:
                details = "Correctly rejected invalid package_id (400 Bad Request)"
            else:
                details = f"Unexpected status code: {response.status_code} (expected 400)"
                
            self.log_test("Payment Create Checkout (Invalid Package)", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Payment Create Checkout (Invalid Package)", False, f"Error: {str(e)}")
            return False

    def test_payment_create_checkout_missing_params(self):
        """Test payment checkout creation with missing parameters"""
        try:
            payload = {
                "package_id": "premium_monthly"
                # Missing origin_url
            }
            
            response = requests.post(f"{self.api_url}/payments/create-checkout", 
                                   json=payload, timeout=15)
            success = response.status_code in [400, 422]  # Should be bad request or validation error
            
            if success:
                details = f"Correctly rejected missing origin_url ({response.status_code})"
            else:
                details = f"Unexpected status code: {response.status_code} (expected 400 or 422)"
                
            self.log_test("Payment Create Checkout (Missing Params)", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Payment Create Checkout (Missing Params)", False, f"Error: {str(e)}")
            return False

    def test_payment_status_valid_session(self):
        """Test payment status check with valid session_id"""
        try:
            # Use session_id from previous test if available
            session_id = getattr(self, 'test_session_id', 'cs_test_invalid_session')
            
            response = requests.get(f"{self.api_url}/payments/status/{session_id}", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["session_id", "status", "payment_status"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    details = f"Payment status: {data['status']}, payment: {data['payment_status']}"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test("Payment Status Check (Valid Session)", success, details, response.text if not success else None)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Payment Status Check (Valid Session)", False, f"Error: {str(e)}")
            return False, {}

    def test_payment_status_invalid_session(self):
        """Test payment status check with invalid session_id"""
        try:
            invalid_session_id = "cs_test_invalid_session_12345"
            
            response = requests.get(f"{self.api_url}/payments/status/{invalid_session_id}", timeout=15)
            success = response.status_code == 404  # Should be not found
            
            if success:
                details = "Correctly returned 404 for invalid session_id"
            else:
                details = f"Unexpected status code: {response.status_code} (expected 404)"
                
            self.log_test("Payment Status Check (Invalid Session)", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Payment Status Check (Invalid Session)", False, f"Error: {str(e)}")
            return False

    def test_payment_webhook_endpoint(self):
        """Test Stripe webhook endpoint (basic connectivity)"""
        try:
            # Test webhook endpoint without signature (should fail gracefully)
            payload = {
                "id": "evt_test_webhook",
                "object": "event",
                "type": "checkout.session.completed"
            }
            
            response = requests.post(f"{self.api_url}/webhook/stripe", 
                                   json=payload, timeout=15)
            # Should return 400 due to missing signature, not 500 or connection error
            success = response.status_code == 400
            
            if success:
                details = "Webhook endpoint accessible, correctly requires Stripe signature (400)"
            else:
                details = f"Unexpected status code: {response.status_code} (expected 400 for missing signature)"
                
            self.log_test("Payment Webhook Endpoint", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Payment Webhook Endpoint", False, f"Error: {str(e)}")
            return False

    def test_payment_database_verification(self):
        """Test that payment transactions are being stored in database"""
        try:
            # This test checks if we can create a checkout and verify it creates a database record
            # We'll do this by creating a checkout and then checking the status
            payload = {
                "package_id": "premium_monthly",
                "origin_url": self.base_url
            }
            
            # Create checkout
            checkout_response = requests.post(f"{self.api_url}/payments/create-checkout", 
                                            json=payload, timeout=15)
            
            if checkout_response.status_code != 200:
                self.log_test("Payment Database Verification", False, 
                            f"Failed to create checkout for database test: {checkout_response.status_code}")
                return False
            
            checkout_data = checkout_response.json()
            session_id = checkout_data["session_id"]
            
            # Check status (this verifies database record exists)
            status_response = requests.get(f"{self.api_url}/payments/status/{session_id}", timeout=15)
            success = status_response.status_code == 200
            
            if success:
                status_data = status_response.json()
                if status_data.get("session_id") == session_id:
                    details = f"Database record verified for session: {session_id[:20]}..."
                else:
                    success = False
                    details = "Database record session_id mismatch"
            else:
                details = f"Failed to retrieve payment record: {status_response.status_code}"
                
            self.log_test("Payment Database Verification", success, details, 
                         status_response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Payment Database Verification", False, f"Error: {str(e)}")
            return False

    def test_payment_anonymous_user_support(self):
        """Test that payment system works for anonymous users (no authentication required)"""
        try:
            # Test without any authentication headers
            payload = {
                "package_id": "premium_monthly",
                "origin_url": self.base_url
            }
            
            response = requests.post(f"{self.api_url}/payments/create-checkout", 
                                   json=payload, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if "checkout_url" in data and "session_id" in data:
                    details = "Anonymous user can create checkout session successfully"
                else:
                    success = False
                    details = "Checkout created but missing required fields"
            else:
                details = f"Anonymous checkout failed: {response.status_code}"
                
            self.log_test("Payment Anonymous User Support", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test("Payment Anonymous User Support", False, f"Error: {str(e)}")
            return False

    def run_comprehensive_test(self):
        """Run all Betty Crystal backend tests"""
        print("🔮 Starting Betty Crystal Backend Tests")
        print("=" * 60)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test all market data endpoints (Betty needs these for predictions)
        currencies_success, currencies_data = self.test_currencies_endpoint()
        crypto_success, crypto_data = self.test_crypto_endpoint()
        metals_success, metals_data = self.test_metals_endpoint()
        
        # Test asset analysis endpoints
        historical_success, historical_data = self.test_historical_data_endpoint()
        prediction_success, prediction_data = self.test_prediction_endpoint()
        
        # Test Betty Crystal specific endpoints
        betty_status_success, betty_status_data = self.test_betty_current_week()
        betty_history_success, betty_history_data = self.test_betty_history_endpoint()
        betty_auth_protection_success = self.test_betty_predictions_without_auth()
        
        # Test authentication endpoints
        auth_me_no_token_success = self.test_auth_me_without_token()
        session_success, session_token = self.create_test_session()
        
        auth_me_success = False
        betty_predictions_success = False
        
        if session_success and session_token:
            auth_me_success = self.test_auth_me_endpoint(session_token)
            betty_predictions_success, predictions_data = self.test_betty_predictions_with_auth(session_token)
        
        # Test Emergent Stripe Payment Integration
        print("\n💳 Testing Emergent Stripe Payment Integration...")
        payment_create_valid_success, payment_data = self.test_payment_create_checkout_valid()
        payment_create_invalid_success = self.test_payment_create_checkout_invalid_package()
        payment_create_missing_success = self.test_payment_create_checkout_missing_params()
        payment_status_valid_success, status_data = self.test_payment_status_valid_session()
        payment_status_invalid_success = self.test_payment_status_invalid_session()
        payment_webhook_success = self.test_payment_webhook_endpoint()
        payment_database_success = self.test_payment_database_verification()
        payment_anonymous_success = self.test_payment_anonymous_user_support()
        
        # Print summary
        print("=" * 60)
        print(f"🔮 Betty Crystal Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Identify critical failures
        critical_failures = []
        if not currencies_success or not crypto_success or not metals_success:
            critical_failures.append("Market data endpoints failed (Betty needs these for predictions)")
        if not historical_success:
            critical_failures.append("Historical data endpoint failed (required for asset analysis)")
        if not prediction_success:
            critical_failures.append("Prediction endpoint failed (required for asset analysis)")
        if not betty_status_success:
            critical_failures.append("Betty's status endpoint failed")
        if not betty_history_success:
            critical_failures.append("Betty's history endpoint failed")
        if not betty_auth_protection_success:
            critical_failures.append("Betty's predictions not properly protected by authentication")
        if not auth_me_no_token_success:
            critical_failures.append("Auth/me endpoint not properly protected")
        if not session_success:
            critical_failures.append("Authentication system failed")
        if session_success and not betty_predictions_success:
            critical_failures.append("Betty's AI prediction generation failed")
        
        # Payment integration critical failures
        if not payment_create_valid_success:
            critical_failures.append("Payment checkout creation failed (core payment functionality)")
        if not payment_status_valid_success:
            critical_failures.append("Payment status check failed (payment tracking broken)")
        if not payment_database_success:
            critical_failures.append("Payment database integration failed (transactions not stored)")
        if not payment_anonymous_success:
            critical_failures.append("Anonymous payment support failed (blocks non-authenticated users)")
            
        if critical_failures:
            print("\n🚨 Critical Issues Found:")
            for failure in critical_failures:
                print(f"   - {failure}")
        else:
            print("\n✅ All Betty Crystal systems operational!")
        
        return len(critical_failures) == 0

def main():
    tester = BettyCrystalTester()
    success = tester.run_comprehensive_test()
    
    # Save detailed results
    with open("/app/betty_crystal_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
            "overall_success": success,
            "detailed_results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())