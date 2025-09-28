
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class LargeDatabase {
    constructor() {
        this.dataDir = path.join(__dirname, '../data/large_storage');
        this.indexFile = path.join(this.dataDir, 'index.json');
        this.backupDir = path.join(this.dataDir, 'backups');
        this.chunkSize = 10 * 1024 * 1024; // 10MB par chunk
        this.maxStorageSize = 1000 * 1024 * 1024 * 1024; // 1TB (1000 GB)
        this.currentStorageUsed = 0;
        this.index = {};
        
        // Types de données stockables
        this.dataTypes = {
            PLAYER_DATA: 'player_data',
            WORLD_STATE: 'world_state',
            GAME_SESSIONS: 'game_sessions',
            COMBAT_LOGS: 'combat_logs',
            QUEST_DATA: 'quest_data',
            INVENTORY_DATA: 'inventory_data',
            LOCATION_DATA: 'location_data',
            NPC_DATA: 'npc_data',
            CONVERSATION_HISTORY: 'conversation_history',
            ACHIEVEMENT_DATA: 'achievement_data'
        };
    }

    async initialize() {
        try {
            // Créer les répertoires nécessaires
            await this.ensureDirectoryExists(this.dataDir);
            await this.ensureDirectoryExists(this.backupDir);
            
            // Charger l'index existant ou en créer un nouveau
            await this.loadIndex();
            
            // Calculer l'espace utilisé
            await this.calculateStorageUsage();
            
            console.log(`📊 Large Database initialisée - ${this.formatSize(this.currentStorageUsed)} utilisés`);
            
        } catch (error) {
            console.error('❌ Erreur initialisation Large Database:', error);
            throw error;
        }
    }

    async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch (error) {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    async loadIndex() {
        try {
            const indexData = await fs.readFile(this.indexFile, 'utf8');
            this.index = JSON.parse(indexData);
        } catch (error) {
            // Créer un nouvel index si le fichier n'existe pas
            this.index = {
                created: new Date().toISOString(),
                entries: {},
                totalEntries: 0,
                lastBackup: null
            };
            await this.saveIndex();
        }
    }

    async saveIndex() {
        await fs.writeFile(this.indexFile, JSON.stringify(this.index, null, 2));
    }

    async calculateStorageUsage() {
        this.currentStorageUsed = 0;
        
        const calculateDirSize = async (dirPath) => {
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                let size = 0;
                
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    
                    if (entry.isDirectory()) {
                        size += await calculateDirSize(fullPath);
                    } else {
                        const stats = await fs.stat(fullPath);
                        size += stats.size;
                    }
                }
                
                return size;
            } catch (error) {
                return 0;
            }
        };
        
        this.currentStorageUsed = await calculateDirSize(this.dataDir);
    }

    generateDataId(dataType, playerId, additional = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${dataType}_${playerId}_${timestamp}_${random}${additional}`;
    }

    getChunkPath(dataId, chunkIndex = 0) {
        const subDir = dataId.substring(0, 2);
        const chunkDir = path.join(this.dataDir, 'chunks', subDir);
        return {
            dir: chunkDir,
            file: path.join(chunkDir, `${dataId}_chunk_${chunkIndex}.dat`)
        };
    }

    async storeData(dataType, playerId, data, metadata = {}) {
        if (typeof data !== 'object') {
            throw new Error('Les données doivent être un objet');
        }

        const dataString = JSON.stringify(data);
        const dataSize = Buffer.byteLength(dataString, 'utf8');
        
        // Vérifier la limite de stockage
        if (this.currentStorageUsed + dataSize > this.maxStorageSize) {
            throw new Error(`Limite de stockage atteinte (${this.formatSize(this.maxStorageSize)})`);
        }

        const dataId = this.generateDataId(dataType, playerId);
        
        // Créer l'entrée dans l'index
        this.index.entries[dataId] = {
            id: dataId,
            type: dataType,
            playerId: playerId,
            size: dataSize,
            chunks: Math.ceil(dataSize / this.chunkSize),
            created: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            metadata: metadata,
            checksum: crypto.createHash('md5').update(dataString).digest('hex')
        };

        // Stocker les données en chunks
        await this.storeInChunks(dataId, dataString);
        
        this.index.totalEntries++;
        this.currentStorageUsed += dataSize;
        
        await this.saveIndex();
        
        console.log(`💾 Données stockées: ${dataId} (${this.formatSize(dataSize)})`);
        return dataId;
    }

    async storeInChunks(dataId, dataString) {
        const chunks = Math.ceil(dataString.length / this.chunkSize);
        
        for (let i = 0; i < chunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, dataString.length);
            const chunkData = dataString.substring(start, end);
            
            const { dir, file } = this.getChunkPath(dataId, i);
            await this.ensureDirectoryExists(dir);
            await fs.writeFile(file, chunkData, 'utf8');
        }
    }

    async retrieveData(dataId) {
        const entry = this.index.entries[dataId];
        if (!entry) {
            throw new Error(`Données non trouvées: ${dataId}`);
        }

        let dataString = '';
        
        // Reconstituer les données depuis les chunks
        for (let i = 0; i < entry.chunks; i++) {
            const { file } = this.getChunkPath(dataId, i);
            const chunkData = await fs.readFile(file, 'utf8');
            dataString += chunkData;
        }

        // Vérifier l'intégrité
        const checksum = crypto.createHash('md5').update(dataString).digest('hex');
        if (checksum !== entry.checksum) {
            throw new Error(`Données corrompues détectées pour: ${dataId}`);
        }

        // Mettre à jour l'accès
        entry.lastAccessed = new Date().toISOString();
        await this.saveIndex();

        return JSON.parse(dataString);
    }

    async deleteData(dataId) {
        const entry = this.index.entries[dataId];
        if (!entry) {
            return false;
        }

        // Supprimer tous les chunks
        for (let i = 0; i < entry.chunks; i++) {
            const { file } = this.getChunkPath(dataId, i);
            try {
                await fs.unlink(file);
            } catch (error) {
                console.log(`⚠️ Chunk non trouvé: ${file}`);
            }
        }

        this.currentStorageUsed -= entry.size;
        delete this.index.entries[dataId];
        this.index.totalEntries--;
        
        await this.saveIndex();
        
        console.log(`🗑️ Données supprimées: ${dataId}`);
        return true;
    }

    async searchData(criteria) {
        const results = [];
        
        for (const [dataId, entry] of Object.entries(this.index.entries)) {
            let matches = true;
            
            if (criteria.type && entry.type !== criteria.type) matches = false;
            if (criteria.playerId && entry.playerId !== criteria.playerId) matches = false;
            if (criteria.dateFrom && new Date(entry.created) < new Date(criteria.dateFrom)) matches = false;
            if (criteria.dateTo && new Date(entry.created) > new Date(criteria.dateTo)) matches = false;
            
            if (matches) {
                results.push({
                    id: dataId,
                    type: entry.type,
                    playerId: entry.playerId,
                    size: entry.size,
                    created: entry.created,
                    metadata: entry.metadata
                });
            }
        }
        
        return results;
    }

    async createFullBackup() {
        const backupId = `full_backup_${Date.now()}`;
        const backupPath = path.join(this.backupDir, backupId);
        
        await this.ensureDirectoryExists(backupPath);
        
        console.log(`💾 Création sauvegarde complète: ${backupId}...`);
        
        // Copier l'index
        await fs.copyFile(this.indexFile, path.join(backupPath, 'index.json'));
        
        // Copier tous les chunks
        const chunksDir = path.join(this.dataDir, 'chunks');
        const backupChunksDir = path.join(backupPath, 'chunks');
        
        try {
            await this.copyDirectoryRecursive(chunksDir, backupChunksDir);
        } catch (error) {
            console.log('⚠️ Pas de chunks à sauvegarder');
        }
        
        // Créer les métadonnées de sauvegarde
        const backupMetadata = {
            id: backupId,
            created: new Date().toISOString(),
            totalEntries: this.index.totalEntries,
            totalSize: this.currentStorageUsed,
            type: 'full_backup'
        };
        
        await fs.writeFile(
            path.join(backupPath, 'backup_metadata.json'),
            JSON.stringify(backupMetadata, null, 2)
        );
        
        this.index.lastBackup = new Date().toISOString();
        await this.saveIndex();
        
        console.log(`✅ Sauvegarde complète créée: ${backupId}`);
        console.log(`📊 ${this.index.totalEntries} entrées sauvegardées (${this.formatSize(this.currentStorageUsed)})`);
        
        return backupId;
    }

    async copyDirectoryRecursive(source, destination) {
        await this.ensureDirectoryExists(destination);
        
        const entries = await fs.readdir(source, { withFileTypes: true });
        
        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectoryRecursive(sourcePath, destPath);
            } else {
                await fs.copyFile(sourcePath, destPath);
            }
        }
    }

    async restoreFromBackup(backupId) {
        const backupPath = path.join(this.backupDir, backupId);
        
        // Vérifier que la sauvegarde existe
        try {
            await fs.access(backupPath);
        } catch (error) {
            throw new Error(`Sauvegarde non trouvée: ${backupId}`);
        }
        
        console.log(`🔄 Restauration depuis: ${backupId}...`);
        
        // Sauvegarder l'état actuel au cas où
        const emergencyBackup = await this.createFullBackup();
        console.log(`💾 Sauvegarde d'urgence créée: ${emergencyBackup}`);
        
        try {
            // Restaurer l'index
            await fs.copyFile(path.join(backupPath, 'index.json'), this.indexFile);
            await this.loadIndex();
            
            // Restaurer les chunks
            const backupChunksDir = path.join(backupPath, 'chunks');
            const currentChunksDir = path.join(this.dataDir, 'chunks');
            
            // Supprimer les chunks actuels
            try {
                await fs.rmdir(currentChunksDir, { recursive: true });
            } catch (error) {
                console.log('⚠️ Pas de chunks actuels à supprimer');
            }
            
            // Restaurer les chunks depuis la sauvegarde
            try {
                await this.copyDirectoryRecursive(backupChunksDir, currentChunksDir);
            } catch (error) {
                console.log('⚠️ Pas de chunks à restaurer');
            }
            
            await this.calculateStorageUsage();
            
            console.log(`✅ Restauration réussie depuis: ${backupId}`);
            console.log(`📊 ${this.index.totalEntries} entrées restaurées (${this.formatSize(this.currentStorageUsed)})`);
            
        } catch (error) {
            console.error(`❌ Erreur lors de la restauration: ${error.message}`);
            throw error;
        }
    }

    async getStats() {
        const stats = {
            totalEntries: this.index.totalEntries,
            storageUsed: this.currentStorageUsed,
            storageAvailable: this.maxStorageSize - this.currentStorageUsed,
            storageUsedPercent: (this.currentStorageUsed / this.maxStorageSize) * 100,
            lastBackup: this.index.lastBackup,
            dataTypes: {}
        };
        
        // Statistiques par type de données
        for (const entry of Object.values(this.index.entries)) {
            if (!stats.dataTypes[entry.type]) {
                stats.dataTypes[entry.type] = { count: 0, size: 0 };
            }
            stats.dataTypes[entry.type].count++;
            stats.dataTypes[entry.type].size += entry.size;
        }
        
        return stats;
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    async cleanup() {
        // Nettoyer les données anciennes (plus de 30 jours et pas accédées)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        
        let cleaned = 0;
        let freedSpace = 0;
        
        for (const [dataId, entry] of Object.entries(this.index.entries)) {
            const lastAccess = new Date(entry.lastAccessed);
            if (lastAccess < cutoffDate) {
                freedSpace += entry.size;
                await this.deleteData(dataId);
                cleaned++;
            }
        }
        
        console.log(`🧹 Nettoyage: ${cleaned} entrées supprimées, ${this.formatSize(freedSpace)} libérés`);
        return { cleaned, freedSpace };
    }
}

module.exports = LargeDatabase;
