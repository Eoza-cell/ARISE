/**
 * Système de Précision d'Actions avec Immobilisation
 * Implémente le mécanisme où les actions ratées immobilisent temporairement le joueur
 * pendant que les PNJ continuent leurs timers et peuvent profiter de cette vulnérabilité
 */

class PrecisionActionSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Suivi des immobilisations actives par joueur
        this.immobilizedPlayers = new Map(); // playerId => immobilizationData
        
        // Suivi des échecs consécutifs pour pénalités cumulatives
        this.consecutiveFailures = new Map(); // playerId => failureCount
        
        // Timer de réinitialisation des échecs consécutifs
        this.failureResetTimers = new Map(); // playerId => timer
        
        // Seuils de précision pour déterminer l'immobilisation
        this.precisionThresholds = {
            // Très précise - aucun risque d'immobilisation
            'very_high': { minWords: 25, hasMetrics: true, immobilizationRisk: 0 },
            
            // Précise - risque minimal
            'high': { minWords: 15, hasDetails: true, immobilizationRisk: 0.1 },
            
            // Moyennement précise - risque modéré
            'medium': { minWords: 8, hasBasicDetails: true, immobilizationRisk: 0.3 },
            
            // Peu précise - risque élevé
            'low': { minWords: 5, hasBasicDetails: false, immobilizationRisk: 0.7 },
            
            // Très vague - échec presque garanti
            'very_low': { minWords: 0, hasBasicDetails: false, immobilizationRisk: 0.9 }
        };
        
        // Durées d'immobilisation selon la gravité de l'erreur
        this.immobilizationDurations = {
            'light_mistake': 2000,    // 2 secondes
            'moderate_mistake': 4000, // 4 secondes
            'heavy_mistake': 6000,    // 6 secondes
            'critical_failure': 8000, // 8 secondes
            'catastrophic_failure': 12000 // 12 secondes
        };
        
        console.log('⚔️ PrecisionActionSystem initialisé - Système d\'immobilisation actif');
    }
    
    /**
     * Analyse la précision d'une action et détermine si elle échoue
     */
    async analyzeActionPrecision(action, character, npcContext = null) {
        // Calculer le niveau de précision de l'action
        const precisionLevel = this.calculatePrecisionLevel(action);
        
        // Vérifier si le joueur est actuellement immobilisé
        if (this.isPlayerImmobilized(character.playerId)) {
            return {
                success: false,
                reason: 'immobilized',
                message: this.getImmobilizationMessage(character.playerId),
                remainingTime: this.getRemainingImmobilizationTime(character.playerId)
            };
        }
        
        // Calculer la probabilité d'échec
        const baseFailureChance = this.precisionThresholds[precisionLevel].immobilizationRisk;
        const consecutiveFailuresPenalty = this.getConsecutiveFailuresPenalty(character.playerId);
        const npcLevelModifier = this.getNPCLevelModifier(npcContext);
        
        const totalFailureChance = Math.min(0.95, baseFailureChance + consecutiveFailuresPenalty + npcLevelModifier);
        
        // Jet de dé pour déterminer le succès/échec
        const roll = Math.random();
        const actionFails = roll < totalFailureChance;
        
        if (actionFails) {
            // L'action échoue - déterminer la gravité et immobiliser
            const failureSeverity = this.calculateFailureSeverity(precisionLevel, consecutiveFailuresPenalty, roll);
            const immobilizationDuration = this.immobilizationDurations[failureSeverity];
            
            await this.immobilizePlayer(character.playerId, failureSeverity, immobilizationDuration, action);
            this.incrementConsecutiveFailures(character.playerId);
            
            return {
                success: false,
                reason: 'action_failed',
                severity: failureSeverity,
                immobilizationDuration,
                precisionLevel,
                failureChance: totalFailureChance * 100,
                message: this.generateFailureMessage(action, failureSeverity, immobilizationDuration)
            };
        } else {
            // L'action réussit - réinitialiser les échecs consécutifs
            this.resetConsecutiveFailures(character.playerId);
            
            return {
                success: true,
                precisionLevel,
                message: this.generateSuccessMessage(action, precisionLevel),
                bonusEffects: this.calculateSuccessBonus(precisionLevel)
            };
        }
    }
    
    /**
     * Calcule le niveau de précision d'une action basé sur le contenu
     */
    calculatePrecisionLevel(action) {
        const actionLower = action.toLowerCase();
        const wordCount = action.split(' ').filter(word => word.length > 2).length;
        
        // Critères de précision
        const hasMetrics = /\d+\s*(mètre|cm|degré|angle|seconde)/.test(actionLower);
        const hasDirection = /(gauche|droite|devant|derrière|diagonal|vertical|horizontal)/.test(actionLower);
        const hasSpecificTarget = /(tête|jambe|bras|torse|cou|épaule|genou|cheville)/.test(actionLower);
        const hasTechnique = /(uppercut|crochet|direct|jab|cross|feinte|esquive|parade|riposte)/.test(actionLower);
        const hasEquipment = /(épée|dague|bouclier|lance|arc|bâton|masse|hache)/.test(actionLower);
        const hasPosition = /(accroupi|debout|en garde|en position|en appui|en équilibre)/.test(actionLower);
        
        // Calcul du score de précision
        let precisionScore = 0;
        
        if (wordCount >= 25 && hasMetrics) precisionScore += 4;
        else if (wordCount >= 15) precisionScore += 3;
        else if (wordCount >= 8) precisionScore += 2;
        else if (wordCount >= 5) precisionScore += 1;
        
        if (hasDirection) precisionScore += 1;
        if (hasSpecificTarget) precisionScore += 1;
        if (hasTechnique) precisionScore += 2;
        if (hasEquipment) precisionScore += 1;
        if (hasPosition) precisionScore += 1;
        if (hasMetrics) precisionScore += 2;
        
        // Conversion en niveau de précision
        if (precisionScore >= 8) return 'very_high';
        if (precisionScore >= 6) return 'high';
        if (precisionScore >= 4) return 'medium';
        if (precisionScore >= 2) return 'low';
        return 'very_low';
    }
    
    /**
     * Immobilise un joueur pour une durée donnée
     */
    async immobilizePlayer(playerId, severity, duration, failedAction) {
        const immobilizationData = {
            playerId,
            severity,
            duration,
            startTime: Date.now(),
            endTime: Date.now() + duration,
            failedAction,
            hasBeenWarned: false
        };
        
        this.immobilizedPlayers.set(playerId, immobilizationData);
        
        // Programmer la fin automatique de l'immobilisation
        setTimeout(() => {
            this.removeImmobilization(playerId);
        }, duration);
        
        console.log(`⚠️ Joueur ${playerId} immobilisé pour ${duration}ms (${severity})`);
        
        // Notifier les NPJ de l'opportunité
        await this.notifyNPCsOfPlayerVulnerability(playerId, duration);
    }
    
    /**
     * Vérifie si un joueur est actuellement immobilisé
     */
    isPlayerImmobilized(playerId) {
        const immobilization = this.immobilizedPlayers.get(playerId);
        if (!immobilization) return false;
        
        return Date.now() < immobilization.endTime;
    }
    
    /**
     * Obtient le temps restant d'immobilisation
     */
    getRemainingImmobilizationTime(playerId) {
        const immobilization = this.immobilizedPlayers.get(playerId);
        if (!immobilization) return 0;
        
        return Math.max(0, immobilization.endTime - Date.now());
    }
    
    /**
     * Supprime l'immobilisation d'un joueur
     */
    removeImmobilization(playerId) {
        if (this.immobilizedPlayers.has(playerId)) {
            this.immobilizedPlayers.delete(playerId);
            console.log(`✅ Joueur ${playerId} n'est plus immobilisé`);
        }
    }
    
    /**
     * Calcule la pénalité pour échecs consécutifs
     */
    getConsecutiveFailuresPenalty(playerId) {
        const failures = this.consecutiveFailures.get(playerId) || 0;
        return Math.min(0.3, failures * 0.05); // Maximum 30% de pénalité
    }
    
    /**
     * Incrémente les échecs consécutifs
     */
    incrementConsecutiveFailures(playerId) {
        const current = this.consecutiveFailures.get(playerId) || 0;
        this.consecutiveFailures.set(playerId, current + 1);
        
        // Programmer la réinitialisation après 2 minutes sans échec
        if (this.failureResetTimers.has(playerId)) {
            clearTimeout(this.failureResetTimers.get(playerId));
        }
        
        const timer = setTimeout(() => {
            this.resetConsecutiveFailures(playerId);
        }, 120000); // 2 minutes
        
        this.failureResetTimers.set(playerId, timer);
    }
    
    /**
     * Réinitialise les échecs consécutifs
     */
    resetConsecutiveFailures(playerId) {
        this.consecutiveFailures.delete(playerId);
        if (this.failureResetTimers.has(playerId)) {
            clearTimeout(this.failureResetTimers.get(playerId));
            this.failureResetTimers.delete(playerId);
        }
    }
    
    /**
     * Calcule la gravité de l'échec
     */
    calculateFailureSeverity(precisionLevel, consecutiveFailuresPenalty, rollResult) {
        const severityScore = (this.precisionThresholds[precisionLevel].immobilizationRisk * 5) + 
                             (consecutiveFailuresPenalty * 10) + 
                             (rollResult * 3);
        
        if (severityScore >= 4.5) return 'catastrophic_failure';
        if (severityScore >= 3.5) return 'critical_failure';
        if (severityScore >= 2.5) return 'heavy_mistake';
        if (severityScore >= 1.5) return 'moderate_mistake';
        return 'light_mistake';
    }
    
    /**
     * Génère un message d'échec avec détails
     */
    generateFailureMessage(action, severity, duration) {
        const durationSeconds = Math.round(duration / 1000);
        
        const severityMessages = {
            'light_mistake': '⚠️ **Action ratée !** Tu trébuches légèrement...',
            'moderate_mistake': '💥 **Échec !** Ta maladresse te déstabilise...',
            'heavy_mistake': '😵 **Gros échec !** Tu perds complètement l\'équilibre...',
            'critical_failure': '🤕 **Échec critique !** Tu chutes lourdement...',
            'catastrophic_failure': '💀 **Échec catastrophique !** Tu t\'effondres pathétiquement...'
        };
        
        const consequences = {
            'light_mistake': 'Tu restes immobile pendant',
            'moderate_mistake': 'Tu es désorienté pour',
            'heavy_mistake': 'Tu es complètement vulnérable pendant',
            'critical_failure': 'Tu es à terre et sans défense pour',
            'catastrophic_failure': 'Tu es hors de combat pendant'
        };
        
        return `${severityMessages[severity]}
        
${consequences[severity]} **${durationSeconds}s** ⏱️

🎯 **Action tentée :** "${action}"
⚡ **Conséquence :** Immobilisation temporaire
🛡️ **État :** Vulnérable aux attaques PNJ`;
    }
    
    /**
     * Génère un message de succès
     */
    generateSuccessMessage(action, precisionLevel) {
        const successMessages = {
            'very_high': '🎯 **Exécution parfaite !** Action d\'une précision chirurgicale.',
            'high': '✅ **Bien exécuté !** Action précise et efficace.',
            'medium': '👍 **Correct !** Action basique mais solide.',
            'low': '⚡ **Réussi de justesse !** Action imprécise mais qui passe.',
            'very_low': '🍀 **Coup de chance !** Action bâclée mais miraculeusement réussie.'
        };
        
        return successMessages[precisionLevel] || '✅ Action réussie';
    }
    
    /**
     * Notifie les NPJ qu'un joueur est vulnérable
     */
    async notifyNPCsOfPlayerVulnerability(playerId, vulnerabilityDuration) {
        // Cette méthode sera appelée par le GameEngine pour que les NPJ 
        // puissent accélérer leurs timers ou attaquer immédiatement
        if (this.gameEngine.activeNPCs) {
            for (const [npcId, npcData] of this.gameEngine.activeNPCs.entries()) {
                if (npcData.targetPlayerId === playerId) {
                    // Réduire drastiquement le timer du NPJ
                    const currentTimer = npcData.remainingTime || 0;
                    const acceleratedTimer = Math.min(currentTimer, vulnerabilityDuration / 2);
                    
                    console.log(`🚨 NPJ ${npcId} accélère son attaque: ${currentTimer}ms -> ${acceleratedTimer}ms`);
                    
                    // Mettre à jour le timer du NPJ
                    npcData.remainingTime = acceleratedTimer;
                    npcData.isTargetingVulnerablePlayer = true;
                }
            }
        }
    }
    
    /**
     * Obtient le modificateur basé sur le niveau du NPJ
     */
    getNPCLevelModifier(npcContext) {
        if (!npcContext || !npcContext.level) return 0;
        
        const npcLevelModifiers = {
            'G': 0,
            'F': 0.02,
            'E': 0.04,
            'D': 0.06,
            'C': 0.08,
            'B': 0.1,
            'A': 0.12,
            'S': 0.15,
            'S+': 0.18,
            'SS': 0.22,
            'SSS': 0.25,
            'MONARQUE': 0.3
        };
        
        return npcLevelModifiers[npcContext.level] || 0;
    }
    
    /**
     * Calcule les bonus pour actions très précises
     */
    calculateSuccessBonus(precisionLevel) {
        const bonuses = {
            'very_high': {
                damageMultiplier: 1.5,
                energyCostReduction: 0.8,
                criticalChance: 0.3,
                reputationBonus: 2
            },
            'high': {
                damageMultiplier: 1.3,
                energyCostReduction: 0.9,
                criticalChance: 0.2,
                reputationBonus: 1
            },
            'medium': {
                damageMultiplier: 1.0,
                energyCostReduction: 1.0,
                criticalChance: 0.1,
                reputationBonus: 0
            },
            'low': {
                damageMultiplier: 0.8,
                energyCostReduction: 1.2,
                criticalChance: 0.05,
                reputationBonus: 0
            },
            'very_low': {
                damageMultiplier: 0.6,
                energyCostReduction: 1.5,
                criticalChance: 0,
                reputationBonus: -1
            }
        };
        
        return bonuses[precisionLevel] || bonuses['medium'];
    }
    
    /**
     * Obtient le message d'immobilisation actuelle
     */
    getImmobilizationMessage(playerId) {
        const immobilization = this.immobilizedPlayers.get(playerId);
        if (!immobilization) return '';
        
        const remainingTime = Math.ceil(this.getRemainingImmobilizationTime(playerId) / 1000);
        
        return `🚫 **IMMOBILISÉ !**

Tu es actuellement **${immobilization.severity}** et ne peux pas agir.

⏱️ **Temps restant :** ${remainingTime}s
⚡ **Cause :** Action ratée - "${immobilization.failedAction}"
🛡️ **État :** Vulnérable aux attaques

⚠️ Attends la fin de l'immobilisation pour agir à nouveau !`;
    }
    
    /**
     * Obtient les statistiques d'un joueur
     */
    getPlayerStats(playerId) {
        return {
            isImmobilized: this.isPlayerImmobilized(playerId),
            remainingImmobilizationTime: this.getRemainingImmobilizationTime(playerId),
            consecutiveFailures: this.consecutiveFailures.get(playerId) || 0,
            failurePenalty: this.getConsecutiveFailuresPenalty(playerId)
        };
    }
}

module.exports = PrecisionActionSystem;