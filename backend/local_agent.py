"""Compatibility entrypoint for the current Windows voice agent."""
from voice.background_agent import main


if __name__ == "__main__":
    raise SystemExit(main())
