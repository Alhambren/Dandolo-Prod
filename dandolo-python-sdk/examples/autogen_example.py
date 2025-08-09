"""
AutoGen Integration Example

Shows how to integrate Dandolo with Microsoft AutoGen for multi-agent conversations.
"""

import autogen
import dandolo
import os
from typing import Dict, Any, List


class DandoloAutoGenLLM:
    """Custom AutoGen LLM client for Dandolo."""
    
    def __init__(self, api_key: str, model: str = "auto-select"):
        self.client = dandolo.Dandolo(api_key=api_key)
        self.model = model
    
    def create_completion(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Create a completion compatible with AutoGen."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get("max_tokens", 1000),
                temperature=kwargs.get("temperature", 0.7)
            )
            
            # Format response for AutoGen
            return {
                "choices": [{
                    "message": {
                        "content": response.choices[0].message.content,
                        "role": "assistant"
                    },
                    "finish_reason": "stop"
                }],
                "usage": {
                    "total_tokens": response.usage.total_tokens if response.usage else 0
                }
            }
        except Exception as e:
            return {
                "choices": [{
                    "message": {
                        "content": f"Error: {str(e)}",
                        "role": "assistant"
                    },
                    "finish_reason": "error"
                }]
            }


def create_dandolo_config(api_key: str) -> List[Dict[str, Any]]:
    """Create AutoGen config for Dandolo."""
    return [{
        "model": "dandolo-auto-select",
        "api_key": api_key,
        "base_url": "https://api.dandolo.ai/v1",
        "api_type": "dandolo"
    }]


def main():
    """Main example function."""
    print("🤖 AutoGen + Dandolo Multi-Agent Example")
    print("=" * 45)
    
    # Get API key
    api_key = os.getenv("DANDOLO_API_KEY", "ak_your_agent_key")
    
    # Create LLM client
    dandolo_llm = DandoloAutoGenLLM(api_key=api_key)
    
    # Create custom completion function
    def dandolo_completion(messages, **kwargs):
        response = dandolo_llm.create_completion(messages, **kwargs)
        return response
    
    # Configure LLM config for agents
    llm_config = {
        "config_list": create_dandolo_config(api_key),
        "timeout": 60,
        "cache_seed": 42,
        "temperature": 0.7
    }
    
    # Create assistant agent
    assistant = autogen.AssistantAgent(
        name="AI_Assistant",
        system_message="""You are a helpful AI assistant. You can help with various tasks including:
        - Answering questions
        - Writing code
        - Analyzing data
        - Creative writing
        Always be helpful and provide detailed responses.""",
        llm_config=llm_config
    )
    
    # Create user proxy agent (represents human user)
    user_proxy = autogen.UserProxyAgent(
        name="User",
        human_input_mode="NEVER",  # Set to "ALWAYS" for interactive mode
        max_consecutive_auto_reply=3,
        is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
        code_execution_config={
            "work_dir": "autogen_workspace",
            "use_docker": False  # Set to True if you have Docker
        }
    )
    
    # Create a code reviewer agent
    code_reviewer = autogen.AssistantAgent(
        name="Code_Reviewer",
        system_message="""You are a senior software engineer who reviews code for:
        - Correctness
        - Best practices
        - Security issues
        - Performance optimizations
        Provide constructive feedback and suggestions.""",
        llm_config=llm_config
    )
    
    # Example 1: Simple conversation
    print("\n📝 Example 1: Simple AI Conversation")
    print("-" * 35)
    
    user_proxy.initiate_chat(
        assistant,
        message="Write a Python function to calculate the factorial of a number recursively."
    )
    
    # Example 2: Multi-agent code review
    print("\n🔍 Example 2: Multi-Agent Code Review")
    print("-" * 37)
    
    # Create a group chat with multiple agents
    groupchat = autogen.GroupChat(
        agents=[user_proxy, assistant, code_reviewer],
        messages=[],
        max_round=6
    )
    
    manager = autogen.GroupChatManager(
        groupchat=groupchat,
        llm_config=llm_config
    )
    
    user_proxy.initiate_chat(
        manager,
        message="""Please write a Python class for a simple banking system with methods to:
        1. Create an account
        2. Deposit money
        3. Withdraw money
        4. Check balance
        
        After writing the code, please review it for best practices and security."""
    )
    
    print("\n✅ AutoGen example completed!")


if __name__ == "__main__":
    main()