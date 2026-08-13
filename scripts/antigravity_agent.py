import os
import sys
import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
from google.antigravity.utils.interactive import run_interactive_loop

async def run_single_prompt(prompt: str):
    """Executes a single prompt with real-time thought and response streaming."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[Warning] GEMINI_API_KEY environment variable is not set.")
        print("Please set GEMINI_API_KEY before running standalone SDK scripts.")
        print("Example: $env:GEMINI_API_KEY='your_api_key_here'")
        return

    print(f"\n[Antigravity Agent] Prompt: {prompt}\n" + "-"*50)
    
    config = LocalAgentConfig(
        api_key=api_key,
        system_instructions="You are an expert AI engineer for VillageLink Super App.",
        capabilities=CapabilitiesConfig()
    )

    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        
        # Stream response tokens
        async for token in response:
            sys.stdout.write(token)
            sys.stdout.flush()
        print("\n" + "-"*50)


async def main():
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
        await run_single_prompt(prompt)
    else:
        print("Starting Interactive Antigravity SDK Session...")
        config = LocalAgentConfig(capabilities=CapabilitiesConfig())
        async with Agent(config) as agent:
            await run_interactive_loop(agent)

if __name__ == "__main__":
    asyncio.run(main())
