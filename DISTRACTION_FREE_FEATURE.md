# 📖 Distraction-Free Reading Mode - Complete Specification

## Core Concept
A mode that transforms any webpage into a clean, focused reading environment by removing visual noise and non-essential elements, similar to Safari Reader Mode or Firefox Reading View, but with cognitive accessibility enhancements.

---

## What Gets Hidden/Removed

### Visual Noise
- ❌ **Advertisements** (all sidebar, banner, popup, inline ads)
- ❌ **Navigation bars** (header menus, breadcrumbs, footers)
- ❌ **Sidebars** (related articles, social feeds, author bios)
- ❌ **Pop-ups/Modals** (newsletter signups, cookie notices, chat widgets)
- ❌ **Social sharing buttons** (floating share bars, inline buttons)
- ❌ **Comments sections** (can be toggled back on if desired)
- ❌ **Auto-playing videos** (pause and hide unless article-critical)
- ❌ **Animated GIFs** (replace with static first frame)
- ❌ **Background images/patterns** (replace with solid color)

### Optional Content (User Toggle)
- 🔄 **Images** (hide all, show critical only, or show all)
- 🔄 **Videos/Embeds** (show placeholder with "Load Video" button)
- 🔄 **Code blocks** (collapse with "Show Code" button)
- 🔄 **Tables** (simplify formatting or collapse)
- 🔄 **Quotes/Pullquotes** (inline or remove decorative styling)

### Always Preserved
- ✅ **Article title**
- ✅ **Author name & date**
- ✅ **Main content text**
- ✅ **Inline links** (styled subtly)
- ✅ **Ordered/unordered lists**
- ✅ **Headings hierarchy** (H1-H6)
- ✅ **Essential diagrams** (if marked as critical)

---

## Visual Transformations

### Layout Changes
```
BEFORE (Normal Page):
┌─────────────────────────────────────┐
│ ▓▓▓ HEADER NAV ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← REMOVE
├──────────┬──────────────────┬───────┤
│ SIDEBAR  │  Article Title   │  ADS  │
│ ┌──────┐│  Author • Date   │ ┌───┐ │
│ │ Ad   ││                   │ │Ad │ │ ← REMOVE
│ └──────┘│  Paragraph text   │ └───┘ │
│ Related  │  [IMAGE]          │ ┌───┐ │
│ Articles │  More text...     │ │Ad │ │
│          │  [SOCIAL SHARE]   │ └───┘ │ ← REMOVE
└──────────┴──────────────────┴───────┘
│ ▓▓▓ FOOTER ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← REMOVE
└─────────────────────────────────────┘

AFTER (Distraction-Free):
┌─────────────────────────────────────┐
│                                     │
│         Article Title               │
│         Author • Date • 8 min read  │
│                                     │
│     Paragraph of clean text with    │
│     comfortable line length and     │
│     spacing. Links are subtle.      │
│                                     │
│     ## Heading 2                    │
│                                     │
│     More readable content...        │
│                                     │
│     [ Load Image? ]                 │
│                                     │
│     Continuing text...              │
│                                     │
└─────────────────────────────────────┘
```

### Typography Enhancements
```css
.distraction-free-content {
  /* Maximum readability */
  max-width: 680px; /* 65-75 characters per line */
  margin: 0 auto;
  padding: 2rem 1.5rem;
  
  /* Typography */
  font-family: 'Georgia', 'Charter', 'Times New Roman', serif;
  font-size: 1.125rem; /* 18px */
  line-height: 1.7; /* Spacious reading */
  color: #1a1a1a;
  
  /* Spacing */
  letter-spacing: 0.01em;
  word-spacing: 0.05em;
}

.distraction-free-content p {
  margin-bottom: 1.5em;
  text-align: left; /* Never justify */
}

.distraction-free-content h1 {
  font-size: 2.5rem;
  line-height: 1.2;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.distraction-free-content h2 {
  font-size: 1.75rem;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
}

/* Subtle links */
.distraction-free-content a {
  color: #2563eb;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

/* Clean lists */
.distraction-free-content ul,
.distraction-free-content ol {
  padding-left: 2em;
  margin-bottom: 1.5em;
}

.distraction-free-content li {
  margin-bottom: 0.5em;
}
```

---

## Feature Variations

### Three Levels of Distraction Removal

#### **Level 1: Minimal** (Light Touch)
- Remove ads and pop-ups only
- Keep images, navigation, sidebars
- Useful for: News sites where images are critical

#### **Level 2: Focused** (Recommended Default)
- Remove ads, navigation, sidebars, social buttons
- Keep article images and essential embeds
- Dim background, center content
- Useful for: Blog posts, medium-length articles

#### **Level 3: Pure Text** (Maximum Focus)
- Remove everything except text
- Replace images with "[Image: description]" placeholders
- No videos, no embeds, no distractions
- Useful for: Academic papers, long-form reading, ADHD users

---

## Cognitive Accessibility Enhancements

### Progressive Disclosure
```html
<!-- Collapsed sections for overwhelming content -->
<div class="collapsible-section">
  <button class="section-toggle">
    <span class="toggle-icon">▶</span>
    Technical Details (optional reading)
  </button>
  <div class="section-content" hidden>
    <!-- Complex content here -->
  </div>
</div>
```

### Reading Progress Indicator
```html
<!-- Sticky progress bar -->
<div class="reading-progress" role="progressbar" aria-label="Reading progress">
  <div class="progress-bar" style="width: 35%"></div>
  <span class="progress-text">35% • 5 min remaining</span>
</div>
```

### Paragraph Numbering (Optional)
```html
<!-- For reference and note-taking -->
<p data-paragraph="1">First paragraph...</p>
<p data-paragraph="2">Second paragraph...</p>

<style>
.show-paragraph-numbers p[data-paragraph]::before {
  content: attr(data-paragraph) ". ";
  color: #999;
  font-size: 0.85em;
  margin-right: 0.5em;
}
</style>
```

---

## Implementation Strategy

### Content Extraction Algorithm

```javascript
class DistractionFreeMode {
  constructor() {
    this.level = 2; // Default: Focused
    this.showImages = true;
    this.showVideos = false;
  }
  
  activate() {
    // 1. Extract main content
    const article = this.findMainContent();
    
    // 2. Create clean container
    const cleanReader = this.createReaderView();
    
    // 3. Clone and clean content
    const cleanContent = this.sanitizeContent(article);
    
    // 4. Apply reading enhancements
    this.enhanceReadability(cleanContent);
    
    // 5. Replace page with reader view
    document.body.innerHTML = '';
    document.body.appendChild(cleanReader);
    cleanReader.appendChild(cleanContent);
    
    // 6. Add exit button
    this.addExitControl();
  }
  
  findMainContent() {
    // Strategy 1: Look for article tag
    let article = document.querySelector('article');
    
    // Strategy 2: Look for role="main"
    if (!article) {
      article = document.querySelector('[role="main"]');
    }
    
    // Strategy 3: Find largest text block
    if (!article) {
      article = this.findLargestTextBlock();
    }
    
    return article;
  }
  
  sanitizeContent(element) {
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements
    const selectorsToRemove = [
      'aside',
      'nav',
      '.advertisement',
      '.social-share',
      '.related-articles',
      '.comments',
      'iframe[src*="ads"]',
      'script',
      'style'
    ];
    
    selectorsToRemove.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    // Handle images based on level
    if (this.level === 3 || !this.showImages) {
      clone.querySelectorAll('img').forEach(img => {
        const placeholder = document.createElement('button');
        placeholder.className = 'image-placeholder';
        placeholder.textContent = `[Image: ${img.alt || 'No description'}]`;
        placeholder.onclick = () => this.showImage(img.src);
        img.replaceWith(placeholder);
      });
    }
    
    // Handle videos
    if (!this.showVideos) {
      clone.querySelectorAll('video, iframe[src*="youtube"]').forEach(video => {
        const placeholder = document.createElement('button');
        placeholder.className = 'video-placeholder';
        placeholder.textContent = '▶ Load Video';
        placeholder.onclick = () => this.showVideo(video);
        video.replaceWith(placeholder);
      });
    }
    
    return clone;
  }
  
  enhanceReadability(content) {
    // Add reading time estimate
    const text = content.textContent;
    const wordCount = text.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 WPM average
    
    const meta = document.createElement('div');
    meta.className = 'article-meta';
    meta.textContent = `${wordCount} words • ${readingTime} min read`;
    content.prepend(meta);
    
    // Add paragraph breaks for long blocks
    content.querySelectorAll('p').forEach(p => {
      if (p.textContent.length > 800) {
        // Split long paragraphs
        this.splitLongParagraph(p);
      }
    });
  }
}
```

### Exit Mechanism
```html
<!-- Floating exit button -->
<button class="exit-distraction-free" aria-label="Exit distraction-free mode">
  <svg width="20" height="20" viewBox="0 0 20 20">
    <path d="M4 4l12 12M4 16L16 4" stroke="currentColor" stroke-width="2"/>
  </svg>
  Exit Reader Mode
</button>

<style>
.exit-distraction-free {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.exit-distraction-free:hover {
  background: rgba(0, 0, 0, 0.95);
}
</style>
```

---

## Integration with ReadEase Panel

### Add to Quick Actions
```html
<button class="readease-btn readease-btn-primary" 
        aria-pressed="false" 
        data-feature="distraction-free">
  📄 Distraction-Free
  <kbd class="readease-kbd">Ctrl+Shift+D</kbd>
</button>
```

### Settings Panel
```html
<section class="readease-section" aria-labelledby="distraction-free-heading">
  <button class="readease-section-toggle" aria-expanded="false">
    <svg class="readease-chevron">...</svg>
    <h2 id="distraction-free-heading">📄 Distraction-Free Mode</h2>
  </button>
  <div class="readease-section-content" hidden>
    <!-- Level Selector -->
    <div class="readease-control-group">
      <label class="readease-label">Removal Level:</label>
      <select class="readease-select" id="df-level">
        <option value="1">Minimal (Keep most content)</option>
        <option value="2" selected>Focused (Recommended)</option>
        <option value="3">Pure Text (Maximum focus)</option>
      </select>
    </div>
    
    <!-- Content Toggles -->
    <div class="readease-control-group">
      <label class="readease-checkbox-label">
        <input type="checkbox" checked id="df-show-images" />
        <span>Show images</span>
      </label>
      <label class="readease-checkbox-label">
        <input type="checkbox" id="df-show-videos" />
        <span>Show videos</span>
      </label>
      <label class="readease-checkbox-label">
        <input type="checkbox" checked id="df-show-progress" />
        <span>Show reading progress</span>
      </label>
    </div>
    
    <!-- Typography Options -->
    <div class="readease-control-group">
      <label for="df-font-family" class="readease-label">Font:</label>
      <select class="readease-select" id="df-font-family">
        <option value="serif">Serif (Traditional)</option>
        <option value="sans">Sans-serif (Modern)</option>
        <option value="dyslexic">OpenDyslexic</option>
      </select>
    </div>
    
    <div class="readease-control-group">
      <label for="df-font-size" class="readease-label">
        Text Size: <span id="df-font-size-value">18px</span>
      </label>
      <input type="range" 
             class="readease-slider" 
             id="df-font-size"
             min="14" 
             max="24" 
             value="18" />
    </div>
    
    <div class="readease-control-group">
      <label for="df-line-width" class="readease-label">
        Line Width: <span id="df-line-width-value">680px</span>
      </label>
      <input type="range" 
             class="readease-slider" 
             id="df-line-width"
             min="500" 
             max="900" 
             value="680" 
             step="20" />
    </div>
  </div>
</section>
```

---

## Advanced Features

### Smart Content Detection
```javascript
// Detect if page is "reader-mode friendly"
function canActivateReaderMode() {
  // Check for article structure
  const hasArticle = document.querySelector('article, [role="main"], .post-content');
  
  // Check word count (minimum 300 words)
  const bodyText = document.body.textContent;
  const wordCount = bodyText.split(/\s+/).length;
  
  // Check text-to-HTML ratio (should be >0.25 for readable content)
  const textLength = bodyText.length;
  const htmlLength = document.body.innerHTML.length;
  const ratio = textLength / htmlLength;
  
  return hasArticle && wordCount > 300 && ratio > 0.25;
}

// Show indicator in address bar
if (canActivateReaderMode()) {
  // Show "Reader Mode Available" icon
  chrome.action.setIcon({ path: 'icons/reader-available.png' });
}
```

### Auto-Scroll Reading
```javascript
class AutoScroll {
  constructor(wordsPerMinute = 200) {
    this.wpm = wordsPerMinute;
    this.isActive = false;
    this.intervalId = null;
  }
  
  start() {
    this.isActive = true;
    const pixelsPerSecond = this.calculateScrollSpeed();
    
    this.intervalId = setInterval(() => {
      if (!this.isActive) return;
      window.scrollBy({ top: pixelsPerSecond / 60, behavior: 'smooth' });
    }, 1000 / 60); // 60 FPS
  }
  
  calculateScrollSpeed() {
    // Average word height estimation
    const avgCharsPerWord = 5;
    const avgFontSize = 18; // pixels
    const avgLineHeight = 1.7;
    const charsPerLine = 65;
    
    const linesPerMinute = (this.wpm * avgCharsPerWord) / charsPerLine;
    const pixelsPerMinute = linesPerMinute * (avgFontSize * avgLineHeight);
    
    return pixelsPerMinute / 60; // Convert to per-second
  }
  
  pause() {
    this.isActive = false;
    clearInterval(this.intervalId);
  }
  
  setSpeed(wpm) {
    this.wpm = wpm;
    if (this.isActive) {
      this.pause();
      this.start();
    }
  }
}
```

### Bionic Reading (Optional)
```javascript
// Enhance fixation points by bolding first part of words
function applyBionicReading(text) {
  return text.replace(/\b(\w{1,3})(\w+)\b/g, (match, start, end) => {
    const boldChars = Math.ceil(match.length * 0.5);
    const bold = match.slice(0, boldChars);
    const normal = match.slice(boldChars);
    return `<strong>${bold}</strong>${normal}`;
  });
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle Distraction-Free Mode |
| `Esc` | Exit Distraction-Free Mode |
| `Space` / `Shift+Space` | Scroll down/up by page |
| `↓` / `↑` | Scroll down/up by line |
| `Home` / `End` | Jump to start/end |
| `+` / `-` | Increase/decrease font size |
| `A` | Toggle auto-scroll |
| `I` | Toggle images |
| `P` | Toggle reading progress |

---

## Use Cases by User Type

### ADHD Users
- **Level 3 (Pure Text)** - Removes all visual distractions
- Auto-scroll at custom pace
- Progress indicator for motivation
- Paragraph numbering for tracking position

### Dyslexic Users
- **Level 2 (Focused)** - Keeps helpful images
- OpenDyslexic font option
- Increased line/letter spacing
- High contrast text

### Low Vision Users
- Large, adjustable font sizes (up to 24px)
- High contrast mode support
- Wide line width option (up to 900px)
- No justified text (always left-aligned)

### Academic Readers
- Keep images and diagrams
- Paragraph numbering for citations
- Print-friendly styling
- Estimated reading time

---

## Theme Variants

```css
/* Light Theme (Default) */
.distraction-free[data-theme="light"] {
  background: #fafafa;
  color: #1a1a1a;
}

/* Dark Theme */
.distraction-free[data-theme="dark"] {
  background: #1a1a1a;
  color: #e0e0e0;
}

.distraction-free[data-theme="dark"] a {
  color: #6ba3ff;
}

/* Sepia Theme (Eye comfort) */
.distraction-free[data-theme="sepia"] {
  background: #f4ecd8;
  color: #5b4636;
}

/* High Contrast */
.distraction-free[data-theme="high-contrast"] {
  background: #000000;
  color: #ffffff;
}

.distraction-free[data-theme="high-contrast"] a {
  color: #ffff00;
  text-decoration: underline;
  text-decoration-thickness: 2px;
}
```

---

## Summary

**Distraction-Free Mode** transforms chaotic web pages into clean, focused reading environments by:

✅ **Removing**: Ads, navigation, sidebars, popups, social buttons  
✅ **Simplifying**: Typography, layout, colors  
✅ **Enhancing**: Line length, spacing, contrast, readability  
✅ **Customizing**: Font, size, width, content visibility  
✅ **Supporting**: Multiple focus levels, themes, accessibility needs  

This creates a **reader-first experience** that reduces cognitive load and improves comprehension for neurodivergent users and anyone seeking better focus.