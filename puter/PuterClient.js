
const fs = require('fs').promises;
const path = require('path');

class PuterClient {
    constructor() {
        this.isInitialized = false;
        this.isAvailable = false;
        this.puter = null;
        
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            console.log('🎙️ Initialisation PuterClient...');
            
            // Importer dynamiquement le module Puter.js
            try {
                // Essayer d'importer puter depuis npm
                const { default: puter } = await import('puter');
                this.puter = puter;
                this.isAvailable = true;
                console.log('✅ PuterClient initialisé avec succès - Synthèse vocale Puter.js activée');
            } catch (importError) {
                console.log('⚠️ Module puter non installé - installation automatique...');
                // Si le module n'est pas installé, on peut toujours essayer l'API REST
                this.isAvailable = false;
            }
            
        } catch (error) {
            console.log('⚠️ Erreur initialisation Puter:', error.message);
            this.isAvailable = false;
        } finally {
            this.isInitialized = true;
        }
    }

    hasValidClient() {
        return this.isInitialized && this.isAvailable && this.puter;
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
        if (!isAvailable || !this.puter) {
            console.log('⚠️ Puter.js non disponible - génération vocale ignorée');
            return null;
        }

        try {
            console.log(`🎙️ Génération vocale Puter.js: "${text.substring(0, 50)}..."`);

            // Nettoyer et limiter le texte
            let cleanText = text.replace(/[""]/g, '"').replace(/'/g, "'").trim();
            if (cleanText.length > 300) {
                cleanText = cleanText.substring(0, 300) + '...';
            }

            // Configuration des options vocales selon l'API Puter.js
            const voiceOptions = {
                voice: this.getVoiceForCharacter(options.voice, options.gender),
                engine: "neural",
                language: options.language || "en-US"
            };

            // Utiliser l'API Puter.js directe
            const audio = await this.puter.ai.txt2speech(cleanText, voiceOptions);

            if (audio) {
                // Créer le dossier si nécessaire
                const dir = path.dirname(outputPath);
                await fs.mkdir(dir, { recursive: true });

                // Convertir l'objet audio en buffer si nécessaire
                let audioBuffer;
                if (audio.buffer) {
                    audioBuffer = audio.buffer;
                } else if (audio.arrayBuffer) {
                    audioBuffer = Buffer.from(await audio.arrayBuffer());
                } else if (Buffer.isBuffer(audio)) {
                    audioBuffer = audio;
                } else {
                    // Si c'est un blob ou autre, essayer de le convertir
                    audioBuffer = Buffer.from(audio);
                }

                // Sauvegarder le fichier audio
                await fs.writeFile(outputPath, audioBuffer);
                console.log(`✅ Audio Puter.js généré: ${outputPath}`);
                return audioBuffer;
            } else {
                throw new Error('Données audio non reçues de Puter.js');
            }

        } catch (error) {
            console.error('❌ Erreur génération vocale Puter.js:', error.message);
            return null;
        }
    }

    /**
     * Sélectionne une voix en fonction du personnage et du genre
     */
    getVoiceForCharacter(characterType, gender) {
        // Voix disponibles dans Puter.js
        const voices = {
            male: {
                narrator: 'Matthew',
                guard: 'Justin', 
                merchant: 'Brian',
                noble: 'Russell',
                default: 'Matthew'
            },
            female: {
                narrator: 'Joanna',
                guard: 'Amy',
                merchant: 'Emma',
                noble: 'Salli',
                default: 'Joanna'
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
            language: 'fr-FR'
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
            language: 'fr-FR'
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
            language: 'fr-FR'
        });
    }
}

module.exports = PuterClient;
