// Global JavaScript for TTravels Application

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize Application
function initializeApp() {
    setupMobileMenu();
    setupAIAssistant();
    setupDateInputs();
    setupFormValidation();
    checkAuthStatus();
}

// Mobile Menu Toggle
function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// AI Assistant Functionality
function setupAIAssistant() {
    const aiToggle = document.getElementById('ai-toggle');
    const aiChat = document.getElementById('ai-chat');
    const chatInput = document.getElementById('chat-input');
    const sendMessage = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    
    if (aiToggle && aiChat) {
        aiToggle.addEventListener('click', function() {
            aiChat.classList.toggle('hidden');
            if (!aiChat.classList.contains('hidden')) {
                chatInput?.focus();
            }
        });
    }
    
    if (sendMessage && chatInput && chatMessages) {
        sendMessage.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
}

// Send Chat Message
function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatInput || !chatMessages) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    
    // Clear input
    chatInput.value = '';
    
    // Simulate AI response
    setTimeout(() => {
        const responses = [
            "I can help you find the best travel deals. What are you looking for?",
            "Let me search for the latest options for you. Please give me a moment.",
            "Based on your query, I recommend checking our latest offers.",
            "I'd be happy to assist you with your travel planning. Could you provide more details?",
            "Great question! I can help you with booking flights, hotels, and more.",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(randomResponse, 'ai');
    }, 1000);
}

// Add Chat Message
function addChatMessage(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-3 ${sender === 'user' ? 'text-right' : 'text-left'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = `inline-block p-3 rounded-lg max-w-xs ${
        sender === 'user' 
            ? 'bg-primary-600 text-white' 
            : 'bg-gray-100 text-gray-800'
    }`;
    messageContent.textContent = message;
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Setup Date Inputs with Default Values-------------------------------------------------------
function setupDateInputs() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach((input, index) => {
        const date = index === 0 ? today : tomorrow;
        if (!input.value) {
            input.value = date.toISOString().split('T')[0];
        }
        input.min = today.toISOString().split('T')[0];
    });
}

// Form Validation
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(form)) {
                e.preventDefault();
            }
        });
    });
}

// Validate Form
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    return isValid;
}

// Show Field Error
function showFieldError(field, message) {
    clearFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 text-sm mt-1 field-error';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
    field.classList.add('border-red-500');
}

// Clear Field Error
function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.classList.remove('border-red-500');
}

// Check Authentication Status
function checkAuthStatus() {
    const user = localStorage.getItem('ttravel_user');
    const authElements = document.querySelectorAll('[data-auth]');
    
    authElements.forEach(element => {
        const authType = element.getAttribute('data-auth');
        if (authType === 'required' && !user) {
            element.style.display = 'none';
        } else if (authType === 'guest' && user) {
            element.style.display = 'none';
        }
    });
}

// Logout Functionality
function logout() {
    localStorage.removeItem('ttravel_user');
    window.location.href = 'index.html';
}

// Setup logout button
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// Utility Functions
function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}
// -------------------------------------------------------
// function formatDate(date) {
//     return new Date(date).toLocaleDateString('en-IN', {
//         weekday: 'short',
//         year: 'numeric',
//         month: 'short',
//         day: 'numeric'
//     });
// }

// function formatTime(time) {
//     return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true
//     });
// }
// -------------------------------------------------------

// Loading State Management
function showLoading(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-black' :
        'bg-blue-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Export functions for use in other modules
window.TTravelApp = {
    formatCurrency,
    showLoading,
    hideLoading,
    showToast,
    addChatMessage
};