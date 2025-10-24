// Background service worker for CogniRead Extension

// Track which tabs have CogniRead activated
const activeTabs = new Set();

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('CogniRead installed');

  // Initialize storage with default values
  chrome.storage.sync.set({
    cogniread_theme: 'system',
    cogniread_stats: {
      activationCount: 0,
      lastUsed: null
    }
  });

  // Set default badge
  chrome.action.setBadgeBackgroundColor({ color: '#4185F4' });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('CogniRead message received:', request);

  // Handle activation request from popup
  if (request.action === 'activateOnTab') {
    const tabId = request.tabId;

    if (activeTabs.has(tabId)) {
      sendResponse({ success: false, message: 'Already activated on this tab' });
      return;
    }

    // Inject content scripts
    injectContentScripts(tabId)
      .then(() => {
        activeTabs.add(tabId);
        updateBadge(tabId, true);

        // Update stats
        chrome.storage.sync.get(['cogniread_stats'], (result) => {
          const stats = result.cogniread_stats || {};
          stats.activationCount = (stats.activationCount || 0) + 1;
          stats.lastUsed = new Date().toISOString();
          chrome.storage.sync.set({ cogniread_stats: stats });
        });

        sendResponse({ success: true, message: 'CogniRead activated!' });
      })
      .catch((error) => {
        console.error('Failed to inject scripts:', error);
        sendResponse({ success: false, message: 'Failed to activate', error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  // Handle deactivation request
  if (request.action === 'deactivateOnTab') {
    const tabId = request.tabId;

    if (!activeTabs.has(tabId)) {
      sendResponse({ success: false, message: 'Not activated on this tab' });
      return;
    }

    // Send message to content script to clean up
    chrome.tabs.sendMessage(tabId, { action: 'cleanup' }, (response) => {
      activeTabs.delete(tabId);
      updateBadge(tabId, false);
      sendResponse({ success: true, message: 'CogniRead deactivated' });
    });

    return true;
  }

  // Check if tab is activated
  if (request.action === 'checkActivation') {
    const tabId = request.tabId;
    sendResponse({ isActivated: activeTabs.has(tabId) });
  }
});

// Inject content scripts into a tab
async function injectContentScripts(tabId) {
  try {
    // Inject loading indicator first
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: showLoadingIndicator
    });

    // Inject CSS first
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['styles.css']
    });

    // Inject JavaScript files in order
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['idioms-dictionary.js']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['ai-service.js']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['cognitive-engine.js']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['prompt-api-service.js']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });

    console.log('All scripts injected successfully');
  } catch (error) {
    console.error('Error injecting scripts:', error);
    throw error;
  }
}

// Function to show loading indicator (injected into page)
function showLoadingIndicator() {
  // Create loading container - matches .cogniread-mini size and position
  const loadingContainer = document.createElement('div');
  loadingContainer.id = 'cogniread-loading-indicator';
  loadingContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: cognireadFadeIn 0.3s ease-out;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cognireadFadeIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes cognireadFadeOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0.8);
      }
    }
    @keyframes cognireadSpinGradient {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
    @keyframes cognireadPulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }
  `;
  document.head.appendChild(style);

  // Create gradient spinner ring
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    position: relative;
    width: 40px;
    height: 40px;
  `;

  // Create the spinning gradient ring
  const spinnerRing = document.createElement('div');
  spinnerRing.style.cssText = `
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: #667eea;
    border-right-color: #764ba2;
    animation: cognireadSpinGradient 1s linear infinite;
  `;

  // Create inner pulsing circle
  const innerCircle = document.createElement('div');
  innerCircle.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    animation: cognireadPulse 1.5s ease-in-out infinite;
  `;

  spinner.appendChild(spinnerRing);
  spinner.appendChild(innerCircle);
  loadingContainer.appendChild(spinner);
  document.body.appendChild(loadingContainer);

  // Listen for ready message
  window.addEventListener('message', function(event) {
    if (event.data.type === 'COGNIREAD_READY') {
      // Fade out animation
      loadingContainer.style.animation = 'cognireadFadeOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (loadingContainer.parentNode) {
          loadingContainer.remove();
        }
      }, 300);
    }
  });

  // Fallback timeout - hide loading indicator after 10 seconds if not ready
  setTimeout(() => {
    if (loadingContainer.parentNode) {
      loadingContainer.style.animation = 'cognireadFadeOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (loadingContainer.parentNode) {
          loadingContainer.remove();
        }
      }, 300);
    }
  }, 10000);
}

// Update badge to show activation status
function updateBadge(tabId, isActive) {
  if (isActive) {
    chrome.action.setBadgeText({ tabId: tabId, text: '✓' });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#34A853' });
  } else {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
  }
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

// Clean up when tab is updated (page navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && activeTabs.has(tabId)) {
    // Tab navigated to new page, deactivate
    activeTabs.delete(tabId);
    updateBadge(tabId, false);
  }
});

// Context menu for quick activation
chrome.contextMenus.create({
  id: 'cogniread-activate',
  title: 'Activate CogniRead on this page',
  contexts: ['page']
});

// Context menu for alternative phrasing
chrome.contextMenus.create({
  id: 'cogniread-alternative-phrasing',
  title: 'See Alternative Phrasings',
  contexts: ['selection']
});

// Context menu for describing highlighted selection
chrome.contextMenus.create({
  id: 'cogniread-describe-selection',
  title: 'Describe Highlighted Selection',
  contexts: ['selection']
});

// Context menu for using highlighted text in a sentence
chrome.contextMenus.create({
  id: 'cogniread-use-in-sentence',
  title: 'Use "%s" in a sentence',
  contexts: ['selection']
});

// Context menu for AI Analogy Generator
chrome.contextMenus.create({
  id: 'cogniread-analogy-parent',
  title: 'Explain with Analogy',
  contexts: ['selection']
});

// Analogy submenu items
chrome.contextMenus.create({
  id: 'cogniread-analogy-cooking',
  parentId: 'cogniread-analogy-parent',
  title: 'Cooking Analogy',
  contexts: ['selection']
});

chrome.contextMenus.create({
  id: 'cogniread-analogy-sports',
  parentId: 'cogniread-analogy-parent',
  title: 'Sports Analogy',
  contexts: ['selection']
});

chrome.contextMenus.create({
  id: 'cogniread-analogy-music',
  parentId: 'cogniread-analogy-parent',
  title: 'Music Analogy',
  contexts: ['selection']
});

chrome.contextMenus.create({
  id: 'cogniread-analogy-nature',
  parentId: 'cogniread-analogy-parent',
  title: 'Nature Analogy',
  contexts: ['selection']
});

chrome.contextMenus.create({
  id: 'cogniread-analogy-travel',
  parentId: 'cogniread-analogy-parent',
  title: 'Travel Analogy',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'cogniread-activate') {
    injectContentScripts(tab.id)
      .then(() => {
        activeTabs.add(tab.id);
        updateBadge(tab.id, true);
      })
      .catch((error) => {
        console.error('Failed to activate via context menu:', error);
      });
  } else if (info.menuItemId === 'cogniread-alternative-phrasing') {
    // Send message to content script to show alternative phrasings
    chrome.tabs.sendMessage(tab.id, {
      action: 'showAlternativePhrasings',
      selectedText: info.selectionText
    });
  } else if (info.menuItemId === 'cogniread-describe-selection') {
    // Send message to content script to describe the selected text
    chrome.tabs.sendMessage(tab.id, {
      action: 'describeSelection',
      selectedText: info.selectionText
    });
  } else if (info.menuItemId === 'cogniread-use-in-sentence') {
    // Send message to content script to show the selected text used in a sentence
    chrome.tabs.sendMessage(tab.id, {
      action: 'useInSentence',
      selectedText: info.selectionText
    });
  } else if (info.menuItemId.startsWith('cogniread-analogy-')) {
    // Extract analogy domain from menu item ID
    const domain = info.menuItemId.replace('cogniread-analogy-', '');
    chrome.tabs.sendMessage(tab.id, {
      action: 'showAnalogy',
      selectedText: info.selectionText,
      domain: domain
    });
  }
});
