/**
 * Frontend Application JavaScript
 * Handles UI interactions and API communications
 */

const API_BASE = ''; // API Gateway base URL

class MicroservicesApp {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.checkServicesHealth();
        if (this.token) {
            this.verifyToken();
        }
    }

    /**
     * Bind event listeners to UI elements
     */
    bindEvents() {
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('loadProducts').addEventListener('click', () => this.loadProducts());
    }

    /**
     * Handle user login
     * @param {Event} e - Form submit event
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.token = data.access_token;
                localStorage.setItem('auth_token', this.token);
                this.showUserInfo(username);
                this.showAlert('Login successful!', 'success');
            } else {
                this.showAlert('Invalid username or password', 'danger');
            }
        } catch (error) {
            this.showAlert('Server connection error', 'danger');
        }
    }

    /**
     * Verify authentication token
     */
    async verifyToken() {
        try {
            const response = await fetch(`${API_BASE}/auth/verify/${this.token}`);
            if (response.ok) {
                const userData = await response.json();
                this.showUserInfo(userData.username);
            } else {
                this.handleLogout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        }
    }

    /**
     * Display user information
     * @param {string} username - Username to fetch info for
     */
    async showUserInfo(username) {
        try {
            const response = await fetch(`${API_BASE}/auth/users/${username}`);
            if (response.ok) {
                const user = await response.json();
                document.getElementById('userDetails').innerHTML = `
                    <strong>Name:</strong> ${user.full_name}<br>
                    <strong>Email:</strong> ${user.email}<br>
                    <strong>Username:</strong> ${user.username}
                `;
                document.getElementById('userInfo').classList.remove('d-none');
                document.getElementById('loginForm').classList.add('d-none');
            }
        } catch (error) {
            console.error('Failed to get user info:', error);
        }
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        this.token = null;
        localStorage.removeItem('auth_token');
        document.getElementById('userInfo').classList.add('d-none');
        document.getElementById('loginForm').classList.remove('d-none');
        document.getElementById('loginForm').reset();
        this.showAlert('Logout successful', 'info');
    }

    /**
     * Load and display products
     */
    async loadProducts() {
        const container = document.getElementById('productsContainer');
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>';

        try {
            const response = await fetch(`${API_BASE}/products/products`);
            if (response.ok) {
                const result = await response.json();
                this.displayProducts(result.data, result.source);
            } else {
                throw new Error('Failed to load products');
            }
        } catch (error) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-danger">Error loading products</div>
                </div>
            `;
        }
    }

    /**
     * Display products in the UI
     * @param {Array} products - Array of product objects
     * @param {string} source - Data source (cache/database)
     */
    displayProducts(products, source) {
        const container = document.getElementById('productsContainer');
        
        let html = `
            <div class="col-12 mb-3">
                <span class="badge bg-${source === 'cache' ? 'success' : 'info'} cache-badge">
                    Data Source: ${source === 'cache' ? 'Redis Cache' : 'Database'}
                </span>
            </div>
        `;

        products.forEach(product => {
            html += `
                <div class="col-md-3 mb-4">
                    <div class="card product-card">
                        <div class="card-body">
                            <h6 class="card-title">${product.name}</h6>
                            <p class="card-text text-muted small">${product.description}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-primary fw-bold">${this.formatPrice(product.price)} Toman</span>
                                <span class="badge bg-secondary">Stock: ${product.stock}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Check health status of all services
     */
    async checkServicesHealth() {
        const services = [
            { name: 'Auth Service', endpoint: '/auth/health' },
            { name: 'Products Service', endpoint: '/products/health' },
            { name: 'Redis Cache', endpoint: '/products/products' } // Indirect Redis test
        ];

        const statusContainer = document.getElementById('servicesStatus');
        let html = '';

        for (const service of services) {
            try {
                const response = await fetch(`${API_BASE}${service.endpoint}`);
                const status = response.ok ? 'success' : 'danger';
                const icon = response.ok ? 'bi-check-circle' : 'bi-x-circle';
                
                html += `
                    <div class="col-md-4 mb-2">
                        <div class="d-flex align-items-center">
                            <i class="bi ${icon} text-${status} me-2"></i>
                            <span class="health-status">${service.name}</span>
                        </div>
                    </div>
                `;
            } catch (error) {
                html += `
                    <div class="col-md-4 mb-2">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-x-circle text-danger me-2"></i>
                            <span class="health-status">${service.name}</span>
                        </div>
                    </div>
                `;
            }
        }

        statusContainer.innerHTML = html;
    }

    /**
     * Format price with Persian number formatting
     * @param {number} price - Price to format
     * @returns {string} Formatted price string
     */
    formatPrice(price) {
        return new Intl.NumberFormat('fa-IR').format(price);
    }

    /**
     * Show alert message to user
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     */
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MicroservicesApp();
});