document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");

  if (!token || role !== 'admin') {
    alert("Access Denied: Admin privileges required.");
    window.location.href = "/";
    return;
  }

  // UI Elements
  document.getElementById("adminUsername").textContent = username;
  const container = document.getElementById("dashboardContainer");
  const pendingCountEl = document.getElementById("pendingCount");
  const navItems = document.querySelectorAll(".nav-item");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  // Notifications
  function showNotification(message, type = "info") {
    const host = document.getElementById("notificationHost");
    const notification = document.createElement("div");
    notification.className = `glass animate-slide notification ${type}`;
    notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 1rem 2rem;
            border-radius: var(--radius-md); font-weight: 600; z-index: 1000;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white; box-shadow: var(--shadow-lg); transition: all 0.3s;
        `;
    notification.textContent = message;
    host.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  // Tab Switching
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;

      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      if (tab === 'pending') {
        pageTitle.textContent = "Moderation Queue";
        pageSubtitle.textContent = "Review and manage pending item reports";
        loadPendingItems();
      } else if (tab === 'approved') {
        pageTitle.textContent = "Verified Items";
        pageSubtitle.textContent = "Currently active and searchable items";
        loadApprovedItems();
      } else {
        container.innerHTML = '<div class="no-items"><p>User management coming soon.</p></div>';
      }
    });
  });

  // Helper: Create Item Card
  function createItemCard(item, isPending = true) {
    const card = document.createElement("div");
    card.className = "item-card glass animate-slide";

    const date = item.date ? new Date(item.date).toLocaleDateString() : 'N/A';
    const type = (item.type || 'Item').toUpperCase();
    const submittedBy = item.submitted_by || 'Unknown';
    const imgSrc = item.image_path ? `/images/${item.image_path}` : null;

    card.innerHTML = `
            <div>
                <span class="item-status ${item.type || 'other'}">${type}</span>
                <h3 class="item-title" style="margin-top: 1rem;">${item.title || 'No Title'}</h3>
                <p class="item-description">${item.description || 'No description provided.'}</p>
            </div>
            
            ${imgSrc ? `
                <div class="admin-image-preview" style="width: 100%; height: 180px; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; border: 1px solid var(--glass-border);">
                    <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="Item">
                </div>
            ` : `
                <div class="admin-no-image" style="width: 100%; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.8rem; border: 1px dashed var(--glass-border);">
                    <i class="fas fa-image" style="margin-right: 0.5rem;"></i> No image uploaded
                </div>
            `}

            <div class="item-meta">
                <span><i class="fas fa-tag"></i> ${item.category || 'Uncategorized'}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${item.location || 'Unknown Location'}</span>
                <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                <span><i class="fas fa-user"></i> Submitted by <strong>${submittedBy}</strong></span>
            </div>
            ${isPending ? `
            <div class="card-actions" style="margin-top: 1.5rem;">
                <button class="btn btn-primary approve-btn" data-id="${item.id}">Approve</button>
                <button class="btn btn-outline reject-btn" data-id="${item.id}" style="border-color: var(--danger); color: var(--danger);">Reject</button>
            </div>
            ` : ""}
        `;

    if (isPending) {
      card.querySelector(".approve-btn").onclick = () => handleModeration(item.id, 'approve');
      card.querySelector(".reject-btn").onclick = () => handleModeration(item.id, 'reject');
    }

    return card;
  }

  // Load Pending
  async function loadPendingItems() {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i><p>Scanning for reports...</p></div>';
    try {
      const res = await fetch("/items/pending", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      container.innerHTML = "";
      pendingCountEl.textContent = data.length;

      if (data.length === 0) {
        container.innerHTML = '<div class="no-items"><p>All caught up! No reports pending.</p></div>';
        return;
      }
      data.forEach(item => container.appendChild(createItemCard(item, true)));
    } catch (err) {
      showNotification("Failed to load queue", "error");
    }
  }

  // Load Approved
  async function loadApprovedItems() {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i><p>Loading verified items...</p></div>';
    try {
      const res = await fetch("/items/approved");
      const data = await res.json();
      container.innerHTML = "";
      if (data.length === 0) {
        container.innerHTML = '<div class="no-items"><p>No approved items to show.</p></div>';
        return;
      }
      data.forEach(item => container.appendChild(createItemCard(item, false)));
    } catch (err) {
      showNotification("Failed to load items", "error");
    }
  }

  // Handle Approve/Reject
  async function handleModeration(itemId, action) {
    try {
      const res = await fetch(`/items/${action}/${itemId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification(`Item successfully ${action}d!`, "success");
        loadPendingItems(); // Refresh
      } else {
        showNotification(`Could not ${action} item`, "error");
      }
    } catch (err) {
      showNotification("Moderation failed", "error");
    }
  }

  // Logout
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Initial Load
  loadPendingItems();
});