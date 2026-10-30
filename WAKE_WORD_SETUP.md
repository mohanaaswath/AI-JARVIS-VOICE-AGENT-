# Wake Word Setup

Wake-word support is not implemented in the current repository. The existing
voice view starts a browser microphone session and the LiveKit worker handles
the conversation.

The planned local flow is:

1. Run an offline detector for `Hey Jarvis`.
2. Capture one command after activation.
3. Transcribe locally or through the configured voice provider.
4. Execute only validated tools.
5. Verify the result and speak the response.
6. Return to standby.

The detector, sensitivity controls, microphone selection, mute state, and
privacy indicator must be tested on Windows before this feature is enabled by
default.
