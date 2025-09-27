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

        this.commandHandlers = {
            '/menu': this.handleMenuCommand.bind(this),
            '/créer': this.handleCreateCharacterCommand.bind(this),
            '/créer_personnage': this.handleCreateCharacterCommand.bind(this),
            '/modifier': this.handleModifyCharacterCommand.bind(this),
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
            '/autorise': this.handleAuthorizeCommand.bind(this),
            '/config_royaume': this.handleConfigKingdomCommand.bind(this),
            '/reputation': this.handleReputationCommand.bind(this),
            '/evenements': this.handleEventsCommand.bind(this),
            '/meteo': this.handleWeatherCommand.bind(this),
            '/marché': this.handleMarketCommand.bind(this),
            '/factions': this.handleFactionsCommand.bind(this),
            '/defis': this.handleChallengesCommand.bind(this),

            // Commandes pour les sorts avec alphabet ancien
            '/sort': this.handleSpellCommand.bind(this),
            '/sorts': this.handleSpellbookCommand.bind(this),
            '/lancer': this.handleCastSpellCommand.bind(this),
            '/grimoire': this.handleSpellbookCommand.bind(this),
            '/apprendre': this.handleLearnSpellCommand.bind(this),

            // Commandes d'administration (réservées aux admins)
            '/admin_stats': this.handleAdminStatsCommand.bind(this),
            '/admin_give': this.handleAdminGiveCommand.bind(this),
            '/admin_level': this.handleAdminLevelCommand.bind(this),
            '/admin_teleport': this.handleAdminTeleportCommand.bind(this),
            '/admin_heal': this.handleAdminHealCommand.bind(this),
            '/admin_power': this.handleAdminPowerCommand.bind(this),
            '/admin_time': this.handleAdminTimeCommand.bind(this),
            '/admin_weather': this.handleAdminWeatherCommand.bind(this),
            '/admin_event': this.handleAdminEventCommand.bind(this),
            '/admin_kingdom': this.handleAdminKingdomCommand.bind(this),
            '/admin_groups': this.handleAdminGroupsCommand.bind(this),
            '/admin_reset_kingdom': this.handleAdminResetKingdomCommand.bind(this),
            '/admin_debug': this.handleAdminDebugCommand.bind(this),
            '/admin_backup': this.handleAdminBackupCommand.bind(this),
            '/admin_reload': this.handleAdminReloadCommand.bind(this),
            '/admin_announce': this.handleAdminAnnounceCommand.bind(this),
            '/admin_status': this.handleAdminStatusCommand.bind(this),
            '/admin_logout': this.handleAdminLogoutCommand.bind(this),
            '/admin_help': this.handleAdminHelpCommand.bind(this),
            '/admin_groups': this.handleAdminGroupsCommand.bind(this),
            '/admin_kingdom': this.handleAdminKingdomCommand.bind(this),

            // Commandes de quêtes (10,000 principales + 20,000 secondaires)
            '/quetes': this.handleQuestsCommand.bind(this),
            '/quests': this.handleQuestsCommand.bind(this),
            '/quete': this.handleQuestDetailsCommand.bind(this),
            '/quest': this.handleQuestDetailsCommand.bind(this),
            '/accepter': this.handleAcceptQuestCommand.bind(this),
            '/accept': this.handleAcceptQuestCommand.bind(this),
            '/abandonner': this.handleAbandonQuestCommand.bind(this),
            '/abandon': this.handleAbandonQuestCommand.bind(this),
            '/progression': this.handleQuestProgressCommand.bind(this),
            '/progress': this.handleQuestProgressCommand.bind(this),
            '/rechercher_quete': this.handleSearchQuestCommand.bind(this),
            '/search_quest': this.handleSearchQuestCommand.bind(this),

            // Commandes d'aura (système de 365 jours d'entraînement)
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

            // Commandes de temps et météo
            '/temps': this.handleTimeCommand.bind(this),
            '/time': this.handleTimeCommand.bind(this),
            '/meteo': this.handleWeatherCommand.bind(this),
            '/weather': this.handleWeatherCommand.bind(this),
            '/evenements': this.handleEventsCommand.bind(this),
            '/events': this.handleEventsCommand.bind(this),
            '/calendrier': this.handleCalendarCommand.bind(this),
            '/calendar': this.handleCalendarCommand.bind(this),
            '/coordonnees': this.handleCoordinatesCommand.bind(this),
            '/coordinates': this.handleCoordinatesCommand.bind(this),
            '/position': this.handleCoordinatesCommand.bind(this),
            '/time_system': this.handleTimeSystemCommand.bind(this) // Nouvelle commande pour le système temporel
        };
    }

    async processPlayerMessage({ playerNumber, chatId, message, imageMessage, originalMessage, sock, dbManager, imageGenerator }) {
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
                const character = await dbManager.getCharacterByPlayer(player.id);

                if (!character) {
                    return {
                        text: `❌ Tu n'as pas encore de personnage !

Utilise /créer pour créer ton personnage, puis /jouer pour entrer en mode jeu.`
                    };
                }

                const dialogueKeywords = ['parle', 'dis', 'demande', 'salue', 'bonjour', 'bonsoir', 'hey', '"'];
                const isDialogue = dialogueKeywords.some(keyword =>
                    message.toLowerCase().includes(keyword)
                ) || message.includes('"') || message.toLowerCase().startsWith('je dis');

                if (isDialogue) {
                    return await this.processDialogueAction({ player, character, message, dbManager, imageGenerator });
                }

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

        const character = await dbManager.getCharacterByPlayer(player.id);

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
        const existingCharacter = await dbManager.getCharacterByPlayer(player.id);

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

            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const imageBuffer = await downloadMediaMessage(originalMessage, 'buffer', {}, {
                logger: require('pino')({ level: 'silent' })
            });

            if (imageBuffer && imageBuffer.length > 0) {
                await imageGenerator.saveCustomCharacterImage(player.id, imageBuffer);

                await dbManager.setTemporaryData(player.id, 'photo_received', true);

                console.log(`✅ Photo sauvegardée pour ${player.whatsappNumber}`);

                return {
                    text: `📸 **PHOTO REÇUE AVEC SUCCÈS !** 📸

✅ Ton visage a été enregistré pour la création du personnage.

📝 **MAINTENANT, DÉCRIS TON PERSONNAGE :**

Décris le personnage que tu veux incarner :

💡 **Exemple :**
"Un guerrier noble d'AEGYRIA avec une armure dorée et une épée lumineuse. Il est courageux, loyal et protège les innocents. Il vient des plaines d'honneur et rêve de devenir un paladin légendaire."

🎭 **Inclus :**
• Classe/profession
• Style d'armure/vêtements
• Royaume d'origine
• Personnalité
• Histoire/objectifs

🚀 **Écris ta description maintenant !**`
                };
            } else {
                return {
                    text: `❌ **Erreur de téléchargement de photo**

La photo n'a pas pu être traitée.
📸 Réessaie d'envoyer une photo claire de ton visage.`
                };
            }
        } catch (error) {
            console.error('❌ Erreur traitement photo:', error);
            return {
                text: `❌ **Erreur lors du traitement de la photo**

Une erreur s'est produite. Réessaie d'envoyer ta photo.
💡 Assure-toi que l'image est claire et bien éclairée.`
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
                text: `❌ Tu dois d'abord créer un personnage avec /créer !

Utilise /menu pour sortir du mode jeu.`
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
            // Vérifier que le personnage a assez d'énergie pour agir
            if (character.currentEnergy <= 0) {
                return {
                    text: `⚡ **ÉPUISEMENT TOTAL** ⚡

${character.name} est complètement épuisé ! Vous devez vous reposer avant d'agir.

❤️ PV: ${character.currentLife}/${character.maxLife}
⚡ Énergie: ${character.currentEnergy}/${character.maxEnergy}

💡 **Utilisez /regenerer_aura ou attendez la régénération naturelle.**`
                };
            }

            // Vérifier si le joueur tente d'utiliser des pouvoirs qu'il ne possède pas
            const invalidPowerAttempt = this.checkInvalidPowerUsage(character, message);
            if (invalidPowerAttempt) {
                return invalidPowerAttempt;
            }

            // Détecter si le joueur interagit avec un PNJ
            const npcInteraction = this.detectNPCInteraction(message);
            if (npcInteraction) {
                // Démarrer le système de temps de réaction uniquement pour les interactions PNJ
                console.log(`🎯 Interaction PNJ détectée: ${npcInteraction.type} avec ${npcInteraction.target}`);

                if (this.reactionTimeManager) {
                    // Créer un PNJ temporaire et démarrer le compte à rebours
                    const npcId = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    await this.reactionTimeManager.startReactionTimer(
                        `action_${Date.now()}`,
                        npcId,
                        arguments[0].chatId || 'unknown_chat',
                        `${character.name} tente de ${npcInteraction.type} avec ${npcInteraction.target}`
                    );
                }
            }

            // Générer une narration immersive avec l'IA
            let narrationResponse;
            try {
                // Créer un contexte ultra-détaillé pour la narration
                const detailedContext = `
PERSONNAGE : ${character.name}
- Sexe : ${character.gender === 'male' ? 'Homme' : 'Femme'}
- Royaume : ${character.kingdom}
- Niveau : ${character.level} (Rang ${character.powerLevel})
- Localisation : ${character.currentLocation || 'Zone Inconnue'}
- État physique : ${character.currentLife}/${character.maxLife} PV, ${character.currentEnergy}/${character.maxEnergy} énergie
- Équipement : ${Object.keys(character.equipment || {}).length > 0 ? Object.values(character.equipment).join(', ') : 'Aucun équipement spécial'}

ACTION DEMANDÉE : "${message}"

CONTEXTE NARRATIF :
${character.currentLocation ? `Le héros se trouve actuellement dans ${character.currentLocation}, un lieu emblématique du royaume de ${character.kingdom}.` : ''}
${character.powerLevel === 'G' ? 'Ce personnage est encore un débutant, ses mouvements sont maladroits et hésitants.' : ''}
${character.currentEnergy < 30 ? 'Le personnage semble fatigué, ses gestes sont plus lents.' : ''}

Narre cette scène comme si tu étais George R.R. Martin ou J.R.R. Tolkien, avec des détails sensoriels, des descriptions d'ambiance, et une immersion totale.`;

                narrationResponse = await this.groqClient.generateNarration(detailedContext);
            } catch (narrationError) {
                console.error('❌ Erreur narration Groq:', narrationError);
                // Fallback avec une narration basique mais détaillée
                narrationResponse = this.createDetailedFallbackNarration(character, message);
            }

            const narration = narrationResponse.narration || narrationResponse;

            // Analyser l'action pour déterminer les conséquences
            const actionAnalysis = await this.analyzePlayerAction({
                character,
                action: message,
                narration,
                dbManager
            });

            // Appliquer les conséquences sur le personnage
            if (actionAnalysis.energyCost) {
                character.currentEnergy = Math.max(0, character.currentEnergy - actionAnalysis.energyCost);
                await dbManager.updateCharacter(character.id, {
                    currentEnergy: character.currentEnergy
                });
            }

            // Générer l'image d'action
            let actionImage = null;
            try {
                actionImage = await imageGenerator.generateCharacterActionImage(
                    character,
                    message,
                    narration,
                    { style: '3d', perspective: 'first_person' }
                );
            } catch (imageError) {
                console.log('⚠️ Erreur génération image action:', imageError.message);
            }

            // Essayer de générer une vidéo si disponible
            let actionVideo = null;
            try {
                if (this.imageGenerator.hasHuggingFace && actionImage) {
                    const videoPath = path.join(__dirname, '../temp', `action_video_${character.id}_${Date.now()}.mp4`);
                    const videoPrompt = `${character.name} performing: ${message}, fantasy RPG action scene, cinematic movement`;

                    actionVideo = await this.imageGenerator.huggingfaceClient.generateVideoFromImage(
                        actionImage,
                        videoPrompt,
                        videoPath
                    );
                }
            } catch (videoError) {
                console.log('⚠️ Erreur génération vidéo action:', videoError.message);
            }

            // Combiner la narration avec les conséquences
            let finalText = `🎮 **${character.name}** - ${character.kingdom} 🎮\n\n`;
            finalText += narration + '\n\n';

            if (actionAnalysis.consequences) {
                finalText += `📊 **Conséquences :**\n${actionAnalysis.consequences}\n\n`;
            }

            // Barres de statut visuelles
            const healthBar = this.loadingBarManager.createHealthBar(
                character.currentLife,
                character.maxLife,
                'life'
            );
            const energyBar = this.loadingBarManager.createHealthBar(
                character.currentEnergy,
                character.maxEnergy,
                'energy'
            );

            finalText += `📊 **ÉTAT DU PERSONNAGE**\n`;
            finalText += healthBar + '\n';
            finalText += energyBar + '\n\n';

            finalText += `⚔️ **Niveau :** ${character.level} (${character.powerLevel})`;

            return {
                text: finalText,
                image: actionImage,
                video: actionVideo
            };

        } catch (error) {
            console.error('❌ Erreur traitement action IA:', error);
            return {
                text: `❌ Erreur lors du traitement de votre action.

**Action :** ${message}

Le monde de Friction Ultimate semble instable en ce moment. Réessayez dans quelques instants ou utilisez /aide pour voir les commandes disponibles.`
            };
        }
    }

    generateBar(current, max, icon) {
        const percentage = Math.round((current / max) * 100);
        const filledBars = Math.round(percentage / 20);
        const emptyBars = 5 - filledBars;

        return icon.repeat(filledBars) + '⬜'.repeat(emptyBars) + ` (${percentage}%)`;
    }

    formatEquipment(equipment) {
        if (!equipment || Object.keys(equipment).length === 0) {
            return '• Aucun équipement';
        }

        let formatted = '';
        if (equipment.weapon) formatted += `• Arme : ${equipment.weapon}\n`;
        if (equipment.armor) formatted += `• Armure : ${equipment.armor}\n`;
        if (equipment.accessories && equipment.accessories.length > 0) {
            formatted += `• Accessoires : ${equipment.accessories.join(', ')}\n`;
        }

        return formatted || '• Aucun équipement';
    }

    async handleHelpCommand({ imageGenerator }) {
        return {
            text: `📱 **AIDE - FRICTION ULTIMATE**

🎮 **Commandes de base :**
• /menu - Menu principal
• /créer - Créer un personnage
• /modifier - Modifier l'apparence de ton personnage
• /fiche - Fiche de personnage

🌍 **Exploration :**
• /royaumes - Les 12 royaumes
• /ordres - Les 7 ordres
• /carte - Carte du monde

⚔️ **Combat :**
• /combat - Système de combat
• /inventaire - Gestion équipement
• /time_system - Informations sur le temps de jeu

💀 **Le monde de Friction est impitoyable !**
Chaque action doit être précise et réfléchie.`,
            image: await imageGenerator.generateHelpImage()
        };
    }

    async handleKingdomsCommand({ dbManager, imageGenerator }) {
        const kingdoms = await dbManager.getAllKingdoms();

        let kingdomsText = `🏰 **LES 12 ROYAUMES DE FRICTION ULTIMATE**\n\n`;

        kingdoms.forEach((kingdom, index) => {
            kingdomsText += `**${index + 1}. ${kingdom.name} (${kingdom.id})**
${kingdom.description}
🌍 **Géographie :** ${kingdom.geography}
🎭 **Culture :** ${kingdom.culture}
⚔️ **Spécialités :** ${kingdom.specialties.join(', ')}
✨ **Particularités :** ${kingdom.particularities}

`;
        });

        let kingdomImage = null;
        try {
            kingdomImage = await imageGenerator.generateWorldMap({
                style: '3d',
                description: 'Fantasy kingdoms overview with multiple magical realms and territories'
            });
        } catch (error) {
            console.log('⚠️ Impossible de générer l\'image des royaumes, continuons sans image');
        }

        return {
            text: kingdomsText,
            image: kingdomImage
        };
    }

    async handleOrdersCommand({ dbManager, imageGenerator }) {
        const orders = await dbManager.getAllOrders();

        let ordersText = `⚔️ **LES 7 ORDRES DE FRICTION ULTIMATE**\n\n`;

        orders.forEach((order, index) => {
            ordersText += `**${index + 1}. ${order.name}**
${order.description}
🏰 **Localisation :** ${order.location}
⚔️ **Spécialités :** ${order.specialties.join(', ')}

`;
        });

        return {
            text: ordersText,
            image: await imageGenerator.generateOrdersOverview()
        };
    }

    async handleButtonsTestCommand({ player, chatId, dbManager, sock }) {
        try {
            if (!sock || !sock.buttonManager) {
                return {
                    text: `🔘 **DÉMONSTRATION BOUTONS INTERACTIFS**

⚠️ Système de boutons non initialisé.

Les boutons simulés avec des sondages WhatsApp permettent de créer des interfaces interactives sans API officielle !

🎮 Chaque sondage = un bouton
📊 Cliquer sur le sondage = activer l'action

Cette fonctionnalité sera bientôt disponible !`
                };
            }

            const character = await dbManager.getCharacterByPlayer(player.id);

            const buttonManager = sock.buttonManager;

            await sock.sendMessage(chatId, {
                text: `🔘 **DÉMONSTRATION BOUTONS INTERACTIFS**

🎮 Voici comment fonctionne le système de boutons simulés avec des sondages WhatsApp !

✨ Chaque "bouton" est en fait un sondage avec une seule option
📊 Cliquer dessus équivaut à appuyer sur un bouton

**Menu de test :**`
            });

            setTimeout(async () => {
                await buttonManager.sendMainGameMenu(chatId, character);

                setTimeout(async () => {
                    await buttonManager.sendActionMenu(chatId);

                    setTimeout(async () => {
                        await buttonManager.sendConfirmationMenu(chatId, "Voulez-vous continuer le test ?");
                    }, 2000);
                }, 2000);
            }, 1000);

            return {
                text: '',
                skipResponse: true
            };

        } catch (error) {
            console.error('❌ Erreur démonstration boutons:', error);
            return {
                text: `❌ **Erreur lors de la démonstration des boutons**

Le système rencontre un problème technique.

Veuillez réessayer plus tard ou contactez l'administrateur.`
            };
        }
    }

    async handleReputationCommand({ player, dbManager }) {
        const reputation = await dbManager.getTemporaryData(player.id, 'reputation') || {
            honor: 50, fear: 0, respect: 50, notoriety: 0
        };

        const reputationText = `🏆 **RÉPUTATION DE ${player.username.toUpperCase()}**

⚔️ **Honneur :** ${reputation.honor}/100 ${this.getReputationBar(reputation.honor)}
😨 **Peur :** ${reputation.fear}/100 ${this.getReputationBar(reputation.fear)}
🤝 **Respect :** ${reputation.respect}/100 ${this.getReputationBar(reputation.respect)}
🔥 **Notoriété :** ${reputation.notoriety}/100 ${this.getReputationBar(reputation.notoriety)}

📊 **Effets actifs :**
${this.advancedMechanics.getReputationEffects(reputation).join('\n')}`;

        return { text: reputationText };
    }

    async handleEventsCommand({ player, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return { text: "❌ Aucun personnage trouvé !" };
        }

        const randomEvent = await this.advancedMechanics.triggerRandomEvent(character, character.currentLocation);
        const socialEvent = this.advancedMechanics.generateSocialEvent(character, character.currentLocation);

        const eventsText = `🎲 **ÉVÉNEMENTS EN COURS**

🌟 **Événement aléatoire :**
${randomEvent.description}
Choix : ${randomEvent.choices.join(' | ')}

🏛️ **Événement social :**
${socialEvent.description}
Effets : ${socialEvent.effects.join(', ')}
Durée : ${socialEvent.duration}

💡 **Tapez votre choix pour participer !**`;

        return { text: eventsText };
    }

    async handleWeatherCommand({ player, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return { text: "❌ Aucun personnage trouvé !" };
        }

        const weather = this.advancedMechanics.weatherSystem.updateWeather(character.currentLocation);

        const weatherText = `🌤️ **MÉTÉO À ${character.currentLocation.toUpperCase()}**

☁️ **Conditions :** ${this.advancedMechanics.weatherSystem.currentWeather}
👁️ **Visibilité :** ${weather.visibility}%
🏃 **Mobilité :** ${weather.movement}%
😊 **Ambiance :** ${weather.mood}

⚠️ **Impact sur le gameplay en cours...**`;


    // ==================== COMMANDES D'AURA ====================

    /**
     * Affiche les informations d'aura du joueur
     */
    async handleAuraInfoCommand({ player, dbManager }) {
        try {
            const character = await dbManager.getCharacterByPlayer(player.id);
            if (!character) {
                return {
                    text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
                };
            }

            if (!this.auraManager) {
                return {
                    text: `❌ Système d'aura non disponible pour le moment.`
                };
            }

            const auraInfo = this.auraManager.formatAuraInfo(player.id, character.name);

            return {
                text: auraInfo
            };
        } catch (error) {
            console.error('❌ Erreur commande aura info:', error);
            return {
                text: `❌ Erreur lors de l'affichage des informations d'aura.`
            };
        }
    }

    async handleLearnAuraCommand({ player, message, dbManager }) {
        const character = await dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        const args = message.split(' ');
        if (args.length < 2) {
            return {
                text: `✨ **APPRENTISSAGE D'AURA** ✨

💡 **Usage :** /aura_apprendre [type]

🌟 **Types d'aura disponibles :**
🔥 fire - Aura de Flamme
🌊 water - Aura Aquatique  
🌍 earth - Aura Tellurique
💨 wind - Aura Éolienne
⚡ lightning - Aura Foudroyante
🌑 shadow - Aura Ténébreuse
✨ light - Aura Lumineuse

⚠️ **ATTENTION :** L'entraînement dure 365 jours avec seulement 2% de chance de succès par session !

📝 **Exemple :** /aura_apprendre fire`
            };
        }

        const auraType = args[1].toLowerCase();
        const aura = this.auraManager.auraTypes[auraType];

        if (!aura) {
            return {
                text: `❌ **TYPE D'AURA INVALIDE**

Types disponibles : fire, water, earth, wind, lightning, shadow, light`
            };
        }

        if (!this.auraManager.canStartTraining(player.id)) {
            return {
                text: `❌ **ENTRAÎNEMENT DÉJÀ EN COURS**

Vous avez déjà un entraînement d'aura actif. Terminez-le avant d'en commencer un nouveau.`
            };
        }

        // Chance de maîtrise instantanée (20%)
        if (Math.random() < 0.2) {
            // Maîtrise instantanée !
            if (!this.auraManager.auraLevels.has(player.id)) {
                this.auraManager.auraLevels.set(player.id, {});
            }

            const playerAuras = this.auraManager.auraLevels.get(player.id);
            playerAuras[auraType] = {
                level: aura.maxLevel,
                techniques: [...aura.techniques],
                masteryPoints: 10000
            };

            return {
                text: this.auraManager.formatInstantMasteryMessage(aura)
            };
        }

        // Entraînement normal
        const trainingResult = await this.auraManager.startAuraTraining(player.id, auraType, aura.techniques[0]);

        return {
            text: trainingResult.message
        };
    }

    async handleAuraSessionCommand({ player, dbManager, sock, chatId }) {
        const character = await dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        const activeTraining = this.auraManager.getPlayerTraining(player.id);
        if (!activeTraining) {
            return {
                text: `❌ **AUCUN ENTRAÎNEMENT ACTIF**

Utilisez d'abord /aura_apprendre [type] pour commencer un entraînement d'aura.`
            };
        }

        const aura = this.auraManager.auraTypes[activeTraining.auraType];

        // Démarrer l'animation d'entraînement
        setTimeout(async () => {
            await this.auraManager.createAuraAnimation(
                player.id,
                activeTraining.auraType,
                activeTraining.techniqueName,
                sock,
                chatId
            );

            // Après l'animation, tentative de progression
            setTimeout(async () => {
                const growthResult = await this.auraManager.attemptAuraGrowth(player.id, activeTraining.auraType);

                await sock.sendMessage(chatId, {
                    text: growthResult.message
                });
            }, 2000);

        }, 1000);

        return {
            text: `🧘 **SESSION D'ENTRAÎNEMENT COMMENCÉE**

${aura.emoji} Préparation de l'entraînement ${aura.name}...
⏱️ Durée : 30 secondes d'entraînement intense

🔮 L'animation va commencer dans un instant...`
        };
    }

    async handleAuraTechniquesCommand({ player, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        const playerAuras = this.auraManager.getPlayerAuraLevel(player.id);

        if (Object.keys(playerAuras).length === 0) {
            return {
                text: `✨ **AUCUNE TECHNIQUE D'AURA**

Vous n'avez pas encore appris de techniques d'aura.
Utilisez /aura_apprendre [type] pour commencer votre formation.`
            };
        }

        let techniquesText = `⚡ **TECHNIQUES D'AURA DISPONIBLES** ⚡\n\n`;

        for (const [auraType, auraData] of Object.entries(playerAuras)) {
            const aura = this.auraManager.auraTypes[auraType];
            techniquesText += `${aura.emoji} **${aura.name}** (Niveau ${auraData.level})\n`;

            if (auraData.techniques.length > 0) {
                auraData.techniques.forEach(technique => {
                    techniquesText += `   ⚡ ${technique}\n`;
                });
            } else {
                techniquesText += `   🚫 Aucune technique maîtrisée\n`;
            }
            techniquesText += `\n`;
        }

        techniquesText += `💡 **Utilisez /aura_cast [technique] pour lancer une technique**`;

        return { text: techniquesText };
    }

    async handleCastAuraCommand({ player, message, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        const args = message.split(' ');
        if (args.length < 2) {
            return {
                text: `⚡ **LANCER TECHNIQUE D'AURA** ⚡

💡 **Usage :** /aura_cast [technique]

📝 **Exemple :** /aura_cast Souffle Ardent

💫 Utilisez /aura_techniques pour voir vos techniques disponibles.`
            };
        }

        const techniqueName = args.slice(1).join(' ');
        const playerAuras = this.auraManager.getPlayerAuraLevel(player.id);

        // Chercher la technique dans les auras du joueur
        for (const [auraType, auraData] of Object.entries(playerAuras)) {
            if (auraData.techniques.includes(techniqueName)) {
                const result = await this.auraManager.castAuraTechnique(player.id, auraType, techniqueName);
                return { text: result.message };
            }
        }

        return {
            text: `❌ **TECHNIQUE INCONNUE**

Vous ne maîtrisez pas la technique "${techniqueName}".
Utilisez /aura_techniques pour voir vos techniques disponibles.`
        };
    }

    async handleMeditateCommand({ player, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        return {
            text: `🧘 **MÉDITATION SPIRITUELLE** 🧘

✨ Vous fermez les yeux et entrez en méditation profonde...
🌟 Votre esprit se calme et votre aura se stabilise...
💫 Vous ressentez une paix intérieure profonde...

⚡ **Énergie spirituelle régénérée !**
🔮 **Concentration améliorée !**

💡 Pour apprendre l'aura, utilisez /aura_apprendre [type]`
        };
    }

    async handleRegenerateAuraCommand({ player, dbManager, sock, chatId }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        // Démarrer la régénération d'aura
        const regenId = await this.auraManager.startAuraRegeneration(player.id, sock, chatId);

        return {
            text: '',
            skipResponse: true // Pas de réponse immédiate, l'animation gère tout
        };
    }

    async handleRegenerateMagicCommand({ player, dbManager, sock, chatId }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        // Démarrer la régénération de magie
        const regenId = await this.auraManager.startMagicRegeneration(player.id, sock, chatId);

        return {
            text: '',
            skipResponse: true // Pas de réponse immédiate, l'animation gère tout
        };
    }


        return { text: weatherText };
    }

    async handleMarketCommand({ player, dbManager }) {
        const marketEvents = this.advancedMechanics.economyEngine.marketEvents;

        const marketText = `💰 **MARCHÉ DYNAMIQUE**

📈 **Événements économiques actifs :**
${marketEvents.map(e => `• ${e.event}`).join('\n')}

💡 **Les prix s'adaptent à vos actions et aux événements mondiaux !**
🔄 **Système économique en temps réel actif**`;

        return { text: marketText };
    }

    async handleFactionsCommand({ player, dbManager }) {
        const factionStandings = await dbManager.getTemporaryData(player.id, 'faction_standings') || {};

        const factionsText = `⚔️ **RELATIONS AVEC LES FACTIONS**

${Object.entries(factionStandings).map(([faction, standing]) =>
    `🏛️ **${faction}:** ${standing}/100 ${this.getReputationBar(standing)}`
).join('\n')}

💡 **Vos actions affectent vos relations !**
🤝 **Formez des alliances ou créez des ennemis**`;

        return { text: factionsText };
    }

    getReputationBar(value) {
        const filled = Math.floor(value / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    async handleChallengesCommand({ player, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return { text: "❌ Aucun personnage trouvé !" };
        }

        const challenges = this.advancedMechanics.generateDailyChallenges(character);

        const challengesText = `🏆 **DÉFIS QUOTIDIENS**

${challenges.map((challenge, i) =>
    `${i + 1}. **${challenge.name}**
📝 ${challenge.description}
🏅 Récompense: ${challenge.reward}\n`
).join('\n')}

💡 **Complétez ces défis pour gagner de l'expérience et des récompenses !**`;

        return { text: challengesText };
    }

    async handleCombatCommand({ imageGenerator }) {
        return {
            text: `⚔️ **SYSTÈME DE COMBAT - FRICTION ULTIMATE**

🌟 **Niveaux de puissance (G à A) :**
• G - Très faible (débutants)
• F - Faible (apprentis)
• E - Moyen-faible (soldats basiques)
• D - Moyen (combattants aguerris)
• C - Moyen-fort (guerriers expérimentés)
• B - Fort (spécialistes du combat)
• A - Très fort (maîtres du combat)

⚡ **Barres de combat :**
• ❤️ Vie : Détermine ta survie
• ⚡ Énergie : Consommée par les actions

💀 **ATTENTION :** Chaque attaque doit être précise :
• Mouvement exact (distance en mètres)
• Arme utilisée et angle d'attaque
• Partie du corps visée

🎯 **Sans précision = vulnérabilité !**`,
            image: await imageGenerator.generateCombatGuideImage()
        };
    }

    async handleInventoryCommand({ player, dbManager, imageGenerator }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !`
            };
        }

        return {
            text: `🎒 **INVENTAIRE DE ${character.name.toUpperCase()}**

💰 **Pièces :** ${character.coins}

⚔️ **Équipement porté :**
${this.formatEquipment(character.equipment)}

📦 **Objets dans l'inventaire :**
${this.formatInventory(character.inventory)}

🔧 **Commandes d'équipement :**
• Pour équiper : "équiper [objet]"
• Pour déséquiper : "retirer [objet]"
• Pour utiliser : "utiliser [objet]"`,
            image: await imageGenerator.generateInventoryImage(character)
        };
    }

    formatInventory(inventory) {
        if (!inventory || inventory.length === 0) {
            return '• Inventaire vide';
        }

        return inventory.map(item => `• ${item.itemId} (x${item.quantity})`).join('\n');
    }

    formatTechniques(techniques) {
        if (!techniques || techniques.length === 0) {
            return '• Aucune technique apprise';
        }

        return techniques.map(technique => `• ${technique}`).join('\n');
    }

    async handleMapCommand({ imageGenerator }) {
        return {
            text: `🗺️ **CARTE DU MONDE - FRICTION ULTIMATE**

🏰 **Les 12 Royaumes sont dispersés à travers :**
• Plaines fertiles d'Aegyria
• Forêts sombres de Sombrenuit
• Déserts brûlants de Khelos
• Ports fortifiés d'Abrantis
• Montagnes enneigées de Varha
• Et bien d'autres contrées dangereuses...

⚔️ **Les 7 Ordres ont établi leurs quartiers :**
• Dans les sanctuaires profanés
• Les citadelles fumantes
• Les forteresses des ombres
• Et d'autres lieux mystérieux...

💀 **Chaque région est dangereuse !**`,
            image: await imageGenerator.generateWorldMap()
        };
    }

    async handlePlayCommand({ player, dbManager, imageGenerator }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `🎮 **MODE JEU ACTIVÉ**

❌ Tu n'as pas encore de personnage !

✨ **Pour commencer à jouer :**
1️⃣ Utilise /créer pour créer ton personnage
2️⃣ Puis utilise /jouer pour entrer dans le monde

💬 **Note :** En mode jeu, tes messages seront interprétés comme des actions de jeu.
Utilise /aide pour voir toutes les commandes disponibles.`,
                image: await imageGenerator.generateMenuImage()
            };
        }

        await dbManager.setTemporaryData(player.id, 'game_mode', true);

        return {
            text: `🎮 **MODE JEU ACTIVÉ** 🎮

👤 **${character.name}** est maintenant en jeu !
📍 **Position :** ${character.currentLocation}
❤️ **Vie :** ${character.currentLife}/${character.maxLife}
⚡ **Énergie :** ${character.currentEnergy}/${character.maxEnergy}

🎯 **Tes prochains messages seront interprétés comme des actions de jeu.**

📝 **Exemples d'actions :**
• "Je regarde autour de moi"
• "J'avance vers le nord"
• "Je cherche des ennemis"
• "Je attaque avec mon épée"

💬 **Besoin d'aide :** utilise /aide pour voir toutes les commandes
⚙️ **Pour sortir du mode jeu :** utilise /menu

🔥 **L'aventure commence maintenant !**`,
            image: await imageGenerator.generateCharacterImage(character)
        };
    }
    async handleGenderSelection({ player, message, dbManager, imageGenerator }) {
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        let gender;
        const input = message.toUpperCase().trim();
        if (input === 'HOMME' || input === 'H' || input === '1') {
            gender = 'male';
        } else if (input === 'FEMME' || input === 'F' || input === '2') {
            gender = 'female';
        } else {
            return {
                text: `❌ Choix invalide !

Tape **HOMME**, **H**, **FEMME** ou **F**`
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_gender', gender);

        const kingdoms = await dbManager.getAllKingdoms();
        let kingdomText = `👤 **Sexe sélectionné :** ${gender === 'male' ? 'HOMME' : 'FEMME'}

🏰 **Étape 2/3 - Choisis ton royaume :**

`;

        kingdoms.forEach((kingdom, index) => {
            kingdomText += `**${index + 1}.** ${kingdom.name} - ${kingdom.description}\n`;
        });

        kingdomText += `\n⚡ **Tape le numéro du royaume (1 à 12)**`;

        let kingdomImage = null;
        try {
            kingdomImage = await imageGenerator.generateWorldMap({
                style: '3d',
                description: 'Fantasy kingdoms overview with multiple realms, castles, and magical lands'
            });
        } catch (error) {
            console.log('⚠️ Impossible de générer l\'image des royaumes, continuons sans image');
        }

        return {
            text: kingdomText,
            image: kingdomImage
        };
    }

    async handleKingdomSelection({ player, kingdomNumber, dbManager, imageGenerator }) {
        const kingdoms = await dbManager.getAllKingdoms();

        if (kingdomNumber < 1 || kingdomNumber > kingdoms.length) {
            return {
                text: `❌ Royaume invalide !

Choisis un numéro entre 1 et ${kingdoms.length}`
            };
        }

        const selectedKingdom = kingdoms[kingdomNumber - 1];

        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');

        if (!gender) {
            return {
                text: `❌ Erreur : genre non trouvé. Recommence la création avec /créer`
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_kingdom', selectedKingdom.id);

        console.log(`✅ Royaume sélectionné: ${selectedKingdom.name} (ID: ${selectedKingdom.id}) pour le joueur ${player.id}`);

        return {
            text: `🏰 **Royaume sélectionné :** ${selectedKingdom.name}

👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}
🏰 **Royaume :** ${selectedKingdom.name}

📝 **Étape 3/4 - Donne un nom à ton personnage :**

✍️ Écris simplement le nom que tu veux pour ton personnage.
⚠️ **Attention :** Le nom ne peut pas être modifié après !`,
            image: await imageGenerator.generateKingdomImage(selectedKingdom.id)
        };
    }

    async handleCharacterNameInput({ player, name, dbManager, imageGenerator }) {
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');

        if (!gender || !kingdomId) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        const nameRegex = /^[a-zA-Z0-9àâäéèêëïîôöùûüÿç\s-]{2,20}$/;
        if (!nameRegex.test(name)) {
            return {
                text: `❌ Le nom doit contenir entre 2 et 20 caractères (lettres, chiffres, espaces, tirets uniquement) !`
            };
        }

        const existingCharacter = await dbManager.getCharacterByName(name.trim());
        if (existingCharacter) {
            return {
                text: `❌ Ce nom est déjà pris ! Choisis un autre nom.`
            };
        }

        await dbManager.setTemporaryData(player.id, 'creation_name', name.trim());

        return {
            text: `✅ **Nom accepté :** ${name}

📸 **Étape 4/4 - Photo de ton visage :**

🖼️ Envoie une photo de ton visage pour ton personnage.
⚠️ **Important :**
• Seule la zone du visage sera utilisée
• Photo claire et bien éclairée recommandée
• Si tu n'as pas de photo, écris "SANS_PHOTO"

📷 **Envoie ta photo maintenant...**`
        };
    }

    /**
     * Gère les informations d'aura du joueur
     */
    async handleAuraInfoCommand({ player, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Vous devez d'abord créer un personnage avec /créer !`
            };
        }

        if (!this.auraManager) {
            return {
                text: `❌ Système d'aura non disponible`
            };
        }

        const auraInfo = this.auraManager.formatAuraInfo(player.id, character.name);
        return { text: auraInfo };
    }

    /**
     * Commencer l'apprentissage d'une aura
     */
    async handleLearnAuraCommand({ player, message, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Vous devez d'abord créer un personnage avec /créer !`
            };
        }

        const args = message.split(' ').slice(1);
        if (args.length === 0) {
            return {
                text: `🔮 **APPRENTISSAGE D'AURA** 🔮

**Usage:** \`/aura_apprendre [type]\`

**Types d'aura disponibles :**
🔥 **fire** - Aura de Flamme
🌊 **water** - Aura Aquatique  
🌍 **earth** - Aura Tellurique
💨 **wind** - Aura Éolienne
⚡ **lightning** - Aura Foudroyante
🌑 **shadow** - Aura Ténébreuse
✨ **light** - Aura Lumineuse

⚠️ **ATTENTION :** L'entraînement dure 365 jours avec seulement 2% de chance de réussite par session !`
            };
        }

        const auraType = args[0].toLowerCase();

        if (!this.auraManager.auraTypes[auraType]) {
            return {
                text: `❌ Type d'aura invalide : "${auraType}"

Types valides : fire, water, earth, wind, lightning, shadow, light`
            };
        }

        try {
            const result = await this.auraManager.startAuraTraining(player.id, auraType, `Maîtrise ${auraType}`);
            return { text: result.message };
        } catch (error) {
            return {
                text: `❌ Erreur lors du démarrage de l'entraînement : ${error.message}`
            };
        }
    }

    /**
     * Session d'entraînement d'aura
     */
    async handleAuraSessionCommand({ player, dbManager, sock, chatId }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Vous devez d'abord créer un personnage avec /créer !`
            };
        }

        const training = this.auraManager.getPlayerTraining(player.id);
        if (!training) {
            return {
                text: `❌ Aucun entraînement d'aura en cours !

Utilisez \`/aura_apprendre [type]\` pour commencer un entraînement.`
            };
        }

        const aura = this.auraManager.auraTypes[training.auraType];

        // Démarrer l'animation d'entraînement
        try {
            await this.auraManager.createAuraAnimation(
                player.id,
                training.auraType,
                training.techniqueName,
                sock,
                chatId
            );

            // Tentative de progression après l'animation
            const growthResult = await this.auraManager.attemptAuraGrowth(player.id, training.auraType);

            setTimeout(async () => {
                await sock.sendMessage(chatId, { text: growthResult.message });
            }, 32000); // Après l'animation de 30 secondes + 2 secondes

            return { text: '', skipResponse: true };
        } catch (error) {
            return {
                text: `❌ Erreur pendant la session d'entraînement : ${error.message}`
            };
        }
    }

    /**
     * Lancer une technique d'aura
     */
    async handleCastAuraCommand({ player, message, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Vous devez d'abord créer un personnage avec /créer !`
            };
        }

        // Vérifier d'abord si le joueur a des auras
        const playerAuras = this.auraManager.getPlayerAuraLevel(player.id);
        if (!playerAuras || Object.keys(playerAuras).length === 0) {
            return {
                text: `❌ **AUCUNE AURA MAÎTRISÉE** ❌

🚫 Vous n'avez appris aucune technique d'aura !

💡 **Pour débuter :**
• Utilisez \`/aura_apprendre [type]\`
• Entraînez-vous 365 jours minimum
• Seuls les plus déterminés y arrivent

🔰 Vous êtes encore un simple humain sans pouvoirs.`
            };
        }

        const args = message.split(' ').slice(1);
        if (args.length === 0) {
            return {
                text: `🔮 **LANCER UNE TECHNIQUE D'AURA** 🔮

**Usage:** \`/aura_cast [technique]\`

📚 **Vos techniques disponibles :**
${Object.entries(playerAuras).map(([type, data]) => {
    const aura = this.auraManager.auraTypes[type];
    return `${aura.emoji} **${aura.name}** (Niv. ${data.level}):\n${data.techniques.map(t => `   • ${t}`).join('\n')}`;
}).join('\n\n')}

⚡ **Exemple :** \`/aura_cast Souffle Ardent\``
            };
        }

        const techniqueName = args.join(' ');

        // Chercher la technique dans toutes les auras du joueur
        let foundAura = null;
        let foundTechnique = null;

        for (const [auraType, auraData] of Object.entries(playerAuras)) {
            if (auraData.techniques.includes(techniqueName)) {
                foundAura = auraType;
                foundTechnique = techniqueName;
                break;
            }
        }

        if (!foundAura) {
            return {
                text: `❌ **TECHNIQUE INCONNUE** ❌

🚫 "${techniqueName}" n'est pas dans votre répertoire !

📚 **Vos techniques :**
${Object.entries(playerAuras).map(([type, data]) =>
    data.techniques.map(t => `• ${t}`).join('\n')
).join('\n')}`
            };
        }

        const result = await this.auraManager.castAuraTechnique(player.id, foundAura, foundTechnique);
        return { text: result.message };
    }

    /**
     * Méditation pour récupérer l'énergie spirituelle
     */
    async handleMeditateCommand({ player, dbManager }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage ! Utilise /créer pour en créer un.`
            };
        }

        // Vérifier si le joueur a des auras
        const playerAuras = this.auraManager.getPlayerAuraLevel(player.id);
        if (Object.keys(playerAuras).length === 0) {
            return {
                text: `🧘 **MÉDITATION IMPOSSIBLE**

Vous devez d'abord apprendre une aura avant de pouvoir méditer.

Utilisez /aura_apprendre [type] pour commencer.`
            };
        }

        try {
            const result = await this.auraManager.startAuraRegeneration(player.id, sock, chatId);
            return { text: result.message };
        } catch (error) {
            console.error('❌ Erreur méditation:', error);
            return {
                text: `❌ Erreur lors de la méditation. Réessayez.`
            };
        }
    }

    async handleRegenerateAuraCommand({ player, dbManager, sock, chatId }) {
        return await this.handleMeditateCommand({ player, chatId, dbManager, sock });
    }

    async handleRegenerateMagicCommand({ player, chatId, dbManager, sock }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !

Utilise /créer pour créer ton personnage.`
            };
        }

        try {
            await this.auraManager.startMagicRegeneration(player.id, sock, chatId);
            return { text: '', skipResponse: true }; // La régénération gère l'affichage
        } catch (error) {
            console.error('❌ Erreur régénération magie:', error);
            return {
                text: `❌ Erreur lors de la régénération magique. Réessayez.`
            };
        }
    }


    // ===========================================
    // MÉTHODES POUR LE TEMPS, LA MÉTÉO ET LES ÉVÉNEMENTS
    // ===========================================

    /**
     * Affiche l'heure et la date actuelles du monde
     */
    async handleTimeCommand({ player, dbManager }) {
        if (!this.timeManager) {
            return { text: "❌ Système temporel non initialisé" };
        }

        return {
            text: this.timeManager.formatTimeDisplay()
        };
    }

    /**
     * Affiche les informations système du temps de jeu
     */
    async handleTimeSystemCommand({ imageGenerator }) {
        if (!this.timeManager) {
            return {
                text: `⚠️ **SYSTÈME TEMPOREL NON INITIALISÉ**

Le gestionnaire de temps n'est pas encore configuré.`
            };
        }

        return {
            text: this.timeManager.getTimeSystemInfo()
        };
    }

    /**
     * Affiche les informations météo actuelles
     */
    async handleWeatherCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const weather = this.timeManager.getCurrentWeather();
            const effects = this.timeManager.getCombinedEffects();

            let weatherDisplay = `🌤️ **MÉTÉO ACTUELLE** 🌤️

${weather.weatherInfo.emoji} **${weather.weatherInfo.name}**
📖 ${weather.weatherInfo.description}

🌡️ **Température:** ${weather.temperature}°C
💧 **Humidité:** ${weather.humidity}%
💨 **Vent:** ${weather.windSpeed} km/h
📊 **Pression:** ${weather.pressure} hPa

${weather.seasonInfo.emoji} **Saison:** ${weather.seasonInfo.name}
📝 ${weather.seasonInfo.description}

⚡ **EFFETS SUR LE GAMEPLAY** ⚡`;
            for (const [effect, value] of Object.entries(effects)) {
                if (Math.abs(value - 100) > 5) { // Seulement les effets significatifs
                    const modifier = value > 100 ? '+' : '';
                    const icon = value > 100 ? '⬆️' : '⬇️';
                    weatherDisplay += `\n${icon} ${effect}: ${modifier}${Math.round(value - 100)}%`;
                }
            }

            return { text: weatherDisplay };
        } catch (error) {
            console.error('❌ Erreur météo:', error);
            return { text: '❌ Erreur lors du chargement de la météo.' };
        }
    }

    /**
     * Affiche les événements actifs
     */
    async handleEventsCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const activeEvents = this.timeManager.getActiveEvents();

            if (activeEvents.length === 0) {
                return {
                    text: `🎆 **AUCUN ÉVÉNEMENT ACTIF** 🎆

Aucun événement spécial n'est en cours actuellement.

⏰ **Événements à venir:**
• Les événements se déclenchent aléatoirement
• Éclipses, pluies de météores, aurores boréales
• Festivals saisonniers

🔮 Restez connecté pour ne rien manquer !`
                };
            }

            let eventsDisplay = `🎆 **ÉVÉNEMENTS ACTIFS** 🎆\n\n`;

            activeEvents.forEach(event => {
                const timeLeft = Math.max(0, Math.floor((event.endTime - Date.now()) / 60000));
                eventsDisplay += `${event.emoji} **${event.name}**
📖 ${event.description}
⏳ Temps restant: ${timeLeft} minutes
🌟 Rareté: ${event.rarity}

`;

                if (event.effects && Object.keys(event.effects).length > 0) {
                    eventsDisplay += `⚡ **Effets actifs:**
`;
                    for (const [effect, value] of Object.entries(event.effects)) {
                        const modifier = value > 100 ? '+' : '';
                        eventsDisplay += `• ${effect}: ${modifier}${Math.round(value - 100)}%
`;
                    }
                    eventsDisplay += `\n`;
                }
            });

            eventsDisplay += `💡 Profitez des événements pour booster vos capacités !`;

            return { text: eventsDisplay };
        } catch (error) {
            console.error('❌ Erreur événements:', error);
            return { text: '❌ Erreur lors du chargement des événements.' };
        }
    }

    /**
     * Affiche un calendrier avec les phases temporelles
     */
    async handleCalendarCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const currentTime = this.timeManager.getCurrentTime();
            const weather = this.timeManager.getCurrentWeather();

            let calendarDisplay = `📅 **CALENDRIER MONDIAL** 📅\n\n`;
            calendarDisplay += `📆 **${currentTime.dateString}**
🕐 **${currentTime.timeString}**
${currentTime.seasonInfo.emoji} **${currentTime.seasonInfo.name}**

🌤️ **Météo:** ${weather.weatherInfo.emoji} ${weather.weatherInfo.name}

📊 **Cycle temporel:**
• Année ${currentTime.year} de l'ère moderne
• Mois ${currentTime.month}/12
• Jour ${currentTime.day}/30
• Heure ${currentTime.hour}:${currentTime.minute.toString().padStart(2, '0')}

🔄 **Phases saisonnières:**
`;
            const seasons = ['Printemps', 'Été', 'Automne', 'Hiver'];
            const currentSeason = currentTime.seasonInfo.name;
            seasons.forEach(season => {
                const icon = season === currentSeason ? '🔸' : '🔹';
                calendarDisplay += `${icon} ${season}\n`;
            });

            calendarDisplay += `\n⏰ **1 minute réelle = 1 heure de jeu**
📈 **Le temps affecte vos capacités et les événements !**`;

            return { text: calendarDisplay };
        } catch (error) {
            console.error('❌ Erreur calendrier:', error);
            return { text: '❌ Erreur lors du chargement du calendrier.' };
        }
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
            console.error('❌ Erreur génération carte avancée:', error);
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
}

module.exports = GameEngine;