"""
Dandolo AI SDK - Seamless AI Agent Integration

A Python SDK for easy integration with the Dandolo decentralized AI network.
Provides access to uncensored AI models through a simple, OpenAI-compatible interface.

Example:
    import dandolo
    
    client = dandolo.Dandolo(api_key="ak_your_agent_key")
    response = client.chat.completions.create(
        model="auto-select",
        messages=[{"role": "user", "content": "Hello!"}]
    )
    print(response.choices[0].message.content)
"""

from .client import Dandolo
from .exceptions import (
    DandoloError,
    AuthenticationError,
    RateLimitError,
    ModelNotFoundError,
    ValidationError
)
from .types import (
    ChatCompletion,
    ChatMessage,
    Choice,
    Usage,
    Model
)

__version__ = "1.0.0"
__all__ = [
    "Dandolo",
    "DandoloError",
    "AuthenticationError", 
    "RateLimitError",
    "ModelNotFoundError",
    "ValidationError",
    "ChatCompletion",
    "ChatMessage",
    "Choice",
    "Usage",
    "Model"
]