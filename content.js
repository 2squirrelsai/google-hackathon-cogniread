// CogniRead Content Script
// Main orchestration for cognitive accessibility features

class CogniRead {
  constructor() {
    this.aiService = null;
    this.cognitiveEngine = null;
    this.distractionFreeMode = null;
    this.initialized = false;
    this.state = {
      focusMode: false,
      tldrMode: false,
      dyslexiaMode: false,
      definitionsEnabled: true,
      idiomMode: false,
      simplificationLevel: 0, // 0=off, 1=ELI5, 2=ELI10, 3=ELI15, 4=College
      expansionMode: false,
      toneAdjustment: 'off', // 'off', 'formal', 'casual', 'encouraging', 'neutral'
      activeVoice: false,
      sentenceRestructuring: false,
      currentFocusIndex: 0,
      contentChunks: [],
      theme: 'light', // 'light' or 'dark'
      panelCollapsed: false,
      panelPinned: false,
      panelPosition: 'bottom-left', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
      distractionFree: false,
      starredFeatures: ['focus-mode', 'distraction-free'] // Default starred features for quick access
    };
    this.ui = {
      overlay: null,
      controls: null,
      progress: null,
      focusOverlay: null,
      focusCounter: null,
      focusContent: null
    };
  }

  async initialize() {
    if (this.initialized) return;

    console.log('CogniRead initializing...');

    // Initialize AI service
    this.aiService = new AIService();
    await this.aiService.initialize();

    // Check if AI APIs are actually loaded (not just using fallbacks)
    const hasAI = !!(this.aiService.languageModel || this.aiService.summarizer || this.aiService.rewriter);

    if (!hasAI) {
      console.log('ℹ️ Using fallback methods (Chrome AI not enabled). Features will work but may have reduced accuracy.');
      this.showAIWarning();
    } else {
      console.log('✅ Chrome AI APIs initialized successfully');
    }

    // Initialize cognitive engine
    this.cognitiveEngine = new CognitiveEngine(this.aiService);

    // Initialize distraction-free mode
    this.distractionFreeMode = new DistractionFreeMode();

    // Create UI elements
    this.createUI();

    // Initialize theme system
    this.initializeTheme();

    // Load saved preferences
    await this.loadPreferences();

    // Set up event listeners
    this.setupEventListeners();

    // Analyze current page
    await this.analyzePage();

    this.initialized = true;
    console.log('CogniRead initialized successfully');

    // Trigger bounce animation on mini panel
    if (this.ui.miniPanel) {
      this.ui.miniPanel.classList.add('bounce-in');
      // Remove animation class after it completes
      setTimeout(() => {
        this.ui.miniPanel.classList.remove('bounce-in');
      }, 800); // Match animation duration
    }

    // Notify that control panel is ready
    window.postMessage({ type: 'COGNIREAD_READY' }, '*');
  }

  createUI() {
    // Create overlay container
    this.ui.overlay = document.createElement('div');
    this.ui.overlay.id = 'cogniread-overlay';
    document.body.appendChild(this.ui.overlay);

    // Progress bar removed - no longer needed

    // Create control panel
    this.createControlPanel();

    // Create focus mode overlay
    this.ui.focusOverlay = document.createElement('div');
    this.ui.focusOverlay.className = 'cogniread-focus-overlay hidden';
    document.body.appendChild(this.ui.focusOverlay);

    // Create focus mode counter
    this.ui.focusCounter = document.createElement('div');
    this.ui.focusCounter.id = 'cogniread-focus-counter';
    this.ui.focusCounter.className = 'hidden';
    this.ui.focusCounter.innerHTML = `
      <span id="focus-current">1</span> / <span id="focus-total">1</span>
      <button class="cogniread-focus-close-btn" id="cogniread-focus-close-btn" title="Close and disable focus mode">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
      </button>
    `;
    document.body.appendChild(this.ui.focusCounter);

    // Create focus mode content container
    this.ui.focusContent = document.createElement('div');
    this.ui.focusContent.id = 'cogniread-focus-content';
    this.ui.focusContent.className = 'hidden';
    document.body.appendChild(this.ui.focusContent);
  }

  createControlPanel() {
    // Create minimized button
    this.ui.miniPanel = document.createElement('div');
    this.ui.miniPanel.className = `cogniread-mini position-${this.state.panelPosition}`;
    this.ui.miniPanel.id = 'cogniread-mini';
    this.ui.miniPanel.innerHTML = `
      <img class="cogniread-mini-icon" src="${chrome.runtime.getURL('icons/icon128.png')}" alt="CogniRead">
      <span class="cogniread-mini-badge" id="cogniread-active-badge">0</span>
      <div class="cogniread-mini-tooltip">
        <strong>CogniRead Active</strong><br>
        Click to configure
      </div>
    `;
    document.body.appendChild(this.ui.miniPanel);

    // Force immediate visibility and positioning to prevent rendering issues
    // This ensures the button appears correctly in viewport without needing to scroll
    // Use double requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.ui.miniPanel) {
          // Trigger reflow to force layout calculation
          void this.ui.miniPanel.offsetHeight;
          // Explicitly reinforce position and z-index to ensure visibility
          // This fixes issues where fixed elements don't appear until scroll
          this.ui.miniPanel.style.cssText += `; position: fixed !important; z-index: 2147483647 !important;`;
        }
      });
    });

    // Create expanded panel
    this.ui.controls = document.createElement('div');
    this.ui.controls.className = `cogniread-panel position-${this.state.panelPosition}`;
    this.ui.controls.id = 'cogniread-panel';
    this.ui.controls.innerHTML = `
      <!-- Sticky Header -->
      <div class="cogniread-panel-header" id="cogniread-panel-header">
        <div class="cogniread-panel-logo">
          <span class="cogniread-logo-cogni">Cogni</span>
          <svg class="cogniread-logo-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15 8L21 9L16 14L18 21L12 17L6 21L8 14L3 9L9 8L12 2Z" fill="currentColor"/>
          </svg>
          <span class="cogniread-logo-read">Read</span>
        </div>
        <div class="cogniread-header-buttons">
          <button class="cogniread-minimize-btn" id="cogniread-minimize" title="Minimize">−</button>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="cogniread-panel-content">
        <!-- Reading Modes Section -->
        <div class="cogniread-section reading-mode" data-section="reading-mode">
          <div class="cogniread-section-header">
            <div class="cogniread-section-header-left">
              <span class="cogniread-section-icon">📖</span>
              <span class="cogniread-section-title">Reading Modes</span>
            </div>
            <div class="cogniread-section-header-right">
              <span class="cogniread-chevron">▼</span>
            </div>
          </div>
          <div class="cogniread-section-content">
            <!-- Simplification Slider -->
            <div class="cogniread-slider-container">
              <div class="cogniread-slider-header">
                <div class="cogniread-slider-label">
                  <span class="cogniread-slider-label-icon">💡</span>
                  <span class="cogniread-slider-label-text">Simplification</span>
                </div>
                <span class="cogniread-slider-value" id="cogniread-simplification-value">Off</span>
              </div>
              <div class="cogniread-slider-track">
                <input type="range" class="cogniread-slider" id="cogniread-simplification-slider" min="0" max="4" value="0" step="1">
              </div>
              <div class="cogniread-slider-labels">
                <span class="cogniread-slider-label-item">Off</span>
                <span class="cogniread-slider-label-item">ELI5</span>
                <span class="cogniread-slider-label-item">ELI10</span>
                <span class="cogniread-slider-label-item">ELI15</span>
                <span class="cogniread-slider-label-item">College</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Accessibility Section -->
        <div class="cogniread-section accessibility" data-section="accessibility">
          <div class="cogniread-section-header">
            <div class="cogniread-section-header-left">
              <span class="cogniread-section-icon">♿</span>
              <span class="cogniread-section-title">Accessibility</span>
            </div>
            <div class="cogniread-section-header-right">
              <span class="cogniread-chevron">▼</span>
            </div>
          </div>
          <div class="cogniread-section-content">
            <!-- Dyslexia-Friendly -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Applies OpenDyslexic font and spacing for easier reading">📖</span>
                <span class="cogniread-feature-label">Dyslexia-Friendly</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="dyslexia-mode" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-dyslexia-toggle"></div>
              </div>
            </div>
            <!-- Show Definitions -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Highlights difficult words and shows AI-powered definitions on hover">📚</span>
                <span class="cogniread-feature-label">Show Definitions</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="definitions" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-definitions-toggle"></div>
              </div>
            </div>
            <!-- Literal Language -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Detects idioms and shows their literal meanings">💬</span>
                <span class="cogniread-feature-label">Literal Language</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="literal-language" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-literal-toggle"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI-Powered Features Section -->
        <div class="cogniread-section ai-features" data-section="ai-features">
          <div class="cogniread-section-header">
            <div class="cogniread-section-header-left">
              <span class="cogniread-section-icon">🤖</span>
              <span class="cogniread-section-title">AI-Powered Features</span>
            </div>
            <div class="cogniread-section-header-right">
              <span class="cogniread-chevron">▼</span>
            </div>
          </div>
          <div class="cogniread-section-content">
            <!-- Concept Connections -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Links related concepts together for better understanding">🔗</span>
                <span class="cogniread-feature-label">Concept Connections</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="concept-connections" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-concept-toggle"></div>
              </div>
            </div>
            <!-- Plain Language Translation -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Translates specialized jargon into plain language">🌐</span>
                <span class="cogniread-feature-label">Plain Language</span>
              </div>
              <div class="cogniread-feature-right">
                <select id="cogniread-plain-language-select" class="cogniread-tone-select">
                  <option value="off">Off</option>
                  <option value="legal">Legal → Plain</option>
                  <option value="medical">Medical → Plain</option>
                  <option value="academic">Academic → Plain</option>
                  <option value="auto">Auto-Detect</option>
                </select>
              </div>
            </div>
            <!-- Prerequisite Knowledge -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Scans content to identify required background knowledge">📋</span>
                <span class="cogniread-feature-label">Prerequisites Check</span>
              </div>
              <button class="cogniread-ai-button" id="cogniread-prerequisites-btn">Scan</button>
            </div>
            <!-- Reading Goal Assistant -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="AI analyzes content to help you set reading goals">🎯</span>
                <span class="cogniread-feature-label">Reading Goals</span>
              </div>
              <button class="cogniread-ai-button" id="cogniread-goals-btn">Analyze</button>
            </div>
            <!-- Cognitive Load Indicator -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Color-codes text by difficulty level for easy navigation">📊</span>
                <span class="cogniread-feature-label">Difficulty Heatmap</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="heatmap" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-heatmap-toggle"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Focus Features Section -->
        <div class="cogniread-section focus-features" data-section="focus-features">
          <div class="cogniread-section-header">
            <div class="cogniread-section-header-left">
              <span class="cogniread-section-icon">🎯</span>
              <span class="cogniread-section-title">Focus Features</span>
            </div>
            <div class="cogniread-section-header-right">
              <span class="cogniread-chevron">▼</span>
            </div>
          </div>
          <div class="cogniread-section-content">
            <!-- Focus Mode -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Highlights one paragraph at a time, dimming everything else">🔆</span>
                <span class="cogniread-feature-label">Focus Mode</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="focus-mode" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-focus-mode-toggle"></div>
              </div>
            </div>
            <!-- TL;DR Mode -->
            <div class="cogniread-feature-item" id="tldr-toggle-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Generates AI-powered bullet-point summary of the page">📝</span>
                <span class="cogniread-feature-label">TL;DR Mode</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="tldr-mode" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-tldr-toggle"></div>
              </div>
            </div>
            <!-- Distraction-Free Mode -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Clean reader view that removes ads, sidebars, and distractions">📄</span>
                <span class="cogniread-feature-label">Distraction-Free</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="distraction-free" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-distraction-free-toggle"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Text Transformation Section -->
        <div class="cogniread-section text-transform" data-section="text-transform">
          <div class="cogniread-section-header">
            <div class="cogniread-section-header-left">
              <span class="cogniread-section-icon">✨</span>
              <span class="cogniread-section-title">Text Transformation</span>
            </div>
            <div class="cogniread-section-header-right">
              <span class="cogniread-chevron">▼</span>
            </div>
          </div>
          <div class="cogniread-section-content">
            <!-- Text Expansion -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Expands abbreviations and contractions for clarity">🔠</span>
                <span class="cogniread-feature-label">Text Expansion</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="expansion" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-expansion-toggle"></div>
              </div>
            </div>
            <!-- Sentence Restructuring -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Restructures complex sentences for easier comprehension">🔄</span>
                <span class="cogniread-feature-label">Sentence Restructuring</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="restructure" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-restructure-toggle"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Voice & Tone Section -->
        <div class="cogniread-section voice-features" data-section="voice-features">
          <div class="cogniread-section-header">
            <div class="cogniread-section-header-left">
              <span class="cogniread-section-icon">🗣️</span>
              <span class="cogniread-section-title">Voice & Tone</span>
            </div>
            <div class="cogniread-section-header-right">
              <span class="cogniread-chevron">▼</span>
            </div>
          </div>
          <div class="cogniread-section-content">
            <!-- Active Voice -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Converts passive voice to active voice for clarity">▶️</span>
                <span class="cogniread-feature-label">Active Voice</span>
              </div>
              <div class="cogniread-feature-right">
                <button class="cogniread-star-btn" data-feature="active-voice" data-starred="false" title="Pin to quick access">
                  <svg class="star-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </button>
                <div class="cogniread-toggle" id="cogniread-active-voice-toggle"></div>
              </div>
            </div>
            <!-- Tone Adjustment -->
            <div class="cogniread-feature-item">
              <div class="cogniread-feature-left">
                <span class="cogniread-feature-icon" data-tooltip="Adjusts the tone of text (casual, formal, encouraging, neutral)">🎵</span>
                <span class="cogniread-feature-label">Tone</span>
              </div>
              <select id="cogniread-tone-select" class="cogniread-tone-select">
                <option value="off">Off</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="encouraging">Encouraging</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Theme Selector Footer (Outside scrollable area) -->
      <div class="cogniread-theme-selector">
        <!-- Starred feature buttons will be dynamically inserted here -->
        <button class="cogniread-theme-toggle" id="cogniread-theme-toggle" data-theme="light" data-tooltip="Switch between light and dark themes">
          <svg class="cogniread-theme-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <g class="theme-sun">
              <circle cx="12" cy="12" r="4" fill="currentColor"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2"/>
            </g>
            <g class="theme-moon">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
            </g>
          </svg>
        </button>
        <button class="cogniread-position-toggle" id="cogniread-position-toggle" data-position="bottom-left" data-tooltip="Move panel to a different corner">
          <svg class="cogniread-position-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect class="position-indicator" x="4" y="14" width="6" height="6" fill="currentColor" rx="1"/>
            <rect x="4" y="4" width="6" height="6" fill="currentColor" opacity="0.3" rx="1"/>
            <rect x="14" y="4" width="6" height="6" fill="currentColor" opacity="0.3" rx="1"/>
            <rect x="14" y="14" width="6" height="6" fill="currentColor" opacity="0.3" rx="1"/>
          </svg>
        </button>
        <button class="cogniread-escape-hatch" id="cogniread-escape-hatch" data-tooltip="Reset all active features" style="display: none;">
          <svg class="cogniread-escape-hatch-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          </svg>
        </button>
        <button class="cogniread-close-btn" id="cogniread-close" data-tooltip="Close CogniRead (refresh page to reopen)">×</button>
      </div>
    `;
    document.body.appendChild(this.ui.controls);

    // Panel toggle interactions
    this.ui.miniPanel.addEventListener('click', () => {
      this.ui.miniPanel.style.display = 'none';
      this.ui.controls.classList.add('cogniread-panel-expanded');
      this.state.panelCollapsed = false;
    });

    // Header click to toggle collapse/expand
    document.getElementById('cogniread-panel-header').addEventListener('click', (e) => {
      // Don't toggle if clicking on buttons
      if (e.target.closest('.cogniread-header-buttons')) return;

      this.togglePanelCollapse();
    });

    document.getElementById('cogniread-minimize').addEventListener('click', (e) => {
      e.stopPropagation();
      this.ui.controls.classList.remove('cogniread-panel-expanded');
      setTimeout(() => {
        this.ui.miniPanel.style.display = 'flex';
      }, 300);
    });

    // Close button - completely hides extension
    document.getElementById('cogniread-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCloseConfirmation();
    });

    // Prevent panel from closing when clicking inside content
    this.ui.controls.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Section collapse/expand functionality
    this.setupSectionToggles();

    // Setup pin button functionality

    // Update active features badge
    this.updateActiveBadge();
  }

  setupSectionToggles() {
    // Get all section headers
    const sectionHeaders = this.ui.controls.querySelectorAll('.cogniread-section-header');

    sectionHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        // Get the parent section
        const section = header.closest('.cogniread-section');
        if (section) {
          // Toggle collapsed class
          section.classList.toggle('collapsed');

          // Save collapsed state to storage
          const sectionName = section.getAttribute('data-section');
          if (sectionName) {
            this.saveSectionState(sectionName, section.classList.contains('collapsed'));
          }
        }
      });
    });

    // Restore collapsed states from storage
    this.restoreSectionStates();
  }

  saveSectionState(sectionName, isCollapsed) {
    chrome.storage.sync.get(['cogniread_sections'], (result) => {
      const sections = result.cogniread_sections || {};
      sections[sectionName] = { collapsed: isCollapsed };
      chrome.storage.sync.set({ cogniread_sections: sections });
    });
  }

  restoreSectionStates() {
    chrome.storage.sync.get(['cogniread_sections'], (result) => {
      const sections = result.cogniread_sections || {};

      Object.keys(sections).forEach(sectionName => {
        if (sections[sectionName].collapsed) {
          const section = this.ui.controls.querySelector(`[data-section="${sectionName}"]`);
          if (section) {
            section.classList.add('collapsed');
          }
        }
      });
    });
  }


  showCloseConfirmation() {
    // Remove any existing confirmation modal
    const existingModal = document.getElementById('cogniread-close-modal');
    if (existingModal) existingModal.remove();

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'cogniread-close-modal';
    modal.className = 'cogniread-modal-overlay';

    // Determine current theme for styling
    const isDark = document.documentElement.classList.contains('cogniread-theme-dark');

    modal.innerHTML = `
      <div class="cogniread-modal-content ${isDark ? 'dark' : 'light'}">
        <div class="cogniread-modal-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h3 class="cogniread-modal-title">Close CogniRead?</h3>
        <p class="cogniread-modal-message">
          This will disable all features and remove the extension from this page.
          <br><br>
          To reopen, refresh the page.
        </p>
        <div class="cogniread-modal-buttons">
          <button class="cogniread-modal-btn cogniread-modal-cancel" id="cogniread-cancel-close">
            Cancel
          </button>
          <button class="cogniread-modal-btn cogniread-modal-confirm" id="cogniread-confirm-close">
            Close Extension
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('cogniread-cancel-close').addEventListener('click', () => {
      modal.classList.add('fade-out');
      setTimeout(() => modal.remove(), 200);
    });

    document.getElementById('cogniread-confirm-close').addEventListener('click', () => {
      modal.classList.add('fade-out');
      setTimeout(() => {
        modal.remove();
        this.closeExtension();
      }, 200);
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 200);
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.classList.add('fade-out');
        setTimeout(() => modal.remove(), 200);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  async showAlternativePhrasingsModal(selectedText) {
    console.log('💬 Showing alternative phrasings for:', selectedText);

    // Remove any existing modal
    const existingModal = document.getElementById('cogniread-alternatives-modal');
    if (existingModal) existingModal.remove();

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'cogniread-alternatives-modal';
    modal.className = 'cogniread-modal-overlay';

    // Determine current theme for styling
    const isDark = document.documentElement.classList.contains('cogniread-theme-dark');

    modal.innerHTML = `
      <div class="cogniread-modal-content cogniread-alternatives-content ${isDark ? 'dark' : 'light'}">
        <div class="cogniread-modal-header">
          <h3 class="cogniread-modal-title">Alternative Phrasings</h3>
          <button class="cogniread-modal-close" id="cogniread-alternatives-close">×</button>
        </div>
        <div class="cogniread-alternatives-original">
          <strong>Original:</strong>
          <p>${this.escapeHtml(selectedText)}</p>
        </div>
        <div class="cogniread-alternatives-list" id="cogniread-alternatives-list">
          <div class="cogniread-loading-inline">
            <div class="cogniread-loading-spinner"></div>
            <span>Generating alternative phrasings...</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeModal = () => {
      modal.classList.add('fade-out');
      setTimeout(() => modal.remove(), 200);
    };

    document.getElementById('cogniread-alternatives-close').addEventListener('click', closeModal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Generate alternatives using AI
    try {
      const alternatives = await this.aiService.generateAlternativePhrasings(selectedText);

      const listContainer = document.getElementById('cogniread-alternatives-list');

      if (alternatives && alternatives.length > 0) {
        listContainer.innerHTML = alternatives.map((alt, index) => `
          <div class="cogniread-alternative-item">
            <div class="cogniread-alternative-number">${index + 1}</div>
            <div class="cogniread-alternative-text">${this.escapeHtml(alt)}</div>
          </div>
        `).join('');
      } else {
        listContainer.innerHTML = `
          <div class="cogniread-alternatives-empty">
            <p>No alternative phrasings could be generated. The text may be too simple or the AI service is unavailable.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to generate alternatives:', error);
      const listContainer = document.getElementById('cogniread-alternatives-list');
      listContainer.innerHTML = `
        <div class="cogniread-alternatives-error">
          <p>Failed to generate alternative phrasings. Please try again.</p>
        </div>
      `;
    }
  }

  closeExtension() {
    console.log('👋 Closing CogniRead extension...');

    // Disable all active features
    if (this.state.simplificationLevel > 0) {
      this.removeSimplification();
      this.state.simplificationLevel = 0;
    }
    if (this.state.expansionMode) {
      this.removeExpansion();
      this.state.expansionMode = false;
    }
    if (this.state.focusMode) {
      this.toggleFocusMode(false);
    }
    if (this.state.tldrMode) {
      this.toggleTLDRMode(false);
    }
    if (this.state.dyslexiaMode) {
      this.toggleDyslexiaMode(false);
    }
    if (this.state.definitionsEnabled) {
      this.disableDefinitions();
    }
    if (this.state.idiomMode) {
      this.restoreOriginalText();
    }

    // Remove all UI elements from DOM
    if (this.ui.miniPanel) {
      this.ui.miniPanel.remove();
      this.ui.miniPanel = null;
    }
    if (this.ui.controls) {
      this.ui.controls.remove();
      this.ui.controls = null;
    }
    if (this.ui.progress) {
      this.ui.progress.remove();
      this.ui.progress = null;
    }
    if (this.ui.overlay) {
      this.ui.overlay.remove();
      this.ui.overlay = null;
    }
    if (this.ui.focusOverlay) {
      this.ui.focusOverlay.remove();
      this.ui.focusOverlay = null;
    }
    if (this.ui.focusCounter) {
      this.ui.focusCounter.remove();
      this.ui.focusCounter = null;
    }
    if (this.ui.focusContent) {
      this.ui.focusContent.remove();
      this.ui.focusContent = null;
    }

    // Remove any AI warning if present
    const aiWarning = document.getElementById('cogniread-ai-warning');
    if (aiWarning) aiWarning.remove();

    // Mark extension as not initialized
    this.initialized = false;

    console.log('✅ Extension closed and removed from DOM. Refresh page to reopen.');
  }

  setupEventListeners() {
    // Simplification slider
    const simplificationSlider = document.getElementById('cogniread-simplification-slider');
    const simplificationValue = document.getElementById('cogniread-simplification-value');

    if (simplificationSlider && simplificationValue) {
      simplificationSlider.addEventListener('input', (e) => {
        const level = parseInt(e.target.value);
        const labels = ['Off', 'ELI5', 'ELI10', 'ELI15', 'College'];
        simplificationValue.textContent = labels[level];
        this.state.simplificationLevel = level;
        this.applySimplification(level);
        this.updateActiveBadge();
      });
    }

    // Text expansion toggle
    const expansionToggle = document.getElementById('cogniread-expansion-toggle');
    if (expansionToggle) {
      expansionToggle.addEventListener('click', () => {
        const isActive = expansionToggle.classList.toggle('active');
        this.toggleExpansionMode(isActive);
        this.updateActiveBadge();
      });
    }

    // Tone adjustment select
    const toneSelect = document.getElementById('cogniread-tone-select');
    if (toneSelect) {
      toneSelect.addEventListener('change', (e) => {
        const tone = e.target.value;
        this.state.toneAdjustment = tone;
        this.applyToneAdjustment(tone);
        this.updateActiveBadge();
      });
    }

    // Sentence restructuring toggle
    const restructureToggle = document.getElementById('cogniread-restructure-toggle');
    if (restructureToggle) {
      restructureToggle.addEventListener('click', () => {
        const isActive = restructureToggle.classList.toggle('active');
        this.toggleSentenceRestructuring(isActive);
        this.updateActiveBadge();
      });
    }

    // Active voice toggle
    const activeVoiceToggle = document.getElementById('cogniread-active-voice-toggle');
    if (activeVoiceToggle) {
      activeVoiceToggle.addEventListener('click', () => {
        const isActive = activeVoiceToggle.classList.toggle('active');
        this.toggleActiveVoice(isActive);
        this.updateActiveBadge();
      });
    }

    // Focus mode toggle
    const focusModeToggle = document.getElementById('cogniread-focus-mode-toggle');
    if (focusModeToggle) {
      focusModeToggle.addEventListener('click', () => {
        const isActive = focusModeToggle.classList.toggle('active');
        this.toggleFocusMode(isActive);
        this.updateActiveBadge();
      });
    }

    // TL;DR mode toggle
    const tldrModeToggle = document.getElementById('cogniread-tldr-toggle');
    if (tldrModeToggle) {
      tldrModeToggle.addEventListener('click', () => {
        const isActive = tldrModeToggle.classList.toggle('active');
        this.toggleTLDRMode(isActive);
        this.updateActiveBadge();
      });
    }

    // Distraction-Free mode toggle
    const distractionFreeToggle = document.getElementById('cogniread-distraction-free-toggle');
    if (distractionFreeToggle) {
      distractionFreeToggle.addEventListener('click', () => {
        const isActive = distractionFreeToggle.classList.toggle('active');
        this.toggleDistractionFreeMode(isActive);
        this.updateActiveBadge();
      });
    }

    // Dyslexia mode toggle
    const dyslexiaModeToggle = document.getElementById('cogniread-dyslexia-toggle');
    if (dyslexiaModeToggle) {
      dyslexiaModeToggle.addEventListener('click', () => {
        const isActive = dyslexiaModeToggle.classList.toggle('active');
        this.toggleDyslexiaMode(isActive);
        this.updateActiveBadge();
      });
    }

    // Definitions toggle
    const definitionsToggle = document.getElementById('cogniread-definitions-toggle');
    if (definitionsToggle) {
      definitionsToggle.addEventListener('click', () => {
        const isActive = definitionsToggle.classList.toggle('active');
        this.toggleDefinitions(isActive);
        this.updateActiveBadge();
      });
    }

    // Idiom mode toggle
    const idiomModeToggle = document.getElementById('cogniread-literal-toggle');
    if (idiomModeToggle) {
      idiomModeToggle.addEventListener('click', () => {
        const isActive = idiomModeToggle.classList.toggle('active');
        this.toggleIdiomMode(isActive);
        this.updateActiveBadge();
      });
    }

    // ===== AI-Powered Features Event Listeners =====

    // Concept Connections toggle
    const conceptToggle = document.getElementById('cogniread-concept-toggle');
    if (conceptToggle) {
      conceptToggle.addEventListener('click', () => {
        const isActive = conceptToggle.classList.toggle('active');
        this.toggleConceptConnections(isActive);
        this.updateActiveBadge();
      });
    }

    // Plain Language select
    const plainLanguageSelect = document.getElementById('cogniread-plain-language-select');
    if (plainLanguageSelect) {
      plainLanguageSelect.addEventListener('change', (e) => {
        this.applyPlainLanguageTranslation(e.target.value);
        this.updateActiveBadge();
      });
    }

    // Prerequisites button
    const prerequisitesBtn = document.getElementById('cogniread-prerequisites-btn');
    if (prerequisitesBtn) {
      prerequisitesBtn.addEventListener('click', () => {
        this.showPrerequisites();
      });
    }

    // Reading Goals button
    const goalsBtn = document.getElementById('cogniread-goals-btn');
    if (goalsBtn) {
      goalsBtn.addEventListener('click', () => {
        this.showReadingGoals();
      });
    }

    // Cognitive Load Heatmap toggle
    const heatmapToggle = document.getElementById('cogniread-heatmap-toggle');
    if (heatmapToggle) {
      heatmapToggle.addEventListener('click', () => {
        const isActive = heatmapToggle.classList.toggle('active');
        this.toggleCognitiveHeatmap(isActive);
        this.updateActiveBadge();
      });
    }

    // Theme toggle button - cycles through: light -> dark -> light
    const themeToggle = document.getElementById('cogniread-theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const themeOrder = ['light', 'dark'];
        const currentIndex = themeOrder.indexOf(this.state.theme);
        const nextIndex = (currentIndex + 1) % themeOrder.length;
        const nextTheme = themeOrder[nextIndex];
        this.setTheme(nextTheme);
      });
    }

    // Position toggle button - cycles through: top-right -> top-left -> bottom-left -> bottom-right -> top-right
    const positionToggle = document.getElementById('cogniread-position-toggle');
    if (positionToggle) {
      positionToggle.addEventListener('click', () => {
        const positionOrder = ['top-right', 'top-left', 'bottom-left', 'bottom-right'];
        const currentIndex = positionOrder.indexOf(this.state.panelPosition);
        const nextIndex = (currentIndex + 1) % positionOrder.length;
        const nextPosition = positionOrder[nextIndex];
        this.setPanelPosition(nextPosition);
      });
    }

    // Escape hatch button - resets all features to off
    const escapeHatch = document.getElementById('cogniread-escape-hatch');
    if (escapeHatch) {
      escapeHatch.addEventListener('click', async () => {
        // Confirmation dialog
        const confirmed = confirm('Reset all features to their default state?\n\nThis will turn off all active features and restore the page to its original appearance.');

        if (confirmed) {
          await this.resetAllFeatures();
        }
      });
    }

    // Scroll progress tracking
    window.addEventListener('scroll', () => {
      this.updateProgress();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        const toggle = document.getElementById('cogniread-focus-mode-toggle');
        if (toggle) {
          const isActive = toggle.classList.contains('active');
          toggle.classList.toggle('active');
          this.toggleFocusMode(!isActive);
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        const toggle = document.getElementById('cogniread-tldr-toggle');
        if (toggle) {
          const isActive = toggle.classList.contains('active');
          toggle.classList.toggle('active');
          this.toggleTLDRMode(!isActive);
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const toggle = document.getElementById('cogniread-distraction-free-toggle');
        if (toggle) {
          const isActive = toggle.classList.contains('active');
          toggle.classList.toggle('active');
          this.toggleDistractionFreeMode(!isActive);
        }
      }
      // Forward keyboard events to distraction-free mode
      if (this.distractionFreeMode) {
        this.distractionFreeMode.handleKeyPress(e);
      }
    });

    // Focus mode navigation
    this.ui.focusOverlay.addEventListener('click', () => {
      this.nextFocusChunk();
    });

    document.addEventListener('keydown', (e) => {
      if (this.state.focusMode) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          this.nextFocusChunk();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.previousFocusChunk();
        } else if (e.key === 'Escape') {
          const toggle = document.getElementById('cogniread-focus-mode-toggle');
          if (toggle) {
            toggle.classList.remove('active');
            this.toggleFocusMode(false);
          }
        }
      }
    });

    // ===== Star Button Event Listeners =====
    // Handle star toggle for all features
    const starButtons = document.querySelectorAll('.cogniread-star-btn');
    starButtons.forEach(starBtn => {
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering parent element events

        const featureName = starBtn.getAttribute('data-feature');
        const isStarred = starBtn.getAttribute('data-starred') === 'true';
        const newStarredState = !isStarred;

        // Update star button state
        starBtn.setAttribute('data-starred', newStarredState.toString());

        // Update starred features array
        if (newStarredState) {
          // Add to starred features
          if (!this.state.starredFeatures.includes(featureName)) {
            this.state.starredFeatures.push(featureName);
          }
        } else {
          // Remove from starred features
          this.state.starredFeatures = this.state.starredFeatures.filter(f => f !== featureName);
        }

        // Save to localStorage
        this.saveStarredFeatures();

        // Update theme selector
        this.updateThemeSelectorStarredFeatures();

        console.log(`⭐ ${newStarredState ? 'Starred' : 'Unstarred'} feature: ${featureName}`);
      });
    });
  }

  async analyzePage() {
    const content = this.cognitiveEngine.extractMainContent();
    const analysis = await this.cognitiveEngine.analyzeComplexity(content.text);

    console.log('Page analysis:', analysis);

    // Chunk content for focus mode - now works with live DOM
    this.state.contentChunks = this.cognitiveEngine.chunkContent();

    console.log('Content chunks found:', this.state.contentChunks.length);

    // Identify difficult terms
    const difficultTerms = this.cognitiveEngine.identifyDifficultTerms(content.text);
    console.log('Difficult terms found:', difficultTerms.length);
  }

  async applySimplification(level) {
    console.log('📊 Applying simplification level:', level);

    // Remove any existing simplification first
    this.removeSimplification();

    if (level === 0) {
      // Off - nothing to do
      await this.savePreferences();
      return;
    }

    const levelNames = ['', 'ELI5', 'ELI10', 'ELI15', 'College Level'];
    const levelName = levelNames[level];

    await this.applyTextSimplification(levelName);

    // If focus mode is active, refresh the current chunk to show updated content
    if (this.state.focusMode) {
      this.showFocusChunk(this.state.currentFocusIndex);
    }

    await this.savePreferences();
  }

  async toggleExpansionMode(enabled) {
    console.log('📝 Text Expansion Mode toggle:', enabled);
    this.state.expansionMode = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      // Disable simplification when expansion is enabled
      if (this.state.simplificationLevel > 0) {
        this.removeSimplification();
        this.state.simplificationLevel = 0;
        document.getElementById('simplification-slider').value = 0;
        document.getElementById('simplification-label').textContent = 'Simplification: Off';
      }
      await this.applyTextExpansion();
    } else {
      this.removeExpansion();
    }

    // If focus mode is active, refresh the current chunk to show updated content
    if (this.state.focusMode) {
      this.showFocusChunk(this.state.currentFocusIndex);
    }

    await this.savePreferences();
  }

  async applyTextSimplification(levelName) {
    console.log(`🔄 Starting ${levelName} simplification...`);

    const content = this.cognitiveEngine.extractMainContent();

    // Find main container
    const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log(`📦 Found container with selector: ${selector}`);
        break;
      }
    }
    if (!container) {
      container = document.body;
      console.log('📦 Using document.body as container');
    }

    // Find all paragraphs to simplify
    const paragraphs = container.querySelectorAll('p');
    console.log(`📝 Found ${paragraphs.length} paragraphs in container`);

    if (paragraphs.length === 0) {
      console.warn('⚠️ No paragraphs found to simplify');
      return;
    }

    // Filter to only substantial paragraphs (>20 chars)
    const substantialParagraphs = Array.from(paragraphs).filter(p => {
      // Skip if inside unwanted elements
      if (p.closest('nav, header, footer, aside, .ad, .advertisement')) {
        return false;
      }
      return p.textContent.trim().length >= 20;
    });

    console.log(`🎯 Will simplify all ${substantialParagraphs.length} substantial paragraphs`);

    if (substantialParagraphs.length === 0) {
      console.warn('⚠️ No substantial paragraphs found');
      return;
    }

    const loading = this.showLoading(`Simplifying ${substantialParagraphs.length} paragraphs to ${levelName}...`);

    try {
      let processedCount = 0;

      for (let i = 0; i < substantialParagraphs.length; i++) {
        const p = substantialParagraphs[i];
        const originalText = p.textContent.trim();

        processedCount++;
        console.log(`🔄 Processing paragraph ${processedCount}/${substantialParagraphs.length}...`);
        console.log(`   Original (${originalText.length} chars): ${originalText.substring(0, 60)}...`);

        try {
          // Use AI to simplify to the specified level
          let simplified = await this.aiService.simplifyText(originalText, levelName);

          console.log(`   Simplified (${simplified.length} chars): ${simplified.substring(0, 60)}...`);

          // Store original HTML and apply simplified version
          p.dataset.originalHTML = p.innerHTML;
          p.dataset.originalText = originalText;
          // Use innerHTML to preserve spacing and structure
          p.innerHTML = this.escapeHtml(simplified);
          p.classList.add('cogniread-simplified-text');

          console.log(`✅ Simplified paragraph ${processedCount}/${substantialParagraphs.length}`);

        } catch (error) {
          console.error(`❌ Failed to simplify paragraph ${processedCount}:`, error);
          // If AI fails, keep original but mark it
          p.dataset.originalText = originalText;
          p.classList.add('cogniread-simplified-text');
        }

        // Add small delay every 10 paragraphs to avoid overwhelming the browser
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`✨ ${levelName} simplification complete! Processed ${processedCount} paragraphs.`);

      // Scroll to the first simplified paragraph
      const firstSimplifiedParagraph = document.querySelector('.cogniread-simplified-text');
      if (firstSimplifiedParagraph) {
        console.log('📜 Scrolling to first simplified paragraph...');

        // Smooth scroll to the first simplified paragraph with some offset from top
        firstSimplifiedParagraph.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });

        // Optional: Add a brief highlight animation to draw attention
        firstSimplifiedParagraph.style.transition = 'box-shadow 0.3s ease';
        firstSimplifiedParagraph.style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.4)';

        setTimeout(() => {
          firstSimplifiedParagraph.style.boxShadow = '';
        }, 2000);
      }

    } catch (error) {
      console.error(`❌ ${levelName} simplification error:`, error);
    } finally {
      loading.remove();
    }
  }

  async applyTextExpansion() {
    console.log('🔄 Starting text expansion...');

    const content = this.cognitiveEngine.extractMainContent();

    // Find main container
    const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log(`📦 Found container with selector: ${selector}`);
        break;
      }
    }
    if (!container) {
      container = document.body;
      console.log('📦 Using document.body as container');
    }

    // Find all paragraphs to expand
    const paragraphs = container.querySelectorAll('p');
    console.log(`📝 Found ${paragraphs.length} paragraphs in container`);

    if (paragraphs.length === 0) {
      console.warn('⚠️ No paragraphs found to expand');
      return;
    }

    // Filter to only substantial paragraphs (>20 chars)
    const substantialParagraphs = Array.from(paragraphs).filter(p => {
      // Skip if inside unwanted elements
      if (p.closest('nav, header, footer, aside, .ad, .advertisement')) {
        return false;
      }
      return p.textContent.trim().length >= 20;
    });

    console.log(`🎯 Will expand all ${substantialParagraphs.length} substantial paragraphs`);

    if (substantialParagraphs.length === 0) {
      console.warn('⚠️ No substantial paragraphs found');
      return;
    }

    const totalParagraphs = substantialParagraphs.length;
    const loading = this.showLoading(`Expanding Paragraphs: 0 of ${totalParagraphs}`);

    try {
      let processedCount = 0;

      for (let i = 0; i < substantialParagraphs.length; i++) {
        const p = substantialParagraphs[i];
        const originalText = p.textContent.trim();

        processedCount++;
        console.log(`🔄 Processing paragraph ${processedCount}/${totalParagraphs}...`);
        console.log(`   Original (${originalText.length} chars): ${originalText.substring(0, 60)}...`);

        // Update loading message with progress
        const loadingText = loading.querySelector('div:last-child');
        if (loadingText) {
          loadingText.textContent = `Expanding Paragraphs: ${processedCount} of ${totalParagraphs}`;
        }

        try {
          // Use AI to expand the text
          let expanded = await this.aiService.expandText(originalText);

          console.log(`   Expanded (${expanded.length} chars): ${expanded.substring(0, 60)}...`);

          // Store original HTML and apply expanded version
          p.dataset.originalHTML = p.innerHTML;
          p.dataset.originalText = originalText;
          // Use innerHTML to preserve spacing and structure
          p.innerHTML = this.escapeHtml(expanded);
          p.classList.add('cogniread-expanded-text');

          console.log(`✅ Expanded paragraph ${processedCount}/${totalParagraphs}`);

        } catch (error) {
          console.error(`❌ Failed to expand paragraph ${processedCount}:`, error);
          // If AI fails, keep original but mark it
          p.dataset.originalText = originalText;
          p.classList.add('cogniread-expanded-text');
        }

        // Add small delay every 10 paragraphs to avoid overwhelming the browser
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`✨ Text expansion complete! Processed ${processedCount} paragraphs.`);

      // Scroll to the first expanded paragraph
      const firstExpandedParagraph = document.querySelector('.cogniread-expanded-text');
      if (firstExpandedParagraph) {
        console.log('📜 Scrolling to first expanded paragraph...');

        // Smooth scroll to the first expanded paragraph with some offset from top
        firstExpandedParagraph.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });

        // Optional: Add a brief highlight animation to draw attention
        firstExpandedParagraph.style.transition = 'box-shadow 0.3s ease';
        firstExpandedParagraph.style.boxShadow = '0 0 20px rgba(65, 133, 244, 0.4)';

        setTimeout(() => {
          firstExpandedParagraph.style.boxShadow = '';
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Text expansion error:', error);
    } finally {
      loading.remove();
    }
  }

  removeSimplification() {
    console.log('🧹 Removing simplification...');

    // Hide any loading modals
    this.hideAllLoadingModals();

    // Remove simplification and restore original HTML
    const simplified = document.querySelectorAll('.cogniread-simplified-text');
    console.log(`🧹 Restoring ${simplified.length} paragraphs to original text`);

    simplified.forEach(el => {
      el.classList.remove('cogniread-simplified-text');
      // Restore original HTML if available, otherwise fall back to text
      if (el.dataset.originalHTML) {
        el.innerHTML = el.dataset.originalHTML;
        delete el.dataset.originalHTML;
        delete el.dataset.originalText;
      } else if (el.dataset.originalText) {
        el.textContent = el.dataset.originalText;
        delete el.dataset.originalText;
      }
    });
  }

  removeExpansion() {
    console.log('🧹 Removing text expansion...');

    // Hide any loading modals
    this.hideAllLoadingModals();

    // Remove expansion and restore original HTML
    const expanded = document.querySelectorAll('.cogniread-expanded-text');
    console.log(`🧹 Restoring ${expanded.length} paragraphs to original text`);

    expanded.forEach(el => {
      el.classList.remove('cogniread-expanded-text');
      // Restore original HTML if available, otherwise fall back to text
      if (el.dataset.originalHTML) {
        el.innerHTML = el.dataset.originalHTML;
        delete el.dataset.originalHTML;
        delete el.dataset.originalText;
      } else if (el.dataset.originalText) {
        el.textContent = el.dataset.originalText;
        delete el.dataset.originalText;
      }
    });
  }

  async applyToneAdjustment(tone) {
    if (tone === 'off') {
      this.removeToneAdjustment();
      return;
    }

    console.log(`🎵 Applying ${tone} tone adjustment...`);

    const container = this.findMainContainer();
    const paragraphs = this.findSubstantialParagraphs(container);

    if (paragraphs.length === 0) {
      console.warn('⚠️ No paragraphs found for tone adjustment');
      return;
    }

    const loading = this.showLoading(`Adjusting tone to ${tone}...`);

    try {
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const originalText = p.textContent.trim();

        console.log(`🎵 Adjusting paragraph ${i + 1}/${paragraphs.length} tone...`);

        try {
          const adjusted = await this.aiService.adjustTone(originalText, tone);

          p.dataset.originalHTML = p.innerHTML;
          p.dataset.originalText = originalText;
          p.innerHTML = this.escapeHtml(adjusted);
          p.classList.add('cogniread-tone-adjusted');
        } catch (error) {
          console.error(`❌ Failed to adjust tone for paragraph ${i + 1}:`, error);
        }
      }

      console.log(`✅ Tone adjustment to ${tone} complete`);
    } finally {
      this.hideLoading(loading);
    }

    await this.savePreferences();
  }

  removeToneAdjustment() {
    console.log('🧹 Removing tone adjustment...');

    const adjusted = document.querySelectorAll('.cogniread-tone-adjusted');
    adjusted.forEach(el => {
      el.classList.remove('cogniread-tone-adjusted');
      if (el.dataset.originalHTML) {
        el.innerHTML = el.dataset.originalHTML;
        delete el.dataset.originalHTML;
        delete el.dataset.originalText;
      }
    });
  }

  async toggleActiveVoice(enabled) {
    console.log('📣 Active Voice toggle:', enabled);
    this.state.activeVoice = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      await this.applyActiveVoiceConversion();
    } else {
      this.removeActiveVoice();
    }

    await this.savePreferences();
  }

  async applyActiveVoiceConversion() {
    console.log('🔄 Converting to active voice...');

    const container = this.findMainContainer();
    const paragraphs = this.findSubstantialParagraphs(container);

    if (paragraphs.length === 0) {
      console.warn('⚠️ No paragraphs found for active voice conversion');
      return;
    }

    const loading = this.showLoading('Converting to active voice...');

    try {
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const originalText = p.textContent.trim();

        console.log(`📣 Converting paragraph ${i + 1}/${paragraphs.length}...`);

        try {
          const converted = await this.aiService.convertToActiveVoice(originalText);

          p.dataset.originalHTML = p.innerHTML;
          p.dataset.originalText = originalText;
          p.innerHTML = this.escapeHtml(converted);
          p.classList.add('cogniread-active-voice');
        } catch (error) {
          console.error(`❌ Failed to convert paragraph ${i + 1}:`, error);
        }
      }

      console.log('✅ Active voice conversion complete');
    } finally {
      this.hideLoading(loading);
    }
  }

  removeActiveVoice() {
    console.log('🧹 Removing active voice conversion...');

    // Hide any loading modals
    this.hideAllLoadingModals();

    const converted = document.querySelectorAll('.cogniread-active-voice');
    converted.forEach(el => {
      el.classList.remove('cogniread-active-voice');
      if (el.dataset.originalHTML) {
        el.innerHTML = el.dataset.originalHTML;
        delete el.dataset.originalHTML;
        delete el.dataset.originalText;
      }
    });
  }

  async toggleSentenceRestructuring(enabled) {
    console.log('✂️ Sentence Restructuring toggle:', enabled);
    this.state.sentenceRestructuring = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      await this.applySentenceRestructuring();
    } else {
      this.removeSentenceRestructuring();
    }

    await this.savePreferences();
  }

  async applySentenceRestructuring() {
    console.log('🔄 Restructuring sentences...');

    const container = this.findMainContainer();
    const paragraphs = this.findSubstantialParagraphs(container);

    if (paragraphs.length === 0) {
      console.warn('⚠️ No paragraphs found for restructuring');
      return;
    }

    const loading = this.showLoading('Restructuring sentences...');

    try {
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const originalText = p.textContent.trim();

        console.log(`✂️ Restructuring paragraph ${i + 1}/${paragraphs.length}...`);

        try {
          const restructured = await this.aiService.restructureSentences(originalText);

          p.dataset.originalHTML = p.innerHTML;
          p.dataset.originalText = originalText;
          p.innerHTML = this.escapeHtml(restructured);
          p.classList.add('cogniread-restructured');
        } catch (error) {
          console.error(`❌ Failed to restructure paragraph ${i + 1}:`, error);
        }
      }

      console.log('✅ Sentence restructuring complete');
    } finally {
      this.hideLoading(loading);
    }
  }

  removeSentenceRestructuring() {
    console.log('🧹 Removing sentence restructuring...');

    // Hide any loading modals
    this.hideAllLoadingModals();

    const restructured = document.querySelectorAll('.cogniread-restructured');
    restructured.forEach(el => {
      el.classList.remove('cogniread-restructured');
      if (el.dataset.originalHTML) {
        el.innerHTML = el.dataset.originalHTML;
        delete el.dataset.originalHTML;
        delete el.dataset.originalText;
      }
    });
  }

  findMainContainer() {
    const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) return container;
    }
    return document.body;
  }

  findSubstantialParagraphs(container) {
    const paragraphs = container.querySelectorAll('p');
    return Array.from(paragraphs).filter(p => {
      if (p.closest('nav, header, footer, aside, .ad, .advertisement')) {
        return false;
      }
      return p.textContent.trim().length >= 20;
    });
  }

  async toggleFocusMode(enabled) {
    this.state.focusMode = enabled;

    // Update all quick toggle button states
    this.updateQuickToggleStates();

    // Manage TL;DR toggle state based on Focus Mode
    const tldrToggle = document.getElementById('cogniread-tldr-toggle');
    const tldrItem = document.getElementById('tldr-toggle-item');

    if (enabled) {
      console.log('Focus Mode enabled');

      // Automatically minimize the control panel when entering Focus Mode
      this.ui.controls.classList.remove('cogniread-panel-expanded');
      setTimeout(() => {
        this.ui.miniPanel.style.display = 'flex';
      }, 300);

      // Disable TL;DR mode
      if (this.state.tldrMode) {
        this.hideTLDR();
        this.state.tldrMode = false;
        if (tldrToggle) {
          tldrToggle.classList.remove('active');
        }
      }
      if (tldrToggle) {
        tldrToggle.classList.add('cogniread-toggle-disabled');
      }
      if (tldrItem) {
        tldrItem.classList.add('cogniread-toggle-disabled');
      }

      // Swap title to disabled message
      if (tldrItem.dataset.disabledTitle) {
        tldrItem.setAttribute('title', tldrItem.dataset.disabledTitle);
      }

      // Always re-chunk content when enabling focus mode to get fresh DOM element references
      // This prevents "element not in DOM" errors when other features have modified the page
      console.log('Re-chunking content to get fresh DOM element references...');
      this.state.contentChunks = this.cognitiveEngine.chunkContent();

      console.log(`Found ${this.state.contentChunks.length} chunks to focus on`);

      // Show overlay and focus content container
      this.ui.focusOverlay.classList.remove('hidden');
      this.ui.focusCounter.classList.remove('hidden');
      this.ui.focusContent.classList.remove('hidden');

      // Add event listener to the close button in the counter
      const closeBtn = document.getElementById('cogniread-focus-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();

          // Hide the focus counter immediately
          this.ui.focusCounter.classList.add('hidden');

          // Uncheck the toggle and disable focus mode
          const focusToggle = document.getElementById('cogniread-focus-mode-toggle');
          if (focusToggle) {
            focusToggle.classList.remove('active');
          }
          this.toggleFocusMode(false);
          this.updateActiveBadge();
        });
      }

      // Verify overlay is visible
      const overlayStyles = window.getComputedStyle(this.ui.focusOverlay);
      console.log('Overlay display:', overlayStyles.display);
      console.log('Overlay background:', overlayStyles.background);
      console.log('Overlay z-index:', overlayStyles.zIndex);

      this.state.currentFocusIndex = 0;

      if (this.state.contentChunks.length > 0) {
        this.showFocusChunk(0);
      } else {
        console.error('No focusable content found on page!');
        alert('No readable content found on this page. Try a different page with articles or text.');
        this.ui.focusOverlay.classList.add('hidden');
        this.ui.focusCounter.classList.add('hidden');
        this.state.focusMode = false;
      }
    } else {
      console.log('Focus Mode disabled');

      // Re-enable TL;DR mode
      if (tldrToggle) {
        tldrToggle.classList.remove('cogniread-toggle-disabled');
      }
      if (tldrItem) {
        tldrItem.classList.remove('cogniread-toggle-disabled');

        // Swap title back to normal
        if (tldrItem.dataset.normalTitle) {
          tldrItem.setAttribute('title', tldrItem.dataset.normalTitle);
        }
      }

      this.ui.focusOverlay.classList.add('hidden');
      this.ui.focusCounter.classList.add('hidden');
      this.ui.focusContent.classList.add('hidden');
      this.clearFocusMode();
    }

    await this.savePreferences();
  }

  showFocusChunk(index) {
    console.log(`Showing focus chunk ${index + 1} of ${this.state.contentChunks.length}`);

    // Clear previous focus
    document.querySelectorAll('.cogniread-focused').forEach(el => {
      el.classList.remove('cogniread-focused');
    });

    if (index >= 0 && index < this.state.contentChunks.length) {
      const chunk = this.state.contentChunks[index];

      // Ensure element exists in DOM
      if (!document.body.contains(chunk.element)) {
        console.error('Focus chunk element not in DOM!');
        return;
      }

      // Mark original element (for reference only)
      chunk.element.classList.add('cogniread-focused');

      // Copy content into the fixed-position container with navigation controls
      this.ui.focusContent.innerHTML = `
        <div class="cogniread-focus-navigation">
          <button class="cogniread-focus-nav-btn cogniread-focus-prev" id="cogniread-focus-prev-btn" title="Previous (← Left Arrow)">
            ←
          </button>
          <div class="cogniread-focus-content-wrapper">
            ${chunk.element.innerHTML}
          </div>
          <button class="cogniread-focus-nav-btn cogniread-focus-next" id="cogniread-focus-next-btn" title="Next (→ Right Arrow or Space)">
            →
          </button>
        </div>
        <div class="cogniread-focus-tips">
          <span>💡 <strong>Tips:</strong></span>
          <span>← Prev</span>
          <span>→ Next</span>
          <span>Space: Next</span>
          <span>Esc: Exit</span>
        </div>
      `;

      // Add click handlers for navigation buttons
      const prevBtn = document.getElementById('cogniread-focus-prev-btn');
      const nextBtn = document.getElementById('cogniread-focus-next-btn');

      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.previousFocusChunk();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.nextFocusChunk();
        });
      }

      // Add click handlers for tip labels to trigger shortcuts
      const tipSpans = this.ui.focusContent.querySelectorAll('.cogniread-focus-tips span');
      tipSpans.forEach((span) => {
        const text = span.textContent.trim();

        // Make tip labels clickable
        if (text.includes('Prev') || text.includes('Next') || text.includes('Space:') || text.includes('Esc:')) {
          span.style.cursor = 'pointer';
          span.style.userSelect = 'none';

          span.addEventListener('click', (e) => {
            e.stopPropagation();

            if (text.includes('← Prev')) {
              this.previousFocusChunk();
            } else if (text.includes('→ Next') || text.includes('Space:')) {
              this.nextFocusChunk();
            } else if (text.includes('Esc:')) {
              const toggle = document.getElementById('cogniread-focus-mode-toggle');
              if (toggle) {
                toggle.classList.remove('active');
                this.toggleFocusMode(false);
              }
            }
          });

          // Add hover effect
          span.addEventListener('mouseenter', () => {
            span.style.opacity = '0.7';
          });
          span.addEventListener('mouseleave', () => {
            span.style.opacity = '1';
          });
        }
      });

      // Scroll original element into view (user won't see this because of overlay)
      chunk.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Update counter
      document.getElementById('focus-current').textContent = index + 1;
      document.getElementById('focus-total').textContent = this.state.contentChunks.length;

      console.log('Focused on:', chunk.type, chunk.text.substring(0, 50) + '...');
    } else {
      console.warn('Invalid chunk index:', index);
    }
  }

  nextFocusChunk() {
    if (this.state.currentFocusIndex < this.state.contentChunks.length - 1) {
      this.state.currentFocusIndex++;
      this.showFocusChunk(this.state.currentFocusIndex);
    }
  }

  previousFocusChunk() {
    if (this.state.currentFocusIndex > 0) {
      this.state.currentFocusIndex--;
      this.showFocusChunk(this.state.currentFocusIndex);
    }
  }

  clearFocusMode() {
    document.querySelectorAll('.cogniread-focused').forEach(el => {
      el.classList.remove('cogniread-focused');
    });
  }

  async toggleTLDRMode(enabled) {
    this.state.tldrMode = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      await this.showTLDR();
    } else {
      this.hideTLDR();
    }

    await this.savePreferences();
  }

  async showTLDR() {
    const content = this.cognitiveEngine.extractMainContent();

    // Show loading
    const loading = this.showLoading('Generating summary...');

    try {
      // Get summary from AI
      let summary = await this.aiService.summarizeText(content.text.substring(0, 5000));

      console.log('📝 Raw summary:', summary);

      // Proofread the summary before displaying
      loading.querySelector('div:last-child').textContent = 'Proofreading summary...';
      summary = await this.aiService.proofreadText(summary);

      console.log('✅ Proofread summary:', summary);

      // Create TL;DR container
      const tldrContainer = document.createElement('div');
      tldrContainer.className = 'cogniread-tldr-container';
      tldrContainer.id = 'cogniread-tldr';
      tldrContainer.innerHTML = `
        <h3>📝 TL;DR Summary</h3>
        ${this.formatSummaryAsList(summary)}
      `;

      // Insert at top of main content BEFORE other features process the page
      // This ensures TL;DR is in the DOM before definitions/idioms scan
      const mainContent = this.cognitiveEngine.extractMainContent().element;
      const realElement = document.querySelector(mainContent.tagName) || document.body;
      realElement.insertBefore(tldrContainer, realElement.firstChild);

      console.log('✅ TL;DR inserted into DOM');

      // Now apply other features to the TL;DR section if they're enabled
      // Check definitions toggle state
      const definitionsToggle = document.getElementById('cogniread-definitions-toggle');
      if (this.state.definitionsEnabled && definitionsToggle && definitionsToggle.classList.contains('active')) {
        console.log('🔄 Applying definitions to TL;DR section...');
        // Find difficult terms in the TL;DR summary
        const tldrText = tldrContainer.textContent;
        const difficultTerms = this.cognitiveEngine.identifyDifficultTerms(tldrText);

        // Highlight difficult words in TL;DR
        const tldrElements = tldrContainer.querySelectorAll('li');
        tldrElements.forEach(element => {
          difficultTerms.forEach(term => {
            this.wrapTermInTextNodes(element, term);
          });
        });
      }

      // Check idiom mode toggle state - ONLY process if toggle is active
      const idiomToggle = document.getElementById('cogniread-literal-toggle');
      if (this.state.idiomMode && idiomToggle && idiomToggle.classList.contains('active')) {
        console.log('🔄 Scanning TL;DR for idioms (Literal Language mode is enabled)...');
        // Scan TL;DR for idioms using dictionary-based detection
        const tldrElements = tldrContainer.querySelectorAll('li');
        for (const element of tldrElements) {
          const text = element.textContent.trim();
          if (text.length >= 15) {
            try {
              // Use dictionary detection (fast, no AI quota)
              const result = this.aiService.fallbackIdiomDetection(text);
              if (result.hasIdiom) {
                this.wrapIdiomInTextNodes(element, result.idiom, text);
              }
            } catch (error) {
              console.error('Failed to process TL;DR for idioms:', error);
            }
          }
        }
      } else if (!idiomToggle || !idiomToggle.classList.contains('active')) {
        console.log('ℹ️ Skipping idiom processing for TL;DR - Literal Language mode is disabled');
      }

      // Scroll to TL;DR section with vertical padding
      console.log('📜 Scrolling to TL;DR summary...');

      // Wait a brief moment for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Smooth scroll to the TL;DR container with some offset from top
      tldrContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });

      // Add a brief highlight animation to draw attention
      tldrContainer.style.transition = 'box-shadow 0.3s ease';
      tldrContainer.style.boxShadow = '0 0 20px rgba(65, 133, 244, 0.4)';

      setTimeout(() => {
        tldrContainer.style.boxShadow = '';
      }, 2000);

    } catch (error) {
      console.error('Failed to generate TL;DR:', error);
    } finally {
      loading.remove();
    }
  }

  formatSummaryAsList(summary) {
    // Convert summary text to bullet points
    const lines = summary.split(/[.!?]+/).filter(line => line.trim().length > 0);
    const listItems = lines.map(line => `<li>${line.trim()}</li>`).join('');
    return `<ul>${listItems}</ul>`;
  }

  hideTLDR() {
    const tldr = document.getElementById('cogniread-tldr');
    if (tldr) tldr.remove();
  }

  async toggleDyslexiaMode(enabled) {
    this.state.dyslexiaMode = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      document.body.classList.add('cogniread-dyslexia-mode');
    } else {
      document.body.classList.remove('cogniread-dyslexia-mode');
    }

    await this.savePreferences();
  }

  async setTheme(theme) {
    console.log('🎨 Setting theme:', theme);
    this.state.theme = theme;

    // Update toggle button state and title
    const toggleBtn = document.getElementById('cogniread-theme-toggle');

    if (toggleBtn) {
      // Update tooltip title
      const labels = {
        'light': 'Light',
        'dark': 'Dark'
      };
      toggleBtn.setAttribute('title', `Theme: ${labels[theme] || 'Light'}`);

      // Update visual state via data attribute
      toggleBtn.setAttribute('data-theme', theme);
    }

    // Apply theme
    this.applyTheme(theme);

    // Save preference
    await this.savePreferences();
  }

  async setPanelPosition(position) {
    console.log('📍 Setting panel position:', position);
    this.state.panelPosition = position;

    // Update toggle button state and title
    const toggleBtn = document.getElementById('cogniread-position-toggle');

    if (toggleBtn) {
      // Update tooltip title
      const labels = {
        'top-right': 'Top Right',
        'top-left': 'Top Left',
        'bottom-right': 'Bottom Right',
        'bottom-left': 'Bottom Left'
      };
      toggleBtn.setAttribute('title', `Position: ${labels[position] || 'Top Right'}`);

      // Update visual state via data attribute
      toggleBtn.setAttribute('data-position', position);
    }

    // Apply position
    this.applyPanelPosition(position);

    // Save preference
    await this.savePreferences();
  }

  applyPanelPosition(position) {
    // Remove existing position classes from panel and mini button
    const panel = this.ui.controls;
    const miniPanel = this.ui.miniPanel;

    if (panel) {
      panel.classList.remove('position-top-right', 'position-top-left', 'position-bottom-right', 'position-bottom-left');
      panel.classList.add(`position-${position}`);
      console.log('📍 Applied position class to panel:', `position-${position}`);
    }

    if (miniPanel) {
      miniPanel.classList.remove('position-top-right', 'position-top-left', 'position-bottom-right', 'position-bottom-left');
      miniPanel.classList.add(`position-${position}`);
      console.log('📍 Applied position class to mini panel:', `position-${position}`);
    }
  }

  applyTheme(theme) {
    // Remove existing theme classes
    document.documentElement.classList.remove('cogniread-theme-light', 'cogniread-theme-dark');

    // Apply specific theme
    document.documentElement.classList.add(`cogniread-theme-${theme}`);
    console.log('🎨 Applied theme:', theme);
  }

  initializeTheme() {
    // Apply initial theme
    this.applyTheme(this.state.theme);
  }

  async toggleDefinitions(enabled) {
    console.log('📚 Definitions toggle:', enabled);
    this.state.definitionsEnabled = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      await this.enableDefinitions();
    } else {
      this.disableDefinitions();
    }

    // If focus mode is active, refresh the current chunk to show updated content
    if (this.state.focusMode) {
      this.showFocusChunk(this.state.currentFocusIndex);
    }

    await this.savePreferences();
  }

  async enableDefinitions() {
    console.log('🔄 Enabling definitions...');

    const content = this.cognitiveEngine.extractMainContent();
    const difficultTerms = this.cognitiveEngine.identifyDifficultTerms(content.text);

    console.log(`📝 Found ${difficultTerms.length} difficult terms:`, difficultTerms.slice(0, 10));

    if (difficultTerms.length === 0) {
      console.warn('⚠️ No difficult terms found');
      return;
    }

    // Find main container
    const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log(`📦 Found container with selector: ${selector}`);
        break;
      }
    }
    if (!container) {
      container = document.body;
      console.log('📦 Using document.body as container');
    }

    // Highlight difficult words in the content using text node manipulation
    const elements = container.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6');
    let highlightCount = 0;

    console.log(`📝 Processing ${elements.length} elements for difficult words...`);

    elements.forEach((element, index) => {
      // Skip navigation, ads, etc.
      if (element.closest('nav, header, footer, aside, .ad, .advertisement')) {
        return;
      }

      // Use text node replacement to preserve HTML structure
      difficultTerms.forEach(term => {
        const wrapped = this.wrapTermInTextNodes(element, term);
        if (wrapped > 0) {
          highlightCount += wrapped;
          console.log(`✅ Wrapped ${wrapped} instance(s) of "${term}" in element ${index + 1}`);
        }
      });
    });

    console.log(`✅ Highlighted ${highlightCount} difficult word instances`);

    // Verify spans were created
    const spans = document.querySelectorAll('.cogniread-difficult-word');
    console.log(`🔍 Verification: Found ${spans.length} definition spans in DOM`);

    if (spans.length === 0) {
      console.warn('⚠️ No definition spans were created!');
    } else {
      console.log(`📊 Sample spans:`, Array.from(spans).slice(0, 3).map(s => s.textContent));
    }

    // Add hover event listeners using event delegation on document
    this.attachDefinitionListeners();
  }

  wrapTermInTextNodes(element, term) {
    // Walk through all text nodes and wrap term occurrences
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      // Skip if already inside a cogniread span
      if (node.parentElement.classList.contains('cogniread-difficult-word') ||
          node.parentElement.classList.contains('cogniread-idiom-phrase')) {
        continue;
      }
      textNodes.push(node);
    }

    const termLower = term.toLowerCase();
    let replacementCount = 0;

    textNodes.forEach(textNode => {
      const text = textNode.nodeValue;
      const textLower = text.toLowerCase();

      // Find all occurrences of the term (word boundary)
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      const matches = [...text.matchAll(regex)];

      if (matches.length === 0) return;

      // Build replacement with spans
      let lastIndex = 0;
      const fragment = document.createDocumentFragment();

      matches.forEach(match => {
        const matchIndex = match.index;
        const matchedTerm = match[0];

        // Add text before match
        if (matchIndex > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
        }

        // Create span for the term
        const span = document.createElement('span');
        span.className = 'cogniread-difficult-word';
        span.setAttribute('data-term', matchedTerm);
        span.textContent = matchedTerm;
        fragment.appendChild(span);

        lastIndex = matchIndex + matchedTerm.length;
        replacementCount++;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      // Replace the text node with our fragment
      textNode.parentNode.replaceChild(fragment, textNode);
    });

    return replacementCount;
  }

  attachDefinitionListeners() {
    // Remove previous listeners if any
    if (this.definitionMouseOverHandler) {
      document.removeEventListener('mouseover', this.definitionMouseOverHandler, true);
    }
    if (this.definitionMouseOutHandler) {
      document.removeEventListener('mouseout', this.definitionMouseOutHandler, true);
    }

    // Create handlers with proper binding and null checks
    this.definitionMouseOverHandler = async (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('cogniread-difficult-word')) {
        console.log('🖱️ Mouse over difficult word:', e.target.textContent);
        await this.showDefinition(e.target);
      }
    };

    this.definitionMouseOutHandler = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('cogniread-difficult-word')) {
        console.log('🖱️ Mouse out from difficult word');
        this.hideDefinition();
      }
    };

    // Add listeners using mouseover/mouseout which bubble properly
    document.addEventListener('mouseover', this.definitionMouseOverHandler, true);
    document.addEventListener('mouseout', this.definitionMouseOutHandler, true);

    console.log('✅ Attached definition hover listeners via event delegation');
  }

  disableDefinitions() {
    console.log('🧹 Disabling definitions...');

    // Remove event listeners
    if (this.definitionMouseOverHandler) {
      document.removeEventListener('mouseover', this.definitionMouseOverHandler, true);
      this.definitionMouseOverHandler = null;
    }
    if (this.definitionMouseOutHandler) {
      document.removeEventListener('mouseout', this.definitionMouseOutHandler, true);
      this.definitionMouseOutHandler = null;
    }

    // Remove all highlighted words
    const spans = document.querySelectorAll('.cogniread-difficult-word');
    console.log(`🧹 Removing ${spans.length} definition spans`);

    spans.forEach(span => {
      const text = span.textContent;
      span.replaceWith(document.createTextNode(text));
    });

    // Remove any visible definition bubble
    this.hideDefinition();

    console.log('✅ Definitions disabled');
  }

  async showDefinition(element) {
    console.log('📖 showDefinition called for element:', element);
    const term = element.dataset.term;
    console.log('📖 Term to define:', term);

    if (!term) {
      console.warn('⚠️ No term found in dataset!');
      return;
    }

    const rect = element.getBoundingClientRect();

    // Remove any existing definition
    this.hideDefinition();

    // Create definition bubble
    const bubble = document.createElement('div');
    bubble.className = 'cogniread-definition';
    bubble.id = 'cogniread-definition-bubble';
    bubble.innerHTML = '<span class="cogniread-definition-loader"></span>Loading definition...';

    // Position above the word (fixed position accounts for scrolling)
    // Center horizontally over the word
    const left = rect.left + rect.width / 2 + window.scrollX;
    const top = rect.top + window.scrollY - 10;

    bubble.style.position = 'absolute';
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.style.transform = 'translate(-50%, -100%)';
    bubble.style.zIndex = '2147483647';

    console.log('📌 Bubble position:', { left, top });

    document.body.appendChild(bubble);
    console.log('✅ Bubble added to DOM');

    // Get definition from AI
    try {
      // Extract the complete sentence containing the term for context-aware definitions
      const context = this.extractSentenceContext(element, term);
      console.log('🔍 Getting context-aware definition with sentence:', context.substring(0, 100) + '...');

      const definition = await this.aiService.explainTerm(term, context);
      console.log('✅ Definition received:', definition);

      // Format the definition with highlighted term
      // Check if definition follows "term means..." or "term: ..." pattern
      if (definition.toLowerCase().startsWith(term.toLowerCase())) {
        // Split at first occurrence of "means" or ":"
        const meansSplit = definition.split(/\s+means\s+/i);
        const colonSplit = definition.split(/:\s*/);

        if (meansSplit.length > 1) {
          // Format: "term means definition"
          bubble.innerHTML = `<strong style="color: #4185F4; font-weight: 600;">${this.escapeHtml(meansSplit[0])}</strong> means ${this.escapeHtml(meansSplit.slice(1).join(' means '))}`;
        } else if (colonSplit.length > 1) {
          // Format: "term: definition"
          bubble.innerHTML = `<strong style="color: #4185F4; font-weight: 600;">${this.escapeHtml(colonSplit[0])}</strong>: ${this.escapeHtml(colonSplit.slice(1).join(':'))}`;
        } else {
          // Fallback - just highlight the term if it appears at the start
          bubble.innerHTML = `<strong style="color: #4185F4; font-weight: 600;">${this.escapeHtml(term)}</strong>${this.escapeHtml(definition.substring(term.length))}`;
        }
      } else {
        // Definition doesn't start with term, just display it
        bubble.textContent = definition;
      }

      console.log('✅ Bubble text updated');
    } catch (error) {
      console.error('❌ Failed to get definition:', error);
      bubble.innerHTML = `<strong style="color: #4185F4; font-weight: 600;">${this.escapeHtml(term)}</strong>: A complex or technical word. (Definition unavailable)`;
    }
  }

  hideDefinition() {
    const bubble = document.getElementById('cogniread-definition-bubble');
    if (bubble) bubble.remove();
  }

  async toggleIdiomMode(enabled) {
    console.log('💬 Idiom mode toggle:', enabled);
    this.state.idiomMode = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      await this.convertIdiomsToLiteral();
    } else {
      this.restoreOriginalText();
    }

    // If focus mode is active, refresh the current chunk to show updated content
    if (this.state.focusMode) {
      this.showFocusChunk(this.state.currentFocusIndex);
    }

    await this.savePreferences();
  }

  toggleDistractionFreeMode(enabled) {
    console.log('📄 Distraction-free mode toggle:', enabled);
    this.state.distractionFree = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      this.distractionFreeMode.activate();
    } else {
      this.distractionFreeMode.deactivate();
    }
  }

  async convertIdiomsToLiteral() {
    console.log('🔄 Scanning entire page for idioms...');

    // Find main container
    const selectors = ['article', 'main', '[role="main"]', '.content', '#content'];
    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) break;
    }
    if (!container) container = document.body;

    // Find ALL text-containing elements
    const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
    console.log(`📝 Found ${elements.length} elements to scan`);

    if (elements.length === 0) {
      console.warn('⚠️ No text elements found');
      return;
    }

    const loading = this.showLoading('Scanning page for idioms...');

    try {
      let totalIdiomsFound = 0;
      const processedElements = [];

      // Scan ALL elements on the page
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        // Skip navigation, ads, etc.
        if (element.closest('nav, header, footer, aside, .ad, .advertisement')) {
          continue;
        }

        const text = element.textContent.trim();

        // Skip very short text
        if (text.length < 15) {
          continue;
        }

        console.log(`🔍 Scanning element ${i + 1}/${elements.length}: ${text.substring(0, 50)}...`);

        try {
          // Split text into sentences - handle both punctuated and non-punctuated text
          // Match sentences with punctuation OR text chunks without punctuation (like headings)
          const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+/g) || [text];
          console.log(`   Found ${sentences.length} sentences`);

          let foundIdiomsInElement = false;
          const idiomSpans = [];

          // Check EACH sentence for idioms
          for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();

            if (trimmedSentence.length < 10) {
              console.log(`   ⏭️ Skipping short sentence (${trimmedSentence.length} chars)`);
              continue;
            }

            console.log(`   🔎 Checking: "${trimmedSentence.substring(0, 70)}..."`);

            // Use dictionary-based detection (fast, no AI quota used)
            // AI explanation will be fetched on hover
            const result = this.aiService.fallbackIdiomDetection(trimmedSentence);

            console.log(`   📊 Result:`, result);

            if (result.hasIdiom) {
              console.log(`   ✅ Idiom detected: "${result.idiom}"`);

              idiomSpans.push({
                idiom: result.idiom,
                original: trimmedSentence
              });

              foundIdiomsInElement = true;
              totalIdiomsFound++;
            } else {
              console.log(`   ❌ No idiom found`);
            }
          }

          // If we found idioms, wrap them in spans
          if (foundIdiomsInElement) {
            console.log(`   🎯 Wrapping ${idiomSpans.length} idioms in this element`);

            // Use safe text replacement that preserves HTML structure
            idiomSpans.forEach(({ idiom, original }, index) => {
              console.log(`   🔄 Replacing idiom ${index + 1}: "${idiom}"`);
              this.wrapIdiomInTextNodes(element, idiom, original);
            });

            element.classList.add('cogniread-has-idioms');
            processedElements.push(element);

            // Verify spans were created
            const spans = element.querySelectorAll('.cogniread-idiom-phrase');
            console.log(`   ✅ Created ${spans.length} idiom spans in element`);
          }

        } catch (error) {
          console.error(`❌ Failed to process element ${i + 1}:`, error);
        }
      }

      console.log(`✅ Found ${totalIdiomsFound} idioms across ${processedElements.length} elements`);

      // Attach event listeners using event delegation
      this.attachIdiomListeners();

      console.log(`✨ Idiom scanning complete! Found ${totalIdiomsFound} idiom phrases.`);

    } catch (error) {
      console.error('❌ Idiom conversion error:', error);
    } finally {
      loading.remove();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  extractSentenceContext(element, term) {
    // Get the full text from parent element
    const parentText = element.parentElement.textContent;

    // Split into sentences (handle various punctuation)
    const sentences = parentText.match(/[^.!?]+[.!?]+/g) || [parentText];

    // Find the sentence containing the term (case-insensitive)
    const termLower = term.toLowerCase();
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(termLower)) {
        return sentence.trim();
      }
    }

    // Fallback: if no sentence found, return first 300 chars from parent
    return parentText.substring(0, 300);
  }

  wrapIdiomInTextNodes(element, idiom, original) {
    // Walk through all text nodes and replace idiom occurrences
    // This preserves HTML structure by only modifying text content
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      // Skip if already inside a cogniread span
      if (node.parentElement.classList.contains('cogniread-idiom-phrase')) {
        continue;
      }
      textNodes.push(node);
    }

    const idiomLower = idiom.toLowerCase();
    let replacementCount = 0;

    textNodes.forEach(textNode => {
      const text = textNode.nodeValue;
      const textLower = text.toLowerCase();

      // Check if this text node contains the idiom
      const index = textLower.indexOf(idiomLower);
      if (index === -1) return;

      // Extract the exact case from the original text
      const actualIdiom = text.substring(index, index + idiom.length);

      // Split the text node into three parts: before, idiom, after
      const before = text.substring(0, index);
      const after = text.substring(index + idiom.length);

      // Create the span element
      const span = document.createElement('span');
      span.className = 'cogniread-idiom-phrase';
      span.setAttribute('data-original', original);
      span.setAttribute('data-idiom', actualIdiom);
      // Note: data-literal removed - explanation will be fetched on hover
      span.textContent = actualIdiom;

      // Create document fragment to insert all at once
      const fragment = document.createDocumentFragment();

      if (before) {
        fragment.appendChild(document.createTextNode(before));
      }

      fragment.appendChild(span);

      if (after) {
        fragment.appendChild(document.createTextNode(after));
      }

      // Replace the text node with our fragment
      textNode.parentNode.replaceChild(fragment, textNode);
      replacementCount++;

      console.log(`   ✅ Wrapped "${actualIdiom}" in text node`);
    });

    if (replacementCount === 0) {
      console.log(`   ⚠️ Idiom "${idiom}" found in sentence but not in text nodes`);
    }
  }

  attachIdiomListeners() {
    // Remove previous listeners if any
    if (this.idiomMouseOverHandler) {
      document.removeEventListener('mouseover', this.idiomMouseOverHandler, true);
    }
    if (this.idiomMouseOutHandler) {
      document.removeEventListener('mouseout', this.idiomMouseOutHandler, true);
    }

    // Create handlers with proper binding and null checks
    this.idiomMouseOverHandler = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('cogniread-idiom-phrase')) {
        console.log('🔥 Hovering over idiom!');
        this.showIdiomTooltip(e.target);
      }
    };

    this.idiomMouseOutHandler = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('cogniread-idiom-phrase')) {
        this.hideIdiomTooltip();
      }
    };

    // Add listeners using mouseover/mouseout which bubble properly
    document.addEventListener('mouseover', this.idiomMouseOverHandler, true);
    document.addEventListener('mouseout', this.idiomMouseOutHandler, true);

    console.log('✅ Attached idiom hover listeners via event delegation');
  }

  restoreOriginalText() {
    console.log('🧹 Restoring original text with idioms...');

    // Remove event listeners
    if (this.idiomMouseOverHandler) {
      document.removeEventListener('mouseover', this.idiomMouseOverHandler, true);
    }
    if (this.idiomMouseOutHandler) {
      document.removeEventListener('mouseout', this.idiomMouseOutHandler, true);
    }

    // Remove all idiom spans and restore original text
    document.querySelectorAll('.cogniread-has-idioms').forEach(element => {
      // Unwrap all idiom spans
      element.querySelectorAll('.cogniread-idiom-phrase').forEach(span => {
        const idiom = span.dataset.idiom;
        span.replaceWith(idiom);
      });
      element.classList.remove('cogniread-has-idioms');
    });

    // Remove any visible tooltip
    this.hideIdiomTooltip();
  }

  async showIdiomTooltip(span) {
    console.log('🖱️ Hovering over idiom phrase');
    const idiom = span.dataset.idiom;
    const original = span.dataset.original;

    console.log('📝 Idiom:', idiom);

    if (!idiom) {
      console.warn('⚠️ Missing idiom data!');
      return;
    }

    const rect = span.getBoundingClientRect();

    // Remove any existing tooltip
    this.hideIdiomTooltip();

    // Create tooltip bubble
    const bubble = document.createElement('div');
    bubble.className = 'cogniread-idiom-tooltip';
    bubble.id = 'cogniread-idiom-bubble';
    bubble.innerHTML = `
      <div class="cogniread-idiom-tooltip-header">${this.escapeHtml(idiom)}</div>
      <div class="cogniread-idiom-tooltip-content">Loading explanation...</div>
    `;

    // Position above the span (account for scrolling)
    const left = rect.left + rect.width / 2 + window.scrollX;
    const top = rect.top + window.scrollY - 10;

    console.log('📌 Tooltip position:', { left, top });

    bubble.style.position = 'absolute';
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.style.transform = 'translate(-50%, -100%)';
    bubble.style.zIndex = '2147483647';

    document.body.appendChild(bubble);
    console.log('✅ Tooltip added to DOM');

    // Fetch AI-powered explanation on hover (not during scan)
    try {
      // Call explainIdiom without pre-existing literal - AI will generate it
      const explanation = await this.aiService.explainIdiom(idiom);
      console.log('✅ AI explanation received:', explanation);

      // Update tooltip content with explanation
      const headerDiv = bubble.querySelector('.cogniread-idiom-tooltip-header');
      const contentDiv = bubble.querySelector('.cogniread-idiom-tooltip-content');

      if (headerDiv && contentDiv) {
        // Set the idiom phrase as the header
        headerDiv.textContent = idiom;

        // Extract and set the explanation (remove "idiom means" prefix if present)
        let cleanExplanation = explanation;
        if (explanation.toLowerCase().includes(idiom.toLowerCase() + ' means')) {
          const parts = explanation.split(/\s+means\s+/i);
          if (parts.length > 1) {
            cleanExplanation = parts.slice(1).join(' means ');
          }
        } else if (explanation.toLowerCase().startsWith(idiom.toLowerCase())) {
          // Remove idiom from start if present
          cleanExplanation = explanation.substring(idiom.length).replace(/^[\s:]+/, '');
        }

        contentDiv.textContent = cleanExplanation;
      }
    } catch (error) {
      console.error('❌ Failed to get AI explanation:', error);
      // Fallback to dictionary explanation if AI fails
      const headerDiv = bubble.querySelector('.cogniread-idiom-tooltip-header');
      const contentDiv = bubble.querySelector('.cogniread-idiom-tooltip-content');
      if (headerDiv && contentDiv) {
        headerDiv.textContent = idiom;
        contentDiv.textContent = 'A figure of speech with a non-literal meaning. (AI explanation unavailable)';
      }
    }
  }

  hideIdiomTooltip() {
    const bubble = document.getElementById('cogniread-idiom-bubble');
    if (bubble) {
      console.log('🧹 Removing idiom tooltip');
      bubble.remove();
    }
  }

  updateProgress() {
    if (!this.ui.progress) return;

    const scrollPosition = window.scrollY + window.innerHeight;
    const totalHeight = document.documentElement.scrollHeight;
    const progress = this.cognitiveEngine.calculateProgress(scrollPosition, totalHeight);
    this.ui.progress.style.width = `${progress}%`;
  }

  updateActiveBadge() {
    const toggles = document.querySelectorAll('.cogniread-toggle');
    const activeCount = Array.from(toggles).filter(toggle => toggle.classList.contains('active')).length;
    const badge = document.getElementById('cogniread-active-badge');
    const headerCount = document.getElementById('cogniread-header-count');

    if (badge) {
      badge.textContent = activeCount;
      badge.style.display = activeCount > 0 ? 'flex' : 'none';
    }

    if (headerCount) {
      headerCount.textContent = activeCount;
      headerCount.style.display = activeCount > 0 ? 'inline' : 'none';
    }

    // Update escape hatch button state and visibility
    const escapeHatch = document.getElementById('cogniread-escape-hatch');
    if (escapeHatch) {
      if (activeCount > 0) {
        escapeHatch.classList.add('has-active-features');
        escapeHatch.style.display = '';  // Show button
        escapeHatch.title = `Reset All Features (${activeCount} active)`;
      } else {
        escapeHatch.classList.remove('has-active-features');
        escapeHatch.style.display = 'none';  // Hide button
        escapeHatch.title = 'Reset All Features';
      }
    }

    // Update section chevron colors
    this.updateSectionChevronColors();
  }

  updateSectionChevronColors() {
    // Get all sections
    const sections = document.querySelectorAll('.cogniread-section');

    sections.forEach(section => {
      // Get all toggles and selects within this section
      const toggles = section.querySelectorAll('.cogniread-toggle');
      const selects = section.querySelectorAll('select');
      const slider = section.querySelector('#cogniread-simplification-slider');

      let hasActiveFeature = false;

      // Check if any toggle is active
      toggles.forEach(toggle => {
        if (toggle.classList.contains('active')) {
          hasActiveFeature = true;
        }
      });

      // Check if any select has a non-"off" value
      selects.forEach(select => {
        if (select.value && select.value !== 'off') {
          hasActiveFeature = true;
        }
      });

      // Check if slider is not at 0 (Off position)
      if (slider && parseInt(slider.value) > 0) {
        hasActiveFeature = true;
      }

      // Update chevron color
      const chevron = section.querySelector('.cogniread-chevron');
      if (chevron) {
        if (hasActiveFeature) {
          chevron.style.color = 'var(--toggle-active)';
        } else {
          chevron.style.color = 'var(--text-tertiary)';
        }
      }
    });
  }

  togglePanelCollapse() {
    this.state.panelCollapsed = !this.state.panelCollapsed;

    if (this.state.panelCollapsed) {
      this.ui.controls.classList.add('cogniread-panel-collapsed');
    } else {
      this.ui.controls.classList.remove('cogniread-panel-collapsed');
    }
  }

  showLoading(message = 'Processing...') {
    const loading = document.createElement('div');
    loading.className = 'cogniread-loading';
    loading.innerHTML = `
      <div class="cogniread-loading-spinner"></div>
      <div>${message}</div>
    `;
    document.body.appendChild(loading);
    return loading;
  }

  hideLoading(loading) {
    if (loading && loading.parentElement) {
      loading.remove();
    }
  }

  hideAllLoadingModals() {
    // Hide any orphaned loading modals
    const loadingModals = document.querySelectorAll('.cogniread-loading');
    loadingModals.forEach(modal => modal.remove());
  }

  showAIWarning() {
    // Remove any existing warning
    const existingWarning = document.getElementById('cogniread-ai-warning');
    if (existingWarning) existingWarning.remove();

    const warning = document.createElement('div');
    warning.id = 'cogniread-ai-warning';
    warning.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #313F2C 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      z-index: 2147483646;
      max-width: 380px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      animation: slideIn 0.3s ease-out;
    `;

    warning.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 24px; flex-shrink: 0;">⚠️</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 6px;">Chrome AI Not Available</div>
          <div style="font-size: 13px; opacity: 0.95; margin-bottom: 8px;">
            CogniRead will use fallback methods. For best results, enable Chrome AI:
          </div>
          <ol style="margin: 8px 0 8px 20px; padding: 0; font-size: 12px; opacity: 0.9;">
            <li style="margin-bottom: 4px;">Use <a href="https://www.google.com/chrome/canary/" target="_blank" style="color: #fff; text-decoration: underline;">Chrome Canary</a></li>
            <li style="margin-bottom: 4px;">Enable flags at chrome://flags</li>
            <li>Restart Chrome</li>
          </ol>
          <button id="cogniread-dismiss-warning" style="
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 8px;
            width: 100%;
            transition: background 0.2s;
          ">
            Got it, use fallback methods
          </button>
        </div>
        <button id="cogniread-close-warning" style="
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
          flex-shrink: 0;
        ">×</button>
      </div>
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(warning);

    // Add event listeners
    const dismissBtn = document.getElementById('cogniread-dismiss-warning');
    const closeBtn = document.getElementById('cogniread-close-warning');

    dismissBtn.addEventListener('click', () => {
      warning.remove();
    });

    closeBtn.addEventListener('click', () => {
      warning.remove();
    });

    // Add hover event listeners (CSP-compliant)
    dismissBtn.addEventListener('mouseover', () => {
      dismissBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    dismissBtn.addEventListener('mouseout', () => {
      dismissBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.background = 'none';
    });

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => warning.remove(), 300);
      }
    }, 15000);
  }

  async resetAllFeatures() {
    console.log('🔄 Resetting all features to default state...');

    // Disable all toggles in the UI
    document.querySelectorAll('.cogniread-toggle.active').forEach(toggle => {
      toggle.classList.remove('active');
    });

    // Reset simplification slider
    const simplificationSlider = document.getElementById('cogniread-simplification-slider');
    const simplificationValue = document.getElementById('cogniread-simplification-value');
    if (simplificationSlider) {
      simplificationSlider.value = 0;
      if (simplificationValue) {
        simplificationValue.textContent = 'Off';
      }
    }

    // Reset tone select
    const toneSelect = document.getElementById('cogniread-tone-select');
    if (toneSelect) {
      toneSelect.value = 'off';
    }

    // Reset plain language select
    const plainLanguageSelect = document.getElementById('cogniread-plain-language-select');
    if (plainLanguageSelect) {
      plainLanguageSelect.value = 'off';
    }

    // Turn off Focus Mode
    if (this.state.focusMode) {
      await this.toggleFocusMode(false);
    }

    // Turn off TL;DR Mode
    if (this.state.tldrMode) {
      this.toggleTLDRMode(false);
    }

    // Turn off Dyslexia Mode
    if (this.state.dyslexiaMode) {
      this.toggleDyslexiaMode(false);
    }

    // Turn off Definitions
    if (this.state.definitionsEnabled) {
      await this.toggleDefinitions(false);
    }

    // Turn off Idiom Mode
    if (this.state.idiomMode) {
      await this.toggleIdiomMode(false);
    }

    // Turn off Expansion Mode
    if (this.state.expansionMode) {
      this.toggleExpansion(false);
    }

    // Turn off Active Voice
    if (this.state.activeVoice) {
      await this.toggleActiveVoice(false);
    }

    // Turn off Sentence Restructuring
    if (this.state.sentenceRestructuring) {
      await this.toggleSentenceRestructuring(false);
    }

    // Turn off Concept Connections
    if (this.state.conceptConnections) {
      this.toggleConceptConnections(false);
    }

    // Turn off Cognitive Heatmap
    if (this.state.cognitiveHeatmap) {
      this.toggleCognitiveHeatmap(false);
    }

    // Remove any simplification
    if (this.state.simplificationLevel > 0) {
      this.removeSimplification();
      this.state.simplificationLevel = 0;
    }

    // Reset tone adjustment
    if (this.state.toneAdjustment && this.state.toneAdjustment !== 'off') {
      this.removeToneAdjustment();
      this.state.toneAdjustment = 'off';
    }

    // Update the active badge
    this.updateActiveBadge();

    // Save the reset state
    await this.savePreferences();

    console.log('✅ All features reset to default state');

    // Show a brief notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideInDown 0.3s ease-out;
    `;
    notification.textContent = '✓ All features reset to default';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutUp 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  async savePreferences() {
    try {
      await chrome.storage.sync.set({
        cogniread_preferences: {
          simplificationLevel: this.state.simplificationLevel,
          expansionMode: this.state.expansionMode,
          focusMode: this.state.focusMode,
          tldrMode: this.state.tldrMode,
          dyslexiaMode: this.state.dyslexiaMode,
          definitionsEnabled: this.state.definitionsEnabled,
          idiomMode: this.state.idiomMode,
          distractionFree: this.state.distractionFree,
          activeVoice: this.state.activeVoice,
          sentenceRestructuring: this.state.sentenceRestructuring,
          conceptConnections: this.state.conceptConnections,
          cognitiveHeatmap: this.state.cognitiveHeatmap,
          toneAdjustment: this.state.toneAdjustment,
          theme: this.state.theme,
          panelPosition: this.state.panelPosition,
          starredFeatures: this.state.starredFeatures
        }
      });
    } catch (error) {
      // Extension context invalidated (extension reloaded/updated)
      // Silently fail - preferences will be lost but extension still works
      if (error.message.includes('Extension context invalidated')) {
        console.warn('⚠️ CogniRead: Extension was reloaded. Preferences not saved.');
      } else {
        console.error('Error saving preferences:', error);
      }
    }
  }

  async loadPreferences() {
    try {
      const result = await chrome.storage.sync.get(['cogniread_preferences']);
      if (result.cogniread_preferences) {
        const prefs = result.cogniread_preferences;

      // Theme
      if (prefs.theme) {
        this.state.theme = prefs.theme;

        // Update toggle button
        const toggleBtn = document.getElementById('cogniread-theme-toggle');

        if (toggleBtn) {
          const labels = {
            'light': 'Light',
            'dark': 'Dark'
          };
          toggleBtn.setAttribute('title', `Theme: ${labels[prefs.theme] || 'Light'}`);
          toggleBtn.setAttribute('data-theme', prefs.theme);
        }

        this.applyTheme(prefs.theme);
      }

      // Panel Position
      if (prefs.panelPosition) {
        this.state.panelPosition = prefs.panelPosition;
        // Update position toggle button
        const positionToggle = document.getElementById('cogniread-position-toggle');
        if (positionToggle) {
          positionToggle.setAttribute('data-position', prefs.panelPosition);
        }
        // Apply position classes to existing panels
        const panel = this.ui.controls;
        const miniPanel = this.ui.miniPanel;
        if (panel) {
          panel.classList.remove('position-top-right', 'position-top-left', 'position-bottom-right', 'position-bottom-left');
          panel.classList.add(`position-${prefs.panelPosition}`);
        }
        if (miniPanel) {
          miniPanel.classList.remove('position-top-right', 'position-top-left', 'position-bottom-right', 'position-bottom-left');
          miniPanel.classList.add(`position-${prefs.panelPosition}`);
        }
      }

      // ELI5 Mode (handled by simplification slider now)
      if (prefs.eli5Mode) {
        await this.applyELI5Simplification();
        this.state.eli5Mode = true;
      }

      // Focus Mode
      if (prefs.focusMode) {
        const focusToggle = document.getElementById('cogniread-focus-mode-toggle');
        if (focusToggle) {
          focusToggle.classList.add('active');
        }
        await this.toggleFocusMode(true);
      }

      // TL;DR Mode
      if (prefs.tldrMode) {
        const tldrToggle = document.getElementById('cogniread-tldr-toggle');
        if (tldrToggle) {
          tldrToggle.classList.add('active');
        }
        await this.showTLDR();
        this.state.tldrMode = true;
      }

      // Dyslexia Mode
      if (prefs.dyslexiaMode) {
        const dyslexiaToggle = document.getElementById('cogniread-dyslexia-toggle');
        if (dyslexiaToggle) {
          dyslexiaToggle.classList.add('active');
        }
        await this.toggleDyslexiaMode(true);
      }

      // Definitions are enabled by default
      if (prefs.definitionsEnabled !== undefined) {
        const definitionsToggle = document.getElementById('cogniread-definitions-toggle');
        if (definitionsToggle) {
          if (prefs.definitionsEnabled) {
            definitionsToggle.classList.add('active');
            await this.enableDefinitions();
          }
        }
      } else {
        // First time - enable by default
        const definitionsToggle = document.getElementById('cogniread-definitions-toggle');
        if (definitionsToggle) {
          definitionsToggle.classList.add('active');
        }
        await this.enableDefinitions();
      }

      // Literal Language / Idiom mode (off by default)
      if (prefs.idiomMode) {
        const literalToggle = document.getElementById('cogniread-literal-toggle');
        if (literalToggle) {
          literalToggle.classList.add('active');
        }
        await this.convertIdiomsToLiteral();
        this.state.idiomMode = true;
      }

      // Distraction-Free Mode
      if (prefs.distractionFree) {
        const distractionFreeToggle = document.getElementById('cogniread-distraction-free-toggle');
        if (distractionFreeToggle) {
          distractionFreeToggle.classList.add('active');
        }
        await this.toggleDistractionFreeMode(true);
      }

      // Expansion Mode
      if (prefs.expansionMode) {
        const expansionToggle = document.getElementById('cogniread-expansion-toggle');
        if (expansionToggle) {
          expansionToggle.classList.add('active');
        }
        await this.toggleExpansionMode(true);
      }

      // Active Voice
      if (prefs.activeVoice) {
        const activeVoiceToggle = document.getElementById('cogniread-active-voice-toggle');
        if (activeVoiceToggle) {
          activeVoiceToggle.classList.add('active');
        }
        await this.toggleActiveVoice(true);
      }

      // Sentence Restructuring
      if (prefs.sentenceRestructuring) {
        const restructureToggle = document.getElementById('cogniread-restructure-toggle');
        if (restructureToggle) {
          restructureToggle.classList.add('active');
        }
        await this.toggleSentenceRestructuring(true);
      }

      // Concept Connections
      if (prefs.conceptConnections) {
        const conceptToggle = document.getElementById('cogniread-concept-toggle');
        if (conceptToggle) {
          conceptToggle.classList.add('active');
        }
        await this.toggleConceptConnections(true);
      }

      // Cognitive Heatmap
      if (prefs.cognitiveHeatmap) {
        const heatmapToggle = document.getElementById('cogniread-heatmap-toggle');
        if (heatmapToggle) {
          heatmapToggle.classList.add('active');
        }
        await this.toggleCognitiveHeatmap(true);
      }

      // Simplification Level
      if (prefs.simplificationLevel !== undefined) {
        const simplificationSlider = document.getElementById('cogniread-simplification-slider');
        if (simplificationSlider) {
          simplificationSlider.value = prefs.simplificationLevel;
          this.state.simplificationLevel = prefs.simplificationLevel;
          // Trigger slider change to update display and apply simplification
          simplificationSlider.dispatchEvent(new Event('input'));
        }
      }

      // Starred Features (for quick access)
      if (prefs.starredFeatures && Array.isArray(prefs.starredFeatures)) {
        this.state.starredFeatures = prefs.starredFeatures;
        // Update star button states
        this.updateStarButtonStates();
        // Update theme selector with starred features
        this.updateThemeSelectorStarredFeatures();
      }

      // Update all quick toggle button states after loading preferences
      this.updateQuickToggleStates();
    }
    } catch (error) {
      // Extension context invalidated (extension reloaded/updated)
      // Silently fail - preferences will use defaults but extension still works
      if (error.message.includes('Extension context invalidated')) {
        console.warn('⚠️ CogniRead: Extension was reloaded. Using default preferences.');
      } else {
        console.error('Error loading preferences:', error);
      }
    }

    // Update badge to reflect active features
    this.updateActiveBadge();
  }

  // Save only starred features (more efficient than saving all preferences)
  async saveStarredFeatures() {
    try {
      const result = await chrome.storage.sync.get(['cogniread_preferences']);
      const prefs = result.cogniread_preferences || {};
      prefs.starredFeatures = this.state.starredFeatures;

      await chrome.storage.sync.set({
        cogniread_preferences: prefs
      });
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('⚠️ CogniRead: Extension was reloaded. Starred features not saved.');
      } else {
        console.error('Error saving starred features:', error);
      }
    }
  }

  // Update star button states based on stored starred features
  updateStarButtonStates() {
    const starButtons = document.querySelectorAll('.cogniread-star-btn');
    starButtons.forEach(starBtn => {
      const featureName = starBtn.getAttribute('data-feature');
      const isStarred = this.state.starredFeatures.includes(featureName);
      starBtn.setAttribute('data-starred', isStarred.toString());
    });
  }

  // Update theme selector to show starred features as quick access buttons
  updateThemeSelectorStarredFeatures() {
    const themeSelector = document.querySelector('.cogniread-theme-selector');
    if (!themeSelector) {
      console.warn('Theme selector not found, cannot update starred features');
      return;
    }

    console.log('Updating starred features in theme selector:', this.state.starredFeatures);

    // Remove existing starred feature buttons (except theme and position toggles)
    const existingStarredBtns = themeSelector.querySelectorAll('[data-starred-feature]');
    existingStarredBtns.forEach(btn => btn.remove());

    // Feature metadata for display (keys must match data-feature attributes in HTML)
    const featureMetadata = {
      'focus-mode': { icon: '🎯', label: 'Focus', toggleId: 'cogniread-focus-mode-toggle', description: 'Highlights one paragraph at a time' },
      'tldr-mode': { icon: '📝', label: 'TL;DR', toggleId: 'cogniread-tldr-toggle', description: 'Shows quick summary of the page' },
      'distraction-free': { icon: '📖', label: 'Reader', toggleId: 'cogniread-distraction-free-toggle', description: 'Clean reading view without distractions' },
      'dyslexia-mode': { icon: '👁️', label: 'Dyslexia', toggleId: 'cogniread-dyslexia-toggle', description: 'Uses dyslexia-friendly font and styling' },
      'definitions': { icon: '📚', label: 'Definitions', toggleId: 'cogniread-definitions-toggle', description: 'Click words for instant definitions' },
      'literal-language': { icon: '🔤', label: 'Literal', toggleId: 'cogniread-literal-toggle', description: 'Converts idioms to literal language' },
      'concept-connections': { icon: '🔗', label: 'Concepts', toggleId: 'cogniread-concept-toggle', description: 'Highlights related concepts' },
      'heatmap': { icon: '📊', label: 'Heatmap', toggleId: 'cogniread-heatmap-toggle', description: 'Shows reading difficulty with colors' },
      'expansion': { icon: '🔠', label: 'Expand', toggleId: 'cogniread-expansion-toggle', description: 'Expands abbreviations and acronyms' },
      'restructure': { icon: '🔄', label: 'Restructure', toggleId: 'cogniread-restructure-toggle', description: 'Simplifies complex sentences' },
      'active-voice': { icon: '▶️', label: 'Active', toggleId: 'cogniread-active-voice-toggle', description: 'Converts passive to active voice' }
    };

    // Add quick access buttons for each starred feature
    this.state.starredFeatures.forEach(featureName => {
      const metadata = featureMetadata[featureName];
      if (!metadata) {
        console.warn(`No metadata found for starred feature: ${featureName}`);
        return;
      }

      const quickToggle = document.createElement('button');
      quickToggle.className = 'cogniread-theme-quick-toggle';
      quickToggle.setAttribute('data-starred-feature', featureName);
      quickToggle.setAttribute('data-active', 'false');
      quickToggle.setAttribute('data-tooltip', metadata.description);
      quickToggle.textContent = metadata.icon;

      // Check if feature is currently active
      const mainToggle = document.getElementById(metadata.toggleId);
      if (!mainToggle) {
        console.warn(`Main toggle not found for feature ${featureName} with ID: ${metadata.toggleId}`);
      } else if (mainToggle.classList.contains('active')) {
        quickToggle.setAttribute('data-active', 'true');
      }

      // Add click handler to toggle the feature
      quickToggle.addEventListener('click', () => {
        console.log(`Quick toggle clicked for feature: ${featureName}`);
        console.log(`Looking for toggle with ID: ${metadata.toggleId}`);
        console.log(`mainToggle element:`, mainToggle);

        if (mainToggle) {
          console.log(`Clicking main toggle for ${featureName}`);
          mainToggle.click();
          // Quick toggle state will be updated automatically by updateQuickToggleStates()
        } else {
          console.error(`No main toggle found for feature: ${featureName}, ID: ${metadata.toggleId}`);
        }
      });

      // Insert before the theme toggle button
      const themeToggle = themeSelector.querySelector('#cogniread-theme-toggle');
      if (themeToggle) {
        themeSelector.insertBefore(quickToggle, themeToggle);
      } else {
        themeSelector.appendChild(quickToggle);
      }
    });
  }

  // Update all quick toggle button states to match their feature states
  updateQuickToggleStates() {
    // Update all starred feature quick toggles (dynamically generated)
    const starredQuickToggles = document.querySelectorAll('[data-starred-feature]');
    const featureStateMap = {
      'focus-mode': this.state.focusMode,
      'tldr-mode': this.state.tldrMode,
      'distraction-free': this.state.distractionFree,
      'dyslexia-mode': this.state.dyslexiaMode,
      'definitions': this.state.definitionsEnabled,
      'literal-language': this.state.idiomMode,
      'concept-connections': this.state.conceptConnections,
      'heatmap': this.state.cognitiveHeatmap,
      'expansion': this.state.expansionMode,
      'restructure': this.state.sentenceRestructuring,
      'active-voice': this.state.activeVoice
    };

    starredQuickToggles.forEach(quickToggle => {
      const featureName = quickToggle.getAttribute('data-starred-feature');
      const isActive = featureStateMap[featureName] || false;
      quickToggle.setAttribute('data-active', isActive.toString());
    });
  }

  // ===== AI-Powered Features Implementation =====

  // Feature 1: Concept Connections
  async toggleConceptConnections(enabled) {
    console.log('🔗 Concept Connections toggle:', enabled);
    this.state.conceptConnections = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      await this.enableConceptConnections();
    } else {
      this.disableConceptConnections();
    }

    await this.savePreferences();
  }

  async enableConceptConnections() {
    console.log('🔗 Enabling Concept Connections...');

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      return;
    }

    const loading = this.showLoading('Analyzing concepts...');

    try {
      // Get all paragraphs
      const paragraphs = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6'))
        .filter(p => p.textContent.trim().length > 50);

      this.conceptMap = new Map();

      // Analyze paragraphs in batches
      for (let i = 0; i < Math.min(paragraphs.length, 15); i++) {
        const para = paragraphs[i];
        const text = para.textContent.substring(0, 500);
        const existingConcepts = Array.from(this.conceptMap.keys());

        const result = await window.cognireadPromptAPI.findConceptConnections(text, existingConcepts);

        // Store concepts
        result.concepts.forEach(concept => {
          if (!this.conceptMap.has(concept.name)) {
            this.conceptMap.set(concept.name, {
              paragraphIndex: i,
              element: para,
              connectedTo: concept.connectedTo || []
            });
          }
        });

        // Add visual connections to existing concepts
        result.concepts.forEach(concept => {
          if (concept.connectedTo && concept.connectedTo.length > 0) {
            this.addConceptLinks(para, concept.connectedTo);
          }
        });
      }

      console.log(`🔗 Found ${this.conceptMap.size} concepts with connections`);
    } catch (error) {
      console.error('Error enabling concept connections:', error);
      alert('Failed to analyze concepts. Please try again.');
    } finally {
      this.hideLoading(loading);
    }
  }

  addConceptLinks(element, connectedConcepts) {
    // Add subtle indicators for connected concepts
    connectedConcepts.forEach(conceptName => {
      const conceptInfo = this.conceptMap.get(conceptName);
      if (conceptInfo) {
        const regex = new RegExp(`\\b${conceptName}\\b`, 'gi');
        const text = element.textContent;
        if (regex.test(text)) {
          element.innerHTML = element.innerHTML.replace(regex, (match) => {
            return `<span class="cogniread-concept-link" data-concept="${conceptName}" title="Related to earlier concept: ${conceptName}">
              ${match}
              <sup class="cogniread-concept-marker">🔗</sup>
            </span>`;
          });
        }
      }
    });
  }

  disableConceptConnections() {
    console.log('🔗 Disabling Concept Connections...');

    // Remove all concept links
    document.querySelectorAll('.cogniread-concept-link').forEach(link => {
      link.outerHTML = link.textContent.replace(' 🔗', '');
    });

    this.conceptMap = new Map();
  }

  // Feature 2: Plain Language Translation
  async applyPlainLanguageTranslation(domain) {
    console.log('🌐 Plain Language Translation:', domain);

    if (domain === 'off') {
      this.restorePlainLanguage();
      return;
    }

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      return;
    }

    const loading = this.showLoading(`Translating to plain language...`);

    try {
      const paragraphs = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'))
        .filter(p => p.textContent.trim().length > 30 && !p.closest('nav, header, footer'));

      for (const para of paragraphs.slice(0, 20)) {
        if (!para.dataset.originalHTML) {
          para.dataset.originalHTML = para.innerHTML;
        }

        const text = para.textContent;
        const translated = await window.cognireadPromptAPI.translateToPlainLanguage(text, domain);

        para.innerHTML = translated;
        para.classList.add('cogniread-plain-language');
      }

      console.log(`🌐 Translated ${Math.min(paragraphs.length, 20)} paragraphs`);
    } catch (error) {
      console.error('Error translating to plain language:', error);
      alert('Failed to translate. Please try again.');
    } finally {
      this.hideLoading(loading);
    }
  }

  restorePlainLanguage() {
    document.querySelectorAll('.cogniread-plain-language').forEach(el => {
      if (el.dataset.originalHTML) {
        el.innerHTML = el.dataset.originalHTML;
        delete el.dataset.originalHTML;
      }
      el.classList.remove('cogniread-plain-language');
    });
  }

  // Feature 3: Prerequisites Detection
  async showPrerequisites() {
    console.log('📋 Showing Prerequisites...');

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      return;
    }

    const btn = document.getElementById('cogniread-prerequisites-btn');
    if (btn) btn.disabled = true;

    const loading = this.showLoading('Analyzing prerequisites...');

    try {
      // Get article content
      const article = document.querySelector('article, main, [role="main"], .content') || document.body;
      const text = article.textContent.substring(0, 5000);

      const result = await window.cognireadPromptAPI.detectPrerequisites(text);

      this.showPrerequisitesModal(result.prerequisites);
    } catch (error) {
      console.error('Error detecting prerequisites:', error);
      alert('Failed to detect prerequisites. Please try again.');
    } finally {
      this.hideLoading(loading);
      if (btn) btn.disabled = false;
    }
  }

  showPrerequisitesModal(prerequisites) {
    // Remove any existing modal
    const existingModal = document.getElementById('cogniread-prerequisites-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'cogniread-prerequisites-modal';
    modal.className = 'cogniread-ai-modal';
    modal.innerHTML = `
      <div class="cogniread-ai-modal-content">
        <div class="cogniread-ai-modal-header">
          <h3>📋 Prerequisite Knowledge</h3>
          <button class="cogniread-ai-modal-close">&times;</button>
        </div>
        <div class="cogniread-ai-modal-body">
          ${prerequisites.length > 0 ? `
            <p class="cogniread-ai-modal-intro">This article assumes you understand:</p>
            <ul class="cogniread-prerequisites-list">
              ${prerequisites.map(prereq => `
                <li class="cogniread-prerequisite-item">
                  <div class="cogniread-prerequisite-name">${prereq.concept}</div>
                  <div class="cogniread-prerequisite-why">${prereq.why}</div>
                  <span class="cogniread-prerequisite-level">${prereq.difficulty}</span>
                </li>
              `).join('')}
            </ul>
          ` : '<p>No specific prerequisites detected. This article appears to be self-contained.</p>'}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button
    modal.querySelector('.cogniread-ai-modal-close').addEventListener('click', () => {
      modal.remove();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // Feature 4: Reading Goals Assistant
  async showReadingGoals() {
    console.log('🎯 Showing Reading Goals...');

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      return;
    }

    const btn = document.getElementById('cogniread-goals-btn');
    if (btn) btn.disabled = true;

    const loading = this.showLoading('Analyzing article goals...');

    try {
      const article = document.querySelector('article, main, [role="main"], .content') || document.body;
      const text = article.textContent.substring(0, 5000);

      const result = await window.cognireadPromptAPI.analyzeReadingGoals(text);

      this.showReadingGoalsModal(result);
    } catch (error) {
      console.error('Error analyzing reading goals:', error);
      alert('Failed to analyze reading goals. Please try again.');
    } finally {
      this.hideLoading(loading);
      if (btn) btn.disabled = false;
    }
  }

  showReadingGoalsModal(analysis) {
    const existingModal = document.getElementById('cogniread-goals-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'cogniread-goals-modal';
    modal.className = 'cogniread-ai-modal';
    modal.innerHTML = `
      <div class="cogniread-ai-modal-content">
        <div class="cogniread-ai-modal-header">
          <h3>🎯 Reading Goals</h3>
          <button class="cogniread-ai-modal-close">&times;</button>
        </div>
        <div class="cogniread-ai-modal-body">
          <div class="cogniread-reading-meta">
            <span class="cogniread-difficulty-badge cogniread-difficulty-${analysis.difficulty}">${analysis.difficulty}</span>
            <span class="cogniread-time-estimate">⏱️ ~${analysis.estimatedMinutes} min read</span>
          </div>

          <h4>What You'll Learn:</h4>
          <ul class="cogniread-goals-list">
            ${analysis.goals.map(goal => `<li>${goal}</li>`).join('')}
          </ul>

          <h4>Key Topics:</h4>
          <div class="cogniread-topics-tags">
            ${analysis.keyTopics.map(topic => `<span class="cogniread-topic-tag">${topic}</span>`).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cogniread-ai-modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // Feature 5: Cognitive Load Indicator (Heatmap)
  async toggleCognitiveHeatmap(enabled) {
    console.log('📊 Cognitive Heatmap toggle:', enabled);
    this.state.cognitiveHeatmap = enabled;
    this.updateQuickToggleStates();

    if (enabled) {
      await this.showCognitiveHeatmap();
    } else {
      this.hideCognitiveHeatmap();
    }

    await this.savePreferences();
  }

  async showCognitiveHeatmap() {
    console.log('📊 Showing Cognitive Heatmap...');

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      const toggle = document.getElementById('cogniread-heatmap-toggle');
      if (toggle) toggle.classList.remove('active');
      return;
    }

    const loading = this.showLoading('Analyzing difficulty...');

    try {
      const paragraphs = Array.from(document.querySelectorAll('p'))
        .filter(p => p.textContent.trim().length > 50 && !p.closest('nav, header, footer'));

      const paragraphTexts = paragraphs.map(p => p.textContent);
      const scores = await window.cognireadPromptAPI.batchAnalyzeCognitiveLoad(paragraphTexts);

      // Apply heatmap colors
      paragraphs.forEach((para, index) => {
        const score = scores[index] || 5;
        para.classList.add('cogniread-heatmap-item');
        para.dataset.difficultyScore = score;

        // Color scale from green (easy) to red (hard)
        const hue = 120 - (score - 1) * 13.33; // 120 (green) to 0 (red)
        const opacity = 0.15 + (score / 10) * 0.2;
        para.style.backgroundColor = `hsla(${hue}, 70%, 50%, ${opacity})`;
        para.style.borderLeft = `4px solid hsla(${hue}, 70%, 40%, 0.8)`;
        para.style.paddingLeft = '12px';

        // Add difficulty badge
        const badge = document.createElement('span');
        badge.className = 'cogniread-difficulty-badge-inline';
        badge.textContent = `Difficulty: ${score}/10`;
        badge.style.cssText = `
          font-size: 10px;
          padding: 2px 6px;
          background: hsla(${hue}, 70%, 30%, 0.9);
          color: white;
          border-radius: 3px;
          margin-left: 8px;
          font-weight: bold;
        `;
        para.insertBefore(badge, para.firstChild);
      });

      console.log(`📊 Applied heatmap to ${paragraphs.length} paragraphs`);
    } catch (error) {
      console.error('Error showing cognitive heatmap:', error);
      alert('Failed to analyze difficulty. Please try again.');
    } finally {
      this.hideLoading(loading);
    }
  }

  hideCognitiveHeatmap() {
    console.log('📊 Hiding Cognitive Heatmap...');

    document.querySelectorAll('.cogniread-heatmap-item').forEach(para => {
      para.classList.remove('cogniread-heatmap-item');
      delete para.dataset.difficultyScore;
      para.style.backgroundColor = '';
      para.style.borderLeft = '';
      para.style.paddingLeft = '';

      const badge = para.querySelector('.cogniread-difficulty-badge-inline');
      if (badge) badge.remove();
    });
  }

  // Feature 6: Analogy Generator (Context Menu)
  async showAnalogyModal(selectedText, domain) {
    console.log(`🎨 Generating ${domain} analogy...`);

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      return;
    }

    // Create modal immediately
    const existingModal = document.getElementById('cogniread-analogy-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'cogniread-analogy-modal';
    modal.className = 'cogniread-ai-modal';
    modal.innerHTML = `
      <div class="cogniread-ai-modal-content">
        <div class="cogniread-ai-modal-header">
          <h3>🎨 ${domain.charAt(0).toUpperCase() + domain.slice(1)} Analogy</h3>
          <button class="cogniread-ai-modal-close">&times;</button>
        </div>
        <div class="cogniread-ai-modal-body">
          <div class="cogniread-analogy-original">
            <strong>Original Text:</strong>
            <p>${selectedText}</p>
          </div>
          <div class="cogniread-analogy-result">
            <div class="cogniread-loading-spinner">Generating analogy...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button
    modal.querySelector('.cogniread-ai-modal-close').addEventListener('click', () => {
      modal.remove();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Generate analogy
    try {
      const analogy = await window.cognireadPromptAPI.generateAnalogy(selectedText, domain);

      const resultDiv = modal.querySelector('.cogniread-analogy-result');
      resultDiv.innerHTML = `<p class="cogniread-analogy-text">${analogy}</p>`;
    } catch (error) {
      console.error('Error generating analogy:', error);
      const resultDiv = modal.querySelector('.cogniread-analogy-result');
      resultDiv.innerHTML = `<p class="cogniread-error-text">Failed to generate analogy. Please try again.</p>`;
    }
  }

  // Feature: Describe Highlighted Selection (Context Menu)
  async describeSelectionModal(selectedText) {
    console.log('📖 Describing selection:', selectedText);

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      return;
    }

    // Create modal immediately
    const existingModal = document.getElementById('cogniread-describe-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'cogniread-describe-modal';
    modal.className = 'cogniread-ai-modal';
    modal.innerHTML = `
      <div class="cogniread-ai-modal-content">
        <div class="cogniread-ai-modal-header">
          <h3>📖 Describe Selection</h3>
          <button class="cogniread-ai-modal-close">&times;</button>
        </div>
        <div class="cogniread-ai-modal-body">
          <div class="cogniread-analogy-original">
            <strong>Selected Text:</strong>
            <p>${this.escapeHtml(selectedText)}</p>
          </div>
          <div class="cogniread-analogy-result">
            <div class="cogniread-loading-spinner">Generating description...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button
    modal.querySelector('.cogniread-ai-modal-close').addEventListener('click', () => {
      modal.remove();
    });

    // Generate description
    try {
      const description = await window.cognireadPromptAPI.describeText(selectedText);

      const resultDiv = modal.querySelector('.cogniread-analogy-result');
      resultDiv.innerHTML = `<p class="cogniread-analogy-text">${description}</p>`;
    } catch (error) {
      console.error('Error generating description:', error);
      const resultDiv = modal.querySelector('.cogniread-analogy-result');
      resultDiv.innerHTML = `<p class="cogniread-error-text">Failed to generate description. Please try again.</p>`;
    }
  }

  // Feature: Use in Sentence (Context Menu)
  async useInSentenceModal(selectedText) {
    console.log('✏️ Generating sentence with:', selectedText);

    try {
      await window.ensurePromptAPIReady();
    } catch (error) {
      alert(error.message);
      return;
    }

    // Create modal immediately
    const existingModal = document.getElementById('cogniread-sentence-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'cogniread-sentence-modal';
    modal.className = 'cogniread-ai-modal';
    modal.innerHTML = `
      <div class="cogniread-ai-modal-content">
        <div class="cogniread-ai-modal-header">
          <h3>✏️ Use "${this.escapeHtml(selectedText)}" in a Sentence</h3>
          <button class="cogniread-ai-modal-close">&times;</button>
        </div>
        <div class="cogniread-ai-modal-body">
          <div class="cogniread-analogy-result">
            <div class="cogniread-loading-spinner">Generating example sentences...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button
    modal.querySelector('.cogniread-ai-modal-close').addEventListener('click', () => {
      modal.remove();
    });

    // Generate sentence examples
    try {
      const sentences = await window.cognireadPromptAPI.generateSentences(selectedText);

      const resultDiv = modal.querySelector('.cogniread-analogy-result');
      resultDiv.innerHTML = `<p class="cogniread-analogy-text">${sentences}</p>`;
    } catch (error) {
      console.error('Error generating sentences:', error);
      const resultDiv = modal.querySelector('.cogniread-analogy-result');
      resultDiv.innerHTML = `<p class="cogniread-error-text">Failed to generate sentences. Please try again.</p>`;
    }
  }
}

// Distraction-Free Reading Mode Class
class DistractionFreeMode {
  constructor() {
    this.level = 2; // Default: Focused (1=Minimal, 2=Focused, 3=Pure Text)
    this.showImages = true;
    this.showVideos = false;
    this.showProgress = true;
    this.fontFamily = 'serif';
    this.fontSize = 18;
    this.lineWidth = 680;
    this.theme = 'light';
    this.isActive = false;
    this.originalContent = null;
    this.readerContainer = null;
  }

  activate() {
    if (this.isActive) {
      console.log('Distraction-free mode already active');
      return;
    }

    try {
      console.log('Activating distraction-free mode...');

      // Store reference to original body children (not innerHTML to preserve event listeners)
      this.originalContent = {
        children: Array.from(document.body.children).map(child => {
          const clone = child.cloneNode(true);
          return { element: child, clone: clone };
        }),
        scrollPosition: window.scrollY,
        bodyClass: document.body.className,
        bodyStyle: document.body.getAttribute('style')
      };

      // Extract main content
      const mainContent = this.findMainContent();

      if (!mainContent) {
        console.warn('Could not find main content for distraction-free mode');
        alert('Could not extract readable content from this page. Try a different page or article.');
        return;
      }

      // Create reader view container
      this.createReaderView();

      // Clone and clean content
      const cleanContent = this.sanitizeContent(mainContent);

      // Apply typography enhancements
      this.enhanceReadability(cleanContent);

      // Insert clean content into reader view
      const contentContainer = this.readerContainer.querySelector('.cogniread-df-content');
      contentContainer.appendChild(cleanContent);

      // Hide all body children instead of destroying them
      this.originalContent.children.forEach(({ element }) => {
        element.style.display = 'none';
      });

      // Add reader view to body (don't replace body content)
      document.body.appendChild(this.readerContainer);

      // Add exit button and controls
      this.addControls();

      // Add reading progress if enabled
      if (this.showProgress) {
        this.addReadingProgress();
      }

      this.isActive = true;
      console.log('Distraction-free mode activated successfully');

    } catch (error) {
      console.error('Error activating distraction-free mode:', error);
      alert('Failed to activate distraction-free mode. Please try again.');
      this.deactivate();
    }
  }

  deactivate() {
    if (!this.isActive) return;

    console.log('Deactivating distraction-free mode...');

    // Remove reader container first
    if (this.readerContainer && this.readerContainer.parentNode) {
      this.readerContainer.remove();
    }
    this.readerContainer = null;

    // Restore original content visibility
    if (this.originalContent) {
      // Restore all hidden elements
      this.originalContent.children.forEach(({ element }) => {
        element.style.display = '';
      });

      // Restore scroll position
      window.scrollTo(0, this.originalContent.scrollPosition);

      this.originalContent = null;
    }

    this.isActive = false;
    console.log('Distraction-free mode deactivated');

    // Update the toggle button state in the CogniRead panel
    // This is needed when user exits via "Exit Reader Mode" button or Esc key
    const distractionFreeToggle = document.getElementById('cogniread-distraction-free-toggle');
    if (distractionFreeToggle && distractionFreeToggle.classList.contains('active')) {
      distractionFreeToggle.classList.remove('active');
      // Trigger update of active badge and quick toggle states if CogniRead instance exists
      if (window.cogniread) {
        // Update the state to keep it in sync
        if (window.cogniread.state) {
          window.cogniread.state.distractionFree = false;
        }
        if (window.cogniread.updateActiveBadge) {
          window.cogniread.updateActiveBadge();
        }
        if (window.cogniread.updateQuickToggleStates) {
          window.cogniread.updateQuickToggleStates();
        }
      }
    }
  }

  findMainContent() {
    // Strategy 1: Look for article tag
    let article = document.querySelector('article');

    // Strategy 2: Look for role="main"
    if (!article) {
      article = document.querySelector('[role="main"]');
    }

    // Strategy 3: Look for common content selectors
    if (!article) {
      const contentSelectors = [
        '.post-content',
        '.article-content',
        '.entry-content',
        '.content',
        'main',
        '#content',
        '#main'
      ];

      for (const selector of contentSelectors) {
        article = document.querySelector(selector);
        if (article) break;
      }
    }

    // Strategy 4: Find largest text block
    if (!article) {
      article = this.findLargestTextBlock();
    }

    return article;
  }

  findLargestTextBlock() {
    const allElements = document.querySelectorAll('div, section');
    let largest = null;
    let maxTextLength = 0;

    allElements.forEach(el => {
      // Skip navigation, ads, headers, footers
      if (el.closest('nav, header, footer, aside, .ad, .advertisement, .sidebar')) {
        return;
      }

      const textLength = el.textContent.trim().length;
      if (textLength > maxTextLength) {
        maxTextLength = textLength;
        largest = el;
      }
    });

    return largest;
  }

  createReaderView() {
    this.readerContainer = document.createElement('div');
    this.readerContainer.className = 'cogniread-distraction-free';
    this.readerContainer.setAttribute('data-theme', this.theme);
    this.readerContainer.setAttribute('data-font-family', this.fontFamily);
    this.readerContainer.innerHTML = `
      <div class="cogniread-df-wrapper">
        <div class="cogniread-df-content" style="max-width: ${this.lineWidth}px; font-size: ${this.fontSize}px;"></div>
      </div>
    `;
  }

  sanitizeContent(element) {
    const clone = element.cloneNode(true);

    // Remove unwanted elements based on level
    const selectorsToRemove = [
      'script',
      'style',
      'noscript'
    ];

    // Level 2 and 3: Remove navigation, ads, social elements
    if (this.level >= 2) {
      selectorsToRemove.push(
        'aside',
        'nav',
        'header:not(.article-header)',
        'footer:not(.article-footer)',
        '.advertisement',
        '.ad',
        '.social-share',
        '.share-buttons',
        '.related-articles',
        '.recommended',
        '.comments',
        '.comment-section',
        'iframe[src*="ads"]',
        '[class*="sidebar"]',
        '[id*="sidebar"]',
        '[class*="widget"]'
      );
    }

    selectorsToRemove.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Handle images based on settings
    if (this.level === 3 || !this.showImages) {
      clone.querySelectorAll('img').forEach(img => {
        const placeholder = document.createElement('button');
        placeholder.className = 'cogniread-df-image-placeholder';
        placeholder.textContent = `📷 [Image: ${img.alt || 'No description'}]`;
        placeholder.onclick = () => this.showImageModal(img.src, img.alt);
        img.replaceWith(placeholder);
      });
    } else {
      // Keep images but make them responsive
      clone.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '1.5rem auto';
      });
    }

    // Handle videos
    if (!this.showVideos) {
      clone.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').forEach(video => {
        const placeholder = document.createElement('button');
        placeholder.className = 'cogniread-df-video-placeholder';
        placeholder.textContent = '▶ Load Video';
        placeholder.onclick = () => {
          const videoClone = video.cloneNode(true);
          videoClone.style.maxWidth = '100%';
          placeholder.replaceWith(videoClone);
        };
        video.replaceWith(placeholder);
      });
    }

    return clone;
  }

  enhanceReadability(content) {
    // Add reading time estimate
    const text = content.textContent;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 WPM average

    // Create article meta header
    const meta = document.createElement('div');
    meta.className = 'cogniread-df-article-meta';
    meta.innerHTML = `
      <div class="cogniread-df-meta-info">
        <span>${wordCount.toLocaleString()} words</span>
        <span>•</span>
        <span>${readingTime} min read</span>
      </div>
    `;
    content.prepend(meta);

    // Ensure proper paragraph spacing
    content.querySelectorAll('p').forEach(p => {
      p.style.marginBottom = '1.5em';
    });

    // Clean up links
    content.querySelectorAll('a').forEach(link => {
      link.style.color = this.theme === 'dark' ? '#6ba3ff' : '#2563eb';
      link.style.textDecoration = 'underline';
      link.style.textDecorationThickness = '1px';
      link.style.textUnderlineOffset = '2px';
    });
  }

  addControls() {
    const controls = document.createElement('div');
    controls.className = 'cogniread-df-controls';
    controls.innerHTML = `
      <button class="cogniread-df-exit" aria-label="Exit distraction-free mode" title="Exit distraction-free mode (Esc)">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 4L16 16M4 16L16 4" stroke="currentColor" stroke-width="2"/>
        </svg>
        Exit Reader Mode
      </button>
      <div class="cogniread-df-settings">
        <button class="cogniread-df-font-decrease" title="Decrease font size (-)">A−</button>
        <button class="cogniread-df-font-increase" title="Increase font size (+)">A+</button>
        <button class="cogniread-df-theme-toggle" title="Toggle theme">🌙</button>
      </div>
    `;

    this.readerContainer.appendChild(controls);

    // Exit button
    controls.querySelector('.cogniread-df-exit').addEventListener('click', () => {
      this.deactivate();
    });

    // Font size controls
    controls.querySelector('.cogniread-df-font-decrease').addEventListener('click', () => {
      console.log('📉 Decreasing font size from', this.fontSize);
      this.fontSize = Math.max(14, this.fontSize - 1);
      console.log('📉 New font size:', this.fontSize);
      this.updateFontSize();
    });

    controls.querySelector('.cogniread-df-font-increase').addEventListener('click', () => {
      console.log('📈 Increasing font size from', this.fontSize);
      this.fontSize = Math.min(24, this.fontSize + 1);
      console.log('📈 New font size:', this.fontSize);
      this.updateFontSize();
    });

    // Theme toggle
    controls.querySelector('.cogniread-df-theme-toggle').addEventListener('click', () => {
      const oldTheme = this.theme;
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      console.log(`🎨 Switching theme from ${oldTheme} to ${this.theme}`);
      this.readerContainer.setAttribute('data-theme', this.theme);
      controls.querySelector('.cogniread-df-theme-toggle').textContent =
        this.theme === 'light' ? '🌙' : '☀️';
      console.log(`✅ Theme applied: ${this.theme} mode`);
    });
  }

  addReadingProgress() {
    const progress = document.createElement('div');
    progress.className = 'cogniread-df-progress';
    progress.innerHTML = `
      <div class="cogniread-df-progress-bar"></div>
      <div class="cogniread-df-progress-text">0%</div>
    `;

    this.readerContainer.appendChild(progress);

    // Update progress on scroll
    const updateProgress = () => {
      // Use readerContainer's scroll properties since it's the scrolling element
      const containerHeight = this.readerContainer.clientHeight;
      const contentHeight = this.readerContainer.scrollHeight;
      const scrollTop = this.readerContainer.scrollTop;

      // Calculate scroll percentage, handle case where content fits on one page
      let scrollPercent = 0;
      const scrollableHeight = contentHeight - containerHeight;

      if (scrollableHeight > 0) {
        scrollPercent = (scrollTop / scrollableHeight) * 100;
      } else {
        // Content fits on one page, show 0% at top
        scrollPercent = 0;
      }

      const progressBar = progress.querySelector('.cogniread-df-progress-bar');
      const progressText = progress.querySelector('.cogniread-df-progress-text');

      if (progressBar && progressText) {
        progressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
        progressText.textContent = `${Math.round(Math.max(0, scrollPercent))}%`;
      }
    };

    // Initial update
    updateProgress();

    // Update on scroll - listen to readerContainer, not window
    this.readerContainer.addEventListener('scroll', updateProgress);
  }

  updateFontSize() {
    const content = this.readerContainer.querySelector('.cogniread-df-content');
    if (content) {
      console.log('🔤 Updating font size to:', this.fontSize);
      // Set font size with !important using setProperty
      content.style.setProperty('font-size', `${this.fontSize}px`, 'important');

      // Also update all paragraphs and text elements to ensure they respect the new size
      content.querySelectorAll('p, li, span, div:not([class*="cogniread"])').forEach(el => {
        el.style.setProperty('font-size', `${this.fontSize}px`, 'important');
      });

      console.log('✅ Font size updated successfully');
    } else {
      console.warn('⚠️ Could not find .cogniread-df-content element');
    }
  }

  showImageModal(src, alt) {
    const modal = document.createElement('div');
    modal.className = 'cogniread-df-image-modal';
    modal.innerHTML = `
      <div class="cogniread-df-image-modal-content">
        <button class="cogniread-df-image-modal-close">&times;</button>
        <img src="${src}" alt="${alt || 'Image'}" />
        ${alt ? `<p class="cogniread-df-image-caption">${alt}</p>` : ''}
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('cogniread-df-image-modal-close')) {
        modal.remove();
      }
    });
  }

  // Keyboard shortcuts
  handleKeyPress(e) {
    if (!this.isActive) return;

    // Esc - Exit
    if (e.key === 'Escape') {
      this.deactivate();
    }
    // + - Increase font
    else if (e.key === '+' || e.key === '=') {
      this.fontSize = Math.min(24, this.fontSize + 1);
      this.updateFontSize();
    }
    // - - Decrease font
    else if (e.key === '-' || e.key === '_') {
      this.fontSize = Math.max(14, this.fontSize - 1);
      this.updateFontSize();
    }
  }
}

// Initialize CogniRead when page loads
let cogniRead = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCogniRead);
} else {
  initCogniRead();
}

async function initCogniRead() {
  cogniRead = new CogniRead();
  window.cogniread = cogniRead; // Make it accessible globally
  await cogniRead.initialize();
}

// Listen for messages from popup and context menu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({
      initialized: cogniRead?.initialized || false,
      state: cogniRead?.state || {}
    });
  } else if (request.action === 'reinitialize') {
    // Re-initialize if extension was closed
    if (!cogniRead || !cogniRead.initialized) {
      initCogniRead().then(() => {
        sendResponse({ success: true, initialized: true });
      });
      return true; // Will respond asynchronously
    } else {
      sendResponse({ success: false, message: 'Already initialized' });
    }
  } else if (request.action === 'showAlternativePhrasings') {
    // Handle alternative phrasing request from context menu
    if (cogniRead && cogniRead.initialized && request.selectedText) {
      cogniRead.showAlternativePhrasingsModal(request.selectedText);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: 'Extension not initialized or no text selected' });
    }
  } else if (request.action === 'showAnalogy') {
    // Handle analogy generation request from context menu
    if (cogniRead && cogniRead.initialized && request.selectedText) {
      cogniRead.showAnalogyModal(request.selectedText, request.domain);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: 'Extension not initialized or no text selected' });
    }
  } else if (request.action === 'describeSelection') {
    // Handle describe selection request from context menu
    if (cogniRead && cogniRead.initialized && request.selectedText) {
      cogniRead.describeSelectionModal(request.selectedText);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: 'Extension not initialized or no text selected' });
    }
  } else if (request.action === 'useInSentence') {
    // Handle use in sentence request from context menu
    if (cogniRead && cogniRead.initialized && request.selectedText) {
      cogniRead.useInSentenceModal(request.selectedText);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, message: 'Extension not initialized or no text selected' });
    }
  }
  return true;
});
