from pathlib import Path
import os
import sys
import logging
import threading
import atexit
import asyncio
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
from app.services.agent_status_service import write_agent_heartbeat

logger = logging.getLogger("jarvis.agent")
STOP_PATH = Path(os.getenv("LOCALAPPDATA") or os.getenv("TEMP") or ".") / "Jarvis" / "agent.stop"


def is_shutdown_phrase(transcript: str) -> bool:
    normalized = " ".join(transcript.casefold().split())
    return normalized in {"ok jarvis bye", "okay jarvis bye"}


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=Agent_Instruction,
            tools=ALL_JARVIS_TOOLS,
        )


# One Windows desktop worker is enough for this local assistant. The default
# production configuration starts eight idle processes, which can make a
# desktop machine report itself as fully loaded and reject room jobs.
server = AgentServer(num_idle_processes=1, load_threshold=1.0)


def _start_heartbeat() -> threading.Event:
    stop_event = threading.Event()
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "my-agent")

    def update() -> None:
        while not stop_event.is_set():
            try:
                write_agent_heartbeat("running", agent_name, os.getpid())
            except OSError:
                logger.warning("Unable to write agent heartbeat", exc_info=True)
            stop_event.wait(5)

    thread = threading.Thread(target=update, name="jarvis-heartbeat", daemon=True)
    thread.start()

    def stop() -> None:
        stop_event.set()
        try:
            write_agent_heartbeat("stopped", agent_name, os.getpid())
        except OSError:
            logger.warning("Unable to write final agent heartbeat", exc_info=True)

    atexit.register(stop)
    return stop_event


@server.rtc_session(agent_name=os.getenv("LIVEKIT_AGENT_NAME", "my-agent"))
async def my_agent(ctx: agents.JobContext):
    logger.info("Starting voice session for room %s", ctx.room.name)
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

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event: object) -> None:
        transcript = getattr(event, "transcript", "")
        is_final = getattr(event, "is_final", False)
        if is_final and isinstance(transcript, str) and is_shutdown_phrase(transcript):
            logger.info("Shutdown phrase detected; ending JARVIS.")
            STOP_PATH.parent.mkdir(parents=True, exist_ok=True)
            STOP_PATH.touch()
            asyncio.create_task(session.shutdown())

    await session.generate_reply(
        instructions=Agent_Response
    )
    logger.info("Initial assistant reply requested for room %s", ctx.room.name)


if __name__ == "__main__":
    _start_heartbeat()
    agents.cli.run_app(server)
