// Global variable to store the current working plan
let currentWorkingPlan = {};

// Get plan_id from URL
function getPlanIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/edit-trip\/([^\/]+)/);
    return match ? match[1] : null;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    const planId = getPlanIdFromUrl();
    if (!planId) {
        alert('Invalid plan ID');
        window.location.href = '/dashboard';
        return;
    }

    // Fetch plan data
    fetch(`/api/saved-trip-plan/${planId}`, { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.success) {
                throw new Error(data.error || 'Failed to load trip plan');
            }

            const planData = data.plan.trip_plan || {};
            currentWorkingPlan = planData;
            
            // Populate UI modules
            renderHotelModule(currentWorkingPlan.hotels || []);
            renderFlightModule(currentWorkingPlan.flights || []);
            renderItinerary(currentWorkingPlan.itinerary_text || '');

            // Setup chat event listeners
            setupChatListeners(planId);
            
            // Setup save button
            setupSaveButton(planId);
        })
        .catch(err => {
            console.error('Error loading trip plan:', err);
            alert('Failed to load trip plan: ' + err.message);
            window.location.href = '/dashboard';
        });
});

// Render hotel module
function renderHotelModule(hotels) {
    const hotelModule = document.getElementById('hotel-module');
    if (!hotelModule) return;

    if (hotels.length === 0) {
        hotelModule.innerHTML = '<p class="text-gray-500">No hotels available.</p>';
        return;
    }

    const selectedHotel = currentWorkingPlan.selected_hotel || null;
    hotelModule.innerHTML = hotels.map((hotel, index) => {
        const name = hotel.name || hotel.title || 'Hotel';
        const price = hotel.price || hotel.rate || '';
        const rating = hotel.rating || '';
        const address = hotel.address || '';
        const isSelected = selectedHotel && (selectedHotel.name === hotel.name || selectedHotel.title === hotel.title);
        
        return `
            <div class="border border-gray-200 rounded-lg p-4 ${isSelected ? 'ring-2 ring-primary-600' : ''}">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${name}</h3>
                        ${address ? `<p class="text-sm text-gray-600 mt-1">${address}</p>` : ''}
                        ${rating ? `<p class="text-sm text-gray-600 mt-1">Rating: ${rating}</p>` : ''}
                        ${price ? `<p class="text-sm text-gray-600 mt-1">Price: ${price}</p>` : ''}
                    </div>
                    <div class="ml-4 text-right">
                        ${isSelected ? `
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Selected</span>
                        ` : `
                            <button class="select-hotel-btn bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded text-sm" data-hotel-index="${index}">Select</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach listeners for select buttons
    hotelModule.querySelectorAll('.select-hotel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-hotel-index'), 10);
            if (!isNaN(idx) && currentWorkingPlan.hotels && currentWorkingPlan.hotels[idx]) {
                currentWorkingPlan.selected_hotel = currentWorkingPlan.hotels[idx];
                renderHotelModule(currentWorkingPlan.hotels || []);
            }
        });
    });
}

// Render flight module
function renderFlightModule(flights) {
    const flightModule = document.getElementById('flight-module');
    if (!flightModule) return;

    if (flights.length === 0) {
        flightModule.innerHTML = '<p class="text-gray-500">No flights available.</p>';
        return;
    }

    flightModule.innerHTML = flights.map((flight, index) => {
        const airline = flight.airline || '';
        const flightNumber = flight.flight_number || '';
        const departureTime = flight.departure_time || flight.departure_airport?.time || '';
        const arrivalTime = flight.arrival_time || flight.arrival_airport?.time || '';
        const price = flight.price || '';
        
        return `
            <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${airline} ${flightNumber}</h3>
                        ${departureTime ? `<p class="text-sm text-gray-600 mt-1">Departure: ${departureTime}</p>` : ''}
                        ${arrivalTime ? `<p class="text-sm text-gray-600 mt-1">Arrival: ${arrivalTime}</p>` : ''}
                        ${price ? `<p class="text-sm text-gray-600 mt-1">Price: ${price}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render itinerary
function renderItinerary(itineraryText) {
    const itineraryTextarea = document.getElementById('itinerary-text');
    if (itineraryTextarea) {
        itineraryTextarea.value = itineraryText;
    }
}

// Setup chat listeners
function setupChatListeners(planId) {
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatInput || !chatSendBtn || !chatMessages) return;

    function sendMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        // Add user message to chat
        addChatMessage(userMessage, 'user');
        chatInput.value = '';

        // Show loading indicator
        const loadingId = addChatMessage('Processing your request...', 'assistant', true);

        // Send to API
        fetch('/api/edit-trip-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                user_message: userMessage,
                current_plan: currentWorkingPlan,
                plan_id: planId
            })
        })
        .then(res => res.json())
        .then(data => {
            // Remove loading message
            removeChatMessage(loadingId);

            if (!data || !data.success) {
                throw new Error(data.error || 'Failed to process request');
            }

            // Update current working plan
            if (data.updated_plan) {
                currentWorkingPlan = data.updated_plan;
                
                // Re-render UI modules
                renderHotelModule(currentWorkingPlan.hotels || []);
                renderFlightModule(currentWorkingPlan.flights || []);
                renderItinerary(currentWorkingPlan.itinerary_text || '');
            }

            // Add assistant reply
            const replyText = data.reply || data.bot_reply || 'I\'ve updated your trip plan.';
            addChatMessage(replyText, 'assistant');
        })
        .catch(err => {
            console.error('Error sending chat message:', err);
            removeChatMessage(loadingId);
            addChatMessage('Sorry, I encountered an error. Please try again.', 'assistant');
        });
    }

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Add chat message
function addChatMessage(message, type, isLoading = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;

    const messageId = 'msg-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    
    if (type === 'user') {
        messageDiv.className = 'bg-gray-100 border border-gray-200 rounded-lg p-3 ml-8';
        messageDiv.innerHTML = `<p class="text-sm text-gray-800">${escapeHtml(message)}</p>`;
    } else {
        messageDiv.className = 'bg-blue-50 border border-blue-200 rounded-lg p-3 mr-8';
        if (isLoading) {
            messageDiv.innerHTML = `<p class="text-sm text-blue-800 italic">${escapeHtml(message)}</p>`;
        } else {
            messageDiv.innerHTML = `<p class="text-sm text-blue-800">${escapeHtml(message)}</p>`;
        }
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

// Remove chat message
function removeChatMessage(messageId) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
        messageDiv.remove();
    }
}

// Setup save button
function setupSaveButton(planId) {
    const saveBtn = document.getElementById('save-changes-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', function() {
        // Update itinerary from textarea
        const itineraryTextarea = document.getElementById('itinerary-text');
        if (itineraryTextarea) {
            currentWorkingPlan.itinerary_text = itineraryTextarea.value;
        }

        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // Send PUT request
        fetch(`/api/update-trip-plan/${planId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                trip_plan: currentWorkingPlan
            })
        })
        .then(res => res.json())
        .then(data => {
            if (!data || !data.success) {
                throw new Error(data.error || 'Failed to save changes');
            }

            alert('Changes saved successfully!');
            window.location.href = '/dashboard';
        })
        .catch(err => {
            console.error('Error saving changes:', err);
            alert('Failed to save changes: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        });
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

