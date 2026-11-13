# Offline “Hello Jarvis” Activation

The Windows background agent listens for the spoken phrase “Hello Jarvis” with
Vosk and the default microphone. Audio recognition runs locally. The first
launch downloads the small English model to `%LOCALAPPDATA%\Jarvis\models`;
later launches reuse it. There is no clap activation fallback.

When the phrase is recognized, JARVIS speaks “Yes, I am here. How can I help
you?” through the Windows speech synthesizer and starts the LiveKit worker.
The current full voice conversation still requires the web app's LiveKit
session to be connected.

To start listening automatically at Windows sign-in, enable the
“JARVIS Auto Start” scheduled task. `setup-jarvis-autostart.bat` registers it.
