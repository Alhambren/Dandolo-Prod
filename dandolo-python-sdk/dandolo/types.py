"""
Dandolo SDK Types

Type definitions for API responses and data structures.
"""

from typing import List, Optional, Dict, Any, Union
from dataclasses import dataclass
import time


@dataclass
class Usage:
    """Token usage information."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class ChatMessage:
    """Chat message object."""
    role: str  # "system", "user", "assistant"
    content: str
    name: Optional[str] = None


@dataclass
class Choice:
    """Choice object in chat completion response."""
    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None


@dataclass
class ChatCompletion:
    """Chat completion response object."""
    id: str
    object: str = "chat.completion"
    created: int = None
    model: str = "auto-select"
    choices: List[Choice] = None
    usage: Optional[Usage] = None
    
    def __post_init__(self):
        if self.created is None:
            self.created = int(time.time())
        if self.choices is None:
            self.choices = []


@dataclass
class Model:
    """Model information object."""
    id: str
    object: str = "model"
    created: int = None
    owned_by: str = "dandolo"
    type: Optional[str] = None
    context_length: Optional[int] = None
    
    def __post_init__(self):
        if self.created is None:
            self.created = int(time.time())


@dataclass
class KeyValidation:
    """API key validation response."""
    is_valid: bool
    key_type: Optional[str] = None
    daily_usage: Optional[int] = None
    daily_limit: Optional[int] = None
    remaining: Optional[int] = None


@dataclass
class ErrorResponse:
    """API error response."""
    error: Dict[str, Any]
    
    @property
    def message(self) -> str:
        return self.error.get("message", "Unknown error")
    
    @property
    def code(self) -> str:
        return self.error.get("code", "unknown_error")
    
    @property
    def type(self) -> str:
        return self.error.get("type", "api_error")