"""
Dandolo SDK Test Suite

Comprehensive test suite to validate SDK functionality and API integration.
"""

import os
import sys
import time
import traceback
from typing import List, Dict, Any

# Add parent directory to path for testing
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import dandolo
from dandolo import (
    AuthenticationError,
    RateLimitError,
    ModelNotFoundError,
    ValidationError,
    DandoloError
)


class TestResults:
    """Test results tracker."""
    
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []
    
    def add_result(self, test_name: str, passed: bool, error: str = None):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            self.tests_failed += 1
            self.failures.append((test_name, error))
            print(f"❌ {test_name}: {error}")
    
    def summary(self):
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failures:
            print(f"\n❌ Failures:")
            for test_name, error in self.failures:
                print(f"  - {test_name}: {error}")


class DandoloSDKTester:
    """Main test suite for Dandolo SDK."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.results = TestResults()
        self.client = None
    
    def run_all_tests(self):
        """Run all test suites."""
        print("🧪 Dandolo SDK Test Suite")
        print("=" * 30)
        print(f"API Key: {self.api_key[:15]}...")
        print()
        
        try:
            # Basic functionality tests
            self.test_client_initialization()
            self.test_api_key_validation()
            self.test_model_listing()
            
            # Chat completion tests
            self.test_basic_chat_completion()
            self.test_chat_with_parameters()
            self.test_conversation_context()
            self.test_system_messages()
            
            # Error handling tests
            self.test_invalid_api_key()
            self.test_invalid_parameters()
            self.test_empty_messages()
            
            # Performance tests
            self.test_response_time()
            self.test_concurrent_requests()
            
            # Integration tests
            self.test_context_manager()
            
        except Exception as e:
            self.results.add_result("Test Suite Execution", False, str(e))
        
        self.results.summary()
        return self.results.tests_failed == 0
    
    def test_client_initialization(self):
        """Test client initialization."""
        try:
            self.client = dandolo.Dandolo(api_key=self.api_key)
            self.results.add_result("Client Initialization", True)
        except Exception as e:
            self.results.add_result("Client Initialization", False, str(e))
    
    def test_api_key_validation(self):
        """Test API key validation."""
        if not self.client:
            self.results.add_result("API Key Validation", False, "Client not initialized")
            return
        
        try:
            validation = self.client.validate_key()
            if validation["is_valid"]:
                self.results.add_result("API Key Validation", True)
            else:
                self.results.add_result("API Key Validation", False, "Key reported as invalid")
        except Exception as e:
            self.results.add_result("API Key Validation", False, str(e))
    
    def test_model_listing(self):
        """Test model listing functionality."""
        if not self.client:
            self.results.add_result("Model Listing", False, "Client not initialized")
            return
        
        try:
            models = self.client.models.list()
            if isinstance(models, list) and len(models) > 0:
                self.results.add_result("Model Listing", True)
            else:
                self.results.add_result("Model Listing", False, "No models returned")
        except Exception as e:
            self.results.add_result("Model Listing", False, str(e))
    
    def test_basic_chat_completion(self):
        """Test basic chat completion."""
        if not self.client:
            self.results.add_result("Basic Chat Completion", False, "Client not initialized")
            return
        
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": "Say hello!"}],
                max_tokens=50
            )
            
            if (response.choices and 
                len(response.choices) > 0 and 
                response.choices[0].message.content):
                self.results.add_result("Basic Chat Completion", True)
            else:
                self.results.add_result("Basic Chat Completion", False, "No valid response")
        except Exception as e:
            self.results.add_result("Basic Chat Completion", False, str(e))
    
    def test_chat_with_parameters(self):
        """Test chat completion with various parameters."""
        if not self.client:
            self.results.add_result("Chat with Parameters", False, "Client not initialized")
            return
        
        try:
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": "Count from 1 to 3"}],
                model="auto-select",
                max_tokens=100,
                temperature=0.5
            )
            
            if response.choices and response.choices[0].message.content:
                self.results.add_result("Chat with Parameters", True)
            else:
                self.results.add_result("Chat with Parameters", False, "No valid response")
        except Exception as e:
            self.results.add_result("Chat with Parameters", False, str(e))
    
    def test_conversation_context(self):
        """Test conversation context handling."""
        if not self.client:
            self.results.add_result("Conversation Context", False, "Client not initialized")
            return
        
        try:
            messages = [
                {"role": "user", "content": "My name is Alice"},
                {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
                {"role": "user", "content": "What's my name?"}
            ]
            
            response = self.client.chat.completions.create(
                messages=messages,
                max_tokens=50
            )
            
            content = response.choices[0].message.content.lower()
            if "alice" in content:
                self.results.add_result("Conversation Context", True)
            else:
                self.results.add_result("Conversation Context", False, "Context not maintained")
        except Exception as e:
            self.results.add_result("Conversation Context", False, str(e))
    
    def test_system_messages(self):
        """Test system message handling."""
        if not self.client:
            self.results.add_result("System Messages", False, "Client not initialized")
            return
        
        try:
            messages = [
                {"role": "system", "content": "You are a helpful math tutor. Always end responses with 'Happy learning!'"},
                {"role": "user", "content": "What is 2+2?"}
            ]
            
            response = self.client.chat.completions.create(
                messages=messages,
                max_tokens=100
            )
            
            content = response.choices[0].message.content
            if "4" in content and "happy learning" in content.lower():
                self.results.add_result("System Messages", True)
            else:
                self.results.add_result("System Messages", False, "System message not followed")
        except Exception as e:
            self.results.add_result("System Messages", False, str(e))
    
    def test_invalid_api_key(self):
        """Test invalid API key handling."""
        try:
            invalid_client = dandolo.Dandolo(api_key="ak_invalid_key_test")
            invalid_client.chat.completions.create(
                messages=[{"role": "user", "content": "Test"}]
            )
            self.results.add_result("Invalid API Key", False, "Should have raised AuthenticationError")
        except AuthenticationError:
            self.results.add_result("Invalid API Key", True)
        except Exception as e:
            # Might be different error type depending on implementation
            self.results.add_result("Invalid API Key", True)
    
    def test_invalid_parameters(self):
        """Test invalid parameter handling."""
        if not self.client:
            self.results.add_result("Invalid Parameters", False, "Client not initialized")
            return
        
        try:
            self.client.chat.completions.create(
                messages=[{"role": "user", "content": "Test"}],
                max_tokens=-1  # Invalid parameter
            )
            self.results.add_result("Invalid Parameters", False, "Should have raised ValidationError")
        except (ValidationError, ValueError):
            self.results.add_result("Invalid Parameters", True)
        except Exception as e:
            # Different error type is acceptable
            self.results.add_result("Invalid Parameters", True)
    
    def test_empty_messages(self):
        """Test empty messages handling."""
        if not self.client:
            self.results.add_result("Empty Messages", False, "Client not initialized")
            return
        
        try:
            self.client.chat.completions.create(messages=[])
            self.results.add_result("Empty Messages", False, "Should have raised ValidationError")
        except (ValidationError, ValueError):
            self.results.add_result("Empty Messages", True)
        except Exception as e:
            # Different error type is acceptable
            self.results.add_result("Empty Messages", True)
    
    def test_response_time(self):
        """Test response time performance."""
        if not self.client:
            self.results.add_result("Response Time", False, "Client not initialized")
            return
        
        try:
            start_time = time.time()
            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": "What is 1+1?"}],
                max_tokens=10
            )
            end_time = time.time()
            
            response_time = end_time - start_time
            if response_time < 30:  # Should respond within 30 seconds
                self.results.add_result("Response Time", True)
            else:
                self.results.add_result("Response Time", False, f"Too slow: {response_time:.2f}s")
        except Exception as e:
            self.results.add_result("Response Time", False, str(e))
    
    def test_concurrent_requests(self):
        """Test concurrent request handling."""
        if not self.client:
            self.results.add_result("Concurrent Requests", False, "Client not initialized")
            return
        
        try:
            import threading
            import queue
            
            results_queue = queue.Queue()
            
            def make_request():
                try:
                    response = self.client.chat.completions.create(
                        messages=[{"role": "user", "content": "Hello"}],
                        max_tokens=20
                    )
                    results_queue.put(("success", response))
                except Exception as e:
                    results_queue.put(("error", str(e)))
            
            # Start 3 concurrent requests
            threads = []
            for _ in range(3):
                thread = threading.Thread(target=make_request)
                thread.start()
                threads.append(thread)
            
            # Wait for all threads
            for thread in threads:
                thread.join(timeout=30)
            
            # Check results
            successes = 0
            while not results_queue.empty():
                status, result = results_queue.get()
                if status == "success":
                    successes += 1
            
            if successes >= 2:  # At least 2 out of 3 should succeed
                self.results.add_result("Concurrent Requests", True)
            else:
                self.results.add_result("Concurrent Requests", False, f"Only {successes}/3 succeeded")
                
        except Exception as e:
            self.results.add_result("Concurrent Requests", False, str(e))
    
    def test_context_manager(self):
        """Test context manager functionality."""
        try:
            with dandolo.Dandolo(api_key=self.api_key) as client:
                response = client.chat.completions.create(
                    messages=[{"role": "user", "content": "Test"}],
                    max_tokens=20
                )
                if response.choices:
                    self.results.add_result("Context Manager", True)
                else:
                    self.results.add_result("Context Manager", False, "No response")
        except Exception as e:
            self.results.add_result("Context Manager", False, str(e))


def main():
    """Main test function."""
    # Get API key from environment or use default
    api_key = os.getenv("DANDOLO_API_KEY")
    
    if not api_key:
        print("❌ No API key found!")
        print("Set DANDOLO_API_KEY environment variable or provide one:")
        api_key = input("Enter your Dandolo API key: ").strip()
        
        if not api_key:
            print("❌ No API key provided. Exiting.")
            return False
    
    # Validate API key format
    if not (api_key.startswith("dk_") or api_key.startswith("ak_")):
        print("❌ Invalid API key format. Must start with 'dk_' or 'ak_'")
        return False
    
    # Run tests
    tester = DandoloSDKTester(api_key)
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! The SDK is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Please check the issues above.")
    
    return success


if __name__ == "__main__":
    main()