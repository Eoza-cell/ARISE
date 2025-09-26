
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
                console.log('⚠️ Client HuggingFace non disponible - HF_TOKEN manquante');
                return null;
            }

            console.log(`🤗 Génération vidéo Hugging Face avec prompt: "${prompt.substring(0, 100)}..."`);

            // Utiliser l'image du personnage si disponible
            let characterImageBase64 = null;
            if (options.characterImagePath) {
                try {
                    const characterImage = await fs.readFile(options.characterImagePath);
                    characterImageBase64 = characterImage.toString('base64');
                    console.log(`📸 Image du personnage chargée: ${options.characterImagePath}`);
                } catch (error) {
                    console.log(`⚠️ Impossible de charger l'image: ${options.characterImagePath}`);
                }
            }

            const optimizedPrompt = this.optimizePromptForImageToVideo(prompt);
            
            // Préparer les données de la requête
            const requestData = {
                prompt: optimizedPrompt,
                duration: Math.min(options.duration || 3, 5), // Max 5 secondes
                fps: Math.min(options.fps || 8, 12), // Max 12 FPS
                width: Math.min(options.width || 256, 512), // Max 512px
                height: Math.min(options.height || 256, 512) // Max 512px
            };

            // Ajouter l'image si disponible
            if (characterImageBase64) {
                requestData.image = `data:image/png;base64,${characterImageBase64}`;
                console.log(`🎬 Mode image-to-video avec ltxv-13b-098-distilled...`);
            } else {
                console.log(`🎬 Mode text-to-video avec modèle de fallback...`);
            }

            // Essayer d'abord avec l'API Inference
            try {
                const apiUrl = characterImageBase64 ? 
                    'https://api-inference.huggingface.co/models/lightricks/LTX-Video' :
                    'https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b';

                console.log(`📤 Requête vers: ${apiUrl}`);

                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                    body: JSON.stringify(requestData),
                    timeout: 60000
                });

                if (!response.ok) {
                    throw new Error(`API HuggingFace: ${response.status} ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                console.log(`📥 Type de contenu: ${contentType}`);

                let videoBuffer;
                if (contentType && contentType.includes('video/')) {
                    // Réponse directe en vidéo
                    const arrayBuffer = await response.arrayBuffer();
                    videoBuffer = Buffer.from(arrayBuffer);
                } else {
                    // Réponse JSON avec URL ou base64
                    const result = await response.json();
                    console.log(`📥 Réponse JSON reçue`);

                    if (result.video_url) {
                        // Télécharger depuis l'URL
                        const videoResponse = await fetch(result.video_url, { timeout: 30000 });
                        if (!videoResponse.ok) {
                            throw new Error(`Erreur téléchargement: ${videoResponse.status}`);
                        }
                        const arrayBuffer = await videoResponse.arrayBuffer();
                        videoBuffer = Buffer.from(arrayBuffer);
                    } else if (result.video) {
                        // Décoder base64
                        videoBuffer = Buffer.from(result.video, 'base64');
                    } else {
                        throw new Error('Format de réponse inattendu');
                    }
                }
                
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
                
                // Fallback vers modèle simple
                return await this.generateVideoWithSimpleFallback(prompt, outputPath, options);
            }

        } catch (error) {
            console.error('❌ Erreur génération vidéo HuggingFace:', error.message);
            return null; // Retourner null au lieu de throw pour éviter de casser le bot
        }
    }

    async generateVideoWithSimpleFallback(prompt, outputPath, options = {}) {
        try {
            console.log(`🔄 Fallback vers modèle simple text-to-video...`);

            // Utiliser un modèle plus simple et fiable
            const response = await fetch('https://api-inference.huggingface.co/models/ali-vilab/text-to-video-ms-1.7b', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({
                    inputs: this.optimizePromptForImageToVideo(prompt),
                    parameters: {
                        num_inference_steps: 20, // Réduit pour plus de vitesse
                        guidance_scale: 7.5,
                        width: 256,
                        height: 256,
                        num_frames: 8 // Très court
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
            
            console.log(`✅ Vidéo fallback générée: ${outputPath} (${videoBuffer.length} bytes)`);
            return outputPath;

        } catch (error) {
            console.log('❌ Échec du fallback vidéo:', error.message);
            return null;
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
