/**
 * TimeManager - Gère le temps, la météo et les événements du monde
 * Système complet de gestion temporelle et climatique
 */
class TimeManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.gameTime = {
            year: 2847, // Année dans l'univers du jeu
            month: 3,   // Mois (1-12)
            day: 15,    // Jour (1-30)
            hour: 12,   // Heure (0-23)
            minute: 0,  // Minute (0-59)
            season: 'spring' // Saison actuelle
        };
        
        this.weatherSystem = {
            current: 'clear',
            temperature: 20,
            humidity: 50,
            windSpeed: 5,
            pressure: 1013,
            lastUpdate: Date.now()
        };
        
        this.eventSystem = {
            activeEvents: new Map(),
            scheduledEvents: new Map(),
            eventHistory: []
        };
        
        // Configuration des saisons
        this.seasons = {
            spring: {
                name: 'Printemps',
                emoji: '🌸',
                description: 'Saison de renouveau et de croissance',
                months: [3, 4, 5],
                tempRange: [15, 25],
                weatherChances: {
                    clear: 40,
                    cloudy: 25,
                    rain: 20,
                    storm: 10,
                    wind: 5
                },
                effects: {
                    plantGrowth: 150,
                    animalActivity: 125,
                    magicPower: 110
                }
            },
            summer: {
                name: 'Été',
                emoji: '☀️',
                description: 'Saison de chaleur et d\'énergie',
                months: [6, 7, 8],
                tempRange: [25, 35],
                weatherChances: {
                    clear: 60,
                    cloudy: 15,
                    rain: 10,
                    storm: 10,
                    heat: 5
                },
                effects: {
                    fireSpells: 130,
                    waterSpells: 80,
                    energy: 120
                }
            },
            autumn: {
                name: 'Automne',
                emoji: '🍂',
                description: 'Saison de récolte et de transition',
                months: [9, 10, 11],
                tempRange: [10, 20],
                weatherChances: {
                    clear: 35,
                    cloudy: 30,
                    rain: 25,
                    wind: 10
                },
                effects: {
                    harvest: 150,
                    windSpells: 125,
                    wisdom: 115
                }
            },
            winter: {
                name: 'Hiver',
                emoji: '❄️',
                description: 'Saison de froid et de contemplation',
                months: [12, 1, 2],
                tempRange: [-5, 10],
                weatherChances: {
                    clear: 30,
                    cloudy: 25,
                    snow: 25,
                    storm: 15,
                    blizzard: 5
                },
                effects: {
                    iceSpells: 140,
                    fireSpells: 90,
                    meditation: 130
                }
            }
        };
        
        // Types de météo
        this.weatherTypes = {
            clear: {
                name: 'Ciel Dégagé',
                emoji: '☀️',
                description: 'Le soleil brille de mille feux',
                effects: {
                    visibility: 100,
                    movement: 100,
                    lightSpells: 120,
                    mood: 110
                }
            },
            cloudy: {
                name: 'Nuageux',
                emoji: '☁️',
                description: 'Des nuages parsèment le ciel',
                effects: {
                    visibility: 80,
                    movement: 95,
                    lightSpells: 90,
                    mood: 95
                }
            },
            rain: {
                name: 'Pluie',
                emoji: '🌧️',
                description: 'Une pluie fine tombe du ciel',
                effects: {
                    visibility: 60,
                    movement: 80,
                    waterSpells: 130,
                    fireSpells: 70,
                    plantGrowth: 140
                }
            },
            storm: {
                name: 'Orage',
                emoji: '⛈️',
                description: 'Un orage gronde dans le ciel',
                effects: {
                    visibility: 40,
                    movement: 60,
                    lightningSpells: 150,
                    waterSpells: 140,
                    danger: 120
                }
            },
            snow: {
                name: 'Neige',
                emoji: '🌨️',
                description: 'De la neige tombe doucement',
                effects: {
                    visibility: 50,
                    movement: 70,
                    iceSpells: 130,
                    fireSpells: 110,
                    cold: 130
                }
            },
            blizzard: {
                name: 'Blizzard',
                emoji: '🌪️',
                description: 'Une tempête de neige fait rage',
                effects: {
                    visibility: 20,
                    movement: 40,
                    iceSpells: 160,
                    fireSpells: 130,
                    danger: 150
                }
            },
            wind: {
                name: 'Vent Fort',
                emoji: '💨',
                description: 'Un vent puissant souffle',
                effects: {
                    visibility: 70,
                    movement: 90,
                    windSpells: 140,
                    flying: 160
                }
            },
            heat: {
                name: 'Canicule',
                emoji: '🔥',
                description: 'Une chaleur écrasante règne',
                effects: {
                    visibility: 85,
                    movement: 75,
                    fireSpells: 150,
                    iceSpells: 70,
                    fatigue: 130
                }
            }
        };
        
        // Types d'événements
        this.eventTypes = {
            eclipse: {
                name: 'Éclipse Solaire',
                emoji: '🌑',
                rarity: 'legendary',
                duration: 120, // minutes
                description: 'La lune cache le soleil, plongeant le monde dans l\'obscurité',
                effects: {
                    shadowSpells: 200,
                    lightSpells: 50,
                    mysticism: 180,
                    darkCreatures: 150
                }
            },
            meteorShower: {
                name: 'Pluie de Météores',
                emoji: '☄️',
                rarity: 'epic',
                duration: 60,
                description: 'Des étoiles filantes illuminent le ciel nocturne',
                effects: {
                    cosmicSpells: 160,
                    enchanting: 140,
                    starGazing: 200,
                    wishes: 150
                }
            },
            aurora: {
                name: 'Aurore Boréale',
                emoji: '🌌',
                rarity: 'rare',
                duration: 180,
                description: 'Des lumières mystiques dansent dans le ciel',
                effects: {
                    allSpells: 120,
                    meditation: 150,
                    inspiration: 140,
                    beauty: 200
                }
            },
            bloodMoon: {
                name: 'Lune de Sang',
                emoji: '🔴',
                rarity: 'epic',
                duration: 240,
                description: 'La lune prend une teinte rouge inquiétante',
                effects: {
                    darkMagic: 180,
                    bloodSpells: 200,
                    undeadPower: 160,
                    fear: 140
                }
            },
            magicStorm: {
                name: 'Tempête Magique',
                emoji: '🌀',
                rarity: 'rare',
                duration: 90,
                description: 'Une tempête chargée d\'énergie magique déferle',
                effects: {
                    allSpells: 150,
                    manaRegeneration: 200,
                    chaosSpells: 180,
                    unpredictability: 160
                }
            },
            harvest: {
                name: 'Festival des Récoltes',
                emoji: '🎃',
                rarity: 'common',
                duration: 1440, // 24 heures
                description: 'Les communautés célèbrent les récoltes abondantes',
                effects: {
                    gathering: 150,
                    cooking: 140,
                    community: 130,
                    happiness: 120
                }
            }
        };
        
        // Démarrer les systèmes
        this.startTimeUpdate();
        this.startWeatherUpdate();
        this.startEventSystem();
    }
    
    /**
     * Démarre la mise à jour du temps (1 mois de jeu = 1 semaine réelle)
     * 1 semaine = 168 heures, 1 mois = 30 jours = 720 heures
     * Ratio: 720/168 = 4.29, donc 1 heure réelle = 4.29 heures de jeu
     * Intervalle: 60000ms / 4.29 ≈ 14000ms (14 secondes réelles = 1 heure de jeu)
     */
    startTimeUpdate() {
        setInterval(() => {
            this.advanceTime();
        }, 14000); // 14 secondes réelles = 1 heure de jeu (1 mois = 1 semaine)
    }
    
    /**
     * Démarre la mise à jour de la météo (toutes les 5 minutes)
     */
    startWeatherUpdate() {
        setInterval(() => {
            this.updateWeather();
        }, 300000); // 5 minutes
    }
    
    /**
     * Démarre le système d'événements
     */
    startEventSystem() {
        setInterval(() => {
            this.checkAndTriggerEvents();
        }, 600000); // 10 minutes
    }
    
    /**
     * Avance le temps du jeu (14 secondes réelles = 1 heure de jeu)
     */
    advanceTime() {
        this.gameTime.hour++; // Chaque appel = +1 heure de jeu
        
        if (this.gameTime.hour >= 24) {
            this.gameTime.hour = 0;
            this.gameTime.day++;
            
            console.log(`📅 Nouveau jour dans Friction: Jour ${this.gameTime.day}`);
            
            if (this.gameTime.day > 30) {
                this.gameTime.day = 1;
                this.gameTime.month++;
                
                console.log(`🗓️ Nouveau mois dans Friction: Mois ${this.gameTime.month} de l'an ${this.gameTime.year}`);
                
                if (this.gameTime.month > 12) {
                    this.gameTime.month = 1;
                    this.gameTime.year++;
                    
                    console.log(`🎊 Nouvelle année dans Friction: An ${this.gameTime.year}`);
                }
            }
        }
        
        // Mettre à jour la saison
        this.updateSeason();
        
        // Log périodique pour debug (chaque jour de jeu)
        if (this.gameTime.hour === 0) {
            console.log(`⏰ Friction Time: ${this.formatDate()} ${this.formatTime()}`);
        }
    }
    
    /**
     * Met à jour la saison en cours
     */
    updateSeason() {
        for (const [seasonName, season] of Object.entries(this.seasons)) {
            if (season.months.includes(this.gameTime.month)) {
                this.gameTime.season = seasonName;
                break;
            }
        }
    }
    
    /**
     * Met à jour la météo
     */
    updateWeather() {
        const currentSeason = this.seasons[this.gameTime.season];
        const weatherChances = currentSeason.weatherChances;
        
        // Calculer la nouvelle météo basée sur les probabilités
        const random = Math.random() * 100;
        let cumulative = 0;
        let newWeather = 'clear';
        
        for (const [weather, chance] of Object.entries(weatherChances)) {
            cumulative += chance;
            if (random <= cumulative) {
                newWeather = weather;
                break;
            }
        }
        
        // Mettre à jour les paramètres météo
        this.weatherSystem.current = newWeather;
        this.weatherSystem.temperature = this.calculateTemperature(currentSeason, newWeather);
        this.weatherSystem.humidity = this.calculateHumidity(newWeather);
        this.weatherSystem.windSpeed = this.calculateWindSpeed(newWeather);
        this.weatherSystem.pressure = this.calculatePressure(newWeather);
        this.weatherSystem.lastUpdate = Date.now();
        
        console.log(`🌤️ Météo mise à jour: ${this.weatherTypes[newWeather].name}`);
    }
    
    /**
     * Calcule la température selon la saison et la météo
     */
    calculateTemperature(season, weather) {
        const [min, max] = season.tempRange;
        let baseTemp = min + Math.random() * (max - min);
        
        // Ajustements selon la météo
        const adjustments = {
            clear: 2,
            cloudy: -1,
            rain: -3,
            storm: -5,
            snow: -8,
            blizzard: -12,
            wind: -2,
            heat: 8
        };
        
        baseTemp += adjustments[weather] || 0;
        return Math.round(baseTemp);
    }
    
    /**
     * Calcule l'humidité
     */
    calculateHumidity(weather) {
        const humidities = {
            clear: 40,
            cloudy: 60,
            rain: 85,
            storm: 90,
            snow: 80,
            blizzard: 85,
            wind: 45,
            heat: 30
        };
        
        return humidities[weather] + Math.floor(Math.random() * 20) - 10;
    }
    
    /**
     * Calcule la vitesse du vent
     */
    calculateWindSpeed(weather) {
        const speeds = {
            clear: 5,
            cloudy: 8,
            rain: 15,
            storm: 25,
            snow: 12,
            blizzard: 40,
            wind: 35,
            heat: 3
        };
        
        return speeds[weather] + Math.floor(Math.random() * 10) - 5;
    }
    
    /**
     * Calcule la pression atmosphérique
     */
    calculatePressure(weather) {
        const pressures = {
            clear: 1020,
            cloudy: 1010,
            rain: 995,
            storm: 985,
            snow: 1000,
            blizzard: 980,
            wind: 1005,
            heat: 1025
        };
        
        return pressures[weather] + Math.floor(Math.random() * 20) - 10;
    }
    
    /**
     * Vérifie et déclenche les événements
     */
    checkAndTriggerEvents() {
        // Vérifier les événements programmés
        for (const [eventId, event] of this.eventSystem.scheduledEvents) {
            if (this.isEventTime(event)) {
                this.triggerEvent(event);
                this.eventSystem.scheduledEvents.delete(eventId);
            }
        }
        
        // Chance d'événement aléatoire
        if (Math.random() < 0.1) { // 10% de chance toutes les 10 minutes
            this.triggerRandomEvent();
        }
    }
    
    /**
     * Déclenche un événement aléatoire
     */
    triggerRandomEvent() {
        const eventNames = Object.keys(this.eventTypes);
        const randomEvent = eventNames[Math.floor(Math.random() * eventNames.length)];
        const eventData = this.eventTypes[randomEvent];
        
        // Vérifier la rareté
        const rarityChances = {
            common: 0.6,
            rare: 0.3,
            epic: 0.08,
            legendary: 0.02
        };
        
        if (Math.random() <= rarityChances[eventData.rarity]) {
            this.triggerEvent({
                type: randomEvent,
                ...eventData,
                startTime: Date.now(),
                endTime: Date.now() + (eventData.duration * 60000)
            });
        }
    }
    
    /**
     * Déclenche un événement
     */
    triggerEvent(event) {
        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const activeEvent = {
            id: eventId,
            ...event,
            isActive: true,
            startTime: Date.now(),
            endTime: Date.now() + (event.duration * 60000)
        };
        
        this.eventSystem.activeEvents.set(eventId, activeEvent);
        
        // Programmer la fin de l'événement
        setTimeout(() => {
            this.endEvent(eventId);
        }, event.duration * 60000);
        
        console.log(`🎆 Événement déclenché: ${event.name}`);
        return activeEvent;
    }
    
    /**
     * Termine un événement
     */
    endEvent(eventId) {
        const event = this.eventSystem.activeEvents.get(eventId);
        if (event) {
            event.isActive = false;
            event.endedAt = Date.now();
            
            // Déplacer vers l'historique
            this.eventSystem.eventHistory.push(event);
            this.eventSystem.activeEvents.delete(eventId);
            
            console.log(`🎆 Événement terminé: ${event.name}`);
        }
    }
    
    /**
     * Vérifie si c'est le moment pour un événement
     */
    isEventTime(event) {
        const now = Date.now();
        return now >= event.scheduledTime;
    }
    
    /**
     * Programme un événement
     */
    scheduleEvent(eventType, scheduledTime, customData = {}) {
        const eventData = this.eventTypes[eventType];
        if (!eventData) return null;
        
        const eventId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const event = {
            id: eventId,
            type: eventType,
            ...eventData,
            ...customData,
            scheduledTime
        };
        
        this.eventSystem.scheduledEvents.set(eventId, event);
        return event;
    }
    
    /**
     * Obtient les informations temporelles actuelles
     */
    getCurrentTime() {
        return {
            ...this.gameTime,
            timeString: this.formatTime(),
            dateString: this.formatDate(),
            seasonInfo: this.seasons[this.gameTime.season]
        };
    }
    
    /**
     * Obtient les informations météo actuelles
     */
    getCurrentWeather() {
        return {
            ...this.weatherSystem,
            weatherInfo: this.weatherTypes[this.weatherSystem.current],
            seasonInfo: this.seasons[this.gameTime.season]
        };
    }
    
    /**
     * Obtient les événements actifs
     */
    getActiveEvents() {
        return Array.from(this.eventSystem.activeEvents.values());
    }
    
    /**
     * Formate l'heure
     */
    formatTime() {
        const hour = this.gameTime.hour.toString().padStart(2, '0');
        const minute = this.gameTime.minute.toString().padStart(2, '0');
        return `${hour}:${minute}`;
    }
    
    /**
     * Formate la date
     */
    formatDate() {
        const monthNames = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        
        return `${this.gameTime.day} ${monthNames[this.gameTime.month - 1]} ${this.gameTime.year}`;
    }
    
    /**
     * Explique le système temporel du jeu
     */
    getTimeSystemInfo() {
        return `⏰ **SYSTÈME TEMPOREL FRICTION ULTIMATE** ⏰

🕐 **Correspondance temps réel ↔ temps jeu :**
• 14 secondes réelles = 1 heure de jeu
• 5,6 minutes réelles = 1 jour de jeu  
• 1 semaine réelle = 1 mois de jeu
• 1 mois réel = ~4,3 mois de jeu
• 1 an réel = ~52 ans de jeu

📊 **Rythme accéléré :**
Les événements, quêtes et évolutions se déroulent à un rythme immersif permettant une progression rapide tout en gardant la cohérence narrative.

🌍 **Impact sur le gameplay :**
• Événements saisonniers fréquents
• Économie dynamique en temps réel
• Vieillissement des personnages accéléré
• Cycles jour/nuit visibles`;
    }

    /**
     * Formate l'affichage complet du temps
     */
    formatTimeDisplay() {
        const time = this.getCurrentTime();
        const weather = this.getCurrentWeather();
        const events = this.getActiveEvents();
        
        let display = `🕐 **TEMPS MONDIAL** 🕐\n\n`;
        
        // Informations temporelles
        display += `📅 **Date:** ${time.dateString}\n`;
        display += `⏰ **Heure:** ${time.timeString}\n`;
        display += `${time.seasonInfo.emoji} **Saison:** ${time.seasonInfo.name}\n`;
        display += `📝 **Description:** ${time.seasonInfo.description}\n\n`;
        
        // Informations météo
        display += `🌤️ **MÉTÉO ACTUELLE** 🌤️\n`;
        display += `${weather.weatherInfo.emoji} **${weather.weatherInfo.name}**\n`;
        display += `📖 ${weather.weatherInfo.description}\n`;
        display += `🌡️ **Température:** ${weather.temperature}°C\n`;
        display += `💧 **Humidité:** ${weather.humidity}%\n`;
        display += `💨 **Vent:** ${weather.windSpeed} km/h\n`;
        display += `📊 **Pression:** ${weather.pressure} hPa\n\n`;
        
        // Effets de la météo
        display += `⚡ **EFFETS ACTIFS** ⚡\n`;
        for (const [effect, value] of Object.entries(weather.weatherInfo.effects)) {
            if (value !== 100) {
                const modifier = value > 100 ? '+' : '';
                display += `• ${effect}: ${modifier}${value - 100}%\n`;
            }
        }
        
        // Événements actifs
        if (events.length > 0) {
            display += `\n🎆 **ÉVÉNEMENTS ACTIFS** 🎆\n`;
            events.forEach(event => {
                const timeLeft = Math.max(0, Math.floor((event.endTime - Date.now()) / 60000));
                display += `${event.emoji} **${event.name}**\n`;
                display += `   ⏳ Temps restant: ${timeLeft} minutes\n`;
                display += `   📝 ${event.description}\n`;
            });
        }
        
        return display;
    }
    
    /**
     * Obtient les effets combinés (météo + événements + saison)
     */
    getCombinedEffects() {
        const season = this.seasons[this.gameTime.season];
        const weather = this.weatherTypes[this.weatherSystem.current];
        const events = this.getActiveEvents();
        
        const combinedEffects = { ...season.effects };
        
        // Ajouter les effets météo
        for (const [effect, value] of Object.entries(weather.effects)) {
            combinedEffects[effect] = (combinedEffects[effect] || 100) * (value / 100);
        }
        
        // Ajouter les effets des événements
        events.forEach(event => {
            for (const [effect, value] of Object.entries(event.effects)) {
                combinedEffects[effect] = (combinedEffects[effect] || 100) * (value / 100);
            }
        });
        
        return combinedEffects;
    }
    
    /**
     * Force un changement de météo (pour les admins)
     */
    forceWeatherChange(weatherType) {
        if (!this.weatherTypes[weatherType]) {
            return { success: false, message: 'Type de météo invalide' };
        }
        
        const currentSeason = this.seasons[this.gameTime.season];
        this.weatherSystem.current = weatherType;
        this.weatherSystem.temperature = this.calculateTemperature(currentSeason, weatherType);
        this.weatherSystem.humidity = this.calculateHumidity(weatherType);
        this.weatherSystem.windSpeed = this.calculateWindSpeed(weatherType);
        this.weatherSystem.pressure = this.calculatePressure(weatherType);
        this.weatherSystem.lastUpdate = Date.now();
        
        return { 
            success: true, 
            message: `Météo changée vers: ${this.weatherTypes[weatherType].name}` 
        };
    }
    
    /**
     * Force un changement de temps (pour les admins)
     */
    forceTimeChange(hours) {
        this.gameTime.hour = (this.gameTime.hour + hours) % 24;
        if (this.gameTime.hour < 0) {
            this.gameTime.hour += 24;
            this.gameTime.day--;
            if (this.gameTime.day < 1) {
                this.gameTime.day = 30;
                this.gameTime.month--;
                if (this.gameTime.month < 1) {
                    this.gameTime.month = 12;
                    this.gameTime.year--;
                }
            }
        }
        
        this.updateSeason();
        return { 
            success: true, 
            message: `Temps avancé de ${hours} heures. Nouvelle heure: ${this.formatTime()}` 
        };
    }
}

module.exports = TimeManager;