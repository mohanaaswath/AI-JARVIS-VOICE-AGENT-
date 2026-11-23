# Implementation Roadmap

## Milestone 1 — Analysis and runnable foundation

- [x] Inspect the existing repository and document actual behavior.
- [x] Preserve the current LiveKit voice path.
- [x] Add safe website opening through the registered assistant tool.

## Milestone 2 — LiveKit worker

- [x] Keep the LiveKit worker independently startable.
- [x] Keep health checks and structured logs in the backend.

## Milestone 3 — Voice loop

- [x] Keep cloud LiveKit as the dashboard voice mode.

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
- [ ] Add setup, security, API, and testing documentation.
- [ ] Run the Windows acceptance checklist and report any untested item.

## Current limitations

The browser remains the actual room client, so closing it ends the user voice
interface. The LiveKit worker remains a separately started service.
