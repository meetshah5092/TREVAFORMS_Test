/**
 * TrevaForms - Settings & Profile Controller
 * Manages theme selection (Dark Mode), notification toggles, profile editing, and security preferences.
 */

document.addEventListener("DOMContentLoaded", () => {
    const isProfilePage = window.location.pathname.includes("../profile/index.html");

    if (isProfilePage) {
        renderSidebar("profile");
        initHeaderBar("User Profile");
        initProfileForm();
    } else {
        renderSidebar("settings");
        initHeaderBar("Application Settings");
        initSettingsPage();
    }
});

function initSettingsPage() {
    const settings = getSettings();

    // Bind current theme selection
    const activeTheme = settings.theme || "light";
    document.querySelectorAll(".theme-option-box").forEach(box => {
        if (box.dataset.theme === activeTheme) {
            box.classList.add("active");
        } else {
            box.classList.remove("active");
        }

        box.addEventListener("click", () => {
            document.querySelectorAll(".theme-option-box").forEach(b => b.classList.remove("active"));
            box.classList.add("active");
            const newTheme = box.dataset.theme;
            saveSettings({ theme: newTheme });
        });
    });

    // Bind Notification Switches
    const notif = settings.notifications || {};
    const emailRespChk = document.getElementById("chk-notif-email");
    const pubChk = document.getElementById("chk-notif-published");
    const digestChk = document.getElementById("chk-notif-digest");

    if (emailRespChk) emailRespChk.checked = !!notif.emailResponses;
    if (pubChk) pubChk.checked = !!notif.formPublished;
    if (digestChk) digestChk.checked = !!notif.weeklyDigest;

    document.getElementById("btn-save-notifs")?.addEventListener("click", () => {
        const updatedNotifs = {
            emailResponses: emailRespChk ? emailRespChk.checked : true,
            formPublished: pubChk ? pubChk.checked : true,
            weeklyDigest: digestChk ? digestChk.checked : false
        };
        saveSettings({ notifications: updatedNotifs });
    });

    // Section menu switching
    document.querySelectorAll(".settings-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".settings-nav-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const sectionId = btn.dataset.section;
            document.querySelectorAll(".settings-section").forEach(sec => {
                sec.style.display = sec.id === sectionId ? "block" : "none";
            });
        });
    });
}

function initProfileForm() {
    const user = getCurrentUser();

    const nameInput = document.getElementById("profile-name");
    const emailInput = document.getElementById("profile-email");
    const roleInput = document.getElementById("profile-role");
    const avatarInput = document.getElementById("profile-avatar-url");
    const previewImg = document.getElementById("profile-avatar-preview");

    if (nameInput) nameInput.value = user.name || "";
    if (emailInput) emailInput.value = user.email || "";
    if (roleInput) roleInput.value = user.role || "";
    if (avatarInput) avatarInput.value = user.avatar || "";
    if (previewImg) previewImg.src = user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80";

    avatarInput?.addEventListener("input", (e) => {
        if (previewImg) previewImg.src = e.target.value;
    });

    document.getElementById("profile-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        updateCurrentUser({
            name: nameInput ? nameInput.value.trim() : user.name,
            email: emailInput ? emailInput.value.trim() : user.email,
            role: roleInput ? roleInput.value.trim() : user.role,
            avatar: avatarInput ? avatarInput.value.trim() : user.avatar
        });
    });
}
