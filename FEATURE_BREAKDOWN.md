# CogniRead - Feature Breakdown

## Overview
CogniRead is a Chrome extension that uses Google's Built-in AI APIs (Gemini Nano) to improve web accessibility for users with cognitive differences, learning disabilities, or anyone seeking better reading comprehension.

---

## Features & AI Models Used

### 1. **ELI5 Mode** (Explain Like I'm 5)
**What it does:**
- Simplifies ALL paragraphs on the page to elementary reading level
- Converts complex text into very basic language that a young child could understand
- Uses AI to break down complex concepts into simple, short sentences (5-10 words max)
- Processes each substantial paragraph (>20 characters) individually
- Preserves HTML structure while replacing text content

**LLM Used:**
- **Chrome AI Language Model (Prompt API)** (`LanguageModel.create()`)
  - System prompt: Simplify to "Explain Like I'm 5" level
  - Instructions: Use very simple words, short sentences (5-10 words max), no complex ideas
  - Automatically replaces difficult words with simple synonyms
  - Breaks long sentences into shorter, clearer ones
  - Includes session quota checking and AbortController support

**Fallback:** Basic text simplification using word replacement dictionary and sentence breaking

**Code Location:** `content.js:435-567`, `ai-service.js:192-237`

**Why Prompt API instead of Rewriter API:**
The Prompt API provides more flexibility and control over the simplification process:
- Can specify exact reading level requirements (ELI5 vs elementary)
- Better contextual understanding for more accurate simplification
- Maintains meaning while adapting complexity level
- More reliable for handling various content types

---

### 2. **Focus Mode**
**What it does:**
- Highlights the current paragraph/heading and dims everything else
- Creates an immersive reading environment to improve concentration
- Chunks content into readable sections (paragraphs and headings)
- Provides navigation controls (←/→ arrows, Space, Esc)
- Displays progress counter (e.g., "3 / 25")

**LLM Used:**
- **No AI required** - Pure DOM manipulation and CSS overlay
- Content chunking is done by CognitiveEngine using DOM traversal

**Keyboard Shortcuts:**
- `Ctrl+Shift+F`: Toggle Focus Mode
- `→` or `Space`: Next chunk
- `←`: Previous chunk
- `Esc`: Exit Focus Mode

**Code Location:** `content.js:590-776`

---

### 3. **TL;DR Mode**
**What it does:**
- Generates a concise bullet-point summary of the main content
- Takes up to 5000 characters from the page
- Proofreads the summary before displaying
- Inserts summary at the top of the page
- Auto-scrolls to the summary with highlight animation

**LLMs Used:**
1. **Chrome AI Summarizer API** (`Summarizer.create()`)
   - Type: `'key-points'`
   - Format: `'markdown'`
   - Length: `'medium'`

2. **Chrome AI Language Model (Prompt API)** (`LanguageModel.create()`)
   - Used for proofreading the generated summary
   - Ensures grammatical correctness and clarity

**Fallback:** Basic text extraction (first sentences of paragraphs)

**Note:** TL;DR Mode is disabled when Focus Mode is active

**Code Location:** `content.js:778-898`, `ai-service.js:175-189`, `ai-service.js:260-283`

---

### 4. **Dyslexia-Friendly**
**What it does:**
- Applies OpenDyslexic font to entire page
- Increases letter spacing for better readability
- Adds slight word spacing improvements
- Increases line height for less visual crowding

**LLM Used:**
- **No AI required** - Pure CSS transformation
- Applies `.cogniread-dyslexia-mode` class to body

**Code Location:** `content.js:900-910`, `styles.css` (dyslexia mode styles)

---

### 5. **Show Definitions**
**What it does:**
- Automatically identifies difficult/complex words on the page
- Highlights difficult words with subtle underline
- Shows instant AI-powered definitions on hover
- Definitions appear in tooltip bubbles above the word
- Uses contextual understanding for accurate definitions

**LLM Used:**
- **Chrome AI Language Model (Prompt API)** (`LanguageModel.create()`)
  - System prompt: "You are a helpful assistant that provides clear, concise, and accurate responses for accessibility features"
  - Analyzes word in context of surrounding sentence
  - Generates simple, clear definitions

**Fallback:** Dictionary-based simple definition lookup

**Code Location:** `content.js:1015-1304`, `ai-service.js:395-424`

**How it identifies difficult words:**
- Words longer than 8 characters
- Technical terminology
- Academic vocabulary
- Syllable count analysis (>3 syllables)

---

### 6. **Literal Language** (Idiom Mode)
**What it does:**
- Scans entire page for idioms, metaphors, and figurative language
- Detects idiomatic expressions in context
- Highlights idiom phrases with purple underline
- Shows literal meaning on hover
- Provides AI-powered explanation of the idiom's actual meaning

**LLMs Used:**
1. **Chrome AI Language Model (Prompt API)** - Detection
   - Uses JSON Schema (`responseConstraint`) for structured output
   - Detects: `{ hasIdiom: boolean, idiom: string, literal: string }`
   - Analyzes each sentence individually

2. **Chrome AI Language Model (Prompt API)** - Explanation
   - Generates clear explanation when hovering over detected idiom
   - Contextualizes the idiom's meaning
   - Provides simple, understandable language

**Fallback:** No idiom detection (feature disabled)

**Code Location:** `content.js:1306-1672`, `ai-service.js:426-470`, `ai-service.js:589-659`

**Examples Detected:**
- "by the skin of my teeth" → barely, just barely
- "break the ice" → start a conversation
- "piece of cake" → very easy

---

## Chrome Built-in AI APIs Summary

### API Architecture
All APIs use **global namespaces** (not `window.ai.*`):
- `LanguageModel` - Prompt API (Gemini Nano) - **Primary API used for ELI5, Definitions, and Idioms**
- `Summarizer` - Summarizer API - **Used for TL;DR summaries**
- `Rewriter` - Rewriter API (initialized but not currently used in features)
- `Translator` - Translator API (initialized but not currently used in features)

### API Availability States
Each API checks availability before initialization:
- `'readily'` - Available immediately
- `'after-download'` - Available after downloading model
- `'available'` - Model is ready (current Chrome implementation)
- `'no'` - Not supported on this device

### Models Downloaded
When first enabled, Chrome downloads:
- **Gemini Nano Language Model** (~1.5GB)
- **Summarizer Model**
- **Rewriter Model**

Download progress is monitored via `downloadprogress` events.

---

## UI Features (No AI)

### Theme System
- **System** - Follows OS dark/light mode
- **Light** - Force light theme
- **Dark** - Force dark theme

### Panel Positioning
- **Top Right** (default)
- **Top Left**
- **Bottom Right**
- **Bottom Left**

### Progress Bar
- Shows reading progress as you scroll
- Updates dynamically based on scroll position

### Active Features Badge
- Shows count of enabled features
- Displays on both mini panel and expanded panel

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+F` | Toggle Focus Mode |
| `Ctrl+Shift+T` | Toggle TL;DR Mode |
| `→` or `Space` | Next chunk (Focus Mode) |
| `←` | Previous chunk (Focus Mode) |
| `Esc` | Exit Focus Mode |

---

## Technical Architecture

### Core Components

1. **AIService** (`ai-service.js`)
   - Wrapper for all Chrome Built-in AI APIs
   - Handles initialization, availability checking, download monitoring
   - Implements fallback methods when AI is unavailable
   - Session management and quota tracking

2. **CogniRead** (`content.js`)
   - Main orchestration class
   - UI creation and event handling
   - Feature toggles and state management
   - Preference persistence via Chrome Storage API

3. **CognitiveEngine** (`cognitive-engine.js`)
   - Content extraction and analysis
   - Text complexity calculation
   - Difficult word identification
   - Content chunking for Focus Mode

### Data Flow

```
User Action → Content Script → AI Service → Chrome Built-in AI
                ↓                              ↓
           Update UI ← Process Response ← Model Response
```

### Session Management
- Language Model sessions track token usage
- Automatic session reinitialization when quota exceeded
- Session cloning capability for parallel operations
- AbortController support for cancelling long operations

---

## Fallback Behavior

When Chrome Built-in AI is unavailable, CogniRead uses:

1. **ELI5 Mode** - Basic word replacement dictionary
2. **TL;DR** - First sentences of paragraphs
3. **Show Definitions** - Simple dictionary lookup
4. **Literal Language** - Disabled (no fallback)
5. **Focus/Dyslexia** - Work normally (no AI needed)

Users see an informational warning:
> "ℹ️ Using fallback methods (Chrome AI not enabled). Features will work but may have reduced accuracy."

---

## Storage & Preferences

### Saved Settings (Chrome Sync Storage)
- ELI5 Mode state
- Focus Mode state
- TL;DR Mode state
- Dyslexia Mode state
- Definitions enabled/disabled
- Idiom Mode state
- Theme preference
- Panel position

Settings sync across devices via Chrome account.

---

## Performance Optimizations

1. **Event Delegation** - Single event listener for all definitions/idioms
2. **Text Node Manipulation** - Preserves HTML structure when highlighting
3. **Lazy Processing** - Only processes visible/substantial content
4. **Batch Processing** - Small delays every 10 items to prevent browser freezing
5. **Session Caching** - Reuses AI sessions when possible
6. **Download Monitoring** - Shows progress for model downloads

---

## Accessibility Features

- **Keyboard Navigation** - Full keyboard support
- **ARIA Labels** - Screen reader compatible
- **High Contrast** - Works with OS high contrast modes
- **Focus Management** - Proper focus handling for tooltips/overlays
- **Escape Hatch** - Esc key always exits modal states

---

## Browser Requirements

### Minimum Requirements
- **Chrome Canary** (or Chrome Dev)
- Chrome version 129+
- Enabled flags:
  - `chrome://flags/#optimization-guide-on-device-model`
  - `chrome://flags/#prompt-api-for-gemini-nano`
  - `chrome://flags/#summarization-api-for-gemini-nano`
  - `chrome://flags/#rewriter-api-for-gemini-nano`

### System Requirements
- ~2GB free disk space (for AI models)
- 8GB+ RAM recommended
- 64-bit operating system

---

## Future Enhancements

Potential features using Chrome Built-in AI:
1. **Translation Mode** - Using Translator API for language learning
2. **Reading Speed Adjustment** - Adaptive text pacing
3. **Content Warnings** - Detecting potentially triggering content
4. **Simplified Navigation** - AI-powered page structure analysis
5. **Voice Reading** - Integration with Speech Synthesis API
