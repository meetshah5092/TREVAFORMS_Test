/**
 * TrevaForms Student Portal — Submissions & Detail Controller
 */

let allSubmissions = [];
let activeSubTab = "all";
let subSearchQuery = "";
let subSortBy = "newest";

document.addEventListener("DOMContentLoaded", async () => {
    renderStudentSidebar("submissions");

    const auth = await requireStudentAuth();
    if (!auth) return;

    const urlParams = new URLSearchParams(window.location.search);
    const detailId = urlParams.get("id");

    if (detailId) {
        // We are on submission.html (Detail View)
        initStudentHeader("Submission Details");
        await loadSubmissionDetail(detailId);
    } else {
        // We are on ../submissions/ (List View)
        initStudentHeader("My Submissions");
        setupSubmissionsListeners();
        await loadSubmissionsList(auth.user, auth.profile);
    }
});

// ═══════════════════════════════════════════════════════
// List View Logic
// ═══════════════════════════════════════════════════════

function setupSubmissionsListeners() {
    // Tabs
    document.querySelectorAll("#subs-tabs .tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#subs-tabs .tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeSubTab = btn.dataset.tab;
            renderSubmissionsList();
        });
    });

    // Search
    document.getElementById("input-subs-search")?.addEventListener("input", (e) => {
        subSearchQuery = e.target.value.toLowerCase().trim();
        renderSubmissionsList();
    });

    // Sort
    document.getElementById("select-subs-sort")?.addEventListener("change", (e) => {
        subSortBy = e.target.value;
        renderSubmissionsList();
    });
}

async function loadSubmissionsList(user, profile) {
    const studentId = user ? user.id : profile?.id || "demo-student";
    const responses = await getStudentResponses(studentId);

    allSubmissions = responses;

    // Update Chips
    updateStatsChips(responses);

    // Render list
    renderSubmissionsList();
}

function updateStatsChips(responses) {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let countToday = 0;
    let countWeek = 0;
    let countMonth = 0;

    responses.forEach(r => {
        const subDate = new Date(r.submitted_at);
        if (r.submitted_at && r.submitted_at.startsWith(todayStr)) countToday++;
        if (subDate >= startOfWeek) countWeek++;
        if (subDate >= startOfMonth) countMonth++;
    });

    const totalEl = document.getElementById("chip-total-subs");
    const weekEl = document.getElementById("chip-week-subs");
    const monthEl = document.getElementById("chip-month-subs");

    if (totalEl) totalEl.textContent = responses.length;
    if (weekEl) weekEl.textContent = countWeek;
    if (monthEl) monthEl.textContent = countMonth;
}

function renderSubmissionsList() {
    const container = document.getElementById("submissions-list-container");
    if (!container) return;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter by Tab
    let filtered = allSubmissions.filter(r => {
        const d = new Date(r.submitted_at);
        if (activeSubTab === "today") return r.submitted_at && r.submitted_at.startsWith(todayStr);
        if (activeSubTab === "week") return d >= startOfWeek;
        if (activeSubTab === "month") return d >= startOfMonth;
        return true; // 'all'
    });

    // Search filter
    if (subSearchQuery) {
        filtered = filtered.filter(r => {
            const title = (r.formTitle || "").toLowerCase();
            const teacher = (r.teacherName || "").toLowerCase();
            return title.includes(subSearchQuery) || teacher.includes(subSearchQuery);
        });
    }

    // Sort
    filtered.sort((a, b) => {
        if (subSortBy === "oldest") {
            return new Date(a.submitted_at) - new Date(b.submitted_at);
        } else if (subSortBy === "title") {
            return (a.formTitle || "").localeCompare(b.formTitle || "");
        } else {
            return new Date(b.submitted_at) - new Date(a.submitted_at);
        }
    });

    // Empty state
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state card" style="padding: 50px 20px;">
                <span class="empty-state-icon">📭</span>
                <div class="empty-state-title">No submissions found</div>
                <div class="empty-state-message">You have not submitted any forms matching this filter.</div>
                <a href="../forms/index.html" class="btn btn-secondary btn-sm">Explore Pending Forms</a>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(r => `
        <div class="submission-item-card">
            <div class="sub-icon-badge">✓</div>
            <div class="sub-main-info">
                <h3 class="sub-title">${escapeHtml(r.formTitle || "Untitled Form")}</h3>
                <div class="sub-meta">
                    <span>👤 ${escapeHtml(r.teacherName || "Instructor")}</span>
                    <span>•</span>
                    <span>Submitted ${formatDateTime(r.submitted_at)}</span>
                    ${r.completion_time ? `<span>• Completed in ${Math.round(r.completion_time / 60) || 1} min</span>` : ''}
                </div>
            </div>
            <div class="sub-actions">
                <span class="badge badge-completed">✓ Recorded</span>
                <a href="../submissions/detail.html?id=${r.id}" class="btn btn-secondary btn-sm">
                    Inspect Answers
                </a>
            </div>
        </div>
    `).join("");
}

// ═══════════════════════════════════════════════════════
// Detail View Logic
// ═══════════════════════════════════════════════════════

async function loadSubmissionDetail(responseId) {
    const mount = document.getElementById("submission-detail-mount");
    if (!mount) return;

    const submission = await getSubmission(responseId);

    if (!submission) {
        mount.innerHTML = `
            <div class="card empty-state" style="padding: 40px;">
                <span class="empty-state-icon">⚠️</span>
                <div class="empty-state-title">Submission Not Found</div>
                <div class="empty-state-message">We couldn't retrieve the details for this submission ID.</div>
                <a href="../submissions/index.html" class="btn btn-secondary btn-sm">Back to Submissions</a>
            </div>
        `;
        return;
    }

    const formTitle = submission.forms?.title || "Form Submission";
    const teacherName = submission.forms?.profiles?.name || "Instructor";
    const answers = submission.response_answers || [];

    // Build Q&A list
    let answersHtml = "";
    if (answers.length === 0) {
        answersHtml = `
            <div style="padding: 24px; text-align: center; color: var(--muted); font-size: 14px;">
                No individual answer records found for this response entry.
            </div>
        `;
    } else {
        // Sort answers by question position if available
        answers.sort((a, b) => (a.questions?.position || 0) - (b.questions?.position || 0));

        answersHtml = `
            <div class="answers-list">
                ${answers.map((ans, idx) => {
                    const qLabel = ans.questions?.label || `Question ${idx + 1}`;
                    let val = ans.value || "—";

                    // Handle JSON array/object values cleanly
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) {
                            val = parsed.join(", ");
                        }
                    } catch (e) {}

                    return `
                        <div class="answer-item-row">
                            <div class="answer-question-label">${idx + 1}. ${escapeHtml(qLabel)}</div>
                            <div class="answer-value-text">${escapeHtml(val)}</div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    mount.innerHTML = `
        <div class="detail-card">
            <div class="detail-header-block">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:8px;">
                    <h1 class="detail-form-title">${escapeHtml(formTitle)}</h1>
                    <span class="badge badge-completed" style="font-size:13px; padding:4px 12px;">✓ Verified Submission</span>
                </div>

                <div class="detail-meta-row">
                    <span><strong>Instructor:</strong> ${escapeHtml(teacherName)}</span>
                    <span>•</span>
                    <span><strong>Submitted:</strong> ${formatDateTime(submission.submitted_at)}</span>
                    ${submission.completion_time ? `<span>• <strong>Duration:</strong> ${Math.round(submission.completion_time / 60) || 1} min</span>` : ''}
                </div>
            </div>

            <div style="margin-top: 10px;">
                <h3 style="font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 16px;">
                    Your Recorded Answers (${answers.length})
                </h3>
                ${answersHtml}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
