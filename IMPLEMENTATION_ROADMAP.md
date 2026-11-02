# Implementation Roadmap

## Milestone 1 — Analysis and runnable foundation

- [x] Inspect the existing repository and document actual behavior.
- [x] Preserve the current LiveKit voice path.
- [x] Add a local-agent status/control boundary.
- [x] Add explicit worker lifecycle and single-instance handling.
- [x] Add safe website opening through the registered assistant tool.
- [x] Add an independent worker supervisor with single-instance locking and
  restart recovery.

## Milestone 2 — Independent Windows agent

- [x] Add a user-session process that can run without the dashboard.
- [x] Add health state, graceful shutdown, restart handling, and structured logs.
- [x] Add a per-user startup registration command.
- [x] Add optional tray controls after the process lifecycle is stable.

## Milestone 3 — Local speech loop

- [ ] Verify and select an offline wake-word engine for both required phrases.
- [x] Add microphone mute, sensitivity, and privacy state boundaries.
- [ ] Add offline speech-to-text and text-to-speech adapters.
- [ ] Keep cloud LiveKit as an optional dashboard voice mode.

## Milestone 4 — Desktop capabilities

- [ ] Extend file and folder operations within configured roots.
- [ ] Add application discovery and safe window operations.
- [ ] Add controlled Playwright workflows and browser tab management.
- [x] Keep system controls behind verified adapters.

## Milestone 5 — Orchestration and dashboard

- [ ] Add a native local LiveKit microphone/audio client.
- [ ] Add local authentication, WebSocket events, reconnection, and timeouts.
- [ ] Add dashboard pages for agent status, files, apps, browser tasks, and history.

## Milestone 6 — Security, tests, and acceptance

- [ ] Add tests for every adapter and policy boundary.
- [ ] Add isolated destructive-operation tests.
- [ ] Add setup, security, API, wake-word, and testing documentation.
- [ ] Run the Windows acceptance checklist and report any untested item.

## Current limitations

The full specification is not complete. The background process starts and
supervises the LiveKit worker, but it does not yet provide a native local
LiveKit microphone/audio client. The browser remains the actual room client,
so closing it does not yet satisfy the browser-independent acceptance
workflow. Exact “Hello Jarvis” and “Hey Jarvis” model support, microphone
failure recovery, and startup-after-reboot also require Windows integration
tests.
