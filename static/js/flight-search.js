// Ensure the search button sends a POST request with JSON body
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.onclick = async function(e) {
                e.preventDefault();
                clearErrors();
                const validation = validateForm();
                if (!validation.isValid) {
                    showError(fromInput, validation.message);
                    return;
                }
                // Gather values
                const from = extractAirportCode(fromInput.value);
                const to = extractAirportCode(toInput.value);
                const departure = departureInput.value;
                const tripType = document.querySelector('input[name="tripType"]:checked').value;
                const returnDate = tripType === 'roundTrip' ? returnInput.value : '';
                // Passengers and cabin class (optional)
                let passengers = 1;
                const adults = document.getElementById('adultsCount')?.value;
                if (adults) passengers = parseInt(adults);
                const cabinClass = document.getElementById('cabinClass')?.value || 'economy';
                // Build request body
                const body = {
                    from,
                    to,
                    departure,
                    return: returnDate,
                    passengers,
                    cabinClass
                };
                setLoadingState(true);
                try {
                    const response = await fetch('/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.error || 'Internal server error');
                    }
                    displayFlights(data.best_flights || []);
                } catch (error) {
                    flightCards.innerHTML = `<div class="text-center text-red-600 py-8">${error.message}</div>`;
                } finally {
                    setLoadingState(false);
                }
            };
        }
    }, 100);
});
/**
 * Flight Search Application
 * Handles flight search, filtering, and display functionality
 */

// Airport data for autocomplete
const airports = [
    // Major Indian Airports
    { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi' },
    { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai' },
    { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai' },
    { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore' },
    { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad' },
    { code: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata' },
    { code: 'GOI', name: 'Dabolim Airport', city: 'Goa' },
    { code: 'PNQ', name: 'Pune Airport', city: 'Pune' },
    { code: 'COK', name: 'Cochin International Airport', city: 'Kochi' },
    { code: 'TRV', name: 'Trivandrum International Airport', city: 'Thiruvananthapuram' },
    { code: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad' },
    { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur' },
    { code: 'LKO', name: 'Chaudhary Charan Singh Airport', city: 'Lucknow' },
    { code: 'VNS', name: 'Lal Bahadur Shastri Airport', city: 'Varanasi' },
    { code: 'PAT', name: 'Jay Prakash Narayan Airport', city: 'Patna' },
    { code: 'GAU', name: 'Lokpriya Gopinath Bordoloi International Airport', city: 'Guwahati' },
    { code: 'IXR', name: 'Birsa Munda Airport', city: 'Ranchi' },
    { code: 'BBI', name: 'Biju Patnaik International Airport', city: 'Bhubaneswar' },
    { code: 'IXB', name: 'Bagdogra International Airport', city: 'Siliguri' },
    { code: 'IXC', name: 'Chandigarh International Airport', city: 'Chandigarh' },
    { code: 'IXJ', name: 'Jammu Airport', city: 'Jammu' },
    { code: 'IXL', name: 'Kushok Bakula Rimpochee Airport', city: 'Leh' },
    { code: 'IXM', name: 'Madurai Airport', city: 'Madurai' },
    { code: 'IXZ', name: 'Veer Savarkar International Airport', city: 'Port Blair' },
    { code: 'JDH', name: 'Jodhpur Airport', city: 'Jodhpur' },
    { code: 'JLR', name: 'Jabalpur Airport', city: 'Jabalpur' },
    { code: 'NAG', name: 'Dr. Babasaheb Ambedkar International Airport', city: 'Nagpur' },
    { code: 'UDR', name: 'Maharana Pratap Airport', city: 'Udaipur' },
    { code: 'VGA', name: 'Vijayawada Airport', city: 'Vijayawada' },
    { code: 'VTZ', name: 'Visakhapatnam International Airport', city: 'Visakhapatnam' },
    { code: 'IXE', name: 'Mangalore International Airport', city: 'Mangalore' },
    { code: 'IXU', name: 'Aurangabad Airport', city: 'Aurangabad' },
    { code: 'HBX', name: 'Hubli Airport', city: 'Hubli' },
    { code: 'IDR', name: 'Devi Ahilya Bai Holkar Airport', city: 'Indore' },
    { code: 'JRG', name: 'Swami Vivekananda Airport', city: 'Raipur' },
    { code: 'JRH', name: 'Jorhat Airport', city: 'Jorhat' },
    { code: 'IXS', name: 'Silchar Airport', city: 'Silchar' },
    { code: 'IXI', name: 'Lilabari Airport', city: 'North Lakhimpur' },
    { code: 'IXA', name: 'Agartala Airport', city: 'Agartala' },
    { code: 'AJL', name: 'Lengpui Airport', city: 'Aizawl' },
    { code: 'IXB', name: 'Bagdogra International Airport', city: 'Siliguri' },
    { code: 'IXD', name: 'Bamrauli Airport', city: 'Allahabad' },
    { code: 'IXG', name: 'Belgaum Airport', city: 'Belgaum' },
    { code: 'BHO', name: 'Raja Bhoj Airport', city: 'Bhopal' },
    { code: 'BHU', name: 'Bhavnagar Airport', city: 'Bhavnagar' },
    { code: 'BHJ', name: 'Bhuj Airport', city: 'Bhuj' },
    { code: 'BKB', name: 'Nal Airport', city: 'Bikaner' },
    { code: 'PAB', name: 'Bilaspur Airport', city: 'Bilaspur' },
    { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai' },
    { code: 'CBD', name: 'Car Nicobar Air Force Base', city: 'Car Nicobar' },
    { code: 'CCJ', name: 'Calicut International Airport', city: 'Kozhikode' },
    { code: 'COK', name: 'Cochin International Airport', city: 'Kochi' },
    { code: 'CJB', name: 'Coimbatore International Airport', city: 'Coimbatore' },
    { code: 'DBD', name: 'Dhanbad Airport', city: 'Dhanbad' },
    { code: 'DED', name: 'Dehradun Airport', city: 'Dehradun' },
    { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi' },
    { code: 'DEP', name: 'Daporijo Airport', city: 'Daporijo' },
    { code: 'DHM', name: 'Kangra Airport', city: 'Dharamshala' },
    { code: 'DIB', name: 'Dibrugarh Airport', city: 'Dibrugarh' },
    { code: 'DIU', name: 'Diu Airport', city: 'Diu' },
    { code: 'DMU', name: 'Dimapur Airport', city: 'Dimapur' },
    { code: 'GAY', name: 'Gaya Airport', city: 'Gaya' },
    { code: 'GOI', name: 'Dabolim Airport', city: 'Goa' },
    { code: 'GOP', name: 'Gorakhpur Airport', city: 'Gorakhpur' },
    { code: 'GWL', name: 'Gwalior Airport', city: 'Gwalior' },
    { code: 'HBX', name: 'Hubli Airport', city: 'Hubli' },
    { code: 'HSS', name: 'Hisar Airport', city: 'Hisar' },
    { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad' },
    { code: 'IDR', name: 'Devi Ahilya Bai Holkar Airport', city: 'Indore' },
    { code: 'IMF', name: 'Imphal Airport', city: 'Imphal' },
    { code: 'IXA', name: 'Agartala Airport', city: 'Agartala' },
    { code: 'IXB', name: 'Bagdogra International Airport', city: 'Siliguri' },
    { code: 'IXC', name: 'Chandigarh International Airport', city: 'Chandigarh' },
    { code: 'IXD', name: 'Bamrauli Airport', city: 'Allahabad' },
    { code: 'IXE', name: 'Mangalore International Airport', city: 'Mangalore' },
    { code: 'IXG', name: 'Belgaum Airport', city: 'Belgaum' },
    { code: 'IXI', name: 'Lilabari Airport', city: 'North Lakhimpur' },
    { code: 'IXJ', name: 'Jammu Airport', city: 'Jammu' },
    { code: 'IXL', name: 'Kushok Bakula Rimpochee Airport', city: 'Leh' },
    { code: 'IXM', name: 'Madurai Airport', city: 'Madurai' },
    { code: 'IXR', name: 'Birsa Munda Airport', city: 'Ranchi' },
    { code: 'IXS', name: 'Silchar Airport', city: 'Silchar' },
    { code: 'IXU', name: 'Aurangabad Airport', city: 'Aurangabad' },
    { code: 'IXZ', name: 'Veer Savarkar International Airport', city: 'Port Blair' },
    { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur' },
    { code: 'JDH', name: 'Jodhpur Airport', city: 'Jodhpur' },
    { code: 'JGA', name: 'Jamnagar Airport', city: 'Jamnagar' },
    { code: 'JGB', name: 'Jagdalpur Airport', city: 'Jagdalpur' },
    { code: 'JLR', name: 'Jabalpur Airport', city: 'Jabalpur' },
    { code: 'JRH', name: 'Jorhat Airport', city: 'Jorhat' },
    { code: 'JSA', name: 'Jaisalmer Airport', city: 'Jaisalmer' },
    { code: 'IXW', name: 'Sonari Airport', city: 'Jamshedpur' },
    { code: 'JRH', name: 'Jorhat Airport', city: 'Jorhat' },
    { code: 'KNU', name: 'Kanpur Airport', city: 'Kanpur' },
    { code: 'KQH', name: 'Kishangarh Airport', city: 'Ajmer' },
    { code: 'KTU', name: 'Kota Airport', city: 'Kota' },
    { code: 'KUU', name: 'Kullu–Manali Airport', city: 'Kullu' },
    { code: 'LKO', name: 'Chaudhary Charan Singh Airport', city: 'Lucknow' },
    { code: 'LUH', name: 'Ludhiana Airport', city: 'Ludhiana' },
    { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai' },
    { code: 'NAG', name: 'Dr. Babasaheb Ambedkar International Airport', city: 'Nagpur' },
    { code: 'NDC', name: 'Nanded Airport', city: 'Nanded' },
    { code: 'NMB', name: 'Daman Airport', city: 'Daman' },
    { code: 'NVY', name: 'Jawaharlal Nehru Airport', city: 'Neyveli' },
    { code: 'OMN', name: 'Osmanabad Airport', city: 'Osmanabad' },
    { code: 'PAT', name: 'Jay Prakash Narayan Airport', city: 'Patna' },
    { code: 'PGH', name: 'Pantnagar Airport', city: 'Pantnagar' },
    { code: 'PNQ', name: 'Pune Airport', city: 'Pune' },
    { code: 'PBD', name: 'Porbandar Airport', city: 'Porbandar' },
    { code: 'PED', name: 'Phalodi Airport', city: 'Phalodi' },
    { code: 'PGH', name: 'Pantnagar Airport', city: 'Pantnagar' },
    { code: 'PNY', name: 'Pondicherry Airport', city: 'Pondicherry' },
    { code: 'PBD', name: 'Porbandar Airport', city: 'Porbandar' },
    { code: 'PED', name: 'Phalodi Airport', city: 'Phalodi' },
    { code: 'PNY', name: 'Pondicherry Airport', city: 'Pondicherry' },
    { code: 'PUT', name: 'Sri Sathya Sai Airport', city: 'Puttaparthi' },
    { code: 'PYG', name: 'Jeypore Airport', city: 'Jeypore' },
    { code: 'RAJ', name: 'Rajkot Airport', city: 'Rajkot' },
    { code: 'RDP', name: 'Kazi Nazrul Islam Airport', city: 'Durgapur' },
    { code: 'RGH', name: 'Balurghat Airport', city: 'Balurghat' },
    { code: 'RJA', name: 'Rajahmundry Airport', city: 'Rajahmundry' },
    { code: 'RPR', name: 'Swami Vivekananda Airport', city: 'Raipur' },
    { code: 'RTC', name: 'Ratnagiri Airport', city: 'Ratnagiri' },
    { code: 'RUP', name: 'Rupsi Airport', city: 'Dhubri' },
    { code: 'SAG', name: 'Shirdi Airport', city: 'Shirdi' },
    { code: 'SAG', name: 'Shirdi Airport', city: 'Shirdi' },
    { code: 'SAG', name: 'Shirdi Airport', city: 'Shirdi' },
    { code: 'SAG', name: 'Shirdi Airport', city: 'Shirdi' },
    { code: 'SLV', name: 'Shimla Airport', city: 'Shimla' },
    { code: 'STV', name: 'Surat Airport', city: 'Surat' },
    { code: 'SXR', name: 'Sheikh ul-Alam International Airport', city: 'Srinagar' },
    { code: 'TCR', name: 'Tuticorin Airport', city: 'Thoothukudi' },
    { code: 'TIR', name: 'Tirupati Airport', city: 'Tirupati' },
    { code: 'TJV', name: 'Thanjavur Air Force Station', city: 'Thanjavur' },
    { code: 'TNI', name: 'Satna Airport', city: 'Satna' },
    { code: 'TRZ', name: 'Tiruchirappalli International Airport', city: 'Tiruchirappalli' },
    { code: 'TRV', name: 'Trivandrum International Airport', city: 'Thiruvananthapuram' },
    { code: 'TCR', name: 'Tuticorin Airport', city: 'Thoothukudi' },
    { code: 'TIR', name: 'Tirupati Airport', city: 'Tirupati' },
    { code: 'TJV', name: 'Thanjavur Air Force Station', city: 'Thanjavur' },
    { code: 'TNI', name: 'Satna Airport', city: 'Satna' },
    { code: 'TRZ', name: 'Tiruchirappalli International Airport', city: 'Tiruchirappalli' },
    { code: 'TRV', name: 'Trivandrum International Airport', city: 'Thiruvananthapuram' },
    { code: 'UDR', name: 'Maharana Pratap Airport', city: 'Udaipur' },
    { code: 'VGA', name: 'Vijayawada Airport', city: 'Vijayawada' },
    { code: 'VNS', name: 'Lal Bahadur Shastri Airport', city: 'Varanasi' },
    { code: 'VTZ', name: 'Visakhapatnam International Airport', city: 'Visakhapatnam' },
    { code: 'WGC', name: 'Warangal Airport', city: 'Warangal' },
    { code: 'ZER', name: 'Ziro Airport', city: 'Ziro' }
];

// DOM Elements
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const departureInput = document.getElementById('departureDate');
const returnInput = document.getElementById('returnDate');
const searchButton = document.getElementById('searchButton');
const searchButtonText = document.getElementById('searchButtonText');
const searchButtonLoading = document.getElementById('searchButtonLoading');
const loadingResults = document.getElementById('loadingResults');
const flightResults = document.getElementById('flightResults');
const flightCards = document.getElementById('flightCards');
const resultsCount = document.getElementById('resultsCount');
const searchProgress = document.getElementById('searchProgress');
const searchStatus = document.getElementById('searchStatus');
const sortBy = document.getElementById('sortBy');
const resetFilters = document.getElementById('resetFilters');
const swapAirportsBtn = document.getElementById('swapAirports');
const oneWayRadio = document.getElementById('oneWayRadio');
const roundTripRadio = document.getElementById('roundTripRadio');
const multiCityRadio = document.getElementById('multiCityRadio');

// State
let currentFlights = [];
let filteredFlights = [];
let airlines = new Set();

/**
 * Set default dates for the search form
 */
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format as YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // Set minimum date to today
    const todayStr = formatDate(today);
    departureInput.min = todayStr;
    returnInput.min = todayStr;
    
    // Set default departure to tomorrow
    const tomorrowStr = formatDate(tomorrow);
    departureInput.value = tomorrowStr;
    
    // Set default return to 7 days from now
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);
    returnInput.value = formatDate(nextWeek);
    
    // Set max date to 1 year from now
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = formatDate(nextYear);
    departureInput.max = nextYearStr;
    returnInput.max = nextYearStr;
}

/**
 * Setup autocomplete for airport inputs
 * @param {HTMLElement} inputElement - The input element to add autocomplete to
 */
function setupAutocomplete(inputElement) {
    let isSelectingSuggestion = false;
    const inputId = inputElement.id;
    const isFromInput = inputId === 'fromInput';
    
    inputElement.addEventListener('input', debounce((e) => {
        const value = e.target.value.trim().toLowerCase();
        const suggestionsContainer = document.getElementById(`${inputId}Suggestions`);
        
        // Clear previous suggestions
        if (suggestionsContainer) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.classList.add('hidden');
        }
        
        // Hide error if visible
        const errorElement = document.getElementById(`${inputId}Error`);
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        
        // Don't show suggestions for very short queries
        if (value.length < 2) {
            return;
        }
        
        // Find matching airports (case-insensitive)
        const matches = airports.filter(airport => 
            airport.city.toLowerCase().includes(value) || 
            airport.code.toLowerCase() === value ||
            airport.name.toLowerCase().includes(value)
        ).slice(0, 8); // Limit to 8 results

        // Debug: log matches to console
        console.log('Autocomplete matches for input:', value, matches);

        if (matches.length === 0) {
            showNoSuggestions(inputElement);
            return;
        }
        
        // Create and show suggestions
        showSuggestions(inputElement, matches);
    }, 300));
    
    // Handle keyboard navigation
    inputElement.addEventListener('keydown', (e) => {
        const suggestionsContainer = document.getElementById(`${inputId}Suggestions`);
        if (!suggestionsContainer || suggestionsContainer.classList.contains('hidden')) {
            return;
        }
        
        const activeSuggestion = document.querySelector(`#${inputId}Suggestions .suggestion-item.active`);
        const allSuggestions = Array.from(document.querySelectorAll(`#${inputId}Suggestions .suggestion-item`));
        let nextIndex = -1;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!activeSuggestion) {
                nextIndex = 0;
            } else {
                const currentIndex = allSuggestions.indexOf(activeSuggestion);
                nextIndex = (currentIndex + 1) % allSuggestions.length;
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeSuggestion) {
                const currentIndex = allSuggestions.indexOf(activeSuggestion);
                nextIndex = (currentIndex - 1 + allSuggestions.length) % allSuggestions.length;
            } else {
                nextIndex = allSuggestions.length - 1;
            }
        } else if (e.key === 'Enter' && activeSuggestion) {
            e.preventDefault();
            activeSuggestion.click();
            return;
        } else if (e.key === 'Escape') {
            suggestionsContainer.classList.add('hidden');
            return;
        } else {
            return; // Not a key we're handling
        }
        
        // Update active suggestion
        allSuggestions.forEach(s => s.classList.remove('active', 'bg-blue-50'));
        if (nextIndex >= 0) {
            allSuggestions[nextIndex].classList.add('active', 'bg-blue-50');
            // Scroll into view if needed
            allSuggestions[nextIndex].scrollIntoView({ block: 'nearest' });
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!inputElement.contains(e.target) && 
            !document.getElementById(`${inputId}Suggestions`)?.contains(e.target)) {
            const suggestions = document.getElementById(`${inputId}Suggestions`);
            if (suggestions) {
                suggestions.classList.add('hidden');
            }
        }
    });
    
    // Handle input blur (with a small delay to allow for clicks on suggestions)
    inputElement.addEventListener('blur', () => {
        setTimeout(() => {
            if (!isSelectingSuggestion) {
                const suggestions = document.getElementById(`${inputId}Suggestions`);
                if (suggestions) {
                    suggestions.classList.add('hidden');
                }
            }
            isSelectingSuggestion = false;
        }, 200);
    });
    
    // Handle input focus - show recent searches or popular airports
    inputElement.addEventListener('focus', () => {
        const value = inputElement.value.trim().toLowerCase();
        if (value.length >= 2) return; // Don't show popular if already typing
        
        // Show popular airports for the input
        const popularAirports = getPopularAirports(isFromInput);
        showSuggestions(inputElement, popularAirports, true);
    });
}

/**
 * Show a message when no suggestions are found
 * @param {HTMLElement} inputElement - The input element
 */
function showNoSuggestions(inputElement) {
    const container = document.getElementById(`${inputElement.id}Suggestions`);
    if (!container) return;
    
    container.innerHTML = `
        <div class="p-3 text-sm text-gray-500">
            No airports found. Try a different search term.
        </div>
    `;
    container.classList.remove('hidden');
}

/**
 * Get popular airports based on the input type (from/to)
 * @param {boolean} isFromInput - Whether this is the 'from' input
 * @returns {Array} Array of popular airports
 */
function getPopularAirports(isFromInput) {
    // These would ideally come from user's location, recent searches, or be hardcoded
    const popularFromAirports = [
        { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi' },
        { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai' },
        { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore' },
        { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai' },
        { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad' }
    ];
    
    const popularToAirports = [
        { code: 'GOI', name: 'Dabolim Airport', city: 'Goa' },
        { code: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata' },
        { code: 'COK', name: 'Cochin International Airport', city: 'Kochi' },
        { code: 'TRV', name: 'Trivandrum International Airport', city: 'Thiruvananthapuram' },
        { code: 'IXM', name: 'Madurai Airport', city: 'Madurai' }
    ];
    
    return isFromInput ? popularFromAirports : popularToAirports;
}

/**
 * Show suggestions dropdown with airport options
 * @param {HTMLElement} inputElement - The input element
 * @param {Array} airports - Array of airport objects to show as suggestions
 * @param {boolean} isPopular - Whether these are popular airports (affects styling)
 */
function showSuggestions(inputElement, airports, isPopular = false) {
    const inputId = inputElement.id;
    let container = document.getElementById(`${inputId}Suggestions`);
    
    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = `${inputId}Suggestions`;
        container.className = 'absolute z-20 mt-1 w-full bg-white shadow-xl rounded-lg border border-gray-200 max-h-60 overflow-auto';
        inputElement.parentNode.appendChild(container);
    } else {
        // Clear existing content
        container.innerHTML = '';
    }
    
    // Add header for popular airports
    if (isPopular && airports.length > 0) {
        const header = document.createElement('div');
        header.className = 'sticky top-0 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100';
        header.textContent = isPopular ? 'Popular airports' : 'Matching airports';
        container.appendChild(header);
    }
    
    if (airports.length === 0) {
        showNoSuggestions(inputElement);
        return;
    }
    
    // Add each airport as a suggestion
    airports.forEach((airport, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item p-3 hover:bg-blue-50 cursor-pointer flex items-center';
        item.tabIndex = -1; // Make it focusable
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        
        // Highlight matching parts of the text
        const searchTerm = inputElement.value.trim().toLowerCase();
        const city = highlightMatch(airport.city, searchTerm);
        const code = highlightMatch(airport.code, searchTerm);
        const name = highlightMatch(airport.name, searchTerm);
        
        item.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <i class="fas fa-plane-departure text-blue-600"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center">
                    <div class="font-medium text-gray-900 truncate">${city} <span class="ml-1 text-sm font-normal text-gray-500">${code}</span></div>
                </div>
                <div class="text-sm text-gray-500 truncate">${name}</div>
            </div>
        `;
        
        // Handle click on suggestion
        item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent blur event from firing before click
            isSelectingSuggestion = true;
            inputElement.value = `${airport.city} (${airport.code})`;
            container.classList.add('hidden');
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            inputElement.dispatchEvent(event);
        });
        
        // Keyboard navigation
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputElement.value = `${airport.city} (${airport.code})`;
                container.classList.add('hidden');
                inputElement.focus();
            }
        });
        
        container.appendChild(item);
    });
    
    // Show the container
    container.classList.remove('hidden');
    
    // Position the container below the input
    const inputRect = inputElement.getBoundingClientRect();
    container.style.width = `${inputRect.width}px`;
    container.style.top = `${inputRect.bottom + window.scrollY}px`;
    container.style.left = `${inputRect.left + window.scrollX}px`;
}

/**
 * Highlight matching text in search results
 * @param {string} text - The text to search in
 * @param {string} searchTerm - The search term to highlight
 * @returns {string} HTML with highlighted matches
 */
function highlightMatch(text, searchTerm) {
    if (!searchTerm) return text;
    
    const searchRegex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(searchRegex, '<span class="font-semibold text-blue-600">$1</span>');
}

/**
 * Escape special regex characters in a string
 * @param {string} string - The string to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - Time to wait in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Extract airport code from input string (e.g., "Delhi (DEL)" -> "DEL")
 * @param {string} input - The input string containing airport code in parentheses
 * @returns {string} The extracted airport code or original string if no code found
 */
function extractAirportCode(input) {
    if (!input) return '';
    const match = input.match(/\(([A-Z0-9]{3})\)/);
    return match ? match[1] : input.trim().toUpperCase();
}

/**
 * Validate the search form inputs
 * @returns {Object} Object with validation status and error message if invalid
 */
function validateForm() {
    const fromCode = extractAirportCode(fromInput.value);
    const toCode = extractAirportCode(toInput.value);
    
    if (!fromCode) {
        return { isValid: false, message: 'Please select a departure airport' };
    }
    
    if (!toCode) {
        return { isValid: false, message: 'Please select an arrival airport' };
    }
    
    if (fromCode === toCode) {
        return { 
            isValid: false, 
            message: 'Departure and arrival airports cannot be the same' 
        };
    }
    
    if (!departureInput.value) {
        return { isValid: false, message: 'Please select a departure date' };
    }
    
    // For round trips, validate return date
    if (document.querySelector('input[name="tripType"]:checked').value === 'roundtrip' && !returnInput.value) {
        return { isValid: false, message: 'Please select a return date' };
    }
    
    // Validate return date is after departure date
    if (returnInput.value && new Date(returnInput.value) < new Date(departureInput.value)) {
        return { 
            isValid: false, 
            message: 'Return date must be after departure date' 
        };
    }
    
    return { isValid: true };
}

/**
 * Show an error message for a form field
 * @param {HTMLElement} input - The input element
 * @param {string} message - The error message to display
 */
function showError(input, message) {
    // Show popup toast instead of inline error
    if (typeof showFlightToast === 'function') {
        showFlightToast(message);
    } else {
        alert(message); // fallback if toast not available
    }
    // Optionally, highlight the input
    input.classList.add('border-red-500');
    input.classList.remove('border-gray-300');
    input.focus();
}

/**
 * Clear all error messages from the form
 */
function clearErrors() {
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500');
        el.classList.add('border-gray-300');
    });
    // No need to clear inline error text anymore
}

/**
 * Toggle the loading state of the search button
 * @param {boolean} isLoading - Whether to show loading state
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        searchButton.disabled = true;
        searchButtonText.classList.add('invisible');
        searchButtonLoading.classList.remove('hidden');
    } else {
        searchButton.disabled = false;
        searchButtonText.classList.remove('invisible');
        searchButtonLoading.classList.add('hidden');
    }
}

/**
 * Update the search progress indicator
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} status - Status message to display
 */
function updateSearchProgress(progress, status) {
    if (searchProgress && searchStatus) {
        searchProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        searchStatus.textContent = status;
    }
}

/**
 * Format a date string to a more readable format
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string (e.g., "Fri, 15 Mar 2024")
 */
function formatDisplayDate(dateString) {
    if (!dateString) return '';
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Format time from HH:MM to 12-hour format with AM/PM
 * @param {string} timeString - Time string in HH:MM format
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
function formatTimeString(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Calculate duration in hours and minutes from minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
function formatDuration(minutes) {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

/**
 * Format a price with currency symbol and thousand separators
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: 'INR')
 * @returns {string} Formatted price (e.g., "₹5,299")
 */
function formatPrice(amount, currency = 'INR') {
    if (amount === undefined || amount === null) return 'Price not available';
    
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    
    return formatter.format(amount);
}

/**
 * Create a flight card HTML element
 * @param {Object} flight - Flight data object
 * @returns {HTMLElement} Flight card element
 */
function createFlightCard(flight) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300';
    
    // Extract flight details (from enriched backend)
    const airline = flight.airline || 'Airline';
    const flightNumber = flight.flight_number || flight.flightNumber || '';
    const departureTime = formatTimeString(flight.departure_time || flight.departureTime);
    const arrivalTime = formatTimeString(flight.arrival_time || flight.arrivalTime);
    const departureDate = formatDisplayDate(flight.departure_date || flight.departureDate);
    const arrivalDate = formatDisplayDate(flight.arrival_date || flight.arrivalDate);
    const duration = formatDuration(flight.duration);
    const price = formatPrice(flight.price);
    const stops = flight.stops || 0;
    const stopText = stops === 0 ? 'Non-stop' : `${stops} ${stops === 1 ? 'stop' : 'stops'}`;
    const travelClass = flight.travel_class || '';
    const airplane = flight.airplane || '';
    const legroom = flight.legroom || '';
    const extensions = flight.extensions || [];
    const carbon = flight.carbon_emissions || {};
    const baggage = (flight.baggage_prices && flight.baggage_prices.together) ? flight.baggage_prices.together.join(', ') : '';
    const amenities = extensions.filter(e => /Wi-Fi|USB|entertainment|meal|power|seat/i.test(e)).map(e => e.replace('Carbon emissions estimate:', '').trim());
    const bookingOptions = flight.booking_options || [];

    card.innerHTML = `
        <div class="p-5">
            <!-- Header with Airline and Price -->
            <div class="flex justify-between items-start mb-4">
                <div>
                    <div class="flex items-center">
                        <img src="${flight.airline_logo || flight.airlineLogo || 'https://via.placeholder.com/40'}" 
                             alt="${airline}" 
                             class="w-10 h-10 rounded-full mr-3 object-contain" />
                        <div>
                            <h3 class="font-semibold text-gray-900">${airline}</h3>
                            <p class="text-sm text-gray-500">${flightNumber} • ${stopText}${travelClass ? ' • ' + travelClass : ''}</p>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-blue-600">${price}</div>
                    <div class="text-xs text-gray-500">${stops === 0 ? 'Best Price' : 'Economy'}</div>
                </div>
            </div>
            <!-- Flight Details -->
            <div class="flex items-center justify-between my-4">
                <div class="text-center">
                    <div class="text-2xl font-bold">${departureTime}</div>
                    <div class="text-sm text-gray-500">${departureDate}</div>
                    <div class="text-sm font-medium mt-1">${flight.origin || flight.fromCode || 'DEL'}</div>
                    <div class="text-xs text-gray-400">${flight.origin_name || ''}</div>
                </div>
                <div class="flex-1 px-4">
                    <div class="relative">
                        <div class="border-t-2 border-gray-300 absolute top-1/2 w-full"></div>
                        <div class="absolute -top-2 left-0 w-full flex justify-between">
                            <span class="bg-white px-1 text-xs text-gray-500">${duration}</span>
                            <span class="bg-white px-1 text-xs text-gray-500">${stopText}</span>
                        </div>
                        <div class="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <i class="fas fa-plane text-gray-400"></i>
                        </div>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold">${arrivalTime}</div>
                    <div class="text-sm text-gray-500">${arrivalDate}</div>
                    <div class="text-sm font-medium mt-1">${flight.destination || flight.toCode || 'BOM'}</div>
                    <div class="text-xs text-gray-400">${flight.destination_name || ''}</div>
                </div>
            </div>
            <!-- Flight Details Toggle -->
            <div class="mt-4 pt-4 border-t border-gray-100">
                <button class="text-blue-600 text-sm font-medium flex items-center mx-auto"
                        onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('span').textContent = this.querySelector('span').textContent === 'Show details' ? 'Hide details' : 'Show details'; this.querySelector('i').classList.toggle('rotate-180')">
                    <span>Show details</span>
                    <i class="fas fa-chevron-down text-xs ml-1 transition-transform duration-200"></i>
                </button>
                <!-- Flight Details Content -->
                <div class="mt-3 hidden">
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center mb-3">
                            <img src="${flight.airline_logo || flight.airlineLogo || 'https://via.placeholder.com/24'}" 
                                 alt="${airline}" 
                                 class="w-6 h-6 rounded-full mr-2" />
                            <div>
                                <div class="font-medium">${airline} ${flightNumber}</div>
                                <div class="text-sm text-gray-500">${airplane ? airplane : ''}</div>
                                <div class="text-xs text-gray-400">${travelClass ? 'Class: ' + travelClass : ''}${legroom ? ' • ' + legroom : ''}</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <div class="font-medium">Departure</div>
                                <div class="text-gray-600">${departureTime}</div>
                                <div class="text-gray-500">${departureDate}</div>
                                <div class="mt-1 font-medium">${flight.origin_name || flight.origin || 'Delhi (DEL)'}</div>
                            </div>
                            <div class="text-center">
                                <div class="font-medium">${duration}</div>
                                <div class="my-2">
                                    <div class="h-px bg-gray-300 relative">
                                        <div class="absolute -top-1.5 left-0 w-3 h-3 rounded-full bg-white border-2 border-blue-500"></div>
                                        <div class="absolute -top-1.5 right-0 w-3 h-3 rounded-full bg-white border-2 border-blue-500"></div>
                                    </div>
                                </div>
                                <div class="text-gray-500">${stopText}</div>
                            </div>
                            <div class="text-right">
                                <div class="font-medium">Arrival</div>
                                <div class="text-gray-600">${arrivalTime}</div>
                                <div class="text-gray-500">${arrivalDate}</div>
                                <div class="mt-1 font-medium">${flight.destination_name || flight.destination || 'Mumbai (BOM)'}</div>
                            </div>
                        </div>
                        ${extensions && extensions.length > 0 ? `
                            <div class="mt-4 pt-3 border-t border-gray-200">
                                <h4 class="text-sm font-medium mb-2">Flight Features</h4>
                                <ul class="list-disc ml-5 text-xs text-gray-700">
                                    ${extensions.map(e => `<li>${e}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${carbon && carbon.this_flight ? `
                            <div class="mt-4 pt-3 border-t border-gray-200">
                                <h4 class="text-sm font-medium mb-2">Carbon Emissions</h4>
                                <div class="text-xs text-gray-700">This flight: ${(carbon.this_flight/1000).toFixed(1)} kg CO₂ (${carbon.difference_percent > 0 ? '+' : ''}${carbon.difference_percent}% vs typical)</div>
                            </div>
                        ` : ''}
                        ${baggage ? `
                            <div class="mt-4 pt-3 border-t border-gray-200">
                                <h4 class="text-sm font-medium mb-2">Baggage</h4>
                                <div class="text-xs text-gray-700">${baggage}</div>
                            </div>
                        ` : ''}
                        ${bookingOptions && bookingOptions.length > 0 ? `
                            <div class="mt-4 pt-3 border-t border-gray-200">
                                <h4 class="text-sm font-medium mb-2">Booking Options</h4>
                                <ul class="list-disc ml-5 text-xs text-gray-700">
                                    ${bookingOptions.map(opt => {
                                        const o = opt.together || {};
                                        return `<li><span class='font-semibold'>${o.book_with || ''}</span> - ${o.option_title || ''} - <span class='text-blue-700'>${o.price ? formatPrice(o.price) : ''}</span> ${o.booking_request && o.booking_request.url ? `<a href='${o.booking_request.url}' target='_blank' class='underline text-blue-600 ml-2'>Book</a>` : ''}</li>`;
                                    }).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    <div class="mt-3 flex justify-between items-center">
                        <div class="text-sm text-gray-500">
                            <div>Baggage: ${baggage || 'Cabin 7kg'}</div>
                            <div>${flight.refundable ? 'Refundable' : 'Non-refundable'}</div>
                        </div>
                        <button class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors select-flight-btn">
                            Select Flight
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add event listener to Select Flight button
    const selectBtn = card.querySelector('.select-flight-btn');
    if (selectBtn) {
        selectBtn.addEventListener('click', function() {
            // Prepare booking data for localStorage
            const bookingData = {
                type: 'flight',
                service: `${airline} ${flightNumber}`.trim(),
                route: `${flight.origin || flight.fromCode || ''} → ${flight.destination || flight.toCode || ''}`.trim(),
                date: flight.departure_time || flight.departureTime || '',
                passengers: 1, // Default, will be updated in booking/flight.html
                amount: price,
                flightDetails: flight // Store full flight object for later use if needed
            };
            localStorage.setItem('currentBooking', JSON.stringify(bookingData));
            window.location.href = 'booking/flight.html';
        });
    }
    return card;
}

/**
 * Display flight search results
 * @param {Array} flights - Array of flight objects
 */
function displayFlights(flights) {
    // Clear previous results
    flightCards.innerHTML = '';
    
    if (!flights || flights.length === 0) {
        showFlightToast("Search Error: Google Flights hasn't returned any results for this query.");
        // Optionally clear results section
        flightCards.innerHTML = '';
        return;
    }
    
    // Update results count
    if (resultsCount) {
        resultsCount.textContent = `${flights.length} ${flights.length === 1 ? 'flight' : 'flights'} found`;
    }
    
    // Create and append flight cards
    flights.forEach(flight => {
        const flightCard = createFlightCard(flight);
        flightCards.appendChild(flightCard);
    });
}

// Toast notification for flight search errors
function showFlightToast(message) {
    let toast = document.getElementById('flightToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'flightToast';
        toast.style.display = 'none';
        toast.style.position = 'fixed';
        toast.style.top = '24px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.zIndex = '1000';
        toast.className = 'bg-red-600 text-white px-6 py-3 rounded shadow-lg font-semibold';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

// In your flight search result handler, replace the error display:
function handleFlightSearchResults(results) {
    if (!results || results.length === 0) {
        showFlightToast("Flight not found or Flights are not available");
        // Optionally clear results section
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) resultsDiv.innerHTML = '';
        return;
    }
    // ...existing code to display results...
}

/**
 * Make an API call to search for flights
 * @param {Object} searchParams - Search parameters
 * @returns {Promise<Array>} Promise that resolves to an array of flights
 */
async function searchFlights(searchParams) {
    try {
        // Prepare the request data
        const requestData = {
            from: searchParams.fromCode || searchParams.from,
            to: searchParams.toCode || searchParams.to,
            departure: searchParams.departure,
            return: searchParams.return || null,
            adults: searchParams.passengers?.adults || 1,
            children: searchParams.passengers?.children || 0,
            infants: searchParams.passengers?.infants || 0,
            cabinClass: searchParams.cabinClass || 'economy',
            currency: searchParams.currency || 'INR'
        };

        // Make the API call to our Flask backend
        const response = await fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch flights');
        }

        const data = await response.json();
        
        // Transform the data to match the expected format
        if (data.flights && Array.isArray(data.flights)) {
            return data.flights.map(flight => ({
                id: flight.id,
                airline: flight.airline,
                flightNumber: flight.flight_number,
                departureTime: flight.departure_time,
                arrivalTime: flight.arrival_time,
                departureDate: searchParams.departure,
                arrivalDate: searchParams.departure, // Assuming same day for now
                from: searchParams.from,
                to: searchParams.to,
                fromCode: searchParams.fromCode || searchParams.from,
                toCode: searchParams.toCode || searchParams.to,
                duration: flight.duration,
                stops: flight.stops || 0,
                price: flight.price,
                airlineLogo: `https://logo.clearbit.com/${flight.airline.toLowerCase().replace(/\s+/g, '')}.com`,
                aircraft: flight.aircraft || 'Not specified',
                departureTerminal: 'T1',
                arrivalTerminal: 'T1',
                amenities: flight.refundable ? ['refundable'] : ['non-refundable'],
                baggage: flight.baggage || 'Cabin 7kg + Check-in 15kg',
                refundable: flight.refundable || false,
                bestDeal: flight.best_deal || false
            }));
        }
        
        return [];
    } catch (error) {
        console.error('Error in searchFlights:', error);
        throw error; // Re-throw to be handled by the caller
    }
}

/**
 * Handle search form submission
 * @param {Event} e - The form submission event
 */
async function handleSearch(e) {
    e.preventDefault();
    
    // Clear previous errors and results
    clearErrors();
    
    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
        showError(fromInput, validation.message);
        return;
    }
    
    // Get form values
    const from = extractAirportCode(fromInput.value);
    const to = extractAirportCode(toInput.value);
    const departure = departureInput.value;
    const tripType = document.querySelector('input[name="tripType"]:checked').value;
    const returnDate = tripType === 'roundtrip' ? returnInput.value : '';
    
    // Get passenger counts from Alpine.js data or fallback to DOM elements
    let passengers = {
        adults: 1,
        children: 0,
        infants: 0
    };
    
    // Try to get from Alpine.js data
    const passengerSection = document.querySelector('[x-data]');
    if (passengerSection && passengerSection.__x.$data) {
        const alpineData = passengerSection.__x.$data;
        passengers = {
            adults: alpineData.adults || 1,
            children: alpineData.children || 0,
            infants: alpineData.infants || 0
        };
    } else {
        // Fallback to DOM elements
        passengers = {
            adults: parseInt(document.querySelector('#adultsCount')?.value) || 1,
            children: parseInt(document.querySelector('#childrenCount')?.value) || 0,
            infants: parseInt(document.querySelector('#infantsCount')?.value) || 0
        };
    }
    
    // Get cabin class from dropdown
    const cabinClass = document.querySelector('#cabinClass')?.value || 'economy';
    
    // Show loading state
    setLoadingState(true);
    updateSearchProgress(10, 'Searching for flights...');
    
    try {
        // Scroll to results
        flightResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Show loading state in results
        flightCards.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <h3 class="text-lg font-medium text-gray-900 mb-1">Searching for flights</h3>
                <p class="text-gray-500">We're finding the best options for your trip.</p>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mt-4 max-w-md mx-auto">
                    <div id="searchProgressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 30%"></div>
                </div>
            </div>
        `;
        
        // Simulate progress (in a real app, this would be based on actual API progress)
        const progressInterval = setInterval(() => {
            const progressBar = document.getElementById('searchProgressBar');
            if (progressBar) {
                const currentWidth = parseInt(progressBar.style.width) || 30;
                const newWidth = Math.min(90, currentWidth + 10);
                progressBar.style.width = `${newWidth}%`;
                
                if (newWidth >= 90) {
                    clearInterval(progressInterval);
                }
            }
        }, 500);
        
        // Prepare search parameters
        const searchParams = {
            from,
            to,
            fromCode: from,
            toCode: to,
            departure,
            return: returnDate,
            tripType,
            passengers,
            cabinClass,
            currency: 'INR'
        };
        
        // Call the flight search API
        updateSearchProgress(40, 'Fetching available flights...');
        
        try {
            const flights = await searchFlights(searchParams);
            
            // Update UI with results
            updateSearchProgress(90, 'Preparing results...');
            
            if (!flights || flights.length === 0) {
                flightCards.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <div class="mx-auto w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                            <i class="fas fa-search text-yellow-500 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-1">No flights found</h3>
                        <p class="text-gray-500">We couldn't find any flights matching your criteria. Try adjusting your search.</p>
                    </div>
                `;
            } else {
                displayFlights(flights);
            }
            
            updateSearchProgress(100, 'Search complete');
            
        } catch (error) {
            console.error('Search error:', error);
            
            // Show error message
            flightCards.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-1">Search failed</h3>
                    <p class="text-gray-500 mb-4">${error.message || 'An error occurred while searching for flights.'}</p>
                    <button id="retrySearchBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                        Retry Search
                    </button>
                </div>
            `;
            
            // Add retry handler
            document.getElementById('retrySearchBtn')?.addEventListener('click', () => {
                handleSearch(e);
            });
        } finally {
            // Clear progress interval and update UI
            clearInterval(progressInterval);
        }
        
    } catch (error) {
        console.error('Error searching flights:', error);
        
        // Show error message
        flightCards.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-1">Something went wrong</h3>
                <p class="text-gray-500 mb-4">We couldn't complete your search. Please try again.</p>
                <button id="retrySearchBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                    Retry Search
                </button>
            </div>
        `;
        
        // Add retry handler
        document.getElementById('retrySearchBtn')?.addEventListener('click', handleSearch);
        
    } finally {
        // Reset loading state
        setLoadingState(false);
        
        // Reset progress after a delay
        setTimeout(() => {
            updateSearchProgress(0, '');
        }, 1000);
    }
        return;
    }
    
// Swap airports (from <-> to)
function swapAirports() {
    const temp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = temp;
    
    // Trigger change events to update any dependent UI
    fromInput.dispatchEvent(new Event('change', { bubbles: true }));
    toInput.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Update the return date input based on trip type selection
 */
function updateReturnDateField() {
    const tripType = document.querySelector('input[name="tripType"]:checked').value;
    const returnDateGroup = document.getElementById('returnDateGroup');
    
    if (tripType === 'oneway') {
        returnDateGroup.classList.add('hidden');
        returnInput.required = false;
    } else {
        returnDateGroup.classList.remove('hidden');
        returnInput.required = true;
        
        // If return date is not set or is before departure, set it to 7 days after departure
        if (!returnInput.value || new Date(returnInput.value) <= new Date(departureInput.value)) {
            const nextWeek = new Date(departureInput.value);
            nextWeek.setDate(nextWeek.getDate() + 7);
            returnInput.value = nextWeek.toISOString().split('T')[0];
        }
    }
}

/**
 * Initialize the application
 */
function init() {
    // Set default dates
    setDefaultDates();
    
    // Setup autocomplete for airport inputs
    setupAutocomplete(fromInput);
    setupAutocomplete(toInput);
    
    // Add event listeners
    document.getElementById('searchForm')?.addEventListener('submit', handleSearch);
    
    // Handle trip type changes
    document.querySelectorAll('input[name="tripType"]').forEach(radio => {
        radio.addEventListener('change', updateReturnDateField);
    });
    
    // Handle swap airports button
    if (swapAirportsBtn) {
        swapAirportsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            swapAirports();
        });
    }
    
    // Handle sort changes
    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            if (currentFlights.length > 0) {
                sortFlights(e.target.value);
            }
        });
    }
    
    // Handle reset filters
    if (resetFilters) {
        resetFilters.addEventListener('click', () => {
            // Reset all filter checkboxes
            document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
            
            // Reset price range
            const priceRange = document.getElementById('priceRange');
            if (priceRange) {
                priceRange.value = priceRange.max;
                document.getElementById('priceValue').textContent = `Up to ₹${priceRange.value}`;
            }
            
            // Reset sort to default
            if (sortBy) {
                sortBy.value = 'price_asc';
            }
            
            // Reset filtered flights to show all
            filteredFlights = [...currentFlights];
            displayFlights(filteredFlights);
        });
    }
    
    // Initialize return date field based on default selection
    updateReturnDateField();
    
    // Handle price range input
    const priceRange = document.getElementById('priceRange');
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            document.getElementById('priceValue').textContent = `Up to ₹${e.target.value}`;
            applyFilters();
        });
    }
    
    // Handle filter checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}


/**
 * Apply all active filters to the flight results
 */
function applyFilters() {
    if (currentFlights.length === 0) return;
    
    // Get filter values
    const priceMax = parseInt(document.getElementById('priceRange').value) || 100000;
    const selectedAirlines = Array.from(document.querySelectorAll('.airline-checkbox:checked')).map(cb => cb.value);
    const selectedStops = Array.from(document.querySelectorAll('.stop-checkbox:checked')).map(cb => parseInt(cb.value));
    const selectedTimes = Array.from(document.querySelectorAll('.time-checkbox:checked')).map(cb => cb.value);
    
    // Apply filters
    filteredFlights = currentFlights.filter(flight => {
        // Price filter
        if (flight.price > priceMax) return false;
        
        // Airline filter
        if (selectedAirlines.length > 0 && !selectedAirlines.includes(flight.airline)) {
            return false;
        }
        
        // Stops filter
        if (selectedStops.length > 0 && !selectedStops.includes(flight.stops)) {
            return false;
        }
        
        // Departure time filter
        if (selectedTimes.length > 0) {
            const departureHour = parseInt(flight.departureTime.split(':')[0]);
            let timeMatch = false;
            
            for (const time of selectedTimes) {
                if (time === 'morning' && departureHour >= 5 && departureHour < 12) {
                    timeMatch = true;
                    break;
                } else if (time === 'afternoon' && departureHour >= 12 && departureHour < 17) {
                    timeMatch = true;
                    break;
                } else if (time === 'evening' && departureHour >= 17 && departureHour < 22) {
                    timeMatch = true;
                    break;
                } else if (time === 'night' && (departureHour >= 22 || departureHour < 5)) {
                    timeMatch = true;
                    break;
                }
            }
            
            if (!timeMatch) return false;
        }
        
        return true;
    });
    
    // Apply current sort
    const sortValue = sortBy ? sortBy.value : 'price_asc';
    sortFlights(sortValue);
    
    // Update UI
    displayFlights(filteredFlights);
}

/**
 * Sort flights based on the selected criteria
 * @param {string} sortByValue - The sort criteria
 */
function sortFlights(sortByValue) {
    if (!filteredFlights || filteredFlights.length === 0) return;
    
    filteredFlights.sort((a, b) => {
        switch (sortByValue) {
            case 'price_asc':
                return a.price - b.price;
            case 'price_desc':
                return b.price - a.price;
            case 'duration_asc':
                return a.duration - b.duration;
            case 'departure_asc':
                return new Date(a.departureTime) - new Date(b.departureTime);
            case 'arrival_asc':
                return new Date(a.arrivalTime) - new Date(b.arrivalTime);
            default:
                return 0;
        }
    });
    
    displayFlights(filteredFlights);
}

