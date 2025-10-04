#!/usr/bin/env python3
"""
Quick deployment test script for Betty Crystal Dashboard
Run this in the upload environment to verify all features work
"""

import requests
import json
import os
from datetime import datetime

def test_backend_endpoints():
    """Test all critical backend endpoints"""
    
    # Get backend URL from environment or use default
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    if not backend_url.startswith('http'):
        backend_url = f"http://{backend_url}"
    
    print(f"🔧 Testing backend at: {backend_url}")
    print("=" * 50)
    
    tests = [
        {
            'name': 'Betty Current Week (Accuracy)',
            'url': f'{backend_url}/api/betty/current-week',
            'expected_fields': ['overall_accuracy', 'total_predictions'],
            'expected_accuracy': 83.3
        },
        {
            'name': 'Betty Historical Data',
            'url': f'{backend_url}/api/betty/history',
            'expected_fields': ['weekly_results', 'overall_accuracy'],
            'check_weekly': True
        },
        {
            'name': 'Crypto Market Data',
            'url': f'{backend_url}/api/crypto',
            'expected_count': 8,
            'expected_symbols': ['BTC', 'ETH', 'XRP', 'BNB']
        },
        {
            'name': 'Currencies Data',
            'url': f'{backend_url}/api/currencies',
            'expected_count': 7
        },
        {
            'name': 'Metals Data', 
            'url': f'{backend_url}/api/metals',
            'expected_count': 4
        },
        {
            'name': 'BTC Historical Analysis',
            'url': f'{backend_url}/api/historical/BTC?asset_type=crypto',
            'expected_fields': ['symbol', 'data', 'period']
        },
        {
            'name': 'BTC AI Prediction',
            'url': f'{backend_url}/api/predict/BTC?asset_type=crypto', 
            'expected_fields': ['symbol', 'prediction', 'current_price']
        }
    ]
    
    results = []
    
    for test in tests:
        print(f"Testing: {test['name']}")
        try:
            response = requests.get(test['url'], timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check expected fields
                if 'expected_fields' in test:
                    missing_fields = [f for f in test['expected_fields'] if f not in data]
                    if missing_fields:
                        print(f"  ❌ Missing fields: {missing_fields}")
                        results.append(False)
                        continue
                
                # Check accuracy specifically
                if 'expected_accuracy' in test:
                    actual_accuracy = data.get('overall_accuracy', 0)
                    if actual_accuracy == test['expected_accuracy']:
                        print(f"  ✅ Accuracy correct: {actual_accuracy}%")
                    else:
                        print(f"  ❌ Accuracy wrong: {actual_accuracy}% (expected {test['expected_accuracy']}%)")
                        results.append(False)
                        continue
                
                # Check weekly data
                if 'check_weekly' in test:
                    weekly_results = data.get('weekly_results', [])
                    if len(weekly_results) >= 2:
                        print(f"  ✅ Weekly data: {len(weekly_results)} weeks found")
                    else:
                        print(f"  ❌ Insufficient weekly data: {len(weekly_results)} weeks")
                        results.append(False)
                        continue
                
                # Check count
                if 'expected_count' in test:
                    actual_count = len(data) if isinstance(data, list) else 0
                    if actual_count >= test['expected_count']:
                        print(f"  ✅ Count OK: {actual_count} items")
                    else:
                        print(f"  ❌ Count low: {actual_count} items (expected {test['expected_count']})")
                        results.append(False)
                        continue
                
                # Check symbols
                if 'expected_symbols' in test and isinstance(data, list):
                    found_symbols = [item.get('symbol', '') for item in data]
                    missing_symbols = [s for s in test['expected_symbols'] if s not in found_symbols]
                    if not missing_symbols:
                        print(f"  ✅ Symbols found: {test['expected_symbols']}")
                    else:
                        print(f"  ❌ Missing symbols: {missing_symbols}")
                        results.append(False)
                        continue
                
                print(f"  ✅ {test['name']} - PASS")
                results.append(True)
                
            else:
                print(f"  ❌ HTTP {response.status_code}: {response.text[:100]}")
                results.append(False)
                
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            results.append(False)
        
        print()
    
    return results

def print_summary(results):
    """Print test summary"""
    passed = sum(results)
    total = len(results)
    percentage = (passed / total) * 100 if total > 0 else 0
    
    print("=" * 50)
    print(f"📊 TEST SUMMARY")
    print(f"Passed: {passed}/{total} ({percentage:.1f}%)")
    
    if percentage == 100:
        print("🎉 ALL TESTS PASSED! Deployment is ready.")
    elif percentage >= 80:
        print("⚠️  Most tests passed, but check failed ones above.")
    else:
        print("❌ Multiple tests failed. Deployment needs fixing.")
    
    print("\n📋 Key Features to Verify in Browser:")
    print("1. Betty's accuracy shows 83.3% (not 73%)")
    print("2. Crypto cards have 'Analyze' buttons") 
    print("3. Sign In/Sign Up forms work")
    print("4. Market data loads properly")
    print("5. Betty's historical section is clickable")

if __name__ == "__main__":
    print("🔮 Betty Crystal Dashboard - Deployment Test")
    print(f"Started at: {datetime.now()}")
    print()
    
    results = test_backend_endpoints()
    print_summary(results)