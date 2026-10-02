/**
 * TrevaForms - Response Viewer & CSV Exporter Controller
 * Manages live response tables, inspection modals, filtering by form, and CSV export.
 */

let selectedFormId = "all";
let selectedTimeframe = "all";

document.addEventListener("DOMContentLoaded", () => {
    renderSidebar("responses");
    initHeaderBar("Response Feed");
    initResponsesPage();
});

function initResponsesPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramFormId = urlParams.get("formId");

    if (paramFormId) {
        selectedFormId = paramFormId;
    }

    populateFormDropdown();
    renderResponsesData();

    document.getElementById("select-response-form")?.addEventListener("change", (e) => {
        selectedFormId = e.target.value;
        renderResponsesData();
    });

    document.getElementById("select-response-timeframe")?.addEventListener("change", (e) => {
        selectedTimeframe = e.target.value;
        renderResponsesData();
    });

    document.getElementById("input-responses-search")?.addEventListener("input", () => {
        renderResponsesData();
    });

    document.getElementById("btn-export-csv")?.addEventListener("click", () => {
        exportCSV(selectedFormId);
    });
}

function populateFormDropdown() {
    const dropdown = document.getElementById("select-response-form");
    if (!dropdown) return;

    const forms = getForms();
    let html = `<option value="all">All Forms (${forms.length})</option>`;
    forms.forEach(f => {
        html += `<option value="${f.id}" ${f.id === selectedFormId ? 'selected' : ''}>${f.title}</option>`;
    });
    dropdown.innerHTML = html;
}

function renderResponsesData() {
    const responses = getResponses();
    const searchQuery = (document.getElementById("input-responses-search")?.value || "").toLowerCase();

    const filtered = responses.filter(r => {
        const matchesForm = selectedFormId === "all" ? true : r.formId === selectedFormId;
        const matchesSearch = (r.respondent && r.respondent.toLowerCase().includes(searchQuery)) ||
                              (r.email && r.email.toLowerCase().includes(searchQuery)) ||
                              (r.formTitle && r.formTitle.toLowerCase().includes(searchQuery));
        
        let matchesTime = true;
        if (selectedTimeframe === "today") {
            const todayStr = new Date().toISOString().split('T')[0];
            matchesTime = r.submittedAt && r.submittedAt.startsWith(todayStr);
        } else if (selectedTimeframe === "week") {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            matchesTime = new Date(r.submittedAt) >= sevenDaysAgo;
        }

        return matchesForm && matchesSearch && matchesTime;
    });

    // Update Stats
    document.getElementById("resp-stat-total").textContent = filtered.length;
    
    const todayCount = responses.filter(r => {
        const todayStr = new Date().toISOString().split('T')[0];
        return r.submittedAt && r.submittedAt.startsWith(todayStr);
    }).length;
    
    document.getElementById("resp-stat-today").textContent = todayCount;

    // Dynamically compute completion rate
    const completedResponses = filtered.filter(r => r.status === "completed" || !r.status).length;
    const completionRatePct = filtered.length > 0
        ? ((completedResponses / filtered.length) * 100).toFixed(1) + "%"
        : "—";
    document.getElementById("resp-stat-completion").textContent = completionRatePct;

    // Render Table
    const tableBody = document.getElementById("responses-table-body");
    const emptyContainer = document.getElementById("responses-empty-state");

    if (!tableBody) return;

    if (filtered.length === 0) {
        tableBody.innerHTML = "";
        if (emptyContainer) emptyContainer.style.display = "block";
        return;
    }

    if (emptyContainer) emptyContainer.style.display = "none";

    tableBody.innerHTML = filtered.map(resp => `
        <tr>
            <td>
                <div style="font-weight: 600;">${resp.respondent || 'Anonymous'}</div>
            </td>
            <td>${resp.email || 'N/A'}</td>
            <td>
                <span class="badge badge-published">${resp.formTitle}</span>
            </td>
            <td>${new Date(resp.submittedAt).toLocaleString()}</td>
            <td><span class="badge badge-success">${resp.status || 'Completed'}</span></td>
            <td style="text-align: right;">
                <button onclick="inspectResponse('${resp.id}')" class="btn btn-secondary btn-sm">Inspect</button>
                <button onclick="handleDeleteResponse('${resp.id}')" class="btn btn-icon btn-sm" style="color: var(--danger);" title="Delete Response">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function inspectResponse(respId) {
    const responses = getResponses();
    const resp = responses.find(r => r.id === respId);
    if (!resp) return;

    const form = getFormById(resp.formId);

    let answersHtml = "";
    if (resp.answers) {
        answersHtml = Object.entries(resp.answers).map(([qKey, aVal]) => {
            let questionText = qKey;
            if (form && form.questions) {
                const foundQ = form.questions.find(q => q.id === qKey);
                if (foundQ) questionText = foundQ.question;
            }

            const formattedVal = Array.isArray(aVal) ? aVal.join(", ") : (typeof aVal === 'object' ? JSON.stringify(aVal) : aVal);

            return `
                <div class="response-detail-item">
                    <div class="response-detail-q">${questionText}</div>
                    <div class="response-detail-a">${formattedVal || '<i>No answer provided</i>'}</div>
                </div>
            `;
        }).join('');
    }

    showModal({
        title: `Response Details - ${resp.respondent}`,
        contentHtml: `
            <div style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1rem;">
                <div><strong>Form:</strong> ${resp.formTitle}</div>
                <div><strong>Email:</strong> ${resp.email}</div>
                <div><strong>Submitted At:</strong> ${new Date(resp.submittedAt).toLocaleString()}</div>
            </div>
            <div class="response-detail-modal-list">
                ${answersHtml}
            </div>
        `,
        confirmText: "Close",
        cancelText: "Delete Response",
        onConfirm: () => {}
    });
}

function handleDeleteResponse(respId) {
    showModal({
        title: "Delete Response?",
        contentHtml: "<p>Are you sure you want to delete this response entry? This cannot be undone.</p>",
        confirmText: "Delete",
        cancelText: "Cancel",
        onConfirm: () => {
            deleteResponse(respId);
            renderResponsesData();
        }
    });
}
