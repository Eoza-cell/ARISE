
```javascript
/**
 * CounterAttackSystem - Système de contre-attaque et riposte automatique
 * Gère les ripostes basées sur le timing et la précision des défenseurs
 */

class CounterAttackSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.activeCounters = new Map(); // actionId -> counterData
        
        // Fenêtres de timing pour ripostes réussies
        this.counterWindows = {
            'perfect': { min: 0, max: 0.2, damageMultiplier: 2.5, successRate: 1.0 }, // 0-20% du temps
            'good': { min: 0.2, max: 0.5, damageMultiplier: 1.8, successRate: 0.85 }, // 20-50%
            'normal': { min: 0.5, max: 0.75, damageMultiplier: 1.3, successRate: 0.6 }, // 50-75%
            'late': { min: 0.75, max: 0.95, damageMultiplier: 0.8, successRate: 0.3 }, // 75-95%
            'failed': { min: 0.95, max: 1.0, damageMultiplier: 0, successRate: 0 } // 95-100%
        };
        
        console.log('⚔️ CounterAttackSystem initialisé - Ripostes automatiques activées');
    }
    
    /**
     * Enregistre une opportunité de contre-attaque
     */
    registerCounterOpportunity(actionId, attackerData, defenderData, attackDetails) {
        const counterData = {
            actionId,
            attacker: attackerData,
            defender: defenderData,
            attackDetails,
            startTime: Date.now(),
            windowDuration: this.calculateCounterWindow(defenderData.powerLevel),
            status: 'waiting'
        };
        
        this.activeCounters.set(actionId, counterData);
        
        console.log(`🛡️ Opportunité de riposte enregistrée: ${actionId} (fenêtre: ${counterData.windowDuration}ms)`);
        
        return counterData;
    }
    
    /**
     * Calcule la fenêtre de contre-attaque basée sur le rang
     */
    calculateCounterWindow(powerLevel) {
        const baseWindows = {
            'G': 360000, 'F': 300000, 'E': 240000, 'D': 180000,
            'C': 120000, 'B': 60000, 'A': 30000, 'S': 15000,
            'S+': 10000, 'SS': 8000, 'SSS': 5000, 'MONARQUE': 3000
        };
        
        return baseWindows[powerLevel] || baseWindows['G'];
    }
    
    /**
     * Traite une tentative de contre-attaque
     */
    async processCounterAttempt(actionId, counterAction, character) {
        const counterData = this.activeCounters.get(actionId);
        if (!counterData || counterData.status !== 'waiting') {
            return {
                success: false,
                reason: 'Aucune opportunité de riposte active'
            };
        }
        
        // Calculer le timing de la riposte
        const elapsed = Date.now() - counterData.startTime;
        const timingPercent = elapsed / counterData.windowDuration;
        
        // Déterminer la qualité du timing
        const timing = this.evaluateTiming(timingPercent);
        
        // Analyser la précision de l'action de riposte
        const precision = this.gameEngine.precisionActionSystem.calculatePrecisionLevel(counterAction);
        
        // Calculer le succès de la riposte
        const roll = Math.random();
        const success = roll < timing.successRate;
        
        counterData.status = success ? 'success' : 'failed';
        
        const result = {
            success,
            timing: timing.name,
            timingPercent: (timingPercent * 100).toFixed(1),
            precision,
            damageMultiplier: timing.damageMultiplier,
            elapsedTime: elapsed,
            message: this.generateCounterMessage(success, timing, precision, counterAction, counterData)
        };
        
        this.activeCounters.delete(actionId);
        
        console.log(`⚔️ Riposte ${success ? 'RÉUSSIE' : 'ÉCHOUÉE'}: ${timing.name} (${result.timingPercent}%)`);
        
        return result;
    }
    
    /**
     * Évalue la qualité du timing
     */
    evaluateTiming(percent) {
        for (const [name, window] of Object.entries(this.counterWindows)) {
            if (percent >= window.min && percent < window.max) {
                return { name, ...window };
            }
        }
        return { name: 'failed', ...this.counterWindows.failed };
    }
    
    /**
     * Génère un message détaillé de riposte
     */
    generateCounterMessage(success, timing, precision, action, counterData) {
        const timeMs = Date.now() - counterData.startTime;
        const timeSec = (timeMs / 1000).toFixed(2);
        
        if (!success) {
            return `❌ **RIPOSTE ÉCHOUÉE** ❌

⏱️ **Timing:** ${timing.name.toUpperCase()} (${timeSec}s de réaction)
🎯 **Précision:** ${precision}
💔 **Raté:** Temps de réaction insuffisant ou action imprécise

**Action tentée:** "${action}"
**Attaque adverse:** ${counterData.attackDetails.description || 'Attaque rapide'}

⚠️ Vous êtes maintenant VULNÉRABLE à l'attaque !`;
        }
        
        const bonusMessages = {
            'perfect': '🌟 RIPOSTE PARFAITE ! Timing exceptionnel !',
            'good': '✅ BONNE RIPOSTE ! Réaction rapide et efficace',
            'normal': '👍 RIPOSTE CORRECTE ! Timing acceptable',
            'late': '⚡ RIPOSTE TARDIVE ! Juste à temps'
        };
        
        return `✨ **RIPOSTE RÉUSSIE !** ✨

${bonusMessages[timing.name] || ''}

⏱️ **Timing:** ${timing.name.toUpperCase()} (${timeSec}s de réaction)
🎯 **Précision:** ${precision}
💥 **Multiplicateur de dégâts:** x${timing.damageMultiplier}
📊 **Taux de réussite:** ${(timing.successRate * 100).toFixed(0)}%

**Riposte exécutée:** "${action}"
**Distance estimée:** ${this.extractDistance(action) || '2-3 mètres'}
**Angle d'attaque:** ${this.extractAngle(action) || 'frontal'}

🎯 Votre contre-attaque bénéficie d'un bonus de ${((timing.damageMultiplier - 1) * 100).toFixed(0)}% !`;
    }
    
    /**
     * Extrait la distance d'une action
     */
    extractDistance(action) {
        const distanceMatch = action.match(/(\d+)\s*(mètre|m|cm)/i);
        return distanceMatch ? `${distanceMatch[1]}${distanceMatch[2]}` : null;
    }
    
    /**
     * Extrait l'angle d'une action
     */
    extractAngle(action) {
        const angleMatch = action.match(/(\d+)\s*(degré|°)/i);
        if (angleMatch) return `${angleMatch[1]}°`;
        
        if (/circulaire/i.test(action)) return 'circulaire (180°)';
        if (/latéral/i.test(action)) return 'latéral (90°)';
        if (/frontal|direct/i.test(action)) return 'frontal (0°)';
        
        return null;
    }
    
    /**
     * Nettoie les opportunités expirées
     */
    cleanExpiredCounters() {
        const now = Date.now();
        for (const [actionId, counterData] of this.activeCounters.entries()) {
            if (counterData.status === 'waiting' && 
                now - counterData.startTime > counterData.windowDuration) {
                counterData.status = 'expired';
                this.activeCounters.delete(actionId);
                console.log(`⏰ Opportunité de riposte expirée: ${actionId}`);
            }
        }
    }
}

module.exports = CounterAttackSystem;
```
