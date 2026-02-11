// Roof4U - Main Application JavaScript with JSON-Server Integration

class Roof4U {
    constructor() {
        this.API_URL = 'http://localhost:3000'; // JSON-Server endpoint
        this.currentUser = null;
        this.data = {
            users: [],
            properties: [],
            tenants: [],
            payments: [],
            maintenance: [],
            vendors: [],
            leases: [],
            expenses: []
        };
        this.init();
    }
    
    // Initialize application
    async init() {
        await this.checkServerConnection();
        this.setupEventListeners();
        this.setupEnhancedEventListeners();
        await this.checkAuthentication();
        await this.loadInitialData();
    }
    
    // Check if JSON-Server is running
    async checkServerConnection() {
        try {
            const response = await fetch(`${"http://localhost:3000"}/properties`);
            if (!response.ok) throw new Error('Server not responding');
            console.log('✅ Connected to JSON-Server at', "http://localhost:3000");
        } catch (error) {
            console.error('❌ Cannot connect to JSON-Server. Make sure to run: json-server --watch roof4u.json --port 3000');
            this.showServerError();
        }
    }
    
    // Show server error message
    showServerError() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #e74c3c;
            color: white;
            text-align: center;
            padding: 15px;
            z-index: 9999;
            font-weight: bold;
        `;
        errorDiv.innerHTML = `
            ⚠️ JSON-Server is not running! Please run: 
            <code style="background: rgba(0,0,0,0.2); padding: 5px 10px; border-radius: 5px; margin: 0 10px;">
            json-server --watch roof4u.json --port 3000
            </code>
            <button onclick="this.parentElement.remove()" style="margin-left: 20px; padding: 5px 15px; background: white; color: #e74c3c; border: none; border-radius: 5px; cursor: pointer;">Dismiss</button>
        `;
        document.body.prepend(errorDiv);
    }
    
    // Load all initial data from JSON-Server
    async loadInitialData() {
        try {
            const endpoints = ['properties', 'tenants', 'payments', 'maintenance', 'users', 'vendors', 'leases', 'expenses'];
            
            for (const endpoint of endpoints) {
                await this.fetchData(endpoint);
            }
            
            console.log('✅ All data loaded successfully');
            
            // Update UI based on current page
            this.updateDashboard();
            this.updateRentStats();
            this.updatePaymentStats();
            this.updateMaintenanceStats();
            
            if (window.location.pathname.includes('houses.html')) {
                await this.initializeHousesPage();
            }
            
            if (window.location.pathname.includes('rent.html')) {
                await this.renderTenantsTable();
                this.updateLeaseExpirations();
            }
            
            if (window.location.pathname.includes('payments.html')) {
                await this.renderPaymentsTable();
                this.initializeRevenueChart();
            }
            
            if (window.location.pathname.includes('maintenance.html')) {
                await this.renderMaintenanceTable();
                this.updatePriorityTickets();
            }
            
            // Populate dropdowns
            this.populatePropertyDropdowns();
            this.populateTenantDropdowns();
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    // Fetch data from JSON-Server
    async fetchData(endpoint) {
        try {
            const response = await fetch(`${"http://localhost:3000"}/${endpoint}`);
            if (response.ok) {
                this.data[endpoint] = await response.json();
                return this.data[endpoint];
            }
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            this.data[endpoint] = [];
        }
        return [];
    }
    
    // Post data to JSON-Server
    async postData(endpoint, data) {
        try {
            const response = await fetch(`${"http://localhost:3000"}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const newItem = await response.json();
                // Update local data
                this.data[endpoint].push(newItem);
                return newItem;
            }
        } catch (error) {
            console.error(`Error posting to ${endpoint}:`, error);
            throw error;
        }
    }
    
    // Update data in JSON-Server
    async putData(endpoint, id, data) {
        try {
            const response = await fetch(`${"http://localhost:3000"}/${endpoint}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const updatedItem = await response.json();
                // Update local data
                const index = this.data[endpoint].findIndex(item => item.id === id);
                if (index !== -1) {
                    this.data[endpoint][index] = updatedItem;
                }
                return updatedItem;
            }
        } catch (error) {
            console.error(`Error updating ${endpoint}:`, error);
            throw error;
        }
    }
    
    // Delete data from JSON-Server
    async deleteData(endpoint, id) {
        try {
            const response = await fetch(`${this.API_URL}/${endpoint}/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Update local data
                this.data[endpoint] = this.data[endpoint].filter(item => item.id !== id);
                return true;
            }
        } catch (error) {
            console.error(`Error deleting from ${endpoint}:`, error);
            throw error;
        }
    }
    
    // Authentication methods
    async checkAuthentication() {
        const currentPage = window.location.pathname.split('/').pop();
        const loggedInUser = sessionStorage.getItem('roof4u_user');
        
        if (currentPage !== 'login.html' && !loggedInUser) {
            window.location.href = 'login.html';
        } else if (currentPage === 'login.html' && loggedInUser) {
            window.location.href = 'roof4u.html';
        }
        
        if (loggedInUser) {
            this.currentUser = JSON.parse(loggedInUser);
            this.updateUserDisplay();
        }
    }
    
    async login(username, password) {
        try {
            // Query JSON-Server for user
            const response = await fetch(`${"http://localhost:3000"}/users?username=${username}&password=${password}`);
            const users = await response.json();
            
            if (users.length > 0) {
                const user = users[0];
                this.currentUser = user;
                sessionStorage.setItem('roof4u_user', JSON.stringify(user));
                return true;
            }
        } catch (error) {
            console.error('Login error:', error);
        }
        return false;
    }
    
    logout() {
        sessionStorage.removeItem('roof4u_user');
        this.currentUser = null;
        window.location.href = 'login.html';
    }
    
    // Dashboard functionality
    async updateDashboard() {
        if (window.location.pathname.includes('roof4u.html')) {
            await this.updateStats();
            await this.updateActivities();
        }
    }
    
    async updateStats() {
        const statsContainer = document.getElementById('statsContainer');
        if (!statsContainer) return;
        
        const stats = {
            totalProperties: this.data.properties.length,
            occupiedProperties: this.data.properties.filter(p => p.status === 'occupied').length,
            activeTenants: this.data.tenants.filter(t => t.status === 'active').length,
            totalRevenue: this.data.payments.reduce((sum, p) => sum + (p.amount || 0), 0),
            pendingMaintenance: this.data.maintenance.filter(m => 
                ['pending', 'open', 'in_progress'].includes(m.status)
            ).length
        };
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>${stats.totalProperties}</h3>
                <p>Total Properties</p>
            </div>
            <div class="stat-card">
                <h3>${stats.occupiedProperties}</h3>
                <p>Occupied Properties</p>
            </div>
            <div class="stat-card">
                <h3>${stats.activeTenants}</h3>
                <p>Active Tenants</p>
            </div>
            <div class="stat-card">
                <h3>$${stats.totalRevenue.toLocaleString()}</h3>
                <p>Total Revenue</p>
            </div>
            <div class="stat-card">
                <h3>${stats.pendingMaintenance}</h3>
                <p>Pending Maintenance</p>
            </div>
        `;
    }
    
    async updateActivities() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        // Get recent activities from both payments and maintenance
        const recentPayments = [...this.data.payments]
            .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
            .slice(0, 3);
        
        const recentMaintenance = [...this.data.maintenance]
            .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
            .slice(0, 2);
        
        const activities = [...recentPayments, ...recentMaintenance]
            .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
            .slice(0, 5);
        
        if (activities.length === 0) {
            activityList.innerHTML = '<div class="activity-item">No recent activities</div>';
            return;
        }
        
        activityList.innerHTML = activities.map(activity => {
            if (activity.amount) {
                const tenant = this.data.tenants.find(t => t.id === activity.tenant_id);
                return `
                    <div class="activity-item">
                        <span class="activity-icon">💰</span>
                        <div>
                            <p><strong>Payment Received</strong></p>
                            <p>$${activity.amount} from ${tenant ? tenant.name : 'Tenant #' + activity.tenant_id}</p>
                            <small>${activity.date || activity.created_at || 'N/A'}</small>
                        </div>
                    </div>
                `;
            } else {
                const property = this.data.properties.find(p => p.id === activity.property_id);
                return `
                    <div class="activity-item">
                        <span class="activity-icon">🔧</span>
                        <div>
                            <p><strong>Maintenance Request</strong></p>
                            <p>${activity.issue || activity.description || 'Maintenance issue'}</p>
                            <small>${activity.date || activity.created_at || 'N/A'} - ${activity.status || 'Open'}</small>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }
    
    // Property management
    async addProperty(property) {
        property.created_at = new Date().toISOString().split('T')[0];
        const newProperty = await this.postData('properties', property);
        return newProperty.id;
    }
    
    async updateProperty(id, property) {
        return await this.putData('properties', id, property);
    }
    
    async deleteProperty(id) {
        // Check if property has active tenants
        const hasActiveTenants = this.data.tenants.some(t => 
            t.property_id === id && t.status === 'active'
        );
        
        if (hasActiveTenants) {
            alert('Cannot delete property with active tenants. Please remove tenants first.');
            return false;
        }
        
        return await this.deleteData('properties', id);
    }
    
    getProperties() {
        return this.data.properties;
    }
    
    // Tenant management
    async addTenant(tenant) {
        tenant.created_at = new Date().toISOString().split('T')[0];
        tenant.status = tenant.status || 'active';
        const newTenant = await this.postData('tenants', tenant);
        
        // Update property status if tenant is active
        if (tenant.status === 'active' && tenant.property_id) {
            const property = this.data.properties.find(p => p.id === tenant.property_id);
            if (property) {
                property.status = 'occupied';
                await this.updateProperty(property.id, property);
            }
        }
        
        return newTenant.id;
    }
    
    async updateTenant(id, tenant) {
        return await this.putData('tenants', id, tenant);
    }
    
    // Payment management
    async addPayment(payment) {
        payment.receipt_number = this.generateReceiptNumber();
        payment.created_at = new Date().toISOString();
        const newPayment = await this.postData('payments', payment);
        return newPayment.id;
    }
    
    // Maintenance management
    async addMaintenance(request) {
        request.created_at = new Date().toISOString();
        request.status = request.status || 'open';
        const newRequest = await this.postData('maintenance', request);
        return newRequest.id;
    }
    
    // Event listeners setup
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                if (await this.login(username, password)) {
                    window.location.href = 'roof4u.html';
                } else {
                    alert('Invalid credentials! Try admin/admin123');
                }
            });
        }
        
        // Demo login
        const demoLogin = document.getElementById('demoLogin');
        if (demoLogin) {
            demoLogin.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = 'admin123';
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Property form (houses.html)
        const propertyForm = document.getElementById('propertyForm');
        if (propertyForm) {
            propertyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddProperty();
            });
        }
        
        // Export properties button
        const exportBtn = document.getElementById('exportPropertiesBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProperties());
        }
    }
    
    setupEnhancedEventListeners() {
        // Tenant Property Change Event
        const tenantProperty = document.getElementById('tenantProperty');
        if (tenantProperty) {
            tenantProperty.addEventListener('change', (e) => {
                const propertyId = parseInt(e.target.value);
                if (propertyId) {
                    const property = this.data.properties.find(p => p.id === propertyId);
                    if (property) {
                        const rentField = document.getElementById('tenantRent');
                        const depositField = document.getElementById('securityDeposit');
                        if (rentField) rentField.value = property.rent_amount;
                        if (depositField) depositField.value = property.rent_amount;
                    }
                }
            });
        }
        
        // Payment Tenant Change Event
        const paymentTenant = document.getElementById('paymentTenant');
        if (paymentTenant) {
            paymentTenant.addEventListener('change', (e) => {
                const tenantId = parseInt(e.target.value);
                if (tenantId) {
                    const tenant = this.data.tenants.find(t => t.id === tenantId);
                    if (tenant) {
                        const propertyField = document.getElementById('paymentProperty');
                        const amountField = document.getElementById('paymentAmount');
                        if (propertyField) propertyField.value = tenant.property_id;
                        if (amountField) amountField.value = tenant.rent_amount;
                    }
                }
            });
        }
        
        // Emergency Ticket Button
        const emergencyTicketBtn = document.getElementById('emergencyTicket');
        if (emergencyTicketBtn) {
            emergencyTicketBtn.addEventListener('click', () => {
                const priorityField = document.getElementById('issuePriority');
                if (priorityField) priorityField.value = 'emergency';
                document.getElementById('maintenanceForm').dispatchEvent(new Event('submit'));
            });
        }
    }
    
    // Update user display
    updateUserDisplay() {
        const userElement = document.getElementById('currentUser');
        if (userElement && this.currentUser) {
            userElement.textContent = this.currentUser.name || this.currentUser.username;
        }
    }
    
    // Form handlers
    async handleAddProperty() {
        const property = {
            address: document.getElementById('address')?.value || '',
            city: document.getElementById('city')?.value || '',
            state: document.getElementById('state')?.value || '',
            zip: document.getElementById('zip')?.value || '',
            type: document.getElementById('propertyType')?.value || 'apartment',
            bedrooms: parseInt(document.getElementById('bedrooms')?.value) || 0,
            bathrooms: parseFloat(document.getElementById('bathrooms')?.value) || 0,
            square_feet: parseInt(document.getElementById('squareFeet')?.value) || 0,
            rent_amount: parseFloat(document.getElementById('rentAmount')?.value) || 0,
            status: document.getElementById('status')?.value || 'available',
            description: document.getElementById('description')?.value || ''
        };
        
        const id = await this.addProperty(property);
        alert(`Property added successfully! ID: ${id}`);
        
        // Refresh the page data
        await this.fetchData('properties');
        await this.initializeHousesPage();
        
        const form = document.getElementById('propertyForm');
        if (form) form.reset();
        document.getElementById('propertyModal').style.display = 'none';
    }
    
    async handleAddTenant() {
        const tenant = {
            property_id: parseInt(document.getElementById('property_id')?.value) || null,
            name: document.getElementById('name')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            lease_start: document.getElementById('lease_start')?.value || '',
            lease_end: document.getElementById('lease_end')?.value || '',
            rent_amount: parseFloat(document.getElementById('rent_amount')?.value) || 0,
            security_deposit: parseFloat(document.getElementById('security_deposit')?.value) || 0,
            status: 'active'
        };
        
        const id = await this.addTenant(tenant);
        alert(`Tenant added successfully! ID: ${id}`);
        
        // Refresh data
        await this.fetchData('tenants');
        await this.fetchData('properties');
        
        const form = document.getElementById('tenantForm');
        if (form) form.reset();
    }
    
    async handleAddPayment() {
        const payment = {
            tenant_id: parseInt(document.getElementById('tenant_id')?.value) || 0,
            property_id: parseInt(document.getElementById('property_id')?.value) || 0,
            amount: parseFloat(document.getElementById('amount')?.value) || 0,
            date: document.getElementById('date')?.value || new Date().toISOString().split('T')[0],
            method: document.getElementById('method')?.value || 'cash',
            status: document.getElementById('status')?.value || 'paid',
            description: document.getElementById('description')?.value || ''
        };
        
        const id = await this.addPayment(payment);
        alert(`Payment recorded successfully! ID: ${id}`);
        
        // Refresh data
        await this.fetchData('payments');
        
        const form = document.getElementById('paymentForm');
        if (form) form.reset();
    }
    
    async handleAddMaintenance() {
        const request = {
            property_id: parseInt(document.getElementById('property_id')?.value) || 0,
            tenant_id: parseInt(document.getElementById('tenant_id')?.value) || null,
            date: document.getElementById('date')?.value || new Date().toISOString().split('T')[0],
            issue: document.getElementById('issue')?.value || '',
            priority: document.getElementById('priority')?.value || 'medium',
            status: 'open',
            notes: document.getElementById('notes')?.value || ''
        };
        
        const id = await this.addMaintenance(request);
        alert(`Maintenance request created successfully! ID: ${id}`);
        
        // Refresh data
        await this.fetchData('maintenance');
        
        const form = document.getElementById('maintenanceForm');
        if (form) form.reset();
    }
    
    // Rent Management Methods
    async updateRentStats() {
        if (!document.getElementById('totalTenants')) return;
        
        const activeTenants = this.data.tenants.filter(t => t.status === 'active').length;
        const totalProperties = this.data.properties.length;
        const occupiedProperties = this.data.properties.filter(p => p.status === 'occupied').length;
        
        // Calculate leases expiring in next 30 days
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setDate(today.getDate() + 30);
        
        const expiringLeases = this.data.tenants.filter(tenant => {
            if (!tenant.lease_end) return false;
            const leaseEnd = new Date(tenant.lease_end);
            return leaseEnd >= today && leaseEnd <= nextMonth;
        }).length;
        
        const elements = {
            totalTenants: activeTenants,
            activeLeases: activeTenants,
            expiringLeases: expiringLeases,
            vacancyRate: totalProperties > 0 ? Math.round(((totalProperties - occupiedProperties) / totalProperties) * 100) + '%' : '0%'
        };
        
        Object.keys(elements).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.textContent = elements[key];
        });
    }
    
    populatePropertyDropdowns() {
        const propertySelectors = [
            'tenantProperty', 'paymentProperty', 'maintenanceProperty', 
            'filterProperty', 'property_id'
        ];
        
        propertySelectors.forEach(selector => {
            const element = document.getElementById(selector);
            if (element) {
                element.innerHTML = '<option value="">Select Property</option>' +
                    this.data.properties.map(property => 
                        `<option value="${property.id}">${property.address} - ${property.type}</option>`
                    ).join('');
            }
        });
    }
    
    populateTenantDropdowns() {
        const tenantSelectors = ['paymentTenant', 'maintenanceTenant', 'filterTenant', 'tenant_id'];
        
        tenantSelectors.forEach(selector => {
            const element = document.getElementById(selector);
            if (element) {
                element.innerHTML = '<option value="">Select Tenant</option>' +
                    this.data.tenants.filter(t => t.status === 'active').map(tenant => 
                        `<option value="${tenant.id}" data-property="${tenant.property_id || ''}">
                            ${tenant.name} - ${this.getPropertyAddress(tenant.property_id)}
                        </option>`
                    ).join('');
            }
        });
    }
    
    getPropertyAddress(propertyId) {
        if (!propertyId) return 'No Property';
        const property = this.data.properties.find(p => p.id === propertyId);
        return property ? `${property.address}, ${property.city}` : 'Unknown Property';
    }
    
    // Payment Management Methods
    updatePaymentStats() {
        if (!document.getElementById('totalCollected')) return;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyPayments = this.data.payments.filter(payment => {
            if (!payment.date) return false;
            const paymentDate = new Date(payment.date);
            return paymentDate.getMonth() === currentMonth && 
                   paymentDate.getFullYear() === currentYear &&
                   payment.status === 'paid';
        });
        
        const totalCollected = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const pendingPayments = this.data.payments.filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        const latePayments = this.data.payments.filter(p => p.status === 'late')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        const totalDue = this.data.tenants.reduce((sum, t) => sum + (t.rent_amount || 0), 0);
        const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;
        
        const elements = {
            totalCollected: '$' + totalCollected.toLocaleString(),
            pendingPayments: '$' + pendingPayments.toLocaleString(),
            latePayments: '$' + latePayments.toLocaleString(),
            collectionRate: collectionRate + '%'
        };
        
        Object.keys(elements).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.textContent = elements[key];
        });
    }
    
    generateReceiptNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `RCT-${timestamp}-${random}`;
    }
    
    // Maintenance Management Methods
    updateMaintenanceStats() {
        if (!document.getElementById('openTickets')) return;
        
        const openTickets = this.data.maintenance.filter(m => 
            ['open', 'in_progress', 'pending_review'].includes(m.status)
        ).length;
        
        const urgentTickets = this.data.maintenance.filter(m => 
            m.priority === 'emergency' && m.status !== 'resolved' && m.status !== 'closed'
        ).length;
        
        const resolvedTickets = this.data.maintenance.filter(m => 
            m.status === 'resolved' || m.status === 'closed'
        );
        
        let avgResolutionTime = 0;
        if (resolvedTickets.length > 0) {
            avgResolutionTime = resolvedTickets.reduce((sum, t) => {
                const reported = new Date(t.date || t.created_at);
                const resolved = new Date(t.completed_date || t.updated_at || t.date || t.created_at);
                return sum + Math.ceil(Math.abs((resolved - reported)) / (1000 * 60 * 60 * 24));
            }, 0) / resolvedTickets.length;
        }
        
        const thisMonth = new Date().getMonth();
        const monthlyCost = this.data.maintenance
            .filter(m => {
                if (!m.date) return false;
                const ticketDate = new Date(m.date);
                return ticketDate.getMonth() === thisMonth;
            })
            .reduce((sum, m) => sum + (m.actual_cost || m.estimated_cost || 0), 0);
        
        const elements = {
            openTickets: openTickets,
            urgentTickets: urgentTickets,
            avgResolutionTime: Math.round(avgResolutionTime) + 'd',
            maintenanceCost: '$' + monthlyCost.toLocaleString()
        };
        
        Object.keys(elements).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.textContent = elements[key];
        });
    }
    
    // Houses/Properties Page Functions
    async initializeHousesPage() {
        if (window.location.pathname.includes('houses.html')) {
            this.updatePropertyStats();
            await this.renderPropertiesGrid();
            await this.renderPropertiesTable();
            this.setupPropertyEventListeners();
            this.setupPropertyModal();
            this.updateUpcomingVacancies();
        }
    }
    
    updatePropertyStats() {
        const totalProperties = this.data.properties.length;
        const occupiedProperties = this.data.properties.filter(p => p.status === 'occupied').length;
        const availableProperties = this.data.properties.filter(p => p.status === 'available').length;
        const maintenanceProperties = this.data.properties.filter(p => p.status === 'maintenance').length;
        
        const monthlyRevenue = this.data.properties
            .filter(p => p.status === 'occupied')
            .reduce((sum, p) => sum + (p.rent_amount || 0), 0);
        
        const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;
        
        const elements = {
            totalProperties,
            occupiedProperties,
            availableProperties,
            maintenanceProperties,
            monthlyRevenue: `$${monthlyRevenue.toLocaleString()}`,
            occupancyRate: `${occupancyRate}%`
        };
        
        Object.keys(elements).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = elements[key];
            }
        });
    }
    
    async renderPropertiesGrid() {
        const gridContainer = document.getElementById('propertiesGridView');
        if (!gridContainer) return;
        
        if (this.data.properties.length === 0) {
            gridContainer.innerHTML = `
                <div class="no-properties">
                    <i class="fas fa-home" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>No Properties Found</h3>
                    <p>Click "Add New Property" to get started.</p>
                </div>
            `;
            return;
        }
        
        gridContainer.innerHTML = this.data.properties.map(property => {
            const tenant = this.data.tenants.find(t => 
                t.property_id === property.id && t.status === 'active'
            );
            
            const typeIcons = {
                apartment: 'fa-building',
                house: 'fa-home',
                condo: 'fa-hotel',
                townhouse: 'fa-city',
                duplex: 'fa-hotel',
                studio: 'fa-door-closed'
            };
            
            const icon = typeIcons[property.type] || 'fa-home';
            const statusClass = `status-${property.status || 'vacant'}`;
            const statusText = property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : 'Vacant';
            
            return `
                <div class="property-card" data-id="${property.id}">
                    <div class="property-image" style="background: linear-gradient(135deg, #3498db, #2980b9);">
                        <i class="fas ${icon}" style="font-size: 48px;"></i>
                        <span class="property-status ${statusClass}">
                            ${statusText}
                        </span>
                    </div>
                    <div class="property-content">
                        <div class="property-header">
                            <h3>${property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : 'Property'}</h3>
                            <div class="property-address">
                                <i class="fas fa-map-marker-alt"></i>
                                ${property.address || 'No Address'}, ${property.city || ''}
                            </div>
                        </div>
                        
                        <div class="property-details">
                            <div class="detail-item">
                                <div class="detail-value">${property.bedrooms || '0'}</div>
                                <div class="detail-label">Beds</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-value">${property.bathrooms || '0'}</div>
                                <div class="detail-label">Baths</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-value">${property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}</div>
                                <div class="detail-label">Sq Ft</div>
                            </div>
                        </div>
                        
                        <div class="property-footer">
                            <div class="property-rent">$${(property.rent_amount || 0).toLocaleString()}/mo</div>
                            <div class="property-actions">
                                <button class="action-btn view-btn" title="View Details" data-id="${property.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="action-btn edit-btn" title="Edit Property" data-id="${property.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async renderPropertiesTable() {
        const tableBody = document.getElementById('propertiesTableBody');
        if (!tableBody) return;
        
        if (this.data.properties.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No properties found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = this.data.properties.map(property => {
            const tenant = this.data.tenants.find(t => 
                t.property_id === property.id && t.status === 'active'
            );
            
            const statusColors = {
                occupied: 'success',
                available: 'primary',
                maintenance: 'warning',
                vacant: 'secondary'
            };
            
            const statusClass = statusColors[property.status] || 'secondary';
            
            return `
                <tr data-id="${property.id}">
                    <td>
                        <strong>${property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : 'Property'}</strong><br>
                        <small>ID: ${property.id}</small>
                    </td>
                    <td>
                        ${property.address || 'No Address'}<br>
                        <small>${property.city || ''}, ${property.state || ''} ${property.zip || ''}</small>
                    </td>
                    <td>
                        <span class="type-badge type-${property.type || 'house'}">
                            ${property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : 'House'}
                        </span>
                    </td>
                    <td>
                        <i class="fas fa-bed"></i> ${property.bedrooms || '0'} |
                        <i class="fas fa-bath"></i> ${property.bathrooms || '0'}
                    </td>
                    <td>${property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}</td>
                    <td><strong>$${(property.rent_amount || 0).toLocaleString()}</strong></td>
                    <td>
                        <span class="status-badge status-${statusClass}">
                            ${property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : 'Vacant'}
                        </span>
                    </td>
                    <td>
                        ${tenant ? tenant.name : '<em>No tenant</em>'}
                    </td>
                    <td>
                        <button class="btn-small btn-primary view-btn" data-id="${property.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-small btn-secondary edit-btn" data-id="${property.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-small btn-danger delete-btn" data-id="${property.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    setupPropertyEventListeners() {
        // Add Property Button
        const addPropertyBtn = document.getElementById('addPropertyBtn');
        if (addPropertyBtn) {
            addPropertyBtn.addEventListener('click', () => {
                this.openPropertyModal();
            });
        }
        
        // Quick Add Property
        const quickAddProperty = document.getElementById('quickAddProperty');
        if (quickAddProperty) {
            quickAddProperty.addEventListener('click', (e) => {
                e.preventDefault();
                this.openPropertyModal();
            });
        }
        
        // View Toggle Buttons
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        const gridView = document.getElementById('propertiesGridView');
        const listView = document.getElementById('propertiesListView');
        
        if (gridViewBtn && listViewBtn && gridView && listView) {
            gridViewBtn.addEventListener('click', () => {
                gridViewBtn.classList.add('active');
                listViewBtn.classList.remove('active');
                gridView.style.display = 'grid';
                listView.style.display = 'none';
            });
            
            listViewBtn.addEventListener('click', () => {
                listViewBtn.classList.add('active');
                gridViewBtn.classList.remove('active');
                listView.style.display = 'block';
                gridView.style.display = 'none';
            });
        }
        
        // Filter Buttons
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyPropertyFilters();
            });
        }
        
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetPropertyFilters();
            });
        }
        
        // Export properties button
        const exportBtn = document.getElementById('exportPropertiesBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProperties());
        }
        
        // Property card actions (delegated events)
        document.addEventListener('click', async (e) => {
            // View button
            if (e.target.closest('.view-btn')) {
                const button = e.target.closest('.view-btn');
                const propertyId = parseInt(button.getAttribute('data-id'));
                if (propertyId) {
                    await this.viewPropertyDetails(propertyId);
                }
            }
            
            // Edit button
            if (e.target.closest('.edit-btn')) {
                const button = e.target.closest('.edit-btn');
                const propertyId = parseInt(button.getAttribute('data-id'));
                if (propertyId) {
                    this.openPropertyModal(propertyId);
                }
            }
            
            // Delete button
            if (e.target.closest('.delete-btn')) {
                const button = e.target.closest('.delete-btn');
                const propertyId = parseInt(button.getAttribute('data-id'));
                if (propertyId && confirm('Are you sure you want to delete this property?')) {
                    await this.deleteProperty(propertyId);
                    await this.fetchData('properties');
                    await this.renderPropertiesGrid();
                    await this.renderPropertiesTable();
                    this.updatePropertyStats();
                    alert('Property deleted successfully!');
                }
            }
            
            // Property card click
            if (e.target.closest('.property-card')) {
                const card = e.target.closest('.property-card');
                if (!e.target.closest('.action-btn')) {
                    const propertyId = parseInt(card.getAttribute('data-id'));
                    if (propertyId) {
                        await this.viewPropertyDetails(propertyId);
                    }
                }
            }
        });
    }
    
    setupPropertyModal() {
        const modal = document.getElementById('propertyModal');
        if (!modal) return;
        
        const closeBtn = modal.querySelector('.modal-close');
        const prevTabBtn = document.getElementById('prevTab');
        const nextTabBtn = document.getElementById('nextTab');
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.form-tabs .tab-btn');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchPropertyTab(tabId);
            });
        });
        
        // Previous/Next tab buttons
        if (prevTabBtn) {
            prevTabBtn.addEventListener('click', () => {
                const currentTab = document.querySelector('.form-tabs .tab-btn.active');
                const tabs = Array.from(tabBtns);
                const currentIndex = tabs.indexOf(currentTab);
                
                if (currentIndex > 0) {
                    const prevTab = tabs[currentIndex - 1];
                    const tabId = prevTab.getAttribute('data-tab');
                    this.switchPropertyTab(tabId);
                }
            });
        }
        
        if (nextTabBtn) {
            nextTabBtn.addEventListener('click', () => {
                const currentTab = document.querySelector('.form-tabs .tab-btn.active');
                const tabs = Array.from(tabBtns);
                const currentIndex = tabs.indexOf(currentTab);
                
                if (currentIndex < tabs.length - 1) {
                    const nextTab = tabs[currentIndex + 1];
                    const tabId = nextTab.getAttribute('data-tab');
                    this.switchPropertyTab(tabId);
                }
            });
        }
        
        // Close modal
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Auto-calculate security deposit
        const rentAmountInput = document.getElementById('rentAmount');
        const securityDepositInput = document.getElementById('securityDeposit');
        
        if (rentAmountInput && securityDepositInput) {
            rentAmountInput.addEventListener('change', () => {
                if (!securityDepositInput.value) {
                    securityDepositInput.value = rentAmountInput.value;
                }
            });
        }
    }
    
    switchPropertyTab(tabId) {
        document.querySelectorAll('.form-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId + 'Tab') {
                content.classList.add('active');
            }
        });
    }
    
    openPropertyModal(propertyId = null) {
        const modal = document.getElementById('propertyModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('propertyForm');
        const propertyIdInput = document.getElementById('propertyId');
        
        if (!modal) return;
        
        // Reset form
        if (form) form.reset();
        
        if (propertyId) {
            // Edit mode
            if (modalTitle) modalTitle.textContent = 'Edit Property';
            if (propertyIdInput) propertyIdInput.value = propertyId;
            
            const property = this.data.properties.find(p => p.id === propertyId);
            if (property) {
                this.populatePropertyForm(property);
            }
        } else {
            // Add mode
            if (modalTitle) modalTitle.textContent = 'Add New Property';
            if (propertyIdInput) propertyIdInput.value = '';
            
            // Set default values
            const statusField = document.getElementById('status');
            if (statusField) statusField.value = 'available';
            
            const petsField = document.getElementById('petsAllowed');
            if (petsField) petsField.value = 'false';
            
            const furnishedField = document.getElementById('furnished');
            if (furnishedField) furnishedField.value = 'false';
            
            // Set today's date as available from
            const today = new Date().toISOString().split('T')[0];
            const availableFrom = document.getElementById('availableFrom');
            if (availableFrom) availableFrom.value = today;
        }
        
        // Reset to first tab
        this.switchPropertyTab('basic');
        
        // Show modal
        modal.style.display = 'block';
    }
    
    populatePropertyForm(property) {
        // Basic Info
        this.setFieldValue('address', property.address);
        this.setFieldValue('city', property.city);
        this.setFieldValue('state', property.state);
        this.setFieldValue('zip', property.zip);
        this.setFieldValue('propertyType', property.type);
        this.setFieldValue('status', property.status);
        
        // Property Details
        this.setFieldValue('bedrooms', property.bedrooms);
        this.setFieldValue('bathrooms', property.bathrooms);
        this.setFieldValue('squareFeet', property.square_feet);
        this.setFieldValue('yearBuilt', property.year_built);
        this.setFieldValue('petsAllowed', property.pets_allowed ? 'true' : 'false');
        this.setFieldValue('furnished', property.furnished ? 'true' : 'false');
        this.setFieldValue('description', property.description);
        this.setFieldValue('owner', property.owner);
        this.setFieldValue('ownerContact', property.owner_contact);
        
        // Financial
        this.setFieldValue('rentAmount', property.rent_amount);
        this.setFieldValue('securityDeposit', property.security_deposit);
        this.setFieldValue('petDeposit', property.pet_deposit);
        this.setFieldValue('availableFrom', property.available_from);
        this.setFieldValue('propertyManager', property.property_manager);
        
        // Notes
        this.setFieldValue('notes', property.notes);
    }
    
    setFieldValue(id, value) {
        const field = document.getElementById(id);
        if (field && value !== undefined && value !== null) {
            field.value = value;
        }
    }
    
    async viewPropertyDetails(propertyId) {
        const property = this.data.properties.find(p => p.id === propertyId);
        if (!property) return;
        
        const tenant = this.data.tenants.find(t => 
            t.property_id === propertyId && t.status === 'active'
        );
        
        const modal = document.getElementById('propertyDetailModal');
        const modalTitle = document.getElementById('detailTitle');
        const detailContainer = document.querySelector('.property-detail');
        
        if (!modal || !detailContainer) return;
        
        if (modalTitle) {
            modalTitle.textContent = `${property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : 'Property'} - ${property.address || 'No Address'}`;
        }
        
        const typeIcons = {
            apartment: 'fa-building',
            house: 'fa-home',
            condo: 'fa-hotel',
            townhouse: 'fa-city',
            duplex: 'fa-hotel',
            studio: 'fa-door-closed'
        };
        
        const icon = typeIcons[property.type] || 'fa-home';
        
        detailContainer.innerHTML = `
            <div class="detail-left">
                <div class="detail-section">
                    <h4><i class="fas ${icon}"></i> Property Information</h4>
                    <div class="detail-info">
                        <div class="info-item">
                            <div class="info-label">Property ID</div>
                            <div class="info-value">${property.id}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Type</div>
                            <div class="info-value">${property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value">
                                <span class="status-badge status-${property.status === 'occupied' ? 'success' : 
                                                               property.status === 'available' ? 'primary' : 
                                                               property.status === 'maintenance' ? 'warning' : 'secondary'}">
                                    ${property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : 'Vacant'}
                                </span>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Address</div>
                            <div class="info-value">${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zip || ''}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Year Built</div>
                            <div class="info-value">${property.year_built || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Square Feet</div>
                            <div class="info-value">${property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Bedrooms/Bathrooms</div>
                            <div class="info-value">
                                <i class="fas fa-bed"></i> ${property.bedrooms || '0'} |
                                <i class="fas fa-bath"></i> ${property.bathrooms || '0'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-star"></i> Amenities</h4>
                    <div class="amenities-list">
                        ${property.amenities && property.amenities.length > 0 ? 
                            property.amenities.map(amenity => 
                                `<span class="amenity-tag">${amenity.charAt(0).toUpperCase() + amenity.slice(1)}</span>`
                            ).join('') : 
                            '<em>No amenities listed</em>'
                        }
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-file-alt"></i> Description</h4>
                    <p>${property.description || 'No description available.'}</p>
                </div>
            </div>
            
            <div class="detail-right">
                <div class="detail-section">
                    <h4><i class="fas fa-dollar-sign"></i> Financial Information</h4>
                    <div class="detail-info">
                        <div class="info-item">
                            <div class="info-label">Monthly Rent</div>
                            <div class="info-value rent">$${(property.rent_amount || 0).toLocaleString()}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Security Deposit</div>
                            <div class="info-value">$${(property.security_deposit || 0).toLocaleString()}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Pet Deposit</div>
                            <div class="info-value">$${(property.pet_deposit || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-user-tie"></i> Ownership & Management</h4>
                    <div class="detail-info">
                        <div class="info-item">
                            <div class="info-label">Property Owner</div>
                            <div class="info-value">${property.owner || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Owner Contact</div>
                            <div class="info-value">${property.owner_contact || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Property Manager</div>
                            <div class="info-value">${property.property_manager || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                ${tenant ? `
                    <div class="tenant-info">
                        <h5><i class="fas fa-user"></i> Current Tenant</h5>
                        <div class="detail-info">
                            <div class="info-item">
                                <div class="info-label">Name</div>
                                <div class="info-value">${tenant.name}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Contact</div>
                                <div class="info-value">${tenant.phone || ''} | ${tenant.email || ''}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Lease Period</div>
                                <div class="info-value">${tenant.lease_start || ''} to ${tenant.lease_end || ''}</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                    <p>${property.notes || 'No additional notes.'}</p>
                </div>
            </div>
        `;
        
        // Setup modal buttons
        const editBtn = document.getElementById('editPropertyBtn');
        if (editBtn) {
            editBtn.onclick = () => {
                modal.style.display = 'none';
                setTimeout(() => this.openPropertyModal(propertyId), 300);
            };
        }
        
        const addTenantBtn = document.getElementById('addTenantBtn');
        if (addTenantBtn) {
            addTenantBtn.onclick = () => {
                modal.style.display = 'none';
                window.location.href = `rent.html?property=${propertyId}`;
            };
        }
        
        const createMaintenanceBtn = document.getElementById('createMaintenanceBtn');
        if (createMaintenanceBtn) {
            createMaintenanceBtn.onclick = () => {
                modal.style.display = 'none';
                window.location.href = `maintenance.html?property=${propertyId}`;
            };
        }
        
        // Show modal
        modal.style.display = 'block';
        
        // Setup close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
    }
    
    applyPropertyFilters() {
        const statusFilter = document.getElementById('filterStatus')?.value;
        const typeFilter = document.getElementById('filterType')?.value;
        const bedroomsFilter = document.getElementById('filterBedrooms')?.value;
        const cityFilter = document.getElementById('filterCity')?.value;
        
        let filteredProperties = this.data.properties;
        
        if (statusFilter) {
            filteredProperties = filteredProperties.filter(p => p.status === statusFilter);
        }
        
        if (typeFilter) {
            filteredProperties = filteredProperties.filter(p => p.type === typeFilter);
        }
        
        if (bedroomsFilter) {
            if (bedroomsFilter === '3') {
                filteredProperties = filteredProperties.filter(p => p.bedrooms >= 3);
            } else {
                filteredProperties = filteredProperties.filter(p => p.bedrooms === parseInt(bedroomsFilter));
            }
        }
        
        if (cityFilter) {
            filteredProperties = filteredProperties.filter(p => 
                p.city && p.city.toLowerCase().includes(cityFilter.toLowerCase())
            );
        }
        
        this.renderFilteredProperties(filteredProperties);
    }
    
    resetPropertyFilters() {
        const filters = ['filterStatus', 'filterType', 'filterBedrooms', 'filterCity'];
        filters.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        this.renderFilteredProperties(this.data.properties);
    }
    
    renderFilteredProperties(properties) {
        const gridContainer = document.getElementById('propertiesGridView');
        if (gridContainer) {
            if (properties.length === 0) {
                gridContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h3>No Properties Found</h3>
                        <p>Try adjusting your filters to find what you're looking for.</p>
                    </div>
                `;
            } else {
                const originalProperties = this.data.properties;
                this.data.properties = properties;
                this.renderPropertiesGrid();
                this.renderPropertiesTable();
                this.data.properties = originalProperties;
            }
        }
    }
    
    updateUpcomingVacancies() {
        const vacanciesContainer = document.getElementById('upcomingVacancies');
        if (!vacanciesContainer) return;
        
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setDate(today.getDate() + 30);
        
        const upcomingVacancies = this.data.tenants
            .filter(tenant => {
                if (tenant.status !== 'active' || !tenant.lease_end) return false;
                const leaseEnd = new Date(tenant.lease_end);
                return leaseEnd >= today && leaseEnd <= nextMonth;
            })
            .sort((a, b) => new Date(a.lease_end) - new Date(b.lease_end))
            .slice(0, 5);
        
        if (upcomingVacancies.length === 0) {
            vacanciesContainer.innerHTML = `
                <div class="no-vacancies">
                    <i class="fas fa-calendar-check"></i>
                    <p>No upcoming vacancies in the next 30 days.</p>
                </div>
            `;
            return;
        }
        
        vacanciesContainer.innerHTML = upcomingVacancies.map(tenant => {
            const property = this.data.properties.find(p => p.id === tenant.property_id);
            const daysUntil = Math.ceil((new Date(tenant.lease_end) - today) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="vacancy-item">
                    <div class="vacancy-info">
                        <h4>${property ? property.address : 'Unknown Property'}</h4>
                        <p>Tenant: ${tenant.name}</p>
                        <p class="vacancy-date">Vacant on: ${tenant.lease_end} (in ${daysUntil} days)</p>
                    </div>
                    <div class="vacancy-actions">
                        <button class="btn-small btn-primary" onclick="roof4u.renewLeasePrompt(${tenant.id})">
                            Renew Lease
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async renewLeasePrompt(tenantId) {
        const tenant = this.data.tenants.find(t => t.id === tenantId);
        if (!tenant) return;
        
        const newEndDate = prompt('Enter new lease end date (YYYY-MM-DD):', 
            new Date(new Date(tenant.lease_end).setFullYear(new Date(tenant.lease_end).getFullYear() + 1))
                .toISOString().split('T')[0]
        );
        
        if (newEndDate) {
            tenant.lease_end = newEndDate;
            await this.updateTenant(tenant.id, tenant);
            this.updateUpcomingVacancies();
            alert('Lease renewed successfully!');
        }
    }
    
    exportProperties() {
        const headers = ['ID', 'Address', 'City', 'State', 'Type', 'Bedrooms', 'Bathrooms', 'Rent', 'Status', 'Tenant'];
        
        const csvContent = [
            headers.join(','),
            ...this.data.properties.map(property => {
                const tenant = this.data.tenants.find(t => 
                    t.property_id === property.id && t.status === 'active'
                );
                
                return [
                    property.id,
                    `"${property.address || ''}"`,
                    property.city || '',
                    property.state || '',
                    property.type || '',
                    property.bedrooms || '',
                    property.bathrooms || '',
                    property.rent_amount || '',
                    property.status || '',
                    tenant ? `"${tenant.name}"` : ''
                ].join(',');
            })
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `properties_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }
    
    // Footer methods
    updateFooterDate() {
        const currentDate = document.getElementById('currentDate');
        if (currentDate) {
            const now = new Date();
            currentDate.textContent = now.toLocaleDateString();
        }
    }
    
    updateFooterStatsText() {
        const footerStats = document.getElementById('footerStats');
        if (footerStats) {
            const totalProperties = this.data.properties.length;
            const activeTenants = this.data.tenants.filter(t => t.status === 'active').length;
            footerStats.textContent = `${totalProperties} properties, ${activeTenants} tenants`;
        }
    }
    
    // Placeholder methods for missing implementations
    async renderTenantsTable() {
        console.log('Rendering tenants table');
    }
    
    updateLeaseExpirations() {
        console.log('Updating lease expirations');
    }
    
    async renderPaymentsTable() {
        console.log('Rendering payments table');
    }
    
    initializeRevenueChart() {
        console.log('Initializing revenue chart');
    }
    
    async renderMaintenanceTable() {
        console.log('Rendering maintenance table');
    }
    
    updatePriorityTickets() {
        console.log('Updating priority tickets');
    }
    
    initializeMaintenanceCalendar() {
        console.log('Initializing maintenance calendar');
    }
    
    async renderPaymentsTable(filteredPayments) {
        console.log('Rendering payments table with filters');
    }
    
    updatePendingPayments() {
        console.log('Updating pending payments');
    }
    
    updateLatePayments() {
        console.log('Updating late payments');
    }
    
    updateUpcomingPayments() {
        console.log('Updating upcoming payments');
    }

    // Render properties grid view WITH IMAGES
async renderPropertiesGrid() {
    const gridContainer = document.getElementById('propertiesGridView');
    if (!gridContainer) return;
    
    if (this.data.properties.length === 0) {
        gridContainer.innerHTML = `
            <div class="no-properties">
                <i class="fas fa-home" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Properties Found</h3>
                <p>Click "Add New Property" to get started.</p>
            </div>
        `;
        return;
    }
    
    gridContainer.innerHTML = this.data.properties.map(property => {
        const tenant = this.data.tenants.find(t => 
            t.property_id === property.id && t.status === 'active'
        );
        
        // Get property type icon (fallback if no image)
        const typeIcons = {
            apartment: 'fa-building',
            house: 'fa-home',
            condo: 'fa-hotel',
            townhouse: 'fa-city',
            duplex: 'fa-hotel',
            studio: 'fa-door-closed'
        };
        
        const icon = typeIcons[property.type?.toLowerCase()] || 'fa-home';
        
        // Get the first image from the images array or use placeholder
        const propertyImage = property.images && property.images.length > 0 
            ? property.images[0] 
            : null;
        
        const statusClass = `status-${property.status || 'vacant'}`;
        const statusText = property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : 'Vacant';
        
        return `
            <div class="property-card" data-id="${property.id}">
                <div class="property-image" style="background: ${propertyImage ? `url('${propertyImage}')` : 'linear-gradient(135deg, #3498db, #2980b9)'}; background-size: cover; background-position: center; position: relative;">
                    ${!propertyImage ? `<i class="fas ${icon}" style="font-size: 48px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);"></i>` : ''}
                    <span class="property-status ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <div class="property-content">
                    <div class="property-header">
                        <h3>${property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : 'Property'}</h3>
                        <div class="property-address">
                            <i class="fas fa-map-marker-alt"></i>
                            ${property.address || 'No Address'}, ${property.city || ''}
                        </div>
                    </div>
                    
                    <div class="property-details">
                        <div class="detail-item">
                            <div class="detail-value">${property.bedrooms || '0'}</div>
                            <div class="detail-label">Beds</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-value">${property.bathrooms || '0'}</div>
                            <div class="detail-label">Baths</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-value">${property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}</div>
                            <div class="detail-label">Sq Ft</div>
                        </div>
                    </div>
                    
                    <div class="property-footer">
                        <div class="property-rent">$${(property.rent_amount || 0).toLocaleString()}/mo</div>
                        <div class="property-actions">
                            <button class="action-btn view-btn" title="View Details" data-id="${property.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" title="Edit Property" data-id="${property.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

    // ===== RENTAL BOOKING FUNCTIONS (SHORT & SIMPLE) =====

// Initialize rentals page
async initRentalsPage() {
    if (!window.location.pathname.includes('rent.html')) return;
    await this.loadAvailableRentals();
    this.setupRentalEvents();
}

// Load available properties
async loadAvailableRentals() {
    const grid = document.getElementById('rentalsGrid');
    if (!grid) return;
    
    // Get available properties
    const available = this.data.properties.filter(p => 
        p.status === 'available' || p.status === 'vacant'
    );
    
    // Update count
    const countEl = document.getElementById('propertyCount');
    if (countEl) countEl.textContent = `${available.length} properties available`;
    
    if (available.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px;"><i class="fas fa-home" style="font-size:48px; color:#ccc;"></i><h3>No properties available</h3><p>Check back soon</p></div>';
        return;
    }
    
    // Render properties
    grid.innerHTML = available.map(p => {
        const img = p.images?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500';
        return `
        <div class="rental-card">
            <img src="${img}" alt="Property">
            <div class="rental-info">
                <h3 style="margin-bottom:5px;">${p.address || 'Property'}</h3>
                <p style="color:#7f8c8d; margin-bottom:10px;">${p.city || ''}, ${p.state || ''}</p>
                <div style="display:flex; gap:15px; margin-bottom:15px;">
                    <span><i class="fas fa-bed"></i> ${p.bedrooms || 0}</span>
                    <span><i class="fas fa-bath"></i> ${p.bathrooms || 0}</span>
                    <span><i class="fas fa-ruler"></i> ${p.square_feet || 0} sqft</span>
                </div>
                <div class="amenities">
                    ${p.pets_allowed ? '<span class="amenity-tag"><i class="fas fa-paw"></i> Pets OK</span>' : ''}
                    ${p.furnished ? '<span class="amenity-tag"><i class="fas fa-couch"></i> Furnished</span>' : ''}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                    <span class="price">$${p.rent_amount?.toLocaleString() || 0}/mo</span>
                    <button class="btn-rent" onclick="roof4u.openRentalApplication(${p.id})">
                        Apply Now <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Setup search
    document.getElementById('searchRentals')?.addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        const filtered = available.filter(p => 
            p.city?.toLowerCase().includes(search) ||
            p.address?.toLowerCase().includes(search) ||
            p.zip?.toLowerCase().includes(search)
        );
        this.filterRentals(filtered);
    });
}

// Filter rentals
filterRentals(properties) {
    const grid = document.getElementById('rentalsGrid');
    if (!grid) return;
    
    if (properties.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px;"><h3>No matching properties</h3><p>Try different search terms</p></div>';
        return;
    }
    
    grid.innerHTML = properties.map(p => {
        const img = p.images?.[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500';
        return `
        <div class="rental-card">
            <img src="${img}" alt="Property">
            <div class="rental-info">
                <h3>${p.address || 'Property'}</h3>
                <p style="color:#7f8c8d;">${p.city || ''}</p>
                <div style="display:flex; gap:15px; margin:10px 0;">
                    <span>${p.bedrooms || 0} bed</span>
                    <span>${p.bathrooms || 0} bath</span>
                    <span>${p.square_feet || 0} sqft</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="price">$${p.rent_amount?.toLocaleString() || 0}/mo</span>
                    <button class="btn-rent" onclick="roof4u.openRentalApplication(${p.id})">
                        Apply Now
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Open rental application
openRentalApplication(propertyId) {
    const property = this.data.properties.find(p => p.id === propertyId);
    if (!property) return;
    
    const modal = document.getElementById('rentModal');
    const selectedDiv = document.getElementById('selectedProperty');
    
    selectedDiv.innerHTML = `
        <strong style="font-size:1.2em;">${property.address}, ${property.city}</strong><br>
        <span style="color:#27ae60; font-size:1.3em; font-weight:bold;">$${property.rent_amount}/month</span>
        <p style="margin-top:10px;">${property.bedrooms||0} beds, ${property.bathrooms||0} baths, ${property.square_feet||0} sqft</p>
    `;
    
    document.getElementById('propertyId').value = propertyId;
    modal.style.display = 'block';
}

// Submit rental application
async submitRentalApplication(formData) {
    // Create application
    const application = {
        id: Date.now(),
        property_id: parseInt(formData.propertyId),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        employment: formData.employment,
        income: parseFloat(formData.income),
        move_in_date: formData.moveInDate,
        status: 'pending',
        applied_date: new Date().toISOString().split('T')[0]
    };
    
    // Save to localStorage
    const apps = JSON.parse(localStorage.getItem('roof4u_applications') || '[]');
    apps.push(application);
    localStorage.setItem('roof4u_applications', JSON.stringify(apps));
    
    // Create prospective tenant
    await this.addTenant({
        property_id: formData.propertyId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: 'prospective',
        annual_income: parseFloat(formData.income),
        lease_start: formData.moveInDate,
        notes: `Applied on ${application.applied_date}`,
        rent_amount: 0
    });
    
    return application.id;
}

// Setup events
setupRentalEvents() {
    const form = document.getElementById('rentalApplicationForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                propertyId: document.getElementById('propertyId').value,
                name: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                employment: document.getElementById('employment').value,
                income: document.getElementById('income').value,
                moveInDate: document.getElementById('moveInDate').value
            };
            
            await this.submitRentalApplication(formData);
            
            // Close rental modal
            document.getElementById('rentModal').style.display = 'none';
            
            // Show success
            const successModal = document.getElementById('successModal');
            successModal.style.display = 'block';
            setTimeout(() => successModal.style.display = 'none', 3000);
            
            form.reset();
            
            // Reset move-in date
            const moveDate = new Date();
            moveDate.setDate(moveDate.getDate() + 14);
            document.getElementById('moveInDate').value = moveDate.toISOString().split('T')[0];
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        const rentModal = document.getElementById('rentModal');
        const successModal = document.getElementById('successModal');
        if (e.target === rentModal) rentModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
    });
}

// Add to your init() method
init() {
    // ... existing init code ...
    
    // Initialize rentals page
    if (window.location.pathname.includes('rent.html')) {
        this.initRentalsPage();
    }
}
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.roof4u = new Roof4U();
});