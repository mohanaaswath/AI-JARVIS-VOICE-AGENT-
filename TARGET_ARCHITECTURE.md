# Target Architecture

```text
Browser session
  └─ LiveKit cloud voice adapter
       ├─ intent/tool orchestrator
       └─ permission + verification policy
             │
             ├─ Windows system/application/file adapters
             └─ controlled browser adapter

Web dashboard
  ├─ status and monitoring
  ├─ chat and voice UI
  ├─ approvals and permissions
  └─ activity/history
```

## Design rules

1. The backend and registered tools are the source of truth for computer control.
2. The browser is a client and must not receive secrets or arbitrary command
   execution.
3. Every tool has a strict schema, allowlist, permission level, timeout, and
   verification result.
4. Destructive, external-side-effect, and credential-sensitive operations
   require explicit approval.
5. Browser content is untrusted input and never becomes an instruction to
   bypass policy.
6. Cloud voice is the supported voice mode.
