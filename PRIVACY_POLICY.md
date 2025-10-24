# Privacy Policy for CogniRead - Adaptive Reading Assistant

**Last Updated:** January 2025

## Overview

CogniRead is committed to protecting your privacy. This extension is designed to help users with cognitive accessibility needs by transforming web content into more accessible formats. We take your privacy seriously and operate with full transparency.

## What Data We Collect

### Local Storage Only
CogniRead stores all data **locally on your device** using Chrome's storage API. We collect and store:

1. **User Preferences** (stored locally via `chrome.storage.sync`):
   - ELI5 Mode preference (on/off)
   - Focus Mode preference (on/off)
   - TL;DR Mode preference (on/off)
   - Dyslexia-Friendly Mode preference (on/off)
   - Show Definitions preference (on/off)
   - Literal Language Mode preference (on/off)

**These preferences sync across your Chrome browser instances if you're signed into Chrome**, but are **never sent to our servers** because we don't have any servers.

### Content Processing
CogniRead processes webpage content **entirely on your device**:
- Text from webpages you visit (for simplification, summarization, definition generation)
- This processing happens **locally in your browser**
- No webpage content is sent to external servers
- Chrome's built-in AI APIs (when available) process data locally on your device

## What Data We DO NOT Collect

We **DO NOT**:
- ❌ Collect any personally identifiable information (PII)
- ❌ Track your browsing history
- ❌ Send your data to external servers
- ❌ Use analytics or tracking scripts
- ❌ Sell your data to third parties
- ❌ Store passwords, credit card information, or sensitive data
- ❌ Access data from websites you don't actively use the extension on
- ❌ Collect email addresses, names, or contact information
- ❌ Use cookies or third-party tracking

## How We Use Your Data

Your preferences are used solely to:
1. Provide accessibility features based on your selected settings
2. Sync your preferences across your Chrome browsers (via Chrome's built-in sync)
3. Remember your settings between browsing sessions

All text processing (simplification, summarization, idiom detection) happens:
- **On your device only**
- Using Chrome's built-in AI APIs when available
- Using local fallback algorithms when Chrome AI is unavailable
- No external API calls or server communication

## Chrome AI APIs

When available, CogniRead uses Chrome's experimental built-in AI APIs:
- **Summarizer API** - For TL;DR summaries
- **Rewriter API** - For ELI5 text simplification
- **Language Model API** - For definitions and idiom explanations

These APIs process data **entirely on your device**. Google may collect usage statistics about these APIs, but this is controlled by Chrome's privacy settings, not by CogniRead.

For more information about Chrome's AI APIs and their privacy practices, visit:
https://developer.chrome.com/docs/ai/built-in

## Permissions Explained

CogniRead requests the following permissions:

### `storage`
**Why:** To save your accessibility preferences locally
**How:** Stores settings like which features you've enabled (ELI5, Focus Mode, etc.)
**Privacy:** No data leaves your device

### `activeTab`
**Why:** To access and modify webpage content for accessibility transformations
**How:** Only when you activate CogniRead on a specific tab
**Privacy:** We don't access content from tabs you're not actively using

### `scripting`
**Why:** To inject accessibility features into webpages
**How:** Adds our content script to transform text and highlight definitions
**Privacy:** Scripts run locally in your browser

### `contextMenus`
**Why:** To provide right-click menu options (future feature)
**How:** Adds quick access to CogniRead features
**Privacy:** No data collection

### `<all_urls>` (Host Permissions)
**Why:** To work on any website you choose to use it on
**How:** Allows you to use CogniRead on any webpage
**Privacy:** Content processing happens locally; we don't send URLs or content anywhere

## Data Security

Since all data is stored locally on your device:
- Your preferences are as secure as your Chrome browser
- No transmission of data = no risk of interception
- No servers = no data breaches
- All processing is client-side

## Third-Party Services

CogniRead does **NOT** use any third-party services, analytics, or external APIs. Everything runs locally in your browser.

## Children's Privacy

CogniRead does not knowingly collect any information from children. The extension can be used by anyone, including children, as it doesn't collect personal information from any users.

## Changes to This Policy

We may update this privacy policy from time to time. The "Last Updated" date at the top will reflect any changes. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Open Source

CogniRead is open source. You can review our code to verify our privacy practices at:
[GitHub Repository URL - Add when published]

## Contact Us

If you have questions about this privacy policy or CogniRead's privacy practices:

- **Email:** [Your contact email]
- **GitHub Issues:** [Repository URL]/issues

## Your Rights

You have the right to:
- **Access your data:** All preferences are stored in Chrome's local storage, accessible via browser DevTools
- **Delete your data:** Clear Chrome's storage or uninstall the extension
- **Export your data:** Your settings are stored in Chrome sync (if enabled)
- **Opt-out of Chrome sync:** Disable Chrome sync in browser settings to keep preferences local-only

## Compliance

CogniRead complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) principles

Since we don't collect personal data, most data protection regulations don't apply, but we follow privacy best practices regardless.

## Summary

**In Plain English:**
- We store your accessibility preferences on your device
- We don't send any data to servers (we don't have servers!)
- All text processing happens in your browser
- We don't track you or sell your data
- You can delete everything by uninstalling the extension

**For 5-Year-Olds (ELI5):**
CogniRead helps you read better. It remembers what help you like (like making words simpler). All your settings stay on your computer. We never send anything to other computers. We don't know who you are or what you read.
