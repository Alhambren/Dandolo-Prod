# Dandolo Performance Benchmarking Suite

A comprehensive performance benchmarking and analysis framework for comparing Dandolo against Venice.ai, OpenRoute.ai, and other AI inference providers.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ with ES modules support
- API keys for providers you want to benchmark
- At least 4GB RAM for comprehensive benchmarks

### Environment Setup

```bash
# Set API keys
export DANDOLO_API_KEY="dk_your_dandolo_key"
export VENICE_API_KEY="your_venice_key"
export OPENROUTE_API_KEY="your_openroute_key"

# Install dependencies (if needed)
npm install
```

### Run Your First Benchmark

```bash
# Basic benchmark against Dandolo
node benchmark-runner.js --providers dandolo --load light

# Compare all providers
node benchmark-runner.js --providers dandolo,venice,openroute --load medium

# Full competitive analysis
node competitive-analysis.js --providers dandolo,venice,openroute
```

## 📊 Benchmark Components

### Core Framework (`performance-framework.js`)

The foundation of our benchmarking system with statistical analysis and reporting capabilities.

**Key Features:**
- Statistical metrics collection (p50, p95, p99 response times)
- Throughput measurement (requests/second, tokens/second) 
- Reliability tracking (success rates, error patterns)
- Cost analysis (per request, per token)
- Multi-provider comparison utilities

**Usage Example:**
```javascript
import { BenchmarkRunner, APIClient, CostModel } from './performance-framework.js';

const runner = new BenchmarkRunner();
const client = new APIClient('https://api.example.com', 'api-key');
const costModel = new CostModel(0.001, 0.05, 0.0001); // chat, image, embedding costs

runner.addProvider('TestProvider', client, costModel);
const results = await runner.runComprehensiveBenchmark('medium');
```

### Benchmark Runner (`benchmark-runner.js`)

Enhanced benchmark runner with support for streaming, agents, and multimodal requests.

**Supported Test Types:**
- **Chat Completions**: Standard text generation benchmarks
- **Image Generation**: Visual content creation performance
- **Embeddings**: Vector generation benchmarks  
- **Streaming**: Real-time response capability testing
- **Agent Workflows**: Complex multi-step AI tasks
- **Multimodal**: Combined text, image, and data processing

**Example Scenarios:**
```bash
# Include streaming tests
node benchmark-runner.js --streaming --providers dandolo

# Test agent workflows
node benchmark-runner.js --agents --providers dandolo

# Full multimodal benchmark
node benchmark-runner.js --streaming --agents --multimodal --load heavy
```

### Competitive Analysis (`competitive-analysis.js`)

Comprehensive competitive positioning analysis with market intelligence.

**Analysis Dimensions:**
- **Performance Benchmarks**: Enterprise, developer, and creative workloads
- **Feature Comparison**: Capability matrix across providers
- **Cost Analysis**: Pricing model comparison across usage scenarios
- **Market Positioning**: Strategic positioning and differentiation analysis

**Key Outputs:**
- Executive summary with strategic recommendations
- Detailed competitive positioning matrix
- Performance gap analysis with remediation strategies
- Market opportunity identification

### Continuous Monitoring (`continuous-benchmarking.js`)

Automated benchmark scheduling with performance regression detection.

**Monitoring Modes:**
- **Lightweight**: Every 15 minutes, quick health checks
- **Standard**: Every hour, chat and latency tests
- **Comprehensive**: Every 6 hours, full benchmark suite
- **Competitive**: Every 24 hours, competitive analysis

**Alert Types:**
- Performance regression detection
- Success rate degradation
- Response time threshold breaches
- Cost efficiency warnings

**Usage:**
```bash
# Start continuous monitoring
node continuous-benchmarking.js start --schedule standard

# Check monitoring status
node continuous-benchmarking.js status

# Stop monitoring
node continuous-benchmarking.js stop
```

### Visualization Generator (`visualization-generator.js`)

Interactive dashboard and report generation with comprehensive visualizations.

**Generated Content:**
- HTML dashboard with interactive charts
- Performance trend analysis
- Competitive comparison visualizations
- Statistical analysis charts
- Executive summary reports

**Example:**
```bash
# Generate dashboard from benchmark results
node visualization-generator.js --input results.json --output dashboard.html

# Create PDF report (requires additional dependencies)
node visualization-generator.js --input results.json --format pdf
```

## 📈 Test Scenarios

### Chat Completion Scenarios

1. **Simple Questions** (30% weight)
   - Basic Q&A, calculations
   - Expected: <500ms, 20 tokens

2. **Code Generation** (25% weight)  
   - Function/class implementation
   - Expected: <2s, 150 tokens

3. **Complex Analysis** (20% weight)
   - Business analysis, technical explanations
   - Expected: <5s, 400 tokens

4. **Multi-turn Conversations** (15% weight)
   - Context-aware dialogue
   - Expected: <3s, 200 tokens

5. **Long Context** (10% weight)
   - Document summarization
   - Expected: <8s, 300 tokens

### Image Generation Scenarios

1. **Simple Objects** (40% weight)
   - Basic subjects, clean backgrounds
   - Expected: <15s, 512x512

2. **Complex Scenes** (30% weight)
   - Detailed environments, multiple elements
   - Expected: <30s, 1024x768

3. **Portraits** (20% weight)
   - Human subjects, specific styling
   - Expected: <25s, 768x1024

4. **Artistic Styles** (10% weight)
   - Style transfer, artistic techniques
   - Expected: <45s, 1024x1024

### Streaming Scenarios

1. **Real-time Chat** (40% weight)
   - Continuous narrative generation
   - Expected: <100ms TTFB

2. **Code Generation Stream** (30% weight)
   - Progressive code writing
   - Expected: <200ms TTFB

3. **Data Analysis Stream** (20% weight)
   - Step-by-step analysis
   - Expected: <150ms TTFB

4. **Multi-step Reasoning** (10% weight)
   - Problem-solving workflows
   - Expected: <250ms TTFB

### Agent Workflow Scenarios

1. **Research Agent** (30% weight)
   - Information gathering and synthesis
   - Multi-step workflow execution

2. **Code Review Agent** (25% weight)
   - Security and quality analysis
   - Context-aware evaluation

3. **Multi-Modal Analysis** (25% weight)
   - Combined text and visual processing
   - Cross-modal reasoning

4. **Context-Aware Agent** (20% weight)
   - Persistent memory and context
   - Conversation state management

## 📊 Performance Metrics

### Response Time Metrics
- **Mean**: Average response time across all requests
- **Median (P50)**: 50th percentile response time
- **P95**: 95th percentile (acceptable performance threshold)
- **P99**: 99th percentile (worst-case performance)
- **Standard Deviation**: Response time consistency

### Throughput Metrics
- **Requests/Second**: Sustained request handling capacity
- **Tokens/Second**: Token generation rate for text models
- **Burst Capacity**: Peak throughput under load
- **Concurrent Users**: Maximum simultaneous users

### Reliability Metrics
- **Success Rate**: Percentage of successful requests
- **Error Rate**: Percentage of failed requests
- **Error Patterns**: Types and frequency of errors
- **Failover Time**: Time to recover from provider failures

### Cost Metrics
- **Cost per Request**: Average cost per API call
- **Cost per Token**: Cost efficiency for text generation
- **Cost per Image**: Image generation cost analysis
- **Total Cost of Ownership**: Including infrastructure costs

### Quality Metrics
- **Response Accuracy**: Correctness of generated content
- **Relevance Score**: Alignment with user intent
- **Consistency**: Response quality across similar requests
- **Compliance**: Adherence to content policies

## 🎯 Performance Targets

### Response Time Targets

| Service Type | P50 Target | P95 Target | P99 Target |
|--------------|------------|------------|------------|
| Chat Completions | <1s | <2s | <5s |
| Code Generation | <2s | <5s | <10s |
| Image Generation | <10s | <20s | <30s |
| Embeddings | <500ms | <1s | <2s |
| Streaming TTFB | <100ms | <200ms | <500ms |

### Throughput Targets

| Load Level | Requests/Second | Concurrent Users |
|------------|----------------|------------------|
| Light | 5-10 | 50-100 |
| Medium | 15-25 | 150-250 |
| Heavy | 30-50 | 300-500 |
| Peak | 100+ | 1000+ |

### Reliability Targets

| Metric | Target | Threshold |
|--------|--------|-----------|
| Success Rate | >99% | Alert <95% |
| Error Rate | <1% | Alert >5% |
| Uptime | >99.9% | Alert <99% |
| Failover Time | <1s | Alert >5s |

## 🔄 Benchmark Execution Modes

### Load Levels

**Light Load**
- Concurrency: 1-2 simultaneous requests
- Duration: 2-5 minutes
- Use case: Development testing, quick validation

**Medium Load**  
- Concurrency: 5-10 simultaneous requests
- Duration: 5-15 minutes  
- Use case: Standard performance validation

**Heavy Load**
- Concurrency: 10-20 simultaneous requests
- Duration: 15-30 minutes
- Use case: Stress testing, capacity planning

**Burst Load**
- Concurrency: 50+ simultaneous requests
- Duration: 30 seconds - 2 minutes
- Use case: Peak capacity testing

### Test Types

**Quick Health Check**
```bash
# 2-minute validation
node benchmark-runner.js --providers dandolo --load light
```

**Standard Benchmark**
```bash
# 15-minute comprehensive test
node benchmark-runner.js --providers dandolo,venice --load medium
```

**Competitive Analysis**
```bash
# Full competitive comparison
node competitive-analysis.js --providers dandolo,venice,openroute
```

**Continuous Monitoring**
```bash
# Ongoing performance tracking
node continuous-benchmarking.js start --schedule standard
```

## 📋 Interpreting Results

### Report Structure

```json
{
  "timestamp": "2025-01-23T10:00:00Z",
  "providers": {
    "Dandolo": {
      "responseTime": {
        "min": 245,
        "max": 8934,
        "mean": 1847,
        "median": 1652,
        "p95": 3421,
        "p99": 6234,
        "stdDev": 1123
      },
      "throughput": {
        "requestsPerSecond": 8.3,
        "tokensPerSecond": 145.7
      },
      "reliability": {
        "successRate": 0.987,
        "errorRate": 0.013,
        "totalRequests": 234,
        "errors": 3
      },
      "costs": {
        "totalCost": 0.0234,
        "averageCostPerRequest": 0.0001,
        "costPerToken": 0.000001
      }
    }
  },
  "comparison": { /* competitive analysis */ },
  "recommendations": [ /* optimization suggestions */ ]
}
```

### Key Performance Indicators

**🟢 Excellent Performance**
- P95 response time < target
- Success rate > 99%
- Throughput meets or exceeds target

**🟡 Acceptable Performance**  
- P95 response time within 20% of target
- Success rate > 95%
- Throughput within 80% of target

**🔴 Performance Issues**
- P95 response time > 150% of target
- Success rate < 95%
- Throughput < 80% of target

### Common Performance Patterns

**Provider Selection Bottleneck**
- Symptoms: High variance in response times
- Cause: Inefficient provider routing
- Solution: Implement provider caching and health monitoring

**Capacity Saturation**
- Symptoms: Increasing response times under load
- Cause: Provider capacity limits reached
- Solution: Load balancing and queue management

**Network Latency Issues**
- Symptoms: Consistent high response times
- Cause: Geographic distance or network issues
- Solution: Geographic distribution and CDN usage

## 🛠️ Configuration

### Environment Variables

```bash
# Required API Keys
DANDOLO_API_KEY="dk_your_key"
VENICE_API_KEY="your_key"  
OPENROUTE_API_KEY="your_key"

# Optional Configuration
BENCHMARK_CONCURRENCY=10
BENCHMARK_TIMEOUT=30000
CACHE_SIZE=1000
LOG_LEVEL=info
```

### Configuration Files

**benchmark-config.json**
```json
{
  "providers": {
    "dandolo": {
      "baseUrl": "https://judicious-hornet-148.convex.cloud",
      "rateLimit": 100,
      "timeout": 30000
    }
  },
  "benchmarks": {
    "defaultLoad": "medium",
    "scenarios": ["chat", "image", "embedding"],
    "warmupRequests": 5
  },
  "reporting": {
    "outputDir": "./reports",
    "formats": ["json", "html", "markdown"]
  }
}
```

## 🚨 Troubleshooting

### Common Issues

**Authentication Errors**
```
❌ Invalid API key
```
- Verify API key format (dk_ for Dandolo, etc.)
- Check environment variable names
- Ensure keys have required permissions

**Timeout Errors**
```
❌ Request timeout after 30000ms
```
- Increase timeout in configuration
- Check network connectivity
- Verify provider service status

**Rate Limiting**
```
❌ Rate limit exceeded
```
- Reduce benchmark concurrency
- Implement request spacing
- Upgrade to higher rate limit tier

**Memory Issues**
```
❌ JavaScript heap out of memory
```
- Reduce cache size in configuration
- Lower concurrency levels
- Increase Node.js memory limit: `--max-old-space-size=4096`

### Debug Mode

Enable detailed logging:
```bash
DEBUG=dandolo:benchmark node benchmark-runner.js --providers dandolo --load light
```

### Support

For issues and questions:
1. Check existing GitHub issues
2. Review troubleshooting guide
3. Create detailed issue report with:
   - Benchmark command used
   - Error messages
   - System environment details
   - Expected vs actual behavior

## 📚 Advanced Usage

### Custom Test Scenarios

Create custom test scenarios by extending the base classes:

```javascript
import { TestScenarios } from './benchmark-runner.js';

class CustomTestScenarios extends TestScenarios {
    static getCustomScenarios() {
        return [
            {
                name: "Domain-Specific Query",
                messages: [{ 
                    role: "user", 
                    content: "Explain quantum computing for beginners" 
                }],
                expectedTokens: 300,
                weight: 1.0,
                qualityMetrics: ['accuracy', 'clarity', 'completeness']
            }
        ];
    }
}
```

### Custom Metrics

Add custom performance metrics:

```javascript
import { PerformanceMetrics } from './performance-framework.js';

class CustomMetrics extends PerformanceMetrics {
    addCustomMetric(name, value, tags = {}) {
        // Add custom business logic
        this.customMetrics.set(name, {
            value,
            tags,
            timestamp: Date.now()
        });
    }
}
```

### Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Performance Benchmarks
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run Benchmarks
        env:
          DANDOLO_API_KEY: ${{ secrets.DANDOLO_API_KEY }}
          VENICE_API_KEY: ${{ secrets.VENICE_API_KEY }}
        run: |
          node benchmark-runner.js --providers dandolo,venice --load medium --output benchmark-results.json
          node visualization-generator.js --input benchmark-results.json --output benchmark-dashboard.html
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: |
            benchmark-results.json
            benchmark-dashboard.html
```

## 📈 Performance Optimization

Based on benchmark results, consider these optimization strategies:

### Response Time Optimization
- Implement request caching for common queries
- Use connection pooling for provider requests
- Add geographic load balancing
- Optimize provider selection algorithms

### Throughput Optimization  
- Implement request batching where possible
- Use async/parallel processing
- Add request queuing and prioritization
- Scale horizontally across regions

### Reliability Optimization
- Implement circuit breaker patterns
- Add automatic failover mechanisms
- Use health check-based routing
- Monitor and alert on performance regressions

### Cost Optimization
- Cache expensive operations
- Route to cost-effective providers when appropriate
- Implement usage-based pricing tiers
- Monitor and optimize token usage

## 🔮 Future Enhancements

**Planned Features:**
- Machine learning-based performance prediction
- Automated optimization recommendations
- Real-time competitive intelligence
- Advanced anomaly detection
- Cost optimization algorithms
- Multi-region deployment analysis

**Contribution Areas:**
- Additional provider integrations
- New benchmark scenarios
- Enhanced visualization options
- Performance optimization algorithms
- Cost analysis improvements

---

## 📄 License

This benchmarking suite is part of the Dandolo project. See LICENSE file for details.

## 🤝 Contributing

We welcome contributions! Please see CONTRIBUTING.md for guidelines on:
- Adding new providers
- Creating custom scenarios  
- Improving analysis algorithms
- Enhancing visualizations
- Optimizing performance

---

*Built with ❤️ for the Dandolo AI platform*