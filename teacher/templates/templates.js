/**
 * TrevaForms - Template Marketplace Controller
 * Manages category pills, search filter, template preview modal, and template cloning.
 */

let activeCategory = "All";

document.addEventListener("DOMContentLoaded", () => {
    renderSidebar("templates");
    initHeaderBar("Template Library");
    initTemplatesPage();
});

function initTemplatesPage() {
    renderTemplatesList();

    // Category pills setup
    document.querySelectorAll(".cat-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeCategory = pill.dataset.category;
            renderTemplatesList();
        });
    });

    // Search input
    document.getElementById("input-templates-search")?.addEventListener("input", () => {
        renderTemplatesList();
    });
}

function renderTemplatesList() {
    const templates = getTemplates();
    const searchQuery = (document.getElementById("input-templates-search")?.value || "").toLowerCase();

    const filtered = templates.filter(tpl => {
        const matchesCat = activeCategory === "All" ? true : tpl.category === activeCategory;
        const matchesSearch = tpl.title.toLowerCase().includes(searchQuery) || tpl.description.toLowerCase().includes(searchQuery);
        return matchesCat && matchesSearch;
    });

    const container = document.getElementById("templates-container");
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem 1rem; grid-column: 1 / -1;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
                <h3 style="margin-bottom: 0.5rem;">No templates found</h3>
                <p style="color: var(--muted);">Try selecting another category or clearing your search.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(tpl => `
        <div class="template-card">
            <div>
                <div class="template-card-header">
                    <div class="template-card-icon">🎨</div>
                    <span class="badge badge-published">${tpl.category}</span>
                </div>
                <h3 class="template-card-title">${tpl.title}</h3>
                <p class="template-card-desc">${tpl.description}</p>
                <div style="font-size: 0.8rem; color: var(--muted); margin-bottom: 1rem;">
                    📋 ${tpl.questions ? tpl.questions.length : 0} Questions included
                </div>
            </div>

            <div class="template-card-footer">
                <button onclick="useTemplate('${tpl.id}')" class="btn btn-primary btn-sm" style="flex: 1;">
                    Use Template
                </button>
                <button onclick="previewTemplateModal('${tpl.id}')" class="btn btn-secondary btn-sm">
                    Preview
                </button>
            </div>
        </div>
    `).join('');
}

function previewTemplateModal(tplId) {
    const templates = getTemplates();
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;

    const questionsListHtml = (tpl.questions || []).map((q, idx) => `
        <div style="padding: 0.75rem; background: var(--surface-hover); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
            <div style="font-weight: 600; font-size: 0.9rem;">${idx + 1}. ${q.question}</div>
            <div style="font-size: 0.8rem; color: var(--muted); margin-top: 0.2rem;">Type: ${q.type}</div>
        </div>
    `).join('');

    showModal({
        title: `Template Preview: ${tpl.title}`,
        contentHtml: `
            <p style="color: var(--muted); margin-bottom: 1rem;">${tpl.description}</p>
            <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem;">Questions Structure:</h4>
            <div style="max-height: 280px; overflow-y: auto;">
                ${questionsListHtml}
            </div>
        `,
        confirmText: "Use This Template",
        cancelText: "Close",
        onConfirm: () => {
            useTemplate(tpl.id);
        }
    });
}
