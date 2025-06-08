// Sistema de Gestión de Inventario - VeterinaryProject
class InventoryManager {
    constructor() {
        this.medicines = [];
        this.filters = { search: '', animalType: '', status: '' };
        this.pagination = { currentPage: 1, itemsPerPage: 10 };
        this.init();
    }

    init() {
        this.loadData();
        this.setupEvents();
        this.renderTable();
    }

    loadData() {
        this.medicines = StorageManager.getMedicines();
        if (this.medicines.length === 0) {
            this.createSampleData();
        }
    }

    createSampleData() {
        const samples = [
            {
                id: 1, code: 'DOG001', name: 'Amoxicilina Canina', quantity: 50, minStock: 10,
                dose: '250mg', animalType: 'perros', expiryDate: '2025-12-31',
                supplier: 'VetSupply Corp', createdAt: new Date().toISOString()
            },
            {
                id: 2, code: 'CAT002', name: 'Antihistamínico Felino', quantity: 5, minStock: 15,
                dose: '10mg', animalType: 'gatos', expiryDate: '2025-08-15',
                supplier: 'FelineHealth Ltd', createdAt: new Date().toISOString()
            },
            {
                id: 3, code: 'GEN003', name: 'Vitaminas Multi', quantity: 2, minStock: 20,
                dose: '5ml', animalType: 'general', expiryDate: '2024-06-30',
                supplier: 'NutriVet Solutions', createdAt: new Date().toISOString()
            }
        ];
        this.medicines = samples;
        StorageManager.saveMedicines(this.medicines);
    }

    setupEvents() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce(() => {
                this.filters.search = searchInput.value;
                this.applyFilters();
            }, 300));
        }

        // Filtros
        ['filterType', 'filterStatus'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.filters[id === 'filterType' ? 'animalType' : 'status'] = element.value;
                    this.applyFilters();
                });
            }
        });

        // Botón agregar
        const addBtn = document.getElementById('addMedBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }
    }

    applyFilters() {
        this.pagination.currentPage = 1;
        this.renderTable();
    }

    getFilteredMedicines() {
        let filtered = [...this.medicines];

        if (this.filters.search) {
            filtered = filtered.filter(med => 
                Helpers.searchInText(this.filters.search, med.name) ||
                Helpers.searchInText(this.filters.search, med.code)
            );
        }

        if (this.filters.animalType) {
            filtered = filtered.filter(med => med.animalType === this.filters.animalType);
        }

        if (this.filters.status) {
            filtered = filtered.filter(med => this.getMedicineStatus(med) === this.filters.status);
        }

        return filtered;
    }

    getMedicineStatus(medicine) {
        const now = new Date();
        const expiryDate = new Date(medicine.expiryDate);
        
        if (expiryDate < now) return 'expired';
        if (medicine.quantity <= medicine.minStock) return 'low';
        if (medicine.quantity === 0) return 'outofstock';
        return 'available';
    }

    renderTable() {
        const filtered = this.getFilteredMedicines();
        const startIndex = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
        const endIndex = startIndex + this.pagination.itemsPerPage;
        const paginatedData = filtered.slice(startIndex, endIndex);

        const tableBody = document.getElementById('medicineTableBody');
        if (!tableBody) return;

        if (paginatedData.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="7" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <p>No se encontraron medicamentos</p>
                    </div>
                </td></tr>
            `;
            return;
        }

        tableBody.innerHTML = paginatedData.map(med => `
            <tr data-medicine-id="${med.id}">
                <td><strong>${med.code}</strong></td>
                <td>
                    <div><strong>${med.name}</strong></div>
                    <small class="text-light">Dosis: ${med.dose}</small>
                </td>
                <td>
                    <span class="${med.quantity <= med.minStock ? 'text-danger' : ''}">${med.quantity}</span>
                    <small class="text-light">/ ${med.minStock} mín</small>
                </td>
                <td><span class="badge badge-secondary">${Helpers.capitalize(med.animalType)}</span></td>
                <td>
                    ${Helpers.formatDate(med.expiryDate)}
                    ${this.getExpiryWarning(med.expiryDate)}
                </td>
                <td>${this.getStatusBadge(this.getMedicineStatus(med))}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="inventoryManager.viewMedicine(${med.id})" title="Ver">👁️</button>
                        <button class="btn btn-sm btn-secondary" onclick="inventoryManager.editMedicine(${med.id})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="inventoryManager.deleteMedicine(${med.id})" title="Eliminar">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.renderPagination(filtered.length);
    }

    getStatusBadge(status) {
        const badges = {
            'available': '<span class="status-badge status-available">Disponible</span>',
            'low': '<span class="status-badge status-low">Stock Bajo</span>',
            'expired': '<span class="status-badge status-expired">Vencido</span>',
            'outofstock': '<span class="status-badge status-expired">Sin Stock</span>'
        };
        return badges[status] || badges['available'];
    }

    getExpiryWarning(expiryDate) {
        if (Helpers.isExpired(expiryDate)) {
            return '<small class="text-danger">❌ Vencido</small>';
        } else if (Helpers.isExpiringSoon(expiryDate, 30)) {
            const days = Helpers.daysBetween(new Date(), expiryDate);
            return `<small class="text-warning">⚠️ ${days} días</small>`;
        }
        return '';
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.pagination.itemsPerPage);
        const container = document.querySelector('.pagination-container');
        
        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        const currentPage = this.pagination.currentPage;
        let html = '<div class="pagination">';

        // Botón anterior
        html += `<button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                        onclick="inventoryManager.goToPage(${currentPage - 1})" 
                        ${currentPage === 1 ? 'disabled' : ''}>← Anterior</button>`;

        // Números de página
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            onclick="inventoryManager.goToPage(${i})">${i}</button>`;
        }

        // Botón siguiente
        html += `<button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                        onclick="inventoryManager.goToPage(${currentPage + 1})" 
                        ${currentPage === totalPages ? 'disabled' : ''}>Siguiente →</button>`;

        html += '</div>';
        html += `<div class="pagination-info">Mostrando ${((currentPage - 1) * this.pagination.itemsPerPage) + 1} - 
                ${Math.min(currentPage * this.pagination.itemsPerPage, totalItems)} de ${totalItems}</div>`;

        container.innerHTML = html;
    }

    goToPage(page) {
        const totalItems = this.getFilteredMedicines().length;
        const totalPages = Math.ceil(totalItems / this.pagination.itemsPerPage);
        
        if (page < 1 || page > totalPages) return;
        this.pagination.currentPage = page;
        this.renderTable();
    }

    showAddModal() {
        if (!window.authSystem?.hasPermission('inventory.create')) {
            Helpers.showToast('No tienes permisos para agregar medicamentos', 'error');
            return;
        }

        const modal = window.modalManager?.get('medicineModal');
        if (modal) {
            modal.setTitle('Agregar Medicamento');
            const form = document.getElementById('medicineForm');
            if (form) {
                form.reset();
                delete form.dataset.editId;
            }
            modal.open();
        }
    }

    viewMedicine(id) {
        const medicine = this.medicines.find(med => med.id === id);
        if (!medicine) return;

        const content = `
            <div class="medicine-details">
                <div class="detail-section">
                    <h4>Información General</h4>
                    <div class="detail-grid">
                        <div><strong>Código:</strong> ${medicine.code}</div>
                        <div><strong>Nombre:</strong> ${medicine.name}</div>
                        <div><strong>Dosis:</strong> ${medicine.dose}</div>
                        <div><strong>Tipo:</strong> ${Helpers.capitalize(medicine.animalType)}</div>
                        <div><strong>Stock:</strong> ${medicine.quantity} / ${medicine.minStock} mín</div>
                        <div><strong>Estado:</strong> ${this.getStatusBadge(this.getMedicineStatus(medicine))}</div>
                        <div><strong>Proveedor:</strong> ${medicine.supplier}</div>
                        <div><strong>Vencimiento:</strong> ${Helpers.formatDate(medicine.expiryDate)}</div>
                    </div>
                </div>
            </div>
        `;

        const modal = window.modalManager?.create('viewMedicineModal', content, {
            title: `${medicine.name} (${medicine.code})`,
            showFooter: false
        });
        modal?.open();
    }

    editMedicine(id) {
        if (!window.authSystem?.hasPermission('inventory.update')) {
            Helpers.showToast('No tienes permisos para editar medicamentos', 'error');
            return;
        }

        const medicine = this.medicines.find(med => med.id === id);
        if (!medicine) return;

        const modal = window.modalManager?.get('medicineModal');
        if (modal) {
            modal.setTitle('Editar Medicamento');
            
            // Llenar formulario
            Object.keys(medicine).forEach(key => {
                const field = document.querySelector(`[name="${key}"]`);
                if (field) field.value = medicine[key];
            });

            const form = document.getElementById('medicineForm');
            if (form) form.dataset.editId = id;
            
            modal.open();
        }
    }

    async deleteMedicine(id) {
        if (!window.authSystem?.hasPermission('inventory.delete')) {
            Helpers.showToast('No tienes permisos para eliminar medicamentos', 'error');
            return;
        }

        const medicine = this.medicines.find(med => med.id === id);
        if (!medicine) return;

        const confirmed = await window.modalManager?.confirm(
            `¿Eliminar "${medicine.name}"?\n\nEsta acción no se puede deshacer.`,
            'Confirmar Eliminación'
        );

        if (confirmed) {
            this.medicines = this.medicines.filter(med => med.id !== id);
            StorageManager.saveMedicines(this.medicines);
            this.renderTable();
            Helpers.showToast('Medicamento eliminado correctamente', 'success');
        }
    }

    saveMedicine(medicineData) {
        const editId = medicineData.editId;
        delete medicineData.editId;

        // Validar
        const validation = Validators.validateMedicine(medicineData);
        if (!validation.isValid) {
            Object.values(validation.errors).forEach(error => {
                Helpers.showToast(error, 'error');
            });
            return false;
        }

        // Verificar código único
        const existingMedicine = this.medicines.find(med => 
            med.code === medicineData.code && med.id !== parseInt(editId)
        );
        
        if (existingMedicine) {
            Helpers.showToast('Ya existe un medicamento con ese código', 'error');
            return false;
        }

        if (editId) {
            // Editar
            const index = this.medicines.findIndex(med => med.id === parseInt(editId));
            if (index !== -1) {
                this.medicines[index] = { ...this.medicines[index], ...medicineData, updatedAt: new Date().toISOString() };
                Helpers.showToast('Medicamento actualizado correctamente', 'success');
            }
        } else {
            // Crear
            const newMedicine = {
                id: Date.now(),
                ...medicineData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.medicines.push(newMedicine);
            Helpers.showToast('Medicamento agregado correctamente', 'success');
        }

        StorageManager.saveMedicines(this.medicines);
        this.renderTable();
        
        // Verificar alertas
        if (window.alertSystem) {
            window.alertSystem.checkAllAlerts();
        }

        return true;
    }

    exportInventory(format = 'csv') {
        const medicines = this.getFilteredMedicines();
        const data = medicines.map(med => ({
            'Código': med.code,
            'Nombre': med.name,
            'Cantidad': med.quantity,
            'Stock Mínimo': med.minStock,
            'Dosis': med.dose,
            'Tipo Animal': med.animalType,
            'Fecha Vencimiento': Helpers.formatDate(med.expiryDate),
            'Proveedor': med.supplier,
            'Estado': this.getMedicineStatus(med)
        }));

        const filename = `inventario_${Helpers.formatDate(new Date(), 'yyyy-mm-dd')}`;
        
        if (format === 'csv') {
            Helpers.exportToCSV(data, `${filename}.csv`);
        } else {
            Helpers.exportToJSON(data, `${filename}.json`);
        }

        Helpers.showToast('Inventario exportado correctamente', 'success');
    }

    getInventoryStats() {
        const total = this.medicines.length;
        const available = this.medicines.filter(med => this.getMedicineStatus(med) === 'available').length;
        const lowStock = this.medicines.filter(med => this.getMedicineStatus(med) === 'low').length;
        const expired = this.medicines.filter(med => this.getMedicineStatus(med) === 'expired').length;
        const totalValue = this.medicines.reduce((sum, med) => sum + (med.quantity * 10), 0);

        return { total, available, lowStock, expired, totalValue };
    }

    refresh() {
        this.loadData();
        this.renderTable();
        Helpers.showToast('Inventario actualizado', 'success');
    }
}

// CSS adicional para inventario
const inventoryStyles = `
.action-buttons {
    display: flex;
    gap: 0.25rem;
}

.action-buttons .btn {
    padding: 0.25rem 0.5rem;
    min-width: auto;
}

.detail-section h4 {
    color: var(--primary-color);
    margin-bottom: 1rem;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.detail-grid > div {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
}

.pagination-container {
    margin-top: 1.5rem;
    text-align: center;
}

.pagination {
    display: inline-flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
}

.pagination-info {
    font-size: 0.875rem;
    color: var(--text-light);
}

@media (max-width: 768px) {
    .action-buttons {
        flex-direction: column;
    }
    
    .detail-grid {
        grid-template-columns: 1fr;
    }
}
`;

// Agregar estilos
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = inventoryStyles;
    document.head.appendChild(style);
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryManager = new InventoryManager();
});

// Exportar
if (typeof window !== 'undefined') {
    window.InventoryManager = InventoryManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryManager;
}