"""
LangChain Integration Example

Shows how to integrate Dandolo with LangChain for building AI agents.
"""

from langchain.llms.base import LLM
from langchain.schema import BaseMessage
from langchain.agents import initialize_agent, AgentType, Tool
from langchain.memory import ConversationBufferMemory
import dandolo
import os


class DandoloLLM(LLM):
    """Custom LangChain LLM wrapper for Dandolo."""
    
    def __init__(self, api_key: str, model: str = "auto-select", **kwargs):
        super().__init__(**kwargs)
        self.client = dandolo.Dandolo(api_key=api_key)
        self.model = model
    
    @property
    def _llm_type(self) -> str:
        return "dandolo"
    
    def _call(self, prompt: str, stop=None) -> str:
        """Make a request to Dandolo API."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"


def create_search_tool():
    """Create a mock search tool for demonstration."""
    def search(query: str) -> str:
        # In a real implementation, this would call a search API
        return f"Search results for '{query}': This is a mock search result."
    
    return Tool(
        name="Search",
        description="Search for information on the internet",
        func=search
    )


def create_calculator_tool():
    """Create a calculator tool."""
    def calculate(expression: str) -> str:
        try:
            # Safe evaluation for basic math
            result = eval(expression, {"__builtins__": {}}, {})
            return f"The result of {expression} is {result}"
        except Exception as e:
            return f"Error calculating {expression}: {str(e)}"
    
    return Tool(
        name="Calculator",
        description="Perform mathematical calculations",
        func=calculate
    )


def main():
    """Main example function."""
    # Initialize Dandolo LLM
    api_key = os.getenv("DANDOLO_API_KEY", "ak_your_agent_key")
    llm = DandoloLLM(api_key=api_key)
    
    # Create tools
    tools = [
        create_search_tool(),
        create_calculator_tool()
    ]
    
    # Initialize memory
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )
    
    # Initialize agent
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
        memory=memory,
        verbose=True
    )
    
    # Example conversation
    print("🤖 LangChain + Dandolo Agent Example")
    print("=" * 40)
    
    questions = [
        "What is 25 * 37?",
        "Search for information about quantum computing",
        "Can you calculate the square root of 144 and then search for information about that number?"
    ]
    
    for question in questions:
        print(f"\n👤 User: {question}")
        try:
            response = agent.run(question)
            print(f"🤖 Agent: {response}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    print("\n✅ Example completed!")


if __name__ == "__main__":
    main()