// Auto-activation script for CogniRead demo page
// Note: Demo page now loads CogniRead directly, so this script is mostly for logging

// Auto-activate CogniRead when demo page loads
window.addEventListener('load', function() {
    console.log('🎯 Demo page loaded with CogniRead built-in');

    // Check if we're on an extension page (chrome-extension://)
    const isExtensionPage = window.location.protocol === 'chrome-extension:';

    if (isExtensionPage) {
        console.log('✅ Running on extension page with CogniRead loaded directly');
        // CogniRead is loaded via script tags in demo.html, no notice needed
        return;
    }

    // Check if CogniRead is already active
    const cognireadPanel = document.getElementById('cogniread-panel') ||
                           document.getElementById('cogniread-mini');

    if (!cognireadPanel) {
        console.log('🚀 CogniRead not detected, requesting activation...');

        // Send message to background script to activate on this tab
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                action: 'activateOnCurrentTab'
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.log('⚠️ Could not auto-activate CogniRead:', chrome.runtime.lastError.message);
                    showActivationPrompt();
                } else if (response && response.success) {
                    console.log('✅ CogniRead activated successfully on demo page');
                } else {
                    console.log('⚠️ CogniRead activation failed, showing manual prompt');
                    showActivationPrompt();
                }
            });
        } else {
            console.log('⚠️ Chrome extension API not available');
            showActivationPrompt();
        }
    } else {
        console.log('✅ CogniRead already active on demo page');
    }
});

// Show notice that this is an extension page and provide instructions
function showExtensionPageNotice() {
    const notice = document.createElement('div');
    notice.id = 'cogniread-extension-notice';

    // Create inner container
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        max-width: 360px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    `;

    const icon = document.createElement('span');
    icon.textContent = '📖';
    icon.style.fontSize = '24px';

    const title = document.createElement('strong');
    title.textContent = 'Demo Page Instructions';
    title.style.fontSize = '16px';

    header.appendChild(icon);
    header.appendChild(title);

    // Create description
    const description = document.createElement('div');
    description.innerHTML = `
        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; opacity: 0.95;">
            This demo page showcases all CogniRead features with sample content. To test the extension:
        </p>
        <ol style="margin: 0 0 16px 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
            <li>Read through the content examples below</li>
            <li>Try highlighting text to see context menu options</li>
            <li>Note the different content types (legal, medical, technical)</li>
        </ol>
        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; opacity: 0.9; background: rgba(255,255,255,0.15); padding: 12px; border-radius: 6px;">
            <strong>💡 Tip:</strong> To test CogniRead's active features, visit any regular webpage (like a news article or blog post) and activate the extension there.
        </p>
    `;
    description.style.cssText = 'margin-bottom: 0;';

    // Create close button
    const button = document.createElement('button');
    button.textContent = 'Got it!';
    button.style.cssText = `
        width: 100%;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s ease;
    `;

    button.addEventListener('click', function() {
        notice.remove();
    });

    button.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255, 255, 255, 0.3)';
    });

    button.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    // Assemble the notice
    container.appendChild(header);
    container.appendChild(description);
    container.appendChild(button);
    notice.appendChild(container);

    // Add animation styles if not already added
    if (!document.getElementById('cogniread-demo-styles')) {
        const style = document.createElement('style');
        style.id = 'cogniread-demo-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notice);

    // Don't auto-hide this one - let user dismiss when ready
}

// Show a visual prompt to manually activate CogniRead
function showActivationPrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'cogniread-activation-prompt';

    // Create inner container
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        max-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    `;

    const icon = document.createElement('span');
    icon.textContent = '🧠';
    icon.style.fontSize = '24px';

    const title = document.createElement('strong');
    title.textContent = 'Activate CogniRead';
    title.style.fontSize = '16px';

    header.appendChild(icon);
    header.appendChild(title);

    // Create description
    const description = document.createElement('p');
    description.textContent = 'Click the CogniRead extension icon and press "Activate on this Page" to test all features.';
    description.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 14px;
        line-height: 1.5;
        opacity: 0.95;
    `;

    // Create button
    const button = document.createElement('button');
    button.textContent = 'Got it!';
    button.style.cssText = `
        width: 100%;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s ease;
    `;

    button.addEventListener('click', function() {
        prompt.remove();
    });

    button.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255, 255, 255, 0.3)';
    });

    button.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    // Assemble the prompt
    container.appendChild(header);
    container.appendChild(description);
    container.appendChild(button);
    prompt.appendChild(container);

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(prompt);

    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (document.getElementById('cogniread-activation-prompt')) {
            container.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => prompt.remove(), 300);
        }
    }, 10000);
}
