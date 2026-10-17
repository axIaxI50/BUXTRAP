# BUXTRAP

BUXTRAP is a local-first Windows desktop companion for discovering and launching a Roblox Player installation, storing typed local configuration, and managing a dark AMOLED interface.

## Status and honest feature boundaries

This repository contains a working Electron + React + TypeScript application foundation. Roblox path discovery, manual path validation, launching, process detection, validated configuration persistence, JSON import/export, custom titlebar controls, theme preferences, and a local FastFlags value editor are implemented.

The following are **not represented as completed integrations**: Discord Rich Presence transport, Windows foreground-focus enforcement, and applying undocumented Roblox graphics/FastFlags. The UI explains these limitations instead of fabricating connection or application status. Discord RPC requires a real application ID and a tested RPC client implementation before presence can be published. Windows may deny focus activation by design.

## Requirements

- Windows 10/11 for Roblox launching and Windows packaging.
- Node.js 20+ and npm.
- Git (optional).

## Development

```bash
npm install
npm run dev
```

The development script compiles the Electron TypeScript process, starts Vite at `http://127.0.0.1:5173`, then launches Electron. For a packaged app, the Electron main process loads `dist/renderer/index.html`.

## Quality checks and packaging

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run package:win
npm run package:portable
```

`package:win` builds an NSIS installer. `package:portable` requests Electron Builder's portable target. Windows packaging should be performed on Windows or a properly configured Windows build runner. This generated source archive has not been compiled or runtime-tested in this environment.

## Roblox discovery

The scanner checks the current user's standard `%LOCALAPPDATA%\\Roblox\\Versions` directory and examines version subfolders for `RobloxPlayerBeta.exe`. It does not crawl the entire disk. Use **Select Roblox installation** to select a Player executable or its containing folder. Paths are validated before saving. The launch operation checks for an existing Roblox process first.

Optional URL launching delegates an explicitly validated `http`, `https`, or `roblox` URL to the Windows URL handler. It does not collect credentials or bypass Roblox authentication.

## Configuration storage

Configuration is stored as `config.json` in Electron's `app.getPath('userData')` directory. Writes use a temporary file and atomic rename. Imported files are schema-validated; incompatible files are rejected. Use Advanced Settings to export/import configuration or open the data folder.

## Discord Rich Presence

The settings UI accepts a user-provided Discord Application ID and customizable text. This source build intentionally does not claim RPC is connected: an actual Discord IPC/RPC transport and application assets must be configured and tested before publishing presence. Never paste Discord account tokens into this app.

## Focus mode

The current focus page stores the preference and reports Roblox process state. It does not forcibly steal focus, close other applications, suppress system prompts, or claim that Windows foreground restrictions can be bypassed. A production focus implementation must respect Windows foreground activation rules and accessibility needs.

## FastFlags and graphics

Custom FastFlags are stored as typed JSON primitives, with name and JSON validation. They are explicitly labeled custom/unverified. The app does not automatically apply them to Roblox or claim they are supported. Roblox can ignore or block client flags; unknown flags should not be assumed to work. Graphics settings that lack a stable supported mechanism are shown as Roblox-managed rather than fake sliders.

## Security

- Electron context isolation enabled.
- Renderer Node integration disabled.
- Sandboxed renderer.
- IPC surface exposed through a typed preload bridge.
- External URL opening restricted to validated URL schemes.
- No credentials, Discord tokens, or telemetry are collected.
- Configuration import validates schema before replacing active settings.

## Known limitations

- Windows-specific behavior needs runtime validation on a Windows machine.
- This environment did not produce or test a Windows EXE/installer.
- Discord RPC transport is not yet implemented.
- Active-window focus enforcement is intentionally not implemented.
- FastFlags and unsupported graphics options are not applied.
- Remote font import is optional visual styling; for fully offline deployment, bundle Inter locally and remove the Google Fonts import.

## Repository

https://github.com/axIaxI50/BUXTRAP
