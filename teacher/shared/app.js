/**
 * TrevaForms - Registrar's Office Application Framework & Data Store
 * Provides state management, localStorage persistence, Supabase DB integration, toast notifications,
 * theme management, and sidebar rendering.
 */

const STORAGE_KEYS = {
    USER: "trevaforms_user",
    SETTINGS: "trevaforms_settings",
    FORMS: "trevaforms_forms",
    RESPONSES: "trevaforms_responses",
    TEMPLATES: "trevaforms_templates"
};

// ==========================================================================
// Initialization & Database Seeding
// ==========================================================================

function initAppStore() {
    const userVal = typeof DEMO_USER !== 'undefined' ? DEMO_USER : (typeof window !== 'undefined' && window.DEMO_USER ? window.DEMO_USER : { name: "Meet Shah", email: "meet@trevaforms.app" });
    const settingsVal = typeof DEMO_SETTINGS !== 'undefined' ? DEMO_SETTINGS : (typeof window !== 'undefined' && window.DEMO_SETTINGS ? window.DEMO_SETTINGS : { theme: "light" });
    const formsVal = typeof DEMO_FORMS !== 'undefined' ? DEMO_FORMS : (typeof window !== 'undefined' && window.DEMO_FORMS ? window.DEMO_FORMS : []);
    const respVal = typeof DEMO_RESPONSES !== 'undefined' ? DEMO_RESPONSES : (typeof window !== 'undefined' && window.DEMO_RESPONSES ? window.DEMO_RESPONSES : []);
    const tplVal = typeof DEMO_TEMPLATES !== 'undefined' ? DEMO_TEMPLATES : (typeof window !== 'undefined' && window.DEMO_TEMPLATES ? window.DEMO_TEMPLATES : []);

    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userVal));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsVal));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FORMS)) {
        localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(formsVal));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RESPONSES)) {
        localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(respVal));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(tplVal));
    }

    applySavedTheme();
}

initAppStore();

// ==========================================================================
// User & Settings Management
// ==========================================================================

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || DEMO_USER;
    } catch (e) {
        return DEMO_USER;
    }
}

function updateCurrentUser(userData) {
    const current = getCurrentUser();
    const updated = { ...current, ...userData };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    showToast("Profile ledger updated successfully", "success");
    return updated;
}

function getSettings() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEMO_SETTINGS;
    } catch (e) {
        return DEMO_SETTINGS;
    }
}

function saveSettings(settingsData) {
    const current = getSettings();
    const updated = { ...current, ...settingsData };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    applySavedTheme();
    showToast("Ledger preferences saved", "success");
    return updated;
}

function applySavedTheme() {
    const settings = getSettings();
    let theme = settings.theme || "light";
    if (theme === "system") {
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
}

// ==========================================================================
// Forms Management (Supabase Database Ready)
// ==========================================================================

function getForms() {
    const supabase = typeof getSupabase === "function" ? getSupabase() : null;
    if (supabase) {
        // Supabase DB Sync active
        supabase.from('forms').select('*').order('updatedAt', { ascending: false }).then(({ data, error }) => {
            if (!error && data) {
                localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(data));
            }
        });
    }
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.FORMS)) || [];
    } catch (e) {
        return [];
    }
}

function getFormById(id) {
    const forms = getForms();
    return forms.find(f => f.id === id) || null;
}

function saveForm(form) {
    const forms = getForms();
    const index = forms.findIndex(f => f.id === form.id);
    const now = new Date().toISOString();

    if (index >= 0) {
        form.updatedAt = now;
        forms[index] = form;
    } else {
        form.createdAt = form.createdAt || now;
        form.updatedAt = now;
        form.responseCount = form.responseCount || 0;
        form.shareUrl = form.shareUrl || `trevaforms.app/f/${form.id}`;
        forms.unshift(form);
    }

    localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(forms));

    // Async Supabase DB Upsert
    const supabase = typeof getSupabase === "function" ? getSupabase() : null;
    if (supabase) {
        supabase.from('forms').upsert([form]).then(({ error }) => {
            if (error) console.error("Supabase form save error:", error);
            else console.log("⚡ Form synced to Supabase DB:", form.id);
        });
    }

    return form;
}

function createNewFormAndNavigate(title = "") {
    const newForm = {
        id: "form_" + Date.now(),
        title: title || "Untitled Form",
        description: "Please complete this form to share your feedback.",
        status: "draft",
        questions: [
            {
                id: "q_" + Date.now(),
                question: "Untitled Question",
                type: "short-answer",
                required: false
            }
        ],
        responseCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareUrl: `trevaforms.app/f/form_${Date.now()}`
    };

    saveForm(newForm);
    showToast(`New form "${newForm.title}" created! Redirecting...`, "success");
    setTimeout(() => {
        window.location.href = `../form-builder/index.html?id=${newForm.id}`;
    }, 300);
}

function openCreateFormModal() {
    showModal({
        title: "Create New Form",
        contentHtml: `
            <p style="font-family: var(--merri); font-style: italic; color: var(--brown2); margin-bottom: 1rem;">
                Enter a title for your new form ledger to begin adding questions.
            </p>
            <div class="form-group">
                <label class="form-label">Form Title</label>
                <input type="text" id="new-form-title-input" class="form-control" placeholder="e.g. Student Feedback Form, Library Survey..." value="Untitled Form">
            </div>
        `,
        confirmText: "Create & Open Builder",
        cancelText: "Cancel",
        onConfirm: () => {
            const inputEl = document.getElementById("new-form-title-input");
            const title = inputEl ? inputEl.value.trim() : "";
            createNewFormAndNavigate(title);
        }
    });
}

function deleteForm(id) {
    let forms = getForms();
    forms = forms.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(forms));
    
    let responses = getResponses();
    responses = responses.filter(r => r.formId !== id);
    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(responses));

    // Supabase DB Delete
    const supabase = typeof getSupabase === "function" ? getSupabase() : null;
    if (supabase) {
        supabase.from('forms').delete().eq('id', id).then();
    }
    
    showToast("Form entry deleted from ledger", "success");
}

function duplicateForm(id) {
    const original = getFormById(id);
    if (!original) return null;

    const copy = JSON.parse(JSON.stringify(original));
    copy.id = "form_" + Date.now();
    copy.title = `${original.title} (Copy)`;
    copy.status = "draft";
    copy.responseCount = 0;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();
    copy.shareUrl = `trevaforms.app/f/${copy.id}`;

    saveForm(copy);
    showToast(`Created duplicate: "${copy.title}"`, "success");
    return copy;
}

// ==========================================================================
// Responses Management (Supabase Database Ready)
// ==========================================================================

function getResponses() {
    const supabase = typeof getSupabase === "function" ? getSupabase() : null;
    if (supabase) {
        supabase.from('responses').select('*').order('submittedAt', { ascending: false }).then(({ data, error }) => {
            if (!error && data) {
                localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(data));
            }
        });
    }
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESPONSES)) || [];
    } catch (e) {
        return [];
    }
}

function saveResponse(response) {
    const responses = getResponses();
    response.id = response.id || "resp_" + Date.now();
    response.submittedAt = new Date().toISOString();
    response.status = "Completed";

    responses.unshift(response);
    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(responses));

    const form = getFormById(response.formId);
    if (form) {
        form.responseCount = (form.responseCount || 0) + 1;
        saveForm(form);
    }

    // Supabase DB Insert
    const supabase = typeof getSupabase === "function" ? getSupabase() : null;
    if (supabase) {
        supabase.from('responses').insert([response]).then(({ error }) => {
            if (error) console.error("Supabase response insert error:", error);
            else console.log("⚡ Response stored in Supabase DB:", response.id);
        });
    }

    return response;
}

function deleteResponse(id) {
    let responses = getResponses();
    responses = responses.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(responses));

    const supabase = typeof getSupabase === "function" ? getSupabase() : null;
    if (supabase) {
        supabase.from('responses').delete().eq('id', id).then();
    }

    showToast("Response removed from record", "info");
}

function exportCSV(formId = "all") {
    const responses = getResponses();
    const filtered = formId === "all" ? responses : responses.filter(r => r.formId === formId);

    if (filtered.length === 0) {
        showToast("No responses available to export", "warning");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Form Title,Respondent,Email,Submitted At,Status,Answers\n";

    filtered.forEach(r => {
        const answersStr = JSON.stringify(r.answers).replace(/"/g, '""');
        const row = `"${r.id}","${r.formTitle}","${r.respondent}","${r.email}","${r.submittedAt}","${r.status}","${answersStr}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trevaforms_ledger_${formId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filtered.length} response records to CSV`, "success");
}

// ==========================================================================
// Templates Management
// ==========================================================================

function getTemplates() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATES)) || DEMO_TEMPLATES;
    } catch (e) {
        return DEMO_TEMPLATES;
    }
}

function useTemplate(templateId) {
    const templates = getTemplates();
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;

    const newForm = {
        id: "form_" + Date.now(),
        title: tpl.title,
        description: tpl.description,
        status: "draft",
        questions: JSON.parse(JSON.stringify(tpl.questions)),
        responseCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shareUrl: `trevaforms.app/f/tpl_${Date.now()}`
    };

    saveForm(newForm);
    showToast(`Template "${tpl.title}" loaded! Opening builder...`, "success");
    setTimeout(() => {
        window.location.href = `../form-builder/index.html?id=${newForm.id}`;
    }, 400);
}

// ==========================================================================
// Navigation & Shared Sidebar (Registrar Theme)
// ==========================================================================

function renderSidebar(activeKey = "") {
    const sidebarEl = document.getElementById("app-sidebar");
    if (!sidebarEl) return;

    const user = getCurrentUser();

    const menuItems = [
        { key: "dashboard", label: "Dashboard", icon: "📊", url: "../dashboard/index.html" },
        { key: "forms", label: "My Forms", icon: "📋", url: "../forms/index.html" },
        { key: "templates", label: "Templates", icon: "✎", url: "../templates/index.html" },
        { key: "responses", label: "Responses", icon: "✉", url: "../responses/index.html" },
        { key: "analytics", label: "Analytics", icon: "📈", url: "../analytics/index.html" }
    ];

    const settingsItems = [
        { key: "settings", label: "Settings", icon: "⚙", url: "../settings/index.html" },
        { key: "profile", label: "Profile", icon: "👤", url: "../profile/index.html" }
    ];

    const navLinksHtml = menuItems.map(item => `
        <a href="${item.url}" class="sidebar-item ${activeKey === item.key ? 'active' : ''}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
        </a>
    `).join('');

    const settingsLinksHtml = settingsItems.map(item => `
        <a href="${item.url}" class="sidebar-item ${activeKey === item.key ? 'active' : ''}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
        </a>
    `).join('');

    sidebarEl.innerHTML = `
        <div class="sidebar-header">
            <a href="../dashboard/index.html" class="brand">
                <div class="brand-mark">T</div>
                <div>
                    <div class="brand-name">TrevaForms</div>
                    <div class="brand-sub">Est. Registrar's Office</div>
                </div>
            </a>
        </div>
        <div class="sidebar-nav">
            <div class="nav-section-title">Ledger Navigation</div>
            ${navLinksHtml}
            
            <div class="nav-section-title" style="margin-top: 1rem;">Preferences</div>
            ${settingsLinksHtml}
        </div>
        <div class="sidebar-footer">
            <a href="../profile/index.html" class="user-profile-summary">
                <img src="${user.avatar}" alt="${user.name}" class="user-avatar" />
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-email">${user.email}</div>
                </div>
            </a>
        </div>
    `;
}

function initHeaderBar(pageTitle = "") {
    const topBarEl = document.getElementById("top-bar");
    if (!topBarEl) return;

    topBarEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <button class="mobile-menu-toggle" id="btn-toggle-mobile-sidebar" title="Toggle menu">☰</button>
            <h2 style="font-family: var(--serif); font-size: 1.25rem; font-weight: 700; color: var(--ink);">${pageTitle}</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <button id="btn-topbar-create-form" class="btn btn-primary btn-sm">
                <span>+</span>
                <span>Create Form</span>
            </button>
            <button id="btn-theme-toggle" class="btn-icon" title="Toggle Theme">
                🌙
            </button>
        </div>
    `;

    document.getElementById("btn-toggle-mobile-sidebar")?.addEventListener("click", () => {
        document.getElementById("app-sidebar")?.classList.toggle("open");
    });

    document.getElementById("btn-topbar-create-form")?.addEventListener("click", () => {
        openCreateFormModal();
    });

    document.getElementById("btn-theme-toggle")?.addEventListener("click", () => {
        const settings = getSettings();
        const nextTheme = settings.theme === "dark" ? "light" : "dark";
        saveSettings({ theme: nextTheme });
    });
}

// ==========================================================================
// Toasts & Modals Utilities
// ==========================================================================

function showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'danger' ? '✕' : 'ℹ'}</span>
        <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showModal({ title, contentHtml, confirmText = "Confirm", cancelText = "Cancel", onConfirm }) {
    let backdrop = document.querySelector(".modal-backdrop");
    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";
        document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="btn-icon modal-close-btn">✕</button>
            </div>
            <div class="modal-body">
                ${contentHtml}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel-btn">${cancelText}</button>
                <button class="btn btn-primary modal-confirm-btn">${confirmText}</button>
            </div>
        </div>
    `;

    backdrop.classList.add("active");

    const closeModal = () => {
        backdrop.classList.remove("active");
    };

    backdrop.querySelector(".modal-close-btn").onclick = closeModal;
    backdrop.querySelector(".modal-cancel-btn").onclick = closeModal;
    
    backdrop.querySelector(".modal-confirm-btn").onclick = () => {
        if (onConfirm) onConfirm();
        closeModal();
    };
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Share link copied to clipboard!", "success");
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showToast("Share link copied to clipboard!", "success");
}
