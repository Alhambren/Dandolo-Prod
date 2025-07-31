# Security Best Practices & Deployment Guide

> **Enterprise-grade security for production AI applications**

Dandolo.ai is built with security-first principles. This guide ensures you deploy and operate your AI applications with maximum security and compliance.

## Table of Contents

- [Security Architecture Overview](#security-architecture-overview)
- [API Key Management](#api-key-management)
- [Data Privacy & Protection](#data-privacy--protection)
- [Network Security](#network-security)
- [Authentication & Authorization](#authentication--authorization)
- [Monitoring & Logging](#monitoring--logging)
- [Compliance & Auditing](#compliance--auditing)
- [Deployment Security](#deployment-security)
- [Incident Response](#incident-response)

---

## Security Architecture Overview

### Zero-Knowledge Architecture

Dandolo.ai is designed with zero-knowledge principles:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your Client   │    │   Dandolo.ai    │    │   Venice.ai     │
│                 │    │                 │    │    Network      │
│ • API Key only  │────│ • No data logs  │────│ • Process only  │
│ • Full context  │    │ • No storage    │    │ • No retention  │
│ • Your control  │    │ • Pass-through  │    │ • Stateless     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Key Security Features:**
- ✅ No conversation storage
- ✅ No user data retention
- ✅ End-to-end encryption
- ✅ Zero-knowledge processing
- ✅ Stateless architecture
- ✅ No request logging (optional telemetry only)

---

## API Key Management

### Key Types and Security Levels

| Key Type | Prefix | Security Level | Use Case |
|----------|--------|----------------|----------|
| **Agent Keys** | `ak_` | High | Production AI agents |
| **Developer Keys** | `dk_` | Medium | Development & testing |
| **Anonymous** | None | Basic | Public demos, trials |

### Secure Key Generation

```python
# ✅ Secure key generation process
import secrets
import hashlib
from cryptography.fernet import Fernet

class SecureKeyManager:
    def __init__(self, master_key: bytes):
        self.cipher = Fernet(master_key)
    
    def generate_api_key(self, key_type: str = "ak") -> dict:
        """Generate cryptographically secure API key."""
        
        # Generate random key material
        key_material = secrets.token_urlsafe(32)
        
        # Create key with prefix and checksum
        checksum = hashlib.sha256(key_material.encode()).hexdigest()[:8]
        api_key = f"{key_type}_{key_material}_{checksum}"
        
        # Store encrypted version
        encrypted_key = self.cipher.encrypt(api_key.encode())
        
        return {
            "api_key": api_key,
            "encrypted_storage": encrypted_key,
            "created_at": "2024-01-01T00:00:00Z",
            "permissions": self._get_default_permissions(key_type)
        }
    
    def _get_default_permissions(self, key_type: str) -> dict:
        permissions = {
            "ak": {
                "daily_limit": 5000,
                "rate_limit": 10,  # per second
                "advanced_features": True,
                "streaming": True,
                "agent_instructions": True
            },
            "dk": {
                "daily_limit": 1000,
                "rate_limit": 5,
                "advanced_features": False,
                "streaming": True,
                "agent_instructions": False
            }
        }
        return permissions.get(key_type, permissions["dk"])
```

### Key Storage Best Practices

#### ✅ Secure Storage Methods

```python
# Environment variables (recommended)
import os
from dandolo import Dandolo

client = Dandolo(api_key=os.getenv('DANDOLO_API_KEY'))
```

```typescript
// Environment variables in Node.js
const client = new Dandolo({
  apiKey: process.env.DANDOLO_API_KEY
});
```

```python
# Encrypted configuration files
import json
from cryptography.fernet import Fernet

class ConfigManager:
    def __init__(self, encryption_key: bytes):
        self.cipher = Fernet(encryption_key)
    
    def save_config(self, config: dict, file_path: str):
        """Save encrypted configuration."""
        encrypted_data = self.cipher.encrypt(json.dumps(config).encode())
        with open(file_path, 'wb') as f:
            f.write(encrypted_data)
    
    def load_config(self, file_path: str) -> dict:
        """Load and decrypt configuration."""
        with open(file_path, 'rb') as f:
            encrypted_data = f.read()
        decrypted_data = self.cipher.decrypt(encrypted_data)
        return json.loads(decrypted_data.decode())

# Usage
config_manager = ConfigManager(Fernet.generate_key())
config = config_manager.load_config('secure_config.enc')
client = Dandolo(api_key=config['dandolo_api_key'])
```

#### ❌ Insecure Storage (Never Do This)

```python
# ❌ Never hardcode API keys
client = Dandolo(api_key="ak_hardcoded_key_123")

# ❌ Never commit keys to version control
# .env file in git repository

# ❌ Never log API keys
print(f"Using API key: {api_key}")  # Logs expose key
```

### Key Rotation Strategy

```python
class KeyRotationManager:
    def __init__(self):
        self.active_keys = {}
        self.rotation_schedule = {}
    
    async def rotate_key(self, old_key: str, grace_period_hours: int = 24):
        """Rotate API key with grace period."""
        
        # Generate new key
        new_key = await self.generate_new_key()
        
        # Update applications gradually
        await self.update_applications(old_key, new_key)
        
        # Set grace period
        await self.set_grace_period(old_key, grace_period_hours)
        
        # Schedule old key deletion
        await self.schedule_key_deletion(old_key, grace_period_hours)
        
        return new_key
    
    async def emergency_key_revocation(self, compromised_key: str):
        """Immediately revoke compromised key."""
        await self.revoke_key_immediately(compromised_key)
        await self.alert_security_team(compromised_key)
        await self.generate_incident_report(compromised_key)
```

---

## Data Privacy & Protection

### Data Flow Security

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your Data     │    │   Dandolo.ai    │    │   AI Models     │
│                 │    │                 │    │                 │
│ • Stays in      │────│ • Zero storage  │────│ • Process only  │
│   your control  │TLS │ • Pass-through  │TLS │ • No retention  │
│ • Full context  │1.3 │ • Memory only   │1.3 │ • Stateless     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Response      │
                       │                 │
                       │ • Encrypted     │
                       │ • Direct to you │
                       │ • No logging    │
                       └─────────────────┘
```

### Sensitive Data Handling

```python
import re
from typing import List, Dict

class DataSanitizer:
    """Sanitize sensitive data before API calls."""
    
    SENSITIVE_PATTERNS = {
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
        'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        'api_key': r'\b[ak|dk]_[A-Za-z0-9_-]{20,}\b'
    }
    
    def sanitize_text(self, text: str, replacement: str = "[REDACTED]") -> str:
        """Remove or replace sensitive data."""
        sanitized = text
        for pattern_name, pattern in self.SENSITIVE_PATTERNS.items():
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
        return sanitized
    
    def detect_sensitive_data(self, text: str) -> List[str]:
        """Detect types of sensitive data present."""
        detected = []
        for pattern_name, pattern in self.SENSITIVE_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                detected.append(pattern_name)
        return detected

# Usage with Dandolo
sanitizer = DataSanitizer()

def secure_chat_request(user_input: str):
    # Check for sensitive data
    sensitive_types = sanitizer.detect_sensitive_data(user_input)
    
    if sensitive_types:
        print(f"⚠️ Warning: Detected {', '.join(sensitive_types)} in input")
        
        # Option 1: Sanitize automatically
        sanitized_input = sanitizer.sanitize_text(user_input)
        
        # Option 2: Reject request
        # raise ValueError("Sensitive data detected, request rejected")
        
        # Option 3: Get user consent
        consent = input("Sensitive data detected. Continue? (y/n): ")
        if consent.lower() != 'y':
            return None
    
    # Proceed with sanitized or approved input
    return client.chat.completions.create(
        messages=[{"role": "user", "content": sanitized_input}]
    )
```

### Privacy-Preserving Techniques

```python
import hashlib
import hmac

class PrivacyPreserver:
    """Privacy-preserving data processing techniques."""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key.encode()
    
    def pseudonymize_identifiers(self, identifier: str) -> str:
        """Create consistent pseudonym for identifiers."""
        return hmac.new(
            self.secret_key,
            identifier.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
    
    def differential_privacy_noise(self, value: float, epsilon: float = 1.0) -> float:
        """Add noise for differential privacy."""
        import random
        import math
        
        # Laplace mechanism
        sensitivity = 1.0  # Adjust based on your use case
        scale = sensitivity / epsilon
        noise = random.laplace(0, scale)
        return value + noise
    
    def k_anonymize_data(self, data: List[Dict], k: int = 5) -> List[Dict]:
        """Implement k-anonymity for datasets."""
        # Simplified k-anonymity implementation
        # In production, use specialized libraries
        anonymized_data = []
        for record in data:
            # Generalize sensitive attributes
            anonymized_record = self._generalize_record(record)
            anonymized_data.append(anonymized_record)
        return anonymized_data
    
    def _generalize_record(self, record: Dict) -> Dict:
        """Generalize sensitive fields in a record."""
        # Example: Age ranges instead of exact age
        if 'age' in record:
            age = record['age']
            if age < 30:
                record['age_range'] = '20-29'
            elif age < 40:
                record['age_range'] = '30-39'
            # ... etc
            del record['age']
        return record
```

---

## Network Security

### TLS/SSL Configuration

```python
import ssl
import certifi
from dandolo import Dandolo

# ✅ Secure TLS configuration
class SecureDandoloClient:
    def __init__(self, api_key: str):
        # Create secure SSL context
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        ssl_context.minimum_version = ssl.TLSVersion.TLSv1_3
        
        self.client = Dandolo(
            api_key=api_key,
            ssl_context=ssl_context,
            timeout=30,
            max_retries=3
        )
    
    async def secure_request(self, messages: List[Dict]):
        """Make secure API request with validation."""
        try:
            response = await self.client.chat.completions.create(
                messages=messages
            )
            return response
        except ssl.SSLError as e:
            raise SecurityError(f"SSL/TLS error: {e}")
        except Exception as e:
            raise SecurityError(f"Request failed: {e}")
```

### Request Signing (Advanced)

```python
import hmac
import hashlib
import time
from typing import Dict

class RequestSigner:
    """Sign requests for additional security layer."""
    
    def __init__(self, signing_key: str):
        self.signing_key = signing_key.encode()
    
    def sign_request(self, method: str, url: str, body: str = "") -> Dict[str, str]:
        """Generate request signature."""
        timestamp = str(int(time.time()))
        
        # Create string to sign
        string_to_sign = f"{method}\n{url}\n{body}\n{timestamp}"
        
        # Generate signature
        signature = hmac.new(
            self.signing_key,
            string_to_sign.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return {
            "X-Signature": signature,
            "X-Timestamp": timestamp,
            "X-Signature-Version": "1"
        }
    
    def verify_signature(self, signature: str, timestamp: str, 
                        method: str, url: str, body: str = "") -> bool:
        """Verify request signature."""
        # Check timestamp (prevent replay attacks)
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if abs(current_time - request_time) > 300:  # 5 minutes
            return False
        
        # Regenerate signature
        string_to_sign = f"{method}\n{url}\n{body}\n{timestamp}"
        expected_signature = hmac.new(
            self.signing_key,
            string_to_sign.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
```

---

## Authentication & Authorization

### Multi-Factor Authentication

```python
import pyotp
import qrcode
from io import BytesIO

class MFAManager:
    """Multi-factor authentication for API access."""
    
    def __init__(self):
        self.users_secrets = {}  # In production, use secure storage
    
    def setup_mfa(self, user_id: str, app_name: str = "Dandolo AI") -> dict:
        """Set up MFA for a user."""
        secret = pyotp.random_base32()
        self.users_secrets[user_id] = secret
        
        # Generate QR code for authenticator app
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_id,
            issuer_name=app_name
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        return {
            "secret": secret,
            "qr_code": img,
            "backup_codes": self._generate_backup_codes()
        }
    
    def verify_mfa_token(self, user_id: str, token: str) -> bool:
        """Verify MFA token."""
        if user_id not in self.users_secrets:
            return False
        
        secret = self.users_secrets[user_id]
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    
    def _generate_backup_codes(self) -> list:
        """Generate backup codes for MFA."""
        import secrets
        return [secrets.token_hex(4).upper() for _ in range(10)]

class SecureAPIAccess:
    """Secure API access with MFA."""
    
    def __init__(self, api_key: str, mfa_manager: MFAManager):
        self.api_key = api_key
        self.mfa_manager = mfa_manager
        self.authenticated_sessions = {}
    
    async def authenticate_request(self, user_id: str, mfa_token: str) -> bool:
        """Authenticate API request with MFA."""
        if not self.mfa_manager.verify_mfa_token(user_id, mfa_token):
            return False
        
        # Create authenticated session
        session_id = secrets.token_urlsafe(32)
        self.authenticated_sessions[session_id] = {
            "user_id": user_id,
            "created_at": time.time(),
            "expires_at": time.time() + 3600  # 1 hour
        }
        
        return session_id
    
    def validate_session(self, session_id: str) -> bool:
        """Validate authenticated session."""
        if session_id not in self.authenticated_sessions:
            return False
        
        session = self.authenticated_sessions[session_id]
        if time.time() > session["expires_at"]:
            del self.authenticated_sessions[session_id]
            return False
        
        return True
```

### Role-Based Access Control (RBAC)

```python
from enum import Enum
from typing import Set, Dict, List

class Permission(Enum):
    READ_MODELS = "read_models"
    CREATE_COMPLETIONS = "create_completions"
    STREAM_RESPONSES = "stream_responses"
    ACCESS_ADVANCED_FEATURES = "access_advanced_features"
    MANAGE_API_KEYS = "manage_api_keys"
    VIEW_USAGE_ANALYTICS = "view_usage_analytics"

class Role(Enum):
    VIEWER = "viewer"
    DEVELOPER = "developer"
    AGENT = "agent"
    ADMIN = "admin"

class RBACManager:
    """Role-based access control for API operations."""
    
    def __init__(self):
        self.role_permissions = {
            Role.VIEWER: {
                Permission.READ_MODELS,
                Permission.VIEW_USAGE_ANALYTICS
            },
            Role.DEVELOPER: {
                Permission.READ_MODELS,
                Permission.CREATE_COMPLETIONS,
                Permission.STREAM_RESPONSES,
                Permission.VIEW_USAGE_ANALYTICS
            },
            Role.AGENT: {
                Permission.READ_MODELS,
                Permission.CREATE_COMPLETIONS,
                Permission.STREAM_RESPONSES,
                Permission.ACCESS_ADVANCED_FEATURES,
                Permission.VIEW_USAGE_ANALYTICS
            },
            Role.ADMIN: set(Permission)  # All permissions
        }
        
        self.user_roles: Dict[str, Set[Role]] = {}
    
    def assign_role(self, user_id: str, role: Role):
        """Assign role to user."""
        if user_id not in self.user_roles:
            self.user_roles[user_id] = set()
        self.user_roles[user_id].add(role)
    
    def has_permission(self, user_id: str, permission: Permission) -> bool:
        """Check if user has specific permission."""
        if user_id not in self.user_roles:
            return False
        
        user_permissions = set()
        for role in self.user_roles[user_id]:
            user_permissions.update(self.role_permissions[role])
        
        return permission in user_permissions
    
    def require_permission(self, permission: Permission):
        """Decorator to require specific permission."""
        def decorator(func):
            def wrapper(*args, **kwargs):
                user_id = kwargs.get('user_id') or args[0] if args else None
                if not self.has_permission(user_id, permission):
                    raise PermissionError(f"Permission {permission.value} required")
                return func(*args, **kwargs)
            return wrapper
        return decorator

# Usage example
rbac = RBACManager()
rbac.assign_role("user123", Role.DEVELOPER)

@rbac.require_permission(Permission.CREATE_COMPLETIONS)
def create_completion(user_id: str, messages: List[Dict]):
    """Create completion with permission check."""
    return client.chat.completions.create(messages=messages)
```

---

## Monitoring & Logging

### Security Event Monitoring

```python
import logging
import json
from datetime import datetime
from typing import Dict, Any

class SecurityLogger:
    """Centralized security event logging."""
    
    def __init__(self, log_level: str = "INFO"):
        self.logger = logging.getLogger("dandolo_security")
        self.logger.setLevel(getattr(logging, log_level))
        
        # Security-specific formatter
        formatter = logging.Formatter(
            '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
        )
        
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
    
    def log_api_access(self, user_id: str, endpoint: str, success: bool, 
                      ip_address: str = None, user_agent: str = None):
        """Log API access attempts."""
        event = {
            "event_type": "api_access",
            "user_id": user_id,
            "endpoint": endpoint,
            "success": success,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        level = logging.INFO if success else logging.WARNING
        self.logger.log(level, json.dumps(event))
    
    def log_authentication_event(self, user_id: str, event_type: str, 
                                success: bool, details: Dict = None):
        """Log authentication events."""
        event = {
            "event_type": "authentication",
            "auth_event_type": event_type,
            "user_id": user_id,
            "success": success,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        level = logging.INFO if success else logging.ERROR
        self.logger.log(level, json.dumps(event))
    
    def log_security_incident(self, incident_type: str, severity: str, 
                            description: str, details: Dict = None):
        """Log security incidents."""
        event = {
            "event_type": "security_incident",
            "incident_type": incident_type,
            "severity": severity,
            "description": description,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.logger.error(json.dumps(event))

class SecurityMetrics:
    """Security metrics collection and analysis."""
    
    def __init__(self):
        self.metrics = {
            "failed_authentications": 0,
            "rate_limit_violations": 0,
            "suspicious_patterns": 0,
            "api_key_compromises": 0
        }
    
    def increment_metric(self, metric_name: str, value: int = 1):
        """Increment security metric."""
        if metric_name in self.metrics:
            self.metrics[metric_name] += value
    
    def get_security_score(self) -> float:
        """Calculate overall security score."""
        total_incidents = sum(self.metrics.values())
        if total_incidents == 0:
            return 100.0
        
        # Simple scoring algorithm (improve based on your needs)
        score = max(0, 100 - (total_incidents * 5))
        return score
    
    def generate_security_report(self) -> Dict:
        """Generate security metrics report."""
        return {
            "metrics": self.metrics,
            "security_score": self.get_security_score(),
            "generated_at": datetime.utcnow().isoformat(),
            "recommendations": self._get_recommendations()
        }
    
    def _get_recommendations(self) -> List[str]:
        """Generate security recommendations."""
        recommendations = []
        
        if self.metrics["failed_authentications"] > 10:
            recommendations.append("High number of failed authentications detected. Consider implementing account lockout policies.")
        
        if self.metrics["rate_limit_violations"] > 5:
            recommendations.append("Frequent rate limit violations. Review rate limiting policies and client implementations.")
        
        return recommendations
```

### Anomaly Detection

```python
import numpy as np
from typing import List, Tuple
from datetime import datetime, timedelta

class AnomalyDetector:
    """Detect suspicious patterns in API usage."""
    
    def __init__(self):
        self.usage_history = []
        self.baseline_established = False
        self.normal_patterns = {}
    
    def record_usage(self, user_id: str, endpoint: str, tokens_used: int, 
                    response_time: float, ip_address: str):
        """Record API usage for analysis."""
        usage_record = {
            "user_id": user_id,
            "endpoint": endpoint,
            "tokens_used": tokens_used,
            "response_time": response_time,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow()
        }
        
        self.usage_history.append(usage_record)
        
        # Keep only last 7 days
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        self.usage_history = [
            record for record in self.usage_history 
            if record["timestamp"] > cutoff_date
        ]
    
    def detect_anomalies(self, user_id: str) -> List[Dict]:
        """Detect anomalous behavior for a user."""
        user_records = [
            record for record in self.usage_history 
            if record["user_id"] == user_id
        ]
        
        if len(user_records) < 10:  # Need baseline
            return []
        
        anomalies = []
        
        # Check for unusual usage spikes
        if self._detect_usage_spike(user_records):
            anomalies.append({
                "type": "usage_spike",
                "severity": "medium",
                "description": "Unusual increase in API usage detected"
            })
        
        # Check for unusual timing patterns
        if self._detect_timing_anomaly(user_records):
            anomalies.append({
                "type": "timing_anomaly",
                "severity": "low",
                "description": "Unusual request timing patterns detected"
            })
        
        # Check for IP address changes
        if self._detect_ip_anomaly(user_records):
            anomalies.append({
                "type": "ip_anomaly",
                "severity": "high",
                "description": "Requests from unusual IP addresses detected"
            })
        
        return anomalies
    
    def _detect_usage_spike(self, records: List[Dict]) -> bool:
        """Detect unusual usage spikes."""
        daily_usage = {}
        
        for record in records:
            date = record["timestamp"].date()
            if date not in daily_usage:
                daily_usage[date] = 0
            daily_usage[date] += record["tokens_used"]
        
        if len(daily_usage) < 3:
            return False
        
        usage_values = list(daily_usage.values())
        mean_usage = np.mean(usage_values[:-1])  # Exclude today
        std_usage = np.std(usage_values[:-1])
        
        latest_usage = usage_values[-1]
        
        # Detect if latest usage is more than 3 standard deviations above mean
        return latest_usage > (mean_usage + 3 * std_usage)
    
    def _detect_timing_anomaly(self, records: List[Dict]) -> bool:
        """Detect unusual timing patterns."""
        hours = [record["timestamp"].hour for record in records]
        
        # Simple anomaly: requests at unusual hours (2-6 AM)
        unusual_hours = sum(1 for hour in hours if 2 <= hour <= 6)
        return unusual_hours > len(records) * 0.3  # >30% unusual timing
    
    def _detect_ip_anomaly(self, records: List[Dict]) -> bool:
        """Detect unusual IP address patterns."""
        recent_ips = set()
        historical_ips = set()
        
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        for record in records:
            if record["timestamp"] > cutoff_time:
                recent_ips.add(record["ip_address"])
            else:
                historical_ips.add(record["ip_address"])
        
        # Check if recent IPs are completely different from historical
        if historical_ips and recent_ips:
            return len(recent_ips & historical_ips) == 0
        
        return False
```

---

## Compliance & Auditing

### GDPR Compliance

```python
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class DataCategory(Enum):
    PERSONAL_DATA = "personal_data"
    SENSITIVE_DATA = "sensitive_data"
    TECHNICAL_DATA = "technical_data"

class GDPRCompliance:
    """GDPR compliance management for AI applications."""
    
    def __init__(self):
        self.data_processing_records = []
        self.consent_records = {}
        self.data_retention_policies = {}
    
    def record_data_processing(self, user_id: str, data_category: DataCategory, 
                             purpose: str, legal_basis: str):
        """Record data processing activity."""
        record = {
            "user_id": user_id,
            "data_category": data_category.value,
            "purpose": purpose,
            "legal_basis": legal_basis,
            "processed_at": datetime.utcnow(),
            "processor": "Dandolo AI Application"
        }
        
        self.data_processing_records.append(record)
    
    def obtain_consent(self, user_id: str, processing_purposes: List[str]) -> str:
        """Obtain user consent for data processing."""
        consent_id = f"consent_{user_id}_{int(datetime.utcnow().timestamp())}"
        
        self.consent_records[consent_id] = {
            "user_id": user_id,
            "purposes": processing_purposes,
            "granted_at": datetime.utcnow(),
            "consent_method": "explicit",
            "ip_address": "recorded_separately",
            "user_agent": "recorded_separately"
        }
        
        return consent_id
    
    def withdraw_consent(self, user_id: str, consent_id: str):
        """Handle consent withdrawal."""
        if consent_id in self.consent_records:
            self.consent_records[consent_id]["withdrawn_at"] = datetime.utcnow()
            
            # Implement data deletion procedures
            self._delete_user_data(user_id)
    
    def handle_data_subject_request(self, user_id: str, request_type: str) -> Dict:
        """Handle GDPR data subject requests."""
        
        if request_type == "access":
            return self._generate_data_export(user_id)
        elif request_type == "deletion":
            return self._delete_user_data(user_id)
        elif request_type == "rectification":
            return self._prepare_rectification_process(user_id)
        elif request_type == "portability":
            return self._generate_portable_data(user_id)
        else:
            raise ValueError(f"Unsupported request type: {request_type}")
    
    def _generate_data_export(self, user_id: str) -> Dict:
        """Generate complete data export for user."""
        user_data = {
            "user_id": user_id,
            "processing_records": [
                record for record in self.data_processing_records
                if record["user_id"] == user_id
            ],
            "consent_records": {
                consent_id: record for consent_id, record in self.consent_records.items()
                if record["user_id"] == user_id
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        return user_data
    
    def _delete_user_data(self, user_id: str) -> Dict:
        """Delete all user data (right to be forgotten)."""
        deleted_records = 0
        
        # Remove processing records
        original_count = len(self.data_processing_records)
        self.data_processing_records = [
            record for record in self.data_processing_records
            if record["user_id"] != user_id
        ]
        deleted_records += original_count - len(self.data_processing_records)
        
        # Archive consent records (legally required to keep)
        for consent_id, record in self.consent_records.items():
            if record["user_id"] == user_id:
                record["data_deleted_at"] = datetime.utcnow()
        
        return {
            "user_id": user_id,
            "deletion_completed_at": datetime.utcnow().isoformat(),
            "records_deleted": deleted_records,
            "status": "completed"
        }

class AuditLogger:
    """Comprehensive audit logging for compliance."""
    
    def __init__(self):
        self.audit_log = []
    
    def log_compliance_event(self, event_type: str, user_id: str, 
                           details: Dict, compliance_framework: str = "GDPR"):
        """Log compliance-related events."""
        audit_entry = {
            "event_id": f"audit_{int(datetime.utcnow().timestamp())}",
            "event_type": event_type,
            "user_id": user_id,
            "compliance_framework": compliance_framework,
            "details": details,
            "timestamp": datetime.utcnow().isoformat(),
            "system": "Dandolo AI Application"
        }
        
        self.audit_log.append(audit_entry)
    
    def generate_compliance_report(self, start_date: datetime, 
                                 end_date: datetime) -> Dict:
        """Generate compliance audit report."""
        relevant_events = [
            event for event in self.audit_log
            if start_date <= datetime.fromisoformat(event["timestamp"]) <= end_date
        ]
        
        return {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_events": len(relevant_events),
            "events_by_type": self._group_events_by_type(relevant_events),
            "compliance_status": self._assess_compliance_status(relevant_events),
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def _group_events_by_type(self, events: List[Dict]) -> Dict:
        """Group events by type for reporting."""
        grouped = {}
        for event in events:
            event_type = event["event_type"]
            if event_type not in grouped:
                grouped[event_type] = 0
            grouped[event_type] += 1
        return grouped
    
    def _assess_compliance_status(self, events: List[Dict]) -> str:
        """Assess overall compliance status."""
        # Simple compliance assessment
        violation_events = [
            event for event in events
            if "violation" in event["event_type"].lower()
        ]
        
        if len(violation_events) == 0:
            return "compliant"
        elif len(violation_events) < 5:
            return "mostly_compliant"
        else:
            return "non_compliant"
```

---

## Deployment Security

### Secure Deployment Configuration

```yaml
# docker-compose.yml - Secure deployment example
version: '3.8'

services:
  dandolo-app:
    image: your-app:latest
    environment:
      - DANDOLO_API_KEY_FILE=/run/secrets/dandolo_api_key
      - TLS_CERT_PATH=/run/secrets/tls_cert
      - TLS_KEY_PATH=/run/secrets/tls_key
    secrets:
      - dandolo_api_key
      - tls_cert
      - tls_key
    networks:
      - app-network
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  reverse-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - app-network
    depends_on:
      - dandolo-app

secrets:
  dandolo_api_key:
    external: true
  tls_cert:
    external: true
  tls_key:
    external: true

networks:
  app-network:
    driver: overlay
    encrypted: true
```

```nginx
# nginx.conf - Secure reverse proxy configuration  
events {
    worker_connections 1024;
}

http {
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Content-Security-Policy "default-src 'self'";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    upstream dandolo_app {
        server dandolo-app:8080 max_fails=3 fail_timeout=30s;
    }
    
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        # SSL configuration
        ssl_certificate /etc/ssl/certs/your-cert.pem;
        ssl_certificate_key /etc/ssl/private/your-key.pem;
        ssl_protocols TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://dandolo_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Authentication endpoints  
        location /auth/ {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://dandolo_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Container Security

```dockerfile
# Secure Dockerfile
FROM python:3.11-slim as builder

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Set up application
WORKDIR /app
COPY --chown=appuser:appuser . .

# Set security options
USER appuser
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')"

CMD ["python", "app.py"]
```

---

## Incident Response

### Security Incident Response Plan

```python
from enum import Enum
from datetime import datetime
from typing import List, Dict

class IncidentSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentType(Enum):
    DATA_BREACH = "data_breach"
    API_KEY_COMPROMISE = "api_key_compromise"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DDoS_ATTACK = "ddos_attack"
    MALWARE_DETECTION = "malware_detection"

class SecurityIncidentResponse:
    """Security incident response management."""
    
    def __init__(self):
        self.active_incidents = {}
        self.incident_history = []
        self.response_procedures = self._define_response_procedures()
    
    def create_incident(self, incident_type: IncidentType, 
                       severity: IncidentSeverity, description: str,
                       affected_users: List[str] = None) -> str:
        """Create new security incident."""
        
        incident_id = f"INC-{int(datetime.utcnow().timestamp())}"
        
        incident = {
            "id": incident_id,
            "type": incident_type,
            "severity": severity,
            "description": description,
            "affected_users": affected_users or [],
            "created_at": datetime.utcnow(),
            "status": "open",
            "assigned_to": None,
            "actions_taken": [],
            "timeline": []
        }
        
        self.active_incidents[incident_id] = incident
        self._initiate_response(incident)
        
        return incident_id
    
    def _initiate_response(self, incident: Dict):
        """Initiate incident response procedures."""
        incident_type = incident["type"]
        severity = incident["severity"]
        
        # Get response procedures for this incident type
        procedures = self.response_procedures.get(incident_type, [])
        
        # Execute immediate response actions
        for procedure in procedures:
            if procedure["trigger_severity"] <= severity:
                self._execute_response_action(incident["id"], procedure)
    
    def _execute_response_action(self, incident_id: str, procedure: Dict):
        """Execute specific response action."""
        action = {
            "action": procedure["action"],
            "executed_at": datetime.utcnow(),
            "status": "in_progress"
        }
        
        # Log action
        self.active_incidents[incident_id]["actions_taken"].append(action)
        
        # Execute based on action type
        if procedure["action"] == "revoke_api_keys":
            self._revoke_compromised_keys(incident_id)
        elif procedure["action"] == "block_ip_addresses":
            self._block_malicious_ips(incident_id)
        elif procedure["action"] == "notify_users":
            self._notify_affected_users(incident_id)
        elif procedure["action"] == "escalate_to_security_team":
            self._escalate_incident(incident_id)
    
    def _revoke_compromised_keys(self, incident_id: str):
        """Revoke potentially compromised API keys."""
        incident = self.active_incidents[incident_id]
        
        for user_id in incident["affected_users"]:
            # Revoke all keys for affected users
            self._revoke_user_keys(user_id)
            
        self._log_incident_action(incident_id, "API keys revoked for affected users")
    
    def _block_malicious_ips(self, incident_id: str):
        """Block malicious IP addresses."""
        # Implementation would integrate with your firewall/WAF
        self._log_incident_action(incident_id, "Malicious IP addresses blocked")
    
    def _notify_affected_users(self, incident_id: str):
        """Notify affected users about the incident."""
        incident = self.active_incidents[incident_id]
        
        notification_template = self._get_notification_template(incident["type"])
        
        for user_id in incident["affected_users"]:
            # Send notification (email, SMS, etc.)
            self._send_user_notification(user_id, notification_template)
        
        self._log_incident_action(incident_id, f"Notifications sent to {len(incident['affected_users'])} users")
    
    def _define_response_procedures(self) -> Dict:
        """Define response procedures for different incident types."""
        return {
            IncidentType.API_KEY_COMPROMISE: [
                {
                    "action": "revoke_api_keys",
                    "trigger_severity": IncidentSeverity.MEDIUM,
                    "description": "Immediately revoke compromised API keys"
                },
                {
                    "action": "notify_users",
                    "trigger_severity": IncidentSeverity.HIGH,
                    "description": "Notify affected users of compromise"
                },
                {
                    "action": "escalate_to_security_team",
                    "trigger_severity": IncidentSeverity.CRITICAL,
                    "description": "Escalate to security team"
                }
            ],
            IncidentType.UNAUTHORIZED_ACCESS: [
                {
                    "action": "block_ip_addresses",
                    "trigger_severity": IncidentSeverity.MEDIUM,
                    "description": "Block unauthorized IP addresses"
                },
                {
                    "action": "escalate_to_security_team",
                    "trigger_severity": IncidentSeverity.HIGH,
                    "description": "Escalate to security team"
                }
            ]
        }
```

---

## Security Checklist

### Pre-Deployment Security Checklist

- [ ] **API Key Security**
  - [ ] API keys stored in environment variables or secure vault
  - [ ] No API keys in code or version control
  - [ ] Key rotation policy implemented
  - [ ] Minimum required permissions assigned

- [ ] **Network Security**
  - [ ] TLS 1.3 enforced for all connections
  - [ ] Certificate validation enabled
  - [ ] Rate limiting configured
  - [ ] DDoS protection in place

- [ ] **Data Protection**
  - [ ] Sensitive data sanitization implemented
  - [ ] Privacy-preserving techniques applied where needed
  - [ ] Data retention policies defined
  - [ ] GDPR compliance measures implemented

- [ ] **Authentication & Authorization**
  - [ ] Multi-factor authentication enabled
  - [ ] Role-based access control implemented
  - [ ] Session management configured
  - [ ] Regular access reviews scheduled

- [ ] **Monitoring & Logging**
  - [ ] Security event logging enabled
  - [ ] Anomaly detection configured
  - [ ] Alert thresholds set
  - [ ] Log retention policies defined

- [ ] **Incident Response**
  - [ ] Incident response plan documented
  - [ ] Response procedures tested
  - [ ] Contact information updated
  - [ ] Recovery procedures validated

### Regular Security Maintenance

- [ ] **Weekly**
  - [ ] Review security logs
  - [ ] Check for failed authentication attempts
  - [ ] Monitor API usage patterns
  - [ ] Update security configurations

- [ ] **Monthly**
  - [ ] Rotate API keys
  - [ ] Review access permissions
  - [ ] Test incident response procedures
  - [ ] Update security documentation

- [ ] **Quarterly**
  - [ ] Conduct security assessment
  - [ ] Review compliance requirements
  - [ ] Update threat models
  - [ ] Train team on security practices

---

## Getting Help

### Security Support Channels

- **Security Issues**: [security@dandolo.ai](mailto:security@dandolo.ai)
- **Compliance Questions**: [compliance@dandolo.ai](mailto:compliance@dandolo.ai)
- **Documentation**: [docs.dandolo.ai/security](https://docs.dandolo.ai/security)
- **Community**: [discord.gg/dandolo](https://discord.gg/dandolo)

### Emergency Contact

For critical security incidents:
- **Emergency Hotline**: Available 24/7 for enterprise customers
- **Incident Reporting**: [incident@dandolo.ai](mailto:incident@dandolo.ai)
- **PGP Key**: Available on our website for encrypted communications

---

*Security is a shared responsibility. This guide provides the foundation - implement these practices consistently and adapt them to your specific security requirements.*