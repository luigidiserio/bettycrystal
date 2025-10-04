import requests
import sys
import json
from datetime import datetime
import time

class FinancialDashboardTester:
    def __init__(self, base_url="https://forex-crypto-metals.preview.emergentagent.com"):
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

    def test_historical_data(self, symbol="BTC", asset_type="crypto"):
        """Test historical data endpoint"""
        try:
            response = requests.get(f"{self.api_url}/historical/{symbol}?asset_type={asset_type}", timeout=20)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if "symbol" in data and "data" in data:
                    historical_data = data["data"]
                    if isinstance(historical_data, list) and len(historical_data) > 0:
                        # Check data structure
                        first_item = historical_data[0]
                        has_required_fields = "timestamp" in first_item and "price" in first_item
                        
                        if has_required_fields:
                            details = f"Found {len(historical_data)} historical data points for {symbol}"
                        else:
                            success = False
                            details = "Historical data missing required fields (timestamp, price)"
                    else:
                        success = False
                        details = "No historical data returned"
                else:
                    success = False
                    details = "Invalid response format"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test(f"Historical Data ({symbol})", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test(f"Historical Data ({symbol})", False, f"Error: {str(e)}")
            return False

    def test_ai_prediction(self, symbol="BTC", asset_type="crypto"):
        """Test AI prediction endpoint"""
        try:
            print(f"Testing AI prediction for {symbol} (this may take 10-15 seconds)...")
            response = requests.get(f"{self.api_url}/predict/{symbol}?asset_type={asset_type}", timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["asset", "current_price", "predictions", "analysis"]
                has_required_fields = all(field in data for field in required_fields)
                
                if has_required_fields:
                    predictions = data["predictions"]
                    required_timeframes = ["1_week", "1_month", "1_year"]
                    has_timeframes = all(tf in predictions for tf in required_timeframes)
                    
                    if has_timeframes:
                        # Check prediction structure
                        week_pred = predictions["1_week"]
                        has_pred_fields = "price" in week_pred and "confidence" in week_pred
                        
                        if has_pred_fields:
                            details = f"AI prediction generated for {symbol} with all timeframes and analysis"
                        else:
                            success = False
                            details = "Prediction missing price or confidence fields"
                    else:
                        success = False
                        details = "Missing required prediction timeframes"
                else:
                    success = False
                    details = "Response missing required fields"
            else:
                details = f"Status code: {response.status_code}"
                
            self.log_test(f"AI Prediction ({symbol})", success, details, response.text if not success else None)
            return success
            
        except Exception as e:
            self.log_test(f"AI Prediction ({symbol})", False, f"Error: {str(e)}")
            return False

    def run_comprehensive_test(self):
        """Run all backend tests"""
        print("🚀 Starting Financial Dashboard Backend Tests")
        print("=" * 60)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test all data endpoints
        currencies_success, currencies_data = self.test_currencies_endpoint()
        crypto_success, crypto_data = self.test_crypto_endpoint()
        metals_success, metals_data = self.test_metals_endpoint()
        
        # Test historical data for different asset types
        historical_crypto_success = self.test_historical_data("BTC", "crypto")
        historical_currency_success = self.test_historical_data("CADUSD=X", "currency")
        historical_metals_success = self.test_historical_data("GC=F", "metals")
        
        # Test AI predictions (these take longer)
        ai_crypto_success = self.test_ai_prediction("BTC", "crypto")
        ai_currency_success = self.test_ai_prediction("CADUSD=X", "currency")
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Identify critical failures
        critical_failures = []
        if not currencies_success:
            critical_failures.append("Currencies endpoint failed")
        if not crypto_success:
            critical_failures.append("Crypto endpoint failed")
        if not metals_success:
            critical_failures.append("Metals endpoint failed")
        if not ai_crypto_success and not ai_currency_success:
            critical_failures.append("AI prediction system completely failed")
            
        if critical_failures:
            print("\n🚨 Critical Issues Found:")
            for failure in critical_failures:
                print(f"   - {failure}")
        
        return len(critical_failures) == 0

def main():
    tester = FinancialDashboardTester()
    success = tester.run_comprehensive_test()
    
    # Save detailed results
    with open("/app/backend_test_results.json", "w") as f:
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