const fs = require('fs').promises;
const path = require('path');

/**
 * Gestionnaire de narration immersive avec chronologie réaliste
 * et adaptation au niveau de puissance
 */
class ImmersiveNarrationManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        
        // Échelle de puissance avec coefficients de difficulté
        this.powerLevels = {
            'G': { base: 100, multiplier: 1.0, difficulty: 'débutant' },
            'F': { base: 150, multiplier: 1.2, difficulty: 'apprenti' },
            'E': { base: 200, multiplier: 1.5, difficulty: 'combattant' },
            'D': { base: 300, multiplier: 2.0, difficulty: 'guerrier aguerri' },
            'C': { base: 450, multiplier: 2.8, difficulty: 'vétéran expérimenté' },
            'B': { base: 600, multiplier: 3.5, difficulty: 'maître combattant' },
            'A': { base: 800, multiplier: 4.5, difficulty: 'légende vivante' }
        };

        // Chronologie du monde (en heures)
        this.timeConstraints = {
            training: {
                basic: 8, // 8h pour un entraînement de base
                intermediate: 24, // 1 jour pour technique intermédiaire
                advanced: 72, // 3 jours pour technique avancée
                mastery: 168 // 1 semaine pour maîtriser
            },
            travel: {
                local: 2, // 2h déplacement local
                regional: 8, // 8h voyage régional
                kingdom: 24, // 1 jour voyage entre royaumes
                dangerous: 48 // 2 jours en zone dangereuse
            },
            recovery: {
                minor: 4, // 4h pour récupérer blessures mineures
                moderate: 12, // 12h pour blessures moyennes
                severe: 48, // 2 jours pour blessures graves
                critical: 168 // 1 semaine pour blessures critiques
            }
        };
    }

    /**
     * Génère une narration immersive basée sur l'action et le niveau
     */
    async generateImmersiveNarration(character, action, location, enemies = []) {
        const characterLevel = this.powerLevels[character.powerLevel] || this.powerLevels['G'];
        
        // Analyser le type d'action
        const actionType = this.analyzeActionType(action);
        
        // Créer le contexte narratif
        const context = {
            character,
            action,
            location,
            enemies,
            powerLevel: characterLevel,
            actionType,
            worldTime: await this.getWorldTime(character.playerId),
            environmentalFactors: this.getEnvironmentalFactors(location, character)
        };

        // Générer la narration selon le type
        switch (actionType.category) {
            case 'combat':
                return await this.generateCombatNarration(context);
            case 'exploration':
                return await this.generateExplorationNarration(context);
            case 'training':
                return await this.generateTrainingNarration(context);
            case 'social':
                return await this.generateSocialNarration(context);
            default:
                return await this.generateGenericNarration(context);
        }
    }

    /**
     * Analyse le type d'action du joueur
     */
    analyzeActionType(action) {
        const actionLower = action.toLowerCase();
        
        // Mots-clés combat
        const combatKeywords = ['attaque', 'frappe', 'combat', 'se bat', 'épée', 'lame', 'coup', 'riposte', 'charge', 'tuer'];
        const trainingKeywords = ['entraîne', 'pratique', 'médite', 'étude', 'apprend', 'perfectione'];
        const explorationKeywords = ['explore', 'marche', 'avance', 'cherche', 'fouille', 'examine'];
        const socialKeywords = ['parle', 'demande', 'salue', 'dit', 'questionne', 'discute'];

        let category = 'generic';
        let intensity = 'low';
        let risk = 'safe';

        if (combatKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'combat';
            intensity = 'high';
            risk = 'dangerous';
        } else if (trainingKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'training';
            intensity = 'medium';
            risk = 'safe';
        } else if (explorationKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'exploration';
            intensity = 'medium';
            risk = 'moderate';
        } else if (socialKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'social';
            intensity = 'low';
            risk = 'safe';
        }

        return { category, intensity, risk };
    }

    /**
     * Génère une narration de combat challenging et réaliste
     */
    async generateCombatNarration(context) {
        const { character, action, enemies, powerLevel } = context;
        
        // Créer des adversaires adaptatés au niveau du joueur
        const adaptedEnemies = this.adaptEnemyDifficulty(character, enemies);
        
        let narration = `⚔️ **Combat Engagé !**\n\n`;
        
        // Description de l'environnement de combat
        narration += `L'air se charge de tension dans ${context.location.toLowerCase()}. `;
        narration += `${character.name}, ${powerLevel.difficulty}, s'apprête à affronter un défi à sa mesure.\n\n`;
        
        // Analyse des adversaires
        adaptedEnemies.forEach(enemy => {
            narration += `🛡️ **${enemy.name}** (Niveau ${enemy.powerLevel}) - ${enemy.description}\n`;
            narration += `   Compétences redoutables : ${enemy.abilities.join(', ')}\n`;
            narration += `   Points de vie : ${enemy.health} | Énergie : ${enemy.energy}\n\n`;
        });

        // Analyse tactique
        narration += `📊 **Analyse Tactique :**\n`;
        narration += `• Votre niveau de friction : ${character.frictionLevel}\n`;
        narration += `• Difficulté estimée : ${this.calculateCombatDifficulty(character, adaptedEnemies)}\n`;
        narration += `• Avantage environnemental : ${context.environmentalFactors.combat}\n\n`;

        // Action du personnage avec conséquences réalistes
        narration += `🎯 **Action de ${character.name} :**\n`;
        narration += `${action}\n\n`;

        // Réaction des adversaires (toujours compétente)
        narration += `⚡ **Réaction ennemie :**\n`;
        const enemyResponse = this.generateCompetentEnemyResponse(character, adaptedEnemies, action);
        narration += `${enemyResponse}\n\n`;

        // Conséquences et évolution du combat
        const combatOutcome = this.calculateCombatOutcome(character, adaptedEnemies, action);
        narration += `🔥 **Résultat :**\n${combatOutcome.description}\n\n`;

        // Temps écoulé réaliste
        const timeElapsed = this.calculateCombatTime(action, adaptedEnemies.length);
        narration += `⏰ **Temps écoulé :** ${timeElapsed} minutes de combat intense.\n`;
        
        // Mettre à jour les statistiques du personnage
        await this.updateCharacterAfterCombat(character, combatOutcome);

        return {
            text: narration,
            outcome: combatOutcome,
            timeElapsed: timeElapsed,
            enemies: adaptedEnemies
        };
    }

    /**
     * Adapte la difficulté des ennemis au niveau du joueur
     */
    adaptEnemyDifficulty(character, baseEnemies) {
        const playerLevel = this.powerLevels[character.powerLevel];
        
        return baseEnemies.map(enemy => {
            // Les ennemis sont toujours adaptés pour être challengeant
            const enemyPowerLevel = this.getAdaptedEnemyLevel(character.powerLevel);
            const enemyStats = this.powerLevels[enemyPowerLevel];
            
            return {
                ...enemy,
                powerLevel: enemyPowerLevel,
                health: Math.floor(enemyStats.base * 0.8 + (Math.random() * 0.4 * enemyStats.base)),
                energy: Math.floor(enemyStats.base * 0.6 + (Math.random() * 0.8 * enemyStats.base)),
                abilities: this.generateEnemyAbilities(enemyPowerLevel),
                description: `Un adversaire ${enemyStats.difficulty} qui ne sous-estime jamais ses ennemis`
            };
        });
    }

    /**
     * Détermine le niveau d'ennemi approprié (toujours challenging)
     */
    getAdaptedEnemyLevel(playerLevel) {
        const levels = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];
        const playerIndex = levels.indexOf(playerLevel);
        
        // Les ennemis sont toujours entre le niveau du joueur et un niveau supérieur
        const enemyIndex = Math.min(levels.length - 1, playerIndex + Math.floor(Math.random() * 2));
        
        return levels[enemyIndex];
    }

    /**
     * Génère des capacités pour l'ennemi selon son niveau
     */
    generateEnemyAbilities(powerLevel) {
        const baseAbilities = {
            'G': ['Attaque basique', 'Parade simple'],
            'F': ['Combo double', 'Esquive rapide', 'Contre-attaque'],
            'E': ['Techniques martiales', 'Feinte', 'Attaque précise'],
            'D': ['Combat tactique', 'Maîtrise des armes', 'Anticipation'],
            'C': ['Techniques avancées', 'Combat multi-cibles', 'Stratégie'],
            'B': ['Maîtrise parfaite', 'Techniques secrètes', 'Leadership'],
            'A': ['Techniques légendaires', 'Omniscience martiale', 'Présence intimidante']
        };
        
        return baseAbilities[powerLevel] || baseAbilities['G'];
    }

    /**
     * Génère une réponse compétente de l'ennemi
     */
    generateCompetentEnemyResponse(character, enemies, playerAction) {
        let response = '';
        
        enemies.forEach((enemy, index) => {
            const reactions = [
                `${enemy.name} anticipe votre mouvement et ajuste sa garde`,
                `${enemy.name} analyse rapidement votre technique et prépare sa riposte`,
                `${enemy.name} ne montre aucune surprise face à votre attaque`,
                `${enemy.name} utilise votre élan contre vous avec une technique experte`,
                `${enemy.name} révèle son expérience en combat en adaptant sa stratégie`
            ];
            
            response += `• ${reactions[Math.floor(Math.random() * reactions.length)]}\n`;
        });
        
        return response;
    }

    /**
     * Calcule le résultat du combat de manière réaliste
     */
    calculateCombatOutcome(character, enemies, action) {
        const playerLevel = this.powerLevels[character.powerLevel];
        const totalEnemyPower = enemies.reduce((sum, enemy) => {
            return sum + this.powerLevels[enemy.powerLevel].base;
        }, 0);
        
        const playerAdvantage = playerLevel.base / (totalEnemyPower / enemies.length);
        
        // Le combat est toujours incertain, même pour les joueurs puissants
        const randomFactor = 0.7 + (Math.random() * 0.6); // Entre 0.7 et 1.3
        const finalRatio = playerAdvantage * randomFactor;
        
        let outcome;
        if (finalRatio > 1.3) {
            outcome = {
                result: 'victory',
                description: `Victoire nette ! Votre supériorité technique fait la différence, mais l'ennemi vous a forcé à vous dépasser.`,
                healthLoss: Math.floor(character.maxLife * 0.1),
                energyLoss: Math.floor(character.maxEnergy * 0.2)
            };
        } else if (finalRatio > 1.0) {
            outcome = {
                result: 'close_victory',
                description: `Victoire difficile ! Un combat serré où chaque seconde comptait. Vous l'emportez de justesse.`,
                healthLoss: Math.floor(character.maxLife * 0.25),
                energyLoss: Math.floor(character.maxEnergy * 0.4)
            };
        } else if (finalRatio > 0.8) {
            outcome = {
                result: 'stalemate',
                description: `Combat indécis ! Les forces sont équilibrées. L'issue reste incertaine.`,
                healthLoss: Math.floor(character.maxLife * 0.15),
                energyLoss: Math.floor(character.maxEnergy * 0.3)
            };
        } else {
            outcome = {
                result: 'disadvantage',
                description: `Situation critique ! L'ennemi prend l'avantage. Une retraite tactique pourrait être sage.`,
                healthLoss: Math.floor(character.maxLife * 0.35),
                energyLoss: Math.floor(character.maxEnergy * 0.5)
            };
        }
        
        return outcome;
    }

    /**
     * Met à jour le personnage après le combat
     */
    async updateCharacterAfterCombat(character, outcome) {
        const newLife = Math.max(1, character.currentLife - outcome.healthLoss);
        const newEnergy = Math.max(0, character.currentEnergy - outcome.energyLoss);
        
        await this.dbManager.updateCharacter(character.id, {
            currentLife: newLife,
            currentEnergy: newEnergy
        });
        
        // Ajouter du temps pour récupération si blessé
        if (outcome.healthLoss > character.maxLife * 0.2) {
            await this.addWorldTime(character.playerId, 'recovery', 'moderate');
        }
    }

    /**
     * Génère une narration d'exploration immersive
     */
    async generateExplorationNarration(context) {
        const { character, action, location, environmentalFactors } = context;
        
        let narration = `🗺️ **Exploration en cours...**\n\n`;
        
        // Description environnementale détaillée
        narration += this.getDetailedLocationDescription(location, character);
        
        // Action du personnage
        narration += `\n🚶 **${character.name}** ${action.toLowerCase()}\n\n`;
        
        // Conséquences réalistes de l'exploration
        const explorationOutcome = this.generateExplorationOutcome(character, action, location);
        narration += explorationOutcome.description;
        
        // Temps écoulé
        const timeCategory = explorationOutcome.dangerous ? 'dangerous' : 'local';
        await this.addWorldTime(character.playerId, 'travel', timeCategory);
        
        return {
            text: narration,
            outcome: explorationOutcome
        };
    }

    /**
     * Gère la chronologie du monde de manière réaliste
     */
    async addWorldTime(playerId, category, type) {
        const timeToAdd = this.timeConstraints[category][type];
        const currentTime = await this.getWorldTime(playerId);
        const newTime = currentTime + timeToAdd;
        
        await this.dbManager.setTemporaryData(playerId, 'world_time', newTime);
        
        console.log(`⏰ Temps ajouté: ${timeToAdd}h (${category}/${type})`);
    }

    /**
     * Récupère le temps du monde pour un joueur
     */
    async getWorldTime(playerId) {
        const worldTime = await this.dbManager.getTemporaryData(playerId, 'world_time');
        return worldTime || 0; // Commence à 0 heures
    }

    /**
     * Calcule la difficulté du combat
     */
    calculateCombatDifficulty(character, enemies) {
        const playerPower = this.powerLevels[character.powerLevel].base;
        const avgEnemyPower = enemies.reduce((sum, enemy) => {
            return sum + this.powerLevels[enemy.powerLevel].base;
        }, 0) / enemies.length;
        
        const ratio = avgEnemyPower / playerPower;
        
        if (ratio < 0.8) return '⭐ Modéré';
        if (ratio < 1.2) return '⭐⭐ Équilibré';
        if (ratio < 1.5) return '⭐⭐⭐ Difficile';
        return '⭐⭐⭐⭐ Extrême';
    }

    /**
     * Calcule le temps de combat réaliste
     */
    calculateCombatTime(action, enemyCount) {
        const baseTime = 3; // 3 minutes de base
        const actionComplexity = action.length > 50 ? 2 : 1; // Actions complexes prennent plus de temps
        const enemyFactor = enemyCount * 1.5;
        
        return Math.floor(baseTime * actionComplexity * enemyFactor);
    }

    /**
     * Description détaillée des lieux
     */
    getDetailedLocationDescription(location, character) {
        const descriptions = {
            'Valorhall': `Dans les rues pavées de Valorhall, capitale d'AEGYRIA, l'air résonne des marteaux des forgerons et du cliquetis des armures. Les bannières dorées flottent au vent, témoins de la grandeur militaire du royaume.`,
            'Forêt Sombre': `Les arbres centenaires de la Forêt Sombre projettent leurs ombres menaçantes. Chaque bruissement dans les feuillages pourrait signaler un danger. L'odeur de mousse humide et de décomposition emplit vos narines.`,
            'Montagnes du Nord': `Les pics escarpés s'élèvent vers un ciel plombé. Le vent glacial siffle entre les rochers, et chaque pas sur les éboulis demande concentration et équilibre.`
        };
        
        return descriptions[location] || `${character.name} évolue dans ${location}, un lieu chargé d'histoire et de mystères.`;
    }

    /**
     * Génère des résultats d'exploration réalistes
     */
    generateExplorationOutcome(character, action, location) {
        const outcomes = [
            {
                description: `Votre attention aux détails vous permet de remarquer des traces récentes sur le sentier. Quelqu'un est passé par ici il y a peu.`,
                discovery: 'traces',
                dangerous: false
            },
            {
                description: `Un bruit suspect dans les buissons vous met en alerte. Votre instinct de survie vous conseille la prudence.`,
                discovery: 'danger',
                dangerous: true
            },
            {
                description: `Vous découvrez un ancien campement abandonné. Les cendres encore tièdes suggèrent un départ récent et précipité.`,
                discovery: 'campement',
                dangerous: true
            }
        ];
        
        return outcomes[Math.floor(Math.random() * outcomes.length)];
    }

    /**
     * Récupère les facteurs environnementaux
     */
    getEnvironmentalFactors(location, character) {
        return {
            combat: this.getCombatEnvironmentalFactor(location),
            exploration: this.getExplorationEnvironmentalFactor(location),
            weather: this.getCurrentWeather(),
            timeOfDay: this.getTimeOfDay(character.playerId)
        };
    }

    getCombatEnvironmentalFactor(location) {
        const factors = {
            'Valorhall': 'Terrain stable, bonne visibilité',
            'Forêt Sombre': 'Obstacles naturels, visibilité réduite',
            'Montagnes du Nord': 'Terrain difficile, risque de chute'
        };
        
        return factors[location] || 'Conditions standards';
    }

    getExplorationEnvironmentalFactor(location) {
        return `Environnement typique de ${location}`;
    }

    getCurrentWeather() {
        const weathers = ['Clair', 'Nuageux', 'Brumeux', 'Venteux'];
        return weathers[Math.floor(Math.random() * weathers.length)];
    }

    async getTimeOfDay(playerId) {
        const worldTime = await this.getWorldTime(playerId);
        const hourOfDay = worldTime % 24;
        
        if (hourOfDay < 6) return 'Aube';
        if (hourOfDay < 12) return 'Matin';
        if (hourOfDay < 18) return 'Après-midi';
        return 'Soir';
    }
}

module.exports = ImmersiveNarrationManager;