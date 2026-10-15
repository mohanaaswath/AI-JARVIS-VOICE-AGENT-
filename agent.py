from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google, noise_cancellation
from prompt import Agent_Response , Agent_Instruction

load_dotenv(".env")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=Agent_Instruction)

server = AgentServer()

@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: agents.JobContext):
    session = AgentSession(
    llm=google.realtime.RealtimeModel(
        voice="Puck",
        temperature=0.8,
        instructions=Agent_Instruction
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