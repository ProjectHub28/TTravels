// Payments Table Row Renderer
function createPaymentRow(payment) {
    const statusColors = {
        success: 'bg-green-100 text-green-800',
        completed: 'bg-green-100 text-green-800',
        paid: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-800',
        cancelled: 'bg-red-100 text-red-800',
        refunded: 'bg-blue-100 text-blue-800',
        '-': 'bg-gray-100 text-gray-800'
    };
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${payment.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${payment.booking}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${payment.user}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(payment.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${payment.method}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[payment.status] || statusColors['-']}">
                    ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${payment.transaction}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(payment.date)}</td>
        </tr>
    `;
}
// TTravels Admin Panel JavaScript

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    initializeAdmin();
});

function checkAdminAuth() {
    // Since we're using Appwrite authentication via Flask sessions,
    // we'll assume if the page loads, the user is authenticated.
    // The Flask route should handle authentication before rendering the page.
    
    // Set a default admin name (you can modify this or get it from the server)
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
        adminNameElement.textContent = 'Admin';
    }
}

function initializeAdmin() {
    setupNavigation();
    setupLogout();
    loadDashboardData();
    loadBookingsData();
    loadUsersData();
}

// Navigation Setup
function setupNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            switchSection(section);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            document.querySelector(`[data-section="${section}"]`).classList.add('active');
        });
    });
}

function switchSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Load section-specific data
    switch(sectionName) {
        case 'bookings':
            loadBookingsData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'ai-logs':
            loadAILogsData();
            break;
        case 'payments':
            loadPaymentsData();
            break;
        case 'content':
            loadContentData();
            break;
        case 'support':
            loadSupportData();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

// Logout Setup
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            // Redirect to Flask logout route to clear session
            window.location.href = '/admin/logout';
        }
    });
}

// Dashboard Data
function loadDashboardData() {
    // This would typically fetch real data from an API
    console.log('Dashboard data loaded');
}

// Bookings Management
function loadBookingsData() {
    const bookingsTable = document.getElementById('bookingsTable');
    if (!bookingsTable) return;
    bookingsTable.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading...</td></tr>';
    fetch('/api/admin/bookings')
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to load bookings');
            const bookings = (data.bookings || []).map(doc => mapAdminBooking(doc));
            bookingsTable.innerHTML = bookings.length ? bookings.map(createBookingRow).join('') : '<tr><td colspan="7" class="text-center py-4">No bookings found.</td></tr>';
        })
        .catch(err => {
            bookingsTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-600">${err.message}</td></tr>`;
        });
}

function mapAdminBooking(doc) {
    let details = {};
    if (doc.details) {
        try { details = typeof doc.details === 'string' ? JSON.parse(doc.details) : doc.details; } catch (e) { details = {}; }
    }
    let contact_info = {};
    if (doc.contact_info) {
        try { contact_info = typeof doc.contact_info === 'string' ? JSON.parse(doc.contact_info) : doc.contact_info; } catch (e) { contact_info = {}; }
    }
    return {
        id: doc.$id || doc.booking_id || doc.id || '',
        user: doc.user_id || '-',
        email: contact_info.email || '-',
        service: doc.type || '-',
        details: details.hotel?.name || details.flight?.airline || details.train?.train_name || details.bus?.route || details.car?.car || doc.service_type || '-',
        date: doc.created_at || doc.booking_date || doc.booked_at || '',
        amount: doc.fare_total || doc.amount || 0,
        status: doc.payment_status || doc.status || 'confirmed'
    };
}

function createBookingRow(booking) {
    const statusColors = {
        confirmed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        cancelled: 'bg-red-100 text-red-800'
    };
    
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${booking.id}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${booking.user}</div>
                <div class="text-sm text-gray-500">${booking.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${booking.service}</div>
                <div class="text-sm text-gray-500">${booking.details}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(booking.date)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(booking.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}">
                    ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewBooking('${booking.id}')" class="text-primary-600 hover:text-primary-900 mr-3">View</button>
                <button onclick="editBooking('${booking.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                ${booking.status !== 'cancelled' ? `<button onclick="cancelBooking('${booking.id}')" class="text-red-600 hover:text-red-900">Cancel</button>` : ''}
            </td>
        </tr>
    `;
}

// Users Management
function loadUsersData() {
    const usersTable = document.getElementById('usersTable');
    if (!usersTable) return;
    usersTable.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading...</td></tr>';
    fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to load users');
            const users = (data.users || []).map(doc => mapAdminUser(doc));
            usersTable.innerHTML = users.length ? users.map(createUserRow).join('') : '<tr><td colspan="7" class="text-center py-4">No users found.</td></tr>';
        })
        .catch(err => {
            usersTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-600">${err.message}</td></tr>`;
        });
}

function mapAdminUser(doc) {
    return {
        id: doc.$id || doc.id || '-',
        name: doc.fname && doc.lname ? `${doc.fname} ${doc.lname}` : (doc.fname || doc.lname || '-'),
        email: doc.email || '-',
        phone: doc.mobile || '-',
        joined: doc.$createdAt || doc.created_at || '-',
        bookings: '-', // You can count bookings per user if needed
        status: 'active' // You can add logic for user status if needed
    };
}

function createUserRow(user) {
    const statusColors = {
        active: 'bg-green-100 text-green-800',
        suspended: 'bg-red-100 text-red-800'
    };
    
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span class="text-primary-600 font-medium text-sm">${user.name.charAt(0)}</span>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${user.name}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.phone}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(user.joined)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.bookings}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[user.status]}">
                    ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewUser(${user.id})" class="text-primary-600 hover:text-primary-900 mr-3">View</button>
                <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                ${user.status === 'active' ? 
                    `<button onclick="suspendUser(${user.id})" class="text-red-600 hover:text-red-900">Suspend</button>` :
                    `<button onclick="activateUser(${user.id})" class="text-green-600 hover:text-green-900">Activate</button>`
                }
            </td>
        </tr>
    `;
}

// AI Logs Management
function loadAILogsData() {
    const aiLogsTable = document.getElementById('aiLogsTable');
    if (!aiLogsTable) return;
    aiLogsTable.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading...</td></tr>';
    fetch('/api/admin/ai-logs')
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to load AI logs');
            const logs = (data.logs || []).map(doc => mapAILog(doc));
            aiLogsTable.innerHTML = logs.length ? logs.map(createAILogRow).join('') : '<tr><td colspan="6" class="text-center py-4">No AI logs found.</td></tr>';
        })
        .catch(err => {
            aiLogsTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-600">${err.message}</td></tr>`;
        });
}

function mapAILog(doc) {
    // Parse trip_plan if it's a string
    let trip_plan = {};
    if (doc.trip_plan) {
        try {
            trip_plan = typeof doc.trip_plan === 'string' ? JSON.parse(doc.trip_plan) : doc.trip_plan;
        } catch (e) {
            trip_plan = {};
        }
    }
    
    // Extract destination from trip_plan details
    const destination = trip_plan?.details?.destination || trip_plan?.destination || '-';
    
    return {
        id: doc.$id || doc.id || '-',
        user_id: doc.user_id || '-',
        title: doc.title || '-',
        destination: destination,
        created_at: doc.$createdAt || doc.created_at || doc.createdAt || '-'
    };
}

function createAILogRow(log) {
    return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${log.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.user_id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.title}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.destination}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(log.created_at)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewAILog('${log.id}')" class="text-primary-600 hover:text-primary-900 mr-3">View</button>
                <button onclick="deleteAILog('${log.id}')" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
        </tr>
    `;
}

function viewAILog(logId) {
    // Fetch and display full trip plan details
    fetch(`/api/admin/ai-logs/${logId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to load log details');
            // Display in a modal or alert for now
            const log = data.log;
            let tripPlan = {};
            try {
                tripPlan = typeof log.trip_plan === 'string' ? JSON.parse(log.trip_plan) : log.trip_plan || {};
            } catch (e) {
                tripPlan = {};
            }
            alert(`AI Log Details:\n\nPlan ID: ${log.$id || log.id}\nUser ID: ${log.user_id}\nTitle: ${log.title}\nDestination: ${tripPlan?.details?.destination || 'N/A'}\nCreated: ${formatDate(log.$createdAt || log.created_at)}`);
        })
        .catch(err => {
            alert(`Error: ${err.message}`);
        });
}

function deleteAILog(logId) {
    if (confirm(`Are you sure you want to delete this AI log (Plan ID: ${logId})?`)) {
        fetch(`/api/admin/ai-logs/${logId}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to delete log');
            alert('AI log deleted successfully');
            loadAILogsData(); // Reload data
        })
        .catch(err => {
            alert(`Error: ${err.message}`);
        });
    }
}

function loadPaymentsData() {
    const paymentsTable = document.getElementById('paymentsTable');
    if (!paymentsTable) return;
    paymentsTable.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading...</td></tr>';
    fetch('/api/admin/payments')
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to load payments');
            const payments = (data.payments || []).map(doc => mapAdminPayment(doc));
            paymentsTable.innerHTML = payments.length ? payments.map(createPaymentRow).join('') : '<tr><td colspan="7" class="text-center py-4">No payments found.</td></tr>';
        })
        .catch(err => {
            paymentsTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-600">${err.message}</td></tr>`;
        });
}

function mapAdminPayment(doc) {
    return {
        id: doc.$id || doc.payment_id || doc.id || '-',
        booking: doc.booking_id || '-',
        user: doc.user_id || '-',
        amount: doc.amount || 0,
        method: doc.method || '-',
        status: doc.status || '-',
        transaction: doc.transaction_id || '-',
        date: doc.timestamp || doc.created_at || '-'
    };
}


function loadContentData() {
    console.log('Loading content data...');
}

function loadSupportData() {
    console.log('Loading support data...');
}

function loadReportsData() {
    console.log('Loading reports data...');
}

// Action Functions
function viewBooking(bookingId) {
    alert(`Viewing booking: ${bookingId}`);
}

function editBooking(bookingId) {
    alert(`Editing booking: ${bookingId}`);
}

function cancelBooking(bookingId) {
    if (confirm(`Are you sure you want to cancel booking ${bookingId}?`)) {
        alert(`Booking ${bookingId} cancelled`);
        loadBookingsData(); // Reload data
    }
}

function viewUser(userId) {
    alert(`Viewing user: ${userId}`);
}

function editUser(userId) {
    alert(`Editing user: ${userId}`);
}

function suspendUser(userId) {
    if (confirm(`Are you sure you want to suspend this user?`)) {
        alert(`User ${userId} suspended`);
        loadUsersData(); // Reload data
    }
}

function activateUser(userId) {
    if (confirm(`Are you sure you want to activate this user?`)) {
        alert(`User ${userId} activated`);
        loadUsersData(); // Reload data
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// CSS Styles for admin components
const adminStyles = `
    .admin-nav-item {
        display: flex;
        align-items: center;
        padding: 0.75rem 1rem;
        color: #6b7280;
        text-decoration: none;
        border-radius: 0.5rem;
        transition: all 0.2s;
    }
    
    .admin-nav-item:hover {
        background-color: #f3f4f6;
        color: #374151;
    }
    
    .admin-nav-item.active {
        background-color: #dbeafe;
        color: #2563eb;
    }
    
    .admin-nav-item svg {
        margin-right: 0.75rem;
    }
    
    .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        color: #374151;
        text-decoration: none;
        transition: all 0.2s;
        cursor: pointer;
    }
    
    .quick-action-btn:hover {
        background-color: #f3f4f6;
        border-color: #d1d5db;
        transform: translateY(-1px);
    }
`;

// Inject admin styles
const styleSheet = document.createElement('style');
styleSheet.textContent = adminStyles;
document.head.appendChild(styleSheet);