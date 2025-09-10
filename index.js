// Friction Ultimate - Bot WhatsApp RPG
// Bot WhatsApp autonome en Node.js avec système RPG complet

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
        this.gameEngine = new GameEngine();
        this.dbManager = new DatabaseManager();
        this.imageGenerator = new ImageGenerator();
        this.isConnected = false;
        this.processedMessages = new Set(); // Système de déduplication
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
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['Friction Ultimate', 'Desktop', '1.0.0']
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
            const sender = message.key.participant || from;
            const messageText = this.extractMessageText(message);
            const messageId = message.key.id;
            
            if (!messageText) return;

            // Système de déduplication amélioré - inclure chatId et timestamp pour éviter les doublons sur retries WhatsApp
            const timestamp = Math.floor(Date.now() / 5000); // Fenêtre de 5 secondes
            const uniqueKey = `${from}-${sender}-${messageText.trim()}-${timestamp}`;
            
            if (this.processedMessages.has(uniqueKey)) {
                console.log(`⚠️ Message dupliqué ignoré: ${messageText} (même sender dans la fenêtre de 5s)`);
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

            console.log(`📨 Message de ${sender}: ${messageText}`);

            // Extraction du numéro WhatsApp du joueur
            const playerNumber = sender.split('@')[0];
            
            // Traitement du message par le moteur de jeu
            const response = await this.gameEngine.processPlayerMessage({
                playerNumber,
                chatId: from,
                message: messageText.trim(),
                dbManager: this.dbManager,
                imageGenerator: this.imageGenerator
            });

            // Envoi de la réponse (avec petit délai pour éviter les doublons)
            setTimeout(async () => {
                await this.sendResponse(from, response);
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

    async sendResponse(chatId, response) {
        try {
            if (response.image) {
                // Envoi d'image avec texte
                await this.sock.sendMessage(chatId, {
                    image: response.image,
                    caption: response.text
                });
            } else if (response.text) {
                // Envoi de texte simple
                await this.sock.sendMessage(chatId, {
                    text: response.text
                });
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de la réponse:', error);
        }
    }
}

// Démarrage du bot
const bot = new FrictionUltimateBot();

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