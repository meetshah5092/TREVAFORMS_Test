/**
 * TrevaForms Student Portal — Dynamic Form Renderer & Submission Engine
 */

let currentForm = null;
let currentQuestions = [];
let formStartTime = Date.now();
let userAnswers = {};

document.addEventListener("DOMContentLoaded", async () => {
    const auth = await requireStudentAuth();
    if (!auth) return;

    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get("id");

    if (!formId) {
        showErrorView("Form Not Found", "No form ID was specified in the URL.", "../forms/index.html");
        return;
    }

    await loadAndRenderForm(formId, auth.user, auth.profile);
});

async function loadAndRenderForm(formId, user, profile) {
    const studentId = user ? user.id : profile?.id || "demo-student";

    // 1. Fetch form info & questions
    const [form, questions] = await Promise.all([
        getFormById(formId),
        getFormQuestions(formId)
    ]);

    if (!form) {
        showErrorView("Form Unavailable", "This form does not exist or has not been published yet.", "../forms/index.html");
        return;
    }

    currentForm = form;
    currentQuestions = questions;

    // 2. Check if deadline has passed
    const now = new Date();
    if (form.deadline && new Date(form.deadline) < now && !form.allow_late_submissions) {
        showErrorView("Form Closed", "The submission deadline for this form has expired.", "../forms/index.html");
        return;
    }

    // 3. Check if already submitted
    const alreadySubmitted = await hasStudentSubmitted(formId, studentId);
    if (alreadySubmitted && !form.allow_multiple_submissions) {
        showAlreadySubmittedView(form);
        return;
    }

    // 4. Update Top Bar
    document.getElementById("topbar-form-title").textContent = form.title || "Untitled Form";

    // 5. Populate Form Header Card
    document.getElementById("ff-title").textContent = form.title || "Untitled Form";
    document.getElementById("ff-teacher").innerHTML = `<span>👤 Assigned by ${escapeHtml(form.teacherName || "Instructor")}</span>`;
    document.getElementById("ff-desc").textContent = form.description || "Please answer the questions below.";

    const deadlineInfo = formatDeadline(form.deadline);
    const dlEl = document.getElementById("ff-deadline");
    dlEl.className = `deadline-tag deadline-${deadlineInfo.urgency}`;
    dlEl.textContent = deadlineInfo.label;

    document.getElementById("ff-time").textContent = form.estimated_time ? `⏱ ~${form.estimated_time} min` : "⏱ ~3 min";

    // 6. Render Questions
    renderQuestionsList(questions);

    // Hide loader, show form
    document.getElementById("form-loading-state").style.display = "none";
    document.getElementById("student-fill-form").style.display = "block";

    // Setup submit listener
    document.getElementById("student-fill-form").addEventListener("submit", (e) => {
        e.preventDefault();
        handleFormSubmit(studentId);
    });

    // Initial progress update
    updateFormProgress();
}

function renderQuestionsList(questions) {
    const container = document.getElementById("ff-questions-list");
    if (!container) return;

    if (!questions || questions.length === 0) {
        container.innerHTML = `
            <div class="card" style="padding: 30px; text-align: center; color: var(--muted);">
                This form currently has no questions.
            </div>
        `;
        return;
    }

    container.innerHTML = questions.map((q, idx) => {
        const qNum = idx + 1;
        const isRequired = q.required ? '<span class="question-required-star">*</span>' : '';
        const inputHtml = renderQuestionInput(q, idx);

        return `
            <div class="question-card" id="q-card-${q.id}" data-qid="${q.id}">
                <div class="question-head">
                    <h3 class="question-title">${qNum}. ${escapeHtml(q.label || "Question")}${isRequired}</h3>
                </div>
                ${q.description ? `<p class="question-desc">${escapeHtml(q.description)}</p>` : ''}
                <div class="question-input-wrapper">
                    ${inputHtml}
                </div>
                <div class="question-error-text" id="q-err-${q.id}">This question is required.</div>
            </div>
        `;
    }).join("");

    attachInputListeners();
}

function renderQuestionInput(q, idx) {
    const qid = q.id;
    const type = q.type || "short_text";
    const placeholder = q.placeholder || "Your answer...";

    switch (type) {
        case "short_text":
            return `<input type="text" class="form-control" name="q_${qid}" placeholder="${placeholder}" oninput="onAnswerChange('${qid}', this.value)">`;

        case "paragraph":
            return `<textarea class="form-control" name="q_${qid}" rows="4" placeholder="${placeholder}" oninput="onAnswerChange('${qid}', this.value)"></textarea>`;

        case "email":
            return `<input type="email" class="form-control" name="q_${qid}" placeholder="student@example.edu" oninput="onAnswerChange('${qid}', this.value)">`;

        case "number":
            return `<input type="number" class="form-control" name="q_${qid}" placeholder="0" oninput="onAnswerChange('${qid}', this.value)">`;

        case "date":
            return `<input type="date" class="form-control" name="q_${qid}" onchange="onAnswerChange('${qid}', this.value)">`;

        case "time":
            return `<input type="time" class="form-control" name="q_${qid}" onchange="onAnswerChange('${qid}', this.value)">`;

        case "dropdown": {
            const options = q.question_options || [];
            return `
                <select class="form-control" name="q_${qid}" onchange="onAnswerChange('${qid}', this.value)">
                    <option value="">— Select an option —</option>
                    ${options.map(opt => `<option value="${escapeHtml(opt.label)}">${escapeHtml(opt.label)}</option>`).join("")}
                </select>
            `;
        }

        case "multiple_choice": {
            const options = q.question_options || [
                { id: "1", label: "Strongly Agree" },
                { id: "2", label: "Agree" },
                { id: "3", label: "Neutral" },
                { id: "4", label: "Disagree" }
            ];
            return `
                <div class="options-list">
                    ${options.map(opt => `
                        <label class="option-label" onclick="selectRadioOption(this, '${qid}', '${escapeHtml(opt.label)}')">
                            <input type="radio" name="radio_${qid}" value="${escapeHtml(opt.label)}">
                            <span>${escapeHtml(opt.label)}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        }

        case "checkbox": {
            const options = q.question_options || [
                { id: "1", label: "Option 1" },
                { id: "2", label: "Option 2" },
                { id: "3", label: "Option 3" }
            ];
            return `
                <div class="options-list">
                    ${options.map(opt => `
                        <label class="option-label" onclick="toggleCheckboxOption(this, '${qid}', '${escapeHtml(opt.label)}')">
                            <input type="checkbox" name="chk_${qid}" value="${escapeHtml(opt.label)}">
                            <span>${escapeHtml(opt.label)}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        }

        case "rating":
            return `
                <div class="rating-stars-group" id="stars-${qid}">
                    ${[1, 2, 3, 4, 5].map(num => `
                        <button type="button" class="rating-star-btn" data-val="${num}" onclick="selectStarRating('${qid}', ${num})">
                            ★
                        </button>
                    `).join("")}
                    <span id="star-label-${qid}" style="font-size: 13px; font-weight: 600; color: var(--muted); margin-left: 8px;"></span>
                </div>
            `;

        case "linear_scale":
            return `
                <div class="linear-scale-row" id="scale-${qid}">
                    <span style="font-size: 12px; color: var(--muted); margin-right: 6px;">1 (Low)</span>
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
                        <button type="button" class="linear-num-btn" onclick="selectLinearScale('${qid}', ${n}, this)">
                            ${n}
                        </button>
                    `).join("")}
                    <span style="font-size: 12px; color: var(--muted); margin-left: 6px;">10 (High)</span>
                </div>
            `;

        case "file_upload":
            return `
                <div class="file-dropzone" onclick="document.getElementById('file-input-${qid}').click()" ondragover="event.preventDefault(); this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="handleFileDrop(event, '${qid}')">
                    <div class="file-dropzone-icon">📁</div>
                    <div style="font-weight: 600; font-size: 14px; color: var(--text);">Click or drag file to upload</div>
                    <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">PDF, DOCX, or Images up to 10MB</div>
                    <input type="file" id="file-input-${qid}" style="display: none;" onchange="handleFileSelect(event, '${qid}')">
                    <div id="file-chosen-${qid}" style="display: none;"></div>
                </div>
            `;

        default:
            return `<input type="text" class="form-control" name="q_${qid}" oninput="onAnswerChange('${qid}', this.value)">`;
    }
}

function attachInputListeners() {
    // Progress is updated on input change
}

// ── Question Input Handlers ──

window.onAnswerChange = function(qid, value) {
    if (value && value.trim()) {
        userAnswers[qid] = value.trim();
        clearQuestionError(qid);
    } else {
        delete userAnswers[qid];
    }
    updateFormProgress();
};

window.selectRadioOption = function(labelEl, qid, val) {
    const parent = labelEl.parentElement;
    parent.querySelectorAll(".option-label").forEach(l => l.classList.remove("selected"));
    labelEl.classList.add("selected");
    const input = labelEl.querySelector("input");
    if (input) input.checked = true;

    userAnswers[qid] = val;
    clearQuestionError(qid);
    updateFormProgress();
};

window.toggleCheckboxOption = function(labelEl, qid, val) {
    const input = labelEl.querySelector("input");
    // timeout so browser toggles checkbox state first
    setTimeout(() => {
        labelEl.classList.toggle("selected", input.checked);

        if (!Array.isArray(userAnswers[qid])) {
            userAnswers[qid] = [];
        }

        if (input.checked) {
            if (!userAnswers[qid].includes(val)) userAnswers[qid].push(val);
        } else {
            userAnswers[qid] = userAnswers[qid].filter(v => v !== val);
            if (userAnswers[qid].length === 0) delete userAnswers[qid];
        }
        clearQuestionError(qid);
        updateFormProgress();
    }, 10);
};

window.selectStarRating = function(qid, rating) {
    userAnswers[qid] = rating;
    const group = document.getElementById(`stars-${qid}`);
    if (group) {
        group.querySelectorAll(".rating-star-btn").forEach((btn, idx) => {
            btn.classList.toggle("active", idx < rating);
        });
        const labelEl = document.getElementById(`star-label-${qid}`);
        if (labelEl) labelEl.textContent = `${rating} / 5`;
    }
    clearQuestionError(qid);
    updateFormProgress();
};

window.selectLinearScale = function(qid, val, btn) {
    userAnswers[qid] = val;
    const row = document.getElementById(`scale-${qid}`);
    if (row) {
        row.querySelectorAll(".linear-num-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    }
    clearQuestionError(qid);
    updateFormProgress();
};

window.handleFileSelect = function(event, qid) {
    const file = event.target.files[0];
    if (file) setChosenFile(qid, file);
};

window.handleFileDrop = function(event, qid) {
    event.preventDefault();
    const zone = event.currentTarget;
    zone.classList.remove("dragover");
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        setChosenFile(qid, event.dataTransfer.files[0]);
    }
};

function setChosenFile(qid, file) {
    if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit.");
        return;
    }
    userAnswers[qid] = `[Attachment: ${file.name}]`;
    const pill = document.getElementById(`file-chosen-${qid}`);
    if (pill) {
        pill.className = "file-selected-pill";
        pill.innerHTML = `📄 ${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)`;
        pill.style.display = "inline-flex";
    }
    clearQuestionError(qid);
    updateFormProgress();
}

// ── Progress Bar ──

function updateFormProgress() {
    const total = currentQuestions.length;
    if (total === 0) return;

    let answeredCount = 0;
    currentQuestions.forEach(q => {
        if (userAnswers[q.id] !== undefined && userAnswers[q.id] !== null && userAnswers[q.id] !== "") {
            answeredCount++;
        }
    });

    const percent = Math.round((answeredCount / total) * 100);
    const bar = document.getElementById("form-progress-bar");
    const text = document.getElementById("form-progress-text");

    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${answeredCount} of ${total} answered (${percent}%)`;
}

// ── Validation & Submission ──

async function handleFormSubmit(studentId) {
    let hasErrors = false;
    let firstErrorCard = null;

    currentQuestions.forEach(q => {
        const card = document.getElementById(`q-card-${q.id}`);
        const errText = document.getElementById(`q-err-${q.id}`);
        const ans = userAnswers[q.id];

        let isInvalid = false;
        let errMsg = "This question is required.";

        if (q.required) {
            if (ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && ans.length === 0)) {
                isInvalid = true;
            }
        }

        // Email format check
        if (!isInvalid && q.type === "email" && ans) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(ans)) {
                isInvalid = true;
                errMsg = "Please enter a valid email address.";
            }
        }

        if (isInvalid) {
            hasErrors = true;
            if (card) card.classList.add("field-has-error");
            if (errText) {
                errText.textContent = errMsg;
                errText.classList.add("show");
            }
            if (!firstErrorCard && card) firstErrorCard = card;
        } else {
            clearQuestionError(q.id);
        }
    });

    if (hasErrors) {
        if (firstErrorCard) {
            firstErrorCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        showToast("Please answer all required questions.", "error");
        return;
    }

    // Submit
    const submitBtn = document.getElementById("ff-submit-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Submitting...</span>`;

    const completionSeconds = Math.round((Date.now() - formStartTime) / 1000);

    const result = await submitResponse({
        formId: currentForm.id,
        studentId: studentId,
        answers: userAnswers,
        completionTime: completionSeconds
    });

    if (result.success) {
        renderSuccessScreen(result.responseId || "resp-demo");
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Submit Form</span>`;
        showToast(result.error || "Failed to submit response. Please try again.", "error");
    }
}

function clearQuestionError(qid) {
    const card = document.getElementById(`q-card-${qid}`);
    const errText = document.getElementById(`q-err-${qid}`);
    if (card) card.classList.remove("field-has-error");
    if (errText) errText.classList.remove("show");
}

function renderSuccessScreen(responseId) {
    // Hide form, show celebration card
    document.getElementById("student-fill-form").style.display = "none";
    const mount = document.getElementById("ff-success-view");

    mount.innerHTML = `
        <div class="form-success-card">
            <div class="success-icon-badge">✓</div>
            <h2 class="success-card-title">Response Submitted!</h2>
            <p class="success-card-desc">
                Your response for <strong>${escapeHtml(currentForm.title)}</strong> has been recorded in the registrar ledger.
            </p>
            <div class="success-card-actions">
                <a href="../submissions/detail.html?id=${responseId}" class="btn btn-secondary btn-lg">
                    View My Submission
                </a>
                <a href="../dashboard/index.html" class="btn btn-primary btn-lg">
                    Back to Dashboard →
                </a>
            </div>
        </div>
    `;
    mount.style.display = "block";
    mount.scrollIntoView({ behavior: "smooth" });
}

function showAlreadySubmittedView(form) {
    document.getElementById("form-loading-state").style.display = "none";
    const mount = document.getElementById("ff-success-view");
    mount.innerHTML = `
        <div class="form-success-card">
            <div class="success-icon-badge" style="background:var(--primary-light); color:var(--primary);">ℹ</div>
            <h2 class="success-card-title">Already Submitted</h2>
            <p class="success-card-desc">
                You have already submitted a response for <strong>${escapeHtml(form.title)}</strong>. Multiple submissions are not enabled for this form.
            </p>
            <div class="success-card-actions">
                <a href="../submissions/index.html" class="btn btn-secondary btn-lg">
                    View My Submissions
                </a>
                <a href="../dashboard/index.html" class="btn btn-primary btn-lg">
                    Back to Dashboard
                </a>
            </div>
        </div>
    `;
    mount.style.display = "block";
}

function showErrorView(title, message, backLink) {
    document.getElementById("form-loading-state").style.display = "none";
    const mount = document.getElementById("ff-success-view");
    mount.innerHTML = `
        <div class="form-success-card">
            <div class="success-icon-badge" style="background:var(--danger-bg); color:var(--danger);">✕</div>
            <h2 class="success-card-title">${escapeHtml(title)}</h2>
            <p class="success-card-desc">${escapeHtml(message)}</p>
            <div class="success-card-actions">
                <a href="${backLink}" class="btn btn-secondary btn-lg">
                    Return to Forms
                </a>
            </div>
        </div>
    `;
    mount.style.display = "block";
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
