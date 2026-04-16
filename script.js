/* =========================================
   1. DATABASE & PERSISTENCE LAYER
   ========================================= */
const demoRooms = [
    { id: 101, name: "Skyline Executive", price: 12500, status: "Available", img: "room1.avif" },
    { id: 102, name: "Urban Loft", price: 8500, status: "Available", img: "room2.jpeg" },
    { id: 103, name: "The Royal Suite", price: 25000, status: "Available", img: "room3.jpg" }
];


let rooms = JSON.parse(localStorage.getItem("un_rooms")) || [];
let services = JSON.parse(localStorage.getItem("un_services")) || [];
let records = JSON.parse(localStorage.getItem("un_records")) || [];
let reviews = JSON.parse(localStorage.getItem("un_reviews")) || [];

const CHECKOUT_TIME = "11:00 AM";
let activeRating = 0;

/* =========================================
   2. APP INITIALIZATION
   ========================================= */
function initApp() {
    const role = localStorage.getItem("userRole") || "guest";
    const badge = document.getElementById("user-badge");
    if (badge) badge.innerText = (role === "admin" ? "STAFF ACCESS" : "RESIDENT PORTAL");

    const staffDash = document.getElementById("staff-view");
    const guestDash = document.getElementById("guest-view");
    if (staffDash) staffDash.style.display = (role === "admin" ? "block" : "none");
    if (guestDash) guestDash.style.display = (role === "guest" ? "block" : "none");

    renderUI();
}

function renderUI() {
    if (document.getElementById("roomGrid")) renderRooms();
    if (document.getElementById("customerTable")) renderCustomerTable();
    if (document.getElementById("serviceList")) renderServiceManager();
}

window.onload = initApp;

/* =========================================
   3. CUSTOMER RECORDS & CHECKOUT LOGIC (FIXED)
   ========================================= */
function renderCustomerTable() {
    const tableBody = document.querySelector("#customerTable tbody");
    if (!tableBody) return;

    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#aaa;">No active residents found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = records.map((rec) => `
        <tr>
            <td><strong>#${rec.id.toString().slice(-4)}</strong></td>
            <td><strong>${rec.guestName}</strong><br><small>${rec.guestPhone}</small></td>
            <td>${rec.suite}</td>
            <td>৳${rec.totalAmount.toLocaleString()}</td>
            <td>${rec.date}<br><small style="color:red;">Checkout: ${rec.checkoutTime}</small></td>
            <td>
                <button onclick="processCheckout(${rec.id}, '${rec.suite}')" 
                    style="background:#e67e22; color:white; border:none; padding:8px 12px; border-radius:4px; font-size:0.6rem; font-weight:800; cursor:pointer;">
                    CHECK OUT
                </button>
            </td>
        </tr>
    `).join('');
}

function processCheckout(recordId, suiteName) {
    if (confirm(`Confirm checkout for ${suiteName}? This will free the room for new guests.`)) {

        const roomIdx = rooms.findIndex(r => r.name === suiteName);
        if (roomIdx !== -1) {
            rooms[roomIdx].status = "Available";
            localStorage.setItem("un_rooms", JSON.stringify(rooms));
        }

        records = records.filter(r => r.id !== recordId);
        localStorage.setItem("un_records", JSON.stringify(records));

        renderUI();
        alert("Resident successfully checked out.");
    }
}

/* =========================================
   4. ROOM RENDERING & STAFF CONTROLS
   ========================================= */
function renderRooms() {
    const grid = document.getElementById("roomGrid");
    if (!grid) return;
    const role = localStorage.getItem("userRole") || "guest";

    if (rooms.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:40px; color:#aaa;">The hotel is empty. Use Staff tools to add suites.</p>`;
        return;
    }

    grid.innerHTML = rooms.map((room, i) => {
        const isOccupied = room.status === "Occupied";
        const roomReviews = reviews.filter(rev => rev.suite === room.name);

        return `
        <div class="mgmt-card" style="padding:0; overflow:hidden; text-align:left; opacity: ${isOccupied && role !== 'admin' ? '0.8' : '1'}">
            <div style="height:200px; background:url('${room.img}') center/cover;"></div>

            <div style="padding:25px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-size:0.55rem; font-weight:800; color:#aaa;">UNIT ${room.id}</span>
                    <span class="status-badge ${isOccupied ? 'status-red' : 'status-green'}">${room.status}</span>
                </div>

                <h3>${room.name}</h3>
                <p style="font-weight:700; color:#333; margin-bottom:15px;">৳${room.price.toLocaleString()}</p>

                <div style="margin-bottom:20px; border-top:1px solid #eee; padding-top:10px; max-height:80px; overflow-y:auto;">
                    ${roomReviews.length > 0 ? roomReviews.map(r => `
                        <div style="margin-bottom:8px; display:flex; justify-content:space-between;">
                            <div>
                                <div style="color:#f1c40f; font-size:0.6rem;">${'★'.repeat(r.rating)}</div>
                                <p style="font-size:0.65rem; color:#666;">"${r.comment}"</p>
                            </div>
                            ${role === 'admin' ? `<button onclick="deleteReview(${r.id})" style="color:red; border:none; background:none; cursor:pointer;">&times;</button>` : ''}
                        </div>
                    `).join('') : '<p style="font-size:0.6rem; color:#ccc;">No feedback.</p>'}
                </div>

                <div style="display:flex; flex-direction:column; gap:10px;">

                    ${role !== 'admin' ? `
                        <div style="display:flex; gap:10px;">

                            ${!isOccupied ? `<button onclick="openBookingModal(${i})" class="btn-staff-sm" style="flex:2;">Book Now</button>` :
                            `<button disabled class="btn-staff-sm" style="flex:2; background:#ccc; cursor:not-allowed;">Occupied</button>`}

                            <button onclick="openReviewModal(${i})" class="btn-guest-sm" style="flex:1;">Review</button>
                        </div>
                    ` : `
                        <div style="display:flex; gap:5px;">
                            <button onclick="toggleRoomStatus(${i})" style="flex:2; padding:8px; font-size:0.55rem; font-weight:800; background:#f9f9f9; border:1px solid #ddd; cursor:pointer;">TOGGLE STATUS</button>
                            <button onclick="deleteRoom(${i})" style="flex:1; padding:8px; font-size:0.55rem; font-weight:800; border:1px solid #ffcccc; color:red; cursor:pointer;">DEL</button>
                        </div>
                    `}

                </div>
            </div>
        </div>
        `;
    }).join('');
}

/* =========================================
   5. BOOKING & MODALS (UPDATED - SERVICE SELECTION ADDED)
   ========================================= */
function processBooking(roomIndex) {
    const name = document.getElementById("gName").value;
    const phone = document.getElementById("gPhone").value;
    const date = document.getElementById("gDate").value;

    // ✅ NEW: collect selected services
    const selectedServices = Array.from(document.querySelectorAll(".service-check:checked"))
        .map(cb => JSON.parse(cb.value));

    const serviceTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);

    if (!name || !phone) return alert("Missing details.");

    records.push({
        id: Date.now(),
        guestName: name,
        guestPhone: phone,
        suite: rooms[roomIndex].name,
        totalAmount: rooms[roomIndex].price + serviceTotal,
        services: selectedServices,
        date: date,
        checkoutTime: CHECKOUT_TIME
    });

    localStorage.setItem("un_records", JSON.stringify(records));
    rooms[roomIndex].status = "Occupied";
    localStorage.setItem("un_rooms", JSON.stringify(rooms));

    location.reload();
}

function openBookingModal(index) {
    const room = rooms[index];

    showModal(`
        <h3>Book ${room.name}</h3>

        <input type="text" id="gName" class="login-field" placeholder="Full Name">
        <input type="text" id="gPhone" class="login-field" placeholder="Phone Number" style="margin:10px 0;">
        <input type="date" id="gDate" class="login-field" value="${new Date().toISOString().split('T')[0]}">

        <!-- ✅ NEW: Services selection UI -->
        <div style="margin-top:15px; text-align:left;">
            <h4 style="font-size:0.7rem; margin-bottom:8px;">Add Services</h4>
            ${services.length ? services.map((s, i) => `
                <label style="display:block; font-size:0.65rem;">
                    <input type="checkbox" class="service-check" value='${JSON.stringify(s)}'>
                    ${s.name} (৳${s.price})
                </label>
            `).join('') : `<p style="font-size:0.6rem; color:#aaa;">No services available</p>`}
        </div>

        <button onclick="processBooking(${index})" class="btn-staff-sm" style="width:100%; margin-top:20px;">
            Confirm & Book
        </button>
    `);
}

/* =========================================
   6. STAFF TOOLS (UNCHANGED)
   ========================================= */
function addRoom() { /* unchanged */ }
function deleteRoom(i) { if(confirm("Delete room?")) { rooms.splice(i, 1); localStorage.setItem("un_rooms", JSON.stringify(rooms)); renderRooms(); } }
function toggleRoomStatus(i) {
    rooms[i].status = rooms[i].status === "Available" ? "Occupied" : "Available";
    localStorage.setItem("un_rooms", JSON.stringify(rooms));
    renderRooms();
}

/* =========================================
   7. SERVICES (UNCHANGED LOGIC)
   ========================================= */
function renderServiceManager() {
    const list = document.getElementById("serviceList");
    if (!list) return;
    list.innerHTML = services.map((s, i) => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${s.name} (৳${s.price.toLocaleString()})</span>
            <button onclick="removeService(${i})" style="color:red; background:none; border:none; cursor:pointer;">&times;</button>
        </div>
    `).join('');
}

function addService() {
    const n = document.getElementById("newSvcName"), p = document.getElementById("newSvcPrice");
    if (n.value && !isNaN(p.value)) {
        services.push({ name: n.value, price: parseInt(p.value) });
        localStorage.setItem("un_services", JSON.stringify(services));
        n.value = ""; p.value = "";
        renderServiceManager();
    }
}

function removeService(i) {
    services.splice(i, 1);
    localStorage.setItem("un_services", JSON.stringify(services));
    renderServiceManager();
}

/* =========================================
   8. REVIEWS (UNCHANGED)
   ========================================= */
function openReviewModal(i) { /* unchanged */ }
function setStar(n) { /* unchanged */ }
function saveReview(suiteName) { /* unchanged */ }
function deleteReview(id) { /* unchanged */ }

/* =========================================
   9. MODAL (UNCHANGED)
   ========================================= */
function showModal(content) {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="modal-content"><span onclick="this.parentElement.parentElement.remove()" style="position:absolute; right:20px; top:15px; cursor:pointer; font-size:1.5rem;">&times;</span>${content}</div>`;
    document.body.appendChild(m);
}
