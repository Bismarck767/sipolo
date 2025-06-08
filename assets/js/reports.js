// Sistema de Reportes para VeterinaryProject
class ReportSystem {
    constructor() {
        this.reportTypes = {
            'consumption': 'Reporte de Consumo',
            'mostUsed': 'Medicamentos Más Utilizados',
            'inventory': 'Estado del Inventario',
            'expiry': 'Medicamentos por Vencer',
            'lowStock': 'Stock Bajo',
            'financial': 'Reporte Financiero'
        };
        this.init();
    }

    // Inicializar sistema de reportes
    init() {
        this.setupEventListeners();
    }

    // Configurar event listeners
    setupEventListeners() {
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateReport());
        }

        const reportType = document.getElementById('reportType');
        if (reportType) {
            reportType.addEventListener('change', () => this.onReportTypeChange());
        }
    }

    // Manejar cambio de tipo de reporte
    onReportTypeChange() {
        const reportType = document.getElementById('reportType')?.value;
        this.toggleDateInputs(reportType);
    }

    // Mostrar/ocultar campos de fecha según el tipo de reporte
    toggleDateInputs(reportType) {
        const dateControls = document.querySelectorAll('#dateFrom, #dateTo');
        const needsDates = ['consumption', 'financial'].includes(reportType);
        
        dateControls.forEach(control => {
            if (control) {
                control.parentElement.style.display = needsDates ? 'block' : 'none';
            }
        });
    }

    // Generar reporte
    generateReport() {
        const reportType = document.getElementById('reportType')?.value;
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const reportContent = document.getElementById('reportContent');

        if (!reportType) {
            Helpers.showToast('Selecciona un tipo de reporte', 'warning');
            return;
        }

        if (!reportContent) {
            console.error('Contenedor de reporte no encontrado');
            return;
        }

        // Mostrar loading
        reportContent.innerHTML = '<div class="text-center"><div class="spinner"></div><p>Generando reporte...</p></div>';

        // Simular tiempo de procesamiento
        setTimeout(() => {
            try {
                const reportData = this.generateReportData(reportType, dateFrom, dateTo);
                const reportHtml = this.renderReport(reportType, reportData, dateFrom, dateTo);
                reportContent.innerHTML = reportHtml;
            } catch (error) {
                console.error('Error generando reporte:', error);
                reportContent.innerHTML = '<div class="alert-item danger"><p>Error generando el reporte. Intenta nuevamente.</p></div>';
            }
        }, 1000);
    }

    // Generar datos del reporte
    generateReportData(reportType, dateFrom, dateTo) {
        const medicines = StorageManager.getMedicines();
        const movements = StorageManager.getMovements();

        switch (reportType) {
            case 'consumption':
                return this.generateConsumptionData(medicines, movements, dateFrom, dateTo);
            case 'mostUsed':
                return this.generateMostUsedData(medicines, movements);
            case 'inventory':
                return this.generateInventoryData(medicines);
            case 'expiry':
                return this.generateExpiryData(medicines);
            case 'lowStock':
                return this.generateLowStockData(medicines);
            case 'financial':
                return this.generateFinancialData(medicines, movements, dateFrom, dateTo);
            default:
                throw new Error('Tipo de reporte no válido');
        }
    }

    // Generar datos de consumo
    generateConsumptionData(medicines, movements, dateFrom, dateTo) {
        const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dateTo ? new Date(dateTo) : new Date();

        const filteredMovements = movements.filter(mov => {
            const movDate = new Date(mov.timestamp);
            return movDate >= startDate && movDate <= endDate && mov.type === 'output';
        });

        const consumption = {};
        filteredMovements.forEach(mov => {
            if (!consumption[mov.medicineId]) {
                const medicine = medicines.find(m => m.id === mov.medicineId);
                consumption[mov.medicineId] = {
                    medicine: medicine || { name: 'Medicamento eliminado', code: 'N/A' },
                    totalConsumed: 0,
                    movements: []
                };
            }
            consumption[mov.medicineId].totalConsumed += mov.quantity;
            consumption[mov.medicineId].movements.push(mov);
        });

        return {
            period: { from: startDate, to: endDate },
            consumption: Object.values(consumption).sort((a, b) => b.totalConsumed - a.totalConsumed),
            totalMedicines: Object.keys(consumption).length,
            totalQuantity: Object.values(consumption).reduce((sum, item) => sum + item.totalConsumed, 0)
        };
    }

    // Generar datos de medicamentos más utilizados
    generateMostUsedData(medicines, movements) {
        const usage = {};
        
        movements.filter(mov => mov.type === 'output').forEach(mov => {
            if (!usage[mov.medicineId]) {
                const medicine = medicines.find(m => m.id === mov.medicineId);
                usage[mov.medicineId] = {
                    medicine: medicine || { name: 'Medicamento eliminado', code: 'N/A' },
                    totalUsed: 0,
                    frequency: 0
                };
            }
            usage[mov.medicineId].totalUsed += mov.quantity;
            usage[mov.medicineId].frequency++;
        });

        return Object.values(usage)
            .sort((a, b) => b.totalUsed - a.totalUsed)
            .slice(0, 20); // Top 20
    }

    // Generar datos de inventario
    generateInventoryData(medicines) {
        const categories = Helpers.getAnimalTypeSummary(medicines);
        const totalValue = Helpers.calculateInventoryValue(medicines);
        const averageStock = Helpers.calculateAverageStock(medicines);
        const criticalStock = Helpers.getCriticalStockMedicines(medicines);

        const statusSummary = {
            available: medicines.filter(m => this.getMedicineStatus(m) === 'available').length,
            lowStock: medicines.filter(m => this.getMedicineStatus(m) === 'lowStock').length,
            expired: medicines.filter(m => this.getMedicineStatus(m) === 'expired').length
        };

        return {
            total: medicines.length,
            categories,
            totalValue,
            averageStock,
            criticalStock: criticalStock.length,
            statusSummary,
            medicines: medicines.map(med => ({
                ...med,
                status: this.getMedicineStatus(med),
                value: med.quantity * (med.price || 10)
            }))
        };
    }

    // Generar datos de vencimientos
    generateExpiryData(medicines) {
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        const expired = medicines.filter(med => new Date(med.expiryDate) < now);
        const expiring30 = medicines.filter(med => {
            const expiry = new Date(med.expiryDate);
            return expiry >= now && expiry <= thirtyDays;
        });
        const expiring60 = medicines.filter(med => {
            const expiry = new Date(med.expiryDate);
            return expiry > thirtyDays && expiry <= sixtyDays;
        });

        return {
            expired: expired.map(med => ({
                ...med,
                daysOverdue: Math.ceil((now - new Date(med.expiryDate)) / (1000 * 60 * 60 * 24))
            })),
            expiring30: expiring30.map(med => ({
                ...med,
                daysRemaining: Math.ceil((new Date(med.expiryDate) - now) / (1000 * 60 * 60 * 24))
            })),
            expiring60: expiring60.map(med => ({
                ...med,
                daysRemaining: Math.ceil((new Date(med.expiryDate) - now) / (1000 * 60 * 60 * 24))
            })),
            summary: {
                expired: expired.length,
                expiring30: expiring30.length,
                expiring60: expiring60.length,
                totalValue: expired.reduce((sum, med) => sum + (med.quantity * (med.price || 10)), 0)
            }
        };
    }

    // Generar datos de stock bajo
    generateLowStockData(medicines) {
        const lowStock = medicines.filter(med => med.quantity <= med.minStock);
        const criticalStock = medicines.filter(med => med.quantity <= med.minStock * 0.5);
        const outOfStock = medicines.filter(med => med.quantity === 0);

        return {
            lowStock: lowStock.map(med => ({
                ...med,
                stockRatio: med.quantity / med.minStock,
                needed: med.minStock - med.quantity
            })).sort((a, b) => a.stockRatio - b.stockRatio),
            summary: {
                lowStock: lowStock.length,
                critical: criticalStock.length,
                outOfStock: outOfStock.length,
                totalNeeded: lowStock.reduce((sum, med) => sum + Math.max(0, med.minStock - med.quantity), 0)
            }
        };
    }

    // Generar datos financieros
    generateFinancialData(medicines, movements, dateFrom, dateTo) {
        const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dateTo ? new Date(dateTo) : new Date();

        const filteredMovements = movements.filter(mov => {
            const movDate = new Date(mov.timestamp);
            return movDate >= startDate && movDate <= endDate;
        });

        const totalValue = medicines.reduce((sum, med) => sum + (med.quantity * (med.price || 10)), 0);
        const inputs = filteredMovements.filter(mov => mov.type === 'input');
        const outputs = filteredMovements.filter(mov => mov.type === 'output');

        const inputValue = inputs.reduce((sum, mov) => sum + (mov.quantity * (mov.unitPrice || 10)), 0);
        const outputValue = outputs.reduce((sum, mov) => sum + (mov.quantity * (mov.unitPrice || 10)), 0);

        return {
            period: { from: startDate, to: endDate },
            currentValue: totalValue,
            movements: {
                inputs: inputs.length,
                outputs: outputs.length,
                inputValue,
                outputValue,
                netValue: inputValue - outputValue
            },
            categories: this.getFinancialByCategory(medicines),
            summary: {
                totalMedicines: medicines.length,
                totalValue,
                averageValue: totalValue / medicines.length || 0
            }
        };
    }

    // Obtener datos financieros por categoría
    getFinancialByCategory(medicines) {
        const categories = Helpers.groupBy(medicines, 'animalType');
        
        return Object.keys(categories).map(type => ({
            type: Helpers.capitalize(type),
            count: categories[type].length,
            value: categories[type].reduce((sum, med) => sum + (med.quantity * (med.price || 10)), 0),
            percentage: (categories[type].length / medicines.length * 100).toFixed(1)
        }));
    }

    // Obtener estado del medicamento
    getMedicineStatus(medicine) {
        const now = new Date();
        const expiry = new Date(medicine.expiryDate);
        
        if (expiry < now) return 'expired';
        if (medicine.quantity <= medicine.minStock) return 'lowStock';
        return 'available';
    }

    // Renderizar reporte
    renderReport(reportType, data, dateFrom, dateTo) {
        switch (reportType) {
            case 'consumption':
                return this.renderConsumptionReport(data);
            case 'mostUsed':
                return this.renderMostUsedReport(data);
            case 'inventory':
                return this.renderInventoryReport(data);
            case 'expiry':
                return this.renderExpiryReport(data);
            case 'lowStock':
                return this.renderLowStockReport(data);
            case 'financial':
                return this.renderFinancialReport(data);
            default:
                return '<p>Tipo de reporte no implementado</p>';
        }
    }

    // Renderizar reporte de consumo
    renderConsumptionReport(data) {
        const { period, consumption, totalMedicines, totalQuantity } = data;
        
        return `
            <div class="report-header">
                <h3>📊 Reporte de Consumo</h3>
                <p><strong>Período:</strong> ${Helpers.formatDate(period.from)} - ${Helpers.formatDate(period.to)}</p>
            </div>
            
            <div class="report-summary">
                <div class="summary-cards">
                    <div class="summary-card">
                        <h4>Medicamentos Consumidos</h4>
                        <span class="summary-number">${totalMedicines}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Cantidad Total</h4>
                        <span class="summary-number">${totalQuantity}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Promedio por Medicamento</h4>
                        <span class="summary-number">${(totalQuantity / totalMedicines || 0).toFixed(1)}</span>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h4>Detalle de Consumo</h4>
                ${consumption.length > 0 ? `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Código</th>
                                    <th>Cantidad Consumida</th>
                                    <th>Número de Movimientos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${consumption.map(item => `
                                    <tr>
                                        <td>${item.medicine.name}</td>
                                        <td>${item.medicine.code}</td>
                                        <td>${item.totalConsumed}</td>
                                        <td>${item.movements.length}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<div class="empty-state"><p>No hay datos de consumo para el período seleccionado</p></div>'}
            </div>

            <div class="report-actions">
                <button class="btn btn-secondary" onclick="reportSystem.exportReport('consumption', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                    📄 Exportar CSV
                </button>
                <button class="btn btn-primary" onclick="window.print()">
                    🖨️ Imprimir
                </button>
            </div>
        `;
    }

    // Renderizar reporte de más utilizados
    renderMostUsedReport(data) {
        return `
            <div class="report-header">
                <h3>🏆 Medicamentos Más Utilizados</h3>
                <p>Top 20 medicamentos por uso total</p>
            </div>

            <div class="report-section">
                ${data.length > 0 ? `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Medicamento</th>
                                    <th>Código</th>
                                    <th>Total Utilizado</th>
                                    <th>Frecuencia de Uso</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.map((item, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.medicine.name}</td>
                                        <td>${item.medicine.code}</td>
                                        <td>${item.totalUsed}</td>
                                        <td>${item.frequency} veces</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<div class="empty-state"><p>No hay datos de uso disponibles</p></div>'}
            </div>

            <div class="report-actions">
                <button class="btn btn-secondary" onclick="reportSystem.exportReport('mostUsed', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                    📄 Exportar CSV
                </button>
                <button class="btn btn-primary" onclick="window.print()">
                    🖨️ Imprimir
                </button>
            </div>
        `;
    }

    // Renderizar reporte de inventario
    renderInventoryReport(data) {
        const { total, categories, totalValue, averageStock, criticalStock, statusSummary, medicines } = data;
        
        return `
            <div class="report-header">
                <h3>📦 Estado del Inventario</h3>
                <p>Reporte completo del inventario actual</p>
            </div>
            
            <div class="report-summary">
                <div class="summary-cards">
                    <div class="summary-card">
                        <h4>Total Medicamentos</h4>
                        <span class="summary-number">${total}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Valor Total</h4>
                        <span class="summary-number">${Helpers.formatCurrency(totalValue)}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Stock Promedio</h4>
                        <span class="summary-number">${averageStock.toFixed(1)}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Stock Crítico</h4>
                        <span class="summary-number text-danger">${criticalStock}</span>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h4>Estado por Categoría</h4>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Tipo de Animal</th>
                                <th>Cantidad</th>
                                <th>Stock Total</th>
                                <th>Porcentaje</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categories.map(cat => `
                                <tr>
                                    <td>${cat.type}</td>
                                    <td>${cat.count}</td>
                                    <td>${cat.totalStock}</td>
                                    <td>${((cat.count / total) * 100).toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="report-section">
                <h4>Resumen por Estado</h4>
                <div class="status-summary">
                    <div class="status-item available">
                        <span class="status-label">Disponible</span>
                        <span class="status-count">${statusSummary.available}</span>
                    </div>
                    <div class="status-item warning">
                        <span class="status-label">Stock Bajo</span>
                        <span class="status-count">${statusSummary.lowStock}</span>
                    </div>
                    <div class="status-item danger">
                        <span class="status-label">Vencido</span>
                        <span class="status-count">${statusSummary.expired}</span>
                    </div>
                </div>
            </div>

            <div class="report-actions">
                <button class="btn btn-secondary" onclick="reportSystem.exportReport('inventory', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                    📄 Exportar CSV
                </button>
                <button class="btn btn-primary" onclick="window.print()">
                    🖨️ Imprimir
                </button>
            </div>
        `;
    }

    // Renderizar reporte de vencimientos
    renderExpiryReport(data) {
        const { expired, expiring30, expiring60, summary } = data;
        
        return `
            <div class="report-header">
                <h3>⏰ Reporte de Vencimientos</h3>
                <p>Medicamentos vencidos y próximos a vencer</p>
            </div>
            
            <div class="report-summary">
                <div class="summary-cards">
                    <div class="summary-card danger">
                        <h4>Vencidos</h4>
                        <span class="summary-number">${summary.expired}</span>
                    </div>
                    <div class="summary-card warning">
                        <h4>Vencen en 30 días</h4>
                        <span class="summary-number">${summary.expiring30}</span>
                    </div>
                    <div class="summary-card info">
                        <h4>Vencen en 60 días</h4>
                        <span class="summary-number">${summary.expiring60}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Valor en Riesgo</h4>
                        <span class="summary-number">${Helpers.formatCurrency(summary.totalValue)}</span>
                    </div>
                </div>
            </div>

            ${expired.length > 0 ? `
                <div class="report-section">
                    <h4 class="text-danger">🚫 Medicamentos Vencidos</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Código</th>
                                    <th>Cantidad</th>
                                    <th>Fecha Vencimiento</th>
                                    <th>Días Vencido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expired.map(med => `
                                    <tr class="table-danger">
                                        <td>${med.name}</td>
                                        <td>${med.code}</td>
                                        <td>${med.quantity}</td>
                                        <td>${Helpers.formatDate(med.expiryDate)}</td>
                                        <td>${med.daysOverdue} días</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            ${expiring30.length > 0 ? `
                <div class="report-section">
                    <h4 class="text-warning">⚠️ Vencen en los próximos 30 días</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Código</th>
                                    <th>Cantidad</th>
                                    <th>Fecha Vencimiento</th>
                                    <th>Días Restantes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${expiring30.map(med => `
                                    <tr class="table-warning">
                                        <td>${med.name}</td>
                                        <td>${med.code}</td>
                                        <td>${med.quantity}</td>
                                        <td>${Helpers.formatDate(med.expiryDate)}</td>
                                        <td>${med.daysRemaining} días</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            <div class="report-actions">
                <button class="btn btn-secondary" onclick="reportSystem.exportReport('expiry', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                    📄 Exportar CSV
                </button>
                <button class="btn btn-primary" onclick="window.print()">
                    🖨️ Imprimir
                </button>
            </div>
        `;
    }

    // Renderizar reporte de stock bajo
    renderLowStockReport(data) {
        const { lowStock, summary } = data;
        
        return `
            <div class="report-header">
                <h3>📉 Reporte de Stock Bajo</h3>
                <p>Medicamentos que requieren restock</p>
            </div>
            
            <div class="report-summary">
                <div class="summary-cards">
                    <div class="summary-card warning">
                        <h4>Stock Bajo</h4>
                        <span class="summary-number">${summary.lowStock}</span>
                    </div>
                    <div class="summary-card danger">
                        <h4>Stock Crítico</h4>
                        <span class="summary-number">${summary.critical}</span>
                    </div>
                    <div class="summary-card danger">
                        <h4>Sin Stock</h4>
                        <span class="summary-number">${summary.outOfStock}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Total Necesario</h4>
                        <span class="summary-number">${summary.totalNeeded}</span>
                    </div>
                </div>
            </div>

            <div class="report-section">
                ${lowStock.length > 0 ? `
                    <h4>Detalle de Stock Bajo</h4>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Código</th>
                                    <th>Stock Actual</th>
                                    <th>Stock Mínimo</th>
                                    <th>% del Mínimo</th>
                                    <th>Cantidad Necesaria</th>
                                    <th>Proveedor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lowStock.map(med => `
                                    <tr class="${med.quantity === 0 ? 'table-danger' : med.stockRatio <= 0.5 ? 'table-warning' : ''}">
                                        <td>${med.name}</td>
                                        <td>${med.code}</td>
                                        <td>${med.quantity}</td>
                                        <td>${med.minStock}</td>
                                        <td>${(med.stockRatio * 100).toFixed(1)}%</td>
                                        <td>${med.needed}</td>
                                        <td>${med.supplier}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<div class="empty-state"><p>No hay medicamentos con stock bajo</p></div>'}
            </div>

            <div class="report-actions">
                <button class="btn btn-secondary" onclick="reportSystem.exportReport('lowStock', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                    📄 Exportar CSV
                </button>
                <button class="btn btn-primary" onclick="window.print()">
                    🖨️ Imprimir
                </button>
            </div>
        `;
    }

    // Renderizar reporte financiero
    renderFinancialReport(data) {
        const { period, currentValue, movements, categories, summary } = data;
        
        return `
            <div class="report-header">
                <h3>💰 Reporte Financiero</h3>
                <p><strong>Período:</strong> ${Helpers.formatDate(period.from)} - ${Helpers.formatDate(period.to)}</p>
            </div>
            
            <div class="report-summary">
                <div class="summary-cards">
                    <div class="summary-card">
                        <h4>Valor Actual</h4>
                        <span class="summary-number">${Helpers.formatCurrency(currentValue)}</span>
                    </div>
                    <div class="summary-card success">
                        <h4>Entradas</h4>
                        <span class="summary-number">${Helpers.formatCurrency(movements.inputValue)}</span>
                    </div>
                    <div class="summary-card warning">
                        <h4>Salidas</h4>
                        <span class="summary-number">${Helpers.formatCurrency(movements.outputValue)}</span>
                    </div>
                    <div class="summary-card">
                        <h4>Balance</h4>
                        <span class="summary-number ${movements.netValue >= 0 ? 'text-success' : 'text-danger'}">${Helpers.formatCurrency(movements.netValue)}</span>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h4>Valor por Categoría</h4>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Tipo de Animal</th>
                                <th>Medicamentos</th>
                                <th>Valor Total</th>
                                <th>Porcentaje</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categories.map(cat => `
                                <tr>
                                    <td>${cat.type}</td>
                                    <td>${cat.count}</td>
                                    <td>${Helpers.formatCurrency(cat.value)}</td>
                                    <td>${cat.percentage}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="report-actions">
                <button class="btn btn-secondary" onclick="reportSystem.exportReport('financial', ${JSON.stringify(data).replace(/"/g, '&quot;')})">
                    📄 Exportar CSV
                </button>
                <button class="btn btn-primary" onclick="window.print()">
                    🖨️ Imprimir
                </button>
            </div>
        `;
    }

    // Exportar reporte
    exportReport(reportType, data) {
        try {
            const csvData = this.convertToCSV(reportType, data);
            const filename = `reporte_${reportType}_${Helpers.formatDate(new Date(), 'yyyy-mm-dd')}.csv`;
            Helpers.downloadFile(csvData, filename, 'text/csv');
            Helpers.showToast('Reporte exportado exitosamente', 'success');
        } catch (error) {
            console.error('Error exportando reporte:', error);
            Helpers.showToast('Error al exportar el reporte', 'error');
        }
    }

    // Convertir datos a CSV
    convertToCSV(reportType, data) {
        let csvData = [];
        
        switch (reportType) {
            case 'consumption':
                csvData = [
                    ['Medicamento', 'Código', 'Cantidad Consumida', 'Movimientos'],
                    ...data.consumption.map(item => [
                        item.medicine.name,
                        item.medicine.code,
                        item.totalConsumed,
                        item.movements.length
                    ])
                ];
                break;
                
            case 'inventory':
                csvData = [
                    ['Medicamento', 'Código', 'Cantidad', 'Stock Mínimo', 'Estado', 'Valor'],
                    ...data.medicines.map(med => [
                        med.name,
                        med.code,
                        med.quantity,
                        med.minStock,
                        med.status,
                        med.value
                    ])
                ];
                break;
                
            default:
                throw new Error('Tipo de reporte no soportado para exportación');
        }
        
        return csvData.map(row => row.join(',')).join('\n');
    }
}

// CSS adicional para reportes
const reportStyles = `
.report-header {
    margin-bottom: 2rem;
    text-align: center;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 1rem;
}

.report-summary {
    margin-bottom: 2rem;
}

.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.summary-card {
    background: white;
    padding: 1.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    text-align: center;
    border-left: 4px solid var(--primary-color);
}

.summary-card h4 {
    color: var(--text-light);
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

.summary-number {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--dark-color);
}

.report-section {
    margin-bottom: 2rem;
}

.report-section h4 {
    margin-bottom: 1rem;
    color: var(--dark-color);
}

.report-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-color);
}

.status-summary {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    border-radius: var(--border-radius);
    min-width: 120px;
}

.status-item.available {
    background-color: #dcfce7;
    color: var(--success-color);
}

.status-item.warning {
    background-color: #fef3c7;
    color: var(--warning-color);
}

.status-item.danger {
    background-color: #fee2e2;
    color: var(--danger-color);
}

.status-label {
    font-size: 0.875rem;
    font-weight: 500;
}

.status-count {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 0.25rem;
}

.table-danger {
    background-color: #fee2e2 !important;
}

.table-warning {
    background-color: #fef3c7 !important;
}

.text-danger {
    color: var(--danger-color) !important;
}

.text-success {
    color: var(--success-color) !important;
}

.text-warning {
    color: var(--warning-color) !important;
}

@media print {
    .report-actions {
        display: none;
    }
    
    .summary-cards {
        grid-template-columns: repeat(2, 1fr);
    }
}
`;

// Agregar estilos al documento
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = reportStyles;
    document.head.appendChild(style);
}

// Inicializar sistema de reportes
document.addEventListener('DOMContentLoaded', () => {
    window.reportSystem = new ReportSystem();
});

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.ReportSystem = ReportSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportSystem;
}