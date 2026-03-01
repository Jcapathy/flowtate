# Flowtate — Product Requirements Document

**Version**: 1.0
**Date**: 2026-03-01
**Author**: Jesse Capathy
**Repository**: GitHub — Flowtate

---

## 1. Vision & Overview

Flowtate is a system-wide AI-powered voice dictation application for Windows (and eventually macOS) that transcribes speech into clean, formatted text and pastes it into any active application. It combines OpenAI Whisper for speech-to-text with Anthropic Claude for intelligent text formatting, command-based text rewriting, and real-time language translation.

**Key Differentiator**: Built-in language translation output — speak in one language and receive formatted text in another, switchable on the fly via voice snippets.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron + TypeScript |
| Speech-to-Text | OpenAI Whisper API |
| AI Processing | Anthropic Claude API (Sonnet 4.6) |
| Build Tool | Vite |
| Package Manager | pnpm |
| UI | HTML/CSS + Lit or React (TBD) |
| Installer | electron-builder |
| Repository | GitHub (Jcapathy/flowtate) |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────┐
│                  Electron Main Process           │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Hotkey   │  │ Audio    │  │ Active Window │  │
│  │ Manager  │  │ Recorder │  │ Detector      │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │          │
│  ┌────▼──────────────▼────────────────▼───────┐  │
│  │            Dictation Pipeline               │  │
│  │                                             │  │
│  │  Audio → Whisper API → Raw Text             │  │
│  │  Raw Text → Claude API → Formatted Text     │  │
│  │  Formatted Text → Clipboard → Paste         │  │
│  └─────────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Snippet  │  │ Personal │  │ Translation   │  │
│  │ Engine   │  │ Dict     │  │ Engine        │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                                  │
│  ┌──────────┐  ┌──────────┐                     │
│  │ Tray     │  │ Settings │                     │
│  │ Manager  │  │ Store    │                     │
│  └──────────┘  └──────────┘                     │
│                                                  │
├─────────────────────────────────────────────────┤
│              Electron Renderer Process           │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Overlay  │  │ Settings │  │ History       │  │
│  │ Window   │  │ Window   │  │ Window        │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 4. Features

### 4.1 Core Dictation

**Description**: System-wide voice-to-text that works in any application.

**Requirements**:
- F4.1.1: Hotkey activation — configurable keyboard shortcut (default: `Ctrl+Space`)
- F4.1.2: Two dictation modes:
  - **Push-to-talk (PTT)**: Hold hotkey to record, release to transcribe
  - **Toggle (POPO)**: Press once to start, press again to stop
- F4.1.3: Capture microphone audio using Web Audio API / node-record-lpcm16
- F4.1.4: Stream or send audio to OpenAI Whisper API for transcription
- F4.1.5: Auto-paste transcribed text into the currently focused text field via clipboard + simulated Ctrl+V
- F4.1.6: Maximum recording duration: 6 minutes per session
- F4.1.7: Audio format: WAV or WebM, 16kHz mono

**Acceptance Criteria**:
- User presses hotkey, speaks, presses hotkey again, and text appears in the focused input field
- Latency from end-of-speech to text appearing: < 3 seconds for short utterances

---

### 4.2 AI Text Formatting

**Description**: Claude API post-processes raw transcription into clean, polished text.

**Requirements**:
- F4.2.1: Remove filler words (um, uh, like, you know, so, basically)
- F4.2.2: Fix grammar, spelling, punctuation, and capitalization
- F4.2.3: Context-aware formatting based on active application:
  - Email apps → formal prose with greetings/closings preserved
  - Chat apps (Slack, Discord, WhatsApp) → casual, shorter sentences
  - Code editors → code comment formatting, preserve technical terms
  - Word processors → proper paragraph structure
  - General → balanced, clean prose
- F4.2.4: Toggle between raw transcription and AI-formatted output
- F4.2.5: Configurable formatting instructions (conciseness, tone, formality level)

**Acceptance Criteria**:
- "Um so like I was thinking we should uh maybe refactor the authentication module" → "I was thinking we should refactor the authentication module."
- Formatting adapts visibly between email and chat contexts

---

### 4.3 Command Mode

**Description**: Select existing text, activate via hotkey, speak an instruction, and Claude rewrites the selection.

**Requirements**:
- F4.3.1: Dedicated hotkey for command mode (default: `Ctrl+Alt+Space`)
- F4.3.2: Read the currently selected text from the clipboard (Ctrl+C)
- F4.3.3: Record a spoken command/instruction
- F4.3.4: Send selected text + spoken command to Claude API
- F4.3.5: Replace the selected text with Claude's response
- F4.3.6: Supported commands include (but are not limited to):
  - "Make this more formal" / "Make this casual"
  - "Summarize this"
  - "Turn into bullet points"
  - "Fix the grammar"
  - "Make shorter" / "Make longer"
  - "Translate to [language]"
  - "Rewrite as an email"
  - Any freeform instruction

**Acceptance Criteria**:
- User selects text, presses Ctrl+Alt+Space, says "make this more formal", and the selected text is replaced with a formal version
- Works across any application that supports text selection

---

### 4.4 Language Translation Output

**Description**: Speak in one language and receive output in a different target language. This is Flowtate's key differentiator.

**Requirements**:
- F4.4.1: **Single-language translation mode**: User speaks in Language A, output is in Language B
- F4.4.2: **Multi-language output mode**: Output the same text in multiple languages simultaneously (e.g., English + Spanish on separate lines)
- F4.4.3: Default output language configurable in settings (default: same as input / no translation)
- F4.4.4: Language switching via voice snippets (see 4.5) — e.g., say "switch to Spanish" to change output language without opening settings
- F4.4.5: Translation is context-aware and natural (Claude API), not word-for-word
- F4.4.6: Supported languages: All languages supported by both Whisper and Claude (100+)
- F4.4.7: Visual indicator in overlay showing current output language(s)
- F4.4.8: Multi-language output format configurable:
  - Stacked (Language A on line 1, Language B on line 2)
  - Side-by-side (Language A | Language B)
  - Primary only with translation in parentheses

**Acceptance Criteria**:
- User sets output to Spanish, speaks "Hello, how are you today?", text output: "Hola, como estas hoy?"
- User activates multi-language (English + Spanish), speaks a sentence, both versions appear
- User says snippet "change to French output", subsequent dictations output in French

---

### 4.5 Voice Snippets / Shortcuts

**Description**: User-defined voice trigger phrases that execute actions or expand into saved text.

**Requirements**:
- F4.5.1: **Text expansion snippets**: Voice trigger → saved text block (e.g., "insert email signature" → full signature)
- F4.5.2: **Language-switching snippets**: Voice triggers that change the output language:
  - "change to Spanish output" → sets output language to Spanish
  - "output in French and English" → enables multi-language mode
  - "back to English" → resets to English-only output
- F4.5.3: **Action snippets**: Voice triggers for app actions:
  - "stop formatting" → disable AI formatting
  - "enable formatting" → re-enable AI formatting
  - "clear dictionary" → clear personal dictionary
- F4.5.4: Snippet management UI — create, edit, delete, enable/disable
- F4.5.5: Snippets are matched against the raw transcription before AI processing
- F4.5.6: Snippet trigger detection is fuzzy (handles slight variations in phrasing)
- F4.5.7: Built-in default snippets for common language switches (user can customize)

**Acceptance Criteria**:
- User creates snippet with trigger "email sig" and text block; saying "email sig" pastes the text block
- Saying "change to Spanish output" switches translation mode; next dictation outputs in Spanish

---

### 4.6 Personal Dictionary

**Description**: Custom vocabulary for accurate transcription of names, jargon, and technical terms.

**Requirements**:
- F4.6.1: User can add/remove custom words, names, acronyms
- F4.6.2: Dictionary entries are passed as context to Whisper API (via prompt parameter) to improve recognition
- F4.6.3: Auto-learn mode: When user manually corrects a transcription, offer to add the correction to the dictionary
- F4.6.4: Dictionary management UI (add, edit, delete entries)
- F4.6.5: Import/export dictionary as JSON
- F4.6.6: Categories for organizing entries (names, technical, medical, legal, etc.)

**Acceptance Criteria**:
- User adds "Flowtate" to dictionary; subsequent dictations correctly recognize the word
- Auto-learn suggests adding a corrected word after manual edit

---

### 4.7 Per-App Formatting Styles

**Description**: Automatically adjust formatting based on which application is currently active.

**Requirements**:
- F4.7.1: Detect the active/focused application using Windows APIs (via node-ffi-napi or native module)
- F4.7.2: Built-in formatting profiles for common apps:
  - Slack/Discord/WhatsApp → casual
  - Gmail/Outlook → formal email
  - VS Code/Cursor → code comments
  - Word/Google Docs → document prose
  - Default → balanced
- F4.7.3: User can create custom formatting profiles
- F4.7.4: User can assign/override formatting profiles per application
- F4.7.5: Profile includes: formality level, sentence length preference, bullet point usage, greeting/closing behavior

**Acceptance Criteria**:
- Dictating in Slack produces casual text; same speech in Outlook produces formal text
- User creates a custom profile and assigns it to a specific app

---

### 4.8 Settings & Preferences

**Description**: Full settings UI for configuring all aspects of Flowtate.

**Requirements**:
- F4.8.1: **Hotkeys**: Configure dictation, command mode, and cancel hotkeys
- F4.8.2: **Language**: Default input language, default output language, multi-language preferences
- F4.8.3: **Audio**: Select input device, adjust sensitivity/threshold
- F4.8.4: **Formatting**: Toggle AI formatting, filler word removal, grammar correction
- F4.8.5: **Dictionary**: Manage personal dictionary entries
- F4.8.6: **Snippets**: Manage voice snippets
- F4.8.7: **App Styles**: Configure per-app formatting profiles
- F4.8.8: **Appearance**: Light/dark theme
- F4.8.9: **General**: Start on login, show in taskbar, notification preferences
- F4.8.10: **API Keys**: Configure OpenAI and Anthropic API keys
- F4.8.11: Settings persisted to local JSON file (electron-store)

**Acceptance Criteria**:
- All settings are persisted across app restarts
- Changing a hotkey takes effect immediately without restart

---

### 4.9 System Tray & Overlay

**Description**: Persistent system tray icon and floating overlay for status indication.

**Requirements**:
- F4.9.1: System tray icon with right-click context menu:
  - Start/Stop dictation
  - Open Settings
  - View History
  - Current output language display
  - Quit
- F4.9.2: Floating overlay near cursor or fixed position showing:
  - Recording state (idle / recording / processing)
  - Current output language
  - Animated waveform or pulsing dot during recording
- F4.9.3: Toast notifications for:
  - Transcription complete
  - Language switched
  - Errors (API failure, no microphone, etc.)
- F4.9.4: Overlay is click-through (doesn't steal focus from the active app)

**Acceptance Criteria**:
- Overlay appears during recording without stealing focus
- Tray menu provides quick access to all key actions

---

### 4.10 History & Stats

**Description**: Log of past dictations with usage statistics.

**Requirements**:
- F4.10.1: Store last 100 dictations with:
  - Raw transcription
  - Formatted output
  - Timestamp
  - Source application
  - Output language
- F4.10.2: History UI with search and filter
- F4.10.3: Click to copy any past dictation
- F4.10.4: Usage stats dashboard:
  - Total words dictated
  - Average words per session
  - Most-used languages
  - Time saved estimate (vs typing)
- F4.10.5: Persisted in local SQLite database (better-sqlite3)

**Acceptance Criteria**:
- User can browse, search, and re-copy past dictations
- Stats update in real-time as user dictates

---

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Transcription latency | < 3s for utterances under 30s |
| Memory usage (idle) | < 200MB |
| Memory usage (active) | < 400MB |
| Startup time | < 3s |
| Installer size | < 100MB |
| Platform | Windows 11 (macOS future) |
| Accessibility | Keyboard-navigable settings UI |

---

## 6. Data Flow

```
User speaks
    │
    ▼
Microphone capture (Web Audio API)
    │
    ▼
Audio buffer (WAV/WebM)
    │
    ▼
Snippet detection (match against triggers)
    │
    ├── Match found → Execute snippet action (language switch, text expand, etc.)
    │
    └── No match → Continue pipeline
            │
            ▼
        OpenAI Whisper API
            │
            ▼
        Raw transcription text
            │
            ▼
        Claude API (formatting + translation)
        ├── Input: raw text, active app context, output language(s), formatting rules
        └── Output: formatted (and optionally translated) text
            │
            ▼
        Clipboard + simulated Ctrl+V
            │
            ▼
        Text appears in active application
```

---

## 7. Out of Scope (v1)

- Mobile applications (iOS, Android)
- Offline / local Whisper fallback
- Multi-user / team / enterprise features
- Browser extension
- Audio file transcription (file upload)
- Real-time streaming transcription (batch only for v1)
- End-to-end encryption of audio

---

## 8. Future Considerations (v2+)

- Local Whisper fallback for offline use
- Real-time streaming transcription
- macOS support
- Custom fine-tuned models for specific domains
- Plugin/extension system
- Audio file upload transcription
- Team shared dictionaries and snippets
