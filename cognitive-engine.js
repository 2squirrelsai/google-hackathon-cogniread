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
    const debugStats = {
      total: 0,
      filteredUnwanted: 0,
      filteredCogniread: 0,
      filteredTooShort: 0,
      filteredDivContainer: 0,
      added: 0
    };

    // Find main content container in the actual DOM
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '#content',
      '.post-content',
      '.article-content',
      '[role="article"]'
    ];

    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log(`✅ Found content container: ${selector}`);
        break;
      }
    }

    // Fallback to body if no main content found
    if (!container) {
      console.log('⚠️ No specific content container found, using document.body');
      container = document.body;
    }

    // Find all paragraphs and headings in the actual DOM
    const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, div');

    debugStats.total = elements.length;
    console.log(`🔍 Found ${elements.length} potential elements to chunk`);

    elements.forEach((element, index) => {
      // Skip if inside unwanted elements
      // Note: We allow headers that are inside articles (article headers vs site headers)
      const inHeader = element.closest('header');
      const inArticle = element.closest('article, main, [role="main"], [role="article"]');
      const isArticleHeader = inHeader && inArticle;

      // Only filter headers that are NOT part of articles
      if (element.closest('nav, footer, .ad, .advertisement, script, style') || (inHeader && !isArticleHeader)) {
        debugStats.filteredUnwanted++;
        return;
      }

      // Skip CogniRead's own elements
      if (element.closest('[id^="cogniread"], [class^="cogniread"]')) {
        debugStats.filteredCogniread++;
        return;
      }

      const text = element.textContent.trim();

      // More lenient content check - at least 10 chars
      // For divs, require more text (50 chars) to avoid empty containers
      const minLength = element.tagName.toLowerCase() === 'div' ? 50 : 10;

      if (text.length < minLength) {
        debugStats.filteredTooShort++;
        return;
      }

      // For divs, make sure they don't have too many child block elements (likely a container)
      if (element.tagName.toLowerCase() === 'div') {
        const childBlocks = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, article, section');
        if (childBlocks.length > 2) {
          debugStats.filteredDivContainer++;
          return; // This is likely a container, not content
        }
      }

      chunks.push({
        element: element, // Actual DOM element
        text: text,
        type: element.tagName.toLowerCase()
      });
      debugStats.added++;
    });

    console.log(`📊 Chunking Stats:`, debugStats);
    console.log(`✅ Created ${chunks.length} content chunks for focus mode`);

    // If no chunks found, log sample elements for debugging
    if (chunks.length === 0 && elements.length > 0) {
      console.log('❌ No chunks created! Debugging first 5 elements:');
      Array.from(elements).slice(0, 5).forEach((el, i) => {
        const inHeader = el.closest('header');
        const inArticle = el.closest('article, main, [role="main"], [role="article"]');
        console.log(`Element ${i}:`, {
          tag: el.tagName,
          textLength: el.textContent.trim().length,
          text: el.textContent.trim().substring(0, 100),
          isInNav: !!el.closest('nav'),
          isInHeader: !!inHeader,
          isInArticle: !!inArticle,
          isArticleHeader: !!(inHeader && inArticle),
          isInFooter: !!el.closest('footer'),
          isInCogniread: !!el.closest('[id^="cogniread"], [class^="cogniread"]'),
          childBlockCount: el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, article, section').length
        });
      });
    }

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
