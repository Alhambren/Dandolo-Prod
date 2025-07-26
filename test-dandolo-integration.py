#!/usr/bin/env python3
"""
Dandolo API Integration Test Suite
Complete testing script for AI agents integrating with Dandolo

Usage:
    python test-dandolo-integration.py
    python test-dandolo-integration.py --api-key dk_your_key --advanced
"""

import requests
import time
import json
import sys
import argparse
import statistics
from typing import Dict, List, Optional, Any

class DandoloTester:
    def __init__(self, api_key: str, base_url: str = "https://judicious-hornet-148.convex.cloud"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
        
    def print_status(self, message: str, status: str = "info"):
        icons = {"info": "ℹ️", "success": "✅", "error": "❌", "warning": "⚠️"}
        print(f"{icons.get(status, 'ℹ️')} {message}")
    
    def test_connection(self) -> bool:
        """Test basic API connectivity"""
        self.print_status("Testing API connection...")
        
        try:
            response = self.session.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": "auto-select",
                    "messages": [{"role": "user", "content": "Say 'Connection successful!'"}],
                    "max_tokens": 20
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                self.print_status(f"Connection test passed: {content}", "success")
                return True
            else:
                self.print_status(f"Connection failed: {response.status_code} - {response.text}", "error")
                return False
                
        except Exception as e:
            self.print_status(f"Connection error: {e}", "error")
            return False
    
    def check_balance(self) -> Dict[str, Any]:
        """Check API key usage and limits"""
        self.print_status("Checking API balance...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/v1/balance")
            
            if response.status_code == 200:
                balance = response.json()['balance']
                usage_pct = (balance['used'] / balance['limit']) * 100
                
                self.print_status(
                    f"Usage: {balance['used']}/{balance['limit']} ({usage_pct:.1f}%) - "
                    f"{balance['remaining']} remaining", 
                    "success" if usage_pct < 80 else "warning"
                )
                return balance
            else:
                self.print_status(f"Balance check failed: {response.status_code}", "warning")
                return {}
                
        except Exception as e:
            self.print_status(f"Balance check error: {e}", "warning")
            return {}
    
    def list_models(self) -> List[str]:
        """Get available models"""
        self.print_status("Fetching available models...")
        
        try:
            response = self.session.get(f"{self.base_url}/v1/models")
            
            if response.status_code == 200:
                models = response.json()['data']
                model_names = [model['id'] for model in models]
                self.print_status(f"Found {len(model_names)} models: {', '.join(model_names[:5])}{'...' if len(model_names) > 5 else ''}", "success")
                return model_names
            else:
                self.print_status(f"Models fetch failed: {response.status_code}", "warning")
                return []
                
        except Exception as e:
            self.print_status(f"Models fetch error: {e}", "warning")
            return []
    
    def test_chat_completion(self, model: str = "auto-select") -> bool:
        """Test chat completion with specified model"""
        self.print_status(f"Testing chat completion with {model}...")
        
        test_messages = [
            {"role": "system", "content": "You are a helpful assistant. Be concise."},
            {"role": "user", "content": "What is 2+2? Answer in one sentence."}
        ]
        
        try:
            start_time = time.time()
            response = self.session.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": test_messages,
                    "max_tokens": 50,
                    "temperature": 0.7
                }
            )
            end_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                tokens = data.get('usage', {}).get('total_tokens', 'unknown')
                
                self.print_status(
                    f"Chat test passed ({end_time - start_time:.2f}s, {tokens} tokens): {content[:100]}{'...' if len(content) > 100 else ''}",
                    "success"
                )
                return True
            else:
                self.print_status(f"Chat test failed: {response.status_code} - {response.text}", "error")
                return False
                
        except Exception as e:
            self.print_status(f"Chat test error: {e}", "error")
            return False
    
    def test_image_generation(self) -> bool:
        """Test image generation endpoint"""
        self.print_status("Testing image generation...")
        
        try:
            response = self.session.post(
                f"{self.base_url}/v1/images/generations",
                json={
                    "model": "flux-schnell",
                    "prompt": "A simple test image of a red apple",
                    "width": 512,
                    "height": 512,
                    "steps": 4
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'data' in data and len(data['data']) > 0:
                    self.print_status("Image generation test passed", "success")
                    return True
                else:
                    self.print_status("Image generation returned no data", "warning")
                    return False
            else:
                self.print_status(f"Image generation failed: {response.status_code}", "warning")
                return False
                
        except Exception as e:
            self.print_status(f"Image generation error: {e}", "warning")
            return False
    
    def test_embeddings(self) -> bool:
        """Test text embeddings endpoint"""
        self.print_status("Testing embeddings...")
        
        try:
            response = self.session.post(
                f"{self.base_url}/v1/embeddings",
                json={
                    "model": "text-embedding-ada-002",
                    "input": "This is a test sentence for embeddings."
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'data' in data and len(data['data']) > 0:
                    embedding_length = len(data['data'][0]['embedding'])
                    self.print_status(f"Embeddings test passed (vector length: {embedding_length})", "success")
                    return True
                else:
                    self.print_status("Embeddings returned no data", "warning")
                    return False
            else:
                self.print_status(f"Embeddings failed: {response.status_code}", "warning")
                return False
                
        except Exception as e:
            self.print_status(f"Embeddings error: {e}", "warning")
            return False
    
    def performance_test(self, num_requests: int = 5) -> Dict[str, float]:
        """Run performance test with multiple requests"""
        self.print_status(f"Running performance test ({num_requests} requests)...")
        
        times = []
        successful = 0
        
        for i in range(num_requests):
            try:
                start = time.time()
                response = self.session.post(
                    f"{self.base_url}/v1/chat/completions",
                    json={
                        "model": "auto-select",
                        "messages": [{"role": "user", "content": f"Count from 1 to {i+1}"}],
                        "max_tokens": 30
                    }
                )
                end = time.time()
                
                if response.status_code == 200:
                    times.append(end - start)
                    successful += 1
                    print(f"  Request {i+1}: {times[-1]:.2f}s ✅")
                else:
                    print(f"  Request {i+1}: FAILED ({response.status_code}) ❌")
                    
            except Exception as e:
                print(f"  Request {i+1}: ERROR ({e}) ❌")
        
        if times:
            stats = {
                'average': statistics.mean(times),
                'median': statistics.median(times),
                'min': min(times),
                'max': max(times),
                'success_rate': successful / num_requests
            }
            
            self.print_status("Performance Results:", "info")
            print(f"   Success Rate: {stats['success_rate']:.1%}")
            print(f"   Average: {stats['average']:.2f}s")
            print(f"   Median: {stats['median']:.2f}s")
            print(f"   Range: {stats['min']:.2f}s - {stats['max']:.2f}s")
            
            return stats
        else:
            self.print_status("No successful requests in performance test", "error")
            return {}
    
    def test_error_handling(self) -> bool:
        """Test error scenarios and responses"""
        self.print_status("Testing error handling...")
        
        # Test invalid model
        try:
            response = self.session.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "model": "invalid-model-name",
                    "messages": [{"role": "user", "content": "test"}]
                }
            )
            
            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                self.print_status(f"Error handling test passed: {response.status_code} - {error_data.get('error', 'No error message')}", "success")
                return True
            else:
                self.print_status("Error handling test failed: should have returned error for invalid model", "warning")
                return False
                
        except Exception as e:
            self.print_status(f"Error handling test failed: {e}", "error")
            return False
    
    def run_comprehensive_test(self, include_advanced: bool = False) -> Dict[str, bool]:
        """Run complete test suite"""
        self.print_status("🚀 Starting Dandolo API Integration Test Suite", "info")
        print("=" * 60)
        
        results = {}
        
        # Basic tests
        results['connection'] = self.test_connection()
        results['balance'] = bool(self.check_balance())
        results['models'] = bool(self.list_models())
        results['chat'] = self.test_chat_completion()
        results['error_handling'] = self.test_error_handling()
        
        # Advanced tests
        if include_advanced:
            print("\n" + "=" * 60)
            self.print_status("Running advanced tests...", "info")
            results['image_generation'] = self.test_image_generation()
            results['embeddings'] = self.test_embeddings()
            results['performance'] = bool(self.performance_test())
        
        # Summary
        print("\n" + "=" * 60)
        self.print_status("Test Summary:", "info")
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, passed_test in results.items():
            status = "success" if passed_test else "error"
            self.print_status(f"{test_name.replace('_', ' ').title()}: {'PASS' if passed_test else 'FAIL'}", status)
        
        print(f"\n🎯 Overall: {passed}/{total} tests passed ({passed/total:.1%})")
        
        if passed == total:
            self.print_status("🎉 All tests passed! Your integration is ready.", "success")
        elif passed >= total * 0.8:
            self.print_status("⚠️  Most tests passed. Check failed tests above.", "warning")
        else:
            self.print_status("❌ Multiple tests failed. Check your API key and connection.", "error")
        
        return results

def validate_api_key(api_key: str) -> bool:
    """Validate API key format"""
    if not api_key:
        return False
    
    # Check for proper prefix
    valid_prefixes = ['dk_', 'ak_']
    has_valid_prefix = any(api_key.startswith(prefix) for prefix in valid_prefixes)
    
    # Check minimum length
    min_length = 20
    
    return has_valid_prefix and len(api_key) >= min_length

def main():
    parser = argparse.ArgumentParser(description='Test Dandolo API integration')
    parser.add_argument('--api-key', '-k', help='Your Dandolo API key (dk_ or ak_)')
    parser.add_argument('--advanced', '-a', action='store_true', help='Run advanced tests (images, embeddings, performance)')
    parser.add_argument('--base-url', '-u', default='https://judicious-hornet-148.convex.cloud', help='Custom base URL')
    
    args = parser.parse_args()
    
    # Get API key
    api_key = args.api_key
    if not api_key:
        api_key = input("Enter your Dandolo API key (dk_ or ak_): ").strip()
    
    # Validate API key
    if not validate_api_key(api_key):
        print("❌ Invalid API key format. Expected format: dk_xxx or ak_xxx (minimum 20 characters)")
        sys.exit(1)
    
    # Run tests
    tester = DandoloTester(api_key, args.base_url)
    results = tester.run_comprehensive_test(args.advanced)
    
    # Exit with appropriate code
    if all(results.values()):
        print("\n✅ Ready for production integration!")
        sys.exit(0)
    else:
        print("\n❌ Integration issues detected. Check the failed tests above.")
        sys.exit(1)

if __name__ == "__main__":
    main()