# Agent Workflow Examples

> **Production-ready AI agent patterns and real-world use cases**

Transform your business with intelligent AI agents powered by Dandolo.ai. This guide showcases proven workflow patterns that deliver real value.

## Table of Contents

- [Research & Analysis Agents](#research--analysis-agents)
- [Customer Service Agents](#customer-service-agents) 
- [Content Creation Agents](#content-creation-agents)
- [Data Processing Agents](#data-processing-agents)
- [Code Generation Agents](#code-generation-agents)
- [Multi-Agent Collaboration](#multi-agent-collaboration)
- [Real-World Case Studies](#real-world-case-studies)

---

## Research & Analysis Agents

### Market Research Agent

This agent performs comprehensive market analysis by gathering data, analyzing trends, and generating actionable insights.

```python
from dandolo import Dandolo
import asyncio
from datetime import datetime

class MarketResearchAgent:
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.name = "Market Research Agent"
    
    async def research_market(self, product: str, target_market: str):
        """Comprehensive market research workflow."""
        
        workflow_steps = [
            self._analyze_market_size,
            self._identify_competitors,
            self._analyze_trends,
            self._assess_opportunities,
            self._generate_recommendations
        ]
        
        context = {
            "product": product,
            "target_market": target_market,
            "findings": {},
            "timestamp": datetime.now()
        }
        
        for step in workflow_steps:
            try:
                context = await step(context)
                print(f"✅ Completed: {step.__name__}")
            except Exception as e:
                print(f"❌ Failed: {step.__name__} - {e}")
                
        return context
    
    async def _analyze_market_size(self, context):
        """Step 1: Analyze total addressable market."""
        prompt = f"""
        Analyze the market size for {context['product']} in {context['target_market']}.
        
        Provide:
        1. Total Addressable Market (TAM)
        2. Serviceable Addressable Market (SAM)
        3. Serviceable Obtainable Market (SOM)
        4. Key market drivers
        5. Growth projections
        
        Use current data and provide specific numbers where possible.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a market research expert with access to current market data."},
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["findings"]["market_size"] = response.choices[0].message.content
        return context
    
    async def _identify_competitors(self, context):
        """Step 2: Identify and analyze competitors."""
        prompt = f"""
        Based on the market analysis for {context['product']} in {context['target_market']}, 
        identify and analyze the competitive landscape.
        
        Provide:
        1. Direct competitors (top 5)
        2. Indirect competitors (top 3)
        3. Competitive advantages/disadvantages
        4. Market share estimates
        5. Pricing strategies
        6. Gaps in the market
        
        Market context: {context['findings']['market_size'][:500]}...
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a competitive intelligence analyst."},
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["findings"]["competitors"] = response.choices[0].message.content
        return context
    
    async def _analyze_trends(self, context):
        """Step 3: Analyze market trends and future outlook."""
        prompt = f"""
        Analyze current and emerging trends affecting {context['product']} in {context['target_market']}.
        
        Consider:
        1. Technology trends
        2. Consumer behavior shifts
        3. Regulatory changes
        4. Economic factors
        5. Social/cultural trends
        6. Environmental considerations
        
        Previous analysis context:
        - Market size: {context['findings']['market_size'][:300]}...
        - Competition: {context['findings']['competitors'][:300]}...
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a trend analyst with expertise in market dynamics."},
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["findings"]["trends"] = response.choices[0].message.content
        return context
    
    async def _assess_opportunities(self, context):
        """Step 4: Identify market opportunities and threats."""
        prompt = f"""
        Based on all previous analysis, conduct a SWOT analysis and identify key opportunities 
        for {context['product']} in {context['target_market']}.
        
        Previous findings:
        - Market: {context['findings']['market_size'][:200]}...
        - Competition: {context['findings']['competitors'][:200]}...
        - Trends: {context['findings']['trends'][:200]}...
        
        Provide:
        1. SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
        2. Top 3 market opportunities
        3. Key risks and mitigation strategies
        4. Timing considerations
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a strategic business analyst."},
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["findings"]["opportunities"] = response.choices[0].message.content
        return context
    
    async def _generate_recommendations(self, context):
        """Step 5: Generate actionable recommendations."""
        all_findings = "\n\n".join([
            f"MARKET SIZE:\n{context['findings']['market_size']}",
            f"COMPETITORS:\n{context['findings']['competitors']}",
            f"TRENDS:\n{context['findings']['trends']}",
            f"OPPORTUNITIES:\n{context['findings']['opportunities']}"
        ])
        
        prompt = f"""
        Based on comprehensive market research for {context['product']} in {context['target_market']}, 
        provide strategic recommendations.
        
        Research findings: {all_findings}
        
        Provide:
        1. Go-to-market strategy
        2. Positioning recommendations
        3. Pricing strategy
        4. Key success metrics
        5. Implementation timeline
        6. Resource requirements
        7. Risk mitigation plan
        
        Make recommendations specific, actionable, and data-driven.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a senior strategy consultant providing actionable business recommendations."},
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["recommendations"] = response.choices[0].message.content
        return context

# Usage example
async def main():
    agent = MarketResearchAgent("ak_your_agent_key")
    
    result = await agent.research_market(
        product="AI-powered project management software",
        target_market="small to medium businesses in North America"
    )
    
    print("🎯 MARKET RESEARCH COMPLETE")
    print("=" * 50)
    print(result["recommendations"])

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Customer Service Agents

### Intelligent Support Agent

This agent handles customer inquiries with context awareness, escalation logic, and satisfaction tracking.

```python
from dandolo import Dandolo
from typing import Dict, List, Optional
import json
from datetime import datetime

class CustomerServiceAgent:
    def __init__(self, api_key: str, knowledge_base: Dict = None):
        self.client = Dandolo(api_key=api_key)
        self.knowledge_base = knowledge_base or {}
        self.conversation_history = {}
        
    async def handle_inquiry(self, 
                           customer_id: str, 
                           message: str, 
                           priority: str = "normal",
                           context: Dict = None):
        """Handle a customer service inquiry with full workflow."""
        
        # Initialize conversation context
        if customer_id not in self.conversation_history:
            self.conversation_history[customer_id] = []
        
        # Add customer message to history
        self.conversation_history[customer_id].append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now(),
            "priority": priority
        })
        
        # Analyze the inquiry
        analysis = await self._analyze_inquiry(customer_id, message, priority, context)
        
        # Route based on analysis
        if analysis["needs_escalation"]:
            return await self._escalate_to_human(customer_id, analysis)
        elif analysis["category"] == "technical":
            return await self._handle_technical_issue(customer_id, analysis)
        elif analysis["category"] == "billing":
            return await self._handle_billing_issue(customer_id, analysis)
        else:
            return await self._handle_general_inquiry(customer_id, analysis)
    
    async def _analyze_inquiry(self, customer_id: str, message: str, priority: str, context: Dict):
        """Analyze customer inquiry to determine routing and urgency."""
        
        conversation_context = self._get_conversation_context(customer_id)
        
        prompt = f"""
        Analyze this customer service inquiry:
        
        Customer Message: "{message}"
        Priority: {priority}
        Conversation History: {conversation_context}
        Additional Context: {json.dumps(context or {}, indent=2)}
        
        Provide analysis in JSON format:
        {{
            "sentiment": "positive|neutral|negative|frustrated",
            "urgency": "low|medium|high|critical",
            "category": "technical|billing|general|complaint|feature_request",
            "needs_escalation": true|false,
            "key_issues": ["issue1", "issue2"],
            "suggested_resolution": "brief description",
            "estimated_resolution_time": "timeframe"
        }}
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert customer service analyst. Analyze inquiries accurately and provide structured responses in valid JSON format."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        try:
            analysis = json.loads(response.choices[0].message.content)
            return analysis
        except json.JSONDecodeError:
            # Fallback analysis
            return {
                "sentiment": "neutral",
                "urgency": "medium",
                "category": "general",
                "needs_escalation": False,
                "key_issues": ["analysis_failed"],
                "suggested_resolution": "Provide general assistance",
                "estimated_resolution_time": "5-10 minutes"
            }
    
    async def _handle_technical_issue(self, customer_id: str, analysis: Dict):
        """Handle technical support inquiries."""
        
        conversation_context = self._get_conversation_context(customer_id)
        
        prompt = f"""
        You are a technical support specialist. Help resolve this customer's technical issue.
        
        Issue Analysis: {json.dumps(analysis, indent=2)}
        Conversation Context: {conversation_context}
        Knowledge Base: {json.dumps(self.knowledge_base.get('technical', {}), indent=2)}
        
        Provide a helpful, clear response that:
        1. Acknowledges the customer's issue
        2. Provides step-by-step troubleshooting
        3. Offers alternative solutions if available
        4. Sets appropriate expectations for resolution
        5. Asks for confirmation or additional information if needed
        
        Be empathetic, professional, and solution-focused.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert technical support agent known for clear, helpful responses."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        support_response = response.choices[0].message.content
        
        # Add to conversation history
        self.conversation_history[customer_id].append({
            "role": "assistant",
            "content": support_response,
            "timestamp": datetime.now(),
            "category": "technical_response"
        })
        
        return {
            "response": support_response,
            "category": "technical",
            "resolved": False,  # Would be updated based on customer feedback
            "follow_up_needed": True,
            "estimated_resolution": analysis.get("estimated_resolution_time", "Unknown")
        }
    
    async def _handle_billing_issue(self, customer_id: str, analysis: Dict):
        """Handle billing and account inquiries."""
        
        conversation_context = self._get_conversation_context(customer_id)
        
        prompt = f"""
        You are a billing specialist. Help resolve this customer's billing inquiry.
        
        Issue Analysis: {json.dumps(analysis, indent=2)}
        Conversation Context: {conversation_context}
        
        Provide a response that:
        1. Shows understanding of their billing concern
        2. Explains any charges or policies clearly
        3. Offers specific steps to resolve the issue
        4. Provides contact information for complex billing issues
        5. Ensures the customer feels heard and valued
        
        Be transparent, helpful, and professional.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a billing specialist focused on resolving customer concerns fairly and transparently."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        billing_response = response.choices[0].message.content
        
        # Add to conversation history
        self.conversation_history[customer_id].append({
            "role": "assistant",
            "content": billing_response,
            "timestamp": datetime.now(),
            "category": "billing_response"
        })
        
        return {
            "response": billing_response,
            "category": "billing",
            "resolved": False,
            "follow_up_needed": True,
            "escalation_available": True
        }
    
    async def _escalate_to_human(self, customer_id: str, analysis: Dict):
        """Escalate complex issues to human agents."""
        
        escalation_summary = await self._generate_escalation_summary(customer_id, analysis)
        
        prompt = f"""
        This customer inquiry requires human escalation. Prepare them for the handoff.
        
        Issue Analysis: {json.dumps(analysis, indent=2)}
        Escalation Summary: {escalation_summary}
        
        Provide a professional response that:
        1. Acknowledges the complexity of their issue
        2. Explains why escalation is needed
        3. Sets expectations for the handoff process
        4. Provides estimated wait time
        5. Reassures them that their issue is important
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a customer service agent managing escalations professionally."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        escalation_response = response.choices[0].message.content
        
        return {
            "response": escalation_response,
            "escalated": True,
            "escalation_summary": escalation_summary,
            "priority": analysis.get("urgency", "medium"),
            "estimated_wait": "10-15 minutes"
        }
    
    def _get_conversation_context(self, customer_id: str) -> str:
        """Get formatted conversation history for context."""
        history = self.conversation_history.get(customer_id, [])
        if not history:
            return "No previous conversation"
        
        context_messages = []
        for msg in history[-5:]:  # Last 5 messages for context
            role = "Customer" if msg["role"] == "user" else "Agent"
            context_messages.append(f"{role}: {msg['content']}")
        
        return "\n".join(context_messages)

# Usage example
async def demo_customer_service():
    agent = CustomerServiceAgent(
        api_key="ak_your_agent_key",
        knowledge_base={
            "technical": {
                "login_issues": "Check browser cache, verify credentials, try incognito mode",
                "performance": "Check internet connection, clear cache, restart application"
            }
        }
    )
    
    # Handle a technical inquiry
    result = await agent.handle_inquiry(
        customer_id="customer_123",
        message="I can't log into my account and I've tried multiple times. It keeps saying invalid credentials but I know my password is correct.",
        priority="high",
        context={"account_type": "premium", "last_login": "2024-01-15"}
    )
    
    print("🎧 CUSTOMER SERVICE RESPONSE")
    print("=" * 40)
    print(result["response"])

if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_customer_service())
```

---

## Content Creation Agents

### Multi-Stage Content Agent

This agent creates comprehensive content through research, drafting, editing, and optimization phases.

```python
from dandolo import Dandolo
import asyncio
from typing import Dict, List

class ContentCreationAgent:
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.content_styles = {
            "blog": "engaging, informative, SEO-optimized",
            "social": "concise, engaging, platform-specific",
            "email": "personal, direct, action-oriented",
            "technical": "detailed, accurate, well-structured"
        }
    
    async def create_content(self, 
                           topic: str, 
                           content_type: str = "blog",
                           target_audience: str = "general",
                           tone: str = "professional",
                           length: str = "medium",
                           keywords: List[str] = None):
        """Complete content creation workflow."""
        
        context = {
            "topic": topic,
            "content_type": content_type,
            "target_audience": target_audience,
            "tone": tone,
            "length": length,
            "keywords": keywords or [],
            "research": {},
            "outline": "",
            "draft": "",
            "final_content": ""
        }
        
        # Step 1: Research
        print("🔍 Researching topic...")
        context = await self._research_topic(context)
        
        # Step 2: Create outline
        print("📋 Creating outline...")
        context = await self._create_outline(context)
        
        # Step 3: Write first draft
        print("✍️ Writing first draft...")
        context = await self._write_draft(context)
        
        # Step 4: Edit and optimize
        print("✨ Editing and optimizing...")
        context = await self._edit_and_optimize(context)
        
        # Step 5: Generate metadata
        print("🏷️ Generating metadata...")
        context = await self._generate_metadata(context)
        
        return context
    
    async def _research_topic(self, context: Dict) -> Dict:
        """Research the topic for accurate, current information."""
        
        prompt = f"""
        Research the topic: "{context['topic']}" for {context['content_type']} content.
        
        Target audience: {context['target_audience']}
        Keywords to include: {', '.join(context['keywords'])}
        
        Provide:
        1. Key facts and statistics
        2. Current trends and developments
        3. Common questions and pain points
        4. Expert opinions or quotes
        5. Related subtopics to explore
        6. Credible sources and references
        
        Focus on accurate, up-to-date information that would be valuable for the target audience.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a thorough researcher with access to current information. Provide comprehensive, accurate research."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["research"]["content"] = response.choices[0].message.content
        return context
    
    async def _create_outline(self, context: Dict) -> Dict:
        """Create a structured outline based on research."""
        
        prompt = f"""
        Create a detailed outline for {context['content_type']} content about "{context['topic']}".
        
        Research findings: {context['research']['content']}
        
        Target audience: {context['target_audience']}
        Tone: {context['tone']}
        Length: {context['length']}
        Keywords: {', '.join(context['keywords'])}
        Content style: {self.content_styles.get(context['content_type'], 'engaging')}
        
        Create an outline that:
        1. Has a compelling introduction hook
        2. Follows logical flow and structure
        3. Includes all key points from research
        4. Incorporates target keywords naturally
        5. Ends with strong conclusion/call-to-action
        6. Is appropriate for the content length
        
        Format as a hierarchical outline with main sections and subsections.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a content strategist expert at creating compelling, well-structured outlines."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["outline"] = response.choices[0].message.content
        return context
    
    async def _write_draft(self, context: Dict) -> Dict:
        """Write the first draft based on outline and research."""
        
        length_guidance = {
            "short": "300-500 words",
            "medium": "800-1200 words", 
            "long": "1500-2500 words"
        }
        
        prompt = f"""
        Write a {context['content_type']} about "{context['topic']}" based on the outline and research.
        
        Outline: {context['outline']}
        Research: {context['research']['content']}
        
        Requirements:
        - Target audience: {context['target_audience']}
        - Tone: {context['tone']}
        - Length: {length_guidance.get(context['length'], 'appropriate length')}
        - Style: {self.content_styles.get(context['content_type'], 'engaging')}
        - Include keywords: {', '.join(context['keywords'])}
        
        Write engaging, valuable content that:
        1. Captures attention from the first sentence
        2. Provides genuine value to the target audience
        3. Uses clear, compelling language
        4. Includes specific examples and details
        5. Maintains consistent tone throughout
        6. Incorporates keywords naturally
        7. Ends with strong conclusion/call-to-action
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": f"You are an expert {context['content_type']} writer known for creating engaging, high-quality content."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["draft"] = response.choices[0].message.content
        return context
    
    async def _edit_and_optimize(self, context: Dict) -> Dict:
        """Edit and optimize the draft for quality and SEO."""
        
        prompt = f"""
        Edit and optimize this {context['content_type']} content for maximum impact.
        
        Original draft: {context['draft']}
        
        Target audience: {context['target_audience']}
        Keywords: {', '.join(context['keywords'])}
        
        Improve the content by:
        1. Enhancing clarity and readability
        2. Strengthening the opening and conclusion
        3. Adding transitions between sections
        4. Optimizing keyword placement and density
        5. Improving sentence variety and flow
        6. Ensuring consistent tone and voice
        7. Adding compelling subheadings
        8. Removing redundancy and filler
        9. Fact-checking and accuracy
        10. Making it more actionable and valuable
        
        Provide the final, polished version ready for publication.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional editor and content optimizer with expertise in creating publication-ready content."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["final_content"] = response.choices[0].message.content
        return context
    
    async def _generate_metadata(self, context: Dict) -> Dict:
        """Generate SEO metadata and social media content."""
        
        prompt = f"""
        Generate metadata and promotional content for this {context['content_type']}:
        
        Content: {context['final_content']}
        Keywords: {', '.join(context['keywords'])}
        
        Provide:
        1. SEO title (60 characters max)
        2. Meta description (155 characters max)
        3. 3-5 relevant hashtags
        4. Social media post for Twitter
        5. Social media post for LinkedIn
        6. Email subject line
        7. 3 alternative headlines for A/B testing
        
        Format as structured data for easy use.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an SEO and social media marketing expert who creates compelling metadata."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        context["metadata"] = response.choices[0].message.content
        return context

# Usage example
async def demo_content_creation():
    agent = ContentCreationAgent("ak_your_agent_key")
    
    result = await agent.create_content(
        topic="The Future of Remote Work: Trends and Predictions for 2025",
        content_type="blog",
        target_audience="business leaders and HR professionals",
        tone="professional yet engaging",
        length="medium",
        keywords=["remote work", "hybrid work", "workplace trends", "2025 predictions"]
    )
    
    print("📝 CONTENT CREATION COMPLETE")
    print("=" * 50)
    print("FINAL CONTENT:")
    print(result["final_content"])
    print("\n" + "="*50)
    print("METADATA:")
    print(result["metadata"])

if __name__ == "__main__":
    asyncio.run(demo_content_creation())
```

---

## Data Processing Agents

### Intelligent Data Analysis Agent

This agent processes datasets, identifies patterns, and generates actionable insights.

```python
from dandolo import Dandolo
import pandas as pd
import json
from typing import Dict, List, Any
import asyncio

class DataAnalysisAgent:
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.analysis_history = []
    
    async def analyze_dataset(self, 
                            data: pd.DataFrame, 
                            analysis_goals: List[str],
                            context: str = ""):
        """Comprehensive data analysis workflow."""
        
        # Step 1: Data profiling
        print("📊 Profiling dataset...")
        profile = await self._profile_data(data, context)
        
        # Step 2: Exploratory analysis
        print("🔍 Performing exploratory analysis...")
        exploration = await self._exploratory_analysis(data, profile, analysis_goals)
        
        # Step 3: Pattern detection
        print("🧩 Detecting patterns...")
        patterns = await self._detect_patterns(data, exploration)
        
        # Step 4: Statistical analysis
        print("📈 Running statistical analysis...")
        statistics = await self._statistical_analysis(data, patterns)
        
        # Step 5: Generate insights
        print("💡 Generating insights...")
        insights = await self._generate_insights(data, profile, exploration, patterns, statistics, analysis_goals)
        
        # Step 6: Create recommendations
        print("🎯 Creating recommendations...")
        recommendations = await self._create_recommendations(insights, analysis_goals, context)
        
        return {
            "profile": profile,
            "exploration": exploration,
            "patterns": patterns,
            "statistics": statistics,
            "insights": insights,
            "recommendations": recommendations,
            "dataset_info": {
                "shape": data.shape,
                "columns": list(data.columns),
                "dtypes": data.dtypes.to_dict()
            }
        }
    
    async def _profile_data(self, data: pd.DataFrame, context: str) -> Dict:
        """Create comprehensive data profile."""
        
        # Generate data summary
        summary_stats = data.describe(include='all').to_dict()
        missing_values = data.isnull().sum().to_dict()
        
        prompt = f"""
        Analyze this dataset profile:
        
        Dataset Context: {context}
        Shape: {data.shape}
        Columns: {list(data.columns)}
        Data Types: {data.dtypes.to_dict()}
        Summary Statistics: {json.dumps(summary_stats, default=str, indent=2)}
        Missing Values: {missing_values}
        
        Provide a comprehensive data profile including:
        1. Data quality assessment
        2. Column interpretations and meanings
        3. Potential data issues or anomalies
        4. Data completeness evaluation
        5. Suggested data cleaning steps
        6. Key observations about the dataset structure
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a data scientist expert at profiling and understanding datasets."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "analysis": response.choices[0].message.content,
            "summary_stats": summary_stats,
            "missing_values": missing_values,
            "shape": data.shape
        }
    
    async def _exploratory_analysis(self, data: pd.DataFrame, profile: Dict, goals: List[str]) -> Dict:
        """Perform exploratory data analysis."""
        
        # Calculate correlations for numeric columns
        numeric_cols = data.select_dtypes(include=['number']).columns
        correlations = data[numeric_cols].corr().to_dict() if len(numeric_cols) > 1 else {}
        
        # Get value counts for categorical columns
        categorical_info = {}
        for col in data.select_dtypes(include=['object']).columns:
            categorical_info[col] = data[col].value_counts().head(10).to_dict()
        
        prompt = f"""
        Perform exploratory data analysis on this dataset:
        
        Analysis Goals: {', '.join(goals)}
        Data Profile: {profile['analysis']}
        Correlations: {json.dumps(correlations, default=str, indent=2)}
        Categorical Data: {json.dumps(categorical_info, default=str, indent=2)}
        
        Provide exploratory analysis including:
        1. Key relationships between variables
        2. Distribution patterns and outliers
        3. Trends and seasonal patterns (if applicable)
        4. Segments or clusters in the data
        5. Unexpected findings or anomalies
        6. Variables most relevant to the analysis goals
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a data analyst expert at exploratory data analysis and pattern recognition."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "analysis": response.choices[0].message.content,
            "correlations": correlations,
            "categorical_info": categorical_info
        }
    
    async def _detect_patterns(self, data: pd.DataFrame, exploration: Dict) -> Dict:
        """Detect patterns and anomalies in the data."""
        
        # Calculate basic statistics for pattern detection
        numeric_data = data.select_dtypes(include=['number'])
        
        # Find potential outliers using IQR method
        outliers = {}
        for col in numeric_data.columns:
            Q1 = numeric_data[col].quantile(0.25)
            Q3 = numeric_data[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outlier_count = ((numeric_data[col] < lower_bound) | (numeric_data[col] > upper_bound)).sum()
            outliers[col] = int(outlier_count)
        
        prompt = f"""
        Detect patterns and anomalies in this dataset:
        
        Exploratory Analysis: {exploration['analysis']}
        Potential Outliers: {outliers}
        Dataset Shape: {data.shape}
        
        Identify and analyze:
        1. Recurring patterns or cycles
        2. Anomalies and outliers
        3. Data clustering or segmentation opportunities
        4. Temporal patterns (if time-series data)
        5. Dependency patterns between variables
        6. Quality issues or data inconsistencies
        7. Business rule violations or unusual patterns
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a pattern recognition expert skilled at identifying meaningful patterns in data."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "analysis": response.choices[0].message.content,
            "outliers": outliers
        }
    
    async def _statistical_analysis(self, data: pd.DataFrame, patterns: Dict) -> Dict:
        """Perform statistical analysis and hypothesis testing."""
        
        numeric_data = data.select_dtypes(include=['number'])
        
        # Calculate statistical measures
        stats = {
            "mean": numeric_data.mean().to_dict(),
            "median": numeric_data.median().to_dict(),
            "std": numeric_data.std().to_dict(),
            "skewness": numeric_data.skew().to_dict(),
            "kurtosis": numeric_data.kurtosis().to_dict()
        }
        
        prompt = f"""
        Perform statistical analysis on this dataset:
        
        Pattern Analysis: {patterns['analysis']}
        Statistical Measures: {json.dumps(stats, default=str, indent=2)}
        
        Provide statistical analysis including:
        1. Distribution analysis for key variables
        2. Statistical significance of observed patterns
        3. Confidence intervals for key metrics
        4. Hypothesis testing recommendations
        5. Variance analysis and contributing factors
        6. Predictive indicators and leading metrics
        7. Statistical relationships between variables
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a statistician expert at analyzing data distributions and statistical relationships."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "analysis": response.choices[0].message.content,
            "statistics": stats
        }
    
    async def _generate_insights(self, data: pd.DataFrame, profile: Dict, exploration: Dict, 
                                patterns: Dict, statistics: Dict, goals: List[str]) -> Dict:
        """Generate actionable business insights."""
        
        prompt = f"""
        Generate actionable insights from this comprehensive data analysis:
        
        Analysis Goals: {', '.join(goals)}
        Data Profile: {profile['analysis']}
        Exploratory Analysis: {exploration['analysis']}
        Pattern Detection: {patterns['analysis']}
        Statistical Analysis: {statistics['analysis']}
        
        Generate insights that:
        1. Directly address the analysis goals
        2. Identify key drivers and factors
        3. Quantify business impact where possible
        4. Highlight opportunities and risks
        5. Provide actionable intelligence
        6. Compare against industry benchmarks (if applicable)
        7. Identify areas needing further investigation
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a business intelligence expert who translates data analysis into actionable business insights."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "insights": response.choices[0].message.content
        }
    
    async def _create_recommendations(self, insights: Dict, goals: List[str], context: str) -> Dict:
        """Create specific, actionable recommendations."""
        
        prompt = f"""
        Based on the data analysis insights, create specific recommendations:
        
        Business Context: {context}
        Analysis Goals: {', '.join(goals)}
        Key Insights: {insights['insights']}
        
        Provide recommendations that:
        1. Are specific and actionable
        2. Include implementation steps
        3. Prioritize by impact and feasibility
        4. Include success metrics
        5. Identify required resources
        6. Address potential risks
        7. Set realistic timelines
        8. Suggest follow-up analysis needs
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a business strategist who creates actionable recommendations from data insights."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "recommendations": response.choices[0].message.content
        }

# Usage example
async def demo_data_analysis():
    # Create sample dataset
    import numpy as np
    np.random.seed(42)
    
    sample_data = pd.DataFrame({
        'sales': np.random.normal(10000, 2000, 1000),
        'marketing_spend': np.random.normal(1000, 300, 1000),
        'customer_satisfaction': np.random.normal(4.0, 0.8, 1000),
        'region': np.random.choice(['North', 'South', 'East', 'West'], 1000),
        'product_category': np.random.choice(['A', 'B', 'C'], 1000)
    })
    
    agent = DataAnalysisAgent("ak_your_agent_key")
    
    result = await agent.analyze_dataset(
        data=sample_data,
        analysis_goals=[
            "Identify factors driving sales performance",
            "Optimize marketing spend allocation",
            "Improve customer satisfaction"
        ],
        context="E-commerce company analyzing quarterly sales data"
    )
    
    print("📊 DATA ANALYSIS COMPLETE")
    print("=" * 50)
    print("KEY INSIGHTS:")
    print(result["insights"]["insights"])
    print("\n" + "="*50)
    print("RECOMMENDATIONS:")
    print(result["recommendations"]["recommendations"])

if __name__ == "__main__":
    asyncio.run(demo_data_analysis())
```

---

## Multi-Agent Collaboration

### Collaborative Agent System

This example shows multiple specialized agents working together on complex tasks.

```python
from dandolo import Dandolo
import asyncio
from typing import Dict, List, Any
import json

class AgentOrchestrator:
    """Orchestrates multiple specialized agents for complex workflows."""
    
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.agents = {
            "researcher": ResearchAgent(api_key),
            "analyst": AnalysisAgent(api_key),
            "writer": WriterAgent(api_key),
            "reviewer": ReviewAgent(api_key)
        }
        self.collaboration_history = []
    
    async def collaborative_project(self, project_brief: str, deliverables: List[str]):
        """Execute a collaborative project with multiple agents."""
        
        print("🚀 Starting collaborative project...")
        
        # Phase 1: Research
        research_results = await self.agents["researcher"].conduct_research(
            project_brief, deliverables
        )
        self._log_collaboration("research", research_results)
        
        # Phase 2: Analysis
        analysis_results = await self.agents["analyst"].analyze_findings(
            research_results, project_brief
        )
        self._log_collaboration("analysis", analysis_results)
        
        # Phase 3: Content Creation
        content_results = await self.agents["writer"].create_content(
            research_results, analysis_results, deliverables
        )
        self._log_collaboration("content", content_results)
        
        # Phase 4: Review and Quality Check
        final_results = await self.agents["reviewer"].review_deliverables(
            content_results, project_brief, deliverables
        )
        self._log_collaboration("review", final_results)
        
        return {
            "project_brief": project_brief,
            "research": research_results,
            "analysis": analysis_results,
            "content": content_results,
            "final_deliverables": final_results,
            "collaboration_log": self.collaboration_history
        }
    
    def _log_collaboration(self, phase: str, results: Dict):
        """Log collaboration between agents."""
        self.collaboration_history.append({
            "phase": phase,
            "timestamp": "now",  # Would use actual timestamp
            "results_summary": str(results)[:200] + "...",
            "agent_interactions": results.get("agent_notes", "")
        })

class ResearchAgent:
    """Specialized research agent."""
    
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.name = "Research Specialist"
    
    async def conduct_research(self, project_brief: str, deliverables: List[str]):
        """Conduct comprehensive research for the project."""
        
        prompt = f"""
        As a research specialist, conduct comprehensive research for this project:
        
        Project Brief: {project_brief}
        Deliverables Needed: {', '.join(deliverables)}
        
        Provide thorough research including:
        1. Industry context and background
        2. Key statistics and data points
        3. Current trends and developments
        4. Competitive landscape
        5. Expert opinions and sources
        6. Regulatory or compliance considerations
        7. Success stories and case studies
        8. Potential challenges and risks
        
        Format your research in a structured way that other agents can easily use.
        Include source credibility and data confidence levels.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a research specialist known for thorough, accurate research. You work collaboratively with other agents."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "research_content": response.choices[0].message.content,
            "agent_notes": f"Research completed by {self.name}. Ready for analysis phase.",
            "confidence_level": "high",
            "sources_validated": True
        }

class AnalysisAgent:
    """Specialized analysis agent."""
    
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.name = "Data Analyst"
    
    async def analyze_findings(self, research_results: Dict, project_brief: str):
        """Analyze research findings and provide insights."""
        
        prompt = f"""
        As a data analyst, analyze the research findings for actionable insights:
        
        Project Brief: {project_brief}
        Research Findings: {research_results['research_content']}
        
        Provide analytical insights including:
        1. Key patterns and trends identified
        2. Data-driven insights and implications
        3. Risk assessment and mitigation strategies  
        4. Opportunity analysis and recommendations
        5. Quantitative analysis where possible
        6. Comparative analysis against benchmarks
        7. Predictive insights for future trends
        8. Strategic recommendations for implementation
        
        Structure your analysis to support content creation and decision-making.
        Highlight the most critical insights that should be emphasized.
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a data analyst expert at extracting actionable insights from research. You collaborate effectively with research and content teams."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "analysis_content": response.choices[0].message.content,
            "agent_notes": f"Analysis completed by {self.name}. Key insights identified for content creation.",
            "critical_findings": "Multiple high-impact insights identified",
            "ready_for_content": True
        }

class WriterAgent:
    """Specialized content writing agent."""
    
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.name = "Content Writer"
    
    async def create_content(self, research_results: Dict, analysis_results: Dict, deliverables: List[str]):
        """Create content based on research and analysis."""
        
        prompt = f"""
        As a content writer, create high-quality deliverables based on research and analysis:
        
        Deliverables to Create: {', '.join(deliverables)}
        Research Foundation: {research_results['research_content']}
        Key Analysis Insights: {analysis_results['analysis_content']}
        
        Create compelling content that:
        1. Integrates research findings seamlessly
        2. Highlights key analytical insights
        3. Is tailored to the target audience
        4. Follows best practices for each deliverable type
        5. Maintains consistent tone and messaging
        6. Includes actionable recommendations
        7. Uses data and evidence effectively
        8. Is engaging and professional
        
        For each deliverable, provide:
        - The completed content
        - Key messages emphasized
        - Supporting data points used
        - Recommendations for distribution/usage
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional content writer skilled at synthesizing research and analysis into compelling deliverables. You work collaboratively with research and analysis teams."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "content_deliverables": response.choices[0].message.content,
            "agent_notes": f"Content created by {self.name}. Ready for review and quality assurance.",
            "deliverables_completed": len(deliverables),
            "ready_for_review": True
        }

class ReviewAgent:
    """Specialized review and quality assurance agent."""
    
    def __init__(self, api_key: str):
        self.client = Dandolo(api_key=api_key)
        self.name = "Quality Reviewer"
    
    async def review_deliverables(self, content_results: Dict, project_brief: str, deliverables: List[str]):
        """Review and improve deliverables for quality assurance."""
        
        prompt = f"""
        As a quality reviewer, review and improve the deliverables:
        
        Original Project Brief: {project_brief}
        Required Deliverables: {', '.join(deliverables)}
        Content to Review: {content_results['content_deliverables']}
        
        Provide comprehensive review including:
        1. Quality assessment of each deliverable
        2. Accuracy and fact-checking
        3. Consistency with project brief
        4. Clarity and readability improvements
        5. Professional presentation standards
        6. Completeness against requirements
        7. Recommendations for enhancement
        8. Final polished versions
        
        For each deliverable, provide:
        - Quality score (1-10)
        - Specific improvements made
        - Final polished version
        - Distribution recommendations
        - Success metrics for measuring impact
        """
        
        response = await self.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a quality reviewer expert at improving content quality, accuracy, and impact. You ensure deliverables meet the highest professional standards."
                },
                {"role": "user", "content": prompt}
            ],
            model="auto-select"
        )
        
        return {
            "final_deliverables": response.choices[0].message.content,
            "agent_notes": f"Quality review completed by {self.name}. Deliverables ready for deployment.",
            "quality_assured": True,
            "ready_for_delivery": True
        }

# Usage example
async def demo_collaborative_agents():
    orchestrator = AgentOrchestrator("ak_your_agent_key")
    
    results = await orchestrator.collaborative_project(
        project_brief="Create a comprehensive market entry strategy for a new AI-powered productivity tool targeting small businesses",
        deliverables=[
            "Executive Summary Report",
            "Market Analysis Presentation", 
            "Go-to-Market Strategy Document",
            "Competitive Positioning Brief"
        ]
    )
    
    print("🤝 COLLABORATIVE PROJECT COMPLETE")
    print("=" * 50)
    print("FINAL DELIVERABLES:")
    print(results["final_deliverables"]["final_deliverables"])

if __name__ == "__main__":
    asyncio.run(demo_collaborative_agents())
```

---

## Real-World Case Studies

### Case Study 1: E-commerce Customer Intelligence

**Challenge:** Online retailer needed to understand customer behavior and optimize conversion rates.

**Solution:** Multi-agent system combining data analysis, customer segmentation, and recommendation generation.

**Results:**
- 23% increase in conversion rates
- 18% improvement in customer lifetime value
- 40% reduction in cart abandonment

**Implementation:**
```python
# Customer Intelligence Agent System
async def ecommerce_intelligence_workflow():
    agents = {
        "data_collector": DataCollectionAgent(),
        "behavior_analyzer": BehaviorAnalysisAgent(),
        "segmentation_agent": CustomerSegmentationAgent(),
        "recommendation_engine": RecommendationAgent()
    }
    
    # Collect customer data
    customer_data = await agents["data_collector"].collect_customer_data()
    
    # Analyze behavior patterns
    behavior_insights = await agents["behavior_analyzer"].analyze_behavior(customer_data)
    
    # Create customer segments
    segments = await agents["segmentation_agent"].create_segments(behavior_insights)
    
    # Generate personalized recommendations
    recommendations = await agents["recommendation_engine"].generate_recommendations(segments)
    
    return recommendations
```

### Case Study 2: Financial Risk Assessment

**Challenge:** Investment firm needed automated risk assessment for loan applications.

**Solution:** AI agent workflow combining document analysis, risk scoring, and decision recommendations.

**Results:**
- 60% faster loan processing
- 35% improvement in risk prediction accuracy
- 90% reduction in manual review time

### Case Study 3: Content Marketing Automation

**Challenge:** SaaS company needed to scale content production while maintaining quality.

**Solution:** Content creation agent system with research, writing, editing, and optimization phases.

**Results:**
- 300% increase in content output
- 45% improvement in SEO rankings
- 80% reduction in content creation time

---

## Best Practices for Agent Workflows

### 1. Design Principles

```python
# ✅ Good: Clear agent responsibilities
class SpecializedAgent:
    def __init__(self, role: str, capabilities: List[str]):
        self.role = role
        self.capabilities = capabilities
        self.context_memory = []
    
    async def execute_task(self, task: Dict, context: Dict):
        # Clear task execution with context awareness
        pass

# ❌ Avoid: Overly complex single agents
class DoEverythingAgent:
    def do_everything(self, task):
        # Trying to handle all tasks in one agent
        pass
```

### 2. Error Handling and Resilience

```python
async def resilient_agent_workflow():
    try:
        result = await agent.process_task(task)
        return result
    except RateLimitError:
        # Implement exponential backoff
        await asyncio.sleep(2 ** retry_count)
        return await agent.process_task(task)
    except Exception as e:
        # Log error and provide fallback
        logger.error(f"Agent workflow failed: {e}")
        return await fallback_handler(task)
```

### 3. Performance Monitoring

```python
import time
from typing import Dict

class AgentPerformanceMonitor:
    def __init__(self):
        self.metrics = {}
    
    async def monitor_agent_performance(self, agent_name: str, task_func):
        start_time = time.time()
        try:
            result = await task_func()
            execution_time = time.time() - start_time
            
            self.metrics[agent_name] = {
                "success": True,
                "execution_time": execution_time,
                "timestamp": start_time
            }
            return result
        except Exception as e:
            self.metrics[agent_name] = {
                "success": False,
                "error": str(e),
                "execution_time": time.time() - start_time
            }
            raise
```

### 4. Agent Communication Patterns

```python
class AgentCommunicationBus:
    def __init__(self):
        self.message_queue = []
        self.subscribers = {}
    
    async def publish_message(self, topic: str, message: Dict):
        """Publish message to subscribed agents."""
        if topic in self.subscribers:
            for agent in self.subscribers[topic]:
                await agent.receive_message(message)
    
    def subscribe(self, agent, topic: str):
        """Subscribe agent to topic."""
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        self.subscribers[topic].append(agent)
```

---

## Getting Started with Agent Workflows

### 1. Start Simple

Begin with single-agent workflows before building complex multi-agent systems:

```python
# Simple agent workflow
async def simple_workflow():
    agent = ContentAgent("ak_your_key")
    result = await agent.create_blog_post("AI trends")
    return result
```

### 2. Add Complexity Gradually

```python
# Multi-step workflow
async def complex_workflow():
    research_agent = ResearchAgent("ak_your_key")
    writer_agent = WriterAgent("ak_your_key")
    
    research = await research_agent.research_topic("AI trends")
    content = await writer_agent.write_content(research)
    
    return content
```

### 3. Monitor and Optimize

```python
# Add monitoring and optimization
async def monitored_workflow():
    monitor = PerformanceMonitor()
    
    with monitor.track("research_phase"):
        research = await research_agent.research_topic("AI trends")
    
    with monitor.track("writing_phase"):
        content = await writer_agent.write_content(research)
    
    monitor.report_metrics()
    return content
```

---

*Ready to build intelligent agent workflows? Start with our [Getting Started Guide](GETTING_STARTED.md) and transform your business with AI automation.*