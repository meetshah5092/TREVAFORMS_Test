/**
 * TrevaForms - Form Preview & Response Collector Controller
 * Validates inputs, captures response data, saves to localStorage, and renders success screen.
 */

let formToRender = null;
let starRatingsState = {};

document.addEventListener("DOMContentLoaded", () => {
    initFormPreview();
});

function initFormPreview() {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get("id");

    if (formId) {
        formToRender = getFormById(formId);
    }

    if (!formToRender) {
        const forms = getForms();
        formToRender = forms[0] || DEMO_FORMS[0];
    }

    renderRespondentForm();
}

function renderRespondentForm() {
    const container = document.getElementById("preview-container");
    if (!container || !formToRender) return;

    container.innerHTML = `
        <div class="preview-header-card">
            <h1 class="preview-title">${formToRender.title}</h1>
            <p class="preview-desc">${formToRender.description || ''}</p>
        </div>

        <form id="respondent-form">
            ${formToRender.questions.map((q, idx) => renderQuestionField(q, idx)).join('')}

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem;">
                <button type="submit" class="btn btn-primary" style="padding: 10px 24px; font-size: 15px;">
                    Submit Response
                </button>
                <a href="../form-builder/index.html?id=${formToRender.id}" class="btn btn-secondary btn-sm">
                    ✏️ Back to Builder
                </a>
            </div>
        </form>
    `;

    bindRatingWidgets();

    document.getElementById("respondent-form")?.addEventListener("submit", handleFormSubmission);
}

function renderQuestionField(q, index) {
    const reqMark = q.required ? '<span class="required-asterisk">*</span>' : '';

    let inputHtml = "";

    switch (q.type) {
        case "short-answer":
            inputHtml = `<input type="text" name="${q.id}" class="form-control" placeholder="${q.placeholder || 'Your answer'}" ${q.required ? 'required' : ''}>`;
            break;

        case "paragraph":
            inputHtml = `<textarea name="${q.id}" class="form-control" rows="4" placeholder="${q.placeholder || 'Your answer'}" ${q.required ? 'required' : ''}></textarea>`;
            break;

        case "multiple-choice":
            inputHtml = (q.options || ["Option 1", "Option 2"]).map(opt => `
                <label class="choice-label-row">
                    <input type="radio" name="${q.id}" value="${opt}" ${q.required ? 'required' : ''}>
                    <span>${opt}</span>
                </label>
            `).join('');
            break;

        case "checkboxes":
            inputHtml = (q.options || ["Option 1", "Option 2"]).map(opt => `
                <label class="choice-label-row">
                    <input type="checkbox" name="${q.id}" value="${opt}">
                    <span>${opt}</span>
                </label>
            `).join('');
            break;

        case "dropdown":
            inputHtml = `
                <select name="${q.id}" class="form-control" ${q.required ? 'required' : ''}>
                    <option value="">-- Choose an option --</option>
                    ${(q.options || ["Option 1", "Option 2"]).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
            break;

        case "rating":
            inputHtml = `
                <div class="star-rating-widget" data-q-id="${q.id}">
                    <span class="star" data-val="1">★</span>
                    <span class="star" data-val="2">★</span>
                    <span class="star" data-val="3">★</span>
                    <span class="star" data-val="4">★</span>
                    <span class="star" data-val="5">★</span>
                </div>
                <input type="hidden" name="${q.id}" id="input-star-${q.id}" ${q.required ? 'required' : ''}>
            `;
            break;

        case "date":
            inputHtml = `<input type="date" name="${q.id}" class="form-control" ${q.required ? 'required' : ''}>`;
            break;

        case "time":
            inputHtml = `<input type="time" name="${q.id}" class="form-control" ${q.required ? 'required' : ''}>`;
            break;

        case "number":
            inputHtml = `<input type="number" name="${q.id}" class="form-control" placeholder="12345" ${q.required ? 'required' : ''}>`;
            break;

        case "linear-scale":
            const minLabel = q.minLabel || "1";
            const maxLabel = q.maxLabel || "10";
            const scaleMax = q.scaleMax || 10;
            let scaleItems = "";
            for (let i = 1; i <= scaleMax; i++) {
                scaleItems += `
                    <div class="scale-item">
                        <span>${i}</span>
                        <input type="radio" name="${q.id}" value="${i}" ${q.required ? 'required' : ''}>
                    </div>
                `;
            }
            inputHtml = `
                <div style="font-size: 0.85rem; color: var(--brown2); margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                    <span>${minLabel}</span>
                    <span>${maxLabel}</span>
                </div>
                <div class="linear-scale-widget">
                    ${scaleItems}
                </div>
            `;
            break;

        case "file-upload":
            inputHtml = `
                <input type="file" name="${q.id}" class="form-control" ${q.required ? 'required' : ''}>
            `;
            break;

        default:
            inputHtml = `<input type="text" name="${q.id}" class="form-control" ${q.required ? 'required' : ''}>`;
    }

    return `
        <div class="preview-question-card">
            <div class="preview-question-title">
                ${index + 1}. ${q.question} ${reqMark}
            </div>
            ${q.description ? `<div style="font-family: var(--merri); font-style: italic; color: var(--brown2); font-size: 0.85rem; margin-bottom: 0.75rem;">${q.description}</div>` : ''}
            <div>
                ${inputHtml}
            </div>
        </div>
    `;
}

function bindRatingWidgets() {
    document.querySelectorAll(".star-rating-widget").forEach(widget => {
        const qId = widget.dataset.qId;
        const stars = widget.querySelectorAll(".star");
        const hiddenInput = document.getElementById(`input-star-${qId}`);

        stars.forEach(star => {
            star.addEventListener("click", () => {
                const val = parseInt(star.dataset.val);
                starRatingsState[qId] = val;
                if (hiddenInput) hiddenInput.value = val;

                stars.forEach(s => {
                    const sVal = parseInt(s.dataset.val);
                    if (sVal <= val) {
                        s.classList.add("active");
                    } else {
                        s.classList.remove("active");
                    }
                });
            });
        });
    });
}

function handleFormSubmission(e) {
    e.preventDefault();
    const formEl = e.target;
    const formData = new FormData(formEl);

    const answers = {};
    const currentUser = getCurrentUser();

    formToRender.questions.forEach(q => {
        if (q.type === "checkboxes") {
            const checkedVals = [];
            formEl.querySelectorAll(`input[name="${q.id}"]:checked`).forEach(chk => {
                checkedVals.push(chk.value);
            });
            answers[q.id] = checkedVals;
        } else if (q.type === "file-upload") {
            const fileInput = formEl.querySelector(`input[name="${q.id}"]`);
            answers[q.id] = fileInput && fileInput.files[0] ? fileInput.files[0].name : "Attached_Document.pdf";
        } else {
            answers[q.id] = formData.get(q.id) || "";
        }
    });

    for (const q of formToRender.questions) {
        if (q.required) {
            const ans = answers[q.id];
            if (!ans || (Array.isArray(ans) && ans.length === 0)) {
                showToast(`Please answer required question: "${q.question}"`, "danger");
                return;
            }
        }
    }

    const newResponse = {
        formId: formToRender.id,
        formTitle: formToRender.title,
        respondent: answers.q1 || currentUser.name || "Anonymous Respondent",
        email: answers.q2 || currentUser.email || "respondent@example.com",
        answers: answers
    };

    saveResponse(newResponse);

    const container = document.getElementById("preview-container");
    if (container) {
        container.innerHTML = `
            <div class="preview-success-card">
                <div style="font-size: 3.5rem; color: #3E5C2E; margin-bottom: 1rem;">✓</div>
                <h1 style="font-family: var(--serif); font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">Response Recorded!</h1>
                <p style="font-family: var(--merri); font-style: italic; color: var(--brown2); margin-bottom: 2rem;">Thank you. Your submission has been saved to the registrar ledger.</p>
                <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
                    <button onclick="window.location.reload()" class="btn btn-secondary">Submit Another Response</button>
                    <a href="responses.html?formId=${formToRender.id}" class="btn btn-primary">View Response Records</a>
                </div>
            </div>
        `;
    }
}
