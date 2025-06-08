// Aplicación Principal - VeterinaryProject
class VeterinaryApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'login';
        this.medicines = [];
        this.init();
    }

    // Inicializar la aplicación
    init() {
        console.log('🏥 Iniciando VeterinaryProject...');
        
        // Verificar si hay una sesión activa
        this.checkActiveSession();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar datos desde storage
        this.loadData();
        
        // Mostrar la sección correcta
        this.showSection(this.currentSection);
        
        console.log('✅ Aplicación iniciada correctamente');
    }

    // Verificar sesión activa
    checkActiveSession() {
        const savedUser = StorageManager.getUser();
        if (savedUser) {
            this.currentUser = savedUser;
            this.currentSection = 'dashboard';
            this.updateUI();
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Add medicine button
        const addMedBtn = document.getElementById('addMedBtn');
        if (addMedBtn) {
            addMedBtn.addEventListener('click', () => this.showAddMedicineModal());
        }

        // Medicine form
        const medicineForm = document.getElementById('medicineForm');
        if (medicineForm) {
            medicineForm.addEventListener('submit', (e) => this.handleMedicineSubmit(e));
        }

        // Search and filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterMedicines());
        }

        const filterType = document.getElementById('filterType');
        const filterStatus = document.getElementById('filterStatus');
        if (filterType) filterType.addEventListener('change', () => this.filterMedicines());
        if (filterStatus) filterStatus.addEventListener('change', () => this.filterMedicines());

        // Generate report button
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generateReport());
        }

        // Modal controls
        this.setupModalControls();
    }

    // Configurar controles de modal
    setupModalControls() {
        const modal = document.getElementById('medicineModal');
        const closeBtn = modal?.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Cerrar modal al hacer clic fuera
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    // Manejar login
    handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const role = formData.get('role');

        // Validación simple (en producción usar autenticación real)
        if (this.validateLogin(username, password, role)) {
            const user = {
                username,
                role,
                loginTime: new Date().toISOString()
            };

            this.currentUser = user;
            StorageManager.saveUser(user);
            
            this.showMessage('Inicio de sesión exitoso', 'success');
            this.updateUI();
            this.showSection('dashboard');
            this.loadDashboard();
        } else {
            this.showMessage('Credenciales incorrectas', 'error');
        }
    }

    // Validar login (simplificado)
    validateLogin(username, password, role) {
        // En un sistema real, esto se haría contra una base de datos
        const validUsers = {
            'admin': { password: 'admin123', role: 'admin' },
            'empleado': { password: 'emp123', role: 'employee' }
        };

        const user = validUsers[username];
        return user && user.password === password && user.role === role;
    }

    // Manejar logout
    handleLogout() {
        this.currentUser = null;
        StorageManager.clearUser();
        this.updateUI();
        this.showSection('login');
        this.showMessage('Sesión cerrada correctamente', 'success');
    }

    // Manejar navegación
    handleNavigation(e) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        if (href && href.startsWith('#')) {
            const section = href.substring(1);
            this.showSection(section);
        }
    }

    // Mostrar sección
    showSection(sectionName) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => section.classList.remove('active'));

        // Mostrar la sección solicitada
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
        }

        // Actualizar navegación activa
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
        const activeLink = document.querySelector(`[href="#${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Cargar datos específicos de la sección
        this.loadSectionData(sectionName);
    }

    // Cargar datos de sección específica
    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'alerts':
                this.loadAlerts();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    }

    // Actualizar UI según el usuario logueado
    updateUI() {
        const header = document.getElementById('header');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            header.style.display = 'block';
            if (userName) {
                userName.textContent = `${this.currentUser.username} (${this.currentUser.role === 'admin' ? 'Administrador' : 'Empleado'})`;
            }
            
            // Mostrar/ocultar funciones según el rol
            this.updateRolePermissions();
        } else {
            header.style.display = 'none';
        }
    }

    // Actualizar permisos según el rol
    updateRolePermissions() {
        const isAdmin = this.currentUser?.role === 'admin';
        
        // Ejemplo: solo admin puede agregar medicamentos
        const addMedBtn = document.getElementById('addMedBtn');
        if (addMedBtn) {
            addMedBtn.style.display = isAdmin ? 'block' : 'none';
        }

        // Ocultar acciones de edición/eliminación para empleados
        const actionBtns = document.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            if (!isAdmin && (btn.classList.contains('edit-btn') || btn.classList.contains('delete-btn'))) {
                btn.style.display = 'none';
            }
        });
    }

    // Cargar datos desde storage
    loadData() {
        this.medicines = StorageManager.getMedicines();
        
        // Si no hay datos, crear algunos de ejemplo
        if (this.medicines.length === 0) {
            this.createSampleData();
        }
    }

    // Crear datos de ejemplo
    createSampleData() {
    // Lista de proveedores
    const suppliers = [
        'Farmaceutica Veterinaria S.A.',
        'VetSupply Corp',
        'NutriVet Solutions',
        'FelineHealth Ltd',
        'Laboratorios Veterinarios Mexicanos',
        'Distribuidora Animal Health México',
        'Suministros Veterinarios del Norte',
        'Zoetis International',
        'Merck Animal Health',
        'Boehringer Ingelheim',
        'Elanco Animal Health',
        'Ceva Santé Animale',
        'Virbac Corporation',
        'Bayer Animal Health',
        'Exotic Animal Pharmaceuticals',
        'Marine Life Veterinary Supply',
        'Avian Health Solutions',
        'Reptile Medical Supply Co.',
        'Wildlife Rehabilitation Meds',
        'Zoo Animal Health Services'
    ];

    // Lista de tipos de animales (algunos para ejemplos)
    const animalTypes = [
        'perros', 'gatos', 'general', 'conejos', 'hamsters', 'aves-domesticas',
        'vacas', 'caballos', 'primates', 'felinos-grandes', 'aguila', 'peces-marinos',
        'cobayas', 'chinchillas', 'hurones', 'loros', 'tortugas', 'iguanas'
    ];

    const sampleMedicines = [
        {
            id: 1,
            code: 'MED001',
            name: 'Amoxicilina',
            quantity: 50,
            minStock: 10,
            dose: '250mg',
            animalType: animalTypes[Math.floor(Math.random() * animalTypes.length)], // ← CAMBIO AQUÍ
            expiryDate: '2025-12-31',
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)], // ← CAMBIO AQUÍ
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            code: 'MED002',
            name: 'Antihistamínico Felino',
            quantity: 5,
            minStock: 15,
            dose: '10mg',
            animalType: animalTypes[Math.floor(Math.random() * animalTypes.length)], // ← CAMBIO AQUÍ
            expiryDate: '2025-08-15',
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)], // ← CAMBIO AQUÍ
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            code: 'MED003',
            name: 'Vitaminas Multiespecies',
            quantity: 100,
            minStock: 20,
            dose: '5ml',
            animalType: animalTypes[Math.floor(Math.random() * animalTypes.length)], // ← CAMBIO AQUÍ
            expiryDate: '2024-06-30',
            supplier: suppliers[Math.floor(Math.random() * suppliers.length)], // ← CAMBIO AQUÍ
            createdAt: new Date().toISOString()
        }
    ];

    this.medicines = sampleMedicines;
    StorageManager.saveMedicines(this.medicines);
}
    // Cargar dashboard
    loadDashboard() {
        this.updateDashboardStats();
        this.loadRecentActivity();
    }

    // Actualizar estadísticas del dashboard
    updateDashboardStats() {
        const totalMeds = document.getElementById('totalMeds');
        const expiringSoon = document.getElementById('expiringSoon');
        const lowStock = document.getElementById('lowStock');
        const totalValue = document.getElementById('totalValue');

        if (totalMeds) totalMeds.textContent = this.medicines.length;
        
        // Medicamentos próximos a vencer (30 días)
        const expiring = this.medicines.filter(med => {
            const expiryDate = new Date(med.expiryDate);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return expiryDate <= thirtyDaysFromNow;
        });
        if (expiringSoon) expiringSoon.textContent = expiring.length;

        // Stock bajo
        const lowStockMeds = this.medicines.filter(med => med.quantity <= med.minStock);
        if (lowStock) lowStock.textContent = lowStockMeds.length;

        // Valor total (simplificado)
        const totalVal = this.medicines.reduce((sum, med) => sum + (med.quantity * 10), 0);
        if (totalValue) totalValue.textContent = `$${totalVal.toLocaleString()}`;
    }

    // Cargar actividad reciente
    loadRecentActivity() {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;

        // Actividad simulada
        const activities = [
            { action: 'Medicamento agregado', item: 'Amoxicilina', time: '2 horas ago' },
            { action: 'Stock actualizado', item: 'Antihistamínico Felino', time: '4 horas ago' },
            { action: 'Medicamento vencido', item: 'Vitaminas Multiespecies', time: '1 día ago' }
        ];

        recentActivity.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div>
                    <strong>${activity.action}:</strong> ${activity.item}
                </div>
                <div class="text-light">${activity.time}</div>
            </div>
        `).join('');
    }

    // Cargar inventario
    loadInventory() {
        this.renderMedicineTable();
    }

    // Renderizar tabla de medicamentos
    renderMedicineTable() {
        const tableBody = document.getElementById('medicineTableBody');
        if (!tableBody) return;

        let filteredMedicines = [...this.medicines];
        
        // Aplicar filtros
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filterType')?.value || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';

        if (searchTerm) {
            filteredMedicines = filteredMedicines.filter(med => 
                med.name.toLowerCase().includes(searchTerm) ||
                med.code.toLowerCase().includes(searchTerm)
            );
        }

        if (typeFilter) {
            filteredMedicines = filteredMedicines.filter(med => med.animalType === typeFilter);
        }

        if (statusFilter) {
            filteredMedicines = filteredMedicines.filter(med => {
                const status = this.getMedicineStatus(med);
                return status === statusFilter;
            });
        }

        tableBody.innerHTML = filteredMedicines.map(medicine => `
            <tr>
                <td>${medicine.code}</td>
                <td>${medicine.name}</td>
                <td>${medicine.quantity}</td>
                <td>${medicine.animalType}</td>
                <td>${this.formatDate(medicine.expiryDate)}</td>
                <td>${this.getStatusBadge(medicine)}</td>
                <td>
                    <button class="btn action-btn edit-btn" onclick="app.editMedicine(${medicine.id})">Editar</button>
                    <button class="btn action-btn delete-btn btn-danger" onclick="app.deleteMedicine(${medicine.id})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    }

    // Obtener estado del medicamento
    getMedicineStatus(medicine) {
        const now = new Date();
        const expiryDate = new Date(medicine.expiryDate);
        
        if (expiryDate < now) return 'expired';
        if (medicine.quantity <= medicine.minStock) return 'low';
        return 'available';
    }

    // Obtener badge de estado
    getStatusBadge(medicine) {
        const status = this.getMedicineStatus(medicine);
        const badges = {
            'available': '<span class="status-badge status-available">Disponible</span>',
            'low': '<span class="status-badge status-low">Stock Bajo</span>',
            'expired': '<span class="status-badge status-expired">Vencido</span>'
        };
        return badges[status] || badges['available'];
    }

    // Filtrar medicamentos
    filterMedicines() {
        this.renderMedicineTable();
    }

    // Mostrar modal para agregar medicamento
    showAddMedicineModal() {
        const modal = document.getElementById('medicineModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('medicineForm');
        
        if (modalTitle) modalTitle.textContent = 'Agregar Medicamento';
        if (form) form.reset();
        if (modal) modal.classList.add('active');
    }

    // Editar medicamento
    editMedicine(id) {
        const medicine = this.medicines.find(med => med.id === id);
        if (!medicine) return;

        const modal = document.getElementById('medicineModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (modalTitle) modalTitle.textContent = 'Editar Medicamento';
        
        // Llenar el formulario con los datos existentes
        document.getElementById('medCode').value = medicine.code;
        document.getElementById('medName').value = medicine.name;
        document.getElementById('medQuantity').value = medicine.quantity;
        document.getElementById('medMinStock').value = medicine.minStock;
        document.getElementById('medDose').value = medicine.dose;
        document.getElementById('medType').value = medicine.animalType;
        document.getElementById('medExpiry').value = medicine.expiryDate;
        document.getElementById('medSupplier').value = medicine.supplier;
        
        // Guardar el ID para la edición
        document.getElementById('medicineForm').dataset.editId = medicine.id;
        
        if (modal) modal.classList.add('active');
    }

    // Eliminar medicamento
    deleteMedicine(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este medicamento?')) {
            this.medicines = this.medicines.filter(med => med.id !== id);
            StorageManager.saveMedicines(this.medicines);
            this.renderMedicineTable();
            this.updateDashboardStats();
            this.showMessage('Medicamento eliminado correctamente', 'success');
        }
    }

    // Manejar envío del formulario de medicamento
    handleMedicineSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const editId = e.target.dataset.editId;

        const medicineData = {
            code: formData.get('code'),
            name: formData.get('name'),
            quantity: parseInt(formData.get('quantity')),
            minStock: parseInt(formData.get('minStock')),
            dose: formData.get('dose'),
            animalType: formData.get('animalType'),
            expiryDate: formData.get('expiryDate'),
            supplier: formData.get('supplier')
        };

        // Validar datos
        if (!this.validateMedicineData(medicineData)) {
            this.showMessage('Por favor, completa todos los campos correctamente', 'error');
            return;
        }

        if (editId) {
            // Editar medicamento existente
            const index = this.medicines.findIndex(med => med.id === parseInt(editId));
            if (index !== -1) {
                this.medicines[index] = { ...this.medicines[index], ...medicineData };
                this.showMessage('Medicamento actualizado correctamente', 'success');
            }
        } else {
            // Agregar nuevo medicamento
            const newMedicine = {
                id: Date.now(), // ID simple para demo
                ...medicineData,
                createdAt: new Date().toISOString()
            };
            this.medicines.push(newMedicine);
            this.showMessage('Medicamento agregado correctamente', 'success');
        }

        StorageManager.saveMedicines(this.medicines);
        this.closeModal();
        this.renderMedicineTable();
        this.updateDashboardStats();
    }

    // Validar datos del medicamento
    validateMedicineData(data) {
        return data.code && data.name && data.quantity >= 0 && 
               data.minStock >= 0 && data.dose && data.animalType && 
               data.expiryDate && data.supplier;
    }

    // Cerrar modal
    closeModal() {
        const modal = document.getElementById('medicineModal');
        const form = document.getElementById('medicineForm');
        
        if (modal) modal.classList.remove('active');
        if (form) {
            form.reset();
            delete form.dataset.editId;
        }
    }

    // Cargar alertas
    loadAlerts() {
        this.loadExpiringAlerts();
        this.loadStockAlerts();
    }

    // Cargar alertas de vencimiento
    loadExpiringAlerts() {
        const container = document.getElementById('expiringAlerts');
        if (!container) return;

        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const expiringMeds = this.medicines.filter(med => {
            const expiryDate = new Date(med.expiryDate);
            return expiryDate <= thirtyDaysFromNow;
        });

        if (expiringMeds.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay medicamentos próximos a vencer</p></div>';
            return;
        }

        container.innerHTML = expiringMeds.map(med => {
            const expiryDate = new Date(med.expiryDate);
            const isExpired = expiryDate < now;
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="alert-item ${isExpired ? 'danger' : ''}">
                    <div>
                        <strong>${med.name} (${med.code})</strong><br>
                        Vence: ${this.formatDate(med.expiryDate)}
                        ${isExpired ? ' - <strong>VENCIDO</strong>' : ` - ${daysUntilExpiry} días restantes`}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Cargar alertas de stock
    loadStockAlerts() {
        const container = document.getElementById('stockAlerts');
        if (!container) return;

        const lowStockMeds = this.medicines.filter(med => med.quantity <= med.minStock);

        if (lowStockMeds.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay medicamentos con stock bajo</p></div>';
            return;
        }

        container.innerHTML = lowStockMeds.map(med => `
            <div class="alert-item">
                <div>
                    <strong>${med.name} (${med.code})</strong><br>
                    Stock actual: ${med.quantity} | Mínimo: ${med.minStock}
                </div>
            </div>
        `).join('');
    }

    // Cargar reportes
    loadReports() {
        // Configurar fechas por defecto
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        
        if (dateFrom && !dateFrom.value) {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            dateFrom.value = lastMonth.toISOString().split('T')[0];
        }
        
        if (dateTo && !dateTo.value) {
            dateTo.value = new Date().toISOString().split('T')[0];
        }
    }

    // Generar reporte
    generateReport() {
        const reportType = document.getElementById('reportType')?.value;
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const reportContent = document.getElementById('reportContent');

        if (!reportContent) return;

        let content = '';

        switch (reportType) {
            case 'consumption':
                content = this.generateConsumptionReport(dateFrom, dateTo);
                break;
            case 'mostUsed':
                content = this.generateMostUsedReport();
                break;
            case 'inventory':
                content = this.generateInventoryReport();
                break;
            default:
                content = '<p>Selecciona un tipo de reporte</p>';
        }

        reportContent.innerHTML = content;
    }

    // Generar reporte de consumo
    generateConsumptionReport(dateFrom, dateTo) {
        // En un sistema real, esto analizaría los movimientos de inventario
        return `
            <h3>Reporte de Consumo</h3>
            <p><strong>Período:</strong> ${this.formatDate(dateFrom)} - ${this.formatDate(dateTo)}</p>
            <div class="mt-4">
                <p>Este reporte mostraría el consumo de medicamentos en el período seleccionado.</p>
                <p><em>Funcionalidad pendiente de implementar con el sistema de movimientos.</em></p>
            </div>
        `;
    }

    // Generar reporte de más utilizados
    generateMostUsedReport() {
        return `
            <h3>Medicamentos Más Utilizados</h3>
            <div class="mt-4">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Medicamento</th>
                                <th>Código</th>
                                <th>Stock Actual</th>
                                <th>Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.medicines.map(med => `
                                <tr>
                                    <td>${med.name}</td>
                                    <td>${med.code}</td>
                                    <td>${med.quantity}</td>
                                    <td>${med.animalType}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Generar reporte de inventario
    generateInventoryReport() {
        const totalMeds = this.medicines.length;
        const totalValue = this.medicines.reduce((sum, med) => sum + (med.quantity * 10), 0);
        const expiring = this.medicines.filter(med => {
            const expiryDate = new Date(med.expiryDate);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return expiryDate <= thirtyDaysFromNow;
        }).length;
        const lowStock = this.medicines.filter(med => med.quantity <= med.minStock).length;

        return `
            <h3>Estado del Inventario</h3>
            <div class="mt-4">
                <div class="dashboard-cards">
                    <div class="card">
                        <h4>Total Medicamentos</h4>
                        <p class="card-number">${totalMeds}</p>
                    </div>
                    <div class="card card-success">
                        <h4>Valor Estimado</h4>
                        <p class="card-number">${totalValue.toLocaleString()}</p>
                    </div>
                    <div class="card card-warning">
                        <h4>Próximos a Vencer</h4>
                        <p class="card-number">${expiring}</p>
                    </div>
                    <div class="card card-danger">
                        <h4>Stock Bajo</h4>
                        <p class="card-number">${lowStock}</p>
                    </div>
                </div>
                
                <h4 class="mt-4">Detalle por Tipo de Animal</h4>
                <div class="table-container mt-2">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Cantidad de Medicamentos</th>
                                <th>Stock Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getInventoryByType().map(item => `
                                <tr>
                                    <td>${item.type}</td>
                                    <td>${item.count}</td>
                                    <td>${item.totalStock}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    

    // Obtener inventario por tipo
   getInventoryByType() {
    // Lista completa de tipos de animales
    const types = [
        // Existentes (NO CAMBIAR)
        'perros',
        'gatos', 
        'general',
        
        // NUEVOS AGREGADOS
        // Animales domésticos
        'conejos',
        'hamsters',
        'cobayas',
        'chinchillas',
        'hurones',
        'aves-domesticas',
        'canarios',
        'loros',
        'periquitos',
        'peces-ornamentales',
        'tortugas',
        'iguanas',
        'serpientes',
        'erizos',
        
        // Animales de granja
        'vacas',
        'cerdos',
        'cabras',
        'ovejas',
        'pollos',
        'gallinas',
        'patos',
        'gansos',
        'pavos',
        'caballos',
        'burros',
        'mulas',
        'llamas',
        'alpacas',
        
        // Animales exóticos y zoológicos
        'primates',
        'felinos-grandes',
        'osos',
        'lobos',
        'zorros',
        'mapaches',
        'nutrias',
        'focas',
        'delfines',
        'ballenas',
        'tiburones',
        'rayas',
        'cocodrilos',
        'lagartos',
        'salamandras',
        'ranas',
        'sapos',
        'arañas',
        'escorpiones',
        'insectos',
        
        // Aves exóticas y silvestres
        'aguila',
        'halcon',
        'buho',
        'flamingo',
        'pinguino',
        'avestruz',
        'emu',
        'casuario',
        'tucanes',
        'guacamayos',
        'cacatuas',
        'cisnes',
        'pelicanos',
        
        // Animales acuáticos
        'peces-marinos',
        'peces-agua-dulce',
        'medusas',
        'pulpos',
        'calamares',
        'cangrejos',
        'langostas',
        'camarones',
        'estrellas-mar',
        'erizos-mar',
        'corales',
        
        // Animales de laboratorio
        'ratones-laboratorio',
        'ratas-laboratorio',
        'conejos-laboratorio',
        'primates-laboratorio',
        
        // Animales salvajes rehabilitación
        'venados',
        'alces',
        'jabalies',
        'ardillas',
        'castores',
        'porcospines',
        'murciélagos',
        'tejones',
        'comadrejas',
        'linces',
        'pumas',
        'jaguares',
        'ocelotes',
        'armadillos',
        'osos-hormigueros',
        'perezosos',
        'monos-aulladores',
        'monos-capuchinos',
        'lemures',
        'koalas',
        'canguros',
        'wallabies',
        'wombats',
        'ornitorrincos',
        'equidnas'
    ];
    
    // EL RESTO IGUAL, NO TOCAR NADA:
    return types.map(type => {
        const meds = this.medicines.filter(med => med.animalType === type);
        return {
            type: type.charAt(0).toUpperCase() + type.slice(1),
            count: meds.length,
            totalStock: meds.reduce((sum, med) => sum + med.quantity, 0)
        };
    });
}

    // Formatear fecha
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    // Mostrar mensaje
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('loginMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            // Ocultar mensaje después de 5 segundos
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        } else {
            // Fallback: usar alert si no hay elemento de mensaje
            alert(message);
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VeterinaryApp();
});

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VeterinaryApp;
}