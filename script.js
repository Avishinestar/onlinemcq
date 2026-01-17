// script.js

// State
let allModules = {};
let currentModule = null;
let currentQuestions = [];
let userAnswers = {};
let currentQuestionIndex = 0;
let timerInterval;
const QUESTIONS_PER_TEST = 25;
const PASSING_PERCENTAGE = 40;

// DOM Elements
const moduleGrid = document.getElementById('module-grid');
const moduleSelection = document.getElementById('module-selection');
const mainContainer = document.querySelector('main');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error("Failed to load questions");
        allModules = await response.json();
        renderModules();
    } catch (error) {
        if (moduleGrid) {
            moduleGrid.innerHTML = `<div style="text-align:center; grid-column: 1/-1;">
                <p>Failed to load questions. Please ensure questions.json exists.</p>
                <p style="font-size: 0.8em; color: var(--text-muted);">${error.message}</p>
            </div>`;
        }
        console.error(error);
    }
});

function renderModules() {
    moduleGrid.innerHTML = '';
    Object.keys(allModules).forEach(moduleName => {
        const pool = allModules[moduleName];
        const questionCount = pool.length;
        const parts = Math.ceil(questionCount / QUESTIONS_PER_TEST);

        if (parts <= 1) {
            // Single part (standard behavior)
            createModuleCard(moduleName, questionCount, () => startTest(moduleName, 0));
        } else {
            // Multiple parts
            for (let i = 0; i < parts; i++) {
                const start = i * QUESTIONS_PER_TEST;
                const end = Math.min((i + 1) * QUESTIONS_PER_TEST, questionCount);
                const count = end - start;
                createModuleCard(`${moduleName} (Part ${i + 1})`, count, () => startTest(moduleName, i));
            }
        }
    });
}

function createModuleCard(title, count, onClickHandler) {
    const btn = document.createElement('div');
    btn.className = 'module-card animate-enter';
    btn.innerHTML = `
        <h3>${title}</h3>
        <p>${count} Questions Available</p>
    `;
    btn.onclick = onClickHandler;
    moduleGrid.appendChild(btn);
}

function startTest(moduleName, partIndex = 0) {
    currentModule = moduleName;
    const pool = allModules[moduleName];

    // Calculate slice range based on partIndex
    const startIndex = partIndex * QUESTIONS_PER_TEST;
    // We want exactly QUESTIONS_PER_TEST or the remainder
    const endIndex = Math.min(startIndex + QUESTIONS_PER_TEST, pool.length);

    // Get the specific subset of questions for this part
    // We slice FIRST to get the deterministically selected questions for this part
    const selectedQuestions = pool.slice(startIndex, endIndex);

    // Then shuffle ONLY this subset so the order is random for the user
    currentQuestions = selectedQuestions.sort(() => 0.5 - Math.random());

    userAnswers = {};
    currentQuestionIndex = 0;

    renderTestInterface();
}

function renderTestInterface() {
    mainContainer.innerHTML = `
        <div class="test-container animate-enter">
            <div class="controls" style="margin-top:0; margin-bottom: 1rem;">
                <button class="btn btn-secondary" onclick="location.reload()">Exit Test</button>
                <div class="timer" id="timer">00:00</div>
            </div>
            
            <div id="question-area">
                <!-- Question injected here -->
            </div>

            <div class="controls">
                <button id="prev-btn" class="btn btn-secondary" onclick="prevQuestion()" disabled>Previous</button>
                <span id="progress-text">1 / ${currentQuestions.length}</span>
                <button id="next-btn" class="btn" onclick="nextQuestion()">Next</button>
            </div>
        </div>
    `;

    startTimer();
    showQuestion(0);
}

function showQuestion(index) {
    const q = currentQuestions[index];
    const questionArea = document.getElementById('question-area');

    const optionsHtml = q.options.map((opt, i) => {
        const isSelected = userAnswers[index] === opt;
        return `<button class="option-btn ${isSelected ? 'selected' : ''}" onclick="selectAnswer(${index}, '${opt.replace(/'/g, "\\'")}')">
            ${opt}
        </button>`;
    }).join('');

    questionArea.innerHTML = `
        <div class="question-card">
            <div class="question-text">${index + 1}. ${q.question}</div>
            <div class="options-grid">
                ${optionsHtml}
            </div>
        </div>
    `;

    // Update buttons
    document.getElementById('prev-btn').disabled = index === 0;
    const nextBtn = document.getElementById('next-btn');
    if (index === currentQuestions.length - 1) {
        nextBtn.textContent = 'Submit Test';
        nextBtn.onclick = submitTest;
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.onclick = nextQuestion;
    }

    document.getElementById('progress-text').textContent = `${index + 1} / ${currentQuestions.length}`;
}

function selectAnswer(qIndex, answer) {
    userAnswers[qIndex] = answer;
    showQuestion(qIndex); // Re-render to show selection
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
    }
}

let startTime;
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const delta = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(delta / 60).toString().padStart(2, '0');
        const secs = (delta % 60).toString().padStart(2, '0');
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

function submitTest() {
    clearInterval(timerInterval);

    let score = 0;
    let reviewHtml = '<div class="review-section"><h2>Test Review</h2>';

    currentQuestions.forEach((q, i) => {
        const userAnswer = userAnswers[i] || "Not Answered";
        const isCorrect = userAnswer.trim() === q.answer.trim();

        if (isCorrect) {
            score++;
        }

        reviewHtml += `
            <div class="review-item ${isCorrect ? 'correct-border' : 'wrong-border'}">
                <div class="review-question">${i + 1}. ${q.question}</div>
                <div class="review-details">
                    <p>Your Answer: <span class="${isCorrect ? 'text-pass' : 'text-fail'}">${userAnswer}</span></p>
                    ${!isCorrect ? `<p>Correct Answer: <span class="text-pass">${q.answer}</span></p>` : ''}
                </div>
            </div>
        `;
    });
    reviewHtml += '</div>';

    const total = currentQuestions.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= PASSING_PERCENTAGE;

    mainContainer.innerHTML = `
        <div class="test-container animate-enter">
            <div class="result-card">
                <div class="score-circle ${passed ? 'pass' : 'fail'}" style="--score: ${percentage}" data-score="${percentage}"></div>
                <div class="pass-status ${passed ? 'pass' : 'fail'}">
                    ${passed ? 'Passed!' : 'Failed'}
                </div>
                <p>You scored ${score} out of ${total}</p>
                <div style="margin-top: 2rem;">
                    <button class="btn" onclick="location.reload()">Back to Modules</button>
                </div>
            </div>
            ${reviewHtml}
        </div>
    `;
}
