/**
 * TrevaForms Student Portal — Profile Controller
 */

let currentUserId = null;
let currentProfileData = null;

document.addEventListener("DOMContentLoaded", async () => {
    renderStudentSidebar("profile");
    initStudentHeader("My Profile");

    const auth = await requireStudentAuth();
    if (!auth) return;

    currentUserId = auth.user ? auth.user.id : auth.profile?.id || "demo-student";
    currentProfileData = auth.profile;

    // Populate profile UI
    populateProfileUI(auth.profile, auth.user);

    // Load stats
    await loadStudentStats(currentUserId);

    // Form submit listener
    document.getElementById("profile-edit-form")?.addEventListener("submit", handleProfileSave);
});

function populateProfileUI(profile, user) {
    if (!profile) return;

    const displayName = profile.name || "Student";
    const email = profile.email || user?.email || "student@trevaforms.app";

    // Summary Card
    document.getElementById("prof-summary-name").textContent = displayName;
    document.getElementById("prof-summary-email").textContent = email;

    if (profile.created_at) {
        document.getElementById("prof-summary-joined").textContent = `Member since ${formatDate(profile.created_at)}`;
    }

    const avatarEl = document.getElementById("prof-summary-avatar");
    if (avatarEl) {
        if (profile.avatar_url) {
            avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar">`;
        } else {
            avatarEl.textContent = displayName.charAt(0).toUpperCase();
        }
    }

    // Edit Form inputs
    document.getElementById("input-prof-name").value = profile.name || "";
    document.getElementById("input-prof-sid").value = profile.student_id || "";
    document.getElementById("input-prof-course").value = profile.course || "";
    document.getElementById("input-prof-div").value = profile.division || "";
    document.getElementById("input-prof-email").value = email;

    if (profile.semester) {
        const semSelect = document.getElementById("select-prof-sem");
        if (semSelect) semSelect.value = String(profile.semester);
    }
}

async function loadStudentStats(studentId) {
    const [forms, responses] = await Promise.all([
        getAssignedForms(studentId),
        getStudentResponses(studentId)
    ]);

    const submittedCount = responses.filter(r => r.status === "submitted").length;
    const pendingCount = Math.max(0, forms.length - submittedCount);

    const compEl = document.getElementById("prof-stat-completed");
    const pendEl = document.getElementById("prof-stat-pending");

    if (compEl) compEl.textContent = submittedCount;
    if (pendEl) pendEl.textContent = pendingCount;
}

async function handleProfileSave(e) {
    e.preventDefault();

    const name = document.getElementById("input-prof-name").value.trim();
    const student_id = document.getElementById("input-prof-sid").value.trim();
    const course = document.getElementById("input-prof-course").value.trim();
    const semester = document.getElementById("select-prof-sem").value;
    const division = document.getElementById("input-prof-div").value.trim();

    if (!name) {
        showToast("Full name cannot be empty.", "error");
        return;
    }

    const saveBtn = document.getElementById("btn-save-profile");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const updates = {
        name,
        student_id,
        course,
        semester,
        division
    };

    const res = await updateProfile(currentUserId, updates);

    saveBtn.disabled = false;
    saveBtn.textContent = "Save Profile Changes";

    if (res.success) {
        showToast("Profile details updated successfully!", "success");
        // Update local summary
        document.getElementById("prof-summary-name").textContent = name;
        _populateSidebarUser();
    } else {
        showToast(res.error || "Failed to update profile.", "error");
    }
}

window.handleAvatarFileSelect = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file (PNG, JPG, WEBP).", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Image size must be less than 5MB.", "error");
        return;
    }

    // Local preview immediately
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarEl = document.getElementById("prof-summary-avatar");
        if (avatarEl) {
            avatarEl.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
        }
    };
    reader.readAsDataURL(file);

    showToast("Uploading profile avatar...", "info");

    const uploadRes = await uploadAvatar(currentUserId, file);
    if (uploadRes.success && uploadRes.url) {
        await updateProfile(currentUserId, { avatar_url: uploadRes.url });
        showToast("Profile photo updated!", "success");
        _populateSidebarUser();
    } else {
        // If Supabase storage is not set up, show friendly message
        showToast("Avatar preview saved locally.", "info");
    }
};
