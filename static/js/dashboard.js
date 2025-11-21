// Utility functions for date and time formatting (inlined for dashboard)
function formatDate(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return d.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) { return date; }
}

function formatTime(time) {
    if (!time) return '';
    try {
        // Accepts 'HH:mm' or 'HH:mm:ss' or ISO string
        let t = time;
        if (/^\d{2}:\d{2}$/.test(time)) t = `2000-01-01T${time}`;
        const d = new Date(t);
        if (isNaN(d.getTime())) return time;
        return d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) { return time; }
}
// Local currency formatter fallback
function formatCurrency(amount, currency = 'INR') {
    if (typeof TTravelApp !== 'undefined' && TTravelApp.formatCurrency) return TTravelApp.formatCurrency(amount);
    if (amount === null || amount === undefined || amount === 0) return amount === 0 ? '₹0' : '';
    // Basic numeric formatting with thousands separator
    try {
        const n = Number(amount);
        if (isNaN(n)) return String(amount);
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(n);
    } catch (e) {
        return '₹' + amount;
    }
}
// Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    // Backend session controls authentication; no localStorage redirect here
    setupBookingTabs();
    loadBookings();
    updateUserInfo();
    setupViewDetailsModal();
}

// Authentication is handled by backend session; no localStorage redirect needed

function updateUserInfo() {
    const user = JSON.parse(localStorage.getItem('ttravel_user') || '{}');
    const welcomeText = document.querySelector('h1');
    if (welcomeText && user.firstName) {
        welcomeText.textContent = `Welcome back, ${user.firstName}!`;
    }
}

// Setup Booking Tabs
function setupBookingTabs() {
    const bookingTabs = document.querySelectorAll('.booking-tab');
    
    bookingTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            bookingTabs.forEach(t => {
                t.classList.remove('active', 'bg-primary-50', 'text-primary-600');
                t.classList.add('text-gray-700', 'hover:bg-gray-50');
            });
            
            // Add active class to clicked tab
            this.classList.add('active', 'bg-primary-50', 'text-primary-600');
            this.classList.remove('text-gray-700', 'hover:bg-gray-50');
            
            const tabType = this.getAttribute('data-tab');
            loadBookings(tabType);
        });
    });
}

function loadBookings(filter = 'all') {
    const bookingsContainer = document.getElementById('bookingsContainer');
    if (!bookingsContainer) return;
    
    // Show loading
    bookingsContainer.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p class="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
    `;

    // If the user selected the saved-plans tab, fetch saved trip plans instead
    if (filter === 'saved-plans') {
        fetch('/api/my-saved-plans', { credentials: 'same-origin' })
            .then(res => {
                // Helpful debug: log HTTP status
                console.debug('[SavedPlans] HTTP', res.status, res.statusText);
                return res.json();
            })
            .then(data => {
                console.debug('[SavedPlans] response', data);
                if (!data || !data.success) throw new Error((data && data.error) || 'Failed to load saved plans');

                const rawPlans = data.plans || [];
                const plans = [];
                try {
                    rawPlans.forEach(d => {
                        try {
                            const tp = d.trip_plan || {};
                            // tp may already be an object or a JSON string
                            const details = (tp && typeof tp === 'object') ? (tp.details || tp) : (tp ? JSON.parse(tp) : {});
                            const start = details.start_date || details.startDate || details.departure_date || details.from || '';
                            const end = details.end_date || details.endDate || details.return_date || details.to || '';
                            const duration = (details.days && `${details.days} Days`) || (tp.duration || tp.days || '') || '';

                            plans.push({
                                id: d.id || (d.raw && d.raw.$id) || '',
                                destination: details.destination || details.city || (tp.destination || tp.title) || d.title || 'Trip',
                                duration: duration || '',
                                startDate: start,
                                endDate: end,
                                imageUrl: (details.image || tp.imageUrl || tp.image || '/static/img/default-trip.jpg'),
                                summary: tp.itinerary_text || tp.summary || tp.itinerary || (details.summary || ''),
                                highlights: tp.highlights || details.highlights || (tp.tags || []) || [],
                                estimatedCost: tp.estimated_cost || tp.estimatedCost || details.estimated_cost || 0,
                                savedDate: d.saved_at || (d.raw && d.raw.created_at) || ''
                            });
                        } catch (inner) {
                            console.error('Failed mapping saved plan doc', d, inner);
                        }
                    });
                } catch (e) {
                    console.error('Error processing saved plans', e);
                }

                displaySavedTripPlans(plans);
            })
            .catch(err => {
                console.error('[SavedPlans] fetch error', err);
                bookingsContainer.innerHTML = `<div class="text-center py-8 text-red-600">${err.message}</div>`;
            });
        return;
    }

    // Fetch real bookings from backend
    fetch('/api/my-bookings')
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Failed to load bookings');
            let bookings = data.bookings || [];
            // Map Appwrite booking data to frontend card structure
            bookings = bookings.map(doc => mapBookingToCard(doc));
            const filteredBookings = filter === 'all' ? bookings : bookings.filter(booking => booking.type === filter);
            displayBookings(filteredBookings);
        })
        .catch(err => {
            bookingsContainer.innerHTML = `<div class="text-center py-8 text-red-600">${err.message}</div>`;
        });
// Map Appwrite booking document to dashboard card structure
function mapBookingToCard(doc) {
    // Try to parse details if present
    let details = {};
    if (doc.details) {
        try { details = typeof doc.details === 'string' ? JSON.parse(doc.details) : doc.details; } catch (e) { details = {}; }
    }
    // Try to parse contact_info if present
    let contact_info = {};
    if (doc.contact_info) {
        try { contact_info = typeof doc.contact_info === 'string' ? JSON.parse(doc.contact_info) : doc.contact_info; } catch (e) { contact_info = {}; }
    }
    // Map type to plural for tab filtering
    let type = (doc.type || '').toLowerCase();
    if (type.endsWith('s')) type = type; else if (type) type = type + 's';
    // Compose card fields
    return {
        id: doc.$id || doc.booking_id || doc.id || '',
        type: type,
        title: details.hotel?.name || details.flight?.airline || details.train?.train_name || details.bus?.route || details.car?.car || doc.service || doc.service_type || 'Booking',
        airline: details.flight?.airline || doc.airline || '',
        flightNumber: details.flight?.flight_number || doc.flight_number || '',
        location: details.hotel?.address || doc.location || '',
        checkIn: details.hotel?.check_in || doc.check_in || '',
        checkOut: details.hotel?.check_out || doc.check_out || '',
        trainName: details.train?.train_name || doc.train_name || '',
        trainNumber: details.train?.train_number || doc.train_number || '',
        operator: details.bus?.operator || doc.operator || '',
        busNumber: details.bus?.bus_number || doc.bus_number || '',
        date: details.flight?.date || details.train?.date || details.bus?.date || doc.date || '',
        time: details.flight?.departure_time || details.train?.departure_time || details.bus?.departure_time || doc.time || '',
        status: doc.payment_status || doc.status || 'confirmed',
        price: doc.fare_total || doc.amount || 0,
        passengers: details.flight?.passengers || details.train?.passengers || details.bus?.passengers || doc.num_passengers || doc.passengers || 1,
        guests: details.hotel?.guests || doc.num_guests || doc.guests || 1,
        bookingDate: doc.created_at || doc.booking_date || doc.booked_at || '',
        contactEmail: contact_info.email || '',
        contactPhone: contact_info.phone || ''
    };
}
}

function getMockBookings() {
    return [
        {
            id: 'FL001',
            type: 'flights',
            title: 'Delhi to Mumbai',
            airline: 'Air India',
            flightNumber: 'AI 131',
            date: '2025-01-15',
            time: '06:30',
            status: 'confirmed',
            price: 4500,
            passengers: 2,
            bookingDate: '2025-01-10'
        },
        {
            id: 'HT001',
            type: 'hotels',
            title: 'The Oberoi Mumbai',
            location: 'Nariman Point, Mumbai',
            checkIn: '2025-01-15',
            checkOut: '2025-01-17',
            status: 'confirmed',
            price: 24000,
            guests: 2,
            bookingDate: '2025-01-10'
        },
        {
            id: 'TR001',
            type: 'trains',
            title: 'Mumbai to Goa',
            trainName: 'Konkan Kanya Express',
            trainNumber: '10111',
            date: '2025-01-20',
            time: '23:40',
            status: 'pending',
            price: 1200,
            passengers: 2,
            bookingDate: '2025-01-12'
        },
        {
            id: 'FL002',
            type: 'flights',
            title: 'Mumbai to Delhi',
            airline: 'IndiGo',
            flightNumber: '6E 2142',
            date: '2024-12-15',
            time: '14:30',
            status: 'completed',
            price: 3800,
            passengers: 1,
            bookingDate: '2024-12-10'
        },
        {
            id: 'BU001',
            type: 'buses',
            title: 'Mumbai to Pune',
            operator: 'VRL Travels',
            busNumber: 'VRL 2501',
            date: '2024-11-20',
            time: '22:00',
            status: 'cancelled',
            price: 800,
            passengers: 1,
            bookingDate: '2024-11-15'
        }
    ];
}

function displayBookings(bookings) {
    const bookingsContainer = document.getElementById('bookingsContainer');
    if (!bookingsContainer) return;
    
    if (bookings.length === 0) {
        bookingsContainer.innerHTML = `
            <div class="text-center py-12">
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                <p class="text-gray-600 mb-4">You haven't made any bookings yet.</p>
                <a href="index.html" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    Start Booking
                </a>
            </div>
        `;
        return;
    }
    
    bookingsContainer.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
}

function createBookingCard(booking) {
    const statusColors = {
        confirmed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-blue-100 text-blue-800',
        cancelled: 'bg-red-100 text-red-800'
    };
    
    const typeIcons = {
        flights: '✈️',
        hotels: '🏨',
        trains: '🚆',
        buses: '🚌',
        cars: '🚗'
    };
    
    return `
        <div class="border border-gray-200 rounded-lg p-6 mb-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-start">
                    <div class="text-2xl mr-3">${typeIcons[booking.type]}</div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">${booking.title}</h3>
                        <p class="text-sm text-gray-600">Booking ID: ${booking.id}</p>
                        ${getBookingDetails(booking)}
                    </div>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.status]}">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                    <p class="text-lg font-bold text-gray-900 mt-2">${formatCurrency(booking.price)}</p>
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                <div class="text-sm text-gray-600">
                    Booked on ${formatDate(booking.bookingDate)}
                </div>
                <div class="space-x-3">
                    <button onclick="viewBookingDetails('${booking.id}')" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View Details
                    </button>
                    ${booking.status === 'confirmed' || booking.status === 'pending' ? `
                        <button onclick="cancelBooking('${booking.id}')" class="text-red-600 hover:text-red-700 text-sm font-medium">
                            Cancel
                        </button>
                    ` : ''}
                    ${booking.status === 'completed' ? `
                        <button onclick="downloadTicket('${booking.id}')" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                            Download
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function getBookingDetails(booking) {
    switch (booking.type) {
        case 'flights':
            return `
                <p class="text-sm text-gray-600">${booking.airline} ${booking.flightNumber}</p>
                <p class="text-sm text-gray-600">${formatDate(booking.date)} at ${formatTime(booking.time)}</p>
                <p class="text-sm text-gray-600">${booking.passengers} passenger${booking.passengers > 1 ? 's' : ''}</p>
            `;
        case 'hotels':
            return `
                <p class="text-sm text-gray-600">${booking.location}</p>
                <p class="text-sm text-gray-600">${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}</p>
                <p class="text-sm text-gray-600">${booking.guests} guest${booking.guests > 1 ? 's' : ''}</p>
            `;
        case 'trains':
            return `
                <p class="text-sm text-gray-600">${booking.trainName} (${booking.trainNumber})</p>
                <p class="text-sm text-gray-600">${formatDate(booking.date)} at ${formatTime(booking.time)}</p>
                <p class="text-sm text-gray-600">${booking.passengers} passenger${booking.passengers > 1 ? 's' : ''}</p>
            `;
        case 'buses':
            return `
                <p class="text-sm text-gray-600">${booking.operator} (${booking.busNumber})</p>
                <p class="text-sm text-gray-600">${formatDate(booking.date)} at ${formatTime(booking.time)}</p>
                <p class="text-sm text-gray-600">${booking.passengers} passenger${booking.passengers > 1 ? 's' : ''}</p>
            `;
        default:
            return '';
    }
}

function viewBookingDetails(bookingId) {
    TTravelApp.showToast(`Viewing details for booking ${bookingId}`, 'info');
    // In a real application, this would open a modal or navigate to details page
}

function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        TTravelApp.showToast(`Booking ${bookingId} cancelled successfully`, 'success');
        // Reload bookings to reflect the change
        setTimeout(() => {
            loadBookings();
        }, 1000);
    }
}

function downloadTicket(bookingId) {
    TTravelApp.showToast(`Downloading ticket for booking ${bookingId}`, 'success');
    // In a real application, this would trigger a download
}


// Load and display saved trip plans 
//todo make it fetch from backend store in database

function getMockSavedPlans() {
    return [
        {
            id: 'TP001',
            destination: 'Goa',
            duration: '5 Days',
            startDate: '2025-02-15',
            endDate: '2025-02-19',
            imageUrl: 'https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg?auto=compress&cs=tinysrgb&w=800',
            summary: 'Beach relaxation, Old Goa tour, Water sports at Calangute, Sunset cruise, Local seafood experience',
            highlights: ['Beach hopping', 'Portuguese heritage', 'Nightlife', 'Water sports'],
            estimatedCost: 35000,
            savedDate: '2025-01-12'
        },
        {
            id: 'TP002',
            destination: 'Manali',
            duration: '7 Days',
            startDate: '2025-03-10',
            endDate: '2025-03-16',
            imageUrl: 'https://images.pexels.com/photos/1117510/pexels-photo-1117510.jpeg?auto=compress&cs=tinysrgb&w=800',
            summary: 'Rohtang Pass adventure, Solang Valley skiing, Hadimba Temple visit, Old Manali cafes, Trekking in Himalayas',
            highlights: ['Mountain trekking', 'Snow activities', 'Cafe culture', 'Adventure sports'],
            estimatedCost: 42000,
            savedDate: '2025-01-15'
        },
        {
            id: 'TP003',
            destination: 'Jaipur',
            duration: '4 Days',
            startDate: '2025-04-20',
            endDate: '2025-04-23',
            imageUrl: 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg?auto=compress&cs=tinysrgb&w=800',
            summary: 'Amber Fort sunrise visit, City Palace exploration, Hawa Mahal photography, Local bazaar shopping, Traditional Rajasthani cuisine',
            highlights: ['Royal palaces', 'Local markets', 'Cultural shows', 'Heritage hotels'],
            estimatedCost: 28000,
            savedDate: '2025-01-18'
        }
    ];
}

function displaySavedTripPlans(plans) {
    const bookingsContainer = document.getElementById('bookingsContainer');
    if (!bookingsContainer) return;

    if (plans.length === 0) {
        bookingsContainer.innerHTML = `
            <div class="text-center py-16">
                <svg class="w-24 h-24 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">No saved trip plans yet</h3>
                <p class="text-gray-600 mb-6 max-w-md mx-auto">You haven't saved any trip plans yet. Ask the AI assistant to plan a trip for you!</p>
                <button onclick="openAIAssistant()" class="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                    </svg>
                    Plan a Trip with AI
                </button>
            </div>
        `;
        return;
    }

    bookingsContainer.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">My Saved Trip Plans</h2>
            <p class="text-gray-600">Trip itineraries created by AI and saved for your next adventure</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${plans.map(plan => createTripPlanCard(plan)).join('')}
        </div>
    `;
}

function createTripPlanCard(plan) {
    return `
        <div class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer transform hover:-translate-y-1">
            <div class="relative h-48 overflow-hidden">
                <img src="${plan.imageUrl}" alt="${plan.destination}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute top-3 right-3 bg-white rounded-full px-3 py-1 text-sm font-semibold text-gray-700 shadow-md">
                    ${plan.duration}
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <h3 class="absolute bottom-3 left-3 text-2xl font-bold text-white">${plan.destination}</h3>
            </div>

            <div class="p-5">
                <div class="flex items-center text-sm text-gray-600 mb-3">
                    <svg class="w-4 h-4 mr-1.5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>${formatDate(plan.startDate)} - ${formatDate(plan.endDate)}</span>
                </div>

                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${plan.summary}</p>

                <div class="flex flex-wrap gap-2 mb-4">
                    ${plan.highlights.slice(0, 3).map(highlight => `
                        <span class="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">
                            ${highlight}
                        </span>
                    `).join('')}
                    ${plan.highlights.length > 3 ? `<span class="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">+${plan.highlights.length - 3} more</span>` : ''}
                </div>

                <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                        <p class="text-xs text-gray-500 mb-1">Estimated Cost</p>
                        <p class="text-lg font-bold text-gray-900">${formatCurrency(plan.estimatedCost)}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="view-details-btn bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" data-plan-id="${plan.id}">
                            View Details
                        </button>
                        <button onclick="deleteTripPlan('${plan.id}')" class="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Delete plan">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function viewTripPlanDetails(planId) {
    const plan = getMockSavedPlans().find(p => p.id === planId);
    if (!plan) return;

    const modalHTML = `
        <div id="tripPlanModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="closeTripPlanModal(event)">
            <div class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <div class="relative h-64 overflow-hidden rounded-t-xl">
                    <img src="${plan.imageUrl}" alt="${plan.destination}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <button onclick="closeTripPlanModal()" class="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors">
                        <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    <div class="absolute bottom-4 left-6">
                        <h2 class="text-3xl font-bold text-white mb-2">${plan.destination}</h2>
                        <p class="text-white text-lg">${plan.duration} Adventure</p>
                    </div>
                </div>

                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-blue-50 rounded-lg p-4">
                            <div class="flex items-center text-blue-600 mb-2">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span class="font-semibold">Dates</span>
                            </div>
                            <p class="text-sm text-gray-700">${formatDate(plan.startDate)} to ${formatDate(plan.endDate)}</p>
                        </div>

                        <div class="bg-green-50 rounded-lg p-4">
                            <div class="flex items-center text-green-600 mb-2">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span class="font-semibold">Estimated Cost</span>
                            </div>
                            <p class="text-lg font-bold text-gray-900">${formatCurrency(plan.estimatedCost)}</p>
                        </div>

                        <div class="bg-yellow-50 rounded-lg p-4">
                            <div class="flex items-center text-yellow-600 mb-2">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                                </svg>
                                <span class="font-semibold">Saved On</span>
                            </div>
                            <p class="text-sm text-gray-700">${formatDate(plan.savedDate)}</p>
                        </div>
                    </div>

                    <div class="mb-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Trip Highlights</h3>
                        <div class="flex flex-wrap gap-2">
                            ${plan.highlights.map(highlight => `
                                <span class="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                    ${highlight}
                                </span>
                            `).join('')}
                        </div>
                    </div>

                    <div class="mb-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-3">Itinerary Overview</h3>
                        <p class="text-gray-700 leading-relaxed">${plan.summary}</p>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div class="flex items-start">
                            <svg class="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div>
                                <h4 class="font-semibold text-blue-900 mb-1">AI-Generated Plan</h4>
                                <p class="text-sm text-blue-800">This itinerary was created by our AI assistant based on your preferences. You can start booking flights, hotels, and activities directly from here.</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <button onclick="startBookingFromPlan('${plan.id}')" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                            Start Booking This Trip
                        </button>
                        <button onclick="editTripPlan('${plan.id}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                            Edit Plan
                        </button>
                        <button onclick="shareTripPlan('${plan.id}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                            Share
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';
}

function closeTripPlanModal(event) {
    if (!event || event.target.id === 'tripPlanModal' || !event) {
        const modal = document.getElementById('tripPlanModal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }
}

function deleteTripPlan(planId) {
    if (!planId) return;
    if (!confirm('Are you sure you want to delete this trip plan? This action cannot be undone.')) return;

    // Call backend to delete the plan
    fetch(`/api/delete-trip-plan/${encodeURIComponent(planId)}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    })
    .then(res => res.json())
    .then(data => {
        if (!data || !data.success) {
            throw new Error((data && data.error) || 'Failed to delete trip plan');
        }
        TTravelApp.showToast('Trip plan deleted successfully', 'success');
        // Refresh the saved plans tab
        setTimeout(() => loadBookings('saved-plans'), 400);
    })
    .catch(err => {
        console.error('Delete trip plan failed', err);
        TTravelApp.showToast('Failed to delete trip plan: ' + (err.message || ''), 'error');
    });
}

function startBookingFromPlan(planId) {
    TTravelApp.showToast('Starting booking process...', 'info');
    closeTripPlanModal();
}

function editTripPlan(planId) {
    TTravelApp.showToast('Opening AI assistant to edit your plan...', 'info');
    closeTripPlanModal();
}

function shareTripPlan(planId) {
    TTravelApp.showToast('Share link copied to clipboard!', 'success');
}

function openAIAssistant() {
    const aiChat = document.getElementById('ai-chat');
    if (aiChat) {
        aiChat.classList.remove('hidden');
    }
}

// View Details Modal Functions
function setupViewDetailsModal() {
    // Event delegation for view details buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-details-btn') || e.target.closest('.view-details-btn')) {
            const btn = e.target.classList.contains('view-details-btn') ? e.target : e.target.closest('.view-details-btn');
            const planId = btn.getAttribute('data-plan-id');
            if (planId) {
                showTripPlanModal(planId);
            }
        }
    });

    // Close modal handlers
    const modal = document.getElementById('tripPlanModal');
    if (modal) {
        const closeBtn = document.getElementById('modal-close-btn');
        const closeFooterBtn = document.getElementById('modal-close-footer-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeTripPlanModal);
        }
        if (closeFooterBtn) {
            closeFooterBtn.addEventListener('click', closeTripPlanModal);
        }
        
        // Close on backdrop click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeTripPlanModal();
            }
        });
    }
}

function showTripPlanModal(planId) {
    const modal = document.getElementById('tripPlanModal');
    const loadingDiv = document.getElementById('modal-loading');
    const contentDiv = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    const modalItinerary = document.querySelector('#modal-itinerary > div');
    const modalHotels = document.querySelector('#modal-hotels > div');
    const modalEditBtn = document.getElementById('modal-edit-btn');

    if (!modal) return;

    // Show modal and loading state
    modal.classList.remove('hidden');
    loadingDiv.classList.remove('hidden');
    contentDiv.classList.add('hidden');
    document.body.style.overflow = 'hidden';

    // Fetch plan data
    fetch(`/api/saved-trip-plan/${planId}`, { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.success) {
                throw new Error(data.error || 'Failed to load trip plan');
            }

            const planData = data.plan.trip_plan || {};
            
            // Set title
            modalTitle.textContent = data.plan.title || planData.details?.destination || 'Trip Details';

            // Populate itinerary (format newlines as <br>)
            const itineraryText = planData.itinerary_text || planData.summary_text || 'No itinerary available.';
            modalItinerary.innerHTML = itineraryText.replace(/\n/g, '<br>');

            // Populate hotels
            const hotels = planData.hotels || [];
            if (hotels.length > 0) {
                modalHotels.innerHTML = hotels.map(hotel => {
                    const name = hotel.name || hotel.title || 'Hotel';
                    const price = hotel.price || hotel.rate || '';
                    const rating = hotel.rating || '';
                    return `
                        <div class="border border-gray-200 rounded-lg p-4">
                            <h5 class="font-semibold text-gray-900">${name}</h5>
                            ${rating ? `<p class="text-sm text-gray-600">Rating: ${rating}</p>` : ''}
                            ${price ? `<p class="text-sm text-gray-600">Price: ${price}</p>` : ''}
                        </div>
                    `;
                }).join('');
            } else {
                modalHotels.innerHTML = '<p class="text-gray-600">No hotels available.</p>';
            }

            // Set edit button href
            modalEditBtn.href = `/edit-trip/${planId}`;

            // Hide loading, show content
            loadingDiv.classList.add('hidden');
            contentDiv.classList.remove('hidden');
        })
        .catch(err => {
            console.error('Error loading trip plan:', err);
            loadingDiv.innerHTML = `<div class="text-center py-8 text-red-600">${err.message}</div>`;
        });
}

function closeTripPlanModal() {
    const modal = document.getElementById('tripPlanModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}