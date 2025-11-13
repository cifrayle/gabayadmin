// Supabase Configuration
const SUPABASE_URL = 'https://vzpjsmbpgqlanqzeiqsb.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGpzbWJwZ3FsYW5xemVpcXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NzI3MjUsImV4cCI6MjA3NTI0ODcyNX0.Iwz5iXkQxbACmYgJ6EB7bXuX76tLPYPJSZPF33N9k-s';
let accessToken = null;
let currentUser = null;
let allUsers = [];
let userAnalytics = [];

// DOM Elements
const loginModal = document.getElementById('loginModal');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminInfo = document.getElementById('adminInfo');
const loading = document.getElementById('loading');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeUI();
    checkAuthStatus();
});

function initializeUI() {
    // Ensure error message is hidden on page load
    if (loginError) {
        loginError.textContent = '';
        loginError.classList.remove('show');
    }
}

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Refresh users button
    document.getElementById('refreshUsers').addEventListener('click', loadUsers);
    
    // User search
    document.getElementById('userSearch').addEventListener('input', filterUsers);
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        showLoading(true);
        loginError.textContent = '';
        loginError.classList.remove('show');
        
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.access_token) {
            accessToken = data.access_token;
            currentUser = data.user;
            
            // Check if user is admin
            if (isUserAdmin(currentUser.email)) {
                showDashboard();
                loadDashboardData();
            } else {
                throw new Error('Access denied. Admin privileges required.');
            }
        } else {
            throw new Error(data.error_description || 'Login failed');
        }
    } catch (error) {
        loginError.textContent = error.message;
        loginError.classList.add('show');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            loginError.classList.remove('show');
            setTimeout(() => {
                if (!loginError.classList.contains('show')) {
                    loginError.textContent = '';
                }
            }, 300); // Wait for animation to complete
        }, 5000);
    } finally {
        showLoading(false);
    }
}

function isUserAdmin(email) {
    // Admin check - customize this logic
    const adminEmails = ['admin@gabay.com', 'superadmin@gabay.com', 'gabayadmin@gmail.com'];
    return adminEmails.includes(email) || email.includes('admin');
}

function handleLogout() {
    accessToken = null;
    currentUser = null;
    localStorage.removeItem('gabay_admin_token');
    showLogin();
}

function checkAuthStatus() {
    const savedToken = localStorage.getItem('gabay_admin_token');
    if (savedToken) {
        accessToken = savedToken;
        verifyToken();
    } else {
        showLogin();
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            showDashboard();
            loadDashboardData();
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin();
    }
}

// UI Functions
function showLogin() {
    loginModal.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function showDashboard() {
    loginModal.classList.add('hidden');
    dashboard.classList.remove('hidden');
    adminInfo.textContent = `Welcome, ${currentUser.email}`;
    localStorage.setItem('gabay_admin_token', accessToken);
}

function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Load tab-specific data
    switch(tabName) {
        case 'users':
            loadUsers();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Data Loading Functions
async function loadDashboardData() {
    try {
        showLoading(true);
        await loadUsers();
        await loadUserAnalytics();
        updateOverviewStats();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    } finally {
        showLoading(false);
    }
}

async function loadUserAnalytics() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/user_analytics?select=*`, {
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            userAnalytics = await response.json();
            console.log('User analytics loaded:', userAnalytics.length);
        } else {
            console.warn('Could not load user analytics');
            userAnalytics = [];
        }
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        userAnalytics = [];
    }
}

async function loadUsers() {
    try {
        console.log('Loading users...');
        
        // Try to fetch from user_profiles first
        let usersFromProfiles = [];
        try {
            const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=*`, {
                headers: {
                    'apikey': SUPABASE_API_KEY,
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (profileResponse.ok) {
                usersFromProfiles = await profileResponse.json();
                console.log('Users from profiles:', usersFromProfiles.length);
            }
        } catch (profileError) {
            console.log('Could not fetch from user_profiles:', profileError);
        }
        
        // Also try to get auth users using the admin endpoint
        let authUsers = [];
        try {
            const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
                headers: {
                    'apikey': SUPABASE_API_KEY,
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (authResponse.ok) {
                const authData = await authResponse.json();
                authUsers = authData.users || [];
                console.log('Users from auth:', authUsers.length);
            }
        } catch (authError) {
            console.log('Could not fetch from auth admin:', authError);
        }
        
        // Merge both sources
        const mergedUsers = mergeUserData(authUsers, usersFromProfiles);
        
        if (mergedUsers.length === 0) {
            console.warn('No users found. Trying alternative method...');
            allUsers = usersFromProfiles.length > 0 ? usersFromProfiles : [];
        } else {
            allUsers = mergedUsers;
        }
        
        console.log('Total users loaded:', allUsers.length);
        displayUsers(allUsers);
        updateOverviewStats();
        
        if (allUsers.length === 0) {
            alert('No users found. Make sure:\n1. Users have signed up\n2. RLS policies allow reading user_profiles\n3. You have admin access');
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Error loading users: ' + error.message);
    }
}

function mergeUserData(authUsers, profileUsers) {
    const merged = [];
    const profileMap = {};
    
    // Create a map of profiles by user ID
    profileUsers.forEach(profile => {
        profileMap[profile.id] = profile;
    });
    
    // Merge auth users with their profiles
    authUsers.forEach(authUser => {
        const profile = profileMap[authUser.id] || {};
        const analytics = userAnalytics.find(a => a.user_id === authUser.id) || {};
        
        merged.push({
            id: authUser.id,
            email: authUser.email,
            username: profile.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'Unknown',
            created_at: authUser.created_at,
            updated_at: profile.updated_at || authUser.updated_at,
            last_sign_in: authUser.last_sign_in_at,
            // Enhanced Analytics data
            app_rating: analytics.app_rating || null,
            rating_comment: analytics.rating_comment || null,
            total_sessions: analytics.total_sessions || 0,
            total_time_spent_minutes: analytics.total_time_spent_minutes || 0,
            current_streak: analytics.current_streak_days || 0,
            longest_streak: analytics.longest_streak_days || 0
        });
        
        delete profileMap[authUser.id];
    });
    
    // Add any profiles that don't have corresponding auth users
    Object.values(profileMap).forEach(profile => {
        const analytics = userAnalytics.find(a => a.user_id === profile.id) || {};
        
        merged.push({
            id: profile.id,
            email: profile.email || 'N/A',
            username: profile.username || 'Unknown',
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            // Enhanced Analytics data
            app_rating: analytics.app_rating || null,
            rating_comment: analytics.rating_comment || null,
            total_sessions: analytics.total_sessions || 0,
            total_time_spent_minutes: analytics.total_time_spent_minutes || 0,
            current_streak: analytics.current_streak_days || 0,
            longest_streak: analytics.longest_streak_days || 0
        });
    });
    
    return merged;
}

function updateOverviewStats() {
    if (allUsers.length === 0) {
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('activeUsers').textContent = '0';
        return;
    }
    
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(user => {
        const lastActive = new Date(user.last_sign_in || user.updated_at || user.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return lastActive > weekAgo;
    }).length;
    
    
    // Calculate analytics stats
    const totalSessions = allUsers.reduce((sum, user) => sum + (user.total_sessions || 0), 0);
    const totalTimeSpent = allUsers.reduce((sum, user) => sum + (user.total_time_spent_minutes || 0), 0);
    const avgTimePerUser = totalUsers > 0 ? Math.round(totalTimeSpent / totalUsers) : 0;
    
    const ratingsCount = allUsers.filter(u => u.app_rating).length;
    const avgRating = ratingsCount > 0 ? 
        allUsers.reduce((sum, u) => sum + (u.app_rating || 0), 0) / ratingsCount : 0;
    
    // Update UI
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    
    // Update analytics stats if elements exist
    if (document.getElementById('totalSessions')) {
        document.getElementById('totalSessions').textContent = totalSessions;
    }
    if (document.getElementById('avgTimeSpent')) {
        document.getElementById('avgTimeSpent').textContent = `${avgTimePerUser} min`;
    }
    if (document.getElementById('avgRating')) {
        document.getElementById('avgRating').textContent = avgRating > 0 ? avgRating.toFixed(1) : 'N/A';
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No users found</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const lastActive = user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString() :
                          user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never';
        
        const ratingDisplay = user.app_rating ? `⭐ ${user.app_rating}/5` : 'Not rated';
        const streakDisplay = user.current_streak > 0 ? `🔥 ${user.current_streak} days` : 'No streak';
        
        row.innerHTML = `
            <td>${user.username || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.total_sessions || 0}</td>
            <td>${ratingDisplay}</td>
            <td>${streakDisplay}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view tooltip" onclick="viewUser('${user.id}')" data-tooltip="View user details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-reset tooltip" onclick="resetUser('${user.id}')" data-tooltip="Reset user progress">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="action-btn btn-delete tooltip" onclick="deleteUser('${user.id}')" data-tooltip="Delete user permanently">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        (user.username || '').toLowerCase().includes(searchTerm) ||
        (user.email || '').toLowerCase().includes(searchTerm)
    );
    displayUsers(filteredUsers);
}


async function loadAnalytics() {
    if (userAnalytics.length === 0) {
        console.log('No analytics data available');
        return;
    }
    
    // Display top rated users
    displayTopRatedUsers();
    
    // Display most active users
    displayMostActiveUsers();
    
    // Display streak leaders
    displayStreakLeaders();
    
    // Display rating distribution
    displayRatingDistribution();
}

function displayTopRatedUsers() {
    const container = document.getElementById('topRatedUsers');
    if (!container) return;
    
    const ratedUsers = allUsers
        .filter(u => u.app_rating)
        .sort((a, b) => b.app_rating - a.app_rating)
        .slice(0, 10);
    
    container.innerHTML = ratedUsers.length > 0 ? 
        ratedUsers.map(user => `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>${user.username}</strong> - ⭐ ${user.app_rating}/5
                ${user.rating_comment ? `<br><small style="color: #666; font-style: italic;">"${user.rating_comment}"</small>` : ''}
            </div>
        `).join('') : 
        '<p style="padding: 20px; text-align: center; color: #666;">No ratings yet</p>';
}

function displayMostActiveUsers() {
    const container = document.getElementById('mostActiveUsers');
    if (!container) return;
    
    const activeUsers = allUsers
        .filter(u => u.total_sessions > 0)
        .sort((a, b) => b.total_sessions - a.total_sessions)
        .slice(0, 10);
    
    container.innerHTML = activeUsers.length > 0 ?
        activeUsers.map(user => `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>${user.username}</strong> - ${user.total_sessions} sessions (${user.total_time_spent_minutes || 0} min)
            </div>
        `).join('') :
        '<p style="padding: 20px; text-align: center; color: #666;">No activity data yet</p>';
}

function displayStreakLeaders() {
    const container = document.getElementById('streakLeaders');
    if (!container) return;
    
    const streakUsers = allUsers
        .filter(u => u.current_streak > 0)
        .sort((a, b) => b.current_streak - a.current_streak)
        .slice(0, 10);
    
    container.innerHTML = streakUsers.length > 0 ?
        streakUsers.map(user => `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>${user.username}</strong> - 🔥 ${user.current_streak} days (Best: ${user.longest_streak || user.current_streak})
            </div>
        `).join('') :
        '<p style="padding: 20px; text-align: center; color: #666;">No streaks yet</p>';
}

function displayRatingDistribution() {
    const container = document.getElementById('ratingDistribution');
    if (!container) return;
    
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allUsers.forEach(user => {
        if (user.app_rating) {
            distribution[user.app_rating]++;
        }
    });
    
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    
    container.innerHTML = total > 0 ?
        Object.entries(distribution).reverse().map(([rating, count]) => {
            const percentage = total > 0 ? (count / total * 100) : 0;
            return `
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>⭐ ${rating} stars</span>
                        <span>${count} users (${percentage.toFixed(1)}%)</span>
                    </div>
                    <div style="background: #eee; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: #ffd700; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
        }).join('') :
        '<p style="padding: 20px; text-align: center; color: #666;">No ratings yet</p>';
}

// User Actions
function viewUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        const analytics = userAnalytics.find(a => a.user_id === userId);
        
        alert(`User Details:

Username: ${user.username || 'N/A'}
Email: ${user.email || 'N/A'}

Analytics:
App Rating: ${user.app_rating ? `⭐ ${user.app_rating}/5` : 'Not rated'}
Rating Comment: ${user.rating_comment || 'No comment'}
Total Sessions: ${user.total_sessions || 0}
Time Spent: ${user.total_time_spent_minutes || 0} minutes
Current Streak: ${user.current_streak || 0} days
Longest Streak: ${user.longest_streak || 0} days
Favorite Chapter: ${analytics?.favorite_chapter || 'N/A'}`);
    }
}

async function resetUser(userId) {
    if (!confirm('Are you sure you want to reset this user\'s progress? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Delete all user progress records
        const progressResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${userId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Reset user profile (if it exists)
        const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                // Reset any profile-level progress tracking if it exists
                current_level: null,
                current_chapter: null
            })
        });
        
        // Reset analytics
        const analyticsResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_analytics?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                total_sessions: 0,
                total_time_spent_minutes: 0,
                chapters_completed: 0,
                levels_completed: 0,
                current_streak_days: 0,
                longest_streak_days: 0,
                app_rating: null,
                rating_comment: null,
                favorite_chapter: null
            })
        });
        
        if (progressResponse.ok || profileResponse.ok) {
            alert('User progress and analytics reset successfully!');
            await loadUsers();
            await loadUserAnalytics();
        } else {
            throw new Error('Failed to reset user progress');
        }
    } catch (error) {
        console.error('Error resetting user:', error);
        alert('Error resetting user: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Delete user from auth
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        // Delete user profile
        const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        // Delete user analytics
        const analyticsResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_analytics?user_id=eq.${userId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (authResponse.ok || profileResponse.ok) {
            alert('User deleted successfully!');
            await loadUsers();
            await loadUserAnalytics();
        } else {
            throw new Error('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    } finally {
        showLoading(false);
    }
}