/**
 * Advanced Security Validation Framework for Dandolo Agent SDK
 * 
 * Provides comprehensive security validation, threat detection, prompt injection
 * prevention, and content sanitization for agent instructions.
 */

import { EventEmitter } from 'eventemitter3';
import {
  AgentInstruction,
  ValidationError,
  ValidationWarning,
  DandoloError
} from './types';
import { createDandoloError } from './errors';

/**
 * Security threat assessment result
 */
export interface SecurityThreatAssessment {
  /** Overall risk level */
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Detected threats */
  threats: SecurityThreat[];
  
  /** Applied mitigations */
  mitigations: SecurityMitigation[];
  
  /** Security score (0-100) */
  security_score: number;
  
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Individual security threat
 */
export interface SecurityThreat {
  /** Threat type */
  type: SecurityThreatType;
  
  /** Threat severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Threat description */
  description: string;
  
  /** Pattern that matched */
  pattern?: string;
  
  /** Location in content */
  location?: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  
  /** Evidence of the threat */
  evidence: string;
  
  /** Confidence level */
  confidence: number;
}

/**
 * Security threat types
 */
export type SecurityThreatType =
  | 'prompt_injection'
  | 'code_injection'
  | 'script_injection'
  | 'sql_injection'
  | 'command_injection'
  | 'path_traversal'
  | 'xss_attempt'
  | 'credential_exposure'
  | 'pii_exposure'
  | 'malicious_url'
  | 'excessive_length'
  | 'excessive_repetition'
  | 'social_engineering'
  | 'privilege_escalation'
  | 'data_exfiltration'
  | 'system_manipulation'
  | 'resource_exhaustion';

/**
 * Security mitigation
 */
export interface SecurityMitigation {
  /** Mitigation type */
  type: SecurityMitigationType;
  
  /** Description of mitigation */
  description: string;
  
  /** Whether mitigation was applied */
  applied: boolean;
  
  /** Reason if not applied */
  reason?: string;
}

/**
 * Security mitigation types
 */
export type SecurityMitigationType =
  | 'content_sanitization'
  | 'pattern_removal'
  | 'content_truncation'
  | 'encoding_escape'
  | 'url_validation'
  | 'input_filtering'
  | 'rate_limiting'
  | 'context_isolation'
  | 'privilege_restriction'
  | 'content_blocking';

/**
 * Security validation configuration
 */
export interface SecurityConfig {
  /** Security level */
  level: 'permissive' | 'moderate' | 'strict' | 'paranoid';
  
  /** Maximum content length */
  max_content_length: number;
  
  /** Maximum repetition ratio */
  max_repetition_ratio: number;
  
  /** Enable automatic sanitization */
  auto_sanitize: boolean;
  
  /** Block critical threats */
  block_critical: boolean;
  
  /** Block high threats */
  block_high: boolean;
  
  /** Custom threat patterns */
  custom_patterns?: RegExp[];
  
  /** Whitelist patterns */
  whitelist_patterns?: RegExp[];
  
  /** Enabled threat detection */
  enabled_threats: SecurityThreatType[];
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  /** Whether content is safe */
  safe: boolean;
  
  /** Threat assessment */
  assessment: SecurityThreatAssessment;
  
  /** Sanitized content (if applicable) */
  sanitized_content?: string;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
  
  /** Processing metadata */
  metadata: {
    processing_time_ms: number;
    patterns_checked: number;
    threats_detected: number;
    mitigations_applied: number;
  };
}

/**
 * Advanced Security Validator
 * 
 * Provides comprehensive security validation with multiple layers of
 * threat detection and prevention.
 */
export class SecurityValidator extends EventEmitter {
  private config: SecurityConfig;
  private validationStats = {
    total_validations: 0,
    threats_detected: 0,
    content_blocked: 0,
    content_sanitized: 0,
    false_positives: 0,
    average_processing_time: 0
  };

  // Comprehensive threat detection patterns
  private readonly THREAT_PATTERNS: Record<SecurityThreatType, RegExp[]> = {
    prompt_injection: [
      /ignore\s+(all\s+)?previous\s+instructions?/i,
      /disregard\s+(all\s+)?previous\s+instructions?/i,
      /forget\s+(all\s+)?previous\s+instructions?/i,
      /system:\s*[\"\']?[^\"\']*[\"\']?\s*$/i,
      /\[INST\]/i,
      /\<\|system\|\>/i,
      /\<\|user\|\>/i,
      /\<\|assistant\|\>/i,
      /new\s+instructions?:/i,
      /override\s+instructions?/i,
      /replace\s+instructions?/i,
      /updated\s+instructions?/i,
      /alternative\s+instructions?/i,
      /act\s+as\s+if\s+you\s+are/i,
      /pretend\s+to\s+be/i,
      /roleplay\s+as/i,
      /simulate\s+being/i
    ],
    
    code_injection: [
      /eval\s*\(/i,
      /exec\s*\(/i,
      /system\s*\(/i,
      /subprocess\s*\./i,
      /os\s*\.\s*system/i,
      /shell_exec\s*\(/i,
      /passthru\s*\(/i,
      /popen\s*\(/i,
      /__import__\s*\(/i,
      /getattr\s*\(/i,
      /setattr\s*\(/i,
      /delattr\s*\(/i
    ],
    
    script_injection: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /on\w+\s*=\s*["\'][^"\']*["\']?/i,
      /expression\s*\(/i,
      /url\s*\(\s*javascript:/i
    ],
    
    sql_injection: [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+\w+\s+set/i,
      /alter\s+table/i,
      /create\s+table/i,
      /truncate\s+table/i,
      /'\s*or\s*'1'\s*=\s*'1/i,
      /'\s*or\s*1\s*=\s*1/i,
      /--\s*$/i,
      /\/\*.*?\*\//gi
    ],
    
    command_injection: [
      /;\s*(rm|del|delete)\s/i,
      /;\s*cat\s+\/etc\/passwd/i,
      /;\s*ls\s+-la/i,
      /\|\s*nc\s+/i,
      /\|\s*netcat\s+/i,
      /\|\s*curl\s+/i,
      /\|\s*wget\s+/i,
      /\|\s*bash\s*$/i,
      /\|\s*sh\s*$/i,
      /&&\s*(rm|del|delete)/i,
      /`[^`]*`/g,
      /\$\([^)]*\)/g
    ],
    
    path_traversal: [
      /\.\.\//g,
      /\.\.\\+/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /\/etc\/passwd/i,
      /\/etc\/shadow/i,
      /c:\\windows\\system32/i
    ],
    
    xss_attempt: [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<img[^>]+src\s*=\s*["\']javascript:/i
    ],
    
    credential_exposure: [
      /password\s*[:=]\s*[\"\']?[^\s\"\']+/i,
      /token\s*[:=]\s*[\"\']?[^\s\"\']+/i,
      /api[_\-]?key\s*[:=]\s*[\"\']?[^\s\"\']+/i,
      /secret\s*[:=]\s*[\"\']?[^\s\"\']+/i,
      /auth[_\-]?token\s*[:=]\s*[\"\']?[^\s\"\']+/i,
      /bearer\s+[a-zA-Z0-9\-._~+/]+=*/i,
      /basic\s+[a-zA-Z0-9+/]+=*/i,
      /ssh-rsa\s+[a-zA-Z0-9+/]+/i,
      /-----BEGIN\s+[A-Z\s]+KEY-----/i
    ],
    
    pii_exposure: [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone number
      /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|court|ct|place|pl)\b/gi // Address
    ],
    
    malicious_url: [
      /https?:\/\/[^\s]*\.(tk|ml|ga|cf|bit\.ly|tinyurl\.com|t\.co|goo\.gl)/i,
      /https?:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/g,
      /https?:\/\/[^\s]*\/(phishing|malware|virus|trojan|ransomware)/i,
      /ftp:\/\/[^\s]*/i,
      /file:\/\/[^\s]*/i
    ],
    
    excessive_length: [], // Handled programmatically
    excessive_repetition: [], // Handled programmatically
    
    social_engineering: [
      /urgent.*action.*required/i,
      /verify.*account.*immediately/i,
      /suspended.*account/i,
      /click.*here.*immediately/i,
      /limited.*time.*offer/i,
      /act.*now.*or.*lose/i,
      /congratulations.*winner/i,
      /claim.*prize.*now/i
    ],
    
    privilege_escalation: [
      /sudo\s+/i,
      /su\s+-/i,
      /chmod\s+777/i,
      /chown\s+root/i,
      /passwd\s+root/i,
      /usermod\s+-a\s+-G\s+sudo/i,
      /visudo/i,
      /\/etc\/sudoers/i
    ],
    
    data_exfiltration: [
      /base64\s*\(/i,
      /btoa\s*\(/i,
      /atob\s*\(/i,
      /document\.cookie/i,
      /localStorage\./i,
      /sessionStorage\./i,
      /XMLHttpRequest/i,
      /fetch\s*\(/i,
      /addEventListener\s*\(/i
    ],
    
    system_manipulation: [
      /registry\s*\./i,
      /regedit/i,
      /taskkill/i,
      /tasklist/i,
      /net\s+user/i,
      /net\s+localgroup/i,
      /sc\s+create/i,
      /schtasks/i,
      /powershell\s+-/i,
      /cmd\.exe/i
    ],
    
    resource_exhaustion: [
      /while\s*\(\s*true\s*\)/i,
      /for\s*\(\s*;;\s*\)/i,
      /setInterval\s*\(/i,
      /setTimeout\s*\([^,]*,\s*0\s*\)/i
    ]
  };

  constructor(config: Partial<SecurityConfig> = {}) {
    super();
    
    this.config = {
      level: 'moderate',
      max_content_length: 10000,
      max_repetition_ratio: 0.3,
      auto_sanitize: true,
      block_critical: true,
      block_high: false,
      enabled_threats: Object.keys(this.THREAT_PATTERNS) as SecurityThreatType[],
      ...config
    };
  }

  /**
   * Validate instruction for security threats
   */
  async validateInstruction(instruction: AgentInstruction): Promise<SecurityValidationResult> {
    const startTime = Date.now();
    
    try {
      const assessment = await this.performThreatAssessment(instruction.content);
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let sanitizedContent: string | undefined;

      // Check if content should be blocked
      const shouldBlock = this.shouldBlockContent(assessment);
      
      if (shouldBlock) {
        errors.push({
          code: 'SECURITY_VIOLATION',
          message: 'Content blocked due to security threats',
          severity: 'error'
        });
      } else {
        // Apply sanitization if needed
        if (this.config.auto_sanitize && assessment.mitigations.length > 0) {
          sanitizedContent = await this.sanitizeContent(instruction.content, assessment);
        }

        // Add warnings for detected threats
        for (const threat of assessment.threats) {
          if (threat.severity === 'high' || threat.severity === 'critical') {
            warnings.push({
              code: `SECURITY_${threat.type.toUpperCase()}`,
              message: threat.description,
              severity: 'warning',
              suggestion: `Consider reviewing content for ${threat.type}`
            });
          }
        }
      }

      const processingTime = Date.now() - startTime;
      this.updateValidationStats(processingTime, assessment);

      const result: SecurityValidationResult = {
        safe: !shouldBlock,
        assessment,
        sanitized_content: sanitizedContent,
        errors,
        warnings,
        metadata: {
          processing_time_ms: processingTime,
          patterns_checked: this.getTotalPatternsChecked(),
          threats_detected: assessment.threats.length,
          mitigations_applied: assessment.mitigations.filter(m => m.applied).length
        }
      };

      this.emit('validation_complete', {
        instruction,
        result,
        processing_time_ms: processingTime
      });

      return result;

    } catch (error) {
      this.emit('validation_error', { instruction, error });
      throw createDandoloError({
        response: {
          status: 500,
          data: {
            error: {
              message: 'Security validation failed',
              type: 'server_error',
              code: 'validation_error',
              details: error.message
            }
          }
        }
      });
    }
  }

  /**
   * Perform comprehensive threat assessment
   */
  private async performThreatAssessment(content: string): Promise<SecurityThreatAssessment> {
    const threats: SecurityThreat[] = [];
    const mitigations: SecurityMitigation[] = [];
    
    // Check each enabled threat type
    for (const threatType of this.config.enabled_threats) {
      const detectedThreats = await this.detectThreatType(content, threatType);
      threats.push(...detectedThreats);
    }

    // Check for excessive length
    if (content.length > this.config.max_content_length) {
      threats.push({
        type: 'excessive_length',
        severity: 'medium',
        description: `Content exceeds maximum length (${content.length} > ${this.config.max_content_length})`,
        evidence: `Content length: ${content.length}`,
        confidence: 1.0
      });
      
      mitigations.push({
        type: 'content_truncation',
        description: 'Truncate content to maximum allowed length',
        applied: false
      });
    }

    // Check for excessive repetition
    const repetitionRatio = this.calculateRepetitionRatio(content);
    if (repetitionRatio > this.config.max_repetition_ratio) {
      threats.push({
        type: 'excessive_repetition',
        severity: 'medium',
        description: `Content has excessive repetition (${(repetitionRatio * 100).toFixed(1)}%)`,
        evidence: `Repetition ratio: ${repetitionRatio}`,
        confidence: 0.8
      });
      
      mitigations.push({
        type: 'input_filtering',
        description: 'Filter repeated content',
        applied: false
      });
    }

    // Calculate overall risk level and security score
    const riskLevel = this.calculateRiskLevel(threats);
    const securityScore = this.calculateSecurityScore(threats, content.length);
    const confidence = this.calculateConfidence(threats);

    // Generate recommendations
    const recommendations = this.generateRecommendations(threats, riskLevel);

    return {
      risk_level: riskLevel,
      confidence,
      threats,
      mitigations,
      security_score: securityScore,
      recommendations
    };
  }

  /**
   * Detect specific threat type in content
   */
  private async detectThreatType(content: string, threatType: SecurityThreatType): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    const patterns = this.THREAT_PATTERNS[threatType];
    
    if (!patterns || patterns.length === 0) {
      return threats;
    }

    for (const pattern of patterns) {
      const matches = Array.from(content.matchAll(pattern));
      
      for (const match of matches) {
        const threat: SecurityThreat = {
          type: threatType,
          severity: this.getThreatSeverity(threatType, match[0]),
          description: this.getThreatDescription(threatType, match[0]),
          pattern: pattern.source,
          location: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length
          },
          evidence: match[0],
          confidence: this.calculatePatternConfidence(pattern, match[0])
        };
        
        threats.push(threat);
      }
    }

    return threats;
  }

  /**
   * Sanitize content based on threat assessment
   */
  private async sanitizeContent(
    content: string,
    assessment: SecurityThreatAssessment
  ): Promise<string> {
    let sanitized = content;
    const appliedMitigations: string[] = [];

    // Apply mitigations based on detected threats
    for (const threat of assessment.threats) {
      switch (threat.type) {
        case 'prompt_injection':
          sanitized = sanitized.replace(new RegExp(threat.pattern || '', 'gi'), '[REDACTED]');
          appliedMitigations.push('pattern_removal');
          break;
          
        case 'script_injection':
          sanitized = this.sanitizeScriptContent(sanitized);
          appliedMitigations.push('content_sanitization');
          break;
          
        case 'credential_exposure':
          sanitized = this.sanitizeCredentials(sanitized);
          appliedMitigations.push('content_sanitization');
          break;
          
        case 'pii_exposure':
          sanitized = this.sanitizePII(sanitized);
          appliedMitigations.push('content_sanitization');
          break;
          
        case 'excessive_length':
          sanitized = sanitized.substring(0, this.config.max_content_length);
          sanitized += '\n[Content truncated for security]';
          appliedMitigations.push('content_truncation');
          break;
      }
    }

    // Apply encoding escapes
    sanitized = this.applyEncodingEscapes(sanitized);
    appliedMitigations.push('encoding_escape');

    // Update mitigation status
    for (const mitigation of assessment.mitigations) {
      if (appliedMitigations.includes(mitigation.type)) {
        mitigation.applied = true;
      }
    }

    return sanitized;
  }

  // Helper methods for content sanitization
  private sanitizeScriptContent(content: string): string {
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT_REMOVED]')
      .replace(/javascript:/gi, 'javascript-disabled:')
      .replace(/vbscript:/gi, 'vbscript-disabled:')
      .replace(/on\w+\s*=/gi, 'on-event-disabled=');
  }

  private sanitizeCredentials(content: string): string {
    return content
      .replace(/password\s*[:=]\s*[\"\']?[^\s\"\']+/gi, 'password=[REDACTED]')
      .replace(/token\s*[:=]\s*[\"\']?[^\s\"\']+/gi, 'token=[REDACTED]')
      .replace(/api[_\-]?key\s*[:=]\s*[\"\']?[^\s\"\']+/gi, 'api-key=[REDACTED]')
      .replace(/secret\s*[:=]\s*[\"\']?[^\s\"\']+/gi, 'secret=[REDACTED]');
  }

  private sanitizePII(content: string): string {
    return content
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, 'XXX-XX-XXXX') // SSN
      .replace(/\b\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\b/g, 'XXXX XXXX XXXX XXXX') // Credit card
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]'); // Email
  }

  private applyEncodingEscapes(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Risk assessment helpers
  private calculateRiskLevel(threats: SecurityThreat[]): 'low' | 'medium' | 'high' | 'critical' {
    if (threats.some(t => t.severity === 'critical')) return 'critical';
    if (threats.some(t => t.severity === 'high')) return 'high';
    if (threats.some(t => t.severity === 'medium')) return 'medium';
    return 'low';
  }

  private calculateSecurityScore(threats: SecurityThreat[], contentLength: number): number {
    let score = 100;
    
    for (const threat of threats) {
      switch (threat.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Penalize for excessive length
    if (contentLength > this.config.max_content_length) {
      score -= Math.min(20, (contentLength - this.config.max_content_length) / 1000);
    }

    return Math.max(0, Math.round(score));
  }

  private calculateConfidence(threats: SecurityThreat[]): number {
    if (threats.length === 0) return 1.0;
    
    const avgConfidence = threats.reduce((sum, t) => sum + t.confidence, 0) / threats.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private calculateRepetitionRatio(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    if (words.length < 10) return 0;
    
    const uniqueWords = new Set(words);
    return 1 - (uniqueWords.size / words.length);
  }

  private shouldBlockContent(assessment: SecurityThreatAssessment): boolean {
    if (this.config.block_critical && assessment.risk_level === 'critical') {
      return true;
    }
    
    if (this.config.block_high && assessment.risk_level === 'high') {
      return true;
    }
    
    return false;
  }

  private getThreatSeverity(threatType: SecurityThreatType, evidence: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalThreats: SecurityThreatType[] = ['prompt_injection', 'code_injection', 'command_injection'];
    const highThreats: SecurityThreatType[] = ['script_injection', 'sql_injection', 'credential_exposure'];
    const mediumThreats: SecurityThreatType[] = ['xss_attempt', 'path_traversal', 'pii_exposure'];
    
    if (criticalThreats.includes(threatType)) return 'critical';
    if (highThreats.includes(threatType)) return 'high';
    if (mediumThreats.includes(threatType)) return 'medium';
    return 'low';
  }

  private getThreatDescription(threatType: SecurityThreatType, evidence: string): string {
    const descriptions: Record<SecurityThreatType, string> = {
      prompt_injection: 'Potential prompt injection attempt detected',
      code_injection: 'Code injection pattern detected',
      script_injection: 'Script injection attempt detected',
      sql_injection: 'SQL injection pattern detected',
      command_injection: 'Command injection attempt detected',
      path_traversal: 'Path traversal attempt detected',
      xss_attempt: 'Cross-site scripting attempt detected',
      credential_exposure: 'Potential credential exposure detected',
      pii_exposure: 'Personally identifiable information detected',
      malicious_url: 'Potentially malicious URL detected',
      excessive_length: 'Content exceeds maximum allowed length',
      excessive_repetition: 'Excessive content repetition detected',
      social_engineering: 'Social engineering pattern detected',
      privilege_escalation: 'Privilege escalation attempt detected',
      data_exfiltration: 'Data exfiltration pattern detected',
      system_manipulation: 'System manipulation attempt detected',
      resource_exhaustion: 'Resource exhaustion pattern detected'
    };
    
    return descriptions[threatType] || 'Security threat detected';
  }

  private calculatePatternConfidence(pattern: RegExp, match: string): number {
    // Simple confidence calculation based on pattern specificity
    const patternLength = pattern.source.length;
    const matchLength = match.length;
    
    // More specific patterns (longer) get higher confidence
    const specificityScore = Math.min(1.0, patternLength / 50);
    
    // Longer matches get higher confidence
    const lengthScore = Math.min(1.0, matchLength / 20);
    
    return Math.round(((specificityScore + lengthScore) / 2) * 100) / 100;
  }

  private generateRecommendations(
    threats: SecurityThreat[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'critical') {
      recommendations.push('Immediately review and sanitize content before processing');
      recommendations.push('Consider implementing stricter security policies');
    }
    
    if (riskLevel === 'high') {
      recommendations.push('Review content for security threats before processing');
      recommendations.push('Enable automatic content sanitization');
    }
    
    const threatTypes = [...new Set(threats.map(t => t.type))];
    
    if (threatTypes.includes('prompt_injection')) {
      recommendations.push('Implement prompt injection detection and prevention');
    }
    
    if (threatTypes.includes('credential_exposure')) {
      recommendations.push('Never include credentials in instruction content');
    }
    
    if (threatTypes.includes('pii_exposure')) {
      recommendations.push('Remove or redact personally identifiable information');
    }

    return recommendations;
  }

  private getTotalPatternsChecked(): number {
    return Object.values(this.THREAT_PATTERNS)
      .reduce((total, patterns) => total + patterns.length, 0);
  }

  private updateValidationStats(processingTime: number, assessment: SecurityThreatAssessment): void {
    this.validationStats.total_validations++;
    this.validationStats.threats_detected += assessment.threats.length;
    
    if (assessment.risk_level === 'critical' || assessment.risk_level === 'high') {
      this.validationStats.content_blocked++;
    }
    
    if (assessment.mitigations.some(m => m.applied)) {
      this.validationStats.content_sanitized++;
    }
    
    const totalTime = this.validationStats.average_processing_time * (this.validationStats.total_validations - 1);
    this.validationStats.average_processing_time = (totalTime + processingTime) / this.validationStats.total_validations;
  }

  /**
   * Update security configuration
   */
  updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config_updated', this.config);
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): typeof this.validationStats {
    return { ...this.validationStats };
  }

  /**
   * Add custom threat pattern
   */
  addCustomThreatPattern(threatType: SecurityThreatType, pattern: RegExp): void {
    if (!this.THREAT_PATTERNS[threatType]) {
      this.THREAT_PATTERNS[threatType] = [];
    }
    
    this.THREAT_PATTERNS[threatType].push(pattern);
    this.emit('custom_pattern_added', { threatType, pattern });
  }

  /**
   * Get available threat types
   */
  getAvailableThreatTypes(): SecurityThreatType[] {
    return Object.keys(this.THREAT_PATTERNS) as SecurityThreatType[];
  }
}

export default SecurityValidator;