const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const PlayHTClient = require('../playht/PlayHTClient');
const CambAIClient = require('../camb/CambAIClient');

class PollinationsClient {
    constructor() {
        this.baseURL = 'https://image.pollinations.ai/prompt';
        this.isAvailable = true;

        // Initialiser le client de synthèse vocale Camb AI en priorité
        this.cambAIClient = new CambAIClient();

        // Initialiser PlayHT comme fallback
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

            // Télécharger l'image directement avec retry et timeout augmenté
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 120000, // Augmenté à 2 minutes
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/png,image/jpeg,image/webp,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
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

        // Styles améliorés avec focus STEAMPUNK 3D
        if (style === '3d') {
            optimized = `steampunk 3D render, steampunk aesthetic, 3D rendered scene, unreal engine 5, photorealistic, detailed steampunk fantasy, ${optimized}`;
        } else {
            optimized = `steampunk concept art, steampunk style, digital art, steampunk fantasy illustration, ${optimized}`;
        }

        // Perspectives FORCÉES vue steampunk 3D
        const perspectiveMap = {
            'first_person': 'first person POV, immersive first-person view, steampunk gameplay perspective, hands visible holding steampunk weapon, immersive camera angle',
            'second_person': 'close-up portrait, face focus, detailed steampunk character features, steampunk style face',
            'third_person': 'full body, dynamic pose, action shot, steampunk character model'
        };

        optimized = `${optimized}, ${perspectiveMap[perspective]}`;

        // Environnement et atmosphère steampunk
        optimized = `${optimized}, steampunk architecture, steampunk fantasy environment, brass and copper details, steam pipes, gears, atmospheric lighting, cinematic depth of field`;

        // Gestion nudité avec style steampunk
        if (nudity) {
            optimized = `${optimized}, detailed anatomy, steampunk clothing`;
        } else {
            optimized = `${optimized}, full steampunk armor, detailed brass armor, leather and metal armor, copper armor, steel and brass armor, steampunk weapons`;
        }

        // Qualité et style spécifique steampunk 3D
        optimized = `${optimized}, masterpiece, high quality, 8K, vibrant colors, sharp focus, realistic textures, volumetric lighting, steampunk 3D quality, photorealistic rendering`;

        // Éléments visuels steampunk signature
        optimized = `${optimized}, steampunk gears, brass mechanical parts, copper pipes, steam-powered machinery, steampunk fantasy atmosphere`;

        // Limiter la longueur pour l'URL
        if (optimized.length > 400) {
            optimized = optimized.substring(0, 400);
        }

        return optimized;
    }

    optimizePromptForPollinations(prompt) {
        // Ajouter des mots-clés spécifiques à Pollinations pour améliorer la qualité et la précision
        const qualityKeywords = "steampunk style, steampunk aesthetic, 3D render, unreal engine 5, photorealistic, detailed steampunk fantasy";
        const precisionKeywords = "accurate to description, exactly as described, precise details, follow description perfectly";

        // Nettoyer le prompt et optimiser pour Pollinations
        let optimizedPrompt = prompt
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Si le prompt contient "MUST SHOW EXACTLY", le prioriser ABSOLUMENT
        if (optimizedPrompt.includes("MUST SHOW EXACTLY")) {
            // Extraire la description après "MUST SHOW EXACTLY:"
            const mustShowMatch = optimizedPrompt.match(/MUST SHOW EXACTLY:\s*([^,]+)/);
            if (mustShowMatch) {
                const exactDescription = mustShowMatch[1].trim();
                console.log(`🎯 DESCRIPTION EXACTE EXTRAITE: "${exactDescription}"`);
                return `${exactDescription}, ${precisionKeywords}, ${qualityKeywords}, ${optimizedPrompt}`;
            }
            return `${precisionKeywords}, ${qualityKeywords}, ${optimizedPrompt}`;
        }

        return `${qualityKeywords}, ${optimizedPrompt}`;
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
        
        // Construire le prompt en PRIORISANT la photo du joueur ET sa description
        let prompt = '';
        
        if (character.appearance && character.appearance.trim().length > 0) {
            // PRIORITÉ MAXIMALE : Combiner les traits du visage du joueur avec sa description
            console.log(`🎯 CRÉATION AVEC PHOTO + DESCRIPTION: "${character.appearance}"`);
            prompt = `MUST SHOW EXACTLY: ${genderDesc} person with the facial features from the provided reference photo, embodying this character: ${character.appearance}. This character is performing: ${action}. ${narration}`;
        } else {
            // Fallback si pas de description mais potentiellement une photo
            prompt = `MUST SHOW EXACTLY: ${character.name}, ${genderDesc} warrior from ${character.kingdom} kingdom with realistic facial features, performing: ${action}. ${narration}`;
        }
        
        prompt += ', epic fantasy scene, first person POV perspective, photorealistic facial features, detailed character design based on real person appearance';
        
        console.log(`🎨 PROMPT FINAL AVEC PHOTO + APPARENCE: "${prompt}"`);

        return await this.generateImage(prompt, outputPath, {
            style: options.style || '3d',
            perspective: 'first_person',
            nudity: options.nudity || false
        });
    }

    /**
     * Génère un message vocal avec priorité à Camb AI
     */
    async generateVoice(text, outputPath, options = {}) {
        try {
            console.log(`🎙️ Génération vocale - Essai avec Camb AI MARS5...`);

            // Essayer d'abord Camb AI (qualité supérieure)
            if (this.cambAIClient && await this.cambAIClient.hasValidClient()) {
                console.log('🎙️ Utilisation de Camb AI MARS5 pour la synthèse vocale');
                const cambResult = await this.cambAIClient.generateVoice(text, outputPath, {
                    gender: options.gender || 'male',
                    age: options.age || 30,
                    language: 'fr',
                    ...options
                });

                if (cambResult) {
                    console.log('✅ Audio généré avec succès par Camb AI');
                    return cambResult;
                }
            }

            // Fallback vers Pollinations Audio
            console.log('🔄 Fallback vers Pollinations Audio...');
            return await this.generatePollinationsVoice(text, outputPath, options);

        } catch (error) {
            console.log('⚠️ Erreur génération vocale, essai fallback:', error.message);
            return await this.generateFallbackVoice(text, outputPath, options);
        }
    }

    /**
     * Génère un message vocal avec l'API Pollinations Audio simplifiée
     */
    async generatePollinationsVoice(text, outputPath, options = {}) {
        try {
            // Choisir la voix selon le contexte (voix OpenAI compatibles)
            let voice = 'alloy'; // Voix par défaut

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
            if (cleanText.length > 300) {
                cleanText = cleanText.substring(0, 300) + '...';
            }

            // Utiliser l'API suggérée directement : GET https://text.pollinations.ai/{prompt}?model=openai-audio&voice={voice}
            const audioUrl = `https://text.pollinations.ai/${encodeURIComponent(cleanText)}?model=openai-audio&voice=${voice}`;

            console.log(`🔊 Téléchargement audio depuis Pollinations...`);

            // Télécharger l'audio directement avec gestion d'erreur améliorée
            const response = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 45000, // Timeout augmenté
                maxRedirects: 3,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'audio/mpeg, audio/wav, audio/ogg, */*',
                    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
                }
            });

            if (response.data && response.data.byteLength > 0) {
                const audioBuffer = Buffer.from(response.data);

                // Sauvegarder l'audio en fichier
                await fs.writeFile(outputPath, audioBuffer);
                console.log(`✅ Audio Pollinations généré: ${outputPath} (${audioBuffer.length} bytes)`);

                // Retourner le buffer pour envoi WhatsApp
                return audioBuffer;
            } else {
                throw new Error('Audio vide reçu de Pollinations');
            }

        } catch (error) {
            console.error('❌ Erreur Pollinations Audio API:', error.message);

            // Si erreur 402 (Payment Required), désactiver Pollinations Audio
            if (error.response && error.response.status === 402) {
                console.log('⚠️ Pollinations Audio nécessite un paiement - Audio désactivé');
                return null;
            }

            // Pour les autres erreurs, essayer le fallback système
            if (error.response && error.response.status >= 400) {
                console.log('💡 Fallback vers synthèse vocale système...');
                return await this.generateSimpleFallbackVoice(text, outputPath, options);
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
     * Utilise Edge-TTS pour synthèse vocale gratuite avec voix correctes
     */
    async generateWebSpeechAPI(text, outputPath, options = {}) {
        try {
            console.log('🎤 Utilisation Edge-TTS pour synthèse vocale GRATUITE');

            // Choisir la vraie voix Edge-TTS selon le contexte
            let voice = 'fr-FR-DeniseNeural'; // Voix féminine par défaut

            if (options.gender === 'male') {
                voice = 'fr-FR-HenriNeural'; // Voix masculine française
            }

            // Voix spéciales correctes pour les personnages
            if (options.voice === 'warrior') {
                voice = options.gender === 'male' ? 'fr-FR-AlainNeural' : 'fr-FR-BrigitteNeural';
            } else if (options.voice === 'merchant') {
                voice = options.gender === 'male' ? 'fr-FR-ClaudeNeural' : 'fr-FR-CoralieNeural';
            } else if (options.voice === 'noble') {
                voice = options.gender === 'male' ? 'fr-FR-JeromeNeural' : 'fr-FR-JacquelineNeural';
            }

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
     * Fallback vocal simple sans dépendances externes
     */
    async generateSimpleFallbackVoice(text, outputPath, options = {}) {
        try {
            console.log('🔊 Génération vocale fallback simple (désactivée)...');
            
            // Pour l'instant, désactiver complètement l'audio au lieu d'échouer
            // Cela permet au jeu de continuer sans audio
            console.log('⚠️ Audio désactivé - mode texte uniquement');
            return null;

        } catch (error) {
            console.log('⚠️ Fallback vocal simple échoué:', error.message);
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
     * Obtenir l'âge approprié selon le type de personnage pour Camb AI
     */
    getAgeForCharacterType(characterType) {
        const ageMap = {
            'warrior': 30,
            'merchant': 45,
            'noble': 35,
            'wizard': 55,
            'child': 18,
            'elder': 65,
            'habitant': 40,
            'garde': 32,
            'prêtre': 50,
            'voleur': 28
        };

        return ageMap[characterType.toLowerCase()] || 35;
    }

    /**
     * Obtenir un voice_id spécifique pour Camb AI selon le personnage
     */
    getVoiceIdForCharacter(characterType, gender) {
        // Ces IDs doivent correspondre aux voix disponibles dans Camb AI
        const voiceMap = {
            'warrior_male': null, // Laisser l'API choisir selon l'âge/genre
            'warrior_female': null,
            'merchant_male': null,
            'merchant_female': null,
            'noble_male': null,
            'noble_female': null
        };

        const key = `${characterType.toLowerCase()}_${gender}`;
        return voiceMap[key] || null;
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
     * Génère un dialogue vocal pour les PNJ avec Camb AI en priorité
     */
    async generateDialogueVoice(character, npcName, dialogue, outputPath, options = {}) {
        try {
            console.log(`🎭 Génération dialogue vocal pour ${npcName}: "${dialogue.substring(0, 30)}..."`);

            // Préparer les options de voix optimisées pour Camb AI
            const voiceOptions = {
                gender: character.gender || 'male',
                age: this.getAgeForCharacterType(npcName),
                language: 'fr',
                voice_id: this.getVoiceIdForCharacter(npcName, character.gender),
                ...options
            };

            // Essayer d'abord Camb AI (qualité supérieure)
            if (this.cambAIClient && await this.cambAIClient.hasValidClient()) {
                console.log('🎙️ Génération dialogue avec Camb AI MARS5...');
                try {
                    const cambResult = await this.cambAIClient.generateDialogueVoice(
                        dialogue,
                        outputPath,
                        npcName,
                        character.gender || 'male'
                    );

                    if (cambResult) {
                        console.log('✅ Dialogue généré avec Camb AI MARS5');
                        return cambResult;
                    }
                } catch (cambError) {
                    console.log('⚠️ Camb AI dialogue échec:', cambError.message);
                }
            }

            // Fallback vers Pollinations avec voix adaptée
            console.log('🔄 Fallback dialogue vers Pollinations...');
            return await this.generatePollinationsVoice(dialogue, outputPath, voiceOptions);

        } catch (error) {
            console.error('❌ Erreur génération dialogue vocal:', error.message);
            return null;
        }
    }

    /**
     * Génère un audio de narration pour les actions avec Camb AI en priorité
     */
    async generateNarrationVoice(narration, outputPath, options = {}) {
        try {
            console.log(`📖 Génération narration vocale: "${narration.substring(0, 30)}..."`);

            // Préparer les options pour la narration avec Camb AI
            const voiceOptions = {
                gender: options.gender || 'male',
                age: options.age || 35,
                language: 'fr',
                voice_id: options.voice_id || null,
                ...options
            };

            // Essayer d'abord Camb AI (qualité supérieure MARS5)
            if (this.cambAIClient && await this.cambAIClient.hasValidClient()) {
                console.log('🎙️ Génération narration avec Camb AI MARS5...');
                try {
                    const cambResult = await this.cambAIClient.generateNarrationVoice(narration, outputPath, voiceOptions);
                    if (cambResult) {
                        console.log('✅ Narration générée avec Camb AI MARS5');
                        return cambResult;
                    }
                } catch (cambError) {
                    console.log('⚠️ Camb AI narration échec:', cambError.message);
                }
            } else {
                console.log('⚠️ Camb AI non disponible pour la narration');
            }

            // Fallback vers Pollinations
            console.log('🔄 Fallback narration vers Pollinations...');
            return await this.generatePollinationsVoice(narration, outputPath, voiceOptions);

        } catch (error) {
            console.error('❌ Erreur génération narration vocale:', error.message);
            return null;
        }
    }
}

module.exports = PollinationsClient;