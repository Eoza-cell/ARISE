const GeminiClient = require('../gemini/GeminiClient');
const OpenAIClient = require('../ai/OpenAIClient');
const OllamaClient = require('../ai/OllamaClient');
const GroqClient = require('../groq/GroqClient');
const CharacterCustomizationManager = require('../utils/CharacterCustomizationManager');
const ImmersiveNarrationManager = require('../utils/ImmersiveNarrationManager');
const path = require('path'); // Importer le module path pour gérer les chemins de fichiers

class GameEngine {
    constructor({ dbManager, imageGenerator, playhtClient, cambAIClient, puterClient, asset3DManager, blenderClient, runwayClient }) {
        this.dbManager = dbManager;
        this.imageGenerator = imageGenerator;
        this.playhtClient = playhtClient;
        this.cambAIClient = cambAIClient;
        this.puterClient = puterClient;
        this.asset3DManager = asset3DManager;
        this.blenderClient = blenderClient;
        this.runwayClient = runwayClient;

        this.openAIClient = new OpenAIClient(this.dbManager);
        this.ollamaClient = new OllamaClient();
        this.groqClient = new GroqClient();
        this.geminiClient = new GeminiClient();

        // Système de narration immersive avec chronologie réaliste
        this.narrationManager = new ImmersiveNarrationManager(this.dbManager);

        // Sera initialisé dans setWhatsAppSocket une fois que sock est disponible
        this.characterCustomization = null;

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
            '/buttons': this.handleButtonsTestCommand.bind(this)
        };
    }

    async processPlayerMessage({ playerNumber, chatId, message, imageMessage, originalMessage, sock, dbManager, imageGenerator }) {
        try {
            // Initialiser le système de personnalisation si pas déjà fait
            if (!this.characterCustomization && sock) {
                this.characterCustomization = new CharacterCustomizationManager(dbManager, imageGenerator, sock);
            }

            // Récupération ou création du joueur
            let player = await dbManager.getPlayerByWhatsApp(playerNumber);
            if (!player) {
                // Nouveau joueur - créer avec nom temporaire
                const username = `Joueur_${playerNumber.slice(-4)}`;
                player = await dbManager.createPlayer(playerNumber, username);

                return {
                    text: `🎮 **Bienvenue dans FRICTION ULTIMATE !**\n\n` +
                          `Tu es maintenant enregistré en tant que : **${username}**\n\n` +
                          `🏰 Dans ce monde médiéval-technologique, chaque action compte et la moindre erreur peut être fatale.\n\n` +
                          `📱 **Commandes principales :**\n` +
                          `• /menu - Afficher le menu principal\n` +
                          `• /créer - Créer ton personnage\n` +
                          `• /aide - Voir toutes les commandes\n\n` +
                          `💀 **Attention :** Ce monde est impitoyable. Prépare-toi à l'aventure la plus dangereuse de ta vie !`,
                    image: await imageGenerator.generateMenuImage()
                };
            }

            // Mise à jour de l'activité du joueur
            await dbManager.updatePlayerActivity(player.id);

            // Gestion des images pour la création de personnage
            if (!message && imageMessage) {
                const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
                const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');
                const photoReceived = await dbManager.getTemporaryData(player.id, 'photo_received');

                // Si on est en mode création par description et qu'on attend une photo
                if (creationMode === 'description' && creationStarted && !photoReceived) {
                    console.log(`📸 Photo reçue pour création personnage de ${player.whatsappNumber}`);
                    return await this.handlePhotoReceived({ player, imageMessage, originalMessage: arguments[0].originalMessage, sock, dbManager, imageGenerator });
                } else {
                    return {
                        text: "🖼️ J'ai reçu votre image ! Cependant, je ne peux traiter que les commandes textuelles.\n\n" +
                              "💬 Utilisez `/menu` pour voir les commandes disponibles."
                    };
                }
            }

            // Traitement des commandes - gérer les cas où message est null (ex: autres cas)
            if (!message) {
                return {
                    text: "💬 Utilisez `/menu` pour voir les commandes disponibles."
                };
            }

            const command = message.toLowerCase().trim();
            let response = null;

            // Vérifier d'abord si le joueur est en cours de personnalisation
            if (this.characterCustomization && this.characterCustomization.activeCustomizations.has(playerNumber)) {
                const handled = await this.characterCustomization.handleCustomizationResponse(playerNumber, chatId, message);
                if (handled) {
                    return { text: '' }; // Le système de personnalisation gère déjà l'envoi des messages
                }
            }

            // Gérer la création avec photo d'abord
            if (imageMessage) {
                const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
                const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');

                if (creationMode === 'description' && creationStarted) {
                    return await this.handlePhotoReceived({ player, imageMessage, originalMessage, sock, dbManager, imageGenerator });
                }
            }

            // Vérifier si le joueur est en cours de création par description (après photo)
            const creationMode = await dbManager.getTemporaryData(player.id, 'creation_mode');
            const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
            const photoReceived = await dbManager.getTemporaryData(player.id, 'photo_received');

            if (creationMode === 'description' && creationStarted && photoReceived && message && !this.commandHandlers[command]) {
                return await this.handleDescriptionCreation({ player, description: message, dbManager, imageGenerator });
            }

            // Gestion de la suppression de personnage
            if (message && message.toUpperCase().trim() === 'SUPPRIMER_PERSONNAGE') {
                return await this.handleDeleteCharacter({ player, dbManager, imageGenerator });
            }

            if (this.commandHandlers[command]) {
                response = await this.commandHandlers[command]({ player, chatId, message, dbManager, imageGenerator, sock });
            }

            const playerId = player.id;
            const normalizedMessage = message.toLowerCase().trim();


            // Si aucune commande reconnue, traiter comme action de jeu
            if (!response) {
                // Récupérer le personnage du joueur pour les actions de jeu
                const character = await dbManager.getCharacterByPlayer(player.id);

                if (!character) {
                    return {
                        text: `❌ Tu n'as pas encore de personnage !\n\n` +
                              `Utilise /créer pour créer ton personnage, puis /jouer pour entrer en mode jeu.`
                    };
                }

                // Détecter si c'est un dialogue avec un PNJ
                const dialogueKeywords = ['parle', 'dis', 'demande', 'salue', 'bonjour', 'bonsoir', 'hey', '"'];
                const isDialogue = dialogueKeywords.some(keyword =>
                    message.toLowerCase().includes(keyword)
                ) || message.includes('"') || message.toLowerCase().startsWith('je dis');

                if (isDialogue) {
                    return await this.processDialogueAction({ player, character, message, dbManager, imageGenerator });
                }

                // Traitement des actions de jeu avec système immersif et chronologie réaliste
                return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
            }

            return response;

        } catch (error) {
            console.error('❌ Erreur dans le moteur de jeu:', error);
            return {
                text: "❌ Une erreur s'est produite dans le moteur de jeu. Veuillez réessayer."
            };
        }
    }

    async handleMenuCommand({ player, dbManager, imageGenerator }) {
        // Désactiver le mode jeu quand on accède au menu
        await dbManager.clearTemporaryData(player.id, 'game_mode');

        const character = await dbManager.getCharacterByPlayer(player.id);

        let menuText = `🎮 **FRICTION ULTIMATE - Menu Principal**\n\n`;

        if (character) {
            menuText += `👤 **Personnage :** ${character.name}\n` +
                       `🏰 **Royaume :** ${character.kingdom}\n` +
                       `⚔️ **Ordre :** ${character.order || 'Aucun'}\n` +
                       `📊 **Niveau :** ${character.level} (${character.powerLevel})\n\n`;
        }

        menuText += `📱 **Commandes disponibles :**\n` +
                   `• /jouer - 🎮 ENTRER DANS LE JEU\n` +
                   `• /créer - Créer ton personnage\n` +
                   `• /modifier - Modifier ton personnage\n` +
                   `• /fiche - Voir ta fiche de personnage\n` +
                   `• /royaumes - Explorer les 12 royaumes\n` +
                   `• /ordres - Découvrir les 7 ordres\n` +
                   `• /combat - Système de combat\n` +
                   `• /inventaire - Gérer ton équipement\n` +
                   `• /carte - Carte du monde\n` +
                   `• /aide - Aide complète\n\n` +
                   `💀 **Le monde bouge en permanence. Chaque seconde compte !**`;

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
                text: `👤 Tu as déjà un personnage : **${existingCharacter.name}**\n\n` +
                      `🏰 Royaume : ${existingCharacter.kingdom}\n` +
                      `⚔️ Ordre : ${existingCharacter.order || 'Aucun'}\n\n` +
                      `🎨 Pour créer un nouveau personnage,\n` +
                      `tu dois d'abord supprimer l'actuel.\n\n` +
                      `Écris "SUPPRIMER_PERSONNAGE" pour confirmer la suppression.`,
                image: await imageGenerator.generateCharacterImage(existingCharacter)
            };
        }

        // Démarrer le processus de création par description
        await dbManager.setTemporaryData(player.id, 'creation_started', true);
        await dbManager.setTemporaryData(player.id, 'creation_mode', 'description');

        return {
            text: `🎭 **CRÉATION DE PERSONNAGE IA** 🎭\n\n` +
                  `✨ Pour créer ton personnage idéal, l'IA a besoin de ton aide !\n\n` +
                  `📸 **ÉTAPE 1 - ENVOIE TA PHOTO**\n` +
                  `Envoie une photo de ton visage pour que l'IA Pollination puisse créer un personnage qui te ressemble !\n\n` +
                  `📝 **ÉTAPE 2 - DÉCRIS TON PERSONNAGE**\n` +
                  `Après ta photo, décris ton personnage idéal :\n` +
                  `• Classe/profession (guerrier, mage, assassin...)\n` +
                  `• Style vestimentaire et armure\n` +
                  `• Origine/royaume préféré\n` +
                  `• Personnalité et histoire\n\n` +
                  `💡 **Exemple de description :**\n` +
                  `"Un guerrier noble avec une armure dorée, venant des plaines d'honneur d'AEGYRIA. Il est courageux et loyal."\n\n` +
                  `📸 **Commence par envoyer ta photo maintenant !**`,
            image: await imageGenerator.generateMenuImage()
        };
    }

    async startCharacterCreation({ player, dbManager, imageGenerator }) {
        // Marquer le début de la création pour sécuriser le processus
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        // Processus simplifié en 3 étapes courtes - ÉTAPE 1 seulement
        let creationText = `⚔️ **CRÉATION DE PERSONNAGE**\n\n` +
                          `🎯 **Étape 1/3 - Choix du sexe**\n\n` +
                          `👤 Choisis le sexe de ton personnage :\n\n` +
                          `• Tape **HOMME** ou **H** pour masculin\n` +
                          `• Tape **FEMME** ou **F** pour féminin\n\n` +
                          `💀 **Attention :** Dans ce monde impitoyable, chaque choix compte !\n\n` +
                          `⚡ **Processus rapide en 3 étapes :**\n` +
                          `1. 👤 Sexe (maintenant)\n` +
                          `2. 🏰 Royaume (prochaine étape)\n` +
                          `3. 📝 Nom de personnage\n\n` +
                          `🚀 **Tape HOMME, H, FEMME ou F pour continuer !**`;

        return {
            text: creationText,
            image: await imageGenerator.generateMenuImage()
        };
    }

    async handlePhotoReceived({ player, imageMessage, originalMessage, sock, dbManager, imageGenerator }) {
        try {
            console.log(`📸 Photo reçue pour création personnage de ${player.whatsappNumber}`);

            // Télécharger et sauvegarder la photo
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const imageBuffer = await downloadMediaMessage(originalMessage, 'buffer', {}, {
                logger: require('pino')({ level: 'silent' })
            });

            if (imageBuffer && imageBuffer.length > 0) {
                // Sauvegarder l'image temporairement
                await imageGenerator.saveCustomCharacterImage(player.id, imageBuffer);

                // Marquer que la photo a été reçue
                await dbManager.setTemporaryData(player.id, 'photo_received', true);

                console.log(`✅ Photo sauvegardée pour ${player.whatsappNumber}`);

                return {
                    text: `📸 **PHOTO REÇUE AVEC SUCCÈS !** 📸\n\n` +
                          `✅ Ton visage a été enregistré pour la création du personnage.\n\n` +
                          `📝 **MAINTENANT, DÉCRIS TON PERSONNAGE :**\n\n` +
                          `Décris le personnage que tu veux incarner :\n\n` +
                          `💡 **Exemple :**\n` +
                          `"Un guerrier noble d'AEGYRIA avec une armure dorée et une épée lumineuse. Il est courageux, loyal et protège les innocents. Il vient des plaines d'honneur et rêve de devenir un paladin légendaire."\n\n` +
                          `🎭 **Inclus :**\n` +
                          `• Classe/profession\n` +
                          `• Style d'armure/vêtements\n` +
                          `• Royaume d'origine\n` +
                          `• Personnalité\n` +
                          `• Histoire/objectifs\n\n` +
                          `🚀 **Écris ta description maintenant !**`
                };
            } else {
                return {
                    text: `❌ **Erreur de téléchargement de photo**\n\n` +
                          `La photo n'a pas pu être traitée.\n` +
                          `📸 Réessaie d'envoyer une photo claire de ton visage.`
                };
            }
        } catch (error) {
            console.error('❌ Erreur traitement photo:', error);
            return {
                text: `❌ **Erreur lors du traitement de la photo**\n\n` +
                      `Une erreur s'est produite. Réessaie d'envoyer ta photo.\n` +
                      `💡 Assure-toi que l'image est claire et bien éclairée.`
            };
        }
    }

    async handleDescriptionCreation({ player, description, dbManager, imageGenerator }) {
        try {
            console.log(`🎭 Création par IA pour ${player.whatsappNumber}: ${description}`);

            // Utiliser l'IA pour analyser la description et générer le personnage
            const characterDataFromAI = await this.generateCharacterFromDescription(description, player);

            // Créer le personnage dans la base de données
            const newCharacter = await dbManager.createCharacter({
                ...characterDataFromAI,
                appearance: description // Sauvegarder la description originale du joueur
            });

            // Nettoyer les données temporaires
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            // Générer l'image du personnage
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
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !** 🎉\n\n` +
                      `👤 **Nom :** ${newCharacter.name}\n` +
                      `⚧️ **Sexe :** ${newCharacter.gender === 'male' ? 'Homme' : 'Femme'}\n` +
                      `🏰 **Royaume :** ${newCharacter.kingdom}\n` +
                      `📊 **Niveau :** ${newCharacter.level} (${newCharacter.powerLevel})\n` +
                      `📍 **Localisation :** ${newCharacter.currentLocation}\n` +
                      `💰 **Pièces :** ${newCharacter.coins}\n\n` +
                      `✨ **Description générée par l'IA :**\n` +
                      `"${description}"\n\n` +
                      `🎮 **Tapez /jouer pour commencer l'aventure !**\n` +
                      `📋 **Tapez /fiche pour voir tous les détails**`,
                image: characterImage
            };

        } catch (error) {
            console.error('❌ Erreur création personnage par IA:', error);

            // Nettoyer en cas d'erreur
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            return {
                text: `❌ **Erreur lors de la création**\n\n` +
                      `Une erreur s'est produite lors de l'analyse de votre description.\n` +
                      `Veuillez réessayer avec /créer.\n\n` +
                      `💡 **Conseil :** Soyez plus précis dans votre description.`
            };
        }
    }

    async generateCharacterFromDescription(description, player) {
        try {
            // Utiliser Groq pour analyser la description et extraire les informations
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

                // Extraire le JSON de la réponse
                let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('Pas de JSON trouvé dans la réponse IA');
                }

                const characterInfo = JSON.parse(jsonMatch[0]);
                console.log('📊 Données personnage extraites:', characterInfo);

                // Générer les données complètes du personnage
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

            // Fallback - création de personnage de base
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
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !\n\n` +
                      `Utilise la commande /créer pour en créer un.`
            };
        }

        const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
        const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

        const sheetText = `👤 **FICHE DE PERSONNAGE**\n\n` +
                         `**Nom :** ${character.name}\n` +
                         `**Sexe :** ${character.gender === 'male' ? 'Homme' : 'Femme'}\n` +
                         `**Royaume :** ${character.kingdom}\n` +
                         `**Ordre :** ${character.order || 'Aucun'}\n\n` +
                         `📊 **Statistiques :**\n` +
                         `• Niveau : ${character.level}\n` +
                         `• Expérience : ${character.experience}\n` +
                         `• Niveau de puissance : ${character.powerLevel}\n` +
                         `• Niveau de friction : ${character.frictionLevel}\n\n` +
                         `❤️ **Barres de vie :** ${lifeBar}\n` +
                         `⚡ **Énergie :** ${energyBar}\n\n` +
                         `📍 **Position :** ${character.currentLocation}\n` +
                         `💰 **Pièces :** ${character.coins}\n\n` +
                         `⚔️ **Équipement actuel :**\n` +
                         `${this.formatEquipment(character.equipment)}\n\n` +
                         `🎯 **Techniques apprises :**\n` +
                         `${this.formatTechniques(character.learnedTechniques)}`;

        // Générer l'image du personnage de façon sécurisée
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
        // Vérifier si une création est en cours
        const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
        const savedCharacterName = await dbManager.getTemporaryData(player.id, 'creation_name');

        // Gestion des images pour la création de personnage
        if (imageMessage && creationStarted && savedCharacterName) {
            try {
                console.log('📸 Réception d\'une image pour la création de personnage...');
                console.log('🔄 Tentative de téléchargement de l\'image...');

                // Télécharger l'image
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

        // Si on a une image mais qu'on n'est pas en création, ignorer
        if (imageMessage && !message) {
            return {
                text: `📸 Image reçue, mais aucune action prévue pour les images pour le moment.`
            };
        }

        // D'abord traiter les actions de création de personnage (avant de vérifier si personnage existe)

        // Traitement des actions de création de personnage en cours (seulement si création initiée)
        const input = message.toUpperCase().trim();
        if (creationStarted && (input === 'HOMME' || input === 'H' || input === 'FEMME' || input === 'F' || input === '1' || input === '2')) {
            return await this.handleGenderSelection({ player, message, dbManager, imageGenerator });
        }

        // Gestion des numéros de royaumes (1-12) - seulement si le genre est déjà sélectionné
        const tempGender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomNumber = parseInt(message);
        if (creationStarted && tempGender && kingdomNumber >= 1 && kingdomNumber <= 12) {
            return await this.handleKingdomSelection({ player, kingdomNumber, dbManager, imageGenerator });
        }

        // Gestion du nom de personnage (si en cours de création)
        const tempKingdom = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const existingName = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (creationStarted && tempGender && tempKingdom && !existingName) {
            // Le joueur est en train de donner le nom de son personnage
            return await this.handleCharacterNameInput({ player, name: message, dbManager, imageGenerator });
        }

        // Gestion de la finalisation de création (après nom, en attente d'image ou "SANS_PHOTO")
        if (creationStarted && tempGender && tempKingdom && existingName) {
            if (message.toUpperCase() === 'SANS_PHOTO') {
                return await this.finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage: false });
            }
            // Si c'est un autre message texte, redemander l'image
            return {
                text: `📸 **En attente de ta photo de visage...**\n\n` +
                      `🖼️ Envoie une photo de ton visage ou écris "SANS_PHOTO" pour continuer sans photo personnalisée.`
            };
        }

        // Gestion de la modification de personnage
        const modificationStarted = await dbManager.getTemporaryData(player.id, 'modification_started');
        if (modificationStarted) {
            return await this.handleModificationDescription({ player, description: message, dbManager, imageGenerator });
        }

        // Vérifier si le joueur est en mode jeu
        const isInGameMode = await dbManager.getTemporaryData(player.id, 'game_mode');

        if (!isInGameMode) {
            return {
                text: `💬 **Message libre détecté**\n\n` +
                      `Salut ! Pour jouer à Friction Ultimate, utilise :\n` +
                      `🎮 **/jouer** - Entrer en mode jeu\n` +
                      `📋 **/menu** - Voir toutes les options\n\n` +
                      `En mode libre, je ne traite pas les actions de jeu.`
            };
        }

        // Maintenant vérifier si le personnage existe pour les actions de jeu normales
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !\n\n` +
                      `Utilise /menu pour sortir du mode jeu.`
            };
        }

        // Détecter si c'est un dialogue avec un PNJ
        // Détecter si le joueur utilise des guillemets pour parler à un PNJ
        const hasQuotes = message.includes('"') || message.includes('«') || message.includes('»');
        const isDialogue = hasQuotes ||
                          message.toLowerCase().includes('parler') ||
                          message.toLowerCase().includes('dire') ||
                          message.toLowerCase().includes('demander');

        if (isDialogue) {
            return await this.processDialogueAction({ player, character, message, dbManager, imageGenerator });
        }

        // Traitement des actions de jeu normales avec IA Gemini
        return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
    }

    async processGameActionWithAI({ player, character, message, dbManager, imageGenerator }) {
        try {
            console.log(`🎮 Action de jeu: ${character.name} - "${message}"`);

            // Session ID unique pour la continuité narrative
            const sessionId = `game_${player.id}`;

            // Récupérer l'image personnalisée du personnage si elle existe
            let characterImageDescription = '';
            try {
                const customImage = await imageGenerator.getCustomCharacterImage(character.id);
                if (customImage) {
                    console.log('📸 Utilisation de l\'image personnalisée pour la narration');
                    characterImageDescription = `Le personnage ${character.name} a l'apparence physique décrite dans son image personnalisée. `;

                    // Si le personnage a une description d'apparence, l'utiliser aussi
                    if (character.appearance && character.appearance.trim().length > 0) {
                        characterImageDescription += `Description physique détaillée: ${character.appearance}. `;
                    }
                }
            } catch (imageError) {
                console.log('⚠️ Pas d\'image personnalisée trouvée');
            }

            // Construire le contexte enrichi pour l'IA
            const context = {
                character: character,
                action: message,
                location: character.currentLocation,
                characterImage: characterImageDescription,
                gameState: {
                    time: new Date().toISOString(),
                    weather: 'Variable selon la région',
                    playerLevel: character.level,
                    powerLevel: character.powerLevel
                }
            };

            // Générer la narration avec Groq (ultra-rapide) mais plus longue
            let narration;
            try {
                console.log('🚀 Génération narration avec Groq (ultra-rapide)...');
                const prompt = this.buildGameActionPrompt(context, sessionId);
                narration = await this.groqClient.generateNarration(prompt, 300); // Augmenté de 150 à 300 tokens
                console.log('✅ Narration générée avec Groq');
            } catch (groqError) {
                console.log('⚠️ Erreur Groq, fallback vers Gemini:', groqError.message);
                narration = await this.geminiClient.generateNarration(context, sessionId);
            }

            // ANALYSE DES ACTIONS DE COMBAT ET DES CONSÉQUENCES POTENTIELLES
            // Ici, nous allons simuler une analyse plus poussée pour les combats difficiles et fluides.
            // Nous allons utiliser OpenAI pour analyser l'intention du joueur et estimer les risques/récompenses.

            // Analyse de l'action du joueur avec OpenAI
            const actionAnalysis = await this.openAIClient.analyzePlayerAction(message, {
                character: character,
                location: character.currentLocation,
                kingdom: character.kingdom,
                narrationContext: narration // Utiliser la narration générée pour un contexte plus riche
            }, sessionId);

            // CLAMPING SERVER-SIDE STRICT - Sécuriser toutes les valeurs de l'IA pour la fluidité et la difficulté
            const energyCost = Math.max(0, Math.min(character.currentEnergy, actionAnalysis.energyCost || 10));
            const staminaRecovery = Math.max(-15, Math.min(3, actionAnalysis.staminaRecovery || 0)); // Permet aussi de réduire la stamina
            const equipmentStress = Math.max(-3, Math.min(0, actionAnalysis.equipmentStress || 0));

            // Valider combatAdvantage dans une liste sécurisée pour éviter les injections
            const validCombatAdvantages = ['critical_hit', 'normal_hit', 'glancing_blow', 'miss', 'counter_attacked'];
            actionAnalysis.combatAdvantage = validCombatAdvantages.includes(actionAnalysis.combatAdvantage)
                ? actionAnalysis.combatAdvantage
                : 'miss'; // Défaut à 'miss' si la valeur n'est pas valide

            // Appliquer le système de combat Dark Souls strict pour la gestion de l'énergie et des dégâts
            character.currentEnergy = Math.max(0, character.currentEnergy - energyCost);

            // Système de dégâts ÉQUILIBRÉ et difficile
            let damageText = '';
            let shouldTakeDamage = false;

            // Les dégâts ne sont appliqués que lors d'actions de combat directes ou de risques extrêmes
            const realCombatKeywords = ['attaque', 'combat', 'frappe', 'tue', 'massacre', 'poignarde', 'tranche', 'décapite', 'affrontement', 'duel'];
            const isRealCombat = realCombatKeywords.some(keyword =>
                message.toLowerCase().includes(keyword)
            );

            // Logique de dégâts : plus complexe et moins prévisible
            if (isRealCombat) {
                // Récompenser la précision, pénaliser l'imprudence
                if (actionAnalysis.combatAdvantage === 'critical_hit') {
                    // Coup critique réussi, pas de dégâts subis par le joueur
                } else if (actionAnalysis.combatAdvantage === 'counter_attacked') {
                    shouldTakeDamage = true; // L'ennemi a contré, le joueur subit des dégâts
                } else if (actionAnalysis.combatAdvantage === 'glancing_blow') {
                    // Coup faible, peu d'impact, pas de dégâts importants
                } else if (actionAnalysis.combatAdvantage === 'miss') {
                    // Échec de l'attaque, possibilité de contre-attaque si l'ennemi est plus rapide
                    if (Math.random() < 0.2) { // 20% de chance de contre-attaque sur un échec
                        shouldTakeDamage = true;
                    }
                }
            }
            // Gestion des dégâts suite à une action imprudente (même hors combat direct)
            if (actionAnalysis.riskLevel === 'extreme' && Math.random() < 0.4) { // Augmentation de la chance de dégâts sur risque extrême
                shouldTakeDamage = true;
            }

            // Pas de dégâts automatiques par épuisement - juste efficacité réduite et vulnérabilité accrue
            if (character.currentEnergy <= 0) {
                damageText = `\n⚡ **ÉPUISEMENT** - Vous êtes trop fatigué pour agir efficacement. Votre garde est ouverte.`;
                // Augmente la probabilité de subir des dégâts si l'énergie est nulle
                if (Math.random() < 0.5) {
                    shouldTakeDamage = true;
                }
            }

            // Application des dégâts si nécessaire
            if (shouldTakeDamage && actionAnalysis.potentialDamage > 0) {
                // Dégâts plus réalistes et potentiellement plus élevés
                const baseDamage = Math.max(1, Math.min(12, actionAnalysis.potentialDamage || 3)); // Augmentation du potentiel de dégâts max
                const damage = Math.min(baseDamage, character.currentLife);
                character.currentLife = Math.max(0, character.currentLife - damage);
                damageText = `\n💀 **DÉGÂTS SUBIS :** -${damage} PV (action risquée / parade manquée)`;

                console.log(`⚔️ Dégâts appliqués: ${damage} PV (action: ${message}, situation: ${actionAnalysis.combatAdvantage}, risque: ${actionAnalysis.riskLevel})`);
            }

            // Récupération de stamina (gérée par staminaRecovery clampé)
            if (staminaRecovery !== 0) {
                character.currentEnergy = Math.min(character.maxEnergy, Math.max(0, character.currentEnergy + staminaRecovery));
            }

            // Usure d'équipement (gérée par equipmentStress clampé)
            let equipmentWarning = '';
            if (equipmentStress < 0) {
                equipmentWarning = `\n⚔️ **USURE ÉQUIPEMENT :** Votre équipement montre des signes de fatigue (${Math.abs(equipmentStress)} points d'usure).`;
            }

            // Vérifier si le personnage est mort (gestion Dark Souls)
            let deathText = '';
            let isAlive = true;
            if (character.currentLife <= 0) {
                isAlive = false;

                // Calculer les pertes AVANT modification
                const coinsBefore = character.coins;
                const coinsLost = Math.floor(coinsBefore * 0.15); // Augmentation de la perte de pièces à 15%

                // Appliquer les pénalités de mort plus strictes
                character.currentLife = Math.ceil(character.maxLife * 0.25); // Respawn avec 25% de vie
                character.currentEnergy = Math.floor(character.maxEnergy * 0.4); // 40% d'énergie au respawn
                character.coins = Math.max(0, coinsBefore - coinsLost); // Réduction correcte des pièces
                character.currentLocation = 'Lieu de Respawn - Sanctuaire des Âmes Perdues'; // Nouveau lieu de respawn

                deathText = `\n💀 **MORT** - Votre voyage a pris fin dans cet endroit sinistre...\n` +
                           `🕊️ **RESPAWN** - Votre esprit fragmenté trouve refuge au Sanctuaire des Âmes Perdues.\n` +
                           `💰 **PERTE DE MÉMOIRE :** ${coinsLost} pièces d'or perdues dans le néant.\n` +
                           `❤️ **RENNAISSANCE :** Vous renaissez avec ${character.currentLife} PV et une nouvelle détermination.`;
            }

            // Sauvegarder les changements de l'état du personnage
            await dbManager.updateCharacter(character.id, {
                currentEnergy: character.currentEnergy,
                currentLife: character.currentLife,
                coins: character.coins,
                currentLocation: character.currentLocation
            });

            // Préparation des indicateurs visuels pour le retour du joueur
            const riskEmoji = {
                'low': '🟢',
                'medium': '🟡',
                'high': '🟠',
                'extreme': '🔴'
            }[actionAnalysis.riskLevel] || '⚪';

            // Générer les barres de vie et d'énergie comme dans Dark Souls pour une meilleure lisibilité
            const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
            const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

            // Indicateur d'avantage de combat pour un retour visuel clair
            const combatEmoji = {
                'critical_hit': '🎯',
                'normal_hit': '⚔️',
                'glancing_blow': '🛡️',
                'miss': '❌',
                'counter_attacked': '💀'
            }[actionAnalysis.combatAdvantage] || '⚪';

            // Messages d'alerte pour détection et conséquences spécifiques
            let detectionWarning = '';
            if (actionAnalysis.detectionRisk) {
                detectionWarning = `\n👁️ **DÉTECTION** - Vos mouvements ont attiré l'attention ! Vos actions futures pourraient être observées.`;
            }

            let consequencesText = '';
            if (actionAnalysis.consequences && actionAnalysis.consequences.length > 0) {
                const mainConsequence = actionAnalysis.consequences[0];
                if (mainConsequence && !mainConsequence.includes('Erreur')) { // Ignorer les erreurs de l'IA ici
                    consequencesText = `\n⚠️ **CONSÉQUENCES IMMÉDIATES :** ${mainConsequence}`;
                }
            }

            // Indicateur de précision de l'action du joueur
            const precisionEmoji = {
                'high': '🎯',
                'medium': '⚪',
                'low': '❌'
            }[actionAnalysis.precision] || '❓';

            // Affichage du feedback sur la gestion de la stamina
            const staminaText = staminaRecovery !== 0
                ? `\n⚡ **GESTION ENDURANCE :** ${staminaRecovery > 0 ? '+' : ''}${staminaRecovery} point(s) d'énergie`
                : '';

            // Feedback complet avec toutes les métriques Dark Souls pour une immersion maximale
            const responseText = `🎮 **${character.name}** - *${character.currentLocation}*\n\n` +
                               `📖 **Narration :** ${narration}\n\n` +
                               `❤️ **Vie :** ${lifeBar}${damageText}${deathText}\n` +
                               `⚡ **Énergie :** ${energyBar} (-${energyCost} utilisé)${staminaText}\n` +
                               `💰 **Argent :** ${character.coins} pièces d'or\n\n` +
                               `${precisionEmoji} **Précision de l'action :** ${actionAnalysis.precision.toUpperCase()}\n` +
                               `${riskEmoji} **Niveau de risque global :** ${actionAnalysis.riskLevel.toUpperCase()}\n` +
                               `🎯 **Type d'action IA :** ${actionAnalysis.actionType}\n` +
                               `${combatEmoji} **Résultat du combat :** ${actionAnalysis.combatAdvantage?.replace('_', ' ') || 'N/A'}` +
                               `${equipmentWarning}${detectionWarning}${consequencesText}\n\n` +
                               `💭 ${isAlive ? '*Que décidez-vous de faire ensuite dans ce monde hostile ?*' : '*Vous vous relevez, marqué par l\'épreuve. Que faites-vous ?*'}`;

            // Essayer de générer l'image et l'audio pour enrichir l'expérience, mais sans bloquer la réponse principale
            let actionImage = null;
            let actionAudio = null;
            // let actionVideo = null; // La génération vidéo est mise en pause pour l'instant
            try {
                // Générer une image représentant l'action avec potentiellement le personnage
                const mediaResult = await imageGenerator.generateCharacterActionImageWithVoice(character, message, narration);
                actionImage = mediaResult.image;
                actionAudio = mediaResult.audio;

                // La génération vidéo est complexe et peut ralentir, on la laisse désactivée pour l'instant
                // const actionImageGenerator = require('../utils/ImageGenerator');
                // const imagePath = path.join(__dirname, '..', 'temp', `action_temp_${Date.now()}.png`);
                // if (actionImage && imagePath) {
                //     const fs = require('fs').promises;
                //     await fs.writeFile(imagePath, actionImage);
                // }
                // actionVideo = await imageGenerator.generateActionVideo(character, message, narration, imagePath);
                // if (imagePath) {
                //     const fs = require('fs').promises;
                //     await fs.unlink(imagePath);
                // }
            } catch (mediaError) {
                console.error('❌ Erreur génération média pour l\'action:', mediaError.message);
            }

            return {
                text: responseText,
                image: actionImage,
                audio: actionAudio,
                // video: actionVideo // Inclure la vidéo si elle est générée
            };

        } catch (error) {
            console.error('❌ Erreur fatale lors du traitement IA de l\'action de jeu:', error);

            // En cas d'erreur majeure, appliquer une pénalité minimale pour la survie du joueur
            const energyCost = 10;
            character.currentEnergy = Math.max(0, character.currentEnergy - energyCost);

            await dbManager.updateCharacter(character.id, {
                currentEnergy: character.currentEnergy
            });

            const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
            const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

            return {
                text: `🎮 **${character.name}** - *${character.currentLocation}*\n\n` +
                      `📖 **Action :** "${message}"\n\n` +
                      `❤️ **Vie :** ${lifeBar}\n` +
                      `⚡ **Énergie :** ${energyBar} (-${energyCost} utilisé)\n` +
                      `💰 **Argent :** ${character.coins} pièces d'or\n\n` +
                      `⚠️ **ERREUR SYSTÈME** - Le monde de Friction est instable. Votre action n'a pas pu être entièrement interprétée.\n\n` +
                      `💭 *Le danger rôde toujours. Soyez prudent.*`
            };
        }
    }

    // Méthodes utilitaires
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
            text: `📱 **AIDE - FRICTION ULTIMATE**\n\n` +
                  `🎮 **Commandes de base :**\n` +
                  `• /menu - Menu principal\n` +
                  `• /créer - Créer un personnage\n` +
                  `• /modifier - Modifier l'apparence de ton personnage\n` +
                  `• /fiche - Fiche de personnage\n\n` +
                  `🌍 **Exploration :**\n` +
                  `• /royaumes - Les 12 royaumes\n` +
                  `• /ordres - Les 7 ordres\n` +
                  `• /carte - Carte du monde\n\n` +
                  `⚔️ **Combat :**\n` +
                  `• /combat - Système de combat\n` +
                  `• /inventaire - Gestion équipement\n\n` +
                  `💀 **Le monde de Friction est impitoyable !**\n` +
                  `Chaque action doit être précise et réfléchie.`,
            image: await imageGenerator.generateHelpImage()
        };
    }

    async handleKingdomsCommand({ dbManager, imageGenerator }) {
        const kingdoms = await dbManager.getAllKingdoms();

        let kingdomsText = `🏰 **LES 12 ROYAUMES DE FRICTION ULTIMATE**\n\n`;

        kingdoms.forEach((kingdom, index) => {
            kingdomsText += `**${index + 1}. ${kingdom.name} (${kingdom.id})**\n` +
                           `${kingdom.description}\n` +
                           `🌍 **Géographie :** ${kingdom.geography}\n` +
                           `🎭 **Culture :** ${kingdom.culture}\n` +
                           `⚔️ **Spécialités :** ${kingdom.specialties.join(', ')}\n` +
                           `✨ **Particularités :** ${kingdom.particularities}\n\n`;
        });

        // Générer une image des royaumes avec les fonctions disponibles
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
            ordersText += `**${index + 1}. ${order.name}**\n` +
                         `${order.description}\n` +
                         `🏰 **Localisation :** ${order.location}\n` +
                         `⚔️ **Spécialités :** ${order.specialties.join(', ')}\n\n`;
        });

        return {
            text: ordersText,
            image: await imageGenerator.generateOrdersOverview()
        };
    }

    async handleButtonsTestCommand({ player, chatId, dbManager, sock }) {
        try {
            // Vérifier qu'on a accès au socket
            if (!sock || !sock.buttonManager) {
                return {
                    text: `🔘 **DÉMONSTRATION BOUTONS INTERACTIFS**\n\n` +
                          `⚠️ Système de boutons non initialisé.\n\n` +
                          `Les boutons simulés avec des sondages WhatsApp permettent de créer des interfaces interactives sans API officielle !\n\n` +
                          `🎮 Chaque sondage = un bouton\n` +
                          `📊 Cliquer sur le sondage = activer l'action\n\n` +
                          `Cette fonctionnalité sera bientôt disponible !`
                };
            }

            // Obtenir le personnage pour personnaliser l'affichage
            const character = await dbManager.getCharacterByPlayer(player.id);

            // Utiliser le buttonManager depuis le socket principal
            const buttonManager = sock.buttonManager;

            // Envoyer un message d'introduction
            await sock.sendMessage(chatId, {
                text: `🔘 **DÉMONSTRATION BOUTONS INTERACTIFS**\n\n` +
                      `🎮 Voici comment fonctionne le système de boutons simulés avec des sondages WhatsApp !\n\n` +
                      `✨ Chaque "bouton" est en fait un sondage avec une seule option\n` +
                      `📊 Cliquer dessus équivaut à appuyer sur un bouton\n\n` +
                      `**Menu de test :**`
            });

            // Attendre un peu puis envoyer les boutons
            setTimeout(async () => {
                await buttonManager.sendMainGameMenu(chatId, character);

                // Après 2 secondes, envoyer un menu d'actions
                setTimeout(async () => {
                    await buttonManager.sendActionMenu(chatId);

                    // Après 2 secondes, envoyer un menu de confirmation
                    setTimeout(async () => {
                        await buttonManager.sendConfirmationMenu(chatId, "Voulez-vous continuer le test ?");
                    }, 2000);
                }, 2000);
            }, 1000);

            return {
                text: '', // Le texte est déjà envoyé via sock.sendMessage
                skipResponse: true // Indiquer qu'on gère l'envoi nous-mêmes
            };

        } catch (error) {
            console.error('❌ Erreur démonstration boutons:', error);
            return {
                text: `❌ **Erreur lors de la démonstration des boutons**\n\n` +
                      `Le système rencontre un problème technique.\n\n` +
                      `Veuillez réessayer plus tard ou contactez l'administrateur.`
            };
        }
    }

    async handleCombatCommand({ imageGenerator }) {
        return {
            text: `⚔️ **SYSTÈME DE COMBAT - FRICTION ULTIMATE**\n\n` +
                  `🌟 **Niveaux de puissance (G à A) :**\n` +
                  `• G - Très faible (débutants)\n` +
                  `• F - Faible (apprentis)\n` +
                  `• E - Moyen-faible (soldats basiques)\n` +
                  `• D - Moyen (combattants aguerris)\n` +
                  `• C - Moyen-fort (guerriers expérimentés)\n` +
                  `• B - Fort (spécialistes du combat)\n` +
                  `• A - Très fort (maîtres du combat)\n\n` +
                  `⚡ **Barres de combat :**\n` +
                  `• ❤️ Vie : Détermine ta survie\n` +
                  `• ⚡ Énergie : Consommée par les actions\n\n` +
                  `💀 **ATTENTION :** Chaque attaque doit être précise :\n` +
                  `• Mouvement exact (distance en mètres)\n` +
                  `• Arme utilisée et angle d'attaque\n` +
                  `• Partie du corps visée\n\n` +
                  `🎯 **Sans précision = vulnérabilité !**`,
            image: await imageGenerator.generateCombatGuideImage()
        };
    }

    async handleInventoryCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu dois d'abord créer un personnage avec /créer !`
            };
        }

        return {
            text: `🎒 **INVENTAIRE DE ${character.name.toUpperCase()}**\n\n` +
                  `💰 **Pièces :** ${character.coins}\n\n` +
                  `⚔️ **Équipement porté :**\n` +
                  `${this.formatEquipment(character.equipment)}\n\n` +
                  `📦 **Objets dans l'inventaire :**\n` +
                  `${this.formatInventory(character.inventory)}\n\n` +
                  `🔧 **Commandes d'équipement :**\n` +
                  `• Pour équiper : "équiper [objet]"\n` +
                  `• Pour déséquiper : "retirer [objet]"\n` +
                  `• Pour utiliser : "utiliser [objet]"`,
            image: await imageGenerator.generateInventoryImage(character)
        };
    }

    formatInventory(inventory) {
        if (!inventory || inventory.length === 0) {
            return '• Inventaire vide';
        }

        return inventory.map(item => `• ${item.itemId} (x${item.quantity})`).join('\n');
    }

    async handleMapCommand({ imageGenerator }) {
        return {
            text: `🗺️ **CARTE DU MONDE - FRICTION ULTIMATE**\n\n` +
                  `🏰 **Les 12 Royaumes sont dispersés à travers :**\n` +
                  `• Plaines fertiles d'Aegyria\n` +
                  `• Forêts sombres de Sombrenuit\n` +
                  `• Déserts brûlants de Khelos\n` +
                  `• Ports fortifiés d'Abrantis\n` +
                  `• Montagnes enneigées de Varha\n` +
                  `• Et bien d'autres contrées dangereuses...\n\n` +
                  `⚔️ **Les 7 Ordres ont établi leurs quartiers :**\n` +
                  `• Dans les sanctuaires profanés\n` +
                  `• Les citadelles fumantes\n` +
                  `• Les forteresses des ombres\n` +
                  `• Et d'autres lieux mystérieux...\n\n` +
                  `💀 **Chaque région est dangereuse !**`,
            image: await imageGenerator.generateWorldMap()
        };
    }

    async handlePlayCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `🎮 **MODE JEU ACTIVÉ**\n\n` +
                      `❌ Tu n'as pas encore de personnage !\n\n` +
                      `✨ **Pour commencer à jouer :**\n` +
                      `1️⃣ Utilise /créer pour créer ton personnage\n` +
                      `2️⃣ Puis utilise /jouer pour entrer dans le monde\n\n` +
                      `💬 **Note :** En mode jeu, tes messages seront interprétés comme des actions de jeu.\n` +
                      `Utilise /aide pour voir toutes les commandes disponibles.`,
                image: await imageGenerator.generateMenuImage()
            };
        }

        // Marquer le joueur en mode jeu
        await dbManager.setTemporaryData(player.id, 'game_mode', true);

        return {
            text: `🎮 **MODE JEU ACTIVÉ** 🎮\n\n` +
                  `👤 **${character.name}** est maintenant en jeu !\n` +
                  `📍 **Position :** ${character.currentLocation}\n` +
                  `❤️ **Vie :** ${character.currentLife}/${character.maxLife}\n` +
                  `⚡ **Énergie :** ${character.currentEnergy}/${character.maxEnergy}\n\n` +
                  `🎯 **Tes prochains messages seront interprétés comme des actions de jeu.**\n\n` +
                  `📝 **Exemples d'actions :**\n` +
                  `• "Je regarde autour de moi"\n` +
                  `• "J'avance vers le nord"\n` +
                  `• "Je cherche des ennemis"\n` +
                  `• "J'attaque avec mon épée"\n\n` +
                  `💬 **Besoin d'aide :** utilise /aide pour voir toutes les commandes\n` +
                  `⚙️ **Pour sortir du mode jeu :** utilise /menu\n\n` +
                  `🔥 **L'aventure commence maintenant !**`,
            image: await imageGenerator.generateCharacterImage(character)
        };
    }
    async handleGenderSelection({ player, message, dbManager, imageGenerator }) {
        // Marquer le début de la création si pas déjà fait
        await dbManager.setTemporaryData(player.id, 'creation_started', true);

        // Convertir l'entrée du joueur en genre
        let gender;
        const input = message.toUpperCase().trim();
        if (input === 'HOMME' || input === 'H' || input === '1') {
            gender = 'male';
        } else if (input === 'FEMME' || input === 'F' || input === '2') {
            gender = 'female';
        } else {
            return {
                text: `❌ Choix invalide ! \n\n` +
                      `Tape **HOMME**, **H**, **FEMME** ou **F**`
            };
        }

        // Stocker temporairement le genre (en attendant le royaume)
        await dbManager.setTemporaryData(player.id, 'creation_gender', gender);

        const kingdoms = await dbManager.getAllKingdoms();
        let kingdomText = `👤 **Sexe sélectionné :** ${gender === 'male' ? 'HOMME' : 'FEMME'}\n\n` +
                         `🏰 **Étape 2/3 - Choisis ton royaume :**\n\n`;

        kingdoms.forEach((kingdom, index) => {
            kingdomText += `**${index + 1}.** ${kingdom.name} - ${kingdom.description}\n`;
        });

        kingdomText += `\n⚡ **Tape le numéro du royaume (1 à 12)**`;

        // Générer une image de royaumes fantasy avec les fonctions disponibles
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
                text: `❌ Royaume invalide ! \n\n` +
                      `Choisis un numéro entre 1 et ${kingdoms.length}`
            };
        }

        const selectedKingdom = kingdoms[kingdomNumber - 1];

        // Récupérer le genre stocké temporairement
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');

        if (!gender) {
            return {
                text: `❌ Erreur : genre non trouvé. Recommence la création avec /créer`
            };
        }

        // Stocker le royaume temporairement avec son ID
        await dbManager.setTemporaryData(player.id, 'creation_kingdom', selectedKingdom.id);

        console.log(`✅ Royaume sélectionné: ${selectedKingdom.name} (ID: ${selectedKingdom.id}) pour le joueur ${player.id}`);

        return {
            text: `🏰 **Royaume sélectionné :** ${selectedKingdom.name}\n\n` +
                  `👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}\n` +
                  `🏰 **Royaume :** ${selectedKingdom.name}\n\n` +
                  `📝 **Étape 3/4 - Donne un nom à ton personnage :**\n\n` +
                  `✍️ Écris simplement le nom que tu veux pour ton personnage.\n` +
                  `⚠️ **Attention :** Le nom ne peut pas être modifié après !`,
            image: await imageGenerator.generateKingdomImage(selectedKingdom.id)
        };
    }

    async handleCharacterNameInput({ player, name, dbManager, imageGenerator }) {
        // Récupérer les données temporaires
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');

        if (!gender || !kingdomId) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        // Valider le nom (lettres, chiffres, accents)
        const nameRegex = /^[a-zA-Z0-9àâäéèêëïîôöùûüÿç\s-]{2,20}$/;
        if (!nameRegex.test(name)) {
            return {
                text: `❌ Le nom doit contenir entre 2 et 20 caractères (lettres, chiffres, espaces, tirets uniquement) !`
            };
        }

        // Vérifier si le nom existe déjà
        const existingCharacter = await dbManager.getCharacterByName(name.trim());
        if (existingCharacter) {
            return {
                text: `❌ Ce nom est déjà pris ! Choisis un autre nom.`
            };
        }

        // Stocker le nom temporairement et demander l'image
        await dbManager.setTemporaryData(player.id, 'creation_name', name.trim());

        return {
            text: `✅ **Nom accepté :** ${name}\n\n` +
                  `📸 **Étape 4/4 - Photo de ton visage :**\n\n` +
                  `🖼️ Envoie maintenant une photo de ton visage pour ton personnage.\n` +
                  `⚠️ **Important :**\n` +
                  `• Seule la zone du visage sera utilisée\n` +
                  `• Photo claire et bien éclairée recommandée\n` +
                  `• Si tu n'as pas de photo, écris "SANS_PHOTO"\n\n` +
                  `📷 **Envoie ta photo maintenant...**`
        };
    }

    async finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage = false, imageBuffer = null }) {
        // Récupérer toutes les données temporaires
        const gender = await dbManager.getTemporaryData(player.id, 'creation_gender');
        const kingdomId = await dbManager.getTemporaryData(player.id, 'creation_kingdom');
        const name = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (!gender || !kingdomId || !name) {
            return {
                text: `❌ Erreur : données de création manquantes. Recommence avec /créer`
            };
        }

        // Récupérer les détails du royaume
        const kingdom = await dbManager.getKingdomById(kingdomId);
        const kingdomName = kingdom ? kingdom.name : kingdomId;

        // Créer le personnage
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
            customImage: hasCustomImage // Marquer si le personnage a une image personnalisée
        };

        console.log(`✅ Création personnage: ${name}, Royaume: ${kingdomName} (${kingdomId}), Genre: ${gender}, Image: ${hasCustomImage}`);

        try {
            const newCharacter = await dbManager.createCharacter(characterData);

            // Si image personnalisée, la stocker
            if (hasCustomImage && imageBuffer) {
                await imageGenerator.saveCustomCharacterImage(newCharacter.id, imageBuffer);
            }

            // Nettoyer TOUTES les données temporaires de création
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_gender');
            await dbManager.clearTemporaryData(player.id, 'creation_kingdom');
            await dbManager.clearTemporaryData(player.id, 'creation_name');

            const imageType = hasCustomImage ? "avec ta photo personnalisée" : "avec une image générée";

            // Générer l'image du personnage de façon sécurisée
            let characterImage = null;
            try {
                characterImage = await imageGenerator.generateCharacterImage(newCharacter);
            } catch (imageError) {
                console.log('⚠️ Impossible de générer l\'image du personnage, continuons sans image:', imageError.message);
            }

            return {
                text: `🎉 **PERSONNAGE CRÉÉ AVEC SUCCÈS !**\n\n` +
                      `👤 **Nom :** ${newCharacter.name}\n` +
                      `👤 **Sexe :** ${gender === 'male' ? 'Homme' : 'Femme'}\n` +
                      `🏰 **Royaume :** ${kingdomName}\n` +
                      `📸 **Image :** ${imageType}\n` +
                      `⚔️ **Niveau :** ${newCharacter.level}\n` +
                      `🌟 **Niveau de puissance :** ${newCharacter.powerLevel}\n\n` +
                      `🎮 Utilise **/menu** pour découvrir tes options !`,
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
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            return {
                text: `❌ Tu n'as pas encore de personnage !\n\n` +
                      `Utilise la commande /créer pour en créer un.`
            };
        }

        // Utiliser le nouveau système de personnalisation sophistiqué pour modification
        if (this.characterCustomization) {
            const success = await this.characterCustomization.startCharacterCustomization(
                player.whatsappNumber,
                chatId,
                true // isModification = true
            );

            if (success) {
                return { text: '' }; // Le système de personnalisation gère l'envoi des messages
            } else {
                return {
                    text: '❌ Impossible de démarrer le système de modification. Une personnalisation est peut-être déjà en cours.\n\n' +
                          'Tapez "annuler" si vous avez un processus en cours, puis réessayez /modifier.'
                };
            }
        } else {
            // Fallback vers l'ancien système si le nouveau n'est pas disponible
            return await this.handleOldModifyCharacterCommand({ player, dbManager, imageGenerator });
        }
    }

    async handleOldModifyCharacterCommand({ player, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        // Marquer le début de la modification
        await dbManager.setTemporaryData(player.id, 'modification_started', true);

        // Générer l'image du personnage de façon sécurisée
        let characterImage = null;
        try {
            characterImage = await imageGenerator.generateCharacterImage(character);
        } catch (imageError) {
            console.log('⚠️ Impossible de générer l\'image du personnage pour modification, continuons sans image:', imageError.message);
        }

        return {
            text: `✨ **MODIFICATION DE PERSONNAGE (Mode Simple)**\n\n` +
                  `👤 **Personnage actuel :** ${character.name}\n` +
                  `🏰 **Royaume :** ${character.kingdom}\n` +
                  `👤 **Sexe :** ${character.gender === 'male' ? 'Homme' : 'Femme'}\n\n` +
                  `⚠️ Le système 3D avancé n'est pas disponible.\n\n` +
                  `🎨 **Nouvelle apparence personnalisée :**\n\n` +
                  `📝 Décris en détail l'apparence que tu veux pour ton personnage :\n` +
                  `• Couleur des cheveux, des yeux\n` +
                  `• Taille, corpulence\n` +
                  `• Style vestimentaire\n` +
                  `• Armes et accessoires\n` +
                  `• Cicatrices, tatouages, etc.\n\n` +
                  `✍️ **Écris ta description complète en un seul message :**`,
            image: characterImage
        };
    }

    async handleModificationDescription({ player, description, dbManager, imageGenerator }) {
        const character = await dbManager.getCharacterByPlayer(player.id);

        if (!character) {
            await dbManager.clearTemporaryData(player.id, 'modification_started');
            return {
                text: `❌ Personnage non trouvé. Utilise /créer pour créer un personnage.`
            };
        }

        try {
            console.log(`🎨 Génération nouvelle image pour ${character.name} avec description personnalisée...`);

            // Construire le prompt optimisé pour Freepik avec vue première personne FORCÉE
            const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
            const kingdomDesc = this.getKingdomDescription(character.kingdom);

            // Nettoyer et optimiser la description utilisateur
            const cleanDescription = description.trim();

            // Construire un prompt plus structuré et précis avec vue première personne
            const basePrompt = `fantasy ${genderDesc} warrior`;
            const kingdomContext = `from ${character.kingdom} kingdom (${kingdomDesc})`;
            const userCustomization = cleanDescription;
            const artStyle = 'detailed fantasy RPG character art, first person POV perspective, epic fantasy style';

            let fullPrompt = `${basePrompt} ${kingdomContext}, appearance: ${userCustomization}, ${artStyle}`;

            console.log(`🎨 Prompt de modification généré: "${fullPrompt}"`);

            // Vérifier que la description utilisateur est bien intégrée
            if (!fullPrompt.toLowerCase().includes(cleanDescription.toLowerCase().substring(0, 20))) {
                console.log('⚠️ Description utilisateur mal intégrée, correction...');
                const correctedPrompt = `${userCustomization}, ${basePrompt} ${kingdomContext}, ${artStyle}`;
                console.log(`🔧 Prompt corrigé: "${correctedPrompt}"`);
                fullPrompt = correctedPrompt;
            }

            // Générer l'image avec Freepik FORCÉ en vue première personne
            const imagePath = `temp/character_modified_${character.id}_${Date.now()}.png`;

            console.log(`📝 Description originale: "${cleanDescription}"`);
            console.log(`🎯 Prompt final envoyé: "${fullPrompt}"`);

            await imageGenerator.freepikClient.generateImage(fullPrompt, imagePath, {
                style: '3d',
                perspective: 'first_person', // FORCÉ - vue première personne pour IA
                nudity: false
            });

            // Lire l'image générée
            const fs = require('fs').promises;
            const imageBuffer = await fs.readFile(imagePath).catch(() => null);

            // Nettoyer les données temporaires
            await dbManager.clearTemporaryData(player.id, 'modification_started');

            if (imageBuffer) {
                // Sauvegarder l'image modifiée comme image personnalisée
                await imageGenerator.saveCustomCharacterImage(character.id, imageBuffer);

                return {
                    text: `✨ **PERSONNAGE MODIFIÉ AVEC SUCCÈS !**\n\n` +
                          `👤 **${character.name}** - Nouvelle apparence générée\n\n` +
                          `📝 **Description appliquée :**\n"${cleanDescription}"\n\n` +
                          `🎨 **Image générée par Freepik avec IA (vue première personne)**\n\n` +
                          `✅ Ton personnage a maintenant une apparence unique basée sur ta description !`,
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
                text: `❌ Erreur lors de la génération de l'image personnalisée.\n\n` +
                      `Réessaie avec une description plus simple ou utilise /modifier à nouveau.`
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

            // Extraire le dialogue du joueur (enlever les guillemets s'il y en a)
            let playerSpeech = message;
            if (message.includes('"')) {
                const matches = message.match(/"([^"]+)"/);
                if (matches && matches[1]) {
                    playerSpeech = matches[1];
                }
            }

            // Générer une réponse de PNJ avec Groq
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
                    // Fallback simple si Groq non disponible
                    npcResponse = `"Salut ${character.name} ! Que fais-tu par ici ?"`;
                }
            } catch (error) {
                console.error('❌ Erreur génération dialogue PNJ:', error.message);
                npcResponse = `"Bonjour, voyageur. Belle journée, n'est-ce pas ?"`;
            }

            // Générer l'image et l'audio du dialogue
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
                text: `💬 ${playerSpeech}\n\n${npcResponse}\n\n📍 *${character.currentLocation}*`,
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
            const character = await dbManager.getCharacterByPlayer(player.id);

            if (!character) {
                return {
                    text: `❌ Tu n'as pas de personnage à supprimer.\n\n` +
                          `Utilise /créer pour créer un nouveau personnage.`
                };
            }

            // Supprimer le personnage de la base de données
            await dbManager.deleteCharacter(character.id);

            // Nettoyer les données temporaires
            await dbManager.clearTemporaryData(player.id, 'game_mode');
            await dbManager.clearTemporaryData(player.id, 'creation_started');
            await dbManager.clearTemporaryData(player.id, 'creation_mode');

            console.log(`🗑️ Personnage supprimé: ${character.name} (ID: ${character.id})`);

            return {
                text: `🗑️ **PERSONNAGE SUPPRIMÉ** 🗑️\n\n` +
                      `👤 **${character.name}** a été définitivement supprimé de ${character.kingdom}.\n\n` +
                      `✨ Tu peux maintenant créer un nouveau personnage avec /créer\n\n` +
                      `💀 **Attention :** Cette action est irréversible !`,
                image: await imageGenerator.generateMenuImage()
            };

        } catch (error) {
            console.error('❌ Erreur lors de la suppression du personnage:', error);
            return {
                text: `❌ **Erreur lors de la suppression**\n\n` +
                      `Une erreur s'est produite. Veuillez réessayer plus tard.`
            };
        }
    }

    async generateNPCResponse(character, playerDialogue, sessionId) {
        try {
            // Utiliser Groq pour générer une réponse rapide de PNJ
            if (this.groqClient && this.groqClient.hasValidClient()) {
                return await this.groqClient.generateDialogueResponse(character, playerDialogue, sessionId);
            }

            // Fallback vers les autres clients
            if (this.openAIClient && this.openAIClient.isAvailable) {
                const context = {
                    character: character,
                    playerMessage: playerDialogue,
                    location: character.currentLocation
                };
                return await this.openAIClient.generateCharacterResponse(character, context, playerDialogue, sessionId);
            }

            // Réponse par défaut
            return "Le PNJ vous regarde attentivement et hoche la tête.";

        } catch (error) {
            console.error('❌ Erreur génération réponse PNJ:', error);
            return "Le PNJ semble perplexe et ne sait pas quoi répondre.";
        }
    }

    buildGameActionPrompt(context, sessionId) {
        const { character, action, location, characterImage, gameState } = context;

        return `CONTEXTE DU JEU - FRICTION ULTIMATE:

Personnage: ${character.name} (${character.gender === 'male' ? 'Homme' : 'Femme'})
${characterImage}Royaume: ${character.kingdom}
Ordre: ${character.order || 'Aucun'}
Niveau: ${character.level} (Puissance ${character.powerLevel})
Localisation actuelle: ${character.currentLocation}
Vie: ${character.currentLife}/${character.maxLife}
Énergie: ${character.currentEnergy}/${character.maxEnergy}
Temps: ${gameState.time}
Météo: ${gameState.weather}
Niveau du joueur: ${gameState.playerLevel}

Action du joueur: "${action}"

Tu dois générer une narration HARDCORE et immersive en français qui décrit les conséquences de cette action dans ce monde impitoyable. La narration doit être:
- Réaliste et dangereuse (comme Dark Souls)
- Immersive avec des détails sensoriels précis
- Cohérente avec le lore du royaume ${character.kingdom}
- **UTILISE l'apparence physique du personnage dans la description.** Si une image personnalisée est fournie, intègre ses détails.
- **Entre 5-7 phrases pour une narration plus riche et détaillée.**
- Style narratif à la 2ème personne ("Tu...")
- Inclut des conséquences physiques et émotionnelles claires pour le personnage.
- Décrit l'environnement immédiat, les réactions des PNJ/créatures présentes, et l'impact de l'action sur le joueur.
- **MAINTIENS une difficulté ÉLEVÉE et une ambiance sombre.**

Génère la narration détaillée:`;
    }
}

module.exports = GameEngine;