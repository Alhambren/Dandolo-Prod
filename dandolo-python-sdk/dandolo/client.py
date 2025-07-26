"""
Dandolo AI Client

Main client class for interacting with the Dandolo API.
Provides OpenAI-compatible interface with enhanced error handling.
"""

import requests
import time
from typing import List, Dict, Any, Optional, Union, Iterator
from .exceptions import (
    DandoloError,
    AuthenticationError,
    RateLimitError,
    ModelNotFoundError,
    ValidationError
)
from .types import ChatCompletion, ChatMessage, Model


class ChatCompletions:
    """Chat completions endpoint handler."""
    
    def __init__(self, client):
        self.client = client
    
    def create(
        self,
        messages: List[Dict[str, str]],
        model: str = "auto-select",
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stream: bool = False,
        **kwargs
    ) -> ChatCompletion:
        """
        Create a chat completion.
        
        Args:
            messages: List of message objects with 'role' and 'content'
            model: Model to use ("auto-select" for intelligent routing)
            max_tokens: Maximum tokens to generate
            temperature: Randomness (0.0 to 2.0)
            stream: Whether to stream the response
            **kwargs: Additional parameters
            
        Returns:
            ChatCompletion object with response
            
        Raises:
            AuthenticationError: Invalid API key
            RateLimitError: Rate limit exceeded
            ModelNotFoundError: Model not available
            ValidationError: Invalid request parameters
            DandoloError: Other API errors
        """
        data = {
            "model": model,
            "messages": messages,
            "stream": stream
        }
        
        if max_tokens is not None:
            data["max_tokens"] = max_tokens
        if temperature is not None:
            data["temperature"] = temperature
            
        data.update(kwargs)
        
        return self.client._request("POST", "/v1/chat/completions", data)


class Chat:
    """Chat namespace for chat-related endpoints."""
    
    def __init__(self, client):
        self.completions = ChatCompletions(client)


class Models:
    """Models endpoint handler."""
    
    def __init__(self, client):
        self.client = client
    
    def list(self) -> List[Model]:
        """
        List all available models.
        
        Returns:
            List of Model objects
        """
        response = self.client._request("GET", "/v1/models")
        return [Model(**model) for model in response.get("data", [])]


class Dandolo:
    """
    Main Dandolo client.
    
    Provides OpenAI-compatible interface for the Dandolo decentralized AI network.
    
    Example:
        client = Dandolo(api_key="ak_your_agent_key")
        
        # Simple chat completion
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": "Hello!"}]
        )
        
        # Code generation with specific model
        response = client.chat.completions.create(
            model="auto-select",
            messages=[
                {"role": "system", "content": "You are a coding assistant."},
                {"role": "user", "content": "Write a Python function to sort a list"}
            ],
            max_tokens=500
        )
        
        # List available models
        models = client.models.list()
        print(f"Available models: {len(models)}")
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.dandolo.ai",
        timeout: int = 60,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize Dandolo client.
        
        Args:
            api_key: Your Dandolo API key (dk_ or ak_ prefix)
            base_url: Base URL for the Dandolo API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
            retry_delay: Delay between retries in seconds
        """
        if not api_key:
            raise ValueError("API key is required")
        
        if not (api_key.startswith("dk_") or api_key.startswith("ak_")):
            raise ValueError("API key must start with 'dk_' (developer) or 'ak_' (agent)")
        
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        # Initialize endpoint handlers
        self.chat = Chat(self)
        self.models = Models(self)
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"dandolo-python-sdk/1.0.0"
        })
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        Make an HTTP request with automatic retries and error handling.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            data: Request data (for POST requests)
            
        Returns:
            Parsed JSON response
            
        Raises:
            Various DandoloError subclasses based on response
        """
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(self.max_retries + 1):
            try:
                if method.upper() == "GET":
                    response = self.session.get(url, timeout=self.timeout)
                elif method.upper() == "POST":
                    response = self.session.post(url, json=data, timeout=self.timeout)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                # Handle different status codes
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 401:
                    raise AuthenticationError("Invalid API key")
                elif response.status_code == 429:
                    error_data = response.json() if response.content else {}
                    raise RateLimitError(
                        error_data.get("error", {}).get("message", "Rate limit exceeded"),
                        retry_after=response.headers.get("Retry-After")
                    )
                elif response.status_code == 404:
                    if "model" in endpoint:
                        raise ModelNotFoundError("Specified model not found")
                    else:
                        raise DandoloError(f"Endpoint not found: {endpoint}")
                elif response.status_code == 400:
                    error_data = response.json() if response.content else {}
                    raise ValidationError(
                        error_data.get("error", {}).get("message", "Invalid request")
                    )
                elif response.status_code >= 500:
                    if attempt < self.max_retries:
                        time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                        continue
                    raise DandoloError(f"Server error: {response.status_code}")
                else:
                    error_data = response.json() if response.content else {}
                    raise DandoloError(
                        error_data.get("error", {}).get("message", f"Unknown error: {response.status_code}")
                    )
                    
            except requests.exceptions.Timeout:
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise DandoloError("Request timeout")
            except requests.exceptions.ConnectionError:
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise DandoloError("Connection error")
        
        raise DandoloError("Max retries exceeded")
    
    def validate_key(self) -> Dict[str, Any]:
        """
        Validate the API key and get usage information.
        
        Returns:
            Dictionary with key information:
            - is_valid: Whether the key is valid
            - key_type: "developer" or "agent"
            - daily_usage: Current daily usage
            - daily_limit: Daily usage limit
            - remaining: Remaining requests today
        """
        try:
            # Try a simple request to validate
            response = self._request("GET", "/v1/models")
            
            # If successful, return mock validation data
            # In a real implementation, this would come from a dedicated endpoint
            key_type = "agent" if self.api_key.startswith("ak_") else "developer"
            daily_limit = 5000 if key_type == "agent" else 500
            
            return {
                "is_valid": True,
                "key_type": key_type,
                "daily_usage": 0,  # Would be fetched from actual usage endpoint
                "daily_limit": daily_limit,
                "remaining": daily_limit
            }
        except DandoloError:
            return {
                "is_valid": False,
                "key_type": None,
                "daily_usage": None,
                "daily_limit": None,
                "remaining": None
            }
    
    def get_usage(self) -> Dict[str, Any]:
        """
        Get current usage statistics.
        
        Returns:
            Dictionary with usage information
        """
        # This would be a real endpoint in production
        return self.validate_key()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()