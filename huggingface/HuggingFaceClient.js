const fs = require('fs').promises;
const path = require('path');

class HuggingFaceClient {
    constructor() {
        this.apiKey = process.env.HF_TOKEN;
        this.isAvailable = false;
        this.client = null;

        this.initializeClient();
    }

    async initializeClient() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ HF_TOKEN non trouvée - génération de vidéos Hugging Face désactivée');
                return;
            }

            // Initialiser le client avec la nouvelle API
            const { InferenceClient } = await import('@huggingface/inference');
            this.client = new InferenceClient(this.apiKey);

            this.isAvailable = true;
            console.log('✅ Client Hugging Face initialisé avec succès (@huggingface/inference)');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du client Hugging Face:', error.message);
            this.isAvailable = false;
        }
    }

    hasValidClient() {
        return this.isAvailable && this.apiKey && this.client;
    }

    async generateVideoFromText(prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                console.log('⚠️ Client HuggingFace non disponible - HF_TOKEN manquante');
                return null;
            }

            console.log(`🤗 Génération vidéo Hugging Face avec prompt: "${prompt.substring(0, 100)}..."`);

            // Utiliser l'image du personnage si disponible
            let imageData = null;
            if (options.characterImagePath) {
                try {
                    imageData = await fs.readFile(options.characterImagePath);
                    console.log(`📸 Image du personnage chargée: ${options.characterImagePath}`);
                } catch (error) {
                    console.log(`⚠️ Impossible de charger l'image: ${options.characterImagePath}`);
                }
            }

            const optimizedPrompt = this.optimizePromptForImageToVideo(prompt);

            try {
                let videoBlob;

                if (imageData) {
                    // Mode image-to-video avec la nouvelle API
                    console.log(`🎬 Mode image-to-video avec Lightricks/LTX-Video...`);

                    videoBlob = await this.client.imageToVideo({
                        provider: "fal-ai",
                        model: "Lightricks/LTX-Video",
                        inputs: imageData,
                        parameters: { 
                            prompt: optimizedPrompt,
                            duration: Math.min(options.duration || 3, 5),
                            fps: Math.min(options.fps || 8, 12)
                        }
                    });
                } else {
                    // Mode text-to-video de fallback
                    console.log(`🎬 Mode text-to-video avec modèle de fallback...`);

                    videoBlob = await this.client.textToVideo({
                        model: "damo-vilab/text-to-video-ms-1.7b",
                        inputs: optimizedPrompt,
                        parameters: {
                            num_frames: options.num_frames || 16,
                            fps: options.fps || 8,
                            width: options.width || 256,
                            height: options.height || 256
                        }
                    });
                }

                // Convertir le Blob en Buffer
                const videoBuffer = Buffer.from(await videoBlob.arrayBuffer());

                // Vérifier que c'est bien une vidéo
                if (!videoBuffer || videoBuffer.length < 1000) {
                    throw new Error('Vidéo générée trop petite ou invalide');
                }

                // Créer le dossier et sauvegarder
                const outputDir = path.dirname(outputPath);
                await fs.mkdir(outputDir, { recursive: true });
                await fs.writeFile(outputPath, videoBuffer);

                console.log(`✅ Vidéo HuggingFace générée: ${outputPath} (${videoBuffer.length} bytes)`);

                return outputPath;

            } catch (apiError) {
                console.log(`⚠️ Erreur API principale: ${apiError.message}`);

                // Fallback vers l'ancienne méthode
                return await this.generateVideoWithLegacyFallback(prompt, outputPath, options);
            }

        } catch (error) {
            console.error('❌ Erreur génération vidéo HuggingFace:', error.message);
            return null;
        }
    }

    async generateVideoWithLegacyFallback(prompt, outputPath, options = {}) {
        try {
            console.log(`🔄 Fallback vers l'ancienne API...`);

            const response = await fetch('https://api-inference.huggingface.co/models/ali-vilab/text-to-video-ms-1.7b', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({
                    inputs: this.optimizePromptForImageToVideo(prompt),
                    parameters: {
                        num_inference_steps: 20,
                        guidance_scale: 7.5,
                        width: 256,
                        height: 256,
                        num_frames: 8
                    }
                }),
                timeout: 45000
            });

            if (!response.ok) {
                throw new Error(`Erreur modèle fallback: ${response.status}`);
            }

            const videoBuffer = Buffer.from(await response.arrayBuffer());

            if (videoBuffer.length < 500) {
                throw new Error('Vidéo fallback trop petite');
            }

            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });
            await fs.writeFile(outputPath, videoBuffer);

            console.log(`✅ Vidéo legacy fallback générée: ${outputPath} (${videoBuffer.length} bytes)`);
            return outputPath;

        } catch (error) {
            console.log('❌ Échec du fallback legacy:', error.message);
            return null;
        }
    }

    optimizePromptForImageToVideo(prompt) {
        let optimized = prompt
            .replace(/['"]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const improvements = [
            'smooth movement',
            'natural motion',
            'fluid animation',
            'realistic movement',
            'cinematic quality'
        ];

        improvements.forEach(improvement => {
            if (!optimized.toLowerCase().includes(improvement.toLowerCase())) {
                optimized += `, ${improvement}`;
            }
        });

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