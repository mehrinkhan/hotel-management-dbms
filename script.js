/**
 * ============================================================
 * URBAN NEST: LUXURY SUITE MANAGEMENT SYSTEM
 * Academic Project - North South University
 * ------------------------------------------------------------
 * This script handles:
 * 1. Persistent Storage (LocalStorage)
 * 2. Role-based UI Rendering (Admin vs Resident)
 * 3. Dynamic Price Calculation (Nights + Services)
 * 4. Guest Record Management (CRM)
 * 5. Suite Inventory and Service Configuration
 * ============================================================
 */

/* =========================================
   1. DATABASE & PERSISTENCE LAYER
   ========================================= */

// Default data used only on the first ever load or if storage is cleared
const demoRooms = [
    { id: 101, name: "Skyline Executive", price: 12500, status: "Available", img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1000" },
    { id: 102, name: "Urban Loft", price: 8500, status: "Available", img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1000" },
    { id: 103, name: "The Royal Suite", price: 25000, status: "Available", img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1000" }
];

const demoServices = [
    { name: "Luxury Buffet Breakfast", price: 1500 },
    { name: "Airport Pickup (Tesla S)", price: 3000 },
    { name: "Full Body Spa", price: 5000 }
];

/** * Data Synchronization: We pull from LocalStorage to keep progress 
 * even after browser refreshes (crucial for GitHub Pages).
 */
let rooms = JSON.parse(localStorage.getItem("un_rooms")) || demoRooms;
let services = JSON.parse(localStorage.getItem("un_services")) || demoServices;
let records = JSON.parse(localStorage.getItem("un_records")) || [];
let reviews = JSON.parse(localStorage.getItem("un_reviews")) || [];
let activeRating = 0;

// Internal helper to save all state to LocalStorage
function saveData() {
    localStorage.setItem("un_rooms", JSON.stringify(rooms));
    localStorage.setItem("un_services", JSON.stringify(services));
    localStorage.setItem("un_records", JSON.stringify(records));
    localStorage.setItem("un_reviews", JSON.stringify(reviews));
}

// Initial force-save for first-time visitors
if (!localStorage.getItem("un_rooms")) saveData();

/* =========================================
   2. APP INITIALIZATION & ROUTING
   ========================================= */

function initApp() {
    console.log("Urban Nest Application Initializing...");
    const role = localStorage.getItem("userRole") || "guest";
    const badge = document.getElementById("user-badge");
    
    // UI Feedback for current access level
    if (badge) {
        badge.innerText = (role === "admin" ? "STAFF ACCESS" : "RESIDENT PORTAL");
    }

    const staffDash = document.getElementById("staff-view");
    const guestDash = document.getElementById("guest-view");

    // Toggle view availability
    if (staffDash) staffDash.style.display = (role === "admin" ? "block" : "none");
    if (guestDash) guestDash.style.display = (role === "guest" ? "block" : "none");

    renderUI();
}

/**
 * renderUI acts as a central hub to refresh all dynamic parts of the DOM.
 */
function renderUI() {
    if (document.getElementById("roomGrid")) renderRooms();
    if (document.getElementById("customerTable")) renderCustomerTable();
    if (document.getElementById("serviceList")) renderServiceManager();
}

window.onload = initApp;

/* =========================================
   3. ROOM & BOOKING LOGIC
   ========================================= */

function renderRooms() {
    const grid = document.getElementById("roomGrid");
    if (!grid) return;
    const role = localStorage.getItem("userRole") || "guest";

    grid.innerHTML = rooms.map((room, i) => {
        const isOccupied = room.status === "Occupied";
        return `
        <div class="mgmt-card" style="padding:0; overflow:hidden; text-align:left; border:1px solid #ddd; border-radius:8px;">
            <div style="height:200px; background:url('${room.img}') center/cover;"></div>
            <div style="padding:25px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-size:0.55rem; font-weight:800; color:#aaa;">SUITE ID: ${room.id}</span>
                    <span class="status-badge ${isOccupied ? 'status-red' : 'status-green'}">${room.status}</span>
                </div>
                <h3>${room.name}</h3>
                <p style="font-weight:700; color:#333; margin-bottom:15px;">৳${room.price.toLocaleString()} / Night</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${role === 'admin' ? `
                        <div style="display:flex; gap:5px;">
                            <button onclick="toggleRoomStatus(${i})" class="btn-staff-sm" style="flex:2;">TOGGLE STATUS</button>
                            <button onclick="deleteRoom(${i})" class="btn-guest-sm" style="flex:1; color:red; border-color:red;">DEL</button>
                        </div>
                    ` : `
                        <div style="display:flex; gap:10px;">
                            ${!isOccupied ? 
                                `<button onclick="openBookingModal(${i})" class="btn-staff-sm" style="flex:2;">Book Now</button>` : 
                                `<button onclick="processCheckout(${i})" class="btn-staff-sm" style="flex:2; background:#e74c3c; border-color:#e74c3c; color:white;">Check Out</button>`
                            }
                            <button onclick="openReviewModal(${i})" class="btn-guest-sm" style="flex:1;">Review</button>
                        </div>
                    `}
                </div>
            </div>
        </div>`;
    }).join('');
}

function openBookingModal(index) {
    const room = rooms[index];
    const today = new Date().toISOString().split('T')[0];
    
    // Map current active services into the booking window
    const servicesHTML = services.map(s => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.75rem;">
            <label style="cursor:pointer;"><input type="checkbox" class="svc-check" value="${s.price}" onchange="updateTotal(${room.price})"> ${s.name}</label>
            <span style="color:#666;">+৳${s.price}</span>
        </div>`).join('');

    showModal(`
        <h3 style="margin-bottom:15px;">Reservation: ${room.name}</h3>
        <label style="font-size:0.6rem; font-weight:bold; color:#888;">GUEST NAME</label>
        <input type="text" id="gName" class="login-field" placeholder="Full legal name">
        
        <label style="font-size:0.6rem; font-weight:bold; color:#888; margin-top:10px; display:block;">CONTACT NO</label>
        <input type="text" id="gPhone" class="login-field" placeholder="01XXX-XXXXXX" style="margin-bottom:15px;">
        
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <div style="flex:1;">
                <label style="font-size:0.6rem; font-weight:bold; color:#888;">DATE</label>
                <input type="date" id="gDate" class="login-field" value="${today}">
            </div>
            <div style="flex:1;">
                <label style="font-size:0.6rem; font-weight:bold; color:#888;">NIGHTS</label>
                <input type="number" id="gDays" class="login-field" value="1" min="1" oninput="updateTotal(${room.price})">
            </div>
        </div>

        <div style="text-align:left; margin-bottom:15px; border-top:1px solid #eee; padding-top:10px;">
            <p style="font-size:0.6rem; font-weight:800; color:#888; margin-bottom:10px;">EXTRA AMENITIES</p>
            ${servicesHTML}
        </div>

        <div style="background:#f4f4f4; padding:20px; border-radius:6px; margin-bottom:15px; text-align:center; border:1px solid #e0e0e0;">
            <span style="font-size:0.6rem; color:#666; font-weight:bold;">ESTIMATED TOTAL BILL</span>
            <div style="font-size:1.6rem; font-weight:800; color:#2ecc71; margin-top:5px;">৳<span id="calcAmount">${room.price.toLocaleString()}</span></div>
        </div>
        <button onclick="processBooking(${index})" class="btn-staff-sm" style="width:100%; padding:12px;">Confirm Reservation</button>
    `);
}

function updateTotal(base) {
    const days = parseInt(document.getElementById('gDays').value) || 1;
    let total = base * days;
    
    // Add logic for service checkboxes
    document.querySelectorAll('.svc-check:checked').forEach(c => {
        total += parseInt(c.value);
    });

    const display = document.getElementById('calcAmount');
    if (display) display.innerText = total.toLocaleString();
}

function processBooking(i) {
    const name = document.getElementById("gName").value;
    const phone = document.getElementById("gPhone").value;
    const days = document.getElementById("gDays").value || 1;
    const finalBill = document.getElementById("calcAmount").innerText.replace(/,/g, '');

    if (!name || !phone) {
        alert("CRITICAL ERROR: Please provide both Guest Name and Phone Number.");
        return;
    }

    // Push new guest record to memory
    records.push({ 
        id: Date.now(), 
        guestName: name, 
        phone: phone, 
        suite: rooms[i].name, 
        nights: days, 
        totalAmount: parseInt(finalBill), 
        date: document.getElementById("gDate").value 
    });

    rooms[i].status = "Occupied";
    saveData();
    alert("Reservation Confirmed! Database Updated.");
    location.reload();
}

function processCheckout(i) {
    if (confirm(`Finalize Check-out for ${rooms[i].name}? Unit will be cleaned and reset.`)) {
        rooms[i].status = "Available";
        saveData();
        location.reload();
    }
}

/* =========================================
   4. STAFF MANAGEMENT (SERVICES & INVENTORY)
   ========================================= */

/**
 * addRoom handles adding new suites to the system.
 */
function addRoom() {
    const name = document.getElementById("roomName").value;
    const price = document.getElementById("roomPrice").value;
    const img = document.getElementById("roomImg").value || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1000";

    if (!name || !price) {
        alert("Error: Suite Name and Nightly Rate are mandatory.");
        return;
    }

    rooms.push({ 
        id: Math.floor(Math.random() * 900) + 100, 
        name: name, 
        price: parseInt(price), 
        status: "Available", 
        img: img 
    });

    saveData();
    alert("New suite added to inventory.");
    location.reload();
}

function deleteRoom(i) {
    if (confirm("Permanently remove this suite from Urban Nest inventory?")) {
        rooms.splice(i, 1);
        saveData();
        renderUI();
    }
}

function toggleRoomStatus(i) {
    rooms[i].status = (rooms[i].status === "Available" ? "Occupied" : "Available");
    saveData();
    renderUI();
}

/**
 * Service Manager logic handles the menu of extra amenities.
 */
function renderServiceManager() {
    const list = document.getElementById("serviceList");
    if (!list) return;

    list.innerHTML = services.map((s, i) => `
        <div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #f0f0f0; align-items:center;">
            <div>
                <span style="font-size:0.85rem; font-weight:700;">${s.name}</span>
                <p style="margin:0; font-size:0.7rem; color:#888;">Cost: ৳${s.price.toLocaleString()}</p>
            </div>
            <button onclick="removeService(${i})" style="color:#e74c3c; background:none; border:none; cursor:pointer; font-size:1.5rem;">&times;</button>
        </div>`).join('');
}

/* =========================================
   FIXED SERVICE MANAGEMENT
   ========================================= */

function addService() {
    // 1. Grab the elements
    const nameInput = document.getElementById("svcName");
    const priceInput = document.getElementById("svcPrice");

    // 2. Debugging: Check if elements even exist in your HTML
    if (!nameInput || !priceInput) {
        console.error("HTML Error: Could not find inputs with IDs 'svcName' or 'svcPrice'");
        alert("System Error: Input fields not found in HTML. Check your IDs!");
        return;
    }

    // 3. Validation
    const nameValue = nameInput.value.trim();
    const priceValue = parseInt(priceInput.value);

    if (!nameValue || isNaN(priceValue)) {
        alert("Please enter a valid Service Name and Price.");
        return;
    }

    // 4. Update the Data Array
    const newService = { 
        name: nameValue, 
        price: priceValue 
    };
    
    services.push(newService);

    // 5. Save and Refresh
    saveData(); // Uses the central save function from the previous code
    
    // Clear the inputs for the next entry
    nameInput.value = "";
    priceInput.value = "";
    
    // Refresh the UI list
    renderUI();
    
    alert(`Success: ${nameValue} has been added to the service menu.`);
}

/**
 * Customer Table handles the history of all bookings.
 */
function renderCustomerTable() {
    const tbody = document.querySelector("#customerTable tbody");
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999; padding:20px;">No resident records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map((r, i) => `
        <tr>
            <td style="font-weight:700;">#${r.id.toString().slice(-4)}</td>
            <td>${r.guestName} <br><small style="color:#888; font-family:monospace;">${r.phone || ''}</small></td>
            <td>${r.suite} <span style="font-size:0.7rem; color:#bbb;">(${r.nights} nights)</span></td>
            <td style="font-weight:800; color:#2ecc71;">৳${r.totalAmount.toLocaleString()}</td>
            <td><button onclick="removeRecord(${i})" style="color:#e74c3c; border:none; background:none; cursor:pointer; font-weight:bold;">ARCHIVE</button></td>
        </tr>`).join('');
}

function removeRecord(i) {
    if (confirm("Archive this guest record permanently?")) {
        records.splice(i, 1);
        saveData();
        renderUI();
    }
}

/* =========================================
   5. REVIEWS & RATINGS SYSTEM
   ========================================= */

function openReviewModal(i) {
    const roomReviews = reviews.filter(r => r.suite === rooms[i].name);
    
    const listHTML = roomReviews.map(r => `
        <div style="border-bottom:1px solid #eee; padding:12px 0; text-align:left;">
            <div style="color:#f1c40f; margin-bottom:5px;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            <p style="font-size:0.8rem; font-style:italic; color:#555;">"${r.comment}"</p>
        </div>`).join('') || "<p style='color:#ccc; padding:20px 0;'>No reviews yet for this suite.</p>";

    showModal(`
        <h3>Resident Reviews: ${rooms[i].name}</h3>
        <div style="max-height:180px; overflow-y:auto; border-bottom:1px solid #eee;">${listHTML}</div>
        
        <div style="margin-top:20px; background:#f9f9f9; padding:20px; border-radius:10px; border:1px solid #eee;">
            <p style="font-size:0.6rem; font-weight:800; color:#888; margin-bottom:10px;">RATE YOUR EXPERIENCE</p>
            <div style="font-size:1.8rem; cursor:pointer; color:#ddd; margin-bottom:15px; letter-spacing:5px;">
                ${[1,2,3,4,5].map(n => `<span onclick="setStar(${n})" class="star-btn" style="transition:0.2s;">★</span>`).join('')}
            </div>
            <textarea id="revText" class="login-field" placeholder="Share your feedback with future residents..." style="height:70px;"></textarea>
            <button onclick="saveReview(${i})" class="btn-staff-sm" style="width:100%; margin-top:10px; background:#111; color:#fff; border:none;">Submit Review</button>
        </div>`);
}

function setStar(n) {
    activeRating = n;
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach((s, i) => s.style.color = i < n ? '#f1c40f' : '#ddd');
}

function saveReview(i) {
    const comment = document.getElementById("revText").value;
    
    if (!activeRating) {
        alert("Please select a star rating before submitting.");
        return;
    }

    reviews.push({ 
        suite: rooms[i].name, 
        rating: activeRating, 
        comment: comment || "Great stay!" 
    });

    saveData();
    alert("Feedback Submitted! Thank you.");
    location.reload();
}

/* =========================================
   6. UI UTILITIES & MODAL ENGINE
   ========================================= */

/**
 * showModal handles the creation and styling of full-screen overlays.
 */
function showModal(content) {
    const existing = document.querySelector('.modal');
    if (existing) existing.remove();

    const m = document.createElement('div');
    m.className = 'modal';
    
    // Applying CSS-in-JS for isolation
    m.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); display: flex;
        justify-content: center; align-items: center; z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;

    m.innerHTML = `
        <div class="modal-content" style="background:#fff; padding:35px; border-radius:12px; width:90%; max-width:420px; position:relative; box-shadow:0 15px 35px rgba(0,0,0,0.4);">
            <span onclick="this.parentElement.parentElement.remove()" style="position:absolute; right:15px; top:10px; cursor:pointer; font-size:2rem; color:#ccc;">&times;</span>
            ${content}
        </div>`;
    
    document.body.appendChild(m);
}

// Global script end. Urban Nest Suite Management System.
