# Offline Activation

The Windows local agent supports a simple offline activation flow:

1. Start `backend\local_agent.py`.
2. Clap twice within approximately 0.8 seconds.
3. The existing LiveKit voice worker starts.
4. Say “OK Jarvis, bye” to end the session and stop the worker.

The detector uses the default input device through `sounddevice`. It does not
record or upload audio while waiting for the two-clap activation.
