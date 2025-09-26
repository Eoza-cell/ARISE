/**
 * NarrationImageManager - Système d'intégration des images PNG avec la narration
 * Mélange les descriptions textuelles avec les images de personnages
 */

const path = require('path');
const fs = require('fs');

class NarrationImageManager {
    constructor() {
        // Chemins vers les images de personnages
        this.imagePaths = {
            customImages: './assets/custom_images/',
            characters: './assets/3d/humans/',
            equipment: './assets/3d/equipment/',
            generated: './attached_assets/generated_images/'
        };
        
        // Types de narration avec images
        this.narrationType = {
            character_intro: { requiresImage: true, style: 'portrait' },
            combat_scene: { requiresImage: true, style: 'action' },
            dialogue: { requiresImage: true, style: 'conversation' },
            exploration: { requiresImage: false, style: 'landscape' },
            magic_casting: { requiresImage: true, style: 'mystical' },
            kingdom_arrival: { requiresImage: false, style: 'panoramic' },
            equipment_view: { requiresImage: true, style: 'detailed' },
            character_customization: { requiresImage: true, style: 'showcase' }
        };
        
        // Templates de narration avec intégration d'images
        this.narrationTemplates = {
            character_intro: `🎭 **PRÉSENTATION DU PERSONNAGE** 🎭

{IMAGE}

👤 **{characterName}**, {gender} de {kingdom}
⚔️ Niveau {level} - Rang {powerLevel}
🏰 Position: {location}

📖 *{characterDescription}*

{statusBars}

{customNarration}`,
            
            combat_scene: `⚔️ **SCÈNE DE COMBAT** ⚔️

{IMAGE}

{loadingBar}

💥 {combatNarration}

{participants}

{results}`,
            
            dialogue: `💬 **CONVERSATION** 💬

{IMAGE}

🗣️ **{speakerName}** s'approche de vous...

"{dialogueText}"

*{narrativeContext}*

{responseOptions}`,
            
            magic_casting: `✨ **INVOCATION MYSTIQUE** ✨

{IMAGE}

🔮 {spellName} ({ancientName})

{incantation}

{spellEffects}

{magicalNarration}`,
            
            kingdom_arrival: `🏰 **ARRIVÉE AU ROYAUME** 🏰

{IMAGE}

🚶‍♂️ Après un long voyage, **{characterName}** aperçoit enfin les terres de **{kingdom}**...

{kingdomDescription}

🛡️ {arrivalNarration}

{availableActions}`
        };
        
        // Émojis pour différents types de personnages
        this.characterEmojis = {
            male: '👨',
            female: '👩',
            warrior: '⚔️',
            mage: '🧙',
            archer: '🏹',
            healer: '💚',
            noble: '👑',
            merchant: '💰',
            assassin: '🗡️',
            paladin: '🛡️'
        };
    }

    /**
     * Récupère l'image d'un personnage
     * @param {string} characterId - ID du personnage
     * @param {string} imageType - Type d'image (portrait, action, etc.)
     * @returns {string|null}
     */
    getCharacterImage(characterId, imageType = 'portrait') {
        // Cherche d'abord dans les images personnalisées
        const customImagePath = path.join(this.imagePaths.customImages, `character_${characterId}.png`);
        if (fs.existsSync(customImagePath)) {
            return customImagePath;
        }
        
        // Utilise une image par défaut si aucune image personnalisée n'est trouvée
        const defaultImages = [
            'character_1.png',
            'character_2.png',
            'character_237621971203.png',
            'character_273607217389804.png',
            'character_48198576038116.png'
        ];
        
        const randomImage = defaultImages[Math.floor(Math.random() * defaultImages.length)];
        const defaultPath = path.join(this.imagePaths.customImages, randomImage);
        
        return fs.existsSync(defaultPath) ? defaultPath : null;
    }

    /**
     * Crée une narration complète avec image intégrée
     * @param {string} type - Type de narration
     * @param {Object} data - Données pour la narration
     * @returns {Promise<Object>}
     */
    async createNarrativeWithImage(type, data) {
        const template = this.narrationTemplates[type];
        if (!template) {
            throw new Error(`Type de narration inconnu: ${type}`);
        }
        
        // Récupère l'image si nécessaire
        let imagePath = null;
        if (this.narrationType[type]?.requiresImage) {
            imagePath = this.getCharacterImage(data.characterId || 'default');
        }
        
        // Prépare le texte de narration
        let narration = this.processNarrationTemplate(template, data);
        
        // Ajoute des éléments visuels en ASCII si pas d'image
        if (!imagePath) {
            narration = this.addAsciiArt(narration, type);
        }
        
        return {
            text: narration,
            imagePath: imagePath,
            hasImage: !!imagePath,
            type: type
        };
    }

    /**
     * Traite un template de narration avec les données fournies
     * @param {string} template - Template à traiter
     * @param {Object} data - Données pour remplacer les placeholders
     * @returns {string}
     */
    processNarrationTemplate(template, data) {
        let processed = template;
        
        // Remplace les placeholders de base
        const placeholders = {
            '{characterName}': data.characterName || 'Aventurier',
            '{gender}': data.gender || 'mystérieux',
            '{kingdom}': data.kingdom || 'Terre Inconnue',
            '{level}': data.level || '1',
            '{powerLevel}': data.powerLevel || 'G',
            '{location}': data.location || 'quelque part',
            '{characterDescription}': data.characterDescription || 'Un personnage mystérieux...',
            '{customNarration}': data.customNarration || '',
            '{dialogueText}': data.dialogueText || '',
            '{speakerName}': data.speakerName || 'Personnage',
            '{narrativeContext}': data.narrativeContext || '',
            '{spellName}': data.spellName || 'Sort Mystique',
            '{ancientName}': data.ancientName || '',
            '{incantation}': data.incantation || '',
            '{spellEffects}': data.spellEffects || '',
            '{magicalNarration}': data.magicalNarration || '',
            '{combatNarration}': data.combatNarration || '',
            '{participants}': data.participants || '',
            '{results}': data.results || '',
            '{kingdomDescription}': data.kingdomDescription || '',
            '{arrivalNarration}': data.arrivalNarration || '',
            '{availableActions}': data.availableActions || '',
            '{responseOptions}': data.responseOptions || ''
        };
        
        // Remplace tous les placeholders
        for (const [placeholder, value] of Object.entries(placeholders)) {
            processed = processed.replace(new RegExp(placeholder, 'g'), value);
        }
        
        // Traite les éléments spéciaux
        processed = this.processSpecialElements(processed, data);
        
        return processed;
    }

    /**
     * Traite les éléments spéciaux de la narration
     * @param {string} text - Texte à traiter
     * @param {Object} data - Données
     * @returns {string}
     */
    processSpecialElements(text, data) {
        // Gère les barres de statut
        if (text.includes('{statusBars}') && data.character) {
            const LoadingBarManager = require('./LoadingBarManager');
            const barManager = new LoadingBarManager();
            
            const healthBar = barManager.createHealthBar(
                data.character.currentLife || 100,
                data.character.maxLife || 100,
                'life'
            );
            
            const energyBar = barManager.createHealthBar(
                data.character.currentEnergy || 100,
                data.character.maxEnergy || 100,
                'energy'
            );
            
            const statusBars = `📊 **ÉTAT DU PERSONNAGE**\n${healthBar}\n${energyBar}`;
            text = text.replace('{statusBars}', statusBars);
        }
        
        // Gère les barres de chargement
        if (text.includes('{loadingBar}') && data.loadingBar) {
            text = text.replace('{loadingBar}', data.loadingBar);
        }
        
        // Gère le placeholder d'image
        if (text.includes('{IMAGE}')) {
            const imageText = data.imagePath ? 
                '🖼️ *[Image du personnage attachée]*' : 
                this.generateAsciiPortrait(data.characterName);
            text = text.replace('{IMAGE}', imageText);
        }
        
        return text;
    }

    /**
     * Génère un portrait ASCII simple
     * @param {string} characterName - Nom du personnage
     * @returns {string}
     */
    generateAsciiPortrait(characterName) {
        const portraits = [
            `╭─────────────╮
│    ( ◕ ◕ )    │
│   \\   ◡   /   │
│    \\     /    │
│     \\___/     │
╰─────────────╯
   ${characterName}`,
   
            `╔═════════════╗
║    ◇ ◇ ◇    ║
║  (  ⌐ ‿ ⌐ )  ║
║    \\   /     ║
║     \\_/      ║
╚═════════════╝
   ${characterName}`,
   
            `┌─────────────┐
│  ▣ ▣ ▣ ▣ ▣  │
│ ( ● ◡ ● )   │
│   \\  ∀  /    │
│    \\___/     │
└─────────────┘
   ${characterName}`
        ];
        
        return portraits[Math.floor(Math.random() * portraits.length)];
    }

    /**
     * Ajoute de l'art ASCII selon le type de narration
     * @param {string} narration - Narration de base
     * @param {string} type - Type de narration
     * @returns {string}
     */
    addAsciiArt(narration, type) {
        const asciiArt = {
            combat_scene: `
⚔️ ═══════════════════════════════════════ ⚔️
           ⚡ COMBAT EN COURS ⚡
⚔️ ═══════════════════════════════════════ ⚔️`,
            
            magic_casting: `
✨ ～～～～～～～～～～～～～～～～～～～～～ ✨
        🔮 MAGIE EN ACTIVATION 🔮
✨ ～～～～～～～～～～～～～～～～～～～～～ ✨`,
            
            kingdom_arrival: `
🏰 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 🏰
           🏛️ ROYAUME MAJESTUEUX 🏛️
🏰 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 🏰`,
            
            dialogue: `
💬 ╔═══════════════════════════════════════╗
   ║         CONVERSATION EN COURS         ║
   ╚═══════════════════════════════════════╝ 💬`
        };
        
        if (asciiArt[type]) {
            narration = asciiArt[type] + '\n\n' + narration;
        }
        
        return narration;
    }

    /**
     * Crée une narration de dialogue avec personnage
     * @param {Object} speaker - Informations sur le personnage qui parle
     * @param {string} message - Message du dialogue
     * @param {Object} context - Contexte de la conversation
     * @returns {Promise<Object>}
     */
    async createDialogueNarration(speaker, message, context = {}) {
        const data = {
            characterId: speaker.id,
            speakerName: speaker.name,
            dialogueText: message,
            narrativeContext: context.description || `${speaker.name} vous regarde attentivement...`,
            responseOptions: context.options || '💭 *Que répondez-vous ?*'
        };
        
        return await this.createNarrativeWithImage('dialogue', data);
    }

    /**
     * Crée une narration de combat avec images
     * @param {Object} combatData - Données du combat
     * @returns {Promise<Object>}
     */
    async createCombatNarration(combatData) {
        const LoadingBarManager = require('./LoadingBarManager');
        const barManager = new LoadingBarManager();
        
        const loadingBar = barManager.createCombatProgressBar(
            combatData.attacker.name,
            combatData.defender.name,
            combatData.result
        );
        
        const data = {
            characterId: combatData.attacker.id,
            combatNarration: combatData.description,
            participants: `👤 ${combatData.attacker.name} VS ${combatData.defender.name}`,
            results: `💥 Dégâts: ${combatData.result.damage}`,
            loadingBar: loadingBar
        };
        
        return await this.createNarrativeWithImage('combat_scene', data);
    }

    /**
     * Crée une narration de sort avec alphabet ancien
     * @param {Object} spellData - Données du sort
     * @param {Object} caster - Lanceur du sort
     * @returns {Promise<Object>}
     */
    async createSpellNarration(spellData, caster) {
        const AncientAlphabetManager = require('./AncientAlphabetManager');
        const alphabetManager = new AncientAlphabetManager();
        
        const data = {
            characterId: caster.id,
            spellName: spellData.name,
            ancientName: alphabetManager.toAncientText(spellData.name),
            incantation: spellData.incantation,
            spellEffects: spellData.effects,
            magicalNarration: `✨ ${caster.name} concentre son énergie mystique...`
        };
        
        return await this.createNarrativeWithImage('magic_casting', data);
    }

    /**
     * Génère une narration complète pour une action de jeu
     * @param {string} actionType - Type d'action
     * @param {Object} actionData - Données de l'action
     * @returns {Promise<Object>}
     */
    async generateGameActionNarration(actionType, actionData) {
        switch (actionType) {
            case 'character_creation':
                return await this.createNarrativeWithImage('character_intro', actionData);
            
            case 'combat':
                return await this.createCombatNarration(actionData);
            
            case 'spell_casting':
                return await this.createSpellNarration(actionData.spell, actionData.caster);
            
            case 'dialogue':
                return await this.createDialogueNarration(actionData.speaker, actionData.message, actionData.context);
            
            case 'kingdom_travel':
                return await this.createNarrativeWithImage('kingdom_arrival', actionData);
            
            default:
                return {
                    text: actionData.description || 'Action effectuée avec succès.',
                    imagePath: null,
                    hasImage: false,
                    type: 'generic'
                };
        }
    }
}

module.exports = NarrationImageManager;