from pathlib import Path
import os
import sys
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "frontend" / ".env", override=True)

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google, noise_cancellation
from prompt import Agent_Response, Agent_Instruction
from tools import ALL_JARVIS_TOOLS


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=Agent_Instruction,
            tools=ALL_JARVIS_TOOLS,
        )


server = AgentServer()


@server.rtc_session(agent_name=os.getenv("LIVEKIT_AGENT_NAME", "my-agent"))
async def my_agent(ctx: agents.JobContext):
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            voice="Puck",
            temperature=0.7,
            instructions=Agent_Instruction,
        ),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.NC(),
            ),
        ),
    )

    await session.generate_reply(
        instructions=Agent_Response
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
