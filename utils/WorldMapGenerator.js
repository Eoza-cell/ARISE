const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Générateur de cartes du monde avancé avec système de déplacements logiques
 * Utilise Sharp pour la génération d'images de haute qualité
 */
class WorldMapGenerator {
    constructor() {
        this.mapWidth = 2048;
        this.mapHeight = 1536;
        
        // Temps de déplacement selon le terrain - INITIALISER EN PREMIER
        this.movementCosts = {
            plains: 1,
            road: 0.5,
            forest: 2,
            mountains: 3,
            desert: 2.5,
            swamp: 4,
            snow: 3,
            jungle: 2.5,
            wasteland: 3.5,
            ocean: 999, // Impossible sans navire
            river: 5, // Nécessite de nager ou pont
            bridge: 0.8
        };
        
        this.coordinateSystem = this.initializeCoordinateSystem();
        this.kingdoms = this.getKingdomsWithCoordinates();
        this.terrainColors = {
            ocean: '#1e3a5f',
            plains: '#8fbc8f',
            forest: '#228b22',
            desert: '#f4a460',
            mountains: '#696969',
            snow: '#fffafa',
            swamp: '#556b2f',
            volcano: '#8b0000',
            jungle: '#006400',
            wasteland: '#8b7355',
            eclipse: '#2f2f2f',
            coast: '#4682b4',
            river: '#4169e1',
            bridge: '#8b4513',
            road: '#daa520'
        };

        // Système de coordonnées fixes pour les déplacements
        this.worldGrid = this.createWorldGrid();

        // Routes et chemins logiques entre les lieux
        this.roadNetwork = this.createRoadNetwork();

        // Points d'intérêt et obstacles
        this.pointsOfInterest = this.createPointsOfInterest();
    }

    /**
     * Initialise le système de coordonnées fixes
     */
    initializeCoordinateSystem() {
        return {
            gridSize: 64,
            pixelScale: 32,
            origin: { x: 1024, y: 768 },
            bounds: {
                minX: -32,
                maxX: 32,
                minY: -24,
                maxY: 24
            }
        };
    }

    /**
     * Crée la grille de monde avec types de terrain
     */
    createWorldGrid() {
        const grid = {};
        const { bounds } = this.coordinateSystem;

        for (let x = bounds.minX; x <= bounds.maxX; x++) {
            for (let y = bounds.minY; y <= bounds.maxY; y++) {
                grid[`${x},${y}`] = this.determineTerrainType(x, y);
            }
        }

        return grid;
    }

    /**
     * Détermine le type de terrain selon les coordonnées
     */
    determineTerrainType(x, y) {
        const distance = Math.sqrt(x * x + y * y);

        // Océan en bordure
        if (distance > 28) return 'ocean';
        if (distance > 25) return 'coast';

        // Royaumes spécifiques
        if (Math.abs(x) > 20 && y < -10) return 'desert';
        if (y > 15) return 'snow';
        if (y < -15) return 'wasteland';
        if (Math.abs(x) > 15) return 'mountains';
        if (distance < 8) return 'plains';
        if (x < -10 && y > 5) return 'forest';
        if (x > 10 && y > 5) return 'jungle';
        if (y < -5 && Math.abs(x) < 10) return 'swamp';

        // Rivières principales
        if (Math.abs(y) < 2 && Math.abs(x) < 20) return 'river';
        if (Math.abs(x) < 2 && Math.abs(y) < 15) return 'river';

        return 'plains';
    }

    /**
     * Crée le réseau routier logique
     */
    createRoadNetwork() {
        const roads = [];

        // Routes principales entre royaumes
        const mainRoutes = [
            // Route commerciale centrale
            { from: { x: -8, y: 8 }, to: { x: 0, y: 0 }, type: 'main_road' },
            { from: { x: 0, y: 0 }, to: { x: 20, y: 5 }, type: 'main_road' },
            { from: { x: 0, y: 0 }, to: { x: 15, y: -12 }, type: 'main_road' },

            // Routes secondaires
            { from: { x: -12, y: 18 }, to: { x: -8, y: 8 }, type: 'mountain_path' },
            { from: { x: 12, y: 10 }, to: { x: 20, y: 5 }, type: 'jungle_trail' },
            { from: { x: -15, y: -8 }, to: { x: -5, y: -10 }, type: 'dark_path' },

            // Ponts stratégiques
            { from: { x: -2, y: 0 }, to: { x: 2, y: 0 }, type: 'bridge' },
            { from: { x: 0, y: -2 }, to: { x: 0, y: 2 }, type: 'bridge' }
        ];

        // Générer les points intermédiaires pour chaque route
        mainRoutes.forEach(route => {
            const path = this.calculatePath(route.from, route.to);
            roads.push({
                ...route,
                path: path,
                travelTime: this.calculateTravelTime(path)
            });
        });

        return roads;
    }

    /**
     * Calcule un chemin logique entre deux points
     */
    calculatePath(from, to) {
        const path = [];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const x = Math.round(from.x + dx * progress);
            const y = Math.round(from.y + dy * progress);
            path.push({ x, y, terrain: this.getTerrainAt(x, y) });
        }

        return path;
    }

    /**
     * Calcule le temps de voyage réaliste
     */
    calculateTravelTime(path) {
        let totalTime = 0;

        if (!path || !Array.isArray(path)) {
            console.log('⚠️ Path invalide dans calculateTravelTime');
            return 1;
        }

        path.forEach(point => {
            if (!point || !point.terrain) {
                console.log('⚠️ Point sans terrain détecté');
                return;
            }
            const cost = this.movementCosts[point.terrain] || 2;
            totalTime += cost;
        });

        return Math.round(totalTime * 0.5) || 1; // Heures de voyage
    }

    /**
     * Crée les points d'intérêt
     */
    createPointsOfInterest() {
        return {
            villages: [
                { x: -3, y: 5, name: "Village des Brumes", kingdom: "SOMBRENUIT" },
                { x: 8, y: -3, name: "Poste Frontière", kingdom: "AEGYRIA" },
                { x: -10, y: -15, name: "Camp des Exilés", kingdom: "TERRE_DESOLE" }
            ],
            dungeons: [
                { x: -25, y: -20, name: "Crypte Oubliée", danger: "extreme" },
                { x: 18, y: 15, name: "Temple de Jade", danger: "high" },
                { x: 5, y: -8, name: "Ruines Antiques", danger: "medium" }
            ],
            resources: [
                { x: -18, y: -12, name: "Mine de Fer", type: "metal" },
                { x: 22, y: 8, name: "Forêt d'Ébène", type: "wood" },
                { x: 12, y: -18, name: "Oasis Bleue", type: "water" }
            ],
            landmarks: [
                { x: 0, y: 12, name: "Pic du Monde", type: "mountain" },
                { x: -15, y: 0, name: "Forêt Éternelle", type: "ancient_forest" },
                { x: 25, y: -8, name: "Désert de Cristal", type: "magical_desert" }
            ]
        };
    }

    /**
     * Obtient les royaumes avec leurs coordonnées fixes
     */
    getKingdomsWithCoordinates() {
        return {
            'AEGYRIA': {
                name: 'Aegyria',
                coordinates: { x: 0, y: 0 },
                terrain: 'plains',
                capital: 'Valorhall',
                size: 4,
                connections: ['SOMBRENUIT', 'ABRANTIS', 'KHELOS']
            },
            'SOMBRENUIT': {
                name: 'Sombrenuit',
                coordinates: { x: -8, y: 8 },
                terrain: 'forest',
                capital: 'Lunelame',
                size: 3,
                connections: ['AEGYRIA', 'VARHA']
            },
            'KHELOS': {
                name: 'Khelos',
                coordinates: { x: 15, y: -12 },
                terrain: 'desert',
                capital: 'Sablesang',
                size: 5,
                connections: ['AEGYRIA', 'DRAK_TARR']
            },
            'ABRANTIS': {
                name: 'Abrantis',
                coordinates: { x: 20, y: 5 },
                terrain: 'coast',
                capital: 'Port-Haute-Marée',
                size: 4,
                connections: ['AEGYRIA', 'SYLVARIA']
            },
            'VARHA': {
                name: 'Varha',
                coordinates: { x: -12, y: 18 },
                terrain: 'snow',
                capital: 'Glacierre',
                size: 3,
                connections: ['SOMBRENUIT']
            },
            'SYLVARIA': {
                name: 'Sylvaria',
                coordinates: { x: 12, y: 10 },
                terrain: 'jungle',
                capital: 'Cercle des Anciens',
                size: 4,
                connections: ['ABRANTIS', 'KHALDAR']
            },
            'ECLYPSIA': {
                name: 'Eclypsia',
                coordinates: { x: -15, y: -8 },
                terrain: 'eclipse',
                capital: 'Temple Eclipse',
                size: 3,
                connections: ['URVALA']
            },
            'TERRE_DESOLE': {
                name: 'Terre Désolée',
                coordinates: { x: 8, y: -18 },
                terrain: 'wasteland',
                capital: 'Camp Survivants',
                size: 6,
                connections: ['OMBREFIEL']
            },
            'DRAK_TARR': {
                name: 'Drak-Tarr',
                coordinates: { x: -20, y: -15 },
                terrain: 'volcano',
                capital: 'Forge Volcanique',
                size: 4,
                connections: ['KHELOS']
            },
            'URVALA': {
                name: 'Urvala',
                coordinates: { x: -5, y: -10 },
                terrain: 'swamp',
                capital: 'Labo des Morts',
                size: 3,
                connections: ['ECLYPSIA', 'OMBREFIEL']
            },
            'OMBREFIEL': {
                name: 'Ombrefiel',
                coordinates: { x: 5, y: -5 },
                terrain: 'plains',
                capital: 'Citadelle Exilés',
                size: 3,
                connections: ['URVALA', 'TERRE_DESOLE']
            },
            'KHALDAR': {
                name: 'Khaldar',
                coordinates: { x: 18, y: -5 },
                terrain: 'jungle',
                capital: 'Village Pilotis',
                size: 4,
                connections: ['SYLVARIA']
            }
        };
    }

    /**
     * Vérifie si un déplacement est logiquement possible
     */
    canMoveTo(fromX, fromY, toX, toY) {
        const fromTerrain = this.getTerrainAt(fromX, fromY);
        const toTerrain = this.getTerrainAt(toX, toY);

        // Impossible de marcher sur l'océan
        if (toTerrain === 'ocean') {
            return { possible: false, reason: "Impossible de marcher sur l'océan sans navire" };
        }

        // Distance maximale par action
        const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY);
        if (distance > 1) {
            return { possible: false, reason: "Distance trop grande - déplacez-vous case par case" };
        }

        // Traversée de rivière nécessite un pont ou nage
        if (toTerrain === 'river') {
            const hasBridge = this.roadNetwork.some(road => 
                road.type === 'bridge' && 
                road.path.some(point => point.x === toX && point.y === toY)
            );

            if (!hasBridge) {
                return { 
                    possible: true, 
                    warning: "Traversée de rivière dangereuse - risque de noyade",
                    timeMultiplier: 3
                };
            }
        }

        return { possible: true };
    }

    /**
     * Calcule l'itinéraire optimal entre deux points
     */
    findOptimalRoute(fromX, fromY, toX, toY) {
        const route = {
            path: [],
            totalTime: 0,
            dangers: [],
            recommendations: []
        };

        // Utiliser l'algorithme A* simplifié
        const path = this.calculatePath({ x: fromX, y: fromY }, { x: toX, y: toY });

        route.path = path;
        route.totalTime = this.calculateTravelTime(path);

        // Analyser les dangers sur le chemin
        path.forEach(point => {
            if (point.terrain === 'mountains') {
                route.dangers.push("Risque d'avalanche dans les montagnes");
            }
            if (point.terrain === 'swamp') {
                route.dangers.push("Risque d'enlisement dans les marécages");
            }
            if (point.terrain === 'wasteland') {
                route.dangers.push("Créatures hostiles dans les terres désolées");
            }
        });

        // Recommandations
        if (route.totalTime > 24) {
            route.recommendations.push("Voyage très long - prévoir des provisions");
        }
        if (route.dangers.length > 2) {
            route.recommendations.push("Chemin dangereux - voyager en groupe recommandé");
        }

        return route;
    }

    /**
     * Génère une carte du monde de haute qualité avec routes
     */
    async generateWorldMap(outputPath = 'temp/world_map_complete.png') {
        console.log('🗺️ Génération carte complète du monde avec routes...');

        try {
            // Créer l'image de base avec terrain détaillé
            const baseImage = await this.createDetailedTerrainMap();

            // Ajouter le réseau routier
            const mapWithRoads = await this.addRoadNetwork(baseImage);

            // Ajouter les royaumes
            const mapWithKingdoms = await this.addKingdomsToMap(mapWithRoads);

            // Ajouter les points d'intérêt
            const mapWithPOI = await this.addPointsOfInterest(mapWithKingdoms);

            // Ajouter la grille de coordonnées
            const mapWithGrid = await this.addCoordinateGrid(mapWithPOI);

            // Ajouter la légende
            const finalMap = await this.addLegend(mapWithGrid);

            // Sauvegarder
            await finalMap.png().toFile(outputPath);

            console.log(`✅ Carte complète générée: ${outputPath}`);
            const buffer = await finalMap.png().toBuffer();

            return buffer;

        } catch (error) {
            console.error('❌ Erreur génération carte:', error);
            throw error;
        }
    }

    /**
     * Crée une carte de terrain détaillée
     */
    async createDetailedTerrainMap() {
        const svgTerrain = this.generateDetailedTerrainSVG();
        return sharp(Buffer.from(svgTerrain))
            .resize(this.mapWidth, this.mapHeight)
            .png();
    }

    /**
     * Génère le SVG détaillé du terrain
     */
    generateDetailedTerrainSVG() {
        let svg = `<svg width="${this.mapWidth}" height="${this.mapHeight}" xmlns="http://www.w3.org/2000/svg">`;

        // Fond océanique avec dégradé
        svg += `<defs>
            <radialGradient id="oceanGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#4682b4;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
            </radialGradient>
        </defs>`;

        svg += `<rect width="100%" height="100%" fill="url(#oceanGradient)"/>`;

        // Ajouter les zones de terrain avec textures
        const { bounds, pixelScale } = this.coordinateSystem;

        for (let x = bounds.minX; x <= bounds.maxX; x++) {
            for (let y = bounds.minY; y <= bounds.maxY; y++) {
                const terrain = this.worldGrid[`${x},${y}`];
                if (terrain === 'ocean') continue;

                const pixel = this.worldToPixel(x, y);
                const color = this.terrainColors[terrain];

                // Ajouter des variations de terrain
                const opacity = 0.7 + (Math.random() * 0.3);

                svg += `<rect x="${pixel.x - pixelScale/2}" y="${pixel.y - pixelScale/2}"
                        width="${pixelScale}" height="${pixelScale}"
                        fill="${color}" opacity="${opacity}"/>`;

                // Ajouter des détails selon le terrain
                if (terrain === 'mountains') {
                    svg += `<polygon points="${pixel.x-8},${pixel.y+8} ${pixel.x},${pixel.y-8} ${pixel.x+8},${pixel.y+8}"
                            fill="#555" opacity="0.6"/>`;
                } else if (terrain === 'forest') {
                    svg += `<circle cx="${pixel.x}" cy="${pixel.y}" r="6" fill="#1a5f1a" opacity="0.8"/>`;
                }
            }
        }

        svg += '</svg>';
        return svg;
    }

    /**
     * Ajoute le réseau routier à la carte
     */
    async addRoadNetwork(baseImage) {
        let roadSVG = '<svg width="2048" height="1536" xmlns="http://www.w3.org/2000/svg">';

        this.roadNetwork.forEach(road => {
            const startPixel = this.worldToPixel(road.from.x, road.from.y);
            const endPixel = this.worldToPixel(road.to.x, road.to.y);

            // Style selon le type de route
            let strokeWidth = 3;
            let strokeColor = '#8B4513';
            let dashArray = 'none';

            switch (road.type) {
                case 'main_road':
                    strokeWidth = 4;
                    strokeColor = '#DAA520';
                    break;
                case 'mountain_path':
                    strokeWidth = 2;
                    strokeColor = '#A0522D';
                    dashArray = '5,3';
                    break;
                case 'jungle_trail':
                    strokeWidth = 2;
                    strokeColor = '#228B22';
                    dashArray = '3,2';
                    break;
                case 'bridge':
                    strokeWidth = 5;
                    strokeColor = '#8B4513';
                    break;
            }

            roadSVG += `<line x1="${startPixel.x}" y1="${startPixel.y}"
                        x2="${endPixel.x}" y2="${endPixel.y}"
                        stroke="${strokeColor}" stroke-width="${strokeWidth}"
                        stroke-dasharray="${dashArray}" opacity="0.9"/>`;
        });

        roadSVG += '</svg>';

        const roadOverlay = sharp(Buffer.from(roadSVG));
        return sharp(await baseImage.png().toBuffer())
            .composite([{ input: await roadOverlay.png().toBuffer() }]);
    }

    /**
     * Ajoute les points d'intérêt
     */
    async addPointsOfInterest(mapImage) {
        let poiSVG = '<svg width="2048" height="1536" xmlns="http://www.w3.org/2000/svg">';

        // Villages
        this.pointsOfInterest.villages.forEach(village => {
            const pixel = this.worldToPixel(village.x, village.y);
            poiSVG += `<rect x="${pixel.x-6}" y="${pixel.y-6}" width="12" height="12"
                       fill="#8B4513" stroke="#000" stroke-width="1"/>`;
            poiSVG += `<text x="${pixel.x}" y="${pixel.y-10}" text-anchor="middle"
                       font-family="Arial" font-size="8" fill="#000">${village.name}</text>`;
        });

        // Donjons
        this.pointsOfInterest.dungeons.forEach(dungeon => {
            const pixel = this.worldToPixel(dungeon.x, dungeon.y);
            const color = dungeon.danger === 'extreme' ? '#8B0000' : 
                         dungeon.danger === 'high' ? '#FF4500' : '#FFA500';

            poiSVG += `<polygon points="${pixel.x},${pixel.y-8} ${pixel.x-8},${pixel.y+8} ${pixel.x+8},${pixel.y+8}"
                       fill="${color}" stroke="#000" stroke-width="1"/>`;
            poiSVG += `<text x="${pixel.x}" y="${pixel.y+15}" text-anchor="middle"
                       font-family="Arial" font-size="8" fill="#000">${dungeon.name}</text>`;
        });

        // Ressources
        this.pointsOfInterest.resources.forEach(resource => {
            const pixel = this.worldToPixel(resource.x, resource.y);
            const color = resource.type === 'metal' ? '#C0C0C0' :
                         resource.type === 'wood' ? '#8B4513' : '#4169E1';

            poiSVG += `<circle cx="${pixel.x}" cy="${pixel.y}" r="5"
                       fill="${color}" stroke="#000" stroke-width="1"/>`;
        });

        poiSVG += '</svg>';

        const poiOverlay = sharp(Buffer.from(poiSVG));
        return sharp(await mapImage.png().toBuffer())
            .composite([{ input: await poiOverlay.png().toBuffer() }]);
    }

    /**
     * Ajoute une légende complète
     */
    async addLegend(mapImage) {
        let legendSVG = '<svg width="2048" height="1536" xmlns="http://www.w3.org/2000/svg">';

        // Fond de légende
        legendSVG += `<rect x="50" y="50" width="400" height="300" 
                      fill="rgba(255,255,255,0.95)" stroke="#000" stroke-width="2"/>`;

        // Titre
        legendSVG += `<text x="70" y="80" font-family="Arial" font-size="18" font-weight="bold">
                      FRICTION ULTIMATE - CARTE COMPLÈTE</text>`;

        let yPos = 110;

        // Terrains
        legendSVG += `<text x="70" y="${yPos}" font-family="Arial" font-size="14" font-weight="bold">Terrains :</text>`;
        yPos += 20;

        const terrainLegend = [
            { terrain: 'plains', name: 'Plaines (1h/case)' },
            { terrain: 'forest', name: 'Forêt (2h/case)' },
            { terrain: 'mountains', name: 'Montagnes (3h/case)' },
            { terrain: 'desert', name: 'Désert (2.5h/case)' },
            { terrain: 'swamp', name: 'Marécages (4h/case)' },
            { terrain: 'snow', name: 'Neige (3h/case)' }
        ];

        terrainLegend.forEach(item => {
            legendSVG += `<rect x="80" y="${yPos-8}" width="12" height="12" fill="${this.terrainColors[item.terrain]}"/>`;
            legendSVG += `<text x="100" y="${yPos}" font-family="Arial" font-size="10">${item.name}</text>`;
            yPos += 15;
        });

        yPos += 10;

        // Routes
        legendSVG += `<text x="70" y="${yPos}" font-family="Arial" font-size="14" font-weight="bold">Routes :</text>`;
        yPos += 20;

        legendSVG += `<line x1="80" y1="${yPos}" x2="110" y2="${yPos}" stroke="#DAA520" stroke-width="4"/>`;
        legendSVG += `<text x="120" y="${yPos+3}" font-family="Arial" font-size="10">Route principale (0.5h/case)</text>`;
        yPos += 15;

        legendSVG += `<line x1="80" y1="${yPos}" x2="110" y2="${yPos}" stroke="#8B4513" stroke-width="5"/>`;
        legendSVG += `<text x="120" y="${yPos+3}" font-family="Arial" font-size="10">Pont (0.8h/case)</text>`;
        yPos += 20;

        // Points d'intérêt
        legendSVG += `<text x="70" y="${yPos}" font-family="Arial" font-size="14" font-weight="bold">Points d'intérêt :</text>`;
        yPos += 20;

        legendSVG += `<rect x="80" y="${yPos-8}" width="12" height="12" fill="#8B4513" stroke="#000"/>`;
        legendSVG += `<text x="100" y="${yPos}" font-family="Arial" font-size="10">Villages</text>`;
        yPos += 15;

        legendSVG += `<polygon points="86,${yPos-8} 80,${yPos+2} 92,${yPos+2}" fill="#8B0000" stroke="#000"/>`;
        legendSVG += `<text x="100" y="${yPos}" font-family="Arial" font-size="10">Donjons dangereux</text>`;
        yPos += 15;

        legendSVG += `<circle cx="86" cy="${yPos-3}" r="5" fill="#C0C0C0" stroke="#000"/>`;
        legendSVG += `<text x="100" y="${yPos}" font-family="Arial" font-size="10">Ressources</text>`;

        legendSVG += `<text x="70" y="320" font-family="Arial" font-size="10" fill="#666">
                      ⚠️ Déplacements logiques requis - Pas de téléportation !</text>`;

        legendSVG += '</svg>';

        const legendOverlay = sharp(Buffer.from(legendSVG));
        return sharp(await mapImage.png().toBuffer())
            .composite([{ input: await legendOverlay.png().toBuffer() }]);
    }

    // Méthodes utilitaires existantes...
    worldToPixel(worldX, worldY) {
        const { origin, pixelScale } = this.coordinateSystem;
        return {
            x: origin.x + (worldX * pixelScale),
            y: origin.y - (worldY * pixelScale)
        };
    }

    getTerrainAt(x, y) {
        // Logique simple pour déterminer le terrain basé sur les coordonnées
        const hash = Math.abs(Math.sin(x * 0.1 + y * 0.1) * 1000);

        if (hash > 800) return 'mountains';
        else if (hash > 600) return 'forest';
        else if (hash > 400) return 'hills';
        else if (hash > 200) return 'rivers';
        else return 'plains';
    }

    isValidCoordinate(x, y) {
        const { bounds } = this.coordinateSystem;
        return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    }

    // Autres méthodes existantes pour la grille et les royaumes...
    async addKingdomsToMap(baseImage) {
        let kingdomsSVG = '<svg width="2048" height="1536" xmlns="http://www.w3.org/2000/svg">';

        Object.entries(this.kingdoms).forEach(([id, kingdom]) => {
            const pixel = this.worldToPixel(kingdom.coordinates.x, kingdom.coordinates.y);
            const radius = kingdom.size * this.coordinateSystem.pixelScale / 2;

            // Territoire du royaume
            kingdomsSVG += `<circle cx="${pixel.x}" cy="${pixel.y}" r="${radius}"
                            fill="${this.terrainColors[kingdom.terrain]}"
                            opacity="0.6" stroke="#000" stroke-width="2"/>`;

            // Nom du royaume
            kingdomsSVG += `<text x="${pixel.x}" y="${pixel.y + 5}"
                            text-anchor="middle" font-family="Arial" font-size="14"
                            font-weight="bold" fill="#000">${kingdom.name}</text>`;

            // Coordonnées
            kingdomsSVG += `<text x="${pixel.x}" y="${pixel.y + 25}"
                            text-anchor="middle" font-family="Arial" font-size="10"
                            fill="#666">(${kingdom.coordinates.x}, ${kingdom.coordinates.y})</text>`;
        });

        kingdomsSVG += '</svg>';

        const kingdomsOverlay = sharp(Buffer.from(kingdomsSVG));
        return sharp(await baseImage.png().toBuffer())
            .composite([{ input: await kingdomsOverlay.png().toBuffer() }]);
    }

    async addCoordinateGrid(mapImage) {
        let gridSVG = '<svg width="2048" height="1536" xmlns="http://www.w3.org/2000/svg">';

        const { bounds } = this.coordinateSystem;

        // Lignes verticales
        for (let x = bounds.minX; x <= bounds.maxX; x += 5) {
            const startPixel = this.worldToPixel(x, bounds.minY);
            const endPixel = this.worldToPixel(x, bounds.maxY);

            gridSVG += `<line x1="${startPixel.x}" y1="${startPixel.y}"
                        x2="${endPixel.x}" y2="${endPixel.y}"
                        stroke="#333" stroke-width="1" opacity="0.3"/>`;

            if (x % 10 === 0) {
                gridSVG += `<text x="${startPixel.x}" y="${endPixel.y + 15}"
                            text-anchor="middle" font-family="Arial" font-size="12"
                            fill="#333">${x}</text>`;
            }
        }

        // Lignes horizontales
        for (let y = bounds.minY; y <= bounds.maxY; y += 5) {
            const startPixel = this.worldToPixel(bounds.minX, y);
            const endPixel = this.worldToPixel(bounds.maxX, y);

            gridSVG += `<line x1="${startPixel.x}" y1="${startPixel.y}"
                        x2="${endPixel.x}" y2="${endPixel.y}"
                        stroke="#333" stroke-width="1" opacity="0.3"/>`;

            if (y % 10 === 0) {
                gridSVG += `<text x="${startPixel.x - 15}" y="${startPixel.y + 5}"
                            text-anchor="middle" font-family="Arial" font-size="12"
                            fill="#333">${y}</text>`;
            }
        }

        gridSVG += '</svg>';

        const gridOverlay = sharp(Buffer.from(gridSVG));
        return sharp(await mapImage.png().toBuffer())
            .composite([{ input: await gridOverlay.png().toBuffer() }]);
    }
}

module.exports = WorldMapGenerator;