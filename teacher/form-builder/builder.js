/**
 * TrevaForms - 3-Column Vintage University Form Builder Engine
 * Features Left Elements Palette, Center Canvas Paper Sheet, and Right Properties Inspector.
 */

let currentForm = null;
let selectedQuestionId = null;
let draggedCardIdx = null;

const ELEMENT_TYPES = [
    { type: "short-answer", label: "Short Text", icon: "✏️", defaultTitle: "Short Answer Question" },
    { type: "paragraph", label: "Long Text", icon: "📄", defaultTitle: "Detailed Feedback / Notes" },
    { type: "multiple-choice", label: "Multiple Choice", icon: "🔘", defaultTitle: "Select One Option", options: ["Option 1", "Option 2", "Option 3"] },
    { type: "checkboxes", label: "Checkbox", icon: "☑️", defaultTitle: "Select All That Apply", options: ["Option A", "Option B", "Option C"] },
    { type: "dropdown", label: "Dropdown", icon: "🔽", defaultTitle: "Choose From Menu", options: ["Choice 1", "Choice 2"] },
    { type: "rating", label: "Rating", icon: "⭐", defaultTitle: "Rate Experience (1-5)" },
    { type: "date", label: "Date", icon: "📅", defaultTitle: "Select Date" },
    { type: "file-upload", label: "File Upload", icon: "📁", defaultTitle: "Upload Document / Resume" },
    { type: "number", label: "Number", icon: "🔢", defaultTitle: "Enter Numerical Value" }
];

document.addEventListener("DOMContentLoaded", () => {
    initFormBuilder();
});

function initFormBuilder() {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get("id");

    if (formId) {
        currentForm = getFormById(formId);
    }

    if (!currentForm) {
        currentForm = {
            id: "form_" + Date.now(),
            title: "Student Feedback Form",
            description: "Please complete this form to share your feedback.",
            status: "draft",
            questions: [
                {
                    id: "q_sample_1",
                    question: "How was the teaching?",
                    type: "multiple-choice",
                    required: true,
                    description: "Rate overall instructor guidance.",
                    options: ["Excellent", "Good", "Average", "Poor"]
                }
            ],
            responseCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareUrl: `trevaforms.app/f/form_${Date.now()}`
        };
        saveForm(currentForm);
    }

    selectedQuestionId = currentForm.questions[0] ? currentForm.questions[0].id : null;

    // Top Navigation Bindings
    const titleTopInput = document.getElementById("builder-top-title");
    if (titleTopInput) {
        titleTopInput.value = currentForm.title;
        titleTopInput.addEventListener("input", (e) => {
            currentForm.title = e.target.value;
            const canvasTitleInput = document.getElementById("canvas-form-title");
            if (canvasTitleInput) canvasTitleInput.value = e.target.value;
            triggerAutoSave();
        });
    }

    const canvasTitleInput = document.getElementById("canvas-form-title");
    if (canvasTitleInput) {
        canvasTitleInput.value = currentForm.title;
        canvasTitleInput.addEventListener("input", (e) => {
            currentForm.title = e.target.value;
            if (titleTopInput) titleTopInput.value = e.target.value;
            triggerAutoSave();
        });
    }

    const canvasDescInput = document.getElementById("canvas-form-desc");
    if (canvasDescInput) {
        canvasDescInput.value = currentForm.description || "";
        canvasDescInput.addEventListener("input", (e) => {
            currentForm.description = e.target.value;
            triggerAutoSave();
        });
    }

    // Buttons
    document.getElementById("btn-builder-preview")?.addEventListener("click", () => {
        window.location.href = `../form-preview/index.html?id=${currentForm.id}`;
    });

    document.getElementById("btn-builder-save")?.addEventListener("click", () => {
        saveForm(currentForm);
        showToast("Form saved to ledger database!", "success");
    });

    document.getElementById("btn-builder-publish")?.addEventListener("click", () => {
        currentForm.status = "published";
        saveForm(currentForm);
        openShareModal(true);
    });

    // Render Components
    renderLeftPalette();
    initCanvasDropListeners();
    renderCanvas();
    renderPropertiesPanel();
}

function triggerAutoSave() {
    const statusEl = document.getElementById("save-status");
    if (statusEl) statusEl.textContent = "Saving...";

    saveForm(currentForm);

    setTimeout(() => {
        if (statusEl) statusEl.textContent = "✓ Saved to database";
    }, 300);
}

function scrollToActiveCard() {
    setTimeout(() => {
        if (!selectedQuestionId) return;
        const activeCard = document.querySelector(`.canvas-question-card[data-q-id="${selectedQuestionId}"]`);
        if (activeCard) {
            activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 50);
}

/* ==========================================================================
   Left Sidebar: Drag & Drop Palette
   ========================================================================== */
function renderLeftPalette() {
    const container = document.getElementById("elements-palette-container");
    if (!container) return;

    container.innerHTML = ELEMENT_TYPES.map(elem => `
        <div class="element-item-card" draggable="true" data-type="${elem.type}">
            <div class="element-icon">${elem.icon}</div>
            <div class="element-label">${elem.label}</div>
        </div>
    `).join('');

    let isDraggingPalette = false;
    container.querySelectorAll(".element-item-card").forEach(card => {
        card.addEventListener("dragstart", (e) => {
            isDraggingPalette = true;
            e.dataTransfer.setData("text/plain", card.dataset.type);
            e.dataTransfer.effectAllowed = "copy";
        });

        card.addEventListener("dragend", () => {
            setTimeout(() => { isDraggingPalette = false; }, 150);
        });

        card.addEventListener("click", () => {
            if (isDraggingPalette) return;
            addNewQuestionByType(card.dataset.type);
        });
    });
}

/* ==========================================================================
   Center: Form Canvas & Drag Drop Target
   ========================================================================== */
function renderCanvas() {
    const container = document.getElementById("canvas-questions-list");
    const dropzone = document.getElementById("empty-canvas-dropzone");
    if (!container) return;

    if (currentForm.questions.length === 0) {
        container.innerHTML = "";
        if (dropzone) dropzone.style.display = "block";
    } else {
        if (dropzone) dropzone.style.display = "none";
        container.innerHTML = currentForm.questions.map((q, index) => renderCanvasQuestionCard(q, index)).join('');
    }

    bindCanvasEvents();
}

function renderCanvasQuestionCard(q, index) {
    const isSelected = q.id === selectedQuestionId;
    const reqMark = q.required ? '<span class="required-asterisk">*</span>' : '';

    let fieldPreviewHtml = "";

    switch (q.type) {
        case "short-answer":
            fieldPreviewHtml = `<input type="text" class="form-control" placeholder="Short answer text" disabled>`;
            break;
        case "paragraph":
            fieldPreviewHtml = `<textarea class="form-control" rows="3" placeholder="Long answer text" disabled></textarea>`;
            break;
        case "multiple-choice":
            fieldPreviewHtml = (q.options || ["Option 1", "Option 2"]).map(opt => `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.9rem;">
                    <input type="radio" disabled checked style="accent-color: var(--terracotta);">
                    <span>${opt}</span>
                </div>
            `).join('');
            break;
        case "checkboxes":
            fieldPreviewHtml = (q.options || ["Option A", "Option B"]).map(opt => `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.9rem;">
                    <input type="checkbox" disabled checked style="accent-color: var(--terracotta);">
                    <span>${opt}</span>
                </div>
            `).join('');
            break;
        case "dropdown":
            fieldPreviewHtml = `
                <select class="form-control" disabled>
                    ${(q.options || ["Option 1"]).map(opt => `<option>${opt}</option>`).join('')}
                </select>
            `;
            break;
        case "rating":
            fieldPreviewHtml = `
                <div style="font-size: 1.5rem; color: #B87820;">★★★★★</div>
            `;
            break;
        case "date":
            fieldPreviewHtml = `<input type="date" class="form-control" disabled>`;
            break;
        case "file-upload":
            fieldPreviewHtml = `<div style="padding: 1rem; border: 1.5px dashed var(--rule); text-align: center; color: var(--brown2); font-size: 0.85rem;">📁 Drag and drop files here</div>`;
            break;
        case "number":
            fieldPreviewHtml = `<input type="number" class="form-control" placeholder="12345" disabled>`;
            break;
        default:
            fieldPreviewHtml = `<input type="text" class="form-control" disabled>`;
    }

    return `
        <div class="canvas-question-card ${isSelected ? 'selected' : ''}" data-q-id="${q.id}" data-q-idx="${index}" draggable="true">
            <div class="card-top-bar">
                <span class="card-drag-handle" title="Drag to reorder">⋮⋮ Drag</span>
                <div class="card-actions-quick">
                    <button class="btn-icon btn-sm btn-card-duplicate" data-q-id="${q.id}" title="Duplicate">📋</button>
                    <button class="btn-icon btn-sm btn-card-delete" data-q-id="${q.id}" style="color: var(--danger);" title="Delete">🗑️</button>
                </div>
            </div>

            <div class="canvas-q-title">${index + 1}. ${q.question} ${reqMark}</div>
            ${q.description ? `<div class="canvas-q-desc">${q.description}</div>` : ''}

            <div class="canvas-q-preview-body">
                ${fieldPreviewHtml}
            </div>
        </div>
    `;
}

let canvasDropListenersAttached = false;
function initCanvasDropListeners() {
    if (canvasDropListenersAttached) return;
    canvasDropListenersAttached = true;

    const paperSheet = document.getElementById("paper-sheet-canvas");
    const dropzone = document.getElementById("empty-canvas-dropzone");
    if (!paperSheet) return;

    paperSheet.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone?.classList.add("drag-over");
    });

    paperSheet.addEventListener("dragleave", (e) => {
        if (!e.relatedTarget || !paperSheet.contains(e.relatedTarget)) {
            dropzone?.classList.remove("drag-over");
        }
    });

    paperSheet.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone?.classList.remove("drag-over");
        const elemType = e.dataTransfer.getData("text/plain");
        if (elemType && !elemType.startsWith("reorder:")) {
            addNewQuestionByType(elemType);
        }
    });
}

function bindCanvasEvents() {
    document.querySelectorAll(".canvas-question-card").forEach(card => {
        const qId = card.dataset.qId;
        const qIdx = parseInt(card.dataset.qIdx);

        card.addEventListener("click", (e) => {
            if (e.target.closest(".btn-card-duplicate") || e.target.closest(".btn-card-delete")) return;
            selectedQuestionId = qId;
            renderCanvas();
            renderPropertiesPanel();
        });

        card.addEventListener("dragstart", (e) => {
            draggedCardIdx = qIdx;
            e.dataTransfer.setData("text/plain", "reorder:" + qIdx);
            e.dataTransfer.effectAllowed = "move";
        });

        card.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        card.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const data = e.dataTransfer.getData("text/plain");
            if (draggedCardIdx !== null && draggedCardIdx !== qIdx) {
                const movedItem = currentForm.questions.splice(draggedCardIdx, 1)[0];
                currentForm.questions.splice(qIdx, 0, movedItem);
                draggedCardIdx = null;
                triggerAutoSave();
                renderCanvas();
            } else if (data && !data.startsWith("reorder:")) {
                insertNewQuestionByTypeAt(data, qIdx + 1);
            }
        });
    });

    document.querySelectorAll(".btn-card-duplicate").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const qId = btn.dataset.qId;
            duplicateQuestionById(qId);
        });
    });

    document.querySelectorAll(".btn-card-delete").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const qId = btn.dataset.qId;
            deleteQuestionById(qId);
        });
    });
}

let lastAddTimestamp = 0;
function addNewQuestionByType(type) {
    const now = Date.now();
    if (now - lastAddTimestamp < 250) return; // Prevent duplicate triggers
    lastAddTimestamp = now;

    const elemDef = ELEMENT_TYPES.find(t => t.type === type) || ELEMENT_TYPES[0];
    
    const newQ = {
        id: "q_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        question: elemDef.defaultTitle,
        type: elemDef.type,
        required: false,
        description: "",
        options: elemDef.options ? [...elemDef.options] : undefined
    };

    currentForm.questions.push(newQ);
    selectedQuestionId = newQ.id;
    triggerAutoSave();
    renderCanvas();
    renderPropertiesPanel();
    scrollToActiveCard();
}

function insertNewQuestionByTypeAt(type, index) {
    const now = Date.now();
    if (now - lastAddTimestamp < 250) return;
    lastAddTimestamp = now;

    const elemDef = ELEMENT_TYPES.find(t => t.type === type) || ELEMENT_TYPES[0];
    const newQ = {
        id: "q_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        question: elemDef.defaultTitle,
        type: elemDef.type,
        required: false,
        description: "",
        options: elemDef.options ? [...elemDef.options] : undefined
    };

    currentForm.questions.splice(index, 0, newQ);
    selectedQuestionId = newQ.id;
    triggerAutoSave();
    renderCanvas();
    renderPropertiesPanel();
    scrollToActiveCard();
}

function duplicateQuestionById(qId) {
    const idx = currentForm.questions.findIndex(q => q.id === qId);
    if (idx < 0) return;

    const original = currentForm.questions[idx];
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = "q_" + Date.now();
    copy.question = `${original.question} (Copy)`;

    currentForm.questions.splice(idx + 1, 0, copy);
    selectedQuestionId = copy.id;
    triggerAutoSave();
    renderCanvas();
    renderPropertiesPanel();
    scrollToActiveCard();
}

function deleteQuestionById(qId) {
    if (currentForm.questions.length <= 1) {
        showToast("A form must contain at least one question", "warning");
        return;
    }

    currentForm.questions = currentForm.questions.filter(q => q.id !== qId);
    if (selectedQuestionId === qId) {
        selectedQuestionId = currentForm.questions[0] ? currentForm.questions[0].id : null;
    }
    triggerAutoSave();
    renderCanvas();
    renderPropertiesPanel();
}

/* ==========================================================================
   Right Sidebar: Properties Inspector
   ========================================================================== */
function renderPropertiesPanel() {
    const container = document.getElementById("properties-inspector-container");
    if (!container) return;

    const selectedQ = currentForm.questions.find(q => q.id === selectedQuestionId);

    if (!selectedQ) {
        container.innerHTML = `
            <div class="no-selection-notice">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">👈</div>
                <p>Click on any question card in the canvas to inspect and edit its properties.</p>
            </div>
        `;
        return;
    }

    const isChoiceType = ["multiple-choice", "checkboxes", "dropdown"].includes(selectedQ.type);

    const typeOptionsHtml = ELEMENT_TYPES.map(t => `
        <option value="${t.type}" ${t.type === selectedQ.type ? 'selected' : ''}>${t.icon} ${t.label}</option>
    `).join('');

    let optionsSectionHtml = "";

    if (isChoiceType) {
        const options = selectedQ.options || ["Option 1", "Option 2"];
        optionsSectionHtml = `
            <div class="form-group">
                <label class="form-label">Options</label>
                <div class="prop-options-builder">
                    ${options.map((opt, optIdx) => `
                        <div class="prop-option-item">
                            <input type="text" class="form-control prop-opt-input" data-opt-idx="${optIdx}" value="${opt}">
                            <button type="button" class="btn-icon btn-sm btn-prop-delete-opt" data-opt-idx="${optIdx}">✕</button>
                        </div>
                    `).join('')}
                    <button type="button" class="add-option-btn" id="btn-prop-add-opt">+ Add option</button>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="sidebar-title-block">
            <span>Properties</span>
            <span class="badge badge-published" style="font-size: 10px;">ID: ${selectedQ.id}</span>
        </div>

        <div class="prop-section">
            <div class="form-group">
                <label class="form-label">Question Title</label>
                <input type="text" id="prop-q-title" class="form-control" value="${selectedQ.question}">
            </div>

            <div class="form-group">
                <label class="form-label">Question Type</label>
                <select id="prop-q-type" class="form-control">
                    ${typeOptionsHtml}
                </select>
            </div>

            ${optionsSectionHtml}

            <div class="form-group">
                <label class="form-label">Optional Description / Instructions</label>
                <textarea id="prop-q-desc" class="form-control" rows="2" placeholder="e.g. Please select all relevant choices">${selectedQ.description || ''}</textarea>
            </div>

            <div class="toggle-row" style="padding: 0.5rem 0;">
                <div>
                    <div style="font-weight: 700; font-size: 0.85rem;">Required Field</div>
                    <div style="font-family: var(--type); font-size: 10px; color: var(--brown2);">Respondent must answer before submitting</div>
                </div>
                <input type="checkbox" id="prop-q-required" ${selectedQ.required ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--terracotta);">
            </div>

            <div style="display: flex; gap: 0.5rem; margin-top: 1rem; margin-bottom: 2rem;">
                <button id="btn-prop-duplicate" class="btn btn-secondary btn-sm" style="flex: 1;">📋 Duplicate</button>
                <button id="btn-prop-delete" class="btn btn-danger btn-sm" style="flex: 1;">🗑️ Delete</button>
            </div>
        </div>
    `;

    bindPropertiesEvents(selectedQ);
}

function bindPropertiesEvents(selectedQ) {
    document.getElementById("prop-q-title")?.addEventListener("input", (e) => {
        selectedQ.question = e.target.value;
        triggerAutoSave();
        renderCanvas();
    });

    document.getElementById("prop-q-type")?.addEventListener("change", (e) => {
        const newType = e.target.value;
        selectedQ.type = newType;
        if (["multiple-choice", "checkboxes", "dropdown"].includes(newType) && !selectedQ.options) {
            selectedQ.options = ["Option 1", "Option 2"];
        }
        triggerAutoSave();
        renderCanvas();
        renderPropertiesPanel();
    });

    document.getElementById("prop-q-desc")?.addEventListener("input", (e) => {
        selectedQ.description = e.target.value;
        triggerAutoSave();
        renderCanvas();
    });

    document.getElementById("prop-q-required")?.addEventListener("change", (e) => {
        selectedQ.required = e.target.checked;
        triggerAutoSave();
        renderCanvas();
    });

    document.querySelectorAll(".prop-opt-input").forEach(input => {
        input.addEventListener("input", (e) => {
            const optIdx = parseInt(e.target.dataset.optIdx);
            selectedQ.options[optIdx] = e.target.value;
            triggerAutoSave();
            renderCanvas();
        });
    });

    document.querySelectorAll(".btn-prop-delete-opt").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const optIdx = parseInt(e.currentTarget.dataset.optIdx);
            selectedQ.options.splice(optIdx, 1);
            triggerAutoSave();
            renderCanvas();
            renderPropertiesPanel();
        });
    });

    document.getElementById("btn-prop-add-opt")?.addEventListener("click", () => {
        selectedQ.options = selectedQ.options || [];
        selectedQ.options.push(`Option ${selectedQ.options.length + 1}`);
        triggerAutoSave();
        renderCanvas();
        renderPropertiesPanel();
    });

    document.getElementById("btn-prop-duplicate")?.addEventListener("click", () => {
        duplicateQuestionById(selectedQ.id);
    });

    document.getElementById("btn-prop-delete")?.addEventListener("click", () => {
        deleteQuestionById(selectedQ.id);
    });
}

function openShareModal(isJustPublished = false) {
    showModal({
        title: isJustPublished ? "🚀 Form Published Live!" : "Share Form Ledger",
        contentHtml: `
            <p style="font-family: var(--merri); font-style: italic; color: var(--brown2); margin-bottom: 1rem;">
                ${isJustPublished ? 'Your form is published live and ready to collect responses.' : 'Copy your shareable URL or inspect the public form.'}
            </p>
            <div class="form-group">
                <label class="form-label">Shareable Link</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" class="form-control" value="${currentForm.shareUrl}" readonly id="share-link-input">
                    <button type="button" class="btn btn-secondary" onclick="copyToClipboard('${currentForm.shareUrl}')">Copy</button>
                </div>
            </div>
        `,
        confirmText: "Open Public Form",
        cancelText: "Close",
        onConfirm: () => {
            window.location.href = `../form-preview/index.html?id=${currentForm.id}`;
        }
    });
}
