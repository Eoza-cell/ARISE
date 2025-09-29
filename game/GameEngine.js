const OpenAIClient = require('../ai/OpenAIClient');
const OllamaClient = require('../ai/OllamaClient');
const GroqClient = require('../groq/GroqClient');
const GeminiClient = require('../gemini/GeminiClient');
const AdvancedGameMechanics = require('./AdvancedMechanics');
const LoadingBarManager = require('../utils/LoadingBarManager');
const AncientAlphabetManager = require('../utils/AncientAlphabetManager');
const AdminManager = require('../utils/AdminManager');
const NarrationImageManager = require('../utils/NarrationImageManager');
const CharacterCustomizationManager = require('../utils/CharacterCustomizationManager');
const QuestManager = require('../utils/QuestManager');
const AuraManager = require('../utils/AuraManager');
const TimeManager = require('../utils/TimeManager');
const ReactionTimeManager = require('../utils/ReactionTimeManager');
const HealthBarManager = require('../utils/HealthBarManager');
const RPEncounterManager = require('../utils/RPEncounterManager');
const path = require('path');

class GameEngine {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.imageGenerator = null; // Sera initialisé plus tard
        this.playhtClient = null;
        this.cambAIClient = null;
        this.puterClient = null;
        this.asset3DManager = null;
        this.blenderClient = null;
        this.runwayClient = null;

        // Initialiser la large database
        const LargeDatabase = require('../database/LargeDatabase');
        this.largeDB = new LargeDatabase();

        this.openAIClient = new OpenAIClient(this.dbManager);
        this.ollamaClient = new OllamaClient();
        this.groqClient = new GroqClient();
        this.geminiClient = new GeminiClient();
        this.advancedMechanics = new AdvancedGameMechanics(this.dbManager, this);
        this.characterCustomization = null;

        // Système de temps de réaction par rang
        this.reactionTimes = {
            'G': 360000, // 6 minutes
            'F': 300000, // 5 minutes
            'E': 240000, // 4 minutes
            'D': 180000, // 3 minutes
            'C': 120000, // 2 minutes
            'B': 60000,  // 1 minute
            'A': 30000,  // 30 secondes
            'S': 15000,  // 15 secondes
            'S+': 10000, // 10 secondes
            'SS': 8000,  // 8 secondes
            'SSS': 5000, // 5 secondes
            'MONARQUE': 3000 // 3 secondes
        };

        // Système de barres de régénération
        this.regenerationSystem = new Map();
        this.activeActions = new Map(); // Actions en attente de réponse

        // Base de données de techniques (1 million de techniques)
        this.techniqueDatabase = new Map();
        this.initializeTechniqueDatabase();

        // Mots-clés pour détecter les intentions
        this.intentionKeywords = {
            attack: ['attaque', 'frappe', 'combat', 'tue', 'massacre', 'poignarde', 'tranche', 'décapite', 'coup', 'strike', 'hit', 'poing', 'gifle', 'claque', 'bourre', 'cogne', 'tape'],
            defend: ['défend', 'bloque', 'pare', 'protection', 'bouclier', 'guard', 'block', 'parry', 'esquive', 'recule'],
            magic: ['sort', 'magie', 'incantation', 'sorts', 'spell', 'enchantement', 'rituel', 'invoque'],
            movement: ['bouge', 'déplace', 'cours', 'marche', 'saute', 'vole', 'move', 'run', 'jump', 'avance', 'recule'],
            technique: ['technique', 'skill', 'capacité', 'pouvoir', 'ability', 'special'],
            item: ['utilise', 'prend', 'équipe', 'boit', 'mange', 'use', 'take', 'equip']
        };

        // Techniques de combat de base par défaut - EXTRÊMEMENT FAIBLES NIVEAU 1
        this.basicCombatTechniques = {
            'coup de poing': { name: 'Coup de Poing Faible', power: 3, energy: 8, precision: 'very_low' },
            'coup de poing droit': { name: 'Coup de Poing Droit Maladroit', power: 4, energy: 10, precision: 'very_low' },
            'coup de poing gauche': { name: 'Coup de Poing Gauche Hésitant', power: 3, energy: 9, precision: 'very_low' },
            'uppercut': { name: 'Uppercut Raté', power: 5, energy: 15, precision: 'very_low' },
            'direct': { name: 'Direct Tremblant', power: 4, energy: 12, precision: 'very_low' },
            'crochet': { name: 'Crochet Désespéré', power: 3, energy: 11, precision: 'very_low' },
            'coup de pied': { name: 'Coup de Pied Pathétique', power: 4, energy: 14, precision: 'very_low' },
            'balayage': { name: 'Balayage Inutile', power: 2, energy: 10, precision: 'very_low' },
            'coup de genou': { name: 'Coup de Genou Faible', power: 5, energy: 16, precision: 'very_low' },
            'coup de coude': { name: 'Coup de Coude Mou', power: 4, energy: 13, precision: 'very_low' }
        };

        // Puissance des PNJ - même les gardes sont dangereux pour les débutants
        this.npcPowerLevels = {
            'garde_civil': { power: 25, defense: 20, health: 80, level: 5 },
            'garde_royal': { power: 40, defense: 35, health: 120, level: 8 },
            'soldat': { power: 35, defense: 25, health: 100, level: 6 },
            'bandit': { power: 20, defense: 15, health: 60, level: 4 },
            'vagabond': { power: 12, defense: 8, health: 40, level: 2 },
            'rat_geant': { power: 8, defense: 5, health: 25, level: 1 },
            'gobelin': { power: 15, defense: 10, health: 35, level:2 }
        };

        // Techniques spéciales par rang
        this.rankTechniques = {
            'G': ['Coup Basique', 'Défense Simple', 'Course'],
            'F': ['Attaque Rapide', 'Esquive', 'Concentration'],
            'E': ['Combo Double', 'Contre-Attaque', 'Endurance'],
            'D': ['Frappe Précise', 'Parade Parfaite', 'Vitesse'],
            'C': ['Attaque Élémentaire', 'Barrière', 'Agilité'],
            'B': ['Combo Triple', 'Réflexes', 'Force'],
            'A': ['Technique Secrète', 'Maîtrise', 'Puissance'],
            'S': ['Art Légendaire', 'Transcendance', 'Domination'],
            'S+': ['Technique Divine', 'Perfection', 'Absolutisme'],
            'SS': ['Art Cosmique', 'Infinité', 'Omnipotence'],
            'SSS': ['Technique Ultime', 'Création', 'Destruction Totale'],
            'MONARQUE': ['Souveraineté Absolue', 'Commandement Divin', 'Règne Éternel']
        };

        // Nouveaux systèmes intégrés
        this.loadingBarManager = new LoadingBarManager();
        this.ancientAlphabetManager = new AncientAlphabetManager();
        this.adminManager = new AdminManager();
        this.narrationImageManager = new NarrationImageManager();
        this.healthBarManager = new HealthBarManager(); // Nouveau système de barres de vie
        this.questManager = null; // Initialisé avec dbManager
        this.auraManager = null; // Initialisé avec dbManager
        this.timeManager = null; // Initialisé avec dbManager
        this.reactionTimeManager = null; // Initialisé avec sock
        this.rpEncounterManager = null; // Initialisé avec sock pour rencontres RP

        // Systèmes de difficulté
        this.playerFatigue = new Map(); // Fatigue par joueur (0-100)
        this.combatConditions = new Map(); // Conditions de combat par joueur (ex: 'étourdi', 'saignement')
        this.playerDifficultySettings = new Map(); // Paramètres de difficulté par joueur

        this.commandHandlers = {
            // Core commands that definitely exist
            '/menu': this.handleMenuCommand.bind(this),
            '/créer': this.handleCreateCharacterCommand.bind(this),
            '/créer_personnage': this.handleCreateCharacterCommand.bind(this),
            '/fiche': this.handleCharacterSheetCommand.bind(this),
            '/aide': this.handleHelpCommand.bind(this),
            '/help': this.handleHelpCommand.bind(this),
            '/guide': this.handleHelpCommand.bind(this),
            '/jouer': this.handlePlayCommand.bind(this),
            '/royaumes': this.handleKingdomsCommand.bind(this),
            '/ordres': this.handleOrdersCommand.bind(this),
            '/combat': this.handleCombatCommand.bind(this),
            '/inventaire': this.handleInventoryCommand.bind(this),
            '/carte': this.handleMapCommand.bind(this),
            '/boutons': this.handleButtonsTestCommand.bind(this),
            '/buttons': this.handleButtonsTestCommand.bind(this),
            '/reputation': this.handleReputationCommand.bind(this),
            '/evenements': this.handleEventsCommand.bind(this),
            '/meteo': this.handleWeatherCommand.bind(this),
            '/marché': this.handleMarketCommand.bind(this),
            '/factions': this.handleFactionsCommand.bind(this),
            '/defis': this.handleChallengesCommand.bind(this),

            // Commandes de sauvegarde et base de données
            '/sauvegarde': this.handleSaveGameCommand.bind(this),
            '/save': this.handleSaveGameCommand.bind(this),
            '/backup': this.handleBackupCommand.bind(this),
            '/restore': this.handleRestoreCommand.bind(this),
            '/stats_db': this.handleDatabaseStatsCommand.bind(this),

            // Aura commands that exist
            '/aura': this.handleAuraInfoCommand.bind(this),
            '/aura_info': this.handleAuraInfoCommand.bind(this),
            '/aura_apprendre': this.handleLearnAuraCommand.bind(this),
            '/aura_learn': this.handleLearnAuraCommand.bind(this),
            '/aura_session': this.handleAuraSessionCommand.bind(this),
            '/aura_training': this.handleAuraSessionCommand.bind(this),
            '/aura_techniques': this.handleAuraTechniquesCommand.bind(this),
            '/aura_cast': this.handleCastAuraCommand.bind(this),
            '/mediter': this.handleMeditateCommand.bind(this),
            '/meditate': this.handleMeditateCommand.bind(this),
            '/regenerer_aura': this.handleRegenerateAuraCommand.bind(this),
            '/regenerate_aura': this.handleRegenerateAuraCommand.bind(this),
            '/regenerer_magie': this.handleRegenerateMagicCommand.bind(this),
            '/regenerate_magic': this.handleRegenerateMagicCommand.bind(this),
            '/aura_regen': this.handleAuraRegenCommand.bind(this),
            '/magic_regen': this.handleMagicRegenCommand.bind(this),
            '/aura_stats': this.handleAuraStatsCommand.bind(this),
            '/aura_help': this.handleAuraHelpCommand.bind(this),

            // Time and weather commands that exist
            '/temps': this.handleTimeCommand.bind(this),
            '/time': this.handleTimeCommand.bind(this),
            '/coordonnees': this.handleCoordinatesCommand.bind(this),
            '/coordinates': this.handleCoordinatesCommand.bind(this),
            '/position': this.handleCoordinatesCommand.bind(this),
            '/calendrier': this.handleCalendarCommand.bind(this),
            '/calendar': this.handleCalendarCommand.bind(this),
            '/time_system': this.handleTimeSystemCommand.bind(this)
        };
    }

    async processPlayerMessage({ playerNumber, chatId, message, imageMessage, originalMessage, sock, dbManager, imageGenerator, isCommand = false }) {
        // Gestion spéciale pour l'authentification admin
        if (message && this.adminManager.containsAuthCode(message)) {
            const authResult = this.adminManager.authenticateAdmin(playerNumber, message);

            if (authResult) {
                // Supprimer le message d'authentification pour la sécurité
                setTimeout(async () => {
                    try {
                        await sock.sendMessage(chatId, { delete: originalMessage.key });
                        console.log(`🗑️ Message d'authentification admin supprimé automatiquement`);
                    } catch (error) {
                        console.log(`⚠️ Impossible de supprimer le message d'auth: ${error.message}`);
                    }
                }, 2000);

                return {
                    text: `🔐 **AUTHENTIFICATION ADMIN RÉUSSIE** 🔐

✅ Vous êtes maintenant authentifié en tant qu'administrateur
⏰ Session valide pendant 30 minutes
🛡️ Accès complet aux commandes d'administration

🔒 Ce message sera automatiquement supprimé pour la sécurité.`
                };
            } else {
                return {
                    text: `❌ **ÉCHEC D'AUTHENTIFICATION** ❌

🚫 Code invalide ou utilisateur non autorisé
🔐 Contactez l'administrateur principal si vous pensez qu'il y a une erreur`
                };
            }
        }
        try {
            // Initialisation des managers avec dbManager si pas encore fait
            if (!this.questManager) {
                const QuestManager = require('../utils/QuestManager');
                this.questManager = new QuestManager(dbManager);
            }
            if (!this.auraManager) {
                const AuraManager = require('../utils/AuraManager');
                this.auraManager = new AuraManager(dbManager, this.loadingBarManager);
            }
            if (!this.timeManager) {
                const TimeManager = require('../utils/TimeManager');
                this.timeManager = new TimeManager(dbManager);
            }

            if (!this.reactionTimeManager && sock) {
                this.reactionTimeManager = new ReactionTimeManager(this, sock);
            }

            if (!this.characterCustomization && sock) {
                this.characterCustomization = new CharacterCustomizationManager(dbManager, imageGenerator, sock);
            }

            if (!this.rpEncounterManager && sock) {
                this.rpEncounterManager = new RPEncounterManager(this, sock);
            }

            let player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                const username = `Joueur_${playerNumber.slice(-4)}`;
                player = await dbManager.createPlayer(playerNumber, username);

                return {
                    text: `🎮 **Bienvenue dans FRICTION ULTIMATE !**

Tu es maintenant enregistré en tant que : **${username}**

🏰 Dans ce monde médiéval-technologique, chaque action compte et la moindre erreur peut être fatale.

📱 **Commandes principales :**
• /menu - Afficher le menu principal
• /créer - Créer ton personnage
• /aide - Voir toutes les commandes

💀 **Attention :** Ce monde est impitoyable. Prépare-toi à l'aventure la plus dangereuse de ta vie !`,
                    image: await imageGenerator.generateMenuImage()
                };
            }

            await dbManager.updatePlayerActivity(player.id);

            if (!message && imageMessage) {
                const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
                const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');
                const photoReceived = await dbManager.getTemporaryData(player.id, 'photo_received');

                if (creationMode === 'description' && creationStarted && !photoReceived) {
                    console.log(`📸 Photo reçue pour création personnage de ${player.whatsappNumber}`);
                    return await this.handlePhotoReceived({ player, imageMessage, originalMessage: arguments[0].originalMessage, sock, dbManager, imageGenerator });
                } else {
                    return {
                        text: `🖼️ J'ai reçu votre image ! Cependant, je ne peux traiter que les commandes textuelles.

💬 Utilisez /menu pour voir les commandes disponibles.`
                    };
                }
            }

            if (!message) {
                return {
                    text: `💬 Utilisez /menu pour voir les commandes disponibles.`
                };
            }

            const command = message.toLowerCase().trim();
            let response = null;

            if (this.characterCustomization && this.characterCustomization.activeCustomizations.has(playerNumber)) {
                const handled = await this.characterCustomization.handleCustomizationResponse(playerNumber, chatId, message);
                if (handled) {
                    return { text: '' };
                }
            }

            if (imageMessage) {
                const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
                const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');

                if (creationMode === 'description' && creationStarted) {
                    return await this.handlePhotoReceived({ player, imageMessage, originalMessage, sock, dbManager, imageGenerator });
                }
            }

            const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');
            const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
            const photoReceived = await dbManager.getTemporaryData(player.id, 'photo_received');

            if (creationMode === 'description' && creationStarted && photoReceived && message && !this.commandHandlers[command]) {
                return await this.handleDescriptionCreation({ player, description: message, dbManager, imageGenerator });
            }

            if (message && message.toUpperCase().trim() === 'SUPPRIMER_PERSONNAGE') {
                return await this.handleDeleteCharacter({ player, dbManager, imageGenerator });
            }

            if (this.commandHandlers[command]) {
                response = await this.commandHandlers[command]({ player, chatId, message, dbManager, imageGenerator, sock, playerNumber });
            } else {
                // Vérifier les tentatives d'actions impossibles
                const character = await dbManager.getCharacterByPlayer(player.id); // Récupérer le personnage ici pour la vérification
                const impossibleAction = await this.checkImpossibleAction(message, character);
                if (impossibleAction) {
                    return impossibleAction;
                }
            }

            const playerId = player.id;
            const normalizedMessage = message.toLowerCase().trim();


            if (!response) {
                // Si c'est une commande non reconnue, retourner aide sans narration IA
                if (isCommand) {
                    console.log(`⚡ Commande inconnue: ${message} - AUCUNE NARRATION`);
                    return {
                        text: `❓ **Commande inconnue : ${message}**

📱 **Commandes disponibles :**
• /menu - Menu principal
• /créer - Créer ton personnage
• /aide - Liste complète des commandes
• /jouer - Entrer en mode jeu

💡 Tapez /aide pour voir toutes les commandes disponibles.`
                    };
                }

                const character = await dbManager.getCharacterByPlayer(player.id);

                if (!character) {
                    return {
                        text: `❌ Tu n'as pas encore de personnage !

Utilise /créer pour créer ton personnage, puis /jouer pour entrer en mode jeu.`
                    };
                }

                // Toutes les actions sont traitées par la narration IA
                console.log(`🎭 Action RPG: ${message} - NARRATION IA GÉNÉRÉE`);
                return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
            }

            return response;

        } catch (error) {
            console.error('❌ Erreur dans le moteur de jeu:', error);
            return {
                text: `❌ Une erreur s'est produite dans le moteur de jeu. Veuillez réessayer.`
            };
        }
    }

    async handleMenuCommand({ player, dbManager, imageGenerator }) {
        await dbManager.clearTemporaryData(player.id, 'game_mode');

        const character = await this.dbManager.getCharacterByPlayer(player.id);

        let menuText = `🎮 **FRICTION ULTIMATE - Menu Principal**\n\n`;

        if (character) {
            menuText += `👤 **Personnage :** ${character.name}
🏰 **Royaume :** ${character.kingdom}
⚔️ **Ordre :** ${character.order || 'Aucun'}
📊 **Niveau :** ${character.level} (${character.powerLevel})\n\n`;
        }

        menuText += `📱 **Commandes disponibles :**
• /jouer - 🎮 ENTRER DANS LE JEU
• /créer - Créer ton personnage
• /modifier - Modifier ton personnage
• /fiche - Voir ta fiche de personnage
• /royaumes - Explorer les 12 royaumes
• /ordres - Découvrir les 7 ordres
• /combat - Système de combat
• /inventaire - Gérer ton équipement
• /carte - Carte du monde
• /aide - Aide complète
• /time_system - Informations sur le temps de jeu

💀 **Le monde bouge en permanence. Chaque seconde compte !**`;

        try {
            const menuImage = await imageGenerator.generateMenuImage();
            return {
                text: menuText,
                image: menuImage
            };
        } catch (error) {
            console.error('⚠️ Erreur génération image menu, affichage sans image:', error);
            return {
                text: menuText + '\n\n⚠️ Image temporairement indisponible'
            };
        }
    }

    async handleCreateCharacterCommand({ player, dbManager, imageGenerator, sock, chatId }) {
        const existingCharacter = await this.dbManager.getCharacterByPlayer(player.id);

        if (existingCharacter) {
            return {
                text: `👤 Tu as déjà un personnage : **${existingCharacter.name}**

🏰 Royaume : ${existingCharacter.kingdom}
⚔️ Ordre : ${existingCharacter.order || 'Aucun'}

🎨 Pour créer un nouveau personnage,
tu dois d'abord supprimer l'actuel.

Écris "SUPPRIMER_PERSONNAGE" pour confirmer la suppression.`,
                image: await imageGenerator.generateCharacterImage(existingCharacter)
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_started', true);
        await dbManager.setTemporaryData(player.id, 'creation_mode', 'description');

        return {
            text: `🎭 **CRÉATION DE PERSONNAGE IA** 🎭

✨ Pour créer ton personnage idéal, l'IA a besoin de ton aide !

📸 **ÉTAPE 1 - ENVOIE TA PHOTO**
Envoie une photo de ton visage pour que l'IA Pollination puisse créer un personnage qui te ressemble !

📝 **ÉTAPE 2 - DÉCRIS TON PERSONNAGE**
Après ta photo, décris ton personnage idéal :
• Classe/profession (guerrier, mage, assassin...)
• Style vestimentaire et armure
• Origine/royaume préféré
• Personnalité et histoire

💡 **Exemple de description :**
"Un guerrier noble d'AEGYRIA avec une armure dorée. Il est courageux et loyal."

📸 **Commence par envoyer ta photo maintenant !**`,
            image: await imageGenerator.generateMenuImage()
        };
    }

    async startCharacterCreation({ player, dbManager, imageGenerator }) {
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        let creationText = `⚔️ **CRÉATION DE PERSONNAGE**

🎯 **Étape 1/3 - Choix du sexe**

👤 Choisis le sexe de ton personnage :

• Tape **HOMME** ou **H** pour masculin
• Tape **FEMME** ou **F** pour féminin

💀 **Attention :** Dans ce monde impitoyable, chaque choix compte !

⚡ **Processus rapide en 3 étapes :**
1. 👤 Sexe (maintenant)
2. 🏰 Royaume (prochaine étape)
3. 📝 Nom de personnage

🚀 **Tape HOMME, H, FEMME ou F pour continuer !**`;

        return {
            text: creationText,
            image: await imageGenerator.generateMenuImage()
        };
    }

    async handlePhotoReceived({ player, imageMessage, originalMessage, sock, dbManager, imageGenerator }) {
        try {
            console.log(`📸 Photo reçue pour création personnage de ${player.whatsappNumber}`);

            // Vérifier que nous avons une image à traiter
            if (!imageMessage || !imageMessage.buffer) {
                console.error('❌ ImageMessage manquant ou invalide');
                return {
                    text: `❌ **Erreur de message**

L'image n'a pas pu être traitée. Réessaie d'envoyer ta photo.`
                };
            }

            // Utiliser directement le buffer de imageMessage qui a déjà été téléchargé
            const imageBuffer = imageMessage.buffer;
            const mimetype = imageMessage.mimetype || 'image/jpeg';

            console.log(`✅ Utilisation image déjà téléchargée: ${imageBuffer.length} bytes`);

            if (imageBuffer && imageBuffer.length > 0) {
                // Validation renforcée de l'image
                if (imageBuffer.length < 500) { // Au moins 500 bytes
                    console.log(`⚠️ Image très petite détectée: ${imageBuffer.length} bytes`);
                    return {
                        text: `❌ **Image trop petite ou corrompue**

Taille reçue: ${imageBuffer.length} bytes
Minimum requis: 500 bytes

📸 **Conseils pour une bonne image :**
• Utilise une photo claire de ton visage
• Format JPEG ou PNG recommandé
• Taille minimum 500 bytes
• Évite les captures d'écran floues

Réessaie avec une image valide de ton personnage.`
                    };
                }

                if (imageBuffer.length > 10 * 1024 * 1024) { // Maximum 10MB
                    console.log(`⚠️ Image trop grosse détectée: ${imageBuffer.length} bytes`);
                    return {
                        text: `❌ **Image trop volumineuse**

Taille reçue: ${(imageBuffer.length / 1024 / 1024).toFixed(1)} MB
Maximum autorisé: 10 MB

📸 **Pour réduire la taille :**
• Compresse l'image avant envoi
• Utilise une résolution plus petite
• Change le format (JPEG compresse mieux)

Réessaie avec une image plus petite.`
                    };
                }

                // L'image a déjà été validée lors de l'extraction

                try {
                    await imageGenerator.saveCustomCharacterImage(player.id, imageBuffer, {
                        mimetype: mimetype,
                        originalSize: imageBuffer.length,
                        uploadedAt: new Date().toISOString()
                    });

                    await dbManager.setTemporaryData(player.id, 'photo_received', true);

                    console.log(`✅ Photo sauvegardée pour ${player.whatsappNumber} (${imageBuffer.length} bytes)`);

                    return {
                        text: `📸 **PHOTO REÇUE AVEC SUCCÈS !** 📸

✅ Ton visage a été enregistré pour la création du personnage.
📊 **Taille:** ${(imageBuffer.length / 1024).toFixed(1)} KB

📝 **MAINTENANT, DÉCRIS TON PERSONNAGE :**

Décris le personnage que tu veux incarner :

💡 **Exemple :**
"Un guerrier noble d'AEGYRIA avec une armure dorée et une épée lumineuse. Il est courageux, loyal et protège les innocents. Il vient des plaines d'honneur et rêve de devenir un paladin légendaire."

🎭 **Inclus :**
• Classe/profession
• Style d'armure/vêtements
• Royaume d'origine
• Personnalité
• Histoire

🚀 **Écris ta description maintenant !**`
                    };
                } catch (saveError) {
                    console.error('❌ Erreur sauvegarde:', saveError);
                    return {
                        text: `❌ **Erreur de sauvegarde**

L'image a été téléchargée mais n'a pas pu être sauvegardée.
📸 Réessaie d'envoyer ta photo.`
                    };
                }
            } else {
                console.log('❌ Impossible de télécharger l\'image après plusieurs tentatives');
                return {
                    text: `❌ **Erreur de téléchargement de photo**

La photo n'a pas pu être téléchargée après plusieurs tentatives.

🔧 **Solutions :**
• Vérifie ta connexion internet
• Assure-toi que l'image est claire et bien éclairée
• Réessaie d'envoyer la photo
• Utilise un format supporté (JPEG, PNG, WebP)`
                };
            }
        } catch (error) {
            console.error('❌ Erreur critique traitement photo:', error);
            console.error('❌ Stack trace:', error.stack);

            return {
                text: `❌ **Erreur critique lors du traitement de la photo**

Détails: ${error.message}

🔧 **Solutions :**
• Réessaie d'envoyer ta photo
• Utilise une image plus petite
• Assure-toi d'utiliser un format supporté (JPEG, PNG)
• Contacte l'administrateur si le problème persiste`
            };
        }
    }

    async handleDescriptionCreation({ player, description, dbManager, imageGenerator }) {
        try {
            console.log(`🎭 Création par IA pour ${player.whatsappNumber}: ${description}`);

            const characterDataFromAI = await this.generateCharacterFromDescription(description, player);

            const newCharacter = await dbManager.createCharacter({
                ...characterDataFromAI,
                appearance: description
            });

            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            let characterImage = null;
            try {
                characterImage = await imageGenerator.generateCharacterImage(newCharacter, {
                    style: '3d',
                    perspective: 'first_person',
                    nudity: false
                });
            } catch (imageError) {
                console.error('⚠️ Erreur génération image personnage:', imageError);
            }

            return {
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !** 🎉

👤 **Nom :** ${newCharacter.name}
⚧️ **Sexe :** ${newCharacter.gender === 'male' ? 'Homme' : 'Femme'}
🏰 **Royaume :** ${newCharacter.kingdom}
📊 **Niveau :** ${newCharacter.level} (${newCharacter.powerLevel})
📍 **Localisation :** ${newCharacter.currentLocation}
💰 **Pièces :** ${newCharacter.coins}

✨ **Description générée par l'IA :**
"${description}"

🎮 **Tapez /jouer pour commencer l'aventure !**
📋 **Tapez /fiche pour voir tous les détails**`,
                image: characterImage
            };

        } catch (error) {
            console.error('❌ Erreur création personnage par IA:', error);

            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            return {
                text: `❌ **Erreur lors de la création**

Une erreur s'est produite lors de l'analyse de votre description.
Veuillez réessayer avec /créer.

💡 **Conseil :** Soyez plus précis dans votre description.`
            };
        }
    }

    async generateCharacterFromDescription(description, player) {
        try {
            if (this.groqClient && this.groqClient.hasValidClient()) {
                const analysisPrompt = `Analyse cette description de personnage RPG et extrait les informations suivantes au format JSON strict:

DESCRIPTION: "${description}"

Tu dois retourner UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "name": "nom du personnage (si pas mentionné, crée un nom approprié)",
  "gender": "male ou female (déduis du contexte)",
  "kingdom": "l'un de ces royaumes selon la description: AEGYRIA, SOMBRENUIT, KHELOS, ABRANTIS, VARHA, SYLVARIA, ECLYPSIA, TERRE_DESOLE, DRAK_TARR, URVALA, OMBREFIEL, KHALDAR",
  "level": 1,
  "powerLevel": "G",
  "frictionLevel": "G",
  "coins": 100
}

Règles importantes:
- Si le royaume n'est pas clair, choisis AEGYRIA par défaut
- Le nom doit être unique et approprié au style medieval-fantasy
- Réponds UNIQUEMENT avec le JSON, rien d'autre`;

                const aiResponse = await this.groqClient.generateNarration(analysisPrompt, 200);

                console.log('🤖 Réponse IA brute:', aiResponse);

                let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('Pas de JSON trouvé dans la réponse IA');
                }

                const characterInfo = JSON.parse(jsonMatch[0]);
                console.log('📊 Données personnage extraites:', characterInfo);

                return {
                    playerId: player.id,
                    name: characterInfo.name || `Héros_${player.whatsappNumber.slice(-4)}`,
                    gender: characterInfo.gender === 'female' ? 'female' : 'male',
                    kingdom: this.validateKingdom(characterInfo.kingdom),
                    order: null,
                    level: 1,
                    experience: 0,
                    powerLevel: 'G',
                    frictionLevel: 'G',
                    currentLife: 100,
                    maxLife: 100,
                    currentEnergy: 100,
                    maxEnergy: 100,
                    currentLocation: this.getStartingLocation(characterInfo.kingdom),
                    position: { x: 0, y: 0, z: 0 },
                    equipment: {},
                    learnedTechniques: [],
                    coins: 100,
                    inventory: []
                };

            } else {
                throw new Error('IA Groq non disponible');
            }

        } catch (error) {
            console.error('❌ Erreur analyse IA:', error);

            return {
                playerId: player.id,
                name: `Héros_${player.whatsappNumber.slice(-4)}`,
                gender: 'male',
                kingdom: 'AEGYRIA',
                order: null,
                level: 1,
                experience: 0,
                powerLevel: 'G',
                frictionLevel: 'G',
                currentLife: 100,
                maxLife: 100,
                currentEnergy: 100,
                maxEnergy: 100,
                currentLocation: 'Grande Plaine d\'Honneur - Village de Valorhall',
                position: { x: 0, y: 0, z: 0 },
                equipment: {},
                learnedTechniques: [],
                coins: 100,
                inventory: []
            };
        }
    }

    validateKingdom(kingdom) {
        const validKingdoms = ['AEGYRIA', 'SOMBRENUIT', 'KHELOS', 'ABRANTIS', 'VARHA', 'SYLVARIA', 'ECLYPSIA', 'TERRE_DESOLE', 'DRAK_TARR', 'URVALA', 'OMBREFIEL', 'KHALDAR'];
        return validKingdoms.includes(kingdom) ? kingdom : 'AEGYRIA';
    }

    /**
     * Démarre une action avec temps de réaction
     */
    async initiateActionWithReactionTime(playerId, targetId, actionType, actionData, sock, chatId) {
        const character = await this.dbManager.getCharacterByPlayer(playerId);
        if (!character) return;

        const target = await this.dbManager.getCharacterByPlayer(targetId);
        if (!target) return;

        const reactionTime = this.reactionTimes[target.powerLevel] || this.reactionTimes['G'];
        const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const actionInfo = {
            id: actionId,
            attackerId: playerId,
            defenderId: targetId,
            type: actionType,
            data: actionData,
            startTime: Date.now(),
            reactionTime,
            status: 'waiting_response',
            chatId
        };

        this.activeActions.set(actionId, actionInfo);

        // Envoyer la notification au défenseur
        await sock.sendMessage(chatId, {
            text: `⚔️ **COMBAT INITIÉ !**

🎯 **${character.name}** (${character.powerLevel}) attaque **${target.name}** (${target.powerLevel}) !

⏰ **Temps de réaction:** ${Math.floor(reactionTime / 1000)} secondes
🛡️ ${target.name} doit répondre avant expiration !

💭 **Action:** ${actionData.description}

⚠️ Si aucune réponse, ${target.name} restera immobile et subira l'attaque !`
        });

        // Démarrer le compte à rebours
        setTimeout(() => {
            this.processActionTimeout(actionId);
        }, reactionTime);

        return actionId;
    }

    /**
     * Traite l'expiration d'une action
     */
    async processActionTimeout(actionId) {
        const action = this.activeActions.get(actionId);
        if (!action || action.status !== 'waiting_response') {
            return;
        }

        action.status = 'timeout';

        const attacker = await this.dbManager.getCharacterByPlayer(action.attackerId);
        const defender = await this.dbManager.getCharacterByPlayer(action.defenderId);

        // Le défenseur n'a pas réagi, il reste immobile
        const damage = this.calculateDamage(attacker, defender, action.data, true); // true = pas de défense

        defender.currentLife = Math.max(0, defender.currentLife - damage);
        await this.dbManager.updateCharacter(defender.id, {
            currentLife: defender.currentLife
        });

        // Envoyer le résultat
        await this.sock.sendMessage(action.chatId, {
            text: `💥 **ATTAQUE RÉUSSIE !**

⏰ ${defender.name} n'a pas réagi à temps !
🗿 ${defender.name} reste immobile et subit l'attaque complète !

💀 **Dégâts infligés:** ${damage} PV
❤️ **Vie restante de ${defender.name}:** ${defender.currentLife}/${defender.maxLife}

${defender.currentLife === 0 ? '☠️ ' + defender.name + ' est vaincu !' : '⚔️ Le combat continue !'}`
        });

        this.activeActions.delete(actionId);
    }

    /**
     * Calcule les dégâts d'une attaque
     */
    calculateDamage(attacker, defender, actionData, noDefense = false) {
        const attackerRankMultiplier = this.getRankMultiplier(attacker.powerLevel);
        const defenderRankMultiplier = noDefense ? 1 : this.getRankMultiplier(defender.powerLevel);

        let baseDamage = 20 + (attacker.level * 5);
        baseDamage *= attackerRankMultiplier;

        if (!noDefense) {
            const defense = 10 + (defender.level * 2);
            baseDamage = Math.max(1, baseDamage - (defense * defenderRankMultiplier));
        }

        return Math.floor(baseDamage);
    }

    /**
     * Obtient le multiplicateur de rang
     */
    getRankMultiplier(rank) {
        const multipliers = {
            'G': 1.0,
            'F': 1.2,
            'E': 1.5,
            'D': 2.0,
            'C': 2.5,
            'B': 3.0,
            'A': 4.0,
            'S': 5.0,
            'S+': 6.0,
            'SS': 8.0,
            'SSS': 10.0,
            'MONARQUE': 15.0
        };

        return multipliers[rank] || 1.0;
    }

    /**
     * Vérifie si un joueur peut accéder au rang Monarque
     */
    async checkMonarqueEligibility(playerId) {
        // Vérifier si le joueur a tué un boss de rang S+
        const bossKills = await this.dbManager.getTemporaryData(playerId, 'boss_kills') || [];
        const sPlusBossKilled = bossKills.some(kill => kill.rank === 'S+');

        return sPlusBossKilled;
    }

    /**
     * Promeut un joueur au rang Monarque
     */
    async promoteToMonarque(playerId) {
        const character = await this.dbManager.getCharacterByPlayer(playerId);
        if (!character) return false;

        const eligible = await this.checkMonarqueEligibility(playerId);
        if (!eligible) return false;

        await this.dbManager.updateCharacter(character.id, {
            powerLevel: 'MONARQUE',
            frictionLevel: 'MONARQUE'
        });

        return true;
    }

    /**
     * Traite l'expiration d'une action de combat
     */
    processActionTimeout(actionId) {
        console.log(`💥 Action timeout: ${actionId}`);
        // Ici vous pouvez ajouter la logique pour traiter les timeouts
        // Par exemple, appliquer des dégâts, mettre à jour les stats, etc.

        // Logique future pour traiter les conséquences des timeouts
        // - Appliquer les dégâts non défendus
        // - Mettre à jour l'état du combat
        // - Calculer les effets de l'action

        return true;
    }

    /**
     * Traite une réaction PNJ automatique
     */
    processNPCReaction(npcData, npcReaction) {
        console.log(`🤖 Traitement réaction PNJ: ${npcData.name} - ${npcReaction.action}`);

        // Logique future pour traiter les réactions PNJ
        // - Calculer les effets de la réaction PNJ
        // - Mettre à jour l'état du combat/interaction
        // - Déclencher des événements en chaîne
        // - Affecter la réputation du joueur

        // Pour l'instant, juste logger l'événement
        return {
            success: true,
            npcAction: npcReaction.action,
            effectiveness: npcReaction.effectiveness,
            consequences: `Le PNJ ${npcData.name} a réagi avec ${npcReaction.effectiveness}% d'efficacité`
        };
    }

    getStartingLocation(kingdom) {
        const locations = {
            'AEGYRIA': 'Grande Plaine d\'Honneur - Village de Valorhall',
            'SOMBRENUIT': 'Forêt des Murmures - Clairière de Lunelame',
            'KHELOS': 'Oasis du Mirage - Campement de Sablesang',
            'ABRANTIS': 'Port de Marée-Haute - Taverne du Kraken',
            'VARHA': 'Pic des Loups - Village de Glacierre',
            'SYLVARIA': 'Bosquet Éternel - Cercle des Anciens',
            'ECLYPSIA': 'Terre d\'Ombre - Temple de l\'Éclipse',
            'TERRE_DESOLE': 'Wasteland Central - Campement des Survivants',
            'DRAK_TARR': 'Cratère de Feu - Forge Volcanique',
            'URVALA': 'Marais Maudit - Laboratoire des Morts',
            'OMBREFIEL': 'Plaine Grise - Citadelle des Exilés',
            'KHALDAR': 'Jungle Tropicale - Village sur Pilotis'
        };
        return locations[kingdom] || locations['AEGYRIA'];
    }

    async handleCharacterSheetCommand({ player, dbManager, imageGenerator }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !

Utilise la commande /créer pour en créer un.`
            };
        }

        const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
        const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

        const sheetText = `👤 **FICHE DE PERSONNAGE**

**Nom :** ${character.name}
**Sexe :** ${character.gender === 'male' ? 'Homme' : 'Femme'}
**Royaume :** ${character.kingdom}
**Ordre :** ${character.order || 'Aucun'}

📊 **Statistiques :**
• Niveau : ${character.level}
• Expérience : ${character.experience}
• Niveau de puissance : ${character.powerLevel}
• Niveau de friction : ${character.frictionLevel}

❤️ **Barres de vie :** ${lifeBar}
⚡ **Énergie :** ${energyBar}

📍 **Position :** ${character.currentLocation}
💰 **Pièces :** ${character.coins}

⚔️ **Équipement actuel :**
${this.formatEquipment(character.equipment)}

🎯 **Techniques apprises :**
${this.formatTechniques(character.learnedTechniques)}`;

        let characterImage = null;
        try {
            characterImage = await imageGenerator.generateCharacterImage(character, {
                style: '3d',
                perspective: 'first_person',
                nudity: false
            });
        } catch (imageError) {
            console.log('⚠️ Impossible de générer l\'image pour la fiche, continuons sans image:', imageError.message);
        }

        return {
            text: sheetText,
            image: characterImage
        };
    }

    async handleGameAction({ player, chatId, message, imageMessage, sock, dbManager, imageGenerator }) {
        const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
        const savedCharacterName = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (imageMessage && creationStarted && savedCharacterName) {
            try {
                console.log('📸 Réception d\'une image pour la création de personnage...');
                console.log('🔄 Tentative de téléchargement de l\'image...');

                const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                const imageBuffer = await downloadMediaMessage(imageMessage, 'buffer', {}, {
                    logger: require('pino')({ level: 'silent' })
                });

                if (imageBuffer && imageBuffer.length > 0) {
                    console.log(`✅ Image téléchargée avec succès: ${imageBuffer.length} bytes`);
                    return await this.finalizeCharacterCreation({
                        player,
                        dbManager,
                        imageGenerator,
                        hasCustomImage: true,
                        imageBuffer
                    });
                } else {
                    console.log('❌ Échec du téléchargement - buffer vide ou null');
                    return {
                        text: `❌ Erreur lors du téléchargement de l'image. Réessaie ou écris "SANS_PHOTO".`
                    };
                }
            } catch (error) {
                console.error('❌ Erreur traitement image:', error.message, error.stack);
                return {
                    text: `❌ Erreur lors du traitement de l'image (${error.message}). Réessaie ou écris "SANS_PHOTO".`
                };
            }
        } else if (imageMessage && !creationStarted) {
            return {
                text: '⚠️ Aucune création de personnage en cours. Tapez "/créer" d\'abord.'
            };
        }

        if (imageMessage && !message) {
            return {
                text: `📸 Image reçue, mais aucune action prévue pour les images pour le moment.`
            };
        }

        const input = message.toUpperCase().trim();
        if (creationStarted && (input === 'HOMME' || input === 'H' || input === 'FEMME' || input === 'F' || input === '1' || input === '2')) {
            return await this.handleGenderSelection({ player, message, dbManager, imageGenerator });
        }

        const tempGender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomNumber = parseInt(message);
        if (creationStarted && tempGender && kingdomNumber >= 1 && kingdomNumber <= 12) {
            return await this.handleKingdomSelection({ player, kingdomNumber, dbManager, imageGenerator });
        }

        const tempKingdom = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const existingName = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (creationStarted && tempGender && tempKingdom && !existingName) {
            return await this.handleCharacterNameInput({ player, name: message, dbManager, imageGenerator });
        }

        if (creationStarted && tempGender && tempKingdom && existingName) {
            if (message.toUpperCase() === 'SANS_PHOTO') {
                return await this.finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage: false });
            }
            return {
                text: `📸 **En attente de ta photo de visage...**

🖼️ Envoie une photo de ton visage ou écris "SANS_PHOTO" pour continuer sans photo personnalisée.`
            };
        }

        const modificationStarted = await dbManager.getTemporaryData(player.id, 'modification_started');
        if (modificationStarted) {
            return await this.handleModificationDescription({ player, description: message, dbManager, imageGenerator });
        }

        const isInGameMode = await dbManager.getTemporaryData(player.id, 'game_mode');

        if (!isInGameMode) {
            return {
                text: `💬 **Message libre détecté**

Salut ! Pour jouer à Friction Ultimate, utilise :
🎮 **/jouer** - Entrer en mode jeu
📋 **/menu** - Voir toutes les options

En mode libre, je ne traite pas les actions de jeu.`
            };
        }

        const character = await this.dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !`
            };
        }

        const hasQuotes = message.includes('"') || message.includes('«') || message.includes('»');
        const isDialogue = hasQuotes ||
                          message.toLowerCase().includes('parler') ||
                          message.toLowerCase().includes('dire') ||
                          message.toLowerCase().includes('demander');

        if (isDialogue) {
            return await this.processDialogueAction({ player, character, message, dbManager, imageGenerator });
        }

        return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
    }

    /**
     * Initialise la base de données de techniques
     */
    initializeTechniqueDatabase() {
        // Générer 1 million de techniques procéduralement
        const elements = ['Feu', 'Eau', 'Terre', 'Air', 'Foudre', 'Glace', 'Lumière', 'Ombre', 'Poison', 'Cristal'];
        const actions = ['Frappe', 'Lame', 'Vague', 'Explosion', 'Tornade', 'Lance', 'Bouclier', 'Barrière', 'Prison', 'Danse'];
        const modifiers = ['Divine', 'Démoniaque', 'Céleste', 'Infernale', 'Sacrée', 'Maudite', 'Éternelle', 'Temporelle', 'Spirituelle', 'Mortelle'];

        let techniqueId = 1;
        for (let i = 0; i < 100; i++) {
            for (let j = 0; j < 100; j++) {
                for (let k = 0; k < 100; k++) {
                    const element = elements[i % elements.length];
                    const action = actions[j % actions.length];
                    const modifier = modifiers[k % modifiers.length];

                    this.techniqueDatabase.set(techniqueId, {
                        id: techniqueId,
                        name: `${element} ${action} ${modifier}`,
                        element: element.toLowerCase(),
                        type: action.toLowerCase(),
                        power: Math.floor(Math.random() * 1000) + 1,
                        requiredRank: this.getRandomRank(),
                        manaCost: Math.floor(Math.random() * 100) + 10,
                        cooldown: Math.floor(Math.random() * 300) + 30
                    });

                    techniqueId++;
                    if (techniqueId > 1000000) break;
                }
                if (techniqueId > 1000000) break;
            }
            if (techniqueId > 1000000) break;
        }
    }

    /**
     * Obtient un rang aléatoire
     */
    getRandomRank() {
        const ranks = ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'SS', 'SSS', 'MONARQUE'];
        const weights = [30, 25, 20, 15, 10, 8, 5, 3, 2, 1, 0.8, 0.2]; // Plus faible = plus commun

        const random = Math.random() * 100;
        let cumulative = 0;

        for (let i = 0; i < ranks.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return ranks[i];
            }
        }

        return 'G';
    }

    /**
     * Détecte les techniques dans un message
     */
    detectTechniques(message) {
        const detectedTechniques = [];
        const lowerMessage = message.toLowerCase();

        // D'abord vérifier les techniques de combat de base
        for (const [key, technique] of Object.entries(this.basicCombatTechniques)) {
            if (lowerMessage.includes(key) || lowerMessage.includes(technique.name.toLowerCase())) {
                detectedTechniques.push({
                    id: key,
                    name: technique.name,
                    power: technique.power,
                    requiredRank: 'G', // Techniques de base accessibles à tous
                    manaCost: technique.energy,
                    precision: technique.precision,
                    type: 'combat_basic'
                });
            }
        }

        // Ensuite rechercher dans la base de données avancée
        for (const [id, technique] of this.techniqueDatabase) {
            if (lowerMessage.includes(technique.name.toLowerCase())) {
                detectedTechniques.push(technique);
                if (detectedTechniques.length >= 5) break; // Limite à 5 techniques
            }
        }

        return detectedTechniques;
    }

    /**
     * Détecte les intentions du joueur
     */
    detectIntentions(message) {
        const detectedIntentions = [];
        const lowerMessage = message.toLowerCase();

        for (const [intention, keywords] of Object.entries(this.intentionKeywords)) {
            for (const keyword of keywords) {
                if (lowerMessage.includes(keyword)) {
                    detectedIntentions.push(intention);
                    break;
                }
            }
        }

        return detectedIntentions;
    }

    /**
     * Valide si l'action est possible
     */
    validateAction(character, message) {
        const errors = [];
        const lowerMessage = message.toLowerCase();

        // Vérifier les techniques de combat de base (toujours autorisées)
        const basicTechniqueDetected = Object.keys(this.basicCombatTechniques).some(key =>
            lowerMessage.includes(key)
        );

        // Si c'est une technique de combat de base, pas d'erreur
        if (basicTechniqueDetected) {
            console.log(`✅ Technique de combat de base détectée: ${message}`);
            return []; // Les techniques de base sont toujours valides
        }

        // Vérifier les objets mentionnés seulement si ce n'est pas du combat de base
        const itemKeywords = ['utilise', 'prend', 'équipe', 'avec mon', 'avec ma', 'sort mon', 'sort ma'];
        for (const keyword of itemKeywords) {
            if (lowerMessage.includes(keyword)) {
                // Extraire l'objet mentionné (logique simplifiée)
                const words = lowerMessage.split(' ');
                const keywordIndex = words.findIndex(word => keyword.includes(word));
                if (keywordIndex !== -1 && keywordIndex < words.length - 1) {
                    const item = words[keywordIndex + 1];
                    if (!character.inventory?.some(inv => inv.itemId.toLowerCase().includes(item)) &&
                        !Object.values(character.equipment || {}).some(eq => eq.toLowerCase().includes(item))) {
                        errors.push(`❌ Vous ne possédez pas : ${item}`);
                    }
                }
            }
        }

        // Vérifier les techniques avancées par rang
        const detectedTechniques = this.detectTechniques(message);
        for (const technique of detectedTechniques) {
            if (technique.type !== 'combat_basic' && !this.canUseTechnique(character, technique)) {
                errors.push(`❌ Technique "${technique.name}" requiert le rang ${technique.requiredRank} (vous: ${character.powerLevel})`);
            }
        }

        return errors;
    }

    /**
     * Vérifie si le personnage peut utiliser une technique
     */
    canUseTechnique(character, technique) {
        const rankOrder = ['G', 'F', 'E', 'D', 'C', 'B', 'A', 'S', 'S+', 'SS', 'SSS', 'MONARQUE'];
        const characterRankIndex = rankOrder.indexOf(character.powerLevel);
        const techniqueRankIndex = rankOrder.indexOf(technique.requiredRank);

        return characterRankIndex >= techniqueRankIndex;
    }

    /**
     * Démarre le système de régénération pour un joueur
     */
    async startRegeneration(playerId, type, maxValue, sock, chatId) {
        const regenKey = `${playerId}_${type}`;

        // Arrêter la régénération existante si elle existe
        if (this.regenerationSystem.has(regenKey)) {
            clearInterval(this.regenerationSystem.get(regenKey).interval);
        }

        let currentValue = 0;
        const regenData = {
            playerId,
            type,
            currentValue,
            maxValue,
            startTime: Date.now(),
            messageId: null
        };

        // Envoyer le message initial
        const initialMessage = this.generateRegenMessage(regenData);
        const response = await sock.sendMessage(chatId, { text: initialMessage });
        regenData.messageId = response.key.id;

        // Démarrer la régénération (60 secondes = 60 intervalles de 1 seconde)
        const interval = setInterval(async () => {
            currentValue++;
            regenData.currentValue = currentValue;

            const updatedMessage = this.generateRegenMessage(regenData);

            try {
                await sock.sendMessage(chatId, {
                    text: updatedMessage,
                    edit: regenData.messageId
                });
            } catch (error) {
                // Si l'édition échoue, envoyer un nouveau message
                const newResponse = await sock.sendMessage(chatId, { text: updatedMessage });
                regenData.messageId = newResponse.key.id;
            }

            if (currentValue >= maxValue) {
                clearInterval(interval);
                this.regenerationSystem.delete(regenKey);

                // Message final
                await sock.sendMessage(chatId, {
                    text: `✅ **${type.toUpperCase()} RECHARGÉ !**

${type === 'aura' ? '🔮' : '✨'} Votre ${type} est maintenant à son maximum !`
                });
            }
        }, 1000); // Chaque seconde

        regenData.interval = interval;
        this.regenerationSystem.set(regenKey, regenData);
    }

    /**
     * Génère le message de régénération avec barre
     */
    generateRegenMessage(regenData) {
        const { type, currentValue, maxValue, startTime } = regenData;
        const percentage = (currentValue / maxValue) * 100;

        // Générer la barre de progression
        const totalBars = 10;
        const filledBars = Math.floor((currentValue / maxValue) * totalBars);
        const emptyBars = totalBars - filledBars;

        const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);
        const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeRemaining = Math.max(0, 60 - timeElapsed);

        const emoji = type === 'aura' ? '🔮' : '✨';
        const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1);

        return `${emoji} **RÉGÉNÉRATION ${typeDisplay.toUpperCase()}** ${emoji}

${progressBar} ${Math.floor(percentage)}%

⏱️ Temps écoulé: ${timeElapsed}s / 60s
⏳ Temps restant: ${timeRemaining}s

💫 Récupération en cours...`;
    }

    /**
     * Détecte si le joueur interagit avec un PNJ
     */
    detectNPCInteraction(message) {
        const lowerMessage = message.toLowerCase();

        // Mots-clés d'interaction avec PNJ
        const npcInteractionKeywords = {
            talk: ['parle', 'dis', 'demande', 'questionne', 'interpelle', 'salue', 'bonjour', 'hey'],
            attack: ['attaque', 'frappe', 'combat', 'tue', 'massacre', 'agresse'],
            trade: ['achète', 'vend', 'échange', 'commerce', 'négocie'],
            follow: ['suis', 'accompagne', 'va avec'],
            help: ['aide', 'assiste', 'secours']
        };

        // Mots-clés de cibles PNJ
        const npcTargets = [
            'garde', 'soldat', 'marchand', 'villageois', 'paysan', 'noble', 'roi', 'reine',
            'prêtre', 'mage', 'voleur', 'bandit', 'assassin', 'forgeron', 'aubergiste',
            'pnj', 'personnage', 'homme', 'femme', 'enfant', 'vieillard', 'guerrier'
        ];

        for (const [actionType, keywords] of Object.entries(npcInteractionKeywords)) {
            for (const keyword of keywords) {
                if (lowerMessage.includes(keyword)) {
                    // Chercher une cible PNJ dans le message
                    for (const target of npcTargets) {
                        if (lowerMessage.includes(target)) {
                            return {
                                type: actionType,
                                target: target,
                                fullMessage: message
                            };
                        }
                    }
                    // Si mot-clé d'interaction détecté mais pas de cible spécifique
                    return {
                        type: actionType,
                        target: 'PNJ inconnu',
                        fullMessage: message
                    };
                }
            }
        }

        return null;
    }

    /**
     * Vérifie si le joueur tente d'utiliser des pouvoirs qu'il ne possède pas
     */
    checkInvalidPowerUsage(character, message) {
        const lowerMessage = message.toLowerCase();

        // Pouvoirs magiques/surnaturels interdits pour les humains de base
        const forbiddenPowers = {
            magic: ['sort', 'magie', 'incantation', 'enchantement', 'sortilège', 'rituel', 'malédiction'],
            elemental: ['feu', 'flamme', 'glace', 'foudre', 'électricité', 'terre', 'eau', 'vent', 'air'],
            supernatural: ['téléporte', 'vole', 'invisibilité', 'transformation', 'métamorphose', 'clone'],
            divine: ['bénédiction', 'miracle', 'divin', 'sacré', 'guérison divine', 'résurrection'],
            aura: ['aura', 'chakra', 'énergie spirituelle', 'ki', 'chi', 'mana']
        };

        // Vérifier si le joueur a réellement accès à ces pouvoirs
        const hasAura = this.auraManager && this.auraManager.getPlayerAuraLevel(character.playerId);
        const hasAuraSkills = hasAura && Object.keys(hasAura).length > 0;

        for (const [powerType, keywords] of Object.entries(forbiddenPowers)) {
            for (const keyword of keywords) {
                if (lowerMessage.includes(keyword)) {
                    // Vérifier si c'est une tentative d'utilisation de pouvoir
                    const usageKeywords = ['utilise', 'lance', 'invoque', 'active', 'déclenche', 'cast'];
                    const isAttemptingToUse = usageKeywords.some(usage => lowerMessage.includes(usage));

                    if (isAttemptingToUse || lowerMessage.includes('/aura_cast')) {
                        // Cas spécial pour l'aura
                        if (powerType === 'aura' && !hasAuraSkills) {
                            return {
                                text: `❌ **POUVOIR INACCESSIBLE** ❌

🚫 Vous tentez d'utiliser l'aura, mais vous n'avez aucune formation !

👤 **${character.name}** est un simple humain de niveau ${character.level}
⚡ **Rang actuel :** ${character.powerLevel} (débutant)

💡 **Pour apprendre l'aura :**
• Utilisez \`/aura_apprendre [type]\`
• Entraînez-vous pendant 365 jours
• Seuls 2% des tentatives réussissent

🔰 **Actions disponibles :** Combat de base, déplacement, dialogue avec PNJ`
                            };
                        }

                        // Autres pouvoirs magiques
                        if (powerType !== 'aura' && character.level < 10) {
                            return {
                                text: `❌ **POUVOIR INTERDIT** ❌

🚫 Un simple humain ne peut pas utiliser de ${powerType === 'magic' ? 'magie' : 'pouvoirs élémentaires'} !

👤 **${character.name}** n'est qu'un humain ordinaire
📊 **Niveau trop faible :** ${character.level} (minimum 10 requis)
⚔️ **Rang :** ${character.powerLevel} (insuffisant)

💪 **Actions possibles :**
• Combat à mains nues ou avec armes
• Déplacement et exploration
• Dialogue et interaction
• Entraînement physique

🎯 **Montez de niveau pour débloquer des capacités !**`
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Vérifie si l'action est impossible avec l'équipement/état actuel
     */
    async checkImpossibleAction(message, character) {
        if (!character || !message) return null;

        const lowerMessage = message.toLowerCase();

        // Vérifier les objets mentionnés
        const itemKeywords = ['utilise', 'prend', 'équipe', 'avec mon', 'avec ma', 'sort mon', 'sort ma'];
        for (const keyword of itemKeywords) {
            if (lowerMessage.includes(keyword)) {
                // Extraire l'objet mentionné
                const words = lowerMessage.split(' ');
                const keywordIndex = words.findIndex(word => keyword.includes(word));
                if (keywordIndex !== -1 && keywordIndex < words.length - 1) {
                    const item = words[keywordIndex + 1];
                    if (!character.inventory?.some(inv => inv.itemId.toLowerCase().includes(item)) &&
                        !Object.values(character.equipment || {}).some(eq => eq.toLowerCase().includes(item))) {
                        return {
                            text: `❌ **ACTION IMPOSSIBLE** ❌

Vous ne possédez pas : **${item}**

Utilisez /inventaire pour voir vos objets disponibles.`
                        };
                    }
                }
            }
        }

        // Vérifier les techniques avancées par rang
        const detectedTechniques = this.detectTechniques(message);
        for (const technique of detectedTechniques) {
            if (technique.type !== 'combat_basic' && !this.canUseTechnique(character, technique)) {
                return {
                    text: `❌ **TECHNIQUE INACCESSIBLE** ❌

La technique **"${technique.name}"** requiert le rang **${technique.requiredRank}**

🏆 Votre rang actuel : **${character.powerLevel}**
⚡ Continuez à vous entraîner pour débloquer de nouvelles techniques !`
                };
            }
        }

        return null;
    }

    /**
     * Analyse l'action du joueur pour déterminer les conséquences
     */
    async analyzePlayerAction({ character, action, narration, dbManager }) {
        try {
            // Utiliser l'IA pour analyser l'action si disponible
            if (this.groqClient && this.groqClient.hasValidClient()) {
                const analysisPrompt = `Analyse cette action de RPG et détermine les conséquences:

Personnage: ${character.name} (${character.powerLevel})
Action: "${action}"
Narration: "${narration}"

Réponds en JSON avec:
{
  "energyCost": nombre (1-30),
  "consequences": "description des conséquences",
  "riskLevel": "low|medium|high|extreme"
}`;

                try {
                    const response = await this.groqClient.generateNarration(analysisPrompt, 200);
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                } catch (aiError) {
                    console.log('⚠️ Erreur analyse IA, utilisation fallback:', aiError.message);
                }
            }

            // Analyse basique en fallback
            const lowerAction = action.toLowerCase();
            let energyCost = 5;
            let consequences = "Action réalisée avec succès.";
            let riskLevel = "low";

            // Détecter le type d'action
            if (lowerAction.includes('combat') || lowerAction.includes('attaque') || lowerAction.includes('frappe')) {
                energyCost = 15;
                consequences = "Combat engagé - énergie consommée.";
                riskLevel = "high";
            } else if (lowerAction.includes('court') || lowerAction.includes('saute') || lowerAction.includes('grimpe')) {
                energyCost = 10;
                consequences = "Effort physique - léger épuisement.";
                riskLevel = "medium";
            } else if (lowerAction.includes('regarde') || lowerAction.includes('examine') || lowerAction.includes('observe')) {
                energyCost = 2;
                consequences = "Observation attentive - concentration légère.";
                riskLevel = "low";
            }

            return { energyCost, consequences, riskLevel };

        } catch (error) {
            console.error('❌ Erreur analyzePlayerAction:', error);
            return {
                energyCost: 5,
                consequences: "Action effectuée.",
                riskLevel: "low"
            };
        }
    }

    createDetailedFallbackNarration(character, action) {
        const timeOfDay = new Date().getHours();
        const timeDescription = timeOfDay < 6 ? 'dans la pénombre de l\'aube naissante' :
                              timeOfDay < 12 ? 'sous la lumière dorée du matin' :
                              timeOfDay < 18 ? 'dans la chaleur de l\'après-midi' :
                              timeOfDay < 22 ? 'dans les lueurs orangées du crépuscule' :
                              'sous le manteau étoilé de la nuit';

        const locationDescriptions = {
            'AEGYRIA': 'Les vastes plaines d\'honneur s\'étendent à perte de vue, parsemées de fleurs dorées qui dansent dans la brise.',
            'SOMBRENUIT': 'Les ombres dansent entre les arbres millénaires de cette forêt mystérieuse où règne un silence presque surnaturel.',
            'KHELOS': 'Le sable chaud crisse sous les pas tandis que les dunes ondulent vers l\'horizon dans une symphonie de couleurs ocre.',
            'ABRANTIS': 'L\'air salin porte les cris des mouettes tandis que les vagues viennent lécher les quais de pierre ancienne.',
            'VARHA': 'Le vent glacé siffle entre les pics enneigés, portant avec lui l\'écho lointain des loups des montagnes.'
        };

        const locationDesc = locationDescriptions[character.kingdom] || 'Dans ce lieu mystérieux aux mille secrets';

        return `${timeDescription}, ${character.name} se dresse dans ${character.currentLocation || 'un lieu indéterminé'}. ${locationDesc}

L'air semble vibrer d'une énergie particulière tandis que ${character.gender === 'male' ? 'le héros' : 'l\'héroïne'} s'apprête à accomplir son geste : "${action}".

Chaque muscle se tend, chaque sens s'aiguise. ${character.currentEnergy < 50 ? 'Malgré la fatigue qui pèse sur ses épaules, ' : ''}${character.name} puise dans ses réserves de détermination, conscient${character.gender === 'male' ? '' : 'e'} que dans ce monde impitoyable, chaque action peut avoir des conséquences dramatiques.

Le destin semble retenir son souffle...`;
    }

    async processGameActionWithAI({ player, character, message, dbManager, imageGenerator }) {
        try {
            console.log(`🎭 Action RPG: ${message} pour ${character.name}`);

            // Vérifier si le personnage a assez d'énergie pour l'action
            if (character.currentEnergy < 5) {
                return {
                    text: `⚡ **ÉPUISEMENT TOTAL** ⚡

${character.name} est complètement épuisé !

❤️ **Vie :** ${character.currentLife}/${character.maxLife}
⚡ **Énergie :** ${character.currentEnergy}/${character.maxEnergy}

🛌 Vous devez vous reposer avant de pouvoir agir.
💡 Tapez "je me repose" pour récupérer de l'énergie.`
                };
            }

            // Traitement spécial pour le repos
            if (message.toLowerCase().includes('me repose') || message.toLowerCase().includes('repos')) {
                const energyRecovered = Math.min(25, character.maxEnergy - character.currentEnergy);
                const newEnergy = Math.min(character.maxEnergy, character.currentEnergy + energyRecovered);

                await dbManager.updateCharacter(character.id, {
                    currentEnergy: newEnergy
                });

                return {
                    text: `😴 **REPOS RÉPARATEUR** 😴

${character.name} prend un moment de repos dans ${character.currentLocation}.

⚡ **Énergie récupérée :** +${energyRecovered}
⚡ **Énergie totale :** ${newEnergy}/${character.maxEnergy}

🌟 Vous vous sentez revigoré et prêt pour de nouveaux défis !`
                };
            }

            // Analyser l'action pour plus de contexte
            const actionContext = this.analyzeActionForContext(message, character);

            // Générer la narration avec l'IA la plus performante disponible
            let narration = '';
            let actionImage = null;

            if (this.groqClient && this.groqClient.hasValidClient()) {
                try {
                    console.log('🤖 Génération narration avec Groq...');
                    const sessionId = `player_${player.id}`;

                    // Contexte enrichi pour une meilleure narration
                    const enrichedContext = {
                        character: character,
                        action: message,
                        location: character.currentLocation,
                        actionType: actionContext.type,
                        previousActions: await this.getRecentPlayerActions(player.id),
                        environmentalFactors: this.getEnvironmentalFactors(character.currentLocation),
                        timeOfDay: await this.getGameTimeOfDay(player.id)
                    };

                    narration = await this.groqClient.generateExplorationNarration(
                        character.currentLocation,
                        message,
                        sessionId,
                        character
                    );

                    // Ajouter des éléments narratifs supplémentaires selon le type d'action
                    narration = this.enhanceNarrationWithContext(narration, actionContext, character);

                } catch (error) {
                    console.error('❌ Erreur Groq, fallback vers Gemini:', error);
                    if (this.geminiClient && this.geminiClient.isAvailable) {
                        narration = await this.geminiClient.generateNarration({
                            character: character,
                            action: message,
                            location: character.currentLocation
                        }, `player_${player.id}`);
                    }
                }
            } else if (this.geminiClient && this.geminiClient.isAvailable) {
                console.log('🤖 Génération narration avec Gemini...');
                narration = await this.geminiClient.generateNarration({
                    character: character,
                    action: message,
                    location: character.currentLocation
                }, `player_${player.id}`);
            }

            // Si aucune IA n'est disponible, utiliser la narration immersive
            if (!narration || narration.length < 10) {
                console.log('📖 Génération narration immersive fallback...');
                const ImmersiveNarrationManager = require('../utils/ImmersiveNarrationManager');
                const immersiveManager = new ImmersiveNarrationManager(dbManager);
                const immersiveResult = await immersiveManager.generateImmersiveNarration(
                    character,
                    message,
                    character.currentLocation
                );
                narration = immersiveResult.text;
            }


            // Générer une image pour l'action
            try {
                actionImage = await imageGenerator.generateCharacterActionImage(character, message, narration, {
                    style: '3d',
                    perspective: 'first_person',
                    nudity: false
                });
            } catch (imageError) {
                console.error('⚠️ Erreur génération image action:', imageError);
            }

            // Générer une vidéo pour l'action si HuggingFace est disponible
            let actionVideo = null;
            try {
                // Vérifier si imageGenerator a HuggingFace disponible
                if (imageGenerator && imageGenerator.huggingfaceClient && imageGenerator.huggingfaceClient.hasValidClient()) {
                    console.log('🎬 Génération vidéo HuggingFace pour l\'action...');

                    // Créer le chemin de sortie pour la vidéo
                    const videoPath = `temp/action_video_${character.id}_${Date.now()}.mp4`;

                    // Essayer d'obtenir l'image personnalisée du personnage
                    let characterImagePath = null;
                    try {
                        characterImagePath = await imageGenerator.getCustomCharacterImage(character.id);
                        console.log(`📸 Image personnage trouvée: ${characterImagePath}`);
                    } catch (imageError) {
                        console.log('⚠️ Pas d\'image personnage, génération vidéo text-to-video');
                    }

                    // Générer la vidéo avec ou sans image
                    const videoResult = await imageGenerator.huggingfaceClient.generateCharacterActionVideo(
                        message,
                        character,
                        character.currentLocation,
                        videoPath
                    );

                    if (videoResult) {
                        actionVideo = videoResult;
                        console.log('✅ Vidéo d\'action HuggingFace générée avec succès');
                    } else {
                        console.log('⚠️ Génération vidéo HuggingFace échouée');
                    }
                } else {
                    console.log('⚠️ HuggingFace non disponible pour la génération de vidéos');
                }
            } catch (videoError) {
                console.error('❌ Erreur génération vidéo action:', videoError.message);
            }


            // Traiter l'action et mettre à jour le personnage
            const actionResult = {
                energyCost: Math.floor(Math.random() * 10) + 5,
                experience: Math.floor(Math.random() * 20) + 10,
                newLocation: character.currentLocation // Peut être modifié selon l'action
            };

            // Mettre à jour le personnage avec le système de difficulté
            await this.updateCharacterAfterAction(character, message, actionResult, dbManager);
            // Sauvegarder l'action pour la continuité narrative
            await this.savePlayerAction(player.id, message, actionResult);


            const response = {
                text: `🎭 **${character.name}** - ${character.currentLocation}

${narration}

⚡ **Énergie:** ${Math.max(0, character.currentEnergy - actionResult.energyCost)}/${character.maxEnergy} (-${actionResult.energyCost})
✨ **Expérience:** +${actionResult.experience} XP`,
                image: actionImage
            };

            // Ajouter la vidéo si disponible
            if (actionVideo) {
                response.video = actionVideo;
            }

            return response;

        } catch (error) {
            console.error('❌ Erreur traitement action IA:', error);
            return {
                text: `❌ Une erreur s'est produite lors du traitement de votre action. Veuillez réessayer.`
            };
        }
    }

    /**
     * Met à jour le personnage après une action avec système de difficulté
     */
    async updateCharacterAfterAction(character, action, actionResult, dbManager) {
        try {
            // Appliquer la fatigue
            this.applyFatigueAfterAction(character.playerId, action, actionResult.energyCost);

            // Générer événements de combat
            const combatEvents = this.generateCombatEvents(character, action);

            let totalDamage = 0;
            let appliedConditions = [];

            for (const event of combatEvents) {
                if (event.effect.damage) {
                    totalDamage += event.effect.damage;
                }
                if (event.effect.condition) {
                    this.applyCombatCondition(character.playerId, event.effect.condition);
                    appliedConditions.push(event.effect.condition);
                }
            }

            // Calculer la nouvelle énergie (coût plus élevé selon la fatigue)
            const fatigueMultiplier = 1 + (this.getPlayerFatigue(character.playerId) * 0.01);
            const adjustedEnergyCost = Math.floor(actionResult.energyCost * fatigueMultiplier);
            const newEnergy = Math.max(0, character.currentEnergy - adjustedEnergyCost);

            // Calculer la nouvelle vie (dégâts des événements)
            const newLife = Math.max(0, character.currentLife - totalDamage);

            // Calculer la nouvelle expérience et niveau (BEAUCOUP plus difficile)
            const baseXP = Math.floor(actionResult.experience * 0.6); // XP réduite de 40%
            const difficultyXP = this.calculateDifficultyXP(character, action);
            const newExperience = character.experience + baseXP + difficultyXP;
            let newLevel = character.level;

            // Calcul de montée de niveau BEAUCOUP plus difficile
            const experienceForNextLevel = Math.pow(newLevel, 2.5) * 150; // Progression exponentielle
            if (newExperience >= experienceForNextLevel) {
                newLevel++;
                console.log(`🎉 ${character.name} monte au niveau ${newLevel} après un entraînement acharné !`);

                // Réduire légèrement la fatigue au niveau up
                const currentFatigue = this.getPlayerFatigue(character.playerId);
                this.playerFatigue.set(character.playerId, Math.max(0, currentFatigue - 10));
            }

            // Mettre à jour le personnage dans la base de données
            await dbManager.updateCharacter(character.id, {
                currentEnergy: newEnergy,
                currentLife: newLife,
                experience: newExperience,
                level: newLevel,
                currentLocation: actionResult.newLocation || character.currentLocation
            });

            // Mettre à jour l'objet character en mémoire
            character.currentEnergy = newEnergy;
            character.currentLife = newLife;
            character.experience = newExperience;
            character.level = newLevel;
            character.currentLocation = actionResult.newLocation || character.currentLocation;

            // Ajouter infos sur les événements et conditions dans actionResult
            actionResult.combatEvents = combatEvents;
            actionResult.appliedConditions = appliedConditions;
            actionResult.totalDamage = totalDamage;
            actionResult.fatigueIncrease = this.getPlayerFatigue(character.playerId);

            console.log(`✅ Personnage ${character.name} mis à jour avec système de difficulté: Énergie=${newEnergy}, Vie=${newLife}, XP=${newExperience}, Niveau=${newLevel}, Fatigue=${this.getPlayerFatigue(character.playerId)}%`);

        } catch (error) {
            console.error('❌ Erreur mise à jour personnage:', error);
            throw error;
        }
    }

    // Fonctions utilitaires pour la difficulté (à implémenter)
    applyFatigueAfterAction(playerId, action, energyCost) {
        const currentFatigue = this.getPlayerFatigue(playerId);
        let fatigueIncrease = 0;

        if (action.toLowerCase().includes('combat') || action.toLowerCase().includes('attaque')) {
            fatigueIncrease = (energyCost * 0.5) + (Math.random() * 5); // Fatigue accrue en combat
        } else if (action.toLowerCase().includes('court') || action.toLowerCase().includes('saute') || action.toLowerCase().includes('grimpe')) {
            fatigueIncrease = (energyCost * 0.3) + (Math.random() * 3); // Fatigue modérée pour les mouvements
        } else {
            fatigueIncrease = (energyCost * 0.1) + (Math.random() * 1); // Fatigue légère pour actions simples
        }

        const newFatigue = Math.min(100, currentFatigue + fatigueIncrease);
        this.playerFatigue.set(playerId, newFatigue);
    }

    getPlayerFatigue(playerId) {
        return this.playerFatigue.get(playerId) || 0;
    }

    generateCombatEvents(character, action) {
        const events = [];
        const difficultyFactor = this.getDifficultyFactor(character.playerId); // Facteur basé sur la fatigue, le niveau, etc.

        // Exemple: 60% de chance d'un événement de combat mineur
        if (Math.random() < 0.6 * difficultyFactor) {
            events.push({
                type: 'minor_damage',
                effect: { damage: Math.floor(Math.random() * 5 * difficultyFactor) + 1 }, // Dégâts mineurs
                description: 'Un coup malchanceux vous effleure.'
            });
        }

        // Exemple: 20% de chance d'un événement de combat moyen
        if (Math.random() < 0.2 * difficultyFactor) {
            const condition = Math.random() < 0.3 ? 'saignement' : null; // 30% de chance de saignement
            events.push({
                type: 'medium_damage',
                effect: { damage: Math.floor(Math.random() * 15 * difficultyFactor) + 5, condition: condition },
                description: 'Vous recevez un coup plus sérieux !' + (condition ? ' Vous commencez à saigner.' : '')
            });
        }

        // Exemple: 5% de chance d'un événement de combat critique (stun, poison, etc.)
        if (Math.random() < 0.05 * difficultyFactor) {
            const condition = Math.random() < 0.5 ? 'étourdi' : 'empoisonné'; // 50/50 stun ou poison
            events.push({
                type: 'critical_event',
                effect: { damage: Math.floor(Math.random() * 25 * difficultyFactor) + 10, condition: condition },
                description: `Une attaque dévastatrice vous frappe de plein fouet! ${condition === 'étourdi' ? 'Votre vision se brouille, vous êtes étourdi !' : 'Une douleur intense vous envahit, vous êtes empoisonné !'}`
            });
        }

        // Si l'action est un combat, augmenter légèrement les chances d'événements
        if (action.toLowerCase().includes('combat') || action.toLowerCase().includes('attaque')) {
            if (Math.random() < 0.1 * difficultyFactor) { // 10% chance d'un coup supplémentaire
                events.push({
                    type: 'extra_hit',
                    effect: { damage: Math.floor(Math.random() * 10 * difficultyFactor) + 2 },
                    description: 'Un coup inattendu vous surprend.'
                });
            }
        }

        return events;
    }

    applyCombatCondition(playerId, condition) {
        if (!this.combatConditions.has(playerId)) {
            this.combatConditions.set(playerId, {});
        }
        const conditions = this.combatConditions.get(playerId);
        conditions[condition] = { duration: 3, intensity: 1 }; // Durée et intensité simples
        console.log(`Applying condition '${condition}' to player ${playerId}`);
    }

    calculateDifficultyXP(character, action) {
        let xp = 0;
        const fatigue = this.getPlayerFatigue(character.playerId);
        const difficultyFactor = this.getDifficultyFactor(character.playerId);

        // XP bonus pour actions dangereuses ou difficiles
        if (action.toLowerCase().includes('combat') || action.toLowerCase().includes('attaque')) {
            xp += 50 * difficultyFactor;
        }
        if (action.toLowerCase().includes('explore') && fatigue > 50) {
            xp += 30 * difficultyFactor;
        }
        if (fatigue > 75) {
            xp += 20 * difficultyFactor; // Bonus XP si très fatigué
        }

        // XP bonus basé sur le niveau de l'adversaire (si applicable)
        // Cette partie nécessiterait une analyse plus approfondie de 'action' pour identifier l'adversaire

        return Math.floor(xp);
    }

    getDifficultyFactor(playerId) {
        const fatigue = this.getPlayerFatigue(playerId);
        // La fatigue augmente la difficulté
        return 1 + (fatigue / 100) * 0.8; // Max 80% de difficulté en plus à 100% fatigue
    }


    // ===========================================
    // MÉTHODES POUR LES COORDONNÉES ET LA CARTE
    // ===========================================

    /**
     * Commande pour afficher les coordonnées et la carte
     */
    async handleMapCommand({ imageGenerator }) {
        try {
            const worldMap = await imageGenerator.generateWorldMap({
                showCoordinates: true,
                highQuality: true
            });

            return {
                text: `🗺️ **CARTE DU MONDE AVANCÉE - FRICTION ULTIMATE**

🎯 **Système de coordonnées X,Y intégré**
• Grille de déplacement 64x64
• Coordonnées fixes pour chaque royaume
• Terrain détaillé par zone

🏰 **Royaumes et leurs coordonnées :**
• AEGYRIA (0, 0) - Centre du monde
• SOMBRENUIT (-8, 8) - Forêts du nord-ouest
• KHELOS (15, -12) - Déserts de l'est
• ABRANTIS (20, 5) - Côtes de l'est
• VARHA (-12, 18) - Montagnes du nord
• Et 7 autres royaumes...

🧭 **Utilisez les coordonnées pour naviguer !**
📍 Exemple: "Je vais vers (5, -3)"`,
                image: worldMap
            };
        } catch (error) {
            console.log('⚠️ Erreur génération carte avancée:', error.message);
            return {
                text: `🗺️ **CARTE DU MONDE - SYSTÈME DE COORDONNÉES**

⚠️ Génération d'image temporairement indisponible

🎯 **Système de coordonnées X,Y :**
• AEGYRIA (0, 0) - Plaines centrales
• SOMBRENUIT (-8, 8) - Forêts sombres
• KHELOS (15, -12) - Désert brûlant
• ABRANTIS (20, 5) - Ports maritimes
• VARHA (-12, 18) - Montagnes enneigées
• SYLVARIA (12, 10) - Jungles luxuriantes
• ECLYPSIA (-15, -8) - Terres d'ombre
• TERRE_DESOLE (8, -18) - Wasteland
• DRAK_TARR (-20, -15) - Volcans
• URVALA (-5, -10) - Marais maudit
• OMBREFIEL (5, -5) - Plaines grises
• KHALDAR (18, -5) - Jungle tropicale

🧭 **Navigation par coordonnées disponible !**`
            };
        }
    }

    /**
     * Obtient les informations de coordonnées d'un joueur
     */
    async handleCoordinatesCommand({ player, dbManager }) {
        try {
            const character = await this.dbManager.getCharacterByPlayer(player.id);
            if (!character) {
                return { text: "❌ Tu n'as pas encore de personnage !" };
            }

            // Récupérer ou initialiser les coordonnées
            let coordinates = character.position;
            if (!coordinates || (!coordinates.x && !coordinates.y)) {
                // Assigner des coordonnées basées sur le royaume
                const WorldMapGenerator = require('../utils/WorldMapGenerator');
                const mapGen = new WorldMapGenerator();
                const kingdoms = mapGen.getKingdomsWithCoordinates();

                if (kingdoms[character.kingdom]) {
                    coordinates = kingdoms[character.kingdom].coordinates;
                    // Mettre à jour en base
                    await dbManager.updateCharacter(character.id, {
                        position: coordinates
                    });
                }
            }

            const WorldMapGenerator = require('../utils/WorldMapGenerator');
            const mapGen = new WorldMapGenerator();
            const terrain = mapGen.getTerrainAt(coordinates.x, coordinates.y);
            const nearestKingdom = mapGen.findNearestKingdom(coordinates.x, coordinates.y);

            return {
                text: `🧭 **POSITION DE ${character.name.toUpperCase()}** 🧭

📍 **Coordonnées actuelles :** (${coordinates.x}, ${coordinates.y})
🌍 **Terrain :** ${this.getTerrainName(terrain)}
🏰 **Royaume le plus proche :** ${nearestKingdom.kingdom.name} (${nearestKingdom.distance.toFixed(1)} unités)
📍 **Localisation :** ${character.currentLocation}

🎯 **Commandes de déplacement :**
• "Je vais vers (X, Y)" - Déplacement précis
• "Je me déplace de 3 vers l'est" - Mouvement relatif
• "Je voyage vers ROYAUME" - Déplacement rapide

⚠️ **Attention :** Chaque terrain a ses dangers !`
            };

        } catch (error) {
            console.error('❌ Erreur coordonnées:', error);
            return { text: "❌ Erreur lors de la récupération des coordonnées." };
        }
    }

    /**
     * Convertit un type de terrain en nom lisible
     */
    getTerrainName(terrain) {
        const names = {
            'ocean': '🌊 Océan',
            'plains': '🌱 Plaines',
            'forest': '🌲 Forêt',
            'desert': '🏜️ Désert',
            'mountains': '🏔️ Montagnes',
            'snow': '❄️ Terres Enneigées',
            'swamp': '🐊 Marais',
            'volcano': '🌋 Région Volcanique',
            'jungle': '🌿 Jungle',
            'wasteland': '💀 Terre Désolée',
            'eclipse': '🌑 Terre d\'Éclipse',
            'coast': '🏖️ Côte Maritime'
        };
        return names[terrain] || '❓ Terrain Inconnu';
    }

    // Méthodes pour la narration enrichie
    buildEnhancedNarrationPrompt(character, action) {
        const timeOfDay = this.getTimeOfDay();
        const weather = this.getCurrentWeather();
        const dangerLevel = this.calculateDangerLevel(character, action);
        const emotionalState = this.getCharacterEmotionalState(character);

        return `Tu es un narrateur expert de RPG médiéval-fantasy. Crée une narration CAPTIVANTE et IMMERSIVE pour cette action :

CONTEXTE DRAMATIQUE:
- Personnage: ${character.name} (${character.gender === 'male' ? 'Guerrier' : 'Guerrière'} de ${character.kingdom})
- Niveau de puissance: ${character.powerLevel} (${character.level}) - ${this.getPowerDescription(character.powerLevel)}
- Lieu mystique: ${character.currentLocation}
- Moment: ${timeOfDay}, ${weather}
- État émotionnel: ${emotionalState}
- Niveau de danger: ${dangerLevel}

ACTION À NARRER: ${action}

STYLE DE NARRATION REQUIS:
- Utilise des détails sensoriels (sons, odeurs, textures)
- Ajoute de la tension dramatique et du suspense
- Inclus des éléments fantastiques spécifiques au royaume ${character.kingdom}
- Montre les conséquences immédiates de l'action
- Rends le personnage vivant avec ses émotions et réactions physiques
- Maximum 4 phrases, style cinématographique épique

Crée une narration qui donne envie de connaître la suite !`;
    }

    buildNarrationPrompt(character, action) {
        return this.buildEnhancedNarrationPrompt(character, action);
    }

    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 6) return "Profonde nuit étoilée";
        if (hour < 12) return "Aube naissante";
        if (hour < 18) return "Jour éclatant";
        return "Crépuscule mystérieux";
    }

    getCurrentWeather() {
        const weathers = [
            "brume mystique flottant",
            "vent chargé de magie",
            "air cristallin",
            "atmosphère électrique",
            "chaleur suffocante",
            "froid mordant"
        ];
        return weathers[Math.floor(Math.random() * weathers.length)];
    }

    calculateDangerLevel(character, action) {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('attaque') || lowerAction.includes('combat')) return "EXTRÊME";
        if (lowerAction.includes('explore') || lowerAction.includes('cherche')) return "ÉLEVÉ";
        if (lowerAction.includes('parle') || lowerAction.includes('discute')) return "MODÉRÉ";
        return "FAIBLE";
    }

    getCharacterEmotionalState(character) {
        const healthPercent = (character.currentLife / character.maxLife) * 100;
        const energyPercent = (character.currentEnergy / character.maxEnergy) * 100;

        if (healthPercent < 30) return "désespéré mais déterminé";
        if (healthPercent < 60) return "inquiet mais résolu";
        if (energyPercent < 30) return "épuisé mais persévérant";
        if (energyPercent < 60) return "fatigué mais alerte";
        return "confiant et vigoureux";
    }

    getPowerDescription(powerLevel) {
        const descriptions = {
            'G': "Novice tremblant aux premiers pas",
            'F': "Apprenti maladroit en apprentissage",
            'E': "Combattant débutant en progression",
            'D': "Guerrier prometteur",
            'C': "Vétéran expérimenté",
            'B': "Champion redoutable",
            'A': "Maître légendaire",
            'S': "Héros épique",
            'S+': "Demi-dieu destructeur",
            'SS': "Force cosmique",
            'SSS': "Transcendance absolue",
            'MONARQUE': "Souverain des réalités"
        };
        return descriptions[powerLevel] || "Mystérieux inconnu";
    }

    generateFallbackNarration(character, action) {
        const scenarios = [
            `${character.name} s'avance avec détermination. ${action} - mais le destin en décidera autrement...`,
            `L'air se charge de tension autour de ${character.name}. ${action} - les conséquences sont imprévisibles.`,
            `${character.name} sent son cœur battre la chamade. ${action} - le monde semble retenir son souffle.`,
            `Les yeux de ${character.name} brillent d'une lueur farouche. ${action} - l'aventure prend un tournant inattendu.`
        ];
        return scenarios[Math.floor(Math.random() * scenarios.length)];
    }

    enrichNarrationWithDynamicElements(narration, character, action) {
        // Ajouter des éléments liés au royaume
        const kingdomElements = this.getKingdomSpecificElements(character.kingdom);

        // Ajouter des détails sur l'état du personnage
        let enrichedNarration = narration;

        // Ajouter des informations de statut à la fin
        const statusInfo = `\n\n📊 **État de ${character.name}:**`;
        const healthBar = this.generateHealthBar(character.currentLife, character.maxLife);
        const energyBar = this.generateEnergyBar(character.currentEnergy, character.maxEnergy);

        enrichedNarration += `${statusInfo}\n❤️ ${healthBar} (${character.currentLife}/${character.maxLife})\n⚡ ${energyBar} (${character.currentEnergy}/${character.maxEnergy})`;

        return enrichedNarration;
    }

    getKingdomSpecificElements(kingdom) {
        const elements = {
            'AEGYRIA': ["lumière dorée", "bannières flottantes", "armures étincelantes"],
            'SOMBRENUIT': ["ombres dansantes", "murmures mystiques", "éclat lunaire"],
            'KHELOS': ["sables brûlants", "mirages scintillants", "vents du désert"],
            'ABRANTIS': ["embruns salés", "cris de mouettes", "navires au loin"],
            'VARHA': ["neige crissante", "souffle glacé", "échos montagnards"],
            'SYLVARIA': ["feuilles bruissantes", "chants d'oiseaux", "parfums floraux"],
            'ECLYPSIA': ["ténèbres oppressantes", "éclipse permanente", "énergies sombres"],
            'TERRE_DESOLE': ["métal rouillé", "radiations sourdes", "désolation nucléaire"],
            'DRAK_TARR': ["lave bouillonnante", "vapeurs sulfureuses", "roches incandescentes"],
            'URVALA': ["brouillards toxiques", "bubulements sinistres", "odeurs putrides"],
            'OMBREFIEL': ["silence oppressant", "neutralité glaciale", "grisaille éternelle"],
            'KHALDAR': ["circuits lumineux", "bourdonnements électriques", "technologies mystiques"]
        };
        return elements[kingdom] || ["éléments mystérieux"];
    }

    /**
     * Analyse une action pour déterminer son contexte et son type
     */
    analyzeActionForContext(message, character) {
        const lowerMessage = message.toLowerCase();

        const actionTypes = {
            combat: ['attaque', 'frappe', 'combat', 'coup', 'se bat', 'uppercut', 'crochet'],
            social: ['parle', 'dit', 'demande', 'salue', 'questionne', 'crie'],
            exploration: ['explore', 'cherche', 'examine', 'regarde', 'fouille', 'inspecte'],
            movement: ['va', 'marche', 'cours', 'avance', 'entre', 'sort', 'monte', 'descend'],
            rest: ['repose', 'repos', 'dort', 'médite', 'se détend']
        };

        for (const [type, keywords] of Object.entries(actionTypes)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    type: type,
                    keywords: keywords.filter(k => lowerMessage.includes(k)),
                    complexity: this.calculateActionComplexity(message),
                    riskLevel: this.assessActionRisk(message, type)
                };
            }
        }

        return {
            type: 'generic',
            keywords: [],
            complexity: 'simple',
            riskLevel: 'low'
        };
    }

    /**
     * Calcule la complexité d'une action
     */
    calculateActionComplexity(message) {
        if (message.length < 20) return 'simple';
        if (message.length < 50) return 'moderate';
        return 'complex';
    }

    /**
     * Évalue le niveau de risque d'une action
     */
    assessActionRisk(message, actionType) {
        const riskKeywords = {
            high: ['attaque', 'combat', 'tue', 'massacre', 'détruit'],
            moderate: ['explore', 'cherche', 'court', 'grimpe'],
            low: ['parle', 'regarde', 'marche', 'dit']
        };

        for (const [level, keywords] of Object.entries(riskKeywords)) {
            if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
                return level;
            }
        }

        return actionType === 'combat' ? 'high' : 'low';
    }

    /**
     * Améliore la narration avec du contexte supplémentaire
     */
    enhanceNarrationWithContext(narration, actionContext, character) {
        let enhanced = narration;

        // Ajouter des éléments contextuels selon le type d'action
        if (actionContext.type === 'combat') {
            enhanced += `\n\n⚔️ **État de combat :** ${character.name} entre en mode bataille !`;
        } else if (actionContext.type === 'exploration') {
            enhanced += `\n\n🔍 **Exploration :** Vos sens sont en alerte...`;
        } else if (actionContext.type === 'social') {
            enhanced += `\n\n💬 **Interaction sociale :** L'atmosphère change autour de vous...`;
        }

        // Ajouter des informations sur l'état du personnage
        if (character.currentEnergy < 20) {
            enhanced += `\n\n⚠️ **Fatigue :** Vous ressentez la fatigue s'installer.`;
        }

        if (character.currentLife < character.maxLife * 0.5) {
            enhanced += `\n\n🩸 **Blessures :** Vos blessures vous ralentissent.`;
        }

        return enhanced;
    }

    /**
     * Récupère les actions récentes d'un joueur pour la continuité narrative
     */
    async getRecentPlayerActions(playerId) {
        try {
            // Utiliser la base de données pour récupérer les actions récentes
            const recentActions = await this.dbManager.getTemporaryData(playerId, 'recent_actions') || [];
            return recentActions.slice(-3); // Garder les 3 dernières actions
        } catch (error) {
            console.error('❌ Erreur récupération actions récentes:', error);
            return [];
        }
    }

    /**
     * Sauvegarde une action pour la continuité narrative
     */
    async savePlayerAction(playerId, action, result) {
        try {
            const recentActions = await this.getRecentPlayerActions(playerId);
            recentActions.push({
                action: action,
                result: result,
                timestamp: Date.now()
            });

            // Garder seulement les 5 dernières actions
            if (recentActions.length > 5) {
                recentActions.shift();
            }

            await this.dbManager.setTemporaryData(playerId, 'recent_actions', recentActions);
        } catch (error) {
            console.error('❌ Erreur sauvegarde action:', error);
        }
    }

    /**
     * Obtient les facteurs environnementaux pour une localisation
     */
    getEnvironmentalFactors(location) {
        const factors = {
            'Grande Plaine d\'Honneur - Village de Valorhall': {
                atmosphere: 'paisible et ordonnée',
                dangers: 'faibles',
                npcs: 'gardes loyaux et marchands honnêtes'
            },
            'Forêt des Murmures - Clairière de Lunelame': {
                atmosphere: 'mystérieuse et sombre',
                dangers: 'modérés',
                npcs: 'créatures sylvestres et esprits anciens'
            }
        };

        return factors[location] || {
            atmosphere: 'inconnue',
            dangers: 'imprévisibles',
            npcs: 'inconnus'
        };
    }

    /**
     * Obtient l'heure du jour dans le jeu
     */
    async getGameTimeOfDay(playerId) {
        try {
            const gameTime = await this.dbManager.getTemporaryData(playerId, 'game_time') || 0;
            const hour = gameTime % 24;

            if (hour < 6) return 'aube';
            if (hour < 12) return 'matin';
            if (hour < 18) return 'après-midi';
            return 'soir';
        } catch (error) {
            return 'jour';
        }
    }

    generateBar(current, max, emoji) {
        const percentage = Math.max(0, Math.min(100, (current / max) * 100));
        const filledBars = Math.floor(percentage / 10);
        const emptyBars = 10 - filledBars;

        return emoji.repeat(filledBars) + '⬜'.repeat(emptyBars) + ` ${current}/${max}`;
    }

    generateHealthBar(current, max) {
        return this.generateBar(current, max, '❤️');
    }

    generateEnergyBar(current, max) {
        return this.generateBar(current, max, '⚡');
    }

    formatEquipment(equipment) {
        if (!equipment || Object.keys(equipment).length === 0) {
            return '• Aucun équipement spécial';
        }

        let formatted = '';
        for (const [slot, item] of Object.entries(equipment)) {
            formatted += `• ${slot}: ${item}\n`;
        }
        return formatted;
    }

    formatTechniques(techniques) {
        if (!techniques || techniques.length === 0) {
            return '• Aucune technique apprise';
        }

        return techniques.map((tech, index) => `• ${tech.name || tech}`).join('\n');
    }

    async handleHelpCommand({ player, dbManager, imageGenerator }) {
        try {
            const character = await this.dbManager.getCharacterByPlayer(player.id);
            
            let helpText = `📚 **GUIDE COMPLET - FRICTION ULTIMATE** 📚

🎮 **COMMANDES PRINCIPALES :**
• /menu - Menu principal
• /créer - Créer ton personnage
• /fiche - Voir ta fiche personnage
• /jouer - Entrer en mode jeu

🏰 **EXPLORATION :**
• /royaumes - Les 12 royaumes
• /ordres - Les 7 ordres mystiques
• /carte - Carte du monde avec coordonnées
• /coordonnees - Ta position actuelle

⚔️ **COMBAT & PROGRESSION :**
• /combat - Système de combat
• /inventaire - Gérer tes objets
• /reputation - Ton statut dans le monde

🔮 **SYSTÈME AURA :**
• /aura - Informations sur l'aura
• /aura_apprendre [type] - Apprendre un type d'aura
• /aura_session - Session d'entraînement
• /mediter - Méditation pour régénérer

⏰ **TEMPS & MONDE :**
• /temps - Heure actuelle du jeu
• /calendrier - Calendrier du monde
• /meteo - Conditions météorologiques

🎯 **QUÊTES & ÉVÉNEMENTS :**
• /evenements - Événements en cours
• /defis - Défis disponibles
• /marché - Commerce et échanges

💡 **CONSEILS :**
- Écris tes actions en langage naturel en mode jeu
- Chaque action consomme de l'énergie
- Le monde évolue en permanence
- Attention aux dangers selon ton niveau !

${character ? `👤 **Ton personnage :** ${character.name} (${character.powerLevel})` : '❌ **Crée d\'abord un personnage avec /créer**'}`;

            try {
                const helpImage = await imageGenerator.generateHelpImage();
                return {
                    text: helpText,
                    image: helpImage
                };
            } catch (imageError) {
                console.log('⚠️ Impossible de générer l\'image d\'aide:', imageError.message);
                return {
                    text: helpText + '\n\n⚠️ Image temporairement indisponible'
                };
            }

        } catch (error) {
            console.error('❌ Erreur handleHelpCommand:', error);
            return {
                text: `📚 **AIDE - FRICTION ULTIMATE**

❌ Une erreur s'est produite lors de la génération de l'aide.

🎮 **Commandes de base :**
• /menu - Menu principal
• /créer - Créer un personnage
• /jouer - Entrer en mode jeu

Réessayez dans quelques instants.`
            };
        }
    }

    async handlePlayCommand({ player, dbManager }) {
        try {
            const character = await this.dbManager.getCharacterByPlayer(player.id);
            
            if (!character) {
                return {
                    text: `❌ **Aucun personnage trouvé !**

Tu dois d'abord créer un personnage avec /créer pour pouvoir jouer.`
                };
            }

            // Activer le mode jeu pour ce joueur
            await dbManager.setTemporaryData(player.id, 'game_mode', true);

            return {
                text: `🎮 **MODE JEU ACTIVÉ** 🎮

🎭 **${character.name}** est maintenant en jeu !

📍 **Position :** ${character.currentLocation}
❤️ **Vie :** ${character.currentLife}/${character.maxLife}
⚡ **Énergie :** ${character.currentEnergy}/${character.maxEnergy}
🏆 **Rang :** ${character.powerLevel}

💬 **Comment jouer :**
Écris simplement tes actions en langage naturel !

💡 **Exemples d'actions :**
• "Je regarde autour de moi"
• "Je me dirige vers la taverne"
• "Je parle au garde"
• "Je m'entraîne au combat"

⚠️ **Attention :** Chaque action consomme de l'énergie et peut avoir des conséquences !

🚪 **Pour quitter :** Tapez /menu`
            };

        } catch (error) {
            console.error('❌ Erreur handlePlayCommand:', error);
            return {
                text: `❌ Une erreur s'est produite lors de l'activation du mode jeu. Réessayez.`
            };
        }
    }

    async handleDeleteCharacter({ player, dbManager, imageGenerator }) {
        try {
            const existingCharacter = await this.dbManager.getCharacterByPlayer(player.id);

            if (!existingCharacter) {
                return {
                    text: `❌ Tu n'as pas de personnage à supprimer !

Utilise /créer pour créer un nouveau personnage.`
                };
            }

            // Supprimer le personnage
            await dbManager.deleteCharacter(existingCharacter.id);

            // Nettoyer les données temporaires
            await dbManager.clearAllTemporaryData(player.id);

            return {
                text: `💀 **PERSONNAGE SUPPRIMÉ** 💀

👤 **${existingCharacter.name}** a été définitivement supprimé.

🗑️ **Données effacées :**
• Statistiques du personnage
• Équipement et inventaire
• Progression et expérience
• Réputation et relations

✨ **Tu peux maintenant créer un nouveau personnage !**

🎮 Utilise /créer pour commencer une nouvelle aventure.`
            };
        } catch (error) {
            console.error('❌ Erreur suppression personnage:', error);
            return {
                text: `❌ **Erreur lors de la suppression**

Une erreur s'est produite. Réessaie plus tard.
Si le problème persiste, contacte un administrateur.`
            };
        }
    }

    async handleKingdomsCommand({ player, dbManager, imageGenerator }) {
        try {
            const { KINGDOMS_DATA } = require('../data/GameData');
            
            let kingdomsText = `🏰 **LES 12 ROYAUMES DE FRICTION ULTIMATE** 🏰\n\n`;
            
            kingdomsText += `🌍 **Chaque royaume possède sa propre culture, ses spécialités et ses défis uniques !**\n\n`;
            
            KINGDOMS_DATA.forEach((kingdom, index) => {
                kingdomsText += `**${index + 1}. ${kingdom.name} (${kingdom.id})**\n`;
                kingdomsText += `📍 ${kingdom.description}\n`;
                kingdomsText += `🌄 *Géographie:* ${kingdom.geography}\n`;
                kingdomsText += `⚔️ *Spécialités:* ${kingdom.specialties.join(', ')}\n`;
                kingdomsText += `✨ *Particularité:* ${kingdom.particularities}\n\n`;
            });
            
            kingdomsText += `💡 **Conseils pour choisir ton royaume :**
• Chaque royaume offre des techniques et équipements uniques
• Ta réputation varie selon le royaume où tu te trouves
• Certaines quêtes ne sont disponibles que dans certains royaumes
• Les PNJ réagissent différemment selon ton origine

🎮 **Pour créer un personnage :** /créer
🗺️ **Pour voir la carte complète :** /carte`;

            try {
                const kingdomImage = await imageGenerator.generateKingdomsOverviewImage();
                return {
                    text: kingdomsText,
                    image: kingdomImage
                };
            } catch (error) {
                console.log('⚠️ Impossible de générer l\'image des royaumes:', error.message);
                return {
                    text: kingdomsText + '\n\n⚠️ Image temporairement indisponible'
                };
            }

        } catch (error) {
            console.error('❌ Erreur handleKingdomsCommand:', error);
            return {
                text: `🏰 **LES 12 ROYAUMES DE FRICTION ULTIMATE**

❌ Une erreur s'est produite lors de l'affichage des royaumes.

🎮 **Les royaumes disponibles sont :**
• Aegyria - Royaume des paladins
• Sombrenuit - Peuple mystérieux de la forêt
• Khelos - Nomades du désert
• Abrantis - Marins et commerçants
• Varha - Guerriers des montagnes
• Sylvaria - Druides et archers
• Et 6 autres royaumes uniques...

Réessayez avec /royaumes`
            };
        }
    }

    async handleOrdersCommand({ player, dbManager, imageGenerator }) {
        try {
            const { ORDERS_DATA } = require('../data/GameData');
            
            let ordersText = `⚔️ **LES 7 ORDRES MYSTIQUES** ⚔️\n\n`;
            
            ordersText += `🔮 **Rejoindre un ordre te donne accès à des techniques et pouvoirs exclusifs !**\n\n`;
            
            ORDERS_DATA.forEach((order, index) => {
                ordersText += `**${index + 1}. ${order.name}**\n`;
                ordersText += `📜 ${order.description}\n`;
                ordersText += `🎯 *Spécialités:* ${order.specialties.join(', ')}\n`;
                if (order.location) {
                    ordersText += `📍 *Localisation:* ${order.location}\n`;
                }
                if (order.kingdom) {
                    ordersText += `🏰 *Royaume associé:* ${order.kingdom}\n`;
                }
                ordersText += `\n`;
            });
            
            ordersText += `💡 **Comment rejoindre un ordre :**
• Atteins un certain niveau de maîtrise
• Complète des quêtes spécifiques à l'ordre
• Démontre ta valeur lors d'épreuves
• Certains ordres ont des conditions particulières

🎮 **Pour commencer ton aventure :** /créer
🏰 **Pour explorer les royaumes :** /royaumes`;

            try {
                const orderImage = await imageGenerator.generateOrdersOverviewImage();
                return {
                    text: ordersText,
                    image: orderImage
                };
            } catch (error) {
                console.log('⚠️ Impossible de générer l\'image des ordres:', error.message);
                return {
                    text: ordersText + '\n\n⚠️ Image temporairement indisponible'
                };
            }

        } catch (error) {
            console.error('❌ Erreur handleOrdersCommand:', error);
            return {
                text: `⚔️ **LES 7 ORDRES MYSTIQUES**

❌ Une erreur s'est produite lors de l'affichage des ordres.

🔮 **Les ordres mystiques incluent :**
• L'Ordre du Seigneur Démoniaque
• L'Ordre de l'Aube Éternelle
• L'Ordre des Lames Silencieuses
• Et 4 autres ordres puissants...

Réessayez avec /ordres`
            };
        }
    }
}

module.exports = GameEngine;