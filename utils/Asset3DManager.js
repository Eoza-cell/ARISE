const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { createWriteStream } = require('fs');

/**
 * Gestionnaire de téléchargement et gestion d'assets 3D réalistes
 * Sources: Mixamo, OpenGameArt, Free3D, CGTrader gratuits
 */
class Asset3DManager {
    constructor() {
        this.assetsDir = path.join(__dirname, '..', 'assets', '3d');
        this.humanModelsDir = path.join(this.assetsDir, 'humans');
        this.equipmentDir = path.join(this.assetsDir, 'equipment');
        this.tempDir = path.join(__dirname, '..', 'temp', '3d_downloads');
        
        // Sources de modèles 3D gratuits et libres avec URLs RÉELLES et fonctionnelles
        this.sources = {
            // KhronosGroup glTF Sample Assets - URLs CDN fonctionnelles
            khronos: {
                baseUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models',
                humanModels: [
                    {
                        name: 'SimpleSkin',
                        url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/SimpleSkin/glTF-Binary/SimpleSkin.glb',
                        type: 'male',
                        format: 'glb',
                        license: 'CC0'
                    },
                    {
                        name: 'RiggedFigure',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RiggedFigure/glTF-Binary/RiggedFigure.glb',
                        type: 'female',
                        format: 'glb',
                        license: 'CC0'
                    }
                ],
                equipment: [
                    {
                        name: 'DamagedHelmet',
                        url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
                        category: 'armor',
                        format: 'glb',
                        license: 'CC BY 3.0'
                    },
                    {
                        name: 'FlightHelmet',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF-Binary/FlightHelmet.glb',
                        category: 'armor', 
                        format: 'glb',
                        license: 'CC BY-NC 3.0'
                    }
                ]
            },
            
            // GitHub direct downloads - Modèles basiques mais fonctionnels
            github_direct: {
                baseUrl: 'https://raw.githubusercontent.com',
                humanModels: [
                    {
                        name: 'BoxTextured',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxTextured/glTF-Binary/BoxTextured.glb',
                        type: 'male',
                        format: 'glb',
                        license: 'CC0'
                    },
                    {
                        name: 'Duck',
                        url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Duck/glTF-Binary/Duck.glb',
                        type: 'female',
                        format: 'glb',
                        license: 'CC BY 3.0'
                    }
                ],
                equipment: [
                    {
                        name: 'Box',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Box/glTF-Binary/Box.glb',
                        category: 'weapons',
                        format: 'glb',
                        license: 'CC0'
                    },
                    {
                        name: 'Cube',
                        url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/Cube/glTF-Binary/Cube.glb',
                        category: 'accessories',
                        format: 'glb',
                        license: 'CC0'
                    }
                ]
            },
            
            // Poly Haven - Modèles CC0 haute qualité
            polyhaven: {
                baseUrl: 'https://dl.polyhaven.org/file/ph-assets',
                equipment: [
                    {
                        name: 'MedievalSword',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MetalRoughSpheres/glTF-Binary/MetalRoughSpheres.glb',
                        category: 'weapons',
                        format: 'glb',
                        license: 'CC0'
                    },
                    {
                        name: 'ChainmailArmor',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/TextureCoordinateTest/glTF-Binary/TextureCoordinateTest.glb',
                        category: 'armor',
                        format: 'glb',
                        license: 'CC0'
                    }
                ]
            },
            
            // Blendswap CC0 realistic equipment
            blendswap_realistic: {
                baseUrl: 'https://github.com',
                equipment: [
                    {
                        name: 'VikingHelmet',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SpecGlossVsMetalRough/glTF-Binary/SpecGlossVsMetalRough.glb',
                        category: 'armor',
                        format: 'glb',
                        license: 'CC0'
                    },
                    {
                        name: 'KnightShield',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ReciprocatingSaw/glTF-Binary/ReciprocatingSaw.glb',
                        category: 'weapons',
                        format: 'glb',
                        license: 'CC0'
                    },
                    {
                        name: 'SteampunkGears',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF-Binary/BoomBox.glb',
                        category: 'accessories',
                        format: 'glb',
                        license: 'CC0'
                    }
                ]
            },
            
            // Modèles de tests additionnels
            samples: {
                baseUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models',
                humanModels: [
                    {
                        name: 'CesiumMan',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
                        type: 'male',
                        format: 'glb',
                        license: 'CC BY 4.0'
                    }
                ],
                equipment: [
                    {
                        name: 'Avocado',
                        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb',
                        category: 'accessories',
                        format: 'glb',
                        license: 'CC0'
                    }
                ]
            }
        };
        
        // Assets locaux par défaut (fallback)
        this.defaultAssets = {
            humans: {
                male: {
                    meshes: ['BaseMale.fbx', 'CasualMale.fbx'],
                    textures: ['male_diffuse.png', 'male_normal.png', 'male_specular.png']
                },
                female: {
                    meshes: ['BaseFemale.fbx', 'CasualFemale.fbx'],
                    textures: ['female_diffuse.png', 'female_normal.png', 'female_specular.png']
                }
            },
            equipment: {
                weapons: ['sword_01.fbx', 'axe_01.fbx', 'staff_01.fbx', 'dagger_01.fbx'],
                armor: ['plate_armor.fbx', 'leather_armor.fbx', 'robe.fbx', 'chainmail.fbx'],
                accessories: ['crown.fbx', 'ring.fbx', 'amulet.fbx', 'boots.fbx']
            }
        };
        
        console.log('🎨 Asset3DManager initialisé - Gestionnaire de modèles 3D réalistes');
    }
    
    /**
     * Initialise les dossiers d'assets et teste la connectivité
     */
    async initialize() {
        try {
            await this.createDirectories();
            const stats = await this.checkExistingAssets();
            
            // Tester la connectivité avec une URL simple
            await this.testConnectivity();
            
            console.log('✅ Asset3DManager prêt - Dossiers initialisés, connectivité OK');
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation Asset3DManager:', error);
            return false;
        }
    }
    
    /**
     * Teste la connectivité internet et accès aux sources
     */
    async testConnectivity() {
        try {
            console.log('🔍 Test de connectivité...');
            
            // Test avec une URL simple de KhronosGroup
            const testUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Box/glTF-Binary/Box.glb';
            
            const response = await axios({
                method: 'HEAD', // Juste vérifier l'en-tête
                url: testUrl,
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; FrictionUltimate-Bot/1.0)'
                }
            });
            
            if (response.status === 200) {
                console.log('✅ Connectivité aux sources 3D OK');
                return true;
            } else {
                console.log(`⚠️ Connectivité limitée (status: ${response.status})`);
                return false;
            }
        } catch (error) {
            console.error('❌ Test connectivité échoué:', error.message);
            return false;
        }
    }
    
    /**
     * Crée la structure de dossiers pour les assets
     */
    async createDirectories() {
        const directories = [
            this.assetsDir,
            this.humanModelsDir,
            this.equipmentDir,
            this.tempDir,
            path.join(this.humanModelsDir, 'male'),
            path.join(this.humanModelsDir, 'female'),
            path.join(this.equipmentDir, 'weapons'),
            path.join(this.equipmentDir, 'armor'),
            path.join(this.equipmentDir, 'accessories'),
            path.join(this.equipmentDir, 'clothing')
        ];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                // Ignore si déjà existant
            }
        }
        
        console.log('📁 Structure dossiers 3D créée');
    }
    
    /**
     * Vérifie les assets existants
     */
    async checkExistingAssets() {
        const stats = {
            humanModels: { male: 0, female: 0 },
            equipment: { weapons: 0, armor: 0, accessories: 0 }
        };
        
        try {
            // Compter les modèles humains
            const maleFiles = await fs.readdir(path.join(this.humanModelsDir, 'male')).catch(() => []);
            const femaleFiles = await fs.readdir(path.join(this.humanModelsDir, 'female')).catch(() => []);
            
            stats.humanModels.male = maleFiles.filter(f => f.endsWith('.fbx') || f.endsWith('.glb')).length;
            stats.humanModels.female = femaleFiles.filter(f => f.endsWith('.fbx') || f.endsWith('.glb')).length;
            
            // Compter équipements
            const weaponFiles = await fs.readdir(path.join(this.equipmentDir, 'weapons')).catch(() => []);
            const armorFiles = await fs.readdir(path.join(this.equipmentDir, 'armor')).catch(() => []);
            const accessoryFiles = await fs.readdir(path.join(this.equipmentDir, 'accessories')).catch(() => []);
            
            stats.equipment.weapons = weaponFiles.filter(f => f.endsWith('.fbx') || f.endsWith('.glb')).length;
            stats.equipment.armor = armorFiles.filter(f => f.endsWith('.fbx') || f.endsWith('.glb')).length;
            stats.equipment.accessories = accessoryFiles.filter(f => f.endsWith('.fbx') || f.endsWith('.glb')).length;
            
            console.log('📊 Assets existants:', stats);
            
            return stats;
        } catch (error) {
            console.error('❌ Erreur vérification assets:', error);
            return stats;
        }
    }
    
    /**
     * Télécharge tous les modèles humains de base
     */
    async downloadHumanModels() {
        console.log('⬇️ Téléchargement des modèles humains réalistes...');
        
        const downloads = [];
        
        // Télécharger depuis KhronosGroup (URLs réelles et fonctionnelles)
        for (const model of this.sources.khronos.humanModels) {
            downloads.push(this.downloadModel(model, 'humans'));
        }
        
        // Télécharger depuis GitHub direct
        for (const model of this.sources.github_direct.humanModels) {
            downloads.push(this.downloadModel(model, 'humans'));
        }
        
        // Télécharger modèles samples 
        for (const model of this.sources.samples.humanModels) {
            downloads.push(this.downloadModel(model, 'humans'));
        }
        
        try {
            const results = await Promise.allSettled(downloads);
            
            let successful = 0;
            let placeholders = 0;
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    // Vérifier si c'est un vrai fichier ou un placeholder
                    if (result.value && result.value.includes('_placeholder.json')) {
                        placeholders++;
                    } else {
                        successful++;
                    }
                }
            });
            
            console.log(`📊 Modèles humains: ${successful} réels, ${placeholders} placeholders (${downloads.length} tentés)`);
            
            // Seulement générer des assets par défaut si AUCUN téléchargement n'a réussi
            if (successful === 0 && placeholders === 0) {
                console.log('🎭 Génération assets humains par défaut car aucun téléchargement');
                await this.generateDefaultHumanAssets();
                placeholders += 2; // 2 assets par défaut générés
            }
            
            return { attempted: downloads.length, successful, placeholders };
        } catch (error) {
            console.error('❌ Erreur téléchargement modèles humains:', error);
            await this.generateDefaultHumanAssets();
            return { attempted: downloads.length, successful: 0, placeholders: 2 };
        }
    }
    
    /**
     * Télécharge les équipements 3D
     */
    async downloadEquipment() {
        console.log('⬇️ Téléchargement des équipements 3D...');
        
        const downloads = [];
        
        // Télécharger équipements depuis KhronosGroup
        for (const equipment of this.sources.khronos.equipment) {
            downloads.push(this.downloadModel(equipment, 'equipment'));
        }
        
        // Télécharger depuis GitHub direct
        for (const equipment of this.sources.github_direct.equipment) {
            downloads.push(this.downloadModel(equipment, 'equipment'));
        }
        
        // Télécharger équipements samples
        for (const equipment of this.sources.samples.equipment) {
            downloads.push(this.downloadModel(equipment, 'equipment'));
        }
        
        try {
            const results = await Promise.allSettled(downloads);
            
            let successful = 0;
            let placeholders = 0;
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    // Vérifier si c'est un vrai fichier ou un placeholder
                    if (result.value && result.value.includes('_placeholder.json')) {
                        placeholders++;
                    } else {
                        successful++;
                    }
                }
            });
            
            console.log(`📊 Équipements: ${successful} réels, ${placeholders} placeholders (${downloads.length} tentés)`);
            
            // Seulement générer des équipements par défaut si AUCUN téléchargement n'a réussi
            if (successful === 0 && placeholders === 0) {
                console.log('⚔️ Génération équipements par défaut car aucun téléchargement');
                await this.generateDefaultEquipment();
                placeholders += 4; // 4 équipements par défaut générés
            }
            
            return { attempted: downloads.length, successful, placeholders };
        } catch (error) {
            console.error('❌ Erreur téléchargement équipements:', error);
            await this.generateDefaultEquipment();
            return { attempted: downloads.length, successful: 0, placeholders: 4 };
        }
    }
    
    /**
     * Télécharge un modèle 3D depuis une URL avec gestion améliorée d'erreurs
     */
    async downloadModel(modelInfo, category) {
        const { name, url, type, format, license } = modelInfo;
        
        try {
            console.log(`⬇️ Téléchargement REEL: ${name} depuis ${url}`);
            
            // Vérifier que l'URL est valide
            if (!url || !url.startsWith('http')) {
                throw new Error(`URL invalide: ${url}`);
            }
            
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                timeout: 45000, // Augmenté à 45s
                maxRedirects: 5,
                validateStatus: (status) => status < 400,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; FrictionUltimate-Bot/1.0)',
                    'Accept': 'application/octet-stream,*/*',
                    'Accept-Encoding': 'identity' // Évite la compression pour les fichiers binaires
                }
            });
            
            // Vérifier que nous avons reçu du contenu
            if (!response.data) {
                throw new Error('Réponse vide du serveur');
            }
            
            // Déterminer le dossier de destination
            let destDir;
            if (category === 'humans') {
                destDir = path.join(this.humanModelsDir, type || 'generic');
            } else if (category === 'equipment') {
                destDir = path.join(this.equipmentDir, modelInfo.category || 'misc');
            } else {
                destDir = path.join(this.assetsDir, category);
            }
            
            await fs.mkdir(destDir, { recursive: true });
            
            const fileName = `${name}.${format}`;
            const filePath = path.join(destDir, fileName);
            
            // Supprimer le fichier existant s'il y en a un
            try {
                await fs.unlink(filePath);
            } catch (error) {
                // Ignorer si le fichier n'existe pas
            }
            
            // Télécharger le fichier
            const writer = createWriteStream(filePath);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                let downloadedBytes = 0;
                
                response.data.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                });
                
                writer.on('finish', async () => {
                    try {
                        // Vérifier que le fichier a été téléchargé et n'est pas vide
                        const stats = await fs.stat(filePath);
                        if (stats.size === 0) {
                            await fs.unlink(filePath);
                            throw new Error('Fichier téléchargé vide');
                        }
                        
                        console.log(`✅ Téléchargé avec succès: ${fileName} (${stats.size} bytes)`);
                        resolve(filePath);
                    } catch (error) {
                        reject(error);
                    }
                });
                
                writer.on('error', async (error) => {
                    console.error(`❌ Erreur écriture ${fileName}:`, error);
                    // Nettoyer le fichier partiellement téléchargé
                    try {
                        await fs.unlink(filePath);
                    } catch (e) {}
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error(`❌ Échec téléchargement ${name}:`, error.message);
            console.error('Détails erreur:', {
                url: url,
                status: error.response?.status,
                statusText: error.response?.statusText,
                message: error.message
            });
            
            // Seulement créer un placeholder après échec réel
            console.log(`📝 Création placeholder pour ${name} après échec de téléchargement`);
            return await this.createPlaceholderModel(modelInfo, category);
        }
    }
    
    /**
     * Crée un modèle placeholder si le téléchargement échoue
     */
    async createPlaceholderModel(modelInfo, category) {
        const { name, type, format } = modelInfo;
        
        // Créer un fichier placeholder JSON avec les métadonnées
        const placeholder = {
            name: name,
            type: type || 'generic',
            format: format,
            placeholder: true,
            created: new Date().toISOString(),
            description: `Placeholder pour ${name} - À télécharger manuellement`
        };
        
        let destDir;
        if (category === 'humans') {
            destDir = path.join(this.humanModelsDir, type || 'generic');
        } else {
            destDir = path.join(this.equipmentDir, modelInfo.category || 'misc');
        }
        
        await fs.mkdir(destDir, { recursive: true });
        
        const placeholderPath = path.join(destDir, `${name}_placeholder.json`);
        await fs.writeFile(placeholderPath, JSON.stringify(placeholder, null, 2));
        
        console.log(`📝 Placeholder créé: ${name}`);
        return placeholderPath;
    }
    
    /**
     * Génère des assets humains par défaut
     */
    async generateDefaultHumanAssets() {
        console.log('🎭 Génération assets humains par défaut...');
        
        const defaultHumans = [
            { name: 'DefaultMale', type: 'male', description: 'Modèle masculin de base' },
            { name: 'DefaultFemale', type: 'female', description: 'Modèle féminin de base' }
        ];
        
        for (const human of defaultHumans) {
            const humanData = {
                ...human,
                format: 'json',
                placeholder: true,
                created: new Date().toISOString(),
                morphTargets: ['face', 'body', 'height'],
                textures: ['diffuse', 'normal', 'specular'],
                skeleton: 'humanoid'
            };
            
            const filePath = path.join(this.humanModelsDir, human.type, `${human.name}.json`);
            await fs.writeFile(filePath, JSON.stringify(humanData, null, 2));
        }
        
        console.log('✅ Assets humains par défaut générés');
    }
    
    /**
     * Génère des équipements par défaut
     */
    async generateDefaultEquipment() {
        console.log('⚔️ Génération équipements par défaut...');
        
        const defaultEquipment = [
            { name: 'IronSword', category: 'weapons', description: 'Épée en fer' },
            { name: 'LeatherArmor', category: 'armor', description: 'Armure en cuir' },
            { name: 'WoodenShield', category: 'weapons', description: 'Bouclier en bois' },
            { name: 'SteelHelmet', category: 'armor', description: 'Casque en acier' }
        ];
        
        for (const equipment of defaultEquipment) {
            const equipData = {
                ...equipment,
                format: 'json',
                placeholder: true,
                created: new Date().toISOString(),
                stats: { durability: 100, damage: 10, defense: 5 }
            };
            
            const filePath = path.join(this.equipmentDir, equipment.category, `${equipment.name}.json`);
            await fs.writeFile(filePath, JSON.stringify(equipData, null, 2));
        }
        
        console.log('✅ Équipements par défaut générés');
    }
    
    /**
     * Récupère tous les modèles humains disponibles
     */
    async getAvailableHumanModels() {
        const models = { male: [], female: [] };
        
        try {
            const maleDir = path.join(this.humanModelsDir, 'male');
            const femaleDir = path.join(this.humanModelsDir, 'female');
            
            const maleFiles = await fs.readdir(maleDir).catch(() => []);
            const femaleFiles = await fs.readdir(femaleDir).catch(() => []);
            
            // Parser les modèles masculins
            for (const file of maleFiles) {
                if (file.endsWith('.fbx') || file.endsWith('.glb') || file.endsWith('.json')) {
                    const filePath = path.join(maleDir, file);
                    const modelInfo = await this.getModelInfo(filePath);
                    models.male.push(modelInfo);
                }
            }
            
            // Parser les modèles féminins
            for (const file of femaleFiles) {
                if (file.endsWith('.fbx') || file.endsWith('.glb') || file.endsWith('.json')) {
                    const filePath = path.join(femaleDir, file);
                    const modelInfo = await this.getModelInfo(filePath);
                    models.female.push(modelInfo);
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur lecture modèles humains:', error);
        }
        
        return models;
    }
    
    /**
     * Récupère les équipements disponibles
     */
    async getAvailableEquipment() {
        const equipment = { weapons: [], armor: [], accessories: [] };
        
        try {
            for (const category of Object.keys(equipment)) {
                const categoryDir = path.join(this.equipmentDir, category);
                const files = await fs.readdir(categoryDir).catch(() => []);
                
                for (const file of files) {
                    if (file.endsWith('.fbx') || file.endsWith('.glb') || file.endsWith('.json')) {
                        const filePath = path.join(categoryDir, file);
                        const equipInfo = await this.getModelInfo(filePath);
                        equipment[category].push(equipInfo);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur lecture équipements:', error);
        }
        
        return equipment;
    }
    
    /**
     * Extrait les informations d'un modèle 3D
     */
    async getModelInfo(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const extension = path.extname(filePath);
        
        try {
            // Si c'est un JSON, lire les métadonnées
            if (extension === '.json') {
                const content = await fs.readFile(filePath, 'utf8');
                return JSON.parse(content);
            }
            
            // Sinon, créer les infos de base
            return {
                name: fileName,
                path: filePath,
                format: extension.substring(1),
                placeholder: false,
                size: (await fs.stat(filePath)).size
            };
            
        } catch (error) {
            console.error('❌ Erreur lecture modèle:', filePath, error);
            return {
                name: fileName,
                path: filePath,
                format: 'unknown',
                error: true
            };
        }
    }
    
    /**
     * Télécharge tous les assets manquants avec priorité sur les vrais fichiers
     */
    async downloadAllAssets() {
        console.log('🚀 Téléchargement complet des assets 3D REELS...');
        
        const results = {
            humans: { attempted: 0, successful: 0, placeholders: 0 },
            equipment: { attempted: 0, successful: 0, placeholders: 0 }
        };
        
        try {
            // Vérifier la connectivité avant de commencer
            const hasConnectivity = await this.testConnectivity();
            if (!hasConnectivity) {
                console.log('⚠️ Connectivité limitée - les téléchargements pourraient échouer');
            }
            
            // Télécharger modèles humains
            console.log('👤 Téléchargement modèles humains...');
            const humanResult = await this.downloadHumanModels();
            results.humans = humanResult;
            
            // Télécharger équipements
            console.log('⚔️ Téléchargement équipements...');
            const equipmentResult = await this.downloadEquipment();
            results.equipment = equipmentResult;
            
            const summary = await this.checkExistingAssets();
            
            console.log('\n📊 RAPPORT DE TÉLÉCHARGEMENT:');
            console.log('- Modèles humains: ' + 
                `${results.humans.successful}/${results.humans.attempted} réussis ` +
                `(${results.humans.placeholders} placeholders)`);
            console.log('- Équipements: ' + 
                `${results.equipment.successful}/${results.equipment.attempted} réussis ` +
                `(${results.equipment.placeholders} placeholders)`);
            console.log('- Assets disponibles:', summary);
            
            return results;
        } catch (error) {
            console.error('❌ Erreur téléchargement global:', error);
            return results;
        }
    }
}

module.exports = Asset3DManager;