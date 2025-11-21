// Booking Management JavaScript

let currentBookings = [];
let filteredBookings = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    initializeBookingManagement();
    loadBookingsData();
});

function checkAdminAuth() {
    const admin = localStorage.getItem('ttravels_admin');
    if (!admin) {
        window.location.href = '/index.html';
        return;
    }
}

function initializeBookingManagement() {
    setupEventListeners();
    setupModal();
}

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('ttravels_admin');
            window.location.href = '/index.html';
        }
    });

    // Filters
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    
    // Select All
    document.getElementById('selectAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(currentPage + 1));
}

function setupModal() {
    const modal = document.getElementById('bookingModal');
    const closeBtn = document.getElementById('closeModal');
    
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function loadBookingsData() {
    // Mock booking data - in real app, this would come from API
    currentBookings = [
        {
            id: 'FL001',
            type: 'flight',
            user: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+91 9876543210'
            },
            service: {
                name: 'Air India AI 131',
                route: 'DEL → BOM',
                date: '2025-01-15',
                time: '06:30'
            },
            amount: 4500,
            status: 'confirmed',
            bookingDate: '2025-01-10',
            passengers: 1,
            pnr: 'AI123456'
        },
        {
            id: 'HT001',
            type: 'hotel',
            user: {
                name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+91 9876543211'
            },
            service: {
                name: 'The Oberoi Mumbai',
                location: 'Nariman Point, Mumbai',
                checkIn: '2025-01-20',
                checkOut: '2025-01-22',
                rooms: 1
            },
            amount: 24000,
            status: 'pending',
            bookingDate: '2025-01-12',
            guests: 2
        },
        {
            id: 'TR001',
            type: 'train',
            user: {
                name: 'Mike Johnson',
                email: 'mike@example.com',
                phone: '+91 9876543212'
            },
            service: {
                name: 'Rajdhani Express 12951',
                route: 'BOM → GOA',
                date: '2025-01-25',
                time: '16:50',
                class: '2A'
            },
            amount: 2400,
            status: 'confirmed',
            bookingDate: '2025-01-15',
            passengers: 2,
            pnr: 'TR789012'
        },
        {
            id: 'BU001',
            type: 'bus',
            user: {
                name: 'Sarah Wilson',
                email: 'sarah@example.com',
                phone: '+91 9876543213'
            },
            service: {
                name: 'VRL Travels VRL 2501',
                route: 'BOM → PUNE',
                date: '2025-01-18',
                time: '22:30',
                seats: ['A1', 'A2']
            },
            amount: 1600,
            status: 'cancelled',
            bookingDate: '2025-01-14',
            passengers: 2
        },
        {
            id: 'CR001',
            type: 'car',
            user: {
                name: 'David Brown',
                email: 'david@example.com',
                phone: '+91 9876543214'
            },
            service: {
                name: 'Honda City',
                pickup: 'Mumbai Airport',
                drop: 'Mumbai Airport',
                startDate: '2025-01-22',
                endDate: '2025-01-24'
            },
            amount: 4400,
            status: 'confirmed',
            bookingDate: '2025-01-16',
            days: 2
        }
    ];
    
    filteredBookings = [...currentBookings];
    displayBookings();
    updateStats();
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const serviceType = document.getElementById('serviceFilter').value;
    const status = document.getElementById('statusFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    filteredBookings = currentBookings.filter(booking => {
        // Search filter
        const searchMatch = !search || 
            booking.id.toLowerCase().includes(search) ||
            booking.user.name.toLowerCase().includes(search) ||
            booking.user.email.toLowerCase().includes(search) ||
            booking.service.name.toLowerCase().includes(search);
        
        // Service type filter
        const serviceMatch = !serviceType || booking.type === serviceType;
        
        // Status filter
        const statusMatch = !status || booking.status === status;
        
        // Date range filter
        let dateMatch = true;
        if (dateFrom || dateTo) {
            const bookingDate = new Date(booking.bookingDate);
            if (dateFrom) dateMatch = dateMatch && bookingDate >= new Date(dateFrom);
            if (dateTo) dateMatch = dateMatch && bookingDate <= new Date(dateTo);
        }
        
        return searchMatch && serviceMatch && statusMatch && dateMatch;
    });
    
    currentPage = 1;
    displayBookings();
    updateStats();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('serviceFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    filteredBookings = [...currentBookings];
    currentPage = 1;
    displayBookings();
    updateStats();
}

function displayBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageBookings = filteredBookings.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageBookings.map(booking => createBookingRow(booking)).join('');
    updatePagination();
}

function createBookingRow(booking) {
    const statusColors = {
        confirmed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        cancelled: 'bg-red-100 text-red-800',
        completed: 'bg-blue-100 text-blue-800'
    };
    
    const serviceIcons = {
        flight: '✈️',
        hotel: '🏨',
        train: '🚆',
        bus: '🚌',
        car: '🚗'
    };
    
    return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="rounded border-gray-300" value="${booking.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${booking.id}</div>
                <div class="text-sm text-gray-500">Booked: ${formatDate(booking.bookingDate)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${booking.user.name}</div>
                <div class="text-sm text-gray-500">${booking.user.email}</div>
                <div class="text-sm text-gray-500">${booking.user.phone}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="text-lg mr-2">${serviceIcons[booking.type]}</span>
                    <div>
                        <div class="text-sm font-medium text-gray-900">${booking.service.name}</div>
                        <div class="text-sm text-gray-500">${getServiceDetails(booking)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${getTravelDate(booking)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${formatCurrency(booking.amount)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}">
                    ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewBookingDetails('${booking.id}')" class="text-primary-600 hover:text-primary-900">
                        View
                    </button>
                    <button onclick="editBooking('${booking.id}')" class="text-indigo-600 hover:text-indigo-900">
                        Edit
                    </button>
                    ${booking.status !== 'cancelled' && booking.status !== 'completed' ? 
                        `<button onclick="cancelBooking('${booking.id}')" class="text-red-600 hover:text-red-900">Cancel</button>` : 
                        ''
                    }
                </div>
            </td>
        </tr>
    `;
}

function getServiceDetails(booking) {
    switch (booking.type) {
        case 'flight':
            return `${booking.service.route} • ${booking.service.time}`;
        case 'hotel':
            return `${booking.service.location} • ${booking.service.rooms} room(s)`;
        case 'train':
            return `${booking.service.route} • ${booking.service.class}`;
        case 'bus':
            return `${booking.service.route} • ${booking.service.seats?.join(', ')}`;
        case 'car':
            return `${booking.service.pickup} → ${booking.service.drop}`;
        default:
            return '';
    }
}

function getTravelDate(booking) {
    switch (booking.type) {
        case 'flight':
        case 'train':
        case 'bus':
            return formatDate(booking.service.date);
        case 'hotel':
            return `${formatDate(booking.service.checkIn)} - ${formatDate(booking.service.checkOut)}`;
        case 'car':
            return `${formatDate(booking.service.startDate)} - ${formatDate(booking.service.endDate)}`;
        default:
            return '';
    }
}

function updateStats() {
    document.getElementById('showingCount').textContent = Math.min(filteredBookings.length, itemsPerPage);
    document.getElementById('totalCount').textContent = filteredBookings.length;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayBookings();
    }
}

// Action Functions
function viewBookingDetails(bookingId) {
    const booking = currentBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const modal = document.getElementById('bookingModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = createBookingDetailsHTML(booking);
    modal.classList.remove('hidden');
}

function createBookingDetailsHTML(booking) {
    const statusColors = {
        confirmed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        cancelled: 'bg-red-100 text-red-800',
        completed: 'bg-blue-100 text-blue-800'
    };
    
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-lg font-semibold text-gray-900">Booking ${booking.id}</h4>
                    <p class="text-sm text-gray-600">Booked on ${formatDate(booking.bookingDate)}</p>
                </div>
                <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColors[booking.status]}">
                    ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h5 class="font-medium text-gray-900 mb-3">Customer Information</h5>
                    <div class="space-y-2 text-sm">
                        <p><span class="font-medium">Name:</span> ${booking.user.name}</p>
                        <p><span class="font-medium">Email:</span> ${booking.user.email}</p>
                        <p><span class="font-medium">Phone:</span> ${booking.user.phone}</p>
                    </div>
                </div>
                
                <div>
                    <h5 class="font-medium text-gray-900 mb-3">Service Details</h5>
                    <div class="space-y-2 text-sm">
                        ${createServiceDetailsHTML(booking)}
                    </div>
                </div>
            </div>
            
            <div>
                <h5 class="font-medium text-gray-900 mb-3">Payment Information</h5>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="flex justify-between items-center">
                        <span class="font-medium">Total Amount:</span>
                        <span class="text-lg font-bold text-gray-900">${formatCurrency(booking.amount)}</span>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4 border-t">
                <button onclick="editBooking('${booking.id}')" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    Edit Booking
                </button>
                ${booking.status !== 'cancelled' && booking.status !== 'completed' ? 
                    `<button onclick="cancelBooking('${booking.id}')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Cancel Booking
                    </button>` : 
                    ''
                }
            </div>
        </div>
    `;
}

function createServiceDetailsHTML(booking) {
    switch (booking.type) {
        case 'flight':
            return `
                <p><span class="font-medium">Flight:</span> ${booking.service.name}</p>
                <p><span class="font-medium">Route:</span> ${booking.service.route}</p>
                <p><span class="font-medium">Date:</span> ${formatDate(booking.service.date)}</p>
                <p><span class="font-medium">Time:</span> ${booking.service.time}</p>
                <p><span class="font-medium">Passengers:</span> ${booking.passengers}</p>
                ${booking.pnr ? `<p><span class="font-medium">PNR:</span> ${booking.pnr}</p>` : ''}
            `;
        case 'hotel':
            return `
                <p><span class="font-medium">Hotel:</span> ${booking.service.name}</p>
                <p><span class="font-medium">Location:</span> ${booking.service.location}</p>
                <p><span class="font-medium">Check-in:</span> ${formatDate(booking.service.checkIn)}</p>
                <p><span class="font-medium">Check-out:</span> ${formatDate(booking.service.checkOut)}</p>
                <p><span class="font-medium">Rooms:</span> ${booking.service.rooms}</p>
                <p><span class="font-medium">Guests:</span> ${booking.guests}</p>
            `;
        case 'train':
            return `
                <p><span class="font-medium">Train:</span> ${booking.service.name}</p>
                <p><span class="font-medium">Route:</span> ${booking.service.route}</p>
                <p><span class="font-medium">Date:</span> ${formatDate(booking.service.date)}</p>
                <p><span class="font-medium">Time:</span> ${booking.service.time}</p>
                <p><span class="font-medium">Class:</span> ${booking.service.class}</p>
                <p><span class="font-medium">Passengers:</span> ${booking.passengers}</p>
                ${booking.pnr ? `<p><span class="font-medium">PNR:</span> ${booking.pnr}</p>` : ''}
            `;
        case 'bus':
            return `
                <p><span class="font-medium">Bus:</span> ${booking.service.name}</p>
                <p><span class="font-medium">Route:</span> ${booking.service.route}</p>
                <p><span class="font-medium">Date:</span> ${formatDate(booking.service.date)}</p>
                <p><span class="font-medium">Time:</span> ${booking.service.time}</p>
                <p><span class="font-medium">Seats:</span> ${booking.service.seats?.join(', ')}</p>
                <p><span class="font-medium">Passengers:</span> ${booking.passengers}</p>
            `;
        case 'car':
            return `
                <p><span class="font-medium">Car:</span> ${booking.service.name}</p>
                <p><span class="font-medium">Pickup:</span> ${booking.service.pickup}</p>
                <p><span class="font-medium">Drop:</span> ${booking.service.drop}</p>
                <p><span class="font-medium">Start Date:</span> ${formatDate(booking.service.startDate)}</p>
                <p><span class="font-medium">End Date:</span> ${formatDate(booking.service.endDate)}</p>
                <p><span class="font-medium">Duration:</span> ${booking.days} days</p>
            `;
        default:
            return '';
    }
}

function editBooking(bookingId) {
    alert(`Edit booking functionality would be implemented here for booking: ${bookingId}`);
}

function cancelBooking(bookingId) {
    if (confirm(`Are you sure you want to cancel booking ${bookingId}?`)) {
        const bookingIndex = currentBookings.findIndex(b => b.id === bookingId);
        if (bookingIndex !== -1) {
            currentBookings[bookingIndex].status = 'cancelled';
            applyFilters(); // Refresh the display
            alert(`Booking ${bookingId} has been cancelled`);
        }
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}