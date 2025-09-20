

const fs = require('fs').promises;
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

/**
 * Générateur de carte du monde style Inkarnate
 * Utilise Canvas natif (pas de dépendances externes comme Canva)
 */
class WorldMapGenerator {
    constructor() {
        this.mapWidth = 2048;
        this.mapHeight = 1536;
        this.kingdoms = this.getKingdomsData();
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
    }

    /**
     * Génère une carte complète du monde avec les 12 royaumes
     */
    async generateWorldMap(outputPath = 'temp/world_map.png') {
        console.log('🗺️ Génération de la carte du monde...');
        
        const canvas = createCanvas(this.mapWidth, this.mapHeight);
        const ctx = canvas.getContext('2d');
        
        // 1. Arrière-plan océanique
        this.drawOceanBackground(ctx);
        
        // 2. Générer et dessiner les continents
        this.drawContinents(ctx);
        
        // 3. Placer les 12 royaumes avec leurs territoires
        await this.drawKingdoms(ctx);
        
        // 4. Ajouter les routes commerciales
        this.drawTradeRoutes(ctx);
        
        // 5. Ajouter les éléments géographiques
        this.drawGeographicalFeatures(ctx);
        
        // 6. Ajouter les villes et villages
        this.drawCitiesAndVillages(ctx);
        
        // 7. Ajouter la légende et les ornements
        this.drawLegendAndOrnaments(ctx);
        
        // 8. Sauvegarder la carte
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(outputPath, buffer);
        
        console.log(`✅ Carte du monde générée: ${outputPath}`);
        return buffer;
    }

    /**
     * Dessine l'arrière-plan océanique avec effet de vagues
     */
    drawOceanBackground(ctx) {
        const gradient = ctx.createRadialGradient(
            this.mapWidth/2, this.mapHeight/2, 0,
            this.mapWidth/2, this.mapHeight/2, Math.max(this.mapWidth, this.mapHeight)/2
        );
        gradient.addColorStop(0, '#2e5984');
        gradient.addColorStop(1, '#1e3a5f');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);
        
        // Ajouter des effets de vagues
        ctx.strokeStyle = '#4682b4';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            const y = Math.random() * this.mapHeight;
            const waveLength = 100 + Math.random() * 200;
            
            for (let x = 0; x < this.mapWidth; x += 10) {
                const waveY = y + Math.sin((x / waveLength) * Math.PI * 2) * 10;
                if (x === 0) ctx.moveTo(x, waveY);
                else ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    }

    /**
     * Dessine les continents principaux
     */
    drawContinents(ctx) {
        // Continent principal (centre)
        this.drawLandmass(ctx, this.mapWidth * 0.3, this.mapHeight * 0.2, 800, 600, '#8fbc8f');
        
        // Continent nord (montagnes)
        this.drawLandmass(ctx, this.mapWidth * 0.1, this.mapHeight * 0.05, 400, 200, '#696969');
        
        // Continent sud (jungle)
        this.drawLandmass(ctx, this.mapWidth * 0.6, this.mapHeight * 0.7, 500, 300, '#006400');
        
        // Îles diverses
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * this.mapWidth;
            const y = Math.random() * this.mapHeight;
            const size = 20 + Math.random() * 80;
            this.drawIsland(ctx, x, y, size);
        }
    }

    /**
     * Dessine une masse terrestre organique
     */
    drawLandmass(ctx, x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        
        const points = 20;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radiusX = (width / 2) * (0.7 + Math.random() * 0.6);
            const radiusY = (height / 2) * (0.7 + Math.random() * 0.6);
            
            const pointX = centerX + Math.cos(angle) * radiusX;
            const pointY = centerY + Math.sin(angle) * radiusY;
            
            if (i === 0) ctx.moveTo(pointX, pointY);
            else ctx.lineTo(pointX, pointY);
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Ajouter des détails côtiers
        ctx.strokeStyle = '#4682b4';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    /**
     * Dessine une île
     */
    drawIsland(ctx, x, y, radius) {
        ctx.fillStyle = '#8fbc8f';
        ctx.beginPath();
        
        const points = 8;
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const r = radius * (0.8 + Math.random() * 0.4);
            const pointX = x + Math.cos(angle) * r;
            const pointY = y + Math.sin(angle) * r;
            
            if (i === 0) ctx.moveTo(pointX, pointY);
            else ctx.lineTo(pointX, pointY);
        }
        
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Dessine les territoires des 12 royaumes
     */
    async drawKingdoms(ctx) {
        const kingdomPositions = this.getKingdomPositions();
        
        for (const [kingdomId, data] of Object.entries(this.kingdoms)) {
            const position = kingdomPositions[kingdomId];
            if (!position) continue;
            
            // Dessiner le territoire du royaume
            this.drawKingdomTerritory(ctx, position, data);
            
            // Ajouter le nom et symbole
            this.drawKingdomLabel(ctx, position, data);
        }
    }

    /**
     * Dessine le territoire d'un royaume
     */
    drawKingdomTerritory(ctx, position, kingdomData) {
        const { x, y, size } = position;
        const color = this.getKingdomColor(kingdomData.terrain);
        
        // Territoire principal
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        
        ctx.beginPath();
        const points = 12;
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radius = size * (0.8 + Math.random() * 0.4);
            const pointX = x + Math.cos(angle) * radius;
            const pointY = y + Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(pointX, pointY);
            else ctx.lineTo(pointX, pointY);
        }
        ctx.closePath();
        ctx.fill();
        
        // Bordure du royaume
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.stroke();
    }

    /**
     * Dessine le label d'un royaume
     */
    drawKingdomLabel(ctx, position, kingdomData) {
        const { x, y } = position;
        
        // Fond pour le texte
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x - 60, y - 15, 120, 30);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 60, y - 15, 120, 30);
        
        // Nom du royaume
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.fillText(kingdomData.name, x, y + 5);
        
        // Symbole/Emblème
        this.drawKingdomSymbol(ctx, x, y - 40, kingdomData.id);
    }

    /**
     * Dessine le symbole d'un royaume
     */
    drawKingdomSymbol(ctx, x, y, kingdomId) {
        const symbols = {
            'AEGYRIA': '⚔️',
            'SOMBRENUIT': '🌙',
            'KHELOS': '🏜️',
            'ABRANTIS': '⚓',
            'VARHA': '🏔️',
            'SYLVARIA': '🌲',
            'ECLYPSIA': '🌑',
            'TERRE_DESOLE': '💀',
            'DRAK_TARR': '🌋',
            'URVALA': '🧪',
            'OMBREFIEL': '⚔️',
            'KHALDAR': '🌿'
        };
        
        ctx.font = '24px serif';
        ctx.fillText(symbols[kingdomId] || '🏰', x, y);
    }

    /**
     * Dessine les routes commerciales
     */
    drawTradeRoutes(ctx) {
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        
        const positions = this.getKingdomPositions();
        const routes = [
            ['AEGYRIA', 'SOMBRENUIT'],
            ['AEGYRIA', 'ABRANTIS'],
            ['KHELOS', 'DRAK_TARR'],
            ['VARHA', 'SYLVARIA'],
            ['ECLYPSIA', 'URVALA'],
            ['OMBREFIEL', 'KHALDAR']
        ];
        
        routes.forEach(([from, to]) => {
            const fromPos = positions[from];
            const toPos = positions[to];
            if (fromPos && toPos) {
                ctx.beginPath();
                ctx.moveTo(fromPos.x, fromPos.y);
                ctx.lineTo(toPos.x, toPos.y);
                ctx.stroke();
            }
        });
        
        ctx.setLineDash([]);
    }

    /**
     * Dessine les caractéristiques géographiques
     */
    drawGeographicalFeatures(ctx) {
        // Chaînes de montagnes
        this.drawMountainRange(ctx, 100, 150, 400, 'Monts du Nord');
        this.drawMountainRange(ctx, 1400, 800, 300, 'Pics du Dragon');
        
        // Rivières
        this.drawRiver(ctx, 500, 200, 800, 600);
        this.drawRiver(ctx, 1200, 300, 1600, 900);
        
        // Forêts
        this.drawForest(ctx, 600, 400, 200);
        this.drawForest(ctx, 1100, 600, 150);
    }

    /**
     * Dessine une chaîne de montagnes
     */
    drawMountainRange(ctx, x, y, length, name) {
        ctx.fillStyle = '#696969';
        
        for (let i = 0; i < length; i += 20) {
            const peakX = x + i;
            const peakY = y + Math.sin(i * 0.1) * 30;
            const height = 40 + Math.random() * 60;
            
            // Dessiner un pic
            ctx.beginPath();
            ctx.moveTo(peakX, peakY);
            ctx.lineTo(peakX - 15, peakY + height);
            ctx.lineTo(peakX + 15, peakY + height);
            ctx.closePath();
            ctx.fill();
            
            // Neige sur le sommet
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(peakX, peakY);
            ctx.lineTo(peakX - 8, peakY + 15);
            ctx.lineTo(peakX + 8, peakY + 15);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#696969';
        }
        
        // Nom de la chaîne
        ctx.fillStyle = '#000000';
        ctx.font = '12px serif';
        ctx.fillText(name, x, y - 10);
    }

    /**
     * Dessine une rivière
     */
    drawRiver(ctx, startX, startY, endX, endY) {
        ctx.strokeStyle = '#4169e1';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        const segments = 20;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t + Math.sin(t * Math.PI * 4) * 50;
            const y = startY + (endY - startY) * t + Math.cos(t * Math.PI * 6) * 30;
            ctx.lineTo(x, y);
        }
        
        ctx.stroke();
    }

    /**
     * Dessine une forêt
     */
    drawForest(ctx, centerX, centerY, radius) {
        ctx.fillStyle = '#228b22';
        
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Dessiner un arbre simple
            ctx.beginPath();
            ctx.arc(x, y, 5 + Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Dessine les villes et villages
     */
    drawCitiesAndVillages(ctx) {
        const positions = this.getKingdomPositions();
        
        Object.entries(positions).forEach(([kingdomId, pos]) => {
            // Capitale (plus grande)
            this.drawCity(ctx, pos.x, pos.y, 'capitale', this.kingdoms[kingdomId].capital);
            
            // Villages satellites
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 * i) / 3;
                const distance = 80 + Math.random() * 40;
                const villageX = pos.x + Math.cos(angle) * distance;
                const villageY = pos.y + Math.sin(angle) * distance;
                this.drawCity(ctx, villageX, villageY, 'village', `Village ${i + 1}`);
            }
        });
    }

    /**
     * Dessine une ville ou village
     */
    drawCity(ctx, x, y, type, name) {
        const size = type === 'capitale' ? 12 : 6;
        const color = type === 'capitale' ? '#ffd700' : '#8b4513';
        
        // Icône de la ville
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - size/2, y - size/2, size, size);
        
        // Nom (seulement pour les capitales)
        if (type === 'capitale') {
            ctx.fillStyle = '#000000';
            ctx.font = '10px serif';
            ctx.fillText(name, x + 15, y + 3);
        }
    }

    /**
     * Dessine la légende et les ornements
     */
    drawLegendAndOrnaments(ctx) {
        // Cadre décoratif
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, this.mapWidth - 20, this.mapHeight - 20);
        
        // Titre
        ctx.fillStyle = '#8b0000';
        ctx.font = 'bold 32px serif';
        ctx.textAlign = 'center';
        ctx.fillText('FRICTION ULTIMATE', this.mapWidth / 2, 60);
        ctx.fillText('Carte du Monde des 12 Royaumes', this.mapWidth / 2, 100);
        
        // Rose des vents
        this.drawCompassRose(ctx, this.mapWidth - 150, 150);
        
        // Légende des symboles
        this.drawLegend(ctx, 50, this.mapHeight - 200);
    }

    /**
     * Dessine une rose des vents
     */
    drawCompassRose(ctx, centerX, centerY) {
        const radius = 60;
        
        // Cercle principal
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Points cardinaux
        const directions = ['N', 'E', 'S', 'O'];
        const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
        
        directions.forEach((dir, i) => {
            const angle = angles[i] - Math.PI/2;
            const x = centerX + Math.cos(angle) * (radius + 20);
            const y = centerY + Math.sin(angle) * (radius + 20);
            
            ctx.fillStyle = '#8b0000';
            ctx.font = 'bold 16px serif';
            ctx.textAlign = 'center';
            ctx.fillText(dir, x, y + 5);
        });
        
        // Flèche Nord
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius + 10);
        ctx.lineTo(centerX - 8, centerY - radius + 25);
        ctx.lineTo(centerX + 8, centerY - radius + 25);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Dessine la légende
     */
    drawLegend(ctx, x, y) {
        // Fond de la légende
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x, y, 300, 150);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(x, y, 300, 150);
        
        // Titre
        ctx.fillStyle = '#8b0000';
        ctx.font = 'bold 16px serif';
        ctx.textAlign = 'left';
        ctx.fillText('LÉGENDE', x + 10, y + 25);
        
        // Éléments de la légende
        const legendItems = [
            { symbol: '🏰', text: 'Capitales des Royaumes' },
            { symbol: '🏘️', text: 'Villages et Villes' },
            { symbol: '🏔️', text: 'Chaînes de Montagnes' },
            { symbol: '🌊', text: 'Rivières et Lacs' },
            { symbol: '🌲', text: 'Forêts Denses' },
            { symbol: '---', text: 'Routes Commerciales' }
        ];
        
        ctx.fillStyle = '#000000';
        ctx.font = '12px serif';
        
        legendItems.forEach((item, i) => {
            const itemY = y + 50 + (i * 18);
            ctx.fillText(item.symbol, x + 15, itemY);
            ctx.fillText(item.text, x + 40, itemY);
        });
    }

    /**
     * Retourne les données des royaumes
     */
    getKingdomsData() {
        return {
            'AEGYRIA': { 
                name: 'Aegyria', 
                terrain: 'plains', 
                capital: 'Valorhall',
                id: 'AEGYRIA'
            },
            'SOMBRENUIT': { 
                name: 'Sombrenuit', 
                terrain: 'forest', 
                capital: 'Lunelame',
                id: 'SOMBRENUIT'
            },
            'KHELOS': { 
                name: 'Khelos', 
                terrain: 'desert', 
                capital: 'Sablesang',
                id: 'KHELOS'
            },
            'ABRANTIS': { 
                name: 'Abrantis', 
                terrain: 'coast', 
                capital: 'Port-Haute-Marée',
                id: 'ABRANTIS'
            },
            'VARHA': { 
                name: 'Varha', 
                terrain: 'snow', 
                capital: 'Glacierre',
                id: 'VARHA'
            },
            'SYLVARIA': { 
                name: 'Sylvaria', 
                terrain: 'jungle', 
                capital: 'Cercle des Anciens',
                id: 'SYLVARIA'
            },
            'ECLYPSIA': { 
                name: 'Eclypsia', 
                terrain: 'eclipse', 
                capital: 'Temple Eclipse',
                id: 'ECLYPSIA'
            },
            'TERRE_DESOLE': { 
                name: 'Terre Désolée', 
                terrain: 'wasteland', 
                capital: 'Camp Survivants',
                id: 'TERRE_DESOLE'
            },
            'DRAK_TARR': { 
                name: 'Drak-Tarr', 
                terrain: 'volcano', 
                capital: 'Forge Volcanique',
                id: 'DRAK_TARR'
            },
            'URVALA': { 
                name: 'Urvala', 
                terrain: 'swamp', 
                capital: 'Labo des Morts',
                id: 'URVALA'
            },
            'OMBREFIEL': { 
                name: 'Ombrefiel', 
                terrain: 'plains', 
                capital: 'Citadelle Exilés',
                id: 'OMBREFIEL'
            },
            'KHALDAR': { 
                name: 'Khaldar', 
                terrain: 'jungle', 
                capital: 'Village Pilotis',
                id: 'KHALDAR'
            }
        };
    }

    /**
     * Retourne les positions des royaumes sur la carte
     */
    getKingdomPositions() {
        return {
            'AEGYRIA': { x: 500, y: 300, size: 100 },
            'SOMBRENUIT': { x: 300, y: 200, size: 90 },
            'KHELOS': { x: 1200, y: 400, size: 110 },
            'ABRANTIS': { x: 700, y: 500, size: 95 },
            'VARHA': { x: 200, y: 150, size: 85 },
            'SYLVARIA': { x: 800, y: 250, size: 100 },
            'ECLYPSIA': { x: 1000, y: 600, size: 90 },
            'TERRE_DESOLE': { x: 1400, y: 200, size: 120 },
            'DRAK_TARR': { x: 1500, y: 800, size: 95 },
            'URVALA': { x: 400, y: 700, size: 85 },
            'OMBREFIEL': { x: 900, y: 800, size: 90 },
            'KHALDAR': { x: 1200, y: 1000, size: 100 }
        };
    }

    /**
     * Retourne la couleur selon le terrain
     */
    getKingdomColor(terrain) {
        return this.terrainColors[terrain] || this.terrainColors.plains;
    }
}

module.exports = WorldMapGenerator;
