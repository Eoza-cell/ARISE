
/**
 * AutonomousWorldManager - Gère l'évolution autonome du monde
 * Le monde vit même quand les joueurs sont inactifs
 */

class AutonomousWorldManager {
    constructor(gameEngine, dbManager) {
        this.gameEngine = gameEngine;
        this.dbManager = dbManager;
        this.sock = null; // Connexion WhatsApp pour envoyer les messages
        
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
     * Définit la connexion WhatsApp pour envoyer les actions PNJ
     */
    setWhatsAppConnection(sock) {
        this.sock = sock;
        console.log('📱 Connexion WhatsApp configurée pour AutonomousWorldManager');
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
     * Simule les actions autonomes des PNJ et les envoie dans le chat
     */
    async simulateNPCActions() {
        const npcProfiles = [
            { name: 'Garde Marcus', rank: 'F', actions: ['patrouille dans les rues', 'surveille les alentours', 'interpelle un suspect'] },
            { name: 'Marchand Lyra', rank: 'G', actions: ['négocie avec un client', 'compte ses pièces', 'organise ses marchandises'] },
            { name: 'Mage Eldrin', rank: 'D', actions: ['étudie un grimoire ancien', 'pratique une incantation', 'médite pour régénérer sa magie'] },
            { name: 'Forgeron Thorin', rank: 'E', actions: ['forge une épée', 'répare une armure', 'teste la solidité d\'un bouclier'] },
            { name: 'Voleur Kael', rank: 'F', actions: ['se faufile dans l\'ombre', 'observe les passants', 'planifie son prochain coup'] },
            { name: 'Prêtresse Ayla', rank: 'D', actions: ['prie dans le temple', 'guérit un blessé', 'bénit un voyageur'] },
            { name: 'Chasseur Rex', rank: 'E', actions: ['piste un animal', 'tend un piège', 'nettoie ses armes'] },
            { name: 'Noble Darius', rank: 'C', actions: ['discute de politique', 'signe des documents', 'inspecte ses terres'] },
            { name: 'Mercenaire Vex', rank: 'D', actions: ['s\'entraîne au combat', 'affûte sa lame', 'cherche un contrat'] },
            { name: 'Alchimiste Zara', rank: 'E', actions: ['prépare une potion', 'analyse une plante rare', 'mélange des ingrédients'] }
        ];
        
        const kingdoms = ['AEGYRIA', 'SOMBRENUIT', 'KHELOS', 'ABRANTIS', 'VARHA', 'SYLVARIA', 
                         'ECLYPSIA', 'TERRE_DESOLE', 'DRAK_TARR', 'URVALA', 'OMBREFIEL', 'KHALDAR'];
        
        // Simuler 2-4 PNJ actifs par cycle
        const activeNPCCount = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < activeNPCCount; i++) {
            const npcProfile = npcProfiles[Math.floor(Math.random() * npcProfiles.length)];
            const action = npcProfile.actions[Math.floor(Math.random() * npcProfile.actions.length)];
            const kingdom = kingdoms[Math.floor(Math.random() * kingdoms.length)];
            const location = this.getRandomLocation();
            const npcId = `npc_auto_${Date.now()}_${i}`;
            
            this.autonomousNPCs.set(npcId, {
                name: npcProfile.name,
                rank: npcProfile.rank,
                action,
                kingdom,
                timestamp: Date.now(),
                location
            });
            
            console.log(`🤖 PNJ autonome ${npcProfile.name} (${npcProfile.rank}) dans ${kingdom} : ${action}`);
            
            // Envoyer l'action dans le chat WhatsApp du royaume
            if (this.sock && this.gameEngine.adminManager) {
                await this.sendNPCActionToChat(npcProfile, action, kingdom, location);
            }
            
            // Délai entre chaque PNJ pour éviter le spam
            await new Promise(resolve => setTimeout(resolve, 1000));
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
     * Envoie l'action d'un PNJ dans le chat WhatsApp du royaume
     */
    async sendNPCActionToChat(npcProfile, action, kingdom, location) {
        if (!this.sock || !this.gameEngine.adminManager) return;
        
        // Trouver le groupe WhatsApp correspondant au royaume
        const chatId = this.gameEngine.adminManager.getKingdomChatId(kingdom);
        if (!chatId) {
            console.log(`⚠️ Aucun groupe WhatsApp trouvé pour ${kingdom}`);
            return;
        }
        
        // Générer une narration immersive pour l'action du PNJ
        const narrativeTexts = [
            `🎭 **${npcProfile.name}** (Rang ${npcProfile.rank})\n📍 ${location}\n\n${this.capitalize(action)}. L'air vibre d'une énergie particulière tandis que le PNJ vaque à ses occupations, inconscient d'être observé...`,
            `🌍 Dans ${location}, **${npcProfile.name}** (${npcProfile.rank}) ${action}. Ses mouvements sont naturels, comme ceux d'un véritable habitant de ce monde...`,
            `⚔️ **${npcProfile.name}** • Rang ${npcProfile.rank}\n🗺️ Localisation : ${location}\n\n${this.capitalize(action)}, totalement absorbé par sa tâche. Le monde continue de vivre, avec ou sans les joueurs...`,
            `🎯 Un mouvement attire l'attention : **${npcProfile.name}** (${npcProfile.rank}) ${action} à ${location}. La vie grouille dans chaque recoin de ce monde vivant...`
        ];
        
        const narrativeText = narrativeTexts[Math.floor(Math.random() * narrativeTexts.length)];
        
        try {
            await this.sock.sendMessage(chatId, {
                text: narrativeText
            });
            console.log(`📤 Action PNJ envoyée dans le chat ${kingdom}: ${npcProfile.name} - ${action}`);
        } catch (error) {
            console.log(`⚠️ Erreur envoi action PNJ: ${error.message}`);
        }
    }
    
    /**
     * Capitalise la première lettre d'une chaîne
     */
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
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
