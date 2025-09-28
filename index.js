// The following code integrates RunwayML video generation into the bot's action response system.
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Importation des modules du jeu
const GameEngine = require('./game/GameEngine');
const DatabaseManager = require('./database/DatabaseManager');
const ImageGenerator = require('./utils/ImageGenerator');
const WhatsAppButtonManager = require('./utils/WhatsAppButtonManager');
const { initializeGameData } = require('./data/GameData');

// Clients IA et services
const OpenAIClient = require('./ai/OpenAIClient');
const GroqClient = require('./groq/GroqClient');
const GeminiClient = require('./gemini/GeminiClient');
const OllamaClient = require('./ai/OllamaClient');

// Clients de génération d'images
const PollinationsClient = require('./pollinations/PollinationsClient');
const RunwareClient = require('./runware/RunwareClient');
const KieAiClient = require('./kieai/KieAiClient');
const FreepikClient = require('./freepik/FreepikClient');

// Client audio et vidéo
const PlayHTClient = require('./playht/PlayHTClient');
const CambAIClient = require('./camb/CambAIClient');
const PuterClient = require('./puter/PuterClient');
const RunwayClient = require('./runway/RunwayClient');
const HuggingFaceClient = require('./huggingface/HuggingFaceClient');

// Gestionnaire de session WhatsApp
const SessionManager = require('./whatsapp/SessionManager');

// IA Frictia pour les groupes de discussion
const FrictiaAI = require('./ai/FrictiaAI');

class FrictionUltimateBot {
    constructor() {
        this.sock = null;
        // Initialiser le moteur de jeu avec accès à la base de données
        this.dbManager = new DatabaseManager();
        this.imageGenerator = new ImageGenerator();
        this.gameEngine = new GameEngine(this.dbManager);
        this.buttonManager = null; // Sera initialisé après la connexion
        this.isConnected = false;
        // Système de déduplication optimisé pour économiser la mémoire
        this.processedMessages = new Map(); // ID du message -> timestamp
        this.maxCacheSize = 200; // Réduire encore plus la limite de cache pour économiser la mémoire
        this.cacheCleanupInterval = 90 * 1000; // Nettoyer le cache toutes les 90 secondes (plus fréquent)

        // IA Frictia pour les groupes de discussion
        this.frictiaAI = new FrictiaAI();

        // Limitation de QR codes pour éviter la boucle infinie
        this.qrCodeAttempts = 0;
        this.maxQrCodeAttempts = 5;
        this.lastQrCodeTime = 0;
        this.qrCodeCooldown = 60000; // 1 minute entre tentatives

        // Nettoyage automatique de la mémoire plus agressif
        setInterval(() => {
            this.cleanupCache();
            // Nettoyer Frictia aussi
            this.frictiaAI.cleanup();
            // Force garbage collection si disponible
            if (global.gc) {
                global.gc();
            }
        }, this.cacheCleanupInterval);

        // Injecter l'ImageGenerator dans le GameEngine
        this.gameEngine.imageGenerator = this.imageGenerator;

        // Injecter le client Groq dans l'ImageGenerator pour optimisation des prompts
        if (this.imageGenerator.setGroqClient) {
            this.imageGenerator.setGroqClient(this.gameEngine.groqClient);
        }

        // Initialisation de HuggingFaceClient pour génération de vidéos IA
        try {
            this.huggingfaceClient = new HuggingFaceClient();
            this.hasHuggingFace = this.huggingfaceClient.hasValidClient();
            if (this.hasHuggingFace) {
                console.log('🤗 HuggingFaceClient initialisé - Génération de vidéos IA avec ltxv-13b-098-distilled activée');
                console.log('🎬 Vidéos image-to-video avec images de personnages disponibles');
            } else {
                console.log('⚠️ HF_TOKEN non configurée - HuggingFace vidéos désactivées');
                console.log('💡 Ajoutez HF_TOKEN dans les secrets pour activer les vidéos ltxv-13b-098-distilled');
            }
        } catch (error) {
            console.error('❌ Erreur initialisation HuggingFaceClient:', error.message);
            this.huggingfaceClient = null;
            this.hasHuggingFace = false;
        }
    }



    // Méthodes de validation d'image
    validateImageBuffer(buffer, expectedMimetype) {
        try {
            if (!Buffer.isBuffer(buffer) || buffer.length < 10) {
                return false;
            }

            // Vérification des signatures d'image
            const imageSignatures = {
                'image/jpeg': [[0xFF, 0xD8, 0xFF]],
                'image/jpg': [[0xFF, 0xD8, 0xFF]],
                'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
                'image/webp': [[0x52, 0x49, 0x46, 0x46]],
                'image/gif': [[0x47, 0x49, 0x46, 0x38]]
            };

            // Vérifier toutes les signatures possibles
            for (const [mimeType, signatures] of Object.entries(imageSignatures)) {
                for (const signature of signatures) {
                    if (buffer.length >= signature.length) {
                        let matches = true;
                        for (let i = 0; i < signature.length; i++) {
                            if (buffer[i] !== signature[i]) {
                                matches = false;
                                break;
                            }
                        }
                        if (matches) {
                            console.log(`✅ Image validée comme ${mimeType}`);
                            return true;
                        }
                    }
                }
            }

            console.log(`⚠️ Aucune signature d'image valide trouvée`);
            console.log(`📊 Premiers bytes: ${Array.from(buffer.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
            return false;
        } catch (error) {
            console.error('❌ Erreur validation image:', error.message);
            return false;
        }
    }

    detectImageType(buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length < 10) {
            return null;
        }

        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'image/jpeg';
        }

        // PNG
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return 'image/png';
        }

        // WebP
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
            return 'image/webp';
        }

        // GIF
        if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
            return 'image/gif';
        }

        return null;
    }

    async initialize() {
        console.log('🎮 Initialisation de Friction Ultimate Bot...');

        try {
            // Initialiser la base de données
            await this.dbManager.initialize();
            console.log('✅ Base de données initialisée');

            // Initialiser la large database
            if (this.gameEngine.largeDB) {
                await this.gameEngine.largeDB.initialize();
                console.log('✅ Large Database initialisée');
            }

            // Initialiser les données du jeu (royaumes, ordres, etc.)
            await initializeGameData(this.dbManager);
            console.log('✅ Données du jeu initialisées');

            // Démarrer la connexion WhatsApp
            await this.startWhatsApp();

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            process.exit(1);
        }
    }

    async startWhatsApp() {
        console.log('📱 Démarrage de la connexion WhatsApp...');

        // Utiliser le SessionManager pour gérer les sessions
        const sessionManager = new SessionManager();
        const session = await sessionManager.getSession();

        const { state, saveCreds } = await useMultiFileAuthState(session.authDir); // Utilisation du répertoire de session

        this.sock = makeWASocket({
            auth: state,
            browser: [
                process.env.WHATSAPP_BROWSER_NAME || 'Friction Ultimate',
                process.env.WHATSAPP_BROWSER_TYPE || 'Desktop',
                process.env.WHATSAPP_BROWSER_VERSION || '1.0.0'
            ],
            logger: require('pino')({ level: 'error' }) // Reduce sensitive logging
        });

        // Gestion des événements de connexion
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                const now = Date.now();

                // Limitation des QR codes pour éviter la boucle infinie
                if (this.qrCodeAttempts >= this.maxQrCodeAttempts) {
                    console.log(`❌ Limite de QR codes atteinte (${this.maxQrCodeAttempts}). Arrêt pour éviter la boucle.`);
                    console.log('💡 Le serveur web continue de fonctionner sur le port 5000');
                    return;
                }

                if (now - this.lastQrCodeTime < this.qrCodeCooldown) {
                    console.log(`⏳ QR Code en cooldown (${Math.round((this.qrCodeCooldown - (now - this.lastQrCodeTime)) / 1000)}s restants)`);
                    return;
                }

                this.qrCodeAttempts++;
                this.lastQrCodeTime = now;

                console.log(`📱 QR Code généré (${this.qrCodeAttempts}/${this.maxQrCodeAttempts}) - Scannez avec WhatsApp:`);
                qrcode.generate(qr, { small: true });

                // Sauvegarder le QR code dans le SessionManager si nécessaire
                await sessionManager.saveQrCode(qr);
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connexion fermée, reconnexion:', shouldReconnect);

                // Vérifier si c'est un problème de clé privée invalide
                const errorMessage = lastDisconnect?.error?.message;
                if (errorMessage && errorMessage.includes('Invalid private key type')) {
                    console.log('⚠️ Erreur de clé privée détectée - arrêt des tentatives de reconnexion');
                    console.log('💡 Pour se connecter à WhatsApp, utilisez une vraie session ou scannez le QR code');
                    return; // Arrêter les tentatives de reconnexion
                }

                if (shouldReconnect) {
                    // Limiter le nombre de tentatives
                    if (!this.reconnectAttempts) this.reconnectAttempts = 0;
                    this.reconnectAttempts++;

                    if (this.reconnectAttempts > 5) {
                        console.log('❌ Trop de tentatives de reconnexion - arrêt');
                        console.log('💡 Le serveur web continue de fonctionner sur le port 5000');
                        return;
                    }

                    setTimeout(() => this.startWhatsApp(), 5000);
                } else {
                    // Si déconnecté (loggedOut), supprimer la session pour en créer une nouvelle
                    console.log('🔌 Déconnexion permanente. Suppression de la session.');
                    await sessionManager.deleteSession();
                    // Optionnellement, redémarrer complètement le bot ou le processus
                    // process.exit(0); // Ou redémarrer après un délai
                }
            } else if (connection === 'open') {
                console.log('✅ Connexion WhatsApp établie !');
                this.isConnected = true;

                // Initialiser le gestionnaire de boutons
                this.buttonManager = new WhatsAppButtonManager(this.sock);
                console.log('🔘 Gestionnaire de boutons interactifs initialisé');

                await this.sendWelcomeMessage();

                // Sauvegarder les informations de session une fois connecté
                await sessionManager.saveSession({
                    authDir: session.authDir,
                    isLoggedIn: true,
                    // Vous pourriez vouloir stocker d'autres métadonnées ici
                });
            }
        });

        // Sauvegarde des credentials avec gestion d'erreur améliorée
        this.sock.ev.on('creds.update', async (creds) => {
            try {
                await saveCreds(creds);
            } catch (error) {
                console.error('⚠️ Erreur sauvegarde credentials:', error.message);

                // Tenter de créer le dossier et réessayer
                if (error.code === 'ENOENT') {
                    try {
                        const fs = require('fs');
                        const path = require('path');
                        const authDir = path.join(process.cwd(), 'auth_info_baileys');
                        await fs.mkdir(authDir, { recursive: true });
                        console.log('📁 Dossier auth_info_baileys créé');

                        // Réessayer la sauvegarde
                        await saveCreds(creds);
                        console.log('✅ Credentials sauvegardés après création du dossier');
                    } catch (retryError) {
                        console.error('❌ Échec sauvegarde après création dossier:', retryError.message);
                    }
                }
            }
        });

        // Gestion des messages entrants
        this.sock.ev.on('messages.upsert', async (m) => {
            try {
                const message = m.messages[0];
                if (!message.key.fromMe && message.message) {
                    // Vérifier si c'est un vote de sondage (bouton simulé)
                    if (message.message.pollUpdateMessage) {
                        await this.handlePollVote(message);
                    } else {
                        await this.handleIncomingMessage(message);
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors du traitement du message upsert:', error.message);
                // Continuer sans arrêter le bot
            }
        });

        // Gestion des erreurs de déchiffrement
        this.sock.ev.on('creds.update', saveCreds);

        // SUPPRIMÉ: Deuxième handler connection.update dupliqué qui causait la boucle infinie de QR codes
        // Le seul handler qui reste est celui avec les limitations QR au-dessus

        console.log('📱 Bot WhatsApp initialisé');
    }

    async sendWelcomeMessage() {
        console.log('🎮 Bot Friction Ultimate prêt !');
        console.log('📱 En attente de messages WhatsApp...');
    }

    async handleIncomingMessage(message) {
        try {
            const from = message.key.remoteJid;
            const messageId = message.key.id;

            // CORRECTION CRITIQUE : Ignorer les messages de groupe sans participant
            // (c'est le premier événement du dupliqué de Baileys)
            if (from.includes('@g.us') && !message.key.participant) {
                console.log('⚠️ Message de groupe sans participant ignoré (doublon Baileys)');
                return;
            }

            // Récupérer les métadonnées du groupe si c'est un groupe
            let groupMetadata = null;
            let detectedKingdom = null;
            if (from.includes('@g.us')) {
                try {
                    groupMetadata = await this.sock.groupMetadata(from);
                    const groupName = groupMetadata.subject;

                    // Normaliser le nom du groupe pour gérer les caractères spéciaux
                    const normalizedGroupName = this.normalizeGroupName(groupName);
                    console.log(`📝 Nom groupe reçu: "${groupName}"`);
                    console.log(`🔤 Nom groupe normalisé: "${normalizedGroupName}"`);

                    // Détecter automatiquement le royaume via le nom du groupe normalisé
                    detectedKingdom = this.gameEngine.adminManager.detectKingdomFromGroupName(normalizedGroupName);

                    if (detectedKingdom) {
                        // Auto-assigner le groupe au royaume détecté
                        this.gameEngine.adminManager.kingdomGroups.set(from, detectedKingdom);
                        console.log(`🏰 Groupe "${groupName}" (normalisé: "${normalizedGroupName}") auto-assigné au royaume: ${detectedKingdom}`);
                    } else {
                        console.log(`🔍 Aucun royaume détecté pour "${groupName}" (normalisé: "${normalizedGroupName}")`);
                    }
                } catch (groupError) {
                    console.log('⚠️ Impossible de récupérer les métadonnées du groupe:', groupError.message);
                }
            }

            // Système de déduplication basé sur l'ID unique du message par chat
            const messageKey = `${from}:${messageId}`;
            const now = Date.now();

            if (this.processedMessages.has(messageKey)) {
                const lastProcessed = this.processedMessages.get(messageKey);
                console.log(`⚠️ Message déjà traité ignoré: ${messageKey} (il y a ${now - lastProcessed}ms)`);
                return;
            }

            // Marquer le message comme traité
            this.processedMessages.set(messageKey, now);

            // Nettoyage du cache - garder seulement les messages des 10 dernières minutes
            this.cleanupCache();

            const messageText = this.extractMessageText(message);
            const messageImage = await this.extractMessageImage(message);

            // Si pas de texte ni d'image, ignorer
            if (!messageText && !messageImage) {
                console.log('⚠️ Message ignoré: pas de texte ni d\'image');
                return;
            }

            // Log des types de message pour debug
            if (messageImage) {
                console.log('📸 Message avec image détecté');
            }
            if (messageText) {
                console.log(`📝 Message texte: "${messageText}"`);
                // Détecter si le message contient des polices spéciales
                if (messageText !== this.normalizeStyledText(messageText)) {
                    console.log(`🎨 Police spéciale détectée - normalisé: "${this.normalizeStyledText(messageText)}"`);
                }
            }

            // Extraction CORRECTE du numéro WhatsApp du joueur
            let playerNumber;
            if (from.includes('@g.us')) {
                // Message de groupe - TOUJOURS utiliser le participant (utilisateur réel)
                playerNumber = message.key.participant;
                if (!playerNumber) {
                    console.log('⚠️ Message de groupe sans participant - ignoré');
                    return;
                }
            } else {
                // Message privé - utiliser l'expéditeur direct
                playerNumber = from;
            }

            // Nettoyer les formats @lid et autres suffixes pour avoir un ID propre
            if (playerNumber.includes(':')) {
                playerNumber = playerNumber.split(':')[0];
            }

            console.log(`📨 Message de ${playerNumber}: ${messageText || '[image]'}`);
            console.log(`🔍 ID utilisateur: "${playerNumber}" | Chat: "${from}"`);

            // Traitement spécial pour l'administrateur
            if (playerNumber.includes('48198576038116')) {
                console.log(`👑 ID administrateur détecté: ${playerNumber}`);
            }

            // Traitement du message par le moteur de jeu
            const normalizedMessage = messageText ? this.normalizeStyledText(messageText.trim()) : null;

            // Ajouter des logs pour debugging
            if (messageImage) {
                console.log(`📸 Image reçue de ${playerNumber}: ${messageImage.mimetype}, ${messageImage.buffer.length} bytes`);
            }

            const result = await this.gameEngine.processPlayerMessage({
                playerNumber,
                chatId: from,
                message: normalizedMessage,
                originalMessage: messageText, // Garder l'original pour l'affichage
                imageMessage: messageImage,
                originalMessageObj: message,
                sock: this.sock,
                dbManager: this.dbManager,
                imageGenerator: this.imageGenerator
            });

            // FRICTIA AI - Connectée à TOUTES les commandes et conversations
            if (messageText) {
                try {
                    const groupName = groupMetadata?.subject || 'Conversation privée';
                    const userName = playerNumber.split('@')[0];
                    const isGroup = from.includes('@g.us');
                    const isDirectlyMentioned = messageText.toLowerCase().includes('frictia') || messageText.toLowerCase().includes('erza');

                    // Traiter les commandes spéciales de Frictia/Erza d'abord
                    if (messageText.startsWith('/') || messageText.startsWith('!') || isDirectlyMentioned) {
                        const command = messageText.replace(/^[\/!]/, '').trim().split(' ')[0];
                        const commandResponse = await this.frictiaAI.handleCommand(command, userName);

                        if (commandResponse) {
                            // Envoyer la réponse de commande Frictia immédiatement
                            setTimeout(async () => {
                                await this.sendResponse(from, {
                                    text: `⚔️ **Frictia (Erza Scarlet)** ⚔️\n\n${commandResponse}`
                                });
                                this.frictiaAI.updateLastActivity(from);
                            }, 500);
                        }
                    }

                    // Ajouter TOUS les messages au contexte (groupes ET privé)
                    this.frictiaAI.addToConversationHistory(from, userName, messageText);

                    // Frictia peut répondre dans TOUTES les situations (connectée à tout)
                    const shouldFrictiaRespond = isDirectlyMentioned ||
                                               this.frictiaAI.shouldRespond(messageText, from, isDirectlyMentioned);

                    if (shouldFrictiaRespond) {
                        // Obtenir le contexte de conversation
                        const conversationContext = this.frictiaAI.getConversationContext(from);

                        // Générer une réponse de Frictia/Erza
                        const frictiaResponse = await this.frictiaAI.generateResponse(
                            messageText,
                            groupName,
                            userName,
                            conversationContext
                        );

                        if (frictiaResponse) {
                            // Délai différent selon si c'est mention directe ou spontané
                            const delay = isDirectlyMentioned ? 1000 : (3000 + Math.random() * 4000);

                            setTimeout(async () => {
                                // Ajouter sticker Erza aléatoire parfois
                                const useSticker = Math.random() < 0.3;
                                const stickerText = useSticker ? ` ${this.frictiaAI.getRandomErzaSticker()}` : '';

                                await this.sendResponse(from, {
                                    text: `${frictiaResponse}${stickerText}`
                                });

                                // Mettre à jour la dernière activité
                                this.frictiaAI.updateLastActivity(from);

                                // Ajouter la réponse de Frictia au contexte
                                this.frictiaAI.addToConversationHistory(from, 'Frictia', frictiaResponse);
                            }, delay);
                        }
                    }
                } catch (frictiaError) {
                    console.log('⚠️ Erreur Frictia AI:', frictiaError.message);
                }
            }

            // Envoi de la réponse unifiée du jeu
            setTimeout(async () => {
                await this.sendResponse(from, result);
            }, 100);

        } catch (error) {
            console.error('❌ Erreur lors du traitement du message:', error);
            await this.sendResponse(message.key.remoteJid, {
                text: "❌ Une erreur s'est produite. Veuillez réessayer."
            });
        }
    }

    extractMessageText(message) {
        let text = null;

        if (message.message?.conversation) {
            text = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            text = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage?.caption) {
            text = message.message.imageMessage.caption;
        } else if (message.message?.videoMessage?.caption) {
            text = message.message.videoMessage.caption;
        }

        // Normaliser les polices spéciales et caractères Unicode
        if (text) {
            // Convertir les polices stylées en texte normal
            text = this.normalizeStyledText(text);
        }

        return text;
    }

    normalizeStyledText(text) {
        if (!text) return text;

        // Mapping des caractères stylés vers du texte normal
        const styleMap = {
            // Bold Mathematical (𝐀-𝐳)
            '𝐀': 'A', '𝐁': 'B', '𝐂': 'C', '𝐃': 'D', '𝐄': 'E', '𝐅': 'F', '𝐆': 'G', '𝐇': 'H', '𝐈': 'I', '𝐉': 'J',
            '𝐊': 'K', '𝐋': 'L', '𝐌': 'M', '𝐍': 'N', '𝐎': 'O', '𝐏': 'P', '𝐐': 'Q', '𝐑': 'R', '𝐒': 'S', '𝐓': 'T',
            '𝐔': 'U', '𝐕': 'V', '𝐖': 'W', '𝐗': 'X', '𝐘': 'Y', '𝐙': 'Z',
            '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e', '𝐟': 'f', '𝐠': 'g', '𝐡': 'h', '𝐢': 'i', '𝐣': 'j',
            '𝐤': 'k', '𝐥': 'l', '𝐦': 'm', '𝐧': 'n', '𝐨': 'o', '𝐩': 'p', '𝐪': 'q', '𝐫': 'r', '𝐬': 's', '𝐭': 't',
            '𝐮': 'u', '𝐯': 'v', '𝐰': 'w', '𝐱': 'x', '𝐲': 'y', '𝐳': 'z',

            // Small Capitals (ᴀ-ᴢ)
            'ᴀ': 'A', 'ʙ': 'B', 'ᴄ': 'C', 'ᴅ': 'D', 'ᴇ': 'E', 'ғ': 'F', 'ɢ': 'G', 'ʜ': 'H', 'ɪ': 'I', 'ᴊ': 'J',
            'ᴋ': 'K', 'ʟ': 'L', 'ᴍ': 'M', 'ɴ': 'N', 'ᴏ': 'O', 'ᴘ': 'P', 'Q': 'Q', 'ʀ': 'R', 'ꜱ': 'S', 'ᴛ': 'T',
            'ᴜ': 'U', 'ᴠ': 'V', 'ᴡ': 'W', 'x': 'X', 'ʏ': 'Y', 'ᴢ': 'Z',

            // Circled characters (Ⓐ-ⓩ)
            'Ⓐ': 'A', 'Ⓑ': 'B', 'Ⓒ': 'C', 'Ⓓ': 'D', 'Ⓔ': 'E', 'Ⓕ': 'F', 'Ⓖ': 'G', 'Ⓗ': 'H', 'Ⓘ': 'I', 'Ⓙ': 'J',
            'Ⓚ': 'K', 'Ⓛ': 'L', 'Ⓜ': 'M', 'Ⓝ': 'N', 'Ⓞ': 'O', 'Ⓟ': 'P', 'Ⓠ': 'Q', 'Ⓡ': 'R', 'Ⓢ': 'S', 'Ⓣ': 'T',
            'Ⓤ': 'U', 'Ⓥ': 'V', 'Ⓦ': 'W', 'Ⓧ': 'X', 'Ⓨ': 'Y', 'Ⓩ': 'Z',

            // Autres caractères spéciaux courants
            '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10'
        };

        let normalizedText = text;

        // Remplacer les caractères stylés
        for (const [styled, normal] of Object.entries(styleMap)) {
            normalizedText = normalizedText.replace(new RegExp(styled, 'g'), normal);
        }

        // Normaliser la casse pour détecter les commandes
        return normalizedText;
    }

    /**
     * Normalise les noms de groupe avec caractères spéciaux
     */
    normalizeGroupName(groupName) {
        if (!groupName) return '';

        try {
            // Normalisation Unicode complète
            let normalized = groupName.normalize('NFKD');

            // Remplacer les caractères accentués par leurs équivalents de base
            normalized = normalized.replace(/[\u0300-\u036f]/g, ''); // Supprimer les diacritiques

            // Mapping spécial pour les caractères stylés WhatsApp
            const unicodeMap = {
                // Caractères stylés bold
                '𝐀': 'A', '𝐁': 'B', '𝐂': 'C', '𝐃': 'D', '𝐄': 'E', '𝐅': 'F', '𝐆': 'G', '𝐇': 'H', '𝐈': 'I', '𝐉': 'J',
                '𝐊': 'K', '𝐋': 'L', '𝐌': 'M', '𝐍': 'N', '𝐎': 'O', '𝐏': 'P', '𝐐': 'Q', '𝐑': 'R', '𝐒': 'S', '𝐓': 'T',
                '𝐔': 'U', '𝐕': 'V', '𝐖': 'W', '𝐗': 'X', '𝐘': 'Y', '𝐙': 'Z',
                '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e', '𝐟': 'f', '𝐠': 'g', '𝐡': 'h', '𝐢': 'i', '𝐣': 'j',
                '𝐤': 'k', '𝐥': 'l', '𝐦': 'm', '𝐧': 'n', '𝐨': 'o', '𝐩': 'p', '𝐪': 'q', '𝐫': 'r', '𝐬': 's', '𝐭': 't',
                '𝐮': 'u', '𝐯': 'v', '𝐰': 'w', '𝐱': 'x', '𝐲': 'y', '𝐳': 'z',

                // Caractères fancy et stylisés
                'ᴀ': 'A', 'ʙ': 'B', 'ᴄ': 'C', 'ᴅ': 'D', 'ᴇ': 'E', 'ғ': 'F', 'ɢ': 'G', 'ʜ': 'H', 'ɪ': 'I', 'ᴊ': 'J',
                'ᴋ': 'K', 'ʟ': 'L', 'ᴍ': 'M', 'ɴ': 'N', 'ᴏ': 'O', 'ᴘ': 'P', 'ʀ': 'R', 'ꜱ': 'S', 'ᴛ': 'T',
                'ᴜ': 'U', 'ᴠ': 'V', 'ᴡ': 'W', 'ʏ': 'Y', 'ᴢ': 'Z',

                // Caractères encerclés
                'Ⓐ': 'A', 'Ⓑ': 'B', 'Ⓒ': 'C', 'Ⓓ': 'D', 'Ⓔ': 'E', 'Ⓕ': 'F', 'Ⓖ': 'G', 'Ⓗ': 'H', 'Ⓘ': 'I', 'Ⓙ': 'J',
                'Ⓚ': 'K', 'Ⓛ': 'L', 'Ⓜ': 'M', 'Ⓝ': 'N', 'Ⓞ': 'O', 'Ⓟ': 'P', 'Ⓠ': 'Q', 'Ⓡ': 'R', 'Ⓢ': 'S', 'Ⓣ': 'T',
                'Ⓤ': 'U', 'Ⓥ': 'V', 'Ⓦ': 'W', 'Ⓧ': 'X', 'Ⓨ': 'Y', 'Ⓩ': 'Z',
                'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e', 'ⓕ': 'f', 'ⓖ': 'g', 'ⓗ': 'h', 'ⓘ': 'i', 'ⓙ': 'j',
                'ⓚ': 'k', 'ⓛ': 'l', 'ⓜ': 'm', 'ⓝ': 'n', 'ⓞ': 'o', 'ⓟ': 'p', 'ⓠ': 'q', 'ⓡ': 'r', 'ⓢ': 's', 'ⓣ': 't',
                'ⓤ': 'u', 'ⓥ': 'v', 'ⓦ': 'w', 'ⓧ': 'x', 'ⓨ': 'y', 'ⓩ': 'z',

                // Émojis de lettres
                '🅰': 'A', '🅱': 'B', '🅲': 'C', '🅳': 'D', '🅴': 'E', '🅵': 'F', '🅶': 'G', '🅷': 'H', '🅸': 'I', '🅹': 'J',
                '🅺': 'K', '🅻': 'L', '🅼': 'M', '🅽': 'N', '🅾': 'O', '🅿': 'P', '🆀': 'Q', '🆁': 'R', '🆂': 'S', '🆃': 'T',
                '🆄': 'U', '🆅': 'V', '🆆': 'W', '🆇': 'X', '🆈': 'Y', '🆉': 'Z',

                // Lettres avec carrés
                '🄰': 'A', '🄱': 'B', '🄲': 'C', '🄳': 'D', '🄴': 'E', '🄵': 'F', '🄶': 'G', '🄷': 'H', '🄸': 'I', '🄹': 'J',
                '🄺': 'K', '🄻': 'L', '🄼': 'M', '🄽': 'N', '🄾': 'O', '🄿': 'P', '🅀': 'Q', '🅁': 'R', '🅂': 'S', '🅃': 'T',
                '🅄': 'U', '🅅': 'V', '🅆': 'W', '🅇': 'X', '🅈': 'Y', '🅉': 'Z',

                // Caractères spéciaux de ponctuation
                '‹': '<', '›': '>', '«': '"', '»': '"', '„': '"', '"': '"', '"': '"', ''': "'", ''': "'",
                '…': '...', '–': '-', '—': '-', '•': '*', '·': '.', '‚': ',', '‛': "'",

                // Autres caractères stylés communs
                'ʌ': 'v', 'ʌ': 'A', 'ɐ': 'a', 'ɯ': 'm', 'ɹ': 'r', 'ɾ': 'r', 'ʇ': 't', 'ʎ': 'y'
            };

            // Appliquer le mapping des caractères spéciaux
            for (const [special, normal] of Object.entries(unicodeMap)) {
                normalized = normalized.replace(new RegExp(special, 'g'), normal);
            }

            console.log(`🔤 Normalisation nom groupe: "${groupName}" → "${normalized}"`);
            return normalized;

        } catch (error) {
            console.error('❌ Erreur normalisation nom groupe:', error);
            return groupName; // Retourner l'original en cas d'erreur
        }
    }

    async extractMessageImage(message) {
        try {
            let imageMessage = null;

            if (message.message?.imageMessage) {
                console.log('📸 Image détectée dans le message');
                imageMessage = message.message.imageMessage;
            } else if (message.message?.viewOnceMessage?.message?.imageMessage) {
                console.log('📸 Image view-once détectée');
                imageMessage = message.message.viewOnceMessage.message.imageMessage;
            }

            if (imageMessage) {
                console.log(`📥 Début téléchargement image - Type: ${imageMessage.mimetype}, Taille annoncée: ${imageMessage.fileLength || 'inconnue'}`);

                try {
                    const { downloadMediaMessage } = require('@whiskeysockets/baileys');

                    // Augmenter le timeout pour les grandes images
                    const downloadOptions = {
                        logger: require('pino')({ level: 'silent' }),
                        timeout: 90000 // 90 secondes pour les images plus lourdes
                    };

                    let buffer = null;
                    let attempts = 0;
                    const maxAttempts = 5; // Plus de tentatives

                    // Plusieurs tentatives de téléchargement
                    while (!buffer && attempts < maxAttempts) {
                        attempts++;
                        console.log(`📥 Tentative ${attempts}/${maxAttempts} de téléchargement...`);

                        try {
                            buffer = await downloadMediaMessage(message, 'buffer', downloadOptions);

                            if (buffer && buffer.length > 0) {
                                // Validation améliorée du buffer
                                if (!Buffer.isBuffer(buffer)) {
                                    console.log(`⚠️ Tentative ${attempts} - Buffer invalide (pas un Buffer)`);
                                    buffer = null;
                                    continue;
                                }

                                // Vérifier que c'est vraiment une image valide
                                const isValidImage = this.validateImageBuffer(buffer, imageMessage.mimetype);
                                if (!isValidImage) {
                                    console.log(`⚠️ Tentative ${attempts} - Image invalide ou corrompue`);
                                    buffer = null;
                                    continue;
                                }

                                console.log(`✅ Téléchargement réussi à la tentative ${attempts}`);
                                break;
                            } else {
                                console.log(`⚠️ Tentative ${attempts} échouée - buffer invalide`);
                                buffer = null;
                            }
                        } catch (attemptError) {
                            console.log(`⚠️ Tentative ${attempts} échouée:`, attemptError.message);
                            buffer = null;

                            if (attempts < maxAttempts) {
                                const waitTime = attempts * 1000; // Attente progressive
                                console.log(`⏱️ Attente de ${waitTime}ms avant nouvelle tentative...`);
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                            }
                        }
                    }

                    if (!buffer) {
                        console.log('❌ Toutes les tentatives de téléchargement ont échoué');
                        return null;
                    }

                    if (buffer.length === 0) {
                        console.log('❌ Buffer vide après téléchargement');
                        return null;
                    }

                    // Validation finale de la taille
                    if (buffer.length < 500) { // Minimum 500 bytes pour une image valide
                        console.log(`❌ Image trop petite: ${buffer.length} bytes (minimum: 500 bytes)`);
                        return null;
                    }

                    if (buffer.length > 10 * 1024 * 1024) { // Maximum 10MB
                        console.log(`❌ Image trop grosse: ${buffer.length} bytes (maximum: 10MB)`);
                        return null;
                    }

                    console.log(`✅ Image téléchargée avec succès: ${buffer.length} bytes`);

                    // Valider que c'est bien une image avec vérification étendue
                    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    let mimetype = (imageMessage.mimetype || 'image/jpeg').toLowerCase();

                    if (!validImageTypes.includes(mimetype)) {
                        console.log(`⚠️ Type d'image non supporté: ${mimetype} - Types acceptés: ${validImageTypes.join(', ')}`);
                        // Essayer de détecter le type à partir des bytes
                        mimetype = this.detectImageType(buffer) || 'image/jpeg';
                        console.log(`🔄 Type détecté/par défaut: ${mimetype}`);
                    }

                    const imageData = {
                        buffer: buffer,
                        mimetype: mimetype,
                        caption: imageMessage.caption || '',
                        width: imageMessage.width || 0,
                        height: imageMessage.height || 0,
                        fileLength: imageMessage.fileLength || buffer.length,
                        sha256: imageMessage.fileSha256?.toString('hex') || null,
                        downloadTimestamp: Date.now(),
                        isValidated: true
                    };

                    console.log(`📊 Image extraite - Taille: ${buffer.length} bytes, Type: ${mimetype}, Dimensions: ${imageData.width}x${imageData.height}`);
                    return imageData;

                } catch (downloadError) {
                    console.error('❌ Erreur téléchargement principal:', downloadError.message);
                    console.error('❌ Type erreur:', downloadError.name);
                    console.error('❌ Code erreur:', downloadError.code);

                    // Tentative alternative de téléchargement via stream
                    try {
                        console.log('🔄 Tentative alternative via stream...');
                        const { downloadMediaMessage } = require('@whiskeysockets/baileys');

                        const stream = await downloadMediaMessage(message, 'stream', {
                            logger: require('pino')({ level: 'silent' }),
                            timeout: 45000 // Plus de temps pour le stream
                        });

                        if (stream) {
                            console.log('📥 Stream obtenu, assemblage des chunks...');
                            const chunks = [];
                            let totalSize = 0;

                            for await (const chunk of stream) {
                                chunks.push(chunk);
                                totalSize += chunk.length;
                                console.log(`📦 Chunk reçu: ${chunk.length} bytes (total: ${totalSize})`);
                            }

                            const buffer = Buffer.concat(chunks);

                            if (buffer.length > 0) {
                                console.log(`✅ Image téléchargée via stream: ${buffer.length} bytes`);
                                return {
                                    buffer: buffer,
                                    mimetype: imageMessage.mimetype || 'image/jpeg',
                                    caption: imageMessage.caption || '',
                                    width: imageMessage.width || 0,
                                    height: imageMessage.height || 0,
                                    fileLength: buffer.length,
                                    sha256: imageMessage.fileSha256?.toString('hex') || null,
                                    downloadTimestamp: Date.now(),
                                    downloadMethod: 'stream'
                                };
                            } else {
                                console.log('❌ Stream assemblé mais buffer vide');
                            }
                        } else {
                            console.log('❌ Stream null reçu');
                        }
                    } catch (streamError) {
                        console.error('❌ Erreur téléchargement stream:', streamError.message);
                        console.error('❌ Stack stream:', streamError.stack);
                    }

                    console.log('❌ Toutes les méthodes de téléchargement ont échoué');
                    return null;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur GLOBALE téléchargement image:', error.message);
            console.error('❌ Stack trace complète:', error.stack);
            return null;
        }
    }

    async sendResponse(chatId, response) {
        try {
            // Envoi unifié : image avec texte complet, puis audio/vidéo si disponibles
            if (response.image) {
                await this.sock.sendMessage(chatId, {
                    image: response.image,
                    caption: response.text
                });
            } else {
                await this.sock.sendMessage(chatId, { text: response.text });
            }

            // Envoyer l'audio en tant que message vocal uniquement si disponible et valide
            if (response.audio) {
                try {
                    const fs = require('fs');
                    let audioBuffer = null;

                    if (Buffer.isBuffer(response.audio)) {
                        audioBuffer = response.audio;
                    } else if (typeof response.audio === 'string') {
                        try {
                            await fs.promises.access(response.audio);
                            audioBuffer = await fs.promises.readFile(response.audio);
                            console.log(`✅ Audio lu: ${response.audio}`);
                        } catch (fileError) {
                            console.log(`⚠️ Audio non trouvé: ${response.audio}`);
                        }
                    }

                    if (audioBuffer && audioBuffer.length > 100) { // Au moins 100 bytes pour être valide
                        await this.sock.sendMessage(chatId, {
                            audio: audioBuffer,
                            mimetype: 'audio/mpeg',
                            ptt: true,
                            seconds: Math.min(60, Math.max(5, Math.round(response.text.length / 15)))
                        });
                        console.log(`✅ Audio envoyé (${audioBuffer.length} bytes)`);

                        // Nettoyer le fichier temporaire
                        if (typeof response.audio === 'string') {
                            setTimeout(() => {
                                fs.unlink(response.audio, () => {});
                            }, 5000);
                        }
                    }
                } catch (audioError) {
                    console.log('⚠️ Audio ignoré:', audioError.message);
                }
            }

            // Envoyer la vidéo si disponible
            if (response.video) {
                setTimeout(async () => {
                    try {
                        const fs = require('fs');
                        console.log('🎬 Envoi vidéo - Type:', typeof response.video);
                        console.log('🎬 Envoi vidéo - Valeur:', response.video);

                        let videoBuffer;

                        if (typeof response.video === 'string') {
                            // C'est un chemin de fichier
                            await fs.promises.access(response.video);
                            videoBuffer = await fs.promises.readFile(response.video);
                            console.log(`✅ Vidéo lue depuis: ${response.video} (${videoBuffer.length} bytes)`);
                        } else if (Buffer.isBuffer(response.video)) {
                            // C'est déjà un buffer
                            videoBuffer = response.video;
                            console.log(`✅ Vidéo buffer directe (${videoBuffer.length} bytes)`);
                        } else {
                            throw new Error('Format de vidéo non supporté');
                        }

                        await this.sock.sendMessage(chatId, {
                            video: videoBuffer,
                            caption: '🎬 Vidéo de l\'action',
                            gifPlayback: false
                        });
                        console.log(`✅ Vidéo envoyée avec succès (${videoBuffer.length} bytes)`);

                        // Nettoyer le fichier temporaire si c'est un chemin
                        if (typeof response.video === 'string') {
                            setTimeout(() => {
                                fs.unlink(response.video, () => {});
                            }, 5000);
                        }
                    } catch (videoError) {
                        console.error('❌ Erreur vidéo détaillée:', videoError.message);
                        console.error('❌ Stack vidéo:', videoError.stack);
                    }
                }, 1000); // Réduire le délai à 1 seconde
            }

        } catch (error) {
            console.error('❌ Erreur envoi réponse:', error);
            try {
                await this.sock.sendMessage(chatId, { text: response.text });
            } catch (fallbackError) {
                console.error('❌ Erreur fallback:', fallbackError);
            }
        }
    }

    async handlePollVote(message) {
        try {
            const from = message.key.remoteJid;
            const voter = message.key.participant || from;

            console.log(`🗳️ Vote de sondage reçu de ${voter}`);

            // Pour l'instant, juste loguer le vote - vous pouvez ajouter la logique spécifique plus tard
            console.log('📊 Vote sondage détecté - Action bouton simulé');

            // Optionnel: envoyer une confirmation
            await this.sock.sendMessage(from, {
                text: '✅ Action reçue! (Bouton simulé activé)'
            });

        } catch (error) {
            console.error('❌ Erreur traitement vote sondage:', error);
        }
    }

    // Méthode de démonstration pour tester les boutons
    async demonstrateButtons(chatId) {
        if (!this.buttonManager) {
            console.log('⚠️ Gestionnaire de boutons non initialisé');
            return;
        }

        try {
            // Envoyer un message d'introduction
            await this.sock.sendMessage(chatId, {
                text: '🎮 Démonstration des boutons interactifs!\nVoici un menu simulé avec des sondages:'
            });

            // Attendre un peu
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Créer le menu principal du jeu
            await this.buttonManager.sendMainGameMenu(chatId);

        } catch (error) {
            console.error('❌ Erreur démonstration boutons:', error);
        }
    }

    // Méthode de nettoyage du cache pour éviter les fuites mémoire - OPTIMISÉE
    cleanupCache() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes (réduit de 10)
        const sizeBefore = this.processedMessages.size;

        // Supprimer les messages anciens
        let cleaned = 0;
        for (const [key, timestamp] of this.processedMessages.entries()) {
            if (now - timestamp > maxAge) {
                this.processedMessages.delete(key);
                cleaned++;
            }
        }

        // Si le cache est encore trop gros, supprimer les plus anciens
        if (this.processedMessages.size > this.maxCacheSize) {
            const entries = Array.from(this.processedMessages.entries())
                .sort((a, b) => a[1] - b[1]); // Trier par timestamp

            const toDelete = this.processedMessages.size - this.maxCacheSize;
            for (let i = 0; i < toDelete; i++) {
                this.processedMessages.delete(entries[i][0]);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cache: ${cleaned} entrées supprimées, taille: ${this.processedMessages.size}/${this.maxCacheSize}`);
        }

        // Si le cache est encore trop grand, garder seulement les plus récents
        if (this.processedMessages.size > this.maxCacheSize) {
            const sortedEntries = Array.from(this.processedMessages.entries())
                .sort((a, b) => b[1] - a[1]) // Trier par timestamp décroissant
                .slice(0, this.maxCacheSize); // Garder seulement les N plus récents

            this.processedMessages.clear();
            for (const [key, timestamp] of sortedEntries) {
                this.processedMessages.set(key, timestamp);
            }
        }

        const sizeAfter = this.processedMessages.size;
        if (sizeBefore !== sizeAfter) {
            console.log(`🧹 Cache nettoyé: ${sizeBefore} → ${sizeAfter} messages`);
        }
    }
}

// Démarrage du bot
const bot = new FrictionUltimateBot();

// Démarrer le serveur keep-alive pour UptimeRobot
require('./server/keepalive');

// Gestion propre de l'arrêt du processus
process.on('SIGINT', () => {
    console.log('🛑 Arrêt du bot...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
});

// Lancement du bot
bot.initialize().catch(console.error);

console.log('🎮 FRICTION ULTIMATE - Bot WhatsApp RPG');
console.log('🚀 Démarrage en cours...');