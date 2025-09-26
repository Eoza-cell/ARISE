const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Générateur de cartes du monde avancé avec coordonnées fixes X,Y
 * Utilise Sharp pour la génération d'images de haute qualité
 */
class WorldMapGenerator {
    constructor() {
        this.mapWidth = 2048;
        this.mapHeight = 1536;
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
            coast: '#4682b4'
        };

        // Système de coordonnées fixes pour les déplacements
        this.worldGrid = this.createWorldGrid();
    }

    /**
     * Initialise le système de coordonnées fixes
     */
    initializeCoordinateSystem() {
        return {
            gridSize: 64, // Grille 64x64 pour les déplacements
            pixelScale: 32, // 1 coordonnée = 32 pixels
            origin: { x: 1024, y: 768 }, // Centre de la carte
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
        // Distance du centre
        const distance = Math.sqrt(x * x + y * y);

        // Logique pour déterminer le terrain
        if (distance > 28) return 'ocean';
        if (distance > 25) return 'coast';
        if (Math.abs(x) > 20 && y < -10) return 'desert';
        if (y > 15) return 'snow';
        if (y < -15) return 'wasteland';
        if (Math.abs(x) > 15) return 'mountains';
        if (distance < 8) return 'plains';
        if (x < -10 && y > 5) return 'forest';
        if (x > 10 && y > 5) return 'jungle';
        if (y < -5 && Math.abs(x) < 10) return 'swamp';

        return 'plains';
    }

    /**
     * Convertit les coordonnées du monde en pixels
     */
    worldToPixel(worldX, worldY) {
        const { origin, pixelScale } = this.coordinateSystem;
        return {
            x: origin.x + (worldX * pixelScale),
            y: origin.y - (worldY * pixelScale) // Y inversé pour l'affichage
        };
    }

    /**
     * Convertit les pixels en coordonnées du monde
     */
    pixelToWorld(pixelX, pixelY) {
        const { origin, pixelScale } = this.coordinateSystem;
        return {
            x: Math.round((pixelX - origin.x) / pixelScale),
            y: Math.round((origin.y - pixelY) / pixelScale)
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
                size: 4
            },
            'SOMBRENUIT': {
                name: 'Sombrenuit',
                coordinates: { x: -8, y: 8 },
                terrain: 'forest',
                capital: 'Lunelame',
                size: 3
            },
            'KHELOS': {
                name: 'Khelos',
                coordinates: { x: 15, y: -12 },
                terrain: 'desert',
                capital: 'Sablesang',
                size: 5
            },
            'ABRANTIS': {
                name: 'Abrantis',
                coordinates: { x: 20, y: 5 },
                terrain: 'coast',
                capital: 'Port-Haute-Marée',
                size: 4
            },
            'VARHA': {
                name: 'Varha',
                coordinates: { x: -12, y: 18 },
                terrain: 'snow',
                capital: 'Glacierre',
                size: 3
            },
            'SYLVARIA': {
                name: 'Sylvaria',
                coordinates: { x: 12, y: 10 },
                terrain: 'jungle',
                capital: 'Cercle des Anciens',
                size: 4
            },
            'ECLYPSIA': {
                name: 'Eclypsia',
                coordinates: { x: -15, y: -8 },
                terrain: 'eclipse',
                capital: 'Temple Eclipse',
                size: 3
            },
            'TERRE_DESOLE': {
                name: 'Terre Désolée',
                coordinates: { x: 8, y: -18 },
                terrain: 'wasteland',
                capital: 'Camp Survivants',
                size: 6
            },
            'DRAK_TARR': {
                name: 'Drak-Tarr',
                coordinates: { x: -20, y: -15 },
                terrain: 'volcano',
                capital: 'Forge Volcanique',
                size: 4
            },
            'URVALA': {
                name: 'Urvala',
                coordinates: { x: -5, y: -10 },
                terrain: 'swamp',
                capital: 'Labo des Morts',
                size: 3
            },
            'OMBREFIEL': {
                name: 'Ombrefiel',
                coordinates: { x: 5, y: -5 },
                terrain: 'plains',
                capital: 'Citadelle Exilés',
                size: 3
            },
            'KHALDAR': {
                name: 'Khaldar',
                coordinates: { x: 18, y: -5 },
                terrain: 'jungle',
                capital: 'Village Pilotis',
                size: 4
            }
        };
    }

    /**
     * Génère une carte du monde de haute qualité
     */
    async generateWorldMap(outputPath = 'temp/world_map_advanced.png') {
        console.log('🗺️ Génération carte du monde avec coordonnées fixes...');

        try {
            // Créer l'image de base
            const baseImage = await this.createBaseTerrainMap();

            // Ajouter les royaumes
            const mapWithKingdoms = await this.addKingdomsToMap(baseImage);

            // Ajouter la grille de coordonnées
            const mapWithGrid = await this.addCoordinateGrid(mapWithKingdoms);

            // Ajouter les routes et POI
            const finalMap = await this.addRoutesAndPOI(mapWithGrid);

            // Sauvegarder
            await finalMap.png().toFile(outputPath);

            console.log(`✅ Carte avancée générée: ${outputPath}`);
            const buffer = await finalMap.png().toBuffer();

            return buffer;

        } catch (error) {
            console.error('❌ Erreur génération carte avancée:', error);
            throw error;
        }
    }

    /**
     * Crée la carte de terrain de base
     */
    async createBaseTerrainMap() {
        // Créer une image SVG pour le terrain
        const svgTerrain = this.generateTerrainSVG();

        return sharp(Buffer.from(svgTerrain))
            .resize(this.mapWidth, this.mapHeight)
            .png();
    }

    /**
     * Génère le SVG du terrain
     */
    generateTerrainSVG() {
        let svg = `<svg width="${this.mapWidth}" height="${this.mapHeight}" xmlns="http://www.w3.org/2000/svg">`;

        // Fond océanique
        svg += `<rect width="100%" height="100%" fill="${this.terrainColors.ocean}"/>`;

        // Ajouter les zones de terrain
        const { bounds, pixelScale } = this.coordinateSystem;

        for (let x = bounds.minX; x <= bounds.maxX; x++) {
            for (let y = bounds.minY; y <= bounds.maxY; y++) {
                const terrain = this.worldGrid[`${x},${y}`];
                if (terrain === 'ocean') continue;

                const pixel = this.worldToPixel(x, y);
                const color = this.terrainColors[terrain];

                svg += `<rect x="${pixel.x - pixelScale/2}" y="${pixel.y - pixelScale/2}"
                        width="${pixelScale}" height="${pixelScale}"
                        fill="${color}" opacity="0.8"/>`;
            }
        }

        svg += '</svg>';
        return svg;
    }

    /**
     * Ajoute les royaumes à la carte
     */
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

    /**
     * Ajoute la grille de coordonnées
     */
    async addCoordinateGrid(mapImage) {
        let gridSVG = '<svg width="2048" height="1536" xmlns="http://www.w3.org/2000/svg">';

        const { bounds, pixelScale } = this.coordinateSystem;

        // Lignes verticales
        for (let x = bounds.minX; x <= bounds.maxX; x += 5) {
            const startPixel = this.worldToPixel(x, bounds.minY);
            const endPixel = this.worldToPixel(x, bounds.maxY);

            gridSVG += `<line x1="${startPixel.x}" y1="${startPixel.y}"
                        x2="${endPixel.x}" y2="${endPixel.y}"
                        stroke="#333" stroke-width="1" opacity="0.3"/>`;

            // Labels X
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

            // Labels Y
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

    /**
     * Ajoute les routes et points d'intérêt
     */
    async addRoutesAndPOI(mapImage) {
        let routesSVG = '<svg width="2048" height="1536" xmlns="http://www.w3.org/2000/svg">';

        // Routes commerciales
        const routes = [
            ['AEGYRIA', 'SOMBRENUIT'],
            ['AEGYRIA', 'ABRANTIS'],
            ['KHELOS', 'DRAK_TARR'],
            ['VARHA', 'SYLVARIA']
        ];

        routes.forEach(([from, to]) => {
            const fromKingdom = this.kingdoms[from];
            const toKingdom = this.kingdoms[to];

            const startPixel = this.worldToPixel(fromKingdom.coordinates.x, fromKingdom.coordinates.y);
            const endPixel = this.worldToPixel(toKingdom.coordinates.x, toKingdom.coordinates.y);

            routesSVG += `<line x1="${startPixel.x}" y1="${startPixel.y}"
                          x2="${endPixel.x}" y2="${endPixel.y}"
                          stroke="#8B4513" stroke-width="3" stroke-dasharray="10,5"/>`;
        });

        // Légende
        routesSVG += `<rect x="50" y="50" width="300" height="150" fill="rgba(255,255,255,0.9)" stroke="#000"/>`;
        routesSVG += `<text x="70" y="80" font-family="Arial" font-size="16" font-weight="bold">FRICTION ULTIMATE</text>`;
        routesSVG += `<text x="70" y="100" font-family="Arial" font-size="12">Système de coordonnées X,Y</text>`;
        routesSVG += `<text x="70" y="120" font-family="Arial" font-size="10">🏰 Royaumes avec positions fixes</text>`;
        routesSVG += `<text x="70" y="135" font-family="Arial" font-size="10">--- Routes commerciales</text>`;
        routesSVG += `<text x="70" y="150" font-family="Arial" font-size="10">📍 Grille de déplacement</text>`;

        routesSVG += '</svg>';

        const routesOverlay = sharp(Buffer.from(routesSVG));

        return sharp(await mapImage.png().toBuffer())
            .composite([{ input: await routesOverlay.png().toBuffer() }]);
    }

    /**
     * Obtient le terrain à des coordonnées spécifiques
     */
    getTerrainAt(x, y) {
        return this.worldGrid[`${x},${y}`] || 'ocean';
    }

    /**
     * Vérifie si des coordonnées sont valides
     */
    isValidCoordinate(x, y) {
        const { bounds } = this.coordinateSystem;
        return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    }

    /**
     * Trouve le royaume le plus proche de coordonnées données
     */
    findNearestKingdom(x, y) {
        let nearest = null;
        let minDistance = Infinity;

        Object.entries(this.kingdoms).forEach(([id, kingdom]) => {
            const distance = Math.sqrt(
                Math.pow(x - kingdom.coordinates.x, 2) +
                Math.pow(y - kingdom.coordinates.y, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = { id, kingdom, distance };
            }
        });

        return nearest;
    }
}

module.exports = WorldMapGenerator;