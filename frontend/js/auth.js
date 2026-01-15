document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const messageEl = document.getElementById("message");

  // Notifications
  function showNotification(message, type = "info") {
    if (!messageEl) return;
    messageEl.style.color = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)';
    messageEl.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    messageEl.classList.add("animate-fade");
  }

  // SIGNUP
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      try {
        showNotification("Creating account...", "info");
        const res = await fetch("/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok) {
          showNotification("Account created! Redirecting to login...", "success");
          setTimeout(() => window.location.href = "/", 2000);
        } else {
          showNotification(data.detail || "Signup failed", "error");
        }
      } catch (err) {
        showNotification("Connection error", "error");
      }
    });
  }

  // LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const role = document.getElementById("role").value;

      try {
        showNotification("Verifying credentials...", "info");
        const res = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, client_role: role })
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("role", data.role);
          localStorage.setItem("username", data.username);

          showNotification(`Welcome back, ${data.username}!`, "success");

          // Redirect based on the actual role returned by backend
          setTimeout(() => {
            if (data.role === "admin") {
              window.location.href = "/static/pages/admin-dashboard.html";
            } else {
              window.location.href = "/static/pages/user-dashboard.html";
            }
          }, 1000);
        } else {
          showNotification(data.detail || "Login failed", "error");
        }
      } catch (err) {
        showNotification("Connection error", "error");
      }
    });
  }
});