const fs = require('fs').promises;
const path = require('path');

class HuggingFaceClient {
    constructor() {
        // Clé API Hugging Face intégrée directement pour déploiement
        this.apiKey = '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';
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

            const optimizedPrompt = this.optimizePromptForWanAnimate(prompt, options);

            try {
                let videoBlob;

                if (imageData) {
                    // Mode image-to-video avec Wan2.2-Animate-14B
                    console.log(`🎬 Mode image-to-video avec Wan-AI/Wan2.2-Animate-14B...`);

                    videoBlob = await this.client.imageToVideo({
                        model: "Wan-AI/Wan2.2-Animate-14B",
                        inputs: imageData,
                        parameters: { 
                            prompt: optimizedPrompt,
                            num_frames: Math.min(options.num_frames || 49, 49),
                            fps: Math.min(options.fps || 8, 8),
                            width: options.width || 768,
                            height: options.height || 768,
                            seed: options.seed || Math.floor(Math.random() * 1000000),
                            motion_bucket_id: options.motion_bucket_id || 127
                        }
                    });
                } else {
                    // Mode text-to-video avec Wan2.2-Animate-14B
                    console.log(`🎬 Mode text-to-video avec Wan-AI/Wan2.2-Animate-14B...`);

                    videoBlob = await this.client.textToVideo({
                        model: "Wan-AI/Wan2.2-Animate-14B",
                        inputs: optimizedPrompt,
                        parameters: {
                            num_frames: Math.min(options.num_frames || 49, 49),
                            fps: options.fps || 8,
                            width: options.width || 768,
                            height: options.height || 768,
                            seed: options.seed || Math.floor(Math.random() * 1000000)
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

                return {
                    success: true,
                    videoPath: outputPath,
                    method: 'huggingface',
                    size: videoBuffer.length
                };

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

    optimizePromptForWanAnimate(prompt, options = {}) {
        let optimized = prompt
            .replace(/['"]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Extraire la description du personnage et l'action si disponibles
        if (options.character && options.action) {
            const character = options.character;
            const action = options.action;

            // Construire un prompt structuré pour Wan2.2-Animate-14B
            const characterDesc = this.buildCharacterDescription(character);
            const actionDesc = this.buildActionDescription(action, options.narration);

            optimized = `${characterDesc} ${actionDesc}`;
        }

        // Ajouter des mots-clés spécifiques pour Wan2.2-Animate-14B
        const wanKeywords = [
            'high quality animation',
            'detailed character movement',
            'smooth transitions',
            'realistic facial expressions',
            'dynamic motion',
            'cinematic composition'
        ];

        wanKeywords.forEach(keyword => {
            if (!optimized.toLowerCase().includes(keyword.toLowerCase())) {
                optimized += `, ${keyword}`;
            }
        });

        // Limiter la longueur pour Wan2.2-Animate-14B
        if (optimized.length > 300) {
            optimized = optimized.substring(0, 297) + '...';
        }

        console.log(`🎯 Prompt optimisé pour Wan2.2-Animate-14B: "${optimized}"`);
        return optimized;
    }

    buildCharacterDescription(character) {
        let desc = '';

        // Priorité absolue à la description personnalisée
        if (character.appearance && character.appearance.trim().length > 0) {
            desc = character.appearance;
        } else {
            // Description par défaut basée sur le royaume et le genre
            const genderDesc = character.gender === 'male' ? 'male warrior' : 'female warrior';
            desc = `${genderDesc} named ${character.name} from ${character.kingdom} kingdom`;
        }

        return desc;
    }

    buildActionDescription(action, narration = '') {
        let actionDesc = `performing ${action}`;

        if (narration && narration.trim().length > 0) {
            actionDesc += `, ${narration}`;
        }

        actionDesc += ', medieval fantasy setting, epic atmosphere';

        return actionDesc;
    }

    // Méthodes RPG spécifiques avec support d'image
    async generateCombatVideo(action, character, outputPath) {
        const prompt = `${character.name} in medieval fantasy combat, ${action}, epic battle scene, dynamic movement, armor and weapons, dramatic lighting, action sequence`;

        const result = await this.generateVideoFromText(prompt, outputPath, {
            duration: 4,
            characterImagePath: character.imagePath || null,
            character: character,
            action: action,
            narration: 'epic battle scene with dynamic movement'
        });
        
        return result || outputPath;
    }

    async generateCharacterActionVideo(action, character, location, outputPath) {
        const prompt = `${character.name} performing ${action} in ${location}, medieval fantasy setting, character in motion, atmospheric environment, cinematic camera angle`;

        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 5,
            characterImagePath: character.imagePath || null,
            character: character,
            action: action,
            narration: `in ${location}, atmospheric environment, cinematic camera angle`
        });
    }

    async generateLocationVideo(location, character, outputPath) {
        const prompt = `Fantasy location: ${location}, ${character.name} exploring the area, epic landscape, atmospheric lighting, cinematic camera movement, medieval fantasy world`;

        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 6,
            characterImagePath: character.imagePath || null,
            character: character,
            action: 'exploring the area',
            narration: `in ${location}, epic landscape, atmospheric lighting, cinematic camera movement`
        });
    }

    async generateMagicSpellVideo(spellName, character, outputPath) {
        const prompt = `${character.name} casting ${spellName} magic spell, mystical energy effects, glowing magical aura, fantasy spellcasting, dynamic magical particles, epic scene`;

        return await this.generateVideoFromText(prompt, outputPath, {
            duration: 4,
            characterImagePath: character.imagePath || null,
            character: character,
            action: `casting ${spellName} magic spell`,
            narration: 'mystical energy effects, glowing magical aura, dynamic magical particles'
        });
    }

    async generateVideoFromImage(imagePath, prompt, outputPath, options = {}) {
        try {
            if (!this.hasValidClient()) {
                throw new Error('HuggingFace client non disponible - vérifiez HF_TOKEN');
            }

            console.log(`🎬 Génération vidéo HuggingFace depuis image: ${imagePath}`);
            console.log(`🎯 Prompt: "${prompt}"`);

            // Lire l'image
            const imageBuffer = await fs.readFile(imagePath);

            // Optimiser le prompt pour Wan2.2-Animate-14B
            const optimizedPrompt = this.optimizePromptForWanAnimate(prompt, options);

            // Utiliser le modèle Wan2.2-Animate-14B
            const video = await this.client.imageToVideo({
                model: "Wan-AI/Wan2.2-Animate-14B",
                inputs: imageBuffer,
                parameters: { 
                    prompt: optimizedPrompt,
                    num_frames: Math.min(options.num_frames || 49, 49),
                    height: options.height || 768,
                    width: options.width || 768,
                    fps: Math.min(options.fps || 8, 8),
                    seed: options.seed || Math.floor(Math.random() * 1000000),
                    motion_bucket_id: options.motion_bucket_id || 127
                }
            });

            // Sauvegarder la vidéo
            let videoBuffer;
            if (video instanceof Blob) {
                videoBuffer = Buffer.from(await video.arrayBuffer());
            } else if (Buffer.isBuffer(video)) {
                videoBuffer = video;
            } else {
                throw new Error('Format de vidéo non supporté');
            }

            await fs.writeFile(outputPath, videoBuffer);

            console.log(`✅ Vidéo HuggingFace générée avec Wan2.2-Animate-14B: ${outputPath} (${videoBuffer.length} bytes)`);
            return outputPath;

        } catch (error) {
            console.error('❌ Erreur génération vidéo HuggingFace:', error);

            // Fallback avec un modèle alternatif
            try {
                console.log('🔄 Tentative avec modèle alternatif...');
                const video = await this.client.imageToVideo({
                    model: "stabilityai/stable-video-diffusion-img2vid-xt",
                    inputs: imageBuffer,
                    parameters: {
                        height: 576,
                        width: 1024,
                        num_frames: 25,
                        motion_bucket_id: 127,
                        fps: 6
                    }
                });

                const videoBuffer = Buffer.from(await video.arrayBuffer());
                await fs.writeFile(outputPath, videoBuffer);

                console.log(`✅ Vidéo HuggingFace générée (fallback): ${outputPath}`);
                return outputPath;
            } catch (fallbackError) {
                console.error('❌ Échec fallback:', fallbackError);
                throw error;
            }
        }
    }
}

module.exports = HuggingFaceClient;