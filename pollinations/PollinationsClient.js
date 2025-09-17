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
     * Génère un message vocal avec l'API Pollinations simple
     */
    async generateVoice(text, outputPath, options = {}) {
        try {
            console.log(`🎙️ Génération vocale: "${text.substring(0, 50)}..."`);

            // Essayer d'abord Pollinations Audio API
            try {
                return await this.generatePollinationsVoice(text, outputPath, options);
            } catch (pollinationsError) {
                console.log('⚠️ API Pollinations Audio échouée, utilisation Edge-TTS...');

                // Fallback vers Edge-TTS
                const edgeResult = await this.generateFreeVoice(text, outputPath, options);
                if (edgeResult) {
                    console.log('✅ Audio généré avec Edge-TTS');
                    return edgeResult;
                }

                // Si Edge-TTS échoue aussi, essayer les méthodes système
                console.log('⚠️ Edge-TTS échoué, tentative méthodes système...');
                return await this.generateFallbackVoice(text, outputPath, options);
            }

        } catch (error) {
            console.error('❌ Erreur génération vocale complète:', error.message);
            return null;
        }
    }

    /**
     * Génère un message vocal avec l'API Pollinations simple
     */
    async generatePollinationsVoice(text, outputPath, options = {}) {
        try {
            // Choisir la voix selon le contexte
            let voice = 'alloy'; // Voix par défaut OpenAI

            if (options.gender === 'male') {
                voice = 'onyx'; // Voix masculine
            } else if (options.gender === 'female') {
                voice = 'nova'; // Voix féminine
            }

            // Voix spéciales pour les personnages
            if (options.voice === 'warrior') {
                voice = options.gender === 'male' ? 'onyx' : 'shimmer';
            } else if (options.voice === 'merchant') {
                voice = options.gender === 'male' ? 'echo' : 'alloy';
            } else if (options.voice === 'noble') {
                voice = options.gender === 'male' ? 'fable' : 'nova';
            }

            console.log(`🎤 Pollinations Audio API - Voix: ${voice}, Texte: "${text.substring(0, 30)}..."`);

            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });

            // Nettoyer et limiter le texte
            let cleanText = text.replace(/[""]/g, '"').replace(/'/g, "'").trim();
            if (cleanText.length > 200) {
                cleanText = cleanText.substring(0, 200) + '...';
            }

            // Encoder le texte pour l'URL
            const encodedText = encodeURIComponent(cleanText);
            const audioUrl = `https://text.pollinations.ai/${encodedText}?model=openai-audio&voice=${voice}`;

            console.log(`🔊 Téléchargement audio depuis: ${audioUrl.substring(0, 100)}...`);

            // Télécharger l'audio directement
            const response = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data.byteLength > 0) {
                const audioBuffer = Buffer.from(response.data);

                // Sauvegarder l'audio en fichier aussi
                await fs.writeFile(outputPath, audioBuffer);
                console.log(`✅ Audio Pollinations généré: ${outputPath}`);

                // Retourner le buffer pour envoi direct
                return audioBuffer;
            } else {
                throw new Error('Audio vide reçu de Pollinations');
            }

        } catch (error) {
            console.error('❌ Erreur Pollinations Audio API:', error.message);

            // Si erreur 402 (payment required), essayer le fallback Edge-TTS
            if (error.response && error.response.status === 402) {
                console.log('💡 API Pollinations Audio limitée (402), tentative Edge-TTS...');
                return await this.generateWebSpeechAPI(text, outputPath, options);
            }

            return null;
        }
    }

    /**
     * Génère un message vocal avec Edge-TTS (API gratuite) - FALLBACK
     */
    async generateFreeVoice(text, outputPath, options = {}) {
        try {
            // Choisir la voix selon le contexte
            let voice = 'fr-FR-DeniseNeural'; // Voix féminine par défaut

            if (options.gender === 'male') {
                voice = 'fr-FR-HenriNeural'; // Voix masculine
            }

            // Voix spéciales pour les personnages
            if (options.voice === 'warrior') {
                voice = options.gender === 'male' ? 'fr-FR-AlainNeural' : 'fr-FR-BrigitteNeural';
            } else if (options.voice === 'merchant') {
                voice = options.gender === 'male' ? 'fr-FR-ClaudeNeural' : 'fr-FR-CoralieNeural';
            } else if (options.voice === 'noble') {
                voice = options.gender === 'male' ? 'fr-FR-JeromeNeural' : 'fr-FR-JacquelineNeural';
            }

            const speed = options.speed || 1.0;
            const rate = speed !== 1.0 ? `+${Math.round((speed - 1) * 100)}%` : '+0%';

            console.log(`🎤 Edge-TTS GRATUIT - Voix: ${voice}, Vitesse: ${rate}`);

            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });

            // Nettoyer le texte
            let cleanText = text.replace(/[""]/g, '"').replace(/'/g, "'").trim();
            if (cleanText.length > 500) {
                cleanText = cleanText.substring(0, 500) + '...';
            }

            // Utiliser Edge-TTS pour générer l'audio
            const { spawn } = require('child_process');

            return new Promise((resolve) => {
                console.log(`🔊 Génération vocale Edge-TTS - Voix: ${voice}`);

                const edgeProcess = spawn('edge-tts', [
                    '--voice', voice,
                    '--text', cleanText,
                    '--write-media', outputPath,
                    '--rate', rate
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let errorOutput = '';

                edgeProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                edgeProcess.on('close', async (code) => {
                    if (code === 0) {
                        try {
                            await fs.access(outputPath);
                            console.log(`✅ Audio Edge-TTS généré: ${outputPath}`);
                            resolve(outputPath);
                        } catch (accessError) {
                            console.log('⚠️ Fichier audio non créé par Edge-TTS');
                            resolve(null);
                        }
                    } else {
                        console.log(`⚠️ Edge-TTS erreur code ${code}: ${errorOutput}`);
                        resolve(null);
                    }
                });

                edgeProcess.on('error', (error) => {
                    console.log('⚠️ Edge-TTS non disponible:', error.message);
                    resolve(null);
                });
            });

        } catch (error) {
            console.error('❌ Erreur Edge-TTS gratuit:', error.message);
            return null;
        }
    }

    /**
     * Utilise Edge-TTS pour synthèse vocale gratuite
     */
    async generateWebSpeechAPI(text, outputPath, options = {}) {
        try {
            console.log('🎤 Utilisation Edge-TTS pour synthèse vocale GRATUITE');

            // Voix française par défaut
            const voice = options.voice || 'fr-FR-HenriNeural';
            const rate = options.rate || '+0%';

            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });

            // Nettoyer et raccourcir le texte
            let cleanText = text.replace(/[""]/g, '"').replace(/'/g, "'").trim();
            if (cleanText.length > 100) {
                cleanText = cleanText.substring(0, 100) + '...';
            }

            // Utiliser Edge-TTS directement
            const { spawn } = require('child_process');

            return new Promise((resolve, reject) => {
                console.log(`🔊 Génération vocale Edge-TTS - Voix: ${voice}`);

                const edgeProcess = spawn('edge-tts', [
                    '--voice', voice,
                    '--text', cleanText,
                    '--write-media', outputPath,
                    '--rate=' + rate
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let errorOutput = '';

                edgeProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                edgeProcess.on('close', async (code) => {
                    if (code === 0) {
                        try {
                            await fs.access(outputPath);
                            console.log(`✅ Audio Edge-TTS généré: ${outputPath}`);
                            resolve(outputPath);
                        } catch (accessError) {
                            console.log('⚠️ Fichier audio non créé');
                            resolve(null);
                        }
                    } else {
                        console.log(`⚠️ Edge-TTS erreur code ${code}: ${errorOutput}`);
                        resolve(null);
                    }
                });

                edgeProcess.on('error', (error) => {
                    console.log('⚠️ Edge-TTS non disponible:', error.message);
                    resolve(null);
                });
            });

        } catch (error) {
            console.log('⚠️ Erreur Edge-TTS:', error.message);
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
     * Synthèse vocale système avec espeak (Linux)
     */
    async generateSystemVoice(text, outputPath, options = {}) {
        try {
            console.log('🔊 Tentative synthèse système avec espeak...');

            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });

            const { spawn } = require('child_process');

            return new Promise((resolve, reject) => {
                // Utiliser espeak pour générer un fichier WAV temporaire
                const tempWavPath = outputPath.replace('.mp3', '.wav');
                const speed = options.speed ? Math.round(options.speed * 175) : 175;

                const espeakProcess = spawn('espeak', [
                    '-v', 'fr',
                    '-s', speed.toString(),
                    '-w', tempWavPath,
                    text
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                espeakProcess.on('close', async (code) => {
                    if (code === 0) {
                        try {
                            // Convertir WAV en MP3 avec ffmpeg si disponible
                            const ffmpegProcess = spawn('ffmpeg', [
                                '-y', '-i', tempWavPath,
                                '-acodec', 'libmp3lame',
                                '-b:a', '128k',
                                outputPath
                            ], { stdio: ['pipe', 'pipe', 'pipe'] });

                            ffmpegProcess.on('close', async (ffmpegCode) => {
                                // Nettoyer le fichier WAV temporaire
                                try {
                                    await fs.unlink(tempWavPath);
                                } catch (unlinkError) {
                                    console.log('⚠️ Impossible de supprimer le fichier temporaire');
                                }

                                if (ffmpegCode === 0) {
                                    console.log(`✅ Audio système généré (espeak + ffmpeg): ${outputPath}`);
                                    resolve(outputPath);
                                } else {
                                    // Si ffmpeg échoue, renommer le WAV en MP3
                                    try {
                                        await fs.rename(tempWavPath, outputPath);
                                        console.log(`✅ Audio système généré (espeak WAV): ${outputPath}`);
                                        resolve(outputPath);
                                    } catch (renameError) {
                                        resolve(null);
                                    }
                                }
                            });

                            ffmpegProcess.on('error', async () => {
                                // Si ffmpeg n'est pas disponible, utiliser le WAV
                                try {
                                    await fs.rename(tempWavPath, outputPath);
                                    console.log(`✅ Audio système généré (espeak WAV): ${outputPath}`);
                                    resolve(outputPath);
                                } catch (renameError) {
                                    resolve(null);
                                }
                            });

                        } catch (conversionError) {
                            resolve(null);
                        }
                    } else {
                        console.log('⚠️ espeak non disponible');
                        resolve(null);
                    }
                });

                espeakProcess.on('error', (error) => {
                    console.log('⚠️ espeak non installé');
                    resolve(null);
                });
            });

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

            // Utiliser la nouvelle API Pollinations directement
            const voiceOptions = {
                voice: 'warrior',
                gender: character.gender || 'male',
                ...options
            };

            return await this.generatePollinationsVoice(dialogue, outputPath, voiceOptions);

        } catch (error) {
            console.error('❌ Erreur génération dialogue vocal:', error.message);

            // Fallback vers PlayHT ou autres méthodes
            if (this.playhtClient && this.playhtClient.hasValidClient()) {
                try {
                    return await this.playhtClient.generateDialogueVoice(character, npcName, dialogue, outputPath, options);
                } catch (playhtError) {
                    console.log('⚠️ Fallback PlayHT échoué aussi');
                }
            }

            return null;
        }
    }

    /**
     * Génère un audio de narration pour les actions
     */
    async generateNarrationVoice(narration, outputPath, options = {}) {
        try {
            console.log(`📖 Génération narration vocale: "${narration.substring(0, 30)}..."`);

            // Utiliser la nouvelle API Pollinations directement
            const voiceOptions = {
                voice: 'fable', // Voix narrative
                gender: 'male',
                ...options
            };

            return await this.generatePollinationsVoice(narration, outputPath, voiceOptions);

        } catch (error) {
            console.error('❌ Erreur génération narration vocale:', error.message);

            // Fallback vers les anciennes méthodes
            try {
                const fallbackResult = await this.generateFallbackVoice(narration, outputPath, options);
                if (fallbackResult) {
                    return fallbackResult;
                }
            } catch (fallbackError) {
                console.log('⚠️ Tous les fallbacks vocaux échoués');
            }

            return null;
        }
    }
}

module.exports = PollinationsClient;