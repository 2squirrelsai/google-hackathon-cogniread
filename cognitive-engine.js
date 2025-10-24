// Cognitive Analysis Engine
// Analyzes page content and provides accessibility transformations

class CognitiveEngine {
  constructor(aiService) {
    this.aiService = aiService;
    this.currentComplexity = 5; // Default: medium
    this.readingProgress = 0;
    this.focusMode = false;
    this.tldrMode = false;
    this.dyslexiaMode = false;
  }

  // Extract main content from page
  extractMainContent() {
    // Priority order for content extraction
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '#content',
      '.post-content',
      '.article-content',
      'body'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.cleanContent(element);
      }
    }

    return this.cleanContent(document.body);
  }

  // Clean and prepare content
  cleanContent(element) {
    const clone = element.cloneNode(true);

    // Remove unwanted elements
    const unwanted = clone.querySelectorAll('script, style, nav, header, footer, aside, .ad, .advertisement, iframe');
    unwanted.forEach(el => el.remove());

    return {
      element: clone,
      text: clone.innerText || clone.textContent,
      html: clone.innerHTML
    };
  }

  // Analyze cognitive complexity of text
  async analyzeComplexity(text) {
    const basicMetrics = this.calculateBasicMetrics(text);

    return {
      ...basicMetrics,
      overallComplexity: this.calculateOverallComplexity(basicMetrics, null)
    };
  }

  calculateBasicMetrics(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const avgSentenceLength = words.length / sentences.length;
    const avgParagraphLength = words.length / paragraphs.length;

    // Flesch Reading Ease approximation
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    const fleschScore = 206.835 - 1.015 * avgSentenceLength - 84.6 * (syllables / words.length);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordLength: avgWordLength.toFixed(2),
      avgSentenceLength: avgSentenceLength.toFixed(2),
      avgParagraphLength: avgParagraphLength.toFixed(2),
      fleschScore: Math.max(0, Math.min(100, fleschScore.toFixed(2))),
      estimatedReadingTime: Math.ceil(words.length / 200) // 200 wpm average
    };
  }

  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  calculateOverallComplexity(basic, ai) {
    let score = 5; // Default medium

    // Adjust based on sentence length
    if (basic.avgSentenceLength > 25) score += 2;
    else if (basic.avgSentenceLength > 20) score += 1;
    else if (basic.avgSentenceLength < 10) score -= 1;

    // Adjust based on Flesch score
    if (basic.fleschScore < 30) score += 2;
    else if (basic.fleschScore < 50) score += 1;
    else if (basic.fleschScore > 80) score -= 1;

    // Incorporate AI analysis if available
    if (ai && ai.complexity) {
      score = (score + ai.complexity) / 2;
    }

    return Math.max(1, Math.min(10, Math.round(score)));
  }

  // Break content into manageable chunks for focus mode
  // Works directly with live DOM elements
  chunkContent() {
    const chunks = [];

    // Find main content container in the actual DOM
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '#content',
      '.post-content',
      '.article-content'
    ];

    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) break;
    }

    // Fallback to body if no main content found
    if (!container) container = document.body;

    // Find all paragraphs and headings in the actual DOM
    const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');

    elements.forEach(element => {
      // Skip if inside unwanted elements
      if (element.closest('nav, header, footer, aside, .ad, .advertisement')) {
        return;
      }

      if (element.textContent.trim().length > 20) { // At least 20 chars
        chunks.push({
          element: element, // Actual DOM element
          text: element.textContent.trim(),
          type: element.tagName.toLowerCase()
        });
      }
    });

    return chunks;
  }

  // Identify difficult terms for definition bubbles
  identifyDifficultTerms(text) {
    const words = text.split(/\s+/);
    const difficultWords = [];

    for (const word of words) {
      const cleaned = word.replace(/[^a-zA-Z]/g, '').toLowerCase();

      // Criteria for "difficult" words
      if (
        cleaned.length > 10 || // Long words
        this.countSyllables(cleaned) > 3 || // Multi-syllabic
        this.isJargon(cleaned) // Technical jargon
      ) {
        if (!difficultWords.includes(cleaned)) {
          difficultWords.push(cleaned);
        }
      }
    }

    return difficultWords;
  }

  isJargon(word) {
    // Common technical/academic prefixes and suffixes
    const jargonPatterns = [
      /^anti/, /^auto/, /^bio/, /^co/, /^counter/, /^cyber/,
      /^de/, /^dis/, /^eco/, /^electro/, /^ex/, /^extra/,
      /^hyper/, /^inter/, /^intra/, /^macro/, /^mega/, /^meta/,
      /^micro/, /^multi/, /^neo/, /^non/, /^over/, /^poly/,
      /^post/, /^pre/, /^pro/, /^pseudo/, /^re/, /^semi/,
      /^sub/, /^super/, /^trans/, /^ultra/, /^un/, /^under/,
      /tion$/, /sion$/, /ment$/, /ness$/, /ology$/, /ism$/,
      /ity$/, /ous$/, /ive$/, /ful$/, /less$/, /able$/
    ];

    return jargonPatterns.some(pattern => pattern.test(word));
  }

  // Calculate reading progress
  calculateProgress(scrollPosition, totalHeight) {
    this.readingProgress = Math.min(100, Math.round((scrollPosition / totalHeight) * 100));
    return this.readingProgress;
  }

}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.CognitiveEngine = CognitiveEngine;
}
