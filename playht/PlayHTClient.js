const PlayHT = require('playht');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

class PlayHTClient {
    constructor() {
        this.isInitialized = false;
        this.isAvailable = false;
        this.initPromise = this.init(); // Store the initialization promise
    }

    async init() {
        try {
            // Vérifier si les clés API sont disponibles
            const apiKey = process.env.PLAYHT_API_KEY;
            const userId = process.env.PLAYHT_USER_ID;

            if (!apiKey || !userId) {
                console.log('⚠️ Clés PlayHT non configurées - synthèse vocale désactivée');
                console.log('💡 Ajoutez PLAYHT_API_KEY et PLAYHT_USER_ID pour activer les voix des PNJ');
                this.isAvailable = false;
                return;
            }

            // Initialiser PlayHT
            PlayHT.init({
                apiKey: apiKey,
                userId: userId,
                defaultVoiceEngine: 'PlayDialog', // Voix conversationnelle AI
                defaultVoiceId: 's3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json'
            });

            this.isInitialized = true;
            this.isAvailable = true;
            console.log('✅ PlayHTClient initialisé avec succès - Synthèse vocale activée');
            console.log('🎭 Voix des PNJ disponibles pour les dialogues');

        } catch (error) {
            console.error('❌ Erreur initialisation PlayHT:', error.message);
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isInitialized && this.isAvailable;
    }

    /**
     * Assure que l'initialisation est terminée avant de continuer
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initPromise;
        }
        return this.isAvailable;
    }

    /**
     * Génère un audio à partir de texte avec PlayHT
     */
    async generateVoice(text, outputPath, options = {}) {
        // Attendre que l'initialisation soit terminée
        const isAvailable = await this.ensureInitialized();
        if (!isAvailable) {
            console.log('⚠️ PlayHT non disponible - génération vocale ignorée');
            return null;
        }

        try {
            console.log(`🎙️ Génération vocale PlayHT: "${text.substring(0, 50)}..."`);

            // Configuration par défaut avec options personnalisables
            const voiceOptions = {
                voiceEngine: options.voiceEngine || 'PlayDialog',
                voiceId: this.getVoiceForCharacter(options.voice, options.gender),
                outputFormat: 'mp3',
                speed: options.speed || 1.0,
                temperature: options.temperature || 0.7,
                quality: 'standard'
            };

            // Générer l'audio avec PlayHT
            const generated = await PlayHT.generate(text, voiceOptions);
            
            if (!generated || !generated.audioUrl) {
                throw new Error('Aucune URL audio retournée par PlayHT');
            }

            // Télécharger le fichier audio généré
            await this.downloadAudio(generated.audioUrl, outputPath);
            
            console.log(`✅ Audio PlayHT généré: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération vocale PlayHT:', error.message);
            throw error;
        }
    }

    /**
     * Télécharge l'audio depuis l'URL PlayHT
     */
    async downloadAudio(audioUrl, outputPath) {
        return new Promise(async (resolve, reject) => {
            try {
                // Créer le dossier si nécessaire
                const dir = path.dirname(outputPath);
                await fs.mkdir(dir, { recursive: true });
            } catch (mkdirError) {
                reject(new Error(`Erreur création dossier: ${mkdirError.message}`));
                return;
            }
            
            const file = require('fs').createWriteStream(outputPath);
            
            https.get(audioUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve(outputPath);
                });
                
                file.on('error', (err) => {
                    require('fs').unlink(outputPath, () => {}); // Nettoyer le fichier en cas d'erreur
                    reject(err);
                });
                
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Sélectionne la voix appropriée selon le personnage
     */
    getVoiceForCharacter(voiceType, gender) {
        // Voix par défaut selon le type et le genre
        const voices = {
            // Voix masculines - IDs réels PlayHT avec caractéristiques appropriées
            male: {
                warrior: 's3://voice-cloning-zero-shot/36e9c53d-ca4e-4815-b5ed-9732be3839b4/samuelsaad/manifest.json', // Samuel - voix grave et graveleuse
                merchant: 's3://voice-cloning-zero-shot/9f1ee23a-9108-4538-90be-8e62efc195b6/charlessaad/manifest.json', // Charles - voix amicale et ronde
                noble: 's3://voice-cloning-zero-shot/509221d8-9e2d-486c-9b3c-97e52d86e63d/arthuradvertisingsaad/manifest.json', // Arthur - accent britannique distingué
                default: 's3://voice-cloning-zero-shot/9f1ee23a-9108-4538-90be-8e62efc195b6/charlessaad/manifest.json' // Charles par défaut
            },
            // Voix féminines - IDs réels PlayHT avec caractéristiques appropriées
            female: {
                warrior: 's3://voice-cloning-zero-shot/9a5deeda-3025-49c5-831a-ac98f86f2a37/aprilsaad/manifest.json', // April - voix narrative forte
                merchant: 's3://voice-cloning-zero-shot/a59cb96d-bba8-4e24-81f2-e60b888a0275/charlottenarrativesaad/manifest.json', // Charlotte - voix canadienne chaleureuse
                noble: 's3://voice-cloning-zero-shot/d712cad5-85db-44c6-8ee0-8f4361ed537b/eleanorsaad2/manifest.json', // Eleanor - voix britannique élégante
                default: 's3://voice-cloning-zero-shot/a59cb96d-bba8-4e24-81f2-e60b888a0275/charlottenarrativesaad/manifest.json' // Charlotte par défaut
            }
        };

        const genderVoices = voices[gender] || voices.male;
        return genderVoices[voiceType] || genderVoices.default;
    }

    /**
     * Génère un dialogue vocal pour les PNJ avec voix adaptée
     */
    async generateDialogueVoice(character, npcName, dialogue, outputPath, options = {}) {
        // Déterminer le type de PNJ pour choisir la voix appropriée
        const npcType = this.determineNPCType(npcName);
        const gender = options.npcGender || 'male'; // Genre du PNJ (par défaut masculin)

        const voiceOptions = {
            voice: npcType,
            gender: gender,
            speed: 0.9, // Un peu plus lent pour les dialogues
            temperature: 0.8, // Plus d'émotion pour les dialogues
            voiceEngine: 'PlayDialog', // Moteur conversationnel
            ...options
        };

        // Formater le texte pour le dialogue
        const voiceText = `${dialogue}`;
        
        return await this.generateVoice(voiceText, outputPath, voiceOptions);
    }

    /**
     * Détermine le type de PNJ selon son nom pour choisir la voix
     */
    determineNPCType(npcName) {
        const name = npcName.toLowerCase();
        
        if (name.includes('marchand') || name.includes('vendeur') || name.includes('boutique')) {
            return 'merchant';
        } else if (name.includes('roi') || name.includes('reine') || name.includes('seigneur') || name.includes('dame')) {
            return 'noble';
        } else if (name.includes('garde') || name.includes('soldat') || name.includes('guerrier')) {
            return 'warrior';
        }
        
        return 'default';
    }

    /**
     * Génère un audio de narration pour les actions
     */
    async generateNarrationVoice(narration, outputPath, options = {}) {
        const voiceOptions = {
            voice: 'default',
            gender: 'male', // Narrateur masculin par défaut
            speed: 1.0,
            temperature: 0.6, // Moins d'émotion pour la narration
            voiceEngine: 'PlayDialog',
            ...options
        };

        return await this.generateVoice(narration, outputPath, voiceOptions);
    }

    /**
     * Liste les voix disponibles (pour débugger)
     */
    async listAvailableVoices() {
        // Attendre que l'initialisation soit terminée
        const isAvailable = await this.ensureInitialized();
        if (!isAvailable) {
            return [];
        }

        try {
            const voices = await PlayHT.listVoices();
            console.log('🎭 Voix PlayHT disponibles:', voices.length);
            return voices;
        } catch (error) {
            console.error('❌ Erreur récupération voix:', error.message);
            return [];
        }
    }
}

module.exports = PlayHTClient;