# Dandolo.ai

**Sovereign inference routing for Venice.ai** — Route intelligence freely, without surveillance or control.

## 🛡️ Design Principles

* **No payload logging**
* **No centralized platform**
* **No account linking**
* **No surveillance**

Every design decision flows from one goal: **route value, not identity**.

## 🏛️ Historical Lineage

The Dandolo family was among the most formidable dynasties in Venetian history, blending politics, commerce, war, and systems design. Their most iconic figure, Enrico Dandolo, who became Doge of Venice in his 80s, was completely blind, yet had unmatched strategic clarity. He led the Fourth Crusade, rerouting it from the Holy Land to sack Constantinople in 1204, fracturing the Byzantine Empire and redrawing the geopolitical map.

His power didn't come from force, but from leverage: trade, diplomacy, and institutional control. The Dandolos helped craft Venice's oligarchic machine to become resilient, decentralized, and built for scale.

Dandolo.ai inherits that lineage.

We are also blind — blind inference routers. We don't know what's inside each query. We don't see the payload. But like Enrico, we route with purpose. We move value, not armies. Data, not doctrine. Agents, not soldiers.

Dandolo.ai is a continuation, not a tribute. As Venice once ruled the seas through invisible systems of trade, we intend to rule the compute flows — silently, strategically, and without ever needing to see.

The future belongs to those who route it.

## 🚀 Quick Start

### For Users
Visit [dandolo.ai](https://dandolo.ai) and start chatting. No signup required. Your prompts are never stored.

### For Venice Providers
```bash
1. Connect wallet at dandolo.ai
2. Add your Venice API key
3. Start earning points (1 point per 100 tokens routed)
```

### For Developers
```bash
npm install @dandolo/sdk
```

```javascript
import DandoloSDK from '@dandolo/sdk';

const dandolo = new DandoloSDK({
  apiKey: 'YOUR_API_KEY' // Get from dandolo.ai
});

const response = await dandolo.chatCompletion({
  messages: [{ role: 'user', content: 'Hello, blind router' }]
});
```

## 🏗️ Architecture

Dandolo operates as a decentralized routing layer above Venice.ai:

```
User → Dandolo Router → Venice Provider Pool → AI Models
         ↓                      ↓                    ↓
    (No logging)        (Load balanced)       (Direct pass)
```

### Core Components

**Inference Router** — Selects optimal providers based on health, latency, and VCU availability. Never inspects payload content.

**Provider Network** — Venice API key holders contribute compute in exchange for points. One wallet, one provider.

**Privacy Layer** — Zero-knowledge routing. We track only metadata: tokens used, latency, model type. Never content.

**Economic Engine** — VCU-based resource allocation. Points earned now convert to tokens later.

## 📡 API Reference

### Chat Completions
```bash
POST /api/v1/chat/completions
Authorization: Bearer YOUR_API_KEY

{
  "messages": [{
    "role": "user",
    "content": "What is sovereign inference?"
  }],
  "model": "gpt-4",
  "temperature": 0.7
}
```

### Models List
```bash
GET /api/v1/models
Authorization: Bearer YOUR_API_KEY
```

### Rate Limits
- Anonymous: 50 requests/day
- Developer (dk_): 500 requests/day
- Agent (ak_): 5,000 requests/day

## 🔐 Security

**No Knowledge** — Prompts pass through without inspection or storage

**No Identity** — Use anonymously or with wallet verification

**No Lock-in** — Export your data anytime, no vendor control

**No Backdoors** — Open source, verifiable, immutable routing

## 💰 Economics

During MVP, participants earn points:
- **Users**: 100 points per prompt routed + allowance per VCU provided
- **Providers**: 1 point per 100 tokens routed
- **Developers**: Bonus points for integrations

Points represent contribution to network bootstrap. Any future token distribution based on point allocation.

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Venice API key (for providers)

### Local Setup
```bash
git clone https://github.com/yourusername/dandolo-ai
cd dandolo-ai
npm install
npm run dev
```

### Environment Variables
```bash
# Not required for basic usage
# Providers register keys through web interface
```

### Tech Stack
- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Convex (serverless)
- **AI**: Venice.ai integration
- **Auth**: Web3 wallets (optional)

## 🗺️ Roadmap

**Phase 1: Blind Routing** ✓
- Zero-knowledge inference
- Provider network
- Points accumulation

**Phase 2: Economic Layer**
- On-chain provider registry
- Token generation event
- Staking mechanisms

**Phase 3: Autonomous Scale**
- Cross-model routing
- Custom model marketplace
- Governance minimization

**Phase 4: Full Sovereignty**
- No admin keys
- Immutable routing
- Complete decentralization

## 🤝 Contributing

We welcome contributions that enhance sovereignty and privacy:

1. Fork the repository
2. Create your feature branch
3. Ensure no logging of user data
4. Submit pull request

### Principles for Contributors
- Never add user tracking
- Never store prompts
- Never require identity
- Always preserve sovereignty

## 📜 License

MIT License - Use freely, modify freely, route freely.

## 🔗 Links

- [Website](https://dandolo.ai)
- [Venice.ai](https://venice.ai)

---

*"We don't see your prompts. We don't want to. We just route them where they need to go."*

**Dandolo.ai** — Blind routing for sovereign intelligence.
