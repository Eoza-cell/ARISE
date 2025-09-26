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

class FrictionUltimateBot {
    constructor() {
        this.sock = null;
        // Initialiser le moteur de jeu avec accès à la base de données
        this.dbManager = new DatabaseManager();
        this.imageGenerator = new ImageGenerator();
        this.gameEngine = new GameEngine(this.dbManager);
        this.buttonManager = null; // Sera initialisé après la connexion
        this.isConnected = false;
        // Système de déduplication amélioré avec cache borné
        this.processedMessages = new Map(); // ID du message -> timestamp
        this.maxCacheSize = 1000; // Limite de cache pour éviter la fuite mémoire
        this.cacheCleanupInterval = 5 * 60 * 1000; // Nettoyer le cache toutes les 5 minutes

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

    async initialize() {
        console.log('🎮 Initialisation de Friction Ultimate Bot...');

        try {
            // Initialiser la base de données
            await this.dbManager.initialize();
            console.log('✅ Base de données initialisée');

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
                console.log('📱 QR Code généré - Scannez avec WhatsApp:');
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

        // Sauvegarde des credentials
        this.sock.ev.on('creds.update', saveCreds);

        // Gestion des messages entrants
        this.sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message.key.fromMe && message.message) {
                // Vérifier si c'est un vote de sondage (bouton simulé)
                if (message.message.pollUpdateMessage) {
                    await this.handlePollVote(message);
                } else {
                    await this.handleIncomingMessage(message);
                }
            }
        });
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
            // (c'est le premier événement dupliqué de Baileys)
            if (from.includes('@g.us') && !message.key.participant) {
                console.log('⚠️ Message de groupe sans participant ignoré (doublon Baileys)');
                return;
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
            const result = await this.gameEngine.processPlayerMessage({
                playerNumber,
                chatId: from,
                message: messageText ? messageText.trim() : null,
                imageMessage: messageImage,
                originalMessage: message,
                sock: this.sock,
                dbManager: this.dbManager,
                imageGenerator: this.imageGenerator
            });

            // Envoi de la réponse unifiée
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
        if (message.message?.conversation) {
            return message.message.conversation;
        }
        if (message.message?.extendedTextMessage?.text) {
            return message.message.extendedTextMessage.text;
        }
        return null;
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
                // Télécharger l'image avec la bonne méthode
                console.log('📥 Téléchargement de l\'image...');
                const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                const buffer = await downloadMediaMessage(message, 'buffer', {}, {
                    logger: require('pino')({ level: 'silent' })
                });

                if (buffer) {
                    console.log(`✅ Image téléchargée: ${buffer.length} bytes`);
                    return {
                        buffer: buffer,
                        mimetype: imageMessage.mimetype || 'image/jpeg',
                        caption: imageMessage.caption || '',
                        width: imageMessage.width || 0,
                        height: imageMessage.height || 0
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur téléchargement image:', error);
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

    // Méthode de nettoyage du cache pour éviter les fuites mémoire
    cleanupCache() {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 minutes
        const sizeBefore = this.processedMessages.size;

        // Supprimer les messages anciens
        for (const [key, timestamp] of this.processedMessages.entries()) {
            if (now - timestamp > maxAge) {
                this.processedMessages.delete(key);
            }
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