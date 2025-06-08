// Sistema de Alertas para VeterinaryProject
class AlertSystem {
    constructor() {
        this.alertThresholds = {
            expiryDays: 15,    // Días antes del vencimiento para alertar
            lowStockRatio: 0.5  // Ratio para considerar stock bajo (50% del mínimo)
        };
        this.notifications = [];
        this.init();
    }

    // Inicializar sistema de alertas
    init() {
        this.loadSettings();
        this.checkAllAlerts();
        this.setupPeriodicCheck();
    }

    // Cargar configuraciones
    loadSettings() {
        const settings = StorageManager.getSettings();
        if (settings.alertDays) {
            this.alertThresholds.expiryDays = settings.alertDays;
        }
    }

    // Configurar chequeo periódico
    setupPeriodicCheck() {
        // Verificar alertas cada 5 minutos
        setInterval(() => {
            this.checkAllAlerts();
        }, 5 * 60 * 1000);
    }

    // Verificar todas las alertas
    checkAllAlerts() {
        const medicines = StorageManager.getMedicines();
        this.notifications = [];
        
        this.checkExpiryAlerts(medicines);
        this.checkStockAlerts(medicines);
        this.updateAlertDisplay();
        
        return this.notifications;
    }

    // Verificar alertas de vencimiento
    checkExpiryAlerts(medicines) {
        const today = new Date();
        const alertDate = new Date();
        alertDate.setDate(today.getDate() + this.alertThresholds.expiryDays);

        medicines.forEach(medicine => {
            const expiryDate = new Date(medicine.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

            if (expiryDate < today) {
                // Medicamento vencido
                this.notifications.push({
                    id: `expired_${medicine.id}`,
                    type: 'expired',
                    priority: 'high',
                    title: 'Medicamento Vencido',
                    message: `${medicine.name} (${medicine.code}) venció el ${Helpers.formatDate(medicine.expiryDate)}`,
                    medicine: medicine,
                    daysOverdue: Math.abs(daysUntilExpiry),
                    timestamp: new Date().toISOString()
                });
            } else if (expiryDate <= alertDate) {
                // Próximo a vencer
                this.notifications.push({
                    id: `expiring_${medicine.id}`,
                    type: 'expiring',
                    priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
                    title: 'Próximo a Vencer',
                    message: `${medicine.name} (${medicine.code}) vence en ${daysUntilExpiry} días`,
                    medicine: medicine,
                    daysRemaining: daysUntilExpiry,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // Verificar alertas de stock
    checkStockAlerts(medicines) {
        medicines.forEach(medicine => {
            const stockRatio = medicine.quantity / medicine.minStock;
            
            if (medicine.quantity === 0) {
                // Sin stock
                this.notifications.push({
                    id: `outofstock_${medicine.id}`,
                    type: 'outofstock',
                    priority: 'high',
                    title: 'Sin Stock',
                    message: `${medicine.name} (${medicine.code}) no tiene stock disponible`,
                    medicine: medicine,
                    timestamp: new Date().toISOString()
                });
            } else if (stockRatio <= this.alertThresholds.lowStockRatio) {
                // Stock bajo
                this.notifications.push({
                    id: `lowstock_${medicine.id}`,
                    type: 'lowstock',
                    priority: stockRatio <= 0.25 ? 'high' : 'medium',
                    title: 'Stock Bajo',
                    message: `${medicine.name} (${medicine.code}) tiene ${medicine.quantity} unidades (mínimo: ${medicine.minStock})`,
                    medicine: medicine,
                    currentStock: medicine.quantity,
                    minStock: medicine.minStock,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    // Actualizar visualización de alertas
    updateAlertDisplay() {
        this.updateAlertBadges();
        this.updateAlertLists();
        this.showCriticalNotifications();
    }

    // Actualizar badges de alerta en la navegación
    updateAlertBadges() {
        const alertLink = document.querySelector('[href="#alerts"]');
        if (alertLink) {
            const existingBadge = alertLink.querySelector('.alert-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            const criticalAlerts = this.notifications.filter(n => n.priority === 'high');
            if (criticalAlerts.length > 0) {
                const badge = document.createElement('span');
                badge.className = 'alert-badge badge-danger';
                badge.textContent = criticalAlerts.length;
                alertLink.appendChild(badge);
            }
        }
    }

    // Actualizar listas de alertas
    updateAlertLists() {
        // Alertas de vencimiento
        const expiringContainer = document.getElementById('expiringAlerts');
        if (expiringContainer) {
            const expiringAlerts = this.notifications.filter(n => 
                n.type === 'expiring' || n.type === 'expired'
            );
            this.renderAlertList(expiringContainer, expiringAlerts);
        }

        // Alertas de stock
        const stockContainer = document.getElementById('stockAlerts');
        if (stockContainer) {
            const stockAlerts = this.notifications.filter(n => 
                n.type === 'lowstock' || n.type === 'outofstock'
            );
            this.renderAlertList(stockContainer, stockAlerts);
        }
    }

    // Renderizar lista de alertas
    renderAlertList(container, alerts) {
        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p>No hay alertas de este tipo</p>
                </div>
            `;
            return;
        }

        // Ordenar por prioridad y fecha
        alerts.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        container.innerHTML = alerts.map(alert => this.renderAlertItem(alert)).join('');
    }

    // Renderizar item de alerta
    renderAlertItem(alert) {
        const priorityClass = alert.priority === 'high' ? 'danger' : 
                             alert.priority === 'medium' ? 'warning' : '';
        
        const icon = this.getAlertIcon(alert.type);
        const details = this.getAlertDetails(alert);

        return `
            <div class="alert-item ${priorityClass}" data-alert-id="${alert.id}">
                <div class="alert-content">
                    <div class="alert-header">
                        <span class="alert-icon">${icon}</span>
                        <strong class="alert-title">${alert.title}</strong>
                        <span class="alert-priority priority-${alert.priority}">${alert.priority.toUpperCase()}</span>
                    </div>
                    <div class="alert-message">${alert.message}</div>
                    ${details ? `<div class="alert-details">${details}</div>` : ''}
                    <div class="alert-actions">
                        <button class="btn btn-sm btn-secondary" onclick="alertSystem.viewMedicine(${alert.medicine.id})">
                            Ver Medicamento
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="alertSystem.resolveAlert('${alert.id}')">
                            Resolver
                        </button>
                    </div>
                </div>
                <div class="alert-timestamp">
                    ${Helpers.formatDate(alert.timestamp)}
                </div>
            </div>
        `;
    }

    // Obtener icono según tipo de alerta
    getAlertIcon(type) {
        const icons = {
            'expired': '❌',
            'expiring': '⚠️',
            'lowstock': '📦',
            'outofstock': '🚫'
        };
        return icons[type] || '🔔';
    }

    // Obtener detalles adicionales de la alerta
    getAlertDetails(alert) {
        switch (alert.type) {
            case 'expired':
                return `Vencido hace ${alert.daysOverdue} días`;
            case 'expiring':
                return `${alert.daysRemaining} días restantes`;
            case 'lowstock':
                return `Stock actual: ${alert.currentStock} | Mínimo: ${alert.minStock}`;
            case 'outofstock':
                return 'Restock urgente necesario';
            default:
                return null;
        }
    }

    // Mostrar notificaciones críticas
    showCriticalNotifications() {
        const criticalAlerts = this.notifications.filter(n => 
            n.priority === 'high' && !this.isAlertDismissed(n.id)
        );

        criticalAlerts.forEach(alert => {
            // Solo mostrar una vez por sesión
            if (!this.hasShownAlert(alert.id)) {
                this.showToastNotification(alert);
                this.markAlertAsShown(alert.id);
            }
        });
    }

    // Mostrar notificación toast
    showToastNotification(alert) {
        const type = alert.priority === 'high' ? 'error' : 'warning';
        Helpers.showToast(alert.message, type, 10000); // 10 segundos para alertas críticas
    }

    // Verificar si la alerta ya fue mostrada
    hasShownAlert(alertId) {
        const shownAlerts = JSON.parse(sessionStorage.getItem('shownAlerts') || '[]');
        return shownAlerts.includes(alertId);
    }

    // Marcar alerta como mostrada
    markAlertAsShown(alertId) {
        const shownAlerts = JSON.parse(sessionStorage.getItem('shownAlerts') || '[]');
        if (!shownAlerts.includes(alertId)) {
            shownAlerts.push(alertId);
            sessionStorage.setItem('shownAlerts', JSON.stringify(shownAlerts));
        }
    }

    // Verificar si la alerta fue descartada
    isAlertDismissed(alertId) {
        const dismissedAlerts = StorageManager.getData('dismissedAlerts', []);
        return dismissedAlerts.includes(alertId);
    }

    // Resolver/descartar alerta
    resolveAlert(alertId) {
        const dismissedAlerts = StorageManager.getData('dismissedAlerts', []);
        if (!dismissedAlerts.includes(alertId)) {
            dismissedAlerts.push(alertId);
            StorageManager.saveData('dismissedAlerts', dismissedAlerts);
        }

        // Remover del DOM
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                alertElement.remove();
                this.updateAlertBadges(); // Actualizar contador
            }, 300);
        }

        Helpers.showToast('Alerta marcada como resuelta', 'success');
    }

    // Ver medicamento desde alerta
    viewMedicine(medicineId) {
        // Cambiar a la sección de inventario
        if (window.app) {
            window.app.showSection('inventory');
            
            // Filtrar por el medicamento específico
            setTimeout(() => {
                const medicine = StorageManager.getMedicineById(medicineId);
                if (medicine) {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = medicine.name;
                        window.app.filterMedicines();
                    }
                }
            }, 100);
        }
    }

    // Obtener resumen de alertas
    getAlertSummary() {
        const summary = {
            total: this.notifications.length,
            high: this.notifications.filter(n => n.priority === 'high').length,
            medium: this.notifications.filter(n => n.priority === 'medium').length,
            low: this.notifications.filter(n => n.priority === 'low').length,
            byType: {}
        };

        // Agrupar por tipo
        this.notifications.forEach(alert => {
            if (!summary.byType[alert.type]) {
                summary.byType[alert.type] = 0;
            }
            summary.byType[alert.type]++;
        });

        return summary;
    }

    // Configurar umbrales de alerta
    setAlertThresholds(newThresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
        
        // Guardar en configuraciones
        const settings = StorageManager.getSettings();
        settings.alertDays = this.alertThresholds.expiryDays;
        StorageManager.saveSettings(settings);
        
        // Recheck alertas con nuevos umbrales
        this.checkAllAlerts();
    }

    // Exportar alertas
    exportAlerts() {
        const alertData = {
            alerts: this.notifications,
            summary: this.getAlertSummary(),
            thresholds: this.alertThresholds,
            exportDate: new Date().toISOString()
        };
        
        Helpers.exportToJSON(alertData, `alertas_${Helpers.formatDate(new Date(), 'yyyy-mm-dd')}.json`);
    }

    // Limpiar alertas resueltas
    clearResolvedAlerts() {
        StorageManager.removeData('dismissedAlerts');
        sessionStorage.removeItem('shownAlerts');
        this.checkAllAlerts();
        Helpers.showToast('Alertas resueltas limpiadas', 'success');
    }
}

// CSS adicional para alertas (agregar al final del CSS)
const alertStyles = `
.alert-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--danger-color);
    color: white;
    border-radius: 50%;
    min-width: 20px;
    height: 20px;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

.alert-content {
    flex: 1;
}

.alert-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.alert-icon {
    font-size: 1.25rem;
}

.alert-title {
    font-weight: 600;
    color: var(--dark-color);
}

.alert-priority {
    margin-left: auto;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
}

.priority-high {
    background-color: var(--danger-color);
    color: white;
}

.priority-medium {
    background-color: var(--warning-color);
    color: white;
}

.priority-low {
    background-color: var(--secondary-color);
    color: white;
}

.alert-message {
    color: var(--text-color);
    margin-bottom: 0.5rem;
}

.alert-details {
    font-size: 0.875rem;
    color: var(--text-light);
    margin-bottom: 1rem;
}

.alert-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.alert-timestamp {
    font-size: 0.75rem;
    color: var(--text-light);
    text-align: right;
}

.btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
}

@keyframes fadeOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
}
`;

// Agregar estilos al documento
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = alertStyles;
    document.head.appendChild(style);
}

// Inicializar sistema de alertas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.alertSystem = new AlertSystem();
});

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.AlertSystem = AlertSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertSystem;
}