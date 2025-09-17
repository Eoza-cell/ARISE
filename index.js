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
const { initializeGameData } = require('./data/GameData');

class FrictionUltimateBot {
    constructor() {
        this.sock = null;
        // Initialiser le moteur de jeu avec accès à la base de données
        this.dbManager = new DatabaseManager();
        this.gameEngine = new GameEngine(this.dbManager);
        this.imageGenerator = new ImageGenerator();
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
                await this.sendWelcomeMessage();
            }
        });

        // Sauvegarde des credentials
        this.sock.ev.on('creds.update', saveCreds);

        // Gestion des messages entrants
        this.sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message.key.fromMe && message.message) {
                await this.handleIncomingMessage(message);
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

            // Envoi de la réponse texte d'abord
            setTimeout(async () => {
                await this.sendResponse(from, {
                    text: result.text,
                    image: result.image,
                    sticker: result.sticker,
                    isGuide: result.isGuide,
                    audio: result.audio, // Assurez-vous que le résultat du jeu contient un champ 'audio'
                    video: result.video
                });

                // Envoyer la vidéo si générée (avec délai pour éviter les conflits)
                if (result.video) {
                    setTimeout(async () => {
                        try {
                            const fs = require('fs');
                            const videoBuffer = await fs.promises.readFile(result.video);
                            await this.sock.sendMessage(from, {
                                video: videoBuffer,
                                caption: `🎬 Vidéo de l'action de ${result.character ? result.character.name : 'votre personnage'}`,
                                gifPlayback: false
                            });
                            console.log(`✅ Vidéo envoyée: ${result.video}`);

                            // Nettoyer le fichier vidéo après envoi
                            setTimeout(() => {
                                fs.unlink(result.video, (err) => {
                                    if (err) console.log('⚠️ Impossible de supprimer la vidéo:', err.message);
                                    else console.log(`🗑️ Vidéo supprimée: ${result.video}`);
                                });
                            }, 5000);
                        } catch (videoError) {
                            console.error('❌ Erreur envoi vidéo:', videoError);
                        }
                    }, 2000);
                }
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

            // Envoyer la réponse avec support audio amélioré
            if (response.image && response.video && response.audio) {
                // Envoyer l'image avec le texte
                await this.sock.sendMessage(chatId, {
                    image: response.image,
                    caption: response.text
                });

                // Puis l'audio si disponible
                try {
                    await this.sock.sendMessage(chatId, {
                        audio: response.audio,
                        mimetype: 'audio/mpeg',
                        ptt: true, // Voice message
                        seconds: 10
                    });
                    console.log('✅ Message vocal envoyé');
                } catch (audioError) {
                    console.log('⚠️ Erreur envoi audio:', audioError.message);
                }

                // Puis la vidéo
                await this.sock.sendMessage(chatId, {
                    video: response.video,
                    caption: '🎬 Vidéo de l\'action'
                });
            } else if (response.image && response.audio) {
                // Envoyer l'image avec le texte
                await this.sock.sendMessage(chatId, {
                    image: response.image,
                    caption: response.text
                });

                // Puis l'audio comme message vocal
                try {
                    await this.sock.sendMessage(chatId, {
                        audio: response.audio,
                        mimetype: 'audio/mpeg',
                        ptt: true, // Voice message
                        seconds: 15
                    });
                    console.log('✅ Message vocal envoyé');
                } catch (audioError) {
                    console.log('⚠️ Erreur envoi message vocal:', audioError.message);
                }
            } else if (response.image && response.video) {
                // Envoyer l'image d'abord
                await this.sock.sendMessage(chatId, {
                    image: response.image,
                    caption: response.text
                });

                // Puis la vidéo
                await this.sock.sendMessage(chatId, {
                    video: response.video,
                    caption: '🎬 Vidéo de l\'action'
                });
            } else if (response.image) {
                await this.sock.sendMessage(chatId, {
                    image: response.image,
                    caption: response.text
                });
            } else if (response.audio) {
                // Envoyer d'abord le texte
                await this.sock.sendMessage(chatId, { text: response.text });

                // Puis l'audio comme message vocal avec buffer
                try {
                    const fs = require('fs');
                    
                    let audioBuffer = null;
                    let audioPath = null;
                    
                    // Si response.audio est déjà un buffer
                    if (Buffer.isBuffer(response.audio)) {
                        audioBuffer = response.audio;
                        console.log('✅ Audio reçu comme buffer');
                    } 
                    // Si c'est un chemin de fichier
                    else if (typeof response.audio === 'string') {
                        audioPath = response.audio;
                        try {
                            await fs.promises.access(audioPath);
                            audioBuffer = await fs.promises.readFile(audioPath);
                            console.log(`✅ Audio lu depuis fichier: ${audioPath}`);
                        } catch (fileError) {
                            console.log(`⚠️ Fichier audio introuvable: ${audioPath}`, fileError.message);
                            audioBuffer = null;
                        }
                    }
                    
                    // Envoyer l'audio si on a un buffer valide
                    if (audioBuffer && audioBuffer.length > 0) {
                        // Déterminer le mimetype selon l'extension
                        let mimetype = 'audio/mpeg';
                        if (audioPath && audioPath.endsWith('.wav')) {
                            mimetype = 'audio/wav';
                        } else if (audioPath && audioPath.endsWith('.ogg')) {
                            mimetype = 'audio/ogg';
                        }
                        
                        await this.sock.sendMessage(chatId, {
                            audio: audioBuffer,
                            mimetype: mimetype,
                            ptt: true, // Voice message
                            seconds: Math.min(60, Math.max(5, Math.round(response.text.length / 15)))
                        });
                        console.log(`✅ Message vocal envoyé (${mimetype}, ${audioBuffer.length} bytes)`);
                        
                        // Nettoyer le fichier temporaire si c'était un chemin
                        if (audioPath) {
                            setTimeout(() => {
                                fs.unlink(audioPath, (err) => {
                                    if (!err) console.log(`🗑️ Fichier audio supprimé: ${audioPath}`);
                                });
                            }, 5000);
                        }
                    } else {
                        console.log('⚠️ Aucun audio valide à envoyer - buffer vide ou inexistant');
                    }
                    
                } catch (audioError) {
                    console.log('⚠️ Erreur envoi audio:', audioError.message);
                    console.log('Stack trace:', audioError.stack);
                }
            } else if (response.video) {
                await this.sock.sendMessage(chatId, {
                    video: response.video,
                    caption: response.text
                });
            } else {
                await this.sock.sendMessage(chatId, { text: response.text });
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de la réponse:', error);

            // Fallback en cas d'erreur avec l'image
            if (response.image && response.text) {
                try {
                    console.log('🔄 Tentative d\'envoi de texte seul...');
                    await this.sock.sendMessage(chatId, {
                        text: response.text
                    });
                } catch (fallbackError) {
                    console.error('❌ Erreur fallback:', fallbackError);
                }
            }
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