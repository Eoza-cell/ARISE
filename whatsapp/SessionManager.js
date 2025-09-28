const fs = require('fs');
const path = require('path');

class SessionManager {
    constructor() {
        // Session ID encodée - remplacez par votre propre session
        this.encodedSession = process.env.WHATSAPP_SESSION || this.getDefaultSession();
        this.sessionPath = 'session_data';
    }

    getDefaultSession() {
        // Retourner null pour forcer l'utilisation du système QR natif de Baileys
        return null;
    }

    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async initializeSession() {
        console.log('🔐 Initialisation de la session WhatsApp...');

        try {
            // Utiliser uniquement le système d'authentification QR natif de Baileys
            console.log('📱 Démarrage en mode QR Code');
            console.log('💡 Scannez le QR Code avec WhatsApp pour vous connecter');

            // Créer le dossier d'authentification par défaut
            const authDir = 'auth_info_baileys';
            if (!fs.existsSync(authDir)) {
                fs.mkdirSync(authDir, { recursive: true });
                console.log('📁 Dossier d\'authentification créé');
            }

            return authDir;

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de la session:', error);
            return 'auth_info_baileys';
        }
    }

    decodeSession(encodedSession) {
        try {
            const base64Data = encodedSession.replace('FRICTION-ULTIMATE-SESSION-V1.0.0-', '');
            const decoded = Buffer.from(base64Data, 'base64').toString('utf8');
            return JSON.parse(decoded);
        } catch (error) {
            console.error('❌ Erreur de décodage de session:', error);
            return null;
        }
    }

    async setupSessionFiles(sessionData) {
        if (!sessionData) return;

        try {
            // Créer les fichiers de session nécessaires
            const credsPath = path.join(this.sessionPath, 'creds.json');

            const credentials = {
                "noiseKey": {
                    "private": sessionData.encKey,
                    "public": sessionData.macKey
                },
                "pairingEphemeralKeyPair": {
                    "private": sessionData.clientToken,
                    "public": sessionData.serverToken
                },
                "signedIdentityKey": {
                    "private": this.generateRandomString(44),
                    "public": this.generateRandomString(44)
                },
                "signedPreKey": {
                    "keyPair": {
                        "private": this.generateRandomString(44),
                        "public": this.generateRandomString(44)
                    },
                    "signature": this.generateRandomString(64),
                    "keyId": Math.floor(Math.random() * 1000000)
                },
                "registrationId": Math.floor(Math.random() * 16777215),
                "advSecretKey": this.generateRandomString(44),
                "me": {
                    "id": sessionData.clientID,
                    "name": "Friction Ultimate Bot"
                },
                "signalIdentities": [],
                "myAppStateKeyId": this.generateRandomString(6),
                "firstUnuploadedPreKeyId": 1,
                "nextPreKeyId": 31,
                "lastAccountSyncTimestamp": Date.now(),
                "platform": "web"
            };

            // S'assurer que le dossier existe
            if (!fs.existsSync(this.sessionPath)) {
                fs.mkdirSync(this.sessionPath, { recursive: true });
            }

            fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2));
            console.log('💾 Fichiers de session créés');

        } catch (error) {
            console.error('❌ Erreur création fichiers de session:', error);
        }
    }

    // Méthode compatible pour l'interface du bot
    async getSession() {
        const authDir = await this.initializeSession();
        return { authDir };
    }

    // Méthode pour sauvegarder le QR code
    async saveQrCode(qr) {
        // Optionnel - pour le moment juste loguer
        console.log('🔐 QR Code prêt pour scan');
    }

    // Méthode pour supprimer la session
    async deleteSession() {
        try {
            // Supprimer le dossier auth_info_baileys
            const authDir = 'auth_info_baileys';
            if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true });
                console.log('🗑️ Session auth_info_baileys supprimée');
            }

            // Supprimer aussi le sessionPath si différent
            if (fs.existsSync(this.sessionPath) && this.sessionPath !== authDir) {
                fs.rmSync(this.sessionPath, { recursive: true, force: true });
                console.log('🗑️ Session supprimée');
            }

            console.log('✅ Toutes les sessions ont été nettoyées');
        } catch (error) {
            console.error('❌ Erreur suppression session:', error);
        }
    }

    async cleanupOldSessions() {
        try {
            // Nettoyer les anciennes sessions
            const sessionsToClean = ['auth_info_baileys', 'auth_info', 'session_data'];

            for (const sessionDir of sessionsToClean) {
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    console.log(`🧹 Session ${sessionDir} nettoyée`);
                }
            }
        } catch (error) {
            console.error('❌ Erreur nettoyage sessions:', error);
        }
    }

    // Méthode pour sauvegarder la session
    async saveSession(sessionData) {
        try {
            console.log('💾 Session sauvegardée');
            // Implémentation basique - peut être étendue
        } catch (error) {
            console.error('❌ Erreur sauvegarde session:', error);
        }
    }

    // Méthode pour encoder votre propre session (à utiliser une seule fois)
    encodeYourSession(sessionPath = 'auth_info') {
        try {
            const credsPath = path.join(sessionPath, 'creds.json');

            if (fs.existsSync(credsPath)) {
                const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

                const sessionData = {
                    clientID: creds.me?.id || "Friction-Ultimate-" + Date.now(),
                    serverToken: creds.pairingEphemeralKeyPair?.public || "1@" + this.generateRandomString(160),
                    clientToken: creds.pairingEphemeralKeyPair?.private || this.generateRandomString(20),
                    encKey: creds.noiseKey?.private || this.generateRandomString(32),
                    macKey: creds.noiseKey?.public || this.generateRandomString(32)
                };

                const encoded = "FRICTION-ULTIMATE-SESSION-V1.0.0-" + Buffer.from(JSON.stringify(sessionData)).toString('base64');

                console.log('🔐 VOTRE SESSION ENCODÉE:');
                console.log('📋 Copiez cette ligne dans votre .env comme WHATSAPP_SESSION:');
                console.log(encoded);

                return encoded;
            } else {
                console.log('❌ Aucun fichier de session trouvé à encoder');
                return null;
            }

        } catch (error) {
            console.error('❌ Erreur encodage session:', error);
            return null;
        }
    }

    async ensureSessionDirectory() {
        try {
            // Créer le dossier principal de session
            await fs.mkdir(this.sessionPath, { recursive: true });

            // Créer aussi le dossier auth_info_baileys si nécessaire
            const authPath = path.join(process.cwd(), 'auth_info_baileys');
            await fs.mkdir(authPath, { recursive: true });

            console.log(`📁 Dossiers de session créés: ${this.sessionPath} et ${authPath}`);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                console.error('❌ Erreur création dossier session:', error);
                throw error;
            }
        }
    }
}

module.exports = SessionManager;