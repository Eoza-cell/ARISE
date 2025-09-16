
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class PollinationsClient {
    constructor() {
        this.baseURL = 'https://image.pollinations.ai/prompt';
        this.isAvailable = true;
        
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
     * Génère un message vocal avec Pollinations (API vocale gratuite)
     */
    async generateVoice(text, outputPath, options = {}) {
        try {
            console.log(`🎙️ Génération vocale Pollinations GRATUITE avec texte: "${text.substring(0, 50)}..."`);

            // Configuration vocale
            const voice = options.voice || 'alloy'; // Voix par défaut
            const speed = options.speed || 1.0;
            const language = options.language || 'fr'; // Français par défaut

            // URL de l'API vocale Pollinations (hypothétique - ajuster selon leur vraie API)
            const voiceUrl = `https://text2audio.pollinations.ai/prompt/${encodeURIComponent(text)}?voice=${voice}&speed=${speed}&language=${language}`;
            
            console.log(`🎙️ Génération vocale depuis: ${voiceUrl.substring(0, 100)}...`);
            
            // Télécharger l'audio directement
            const response = await axios.get(voiceUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Sauvegarder l'audio
            await fs.writeFile(outputPath, Buffer.from(response.data));
            console.log(`✅ Audio Pollinations généré GRATUITEMENT: ${outputPath}`);
            
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération vocale Pollinations:', error.message);
            
            // Fallback: générer un fichier audio basique avec synthèse vocale système
            try {
                return await this.generateFallbackVoice(text, outputPath);
            } catch (fallbackError) {
                console.error('❌ Erreur fallback vocal:', fallbackError.message);
                throw error;
            }
        }
    }

    /**
     * Fallback pour génération vocale si Pollinations ne fonctionne pas
     */
    async generateFallbackVoice(text, outputPath) {
        console.log('🔄 Fallback: génération vocale système...');
        
        // Utiliser une synthèse vocale basique (TTS système ou API alternative)
        // Pour l'instant, créer un fichier placeholder
        const placeholderAudio = Buffer.from('AUDIO_PLACEHOLDER_' + text.substring(0, 100));
        await fs.writeFile(outputPath, placeholderAudio);
        
        console.log(`⚠️ Audio placeholder généré: ${outputPath}`);
        return outputPath;
    }

    /**
     * Génère un dialogue vocal pour les PNJ
     */
    async generateDialogueVoice(character, npcName, dialogue, outputPath, options = {}) {
        // Adapter la voix selon le sexe du personnage ou du PNJ
        const voiceOptions = {
            voice: character.gender === 'male' ? 'echo' : 'nova',
            speed: 0.9, // Un peu plus lent pour les dialogues
            language: 'fr',
            ...options
        };

        const voiceText = `${npcName} dit: ${dialogue}`;
        return await this.generateVoice(voiceText, outputPath, voiceOptions);
    }

    /**
     * Génère un audio de narration pour les actions
     */
    async generateNarrationVoice(narration, outputPath, options = {}) {
        const voiceOptions = {
            voice: 'onyx', // Voix narrative
            speed: 1.0,
            language: 'fr',
            ...options
        };

        return await this.generateVoice(narration, outputPath, voiceOptions);
    }
}

module.exports = PollinationsClient;
