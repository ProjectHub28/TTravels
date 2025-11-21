// Explore Destinations JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeExplore();
});

function initializeExplore() {
    setupLocationDetection();
    loadPopularDestinations();
    setupCategoryFilters();
}

// Location Detection
function setupLocationDetection() {
    const detectLocationBtn = document.getElementById('detectLocation');
    if (detectLocationBtn) {
        detectLocationBtn.addEventListener('click', detectUserLocation);
    }
}

function detectUserLocation() {
    if (navigator.geolocation) {
        TTravelApp.showToast('Detecting your location...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Simulate reverse geocoding
                setTimeout(() => {
                    TTravelApp.showToast('Location detected successfully!', 'success');
                    updateLocationDisplay('Mumbai'); // Mock location
                }, 1000);
            },
            function(error) {
                TTravelApp.showToast('Unable to detect location. Using Mumbai as default.', 'warning');
                updateLocationDisplay('Mumbai');
            }
        );
    } else {
        TTravelApp.showToast('Geolocation is not supported by this browser.', 'error');
    }
}

function updateLocationDisplay(city) {
    const locationText = document.querySelector('.font-medium');
    if (locationText) {
        locationText.textContent = `You're in ${city}`;
    }
}

// Load Popular Destinations
function loadPopularDestinations() {
    const destinationsContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-8');
    if (!destinationsContainer) return;
    
    const popularDestinations = [
        {
            name: 'Goa',
            image: 'https://images.pexels.com/photos/1007657/pexels-photo-1007657.jpeg?auto=compress&cs=tinysrgb&w=800',
            description: 'Beautiful beaches and vibrant nightlife',
            attractions: ['Baga Beach', 'Old Goa Churches', 'Dudhsagar Falls'],
            distance: '450 km',
            category: 'Beach'
        },
        {
            name: 'Manali',
            image: '/static/img/manali.jpg',
            description: 'Serene hill station in the Himalayas',
            attractions: ['Rohtang Pass', 'Solang Valley', 'Hadimba Temple'],
            distance: '540 km',
            category: 'Mountains'
        },
        {
            name: 'Jaipur',
            image: '/static/img/Jaipur.jpeg',
            description: 'The Pink City with rich heritage',
            attractions: ['Hawa Mahal', 'Amber Fort', 'City Palace'],
            distance: '1150 km',
            category: 'Heritage'
        },
        {
            name: 'Kerala Backwaters',
            image: '/static/img/kerala_backwater.jpg',
            description: 'Tranquil waterways and lush greenery',
            attractions: ['Alleppey Backwaters', 'Kumarakom', 'Vembanad Lake'],
            distance: '1180 km',
            category: 'Nature'
        },
        {
            name: 'Rishikesh',
            image: '/static/img/rishikesh.jpeg',
            description: 'Adventure sports and spiritual retreat',
            attractions: ['Lakshman Jhula', 'White Water Rafting', 'Beatles Ashram'],
            distance: '1720 km',
            category: 'Adventure'
        },
        {
            name: 'Udaipur',
            image: '/static/img/Udaipur City Palace.jpeg',
            description: 'City of Lakes and royal palaces',
            attractions: ['Lake Pichola', 'City Palace', 'Jagdish Temple'],
            distance: '730 km',
            category: 'Heritage'
        }
    ];
    
    destinationsContainer.innerHTML = popularDestinations.map(destination => createDestinationCard(destination)).join('');
}

function createDestinationCard(destination) {
    return `
        <div class="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer" onclick="exploreDestination('${destination.name}')">
            <div class="relative h-64 overflow-hidden">
                <img src="${destination.image}" alt="${destination.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                <div class="absolute top-4 left-4 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-800">
                    ${destination.category}
                </div>
                <div class="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    ${destination.distance}
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                <div class="absolute bottom-4 left-4 text-white">
                    <h3 class="text-2xl font-bold mb-2">${destination.name}</h3>
                    <p class="text-sm opacity-90">${destination.description}</p>
                </div>
            </div>
            <div class="p-6">
                <h4 class="font-semibold text-gray-900 mb-3">Top Attractions</h4>
                <div class="space-y-2">
                    ${destination.attractions.map(attraction => `
                        <div class="flex items-center text-sm text-gray-600">
                            <svg class="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            ${attraction}
                        </div>
                    `).join('')}
                </div>
                <div class="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <button onclick="event.stopPropagation(); addToItinerary('${destination.name}')" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        Add to Itinerary
                    </button>
                    <button class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Explore
                    </button>
                </div>
            </div>
        </div>
    `;
}

function exploreDestination(destinationName) {
    TTravelApp.showToast(`Exploring ${destinationName}. Loading travel options...`, 'info');
    
    // In a real application, this would navigate to a detailed destination page
    setTimeout(() => {
        // Simulate navigation to booking pages with pre-filled destination
        window.location.href = `flights.html?destination=${encodeURIComponent(destinationName)}`;
    }, 1500);
}

function addToItinerary(destinationName) {
    const itinerary = JSON.parse(localStorage.getItem('ttravel_itinerary') || '[]');
    
    if (!itinerary.includes(destinationName)) {
        itinerary.push(destinationName);
        localStorage.setItem('ttravel_itinerary', JSON.stringify(itinerary));
        TTravelApp.showToast(`${destinationName} added to your itinerary!`, 'success');
    } else {
        TTravelApp.showToast(`${destinationName} is already in your itinerary`, 'info');
    }
}

// Category Filters
function setupCategoryFilters() {
    const categoryCards = document.querySelectorAll('.cursor-pointer');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const categoryName = this.querySelector('h3').textContent;
            filterDestinationsByCategory(categoryName);
        });
    });
}

function filterDestinationsByCategory(category) {
    TTravelApp.showToast(`Showing ${category.toLowerCase()} destinations`, 'info');
    
    // In a real application, this would filter the destinations
    // For demo purposes, we'll just show a message
    setTimeout(() => {
        loadPopularDestinations(); // Reload all destinations
    }, 1000);
}