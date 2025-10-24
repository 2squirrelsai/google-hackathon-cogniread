document.addEventListener('DOMContentLoaded', async function() {
  const themeToggle = document.getElementById('themeToggle');
  const feedbackLink = document.getElementById('feedbackLink');
  const activateBtn = document.getElementById('activateBtn');
  const activationCard = document.getElementById('activationCard');
  const statusText = document.getElementById('statusText');
  const activateBtnText = document.getElementById('activateBtnText');
  const activationHint = document.getElementById('activationHint');

  // Initialize theme
  initializeTheme();

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we can activate on this page
  const canActivate = tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://');

  if (!canActivate) {
    activateBtn.disabled = true;
    statusText.textContent = 'Not Available';
    activateBtnText.textContent = 'Cannot Activate';
    activationHint.textContent = 'CogniRead cannot run on this page (system page)';
  } else {
    // Check current activation status
    checkActivationStatus(tab.id);
  }

  // Activation button click
  activateBtn.addEventListener('click', async () => {
    if (!canActivate) return;

    activateBtn.disabled = true;
    activateBtnText.textContent = 'Activating...';

    try {
      const isActive = activationCard.classList.contains('active');

      if (isActive) {
        // Deactivate
        const response = await chrome.runtime.sendMessage({
          action: 'deactivateOnTab',
          tabId: tab.id
        });

        if (response.success) {
          updateActivationUI(false);
        }
      } else {
        // Activate
        const response = await chrome.runtime.sendMessage({
          action: 'activateOnTab',
          tabId: tab.id
        });

        if (response.success) {
          updateActivationUI(true);
          // Close popup after successful activation
          setTimeout(() => {
            window.close();
          }, 300); // Small delay to show success state
        } else {
          throw new Error(response.message || 'Failed to activate');
        }
      }
    } catch (error) {
      console.error('Activation error:', error);
      statusText.textContent = 'Error';
      activationHint.textContent = error.message || 'Failed to activate. Please refresh the page.';
    } finally {
      activateBtn.disabled = false;
    }
  });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  });

  // Feedback link
  feedbackLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/cogniread/feedback/issues'
    });
  });

  // Check activation status
  async function checkActivationStatus(tabId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkActivation',
        tabId: tabId
      });

      updateActivationUI(response.isActivated);
    } catch (error) {
      console.error('Error checking activation:', error);
      updateActivationUI(false);
    }
  }

  // Update UI based on activation status
  function updateActivationUI(isActive) {
    if (isActive) {
      activationCard.classList.add('active');
      statusText.textContent = 'Active';
      activateBtnText.textContent = 'Deactivate';
      activationHint.textContent = 'CogniRead is running on this page';
    } else {
      activationCard.classList.remove('active');
      statusText.textContent = 'Not Active';
      activateBtnText.textContent = 'Activate on this Page';
      activationHint.textContent = 'Click to enable CogniRead features on this page';
    }
  }

  function initializeTheme() {
    // Check for saved theme preference or default to system
    chrome.storage.sync.get(['cogniread_theme'], function(result) {
      let theme = result.cogniread_theme || 'system';

      if (theme === 'system') {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      }

      applyTheme(theme);
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      chrome.storage.sync.get(['cogniread_theme'], function(result) {
        if (result.cogniread_theme === 'system' || !result.cogniread_theme) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    });
  }

  function setTheme(theme) {
    applyTheme(theme);

    // Save theme preference
    chrome.storage.sync.set({ cogniread_theme: theme });
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      themeToggle.textContent = '☀️';
      themeToggle.title = 'Switch to light theme';
    } else {
      document.body.classList.remove('dark-theme');
      themeToggle.textContent = '🌙';
      themeToggle.title = 'Switch to dark theme';
    }
  }
});
