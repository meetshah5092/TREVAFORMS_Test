/**
 * TrevaForms - Authentication Handlers
 * Handles login, signup, social login simulation, and demo state updates.
 */

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const googleBtn = document.getElementById("btn-google-auth");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            
            updateCurrentUser({
                email: email || "meet@trevaforms.app",
                name: email ? email.split('@')[0] : "Meet Shah"
            });

            showToast("Logged in successfully! Redirecting to Dashboard...", "success");
            setTimeout(() => {
                window.location.href = "../dashboard/index.html";
            }, 500);
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("signup-name").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value;
            const confirm = document.getElementById("signup-confirm").value;

            if (password !== confirm) {
                showToast("Passwords do not match", "danger");
                return;
            }

            updateCurrentUser({
                name: name || "New User",
                email: email || "user@trevaforms.app"
            });

            showToast("Account created successfully! Welcome to TrevaForms.", "success");
            setTimeout(() => {
                window.location.href = "../dashboard/index.html";
            }, 500);
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener("click", () => {
            updateCurrentUser({
                name: "Meet Shah (Google)",
                email: "meet.google@trevaforms.app"
            });
            showToast("Signed in with Google! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "../dashboard/index.html";
            }, 500);
        });
    }
});
