/**
 * HealthBarManager - Gère les barres de vie, énergie et mana avec les symboles spécifiés
 */
class HealthBarManager {
    constructor() {
        // Symboles pour les barres de progression
        this.filledBar = '▰';
        this.emptyBar = '▱';
        this.maxBarLength = 10; // Longueur standard des barres
    }

    /**
     * Génère une barre de progression personnalisée
     * @param {number} current - Valeur actuelle
     * @param {number} maximum - Valeur maximale  
     * @param {number} barLength - Longueur de la barre (défaut: 10)
     * @returns {string} Barre de progression
     */
    generateBar(current, maximum, barLength = this.maxBarLength) {
        if (maximum <= 0) return this.emptyBar.repeat(barLength);
        
        const percentage = Math.max(0, Math.min(1, current / maximum));
        const filledSegments = Math.floor(percentage * barLength);
        const emptySegments = barLength - filledSegments;
        
        return this.filledBar.repeat(filledSegments) + this.emptyBar.repeat(emptySegments);
    }

    /**
     * Génère la barre de vie complète avec infos
     * @param {Object} character - Personnage avec stats
     * @returns {string} Affichage complet des barres
     */
    generateHealthDisplay(character) {
        const health = character.health || 0;
        const maxHealth = character.maxHealth || 100;
        const energy = character.energy || 0;
        const maxEnergy = character.maxEnergy || 100;
        const mana = character.mana || 0;
        const maxMana = character.maxMana || 50;
        const aura = character.aura || 0;
        const maxAura = character.maxAura || 10;

        const healthBar = this.generateBar(health, maxHealth);
        const energyBar = this.generateBar(energy, maxEnergy);
        const manaBar = this.generateBar(mana, maxMana);
        const auraBar = this.generateBar(aura, maxAura);

        return `❤️ **VIE** (${health}/${maxHealth})
${healthBar}

⚡ **ÉNERGIE** (${energy}/${maxEnergy})
${energyBar}

🔮 **MANA** (${mana}/${maxMana})
${manaBar}

✨ **AURA** (${aura}/${maxAura})
${auraBar}`;
    }

    /**
     * Génère un affichage compact des barres
     * @param {Object} character - Personnage avec stats
     * @returns {string} Affichage compact
     */
    generateCompactDisplay(character) {
        const health = character.health || 0;
        const maxHealth = character.maxHealth || 100;
        const energy = character.energy || 0;
        const maxEnergy = character.maxEnergy || 100;

        const healthBar = this.generateBar(health, maxHealth, 5);
        const energyBar = this.generateBar(energy, maxEnergy, 5);

        return `❤️${healthBar}(${health}) ⚡${energyBar}(${energy})`;
    }

    /**
     * Génère une barre de régénération avec compte à rebours
     * @param {number} timeLeft - Temps restant en secondes
     * @param {number} totalTime - Temps total de régénération
     * @param {string} type - Type de régénération (vie, énergie, mana, aura)
     * @returns {string} Barre de régénération
     */
    generateRegenerationBar(timeLeft, totalTime, type = 'énergie') {
        const progress = Math.max(0, (totalTime - timeLeft) / totalTime);
        const bar = this.generateBar(progress * 100, 100);
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        const emojis = {
            'vie': '❤️',
            'énergie': '⚡',
            'mana': '🔮',
            'aura': '✨'
        };

        return `${emojis[type] || '⚡'} **RÉGÉNÉRATION ${type.toUpperCase()}**
${bar}
⏱️ Temps restant: **${timeDisplay}**
📈 Progression: **${Math.floor(progress * 100)}%**`;
    }

    /**
     * Génère une barre de dégâts avec effet visuel
     * @param {number} damage - Dégâts infligés
     * @param {number} maxHealth - Vie maximale
     * @returns {string} Affichage des dégâts
     */
    generateDamageBar(damage, maxHealth) {
        const damagePercentage = Math.min(1, damage / maxHealth);
        const damageSegments = Math.floor(damagePercentage * this.maxBarLength);
        
        // Créer une barre rouge pour les dégâts
        let damageBar = '';
        for (let i = 0; i < this.maxBarLength; i++) {
            if (i < damageSegments) {
                damageBar += '🔥'; // Dégâts
            } else {
                damageBar += this.emptyBar;
            }
        }

        return `💥 **DÉGÂTS SUBIS**
${damageBar}
🩸 Perte: **${damage}** points de vie`;
    }

    /**
     * Génère l'affichage des barres pour le combat
     * @param {Object} attacker - Attaquant
     * @param {Object} defender - Défenseur
     * @returns {string} Affichage combat
     */
    generateCombatDisplay(attacker, defender) {
        const attackerHealth = this.generateBar(attacker.health, attacker.maxHealth, 8);
        const defenderHealth = this.generateBar(defender.health, defender.maxHealth, 8);

        return `⚔️ **COMBAT EN COURS**

🛡️ **${attacker.name}** (${attacker.powerLevel})
❤️ ${attackerHealth} (${attacker.health}/${attacker.maxHealth})

🎯 **${defender.name}** (${defender.powerLevel})
❤️ ${defenderHealth} (${defender.health}/${defender.maxHealth})`;
    }

    /**
     * Calcule l'état critique des barres
     * @param {Object} character - Personnage
     * @returns {Object} État des barres
     */
    getBarStatus(character) {
        const healthPercentage = (character.health || 0) / (character.maxHealth || 100);
        const energyPercentage = (character.energy || 0) / (character.maxEnergy || 100);
        const manaPercentage = (character.mana || 0) / (character.maxMana || 50);

        return {
            health: {
                percentage: healthPercentage,
                status: healthPercentage > 0.7 ? 'good' : healthPercentage > 0.3 ? 'warning' : 'critical',
                color: healthPercentage > 0.7 ? '🟢' : healthPercentage > 0.3 ? '🟡' : '🔴'
            },
            energy: {
                percentage: energyPercentage,
                status: energyPercentage > 0.7 ? 'good' : energyPercentage > 0.3 ? 'warning' : 'critical',
                color: energyPercentage > 0.7 ? '🟢' : energyPercentage > 0.3 ? '🟡' : '🔴'
            },
            mana: {
                percentage: manaPercentage,
                status: manaPercentage > 0.7 ? 'good' : manaPercentage > 0.3 ? 'warning' : 'critical',
                color: manaPercentage > 0.7 ? '🟢' : manaPercentage > 0.3 ? '🟡' : '🔴'
            }
        };
    }

    /**
     * Génère un affichage d'avertissement pour les barres critiques
     * @param {Object} character - Personnage
     * @returns {string} Message d'avertissement
     */
    generateCriticalWarning(character) {
        const status = this.getBarStatus(character);
        const warnings = [];

        if (status.health.status === 'critical') {
            warnings.push('❤️ **VIE CRITIQUE !** Trouvez un soigneur ou une potion rapidement !');
        }
        if (status.energy.status === 'critical') {
            warnings.push('⚡ **ÉNERGIE ÉPUISÉE !** Reposez-vous ou vous ne pourrez plus vous battre !');
        }
        if (status.mana.status === 'critical') {
            warnings.push('🔮 **MANA INSUFFISANT !** Impossible d\'utiliser des sorts puissants !');
        }

        return warnings.length > 0 ? 
            `🚨 **ÉTAT CRITIQUE DÉTECTÉ** 🚨\n\n${warnings.join('\n\n')}` : '';
    }
}

module.exports = HealthBarManager;