// Chrome Prompt API Service for CogniRead
// Handles all AI-powered features using Chrome's built-in AI

class PromptAPIService {
  constructor() {
    this.isAvailable = false;
    this.availabilityStatus = null;
    this.session = null;
    this.defaultParams = null;
    this.initPromise = this.checkAvailability(); // Store promise for async init
  }

  // Check if model needs to be downloaded (requires user interaction)
  needsDownload() {
    return this.availabilityStatus === 'after-download';
  }

  // Wait for initialization to complete
  async waitForInit() {
    await this.initPromise;
    return this.isAvailable;
  }

  async checkAvailability() {
    try {
      // Check if Prompt API is available (uses global LanguageModel)
      if (typeof LanguageModel !== 'undefined') {
        console.log('🔍 Checking Prompt API availability...');

        // Get default parameters first (recommended by Chrome docs)
        try {
          this.defaultParams = await LanguageModel.params({
            outputLanguage: 'en'
          });
          console.log('🤖 Default AI params:', this.defaultParams);
        } catch (e) {
          console.log('⚠️ Could not retrieve default params, using fallback values');
        }

        // Check availability (not capabilities) with the same options we'll use for creation
        // Must pass identical options to both availability() and create()
        const availability = await LanguageModel.availability({
          temperature: 0.7,
          topK: 40,
          outputLanguage: 'en'
        });

        this.availabilityStatus = availability;
        this.isAvailable = availability === 'readily' || availability === 'after-download' || availability === 'available';

        if (availability === 'after-download') {
          console.log('🤖 Prompt API available after download (user interaction required for download)');
        } else if (availability === 'readily' || availability === 'available') {
          console.log('🤖 Prompt API readily available');
        } else {
          console.log('⚠️ Prompt API not available:', availability);
        }
      } else {
        console.log('⚠️ Prompt API not available in this browser');
        this.isAvailable = false;
      }
    } catch (error) {
      console.error('Error checking Prompt API availability:', error);
      this.isAvailable = false;
    }
  }

  async createSession(systemPrompt = '') {
    if (!this.isAvailable) {
      throw new Error('Prompt API is not available');
    }

    try {
      // Use initialPrompts array for better context management (modern approach)
      const options = {
        temperature: 0.7,
        topK: 40,
        outputLanguage: 'en'
      };

      // Add system prompt as initial prompt if provided
      if (systemPrompt) {
        options.initialPrompts = [
          {
            role: 'system',
            content: systemPrompt
          }
        ];
      }

      const session = await LanguageModel.create(options);
      return session;
    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
    }
  }

  async prompt(userPrompt, systemPrompt = '') {
    if (!this.isAvailable) {
      throw new Error('Prompt API is not available');
    }

    let session = null;
    try {
      session = await this.createSession(systemPrompt);

      // Check context window usage (optional but recommended)
      if (session.inputUsage && session.inputQuota) {
        console.log(`Context usage: ${session.inputUsage}/${session.inputQuota} tokens`);
      }

      const response = await session.prompt(userPrompt, { outputLanguage: 'en' });
      return response;
    } catch (error) {
      console.error('Error in prompt:', error);
      throw error;
    } finally {
      // Always destroy session to free resources, even if error occurs
      if (session) {
        session.destroy();
      }
    }
  }

  // Streaming version for longer responses (better UX)
  async promptStreaming(userPrompt, systemPrompt = '', onChunk = null) {
    if (!this.isAvailable) {
      throw new Error('Prompt API is not available');
    }

    let session = null;
    try {
      session = await this.createSession(systemPrompt);

      // Use promptStreaming for progressive display
      const stream = await session.promptStreaming(userPrompt, { outputLanguage: 'en' });
      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse = chunk;
        // Call callback with partial response if provided
        if (onChunk && typeof onChunk === 'function') {
          onChunk(chunk);
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error in streaming prompt:', error);
      throw error;
    } finally {
      // Always destroy session to free resources
      if (session) {
        session.destroy();
      }
    }
  }

  // Helper function to extract JSON from markdown code blocks
  extractJSON(response) {
    // Try to extract JSON from markdown code blocks
    const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }
    // If no code block, return as-is
    return response.trim();
  }

  // Feature 1: Concept Connections
  async findConceptConnections(text, existingConcepts = []) {
    const systemPrompt = `You are a concept mapping assistant. Identify key concepts in text and find connections to previously encountered concepts. Return ONLY valid JSON without any markdown formatting. Format: {"concepts": [{"name": "concept", "paragraph": "number", "connectedTo": ["concept1", "concept2"]}]}`;

    const userPrompt = `Analyze this text and identify key concepts. Also find connections to these existing concepts: ${existingConcepts.join(', ')}.\n\nText: ${text.substring(0, 2000)}`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      const jsonString = this.extractJSON(response);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error finding concept connections:', error);
      return { concepts: [] };
    }
  }

  // Feature 2: Analogy Generator
  async generateAnalogy(text, domain = 'cooking') {
    const domainExamples = {
      cooking: 'cooking, recipes, ingredients, techniques',
      sports: 'sports, games, teams, strategies',
      music: 'music, instruments, rhythm, harmony',
      nature: 'nature, ecosystems, animals, plants',
      travel: 'travel, journeys, destinations, exploration'
    };

    const systemPrompt = `You are an expert at creating clear, insightful analogies. Convert complex concepts into simple ${domain} analogies that make them easy to understand.`;

    const userPrompt = `Explain this concept using a ${domain} analogy. Use examples from ${domainExamples[domain] || domain}. Be creative and clear.\n\nConcept: ${text.substring(0, 1000)}`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      return response;
    } catch (error) {
      console.error('Error generating analogy:', error);
      return 'Failed to generate analogy.';
    }
  }

  // Feature 3: Plain Language Translation
  async translateToPlainLanguage(text, domain = 'auto') {
    const domainPrompts = {
      legal: 'You are a legal translator. Convert legal jargon and complex legal text into plain, everyday language that anyone can understand. Keep the meaning accurate but make it accessible.',
      medical: 'You are a medical translator. Convert medical terminology and clinical language into patient-friendly language. Make complex health information clear without losing accuracy.',
      academic: 'You are an academic translator. Convert scholarly and academic writing into general audience language. Simplify complex theories and jargon while preserving key insights.',
      auto: 'You are a universal translator. Detect if the text is legal, medical, academic, or technical, then convert it into plain, everyday language that anyone can understand.'
    };

    const systemPrompt = domainPrompts[domain] || domainPrompts.auto;
    const userPrompt = `Translate this text into plain language:\n\n${text.substring(0, 2000)}`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      return response;
    } catch (error) {
      console.error('Error translating to plain language:', error);
      return text;
    }
  }

  // Feature 4: Prerequisite Knowledge Detection
  async detectPrerequisites(text) {
    const systemPrompt = `You are an educational assistant. Analyze text and identify prerequisite knowledge needed to understand it. Return ONLY valid JSON without any markdown formatting. Format: {"prerequisites": [{"concept": "name", "why": "explanation", "difficulty": "beginner|intermediate|advanced"}]}`;

    const userPrompt = `Analyze this article and identify the prerequisite knowledge a reader needs. What concepts should they understand first?\n\nText: ${text.substring(0, 3000)}`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      const jsonString = this.extractJSON(response);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error detecting prerequisites:', error);
      return { prerequisites: [] };
    }
  }

  // Feature 5: Reading Goal Assistant
  async analyzeReadingGoals(text) {
    const systemPrompt = `You are a reading comprehension assistant. Analyze articles and identify key learning objectives, main sections, and what readers should take away. Return ONLY valid JSON without any markdown formatting. Format: {"goals": ["goal1", "goal2"], "keyTopics": ["topic1", "topic2"], "difficulty": "easy|medium|hard", "estimatedMinutes": number}`;

    const userPrompt = `Analyze this article and determine: What should readers learn? What are the key sections? How difficult is it?\n\nText: ${text.substring(0, 3000)}`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      const jsonString = this.extractJSON(response);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error analyzing reading goals:', error);
      return { goals: [], keyTopics: [], difficulty: 'medium', estimatedMinutes: 5 };
    }
  }

  // Feature 6: Cognitive Load Analysis
  async analyzeCognitiveLoad(paragraphs) {
    const systemPrompt = `You are a reading difficulty analyzer. Rate text complexity on a scale of 1-10 based on: vocabulary difficulty, sentence structure, concept density, and prerequisite knowledge. Return ONLY valid JSON without any markdown formatting. Format: {"scores": [number, number, ...]} where each number corresponds to a paragraph's difficulty (1=easy, 10=very hard).`;

    // Analyze up to 20 paragraphs at a time
    const sampleParagraphs = paragraphs.slice(0, 20).map((p, i) => `[${i}] ${p.substring(0, 200)}`).join('\n\n');
    const userPrompt = `Rate the difficulty of each paragraph (1-10):\n\n${sampleParagraphs}`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      const jsonString = this.extractJSON(response);
      const result = JSON.parse(jsonString);
      return result.scores || [];
    } catch (error) {
      console.error('Error analyzing cognitive load:', error);
      // Return neutral scores if analysis fails
      return paragraphs.map(() => 5);
    }
  }

  // Batch analysis for better performance
  async batchAnalyzeCognitiveLoad(allParagraphs) {
    const batchSize = 20;
    const allScores = [];

    for (let i = 0; i < allParagraphs.length; i += batchSize) {
      const batch = allParagraphs.slice(i, i + batchSize);
      const scores = await this.analyzeCognitiveLoad(batch);
      allScores.push(...scores);
    }

    return allScores;
  }

  // Feature: Describe Highlighted Text
  async describeText(text) {
    const systemPrompt = `You are a helpful assistant that provides clear, concise descriptions and explanations. When given a word, phrase, or concept, explain what it means in simple, accessible language. Include context, usage, and examples when helpful.`;

    const userPrompt = `Describe and explain the following text. Provide a clear, comprehensive explanation that helps someone understand what it means:\n\n"${text.substring(0, 1000)}"`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      return response;
    } catch (error) {
      console.error('Error describing text:', error);
      return 'Failed to generate description.';
    }
  }

  // Feature: Generate Example Sentences
  async generateSentences(text) {
    const systemPrompt = `You are a helpful writing assistant. When given a word or phrase, generate 3-5 example sentences that demonstrate how to use it correctly in different contexts. Make the sentences clear, natural, and varied in style and complexity.`;

    const userPrompt = `Generate 3-5 example sentences that correctly use the following word or phrase. Show different contexts and usage:\n\n"${text.substring(0, 500)}"\n\nProvide each sentence on a new line, numbered 1-5.`;

    try {
      const response = await this.prompt(userPrompt, systemPrompt);
      return response;
    } catch (error) {
      console.error('Error generating sentences:', error);
      return 'Failed to generate example sentences.';
    }
  }

  destroy() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}

// Initialize the service
window.cognireadPromptAPI = new PromptAPIService();

// Helper function to ensure API is ready before use
window.ensurePromptAPIReady = async function() {
  if (!window.cognireadPromptAPI) {
    throw new Error('PromptAPIService not initialized');
  }
  await window.cognireadPromptAPI.waitForInit();
  if (!window.cognireadPromptAPI.isAvailable) {
    throw new Error('Prompt API is not available in this browser. Please enable Chrome AI features.');
  }
  return window.cognireadPromptAPI;
};
