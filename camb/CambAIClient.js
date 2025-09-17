const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class CambAIClient {
    constructor() {
        this.baseURL = 'https://client.camb.ai/apis';
        this.apiKey = process.env.CAMB_AI_API_KEY;
        this.isAvailable = false;
        this.isInitialized = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ CAMB_AI_API_KEY non configurée - Camb AI désactivé');
                this.isAvailable = false;
                return;
            }

            // Test de connectivité avec l'API Camb AI
            await this.testConnection();
            
            this.isInitialized = true;
            this.isAvailable = true;
            console.log('✅ CambAIClient initialisé avec succès - Synthèse vocale Camb AI activée');
            console.log('🎙️ TTS multilingue MARS5 disponible (140+ langues)');

        } catch (error) {
            console.error('❌ Erreur initialisation Camb AI:', error.message);
            this.isAvailable = false;
        }
    }

    async testConnection() {
        const response = await axios.get(`${this.baseURL}/source-languages`, {
            headers: {
                'x-api-key': this.apiKey
            },
            timeout: 10000
        });

        if (response.status !== 200) {
            throw new Error('Connexion API Camb AI échouée');
        }
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initPromise;
        }
        return this.isAvailable;
    }

    hasValidClient() {
        return this.isInitialized && this.isAvailable;
    }

    /**
     * Génère un audio à partir de texte avec Camb AI
     */
    async generateVoice(text, outputPath, options = {}) {
        const isAvailable = await this.ensureInitialized();
        if (!isAvailable) {
            console.log('⚠️ Camb AI non disponible - génération vocale ignorée');
            return null;
        }

        try {
            console.log(`🎙️ Génération vocale Camb AI MARS5: "${text.substring(0, 50)}..."`);

            // Nettoyer et limiter le texte
            let cleanText = text.replace(/[""]/g, '"').replace(/'/g, "'").trim();
            if (cleanText.length > 500) {
                cleanText = cleanText.substring(0, 500) + '...';
            }

            // Configuration par défaut avec options personnalisables
            const ttsConfig = {
                text: cleanText,
                language: this.getLanguageId(options.language || 'fr'), // Français par défaut
                age: options.age || 25,
                gender: this.getGenderId(options.gender || 'male')
            };

            // Ajouter voice_id si spécifié
            if (options.voice_id) {
                ttsConfig.voice_id = options.voice_id;
            }

            // Étape 1: Créer la tâche TTS
            const ttsResponse = await axios.post(`${this.baseURL}/tts`, ttsConfig, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey
                },
                timeout: 30000
            });

            const taskId = ttsResponse.data.task_id;
            console.log(`🔄 Tâche Camb AI créée: ${taskId}`);

            // Étape 2: Attendre la completion
            const runId = await this.waitForCompletion(taskId);
            
            if (!runId) {
                console.log('⚠️ Génération Camb AI échouée');
                return null;
            }

            // Étape 3: Télécharger l'audio
            const audioBuffer = await this.downloadAudio(runId);
            
            if (audioBuffer) {
                // Créer le dossier si nécessaire
                const dir = path.dirname(outputPath);
                await fs.mkdir(dir, { recursive: true });

                // Sauvegarder l'audio
                await fs.writeFile(outputPath, audioBuffer);
                console.log(`✅ Audio Camb AI généré: ${outputPath} (${audioBuffer.length} bytes)`);
                return audioBuffer;
            }

            return null;

        } catch (error) {
            console.error('❌ Erreur génération Camb AI:', error.message);
            return null;
        }
    }

    /**
     * Attendre la completion de la tâche TTS
     */
    async waitForCompletion(taskId, maxAttempts = 30) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const statusResponse = await axios.get(`${this.baseURL}/tts/${taskId}`, {
                    headers: {
                        'x-api-key': this.apiKey
                    },
                    timeout: 10000
                });

                const status = statusResponse.data.status;
                
                if (status === 'SUCCESS') {
                    console.log('✅ Génération Camb AI terminée');
                    return statusResponse.data.run_id;
                } else if (status === 'FAILED' || status === 'ERROR') {
                    console.log('❌ Génération Camb AI échouée:', statusResponse.data);
                    return null;
                }
                
                // Attendre avant le prochain check
                await this.sleep(2000);
                attempts++;
                
            } catch (error) {
                console.error('❌ Erreur vérification status Camb AI:', error.message);
                attempts++;
                await this.sleep(2000);
            }
        }
        
        console.log('⏰ Timeout génération Camb AI');
        return null;
    }

    /**
     * Télécharger l'audio généré
     */
    async downloadAudio(runId) {
        try {
            const audioResponse = await axios.get(`${this.baseURL}/tts-result/${runId}`, {
                headers: {
                    'x-api-key': this.apiKey
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });

            if (audioResponse.data && audioResponse.data.byteLength > 0) {
                return Buffer.from(audioResponse.data);
            }

            return null;

        } catch (error) {
            console.error('❌ Erreur téléchargement audio Camb AI:', error.message);
            return null;
        }
    }

    /**
     * Génère une voix pour les dialogues de PNJ
     */
    async generateDialogueVoice(text, outputPath, characterType = 'neutral', gender = 'male') {
        const options = {
            gender: gender,
            age: this.getAgeForCharacter(characterType),
            language: 'fr'
        };

        return await this.generateVoice(text, outputPath, options);
    }

    /**
     * Génère une voix pour la narration
     */
    async generateNarrationVoice(text, outputPath, options = {}) {
        const narratorOptions = {
            gender: 'male',
            age: 35,
            language: 'fr',
            ...options
        };

        return await this.generateVoice(text, outputPath, narratorOptions);
    }

    /**
     * Obtenir l'ID de langue pour Camb AI
     */
    getLanguageId(language) {
        const languageMap = {
            'fr': 1,    // Français
            'en': 2,    // Anglais
            'es': 3,    // Espagnol
            'de': 4,    // Allemand
            'it': 5,    // Italien
            'pt': 6,    // Portugais
            // Ajouter d'autres langues si nécessaire
        };
        
        return languageMap[language] || 1; // Français par défaut
    }

    /**
     * Obtenir l'ID de genre pour Camb AI
     */
    getGenderId(gender) {
        return gender === 'female' ? 1 : 0; // 0 = male, 1 = female
    }

    /**
     * Obtenir l'âge approprié selon le type de personnage
     */
    getAgeForCharacter(characterType) {
        const ageMap = {
            'warrior': 30,
            'merchant': 40,
            'noble': 35,
            'wizard': 50,
            'young': 20,
            'elder': 60,
            'neutral': 30
        };
        
        return ageMap[characterType] || 30;
    }

    /**
     * Fonction utilitaire pour les pauses
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Lister les voix disponibles
     */
    async listVoices() {
        const isAvailable = await this.ensureInitialized();
        if (!isAvailable) {
            return [];
        }

        try {
            const response = await axios.get(`${this.baseURL}/list-voices`, {
                headers: {
                    'x-api-key': this.apiKey
                },
                timeout: 10000
            });

            return response.data || [];

        } catch (error) {
            console.error('❌ Erreur récupération voix Camb AI:', error.message);
            return [];
        }
    }
}

module.exports = CambAIClient;