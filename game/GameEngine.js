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

            // Commandes d'aura (système de 10 jours d'entraînement)
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
     * Affiche le statut d'authentification admin
     */
    async handleAdminStatusCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        console.log(`🔐 Tentative d'accès admin par: "${playerNumber}"`);

        const authStatus = this.adminManager.getAuthStatus(playerNumber);

        if (!authStatus.authenticated) {
            return {
                text: `🔒 **STATUT ADMIN** 🔒

❌ Non authentifié
🔑 Envoyez le code d'administration pour vous connecter`
            };
        }

        return {
            text: `🔐 **STATUT ADMIN** 🔐

✅ Authentifié
⏰ Temps restant: ${authStatus.timeLeft} minutes
🛡️ Accès complet aux commandes d'administration

💡 Utilisez \`/admin_logout\` pour vous déconnecter`
        };
    }

    /**
     * Déconnecte l'administrateur
     */
    async handleAdminLogoutCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        this.adminManager.logoutAdmin(playerNumber);

        return {
            text: `🔒 **DÉCONNEXION ADMIN** 🔒

✅ Vous avez été déconnecté avec succès
🔑 Envoyez le code d'administration pour vous reconnecter`
        };
    }

    /**
     * Affiche l'aide des commandes d'administration
     */
    async handleAdminHelpCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        console.log(`🔐 Demande d'aide admin par: "${playerNumber}"`);

        if (!this.adminManager.isAdmin(playerNumber)) {
            return {
                text: `🔒 **ACCÈS REFUSÉ** 🔒

❌ Vous n'êtes pas authentifié en tant qu'administrateur
🔑 Envoyez le code d'administration pour vous connecter`
            };
        }

        return {
            text: this.adminManager.getAdminHelp()
        };
    }

    /**
     * Liste tous les groupes et leurs royaumes
     */
    async handleAdminGroupsCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        console.log(`🔐 Commande admin_groups par: "${playerNumber}"`);

        if (!this.adminManager.isAdmin(playerNumber)) {
            return {
                text: `🔒 **ACCÈS REFUSÉ** 🔒

❌ Vous n'êtes pas authentifié en tant qu'administrateur
🔑 Envoyez le code d'administration pour vous connecter`
            };
        }

        return {
            text: this.adminManager.listKingdomGroups()
        };
    }

    /**
     * Assigne un royaume à un groupe
     */
    async handleAdminKingdomCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        console.log(`🔐 Commande admin_kingdom par: "${playerNumber}"`);

        if (!this.adminManager.isAdmin(playerNumber)) {
            return {
                text: `🔒 **ACCÈS REFUSÉ** 🔒

❌ Vous n'êtes pas authentifié en tant qu'administrateur
🔑 Envoyez le code d'administration pour vous connecter`
            };
        }

        const args = message.split(' ').slice(1);
        if (args.length < 1) {
            return {
                text: `📋 **COMMANDE ADMIN_KINGDOM**

Usage: /admin_kingdom [ROYAUME_ID]

**Exemples:**
• /admin_kingdom AEGYRIA

Cette commande assigne le groupe actuel au royaume spécifié.

**Royaumes disponibles:**
AEGYRIA, SOMBRENUIT, KHELOS, ABRANTIS, VARHA, SYLVARIA, ECLYPSIA, TERRE_DESOLE, DRAK_TARR, URVALA, OMBREFIEL, KHALDAR`
            };
        }

        const kingdomId = args[0].toUpperCase();
        const result = this.adminManager.assignKingdomToGroup(chatId, kingdomId);

        return {
            text: result
        };
    }

    async finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage = false, imageBuffer = null }) {
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const name = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (!gender || !kingdomId || !name) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        const kingdom = await dbManager.getKingdomById(kingdomId);
        const kingdomName = kingdom ? kingdom.name : kingdomId;

        const characterData = {
            playerId: player.id,
            name: name,
            gender: gender,
            kingdom: kingdomId,
            level: 1,
            experience: 0,
            powerLevel: 'G',
            frictionLevel: 'G',
            currentLife: 100,
            maxLife: 100,
            currentEnergy: 100,
            maxEnergy: 100,
            currentLocation: `Capitale de ${kingdomName}`,
            position: { x: 0, y: 0, z: 0 },
            coins: 100,
            equipment: {},
            inventory: [],
            learnedTechniques: [],
            customImage: hasCustomImage
        };

        console.log(`✅ Création personnage: ${name}, Royaume: ${kingdomName} (${kingdomId}), Genre: ${gender}, Image: ${hasCustomImage}`);

        try {
            const newCharacter = await dbManager.createCharacter(characterData);

            if (hasCustomImage && imageBuffer) {
                await imageGenerator.saveCustomCharacterImage(newCharacter.id, imageBuffer);
            }

            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_gender');
            await dbManager.clearTemporaryData(player.id, 'creation_kingdom');
            await dbManager.clearTemporaryData(player.id, 'creation_name');

            const imageType = hasCustomImage ? "avec ta photo personnalisée" : "avec une image générée";

            let characterImage = null;
            try {
                characterImage = await imageGenerator.generateCharacterImage(newCharacter);
            } catch (imageError) {
                console.log('⚠️ Impossible de générer l\'image du personnage, continuons sans image:', imageError.message);
            }

            return {
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !**

👤 **Nom :** ${newCharacter.name}
👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}
🏰 **Royaume :** ${kingdomName}
📸 **Image :** ${imageType}
⚔️ **Niveau :** ${newCharacter.level}
🌟 **Niveau de puissance :** ${newCharacter.powerLevel}

🎮 Utilise /menu pour découvrir tes options !`,
                image: characterImage
            };

        } catch (error) {
            console.error('❌ Erreur lors de la création du personnage:', error);
            return {
                text: `❌ Erreur lors de la création du personnage. Réessaie plus tard.`
            };
        }
    }

    async handleModifyCharacterCommand({ player, dbManager, imageGenerator, sock, chatId }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !

Utilise la commande /créer pour en créer un.`
            };
        }

        if (this.characterCustomization) {
            const success = await this.characterCustomization.startCharacterCustomization(
                player.whatsappNumber,
                chatId,
                true
            );

            if (success) {
                return { text: '' };
            } else {
                return {
                    text: '❌ Impossible de démarrer le système de modification. Une personnalisation est peut-être déjà en cours.\n\n' +
                          'Tapez "annuler" si vous avez un processus en cours, puis réessayez /modifier.'
                };
            }
        } else {
            return await this.handleOldModifyCharacterCommand({ player, dbManager, imageGenerator });
        }
    }

    async handleOldModifyCharacterCommand({ player, dbManager, imageGenerator }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);

        await dbManager.setTemporaryData(player.id, 'modification_started', true);

        let characterImage = null;
        try {
            characterImage = await imageGenerator.generateCharacterImage(character);
        } catch (imageError) {
            console.log('⚠️ Impossible de générer l\'image du personnage pour modification, continuons sans image:', imageError.message);
        }

        return {
            text: `✨ **MODIFICATION DE PERSONNAGE (Mode Simple)**

👤 **Personnage actuel :** ${character.name}
🏰 **Royaume :** ${character.kingdom}
👤 **Sexe :** ${character.gender === 'male' ? 'Homme' : 'Femme'}

⚠️ Le système 3D avancé n'est pas disponible.

🎨 **Nouvelle apparence personnalisée :**

📝 Décris en détail l'apparence que tu veux pour ton personnage :
• Couleur des cheveux, des yeux
• Taille, corpulence
• Style vestimentaire
• Armes et accessoires
• Cicatrices, tatouages, etc.

✍️ **Écris ta description complète en un seul message :**`,
            image: characterImage
        };
    }

    async handleModificationDescription({ player, description, dbManager, imageGenerator }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            await dbManager.clearTemporaryData(player.id, 'modification_started');
            return {
                text: `❌ Personnage non trouvé. Utilise /créer pour créer un personnage.`
            };
        }

        try {
            console.log(`🎨 Génération nouvelle image pour ${character.name} avec description personnalisée...`);

            const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
            const kingdomDesc = this.getKingdomDescription(character.kingdom);

            const cleanDescription = description.trim();

            const basePrompt = `fantasy ${genderDesc} warrior`;
            const kingdomContext = `from ${character.kingdom} kingdom (${kingdomDesc})`;
            const userCustomization = cleanDescription;
            const artStyle = 'detailed fantasy RPG character art, first person POV perspective, epic fantasy style';

            let fullPrompt = `${basePrompt} ${kingdomContext}, appearance: ${userCustomization}, ${artStyle}`;

            console.log(`🎨 Prompt de modification généré: "${fullPrompt}"`);

            if (!fullPrompt.toLowerCase().includes(cleanDescription.toLowerCase().substring(0, 20))) {
                console.log('⚠️ Description utilisateur mal intégrée, correction...');
                const correctedPrompt = `${userCustomization}, ${basePrompt} ${kingdomContext}, ${artStyle}`;
                console.log(`🔧 Prompt corrigé: "${correctedPrompt}"`);
                fullPrompt = correctedPrompt;
            }

            const imagePath = `temp/character_modified_${character.id}_${Date.now()}.png`;

            console.log(`📝 Description originale: "${cleanDescription}"`);
            console.log(`🎯 Prompt final envoyé: "${fullPrompt}"`);

            await imageGenerator.freepikClient.generateImage(fullPrompt, imagePath, {
                style: '3d',
                perspective: 'first_person',
                nudity: false
            });

            const fs = require('fs').promises;
            const imageBuffer = await fs.readFile(imagePath).catch(() => null);

            await dbManager.clearTemporaryData(player.id, 'modification_started');

            if (imageBuffer) {
                await imageGenerator.saveCustomCharacterImage(character.id, imageBuffer);

                return {
                    text: `✨ **PERSONNAGE MODIFIÉ AVEC SUCCÈS !**

👤 **${character.name}** - Nouvelle apparence générée

📝 **Description appliquée :**
"${cleanDescription}"

🎨 **Image générée par Freepik avec IA (vue première personne)**

✅ Ton personnage a maintenant une apparence unique basée sur ta description!`,
                    image: imageBuffer
                };
            } else {
                return {
                    text: `❌ Erreur lors de la génération de l'image. Réessaie avec /modifier`
                };
            }

        } catch (error) {
            console.error('❌ Erreur lors de la modification:', error);
            await dbManager.clearTemporaryData(player.id, 'modification_started');

            return {
                text: `❌ Erreur lors de la génération de l'image personnalisée.

Réessaie avec une description plus simple ou utilise /modifier à nouveau.`
            };
        }
    }

    getKingdomDescription(kingdom) {
        const descriptions = {
            'AEGYRIA': 'golden plains kingdom with honor and chivalry, blessed armor and noble weapons',
            'SOMBRENUIT': 'dark mysterious forests with moon magic and shadow spirits, dark robes',
            'KHELOS': 'burning desert kingdom with ancient ruins and nomadic culture, desert garb',
            'ABRANTIS': 'coastal kingdom with naval tradition, sea-themed armor and weapons',
            'VARHA': 'snowy mountain kingdom with beast hunters, fur armor and winter gear',
            'SYLVARIA': 'magical forest kingdom with nature magic, elven-style clothing and equipment',
            'ECLYPSIA': 'dark eclipse lands with shadow magic, dark mystical robes and artifacts',
            'TERRE_DESOLE': 'post-apocalyptic wasteland, scavenged armor and improvised weapons',
            'DRAK_TARR': 'volcanic kingdom with dragon themes, dragon-scale armor and fire weapons',
            'URVALA': 'misty swamp kingdom with alchemy, alchemical gear and mystical accessories',
            'OMBREFIEL': 'gray plains with mercenaries, practical armor and versatile weapons',
            'KHALDAR': 'tropical jungle kingdom, light armor and nature-based weapons'
        };

        return descriptions[kingdom] || 'fantasy kingdom with unique customs and equipment';
    }

    async processDialogueAction({ player, character, message, dbManager, imageGenerator }) {
        try {
            console.log(`💬 Dialogue PNJ détecté pour ${character.name}: ${message}`);

            let playerSpeech = message;
            if (message.includes('"')) {
                const matches = message.match(/"([^"]+)"/);
                if (matches && matches[1]) {
                    playerSpeech = matches[1];
                }
            }

            let npcResponse;
            const sessionId = `player_${player.id}`;

            try {
                console.log('🎭 Génération réponse PNJ avec Groq...');

                if (this.groqClient && this.groqClient.hasValidClient()) {
                    npcResponse = await this.groqClient.generateNPCResponse(
                        'Habitant du village',
                        `un habitant du royaume ${character.kingdom}, personnage amical et curieux`,
                        playerSpeech,
                        {
                            location: character.currentLocation,
                            kingdom: character.kingdom,
                            playerName: character.name
                        }
                    );
                } else {
                    npcResponse = `"Salut ${character.name} ! Que fais-tu par ici ?"`;
                }
            } catch (error) {
                console.error('❌ Erreur génération dialogue PNJ:', error.message);
                npcResponse = `"Bonjour, voyageur. Belle journée, n'est-ce pas ?"`;
            }

            let dialogueImage = null;
            let dialogueAudio = null;

            try {
                const mediaResult = await imageGenerator.generateDialogueImage(
                    character,
                    'Habitant du village',
                    npcResponse,
                    { style: '3d', perspective: 'second_person' }
                );
                dialogueImage = mediaResult.image;
                dialogueAudio = mediaResult.audio;
            } catch (mediaError) {
                console.error('❌ Erreur génération média dialogue:', mediaError.message);
            }

            return {
                text: `💬 ${playerSpeech}

${npcResponse}

📍 *${character.currentLocation}*`,
                image: dialogueImage,
                audio: dialogueAudio
            };

        } catch (error) {
            console.error('❌ Erreur processDialogueAction:', error);
            return {
                text: `❌ Erreur lors du dialogue. Les habitants semblent occupés en ce moment.`
            };
        }
    }

    async handleDeleteCharacter({ player, dbManager, imageGenerator }) {
        try {
            const character = await this.dbManager.getCharacterByPlayer(player.id);

            if (!character) {
                return {
                    text: `❌ Tu n'as pas de personnage à supprimer.

Utilise /créer pour créer un nouveau personnage.`
                };
            }

            await dbManager.deleteCharacter(character.id);

            await dbManager.clearTemporaryData(player.id, 'game_mode');
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            console.log(`🗑️ Personnage supprimé: ${character.name} (ID: ${character.id})`);

            return {
                text: `🗑️ **PERSONNAGE SUPPRIMÉ** 🗑️

👤 **${character.name}** a été définitivement supprimé de ${character.kingdom}.

✨ Tu peux maintenant créer un nouveau personnage avec /créer

💀 **Attention :** Cette action est irréversible!`,
                image: await imageGenerator.generateMenuImage()
            };

        } catch (error) {
            console.error('❌ Erreur lors de la suppression du personnage:', error);
            return {
                text: `❌ **Erreur lors de la suppression**

Une erreur s'est produite. Veuillez réessayer plus tard.`
            };
        }
    }

    async generateNPCResponse(character, playerDialogue, sessionId) {
        try {
            if (this.groqClient && this.groqClient.hasValidClient()) {
                return await this.groqClient.generateDialogueResponse(character, playerDialogue, sessionId);
            }

            if (this.openAIClient && this.openAIClient.isAvailable) {
                const context = {
                    character: character,
                    playerMessage: playerDialogue,
                    location: character.currentLocation
                };
                return await this.openAIClient.generateCharacterResponse(character, context, playerDialogue, sessionId);
            }

            return "Le PNJ vous regarde attentivement et hoche la tête.";

        } catch (error) {
            console.error('❌ Erreur génération réponse PNJ:', error);
            return "Le PNJ semble perplexe et ne sait pas quoi répondre.";
        }
    }

    async handleAuthorizeCommand({ player, chatId, message, dbManager, imageGenerator }) {
        try {
            // Extraire le nom du joueur et optionnellement le royaume de la commande
            const parts = message.split(' ');
            if (parts.length < 2) {
                return {
                    text: `📋 **COMMANDE AUTORISE**

Usage: /autorise [nom_du_joueur] [ROYAUME_OPTIONNEL]

**Exemples:**
• /autorise Jean
• /autorise Jean AEGYRIA

Si aucun royaume n'est spécifié, le système détectera automatiquement le royaume pour ce groupe.`
                };
            }

            const playerName = parts[1].trim();
            const specifiedKingdom = parts[2] ? parts[2].toUpperCase().trim() : null;

            let kingdom = null;

            // Si un royaume est spécifié dans la commande, l'utiliser et enregistrer l'association
            if (specifiedKingdom) {
                kingdom = await dbManager.getKingdomById(specifiedKingdom);

                if (!kingdom) {
                    const kingdoms = await dbManager.getAllKingdoms();
                    let kingdomsList = kingdoms.map((k, i) => `${i + 1}. ${k.name} (${k.id})`).join('\n');

                    return {
                        text: `❌ **ROYAUME INVALIDE**

Le royaume "${specifiedKingdom}" n'existe pas.

**Royaumes disponibles:**
${kingdomsList}`
                    };
                }

                // Enregistrer automatiquement l'association groupe-royaume
                try {
                    await dbManager.saveChatKingdomAssociation(chatId, kingdom.id);
                    console.log(`✅ Association automatique sauvegardée: ${chatId} -> ${kingdom.id}`);
                } catch (saveError) {
                    console.error('⚠️ Erreur sauvegarde association:', saveError);
                    // Continue malgré l'erreur d'association
                }
            } else {
                // Essayer de récupérer le royaume depuis l'association existante
                kingdom = await this.getKingdomFromChatId(chatId, dbManager);

                if (!kingdom) {
                    return {
                        text: `❌ **GROUPE NON CONFIGURÉ**

Ce groupe WhatsApp n'est pas encore associé à un royaume.

**Solutions:**
• Utilisez: /autorise ${playerName} ROYAUME_ID
• Ou configurez d'abord avec: /config_royaume ROYAUME_ID

**Exemples:**
• /autorise ${playerName} AEGYRIA
• /config_royaume AEGYRIA`
                    };
                }
            }

            // Rechercher le personnage par nom
            const character = await dbManager.getCharacterByName(playerName);

            if (!character) {
                return {
                    text: `❌ **JOUEUR NON TROUVÉ**

Aucun personnage trouvé avec le nom "${playerName}".

Vérifiez l'orthographe ou demandez au joueur de créer son personnage avec /créer.`
                };
            }

            // Vérifier si le joueur est déjà dans le bon royaume
            if (character.kingdom === kingdom.id) {
                return {
                    text: `✅ **DÉJÀ AUTORISÉ**

Le joueur **${character.name}** est déjà membre du royaume **${kingdom.name}**.

🏰 Royaume actuel: ${kingdom.name}
📍 Localisation: ${character.currentLocation}`
                };
            }

            // Sauvegarder l'ancien royaume pour l'affichage
            const oldKingdom = character.kingdom;

            // Mettre à jour le royaume du personnage
            await dbManager.updateCharacter(character.id, {
                kingdom: kingdom.id,
                currentLocation: this.getStartingLocation(kingdom.id)
            });

            console.log(`👑 Autorisation: ${character.name} transféré vers ${kingdom.name} via groupe ${chatId}`);

            return {
                text: `👑 **AUTORISATION ACCORDÉE** 👑

✅ Le joueur **${character.name}** a été autorisé dans le royaume **${kingdom.name}**!

🏰 **Ancien royaume:** ${oldKingdom}
🏰 **Nouveau royaume:** ${kingdom.name}
📍 **Nouvelle localisation:** ${this.getStartingLocation(kingdom.id)}

${specifiedKingdom ? '✨ **Association groupe-royaume automatiquement enregistrée!**\n\n' : ''}Le joueur peut maintenant participer aux activités de ce royaume.`,
                image: await imageGenerator.generateKingdomImage(kingdom.id)
            };

        } catch (error) {
            console.error('❌ Erreur commande autorise:', error);
            return {
                text: `❌ **ERREUR D'AUTORISATION**

Une erreur s'est produite lors de l'autorisation.

Veuillez réessayer ou contactez un administrateur.`
            };
        }
    }

    async getKingdomFromChatId(chatId, dbManager) {
        try {
            // Récupérer l'association depuis la base de données
            const association = await dbManager.getChatKingdomAssociation(chatId);

            if (!association) {
                console.log(`⚠️ Groupe non configuré: ${chatId}`);
                return null;
            }

            console.log(`✅ Groupe ${chatId} mappé vers le royaume ${association.kingdomId}`);

            // Récupérer les informations complètes du royaume
            return await dbManager.getKingdomById(association.kingdomId);
        } catch (error) {
            console.error('❌ Erreur récupération association groupe-royaume:', error);
            return null;
        }
    }

    async handleConfigKingdomCommand({ player, chatId, message, dbManager, imageGenerator }) {
        try {
            const parts = message.split(' ');

            if (parts.length < 2) {
                const kingdoms = await dbManager.getAllKingdoms();
                let kingdomsList = kingdoms.map((k, i) => `${i + 1}. ${k.name} (${k.id})`).join('\n');

                return {
                    text: `⚙️ **CONFIGURATION ROYAUME**

Usage: /config_royaume [ROYAUME_ID]

**Royaumes disponibles:**
${kingdomsList}

**Exemple:** /config_royaume AEGYRIA

Cette commande vous aide à configurer ce groupe WhatsApp.

📍 **ID du groupe actuel:** \`${chatId}\`

💡 **Pour les développeurs:** Copiez cet ID pour l'ajouter dans le mapping des groupes.`
                };
            }

            const kingdomId = parts[1].toUpperCase();
            const kingdom = await dbManager.getKingdomById(kingdomId);

            if (!kingdom) {
                return {
                    text: `❌ **ROYAUME INVALIDE**

Le royaume "${kingdomId}" n'existe pas.

Utilisez /config_royaume pour voir la liste des royaumes disponibles.`
                };
            }

            // Vérifier si le groupe est déjà configuré
            const currentKingdom = await this.getKingdomFromChatId(chatId, dbManager);

            if (currentKingdom && currentKingdom.id === kingdomId) {
                return {
                    text: `✅ **DÉJÀ CONFIGURÉ**

Ce groupe est déjà associé au royaume **${kingdom.name}**!

🏰 **Royaume:** ${kingdom.name}
📍 **ID Groupe:** \`${chatId}\`

Les commandes /autorise fonctionnent déjà pour ce royaume.`
                };
            }

            // Sauvegarder automatiquement l'association
            try {
                await dbManager.saveChatKingdomAssociation(chatId, kingdomId);

                console.log(`✅ Association sauvegardée: ${chatId} -> ${kingdomId}`);

                return {
                    text: `✅ **CONFIGURATION RÉUSSIE !**

Le groupe WhatsApp a été automatiquement associé au royaume **${kingdom.name}**!

🏰 **Royaume:** ${kingdom.name}
🎯 **ID Royaume:** ${kingdom.id}
📱 **ID Groupe:** \`${chatId}\`

✨ **L'association a été sauvegardée dans la base de données.**

Les commandes /autorise fonctionnent maintenant pour ce royaume !`,
                    image: await imageGenerator.generateKingdomImage(kingdom.id)
                };
            } catch (saveError) {
                console.error('❌ Erreur sauvegarde association:', saveError);

                return {
                    text: `❌ **ERREUR DE SAUVEGARDE**

Impossible de sauvegarder l'association du groupe au royaume **${kingdom.name}**.

Erreur: ${saveError.message}

Veuillez réessayer ou contactez un administrateur.`
                };
            }

        } catch (error) {
            console.error('❌ Erreur config royaume:', error);
            return {
                text: `❌ **ERREUR DE CONFIGURATION**

Une erreur s'est produite lors de la configuration.

Veuillez réessayer ou contactez un administrateur.`
            };
        }
    }

    // ===========================================
    // NOUVELLES MÉTHODES POUR LES SORTS ET L'ALPHABET ANCIEN
    // ===========================================

    /**
     * Affiche les détails d'un sort spécifique
     */
    async handleSpellCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `📚 **CONSULTATION DE SORT** 📚

Usage: /sort [nom du sort]

Exemples:
• /sort boule de feu
• /sort ⫷⧉⩚⧃⧇ ⟁✦ ⫷✦⪦ (alphabet ancien)

📖 Tapez /sorts pour voir votre grimoire complet.`
                };
            }

            const spellInput = args.join(' ');
            const parsedInput = this.ancientAlphabetManager.parseSpellInput(spellInput);

            // Simulation d'un sort - dans la vraie version, cela viendrait de la base de données
            const mockSpell = {
                name: parsedInput.modern,
                type: 'fire',
                level: 3,
                description: 'Lance une boule de feu dévastatrice sur vos ennemis.',
                manaCost: 25,
                damage: 45,
                effect: 'Brûlure pendant 3 tours'
            };

            const spellDisplay = this.ancientAlphabetManager.createSpellDisplay(mockSpell);

            return {
                text: spellDisplay,
                image: null
            };
        } catch (error) {
            console.error('❌ Erreur sort:', error);
            return { text: '❌ Erreur lors de la consultation du sort.' };
        }
    }

    /**
     * Affiche le grimoire du joueur avec tous ses sorts
     */
    async handleSpellbookCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                return { text: '❌ Vous devez d\'abord vous enregistrer avec /menu' };
            }

            const character = await dbManager.getCharacterByPlayerId(player.id);
            if (!character) {
                return { text: '❌ Vous devez d\'abord créer un personnage avec /créer' };
            }

            // Simulation des sorts appris - dans la vraie version, cela viendrait de la base de données
            const learnedSpells = [
                { name: 'Boule de Feu', type: 'fire', level: 2, manaCost: 20 },
                { name: 'Éclair Mystique', type: 'lightning', level: 1, manaCost: 15 },
                { name: 'Soin Mineur', type: 'healing', level: 1, manaCost: 10 }
            ];

            const spellbookDisplay = this.ancientAlphabetManager.createSpellbook(learnedSpells, character.name);

            return {
                text: spellbookDisplay,
                image: null
            };
        } catch (error) {
            console.error('❌ Erreur grimoire:', error);
            return { text: '❌ Erreur lors de l\'affichage du grimoire.' };
        }
    }

    /**
     * Lance un sort en combat ou hors combat
     */
    async handleCastSpellCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `✨ **LANCEMENT DE SORT** ✨

Usage: /lancer [nom du sort]

Exemples:
• /lancer boule de feu
• /lancer ⫷⧉⩚⧃⧇ ⟁✦ ⫷✦⪦ (alphabet ancien)

🔮 Tapez /sorts pour voir vos sorts disponibles.`
                };
            }

            const player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                return { text: '❌ Vous devez d\'abord vous enregistrer avec /menu' };
            }

            const character = await dbManager.getCharacterByPlayerId(player.id);
            if (!character) {
                return { text: '❌ Vous devez d\'abord créer un personnage avec /créer' };
            }

            const spellInput = args.join(' ');
            const parsedInput = this.ancientAlphabetManager.parseSpellInput(spellInput);

            // Simulation de lancement de sort
            const mockSpell = {
                name: parsedInput.modern,
                type: 'fire',
                level: 3,
                manaCost: 25,
                damage: 45,
                effects: 'Dégâts de feu critiques !',
                incantation: this.ancientAlphabetManager.createIncantation(parsedInput.modern, 'fire', 3)
            };

            // Créer l'animation de lancement
            const castingFrames = this.ancientAlphabetManager.createSpellCastingAnimation(
                mockSpell,
                character.name,
                null
            );

            // Afficher l'animation avec des barres de chargement
            const loadingAnimation = await this.loadingBarManager.createLoadingAnimation(
                'spell',
                `Lancement de ${mockSpell.name}`,
                character.name
            );

            // Créer une narration complète avec image
            const narration = await this.narrationImageManager.createSpellNarration(mockSpell, character);

            return {
                text: `${loadingAnimation[loadingAnimation.length - 1]}

${castingFrames[castingFrames.length - 1]}

${narration.text}`,
                image: narration.imagePath
            };
        } catch (error) {
            console.error('❌ Erreur lancement sort:', error);
            return { text: '❌ Erreur lors du lancement du sort.' };
        }
    }

    /**
     * Permet d'apprendre un nouveau sort
     */
    async handleLearnSpellCommand({ playerNumber, chatId, message, dbManager, imageGenerator }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `📚 **APPRENTISSAGE DE SORT** 📚

Usage: /apprendre [nom du sort]

🔮 Vous devez être près d'un maître de magie ou dans une académie pour apprendre de nouveaux sorts.

📍 Rendez-vous dans les lieux suivants :
• Académie Mystique d'AEGYRIA
• Tour des Mages de SOMBRENUIT
• Sanctuaire Élémentaire de TERRAVERDE`
                };
            }

            const player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                return { text: '❌ Vous devez d\'abord vous enregistrer avec /menu' };
            }

            const character = await dbManager.getCharacterByPlayerId(player.id);
            if (!character) {
                return { text: '❌ Vous devez d\'abord créer un personnage avec /créer' };
            }

            const spellName = args.join(' ');
            const ancientName = this.ancientAlphabetManager.toAncientText(spellName);

            return {
                text: `✨ **SORT APPRIS !** ✨

🎓 **${character.name}** a appris le sort **${spellName}** !

🔮 **Nom mystique:** ${ancientName}

📚 Le sort a été ajouté à votre grimoire.
💫 Vous pouvez maintenant l'utiliser avec /lancer ${spellName}

⚡ **Conseil:** Les sorts en alphabet ancien sont plus puissants !`
            };
        } catch (error) {
            console.error('❌ Erreur apprentissage sort:', error);
            return { text: '❌ Erreur lors de l\'apprentissage du sort.' };
        }
    }

    // ===========================================
    // MÉTHODES D'ADMINISTRATION
    // ===========================================

    /**
     * Affiche les statistiques du serveur (Admin uniquement)
     */
    async handleAdminStatsCommand({ player, chatId, message, sock, dbManager, imageGenerator, playerNumber }) {
        const adminId = playerNumber || player.whatsappNumber;
        console.log(`🔐 Tentative d'accès admin par: "${adminId}"`);

        if (!this.adminManager.isAdmin(adminId)) {
            return {
                text: `❌ **ACCÈS REFUSÉ** ❌

🚫 Vous n'avez pas les permissions d'administrateur.
🔑 Envoyez d'abord votre code d'authentification (2011).`
            };
        }

        // Auto-suppression du message de commande admin après traitement
        setTimeout(async () => {
            try {
                await sock.sendMessage(chatId, { delete: originalMessage.key });
                console.log(`🗑️ Commande admin supprimée automatiquement`);
            } catch (error) {
                console.log(`⚠️ Impossible de supprimer la commande admin: ${error.message}`);
            }
        }, 5000);

        const response = await this.adminManager.processAdminCommand('/admin_stats', adminId);

        return {
            text: `${response}

🔒 Cette commande et sa réponse seront automatiquement supprimées.
⏰ Session expire dans ${this.adminManager.getAuthStatus(adminId)?.timeLeft || 0} minutes.`
        };
    }

    /**
     * Modifie l'heure du jeu (Admin uniquement)
     */
    async handleAdminTimeCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_time', args);

        const response = await this.adminManager.processAdminCommand('/admin_time', adminId, params);
        return { text: response };
    }

    /**
     * Assigne un groupe à un royaume (Admin uniquement)
     */
    async handleAdminKingdomCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        if (args.length < 2) {
            return {
                text: `👑 **GESTION DES ROYAUMES** 👑

Usage: /admin_kingdom [groupeId] [royaume]

Exemple: /admin_kingdom ${chatId} AEGYRIA

🏰 **Royaumes disponibles:**
AEGYRIA, SOMBRENUIT, TERRAVERDE, CIELNUAGE,
FLAMMEBOURG, GELOPOLIS, VENTARIA, AURORALIS,
OMBRETERRE, CRYSTALIS, MAREVERDE, SOLARIA`
            };
        }

        const params = { groupId: args[0], kingdom: args[1] };
        const response = await this.adminManager.processAdminCommand('/admin_kingdom', adminId, params);

        // Mettre à jour le mapping local également
        this.adminManager.assignKingdomToGroup(params.groupId, params.kingdom);

        return { text: response };
    }

    /**
     * Liste tous les groupes et leurs royaumes (Admin uniquement)
     */
    async handleAdminGroupsCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const response = await this.adminManager.processAdminCommand('/admin_groups', adminId);
        return { text: response };
    }

    /**
     * Donne un objet à un joueur (Admin uniquement)
     */
    async handleAdminGiveCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_give', args);

        const response = await this.adminManager.processAdminCommand('/admin_give', adminId, params);
        return { text: response };
    }

    /**
     * Modifie le niveau d'un joueur (Admin uniquement)
     */
    async handleAdminLevelCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_level', args);

        const response = await this.adminManager.processAdminCommand('/admin_level', adminId, params);
        return { text: response };
    }

    /**
     * Téléporte un joueur (Admin uniquement)
     */
    async handleAdminTeleportCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_teleport', args);

        const response = await this.adminManager.processAdminCommand('/admin_teleport', adminId, params);
        return { text: response };
    }

    /**
     * Soigne complètement un joueur (Admin uniquement)
     */
    async handleAdminHealCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_heal', args);

        const response = await this.adminManager.processAdminCommand('/admin_heal', adminId, params);
        return { text: response };
    }

    /**
     * Ajoute un pouvoir à un joueur (Admin uniquement)
     */
    async handleAdminPowerCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_power', args);

        const response = await this.adminManager.processAdminCommand('/admin_power', adminId, params);
        return { text: response };
    }

    /**
     * Change la météo (Admin uniquement)
     */
    async handleAdminWeatherCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_weather', args);

        const response = await this.adminManager.processAdminCommand('/admin_weather', adminId, params);
        return { text: response };
    }

    /**
     * Lance un événement spécial (Admin uniquement)
     */
    async handleAdminEventCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_event', args);

        const response = await this.adminManager.processAdminCommand('/admin_event', adminId, params);
        return { text: response };
    }

    /**
     * Remet à zéro un royaume (Admin uniquement)
     */
    async handleAdminResetKingdomCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_reset_kingdom', args);

        const response = await this.adminManager.processAdminCommand('/admin_reset_kingdom', adminId, params);
        return { text: response };
    }

    /**
     * Active/désactive le mode debug (Admin uniquement)
     */
    async handleAdminDebugCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_debug', args);

        const response = await this.adminManager.processAdminCommand('/admin_debug', adminId, params);
        return { text: response };
    }

    /**
     * Crée une sauvegarde (Admin uniquement)
     */
    async handleAdminBackupCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_backup', args);

        const response = await this.adminManager.processAdminCommand('/admin_backup', adminId, params);
        return { text: response };
    }

    /**
     * Recharge les données du jeu (Admin uniquement)
     */
    async handleAdminReloadCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_reload', args);

        const response = await this.adminManager.processAdminCommand('/admin_reload', adminId, params);
        return { text: response };
    }

    /**
     * Envoie une annonce à tous les joueurs (Admin uniquement)
     */
    async handleAdminAnnounceCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const args = message.split(' ').slice(1);
        const params = this.adminManager.parseAdminCommand('/admin_announce', args);

        const response = await this.adminManager.processAdminCommand('/admin_announce', adminId, params);
        return { text: response };
    }

    /**
     * Affiche l'aide pour les commandes d'administration (Admin uniquement)
     */
    async handleAdminHelpCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        const adminId = playerNumber || player.whatsappNumber;
        if (!this.adminManager.isAdmin(adminId)) {
            return { text: '❌ Accès refusé. Cette commande est réservée aux administrateurs.' };
        }

        const response = this.adminManager.getAdminHelp();
        return { text: response };
    }

    /**
     * Vérifie la position d'un joueur dans un groupe/royaume
     */
    async validatePlayerKingdomLocation(playerNumber, chatId, dbManager) {
        try {
            const player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) return { valid: true, message: null };

            const character = await dbManager.getCharacterByPlayerId(player.id);
            if (!character) return { valid: true, message: null };

            return this.adminManager.validatePlayerLocation(chatId, character.kingdom);
        } catch (error) {
            console.error('❌ Erreur validation position:', error);
            return { valid: true, message: null };
        }
    }

    // ===========================================
    // MÉTHODES POUR LES QUÊTES (30,000 quêtes)
    // ===========================================

    /**
     * Affiche la liste des quêtes disponibles
     */
    async handleQuestsCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                return { text: '❌ Vous devez d\'abord vous enregistrer avec /menu' };
            }

            const character = await dbManager.getCharacterByPlayerId(player.id);
            if (!character) {
                return { text: '❌ Vous devez d\'abord créer un personnage avec /créer' };
            }

            // Générer les quêtes si pas encore fait
            await this.questManager.generateAllQuests();

            // Obtenir les quêtes disponibles pour ce joueur
            const availableQuests = this.questManager.getAvailableQuests(
                character.level,
                character.kingdom,
                10
            );

            if (availableQuests.length === 0) {
                return {
                    text: `📋 **AUCUNE QUÊTE DISPONIBLE**

Aucune quête n'est disponible pour votre niveau et royaume actuels.

💡 **Conseils:**
• Augmentez votre niveau pour débloquer plus de quêtes
• Explorez d'autres royaumes
• Terminez vos quêtes en cours`
                };
            }

            let questList = `📋 **QUÊTES DISPONIBLES** 📋

👤 **Personnage:** ${character.name}
🏰 **Royaume:** ${character.kingdom}
⭐ **Niveau:** ${character.level}

`;

            availableQuests.forEach((quest, index) => {
                const typeEmoji = quest.type === 'main' ? '⭐' : '📋';
                const difficultyEmoji = {
                    'Facile': '🟢',
                    'Normale': '🟡',
                    'Difficile': '🟠',
                    'Très Difficile': '🔴',
                    'Légendaire': '🟣'
                }[quest.difficulty];

                questList += `${index + 1}. ${typeEmoji} **${quest.title}**
   ${difficultyEmoji} ${quest.difficulty} • Niveau ${quest.requirements.level}
   ⏱️ ${quest.estimatedTime} min • 🏆 ${quest.rewards.xp} XP

`;

                if (quest.type === 'main' && quest.chapter) {
                    questList += `   📖 Chapitre ${quest.chapter}

`;
                }
            });

            questList += `💡 Utilisez /quete [numéro] pour voir les détails d'une quête
🎯 Utilisez /accepter [numéro] pour accepter une quête`;

            return { text: questList };
        } catch (error) {
            console.error('❌ Erreur quêtes:', error);
            return { text: '❌ Erreur lors du chargement des quêtes.' };
        }
    }

    /**
     * Affiche les détails d'une quête spécifique
     */
    async handleQuestDetailsCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `📖 **DÉTAILS DE QUÊTE**

Usage: /quete [numéro]

Exemple: /quete 1

📋 Utilisez /quetes pour voir la liste des quêtes disponibles.`
                };
            }

            const questIndex = parseInt(args[0]) - 1;

            const player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                return { text: '❌ Vous devez d\'abord vous enregistrer avec /menu' };
            }

            const character = await dbManager.getCharacterByPlayerId(player.id);
            if (!character) {
                return { text: '❌ Vous devez d\'abord créer un personnage avec /créer' };
            }

            // Générer les quêtes si pas encore fait
            await this.questManager.generateAllQuests();

            const availableQuests = this.questManager.getAvailableQuests(
                character.level,
                character.kingdom,
                20
            );

            if (questIndex < 0 || questIndex >= availableQuests.length) {
                return {
                    text: `❌ **QUÊTE INTROUVABLE**

Le numéro de quête ${questIndex + 1} n'existe pas.

📋 Utilisez /quetes pour voir les quêtes disponibles.`
                };
            }

            const quest = availableQuests[questIndex];
            const questDisplay = this.questManager.formatQuestDisplay(quest);

            return {
                text: questDisplay + `\n\n🎯 Utilisez /accepter ${questIndex + 1} pour accepter cette quête`
            };
        } catch (error) {
            console.error('❌ Erreur détail quête:', error);
            return { text: '❌ Erreur lors du chargement des détails de la quête.' };
        }
    }

    /**
     * Accepte une quête
     */
    async handleAcceptQuestCommand({ playerNumber, chatId, message, sock, dbManager, imageGenerator }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `🎯 **ACCEPTER UNE QUÊTE**

Usage: /accepter [numéro]

Exemple: /accepter 1

📋 Utilisez /quetes pour voir les quêtes disponibles.`
                };
            }

            const questIndex = parseInt(args[0]) - 1;

            const player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                return { text: '❌ Vous devez d\'abord vous enregistrer avec /menu' };
            }

            const character = await dbManager.getCharacterByPlayerId(player.id);
            if (!character) {
                return { text: '❌ Vous devez d\'abord créer un personnage avec /créer' };
            }

            await this.questManager.generateAllQuests();

            const availableQuests = this.questManager.getAvailableQuests(
                character.level,
                character.kingdom,
                20
            );

            if (questIndex < 0 || questIndex >= availableQuests.length) {
                return {
                    text: `❌ **QUÊTE INTROUVABLE**

Le numéro de quête ${questIndex + 1} n'existe pas.

📋 Utilisez /quetes pour voir les quêtes disponibles.`
                };
            }

            const quest = availableQuests[questIndex];

            // Animation d'acceptation de quête
            const loadingAnimation = await this.loadingBarManager.createLoadingAnimation(
                'quest_accept',
                `Acceptation de "${quest.title}"`,
                character.name
            );

            return {
                text: `${loadingAnimation[loadingAnimation.length - 1]}

✅ **QUÊTE ACCEPTÉE !**

📋 **${quest.title}**
📖 ${quest.description}

🎯 **Objectifs:**
${quest.objectives.map(obj => `• ${obj}`).join('\n')}

🏆 **Récompenses:**
• 💰 ${quest.rewards.gold} pièces d'or
• ⭐ ${quest.rewards.xp} points d'expérience
${quest.rewards.items ? quest.rewards.items.map(item => `• 🎒 ${item}`).join('\n') : ''}

📍 **Localisation:** ${quest.location}
⏱️ **Temps estimé:** ${quest.estimatedTime} minutes

💡 Utilisez /progression pour voir vos quêtes en cours`
            };

        } catch (error) {
            console.error('❌ Erreur acceptation quête:', error);
            return { text: '❌ Erreur lors de l\'acceptation de la quête.' };
        }
    }

    async handleAbandonQuestCommand({ player, message, dbManager }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `🚫 **ABANDONNER UNE QUÊTE**

Usage: /abandonner [numéro]

Exemple: /abandonner 1

📋 Utilisez /progression pour voir vos quêtes en cours.`
                };
            }

            return { text: "🚫 Fonctionnalité d'abandon de quête en développement." };

        } catch (error) {
            console.error('❌ Erreur abandon quête:', error);
            return { text: "❌ Erreur lors de l'abandon de la quête." };
        }
    }

    async handleQuestProgressCommand({ player, dbManager }) {
        try {
            const character = await dbManager.getCharacterByPlayer(player.id);
            if (!character) {
                return { text: "❌ Tu n'as pas encore de personnage !" };
            }

            return { text: "📊 Système de progression des quêtes en développement." };

        } catch (error) {
            console.error('❌ Erreur progression quête:', error);
            return { text: "❌ Erreur lors de l'affichage de la progression." };
        }
    }

    async handleSearchQuestCommand({ player, message, dbManager }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `🔍 **RECHERCHER UNE QUÊTE**

Usage: /rechercher_quete [mot-clé]

Exemple: /rechercher_quete dragon

📋 Recherchez parmi plus de 30,000 quêtes disponibles !`
                };
            }

            return { text: "🔍 Système de recherche de quête en développement." };

        } catch (error) {
            console.error('❌ Erreur recherche quête:', error);
            return { text: "❌ Erreur lors de la recherche de quête." };
        }
    }

    // ===========================================
    // MÉTHODES POUR LE SYSTÈME D'AURA
    // ===========================================

    /**
     * Affiche les informations d'aura du joueur
     */
    async handleAuraInfoCommand({ player, dbManager }) {
        try {
            const character = await dbManager.getCharacterByPlayer(player.id);
            if (!character) {
                return { text: "❌ Tu n'as pas encore de personnage !" };
            }

            if (!this.auraManager) {
                const AuraManager = require('../utils/AuraManager');
                this.auraManager = new AuraManager(dbManager, this.loadingBarManager);
            }

            const auraInfo = this.auraManager.formatAuraInfo(player.id, character.name);
            return { text: auraInfo };

        } catch (error) {
            console.error('❌ Erreur commande aura info:', error);
            return { text: "❌ Erreur lors de l'affichage des informations d'aura." };
        }
    }

    /**
     * Démarre l'apprentissage d'une aura
     */
    async handleLearnAuraCommand({ player, chatId, message, dbManager, sock }) {
        try {
            const args = message.split(' ').slice(1);
            if (args.length === 0) {
                return {
                    text: `🔮 **APPRENTISSAGE D'AURA** 🔮

📚 **Types d'aura disponibles :**
🔥 fire - Aura de Flamme
🌊 water - Aura Aquatique
🌍 earth - Aura Tellurique
💨 wind - Aura Éolienne
⚡ lightning - Aura Foudroyante
🌑 shadow - Aura Ténébreuse
✨ light - Aura Lumineuse

💡 **Usage :** \`/aura_apprendre [type]\`
**Exemple :** \`/aura_apprendre fire\`

⏰ **Durée :** 10 jours d'entraînement par aura
🎲 **20% de chance de maîtrise instantanée !**`
                };
            }

            const auraType = args[0].toLowerCase();
            if (!this.auraManager.auraTypes[auraType]) {
                return {
                    text: `❌ Type d'aura invalide : "${auraType}"

Types disponibles : fire, water, earth, wind, lightning, shadow, light`
                };
            }

            if (!this.auraManager.canStartTraining(player.id)) {
                const activeTraining = this.auraManager.getPlayerTraining(player.id);
                return {
                    text: `⚠️ Vous avez déjà un entraînement en cours !

${activeTraining.techniqueName} (${Math.floor(activeTraining.progress)}%)`
                };
            }

            // 20% de chance de maîtrise instantanée
            const instantMasteryChance = Math.random();
            if (instantMasteryChance < 0.2) { // 20% de chance
                const instantResult = await this.auraManager.grantInstantMastery(player.id, auraType);
                return {
                    text: instantResult.message
                };
            }

            // Sinon, démarrer l'entraînement normal
            const result = await this.auraManager.startAuraTraining(
                player.id,
                auraType,
                this.auraManager.auraTypes[auraType].techniques[0]
            );

            return {
                text: result.message
            };

        } catch (error) {
            console.error('❌ Erreur apprentissage aura:', error);
            return {
                text: '❌ Erreur lors de l\'apprentissage d\'aura. Réessayez plus tard.'
            };
        }
    }

    async handleAuraSessionCommand({ player, chatId, message, dbManager, imageGenerator, sock }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !

Utilise /créer pour créer ton personnage.`
            };
        }

        const activeTraining = this.auraManager.getPlayerTraining(player.id);
        if (!activeTraining) {
            return {
                text: `❌ **AUCUN ENTRAÎNEMENT ACTIF**

Vous n'avez pas d'entraînement d'aura en cours.

Utilisez /aura_apprendre [type] pour commencer.`
            };
        }

        if (activeTraining.status === 'completed') {
            return {
                text: `✅ **ENTRAÎNEMENT TERMINÉ**

Votre entraînement est déjà complété !

Utilisez /aura_apprendre [type] pour un nouveau type d'aura.`
            };
        }

        // Vérifier si le joueur a déjà fait sa session aujourd'hui
        const lastSession = activeTraining.lastSessionAt || activeTraining.startTime;
        const now = new Date();
        const timeSinceLastSession = now.getTime() - new Date(lastSession).getTime();
        const hoursGap = timeSinceLastSession / (1000 * 60 * 60);

        if (hoursGap < 20) { // Au moins 20h entre les sessions
            const remainingHours = Math.ceil(20 - hoursGap);
            return {
                text: `⏰ **SESSION DÉJÀ EFFECTUÉE**

Vous devez attendre ${remainingHours}h avant votre prochaine session d'entraînement.`
            };
        }

        // Démarrer l'animation d'entraînement
        try {
            await this.auraManager.createAuraAnimation(
                player.id,
                activeTraining.auraType,
                activeTraining.techniqueName,
                sock,
                chatId
            );

            // Mettre à jour le progrès
            this.auraManager.updateTrainingProgress(activeTraining.id);
            activeTraining.lastSessionAt = now.toISOString();

            return { text: '' }; // Pas de réponse supplémentaire car l'animation gère tout
        } catch (error) {
            console.error('❌ Erreur session aura:', error);
            return {
                text: `❌ Erreur lors de la session d'entraînement. Réessayez.`
            };
        }
    }

    /**
     * Afficher les techniques d'aura disponibles
     */
    async handleAuraTechniquesCommand({ player, dbManager, imageGenerator }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !

Utilise /créer pour créer ton personnage.`
            };
        }

        const playerAuras = this.auraManager.getPlayerAuraLevel(player.id);

        if (Object.keys(playerAuras).length === 0) {
            return {
                text: `🌟 **AUCUNE TECHNIQUE D'AURA**

Vous n'avez pas encore appris de techniques d'aura.

Utilisez /aura_apprendre [type] pour commencer votre entraînement !`
            };
        }

        let techniquesText = `⚡ **TECHNIQUES D'AURA MAÎTRISÉES** ⚡

`;

        for (const [type, auraData] of Object.entries(playerAuras)) {
            const auraInfo = this.auraManager.auraTypes[type];
            techniquesText += `${auraInfo.emoji} **${auraInfo.name}** (Niveau ${auraData.level})
`;

            if (auraData.techniques.length > 0) {
                auraData.techniques.forEach(technique => {
                    techniquesText += `   ⚡ ${technique}
`;
                });
            } else {
                techniquesText += `   💭 Aucune technique maîtrisée
`;
            }
            techniquesText += `
`;
        }

        techniquesText += `💡 **Utilisez /aura_cast [technique] pour lancer une technique !**`;

        return { text: techniquesText };
    }

    /**
     * Lancer une technique d'aura
     */
    async handleCastAuraCommand({ player, chatId, message, dbManager, imageGenerator }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !

Utilise /créer pour créer ton personnage.`
            };
        }

        const parts = message.split(' ');
        if (parts.length < 2) {
            return {
                text: `🔮 **LANCEMENT DE TECHNIQUE D'AURA** 🔮

Usage: /aura_cast [nom_technique]

Utilisez /aura_techniques pour voir vos techniques disponibles.`
            };
        }

        const techniqueName = parts.slice(1).join(' ');

        // Chercher la technique dans toutes les auras du joueur
        const playerAuras = this.auraManager.getPlayerAuraLevel(player.id);
        let foundAura = null;

        for (const [type, auraData] of Object.entries(playerAuras)) {
            if (auraData.techniques.some(tech => tech.toLowerCase().includes(techniqueName.toLowerCase()))) {
                foundAura = type;
                break;
            }
        }

        if (!foundAura) {
            return {
                text: `❌ **TECHNIQUE NON MAÎTRISÉE**

Vous ne maîtrisez pas la technique "${techniqueName}".

Utilisez /aura_techniques pour voir vos techniques disponibles.`
            };
        }

        try {
            const result = await this.auraManager.castAuraTechnique(player.id, foundAura, techniqueName);
            return {
                text: result.message
            };
        } catch (error) {
            console.error('❌ Erreur lancement technique:', error);
            return {
                text: `❌ Erreur lors du lancement de la technique. Réessayez.`
            };
        }
    }

    /**
     * Méditation pour récupérer l'énergie spirituelle
     */
    async handleMeditateCommand({ player, chatId, dbManager, sock }) {
        const character = await this.dbManager.getCharacterByPlayer(player.id);
        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !

Utilise /créer pour créer ton personnage.`
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
            await this.auraManager.startAuraRegeneration(player.id, sock, chatId);
            return { text: '' }; // La régénération gère l'affichage
        } catch (error) {
            console.error('❌ Erreur méditation:', error);
            return {
                text: `❌ Erreur lors de la méditation. Réessayez.`
            };
        }
    }

    async handleRegenerateAuraCommand({ player, chatId, dbManager, sock }) {
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