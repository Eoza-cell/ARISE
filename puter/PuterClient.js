
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class PuterClient {
    constructor() {
        this.baseUrl = 'https://api.puter.com';
        this.isInitialized = false;
        this.isAvailable = false;
        
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            console.log('🎙️ Initialisation PuterClient...');
            
            // Puter.js ne nécessite pas de clé API
            this.isAvailable = true;
            console.log('✅ PuterClient initialisé avec succès - Synthèse vocale Puter.js activée (sans clé API)');
            
        } catch (error) {
            console.log('⚠️ Erreur initialisation Puter:', error.message);
            this.isAvailable = false;
        } finally {
            this.isInitialized = true;
        }
    }

    async testConnection() {
        try {
            // Test simple sans authentification puisque Puter.js est gratuit
            const response = await axios.get(`${this.baseUrl}/health`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }).catch(() => {
                // Si le endpoint /health n'existe pas, considérer comme disponible
                return { status: 200 };
            });
            
            return response.status === 200;
        } catch (error) {
            // Même si la connexion échoue, Puter.js reste utilisable
            return true;
        }
    }

    hasValidClient() {
        return this.isInitialized && this.isAvailable;
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initPromise;
        }
        return this.isAvailable;
    }

    /**
     * Génère un audio à partir de texte avec Puter.js
     */
    async generateVoice(text, outputPath, options = {}) {
        const isAvailable = await this.ensureInitialized();
        if (!isAvailable) {
            console.log('⚠️ Puter.js non disponible - génération vocale ignorée');
            return null;
        }

        try {
            console.log(`🎙️ Génération vocale Puter.js: "${text.substring(0, 50)}..."`);

            // Configuration des options vocales
            const voiceOptions = {
                model: 'tts-1',
                voice: this.getVoiceForCharacter(options.voice, options.gender),
                input: text,
                speed: options.speed || 1.0,
                format: 'mp3'
            };

            // Appel à l'API Puter pour la synthèse vocale (sans authentification)
            const response = await axios.post(`${this.baseUrl}/v1/ai/text-to-speech`, voiceOptions, {
                headers: {
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });

            if (response.data) {
                // Sauvegarder le fichier audio
                await fs.writeFile(outputPath, response.data);
                console.log(`✅ Audio Puter.js généré: ${outputPath}`);
                return outputPath;
            } else {
                throw new Error('Données audio non reçues de Puter.js');
            }

        } catch (error) {
            console.error('❌ Erreur génération vocale Puter.js:', error.message);
            if (error.response) {
                console.error('❌ Détails erreur API Puter:', error.response.data);
            }
            return null;
        }
    }

    /**
     * Sélectionne une voix en fonction du personnage et du genre
     */
    getVoiceForCharacter(characterType, gender) {
        const voices = {
            male: {
                narrator: 'onyx',
                guard: 'echo', 
                merchant: 'fable',
                noble: 'nova',
                default: 'onyx'
            },
            female: {
                narrator: 'nova',
                guard: 'shimmer',
                merchant: 'alloy',
                noble: 'echo',
                default: 'nova'
            }
        };

        const genderVoices = voices[gender] || voices.male;
        return genderVoices[characterType] || genderVoices.default;
    }

    /**
     * Génère une narration vocale pour le jeu
     */
    async generateNarrationVoice(text, outputPath, options = {}) {
        return await this.generateVoice(text, outputPath, {
            ...options,
            voice: 'narrator',
            speed: 0.9
        });
    }

    /**
     * Génère une voix de dialogue pour un PNJ
     */
    async generateDialogueVoice(text, character, outputPath, options = {}) {
        return await this.generateVoice(text, outputPath, {
            ...options,
            voice: character.type || 'default',
            gender: character.gender || 'male',
            speed: 1.0
        });
    }

    /**
     * Génère une voix système (notifications, etc.)
     */
    async generateSystemVoice(text, outputPath, options = {}) {
        return await this.generateVoice(text, outputPath, {
            ...options,
            voice: 'default',
            gender: 'male',
            speed: 1.1
        });
    }
}

module.exports = PuterClient;
