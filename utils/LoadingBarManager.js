/**
 * LoadingBarManager - Système de barres de chargement style GTA
 * Gère les animations de progression avec différents styles
 */

class LoadingBarManager {
    constructor() {
        // Différents styles de barres de chargement
        this.styles = {
            solid: '▰',
            empty: '▱',
            checkerboard: ['▰', '▱'],
            wave: ['▰', '▱', '▰', '▱', '▰', '▱', '▰', '▱', '▰', '▱']
        };
        
        // Durées par type d'action (en millisecondes)
        this.actionDurations = {
            combat: 3000,
            travel: 4000,
            craft: 2500,
            spell: 2000,
            dialogue: 1500,
            exploration: 3500,
            training: 4500,
            ritual: 5000
        };
    }

    /**
     * Génère une barre de chargement statique
     * @param {number} progress - Progression (0-100)
     * @param {number} length - Longueur de la barre (défaut: 10)
     * @param {string} style - Style de la barre ('solid', 'empty', 'checkerboard')
     * @returns {string}
     */
    generateStaticBar(progress, length = 10, style = 'solid') {
        const filled = Math.floor((progress / 100) * length);
        const empty = length - filled;
        
        if (style === 'checkerboard') {
            return this.generateCheckerboardBar(filled, empty);
        }
        
        const filledChar = this.styles.solid;
        const emptyChar = this.styles.empty;
        
        return filledChar.repeat(filled) + emptyChar.repeat(empty);
    }

    /**
     * Génère une barre de chargement en damier
     * @param {number} filled - Nombre de cases remplies
     * @param {number} empty - Nombre de cases vides
     * @returns {string}
     */
    generateCheckerboardBar(filled, empty) {
        let result = '';
        const pattern = this.styles.checkerboard;
        
        for (let i = 0; i < filled + empty; i++) {
            if (i < filled) {
                result += this.styles.solid;
            } else {
                result += pattern[i % pattern.length];
            }
        }
        
        return result;
    }

    /**
     * Crée une animation de chargement pour une action spécifique
     * @param {string} actionType - Type d'action (combat, travel, etc.)
     * @param {string} actionName - Nom de l'action à afficher
     * @param {string} playerName - Nom du joueur
     * @returns {Promise<string[]>} Tableau des frames d'animation
     */
    async createLoadingAnimation(actionType, actionName, playerName) {
        const duration = this.actionDurations[actionType] || 3000;
        const frames = [];
        const totalFrames = 8;
        
        for (let frame = 0; frame <= totalFrames; frame++) {
            const progress = (frame / totalFrames) * 100;
            const bar = this.generateStaticBar(progress, 10, 'solid');
            
            const frameText = this.formatLoadingFrame(
                actionName,
                playerName,
                bar,
                Math.round(progress),
                this.getActionEmoji(actionType)
            );
            
            frames.push(frameText);
        }
        
        return frames;
    }

    /**
     * Formate un frame de chargement
     * @param {string} actionName - Nom de l'action
     * @param {string} playerName - Nom du joueur
     * @param {string} bar - Barre de progression
     * @param {number} progress - Pourcentage
     * @param {string} emoji - Emoji de l'action
     * @returns {string}
     */
    formatLoadingFrame(actionName, playerName, bar, progress, emoji) {
        return `${emoji} *${playerName}* effectue: *${actionName}*

╭─────────────────────╮
│ ${bar} │ ${progress}%
╰─────────────────────╯

⏳ Traitement en cours...`;
    }

    /**
     * Retourne l'emoji approprié pour chaque type d'action
     * @param {string} actionType - Type d'action
     * @returns {string}
     */
    getActionEmoji(actionType) {
        const emojis = {
            combat: '⚔️',
            travel: '🚶‍♂️',
            craft: '🔨',
            spell: '✨',
            dialogue: '💬',
            exploration: '🔍',
            training: '💪',
            ritual: '🔮'
        };
        
        return emojis[actionType] || '⚡';
    }

    /**
     * Crée une barre de vie/énergie stylisée
     * @param {number} current - Valeur actuelle
     * @param {number} max - Valeur maximale
     * @param {string} type - Type ('life' ou 'energy')
     * @returns {string}
     */
    createHealthBar(current, max, type = 'life') {
        const percentage = (current / max) * 100;
        const length = 10;
        const filled = Math.floor((percentage / 100) * length);
        const empty = length - filled;
        
        let color = '';
        let icon = '';
        
        if (type === 'life') {
            icon = '❤️';
            if (percentage > 75) color = '🟢';
            else if (percentage > 50) color = '🟡';
            else if (percentage > 25) color = '🟠';
            else color = '🔴';
        } else if (type === 'energy') {
            icon = '⚡';
            color = '🔵';
        }
        
        const bar = this.styles.solid.repeat(filled) + this.styles.empty.repeat(empty);
        
        return `${icon} ${bar} ${current}/${max} (${Math.round(percentage)}%)`;
    }

    /**
     * Génère une animation de combat avec barres de progression
     * @param {string} attacker - Nom de l'attaquant
     * @param {string} defender - Nom du défenseur
     * @param {Object} result - Résultat du combat
     * @returns {string}
     */
    createCombatProgressBar(attacker, defender, result) {
        const attackerHealth = this.createHealthBar(result.attackerHP, result.attackerMaxHP, 'life');
        const defenderHealth = this.createHealthBar(result.defenderHP, result.defenderMaxHP, 'life');
        
        return `⚔️ **COMBAT EN COURS** ⚔️

👤 **${attacker}**
${attackerHealth}

🆚

👤 **${defender}**
${defenderHealth}

${this.generateStaticBar(75, 12, 'checkerboard')}

💥 Dégâts infligés: ${result.damage}`;
    }

    /**
     * Crée une animation de voyage entre royaumes
     * @param {string} playerName - Nom du joueur
     * @param {string} fromKingdom - Royaume de départ
     * @param {string} toKingdom - Royaume de destination
     * @returns {string[]}
     */
    createTravelAnimation(playerName, fromKingdom, toKingdom) {
        const frames = [];
        const stages = [
            '🏰 Départ du royaume...',
            '🌲 Traversée des forêts...',
            '⛰️ Passage par les montagnes...',
            '🌊 Franchissement des rivières...',
            '🛤️ Sur les routes commerciales...',
            '🏰 Approche du royaume...',
            '✅ Arrivée réussie !'
        ];
        
        stages.forEach((stage, index) => {
            const progress = ((index + 1) / stages.length) * 100;
            const bar = this.generateStaticBar(progress, 10);
            
            frames.push(`🚶‍♂️ **${playerName}** - Voyage

📍 ${fromKingdom} ➡️ ${toKingdom}

${stage}

╭─────────────────────╮
│ ${bar} │ ${Math.round(progress)}%
╰─────────────────────╯`);
        });
        
        return frames;
    }

    /**
     * Génère une barre d'expérience avec style
     * @param {number} currentXP - XP actuel
     * @param {number} nextLevelXP - XP requis pour le niveau suivant
     * @param {number} level - Niveau actuel
     * @returns {string}
     */
    createExperienceBar(currentXP, nextLevelXP, level) {
        const progress = (currentXP / nextLevelXP) * 100;
        const bar = this.generateStaticBar(progress, 15);
        
        return `⭐ **NIVEAU ${level}**
╭─────────────────────────╮
│ ${bar} │
╰─────────────────────────╯
💫 ${currentXP}/${nextLevelXP} XP (${Math.round(progress)}%)`;
    }
}

module.exports = LoadingBarManager;