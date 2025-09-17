
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
     * Génère un message vocal avec Edge-TTS (API gratuite)
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
            const rate = speed !== 1.0 ? `${Math.round((speed - 1) * 100)}%` : '+0%';
            
            console.log(`🎤 Edge-TTS GRATUIT - Voix: ${voice}, Vitesse: ${rate}`);
            
            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Utiliser Edge-TTS pour génération gratuite
            return await this.generateWebSpeechAPI(text, outputPath, { voice, speed, rate });
            
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
            const voice = options.voice || 'fr-FR-DeniseNeural';
            const rate = options.speed ? `${Math.round((options.speed - 1) * 100)}%` : '+0%';
            
            // Créer le dossier si nécessaire
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Utiliser Edge-TTS via Python
            const { spawn } = require('child_process');
            
            return new Promise((resolve, reject) => {
                console.log(`🔊 Génération vocale avec Edge-TTS - Voix: ${voice}`);
                
                const edgeProcess = spawn('python3', ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', outputPath, '--rate', rate], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                
                let output = '';
                let errorOutput = '';
                
                edgeProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                edgeProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                edgeProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ Audio Edge-TTS généré GRATUITEMENT: ${outputPath}`);
                        resolve(outputPath);
                    } else {
                        console.error(`❌ Erreur Edge-TTS (code ${code}):`, errorOutput);
                        resolve(null); // Ne pas rejeter, juste retourner null pour fallback
                    }
                });
                
                edgeProcess.on('error', (error) => {
                    console.error('❌ Erreur lancement Edge-TTS:', error.message);
                    resolve(null); // Fallback vers PlayHT
                });
            });
            
        } catch (error) {
            console.error('❌ Erreur Edge-TTS:', error.message);
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
