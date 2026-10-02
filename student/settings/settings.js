/**
 * TrevaForms Student Portal — Settings Controller
 */

let currentAuthUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    renderStudentSidebar("settings");
    initStudentHeader("Portal Settings");

    const auth = await requireStudentAuth();
    if (!auth) return;

    currentAuthUser = auth.user;

    // Load current theme selection
    const savedTheme = localStorage.getItem("tf_student_theme") || "light";
    highlightThemeButton(savedTheme);

    // Load saved notification preferences
    loadSavedPrefs();
});

window.setPortalTheme = function(theme) {
    applyTheme(theme);
    highlightThemeButton(theme);
    showToast(`Theme updated to ${theme} mode.`, "info");
};

function highlightThemeButton(theme) {
    document.querySelectorAll(".theme-choice-btn").forEach(b => b.classList.remove("active"));
    const activeBtn = document.getElementById(`theme-btn-${theme}`);
    if (activeBtn) activeBtn.classList.add("active");
}

function loadSavedPrefs() {
    try {
        const prefs = JSON.parse(localStorage.getItem("tf_student_notif_prefs") || "{}");
        if (prefs.assign !== undefined) document.getElementById("pref-notif-assign").checked = prefs.assign;
        if (prefs.deadline !== undefined) document.getElementById("pref-notif-deadline").checked = prefs.deadline;
        if (prefs.sub !== undefined) document.getElementById("pref-notif-sub").checked = prefs.sub;
    } catch (e) {}
}

window.saveNotificationPref = function(key, val) {
    try {
        const prefs = JSON.parse(localStorage.getItem("tf_student_notif_prefs") || "{}");
        prefs[key] = val;
        localStorage.setItem("tf_student_notif_prefs", JSON.stringify(prefs));
        showToast("Notification preference updated.", "success");
    } catch (e) {}
};

window.handleSendPasswordReset = async function() {
    const email = currentAuthUser?.email;
    if (!email) {
        showToast("No email address found for this user account.", "error");
        return;
    }

    const sb = getSupabaseClient();
    if (!sb) {
        showToast("Supabase not configured. Simulated reset email sent.", "info");
        return;
    }

    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) {
        showToast(error.message, "error");
    } else {
        showToast("Password reset link sent to your email address!", "success");
    }
};

window.handleAccountSignOut = function() {
    showModal({
        title: "Confirm Sign Out",
        contentHtml: "<p>Are you sure you want to end your student session on this browser?</p>",
        confirmText: "Sign Out",
        cancelText: "Cancel",
        danger: true,
        onConfirm: () => {
            signOutStudent();
        }
    });
};
