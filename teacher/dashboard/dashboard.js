/**
 * TrevaForms - Registrar Dashboard View Controller
 * Handles metric calculations, Chart.js response graph, templates strip, and recent forms ledger.
 */

document.addEventListener("DOMContentLoaded", () => {
    renderSidebar("dashboard");
    initHeaderBar("Registrar Dashboard");
    initDashboard();
});

function initDashboard() {
    const user = getCurrentUser();
    const greetingEl = document.getElementById("greeting-name");
    if (greetingEl) {
        greetingEl.textContent = user.name ? user.name.split(" ")[0] : "Meet";
    }

    const forms = getForms();
    const responses = getResponses();

    const totalFormsCount = forms.length;
    const totalResponsesCount = responses.length;
    const publishedCount = forms.filter(f => f.status === "published").length;

    document.getElementById("stat-total-forms").textContent = totalFormsCount;
    document.getElementById("stat-total-responses").textContent = totalResponsesCount.toLocaleString();
    document.getElementById("stat-published-forms").textContent = publishedCount;

    // Workspace status text
    const wsLine = document.getElementById("ws-line");
    if (wsLine) {
        wsLine.textContent = `${publishedCount} forms active · 18 responses today · ${forms.filter(f => f.status === 'draft').length} drafts waiting`;
    }

    renderQuickTemplates();
    renderRecentForms(forms);

    document.getElementById("createBtn")?.addEventListener("click", () => {
        openCreateFormModal();
    });

    document.getElementById("input-dashboard-search")?.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = forms.filter(f => f.title.toLowerCase().includes(query) || (f.description && f.description.toLowerCase().includes(query)));
        renderRecentForms(filtered);
    });

    document.getElementById("select-dashboard-filter")?.addEventListener("change", (e) => {
        const status = e.target.value;
        const filtered = status === "all" ? forms : forms.filter(f => f.status === status);
        renderRecentForms(filtered);
    });

    renderActivityChart();
}

function renderQuickTemplates() {
    const container = document.getElementById("quick-templates-list");
    if (!container) return;

    const templates = getTemplates().slice(0, 3);

    let html = `
        <div class="tpl-card blank-card" onclick="openCreateFormModal()">
            <div class="tpl-name">Blank Form</div>
            <div style="font-family: var(--type); font-size: 10px; color: var(--brown2); margin-bottom: 8px;">Start from scratch</div>
            <div class="tpl-plus">+</div>
        </div>
    `;

    templates.forEach(tpl => {
        html += `
            <div class="tpl-card" onclick="useTemplate('${tpl.id}')">
                <div class="tpl-name">${tpl.title}</div>
                <div style="font-family: var(--type); font-size: 10px; color: var(--brown2); margin-bottom: 8px;">${tpl.category}</div>
                <div class="tpl-plus">+</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderRecentForms(formsList) {
    const container = document.getElementById("recent-forms-list");
    if (!container) return;

    if (formsList.length === 0) {
        container.innerHTML = `
            <div class="paper-card" style="text-align: center; padding: 2rem; color: var(--brown2); font-family: var(--merri); font-style: italic;">
                No forms found matching your criteria.
            </div>
        `;
        return;
    }

    const recent = formsList.slice(0, 5);

    container.innerHTML = recent.map(form => `
        <div class="form-row">
            <div class="form-thumb">📄</div>
            <div class="form-info">
                <div class="form-name">${form.title}</div>
                <div class="form-meta">
                    ${form.responseCount || 0} responses · Edited ${new Date(form.updatedAt).toLocaleDateString()}
                </div>
            </div>
            <span class="badge badge-${form.status}">${form.status}</span>
            <div style="display: flex; gap: 4px; margin-left: 10px;">
                <a href="../form-builder/index.html?id=${form.id}" class="btn btn-secondary btn-sm" title="Edit Builder">Edit</a>
                <a href="../form-preview/index.html?id=${form.id}" class="btn btn-outline btn-sm" title="Preview Form">Preview</a>
                <button onclick="copyToClipboard('${form.shareUrl}')" class="btn-icon btn-sm" title="Copy Share Link">📋</button>
            </div>
        </div>
    `).join('');
}

function renderActivityChart() {
    const ctx = document.getElementById("dashboard-activity-chart");
    if (!ctx) return;

    if (window.dashboardChartInstance) {
        window.dashboardChartInstance.destroy();
    }

    // Build last-14-days date labels + per-day counts from real responses
    const responses = getResponses();
    const today = new Date();
    const labels = [];
    const countMap = {};

    for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // "Sep 26"
        labels.push(label);
        countMap[key] = 0;
    }

    responses.forEach(r => {
        if (r.submittedAt) {
            const key = new Date(r.submittedAt).toISOString().split("T")[0];
            if (key in countMap) countMap[key]++;
        }
    });

    const counts = Object.values(countMap);
    const hasAnyData = counts.some(c => c > 0);

    // Show empty-state overlay if no responses at all
    const chartParent = ctx.parentElement;
    const existingOverlay = chartParent?.querySelector(".chart-empty-overlay");
    if (existingOverlay) existingOverlay.remove();

    if (!hasAnyData) {
        const overlay = document.createElement("div");
        overlay.className = "chart-empty-overlay";
        overlay.style.cssText = `
            position: absolute; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            font-family: var(--merri); font-style: italic;
            color: var(--brown2); font-size: 0.85rem; pointer-events: none;
        `;
        overlay.innerHTML = `<span style="font-size:1.5rem;margin-bottom:6px;">📭</span>No activity yet — submit responses to see the chart`;
        if (chartParent && getComputedStyle(chartParent).position === "static") {
            chartParent.style.position = "relative";
        }
        chartParent?.appendChild(overlay);
    }

    window.dashboardChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Submissions',
                data: counts,
                borderColor: '#A65D3B',
                backgroundColor: 'rgba(166, 93, 59, 0.12)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#A65D3B',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(201, 179, 140, 0.4)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}
