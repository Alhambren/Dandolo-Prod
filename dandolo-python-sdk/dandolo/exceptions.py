"""
Dandolo SDK Exceptions

Custom exceptions for different types of API errors.
"""

from typing import Optional


class DandoloError(Exception):
    """Base exception for all Dandolo API errors."""
    
    def __init__(self, message: str, code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.code = code


class AuthenticationError(DandoloError):
    """Raised when API key is invalid or missing."""
    
    def __init__(self, message: str = "Invalid API key"):
        super().__init__(message, "authentication_error")


class RateLimitError(DandoloError):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[str] = None):
        super().__init__(message, "rate_limit_error")
        self.retry_after = retry_after


class ModelNotFoundError(DandoloError):
    """Raised when specified model is not available."""
    
    def __init__(self, message: str = "Model not found"):
        super().__init__(message, "model_not_found")


class ValidationError(DandoloError):
    """Raised when request parameters are invalid."""
    
    def __init__(self, message: str = "Invalid request parameters"):
        super().__init__(message, "validation_error")


class ServerError(DandoloError):
    """Raised when server encounters an error."""
    
    def __init__(self, message: str = "Server error"):
        super().__init__(message, "server_error")


class NetworkError(DandoloError):
    """Raised when network connection fails."""
    
    def __init__(self, message: str = "Network connection failed"):
        super().__init__(message, "network_error")