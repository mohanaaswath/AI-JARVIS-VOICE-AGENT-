Important prompt : use this prompt to build this ai assistant 

Technology : Python and Frontend  


# Project: Build a Full-Stack Web Application for My Existing Python AI Personal Assistant

Act as a senior full-stack developer, AI engineer, UI/UX designer, and software architect. Build a complete, functional, production-oriented web application for my existing Python AI personal assistant.

## 1. Existing Project Context

I have already built a Python AI voice assistant. My existing code includes:

- `agent.py` — uses LiveKit Agents, `AgentServer`, `AgentSession`, and Google's Realtime voice model.
- `prompt.py` — contains `Agent_Instruction` and `Agent_Response`.
- Existing agent instructions support logical reasoning, task planning, computer automation, error handling, result verification, privacy, and security.

Your first responsibility is to inspect my existing codebase and understand its architecture.

**Do not replace my working Python assistant with a new implementation.** Integrate the existing assistant into the web application, preserve its behavior, and modify existing files only when necessary.

Do not assume that laptop-control functionality already works unless you find the implementation in the provided source code.

## 2. Technology Stack

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Framer Motion for subtle animations

Backend:
- Python
- FastAPI
- Existing LiveKit Agents implementation
- WebSocket or LiveKit WebRTC for realtime communication, as appropriate

Data and authentication:
- Use Supabase for authentication and persistent chat history if these features are implemented.
- Keep credentials in environment variables.
- If Supabase is not configured, provide a clearly documented local development option.

## 3. UI/UX Design

Create a premium, modern AI assistant interface inspired by high-quality AI products.

Design requirements:
- Dark black and deep navy background.
- Purple, electric blue, and cyan accent colors.
- Subtle gradients and glassmorphism.
- Clean typography, consistent spacing, and rounded components.
- Responsive desktop, tablet, and mobile layouts.
- Light and dark theme support if practical.
- Smooth, restrained animations.
- Proper loading states, error messages, empty states, and connection indicators.

Avoid clutter, excessive glowing effects, and unnecessary animations.

## 4. Application Layout

Build the following interface:

### A. Sidebar
- Assistant logo and application name.
- New conversation button.
- Recent conversation history.
- Search conversations.
- Settings.
- User profile section.
- Collapse and expand controls.

### B. Main Chat Interface
- Welcome screen with a personalized greeting.
- Suggested prompts for common tasks.
- User and assistant message bubbles.
- Markdown rendering and code syntax highlighting.
- Copy response button.
- Regenerate response button where supported.
- Stop generation button where supported.
- Clear indication of assistant activity.
- Message timestamps where useful.
- Auto-scroll that does not interrupt users reading older messages.

### C. Voice Assistant Interface
- Microphone activation button.
- Start and end conversation controls.
- Microphone permission handling.
- Realtime voice connection status.
- Animated audio visualization or waveform.
- Speaking, listening, connecting, and disconnected states.
- Clear error handling when microphone access or network connectivity fails.

Use the existing LiveKit Agents implementation for realtime voice. Prefer a supported LiveKit client connection with temporary, server-generated access tokens. Do not expose LiveKit API secrets in frontend code.

Do not pretend that browser speech recognition or text-to-speech is the same as my existing realtime voice assistant.

### D. Dashboard
Create a simple dashboard containing:
- Total conversations.
- Recent activity.
- Quick actions.
- Assistant connection status.
- Shortcuts to chat and voice mode.

Only display genuine values from the backend. Do not fabricate statistics.

### E. Settings
Include:
- Theme selection.
- Voice preferences when supported.
- Conversation history controls.
- Assistant connection information.
- Clear error feedback for unavailable settings.

## 5. Backend Architecture

Create a maintainable Python backend using FastAPI.

Suggested structure:

backend/
  app/
    main.py
    config.py
    api/
      health.py
      chat.py
      livekit.py
      conversations.py
    services/
      assistant_service.py
      livekit_service.py
      conversation_service.py
    schemas/
    core/
    db/
  agent.py
  prompt.py
  requirements.txt
  .env.example

Adapt this structure to my existing project rather than blindly duplicating files.

Implement:
- `GET /api/health` for backend health.
- `POST /api/chat` for text conversations, provided the existing agent supports a reliable text interaction path.
- `GET /api/conversations` for retrieving saved conversations when persistence is configured.
- `POST /api/conversations` for creating a conversation when persistence is configured.
- Appropriate conversation retrieval and deletion endpoints.
- A secure endpoint for issuing short-lived LiveKit access tokens.
- Proper request validation and consistent JSON error responses.
- Logging and exception handling.
- CORS configured for explicitly allowed frontend origins.
- Configuration through environment variables.

IMPORTANT: Inspect the installed LiveKit Agents SDK and my existing code to determine the correct integration. Do not invent SDK methods, assume an incompatible API, or start a second competing agent server.

If text chat requires a separate agent session or supported messaging transport, implement that deliberately and document the decision.

If any capability cannot be integrated safely, explain the limitation instead of returning fake success responses.

## 6. Connect the Existing Python Assistant

Preserve the instructions from `prompt.py` and the agent configuration in `agent.py`.

The web interface must communicate with the real Python backend.

Requirements:
- Keep one clear source of truth for assistant instructions.
- Reuse the existing voice model and LiveKit agent configuration.
- Avoid duplicating business logic in the frontend.
- Display actual backend responses.
- Show meaningful errors when an AI provider, LiveKit connection, or network request fails.
- Ensure session lifecycle and cleanup are handled correctly.
- Do not expose provider API keys to the browser.
- Keep voice streaming and text chat as distinct integration paths when required.

## 7. Laptop Control and Automation Security

My assistant is intended to support computer automation. If my existing project contains laptop-control functionality, integrate it through a secure backend interface.

Do not allow a website to execute arbitrary operating-system commands simply because a user submits a chat message.

Implement appropriate safeguards:
- Explicit permission before sensitive or destructive actions.
- Allowlisted automation operations.
- Input validation and command restrictions.
- Visible execution status and actual results.
- Timeouts and error recovery.
- Authentication and authorization for privileged actions.
- No silent execution of dangerous commands.
- No exposure of environment variables, credentials, or private files.

If laptop control is only available in a local Python process, explain the difference between a cloud-hosted web app and a local desktop agent. Do not claim that a cloud server can directly control my personal laptop.

## 8. Database and Persistence

If Supabase is configured, design tables for:
- Users.
- Conversations.
- Messages.
- Creation and update timestamps.

Requirements:
- Enable appropriate Row Level Security policies.
- Ensure users can only access their own records.
- Never put Supabase service-role credentials in frontend code.
- Do not store secrets in conversation history.
- Include SQL migrations or schema setup instructions.

If persistence is not configured, make the application usable locally and clearly explain what is temporary.

## 9. Error Handling and Reliability

Implement:
- API request timeouts.
- Connection state handling.
- Loading indicators.
- Recoverable errors.
- Microphone permission errors.
- LiveKit connection failures.
- Invalid input handling.
- AI provider quota and authentication error handling.
- Safe cleanup on disconnect.
- Useful backend logs without sensitive data.

Never hardcode fake AI responses or mark an operation successful without verifying the result.

## 10. Development and Deployment

Provide:
- Complete frontend and backend source code.
- `frontend/.env.example`.
- `backend/.env.example`.
- Dependency files.
- A `.gitignore`.
- Setup instructions for Windows.
- Commands to install dependencies and run the frontend and backend separately.
- Required environment variable documentation.
- Local development instructions.
- Production deployment guidance.
- API documentation.
- Basic tests for important backend endpoints and frontend behavior.

Make sure the application can run locally using separate frontend and backend processes.

Do not commit `.env` files or API keys.

## 11. Implementation Workflow

Follow these phases in order:

Phase 1: Inspect all provided files, dependencies, and existing assistant capabilities.

Phase 2: Explain the integration architecture and identify any compatibility problems.

Phase 3: Create the frontend structure and premium responsive UI.

Phase 4: Implement the FastAPI backend and integrate the existing assistant.

Phase 5: Connect text chat, LiveKit voice, conversation persistence, and supported automation features.

Phase 6: Test API endpoints, connection lifecycle, errors, security controls, and UI behavior.

Phase 7: Provide exact setup commands, environment variables, and deployment instructions.

After each phase, verify the implementation before continuing.

## Final Requirements

I do not want only a UI mockup or a tutorial. I want working source code that integrates with my existing Python assistant.

Prioritize a functional end-to-end implementation over unnecessary features.

Do not silently skip incomplete features, fabricate integrations, or claim that tests passed without running them.

At completion, report:
1. Files created or modified.
2. Features that actually work.
3. Features requiring API keys or external configuration.
4. Tests executed and their results.
5. Exact commands to launch the application.
6. Remaining limitations and the next steps to resolve them.
