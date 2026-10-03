// script.js - Bilingual Online MCQ Engine (मराठी & English) with Trainee Profile & 45-Min Timer

// State
let allModules = {};
let modulesMeta = {};
let currentModuleKey = null;
let currentQuestions = [];
let userAnswers = {}; // map index -> selectedOptionIndex (0, 1, 2, 3)
let currentQuestionIndex = 0;
let timerInterval;
let displayLanguage = 'both'; // 'both', 'mr', 'en'
let currentView = 'modules'; // 'modules', 'test', 'result'
let lastCompletedReview = null;

// Trainee Profile State
let currentTrainee = {
    name: '',
    trade: '',
    iti: ''
};
let pendingTestConfig = null;

const QUESTIONS_PER_TEST = 25;
const PASSING_PERCENTAGE = 40;
const TEST_DURATION_MINUTES = 45;
const TEST_DURATION_SECONDS = TEST_DURATION_MINUTES * 60; // 2700 seconds

// DOM Elements
const moduleGrid = document.getElementById('module-grid');
const mainContainer = document.querySelector('main');

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load questions data
        const resQuestions = await fetch('questions.json');
        if (!resQuestions.ok) throw new Error("questions.json लोड करण्यास अयशस्वी (Failed to load questions.json)");
        allModules = await resQuestions.json();

        // Load modules metadata if available
        try {
            const resMeta = await fetch('modules_meta.json');
            if (resMeta.ok) {
                modulesMeta = await resMeta.json();
            }
        } catch (e) {
            console.log("Using inline module headers");
        }

        renderModules();
        initGSAPAmbientAnimations();
        checkPwaInstallOnLoad();
    } catch (error) {
        if (moduleGrid) {
            moduleGrid.innerHTML = `
                <div style="text-align:center; grid-column: 1/-1; padding: 2rem;">
                    <p style="font-size: 1.2rem; color: #f87171;">प्रश्नसंच लोड करण्यात त्रुटी आली. कृपया questions.json फाईल तपासा.</p>
                    <p style="font-size: 0.9em; color: var(--text-muted);">${error.message}</p>
                </div>`;
        }
        console.error(error);
    }
});

// ==========================================
// PWA (Progressive Web App) & Service Worker
// ==========================================
let deferredInstallPrompt = null;
let pwaPromptShown = false;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('PWA ServiceWorker registered with scope:', reg.scope);
            })
            .catch(err => {
                console.warn('PWA ServiceWorker registration failed:', err);
            });
    });
}

function isAppInstalledOrStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           (document.referrer && document.referrer.includes('android-app://'));
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Listen for beforeinstallprompt event (Chrome, Edge, Android)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    
    // Unhide the header install button
    const headerInstallBtn = document.getElementById('pwa-header-install-btn');
    if (headerInstallBtn && !isAppInstalledOrStandalone()) {
        headerInstallBtn.classList.remove('hidden');
    }

    // Auto-prompt on opening if not previously dismissed or shown
    if (!pwaPromptShown && !isAppInstalledOrStandalone()) {
        setTimeout(() => {
            openPwaInstallPrompt();
        }, 1200);
    }
});

// Detect when PWA has been installed
window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredInstallPrompt = null;
    closePwaModal();
    const headerInstallBtn = document.getElementById('pwa-header-install-btn');
    if (headerInstallBtn) {
        headerInstallBtn.classList.add('hidden');
    }
});

function checkPwaInstallOnLoad() {
    if (isAppInstalledOrStandalone()) {
        return; // Don't prompt if already running as standalone app
    }

    // Ensure header install button is accessible
    const headerInstallBtn = document.getElementById('pwa-header-install-btn');
    if (headerInstallBtn) {
        headerInstallBtn.classList.remove('hidden');
    }

    // Check if dismissed in this browser session
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (!dismissed && !pwaPromptShown) {
        // Automatically pop up the PWA prompt on opening
        setTimeout(() => {
            if (!pwaPromptShown && !isAppInstalledOrStandalone()) {
                openPwaInstallPrompt();
            }
        }, 1500);
    }
}

function openPwaInstallPrompt() {
    if (isAppInstalledOrStandalone()) return;

    pwaPromptShown = true;
    const modal = document.getElementById('pwa-modal-overlay');
    const iosBox = document.getElementById('pwa-ios-instructions');
    const installBtn = document.getElementById('pwa-confirm-install-btn');

    if (isIOS()) {
        if (iosBox) iosBox.classList.remove('hidden');
        if (installBtn) {
            installBtn.innerHTML = '<span>➕</span> होम स्क्रीनवर जोडा (Add to Home Screen)';
        }
    } else {
        if (iosBox) iosBox.classList.add('hidden');
        if (installBtn) {
            installBtn.innerHTML = '<span>📥</span> ॲप इन्स्टॉल करा (Install Now)';
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        if (window.gsap) {
            const card = modal.querySelector('.pwa-install-card');
            if (card) {
                gsap.fromTo(card, 
                    { scale: 0.85, opacity: 0, y: 30 },
                    { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'back.out(1.5)' }
                );
            }
        }
    }
}

function closePwaModal() {
    const modal = document.getElementById('pwa-modal-overlay');
    if (modal) {
        if (window.gsap) {
            const card = modal.querySelector('.pwa-install-card');
            if (card) {
                gsap.to(card, {
                    scale: 0.9,
                    opacity: 0,
                    duration: 0.25,
                    ease: 'power2.in',
                    onComplete: () => {
                        modal.classList.add('hidden');
                    }
                });
            } else {
                modal.classList.add('hidden');
            }
        } else {
            modal.classList.add('hidden');
        }
    }
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
}

async function triggerPwaInstall() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        if (outcome === 'accepted') {
            closePwaModal();
        }
        deferredInstallPrompt = null;
    } else if (isIOS()) {
        alert("iPhone/iPad वर इन्स्टॉल करण्यासाठी:\nब्राउझरच्या तळाशी असलेल्या 'Share 📤' बटनावर टॅप करा आणि 'Add to Home Screen ➕' निवडा.");
    } else {
        alert("ॲप इन्स्टॉल करण्यासाठी आपल्या ब्राउझरच्या ॲड्रेस बारमधील 'इन्स्टॉल' (Install ⊕) चिन्हावर क्लिक करा किंवा मेनूमधून 'Install app / Add to Home screen' निवडा.");
        closePwaModal();
    }
}

// Expose functions globally for HTML onclick handlers
window.openPwaInstallPrompt = openPwaInstallPrompt;
window.closePwaModal = closePwaModal;
window.triggerPwaInstall = triggerPwaInstall;

// GSAP Ambient & Header Animations
function initGSAPAmbientAnimations() {
    if (!window.gsap) return;

    // Continuous floating ambient background globs
    gsap.to('.background-glob:not(.glob-2)', {
        x: 35,
        y: 40,
        rotation: 12,
        duration: 8.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });
    gsap.to('.glob-2', {
        x: -40,
        y: -35,
        rotation: -16,
        duration: 10.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    // Header elements intro animation
    gsap.from('header .logo', {
        y: -25,
        opacity: 0,
        scale: 0.92,
        duration: 0.75,
        ease: 'back.out(1.7)'
    });
    gsap.from('header .subtitle', {
        y: -15,
        opacity: 0,
        duration: 0.6,
        delay: 0.18,
        ease: 'power2.out'
    });
    gsap.from('.lang-selector-container', {
        y: 15,
        opacity: 0,
        duration: 0.6,
        delay: 0.3,
        ease: 'power2.out'
    });
}

// Language Switcher Function with GSAP feedback
function setLanguage(lang) {
    displayLanguage = lang;
    
    // Update active state on buttons
    document.querySelectorAll('.lang-pill').forEach(btn => {
        const isActive = btn.getAttribute('data-lang') === lang;
        btn.classList.toggle('active', isActive);
        if (isActive && window.gsap) {
            gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
        }
    });

    // Re-render currently visible view
    if (currentView === 'modules') {
        renderModules();
    } else if (currentView === 'test' && currentQuestions.length > 0) {
        showQuestion(currentQuestionIndex, false);
    } else if (currentView === 'result' && lastCompletedReview) {
        renderResultScreen(lastCompletedReview.score, lastCompletedReview.total);
    }
}

// Module Rendering
function renderModules() {
    currentView = 'modules';
    const selectionSec = document.getElementById('module-selection');
    if (!selectionSec) {
        mainContainer.innerHTML = `
            <section id="module-selection">
                <div class="section-heading">
                    <h1 id="page-title">मॉड्यूल निवडा / Select a Module</h1>
                    <p class="section-sub">एकूण ५८० प्रश्नसंच (All 580 Questions Bank) — निमी व डीजीटी अभ्यासक्रमानुसार</p>
                </div>
                <div id="module-grid" class="grid-layout"></div>
            </section>
        `;
    }
    
    const grid = document.getElementById('module-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const moduleKeys = Object.keys(allModules);
    
    moduleKeys.forEach((modKey) => {
        const pool = allModules[modKey];
        const questionCount = pool.length;
        const parts = Math.ceil(questionCount / QUESTIONS_PER_TEST);
        
        // Lookup Marathi name from first question or metadata
        const firstQ = pool[0] || {};
        const modTitleMr = (modulesMeta[modKey] && modulesMeta[modKey].name_mr) || firstQ.module_mr || modKey;
        const modTitleEn = modKey;

        if (parts <= 1) {
            createModuleCard(modTitleMr, modTitleEn, questionCount, null, () => promptTraineeModal(modKey, 0, modTitleMr, modTitleEn));
        } else {
            for (let i = 0; i < parts; i++) {
                const start = i * QUESTIONS_PER_TEST;
                const end = Math.min((i + 1) * QUESTIONS_PER_TEST, questionCount);
                const count = end - start;
                const partLabel = `भाग ${i + 1} (Part ${i + 1})`;
                createModuleCard(modTitleMr, modTitleEn, count, partLabel, () => promptTraineeModal(modKey, i, `${modTitleMr} - ${partLabel}`, `${modTitleEn} - (Part ${i + 1})`));
            }
        }
    });

    // Staggered cascade entrance for module cards
    if (window.gsap) {
        gsap.from('#module-grid .module-card', {
            opacity: 0,
            y: 28,
            scale: 0.95,
            stagger: 0.035,
            duration: 0.45,
            ease: 'power2.out',
            clearProps: 'transform,opacity'
        });
    }
}

function createModuleCard(titleMr, titleEn, count, partLabel, onClickHandler) {
    const grid = document.getElementById('module-grid');
    const card = document.createElement('div');
    card.className = 'module-card';

    let titleHtml = '';
    if (displayLanguage === 'mr') {
        titleHtml = `<div class="module-title-mr">${titleMr} ${partLabel ? `<span class="module-badge-tag">${partLabel}</span>` : ''}</div>`;
    } else if (displayLanguage === 'en') {
        titleHtml = `<div class="module-title-mr" style="font-family:'Outfit', sans-serif;">${titleEn} ${partLabel ? `<span class="module-badge-tag">${partLabel}</span>` : ''}</div>`;
    } else {
        // Both
        titleHtml = `
            <div class="module-title-mr">${titleMr} ${partLabel ? `<span class="module-badge-tag">${partLabel}</span>` : ''}</div>
            <div class="module-title-en">${titleEn}</div>
        `;
    }

    card.innerHTML = `
        <div>
            ${titleHtml}
        </div>
        <div class="module-meta-row">
            <span class="module-count-badge">📝 ${count} प्रश्न | ⏱️ ४५ मि. (45 Mins)</span>
            <span class="module-badge-tag">सुरु करा ➔</span>
        </div>
    `;
    card.onclick = onClickHandler;
    grid.appendChild(card);
}

// Trainee Modal Management
function promptTraineeModal(moduleKey, partIndex = 0, titleMr = '', titleEn = '') {
    pendingTestConfig = { moduleKey, partIndex, titleMr, titleEn };
    
    const overlay = document.getElementById('trainee-modal-overlay');
    const infoEl = document.getElementById('modal-test-info');
    const nameInput = document.getElementById('trainee-name');
    const tradeInput = document.getElementById('trainee-trade');
    const itiInput = document.getElementById('trainee-iti');
    const traineeForm = document.getElementById('trainee-form');

    if (infoEl) {
        infoEl.textContent = `📝 ${titleMr || moduleKey} | ⏱️ ४५ मिनिटे`;
    }

    // Always clear all input fields so only placeholders are displayed
    if (traineeForm) traineeForm.reset();
    if (nameInput) nameInput.value = '';
    if (tradeInput) tradeInput.value = '';
    if (itiInput) itiInput.value = '';

    if (overlay) {
        overlay.classList.remove('hidden');
        const modalCard = overlay.querySelector('.modal-card');

        if (window.gsap && modalCard) {
            gsap.killTweensOf([overlay, modalCard]);
            gsap.fromTo(overlay, 
                { opacity: 0 }, 
                { opacity: 1, duration: 0.28, ease: 'power2.out' }
            );
            gsap.fromTo(modalCard, 
                { opacity: 0, scale: 0.82, y: 25 }, 
                { opacity: 1, scale: 1, y: 0, duration: 0.42, ease: 'back.out(1.5)', clearProps: 'transform,opacity' }
            );
            gsap.fromTo('.form-group', 
                { opacity: 0, x: -18 }, 
                { opacity: 1, x: 0, stagger: 0.06, duration: 0.35, delay: 0.1, ease: 'power2.out', clearProps: 'transform,opacity' }
            );
            gsap.fromTo('.modal-actions .btn', 
                { opacity: 0, y: 15 }, 
                { opacity: 1, y: 0, stagger: 0.08, duration: 0.3, delay: 0.22, ease: 'power2.out', clearProps: 'transform,opacity' }
            );
        }

        // Auto focus the first field
        setTimeout(() => {
            if (nameInput) nameInput.focus();
        }, 120);
    }
}

function closeTraineeModal() {
    const overlay = document.getElementById('trainee-modal-overlay');
    const modalCard = overlay ? overlay.querySelector('.modal-card') : null;
    const traineeForm = document.getElementById('trainee-form');
    if (traineeForm) traineeForm.reset();
    pendingTestConfig = null;

    if (window.gsap && overlay && modalCard) {
        gsap.to(modalCard, {
            opacity: 0,
            scale: 0.85,
            y: 20,
            duration: 0.22,
            ease: 'power2.in'
        });
        gsap.to(overlay, {
            opacity: 0,
            duration: 0.22,
            ease: 'power2.in',
            onComplete: () => {
                overlay.classList.add('hidden');
                gsap.set([overlay, modalCard], { clearProps: 'all' });
            }
        });
    } else if (overlay) {
        overlay.classList.add('hidden');
    }
}

function handleTraineeSubmit(event) {
    if (event) event.preventDefault();
    const nameInput = document.getElementById('trainee-name');
    const tradeInput = document.getElementById('trainee-trade');
    const itiInput = document.getElementById('trainee-iti');

    const name = nameInput ? nameInput.value.trim() : '';
    const trade = tradeInput ? tradeInput.value.trim() : '';
    const iti = itiInput ? itiInput.value.trim() : '';

    if (!name || !trade || !iti) {
        alert("कृपया सर्व माहिती भरा (Please fill all fields: Name, Trade, and ITI)");
        return;
    }

    // Save profile to state and storage
    currentTrainee = { name, trade, iti };
    localStorage.setItem('trainee_name', name);
    localStorage.setItem('trainee_trade', trade);
    localStorage.setItem('trainee_iti', iti);

    const config = pendingTestConfig;
    const overlay = document.getElementById('trainee-modal-overlay');
    const modalCard = overlay ? overlay.querySelector('.modal-card') : null;
    pendingTestConfig = null;

    if (window.gsap && overlay && modalCard) {
        gsap.to(modalCard, {
            opacity: 0,
            scale: 0.88,
            y: -20,
            duration: 0.22,
            ease: 'power2.in'
        });
        gsap.to(overlay, {
            opacity: 0,
            duration: 0.22,
            ease: 'power2.in',
            onComplete: () => {
                overlay.classList.add('hidden');
                gsap.set([overlay, modalCard], { clearProps: 'all' });
                if (config) {
                    startTest(config.moduleKey, config.partIndex);
                }
            }
        });
    } else {
        if (overlay) overlay.classList.add('hidden');
        if (config) {
            startTest(config.moduleKey, config.partIndex);
        }
    }
}

// Start Test
function startTest(moduleKey, partIndex = 0) {
    currentView = 'test';
    currentModuleKey = moduleKey;
    const pool = allModules[moduleKey];

    const startIndex = partIndex * QUESTIONS_PER_TEST;
    const endIndex = Math.min(startIndex + QUESTIONS_PER_TEST, pool.length);
    const selectedQuestions = pool.slice(startIndex, endIndex);

    // Shuffle for practice test
    currentQuestions = [...selectedQuestions].sort(() => 0.5 - Math.random());
    userAnswers = {};
    currentQuestionIndex = 0;

    renderTestInterface();
}

function renderTestInterface() {
    const modTitleMr = (modulesMeta[currentModuleKey] && modulesMeta[currentModuleKey].name_mr) || currentModuleKey;

    mainContainer.innerHTML = `
        <div class="test-container">
            <!-- Trainee Details Banner -->
            <div class="trainee-badge-bar">
                <div class="trainee-badge-items">
                    <span class="trainee-badge-item">👤 <strong>${escapeHtml(currentTrainee.name || 'प्रशिक्षणार्थी')}</strong></span>
                    <span class="trainee-badge-item">⚙️ <strong>${escapeHtml(currentTrainee.trade || '-')}</strong></span>
                    <span class="trainee-badge-item">🏛️ <strong>${escapeHtml(currentTrainee.iti || '-')}</strong></span>
                </div>
                <span style="font-size: 0.85rem; color: var(--primary-light); font-weight: 600;">📖 ${escapeHtml(modTitleMr)}</span>
            </div>

            <div class="test-header-bar">
                <button class="btn btn-secondary" onclick="exitTestToModules()">⬅ बाहेर पडा / Exit</button>
                <div class="timer" id="timer">⏱ 45:00</div>
            </div>
            
            <div id="question-area">
                <!-- Question injected here -->
            </div>

            <div class="controls">
                <button id="prev-btn" class="btn btn-secondary" onclick="prevQuestion()" disabled>मागील (Previous)</button>
                <span id="progress-text" style="font-weight:600; font-size:1.05rem;">1 / ${currentQuestions.length}</span>
                <button id="next-btn" class="btn" onclick="nextQuestion()">पुढील (Next)</button>
            </div>
        </div>
    `;

    if (window.gsap) {
        gsap.from('.trainee-badge-bar', { opacity: 0, y: -20, duration: 0.4, ease: 'power2.out' });
        gsap.from('.test-header-bar', { opacity: 0, y: -15, duration: 0.4, delay: 0.08, ease: 'power2.out' });
        gsap.from('.controls', { opacity: 0, y: 20, duration: 0.4, delay: 0.15, ease: 'power2.out' });
    }

    startTimer();
    showQuestion(0, true);
}

function exitTestToModules() {
    if (timerInterval) clearInterval(timerInterval);
    if (window.gsap) {
        gsap.to('.test-container', {
            opacity: 0,
            y: 20,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                renderModules();
            }
        });
    } else {
        renderModules();
    }
}

function showQuestion(index, animate = true) {
    currentQuestionIndex = index;
    const q = currentQuestions[index];
    const questionArea = document.getElementById('question-area');
    if (!questionArea) return;

    // Build question text based on language mode
    let questionTextHtml = '';
    const qMr = q.question_mr || q.question;
    const qEn = q.question || '';

    if (displayLanguage === 'mr') {
        questionTextHtml = `<div class="question-text-mr">${index + 1}. ${qMr}</div>`;
    } else if (displayLanguage === 'en') {
        questionTextHtml = `<div class="question-text-mr" style="font-family:'Outfit', sans-serif;">${index + 1}. ${qEn}</div>`;
    } else {
        // Both
        questionTextHtml = `
            <div class="question-text-mr">${index + 1}. ${qMr}</div>
            <div class="question-text-en">${qEn}</div>
        `;
    }

    // Build options
    const optLetters = ['A', 'B', 'C', 'D'];
    const optionsHtml = q.options.map((optEn, i) => {
        const optMr = (q.options_mr && q.options_mr[i]) ? q.options_mr[i] : optEn;
        const isSelected = userAnswers[index] === i;
        
        let optTextHtml = '';
        if (displayLanguage === 'mr') {
            optTextHtml = `<div class="opt-mr">${optMr}</div>`;
        } else if (displayLanguage === 'en') {
            optTextHtml = `<div class="opt-mr" style="font-family:'Outfit', sans-serif;">${optEn}</div>`;
        } else {
            optTextHtml = `
                <div class="opt-mr">${optMr}</div>
                <div class="opt-en">${optEn}</div>
            `;
        }

        return `
            <button class="option-btn ${isSelected ? 'selected' : ''}" onclick="selectAnswer(${index}, ${i})">
                <div class="opt-key">${optLetters[i]}</div>
                <div class="opt-content">
                    ${optTextHtml}
                </div>
            </button>
        `;
    }).join('');

    const lessonBadge = q.lesson_mr 
        ? `<div class="lesson-badge">📖 ${q.lesson_mr}</div>` 
        : (q.lesson ? `<div class="lesson-badge">📖 ${q.lesson}</div>` : '');

    questionArea.innerHTML = `
        <div class="question-card">
            ${lessonBadge}
            ${questionTextHtml}
            <div class="options-grid">
                ${optionsHtml}
            </div>
        </div>
    `;

    // Update buttons
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) prevBtn.disabled = index === 0;

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        if (index === currentQuestions.length - 1) {
            nextBtn.textContent = 'चाचणी सबमिट करा (Submit Test)';
            nextBtn.onclick = submitTest;
        } else {
            nextBtn.textContent = 'पुढील (Next)';
            nextBtn.onclick = nextQuestion;
        }
    }

    const progEl = document.getElementById('progress-text');
    if (progEl) {
        progEl.textContent = `प्रश्न ${index + 1} / ${currentQuestions.length}`;
    }

    // GSAP Question Card and Options Entrance Animation
    if (animate && window.gsap) {
        gsap.fromTo('#question-area .question-card', 
            { opacity: 0, x: 22 }, 
            { opacity: 1, x: 0, duration: 0.32, ease: 'power2.out', clearProps: 'transform,opacity' }
        );
        gsap.fromTo('.option-btn', 
            { opacity: 0, y: 14 }, 
            { opacity: 1, y: 0, stagger: 0.05, duration: 0.28, ease: 'power2.out', clearProps: 'transform,opacity' }
        );
    }
}

function selectAnswer(qIndex, optionIndex) {
    userAnswers[qIndex] = optionIndex;
    showQuestion(qIndex, false); // Re-render to show selection state without re-triggering card slide
    
    // Tactile bouncy feedback on clicked option
    if (window.gsap) {
        const buttons = document.querySelectorAll('.option-btn');
        if (buttons && buttons[optionIndex]) {
            gsap.fromTo(buttons[optionIndex], 
                { scale: 0.95 }, 
                { scale: 1, duration: 0.25, ease: 'back.out(2.5)' }
            );
        }
    }
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex, true);
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex, true);
    }
}

// 45-Minute Countdown Timer
let timeRemaining = TEST_DURATION_SECONDS;

function startTimer() {
    timeRemaining = TEST_DURATION_SECONDS;
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            updateTimerDisplay();
            clearInterval(timerInterval);
            alert("⏰ वेळ संपली! (Time is up!)\nतुमची चाचणी आपोआप सबमिट केली जात आहे. (Your test has been automatically submitted.)");
            submitTest();
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const secs = (timeRemaining % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = `⏱ ${mins}:${secs}`;
        if (timeRemaining <= 300) { // Under 5 minutes
            timerEl.classList.add('timer-warning');
        } else {
            timerEl.classList.remove('timer-warning');
        }
        if (timeRemaining <= 60) { // Under 1 minute
            timerEl.classList.add('timer-danger');
        } else {
            timerEl.classList.remove('timer-danger');
        }
    }
}

function submitTest() {
    if (timerInterval) clearInterval(timerInterval);
    currentView = 'result';

    let score = 0;
    const total = currentQuestions.length;
    const optLetters = ['A', 'B', 'C', 'D'];

    currentQuestions.forEach((q, i) => {
        const userChoiceIndex = userAnswers[i];
        const correctLetter = q.answer_letter || 'A';
        const correctIndex = optLetters.indexOf(correctLetter.trim().toUpperCase());
        
        let isCorrect = false;
        if (userChoiceIndex !== undefined && userChoiceIndex === correctIndex) {
            isCorrect = true;
            score++;
        }
    });

    lastCompletedReview = { score, total };
    renderResultScreen(score, total);
}

function renderResultScreen(score, total) {
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= PASSING_PERCENTAGE;
    const optLetters = ['A', 'B', 'C', 'D'];
    const modTitleMr = (modulesMeta[currentModuleKey] && modulesMeta[currentModuleKey].name_mr) || currentModuleKey;
    const now = new Date();
    const examDateTime = now.toLocaleDateString('mr-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    let reviewHtml = `
        <div class="review-section">
            <h2>तपशीलवार प्रश्न व उत्तरे पुनरावलोकन / Detailed Review</h2>
    `;

    currentQuestions.forEach((q, i) => {
        const userChoiceIndex = userAnswers[i];
        const correctLetter = (q.answer_letter || 'A').trim().toUpperCase();
        const correctIndex = optLetters.indexOf(correctLetter);
        const isAnswered = (userChoiceIndex !== undefined && userChoiceIndex >= 0);
        const isCorrect = (isAnswered && userChoiceIndex === correctIndex);

        let userChoiceText = 'उत्तर दिले नाही (Not Answered)';
        if (isAnswered) {
            const letter = optLetters[userChoiceIndex];
            const optEn = q.options[userChoiceIndex] || '';
            const optMr = (q.options_mr && q.options_mr[userChoiceIndex]) ? q.options_mr[userChoiceIndex] : optEn;
            if (displayLanguage === 'mr') {
                userChoiceText = `[${letter}] ${optMr}`;
            } else if (displayLanguage === 'en') {
                userChoiceText = `[${letter}] ${optEn}`;
            } else {
                userChoiceText = `[${letter}] ${optMr} <span style="font-size:0.85em; opacity:0.85;">(${optEn})</span>`;
            }
        }

        const correctOptEn = q.options[correctIndex] || q.answer;
        const correctOptMr = (q.options_mr && q.options_mr[correctIndex]) ? q.options_mr[correctIndex] : (q.answer_mr || correctOptEn);
        let correctText = '';
        if (displayLanguage === 'mr') {
            correctText = `[${correctLetter}] ${correctOptMr}`;
        } else if (displayLanguage === 'en') {
            correctText = `[${correctLetter}] ${correctOptEn}`;
        } else {
            correctText = `[${correctLetter}] ${correctOptMr} <span style="font-size:0.85em; opacity:0.85;">(${correctOptEn})</span>`;
        }

        const qMr = q.question_mr || q.question;
        const qEn = q.question || '';

        let questionReviewText = '';
        if (displayLanguage === 'mr') {
            questionReviewText = `<div class="review-question-mr">${i + 1}. ${qMr}</div>`;
        } else if (displayLanguage === 'en') {
            questionReviewText = `<div class="review-question-mr" style="font-family:'Outfit', sans-serif;">${i + 1}. ${qEn}</div>`;
        } else {
            questionReviewText = `
                <div class="review-question-mr">${i + 1}. ${qMr}</div>
                <div class="review-question-en">${qEn}</div>
            `;
        }

        const borderClass = isCorrect ? 'correct-border' : (isAnswered ? 'wrong-border' : 'wrong-border');
        const userStatusIcon = isCorrect ? '✅' : (isAnswered ? '❌' : '⚠️');
        const userTextClass = isCorrect ? 'text-pass' : (isAnswered ? 'text-fail' : 'text-fail');

        reviewHtml += `
            <div class="review-item ${borderClass}">
                ${questionReviewText}
                <div class="review-details">
                    <div class="review-answer-row">
                        <span class="review-tag">${userStatusIcon} तुमचे उत्तर (Your Answer):</span>
                        <span class="${userTextClass}">${userChoiceText}</span>
                    </div>
                    <div class="review-answer-row">
                        <span class="review-tag">🎯 अचूक उत्तर (Correct Answer):</span>
                        <span class="text-pass">${correctText}</span>
                    </div>
                </div>
            </div>
        `;
    });

    reviewHtml += `</div>`;

    mainContainer.innerHTML = `
        <div class="test-container">
            <div class="result-card">
                <!-- User Details Card -->
                <div class="trainee-result-card">
                    <div>
                        <div class="trainee-result-field">प्रशिक्षणार्थी नाव / Name</div>
                        <div class="trainee-result-val">👤 ${escapeHtml(currentTrainee.name || 'प्रशिक्षणार्थी')}</div>
                    </div>
                    <div>
                        <div class="trainee-result-field">व्यवसाय / Trade</div>
                        <div class="trainee-result-val">⚙️ ${escapeHtml(currentTrainee.trade || '-')}</div>
                    </div>
                    <div>
                        <div class="trainee-result-field">आयटीआय संस्था / ITI</div>
                        <div class="trainee-result-val">🏛️ ${escapeHtml(currentTrainee.iti || '-')}</div>
                    </div>
                    <div>
                        <div class="trainee-result-field">चाचणी / Test Name</div>
                        <div class="trainee-result-val">📖 ${escapeHtml(modTitleMr)}</div>
                    </div>
                </div>

                <!-- Score Meter -->
                <div class="score-circle ${passed ? 'pass' : 'fail'}" style="--score: 0" data-score="0"></div>
                
                <div class="pass-status ${passed ? 'pass' : 'fail'}">
                    ${passed ? '🎉 उत्तीर्ण! (PASS)' : '⚠️ अनुत्तीर्ण (FAIL)'}
                </div>

                <!-- Marks & Percentage Stats Grid -->
                <div class="result-stat-grid">
                    <div class="result-stat-box">
                        <div class="stat-title">मिळालेले गुण (Obtained)</div>
                        <div id="stat-obtained-score" class="stat-value" style="color:${passed ? '#4ade80' : '#f87171'};">0 / ${total}</div>
                    </div>
                    <div class="result-stat-box">
                        <div class="stat-title">टक्केवारी (Percentage)</div>
                        <div id="stat-percentage-val" class="stat-value">0%</div>
                    </div>
                    <div class="result-stat-box">
                        <div class="stat-title">उत्तीर्ण निकष (Passing)</div>
                        <div class="stat-value">${PASSING_PERCENTAGE}%</div>
                    </div>
                    <div class="result-stat-box">
                        <div class="stat-title">अंतिम निकाल (Result)</div>
                        <div class="stat-value">
                            ${passed ? '<span class="result-badge-pass">PASS</span>' : '<span class="result-badge-fail">FAIL</span>'}
                        </div>
                    </div>
                </div>

                <!-- Actions: PDF Download & Navigation Buttons -->
                <div class="result-actions">
                    <button id="download-pdf-btn" class="btn btn-download-pdf" onclick="downloadResultPDF()">
                        <span>📥</span> निकाल PDF डाउनलोड करा (Download PDF)
                    </button>
                    <button class="btn btn-primary" onclick="renderModules()">
                        <span>📚</span> सर्व मॉड्यूल्स पहा (All Modules)
                    </button>
                    <button class="btn btn-secondary" onclick="startTest(currentModuleKey, 0)">
                        <span>🔄</span> ही चाचणी पुन्हा द्या (Retake)
                    </button>
                </div>
            </div>

            ${reviewHtml}
        </div>
    `;

    animateResultScreen(score, total, percentage, passed);
}

// GSAP Animated Result Screen
function animateResultScreen(score, total, percentage, passed) {
    if (!window.gsap) {
        // Fallback if GSAP is unavailable
        const scoreCircle = document.querySelector('.score-circle');
        if (scoreCircle) {
            scoreCircle.style.setProperty('--score', percentage);
            scoreCircle.setAttribute('data-score', percentage);
        }
        const scoreValEl = document.getElementById('stat-obtained-score');
        if (scoreValEl) scoreValEl.textContent = `${score} / ${total}`;
        const pctValEl = document.getElementById('stat-percentage-val');
        if (pctValEl) pctValEl.textContent = `${percentage}%`;
        return;
    }

    // Result Card Pop Entrance
    gsap.from('.result-card', {
        opacity: 0,
        scale: 0.9,
        y: 35,
        duration: 0.55,
        ease: 'back.out(1.2)'
    });

    gsap.from('.trainee-result-card', {
        opacity: 0,
        y: -15,
        duration: 0.45,
        delay: 0.15,
        ease: 'power2.out'
    });

    // Score Meter & Number Counter Smooth Rollup
    const scoreCounter = { currentScore: 0, currentPct: 0 };
    gsap.to(scoreCounter, {
        currentScore: score,
        currentPct: percentage,
        duration: 1.25,
        delay: 0.2,
        ease: 'power2.out',
        onUpdate: () => {
            const curPct = Math.round(scoreCounter.currentPct);
            const curScore = Math.round(scoreCounter.currentScore);
            const scoreCircle = document.querySelector('.score-circle');
            if (scoreCircle) {
                scoreCircle.style.setProperty('--score', curPct);
                scoreCircle.setAttribute('data-score', curPct);
            }
            const scoreValEl = document.getElementById('stat-obtained-score');
            if (scoreValEl) scoreValEl.textContent = `${curScore} / ${total}`;
            const pctValEl = document.getElementById('stat-percentage-val');
            if (pctValEl) pctValEl.textContent = `${curPct}%`;
        }
    });

    // Pass / Fail badge elastic pop
    gsap.from('.pass-status', {
        opacity: 0,
        scale: 0.2,
        duration: 0.75,
        delay: 0.35,
        ease: 'elastic.out(1.15, 0.5)'
    });

    // Stat boxes stagger entrance
    gsap.from('.result-stat-box', {
        opacity: 0,
        y: 22,
        stagger: 0.08,
        duration: 0.45,
        delay: 0.35,
        ease: 'power2.out'
    });

    // Ensure action buttons are immediately 100% visible and pop into view
    gsap.set('.result-actions .btn', { opacity: 1, visibility: 'visible' });
    gsap.from('.result-actions .btn', {
        scale: 0.95,
        stagger: 0.08,
        duration: 0.35,
        delay: 0.2,
        ease: 'back.out(2)',
        clearProps: 'all'
    });

    // Review section and items stagger
    gsap.from('.review-section h2', {
        opacity: 0,
        y: 20,
        duration: 0.4,
        delay: 0.5,
        ease: 'power2.out'
    });

    gsap.from('.review-item', {
        opacity: 0,
        y: 28,
        stagger: 0.035,
        duration: 0.35,
        delay: 0.55,
        ease: 'power2.out'
    });
}

// Function to Download Result PDF
function downloadResultPDF() {
    const btn = document.getElementById('download-pdf-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳</span> PDF तयार होत आहे... Please wait...`;
    }

    const percentage = Math.round((lastCompletedReview.score / lastCompletedReview.total) * 100);
    const passed = percentage >= PASSING_PERCENTAGE;
    const score = lastCompletedReview.score;
    const total = lastCompletedReview.total;
    const modTitleMr = (modulesMeta[currentModuleKey] && modulesMeta[currentModuleKey].name_mr) || currentModuleKey;
    const optLetters = ['A', 'B', 'C', 'D'];
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Generate questions rows for PDF
    let questionsRowsHtml = '';
    currentQuestions.forEach((q, i) => {
        const userChoiceIndex = userAnswers[i];
        const correctLetter = (q.answer_letter || 'A').trim().toUpperCase();
        const correctIndex = optLetters.indexOf(correctLetter);
        const isAnswered = (userChoiceIndex !== undefined && userChoiceIndex >= 0);
        const isCorrect = (isAnswered && userChoiceIndex === correctIndex);

        let userChoiceText = 'उत्तर दिले नाही (Not Answered)';
        if (isAnswered) {
            const letter = optLetters[userChoiceIndex];
            const optMr = (q.options_mr && q.options_mr[userChoiceIndex]) ? q.options_mr[userChoiceIndex] : (q.options[userChoiceIndex] || '');
            userChoiceText = `[${letter}] ${optMr}`;
        }

        const correctOptMr = (q.options_mr && q.options_mr[correctIndex]) ? q.options_mr[correctIndex] : (q.answer_mr || q.options[correctIndex] || q.answer);
        const correctText = `[${correctLetter}] ${correctOptMr}`;

        const qMr = q.question_mr || q.question;
        const qEn = q.question || '';

        questionsRowsHtml += `
            <div style="border: 1px solid #cbd5e1; border-left: 5px solid ${isCorrect ? '#16a34a' : '#dc2626'}; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; background: #ffffff; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px; line-height: 1.35;">
                    ${i + 1}. ${qMr}
                </div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; font-style: italic; line-height: 1.3;">
                    ${qEn}
                </div>
                <div style="font-size: 12px; display: flex; flex-direction: column; gap: 3px;">
                    <div style="color: ${isCorrect ? '#16a34a' : '#dc2626'}; font-weight: 600;">
                        ${isCorrect ? '✅' : '❌'} तुमचे उत्तर (Your Answer): <span style="font-weight: 700;">${userChoiceText}</span>
                    </div>
                    <div style="color: #16a34a; font-weight: 600;">
                        🎯 अचूक उत्तर (Correct Answer): <span style="font-weight: 700;">${correctText}</span>
                    </div>
                </div>
            </div>
        `;
    });

    // Create a printable container specifically formatted for A4 PDF
    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdf-render-wrapper';
    pdfContainer.style.width = '750px';
    pdfContainer.style.margin = '0 auto';
    pdfContainer.style.padding = '15px 20px';
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.color = '#0f172a';
    pdfContainer.style.fontFamily = "'Mukta', 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif";
    pdfContainer.style.lineHeight = '1.4';
    pdfContainer.style.boxSizing = 'border-box';

    pdfContainer.innerHTML = `
        <!-- Topside Section: Header + Details Table + Result Box -->
        <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 15px;">
            <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px;">
                <div style="font-size: 20px; font-weight: 800; color: #1e3a8a; text-transform: uppercase;">
                    Online MCQ Assessment Result / निकाल पत्रक
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #475569; margin-top: 2px;">
                    Employability Skills (1st Year CTS) — रोजगार कौशल्ये परीक्षा
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; background: #f8fafc; border: 1px solid #cbd5e1;">
                <tr>
                    <td style="padding: 7px 12px; border: 1px solid #cbd5e1; width: 50%;">
                        <span style="color: #64748b; font-size: 11px;">प्रशिक्षणार्थी नाव (Name):</span><br>
                        <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${escapeHtml(currentTrainee.name || 'प्रशिक्षणार्थी')}</span>
                    </td>
                    <td style="padding: 7px 12px; border: 1px solid #cbd5e1; width: 50%;">
                        <span style="color: #64748b; font-size: 11px;">चाचणी नाव (Test Name):</span><br>
                        <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(modTitleMr)}</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 7px 12px; border: 1px solid #cbd5e1;">
                        <span style="color: #64748b; font-size: 11px;">व्यवसाय / ट्रेड (Trade):</span><br>
                        <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(currentTrainee.trade || '-')}</span>
                    </td>
                    <td style="padding: 7px 12px; border: 1px solid #cbd5e1;">
                        <span style="color: #64748b; font-size: 11px;">आयटीआय संस्था (ITI):</span><br>
                        <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(currentTrainee.iti || '-')}</span>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 6px 12px; border: 1px solid #cbd5e1;">
                        <span style="color: #64748b; font-size: 11px;">दिनांक व वेळ (Date & Time):</span> <span style="font-weight: 600;">${formattedDate}</span>
                    </td>
                </tr>
            </table>

            <!-- Result Table / Box on Topside -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 2px solid ${passed ? '#16a34a' : '#dc2626'}; border-radius: 8px; background: ${passed ? '#f0fdf4' : '#fef2f2'};">
                <tr>
                    <td style="text-align: center; padding: 10px 8px; border: 1px solid ${passed ? '#bbf7d0' : '#fecaca'}; width: 25%;">
                        <div style="font-size: 11px; color: #475569; font-weight: 600;">मिळालेले गुण (Obtained)</div>
                        <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${score} / ${total}</div>
                    </td>
                    <td style="text-align: center; padding: 10px 8px; border: 1px solid ${passed ? '#bbf7d0' : '#fecaca'}; width: 25%;">
                        <div style="font-size: 11px; color: #475569; font-weight: 600;">टक्केवारी (Percentage)</div>
                        <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${percentage}%</div>
                    </td>
                    <td style="text-align: center; padding: 10px 8px; border: 1px solid ${passed ? '#bbf7d0' : '#fecaca'}; width: 25%;">
                        <div style="font-size: 11px; color: #475569; font-weight: 600;">किमान उत्तीर्ण (Passing)</div>
                        <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${PASSING_PERCENTAGE}%</div>
                    </td>
                    <td style="text-align: center; padding: 10px 8px; border: 1px solid ${passed ? '#bbf7d0' : '#fecaca'}; width: 25%;">
                        <div style="font-size: 11px; color: #475569; font-weight: 600;">अंतिम निकाल (Result)</div>
                        <div style="font-size: 20px; font-weight: 900; color: ${passed ? '#16a34a' : '#dc2626'};">
                            ${passed ? 'PASS (उत्तीर्ण)' : 'FAIL (अनुत्तीर्ण)'}
                        </div>
                    </td>
                </tr>
            </table>

            <div style="font-size: 13px; font-weight: 800; color: #1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase;">
                प्रश्नोत्तरे मूल्यमापन (Questions & Detailed Review)
            </div>
        </div>

        <!-- Questions Review List -->
        <div>
            ${questionsRowsHtml}
        </div>

        <!-- Official Bottom Footer -->
        <div style="margin-top: 25px; padding-top: 15px; border-top: 2px solid #0f172a; text-align: center; font-size: 13px; line-height: 1.5; color: #0f172a; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-weight: 800; font-size: 13px; color: #1e3a8a;">- Developed By -</div>
            <div style="font-weight: 800; font-size: 15px; color: #0f172a;">Avinash S. Dongre</div>
            <div style="font-weight: 700; color: #475569;">C.I. COPA</div>
            <div style="font-weight: 800; color: #0f172a;">GITI LOHARA DIST. DHARASHIV.</div>
        </div>
    `;

    // Temporarily hide background app & header so html2canvas renders pdfContainer right at document origin (0, 0)
    const headerEl = document.querySelector('header');
    const appEl = document.getElementById('app');
    const originalHeaderDisplay = headerEl ? headerEl.style.display : '';
    const originalAppDisplay = appEl ? appEl.style.display : '';
    const originalScrollY = window.scrollY;

    if (headerEl) headerEl.style.display = 'none';
    if (appEl) appEl.style.display = 'none';
    window.scrollTo(0, 0);

    document.body.appendChild(pdfContainer);

    const cleanCandidateName = (currentTrainee.name || 'Trainee').trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
    const pdfFilename = `Result_${cleanCandidateName}_${score}_out_of_${total}.pdf`;

    const opt = {
        margin: [8, 8, 8, 8],
        filename: pdfFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            backgroundColor: '#ffffff',
            scale: 2,
            scrollY: 0,
            scrollX: 0,
            useCORS: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    function cleanup() {
        if (pdfContainer.parentNode) {
            pdfContainer.parentNode.removeChild(pdfContainer);
        }
        if (headerEl) headerEl.style.display = originalHeaderDisplay;
        if (appEl) appEl.style.display = originalAppDisplay;
        window.scrollTo(0, originalScrollY);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>📥</span> निकाल PDF डाउनलोड करा (Download PDF)`;
        }
    }

    if (window.html2pdf) {
        html2pdf().set(opt).from(pdfContainer).save().then(() => {
            cleanup();
        }).catch(err => {
            console.error('PDF export error:', err);
            cleanup();
            window.print();
        });
    } else {
        cleanup();
        window.print();
    }
}
