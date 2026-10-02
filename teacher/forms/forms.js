/**
 * TrevaForms - My Forms View Controller
 * Manages form listings, search, tab filtering, view mode toggles, duplicate, archive, delete modal.
 */

let currentTab = "all";
let currentViewMode = "grid";

document.addEventListener("DOMContentLoaded", () => {
    renderSidebar("forms");
    initHeaderBar("My Forms");
    initFormsPage();
});

function initFormsPage() {
    renderFormsList();

    // Tabs setup
    document.querySelectorAll(".tab-item").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab-item").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentTab = tab.dataset.tab;
            renderFormsList();
        });
    });

    // View toggle setup
    document.getElementById("btn-view-grid")?.addEventListener("click", () => {
        currentViewMode = "grid";
        document.getElementById("btn-view-grid").classList.add("btn-primary");
        document.getElementById("btn-view-grid").classList.remove("btn-secondary");
        document.getElementById("btn-view-table").classList.add("btn-secondary");
        document.getElementById("btn-view-table").classList.remove("btn-primary");
        renderFormsList();
    });

    document.getElementById("btn-view-table")?.addEventListener("click", () => {
        currentViewMode = "table";
        document.getElementById("btn-view-table").classList.add("btn-primary");
        document.getElementById("btn-view-table").classList.remove("btn-secondary");
        document.getElementById("btn-view-grid").classList.add("btn-secondary");
        document.getElementById("btn-view-grid").classList.remove("btn-primary");
        renderFormsList();
    });

    // Search input
    document.getElementById("input-forms-search")?.addEventListener("input", () => {
        renderFormsList();
    });
}

function renderFormsList() {
    const allForms = getForms();
    const searchQuery = (document.getElementById("input-forms-search")?.value || "").toLowerCase();

    let filtered = allForms.filter(f => {
        const matchesTab = currentTab === "all" ? true : f.status === currentTab;
        const matchesSearch = f.title.toLowerCase().includes(searchQuery) || (f.description && f.description.toLowerCase().includes(searchQuery));
        return matchesTab && matchesSearch;
    });

    const container = document.getElementById("forms-container");
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem 1rem; grid-column: 1 / -1;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📭</div>
                <h3 style="margin-bottom: 0.5rem;">No forms found</h3>
                <p style="color: var(--muted); margin-bottom: 1.5rem;">Try adjusting your search query or tab filter.</p>
                <a href="../form-builder/index.htmlindex.html" class="btn btn-primary">+ Create New Form</a>
            </div>
        `;
        return;
    }

    if (currentViewMode === "grid") {
        container.className = "forms-cards-grid";
        container.innerHTML = filtered.map(form => `
            <div class="form-card-full">
                <div>
                    <div class="form-card-header">
                        <span class="badge badge-${form.status}">${form.status}</span>
                        <div style="display: flex; gap: 0.25rem;">
                            <button onclick="handleDuplicate('${form.id}')" class="btn-icon btn-sm" title="Duplicate">📋</button>
                            <button onclick="handleToggleArchive('${form.id}')" class="btn-icon btn-sm" title="${form.status === 'archived' ? 'Unarchive' : 'Archive'}">📦</button>
                            <button onclick="handleDeleteModal('${form.id}')" class="btn-icon btn-sm" style="color: var(--danger);" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <h3 class="form-card-title">${form.title}</h3>
                    <p class="form-card-desc">${form.description || "No description provided."}</p>
                </div>

                <div>
                    <div class="form-card-meta">
                        <span>📥 ${form.responseCount || 0} responses</span>
                        <span>Edited ${new Date(form.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div class="form-card-actions">
                        <a href="../form-builder/index.html?id=${form.id}" class="btn btn-primary btn-sm" style="flex: 1;">Edit Builder</a>
                        <a href="../form-preview/index.html?id=${form.id}" class="btn btn-secondary btn-sm" title="Preview Form">Preview</a>
                        <a href="responses.html?formId=${form.id}" class="btn btn-secondary btn-sm" title="View Responses">Responses</a>
                        <button onclick="copyToClipboard('${form.shareUrl}')" class="btn btn-icon btn-sm" title="Copy Share Link">🔗</button>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.className = "data-table-container";
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Form Name</th>
                        <th>Status</th>
                        <th>Responses</th>
                        <th>Last Modified</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(form => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${form.title}</div>
                                <div style="font-size: 0.8rem; color: var(--muted);">${form.description || ''}</div>
                            </td>
                            <td><span class="badge badge-${form.status}">${form.status}</span></td>
                            <td>${form.responseCount || 0}</td>
                            <td>${new Date(form.updatedAt).toLocaleDateString()}</td>
                            <td style="text-align: right;">
                                <div style="display: inline-flex; gap: 0.35rem;">
                                    <a href="../form-builder/index.html?id=${form.id}" class="btn btn-primary btn-sm">Edit</a>
                                    <a href="../form-preview/index.html?id=${form.id}" class="btn btn-secondary btn-sm">Preview</a>
                                    <a href="responses.html?formId=${form.id}" class="btn btn-secondary btn-sm">Responses</a>
                                    <button onclick="handleDuplicate('${form.id}')" class="btn btn-icon btn-sm" title="Duplicate">📋</button>
                                    <button onclick="handleDeleteModal('${form.id}')" class="btn btn-icon btn-sm" style="color: var(--danger);" title="Delete">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

function handleDuplicate(formId) {
    duplicateForm(formId);
    renderFormsList();
}

function handleToggleArchive(formId) {
    const form = getFormById(formId);
    if (!form) return;

    form.status = form.status === "archived" ? "published" : "archived";
    saveForm(form);
    showToast(`Form marked as ${form.status}`, "info");
    renderFormsList();
}

function handleDeleteModal(formId) {
    const form = getFormById(formId);
    if (!form) return;

    showModal({
        title: "Delete Form?",
        contentHtml: `<p>Are you sure you want to delete <strong>"${form.title}"</strong>? This will also remove all associated responses. This action cannot be undone.</p>`,
        confirmText: "Delete Permanently",
        cancelText: "Cancel",
        onConfirm: () => {
            deleteForm(formId);
            renderFormsList();
        }
    });
}
