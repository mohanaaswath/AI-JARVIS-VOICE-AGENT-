# Implementation Roadmap

## Milestone 1 — Analysis and runnable foundation

- [x] Inspect the existing repository and document actual behavior.
- [x] Preserve the current LiveKit voice path.
- [ ] Add a local-agent status/control boundary.
- [ ] Add explicit worker lifecycle and single-instance handling.
- [x] Add safe website opening through the registered assistant tool.
- [x] Add an independent worker supervisor with single-instance locking and
  restart recovery.

## Milestone 2 — Independent Windows agent

- [x] Add a user-session process that can run without the dashboard.
- [x] Add health state, graceful shutdown, restart handling, and structured logs.
- [x] Add a per-user startup registration command.
- Add tray controls after the process lifecycle is stable.

## Milestone 3 — Local speech loop

- Evaluate/install an offline wake-word engine.
- Add microphone selection, mute, sensitivity, and privacy state.
- Add speech-to-text and text-to-speech adapters with clear fallbacks.
- Keep cloud LiveKit as an optional dashboard voice mode.

## Milestone 4 — Desktop capabilities

- Extend file and folder operations within configured roots.
- Add application discovery and safe window operations.
- Add controlled Playwright workflows and browser tab management.
- Add system controls only through verified adapters.

## Milestone 5 — Orchestration and dashboard

- Add structured intent/tool orchestration and conversation context.
- Add local authentication, WebSocket events, reconnection, and timeouts.
- Add dashboard pages for agent status, files, apps, browser tasks, and history.

## Milestone 6 — Security, tests, and acceptance

- Add tests for every adapter and policy boundary.
- Add isolated destructive-operation tests.
- Add setup, security, API, wake-word, and testing documentation.
- Run the Windows acceptance checklist and report any untested item.

## Current limitation

The full specification cannot be honestly marked complete from static code
changes alone. Microphone, wake-word, browser automation, startup-after-reboot,
and Windows tray behavior require real Windows integration tests.
