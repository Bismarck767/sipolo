// Storage Manager - Manejo de datos en localStorage
class StorageManager {
    static KEYS = {
        MEDICINES: 'veterinary_medicines',
        USER: 'veterinary_user',
        MOVEMENTS: 'veterinary_movements',
        SETTINGS: 'veterinary_settings'
    };

    // Guardar datos en localStorage
    static saveData(key, data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
            return true;
        } catch (error) {
            console.error('Error guardando datos:', error);
            return false;
        }
    }

    // Obtener datos de localStorage
    static getData(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error obteniendo datos:', error);
            return defaultValue;
        }
    }

    // Eliminar datos de localStorage
    static removeData(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error eliminando datos:', error);
            return false;
        }
    }

    // Limpiar todos los datos
    static clearAll() {
        try {
            Object.values(StorageManager.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error limpiando datos:', error);
            return false;
        }
    }

    // Métodos específicos para medicamentos
    static saveMedicines(medicines) {
        return StorageManager.saveData(StorageManager.KEYS.MEDICINES, medicines);
    }

    static getMedicines() {
        return StorageManager.getData(StorageManager.KEYS.MEDICINES, []);
    }

    static addMedicine(medicine) {
        const medicines = StorageManager.getMedicines();
        medicines.push(medicine);
        return StorageManager.saveMedicines(medicines);
    }

    static updateMedicine(id, updatedData) {
        const medicines = StorageManager.getMedicines();
        const index = medicines.findIndex(med => med.id === id);
        
        if (index !== -1) {
            medicines[index] = { ...medicines[index], ...updatedData };
            return StorageManager.saveMedicines(medicines);
        }
        return false;
    }

    static deleteMedicine(id) {
        const medicines = StorageManager.getMedicines();
        const filteredMedicines = medicines.filter(med => med.id !== id);
        return StorageManager.saveMedicines(filteredMedicines);
    }

    static getMedicineById(id) {
        const medicines = StorageManager.getMedicines();
        return medicines.find(med => med.id === id) || null;
    }

    // Métodos para usuario
    static saveUser(user) {
        return StorageManager.saveData(StorageManager.KEYS.USER, user);
    }

    static getUser() {
        return StorageManager.getData(StorageManager.KEYS.USER, null);
    }

    static clearUser() {
        return StorageManager.removeData(StorageManager.KEYS.USER);
    }

    // Métodos para movimientos de inventario
    static saveMovements(movements) {
        return StorageManager.saveData(StorageManager.KEYS.MOVEMENTS, movements);
    }

    static getMovements() {
        return StorageManager.getData(StorageManager.KEYS.MOVEMENTS, []);
    }

    static addMovement(movement) {
        const movements = StorageManager.getMovements();
        movement.id = Date.now(); // ID simple para demo
        movement.timestamp = new Date().toISOString();
        movements.push(movement);
        return StorageManager.saveMovements(movements);
    }

    static getMovementsByMedicine(medicineId) {
        const movements = StorageManager.getMovements();
        return movements.filter(mov => mov.medicineId === medicineId);
    }

    static getMovementsByDateRange(startDate, endDate) {
        const movements = StorageManager.getMovements();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return movements.filter(mov => {
            const movDate = new Date(mov.timestamp);
            return movDate >= start && movDate <= end;
        });
    }

    // Métodos para configuraciones
    static saveSettings(settings) {
        return StorageManager.saveData(StorageManager.KEYS.SETTINGS, settings);
    }

    static getSettings() {
        return StorageManager.getData(StorageManager.KEYS.SETTINGS, {
            alertDays: 15, // Días antes del vencimiento para alertar
            language: 'es',
            theme: 'light',
            notifications: true
        });
    }

    static updateSetting(key, value) {
        const settings = StorageManager.getSettings();
        settings[key] = value;
        return StorageManager.saveSettings(settings);
    }

    // Métodos de utilidad para exportar/importar datos
    static exportData() {
        try {
            const data = {
                medicines: StorageManager.getMedicines(),
                movements: StorageManager.getMovements(),
                settings: StorageManager.getSettings(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exportando datos:', error);
            return null;
        }
    }

    static importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validar estructura básica
            if (!data.medicines || !Array.isArray(data.medicines)) {
                throw new Error('Datos de medicamentos inválidos');
            }

            // Importar datos
            StorageManager.saveMedicines(data.medicines);
            
            if (data.movements && Array.isArray(data.movements)) {
                StorageManager.saveMovements(data.movements);
            }
            
            if (data.settings && typeof data.settings === 'object') {
                StorageManager.saveSettings({ ...StorageManager.getSettings(), ...data.settings });
            }

            return { success: true, message: 'Datos importados correctamente' };
        } catch (error) {
            console.error('Error importando datos:', error);
            return { success: false, message: error.message };
        }
    }

    // Métodos para backup automático
    static createBackup() {
        const backup = {
            data: StorageManager.exportData(),
            timestamp: new Date().toISOString()
        };
        
        const backupKey = `backup_${Date.now()}`;
        return StorageManager.saveData(backupKey, backup);
    }

    static getBackups() {
        const backups = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup_')) {
                const backup = StorageManager.getData(key);
                if (backup) {
                    backups.push({ key, ...backup });
                }
            }
        }
        return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    static restoreBackup(backupKey) {
        const backup = StorageManager.getData(backupKey);
        if (backup && backup.data) {
            return StorageManager.importData(backup.data);
        }
        return { success: false, message: 'Backup no encontrado' };
    }

    static deleteBackup(backupKey) {
        return StorageManager.removeData(backupKey);
    }

    // Limpiar backups antiguos (mantener solo los últimos 5)
    static cleanOldBackups() {
        const backups = StorageManager.getBackups();
        if (backups.length > 5) {
            const oldBackups = backups.slice(5);
            oldBackups.forEach(backup => {
                StorageManager.deleteBackup(backup.key);
            });
        }
    }

    // Obtener estadísticas de almacenamiento
    static getStorageStats() {
        let totalSize = 0;
        let itemCount = 0;
        const stats = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            
            totalSize += size;
            itemCount++;

            // Agrupar por prefijo
            const prefix = key.split('_')[0];
            if (!stats[prefix]) {
                stats[prefix] = { count: 0, size: 0 };
            }
            stats[prefix].count++;
            stats[prefix].size += size;
        }

        return {
            totalSize: totalSize,
            itemCount: itemCount,
            categories: stats,
            maxSize: 10 * 1024 * 1024, // 10MB límite aproximado
            usagePercentage: ((totalSize / (10 * 1024 * 1024)) * 100).toFixed(2)
        };
    }

    // Verificar disponibilidad de localStorage
    static isAvailable() {
        try {
            const test = 'test_storage';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.error('localStorage no disponible:', error);
            return false;
        }
    }

    // Migrar datos de versiones anteriores
    static migrateData() {
        try {
            // Aquí se implementarían migraciones de datos
            // Por ejemplo, si cambia la estructura de los medicamentos
            console.log('Verificando necesidad de migración de datos...');
            
            const medicines = StorageManager.getMedicines();
            let needsUpdate = false;

            // Ejemplo: agregar campo 'updatedAt' si no existe
            medicines.forEach(medicine => {
                if (!medicine.updatedAt) {
                    medicine.updatedAt = medicine.createdAt || new Date().toISOString();
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                StorageManager.saveMedicines(medicines);
                console.log('Datos migrados correctamente');
            }

            return true;
        } catch (error) {
            console.error('Error en migración de datos:', error);
            return false;
        }
    }
}

// Verificar disponibilidad al cargar
if (!StorageManager.isAvailable()) {
    console.warn('LocalStorage no está disponible. Algunas funciones pueden no funcionar correctamente.');
}

// Realizar migración automática
StorageManager.migrateData();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}