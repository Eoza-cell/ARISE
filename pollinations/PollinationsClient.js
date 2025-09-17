
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const PlayHTClient = require('../playht/PlayHTClient');

class PollinationsClient {
    constructor() {
        this.baseURL = 'https://image.pollinations.ai/prompt';
        this.isAvailable = true;
        
        // Initialiser le client de synthèse vocale PlayHT
        this.playhtClient = new PlayHTClient();
        
        console.log('✅ PollinationsClient initialisé avec succès (GRATUIT)');
    }

    hasValidClient() {
        return this.isAvailable;
    }

    async generateImage(prompt, outputPath, options = {}) {
        try {
            console.log(`🎨 Génération d'image Pollinations GRATUITE avec prompt: "${prompt}"`);

            // Configuration par défaut
            const style = options.style || '3d';
            const perspective = options.perspective || 'first_person';
            const nudity = options.nudity || true;
            
            // Optimiser le prompt
            const optimizedPrompt = this.optimizePrompt(prompt, style, perspective, nudity);
            
            console.log(`✨ Prompt final optimisé: "${optimizedPrompt}"`);

            // URL de l'API Pollinations avec paramètres
            const imageUrl = `${this.baseURL}/${encodeURIComponent(optimizedPrompt)}?width=1024&height=1024&seed=-1&model=flux&nologo=true`;
            
            console.log(`📥 Téléchargement depuis: ${imageUrl.substring(0, 100)}...`);
            
            // Télécharger l'image directement
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Sauvegarder l'image
            await fs.writeFile(outputPath, Buffer.from(response.data));
            console.log(`✅ Image Pollinations générée GRATUITEMENT: ${outputPath}`);
            
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération Pollinations:', error.message);
            throw error;
        }
    }

    optimizePrompt(prompt, style, perspective, nudity) {
        let optimized = prompt;

        // Nettoyer le prompt
        optimized = optimized.trim();

        // Styles améliorés avec focus SKYRIM
        if (style === '3d') {
            optimized = `Skyrim style, Elder Scrolls aesthetic, 3D render, unreal engine 5, photorealistic, detailed medieval fantasy, ${optimized}`;
        } else {
            optimized = `Elder Scrolls concept art, Skyrim style, digital art, medieval fantasy illustration, ${optimized}`;
        }

        // Perspectives FORCÉES vue première personne style Skyrim
        const perspectiveMap = {
            'first_person': 'first person POV, immersive first-person view, Skyrim gameplay perspective, hands visible holding weapon, immersive camera angle',
            'second_person': 'close-up portrait, face focus, detailed Skyrim character features, Elder Scrolls style face', 
            'third_person': 'full body, dynamic pose, action shot, Skyrim character model'
        };
        
        optimized = `${optimized}, ${perspectiveMap[perspective]}`;

        // Environnement et atmosphère Skyrim
        optimized = `${optimized}, Nordic architecture, medieval fantasy environment, stone walls, torches, atmospheric lighting, cinematic depth of field`;

        // Gestion nudité avec style médiéval
        if (nudity) {
            optimized = `${optimized}, detailed anatomy, medieval clothing`;
        } else {
            optimized = `${optimized}, full medieval armor, detailed chainmail, leather armor, iron armor, steel armor, fantasy weapons`;
        }

        // Qualité et style spécifique Skyrim
        optimized = `${optimized}, masterpiece, high quality, 8K, vibrant colors, sharp focus, realistic textures, volumetric lighting, Skyrim graphics mod quality, photorealistic rendering`;

        // Éléments visuels Skyrim signature
        optimized = `${optimized}, Nordic runes, ancient stone textures, medieval fantasy atmosphere`;

        // Limiter la longueur pour l'URL
        if (optimized.length > 400) {
            optimized = optimized.substring(0, 400);
        }

        return optimized;
    }

    async generateMenuImage(outputPath) {
        const prompt = `Fantasy RPG main menu, epic medieval castle, magical atmosphere, cinematic lighting, game interface background`;
        
        return await this.generateImage(prompt, outputPath, {
            style: '3d',
            perspective: 'third_person',
            nudity: false
        });
    }

    async generateCharacterImage(character, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
        const prompt = `${genderDesc} from ${character.kingdom} kingdom, fantasy RPG character, detailed armor, level ${character.level}`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: options.perspective || 'first_person',
            nudity: options.nudity || false
        });
    }

    async generateActionImage(character, action, narration, outputPath, options = {}) {
        const genderDesc = character.gender === 'male' ? 'male' : 'female';
        const prompt = `${character.name}, ${genderDesc} warrior, ${action}, ${narration}, epic fantasy scene, first person POV`;

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: 'first_person',
            nudity: options.nudity || false
        });
    }

    /**
     * Génère un message vocal avec une API gratuite alternative
     */
    async generateVoice(text, outputPath, options = {}) {
        try {
            console.log(`🎙️ Génération vocale GRATUITE avec texte: "${text.substring(0, 50)}..."`);

            // Essayer d'abord l'API vocale gratuite alternative
            const voiceResult = await this.generateFreeVoice(text, outputPath, options);
            if (voiceResult) {
                return voiceResult;
            }

            // Fallback vers PlayHT si l'API gratuite échoue
            console.log('⚠️ API vocale gratuite échouée, utilisation du fallback PlayHT');
            return await this.generateFallbackVoice(text, outputPath);

        } catch (error) {
            console.error('❌ Erreur génération vocale:', error.message);
            throw error;
        }
    }

    /**
     * Génère un message vocal avec une API gratuite (alternative à Pollinations)
     */
    async generateFreeVoice(text, outputPath, options = {}) {
        try {
            // Utiliser l'API Edge-TTS (gratuite) ou similaire
            const voice = options.voice || 'fr-FR-DeniseNeural';
            const rate = options.speed ? `${Math.round((options.speed - 1) * 100)}%` : '0%';
            
            console.log(`🎤 Génération vocale gratuite - Voix: ${voice}`);
            
            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Utiliser une commande système pour générer l'audio (si edge-tts est disponible)
            // Sinon, utiliser une approche web API gratuite
            return await this.generateWebSpeechAPI(text, outputPath, options);
            
        } catch (error) {
            console.error('❌ Erreur API vocale gratuite:', error.message);
            return null;
        }
    }

    /**
     * Utilise l'API Web Speech ou une alternative gratuite
     */
    async generateWebSpeechAPI(text, outputPath, options = {}) {
        try {
            console.log('🌐 Utilisation API vocale web gratuite');
            
            // Pour une implémentation complète, on pourrait utiliser une API comme:
            // - ResponsiveVoice API (gratuite avec limites)
            // - Web Speech API via un serveur local
            // - Ou une autre API gratuite
            
            // Temporairement, créer un fichier placeholder et utiliser PlayHT en fallback
            console.log('⚠️ API vocale web en développement - utilisation du fallback');
            return null;
            
        } catch (error) {
            console.error('❌ Erreur API vocale web:', error.message);
            return null;
        }
    }

    /**
     * Fallback pour génération vocale utilisant PlayHT ou synthèse système
     */
    async generateFallbackVoice(text, outputPath, options = {}) {
        try {
            console.log('🔄 Fallback: tentative synthèse vocale alternative');
            
            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Essayer PlayHT d'abord
            if (this.playhtClient && this.playhtClient.hasValidClient()) {
                const audioPath = await this.playhtClient.generateVoice(text, outputPath, options);
                if (audioPath) {
                    console.log(`✅ Audio généré avec PlayHT: ${audioPath}`);
                    return audioPath;
                }
            }
            
            // Essayer une synthèse vocale système simple (si disponible)
            try {
                const systemVoice = await this.generateSystemVoice(text, outputPath, options);
                if (systemVoice) {
                    return systemVoice;
                }
            } catch (sysError) {
                console.log('⚠️ Synthèse système non disponible');
            }
            
            console.log(`⚠️ Toutes les options vocales épuisées - mode texte uniquement`);
            return null;
            
        } catch (error) {
            console.error('❌ Erreur fallback vocal:', error.message);
            return null;
        }
    }

    /**
     * Tente une synthèse vocale système simple
     */
    async generateSystemVoice(text, outputPath, options = {}) {
        try {
            // Cette méthode pourrait utiliser des commandes système comme:
            // - espeak (Linux)
            // - say (macOS)
            // - powershell speech (Windows)
            
            console.log('🔊 Tentative synthèse vocale système...');
            
            // Pour Replit (Linux), on pourrait essayer espeak si installé
            // Mais pour l'instant, on retourne null pour utiliser le texte
            return null;
            
        } catch (error) {
            console.error('❌ Erreur synthèse système:', error.message);
            return null;
        }
    }

    /**
     * Génère un dialogue vocal pour les PNJ
     */
    async generateDialogueVoice(character, npcName, dialogue, outputPath, options = {}) {
        try {
            console.log(`🎭 Génération dialogue vocal pour ${npcName}: "${dialogue.substring(0, 30)}..."`);
            
            // Utiliser directement PlayHT pour les dialogues
            if (this.playhtClient && this.playhtClient.hasValidClient()) {
                return await this.playhtClient.generateDialogueVoice(character, npcName, dialogue, outputPath, options);
            }
            
            // Fallback si PlayHT n'est pas disponible
            const voiceOptions = {
                voice: character.gender === 'male' ? 'warrior' : 'warrior',
                gender: character.gender || 'male',
                speed: 0.9,
                ...options
            };

            const voiceText = `${dialogue}`;
            return await this.generateFallbackVoice(voiceText, outputPath, voiceOptions);
            
        } catch (error) {
            console.error('❌ Erreur génération dialogue vocal:', error.message);
            return null;
        }
    }

    /**
     * Génère un audio de narration pour les actions
     */
    async generateNarrationVoice(narration, outputPath, options = {}) {
        try {
            console.log(`📖 Génération narration vocale: "${narration.substring(0, 30)}..."`);
            
            // Utiliser directement PlayHT pour la narration
            if (this.playhtClient && this.playhtClient.hasValidClient()) {
                return await this.playhtClient.generateNarrationVoice(narration, outputPath, options);
            }
            
            // Fallback si PlayHT n'est pas disponible
            const voiceOptions = {
                voice: 'default',
                gender: 'male',
                speed: 1.0,
                ...options
            };

            return await this.generateFallbackVoice(narration, outputPath, voiceOptions);
            
        } catch (error) {
            console.error('❌ Erreur génération narration vocale:', error.message);
            return null;
        }
    }
}

module.exports = PollinationsClient;
