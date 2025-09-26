
const fs = require('fs').promises;
const path = require('path');

class HuggingFaceClient {
    constructor() {
        this.apiKey = process.env.HF_TOKEN;
        this.isAvailable = false;
        this.baseURL = 'https://router.huggingface.co/fal-ai/fal-ai/ltxv-13b-098-distilled/image-to-video';
        
        this.initializeClient();
    }

    async initializeClient() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ HF_TOKEN non trouvée - génération de vidéos Hugging Face désactivée');
                return;
            }

            this.isAvailable = true;
            console.log('✅ Client Hugging Face initialisé avec succès (ltxv-13b-098-distilled)');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du client Hugging Face:', error.message);
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable && this.apiKey;
    }

    async generateVideoFromText(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('Client Hugging Face non disponible - vérifiez HF_TOKEN');
            }

            console.log(`🤗 Génération vidéo Hugging Face avec prompt: "${prompt.substring(0, 100)}..."`);

            // Utiliser l'image du personnage si disponible
            let characterImage = null;
            if (options.characterImagePath) {
                try {
                    characterImage = await fs.readFile(options.characterImagePath);
                    console.log(`📸 Image du personnage chargée: ${options.characterImagePath}`);
                } catch (error) {
                    console.log(`⚠️ Impossible de charger l'image: ${options.characterImagePath}`);
                }
            }

            // Si pas d'image de personnage, essayer le modèle de fallback
            if (!characterImage) {
                console.log('⚠️ Pas d\'image de personnage disponible - utilisation du modèle fallback text-to-video');
                return await this.generateVideoWithFallbackModel(prompt, outputPath, options);
            }

            const optimizedPrompt = this.optimizePromptForImageToVideo(prompt);
            
            console.log(`🎬 Utilisation du modèle ltxv-13b-098-distilled pour génération vidéo image-to-video...`);

            // Utiliser le nouveau modèle image-to-video
            const response = await fetch(`${this.baseURL}?_subdomain=queue`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({
                    image_url: `data:image/png;base64,${characterImage.toString('base64')}`,
                    prompt: optimizedPrompt,
                    duration: options.duration || 5,
                    fps: options.fps || 24,
                    width: options.width || 1024,
                    height: options.height || 768
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur API HuggingFace: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`📥 Réponse reçue, traitement de la vidéo...`);

            // Gérer la réponse selon le format retourné
            let videoBuffer;
            if (result.video_url) {
                // Télécharger la vidéo depuis l'URL
                const videoResponse = await fetch(result.video_url);
                if (!videoResponse.ok) {
                    throw new Error(`Erreur téléchargement vidéo: ${videoResponse.status}`);
                }
                const arrayBuffer = await videoResponse.arrayBuffer();
                videoBuffer = Buffer.from(arrayBuffer);
            } else if (result.video) {
                // Vidéo encodée en base64
                videoBuffer = Buffer.from(result.video, 'base64');
            } else {
                throw new Error('Format de réponse vidéo inattendu');
            }
            
            // Créer le dossier de sortie si nécessaire
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            await fs.writeFile(outputPath, videoBuffer);
            console.log(`✅ Vidéo Hugging Face générée avec ltxv-13b-098-distilled: ${outputPath} (${videoBuffer.length} bytes)`);
            
            return {
                success: true,
                videoPath: outputPath,
                duration: options.duration || 5,
                provider: 'huggingface',
                model: 'ltxv-13b-098-distilled',
                fileSize: videoBuffer.length
            };

        } catch (error) {
            console.error('❌ Erreur génération vidéo Hugging Face:', error.message);
            throw new Error(`Génération vidéo échouée: ${error.message}`);
        }
    }

    async generateVideoWithFallbackModel(prompt, outputPath, options = {}) {
        try {
            console.log(`🔄 Utilisation du modèle de fallback text-to-video...`);

            // Fallback vers un modèle text-to-video classique si image-to-video échoue
            const response = await fetch('https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({
                    inputs: this.optimizePromptForImageToVideo(prompt),
                    parameters: {
                        num_frames: options.num_frames || 16,
                        fps: options.fps || 8,
                        width: options.width || 256,
                        height: options.height || 256
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur API fallback: ${response.status}`);
            }

            const videoBuffer = Buffer.from(await response.arrayBuffer());
            
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            await fs.writeFile(outputPath, videoBuffer);
            console.log(`✅ Vidéo Hugging Face générée avec modèle de fallback: ${outputPath}`);
            
            return {
                success: true,
                videoPath: outputPath,
                duration: options.duration || 5,
                provider: 'huggingface',
                model: 'damo-vilab/text-to-video-ms-1.7b',
                fileSize: videoBuffer.length
            };

        } catch (error) {
            console.error('❌ Erreur modèle de fallback:', error.message);
            throw error;
        }
    }

    optimizePromptForImageToVideo(prompt) {
        // Optimiser le prompt spécifiquement pour image-to-video
        let optimized = prompt
            .replace(/['"]/g, '') // Supprimer les guillemets
            .replace(/\s+/g, ' ') // Normaliser les espaces
            .trim();

        // Ajouter des améliorations pour l'image-to-video
        const improvements = [
            'smooth movement',
            'natural motion',
            'fluid animation',
            'realistic movement',
            'cinematic quality'
        ];

        // Ajouter les améliorations si pas déjà présentes
        improvements.forEach(improvement => {
            if (!optimized.toLowerCase().includes(improvement.toLowerCase())) {
                optimized += `, ${improvement}`;
            }
        });

        // Limiter la longueur pour le modèle
        if (optimized.length > 200) {
            optimized = optimized.substring(0, 197) + '...';
        }

        console.log(`🎯 Prompt optimisé pour image-to-video: "${optimized}"`);
        return optimized;
    }

    // Méthodes RPG spécifiques avec support d'image
    async generateCombatVideo(action, character, outputPath) {
        const prompt = `${character.name} in medieval fantasy combat, ${action}, epic battle scene, dynamic movement, armor and weapons, dramatic lighting, action sequence`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 4,
            characterImagePath: character.imagePath || null
        });
    }

    async generateCharacterActionVideo(action, character, location, outputPath) {
        const prompt = `${character.name} performing ${action} in ${location}, medieval fantasy setting, character in motion, atmospheric environment, cinematic camera angle`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 5,
            characterImagePath: character.imagePath || null
        });
    }

    async generateLocationVideo(location, character, outputPath) {
        const prompt = `Fantasy location: ${location}, ${character.name} exploring the area, epic landscape, atmospheric lighting, cinematic camera movement, medieval fantasy world`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 6,
            characterImagePath: character.imagePath || null
        });
    }

    async generateMagicSpellVideo(spellName, character, outputPath) {
        const prompt = `${character.name} casting ${spellName} magic spell, mystical energy effects, glowing magical aura, fantasy spellcasting, dynamic magical particles, epic scene`;
        
        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 4,
            characterImagePath: character.imagePath || null
        });
    }

    // Nouvelle méthode pour générer une vidéo avec une image personnalisée
    async generateVideoFromImage(imagePath, prompt, outputPath, options = {}) {
        try {
            console.log(`🎬 Génération vidéo depuis image: ${imagePath}`);
            
            return await this.generateVideoFromText(prompt, outputPath, {
                ...options,
                characterImagePath: imagePath
            });
        } catch (error) {
            console.error('❌ Erreur génération vidéo depuis image:', error);
            throw error;
        }
    }
}

module.exports = HuggingFaceClient;
