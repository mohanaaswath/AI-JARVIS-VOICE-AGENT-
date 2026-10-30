# Target Architecture

```text
Windows user session
  └─ Jarvis desktop agent
     ├─ single-instance guard
     ├─ tray controller and startup registration
     ├─ microphone/privacy controller
     ├─ offline wake-word detector
     ├─ speech recognition and speech output
     ├─ local authenticated API/WebSocket
     ├─ intent/tool orchestrator
     └─ permission + verification policy
             │
             ├─ Windows system/application/file adapters
             ├─ controlled browser adapter
             └─ optional LiveKit cloud voice adapter

Web dashboard
  ├─ authenticated local-agent connection
  ├─ status and monitoring
  ├─ chat and voice UI
  ├─ approvals and permissions
  └─ activity/history
```

## Design rules

1. The desktop agent is the source of truth for computer control.
2. The browser is a client and must not receive secrets or arbitrary command
   execution.
3. Every tool has a strict schema, allowlist, permission level, timeout, and
   verification result.
4. Destructive, external-side-effect, and credential-sensitive operations
   require explicit approval.
5. Browser content is untrusted input and never becomes an instruction to
   bypass policy.
6. Cloud voice remains optional; wake-word detection and privacy controls
   remain local.
