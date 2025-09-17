
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class PuterClient {
    constructor() {
        this.baseUrl = 'https://api.puter.com';
        this.apiKey = process.env.PUTER_API_KEY;
        this.isInitialized = false;
        this.isAvailable = false;
        
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            console.log('🎙️ Initialisation PuterClient...');
            
            if (!this.apiKey) {
                console.log('⚠️ PUTER_API_KEY non configurée - synthèse vocale Puter désactivée');
                this.isAvailable = false;
            } else {
                // Test de connexion à l'API Puter
                await this.testConnection();
                this.isAvailable = true;
                console.log('✅ PuterClient initialisé avec succès - Synthèse vocale Puter activée');
            }
            
        } catch (error) {
            console.log('⚠️ Erreur initialisation Puter:', error.message);
            this.isAvailable = false;
        } finally {
            this.isInitialized = true;
        }
    }

    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/ai/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            return response.status === 200;
        } catch (error) {
            throw new Error('Connexion à l\'API Puter échouée');
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

            // Appel à l'API Puter pour la synthèse vocale
            const response = await axios.post(`${this.baseUrl}/v1/ai/text-to-speech`, voiceOptions, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
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
