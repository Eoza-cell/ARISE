
/**
 * AutonomousWorldManager - Gère l'évolution autonome du monde
 * Le monde vit même quand les joueurs sont inactifs
 */

class AutonomousWorldManager {
    constructor(gameEngine, dbManager) {
        this.gameEngine = gameEngine;
        this.dbManager = dbManager;
        
        // Événements mondiaux actifs
        this.activeEvents = new Map();
        
        // PNJ autonomes avec IA
        this.autonomousNPCs = new Map();
        
        // Progression des royaumes
        this.kingdomProgress = new Map();
        
        // Intervalles de simulation
        this.eventInterval = null;
        this.npcInterval = null;
        this.kingdomInterval = null;
        
        console.log('🌍 AutonomousWorldManager initialisé - Le monde vit de manière autonome');
    }
    
    /**
     * Démarre la simulation autonome du monde
     */
    startAutonomousSimulation() {
        // Événements mondiaux toutes les 5 minutes
        this.eventInterval = setInterval(() => {
            this.generateWorldEvent();
        }, 300000); // 5 minutes
        
        // Actions PNJ autonomes toutes les 2 minutes
        this.npcInterval = setInterval(() => {
            this.simulateNPCActions();
        }, 120000); // 2 minutes
        
        // Progression des royaumes toutes les 30 minutes
        this.kingdomInterval = setInterval(() => {
            this.updateKingdomProgress();
        }, 1800000); // 30 minutes
        
        console.log('🎬 Simulation autonome démarrée - Le monde évolue en continu');
        
        // Lancer immédiatement un événement de démarrage
        setTimeout(() => this.generateWorldEvent(), 5000);
    }
    
    /**
     * Génère un événement mondial aléatoire
     */
    async generateWorldEvent() {
        const eventTypes = [
            {
                type: 'INVASION',
                description: 'Une horde de monstres envahit un royaume',
                impact: 'high',
                duration: 3600000 // 1 heure
            },
            {
                type: 'FESTIVAL',
                description: 'Un festival célèbre dans une capitale',
                impact: 'medium',
                duration: 7200000 // 2 heures
            },
            {
                type: 'CATASTROPHE',
                description: 'Une catastrophe naturelle frappe une région',
                impact: 'critical',
                duration: 1800000 // 30 minutes
            },
            {
                type: 'DÉCOUVERTE',
                description: 'Un donjon ancien est découvert',
                impact: 'medium',
                duration: 10800000 // 3 heures
            },
            {
                type: 'CONFLIT',
                description: 'Tensions entre deux royaumes',
                impact: 'high',
                duration: 14400000 // 4 heures
            }
        ];
        
        const kingdoms = ['AEGYRIA', 'SOMBRENUIT', 'KHELOS', 'ABRANTIS', 'VARHA', 'SYLVARIA', 
                         'ECLYPSIA', 'TERRE_DESOLE', 'DRAK_TARR', 'URVALA', 'OMBREFIEL', 'KHALDAR'];
        
        const selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const affectedKingdom = kingdoms[Math.floor(Math.random() * kingdoms.length)];
        
        const worldEvent = {
            id: `event_${Date.now()}`,
            type: selectedEvent.type,
            kingdom: affectedKingdom,
            description: selectedEvent.description,
            impact: selectedEvent.impact,
            startTime: Date.now(),
            endTime: Date.now() + selectedEvent.duration,
            active: true
        };
        
        this.activeEvents.set(worldEvent.id, worldEvent);
        
        // Sauvegarder l'événement dans la base de données
        await this.dbManager.setTemporaryData('world_events', `event_${worldEvent.id}`, worldEvent);
        
        console.log(`🌍 Événement mondial : ${selectedEvent.type} dans ${affectedKingdom}`);
        
        // Programmer la fin de l'événement
        setTimeout(() => {
            this.endWorldEvent(worldEvent.id);
        }, selectedEvent.duration);
        
        return worldEvent;
    }
    
    /**
     * Termine un événement mondial
     */
    async endWorldEvent(eventId) {
        const event = this.activeEvents.get(eventId);
        if (event) {
            event.active = false;
            this.activeEvents.delete(eventId);
            
            console.log(`✅ Événement terminé : ${event.type} dans ${event.kingdom}`);
            
            // Appliquer les conséquences de l'événement
            await this.applyEventConsequences(event);
        }
    }
    
    /**
     * Applique les conséquences d'un événement
     */
    async applyEventConsequences(event) {
        const kingdomProgress = this.kingdomProgress.get(event.kingdom) || {
            prosperity: 50,
            military: 50,
            magic: 50,
            technology: 50
        };
        
        switch (event.type) {
            case 'INVASION':
                kingdomProgress.military += 10;
                kingdomProgress.prosperity -= 5;
                break;
            case 'FESTIVAL':
                kingdomProgress.prosperity += 15;
                break;
            case 'CATASTROPHE':
                kingdomProgress.prosperity -= 20;
                kingdomProgress.military -= 10;
                break;
            case 'DÉCOUVERTE':
                kingdomProgress.magic += 10;
                kingdomProgress.technology += 5;
                break;
            case 'CONFLIT':
                kingdomProgress.military += 15;
                kingdomProgress.prosperity -= 10;
                break;
        }
        
        this.kingdomProgress.set(event.kingdom, kingdomProgress);
        await this.dbManager.setTemporaryData('kingdom_progress', event.kingdom, kingdomProgress);
    }
    
    /**
     * Simule les actions autonomes des PNJ
     */
    async simulateNPCActions() {
        const npcActions = [
            'patrouille dans sa zone',
            'commerce avec d\'autres PNJ',
            's\'entraîne au combat',
            'étudie des sorts anciens',
            'répare son équipement',
            'planifie une expédition',
            'négocie avec un marchand',
            'médite pour régénérer sa magie'
        ];
        
        // Simuler 5-10 PNJ actifs
        const activeNPCCount = Math.floor(Math.random() * 6) + 5;
        
        for (let i = 0; i < activeNPCCount; i++) {
            const action = npcActions[Math.floor(Math.random() * npcActions.length)];
            const npcId = `npc_auto_${Date.now()}_${i}`;
            
            this.autonomousNPCs.set(npcId, {
                action,
                timestamp: Date.now(),
                location: this.getRandomLocation()
            });
            
            console.log(`🤖 PNJ autonome ${npcId} : ${action}`);
        }
        
        // Nettoyer les anciennes actions (plus de 10 minutes)
        const now = Date.now();
        for (const [npcId, data] of this.autonomousNPCs.entries()) {
            if (now - data.timestamp > 600000) {
                this.autonomousNPCs.delete(npcId);
            }
        }
    }
    
    /**
     * Met à jour la progression des royaumes
     */
    async updateKingdomProgress() {
        const kingdoms = ['AEGYRIA', 'SOMBRENUIT', 'KHELOS', 'ABRANTIS', 'VARHA', 'SYLVARIA', 
                         'ECLYPSIA', 'TERRE_DESOLE', 'DRAK_TARR', 'URVALA', 'OMBREFIEL', 'KHALDAR'];
        
        for (const kingdom of kingdoms) {
            let progress = this.kingdomProgress.get(kingdom) || {
                prosperity: 50,
                military: 50,
                magic: 50,
                technology: 50,
                lastUpdate: Date.now()
            };
            
            // Évolution naturelle du royaume
            progress.prosperity += Math.floor(Math.random() * 3) - 1; // -1 à +1
            progress.military += Math.floor(Math.random() * 3) - 1;
            progress.magic += Math.floor(Math.random() * 3) - 1;
            progress.technology += Math.floor(Math.random() * 3) - 1;
            
            // Limiter les valeurs entre 0 et 100
            progress.prosperity = Math.max(0, Math.min(100, progress.prosperity));
            progress.military = Math.max(0, Math.min(100, progress.military));
            progress.magic = Math.max(0, Math.min(100, progress.magic));
            progress.technology = Math.max(0, Math.min(100, progress.technology));
            
            progress.lastUpdate = Date.now();
            
            this.kingdomProgress.set(kingdom, progress);
            await this.dbManager.setTemporaryData('kingdom_progress', kingdom, progress);
            
            console.log(`👑 ${kingdom} - P:${progress.prosperity} M:${progress.military} Ma:${progress.magic} T:${progress.technology}`);
        }
    }
    
    /**
     * Obtient une localisation aléatoire
     */
    getRandomLocation() {
        const locations = [
            'Village de Valorhall',
            'Forêt Sombre',
            'Montagnes du Nord',
            'Désert de Khelos',
            'Port d\'Abrantis',
            'Toundra de Varha',
            'Forêt Enchantée de Sylvaria',
            'Ruines d\'Eclypsia',
            'Terres Désolées',
            'Cavernes de Drak-Tarr',
            'Marais d\'Urvala',
            'Citadelle d\'Ombrefiel',
            'Oasis de Khaldar'
        ];
        
        return locations[Math.floor(Math.random() * locations.length)];
    }
    
    /**
     * Obtient l'état actuel du monde
     */
    getWorldState() {
        return {
            activeEvents: Array.from(this.activeEvents.values()),
            autonomousNPCs: Array.from(this.autonomousNPCs.entries()).map(([id, data]) => ({
                id,
                ...data
            })),
            kingdomProgress: Object.fromEntries(this.kingdomProgress),
            timestamp: Date.now()
        };
    }
    
    /**
     * Arrête la simulation autonome
     */
    stopAutonomousSimulation() {
        if (this.eventInterval) clearInterval(this.eventInterval);
        if (this.npcInterval) clearInterval(this.npcInterval);
        if (this.kingdomInterval) clearInterval(this.kingdomInterval);
        
        console.log('⏸️ Simulation autonome arrêtée');
    }
}

module.exports = AutonomousWorldManager;
