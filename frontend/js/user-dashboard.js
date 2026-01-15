document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("access_token");
    const username = localStorage.getItem("username");

    if (!token) {
        window.location.href = "/";
        return;
    }

    // UI Elements
    document.getElementById("usernameDisplay").textContent = username;
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const itemsGrid = document.getElementById("itemsGrid");
    const myItemsGrid = document.getElementById("myItemsGrid");
    const searchInput = document.getElementById("searchInput");
    const reportForm = document.getElementById("reportForm");

    // Modal Elements
    const detailsModal = document.getElementById("detailsModal");
    const modalBody = document.getElementById("modalBody");
    const closeModal = document.getElementById("closeModal");

    console.log(`🔍 [SYSTEM CHECK] Found ${navButtons.length} nav buttons and ${tabContents.length} tab containers.`);
    tabContents.forEach(c => console.log(`   - Container: id="${c.id}", classes="${c.className}"`));

    // BULLETPROOF TAB SYSTEM
    function switchTab(viewName) {
        console.log(`🚀 [ACTION] Switch to view: ${viewName}`);

        // 1. Update Buttons
        navButtons.forEach(btn => {
            if (btn.dataset.view === viewName) {
                btn.classList.add("active");
                btn.style.opacity = "1";
                btn.style.boxShadow = "var(--shadow-md)";
            } else {
                btn.classList.remove("active");
                btn.style.opacity = "0.6";
                btn.style.boxShadow = "none";
            }
        });

        // 2. Update Content (Explicit Selection by data-attribute)
        let foundCount = 0;
        tabContents.forEach(content => {
            if (content.dataset.viewContent === viewName) {
                content.classList.add("active");
                content.style.setProperty('display', 'block', 'important');
                content.style.setProperty('visibility', 'visible', 'important');
                content.style.setProperty('opacity', '1', 'important');
                foundCount++;
                console.log(`✅ [VISIBLE] Section confirmed for: ${viewName}`);
            } else {
                content.classList.remove("active");
                content.style.display = "none";
                content.style.visibility = "hidden";
            }
        });

        if (foundCount === 0) {
            console.error(`❌ [FAILURE] No section found for data-view-content="${viewName}"`);
            showNotification(`View Link Broken: ${viewName}`, "error");
        }

        // 3. Load Data
        if (viewName === "browse") loadApprovedItems();
        if (viewName === "submissions") loadMyItems();
    }

    // Nav Click Listener
    navButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab(btn.dataset.view);
        });
    });

    // SELF-HEALING MONITOR (Every 2s: ensures active view is actually display:block)
    setInterval(() => {
        const activeBtn = document.querySelector(".nav-btn.active");
        if (activeBtn) {
            const target = activeBtn.dataset.view;
            const content = document.querySelector(`[data-view-content="${target}"]`);
            if (content && content.style.display === "none") {
                console.warn(`🛠️ [REPAIR] View "${target}" was hidden by mistake. Restoring...`);
                content.style.setProperty('display', 'block', 'important');
                content.style.setProperty('opacity', '1', 'important');
            }
        }
    }, 2000);

    // Notifications
    function showNotification(message, type = "info") {
        const host = document.getElementById("notificationHost");
        const notification = document.createElement("div");
        notification.className = `glass animate-slide notification ${type}`;
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 1rem 2rem;
            border-radius: var(--radius-md); font-weight: 600; z-index: 3000;
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

    // Helper: Create Item Card
    function createItemCard(item, showStatus = false) {
        const card = document.createElement("div");
        card.className = "item-card animate-slide";

        const dateStr = item.date ? new Date(item.date).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        }) : 'No date';

        const category = item.category || 'Uncategorized';
        const title = item.title || 'Untitled Report';
        const status = item.status || 'pending';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div class="item-category">${category}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
            </div>
            <h3 class="item-title">${title}</h3>
            ${showStatus ? `<span class="item-status ${status}" style="font-size: 0.7rem;">${status.toUpperCase()}</span>` : ""}
            <div class="view-hint">
                <i class="fas fa-expand-alt" style="color: var(--primary);"></i> Tap for details
            </div>
        `;

        card.addEventListener("click", () => showItemDetails(item));
        return card;
    }

    // Show Details in Modal
    function showItemDetails(item) {
        const date = new Date(item.date).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const imgSrc = item.image_path ? `/images/${item.image_path}` : null;

        modalBody.innerHTML = `
            <div class="detail-modal-header">
                <span class="item-status ${item.type}" style="margin-bottom: 0.5rem; display: inline-block;">${item.type.toUpperCase()}</span>
                <h2 style="font-size: 1.5rem; margin: 0.5rem 0;">${item.title}</h2>
            </div>
            ${imgSrc ? `
                <div class="modal-image-container" style="width: 100%; height: 250px; border-radius: 12px; overflow: hidden; margin: 1rem 0; border: 1px solid var(--glass-border);">
                    <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="Item Photo">
                </div>
            ` : `
                <div class="no-image-placeholder" style="width: 100%; padding: 2rem; background: rgba(0,0,0,0.2); border-radius: 12px; text-align: center; margin: 1rem 0; color: var(--text-muted); border: 1px dashed var(--glass-border);">
                    <i class="fas fa-image fa-2x" style="display: block; margin-bottom: 0.5rem;"></i>
                    No photo uploaded
                </div>
            `}
            <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
                <div class="detail-item">
                    <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Location</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${item.location}</p>
                </div>
                <div class="detail-item">
                    <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Date</label>
                    <p style="font-size: 1rem; color: var(--text-main);">${date}</p>
                </div>
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <label style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Description</label>
                    <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.5; background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px;">${item.description}</p>
                </div>
                <div class="detail-item" style="grid-column: 1 / -1; display: flex; align-items: center; gap: 0.75rem; opacity: 0.8; font-size: 0.85rem;">
                    <i class="fas fa-user-circle"></i>
                    <span>Submitted by <strong>${item.submitted_by}</strong></span>
                </div>
            </div>
        `;
        detailsModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }

    // Modal Closing
    closeModal.onclick = () => {
        detailsModal.style.display = "none";
        document.body.style.overflow = "auto";
    }
    window.onclick = (e) => {
        if (e.target === detailsModal) {
            detailsModal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    };

    // Load Approved Items
    async function loadApprovedItems() {
        itemsGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Syncing feed...</p></div>';
        try {
            const res = await fetch("/items/approved");
            const data = await res.json();
            itemsGrid.innerHTML = "";
            if (data.length === 0) {
                itemsGrid.innerHTML = '<div class="no-items"><p>No items found. Check back later!</p></div>';
                return;
            }
            data.forEach(item => itemsGrid.appendChild(createItemCard(item)));
        } catch (err) {
            showNotification("Failed to load feed", "error");
        }
    }

    // Search
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const query = e.target.value.trim();
            if (!query) {
                loadApprovedItems();
                return;
            }
            try {
                const res = await fetch(`/items/search?keyword=${encodeURIComponent(query)}`);
                const data = await res.json();
                itemsGrid.innerHTML = "";
                if (data.length === 0) {
                    itemsGrid.innerHTML = '<div class="no-items"><p>No results found.</p></div>';
                } else {
                    data.forEach(item => itemsGrid.appendChild(createItemCard(item)));
                }
            } catch (err) {
                showNotification("Search failed", "error");
            }
        }, 300);
    });

    // Report Item Submission
    reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("title", document.getElementById("itemTitle").value);
        formData.append("description", document.getElementById("itemDescription").value);
        formData.append("category", document.getElementById("itemCategory").value);
        formData.append("location", document.getElementById("itemLocation").value);
        formData.append("date", document.getElementById("itemDate").value);
        formData.append("type", document.getElementById("itemType").value);

        const fileInput = document.getElementById("itemFile");
        if (fileInput.files.length > 0) {
            formData.append("file", fileInput.files[0]);
        }

        try {
            showNotification("Publishing your report...", "info");
            const res = await fetch("/items/submit", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                showNotification("Success! Your report is now in review.", "success");
                reportForm.reset();
                switchTab("submissions");
            } else {
                const errData = await res.json();
                showNotification(errData.detail || "Submission failed", "error");
            }
        } catch (err) {
            showNotification("Network error", "error");
        }
    });

    // Error Tracking
    window.onerror = function (msg, url, line) {
        showNotification(`System Error: ${msg} (Line ${line})`, "error");
        console.error("🕵️‍♂️ Global Error Caught:", msg, "at", url, ":", line);
    };

    // Resync Button
    const resyncBtn = document.getElementById("resyncBtn");
    if (resyncBtn) {
        resyncBtn.addEventListener("click", () => {
            console.log("⚡ Manual Re-Sync Triggered");
            loadMyItems();
        });
    }

    // Load My Items
    async function loadMyItems() {
        console.log("🔄 Fetching My Submissions...");
        const diagContent = document.getElementById("diagContent");
        myItemsGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Fetching your reports...</p></div>';

        let diagHtml = `User: <b>${username}</b><br>Token: <b>${token ? 'Valid' : 'MISSING'}</b><br>`;
        if (diagContent) diagContent.innerHTML = diagHtml + "Fetching data...";

        // Debug check
        if (!token) {
            showNotification("Session expired. Please re-login.", "error");
            return;
        }

        try {
            // Diagnostic: check global user associations
            const diagRes = await fetch("/items/diag/users");
            const diagData = await diagRes.json();
            diagHtml += `Global Users in DB: [${diagData.submitted_by_values ? diagData.submitted_by_values.join(', ') : 'Error'}]<br>`;
            diagHtml += `Total Items in DB: ${diagData.total_items_in_db || 0}<br>`;
            if (diagContent) diagContent.innerHTML = diagHtml + "Fetching your specific items...";

            const res = await fetch("/items/my-items", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                console.error("❌ Failed to fetch my items:", res.status);
                showNotification(`Fetch Error: ${res.status}`, "error");
                diagHtml += `<span style="color:red">Fetch Error: ${res.status}</span><br>`;
                if (diagContent) diagContent.innerHTML = diagHtml;
                return;
            }

            const data = await res.json();
            console.log(`✅ Server returned ${data.length} submissions`);
            diagHtml += `<span style="color:lime">Success: Received ${data.length} items</span><br>`;
            if (diagContent) diagContent.innerHTML = diagHtml;

            myItemsGrid.innerHTML = "";
            if (data.length === 0) {
                myItemsGrid.innerHTML = '<div class="no-items"><p>You haven\'t reported any items yet.</p></div>';
                return;
            }

            data.forEach(item => {
                try {
                    myItemsGrid.appendChild(createItemCard(item, true));
                } catch (e) {
                    console.error("❌ Rendering Error for item:", item, e);
                    diagHtml += `<span style="color:red">Rendering Error: ${e.message}</span><br>`;
                }
            });
        } catch (err) {
            console.error("❌ Network error while loading items:", err);
            showNotification("Failed to connect to server", "error");
            diagHtml += `<span style="color:red">Network/Script Error: ${err.message}</span><br>`;
            if (diagContent) diagContent.innerHTML = diagHtml;
        }
    }

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/";
    });

    // Initial Load
    switchTab("browse");
});
