# 📖 CogniRead - Adaptive Reading Assistant

**Making the web cognitively accessible for everyone**

CogniRead is a Chrome extension that transforms any web content into cognitively accessible formats for users with ADHD, dyslexia, autism, or learning disabilities. Using Chrome's built-in AI APIs, it analyzes page complexity and adapts content in real-time without sending any data to external servers.

## 🎯 The Problem

- **15-20%** of the population has learning differences
- Web content is designed for neurotypical readers
- Current accessibility tools focus on visual/hearing impairments, not cognitive accessibility
- Students and professionals with ADHD/dyslexia spend **3-5x longer** reading and frequently miss key information

## ✨ Key Features

### 🎯 Focus Mode
- Highlights one paragraph at a time
- Dims surrounding content to reduce distractions
- Navigate with arrow keys or click
- Perfect for ADHD users who struggle with information overload
- **Keyboard shortcut:** `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)

### 📝 TL;DR Mode
- AI-generated bullet-point summaries
- Extract key points from long articles
- Reduces cognitive load for complex topics
- **Keyboard shortcut:** `Ctrl+Shift+T` (Mac: `Cmd+Shift+T`)

### 🧒 ELI5 Mode (Explain Like I'm 5)
- Simplifies complex text to basic language anyone can understand
- Perfect for scientific articles, legal documents, or technical content
- Breaks down complex sentences into simple, short ones
- Replaces jargon with everyday words
- AI-powered with fallback simplification when AI unavailable

### 📖 Dyslexia-Friendly Mode
- Enhanced font and spacing
- Increased letter spacing (0.12em)
- Larger line height (1.8)
- Uses Comic Neue font (dyslexia-friendly)

### 💡 Show Definitions
- Automatically highlights difficult words in yellow
- Hover over highlighted words for simple explanations
- AI-powered definitions in elementary vocabulary
- Context-aware explanations
- Helps build vocabulary while reading

### 💬 Literal Language Mode
- Converts idioms and figurative language to literal meanings
- Essential for autism spectrum users who interpret language literally
- Database of 100+ common English idioms
- Example: "It's raining cats and dogs" → "It's raining very heavily"
- Helps non-native English speakers understand expressions

### 📈 Progress Tracking
- Visual progress bar at top of page
- Shows reading completion percentage
- Motivates users to finish articles

### 🎨 Smart Content Analysis
- Flesch Reading Ease scoring
- Identifies difficult terminology
- Calculates cognitive complexity (1-10 scale)
- Estimates reading time

## 🚀 Chrome AI APIs Used

This extension leverages Chrome's built-in AI capabilities:

1. **Summarizer API**: Extract key points and create simplified overviews
2. **Rewriter API**: Simplify complex sentences, break long paragraphs
3. **Prompt API (Language Model)**: Analyze cognitive load, identify difficult concepts
4. **Translator API**: Convert idioms to literal language for autism spectrum users

All processing happens **on-device** for privacy and speed.

## 📦 Installation

### For Development

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the project directory

### Chrome AI APIs Requirements

To use the AI features, you need Chrome Canary or Dev channel with experimental AI APIs enabled:

1. Download [Chrome Canary](https://www.google.com/chrome/canary/)
2. Navigate to `chrome://flags/#optimization-guide-on-device-model`
3. Enable "Optimization Guide On Device Model"
4. Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
5. Enable "Prompt API for Gemini Nano"
6. Restart Chrome

## 🎮 Usage

### Getting Started

1. Click the CogniRead extension icon in your browser toolbar
2. Navigate to any article or web page
3. The control panel will appear in the top-right corner
4. Adjust settings to your preferences

### Control Panel

The floating control panel (can be expanded/minimized) includes:

- **ELI5 Toggle**: Simplify text to 5-year-old comprehension level
- **Focus Mode Toggle**: One-section-at-a-time reading
- **TL;DR Mode Toggle**: Bullet-point summaries
- **Dyslexia Mode Toggle**: Enhanced fonts and spacing
- **Show Definitions Toggle**: Hover explanations for difficult words
- **Literal Language Toggle**: Convert idioms to literal meanings

### Keyboard Shortcuts

- `Ctrl+Shift+F` / `Cmd+Shift+F`: Toggle Focus Mode
- `Ctrl+Shift+T` / `Cmd+Shift+T`: Toggle TL;DR Mode
- `Arrow Right` / `Space`: Next paragraph (in Focus Mode)
- `Arrow Left`: Previous paragraph (in Focus Mode)
- `Escape`: Exit Focus Mode

## 🏗️ Project Structure

```
.
├── manifest.json           # Extension configuration (Manifest V3)
├── content.js             # Main orchestration script (UI & features)
├── ai-service.js          # Chrome AI APIs wrapper + fallbacks
├── cognitive-engine.js    # Content analysis and complexity calculation
├── idioms-dictionary.js   # 100+ idioms for literal translation
├── background.js          # Background service worker
├── styles.css             # Accessibility-focused styles
├── popup.html             # Extension popup UI (future feature)
├── icons/                 # Extension icons
├── PRIVACY_POLICY.md      # Comprehensive privacy policy
├── PUBLISHING_GUIDE.md    # Chrome Web Store publishing guide
└── README.md              # This file
```

## 🔧 Technical Details

### Architecture

**CogniRead** uses a modular architecture:

1. **AI Service Layer** (`ai-service.js`)
   - Handles Chrome AI API initialization
   - Provides fallback methods when APIs unavailable
   - Manages text summarization, rewriting, and analysis

2. **Cognitive Engine** (`cognitive-engine.js`)
   - Extracts and cleans page content
   - Calculates reading complexity metrics
   - Identifies difficult terminology
   - Chunks content for focus mode

3. **Content Script** (`content.js`)
   - Orchestrates UI and interactions
   - Manages user preferences
   - Handles keyboard shortcuts
   - Controls feature toggles

### Content Analysis Metrics

- **Flesch Reading Ease Score**: Standard readability formula
- **Average Sentence Length**: Words per sentence
- **Average Word Length**: Characters per word
- **Syllable Count**: For complexity assessment
- **Paragraph Distribution**: Content structure analysis

### Privacy & Security

- ✅ **All processing happens on-device**
- ✅ **No data sent to external servers**
- ✅ **No user tracking or analytics**
- ✅ **No personal data collection**
- ✅ **Open source and auditable**
- ✅ **Chrome's built-in AI ensures privacy**
- ✅ **GDPR and CCPA compliant** (no data collection)

**Read our full [Privacy Policy](PRIVACY_POLICY.md)** for complete details.

## 🎯 Target Users

### Primary Audience
- People with ADHD
- People with dyslexia
- People on the autism spectrum
- People with learning disabilities

### Secondary Audience
- Non-native English speakers
- Elderly users
- People with temporary cognitive impairment (stress, fatigue)
- Students learning complex subjects

## 🌟 Why CogniRead is Unique

1. **First Extension Combining Multiple AI APIs** for cognitive accessibility
2. **Goes Beyond Text-to-Speech** - fundamentally restructures content for comprehension
3. **On-Device Processing** ensures privacy for users with disabilities
4. **Addresses Underserved Market** - most tools focus on visual/auditory accessibility
5. **Real-time Adaptation** - analyzes and adjusts content as you browse
6. **Customizable Complexity** - adapts to individual needs and preferences

## 🚧 Future Enhancements

- [ ] Options page for global settings
- [ ] Reading statistics and progress tracking
- [ ] Custom color themes for visual preferences
- [ ] Export summaries for note-taking
- [ ] Integration with text-to-speech
- [ ] Support for PDF documents
- [ ] Multi-language support
- [ ] Reading speed adjustment
- [ ] Saved reading positions
- [ ] Chrome Web Store publication

## 📊 Market Opportunity

- **300+ million people** worldwide with dyslexia
- **366 million adults** with ADHD globally
- **75 million people** on autism spectrum
- **$8.3 billion** assistive technology market by 2026
- Growing awareness of neurodiversity in workplace

## 🤝 Contributing

This is a hackathon project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🙏 Acknowledgments

- Built for Google Hackathon
- Inspired by the neurodivergent community
- Powered by Chrome's built-in AI capabilities
- Special thanks to accessibility advocates and testers

## 📞 Support & Feedback

- Report issues on GitHub
- Email: tony.turner@gmail.com
- Twitter: @CogniReadAI (coming soon)

---

**Made with 💜 for the 15-20% of people who think differently**

*CogniRead - Because everyone deserves to understand the web*
