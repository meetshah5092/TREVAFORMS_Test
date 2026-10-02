/**
 * TrevaForms Student Portal — Forms Controller
 */

let allAssignedForms = [];
let studentResponses = [];
let activeTab = "all";
let searchQuery = "";
let sortBy = "newest";

document.addEventListener("DOMContentLoaded", async () => {
    renderStudentSidebar("forms");
    initStudentHeader("Assigned Forms");

    const auth = await requireStudentAuth();
    if (!auth) return;

    // Check URL query parameters (e.g. ?q=search_term or ?tab=pending)
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get("q");
    if (initialQuery) {
        searchQuery = initialQuery.toLowerCase();
        const searchInput = document.getElementById("input-forms-search");
        if (searchInput) searchInput.value = initialQuery;
    }

    const initialTab = urlParams.get("tab");
    if (initialTab && ["all", "pending", "completed", "expired"].includes(initialTab)) {
        activeTab = initialTab;
        document.querySelectorAll("#forms-tabs .tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tab === activeTab);
        });
    }

    // Attach listeners
    setupEventListeners();

    // Load data
    await loadFormsData(auth.user, auth.profile);
});

function setupEventListeners() {
    // Tabs
    document.querySelectorAll("#forms-tabs .tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#forms-tabs .tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeTab = btn.dataset.tab;
            renderFormsList();
        });
    });

    // Search
    document.getElementById("input-forms-search")?.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFormsList();
    });

    // Sort
    document.getElementById("select-forms-sort")?.addEventListener("change", (e) => {
        sortBy = e.target.value;
        renderFormsList();
    });
}

async function loadFormsData(user, profile) {
    const studentId = user ? user.id : profile?.id || "demo-student";

    const [forms, responses] = await Promise.all([
        getAssignedForms(studentId),
        getStudentResponses(studentId)
    ]);

    allAssignedForms = forms;
    studentResponses = responses;

    // Update Counts in tabs
    updateTabCounts();

    // Render cards
    renderFormsList();
}

function updateTabCounts() {
    const now = new Date();
    const submittedMap = new Map();
    studentResponses.forEach(r => {
        if (r.status === "submitted") submittedMap.set(r.form_id, r.id);
    });

    let countPending = 0;
    let countCompleted = 0;
    let countExpired = 0;

    allAssignedForms.forEach(form => {
        const isSubmitted = submittedMap.has(form.id);
        const isPastDeadline = form.deadline && new Date(form.deadline) < now;

        if (isSubmitted) {
            countCompleted++;
        } else if (isPastDeadline && !form.allow_late_submissions) {
            countExpired++;
        } else {
            countPending++;
        }
    });

    document.getElementById("count-all").textContent = allAssignedForms.length;
    document.getElementById("count-pending").textContent = countPending;
    document.getElementById("count-completed").textContent = countCompleted;
    document.getElementById("count-expired").textContent = countExpired;
}

function renderFormsList() {
    const container = document.getElementById("forms-grid-container");
    if (!container) return;

    const now = new Date();
    const submittedMap = new Map();
    studentResponses.forEach(r => {
        if (r.status === "submitted") submittedMap.set(r.form_id, r.id);
    });

    // 1. Filter by Tab
    let filtered = allAssignedForms.filter(form => {
        const isSubmitted = submittedMap.has(form.id);
        const isPastDeadline = form.deadline && new Date(form.deadline) < now;

        if (activeTab === "pending") {
            return !isSubmitted && (!isPastDeadline || form.allow_late_submissions);
        } else if (activeTab === "completed") {
            return isSubmitted;
        } else if (activeTab === "expired") {
            return !isSubmitted && isPastDeadline && !form.allow_late_submissions;
        }
        return true; // 'all'
    });

    // 2. Filter by Search Query
    if (searchQuery) {
        filtered = filtered.filter(f => {
            const title = (f.title || "").toLowerCase();
            const teacher = (f.teacherName || "").toLowerCase();
            const desc = (f.description || "").toLowerCase();
            return title.includes(searchQuery) || teacher.includes(searchQuery) || desc.includes(searchQuery);
        });
    }

    // 3. Sort
    filtered.sort((a, b) => {
        if (sortBy === "deadline") {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        } else if (sortBy === "title") {
            return (a.title || "").localeCompare(b.title || "");
        } else {
            // Newest
            const dateA = new Date(a.created_at || a.assignedAt || 0);
            const dateB = new Date(b.created_at || b.assignedAt || 0);
            return dateB - dateA;
        }
    });

    // 4. Empty States
    if (filtered.length === 0) {
        let emptyTitle = "No forms found";
        let emptyMsg = "Try adjusting your search filters or check another category.";
        let emptyIcon = "🔍";

        if (activeTab === "pending") {
            emptyIcon = "🎉";
            emptyTitle = "No pending forms!";
            emptyMsg = "You're all caught up on your course submissions.";
        } else if (activeTab === "completed") {
            emptyIcon = "📋";
            emptyTitle = "No completed forms yet";
            emptyMsg = "Once you submit a form, your response will be recorded here.";
        } else if (activeTab === "expired") {
            emptyIcon = "⏰";
            emptyTitle = "No expired forms";
            emptyMsg = "Great work! You haven't missed any submission deadlines.";
        }

        container.innerHTML = `
            <div class="empty-state card" style="grid-column: 1 / -1; padding: 60px 20px;">
                <span class="empty-state-icon">${emptyIcon}</span>
                <div class="empty-state-title">${emptyTitle}</div>
                <div class="empty-state-message">${emptyMsg}</div>
                ${activeTab !== 'all' ? '<button class="btn btn-secondary btn-sm" onclick="setTab(\'all\')">Show All Forms</button>' : ''}
            </div>
        `;
        return;
    }

    // 5. Render Form Cards
    container.innerHTML = filtered.map(form => {
        const isSubmitted = submittedMap.has(form.id);
        const responseId = submittedMap.get(form.id);
        const isPastDeadline = form.deadline && new Date(form.deadline) < now;
        const deadlineInfo = formatDeadline(form.deadline);
        const estTime = form.estimated_time ? `~${form.estimated_time} min` : "~3 min";

        let statusClass = "status-pending";
        let statusBadge = '<span class="badge badge-pending">Pending</span>';
        let actionBtn = `
            <a href="../fill-form/index.html?id=${form.id}" class="btn btn-primary btn-sm">
                Fill Form →
            </a>
        `;

        if (isSubmitted) {
            statusClass = "status-completed";
            statusBadge = '<span class="badge badge-completed">✓ Completed</span>';
            actionBtn = `
                <a href="../submissions/detail.html?id=${responseId}" class="btn btn-secondary btn-sm">
                    View Response
                </a>
            `;
        } else if (isPastDeadline && !form.allow_late_submissions) {
            statusClass = "status-expired";
            statusBadge = '<span class="badge badge-expired">Expired</span>';
            actionBtn = `
                <button class="btn btn-ghost btn-sm" disabled style="opacity:0.6; cursor:not-allowed;">
                    Closed
                </button>
            `;
        }

        return `
            <div class="student-form-card ${statusClass}">
                <div class="sfc-header">
                    <h3 class="sfc-title">${escapeHtml(form.title)}</h3>
                    ${statusBadge}
                </div>

                <div class="sfc-teacher">
                    <span>👤</span> ${escapeHtml(form.teacherName || "Instructor")}
                </div>

                <p class="sfc-desc">${escapeHtml(form.description || "No description provided.")}</p>

                <div class="sfc-meta">
                    <span class="deadline-tag deadline-${deadlineInfo.urgency}">
                        ${deadlineInfo.label}
                    </span>
                    <span class="meta-chip">⏱ ${estTime}</span>
                </div>

                <div class="sfc-footer">
                    <span style="font-size:12px; color:var(--muted);">
                        ${isSubmitted ? 'Submitted' : 'Assigned: ' + formatDate(form.created_at || form.assignedAt)}
                    </span>
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join("");
}

function setTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll("#forms-tabs .tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    renderFormsList();
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
