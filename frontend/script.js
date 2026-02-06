// DOM Elements
const errorInput = document.getElementById('errorInput');
const charCount = document.getElementById('charCount');
const languageSelect = document.getElementById('languageSelect');
const translateBtn = document.getElementById('translateBtn');
const clearBtn = document.getElementById('clearBtn');
const exampleBtns = document.querySelectorAll('.example-btn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const patternCount = document.getElementById('patternCount');
const resultsSection = document.getElementById('resultsSection');
const loadingState = document.getElementById('loadingState');
const resultsContent = document.getElementById('resultsContent');
const explanation = document.getElementById('explanation');
const fix = document.getElementById('fix');
const confidenceValue = document.getElementById('confidenceValue');
const confidenceBadge = document.getElementById('confidenceBadge');
const copyBtn = document.getElementById('copyBtn');
const searchLink = document.getElementById('searchLink');
const similarErrors = document.getElementById('similarErrors');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// API Configuration
const API_BASE = 'http://localhost:8000';

// Common error patterns for quick matching
const QUICK_PATTERNS = {
    'TypeError: undefined is not a function': {
        type: 'javascript',
        quickFix: 'Add null check before calling function'
    },
    'ModuleNotFoundError': {
        type: 'python',
        quickFix: 'Install missing package'
    },
    'segmentation fault': {
        type: 'c',
        quickFix: 'Check pointer access and memory bounds'
    }
};

// Initialize the application
async function init() {
    // Update character count in real-time
    errorInput.addEventListener('input', updateCharCount);
    
    // Setup event listeners
    setupEventListeners();
    
    // Check backend connection
    await checkBackend();
    
    // Update GitHub link with actual username
    updateGitHubLink();
    
    // Focus on error input
    errorInput.focus();
}

// Update character count
function updateCharCount() {
    const count = errorInput.value.length;
    charCount.textContent = count;
    
    // Change color if too long
    if (count > 1000) {
        charCount.style.color = '#e53e3e';
    } else if (count > 500) {
        charCount.style.color = '#d69e2e';
    } else {
        charCount.style.color = '#718096';
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Translate button
    translateBtn.addEventListener('click', translateError);
    
    // Clear button
    clearBtn.addEventListener('click', clearForm);
    
    // Example buttons
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const error = e.target.dataset.error;
            errorInput.value = error;
            updateCharCount();
            
            // Auto-detect language from error
            autoDetectLanguage(error);
            
            showToast(`Loaded example: ${error.substring(0, 50)}...`);
        });
    });
    
    // Copy fix button
    copyBtn.addEventListener('click', copyFixToClipboard);
    
    // Allow Ctrl+Enter to translate
    errorInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            translateError();
        }
    });
    
    // Auto-translate on paste
    errorInput.addEventListener('paste', () => {
        setTimeout(() => {
            updateCharCount();
            autoDetectLanguage(errorInput.value);
        }, 100);
    });
}

// Auto-detect programming language from error
function autoDetectLanguage(errorText) {
    const text = errorText.toLowerCase();
    
    if (text.includes('python') || text.includes('module') || text.includes('import')) {
        languageSelect.value = 'python';
    } else if (text.includes('javascript') || text.includes('undefined') || text.includes('typeerror')) {
        languageSelect.value = 'javascript';
    } else if (text.includes('segmentation') || text.includes('fault') || text.includes('core dumped')) {
        languageSelect.value = 'c';
    } else if (languageSelect.value === 'auto') {
        // Keep auto-detect if not specifically set
    }
}

// Check backend connection
async function checkBackend() {
    try {
        // Try to connect to backend
        const healthResponse = await fetch(`${API_BASE}/health`, {
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (healthResponse.ok) {
            // Backend is connected
            statusDot.classList.add('connected');
            statusText.textContent = 'Backend connected';
            translateBtn.disabled = false;
            
            // Get stats
            try {
                const statsResponse = await fetch(`${API_BASE}/api/stats`);
                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    patternCount.textContent = stats.total_patterns || '3';
                }
            } catch (statsError) {
                console.log('Could not fetch stats:', statsError);
            }
            
            showToast('Connected to backend successfully!', 'success');
        }
    } catch (error) {
        // Backend is not connected
        statusText.textContent = 'Backend not connected - start Python server';
        translateBtn.disabled = false; // Still allow translation attempt
        showToast('Backend not connected. Make sure Python server is running.', 'error');
    }
}

// Main translation function
async function translateError() {
    const error = errorInput.value.trim();
    const language = languageSelect.value;
    
    // Validation
    if (!error) {
        showToast('Please paste an error message first!', 'error');
        errorInput.focus();
        return;
    }
    
    if (error.length > 2000) {
        showToast('Error message is too long. Please keep it under 2000 characters.', 'error');
        return;
    }
    
    // Show loading state
    startLoading();
    
    try {
        // Send request to backend
        const response = await fetch(`${API_BASE}/api/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error_message: error,
                language: language
            }),
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Display results
        displayResults(result, error);
        
        // Show success toast
        showToast('Error translated successfully!', 'success');
        
    } catch (error) {
        console.error('Translation error:', error);
        
        // Show fallback results
        displayFallbackResults(error.message);
        
        // Show error toast
        showToast('Failed to translate error. Using fallback analysis.', 'error');
    } finally {
        stopLoading();
    }
}

// Start loading animation
function startLoading() {
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    translateBtn.disabled = true;
    loadingState.classList.add('active');
    resultsContent.classList.remove('active');
}

// Stop loading animation
function stopLoading() {
    translateBtn.innerHTML = '<i class="fas fa-language"></i> Translate Error';
    translateBtn.disabled = false;
    loadingState.classList.remove('active');
}

// Display results from backend
function displayResults(result, originalError) {
    // Update explanation
    explanation.textContent = result.explanation || 'No explanation available.';
    
    // Update fix with syntax highlighting
    const fixText = result.fix || 'No specific fix available. Try debugging manually.';
    fix.textContent = fixText;
    
    // Update confidence
    const confidencePercent = Math.round((result.confidence || 0.3) * 100);
    confidenceValue.textContent = `${confidencePercent}%`;
    
    // Style confidence badge
    confidenceBadge.className = 'confidence-badge';
    if (confidencePercent >= 80) {
        confidenceBadge.classList.add('high');
    } else if (confidencePercent >= 50) {
        confidenceBadge.classList.add('medium');
    }
    
    // Update search link
    const searchQuery = encodeURIComponent(originalError.substring(0, 100));
    searchLink.href = `https://stackoverflow.com/search?q=${searchQuery}`;
    
    // Update similar errors
    updateSimilarErrors(originalError, result.language || 'unknown');
    
    // Show results
    resultsContent.classList.add('active');
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Display fallback results when backend fails
function displayFallbackResults(errorMessage) {
    const error = errorInput.value.trim().toLowerCase();
    
    // Simple fallback analysis
    let fallbackExplanation = '';
    let fallbackFix = '';
    let confidence = 0.4;
    
    if (error.includes('undefined') && error.includes('function')) {
        fallbackExplanation = 'You are trying to call something that doesn\'t exist or isn\'t a function.';
        fallbackFix = 'Check if the variable is defined:\nif (typeof myFunction === "function") {\n  myFunction();\n}';
        confidence = 0.8;
    } else if (error.includes('module') && error.includes('not found')) {
        fallbackExplanation = 'Python cannot find a module you are trying to import.';
        fallbackFix = 'Install the missing package:\npip install missing-package\n\nOr check for typos in the import statement.';
        confidence = 0.9;
    } else if (error.includes('segmentation fault')) {
        fallbackExplanation = 'Your C program tried to access memory it shouldn\'t.';
        fallbackFix = 'Common causes:\n1. Accessing array out of bounds\n2. Using freed memory\n3. Stack overflow\n\nUse valgrind to debug: valgrind ./your_program';
        confidence = 0.7;
    } else {
        fallbackExplanation = 'Could not connect to translation service. Here are general debugging steps:';
        fallbackFix = '1. Read the error carefully\n2. Check line numbers\n3. Search online for the exact error\n4. Add console.log() statements to debug\n5. Check variable values and types';
        confidence = 0.3;
    }
    
    displayResults({
        explanation: fallbackExplanation,
        fix: fallbackFix,
        confidence: confidence,
        source: 'fallback'
    }, errorInput.value.trim());
}

// Update similar errors section
function updateSimilarErrors(currentError, language) {
    let similar = '';
    
    if (language === 'javascript') {
        similar = '• TypeError: null is not an object\n• ReferenceError: variable is not defined\n• SyntaxError: Unexpected token';
    } else if (language === 'python') {
        similar = '• IndentationError: unexpected indent\n• NameError: name is not defined\n• SyntaxError: invalid syntax';
    } else if (language === 'c') {
        similar = '• Bus error\n• Floating point exception\n• Stack overflow';
    } else {
        similar = 'No similar errors identified.';
    }
    
    similarErrors.textContent = similar;
}

// Copy fix to clipboard
async function copyFixToClipboard() {
    const fixText = fix.textContent;
    
    try {
        await navigator.clipboard.writeText(fixText);
        showToast('Fix copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        
        // Fallback method for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = fixText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        showToast('Fix copied to clipboard!', 'success');
    }
}

// Clear the form
function clearForm() {
    errorInput.value = '';
    updateCharCount();
    languageSelect.value = 'auto';
    resultsContent.classList.remove('active');
    errorInput.focus();
    showToast('Form cleared', 'info');
}

// Show toast notification
function showToast(message, type = 'info') {
    // Set message
    toastMessage.textContent = message;
    
    // Set color based on type
    toast.style.background = type === 'success' ? '#48bb78' : 
                            type === 'error' ? '#e53e3e' : 
                            type === 'warning' ? '#d69e2e' : 
                            '#667eea';
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Update GitHub link with actual username
function updateGitHubLink() {
    const repoLinks = document.querySelectorAll('.repo-link a');
    repoLinks.forEach(link => {
        const currentHref = link.getAttribute('href');
        if (currentHref.includes('ManeeeshJ13')) {
            // You can update this manually in the HTML
            // Or prompt user to update
            console.log('Update GitHub username in HTML line 187');
        }
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);