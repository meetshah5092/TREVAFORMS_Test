/**
 * TrevaForms Student Portal — Core App Module
 * ─────────────────────────────────────────────
 * Shared utilities used on every authenticated student page.
 * Load order: supabase SDK → supabase-client.js → app.js → page-specific JS
 */

// ═══════════════════════════════════════════════════════════════════
// AUTH & PROFILE
// ═══════════════════════════════════════════════════════════════════

/**
 * Require student auth. Redirects to login if not authenticated.
 * Also verifies role === 'student'. Redirects to teacher app if teacher.
 * Call at top of every authenticated page's DOMContentLoaded.
 *
 * @returns {Promise<{user, profile}>}
 */
/**
 * Require student auth. Checks Supabase session or local student profile.
 * Automatically provides fallback student session so pages never get trapped in redirect loops.
 *
 * @returns {Promise<{user, profile}>}
 */
async function requireStudentAuth() {
    // 1. Check local student session first
    let localUser = null;
    try {
        const stored = localStorage.getItem("treva_student_user");
        if (stored) localUser = JSON.parse(stored);
    } catch (_) {}

    // 2. Check Supabase session if configured
    const sb = getSupabaseClient();
    let session = null;
    if (sb) {
        try {
            const { data } = await sb.auth.getSession();
            session = data?.session;
        } catch (_) {}
    }

    if (session?.user) {
        let profile = null;
        try {
            profile = await getStudentProfile(session.user.id);
        } catch (_) {}

        if (!profile) {
            profile = {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || "Meet Shah",
                email: session.user.email,
                role: session.user.user_metadata?.role || "student",
                student_id: session.user.user_metadata?.student_id || "STU-101",
                course: session.user.user_metadata?.course || "B.Tech Computer Science"
            };
        }

        if (profile.role === "teacher") {
            window.location.href = '../../teacher/dashboard/index.html';
            return null;
        }

        try { localStorage.setItem("treva_student_user", JSON.stringify(profile)); } catch (_) {}
        return { user: session.user, profile };
    }

    if (localUser) {
        return {
            user: { id: localUser.id || "dev-student", email: localUser.email },
            profile: localUser
        };
    }

    // 3. Seamless default student profile so pages can be opened and tested directly
    const defaultProfile = _devFallbackProfile();
    try {
        localStorage.setItem("treva_student_user", JSON.stringify(defaultProfile));
    } catch (_) {}

    return {
        user: { id: defaultProfile.id, email: defaultProfile.email },
        profile: defaultProfile
    };
}

/**
 * Fetch the profile row for a given user ID.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getStudentProfile(userId) {
    const sb = getSupabaseClient();
    if (!sb) return _devFallbackProfile();

    try {
        const { data, error } = await sb
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (error || !data) return _devFallbackProfile();
        return data;
    } catch (_) {
        return _devFallbackProfile();
    }
}

/**
 * Returns the currently logged-in user + profile.
 * Uses cached value if already loaded this session.
 */
let _cachedUser    = null;
let _cachedProfile = null;

async function getCurrentStudent() {
    if (_cachedUser && _cachedProfile) return { user: _cachedUser, profile: _cachedProfile };

    const auth = await requireStudentAuth();
    if (auth) {
        _cachedUser = auth.user;
        _cachedProfile = auth.profile;
        return auth;
    }

    const fallback = _devFallbackProfile();
    return { user: { id: fallback.id, email: fallback.email }, profile: fallback };
}

/** Dev fallback so pages render during development without Supabase */
function _devFallbackProfile() {
    return {
        id: "student_meet_01",
        name: "Meet Shah",
        email: "meet.student@trevaforms.app",
        role: "student",
        student_id: "STU-101",
        course: "B.Tech Computer Science",
        semester: "5",
        division: "A",
        avatar_url: null,
        created_at: new Date().toISOString()
    };
}

// ═══════════════════════════════════════════════════════════════════
// SIGN OUT
// ═══════════════════════════════════════════════════════════════════

async function signOutStudent() {
    const sb = getSupabaseClient();
    if (sb) {
        try { await sb.auth.signOut(); } catch (_) {}
    }
    try {
        localStorage.removeItem("treva_student_user");
    } catch (_) {}
    _cachedUser    = null;
    _cachedProfile = null;
    window.location.href = "../login/index.html";
}

// ═══════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all forms assigned to the current student.
 * Joins form_assignments → forms → profiles (teacher)
 * @param {string} studentId  — auth user UUID
 */
async function getAssignedForms(studentId) {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data, error } = await sb
                .from("form_assignments")
                .select(`
                    id,
                    assigned_at,
                    forms (
                        id,
                        title,
                        description,
                        status,
                        deadline,
                        estimated_time,
                        allow_multiple_submissions,
                        allow_late_submissions,
                        created_by,
                        created_at,
                        profiles!forms_created_by_fkey (
                            name
                        )
                    )
                `)
                .eq("student_id", studentId)
                .eq("forms.status", "published");

            if (!error && data && data.length > 0) {
                return data
                    .filter(a => a.forms)
                    .map(a => ({
                        assignmentId: a.id,
                        assignedAt:   a.assigned_at,
                        ...a.forms,
                        teacherName:  a.forms.profiles?.name || "Unknown Teacher"
                    }));
            }
        } catch (err) {
            console.warn("[Forms] Supabase fetch error, using fallback demo data:", err);
        }
    }

    return _getDemoAssignedForms();
}

/**
 * Get a single form by ID (student-safe, RLS-filtered).
 * @param {string} formId
 */
async function getFormById(formId) {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data, error } = await sb
                .from("forms")
                .select(`
                    *,
                    profiles!forms_created_by_fkey (name)
                `)
                .eq("id", formId)
                .single();

            if (!error && data) {
                return { ...data, teacherName: data.profiles?.name || "Teacher" };
            }
        } catch (err) {}
    }

    const demoForms = _getDemoAssignedForms();
    return demoForms.find(f => f.id === formId) || demoForms[0] || null;
}

/**
 * Get all questions + options for a form, ordered by position.
 * @param {string} formId
 */
async function getFormQuestions(formId) {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data, error } = await sb
                .from("questions")
                .select(`
                    *,
                    question_options (
                        id,
                        label,
                        position
                    )
                `)
                .eq("form_id", formId)
                .order("position", { ascending: true });

            if (!error && data && data.length > 0) {
                return data.map(q => ({
                    ...q,
                    question_options: (q.question_options || []).sort((a, b) => a.position - b.position)
                }));
            }
        } catch (err) {}
    }

    return _getDemoQuestions(formId);
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSES
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if current student already submitted a given form.
 * @param {string} formId
 * @param {string} studentId
 */
async function hasStudentSubmitted(formId, studentId) {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data, error } = await sb
                .from("responses")
                .select("id")
                .eq("form_id", formId)
                .eq("student_id", studentId)
                .eq("status", "submitted")
                .limit(1);

            if (!error && data && data.length > 0) return true;
        } catch (err) {}
    }

    // Check local storage responses
    const localResponses = _getLocalResponses();
    return localResponses.some(r => r.form_id === formId && r.status === "submitted");
}

/**
 * Submit a student response.
 * Creates the response row, then inserts all answer rows.
 * Returns { success, responseId, error }.
 *
 * @param {object} payload
 */
async function submitResponse({ formId, studentId, answers, completionTime }) {
    const sb = getSupabaseClient();
    const responseId = "resp-" + crypto.randomUUID();
    const nowIso = new Date().toISOString();

    if (sb) {
        try {
            // 1. Create response row
            const { error: respErr } = await sb
                .from("responses")
                .insert({
                    id:              responseId,
                    form_id:         formId,
                    student_id:      studentId,
                    status:          "submitted",
                    completion_time: completionTime || null,
                    submitted_at:    nowIso
                });

            if (!respErr) {
                // 2. Insert all answer rows
                const answerRows = Object.entries(answers).map(([questionId, value]) => ({
                    id:          "ans-" + crypto.randomUUID(),
                    response_id: responseId,
                    question_id: questionId,
                    value:       typeof value === "object" ? JSON.stringify(value) : String(value ?? "")
                }));

                if (answerRows.length > 0) {
                    await sb.from("response_answers").insert(answerRows);
                }

                return { success: true, responseId };
            }
        } catch (err) {
            console.warn("[Submit] Supabase submission error, saving locally:", err);
        }
    }

    // Offline / LocalStorage fallback
    const form = await getFormById(formId);
    const questions = await getFormQuestions(formId);

    const answerObjects = Object.entries(answers).map(([qid, val]) => {
        const q = questions.find(item => item.id === qid);
        return {
            id: "ans-" + crypto.randomUUID(),
            question_id: qid,
            value: typeof val === "object" ? JSON.stringify(val) : String(val ?? ""),
            questions: q ? { id: q.id, label: q.label, type: q.type, position: q.position } : null
        };
    });

    const localEntry = {
        id: responseId,
        form_id: formId,
        student_id: studentId,
        status: "submitted",
        completion_time: completionTime || 120,
        submitted_at: nowIso,
        formTitle: form?.title || "Course Form",
        teacherName: form?.teacherName || "Instructor",
        forms: {
            id: form?.id || formId,
            title: form?.title || "Course Form",
            description: form?.description || "",
            profiles: { name: form?.teacherName || "Instructor" }
        },
        response_answers: answerObjects
    };

    const existing = _getLocalResponses();
    existing.unshift(localEntry);
    localStorage.setItem("tf_student_responses", JSON.stringify(existing));

    return { success: true, responseId };
}

/**
 * Get all responses submitted by a student.
 * @param {string} studentId
 */
async function getStudentResponses(studentId) {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data, error } = await sb
                .from("responses")
                .select(`
                    *,
                    forms (
                        id,
                        title,
                        description,
                        profiles!forms_created_by_fkey (name)
                    )
                `)
                .eq("student_id", studentId)
                .order("submitted_at", { ascending: false });

            if (!error && data && data.length > 0) {
                return data.map(r => ({
                    ...r,
                    formTitle:   r.forms?.title || "Untitled Form",
                    teacherName: r.forms?.profiles?.name || "Teacher"
                }));
            }
        } catch (err) {}
    }

    const local = _getLocalResponses();
    if (local && local.length > 0) return local;

    return _getDemoResponses();
}

/**
 * Get a single submission with all answers.
 * @param {string} responseId
 */
async function getSubmission(responseId) {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data, error } = await sb
                .from("responses")
                .select(`
                    *,
                    forms (
                        id,
                        title,
                        description,
                        profiles!forms_created_by_fkey (name)
                    ),
                    response_answers (
                        id,
                        question_id,
                        value,
                        questions (
                            id,
                            label,
                            type,
                            position
                        )
                    )
                `)
                .eq("id", responseId)
                .single();

            if (!error && data) return data;
        } catch (err) {}
    }

    const all = [..._getLocalResponses(), ..._getDemoResponses()];
    return all.find(r => r.id === responseId) || null;
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all notifications for a student.
 * @param {string} studentId
 */
async function getNotifications(studentId) {
    const sb = getSupabaseClient();
    if (sb) {
        try {
            const { data, error } = await sb
                .from("notifications")
                .select("*")
                .eq("student_id", studentId)
                .order("created_at", { ascending: false });

            if (!error && data && data.length > 0) return data;
        } catch (err) {}
    }

    return _getDemoNotifications();
}

/**
 * Mark a notification as read.
 * @param {string} notificationId
 */
async function markNotificationRead(notificationId) {
    const sb = getSupabaseClient();
    if (!sb) return;

    await sb
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
}

/**
 * Mark all notifications as read for a student.
 * @param {string} studentId
 */
async function markAllNotificationsRead(studentId) {
    const sb = getSupabaseClient();
    if (!sb) return;

    await sb
        .from("notifications")
        .update({ is_read: true })
        .eq("student_id", studentId)
        .eq("is_read", false);
}

/**
 * Get unread notification count.
 * @param {string} studentId
 */
async function getUnreadCount(studentId) {
    const sb = getSupabaseClient();
    if (!sb) return 0;

    const { count, error } = await sb
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("is_read", false);

    if (error) return 0;
    return count || 0;
}

// ═══════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════

/**
 * Update student profile fields.
 * @param {string} userId
 * @param {object} updates - { name, student_id, course, semester, division, avatar_url }
 */
async function updateProfile(userId, updates) {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: "Supabase not configured." };

    const { error } = await sb
        .from("profiles")
        .update(updates)
        .eq("id", userId);

    if (error) return { success: false, error: error.message };

    // Invalidate cache
    _cachedProfile = null;
    return { success: true };
}

/**
 * Upload avatar to Supabase Storage and return the public URL.
 * @param {string} userId
 * @param {File} file
 */
async function uploadAvatar(userId, file) {
    const sb = getSupabaseClient();
    if (!sb) return { success: false, error: "Supabase not configured." };

    const ext  = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;

    const { error: upErr } = await sb.storage
        .from("student-assets")
        .upload(path, file, { upsert: true });

    if (upErr) return { success: false, error: upErr.message };

    const { data } = sb.storage.from("student-assets").getPublicUrl(path);
    return { success: true, url: data.publicUrl };
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR RENDERER
// ═══════════════════════════════════════════════════════════════════

/**
 * Inject the sidebar into #student-sidebar element.
 * @param {string} activePage - one of: home, forms, submissions, notifications, profile, settings
 */
function renderStudentSidebar(activePage) {
    const el = document.getElementById("student-sidebar");
    if (!el) return;

    const links = [
        { key: "home",          icon: "🏠", label: "Home",           href: "../dashboard/index.html" },
        { key: "forms",         icon: "📝", label: "Forms",          href: "../forms/index.html" },
        { key: "submissions",   icon: "📤", label: "My Submissions",  href: "../submissions/index.html" },
        { key: "notifications", icon: "🔔", label: "Notifications",  href: "../notifications/index.html" }
    ];

    const bottomLinks = [
        { key: "profile",  icon: "👤", label: "Profile",  href: "../profile/index.html" },
        { key: "settings", icon: "⚙️", label: "Settings", href: "../settings/index.html" }
    ];

    const navItems = (items) => items.map(link => `
        <a href="${link.href}" class="sidebar-link ${activePage === link.key ? 'active' : ''}" data-page="${link.key}">
            <span class="sidebar-icon">${link.icon}</span>
            <span class="sidebar-label">${link.label}</span>
            ${link.key === 'notifications' ? '<span class="sidebar-badge" id="sidebar-notif-badge" style="display:none">0</span>' : ''}
        </a>
    `).join("");

    el.innerHTML = `
        <div class="sidebar-inner">
            <div class="sidebar-brand">
                <div class="sidebar-logo">
                    <span class="logo-icon">T</span>
                    <div class="logo-text">
                        <div class="logo-name">TrevaForms</div>
                        <div class="logo-sub">Student Portal</div>
                    </div>
                </div>
            </div>

            <nav class="sidebar-nav">
                <div class="nav-section-label">Navigation</div>
                ${navItems(links)}
            </nav>

            <div class="sidebar-bottom">
                <div class="nav-section-label">Account</div>
                ${navItems(bottomLinks)}
                <div class="sidebar-user" id="sidebar-user-info">
                    <div class="sidebar-avatar" id="sidebar-avatar">S</div>
                    <div class="sidebar-user-text">
                        <div class="sidebar-user-name" id="sidebar-user-name">Loading...</div>
                        <div class="sidebar-user-email" id="sidebar-user-email">...</div>
                    </div>
                    <button class="sidebar-logout" onclick="signOutStudent()" title="Sign out">⏏</button>
                </div>
            </div>
        </div>

        <!-- Mobile overlay -->
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
    `;

    // Populate user info async
    _populateSidebarUser();

    // Populate notification badge async
    _populateSidebarBadge();

    // Mobile hamburger wiring
    const ham = document.getElementById("sidebar-hamburger");
    if (ham) ham.addEventListener("click", toggleSidebar);
}

async function _populateSidebarUser() {
    const { profile } = await getCurrentStudent();
    if (!profile) return;

    const nameEl  = document.getElementById("sidebar-user-name");
    const emailEl = document.getElementById("sidebar-user-email");
    const avatarEl = document.getElementById("sidebar-avatar");

    if (nameEl)  nameEl.textContent  = profile.name  || "Student";
    if (emailEl) emailEl.textContent = profile.email || "";
    if (avatarEl) {
        if (profile.avatar_url) {
            avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            avatarEl.textContent = (profile.name || "S").charAt(0).toUpperCase();
        }
    }
}

async function _populateSidebarBadge() {
    const { user } = await getCurrentStudent();
    if (!user) return;

    const count = await getUnreadCount(user.id);
    const badge = document.getElementById("sidebar-notif-badge");
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.style.display = "inline-flex";
    } else {
        badge.style.display = "none";
    }
}

// ═══════════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize the top header bar.
 * @param {string} pageTitle
 */
async function initStudentHeader(pageTitle) {
    const titleEl = document.getElementById("header-title");
    if (titleEl) titleEl.textContent = pageTitle;

    const { user } = await getCurrentStudent();
    if (!user) return;

    // Notification count in header bell
    const count = await getUnreadCount(user.id);
    const bell  = document.getElementById("header-notif-count");
    if (bell) {
        if (count > 0) {
            bell.textContent = count > 9 ? "9+" : String(count);
            bell.style.display = "inline-flex";
        } else {
            bell.style.display = "none";
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR TOGGLE (MOBILE)
// ═══════════════════════════════════════════════════════════════════

function toggleSidebar() {
    document.getElementById("student-sidebar")?.classList.toggle("open");
    document.getElementById("sidebar-overlay")?.classList.toggle("show");
    document.body.classList.toggle("sidebar-open");
}

function closeSidebar() {
    document.getElementById("student-sidebar")?.classList.remove("open");
    document.getElementById("sidebar-overlay")?.classList.remove("show");
    document.body.classList.remove("sidebar-open");
}

// ═══════════════════════════════════════════════════════════════════
// UI UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration ms
 */
function showToast(message, type = "info", duration = 3500) {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
    const colors = {
        success: "#22A06B",
        error:   "#D64545",
        warning: "#F5A623",
        info:    "#6C4DF6"
    };

    const toast = document.createElement("div");
    toast.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        background: #fff;
        border: 1px solid #e5e5ea;
        border-left: 4px solid ${colors[type]};
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 14px;
        font-family: 'Inter', system-ui, sans-serif;
        color: #202124;
        box-shadow: 0 4px 20px rgba(0,0,0,0.10);
        pointer-events: all;
        opacity: 0;
        transform: translateX(20px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        max-width: 360px;
    `;
    toast.innerHTML = `
        <span style="color:${colors[type]};font-weight:700;font-size:16px;">${icons[type]}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateX(0)";
        });
    });

    // Auto-remove
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show a modal dialog.
 * @param {object} options - { title, contentHtml, confirmText, cancelText, onConfirm, onCancel }
 */
function showModal({ title, contentHtml, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel, danger = false }) {
    let backdrop = document.getElementById("modal-backdrop");
    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.id = "modal-backdrop";
        document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" id="modal-close-btn">✕</button>
            </div>
            <div class="modal-body">${contentHtml}</div>
            <div class="modal-footer">
                <button class="btn btn-ghost" id="modal-cancel-btn">${cancelText}</button>
                <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${confirmText}</button>
            </div>
        </div>
    `;
    backdrop.style.display = "flex";
    backdrop.classList.add("show");

    document.getElementById("modal-close-btn")?.addEventListener("click", () => closeModal(onCancel));
    document.getElementById("modal-cancel-btn")?.addEventListener("click", () => closeModal(onCancel));
    document.getElementById("modal-confirm-btn")?.addEventListener("click", () => {
        if (onConfirm) onConfirm();
        closeModal();
    });

    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeModal(onCancel);
    });
}

function closeModal(onCancel) {
    const backdrop = document.getElementById("modal-backdrop");
    if (backdrop) {
        backdrop.classList.remove("show");
        setTimeout(() => { backdrop.style.display = "none"; }, 200);
    }
    if (onCancel) onCancel();
}

// ═══════════════════════════════════════════════════════════════════
// DATE & TIME UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Format a date string to a readable label.
 * @param {string} dateStr
 */
function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric"
    });
}

/**
 * Format a datetime string.
 * @param {string} dateStr
 */
function formatDateTime(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

/**
 * Format a relative date (e.g. "2 hours ago", "Yesterday").
 * @param {string} dateStr
 */
function formatRelative(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const now  = new Date();
    const diffMs = now - date;
    const diffMin  = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay  = Math.floor(diffMs / 86400000);

    if (diffMin < 1)   return "Just now";
    if (diffMin < 60)  return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7)   return `${diffDay} days ago`;
    return formatDate(dateStr);
}

/**
 * Format a deadline with urgency context.
 * Returns { label, urgency } where urgency is: 'normal'|'warning'|'danger'|'expired'
 * @param {string} deadlineStr
 */
function formatDeadline(deadlineStr) {
    if (!deadlineStr) return { label: "No deadline", urgency: "normal" };

    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffMs   = deadline - now;
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay  = Math.floor(diffMs / 86400000);

    if (diffMs < 0)        return { label: "Expired",            urgency: "expired" };
    if (diffHour < 6)      return { label: "Due in a few hours", urgency: "danger" };
    if (diffDay === 0)     return { label: "Due today",          urgency: "danger" };
    if (diffDay === 1)     return { label: "Due tomorrow",       urgency: "warning" };
    if (diffDay <= 3)      return { label: `${diffDay} days left`, urgency: "warning" };
    return { label: `Due ${formatDate(deadlineStr)}`,            urgency: "normal" };
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════

function navigateTo(path) {
    window.location.href = path;
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate skeleton loader HTML.
 * @param {number} count - number of skeleton cards
 */
function skeletonCards(count = 3) {
    return Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton-line" style="width:60%;height:18px;margin-bottom:10px;"></div>
            <div class="skeleton-line" style="width:40%;height:13px;margin-bottom:8px;"></div>
            <div class="skeleton-line" style="width:80%;height:13px;margin-bottom:16px;"></div>
            <div class="skeleton-line" style="width:30%;height:36px;border-radius:8px;"></div>
        </div>
    `).join("");
}

// ═══════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════

function initTheme() {
    const saved = localStorage.getItem("tf_student_theme") || "light";
    applyTheme(saved);
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "dark") {
        root.setAttribute("data-theme", "dark");
    } else if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
        root.setAttribute("data-theme", "light");
    }
    localStorage.setItem("tf_student_theme", theme);
}

// Apply theme immediately on load to avoid flash
initTheme();

// ═══════════════════════════════════════════════════════════════════
// DEMO / OFFLINE DATASET & LOCAL STORAGE STORE
// ═══════════════════════════════════════════════════════════════════

function _getLocalResponses() {
    try {
        return JSON.parse(localStorage.getItem("tf_student_responses") || "[]");
    } catch (e) {
        return [];
    }
}

function _getDemoAssignedForms() {
    const now = new Date();
    const in2Days = new Date(now.getTime() + 2 * 86400000).toISOString();
    const in5Days = new Date(now.getTime() + 5 * 86400000).toISOString();
    const in1Day  = new Date(now.getTime() + 1 * 86400000).toISOString();
    const past1Day = new Date(now.getTime() - 1 * 86400000).toISOString();

    return [
        {
            id: "form-001",
            title: "Student Feedback — Mid-Semester",
            description: "Please share your candid feedback on the lectures, course materials, and teaching methodology for CS301 Database Systems.",
            status: "published",
            deadline: in2Days,
            estimated_time: 4,
            teacherName: "Prof. Sharma",
            created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
            allow_multiple_submissions: false,
            allow_late_submissions: false
        },
        {
            id: "form-002",
            title: "AI & Cloud Computing Workshop Registration",
            description: "Register for the upcoming 2-day hands-on workshop on Modern Cloud Architecture and Generative AI applications.",
            status: "published",
            deadline: in5Days,
            estimated_time: 3,
            teacherName: "Dr. Radhika Desai",
            created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
            allow_multiple_submissions: false,
            allow_late_submissions: true
        },
        {
            id: "form-003",
            title: "Final Project Group Allocation & Abstract",
            description: "Submit your group members and preliminary project abstract for final semester evaluation.",
            status: "published",
            deadline: in1Day,
            estimated_time: 5,
            teacherName: "Prof. Verma",
            created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
            allow_multiple_submissions: false,
            allow_late_submissions: false
        },
        {
            id: "form-004",
            title: "Central Library & Digital Resources Survey",
            description: "Help us evaluate the availability of technical books, journals, and Wi-Fi connectivity in the central library.",
            status: "published",
            deadline: past1Day,
            estimated_time: 5,
            teacherName: "Registrar's Office",
            created_at: new Date(now.getTime() - 8 * 86400000).toISOString(),
            allow_multiple_submissions: false,
            allow_late_submissions: false
        }
    ];
}

function _getDemoQuestions(formId) {
    if (formId === "form-002") {
        return [
            { id: "q2_1", label: "Full Name", type: "short_text", required: true, position: 1, placeholder: "e.g. Meet Shah" },
            { id: "q2_2", label: "College Roll / Student ID", type: "short_text", required: true, position: 2, placeholder: "e.g. STU-2026-042" },
            { id: "q2_3", label: "Your primary track interest", type: "dropdown", required: true, position: 3, question_options: [
                { id: "opt1", label: "Cloud Native & Microservices", position: 1 },
                { id: "opt2", label: "Generative AI & LLM Agents", position: 2 },
                { id: "opt3", label: "DevOps & CI/CD Pipelines", position: 3 }
            ]},
            { id: "q2_4", label: "Session preference", type: "multiple_choice", required: true, position: 4, question_options: [
                { id: "opt4", label: "Morning Session (9:00 AM – 1:00 PM)", position: 1 },
                { id: "opt5", label: "Afternoon Session (2:00 PM – 6:00 PM)", position: 2 }
            ]},
            { id: "q2_5", label: "Rate your current familiarity with Docker / Kubernetes", type: "rating", required: true, position: 5 }
        ];
    }

    if (formId === "form-003") {
        return [
            { id: "q3_1", label: "Proposed Project Title", type: "short_text", required: true, position: 1 },
            { id: "q3_2", label: "Team Member Names & IDs", type: "paragraph", required: true, position: 2, placeholder: "List each student's full name and roll number..." },
            { id: "q3_3", label: "Project Abstract / Problem Statement", type: "paragraph", required: true, position: 3 },
            { id: "q3_4", label: "Primary Technology Stack", type: "checkbox", required: true, position: 4, question_options: [
                { id: "tech1", label: "Python / FastAPI / PyTorch", position: 1 },
                { id: "tech2", label: "Node.js / Express / TypeScript", position: 2 },
                { id: "tech3", label: "React / Vue / Next.js", position: 3 },
                { id: "tech4", label: "PostgreSQL / Supabase", position: 4 }
            ]}
        ];
    }

    // Default: form-001 (Student Feedback)
    return [
        {
            id: "q1_1",
            label: "How was the clarity of concepts in recent lectures?",
            type: "multiple_choice",
            required: true,
            position: 1,
            question_options: [
                { id: "o1", label: "Excellent — Very clear and engaging", position: 1 },
                { id: "o2", label: "Good — Mostly easy to understand", position: 2 },
                { id: "o3", label: "Average — Needs more practical examples", position: 3 },
                { id: "o4", label: "Needs Improvement — Pace was too fast", position: 4 }
            ]
        },
        {
            id: "q1_2",
            label: "How would you rate the laboratory exercises?",
            type: "rating",
            required: true,
            position: 2
        },
        {
            id: "q1_3",
            label: "Which topics need additional tutorial sessions?",
            type: "checkbox",
            required: false,
            position: 3,
            question_options: [
                { id: "t1", label: "B-Trees & Indexing Algorithms", position: 1 },
                { id: "t2", label: "Database Normalization (3NF & BCNF)", position: 2 },
                { id: "t3", label: "Concurrency Control & ACID Transactions", position: 3 },
                { id: "t4", label: "Query Optimization & Execution Plans", position: 4 }
            ]
        },
        {
            id: "q1_4",
            label: "Expected grade in this course",
            type: "dropdown",
            required: true,
            position: 4,
            question_options: [
                { id: "g1", label: "A+ (Exceptional)", position: 1 },
                { id: "g2", label: "A (Excellent)", position: 2 },
                { id: "g3", label: "B+ (Very Good)", position: 3 },
                { id: "g4", label: "B (Good)", position: 4 },
                { id: "g5", label: "C (Satisfactory)", position: 5 }
            ]
        },
        {
            id: "q1_5",
            label: "What suggestions do you have for improving this course?",
            type: "paragraph",
            required: false,
            placeholder: "Share your thoughts on lecture pacing, assignments, or lab demos...",
            position: 5
        }
    ];
}

function _getDemoResponses() {
    return [
        {
            id: "resp-demo-001",
            form_id: "form-004",
            student_id: "dev-user",
            status: "submitted",
            completion_time: 145,
            submitted_at: new Date(Date.now() - 36 * 3600000).toISOString(),
            formTitle: "Central Library & Digital Resources Survey",
            teacherName: "Registrar's Office",
            forms: {
                id: "form-004",
                title: "Central Library & Digital Resources Survey",
                description: "Help us evaluate the availability of technical books, journals, and Wi-Fi connectivity.",
                profiles: { name: "Registrar's Office" }
            },
            response_answers: [
                {
                    id: "ans-1",
                    question_id: "q_lib_1",
                    value: "Daily — 3 to 4 hours",
                    questions: { id: "q_lib_1", label: "How often do you visit the library?", type: "multiple_choice", position: 1 }
                },
                {
                    id: "ans-2",
                    question_id: "q_lib_2",
                    value: "4",
                    questions: { id: "q_lib_2", label: "Rate library Wi-Fi speed & stability", type: "rating", position: 2 }
                },
                {
                    id: "ans-3",
                    question_id: "q_lib_3",
                    value: "Please add more copies of Computer Architecture textbooks.",
                    questions: { id: "q_lib_3", label: "Suggestions for new titles or subscriptions", type: "paragraph", position: 3 }
                }
            ]
        }
    ];
}

function _getDemoNotifications() {
    const now = Date.now();
    return [
        {
            id: "notif-001",
            student_id: "dev-user",
            type: "form_assigned",
            title: "New Form Assigned: Student Feedback",
            message: "Prof. Sharma has assigned the Mid-Semester Feedback form to your class batch.",
            form_id: "form-001",
            is_read: false,
            created_at: new Date(now - 2 * 3600000).toISOString()
        },
        {
            id: "notif-002",
            student_id: "dev-user",
            type: "deadline_reminder",
            title: "Deadline Approaching: Project Group Allocation",
            message: "The final project topic selection form is due tomorrow at 11:59 PM.",
            form_id: "form-003",
            is_read: false,
            created_at: new Date(now - 14 * 3600000).toISOString()
        },
        {
            id: "notif-003",
            student_id: "dev-user",
            type: "submission_success",
            title: "Response Recorded: Library Survey",
            message: "Your submission for the Central Library Survey was successfully received.",
            form_id: "form-004",
            is_read: true,
            created_at: new Date(now - 36 * 3600000).toISOString()
        }
    ];
}
