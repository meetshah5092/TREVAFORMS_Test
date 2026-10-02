/**
 * TrevaForms — Python Backend API Client
 * ─────────────────────────────────────────
 * HTML pages use this to talk to the FastAPI Python backend (main.py).
 * 
 * The Python server must be running:
 *   cd AuraByte-TrevaForms
 *   uvicorn main:app --reload --port 8000
 *
 * This client is used ALONGSIDE supabase-client.js.
 * - Auth (login/signup/session)  → Supabase JS SDK directly (browser handles session)
 * - Data CRUD (forms, responses) → Python API (python server → supabase-py → Supabase)
 */

const API_BASE = "http://localhost:8000";

/**
 * Core fetch wrapper — attaches auth token automatically.
 * @param {string} path     e.g. "/api/forms"
 * @param {object} options  fetch options (method, body, etc.)
 */
async function apiFetch(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

    // Attach Supabase session token if available
    try {
        const sb = getSupabaseClient();
        if (sb) {
            const { data: { session } } = await sb.auth.getSession();
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }
        }
    } catch (_) {}

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error ${res.status}`);
    }

    return res.json();
}

// ──────────────────────────────────────────────────────────────────────────────
// HEALTH
// ──────────────────────────────────────────────────────────────────────────────

/** Check if Python backend is running */
async function apiHealth() {
    try {
        return await apiFetch("/health");
    } catch {
        return { status: "offline" };
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// AUTH  (Python routes delegate to Supabase — use the JS SDK for browser auth)
// ──────────────────────────────────────────────────────────────────────────────

async function apiLogin(email, password) {
    return apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
}

async function apiSignup(email, password, name, role = "student", extras = {}) {
    return apiFetch("/api/auth/signup", {
        method: "POST",
        body: { email, password, name, role, ...extras }
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// PROFILE
// ──────────────────────────────────────────────────────────────────────────────

async function apiGetProfile(userId) {
    return apiFetch(`/api/profile/${userId}`);
}

async function apiUpdateProfile(userId, updates) {
    return apiFetch(`/api/profile/${userId}`, { method: "PATCH", body: updates });
}

// ──────────────────────────────────────────────────────────────────────────────
// FORMS
// ──────────────────────────────────────────────────────────────────────────────

/** Get all forms (teacher view). Pass teacherId to filter. */
async function apiGetForms(teacherId = null, status = null) {
    let qs = "";
    const params = [];
    if (teacherId) params.push(`teacher_id=${teacherId}`);
    if (status)    params.push(`status=${status}`);
    if (params.length) qs = "?" + params.join("&");
    return apiFetch(`/api/forms${qs}`);
}

/** Get single form with its questions */
async function apiGetForm(formId) {
    return apiFetch(`/api/forms/${formId}`);
}

/** Create a new form */
async function apiCreateForm(teacherId, formData) {
    return apiFetch(`/api/forms?teacher_id=${teacherId}`, { method: "POST", body: formData });
}

/** Update form */
async function apiUpdateForm(formId, updates) {
    return apiFetch(`/api/forms/${formId}`, { method: "PATCH", body: updates });
}

/** Delete form */
async function apiDeleteForm(formId) {
    return apiFetch(`/api/forms/${formId}`, { method: "DELETE" });
}

/** Publish form */
async function apiPublishForm(formId) {
    return apiFetch(`/api/forms/${formId}/publish`, { method: "POST" });
}

// ──────────────────────────────────────────────────────────────────────────────
// QUESTIONS
// ──────────────────────────────────────────────────────────────────────────────

async function apiGetQuestions(formId) {
    return apiFetch(`/api/forms/${formId}/questions`);
}

async function apiAddQuestion(formId, questionData) {
    return apiFetch(`/api/forms/${formId}/questions`, { method: "POST", body: questionData });
}

async function apiDeleteQuestion(questionId) {
    return apiFetch(`/api/questions/${questionId}`, { method: "DELETE" });
}

// ──────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS (Teacher assigns form to students)
// ──────────────────────────────────────────────────────────────────────────────

/** Assign a form to a list of student IDs */
async function apiAssignForm(formId, studentIds) {
    return apiFetch("/api/assignments", {
        method: "POST",
        body: { form_id: formId, student_ids: studentIds }
    });
}

/** Get all assigned forms for a student */
async function apiGetStudentAssignments(studentId) {
    return apiFetch(`/api/assignments/student/${studentId}`);
}

/** Get all students assigned to a form */
async function apiGetFormAssignments(formId) {
    return apiFetch(`/api/assignments/form/${formId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// RESPONSES
// ──────────────────────────────────────────────────────────────────────────────

/** Submit a student's form response */
async function apiSubmitResponse(formId, studentId, answers, completionTimeSecs = null) {
    return apiFetch("/api/responses", {
        method: "POST",
        body: {
            form_id: formId,
            student_id: studentId,
            answers,
            completion_time_seconds: completionTimeSecs
        }
    });
}

/** Get all responses submitted by a student */
async function apiGetStudentResponses(studentId) {
    return apiFetch(`/api/responses/student/${studentId}`);
}

/** Get full detail of one submission */
async function apiGetResponseDetail(responseId) {
    return apiFetch(`/api/responses/${responseId}`);
}

/** Get all responses for a form (teacher) */
async function apiGetFormResponses(formId) {
    return apiFetch(`/api/responses/form/${formId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────────────────

async function apiGetNotifications(userId) {
    return apiFetch(`/api/notifications/${userId}`);
}

async function apiMarkNotificationRead(notificationId) {
    return apiFetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
}

async function apiMarkAllNotificationsRead(userId) {
    return apiFetch(`/api/notifications/read-all/${userId}`, { method: "PATCH" });
}

// ──────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ──────────────────────────────────────────────────────────────────────────────

async function apiTeacherAnalytics(teacherId) {
    return apiFetch(`/api/analytics/teacher/${teacherId}`);
}

/** Get student activity timeline (14 days) for chart */
async function apiStudentAnalytics(studentId) {
    return apiFetch(`/api/analytics/student/${studentId}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// STUDENTS (Teacher admin)
// ──────────────────────────────────────────────────────────────────────────────

async function apiListStudents() {
    return apiFetch("/api/students");
}

async function apiStudentStats(studentId) {
    return apiFetch(`/api/students/${studentId}/stats`);
}

// Expose globally
window.TrevaAPI = {
    health:                   apiHealth,
    // auth
    login:                    apiLogin,
    signup:                   apiSignup,
    // profile
    getProfile:               apiGetProfile,
    updateProfile:            apiUpdateProfile,
    // forms
    getForms:                 apiGetForms,
    getForm:                  apiGetForm,
    createForm:               apiCreateForm,
    updateForm:               apiUpdateForm,
    deleteForm:               apiDeleteForm,
    publishForm:              apiPublishForm,
    // questions
    getQuestions:             apiGetQuestions,
    addQuestion:              apiAddQuestion,
    deleteQuestion:           apiDeleteQuestion,
    // assignments
    assignForm:               apiAssignForm,
    getStudentAssignments:    apiGetStudentAssignments,
    getFormAssignments:       apiGetFormAssignments,
    // responses
    submitResponse:           apiSubmitResponse,
    getStudentResponses:      apiGetStudentResponses,
    getResponseDetail:        apiGetResponseDetail,
    getFormResponses:         apiGetFormResponses,
    // notifications
    getNotifications:         apiGetNotifications,
    markRead:                 apiMarkNotificationRead,
    markAllRead:              apiMarkAllNotificationsRead,
    // analytics
    teacherAnalytics:         apiTeacherAnalytics,
    studentAnalytics:         apiStudentAnalytics,
    // students
    listStudents:             apiListStudents,
    studentStats:             apiStudentStats,
};

console.log("[TrevaForms] ✅ Python API client loaded. Backend: " + API_BASE);
