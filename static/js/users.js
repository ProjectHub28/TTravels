// User Management JavaScript

let currentUsers = [];
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    initializeUserManagement();
    loadUsersData();
});

function checkAdminAuth() {
    const admin = localStorage.getItem('ttravels_admin');
    if (!admin) {
        window.location.href = '/index.html';
        return;
    }
}

function initializeUserManagement() {
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
    const modal = document.getElementById('userModal');
    const closeBtn = document.getElementById('closeModal');
    
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function loadUsersData() {
    // Mock user data - in real app, this would come from API
    currentUsers = [
        {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+91 9876543210',
            registrationDate: '2024-12-01',
            lastLogin: '2025-01-16',
            status: 'active',
            bookings: 5,
            totalSpent: 25000,
            avatar: null
        },
        {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+91 9876543211',
            registrationDate: '2024-11-15',
            lastLogin: '2025-01-15',
            status: 'active',
            bookings: 3,
            totalSpent: 18000,
            avatar: null
        },
        {
            id: 3,
            name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '+91 9876543212',
            registrationDate: '2024-10-20',
            lastLogin: '2025-01-10',
            status: 'suspended',
            bookings: 8,
            totalSpent: 45000,
            avatar: null
        },
        {
            id: 4,
            name: 'Sarah Wilson',
            email: 'sarah@example.com',
            phone: '+91 9876543213',
            registrationDate: '2024-12-10',
            lastLogin: '2025-01-14',
            status: 'active',
            bookings: 2,
            totalSpent: 8500,
            avatar: null
        },
        {
            id: 5,
            name: 'David Brown',
            email: 'david@example.com',
            phone: '+91 9876543214',
            registrationDate: '2024-09-05',
            lastLogin: '2025-01-12',
            status: 'active',
            bookings: 12,
            totalSpent: 67000,
            avatar: null
        },
        {
            id: 6,
            name: 'Emily Davis',
            email: 'emily@example.com',
            phone: '+91 9876543215',
            registrationDate: '2025-01-05',
            lastLogin: '2025-01-16',
            status: 'active',
            bookings: 1,
            totalSpent: 3500,
            avatar: null
        },
        {
            id: 7,
            name: 'Robert Miller',
            email: 'robert@example.com',
            phone: '+91 9876543216',
            registrationDate: '2024-08-15',
            lastLogin: '2024-12-20',
            status: 'active',
            bookings: 6,
            totalSpent: 32000,
            avatar: null
        },
        {
            id: 8,
            name: 'Lisa Anderson',
            email: 'lisa@example.com',
            phone: '+91 9876543217',
            registrationDate: '2024-11-30',
            lastLogin: '2025-01-13',
            status: 'suspended',
            bookings: 4,
            totalSpent: 22000,
            avatar: null
        }
    ];
    
    filteredUsers = [...currentUsers];
    displayUsers();
    updateStats();
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    filteredUsers = currentUsers.filter(user => {
        // Search filter
        const searchMatch = !search || 
            user.name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            user.phone.includes(search);
        
        // Status filter
        const statusMatch = !status || user.status === status;
        
        // Date filter
        let dateMatch = true;
        if (dateFilter) {
            const userDate = new Date(user.registrationDate);
            const now = new Date();
            
            switch (dateFilter) {
                case 'today':
                    dateMatch = userDate.toDateString() === now.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    dateMatch = userDate >= weekAgo;
                    break;
                case 'month':
                    dateMatch = userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
                    break;
                case 'year':
                    dateMatch = userDate.getFullYear() === now.getFullYear();
                    break;
            }
        }
        
        return searchMatch && statusMatch && dateMatch;
    });
    
    currentPage = 1;
    displayUsers();
    updateStats();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFilter').value = '';
    
    filteredUsers = [...currentUsers];
    currentPage = 1;
    displayUsers();
    updateStats();
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageUsers = filteredUsers.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageUsers.map(user => createUserRow(user)).join('');
    updatePagination();
}

function createUserRow(user) {
    const statusColors = {
        active: 'bg-green-100 text-green-800',
        suspended: 'bg-red-100 text-red-800'
    };
    
    const daysSinceLogin = Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24));
    
    return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" class="rounded border-gray-300" value="${user.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span class="text-primary-600 font-medium text-sm">${user.name.charAt(0)}</span>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${user.name}</div>
                        <div class="text-sm text-gray-500">ID: ${user.id}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${user.email}</div>
                <div class="text-sm text-gray-500">${user.phone}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(user.registrationDate)}</div>
                <div class="text-sm text-gray-500">Member since</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${user.bookings} bookings</div>
                <div class="text-sm text-gray-500">
                    Last login: ${daysSinceLogin === 0 ? 'Today' : `${daysSinceLogin} days ago`}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[user.status]}">
                    ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewUserDetails(${user.id})" class="text-primary-600 hover:text-primary-900">
                        View
                    </button>
                    <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900">
                        Edit
                    </button>
                    ${user.status === 'active' ? 
                        `<button onclick="suspendUser(${user.id})" class="text-red-600 hover:text-red-900">Suspend</button>` :
                        `<button onclick="activateUser(${user.id})" class="text-green-600 hover:text-green-900">Activate</button>`
                    }
                </div>
            </td>
        </tr>
    `;
}

function updateStats() {
    const totalUsers = currentUsers.length;
    const activeUsers = currentUsers.filter(u => u.status === 'active').length;
    const suspendedUsers = currentUsers.filter(u => u.status === 'suspended').length;
    
    // Calculate new users this month
    const now = new Date();
    const thisMonth = currentUsers.filter(u => {
        const userDate = new Date(u.registrationDate);
        return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
    }).length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('suspendedUsers').textContent = suspendedUsers;
    document.getElementById('newUsers').textContent = thisMonth;
    
    document.getElementById('showingCount').textContent = Math.min(filteredUsers.length, itemsPerPage);
    document.getElementById('totalCount').textContent = filteredUsers.length;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayUsers();
    }
}

// Action Functions
function viewUserDetails(userId) {
    const user = currentUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('userModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = createUserDetailsHTML(user);
    modal.classList.remove('hidden');
}

function createUserDetailsHTML(user) {
    const statusColors = {
        active: 'bg-green-100 text-green-800',
        suspended: 'bg-red-100 text-red-800'
    };
    
    return `
        <div class="space-y-6">
            <div class="flex items-center space-x-4">
                <div class="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <span class="text-primary-600 font-bold text-xl">${user.name.charAt(0)}</span>
                </div>
                <div>
                    <h4 class="text-xl font-semibold text-gray-900">${user.name}</h4>
                    <p class="text-gray-600">User ID: ${user.id}</p>
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[user.status]} mt-1">
                        ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h5 class="font-medium text-gray-900 mb-3">Contact Information</h5>
                    <div class="space-y-2 text-sm">
                        <p><span class="font-medium">Email:</span> ${user.email}</p>
                        <p><span class="font-medium">Phone:</span> ${user.phone}</p>
                    </div>
                </div>
                
                <div>
                    <h5 class="font-medium text-gray-900 mb-3">Account Details</h5>
                    <div class="space-y-2 text-sm">
                        <p><span class="font-medium">Registration:</span> ${formatDate(user.registrationDate)}</p>
                        <p><span class="font-medium">Last Login:</span> ${formatDate(user.lastLogin)}</p>
                    </div>
                </div>
            </div>
            
            <div>
                <h5 class="font-medium text-gray-900 mb-3">Booking Statistics</h5>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-gray-900">${user.bookings}</div>
                        <div class="text-sm text-gray-600">Total Bookings</div>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-gray-900">${formatCurrency(user.totalSpent)}</div>
                        <div class="text-sm text-gray-600">Total Spent</div>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4 border-t">
                <button onclick="editUser(${user.id})" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    Edit User
                </button>
                ${user.status === 'active' ? 
                    `<button onclick="suspendUser(${user.id})" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Suspend User
                    </button>` :
                    `<button onclick="activateUser(${user.id})" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Activate User
                    </button>`
                }
            </div>
        </div>
    `;
}

function editUser(userId) {
    alert(`Edit user functionality would be implemented here for user: ${userId}`);
}

function suspendUser(userId) {
    if (confirm('Are you sure you want to suspend this user?')) {
        const userIndex = currentUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            currentUsers[userIndex].status = 'suspended';
            applyFilters(); // Refresh the display
            alert(`User ${userId} has been suspended`);
        }
    }
}

function activateUser(userId) {
    if (confirm('Are you sure you want to activate this user?')) {
        const userIndex = currentUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            currentUsers[userIndex].status = 'active';
            applyFilters(); // Refresh the display
            alert(`User ${userId} has been activated`);
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