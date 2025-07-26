"""
CrewAI Integration Example

Shows how to integrate Dandolo with CrewAI for building AI agent crews.
"""

try:
    from crewai import Agent, Task, Crew, LLM
    from crewai.tools import BaseTool
except ImportError:
    print("CrewAI not installed. Install with: pip install crewai")
    exit(1)

import dandolo
import os
from typing import Any


class DandoloLLM(LLM):
    """Custom CrewAI LLM for Dandolo."""
    
    def __init__(self, api_key: str, model: str = "auto-select"):
        self.client = dandolo.Dandolo(api_key=api_key)
        self.model = model
        super().__init__()
    
    def call(self, messages: str) -> str:
        """Make a request to Dandolo API."""
        try:
            # Convert string prompt to messages format
            if isinstance(messages, str):
                messages = [{"role": "user", "content": messages}]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"


class ResearchTool(BaseTool):
    """Custom research tool for demonstration."""
    
    name: str = "Research Tool"
    description: str = "Conducts research on a given topic and provides comprehensive information"
    
    def _run(self, topic: str) -> str:
        # In a real implementation, this would call actual research APIs
        return f"""Research findings on {topic}:
        
        Key Points:
        - This is a comprehensive research result
        - Contains relevant information about {topic}
        - Includes current trends and developments
        - Provides actionable insights
        
        Note: This is a mock research result for demonstration purposes."""


class AnalysisTool(BaseTool):
    """Custom analysis tool for demonstration."""
    
    name: str = "Analysis Tool"
    description: str = "Analyzes data and provides insights"
    
    def _run(self, data: str) -> str:
        # Mock analysis
        return f"""Analysis of provided data:
        
        Summary:
        - Data appears to be about: {data[:100]}...
        - Contains structured information
        - Shows patterns and trends
        - Provides basis for recommendations
        
        Recommendations:
        - Further investigation recommended
        - Consider additional data sources
        - Implement findings in strategy
        
        Note: This is a mock analysis for demonstration purposes."""


def main():
    """Main example function."""
    print("🤖 CrewAI + Dandolo Multi-Agent Crew Example")
    print("=" * 47)
    
    # Get API key
    api_key = os.getenv("DANDOLO_API_KEY", "ak_your_agent_key")
    
    # Initialize Dandolo LLM
    dandolo_llm = DandoloLLM(api_key=api_key)
    
    # Create tools
    research_tool = ResearchTool()
    analysis_tool = AnalysisTool()
    
    # Create agents
    researcher = Agent(
        role="Senior Research Analyst",
        goal="Conduct thorough research on assigned topics and gather comprehensive information",
        backstory="""You are a senior research analyst with expertise in market research,
        competitive analysis, and trend identification. You have access to various research
        tools and databases to gather accurate and up-to-date information.""",
        tools=[research_tool],
        llm=dandolo_llm,
        verbose=True
    )
    
    data_analyst = Agent(
        role="Data Analyst",
        goal="Analyze research data and extract meaningful insights",
        backstory="""You are an experienced data analyst who specializes in interpreting
        research data, identifying patterns, and providing actionable insights. You work
        closely with research teams to transform raw data into strategic recommendations.""",
        tools=[analysis_tool],
        llm=dandolo_llm,
        verbose=True
    )
    
    strategy_advisor = Agent(
        role="Strategy Advisor",
        goal="Develop strategic recommendations based on research and analysis",
        backstory="""You are a senior strategy advisor with extensive experience in
        business strategy, market positioning, and strategic planning. You synthesize
        research and analysis to provide clear, actionable strategic recommendations.""",
        llm=dandolo_llm,
        verbose=True
    )
    
    # Create tasks
    research_task = Task(
        description="""Conduct comprehensive research on the current state of artificial
        intelligence in customer service, including:
        1. Market trends and adoption rates
        2. Key players and technologies
        3. Benefits and challenges
        4. Future predictions
        
        Provide a detailed research report with findings.""",
        agent=researcher,
        expected_output="A comprehensive research report on AI in customer service"
    )
    
    analysis_task = Task(
        description="""Analyze the research findings from the researcher and:
        1. Identify key patterns and trends
        2. Assess market opportunities and threats
        3. Evaluate competitive landscape
        4. Provide data-driven insights
        
        Create an analytical summary with key insights.""",
        agent=data_analyst,
        expected_output="An analytical summary with key insights and patterns",
        depends_on=[research_task]
    )
    
    strategy_task = Task(
        description="""Based on the research and analysis, develop a strategic
        recommendation document that includes:
        1. Strategic opportunities
        2. Implementation roadmap
        3. Risk assessment
        4. Success metrics
        5. Next steps
        
        Provide clear, actionable recommendations.""",
        agent=strategy_advisor,
        expected_output="A strategic recommendation document with actionable insights",
        depends_on=[analysis_task]
    )
    
    # Create and run crew
    crew = Crew(
        agents=[researcher, data_analyst, strategy_advisor],
        tasks=[research_task, analysis_task, strategy_task],
        verbose=True
    )
    
    print("\n🚀 Starting CrewAI execution with Dandolo...")
    print("-" * 45)
    
    try:
        result = crew.kickoff()
        
        print("\n📋 Final Results:")
        print("=" * 20)
        print(result)
        
    except Exception as e:
        print(f"❌ Error during crew execution: {str(e)}")
    
    print("\n✅ CrewAI example completed!")


if __name__ == "__main__":
    main()