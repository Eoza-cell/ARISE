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

class FrictionUltimateBot {
    constructor() {
        this.sock = null;
        // Initialiser le moteur de jeu avec accès à la base de données
        this.dbManager = new DatabaseManager();
        this.gameEngine = new GameEngine(this.dbManager);
        this.imageGenerator = new ImageGenerator();
        this.buttonManager = null; // Sera initialisé après la connexion
        this.isConnected = false;
        this.processedMessages = new Set(); // Système de déduplication

        // Injecter le client Groq dans l'ImageGenerator pour optimisation des prompts
        this.imageGenerator.setGroqClient(this.gameEngine.groqClient);
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

        // Use environment variable for auth state path for security
        const authInfoPath = process.env.WHATSAPP_AUTH_PATH || 'auth_info';
        const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);

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
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connexion fermée, reconnexion:', shouldReconnect);

                if (shouldReconnect) {
                    setTimeout(() => this.startWhatsApp(), 3000);
                }
            } else if (connection === 'open') {
                console.log('✅ Connexion WhatsApp établie !');
                this.isConnected = true;
                
                // Initialiser le gestionnaire de boutons
                this.buttonManager = new WhatsAppButtonManager(this.sock);
                console.log('🔘 Gestionnaire de boutons interactifs initialisé');
                
                await this.sendWelcomeMessage();
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
            const messageText = this.extractMessageText(message);
            const messageImage = this.extractMessageImage(message);
            const messageId = message.key.id;

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

            // Gestion des groupes : ignorer les messages sans participant (doublons) SAUF pour les images
            if (from.includes('@g.us') && !message.key.participant && !messageImage) {
                console.log(`⚠️ Message de groupe sans participant ignoré (doublon): ${messageText}`);
                return;
            }

            // Définir le vrai expéditeur pour l'affichage et la déduplication
            const realSender = message.key.participant || from;

            // Déduplication basée sur messageId + contenu du message (plus robuste)
            const messageTextForKey = messageText ? messageText.trim() : '';
            const uniqueKey = `${messageId}-${messageTextForKey}`;

            if (this.processedMessages.has(uniqueKey)) {
                console.log(`⚠️ Message dupliqué ignoré: ${messageText} (messageId: ${messageId})`);
                return;
            }

            this.processedMessages.add(uniqueKey);

            // Nettoyer la cache toutes les 500 messages pour éviter les fuites mémoire
            if (this.processedMessages.size > 500) {
                // Garder seulement les 100 derniers pour performance
                const recentMessages = Array.from(this.processedMessages).slice(-100);
                this.processedMessages.clear();
                recentMessages.forEach(key => this.processedMessages.add(key));
            }

            console.log(`📨 Message de ${realSender}: ${messageText}`);

            // Extraction du numéro WhatsApp du joueur (gestion des groupes)
            let playerNumber;
            if (message.key.participant) {
                // Message de groupe - utiliser le participant (l'utilisateur réel)
                playerNumber = message.key.participant.split('@')[0];
            } else {
                // Message privé - utiliser l'expéditeur direct
                playerNumber = from.split('@')[0];
            }

            // Nettoyer les formats @lid 
            if (playerNumber.includes(':')) {
                playerNumber = playerNumber.split(':')[0];
            }

            // Traitement du message par le moteur de jeu
            const result = await this.gameEngine.processPlayerMessage({
                playerNumber,
                chatId: from,
                message: messageText ? messageText.trim() : null,
                imageMessage: messageImage,
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

    extractMessageImage(message) {
        if (message.message?.imageMessage) {
            console.log('📸 Image détectée dans le message');
            return message.message.imageMessage;
        }
        if (message.message?.viewOnceMessage?.message?.imageMessage) {
            console.log('📸 Image view-once détectée');
            return message.message.viewOnceMessage.message.imageMessage;
        }
        return null;
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
                        const videoBuffer = await fs.promises.readFile(response.video);
                        await this.sock.sendMessage(chatId, {
                            video: videoBuffer,
                            caption: '🎬 Vidéo de l\'action',
                            gifPlayback: false
                        });
                        console.log(`✅ Vidéo envoyée: ${response.video}`);

                        setTimeout(() => {
                            fs.unlink(response.video, () => {});
                        }, 5000);
                    } catch (videoError) {
                        console.log('⚠️ Erreur vidéo:', videoError.message);
                    }
                }, 2000);
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