/**
 * TrevaForms Student Portal — Notifications Controller
 */

let allNotifications = [];
let currentStudentId = null;

document.addEventListener("DOMContentLoaded", async () => {
    renderStudentSidebar("notifications");
    initStudentHeader("Notifications");

    const auth = await requireStudentAuth();
    if (!auth) return;

    currentStudentId = auth.user ? auth.user.id : auth.profile?.id || "demo-student";

    await loadNotifications(currentStudentId);
});

async function loadNotifications(studentId) {
    const list = await getNotifications(studentId);
    allNotifications = list;

    updateUnreadDisplay();
    renderNotificationsList();
}

function updateUnreadDisplay() {
    const unreadCount = allNotifications.filter(n => !n.is_read).length;
    const textEl = document.getElementById("unread-count-text");
    if (textEl) {
        textEl.textContent = unreadCount === 0 ? "All caught up" : `${unreadCount} Unread Alert${unreadCount > 1 ? 's' : ''}`;
    }

    const markBtn = document.getElementById("btn-mark-all-read");
    if (markBtn) {
        markBtn.style.display = unreadCount > 0 ? "inline-flex" : "none";
    }
}

function renderNotificationsList() {
    const container = document.getElementById("notifications-list-container");
    if (!container) return;

    if (allNotifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state card" style="padding: 60px 20px;">
                <span class="empty-state-icon">🔔</span>
                <div class="empty-state-title">You're all caught up!</div>
                <div class="empty-state-message">No pending notifications at this time.</div>
                <a href="../dashboard/index.html" class="btn btn-secondary btn-sm">Go to Dashboard</a>
            </div>
        `;
        return;
    }

    container.innerHTML = allNotifications.map(notif => {
        const iconInfo = getNotifIconInfo(notif.type);
        const isUnread = !notif.is_read;

        return `
            <div class="notif-card ${isUnread ? 'unread' : ''}" onclick="handleNotifClick('${notif.id}', '${notif.form_id || ''}')">
                <div class="notif-icon-circle ${iconInfo.className}">
                    ${iconInfo.icon}
                </div>
                <div class="notif-content">
                    <h3 class="notif-title">${escapeHtml(notif.title || "Notification")}</h3>
                    <p class="notif-body-text">${escapeHtml(notif.message || "")}</p>
                    <span class="notif-time-ago">${formatRelative(notif.created_at)}</span>
                </div>
                ${isUnread ? '<div class="notif-unread-dot" title="Unread"></div>' : ''}
            </div>
        `;
    }).join("");
}

function getNotifIconInfo(type) {
    switch (type) {
        case "form_assigned":
            return { icon: "📋", className: "notif-type-form_assigned" };
        case "deadline_reminder":
            return { icon: "⏰", className: "notif-type-deadline_reminder" };
        case "submission_success":
            return { icon: "✓", className: "notif-type-submission_success" };
        case "warning":
            return { icon: "⚠️", className: "notif-type-warning" };
        default:
            return { icon: "ℹ", className: "notif-type-info" };
    }
}

window.handleNotifClick = async function(notifId, formId) {
    await markNotificationRead(notifId);

    // Update in-memory
    const found = allNotifications.find(n => n.id === notifId);
    if (found) found.is_read = true;

    updateUnreadDisplay();
    renderNotificationsList();

    // Refresh badges
    _populateSidebarBadge();

    // If linked to a form, navigate to fill-form
    if (formId) {
        window.location.href = `../fill-form/index.html?id=${formId}`;
    }
};

window.handleMarkAllRead = async function() {
    if (!currentStudentId) return;

    await markAllNotificationsRead(currentStudentId);

    allNotifications.forEach(n => { n.is_read = true; });

    updateUnreadDisplay();
    renderNotificationsList();

    // Refresh badges
    _populateSidebarBadge();
    showToast("All notifications marked as read.", "success");
};

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
