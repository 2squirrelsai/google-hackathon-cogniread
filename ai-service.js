// AI Service Wrapper for Chrome AI APIs
// Handles initialization and interaction with built-in AI capabilities

class AIService {
  constructor() {
    this.summarizer = null;
    this.rewriter = null;
    this.proofreader = null;
    this.languageModel = null;
    this.translator = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      // Check if any Chrome Built-in AI APIs are available
      // Note: All modern APIs use global namespaces (LanguageModel, Summarizer, Rewriter, Proofreader)
      // Translator is not used as it doesn't support same-language translation
      const hasAnyAPI = typeof LanguageModel !== 'undefined' ||
                        typeof Summarizer !== 'undefined' ||
                        typeof Rewriter !== 'undefined' ||
                        typeof Proofreader !== 'undefined';

      if (!hasAnyAPI) {
        console.log('ℹ️ Chrome Built-in AI APIs not detected - Extension will use fallback methods for all features');
        this.initialized = true; // Mark as initialized to use fallback methods
        return true;
      }

      // Initialize Summarizer API - Following Chrome documentation
      // NOTE: Uses global Summarizer, not window.ai.summarizer
      if (typeof Summarizer !== 'undefined') {
        try {
          // Check availability first (recommended by Chrome docs)
          // Include configuration to prevent warnings
          const availability = await Summarizer.availability({
            type: 'key-points',
            format: 'markdown',
            length: 'medium',
            outputLanguage: 'en'
          });
          console.log('🔍 Summarizer availability:', availability);

          if (availability === 'no') {
            console.warn('⚠️ Summarizer not available on this device');
          } else if (availability === 'readily' || availability === 'after-download' || availability === 'available') {
            // Create summarizer with monitor for download progress
            this.summarizer = await Summarizer.create({
              type: 'key-points',
              format: 'markdown',
              length: 'medium',
              outputLanguage: 'en', // Specify output language for optimal quality and safety
              monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                  console.log(`📥 Summarizer model downloading: ${Math.round(e.loaded * 100)}%`);
                });
              }
            });
            console.log('✅ Chrome AI Summarizer initialized');
          }
        } catch (error) {
          console.warn('⚠️ Chrome AI Summarizer not available:', error.message);
        }
      }

      // Initialize Rewriter API - Following Chrome documentation
      // NOTE: Uses global Rewriter, not window.ai.rewriter
      if (typeof Rewriter !== 'undefined') {
        try {
          // Check availability first (recommended by Chrome docs)
          // Must pass same configuration to both availability() and create()
          const availability = await Rewriter.availability({
            tone: 'as-is',
            format: 'plain-text',
            length: 'as-is',
            outputLanguage: 'en'
          });
          console.log('🔍 Rewriter availability:', availability);

          if (availability === 'no') {
            console.warn('⚠️ Rewriter not available on this device');
          } else if (availability === 'readily' || availability === 'after-download' || availability === 'available') {
            // Create rewriter with monitor for download progress
            this.rewriter = await Rewriter.create({
              tone: 'as-is',
              format: 'plain-text',
              length: 'as-is',
              outputLanguage: 'en', // Specify output language for optimal quality and safety
              monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                  console.log(`📥 Rewriter model downloading: ${Math.round(e.loaded * 100)}%`);
                });
              }
            });
            console.log('✅ Chrome AI Rewriter initialized');
          }
        } catch (error) {
          console.warn('⚠️ Chrome AI Rewriter not available:', error.message);
        }
      }

      // Initialize Proofreader API - Following Chrome documentation
      // NOTE: Uses global Proofreader, not window.ai.proofreader
      if (typeof Proofreader !== 'undefined') {
        try {
          // Check availability first (recommended by Chrome docs)
          const availability = await Proofreader.availability();
          console.log('🔍 Proofreader availability:', availability);

          if (availability === 'no') {
            console.warn('⚠️ Proofreader not available on this device');
          } else if (availability === 'readily' || availability === 'after-download' || availability === 'available') {
            // Create proofreader with monitor for download progress
            this.proofreader = await Proofreader.create({
              expectedInputLanguages: ['en'], // Specify expected input language
              monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                  console.log(`📥 Proofreader model downloading: ${Math.round(e.loaded * 100)}%`);
                });
              }
            });
            console.log('✅ Chrome AI Proofreader initialized');
          }
        } catch (error) {
          console.warn('⚠️ Chrome AI Proofreader not available:', error.message);
        }
      }

      // Initialize Language Model (Prompt API) - Following Chrome documentation
      // NOTE: Uses global LanguageModel, not window.ai.languageModel
      if (typeof LanguageModel !== 'undefined') {
        try {
          // Check availability first (required by Chrome docs)
          const availability = await LanguageModel.availability({
            outputLanguage: 'en'
          });
          console.log('🔍 Language Model availability:', availability);
          console.log('🔍 Language Model availability type:', typeof availability);

          if (availability === 'no') {
            console.warn('⚠️ Language Model not available on this device');
          } else if (availability === 'readily' || availability === 'after-download' || availability === 'available') {
            // Get model parameters for optimal configuration (only if available)
            const params = await LanguageModel.params({
              outputLanguage: 'en'
            });
            console.log('📊 Language Model params:', params);

            // Create session with recommended parameters
            this.languageModel = await LanguageModel.create({
              temperature: params.defaultTemperature,
              topK: params.defaultTopK,
              outputLanguage: 'en',
              // Add expected inputs/outputs for better support
              expectedInputs: [
                { type: 'text', languages: ['en'] }
              ],
              expectedOutputs: [
                { type: 'text', languages: ['en'] }
              ],
              // Add initial system prompt for better context
              initialPrompts: [
                {
                  role: 'system',
                  content: 'You are a helpful assistant that provides clear, concise, and accurate responses for accessibility features.'
                }
              ],
              // Monitor download progress
              monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                  console.log(`📥 Model downloading: ${Math.round(e.loaded * 100)}%`);
                });
              }
            });
            console.log('✅ Chrome AI Language Model initialized with recommended settings');
          }
        } catch (error) {
          console.warn('⚠️ Chrome AI Language Model not available:', error.message);
        }
      }

      // Note: Translator API is not initialized because same-language translation (en->en)
      // is not supported. For idiom-to-literal conversion, we use Language Model instead.

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize AI services:', error);
      return false;
    }
  }

  async summarizeText(text, options = {}) {
    if (!this.summarizer) {
      return this.fallbackSummarize(text);
    }

    try {
      const summary = await this.summarizer.summarize(text, {
        context: options.context || '',
        type: options.type || 'key-points',
        outputLanguage: 'en' // Specify output language to prevent warnings
      });
      return summary;
    } catch (error) {
      console.error('Summarization failed:', error);
      return this.fallbackSummarize(text);
    }
  }

  async simplifyText(text, readingLevel = 'elementary', options = {}) {
    if (!this.languageModel) {
      console.warn('⚠️ Language model not available, using fallback simplification');
      return this.fallbackSimplify(text, readingLevel);
    }

    try {
      console.log('🤖 Using Chrome AI Prompt API (Language Model) for text simplification');

      // Check session quota before prompting
      await this.checkSessionQuota();

      // Determine reading level instructions based on level
      let levelInstructions = '';

      if (readingLevel.includes('ELI5') || readingLevel.includes('5')) {
        levelInstructions = 'Explain Like I\'m 5 (ELI5) - Use very simple words a young child would understand. Short sentences only (5-10 words maximum). No complex ideas.';
      } else if (readingLevel.includes('ELI10') || readingLevel.includes('10')) {
        levelInstructions = 'Explain Like I\'m 10 (ELI10) - Use simple language that a 10-year-old would understand. Keep sentences clear and under 15 words. Avoid jargon.';
      } else if (readingLevel.includes('ELI15') || readingLevel.includes('15')) {
        levelInstructions = 'Explain Like I\'m 15 (ELI15) - Use language appropriate for a high school student. Sentences can be longer but should remain clear. Some technical terms are okay with brief explanations.';
      } else if (readingLevel.toLowerCase().includes('college')) {
        levelInstructions = 'College Level - Maintain sophisticated vocabulary while improving clarity. Complex sentences are acceptable. Technical terms can be used with proper context.';
      } else {
        levelInstructions = 'Elementary reading level - Use common everyday words. Keep sentences short and clear.';
      }

      const prompt = `Simplify this text to ${readingLevel} reading level.

Instructions:
- ${levelInstructions}
- Replace difficult words with appropriate synonyms for the level
- Adjust sentence length appropriately for the level
- Keep the same meaning but make it easier to read
- Return ONLY the simplified text, no explanations

Text to simplify:
${text}`;

      console.log('🛑 Simplification prompt:', prompt.substring(0, 500));

      const promptOptions = {
        outputLanguage: 'en'
      };
      if (options.signal) {
        promptOptions.signal = options.signal;
      }

      const simplified = await this.languageModel.prompt(prompt, promptOptions);
      return simplified.trim();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Text simplification cancelled');
        return this.fallbackSimplify(text, readingLevel);
      }
      console.error('❌ Simplification failed:', error);
      return this.fallbackSimplify(text, readingLevel);
    }
  }

  async expandText(text, options = {}) {
    if (!this.languageModel) {
      console.warn('⚠️ Language model not available, using fallback expansion');
      return this.fallbackExpand(text);
    }

    try {
      console.log('🤖 Using Chrome AI Language Model for text expansion');

      // Check session quota before prompting
      await this.checkSessionQuota();

      const prompt = `Expand this text by adding more detail, context, and explanation.

Instructions:
- Add relevant details and examples to enhance understanding
- Expand on key concepts with additional context
- Include background information where helpful
- Maintain the original meaning while making it more comprehensive
- Use clear, accessible language
- Return ONLY the expanded text, no explanations or meta-commentary

Original text:
${text}`;

      const promptOptions = {
        outputLanguage: 'en'
      };
      if (options.signal) {
        promptOptions.signal = options.signal;
      }

      const expanded = await this.languageModel.prompt(prompt, promptOptions);
      return expanded.trim();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Text expansion cancelled');
        return this.fallbackExpand(text);
      }
      console.error('❌ Expansion failed:', error);
      return this.fallbackExpand(text);
    }
  }

  async generateAlternativePhrasings(text, options = {}) {
    // Try Rewriter API first (best for rephrasing)
    if (this.rewriter) {
      try {
        console.log('🤖 Using Chrome AI Rewriter API for alternative phrasings');

        const alternatives = [];

        // Generate 3 different phrasings using rewriter with different tones
        const tones = ['more-formal', 'more-casual', 'as-is'];

        for (const tone of tones) {
          try {
            const rewritten = await this.rewriter.rewrite(text, {
              tone: tone,
              format: 'plain-text',
              length: 'as-is',
              outputLanguage: 'en'
            });

            // Only add if it's actually different from the original
            if (rewritten.trim() !== text.trim()) {
              alternatives.push(rewritten.trim());
            }
          } catch (err) {
            console.warn(`⚠️ Failed to generate ${tone} phrasing:`, err);
          }
        }

        if (alternatives.length > 0) {
          return alternatives.slice(0, 3); // Return max 3 alternatives
        }
      } catch (error) {
        console.warn('⚠️ Rewriter API failed, falling back to Language Model:', error);
      }
    }

    // Fallback to Language Model
    if (this.languageModel) {
      try {
        console.log('🤖 Using Language Model for alternative phrasings');

        await this.checkSessionQuota();

        const prompt = `Provide 3 alternative ways to phrase this sentence. Each alternative should:
- Convey the same meaning
- Use different wording and sentence structure
- Be clear and natural
- Be suitable for different contexts (formal, casual, neutral)

Format your response as a JSON array of strings, like this:
["alternative 1", "alternative 2", "alternative 3"]

Original sentence: ${text}`;

        const promptOptions = {
          signal: options.signal,
          outputLanguage: 'en'
        };

        const response = await this.languageModel.prompt(prompt, promptOptions);

        // Parse JSON response
        try {
          const alternatives = JSON.parse(response);
          if (Array.isArray(alternatives)) {
            return alternatives.slice(0, 3);
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse alternatives JSON, extracting manually');
          // Try to extract alternatives from response
          const lines = response.split('\n').filter(line => line.trim().length > 10);
          return lines.slice(0, 3).map(line => line.replace(/^[\d\-\.\*\)]+\s*/, '').trim());
        }
      } catch (error) {
        console.error('❌ Language Model failed for alternatives:', error);
      }
    }

    return this.fallbackGenerateAlternatives(text);
  }

  async adjustTone(text, tone = 'neutral', options = {}) {
    // Use Rewriter API for tone adjustment (best suited for this task)
    if (this.rewriter) {
      try {
        console.log(`🤖 Using Chrome AI Rewriter API for tone adjustment to: ${tone}`);

        // Map our tone labels to Rewriter API tone values
        const toneMap = {
          'formal': 'more-formal',
          'casual': 'more-casual',
          'neutral': 'as-is',
          'encouraging': 'more-casual' // Use casual for encouraging, then adjust with Language Model
        };

        const rewriterTone = toneMap[tone] || 'as-is';

        const rewritten = await this.rewriter.rewrite(text, {
          tone: rewriterTone,
          format: 'plain-text',
          length: 'as-is',
          outputLanguage: 'en'
        });

        // For encouraging tone, add positive phrasing using Language Model
        if (tone === 'encouraging' && this.languageModel) {
          try {
            await this.checkSessionQuota();

            const prompt = `Rewrite this text to be more encouraging and positive while maintaining the same meaning:

"${rewritten}"

Make it supportive and motivating. Return ONLY the rewritten text.`;

            const encouraging = await this.languageModel.prompt(prompt, { outputLanguage: 'en' });
            return encouraging.trim();
          } catch (err) {
            console.warn('⚠️ Failed to add encouraging tone, returning casual version:', err);
            return rewritten.trim();
          }
        }

        return rewritten.trim();
      } catch (error) {
        console.warn('⚠️ Rewriter API failed for tone adjustment:', error);
      }
    }

    // Fallback to Language Model
    if (this.languageModel) {
      try {
        console.log(`🤖 Using Language Model for tone adjustment to: ${tone}`);
        await this.checkSessionQuota();

        const toneDescriptions = {
          'formal': 'professional and formal language with sophisticated vocabulary',
          'casual': 'casual and conversational language, like talking to a friend',
          'neutral': 'neutral and clear language without strong style',
          'encouraging': 'supportive and encouraging language that motivates and uplifts'
        };

        const prompt = `Rewrite this text in a ${tone} tone using ${toneDescriptions[tone] || 'clear language'}:

"${text}"

Keep the same meaning but adjust the tone. Return ONLY the rewritten text.`;

        const adjusted = await this.languageModel.prompt(prompt, {
          signal: options.signal,
          outputLanguage: 'en'
        });
        return adjusted.trim();
      } catch (error) {
        console.error('❌ Language Model failed for tone adjustment:', error);
      }
    }

    return this.fallbackToneAdjustment(text, tone);
  }

  async convertToActiveVoice(text, options = {}) {
    // Try Language Model first (better for grammatical transformations)
    if (this.languageModel) {
      try {
        console.log('🤖 Using Language Model for active voice conversion');
        await this.checkSessionQuota();

        const prompt = `Convert any passive voice sentences in this text to active voice. Keep active voice sentences as they are.

Original text:
"${text}"

Rules:
- Convert passive voice (e.g., "The ball was thrown by John") to active voice (e.g., "John threw the ball")
- Keep active voice sentences unchanged
- Maintain the same meaning
- Return ONLY the converted text

Converted text:`;

        const converted = await this.languageModel.prompt(prompt, {
          signal: options.signal,
          outputLanguage: 'en'
        });
        return converted.trim();
      } catch (error) {
        console.error('❌ Language Model failed for active voice conversion:', error);
      }
    }

    // Fallback to Rewriter if Language Model unavailable
    if (this.rewriter) {
      try {
        console.log('🤖 Using Rewriter API as fallback for active voice');
        const rewritten = await this.rewriter.rewrite(text, {
          tone: 'as-is',
          format: 'plain-text',
          length: 'as-is',
          outputLanguage: 'en'
        });
        return rewritten.trim();
      } catch (error) {
        console.warn('⚠️ Rewriter API failed:', error);
      }
    }

    return this.fallbackActiveVoice(text);
  }

  async restructureSentences(text, options = {}) {
    // Use Language Model for sentence restructuring (best suited for this task)
    if (this.languageModel) {
      try {
        console.log('🤖 Using Language Model for sentence restructuring');
        await this.checkSessionQuota();

        const prompt = `Break down long, complex sentences in this text into shorter, clearer sentences. This is for dyslexic readers who benefit from simpler sentence structures.

Original text:
"${text}"

Rules:
- Break sentences longer than 15 words into shorter ones
- Keep sentences that are already short
- Maintain the same meaning and information
- Use simple, clear language
- Return ONLY the restructured text

Restructured text:`;

        const restructured = await this.languageModel.prompt(prompt, {
          signal: options.signal,
          outputLanguage: 'en'
        });
        return restructured.trim();
      } catch (error) {
        console.error('❌ Language Model failed for sentence restructuring:', error);
      }
    }

    // Fallback to Rewriter with shorter length
    if (this.rewriter) {
      try {
        console.log('🤖 Using Rewriter API as fallback for restructuring');
        const rewritten = await this.rewriter.rewrite(text, {
          tone: 'as-is',
          format: 'plain-text',
          length: 'shorter',
          outputLanguage: 'en'
        });
        return rewritten.trim();
      } catch (error) {
        console.warn('⚠️ Rewriter API failed:', error);
      }
    }

    return this.fallbackRestructure(text);
  }

  fallbackExpand(text) {
    console.log('🔧 Using fallback expansion (Chrome AI not available)');

    // Simple expansion: add context phrases
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const expanded = sentences.map(sentence => {
      const trimmed = sentence.trim();
      // Add contextual phrases
      const starters = ['In other words,', 'To explain further,', 'More specifically,', 'This means that'];

      // Just return the sentence with minimal expansion
      return trimmed + '. ' + starters[0] + ' ' + trimmed.toLowerCase();
    });

    return expanded.join('. ') + '.';
  }

  fallbackToneAdjustment(text, tone) {
    console.log(`🔧 Using fallback tone adjustment (Chrome AI not available) - Tone: ${tone}`);

    // Simple word replacements based on tone
    let adjusted = text;

    if (tone === 'formal') {
      const formalReplacements = {
        "don't": "do not",
        "can't": "cannot",
        "won't": "will not",
        "I'm": "I am",
        "you're": "you are",
        "it's": "it is",
        "get": "obtain",
        "help": "assist",
        "buy": "purchase",
        "try": "attempt"
      };
      for (const [informal, formal] of Object.entries(formalReplacements)) {
        const regex = new RegExp('\\b' + informal + '\\b', 'gi');
        adjusted = adjusted.replace(regex, formal);
      }
    } else if (tone === 'casual') {
      const casualReplacements = {
        "obtain": "get",
        "assist": "help",
        "purchase": "buy",
        "attempt": "try",
        "utilize": "use",
        "demonstrate": "show"
      };
      for (const [formal, casual] of Object.entries(casualReplacements)) {
        const regex = new RegExp('\\b' + formal + '\\b', 'gi');
        adjusted = adjusted.replace(regex, casual);
      }
    } else if (tone === 'encouraging') {
      // Add positive words
      adjusted = adjusted + ' You can do this!';
    }

    return adjusted;
  }

  fallbackActiveVoice(text) {
    console.log('🔧 Using fallback active voice conversion (Chrome AI not available)');

    // Simple passive to active conversions
    let converted = text;

    // Pattern: "was/were [verb]ed by [subject]" -> "[subject] [verb]ed"
    converted = converted.replace(/(\w+)\s+was\s+(\w+)ed\s+by\s+(\w+)/gi, '$3 $2ed $1');
    converted = converted.replace(/(\w+)\s+were\s+(\w+)ed\s+by\s+(\w+)/gi, '$3 $2ed $1');

    return converted;
  }

  fallbackRestructure(text) {
    console.log('🔧 Using fallback sentence restructuring (Chrome AI not available)');

    // Break long sentences at conjunctions
    let restructured = text;

    // Break at "and" if sentence is long
    const sentences = restructured.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const shortened = sentences.map(sentence => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 15) {
        // Try to break at common conjunctions
        let result = sentence.trim();
        result = result.replace(/,\s+and\s+/gi, '. ');
        result = result.replace(/,\s+but\s+/gi, '. But ');
        result = result.replace(/,\s+so\s+/gi, '. So ');
        // Fix capitalization
        result = result.replace(/\.\s+([a-z])/g, (_match, letter) => '. ' + letter.toUpperCase());
        return result;
      }
      return sentence.trim();
    });

    return shortened.join('. ') + '.';
  }

  fallbackGenerateAlternatives(text) {
    console.log('🔧 Using fallback alternative generation (Chrome AI not available)');

    // Simple rephrasing variations
    return [
      text.replace(/\b(is|are|was|were)\b/g, 'remains').replace(/\b(very|really)\b/g, 'quite'),
      text.replace(/\b(and)\b/g, 'as well as').replace(/\b(but)\b/g, 'however'),
      text.charAt(0).toUpperCase() + text.slice(1).replace(/\b(the|a|an)\b/g, '')
    ].filter((alt, index, self) => alt !== text && self.indexOf(alt) === index).slice(0, 3);
  }

  async proofreadText(text, options = {}) {
    // Use Chrome's Proofreader API (recommended) if available
    if (this.proofreader) {
      try {
        console.log('🤖 Using Chrome AI Proofreader API');

        // Call proofread() method which returns a ProofreadResult
        const proofreadResult = await this.proofreader.proofread(text);

        // Extract the corrected text from the result
        // ProofreadResult has 'correction' property with the corrected text
        const correctedText = proofreadResult.correction || text;

        console.log('✅ Proofreading complete');
        return correctedText;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('🛑 Proofreading cancelled');
          return text;
        }
        console.error('Proofreader API failed:', error);
        // Fall through to Language Model fallback
      }
    }

    // Fallback to Language Model if Proofreader not available
    if (!this.languageModel) {
      console.warn('⚠️ Proofreader and Language Model not available, skipping proofreading');
      return text;
    }

    try {
      console.log('🤖 Using Language Model fallback for proofreading');

      // Check session quota before prompting (recommended by Chrome docs)
      await this.checkSessionQuota();

      const prompt = `Proofread this text for grammar, spelling, and punctuation errors. Return ONLY the corrected text with no explanations or additional commentary:

${text}`;

      // Support abort signal for cancellation
      const promptOptions = {
        outputLanguage: 'en'
      };
      if (options.signal) {
        promptOptions.signal = options.signal;
      }

      const proofread = await this.languageModel.prompt(prompt, promptOptions);
      return proofread.trim();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Proofreading cancelled');
        return text;
      }
      console.error('Proofreading fallback failed:', error);
      return text; // Return original if proofreading fails
    }
  }

  // Check session usage against quota (recommended by Chrome docs)
  async checkSessionQuota() {
    if (this.languageModel && this.languageModel.inputUsage !== undefined) {
      const usage = this.languageModel.inputUsage;
      const quota = this.languageModel.inputQuota;

      // Validate quota exists and is a positive number
      if (!quota || quota <= 0 || !isFinite(quota)) {
        console.log('📊 Session usage tracking not available (quota undefined or invalid)');
        return;
      }

      const percentUsed = (usage / quota) * 100;

      // Validate percentUsed is a valid number
      if (!isFinite(percentUsed)) {
        console.warn('⚠️ Invalid session usage calculation');
        return;
      }

      console.log(`📊 Session usage: ${usage}/${quota} tokens (${percentUsed.toFixed(1)}%)`);

      // Warn if approaching limit
      if (percentUsed > 80) {
        console.warn(`⚠️ Session quota approaching limit: ${percentUsed.toFixed(1)}% used`);
      }

      // Proactively reinitialize at 95% to prevent hitting quota limit
      if (percentUsed >= 95) {
        console.warn('🔄 Session quota nearly exhausted (95%+), creating new session...');
        await this.reinitializeLanguageModel();
        console.log('✅ New session ready with fresh quota');
      }
    }
  }

  // Reinitialize language model session when quota is exceeded
  async reinitializeLanguageModel() {
    if (typeof LanguageModel === 'undefined') return;

    try {
      // Destroy old session
      if (this.languageModel) {
        await this.languageModel.destroy();
      }

      // Create new session with same parameters using global LanguageModel
      const params = await LanguageModel.params({
        outputLanguage: 'en'
      });
      this.languageModel = await LanguageModel.create({
        temperature: params.defaultTemperature,
        topK: params.defaultTopK,
        outputLanguage: 'en',
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        initialPrompts: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides clear, concise, and accurate responses for accessibility features.'
          }
        ]
      });
      console.log('✅ Language model session reinitialized');
    } catch (error) {
      console.error('❌ Failed to reinitialize language model:', error);
    }
  }

  async explainTerm(term, context = '', options = {}) {
    if (!this.languageModel) {
      console.warn('⚠️ Language model not available, using fallback definition');
      return this.fallbackDefinition(term);
    }

    try {
      console.log('🤖 explainTerm (context-aware)', term);
      // Check session quota before prompting
      await this.checkSessionQuota();

      // Context-aware prompt that emphasizes meaning in THIS specific sentence
      const prompt = `Given the sentence: "${context}"

What does the word "${term}" mean in THIS specific sentence?

Provide a brief, simple definition (1-2 sentences max) that explains how "${term}" is used in this context. Use elementary vocabulary suitable for someone with learning differences.

Format your response as: "In this sentence, '${term}' means [your explanation]."`;

      const promptOptions = {
        outputLanguage: 'en'
      };
      if (options.signal) {
        promptOptions.signal = options.signal;
      }

      const explanation = await this.languageModel.prompt(prompt, promptOptions);
      return explanation;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Term explanation cancelled');
        return this.fallbackDefinition(term);
      }
      console.error('Term explanation failed:', error);
      return this.fallbackDefinition(term);
    }
  }

  async explainIdiom(idiom, literalMeaning = '', options = {}) {
    if (!this.languageModel) {
      console.warn('⚠️ Language model not available, using provided literal meaning');
      return literalMeaning || this.fallbackIdiomExplanation(idiom);
    }

    try {
      // Check session quota before prompting
      await this.checkSessionQuota();

      const prompt = `Explain the idiom "${idiom}" in very simple, clear language for someone who takes language literally.

Provide a 1-2 sentence explanation that:
- Explains what people really mean when they say this
- Uses simple, everyday words
- Is clear and direct

Format: Start with the idiom, then "means" and the explanation.
Example: "break the ice means to start a conversation and help people feel comfortable"`;

      const promptOptions = {
        outputLanguage: 'en'
      };
      if (options.signal) {
        promptOptions.signal = options.signal;
      }

      const explanation = await this.languageModel.prompt(prompt, promptOptions);
      return explanation.trim();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Idiom explanation cancelled');
        return literalMeaning || this.fallbackIdiomExplanation(idiom);
      }
      console.error('Idiom explanation failed:', error);
      return literalMeaning || this.fallbackIdiomExplanation(idiom);
    }
  }

  fallbackIdiomExplanation(idiom) {
    // Basic idiom explanations for common phrases
    const explanations = {
      'break the ice': 'start a conversation and help people feel comfortable',
      'piece of cake': 'something that is very easy to do',
      'hit the nail on the head': 'say something that is exactly right',
      'costs an arm and a leg': 'is very expensive',
      'let the cat out of the bag': 'reveal a secret',
      'under the weather': 'feeling sick or unwell',
      'spill the beans': 'tell a secret',
      'bite the bullet': 'do something difficult that you have been avoiding',
      'beat around the bush': 'avoid talking about the main topic',
      'call it a day': 'stop working for the day'
    };

    const lowerIdiom = idiom.toLowerCase().trim();
    if (explanations[lowerIdiom]) {
      return `${idiom} means ${explanations[lowerIdiom]}`;
    }

    return `${idiom} is a figure of speech. The literal meaning may not match what people actually mean when they say it.`;
  }

  fallbackDefinition(term) {
    // Simple definitions dictionary for common difficult words
    const definitions = {
      'really': 'truly or very much',
      'however': 'but or on the other hand',
      'therefore': 'for that reason or because of that',
      'although': 'even though or despite',
      'furthermore': 'in addition to or also',
      'nevertheless': 'even so or still',
      'consequently': 'as a result',
      'subsequently': 'after that or later',
      'approximately': 'about or around',
      'utilize': 'use or make use of',
      'demonstrate': 'show or prove',
      'implement': 'put into action or do',
      'acquire': 'get or obtain',
      'facilitate': 'make easier or help',
      'numerous': 'many',
      'substantial': 'large or significant',
      'essential': 'very important or needed',
      'fundamental': 'basic or most important',
      'comprehensive': 'complete or including everything',
      'significant': 'important or meaningful',
      'particular': 'specific or special',
      'various': 'different kinds or several',
      'specific': 'exact or particular',
      'appropriate': 'suitable or right for the situation',
      'adequate': 'enough or sufficient',
      'efficient': 'working well without waste',
      'sufficient': 'enough',
      'prominent': 'important or well-known',
      'prevalent': 'common or widespread',
      'elaborate': 'detailed or complicated',
      'inevitable': 'certain to happen',
      'crucial': 'very important',
      'vital': 'necessary for life or success',
      'peculiar': 'strange or unusual',
      'versatile': 'able to do many things',
      'complex': 'complicated or having many parts',
      'intricate': 'very detailed or complicated',
      'coherent': 'clear and easy to understand',
      'ambiguous': 'unclear or having more than one meaning'
    };

    const lowerTerm = term.toLowerCase().trim();

    if (definitions[lowerTerm]) {
      return `${term} means ${definitions[lowerTerm]}`;
    }

    // If not in dictionary, provide a helpful message
    return `${term} is a complex word. Try looking it up in a dictionary for more info.`;
  }

  async detectAndConvertIdiom(sentence, options = {}) {
    if (!this.languageModel) {
      console.warn('⚠️ Language model not available, using fallback idiom detection');
      return this.fallbackIdiomDetection(sentence);
    }

    try {
      // Check session quota before prompting
      await this.checkSessionQuota();

      const prompt = `Analyze this sentence for idioms, metaphors, or figurative language:
"${sentence}"

If it contains an idiom/metaphor/figurative language, respond with JSON:
{
  "hasIdiom": true,
  "idiom": "the exact idiom phrase",
  "literal": "literal meaning in plain language"
}

If NO idiom is found, respond with:
{
  "hasIdiom": false
}

Keep literal meanings short and clear for autism spectrum users. Examples:
- "break the ice" → "start a conversation"
- "piece of cake" → "very easy"
- "hit the nail on the head" → "exactly correct"

Respond ONLY with valid JSON, no other text.`;

      // JSON Schema for structured output (recommended by Chrome docs)
      const responseSchema = {
        type: 'object',
        properties: {
          hasIdiom: { type: 'boolean' },
          idiom: { type: 'string' },
          literal: { type: 'string' }
        },
        required: ['hasIdiom']
      };

      const promptOptions = {
        responseConstraint: responseSchema,
        outputLanguage: 'en'
      };

      // Support abort signal for cancellation
      if (options.signal) {
        promptOptions.signal = options.signal;
      }

      const response = await this.languageModel.prompt(prompt, promptOptions);
      console.log('🤖 AI response for idiom detection:', response.substring(0, 200));

      // Parse JSON response (no need to clean since we're using responseConstraint)
      const result = JSON.parse(response);

      console.log('✅ Parsed idiom result:', result);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Idiom detection cancelled');
        return { hasIdiom: false };
      }
      console.error('❌ Idiom detection failed, using fallback:', error);
      return this.fallbackIdiomDetection(sentence);
    }
  }

  fallbackIdiomDetection(sentence) {
    // Use the comprehensive idioms dictionary loaded from idioms-dictionary.js
    const idioms = window.IDIOMS_DICTIONARY || {};

    const idiomCount = Object.keys(idioms).length;
    if (idiomCount === 0) {
      console.error('❌ Idioms dictionary not loaded!');
      return { hasIdiom: false };
    }

    console.log(`📚 Using dictionary with ${idiomCount} idioms`);

    const lowerSentence = sentence.toLowerCase();

    // Sort idioms by length (longest first) to match more specific phrases before shorter ones
    const sortedIdioms = Object.entries(idioms).sort((a, b) => b[0].length - a[0].length);

    // Check for each idiom
    for (const [idiom, literal] of sortedIdioms) {
      if (lowerSentence.includes(idiom.toLowerCase())) {
        console.log(`✅ Found idiom: "${idiom}" → "${literal}"`);
        return {
          hasIdiom: true,
          idiom: idiom,
          literal: literal
        };
      }
    }

    return { hasIdiom: false };
  }

  // Fallback methods when AI APIs are unavailable
  fallbackSummarize(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keyPoints = sentences.slice(0, Math.min(3, sentences.length));
    return '• ' + keyPoints.join('\n• ');
  }

  fallbackSimplify(text, readingLevel) {
    console.log(`🔧 Using fallback simplification (Chrome AI not available) - Level: ${readingLevel}`);

    // Check if this is ELI5 mode
    const isELI5 = readingLevel.includes('ELI5') || readingLevel.includes('5');

    // Basic simplification: break long sentences, remove complex punctuation
    let simplified = text;

    // Replace semicolons and colons with periods
    simplified = simplified.replace(/[;:]/g, '.');

    // Break at commas to create shorter sentences (more aggressive for ELI5)
    if (isELI5) {
      simplified = simplified.replace(/,\s+/g, '. ');
    }

    // Fix capitalization after new periods
    simplified = simplified.replace(/\.\s+([a-z])/g, (_match, letter) => '. ' + letter.toUpperCase());

    // Replace common complex words with simpler ones
    const replacements = {
      'utilize': 'use',
      'approximately': 'about',
      'demonstrate': 'show',
      'sufficient': 'enough',
      'implement': 'do',
      'consequently': 'so',
      'furthermore': 'also',
      'nevertheless': 'but',
      'therefore': 'so',
      'however': 'but',
      'additionally': 'also',
      'subsequently': 'then',
      'commence': 'start',
      'terminate': 'end',
      'numerous': 'many',
      'substantial': 'large',
      'acquire': 'get',
      'alternative': 'other',
      'assist': 'help',
      'attempt': 'try',
      'comprehend': 'understand',
      'construct': 'build',
      'discover': 'find',
      'eliminate': 'remove',
      'endeavor': 'try',
      'facilitate': 'help',
      'indicate': 'show',
      'maintain': 'keep',
      'obtain': 'get',
      'provide': 'give',
      'purchase': 'buy',
      'require': 'need',
      'frequently': 'often',
      'occasionally': 'sometimes',
      'immediately': 'right away',
      'definitely': 'for sure',
      'particularly': 'very',
      'extremely': 'very',
      'incredibly': 'very',
      'essential': 'important',
      'fundamental': 'basic',
      'component': 'part',
      'characteristic': 'trait',
      'individuals': 'people',
      'conversation': 'talk',
      'encounter': 'meet',
      'recognize': 'know',
      'appreciate': 'like',
      'familiar': 'known'
    };

    // ELI5-specific additional replacements
    if (isELI5) {
      Object.assign(replacements, {
        'native': 'people who grew up speaking',
        'speakers': 'people who talk',
        'idioms': 'special phrases',
        'phrases': 'sayings',
        'figurative': 'not real',
        'literal': 'real',
        'expression': 'saying',
        'meaning': 'what it really means',
        'understand': 'know',
        'confused': 'mixed up',
        'confusing': 'hard to understand',
        'interesting': 'cool',
        'important': 'really matters',
        'different': 'not the same',
        'similar': 'almost the same',
        'various': 'many kinds of',
        'certain': 'some',
        'specific': 'special',
        'generally': 'most times',
        'typically': 'usually',
        'commonly': 'a lot'
      });
    }

    for (const [complex, simple] of Object.entries(replacements)) {
      const regex = new RegExp('\\b' + complex + '\\b', 'gi');
      simplified = simplified.replace(regex, simple);
    }

    // ELI5: Add friendly opening if it's the first paragraph
    if (isELI5 && text.length > 50) {
      // Check if text starts with something that looks like it needs ELI5 treatment
      if (!simplified.toLowerCase().startsWith('this means') &&
          !simplified.toLowerCase().startsWith('imagine') &&
          !simplified.toLowerCase().startsWith('think of')) {
        // Only add a friendlier intro if the text seems technical
        if (simplified.includes('special phrases') || simplified.includes('sayings')) {
          simplified = `This is about special sayings that people say. ` + simplified;
        }
      }
    }

    // Clean up multiple periods
    simplified = simplified.replace(/\.{2,}/g, '.');

    // Clean up spaces
    simplified = simplified.replace(/\s+/g, ' ').trim();

    // ELI5: Ensure sentences are short (max ~10 words per sentence)
    if (isELI5) {
      const sentences = simplified.split('. ');
      const shortenedSentences = sentences.map(sentence => {
        const words = sentence.split(' ');
        if (words.length > 12) {
          // Try to find a natural break point (conjunctions)
          const breakWords = ['and', 'but', 'so', 'or', 'because', 'when', 'if'];
          for (let i = 6; i < Math.min(10, words.length); i++) {
            if (breakWords.includes(words[i].toLowerCase())) {
              const part1 = words.slice(0, i).join(' ');
              const part2 = words.slice(i).join(' ');
              return part1 + '. ' + part2.charAt(0).toUpperCase() + part2.slice(1);
            }
          }
        }
        return sentence;
      });
      simplified = shortenedSentences.join('. ');
    }

    console.log(`✅ Fallback simplified (${isELI5 ? 'ELI5 mode' : 'standard'}): ${simplified.substring(0, 100)}...`);
    return simplified;
  }

  fallbackAnalyze(text) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;

    return {
      complexity: avgWordsPerSentence > 20 ? 8 : avgWordsPerSentence > 15 ? 6 : 4,
      difficultWords: [],
      sentenceComplexity: avgWordsPerSentence,
      suggestions: ['Consider breaking long sentences into shorter ones']
    };
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.AIService = AIService;
}
