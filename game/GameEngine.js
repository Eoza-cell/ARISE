const GeminiClient = require('../gemini/GeminiClient');
const OpenAIClient = require('../ai/OpenAIClient');
const OllamaClient = require('../ai/OllamaClient');
const GroqClient = require('../groq/GroqClient');
const OgunGuide = require('../characters/OgunGuide');
const CharacterCustomizationManager = require('../utils/CharacterCustomizationManager');
const path = require('path'); // Importer le module path pour gérer les chemins de fichiers

class GameEngine {
    constructor(dbManager = null) {
        this.dbManager = dbManager;
        this.openAIClient = new OpenAIClient(this.dbManager);
        this.ollamaClient = new OllamaClient();
        this.groqClient = new GroqClient();
        this.geminiClient = new GeminiClient();
        this.ogunGuide = new OgunGuide(this.groqClient);

        // Sera initialisé dans setWhatsAppSocket une fois que sock est disponible
        this.characterCustomization = null;

        this.commandHandlers = {
            '/menu': this.handleMenuCommand.bind(this),
            '/créer': this.handleCreateCharacterCommand.bind(this),
            '/créer_personnage': this.handleCreateCharacterCommand.bind(this),
            '/modifier': this.handleModifyCharacterCommand.bind(this),
            '/fiche': this.handleCharacterSheetCommand.bind(this),
            '/aide': this.ogunGuide.getHelpMenu.bind(this),
            '/help': this.ogunGuide.getHelpMenu.bind(this),
            '/guide': this.ogunGuide.getHelpMenu.bind(this),
            '/ogun': this.ogunGuide.getHelpMenu.bind(this),
            '/jouer': this.handlePlayCommand.bind(this),
            '/royaumes': this.handleKingdomsCommand.bind(this),
            '/ordres': this.handleOrdersCommand.bind(this),
            '/combat': this.handleCombatCommand.bind(this),
            '/inventaire': this.handleInventoryCommand.bind(this),
            '/carte': this.handleMapCommand.bind(this)
        };
    }

    async processPlayerMessage({ playerNumber, chatId, message, imageMessage, sock, dbManager, imageGenerator }) {
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

            // Traitement des commandes - gérer les cas où message est null (ex: images)
            if (!message) {
                return { 
                    text: "🖼️ J'ai reçu votre image ! Cependant, je ne peux traiter que les commandes textuelles.\n\n" +
                          "💬 Utilisez `/menu` pour voir les commandes disponibles." 
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

            if (this.commandHandlers[command]) {
                response = await this.commandHandlers[command]({ player, chatId, message, dbManager, imageGenerator, sock });
            }

            const playerId = player.id;
            const normalizedMessage = message.toLowerCase().trim();

            // Vérifier si c'est une question DIRECTE pour Ogun (plus restrictif)
            const directOgunKeywords = ['aide', 'help', 'conseil', 'guide', 'ogun', 'comment commencer', 'comment jouer'];
            const isDirectQuestion = directOgunKeywords.some(keyword => 
                normalizedMessage.includes(keyword)
            ) || (normalizedMessage.endsWith('?') && normalizedMessage.length < 50); // Questions courtes seulement

            // Détecter si Ogun est mentionné directement
            const ogunMentioned = normalizedMessage.includes('ogun') || 
                                normalizedMessage.includes('montgomery') ||
                                normalizedMessage.includes('@ogun') ||
                                normalizedMessage.startsWith('salut ogun') ||
                                normalizedMessage.startsWith('hey ogun');

            if ((isDirectQuestion || ogunMentioned) && !response) {
                response = await this.ogunGuide.getGuideResponse(message, playerId);
            }

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

                // Traitement des actions de jeu normales avec IA Gemini
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
                   `• /ogun - 🔥 Parler avec Ogun (guide)\n` +
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
                      `🎨 Pour créer un nouveau personnage avec notre système 3D avancé,\n` +
                      `tu dois d'abord supprimer l'actuel.\n\n` +
                      `✨ **Nouveau système de création :**\n` +
                      `• Personnalisation 3D réaliste comme Skyrim\n` +
                      `• 9 étapes de customisation détaillée\n` +
                      `• Aperçus en temps réel\n` +
                      `• Rendu haute qualité final\n\n` +
                      `Écris "SUPPRIMER_PERSONNAGE" pour confirmer la suppression et accéder au nouveau système.`,
                image: await imageGenerator.generateCharacterImage(existingCharacter)
            };
        }

        // Utiliser le nouveau système de personnalisation sophistiqué
        if (this.characterCustomization) {
            const success = await this.characterCustomization.startCharacterCustomization(
                player.whatsappNumber, 
                chatId, 
                false // isModification = false
            );

            if (success) {
                return { text: '' }; // Le système de personnalisation gère l'envoi des messages
            } else {
                return {
                    text: '❌ Impossible de démarrer le système de personnalisation. Une personnalisation est peut-être déjà en cours.\n\n' +
                          'Tapez "annuler" si vous avez un processus en cours, puis réessayez /créer.'
                };
            }
        } else {
            // Fallback vers l'ancien système si le nouveau n'est pas disponible
            return await this.startCharacterCreation({ player, dbManager, imageGenerator });
        }
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

        return {
            text: sheetText,
            image: await imageGenerator.generateCharacterSheet(character)
        };
    }

    async handleGameAction({ player, chatId, message, imageMessage, sock, dbManager, imageGenerator }) {
        // Gestion des images pour la création de personnage
        if (imageMessage) {
            console.log('📸 Image reçue - vérification du contexte de création...');
            const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');
            const tempName = await dbManager.getTemporaryData(player.id, 'creation_name');

            console.log(`🔍 Contexte création: started=${!!creationStarted}, name=${!!tempName}`);

            if (creationStarted && tempName) {
                try {
                    console.log('📸 Réception d\'une image pour la création de personnage...');
                    console.log('🔄 Tentative de téléchargement de l\'image...');

                    // Télécharger l'image
                    const imageBuffer = await sock.downloadMediaMessage(imageMessage);

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
            } else {
                console.log('📸 Image reçue mais pas en cours de création de personnage');
            }
        }

        // Si on a une image mais qu'on n'est pas en création, ignorer
        if (imageMessage && !message) {
            return {
                text: `📸 Image reçue, mais aucune action prévue pour les images pour le moment.`
            };
        }
        // D'abord traiter les actions de création de personnage (avant de vérifier si personnage existe)

        // Vérifier si une création est en cours
        const creationStarted = await dbManager.getTemporaryData(player.id, 'creation_started');

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
        const tempName = await dbManager.getTemporaryData(player.id, 'creation_name');

        if (creationStarted && tempGender && tempKingdom && !tempName) {
            // Le joueur est en train de donner le nom de son personnage
            return await this.handleCharacterNameInput({ player, name: message, dbManager, imageGenerator });
        }

        // Gestion de la finalisation de création (après nom, en attente d'image ou "SANS_PHOTO")
        if (creationStarted && tempGender && tempKingdom && tempName) {
            if (message.toUpperCase() === 'SANS_PHOTO') {
                return await this.finalizeCharacterCreation({ player, dbManager, imageGenerator, hasCustomImage: false });
            }
            // Si c'est un autre message texte, redemander l'image
            return {
                text: `📸 **En attente de ta photo de visage...**\n\n` +
                      `🖼️ Envoie une image de ton visage ou écris "SANS_PHOTO" pour continuer sans photo personnalisée.`
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
                      `🔥 **/ogun** - Parler avec Ogun (guide)\n` +
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
        const dialogueKeywords = ['parle', 'dis', 'demande', 'salue', 'bonjour', 'bonsoir', 'hey', '"'];
        const isDialogue = dialogueKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        ) || message.includes('"') || message.toLowerCase().startsWith('je dis');

        if (isDialogue) {
            return await this.processDialogueAction({ player, character, message, dbManager, imageGenerator });
        }

        // Traitement des actions de jeu normales avec IA Gemini
        return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
    }

    async processGameActionWithAI({ player, character, message, dbManager, imageGenerator }) {
        try {
            const sessionId = `player_${player.id}`; // Session unique par joueur

            // Analyser l'action du joueur avec OpenAI
            const actionAnalysis = await this.openAIClient.analyzePlayerAction(message, {
                character: character,
                location: character.currentLocation,
                kingdom: character.kingdom
            }, sessionId);

            // Générer la narration: Ollama > Gemini > OpenAI
            let narration;
            try {
                // Priorité absolue à Groq pour la vitesse et qualité
                if (this.groqClient && this.groqClient.hasValidClient()) {
                    console.log('🚀 Génération narration avec Groq (ultra-rapide)...');
                    narration = await this.groqClient.generateExplorationNarration(character.currentLocation, message, sessionId, character);
                    console.log('✅ Narration générée avec Groq');
                } else {
                    throw new Error('Groq non disponible, essai Ollama');
                }
            } catch (groqError) {
                try {
                    if (this.ollamaClient.hasValidClient()) {
                        narration = await this.ollamaClient.generateNarration({}, message, character);
                        console.log('✅ Narration générée avec Ollama');
                    } else {
                        throw new Error('Ollama non disponible, essai Gemini');
                    }
                } catch (ollamaError) {
                    try {
                        console.log('🎭 Génération narration avec Gemini...');
                        const context = {
                            character: character,
                            location: character.currentLocation,
                            action: message,
                            gameState: {
                                life: character.currentLife,
                                energy: character.currentEnergy,
                                powerLevel: character.powerLevel,
                                kingdom: character.kingdom
                            }
                        };
                        narration = await this.geminiClient.generateNarration(context, sessionId);
                        console.log('✅ Narration générée avec Gemini');
                    } catch (geminiError) {
                        console.log('⚠️ Fallback OpenAI pour narration:', geminiError.message);
                        narration = await this.openAIClient.generateNarration({
                            character: character,
                            location: character.currentLocation,
                            action: message,
                            gameState: {
                                life: character.currentLife,
                                energy: character.currentEnergy,
                                powerLevel: character.powerLevel
                            }
                        }, sessionId);
                    }
                }
            }

            // CLAMPING SERVER-SIDE STRICT - Sécuriser toutes les valeurs de l'IA
            const energyCost = Math.max(0, Math.min(character.currentEnergy, actionAnalysis.energyCost || 10));
            const staminaRecovery = Math.max(-15, Math.min(3, actionAnalysis.staminaRecovery || 0));
            const equipmentStress = Math.max(-3, Math.min(0, actionAnalysis.equipmentStress || 0));

            // Valider combatAdvantage dans une liste sécurisée
            const validCombatAdvantages = ['critical_hit', 'normal_hit', 'glancing_blow', 'miss', 'counter_attacked'];
            actionAnalysis.combatAdvantage = validCombatAdvantages.includes(actionAnalysis.combatAdvantage) 
                ? actionAnalysis.combatAdvantage 
                : 'miss';

            // Appliquer le système de combat Dark Souls strict
            character.currentEnergy = Math.max(0, character.currentEnergy - energyCost);

            // Système de dégâts CONTRÔLÉ - seulement dans certaines situations
            let damageText = '';
            let shouldTakeDamage = false;

            // Dégâts seulement si :
            // 1. Action explicitement dangereuse (combat, escalade, etc.)
            // 2. OU contre-attaque
            // 3. OU énergie à zéro (épuisement)
            const dangerousKeywords = ['attaque', 'combat', 'frappe', 'escalade', 'saute', 'courir', 'fonce'];
            const isDangerousAction = dangerousKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );

            if (isDangerousAction && actionAnalysis.combatAdvantage === 'counter_attacked') {
                shouldTakeDamage = true;
            } else if (character.currentEnergy <= 0) {
                shouldTakeDamage = true; // Épuisement = vulnérabilité
            }

            if (shouldTakeDamage && actionAnalysis.potentialDamage > 0) {
                // Dégâts réduits et plafonnés
                const baseDamage = Math.max(1, Math.min(15, actionAnalysis.potentialDamage || 5));
                const damage = Math.min(baseDamage, character.currentLife);
                character.currentLife = Math.max(0, character.currentLife - damage);
                damageText = `\n💀 **DÉGÂTS SUBIS :** -${damage} PV (action risquée)`;

                console.log(`⚔️ Dégâts appliqués: ${damage} PV (action: ${message}, situation: ${actionAnalysis.combatAdvantage})`);
            }

            // Récupération de stamina (utiliser la valeur clampée)
            if (staminaRecovery !== 0) {
                if (staminaRecovery > 0) {
                    character.currentEnergy = Math.min(character.maxEnergy, character.currentEnergy + staminaRecovery);
                } else {
                    character.currentEnergy = Math.max(0, character.currentEnergy + staminaRecovery); // Soustraction supplémentaire
                }
            }

            // Usure d'équipement (utiliser la valeur clampée)
            let equipmentWarning = '';
            if (equipmentStress < 0) {
                equipmentWarning = `\n⚔️ **USURE ÉQUIPEMENT :** Votre équipement s'abîme (${Math.abs(equipmentStress)})`;
            }

            // Vérifier si le personnage est mort (gestion Dark Souls)
            let deathText = '';
            let isAlive = true;
            if (character.currentLife <= 0) {
                isAlive = false;

                // Calculer les pertes AVANT modification
                const coinsBefore = character.coins;
                const coinsLost = Math.floor(coinsBefore * 0.1);

                // Appliquer les pénalités de mort
                character.currentLife = Math.ceil(character.maxLife * 0.3); // Respawn avec 30% de vie
                character.currentEnergy = Math.floor(character.maxEnergy * 0.5); // 50% d'énergie
                character.coins = Math.max(0, coinsBefore - coinsLost); // Réduction correcte
                character.currentLocation = 'Lieu de Respawn - Sanctuaire des Âmes Perdues';

                deathText = `\n💀 **MORT** - Vous avez succombé à vos blessures...\n` +
                           `🕊️ **RESPAWN** - Votre âme trouve refuge au Sanctuaire\n` +
                           `💰 **PERTE** - ${coinsLost} pièces perdues dans la mort\n` +
                           `❤️ **RÉSURRECTION** - Vous renaissez avec ${character.currentLife} PV`;
            }

            // Sauvegarder les changements (avec position de respawn si mort)
            await dbManager.updateCharacter(character.id, {
                currentEnergy: character.currentEnergy,
                currentLife: character.currentLife,
                coins: character.coins,
                currentLocation: character.currentLocation
            });

            const riskEmoji = {
                'low': '🟢',
                'medium': '🟡', 
                'high': '🟠',
                'extreme': '🔴'
            }[actionAnalysis.riskLevel] || '⚪';

            // Générer les barres de vie et d'énergie comme dans Dark Souls
            const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
            const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

            // Indicateur d'avantage de combat
            const combatEmoji = {
                'critical_hit': '🎯',
                'normal_hit': '⚔️', 
                'glancing_blow': '🛡️',
                'miss': '❌',
                'counter_attacked': '💀'
            }[actionAnalysis.combatAdvantage] || '⚪';

            // Messages d'alerte pour détection et conséquences
            let detectionWarning = '';
            if (actionAnalysis.detectionRisk) {
                detectionWarning = `\n👁️ **DÉTECTION** - Vos mouvements ont pu être repérés !`;
            }

            let consequencesText = '';
            if (actionAnalysis.consequences && actionAnalysis.consequences.length > 0) {
                const mainConsequence = actionAnalysis.consequences[0];
                if (mainConsequence && !mainConsequence.includes('Erreur')) {
                    consequencesText = `\n⚠️ **CONSÉQUENCES :** ${mainConsequence}`;
                }
            }

            // Feedback complet des métriques Dark Souls
            const precisionEmoji = {
                'high': '🎯',
                'medium': '⚪',
                'low': '❌'
            }[actionAnalysis.precision] || '❓';

            const staminaText = staminaRecovery !== 0 
                ? `\n⚡ **RÉCUP. ENDURANCE :** ${staminaRecovery > 0 ? '+' : ''}${staminaRecovery}` 
                : '';

            // Préparer la réponse avec toutes les métriques Dark Souls
            const responseText = `🎮 **${character.name}** - *${character.currentLocation}*\n\n` +
                               `📖 **Narration :** ${narration}\n\n` +
                               `❤️ **Vie :** ${lifeBar}${damageText}${deathText}\n` +
                               `⚡ **Énergie :** ${energyBar} (-${energyCost})${staminaText}\n` +
                               `💰 **Argent :** ${character.coins} pièces d'or\n\n` +
                               `${precisionEmoji} **Précision :** ${actionAnalysis.precision.toUpperCase()}\n` +
                               `${riskEmoji} **Niveau de risque :** ${actionAnalysis.riskLevel.toUpperCase()}\n` +
                               `🎯 **Type d'action :** ${actionAnalysis.actionType}\n` +
                               `${combatEmoji} **Résultat combat :** ${actionAnalysis.combatAdvantage?.replace('_', ' ') || 'N/A'}` +
                               `${equipmentWarning}${detectionWarning}${consequencesText}\n\n` +
                               `💭 ${isAlive ? '*Que fais-tu ensuite ?*' : '*Vous renaissez au Sanctuaire... Que faites-vous ?*'}`;

            // Essayer de générer l'image, l'audio et la vidéo, mais ne pas bloquer l'envoi si ça échoue
            let actionImage = null;
            let actionAudio = null;
            let actionVideo = null;
            try {
                // Générer image avec audio (style Skyrim)
                const mediaResult = await imageGenerator.generateCharacterActionImageWithVoice(character, message, narration);
                actionImage = mediaResult.image;
                actionAudio = mediaResult.audio;

                // Générer une vidéo pour cette action
                const imagePath = actionImage ? path.join(__dirname, '../temp', `action_temp_${Date.now()}.png`) : null;
                if (actionImage && imagePath) {
                    // Sauvegarder l'image temporairement pour la vidéo
                    const fs = require('fs').promises;
                    await fs.writeFile(imagePath, actionImage);
                }

                actionVideo = await imageGenerator.generateActionVideo(character, message, narration, imagePath);

                // Nettoyer l'image temporaire
                if (imagePath) {
                    try {
                        const fs = require('fs').promises;
                        await fs.unlink(imagePath);
                    } catch (err) {
                        console.log('⚠️ Impossible de supprimer le fichier temporaire:', err.message);
                    }
                }
            } catch (mediaError) {
                console.error('❌ Erreur génération média:', mediaError.message);
            }

            return {
                text: responseText,
                image: actionImage,
                audio: actionAudio,
                video: actionVideo
            };

        } catch (error) {
            console.error('❌ Erreur lors du traitement IA:', error);

            // Appliquer au moins une réduction d'énergie de base
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
                      `⚡ **Énergie :** ${energyBar} (-${energyCost})\n` +
                      `💰 **Argent :** ${character.coins} pièces d'or\n\n` +
                      `⚠️ Le narrateur analyse ton action... Les systèmes IA sont temporairement instables.\n\n` +
                      `💭 *Continue ton aventure...*`
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

    formatTechniques(techniques) {
        if (!techniques || techniques.length === 0) {
            return '• Aucune technique apprise';
        }

        return techniques.map(tech => `• ${tech}`).join('\n');
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
                      `Pour parler avec Ogun, utilise /ogun ou commence par "Ogun, ..."`,
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
                  `💬 **Pour parler avec Ogun :** commence par "Ogun, ..." ou utilise /ogun\n` +
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
                  `👤 **Sexe :** ${gender === 'male' ? 'HOMME' : 'FEMME'}\n` +
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
            const sessionId = `player_${player.id}_dialogue`; // Session unique par joueur pour les dialogues

            // Détecter le PNJ auquel le joueur s'adresse
            let targetNPC = null;
            const npcNames = ['Ogun']; // Liste des PNJ connus
            const lowerMessage = message.toLowerCase();

            for (const npcName of npcNames) {
                if (lowerMessage.includes(npcName.toLowerCase()) || lowerMessage.startsWith(npcName.toLowerCase())) {
                    targetNPC = npcName;
                    break;
                }
            }

            // Si aucun PNJ spécifique n'est ciblé, utiliser Ogun par défaut si le message est une question générale ou une salutation
            if (!targetNPC && (lowerMessage.endsWith('?') || lowerMessage.includes('salut') || lowerMessage.includes('bonjour') || lowerMessage.includes('hey') || lowerMessage.startsWith('je dis'))) {
                targetNPC = 'Ogun';
            }

            let narration;
            if (targetNPC) {
                // Utiliser le client approprié pour le PNJ (ici, OgunGuide)
                if (targetNPC === 'Ogun') {
                    narration = await this.ogunGuide.getGuideResponse(message, player.id);
                } else {
                    // Gérer d'autres PNJ si nécessaire
                    narration = await this.openAIClient.analyzePlayerAction(message, { character, location: character.currentLocation, kingdom: character.kingdom, targetNPC: targetNPC }, sessionId);
                }
            } else {
                // Si le message est un dialogue mais sans PNJ clair, le traiter comme une action normale mais avec une réponse générique.
                // C'est une mesure de sécurité pour éviter les erreurs.
                return await this.processGameActionWithAI({ player, character, message, dbManager, imageGenerator });
            }

            // Appliquer une pénalité d'énergie pour les dialogues (moins coûteux qu'une action complexe)
            const energyCost = Math.max(0, Math.min(character.currentEnergy, 5)); // 5 points d'énergie pour un dialogue
            character.currentEnergy = Math.max(0, character.currentEnergy - energyCost);

            await dbManager.updateCharacter(character.id, {
                currentEnergy: character.currentEnergy
            });

            // Générer les barres de vie et d'énergie
            const lifeBar = this.generateBar(character.currentLife, character.maxLife, '🟥');
            const energyBar = this.generateBar(character.currentEnergy, character.maxEnergy, '🟩');

            // Préparer la réponse
            const responseText = `💬 **Dialogue avec ${targetNPC} :**\n\n` +
                               `"${narration.text || narration}"\n\n` + // Assurer que 'narration' est un objet avec une propriété 'text' ou est une chaîne
                               `❤️ **Vie :** ${lifeBar}\n` +
                               `⚡ **Énergie :** ${energyBar} (-${energyCost})\n` +
                               `💰 **Argent :** ${character.coins} pièces d'or`;

            // Essayer de générer une image et audio spécifique pour le PNJ
            let npcImage = null;
            let dialogueAudio = null;
            
            if (targetNPC === 'Ogun') {
                try {
                    npcImage = await this.ogunGuide.getImage(); // Obtenir l'image d'Ogun
                    
                    // Générer l'audio du dialogue avec Ogun
                    const dialogueResult = await imageGenerator.generateDialogueImage(character, targetNPC, narration.text || narration, {
                        style: '3d',
                        perspective: 'second_person'
                    });
                    dialogueAudio = dialogueResult.audio;
                    
                } catch (error) {
                    console.error('⚠️ Erreur lors de la génération du dialogue Ogun:', error);
                    npcImage = await imageGenerator.generateCharacterImage(character); // Fallback vers l'image du personnage
                }
            } else {
                // Générer image et audio pour autres PNJ
                try {
                    const dialogueResult = await imageGenerator.generateDialogueImage(character, targetNPC, narration.text || narration, {
                        style: '3d',
                        perspective: 'second_person'
                    });
                    npcImage = dialogueResult.image || await imageGenerator.generateCharacterImage(character);
                    dialogueAudio = dialogueResult.audio;
                } catch (error) {
                    console.error('⚠️ Erreur génération dialogue PNJ:', error);
                    npcImage = await imageGenerator.generateCharacterImage(character);
                }
            }

            return {
                text: responseText,
                image: npcImage,
                audio: dialogueAudio
            };

        } catch (error) {
            console.error('❌ Erreur lors du traitement du dialogue:', error);
            return {
                text: `❌ Une erreur s'est produite pendant le dialogue. Veuillez réessayer.`
            };
        }
    }
}

module.exports = GameEngine;