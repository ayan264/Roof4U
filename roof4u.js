class Roof4U {
    constructor() {
        this.API_URL = 'http://localhost:3000';
        this.currentUser = null;
        this.data = { properties: [], tenants: [], payments: [], maintenance: [], users: [] };
        this.init();
    }

    async init() {
        await this.checkServer();
        this.setupEvents();
        await this.loadData();
        await this.checkAuth();
    }

    async checkServer() {
        try {
            await fetch(`${this.API_URL}/properties`);
            console.log('✅ Server connected');
        } catch {
            alert('❌ Run: json-server --watch roof4u.json --port 3000');
        }
    }

    async loadData() {
        const endpoints = ['properties', 'tenants', 'payments', 'maintenance', 'users'];
        for (let e of endpoints) {
            let res = await fetch(`${this.API_URL}/${e}`);
            this.data[e] = await res.json();
        }
        this.route();
    }

    route() {
        let p = window.location.pathname;
        if (p.includes('houses')) this.initHouses();
        if (p.includes('tenants')) this.renderTenants();
        if (p.includes('payments')) this.renderPayments();
        if (p.includes('maintenance')) this.renderMaintenance();
        if (p.includes('rent')) this.loadRentals();
        if (p.includes('roof4u')) this.loadDashboard();
    }

    // ========== HOUSES - FULL CRUD ==========
    async initHouses() {
        this.updateStats();
        await this.renderGrid();
        this.setupHouseEvents();
    }

    updateStats() {
        let p = this.data.properties;
        document.getElementById('totalProperties') && (document.getElementById('totalProperties').innerText = p.length);
        document.getElementById('availableProperties') && (document.getElementById('availableProperties').innerText = p.filter(p => p.status === 'available').length);
        document.getElementById('occupiedProperties') && (document.getElementById('occupiedProperties').innerText = p.filter(p => p.status === 'occupied').length);
    }

    async renderGrid() {
        let grid = document.getElementById('propertiesGridView');
        if (!grid) return;
        
        let images = {
            1: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
            2: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
            3: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            4: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
            5: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            6: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
            7: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
            8: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800'
        };
        let defaultImg = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800';
        
        grid.innerHTML = this.data.properties.map(p => {
            let img = p.images?.[0] || images[p.id] || defaultImg;
            let colors = { available: '#27ae60', occupied: '#3498db', maintenance: '#f39c12', vacant: '#95a5a6' };
            return `
            <div class="property-card" data-id="${p.id}" style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1); cursor:pointer;">
                <div style="height:200px; position:relative;">
                    <img src="${img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${defaultImg}'">
                    <span style="position:absolute; top:10px; right:10px; background:${colors[p.status]||'#95a5a6'}; color:white; padding:5px 15px; border-radius:20px; font-size:12px;">${p.status||'Vacant'}</span>
                </div>
                <div style="padding:20px;">
                    <h3 style="margin:0 0 5px;">${p.address||'Property'}</h3>
                    <p style="color:#666; margin-bottom:15px;"><i class="fas fa-map-marker-alt"></i> ${p.city||''}</p>
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <span><strong>${p.bedrooms||0}</strong> beds</span>
                        <span><strong>${p.bathrooms||0}</strong> baths</span>
                        <span><strong>${p.square_feet||0}</strong> sqft</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:1.4em; font-weight:bold; color:#27ae60;">$${p.rent_amount}/mo</span>
                        <div>
                            <button class="edit-btn" data-id="${p.id}" style="padding:8px 12px; background:#f39c12; color:white; border:none; border-radius:5px; margin-right:5px;" onclick="event.stopPropagation(); roof4u.openEditProperty(${p.id})">Edit</button>
                            <button class="delete-btn" data-id="${p.id}" style="padding:8px 12px; background:#e74c3c; color:white; border:none; border-radius:5px;" onclick="event.stopPropagation(); roof4u.deleteProperty(${p.id})">Delete</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    async createProperty(data) {
        let res = await fetch(`${this.API_URL}/properties`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, created_at: new Date().toISOString().split('T')[0] })
        });
        this.data.properties.push(await res.json());
        this.renderGrid();
        alert('✅ Property added');
    }

    async updateProperty(id, data) {
        await fetch(`${this.API_URL}/properties/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await this.loadData();
        this.renderGrid();
        alert('✅ Property updated');
    }

    async deleteProperty(id) {
        if (this.data.tenants.some(t => t.property_id === id && t.status === 'active')) {
            alert('❌ Cannot delete - has active tenant');
            return;
        }
        if (confirm('Delete this property?')) {
            await fetch(`${this.API_URL}/properties/${id}`, { method: 'DELETE' });
            this.data.properties = this.data.properties.filter(p => p.id !== id);
            this.renderGrid();
            this.updateStats();
            alert('✅ Property deleted');
        }
    }

    // ========== TENANTS - FULL CRUD ==========
    async renderTenants() {
        let tbody = document.getElementById('tenantsTableBody');
        if (!tbody) return;
        tbody.innerHTML = this.data.tenants.map(t => {
            let p = this.data.properties.find(p => p.id === t.property_id);
            return `<tr>
                <td><strong>${t.name||''}</strong></td>
                <td>${p ? `${p.address}, ${p.city}` : 'No property'}</td>
                <td>${t.email||''}<br><small>${t.phone||''}</small></td>
                <td>${t.lease_start||''} to ${t.lease_end||''}</td>
                <td>$${t.rent_amount||0}</td>
                <td><span style="background:${t.status==='active'?'#d4edda':t.status==='prospective'?'#fff3cd':'#e2e3e5'}; color:${t.status==='active'?'#155724':t.status==='prospective'?'#856404':'#383d41'}; padding:5px 10px; border-radius:15px;">${t.status||'Unknown'}</span></td>
                <td>
                    <button onclick="roof4u.editTenant(${t.id})" style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:5px;">Edit</button>
                    <button onclick="roof4u.deleteTenant(${t.id})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px;">Delete</button>
                </td>
            </tr>`;
        }).join('');
    }

    async createTenant(data) {
        data.status = 'active';
        data.created_at = new Date().toISOString().split('T')[0];
        let res = await fetch(`${this.API_URL}/tenants`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        let tenant = await res.json();
        this.data.tenants.push(tenant);
        if (data.property_id) {
            let p = this.data.properties.find(p => p.id === data.property_id);
            if (p) { p.status = 'occupied'; await this.updateProperty(p.id, p); }
        }
        this.renderTenants();
        alert('✅ Tenant added');
    }

    async deleteTenant(id) {
        let t = this.data.tenants.find(t => t.id === id);
        if (!t) return;
        if (this.data.payments.some(p => p.tenant_id === id && p.status === 'pending')) {
            alert('❌ Cannot delete - has pending payments');
            return;
        }
        if (confirm('Delete this tenant?')) {
            if (t.status === 'active' && t.property_id) {
                let p = this.data.properties.find(p => p.id === t.property_id);
                if (p && !this.data.tenants.some(t2 => t2.property_id === p.id && t2.id !== id && t2.status === 'active')) {
                    p.status = 'vacant';
                    await this.updateProperty(p.id, p);
                }
            }
            await fetch(`${this.API_URL}/tenants/${id}`, { method: 'DELETE' });
            this.data.tenants = this.data.tenants.filter(t => t.id !== id);
            this.renderTenants();
            alert('✅ Tenant deleted');
        }
    }

    // ========== PAYMENTS - FULL CRUD ==========
    async renderPayments() {
        let tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return;
        tbody.innerHTML = this.data.payments.sort((a,b) => new Date(b.date)-new Date(a.date)).map(p => {
            let t = this.data.tenants.find(t => t.id === p.tenant_id);
            let pr = this.data.properties.find(pr => pr.id === p.property_id);
            return `<tr>
                <td>${p.date||''}</td>
                <td>${t ? t.name : 'Unknown'}</td>
                <td>${pr ? pr.address : 'Unknown'}</td>
                <td><strong>$${p.amount||0}</strong></td>
                <td>${p.method||'N/A'}</td>
                <td><span style="background:${p.status==='paid'?'#d4edda':p.status==='pending'?'#fff3cd':'#f8d7da'}; color:${p.status==='paid'?'#155724':p.status==='pending'?'#856404':'#721c24'}; padding:5px 10px; border-radius:15px;">${p.status||'Unknown'}</span></td>
                <td>${p.receipt_number||'N/A'}</td>
                <td>
                    <button onclick="roof4u.editPayment(${p.id})" style="background:#f39c12; color:white; border:none; padding:5px 10px; border-radius:5px;">Edit</button>
                    <button onclick="roof4u.deletePayment(${p.id})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px;">Delete</button>
                </td>
            </tr>`;
        }).join('');
    }

    async createPayment(data) {
        data.receipt_number = `RCT-${Date.now()}`;
        data.created_at = new Date().toISOString();
        let res = await fetch(`${this.API_URL}/payments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        this.data.payments.push(await res.json());
        this.renderPayments();
        alert('✅ Payment recorded');
    }

    async deletePayment(id) {
        if (confirm('Delete this payment?')) {
            await fetch(`${this.API_URL}/payments/${id}`, { method: 'DELETE' });
            this.data.payments = this.data.payments.filter(p => p.id !== id);
            this.renderPayments();
            alert('✅ Payment deleted');
        }
    }

    // ========== RENTALS - BOOKING ==========
    async loadRentals() {
        let grid = document.getElementById('rentalsGrid');
        if (!grid) return;
        let available = this.data.properties.filter(p => p.status === 'available' || p.status === 'vacant');
        document.getElementById('propertyCount') && (document.getElementById('propertyCount').innerText = `${available.length} available`);
        
        let images = {
            1: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
            2: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
            3: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            4: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
            5: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
            6: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
            7: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
            8: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800'
        };
        let defaultImg = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800';
        
        grid.innerHTML = available.map(p => {
            let img = p.images?.[0] || images[p.id] || defaultImg;
            return `<div class="rental-card" style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <img src="${img}" style="width:100%; height:200px; object-fit:cover;" onerror="this.src='${defaultImg}'">
                <div style="padding:20px;">
                    <h3>${p.address||'Property'}</h3>
                    <p style="color:#666;"><i class="fas fa-map-marker-alt"></i> ${p.city||''}</p>
                    <div style="display:flex; gap:15px; margin:15px 0;">
                        <span><i class="fas fa-bed"></i> ${p.bedrooms||0} beds</span>
                        <span><i class="fas fa-bath"></i> ${p.bathrooms||0} baths</span>
                        <span><i class="fas fa-ruler"></i> ${p.square_feet||0} sqft</span>
                    </div>
                    <div style="font-size:1.8em; font-weight:bold; color:#27ae60; margin:15px 0;">$${p.rent_amount}/<span style="font-size:0.5em; color:#666;">month</span></div>
                    <button onclick="roof4u.openApplication(${p.id})" style="width:100%; padding:15px; background:#667eea; color:white; border:none; border-radius:8px; font-size:16px; cursor:pointer;">Apply Now</button>
                </div>
            </div>`;
        }).join('');
    }

    // ========== DASHBOARD ==========
    async loadDashboard() {
        this.updateDashboardStats();
        this.renderRecentActivities();
    }

    updateDashboardStats() {
        document.getElementById('totalProperties') && (document.getElementById('totalProperties').innerText = this.data.properties.length);
        document.getElementById('occupiedProperties') && (document.getElementById('occupiedProperties').innerText = this.data.properties.filter(p => p.status === 'occupied').length);
        document.getElementById('activeTenants') && (document.getElementById('activeTenants').innerText = this.data.tenants.filter(t => t.status === 'active').length);
        let revenue = this.data.payments.reduce((s,p) => s + (p.amount||0), 0);
        document.getElementById('totalRevenue') && (document.getElementById('totalRevenue').innerText = '$' + revenue.toLocaleString());
        document.getElementById('pendingMaintenance') && (document.getElementById('pendingMaintenance').innerText = this.data.maintenance.filter(m => ['open','in_progress'].includes(m.status)).length);
    }

    // ========== AUTH ==========
    async checkAuth() {
        let user = sessionStorage.getItem('roof4u_user');
        if (user) {
            this.currentUser = JSON.parse(user);
            let el = document.getElementById('currentUser');
            if (el) el.innerHTML = `<i class="fas fa-user-circle"></i> ${this.currentUser.name}`;
        }
    }

    async login(username, password) {
        let res = await fetch(`${this.API_URL}/users?username=${username}&password=${password}`);
        let users = await res.json();
        if (users.length) {
            this.currentUser = users[0];
            sessionStorage.setItem('roof4u_user', JSON.stringify(this.currentUser));
            return true;
        }
        return false;
    }

    logout() {
        sessionStorage.removeItem('roof4u_user');
        window.location.href = 'login.html';
    }

    // ========== EVENTS ==========
    setupEvents() {
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            let u = document.getElementById('username').value;
            let p = document.getElementById('password').value;
            if (await this.login(u, p)) window.location.href = 'roof4u.html';
            else alert('❌ Invalid credentials');
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('addPropertyBtn')?.addEventListener('click', () => this.openAddProperty());
    }

    openAddProperty() {
        let address = prompt('Enter property address:');
        if (!address) return;
        let city = prompt('Enter city:');
        let rent = prompt('Enter monthly rent:');
        this.createProperty({
            address, city, state: 'NY', zip: '10001',
            type: 'apartment', status: 'available',
            bedrooms: 2, bathrooms: 1, square_feet: 850,
            rent_amount: parseFloat(rent), description: '',
            images: []
        });
    }

    openEditProperty(id) {
        let p = this.data.properties.find(p => p.id === id);
        if (!p) return;
        let rent = prompt('Enter new rent amount:', p.rent_amount);
        if (rent) {
            p.rent_amount = parseFloat(rent);
            this.updateProperty(id, p);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.roof4u = new Roof4U();
});