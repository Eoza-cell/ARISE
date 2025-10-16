
const fs = require('fs').promises;
const path = require('path');

/**
 * Gestionnaire de narration immersive avec chronologie réaliste
 * et adaptation au niveau de puissance - NARRATEUR IMPARTIAL
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
                local: 1, // 1h déplacement local (1 case)
                regional: 4, // 4h voyage régional
                kingdom: 24, // 1 jour voyage entre royaumes
                dangerous: 8 // 8h en zone dangereuse
            },
            recovery: {
                minor: 4, // 4h pour récupérer blessures mineures
                moderate: 12, // 12h pour blessures moyennes
                severe: 48, // 2 jours pour blessures graves
                critical: 168 // 1 semaine pour blessures critiques
            }
        };

        // Système de logique de déplacement
        this.movementRules = {
            maxDistancePerAction: 1, // 1 case maximum par action
            terrainCosts: {
                plains: 1,
                road: 0.5,
                forest: 2,
                mountains: 3,
                desert: 2.5,
                swamp: 4,
                snow: 3,
                jungle: 2.5,
                wasteland: 3.5,
                ocean: 999, // Impossible sans navire
                river: 5, // Nécessite de nager ou pont
                bridge: 0.8
            }
        };
    }

    /**
     * Valide la logique d'une action avant de générer la narration
     */
    validateActionLogic(character, action, newPosition = null) {
        const validation = {
            valid: true,
            issues: [],
            warnings: [],
            consequences: []
        };

        // Vérifier les déplacements
        if (newPosition && this.isMovementAction(action)) {
            const movementCheck = this.validateMovement(character, newPosition);
            if (!movementCheck.valid) {
                validation.valid = false;
                validation.issues.push(...movementCheck.issues);
            }
            validation.warnings.push(...movementCheck.warnings);
        }

        // Vérifier les actions impossibles
        const impossibleCheck = this.checkImpossibleActions(action, character);
        if (!impossibleCheck.valid) {
            validation.valid = false;
            validation.issues.push(...impossibleCheck.issues);
        }

        // Vérifier la cohérence avec l'inventaire
        const inventoryCheck = this.validateInventoryLogic(action, character);
        if (!inventoryCheck.valid) {
            validation.valid = false;
            validation.issues.push(...inventoryCheck.issues);
        }

        return validation;
    }

    /**
     * Vérifie si une action implique un déplacement
     */
    isMovementAction(action) {
        const movementKeywords = [
            'va', 'marche', 'cours', 'avance', 'recule', 'déplace', 'bouge',
            'entre', 'sort', 'monte', 'descend', 'traverse', 'contourne'
        ];
        
        return movementKeywords.some(keyword => 
            action.toLowerCase().includes(keyword)
        );
    }

    /**
     * Valide un déplacement selon les règles logiques
     */
    validateMovement(character, newPosition) {
        const validation = {
            valid: true,
            issues: [],
            warnings: []
        };

        const currentPos = character.position || { x: 0, y: 0 };
        const distance = Math.abs(newPosition.x - currentPos.x) + Math.abs(newPosition.y - currentPos.y);

        // Vérifier la distance maximale
        if (distance > this.movementRules.maxDistancePerAction) {
            validation.valid = false;
            validation.issues.push(`🔅 IMMOBILITÉ - Distance trop grande: ${distance} cases. Maximum autorisé: ${this.movementRules.maxDistancePerAction} case par action.`);
            validation.issues.push("🚶 Déplacez-vous case par case pour respecter la logique du monde.");
        }

        // Vérifier le terrain de destination
        const WorldMapGenerator = require('./WorldMapGenerator');
        const mapGen = new WorldMapGenerator();
        const targetTerrain = mapGen.getTerrainAt(newPosition.x, newPosition.y);

        if (targetTerrain === 'ocean') {
            validation.valid = false;
            validation.issues.push("🌊 IMPOSSIBLE - Vous ne pouvez pas marcher sur l'océan sans navire.");
        }

        if (targetTerrain === 'river') {
            validation.warnings.push("⚠️ Traversée de rivière dangereuse - risque de noyade ou besoin de pont.");
        }

        // Calculer le temps de déplacement réaliste
        const terrainCost = this.movementRules.terrainCosts[targetTerrain] || 2;
        const travelTime = Math.ceil(terrainCost * this.timeConstraints.travel.local);

        if (travelTime > 1) {
            validation.warnings.push(`⏰ Déplacement long: ${travelTime}h requis sur ce terrain (${targetTerrain}).`);
        }

        return validation;
    }

    /**
     * Vérifie les actions logiquement impossibles
     */
    checkImpossibleActions(action, character) {
        const validation = {
            valid: true,
            issues: []
        };

        // Actions de téléportation interdites
        const teleportKeywords = [
            'téléporte', 'apparaît', 'se matérialise', 'surgit de nulle part',
            'instantanément', 'soudain', 'd\'un coup', 'par magie'
        ];

        if (teleportKeywords.some(keyword => action.toLowerCase().includes(keyword))) {
            validation.valid = false;
            validation.issues.push("🚫 IMPOSSIBLE - Pas de téléportation. Tous les déplacements doivent être logiques.");
        }

        // Vérifier les power-ups instantanés
        const powerupKeywords = [
            'gagne soudain', 'devient instantanément', 'acquiert magiquement',
            'niveau up', 'power up', 'boost instantané'
        ];

        if (powerupKeywords.some(keyword => action.toLowerCase().includes(keyword))) {
            validation.valid = false;
            validation.issues.push("🚫 IMPOSSIBLE - Pas de power-ups instantanés. La progression doit être logique.");
        }

        // Vérifier les modifications d'inventaire impossibles
        const inventoryKeywords = [
            'trouve soudain', 'apparaît dans', 'matérialise', 'invoque'
        ];

        if (inventoryKeywords.some(keyword => action.toLowerCase().includes(keyword))) {
            validation.valid = false;
            validation.issues.push("🚫 IMPOSSIBLE - Pas de création d'objets instantanée. L'inventaire suit des règles logiques.");
        }

        return validation;
    }

    /**
     * Valide la cohérence avec l'inventaire
     */
    validateInventoryLogic(action, character) {
        const validation = {
            valid: true,
            issues: []
        };

        // Vérifier l'utilisation d'objets non possédés
        const useKeywords = ['utilise', 'sort', 'prend', 'équipe', 'boit', 'mange'];
        
        if (useKeywords.some(keyword => action.toLowerCase().includes(keyword))) {
            // Cette validation serait plus poussée avec un vrai système d'inventaire
            validation.warnings = validation.warnings || [];
            validation.warnings.push("⚠️ Vérification inventaire requise pour cette action.");
        }

        return validation;
    }

    /**
     * Génère une narration immersive IMPARTIALE basée sur l'action et le niveau
     */
    async generateImmersiveNarration(character, action, location, enemies = []) {
        // Valider la logique de l'action AVANT la narration
        const actionValidation = this.validateActionLogic(character, action);
        
        if (!actionValidation.valid) {
            return {
                text: this.formatValidationErrors(actionValidation),
                valid: false
            };
        }

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
            environmentalFactors: this.getEnvironmentalFactors(location, character),
            validation: actionValidation
        };

        // Générer la narration selon le type
        let narrationResult;
        switch (actionType.category) {
            case 'movement':
                narrationResult = await this.generateMovementNarration(context);
                break;
            case 'combat':
                narrationResult = await this.generateCombatNarration(context);
                break;
            case 'exploration':
                narrationResult = await this.generateExplorationNarration(context);
                break;
            case 'training':
                narrationResult = await this.generateTrainingNarration(context);
                break;
            case 'social':
                narrationResult = await this.generateSocialNarration(context);
                break;
            default:
                narrationResult = await this.generateGenericNarration(context);
        }

        // Ajouter les avertissements de validation
        if (actionValidation.warnings.length > 0) {
            narrationResult.text += '\n\n⚠️ **AVERTISSEMENTS :**\n' + actionValidation.warnings.join('\n');
        }

        return narrationResult;
    }

    /**
     * Formate les erreurs de validation
     */
    formatValidationErrors(validation) {
        let errorText = '❌ **ACTION IMPOSSIBLE** ❌\n\n';
        
        validation.issues.forEach(issue => {
            errorText += `${issue}\n`;
        });

        errorText += '\n🎯 **RÈGLES DU MONDE :**\n';
        errorText += '• Déplacements case par case uniquement\n';
        errorText += '• Pas de téléportation ou power-ups instantanés\n';
        errorText += '• Toutes les actions doivent avoir une logique\n';
        errorText += '• Le narrateur est impartial et factuel\n\n';
        errorText += '💡 Reformulez votre action en respectant ces règles.';

        return errorText;
    }

    /**
     * Génère une narration de déplacement DÉTAILLÉE et IMMERSIVE
     */
    async generateMovementNarration(context) {
        const { character, action, location } = context;
        
        let narration = `🚶 **═══════ DÉPLACEMENT EN COURS ═══════** 🚶\n\n`;
        
        // Scène initiale détaillée
        narration += `📍 **ENVIRONNEMENT DE DÉPART**\n`;
        narration += `${character.name} se trouve actuellement dans ${location}.\n\n`;
        
        // Description du terrain avec détails
        const currentPos = character.position || { x: 0, y: 0 };
        const WorldMapGenerator = require('./WorldMapGenerator');
        const mapGen = new WorldMapGenerator();
        const terrain = mapGen.getTerrainAt(currentPos.x, currentPos.y);
        
        narration += `🗺️ **ANALYSE DU TERRAIN**\n`;
        narration += `• Type : ${this.getTerrainDescription(terrain)}\n`;
        narration += `• Texture du sol : ${this.getDetailedTerrainTexture(terrain)}\n`;
        narration += `• Inclinaison : ${Math.floor(Math.random() * 15)}° vers ${['le nord', 'le sud', 'l\'est', 'l\'ouest'][Math.floor(Math.random() * 4)]}\n`;
        narration += `• Friction estimée : ${this.getTerrainFriction(terrain)}\n`;
        narration += `• Visibilité : ${this.getTerrainVisibility(terrain)} mètres\n\n`;
        
        // Action de déplacement détaillée
        narration += `🎯 **ACTION DE DÉPLACEMENT**\n`;
        narration += `${action}\n\n`;
        
        // Séquence de mouvement
        narration += `⏱️ **SÉQUENCE DE MOUVEMENT**\n`;
        const distance = 5 + Math.floor(Math.random() * 15); // Distance aléatoire réaliste
        const speed = 4 + Math.floor(Math.random() * 3); // Vitesse de marche km/h
        
        narration += `• Distance à parcourir : ${distance} mètres\n`;
        narration += `• Vitesse de déplacement : ${speed} km/h (${(speed / 3.6).toFixed(1)} m/s)\n`;
        narration += `• Cadence de pas : ${80 + Math.floor(Math.random() * 40)} pas/minute\n`;
        narration += `• Longueur de foulée : ${0.6 + Math.random() * 0.4} mètres\n\n`;
        
        // Chronologie du déplacement
        const terrainCost = this.movementRules.terrainCosts[terrain] || 2;
        const travelTime = Math.ceil(terrainCost * this.timeConstraints.travel.local);
        const travelMinutes = travelTime * 60;
        
        narration += `📊 **CHRONOLOGIE DÉTAILLÉE**\n`;
        narration += `• T+0 min : Début du déplacement, orientation ${['nord', 'sud', 'est', 'ouest'][Math.floor(Math.random() * 4)]}\n`;
        narration += `• T+${Math.floor(travelMinutes * 0.25)} min : Traversée du premier quart de distance\n`;
        narration += `• T+${Math.floor(travelMinutes * 0.5)} min : Point médian atteint, pause brève 15s\n`;
        narration += `• T+${Math.floor(travelMinutes * 0.75)} min : Trois quarts du parcours accomplis\n`;
        narration += `• T+${travelMinutes} min : Destination atteinte\n\n`;
        
        // Conditions environnementales observées
        narration += `🌍 **CONDITIONS ENVIRONNEMENTALES**\n`;
        narration += this.getObservableConditions(terrain, location);
        narration += `\n`;
        
        // Observations sensorielles pendant le trajet
        narration += `👁️ **OBSERVATIONS PENDANT LE TRAJET**\n`;
        narration += `• Vue : ${this.getVisualObservations(terrain)}\n`;
        narration += `• Ouïe : ${this.getAudioObservations(terrain)}\n`;
        narration += `• Odorat : ${this.getOlfactiveObservations(terrain)}\n`;
        narration += `• Sensations : ${this.getTactileObservations(terrain)}\n\n`;
        
        // Impact physiologique
        narration += `⚙️ **IMPACT PHYSIOLOGIQUE**\n`;
        narration += `• Dépense calorique : ${50 + Math.floor(Math.random() * 100)} kcal\n`;
        narration += `• Fréquence cardiaque : ${70 + Math.floor(Math.random() * 30)} bpm\n`;
        narration += `• Respiration : ${12 + Math.floor(Math.random() * 8)} cycles/minute\n`;
        narration += `• Fatigue musculaire : +${Math.floor(Math.random() * 10)}%\n\n`;
        
        // Temps total
        narration += `⏰ **TEMPS TOTAL DE DÉPLACEMENT**\n`;
        narration += `• Durée estimée : ${travelTime}h (${travelMinutes} minutes)\n`;
        narration += `• Coefficient terrain : x${terrainCost.toFixed(1)}\n`;

        // Temps écoulé réaliste
        await this.addWorldTime(character.playerId, 'travel', 'local', travelTime);

        return {
            text: narration,
            outcome: {
                type: 'movement',
                timeElapsed: travelTime,
                terrain: terrain,
                distance: distance
            },
            valid: true
        };
    }
    
    getDetailedTerrainTexture(terrain) {
        const textures = {
            plains: 'Herbe courte, légèrement humide, quelques cailloux épars',
            forest: 'Humus riche, racines apparentes, feuilles mortes',
            mountains: 'Roche granitique, graviers instables, mousses vertes',
            desert: 'Sable fin doré, légèrement chaud au toucher',
            swamp: 'Boue épaisse, végétation aquatique décomposée',
            snow: 'Neige compacte avec cristaux de glace',
            jungle: 'Terre riche et sombre, débris végétaux denses',
            wasteland: 'Terre craquelée, poussière grise, débris métalliques',
            river: 'Galets lisses, sable humide en bordure',
            road: 'Pierre pavée usée, joints d\'herbe entre les dalles'
        };
        return textures[terrain] || 'Sol standard de composition mixte';
    }
    
    getTerrainFriction(terrain) {
        const frictions = {
            plains: 'Moyenne (coefficient 0.7)',
            forest: 'Variable (coefficient 0.5-0.8)',
            mountains: 'Faible (coefficient 0.4)',
            desert: 'Très faible (coefficient 0.3)',
            swamp: 'Minimale (coefficient 0.2)',
            snow: 'Faible (coefficient 0.3)',
            jungle: 'Moyenne-élevée (coefficient 0.6)',
            wasteland: 'Moyenne (coefficient 0.5)',
            river: 'Très faible si mouillé (coefficient 0.2)',
            road: 'Élevée (coefficient 0.9)'
        };
        return frictions[terrain] || 'Coefficient 0.5';
    }
    
    getTerrainVisibility(terrain) {
        const visibility = {
            plains: 500 + Math.floor(Math.random() * 500),
            forest: 20 + Math.floor(Math.random() * 30),
            mountains: 800 + Math.floor(Math.random() * 700),
            desert: 1000 + Math.floor(Math.random() * 1000),
            swamp: 30 + Math.floor(Math.random() * 40),
            snow: 200 + Math.floor(Math.random() * 300),
            jungle: 10 + Math.floor(Math.random() * 20),
            wasteland: 300 + Math.floor(Math.random() * 400),
            river: 100 + Math.floor(Math.random() * 200),
            road: 400 + Math.floor(Math.random() * 600)
        };
        return visibility[terrain] || 150;
    }
    
    getVisualObservations(terrain) {
        const observations = {
            plains: 'Horizon dégagé, ciel bleu parsemé de nuages blancs, ombres longues projetées par le soleil',
            forest: 'Canopée dense filtrant la lumière, jeux d\'ombres et de lumière, mouvements de branches',
            mountains: 'Pics rocheux au loin, roches aux teintes grises et brunes, neige sur sommets',
            desert: 'Dunes ondulantes dorées, mirages thermiques à l\'horizon, ciel d\'azur intense',
            swamp: 'Eau stagnante verdâtre, brumes basses, végétation aquatique émergente'
        };
        return observations[terrain] || 'Paysage environnant visible avec clarté modérée';
    }
    
    getAudioObservations(terrain) {
        const sounds = {
            plains: 'Bruissement d\'herbes au vent, chants d\'oiseaux lointains, silence paisible',
            forest: 'Craquements de branches, pépiements d\'oiseaux, froissement de feuilles',
            mountains: 'Écho des pas sur roche, sifflement du vent, roulement de pierres',
            desert: 'Silence presque total, léger sifflement du vent sur les dunes',
            swamp: 'Croassements de grenouilles, clapotis d\'eau, bourdonnements d\'insectes'
        };
        return sounds[terrain] || 'Sons ambiants typiques du terrain';
    }
    
    getOlfactiveObservations(terrain) {
        const smells = {
            plains: 'Odeur d\'herbe fraîche, senteurs florales légères',
            forest: 'Parfum d\'humus riche, arôme de résine de pins',
            mountains: 'Air pur et frais, légère odeur minérale',
            desert: 'Air sec sans odeur particulière, chaleur palpable',
            swamp: 'Odeur de végétation en décomposition, humidité marquée'
        };
        return smells[terrain] || 'Odeurs neutres de l\'environnement';
    }
    
    getTactileObservations(terrain) {
        const sensations = {
            plains: 'Sol ferme sous les pieds, brise légère sur la peau',
            forest: 'Humidité ambiante perceptible, fraîcheur de l\'ombre',
            mountains: 'Air frais et sec, sol dur et inégal',
            desert: 'Chaleur intense rayonnante, air sec asséchant',
            swamp: 'Humidité collante, sol mou et instable'
        };
        return sensations[terrain] || 'Sensations physiques de marche standard';
    }

    /**
     * Description factuelle du terrain
     */
    getTerrainDescription(terrain) {
        const descriptions = {
            plains: 'Plaines ouvertes, terrain stable',
            forest: 'Végétation dense, visibilité réduite',
            mountains: 'Relief escarpé, effort physique accru',
            desert: 'Sable mouvant, chaleur intense',
            swamp: 'Sol instable, progression difficile',
            snow: 'Surface glissante, froid mordant',
            jungle: 'Végétation tropicale dense',
            wasteland: 'Terrain désolé, débris nombreux',
            river: 'Cours d\'eau, traversée nécessaire',
            road: 'Voie aménagée, progression facilitée'
        };
        
        return descriptions[terrain] || 'Terrain non répertorié';
    }

    /**
     * Conditions observables de manière factuelle
     */
    getObservableConditions(terrain, location) {
        let conditions = '📊 **Conditions observées :**\n';
        
        // Facteurs mesurables selon le terrain
        if (terrain === 'mountains') {
            conditions += '• Altitude élevée détectée\n';
            conditions += '• Température en baisse mesurée\n';
            conditions += '• Effort cardiaque accru observé\n';
        } else if (terrain === 'swamp') {
            conditions += '• Humidité atmosphérique élevée\n';
            conditions += '• Sol instable sous les pieds\n';
            conditions += '• Bruits aquatiques perceptibles\n';
        } else if (terrain === 'desert') {
            conditions += '• Température élevée mesurée\n';
            conditions += '• Visibilité réduite par la poussière\n';
            conditions += '• Déshydratation progressive observée\n';
        } else {
            conditions += '• Conditions de déplacement standards\n';
            conditions += '• Visibilité normale maintenue\n';
        }

        return conditions;
    }

    /**
     * Génère une narration de combat DÉTAILLÉE et IMMERSIVE
     */
    async generateCombatNarration(context) {
        const { character, action, enemies, powerLevel } = context;
        
        let narration = `⚔️ **═══════ ENGAGEMENT COMBAT ═══════** ⚔️\n\n`;
        
        // Description de la scène initiale
        narration += `📍 **SCÈNE DE COMBAT**\n`;
        narration += `${character.name} se trouve dans ${context.location}.\n`;
        
        const environmentalFactors = this.getEnvironmentalFactors(context.location, character);
        narration += `🌤️ Météo : ${environmentalFactors.weather} | Moment : ${environmentalFactors.timeOfDay}\n`;
        narration += `🗺️ Terrain : ${environmentalFactors.combat}\n\n`;
        
        // État détaillé du combattant
        narration += `👤 **ÉTAT DU COMBATTANT**\n`;
        narration += `• Nom : ${character.name} (Grade ${character.powerLevel} - ${powerLevel.difficulty})\n`;
        narration += `• Niveau : ${character.level}\n`;
        narration += `• Vie : ${character.currentLife}/${character.maxLife} PV (${Math.floor((character.currentLife/character.maxLife)*100)}%)\n`;
        narration += `• Énergie : ${character.currentEnergy}/${character.maxEnergy} (${Math.floor((character.currentEnergy/character.maxEnergy)*100)}%)\n`;
        narration += `• Position : Debout, stance de combat, poids réparti à 60% sur jambe avant\n`;
        narration += `• Distance adversaire : ${2 + Math.floor(Math.random() * 4)} mètres\n\n`;
        
        // Action détaillée avec séquence temporelle
        narration += `⚔️ **SÉQUENCE D'ACTION DÉTAILLÉE**\n`;
        narration += `🎯 Action : ${action}\n\n`;
        
        // Décomposition temporelle de l'action
        narration += `⏱️ **CHRONOLOGIE (séquence micro-temporelle)**\n`;
        narration += `• T+0.0s : ${character.name} initie le mouvement\n`;
        narration += `• T+0.3s : Transfert du poids vers l'avant (70% jambe avant)\n`;
        narration += `• T+0.6s : Rotation du tronc à 35° dans le sens horaire\n`;
        narration += `• T+0.9s : Bras en extension, vitesse 12 m/s\n`;
        narration += `• T+1.2s : Point d'impact atteint\n\n`;
        
        // Descriptions sensorielles
        narration += `👁️ **OBSERVATIONS SENSORIELLES**\n`;
        narration += `• Vue : Trajectoire du mouvement clairement visible, légère traînée de poussière\n`;
        narration += `• Ouïe : Sifflement de l'air déplacé, son mat de l'impact\n`;
        narration += `• Toucher : Vibration ressentie dans les articulations, résistance au contact\n\n`;
        
        // Résultat du combat avec détails biomécaniques
        const combatOutcome = this.calculateRealisticCombatOutcome(character, enemies, action);
        narration += `📊 **RÉSULTAT DE L'ENGAGEMENT**\n`;
        narration += `${combatOutcome.description}\n\n`;
        
        // Analyse biomécanique de l'impact
        narration += `⚙️ **ANALYSE BIOMÉCANIQUE**\n`;
        narration += `• Force d'impact estimée : ${50 + Math.floor(Math.random() * 100)} Newtons\n`;
        narration += `• Angle d'incidence : ${30 + Math.floor(Math.random() * 60)}°\n`;
        narration += `• Zone de contact : ${2 + Math.floor(Math.random() * 5)} cm²\n`;
        narration += `• Déformation mesurée : ${1 + Math.floor(Math.random() * 3)} mm\n\n`;
        
        // Conséquences détaillées
        narration += `📉 **CONSÉQUENCES MESURÉES**\n`;
        narration += `• Perte de vie : ${combatOutcome.healthLoss} PV\n`;
        narration += `• Dépense d'énergie : ${combatOutcome.energyLoss} points\n`;
        narration += `• Fatigue musculaire : +${Math.floor(Math.random() * 15)}%\n`;
        narration += `• Température corporelle : +${0.5 + Math.random()}°C\n`;
        narration += `• Fréquence cardiaque : ${120 + Math.floor(Math.random() * 40)} bpm\n\n`;
        
        // Durée totale
        const timeElapsed = this.calculateCombatTime(action, enemies.length);
        narration += `⏰ **DURÉE TOTALE DE L'ENGAGEMENT** : ${timeElapsed} minutes\n`;
        narration += `⏱️ **TEMPS RÉEL ÉCOULÉ** : ${Math.floor(timeElapsed * 60)} secondes\n`;
        
        // Mettre à jour les statistiques
        await this.updateCharacterAfterCombat(character, combatOutcome);

        return {
            text: narration,
            outcome: combatOutcome,
            timeElapsed: timeElapsed,
            valid: true
        };
    }

    /**
     * Calcule un résultat de combat réaliste et factuel
     */
    calculateRealisticCombatOutcome(character, enemies, action) {
        const playerLevel = this.powerLevels[character.powerLevel];
        
        // Calcul factuel basé sur les statistiques
        const baseSuccessRate = Math.min(0.8, playerLevel.base / 200); // Maximum 80% de réussite
        const randomFactor = 0.7 + (Math.random() * 0.6); // Facteur aléatoire réaliste
        const finalRate = baseSuccessRate * randomFactor;
        
        let outcome;
        if (finalRate > 0.7) {
            outcome = {
                result: 'success',
                description: `Action exécutée avec succès. Technique appliquée efficacement.`,
                healthLoss: Math.floor(character.maxLife * 0.05), // Dégâts minimes même en cas de succès
                energyLoss: Math.floor(character.maxEnergy * 0.15)
            };
        } else if (finalRate > 0.5) {
            outcome = {
                result: 'partial',
                description: `Action partiellement réussie. Résultat mitigé observé.`,
                healthLoss: Math.floor(character.maxLife * 0.15),
                energyLoss: Math.floor(character.maxEnergy * 0.25)
            };
        } else if (finalRate > 0.3) {
            outcome = {
                result: 'failure',
                description: `Action échouée. Technique mal exécutée ou contrée.`,
                healthLoss: Math.floor(character.maxLife * 0.25),
                energyLoss: Math.floor(character.maxEnergy * 0.35)
            };
        } else {
            outcome = {
                result: 'critical_failure',
                description: `Échec critique observé. Erreur tactique majeure commise.`,
                healthLoss: Math.floor(character.maxLife * 0.4),
                energyLoss: Math.floor(character.maxEnergy * 0.5)
            };
        }
        
        return outcome;
    }

    /**
     * Génère une narration d'exploration factuelle
     */
    async generateExplorationNarration(context) {
        const { character, action, location } = context;
        
        let narration = `🔍 **EXPLORATION EN COURS**\n\n`;
        
        // Description environnementale factuelle
        narration += this.getFactualLocationDescription(location, character);
        
        // Action spécifique
        narration += `\n🎯 **Action :** ${character.name} ${action.toLowerCase()}\n\n`;
        
        // Observations factuelles
        const explorationOutcome = this.generateFactualExplorationOutcome(character, action, location);
        narration += `📝 **Observations :**\n${explorationOutcome.description}\n\n`;
        
        // Temps écoulé mesuré
        const timeCategory = explorationOutcome.dangerous ? 'dangerous' : 'local';
        await this.addWorldTime(character.playerId, 'travel', timeCategory);
        
        return {
            text: narration,
            outcome: explorationOutcome,
            valid: true
        };
    }

    /**
     * Description factuelle des lieux
     */
    getFactualLocationDescription(location, character) {
        const descriptions = {
            'Valorhall': `Zone urbaine identifiée : Valorhall. Architecture militaire observée. Activité commerciale détectée.`,
            'Forêt Sombre': `Environnement forestier dense. Luminosité réduite mesurée. Bruits de faune perceptibles.`,
            'Montagnes du Nord': `Relief montagneux confirmé. Température en baisse. Altitude élevée détectée.`
        };
        
        return descriptions[location] || `${character.name} se trouve dans ${location}. Environnement en cours d'analyse.`;
    }

    /**
     * Génère des résultats d'exploration factuels
     */
    generateFactualExplorationOutcome(character, action, location) {
        const outcomes = [
            {
                description: `Traces de passage récent détectées. Empreintes fraîches identifiées sur le sol.`,
                discovery: 'traces',
                dangerous: false
            },
            {
                description: `Mouvement suspect détecté dans le périmètre. Prudence recommandée.`,
                discovery: 'movement',
                dangerous: true
            },
            {
                description: `Structure abandonnée localisée. Signes d'occupation récente observés.`,
                discovery: 'structure',
                dangerous: false
            }
        ];
        
        return outcomes[Math.floor(Math.random() * outcomes.length)];
    }

    // Méthodes utilitaires pour la gestion du temps et des facteurs environnementaux
    async addWorldTime(playerId, category, type, customTime = null) {
        const timeToAdd = customTime || this.timeConstraints[category][type];
        const currentTime = await this.getWorldTime(playerId);
        const newTime = currentTime + timeToAdd;
        
        await this.dbManager.setTemporaryData(playerId, 'world_time', newTime);
        
        console.log(`⏰ Temps ajouté: ${timeToAdd}h (${category}/${type})`);
    }

    async getWorldTime(playerId) {
        const worldTime = await this.dbManager.getTemporaryData(playerId, 'world_time');
        return worldTime || 0;
    }

    analyzeActionType(action) {
        const actionLower = action.toLowerCase();
        
        const movementKeywords = ['va', 'marche', 'cours', 'avance', 'recule', 'déplace', 'bouge', 'entre', 'sort'];
        const combatKeywords = ['attaque', 'frappe', 'combat', 'se bat', 'épée', 'lame', 'coup', 'riposte'];
        const explorationKeywords = ['explore', 'cherche', 'fouille', 'examine', 'regarde', 'inspecte'];
        const trainingKeywords = ['entraîne', 'pratique', 'médite', 'étude', 'apprend'];
        const socialKeywords = ['parle', 'demande', 'salue', 'dit', 'questionne', 'discute'];

        let category = 'generic';
        let intensity = 'low';
        let risk = 'safe';

        if (movementKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'movement';
            intensity = 'low';
            risk = 'safe';
        } else if (combatKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'combat';
            intensity = 'high';
            risk = 'dangerous';
        } else if (explorationKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'exploration';
            intensity = 'medium';
            risk = 'moderate';
        } else if (trainingKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'training';
            intensity = 'medium';
            risk = 'safe';
        } else if (socialKeywords.some(keyword => actionLower.includes(keyword))) {
            category = 'social';
            intensity = 'low';
            risk = 'safe';
        }

        return { category, intensity, risk };
    }

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
            'Valorhall': 'Terrain stable, visibilité correcte',
            'Forêt Sombre': 'Obstacles naturels, visibilité limitée',
            'Montagnes du Nord': 'Terrain accidenté, risque de glissade'
        };
        
        return factors[location] || 'Conditions standard';
    }

    getExplorationEnvironmentalFactor(location) {
        return `Environnement ${location} - conditions mesurées`;
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

    calculateCombatTime(action, enemyCount) {
        const baseTime = 2; // 2 minutes de base
        const actionComplexity = action.length > 50 ? 1.5 : 1;
        const enemyFactor = enemyCount * 1.2;
        
        return Math.floor(baseTime * actionComplexity * enemyFactor);
    }

    async updateCharacterAfterCombat(character, outcome) {
        const newLife = Math.max(1, character.currentLife - outcome.healthLoss);
        const newEnergy = Math.max(0, character.currentEnergy - outcome.energyLoss);
        
        await this.dbManager.updateCharacter(character.id, {
            currentLife: newLife,
            currentEnergy: newEnergy
        });
    }

    async generateGenericNarration(context) {
        const { character, action } = context;
        
        let narration = `📋 **ACTION OBSERVÉE**\n\n`;
        narration += `${character.name} : ${action}\n\n`;
        narration += `Action notée et enregistrée dans le contexte de ${context.location}.`;
        
        return {
            text: narration,
            outcome: { type: 'generic' },
            valid: true
        };
    }

    async generateTrainingNarration(context) {
        return this.generateGenericNarration(context);
    }

    async generateSocialNarration(context) {
        return this.generateGenericNarration(context);
    }
}

module.exports = ImmersiveNarrationManager;
