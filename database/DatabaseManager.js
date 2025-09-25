const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { eq, and, desc, gte, lt } = require('drizzle-orm');
const ws = require('ws');

// Import du schéma
const schema = require('../shared/schema.js');

class DatabaseManager {
    constructor() {
        this.pool = null;
        this.db = null;
        this.tempData = new Map(); // Initialiser tempData ici
    }

    async initialize() {
        try {
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is required');
            }

            // Use PostgreSQL connection with proper SSL configuration
            this.pool = new Pool({ 
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false // Accept self-signed certificates in development
                }
            });
            console.log('🔌 Using PostgreSQL connection with SSL configuration');
            this.db = drizzle(this.pool, { schema });

            console.log('✅ Connexion à la base de données établie');

            // Push du schéma vers la base de données
            await this.pushSchema();

        } catch (error) {
            console.error('❌ Erreur de connexion à la base de données:', error);
            throw error;
        }
    }

    async pushSchema() {
        try {
            console.log('📊 Initialisation du schéma de base de données...');

            // Vérifier si les tables existent déjà
            const tableCheckQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('players', 'characters', 'kingdoms', 'orders', 'techniques', 'equipment', 'game_sessions')
            `;

            const existingTables = await this.pool.query(tableCheckQuery);

            if (existingTables.rows.length === 0) {
                console.log('📊 Création des tables de base de données...');

                // Créer les tables dans l'ordre correct (dépendances)
                await this.createTables();

                console.log('✅ Tables créées avec succès');
            } else {
                console.log('✅ Tables de base de données déjà existantes');
            }

            console.log('✅ Schéma de base de données initialisé');
        } catch (error) {
            console.error('❌ Erreur lors de la création du schéma:', error);
            throw error;
        }
    }

    async createTables() {
        // Créer les tables en SQL direct (pour bootstrap initial)
        const createTablesSQL = `
            -- Table des joueurs
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                whatsapp_number TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                last_active TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Table des royaumes
            CREATE TABLE IF NOT EXISTS kingdoms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                geography TEXT NOT NULL,
                culture TEXT NOT NULL,
                specialties JSON NOT NULL,
                particularities TEXT NOT NULL
            );

            -- Table des ordres
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                hierarchy JSON NOT NULL,
                specialties JSON NOT NULL,
                location TEXT NOT NULL,
                kingdom TEXT
            );

            -- Table des techniques
            CREATE TABLE IF NOT EXISTS techniques (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                required_level INTEGER NOT NULL,
                required_order TEXT,
                energy_cost INTEGER NOT NULL,
                damage INTEGER NOT NULL,
                type TEXT NOT NULL
            );

            -- Table des équipements
            CREATE TABLE IF NOT EXISTS equipment (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL,
                rarity TEXT NOT NULL,
                stats JSON NOT NULL,
                requirements JSON NOT NULL,
                image_url TEXT
            );

            -- Table des personnages
            CREATE TABLE IF NOT EXISTS characters (
                id SERIAL PRIMARY KEY,
                player_id INTEGER NOT NULL REFERENCES players(id),
                name TEXT NOT NULL,
                gender TEXT NOT NULL,
                kingdom TEXT NOT NULL,
                "order" TEXT,
                level INTEGER DEFAULT 1 NOT NULL,
                experience INTEGER DEFAULT 0 NOT NULL,
                current_life INTEGER DEFAULT 100 NOT NULL,
                max_life INTEGER DEFAULT 100 NOT NULL,
                current_energy INTEGER DEFAULT 100 NOT NULL,
                max_energy INTEGER DEFAULT 100 NOT NULL,
                power_level TEXT DEFAULT 'G' NOT NULL,
                friction_level TEXT DEFAULT 'G' NOT NULL,
                current_location TEXT NOT NULL,
                position JSON NOT NULL,
                equipment JSON NOT NULL,
                learned_techniques JSON NOT NULL,
                coins INTEGER DEFAULT 0 NOT NULL,
                inventory JSON NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Table des sessions de jeu
            CREATE TABLE IF NOT EXISTS game_sessions (
                id SERIAL PRIMARY KEY,
                player_id INTEGER NOT NULL REFERENCES players(id),
                character_id INTEGER NOT NULL REFERENCES characters(id),
                chat_id TEXT NOT NULL,
                game_state JSON NOT NULL,
                last_action TEXT,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Table pour la mémoire contextuelle de l'IA
            CREATE TABLE IF NOT EXISTS conversation_memory (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                player_id INTEGER REFERENCES players(id),
                character_id INTEGER REFERENCES characters(id),
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                location TEXT,
                action TEXT,
                context_data JSON,
                timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
                importance INTEGER DEFAULT 5 NOT NULL,
                memory_type TEXT DEFAULT 'conversation' NOT NULL
            );

            -- Table pour les événements marquants du personnage
            CREATE TABLE IF NOT EXISTS character_memories (
                id SERIAL PRIMARY KEY,
                character_id INTEGER NOT NULL REFERENCES characters(id),
                memory_title TEXT NOT NULL,
                memory_content TEXT NOT NULL,
                location TEXT,
                participants JSON,
                memory_type TEXT NOT NULL,
                importance INTEGER DEFAULT 5 NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Table de sauvegarde des parties
            CREATE TABLE IF NOT EXISTS game_backups (
                id SERIAL PRIMARY KEY,
                player_id INTEGER NOT NULL REFERENCES players(id),
                backup_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Table des associations chat-royaume
            CREATE TABLE IF NOT EXISTS chat_kingdom_associations (
                id SERIAL PRIMARY KEY,
                chat_id TEXT NOT NULL UNIQUE,
                kingdom_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );

            -- Index pour améliorer les performances
            CREATE INDEX IF NOT EXISTS idx_players_whatsapp ON players(whatsapp_number);
            CREATE INDEX IF NOT EXISTS idx_characters_player ON characters(player_id);
            CREATE INDEX IF NOT EXISTS idx_game_sessions_player_chat ON game_sessions(player_id, chat_id);
            CREATE INDEX IF NOT EXISTS idx_conversation_memory_session ON conversation_memory(session_id);
            CREATE INDEX IF NOT EXISTS idx_conversation_memory_timestamp ON conversation_memory(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_conversation_memory_importance ON conversation_memory(importance DESC);
            CREATE INDEX IF NOT EXISTS idx_character_memories_character ON character_memories(character_id);
            CREATE INDEX IF NOT EXISTS idx_character_memories_importance ON character_memories(importance DESC);
            CREATE INDEX IF NOT EXISTS idx_game_backups_player ON game_backups(player_id);
            CREATE INDEX IF NOT EXISTS idx_conversation_memory_content ON conversation_memory USING gin(to_tsvector('french', content));
            CREATE INDEX IF NOT EXISTS idx_chat_kingdom_associations_chat ON chat_kingdom_associations(chat_id);
            CREATE INDEX IF NOT EXISTS idx_chat_kingdom_associations_kingdom ON chat_kingdom_associations(kingdom_id);
        `;

        await this.pool.query(createTablesSQL);
    }

    // Gestion des joueurs
    async getPlayerByWhatsApp(whatsappNumber) {
        try {
            const [player] = await this.db
                .select()
                .from(schema.players)
                .where(eq(schema.players.whatsappNumber, whatsappNumber))
                .limit(1);
            return player || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du joueur:', error);
            throw error;
        }
    }

    async createPlayer(whatsappNumber, username) {
        try {
            const [player] = await this.db
                .insert(schema.players)
                .values({
                    whatsappNumber,
                    username,
                    createdAt: new Date(),
                    lastActive: new Date()
                })
                .returning();
            return player;
        } catch (error) {
            console.error('❌ Erreur lors de la création du joueur:', error);
            throw error;
        }
    }

    async updatePlayerActivity(playerId) {
        try {
            await this.db
                .update(schema.players)
                .set({ lastActive: new Date() })
                .where(eq(schema.players.id, playerId));
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de l\'activité:', error);
        }
    }

    // Gestion des personnages
    async getCharacterByPlayer(playerId) {
        try {
            const [character] = await this.db
                .select()
                .from(schema.characters)
                .where(eq(schema.characters.playerId, playerId))
                .limit(1);
            return character || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du personnage:', error);
            throw error;
        }
    }

    async createCharacter(characterData) {
        try {
            const [character] = await this.db
                .insert(schema.characters)
                .values({
                    ...characterData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
                .returning();
            return character;
        } catch (error) {
            console.error('❌ Erreur lors de la création du personnage:', error);
            throw error;
        }
    }

    async updateCharacter(characterId, updates) {
        try {
            const [updatedCharacter] = await this.db
                .update(schema.characters)
                .set({
                    currentLife: updates.currentLife,
                    currentEnergy: updates.currentEnergy,
                    coins: updates.coins,
                    currentLocation: updates.currentLocation || '',
                    position: updates.position || {},
                    equipment: updates.equipment || {},
                    learnedTechniques: updates.learnedTechniques || [],
                    inventory: updates.inventory || [],
                    updatedAt: new Date()
                })
                .where(eq(schema.characters.id, characterId))
                .returning();

            if (!updatedCharacter) {
                throw new Error(`Aucun personnage trouvé avec l'ID ${characterId}`);
            }

            console.log(`✅ Personnage ${characterId} mis à jour`);
            return updatedCharacter;
        } catch (error) {
            console.error('❌ Erreur mise à jour personnage:', error);
            throw error;
        }
    }

    async deleteCharacter(characterId) {
        try {
            const [deletedCharacter] = await this.db
                .delete(schema.characters)
                .where(eq(schema.characters.id, characterId))
                .returning();

            if (!deletedCharacter) {
                throw new Error(`Aucun personnage trouvé avec l'ID ${characterId}`);
            }

            console.log(`✅ Personnage ${characterId} supprimé`);
            return deletedCharacter;
        } catch (error) {
            console.error('❌ Erreur suppression personnage:', error);
            throw error;
        }
    }

    // Gestion des sessions de jeu
    async getGameSession(playerId, chatId) {
        try {
            const [session] = await this.db
                .select()
                .from(schema.gameSessions)
                .where(
                    and(
                        eq(schema.gameSessions.playerId, playerId),
                        eq(schema.gameSessions.chatId, chatId)
                    )
                )
                .limit(1);
            return session || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la session:', error);
            throw error;
        }
    }

    async createGameSession(sessionData) {
        try {
            const [session] = await this.db
                .insert(schema.gameSessions)
                .values({
                    ...sessionData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
                .returning();
            return session;
        } catch (error) {
            console.error('❌ Erreur lors de la création de la session:', error);
            throw error;
        }
    }

    async updateGameSession(sessionId, updates) {
        try {
            const [session] = await this.db
                .update(schema.gameSessions)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(schema.gameSessions.id, sessionId))
                .returning();
            return session;
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de la session:', error);
            throw error;
        }
    }

    // Gestion des royaumes et ordres
    async getAllKingdoms() {
        try {
            return await this.db.select().from(schema.kingdoms);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des royaumes:', error);
            throw error;
        }
    }

    async getAllOrders() {
        try {
            return await this.db.select().from(schema.orders);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des ordres:', error);
            throw error;
        }
    }

    async getKingdomById(kingdomId) {
        try {
            const [kingdom] = await this.db
                .select()
                .from(schema.kingdoms)
                .where(eq(schema.kingdoms.id, kingdomId))
                .limit(1);
            return kingdom || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération du royaume:', error);
            throw error;
        }
    }

    async getOrderById(orderId) {
        try {
            const [order] = await this.db
                .select()
                .from(schema.orders)
                .where(eq(schema.orders.id, orderId))
                .limit(1);
            return order || null;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération de l\'ordre:', error);
            throw error;
        }
    }

    // Méthodes utilitaires
    async insertKingdom(kingdomData) {
        try {
            await this.db.insert(schema.kingdoms).values(kingdomData);
        } catch (error) {
            console.error('❌ Erreur lors de l\'insertion du royaume:', error);
            throw error;
        }
    }

    async insertOrder(orderData) {
        try {
            await this.db.insert(schema.orders).values(orderData);
        } catch (error) {
            console.error('❌ Erreur lors de l\'insertion de l\'ordre:', error);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }

    // Méthodes pour les données temporaires (création de personnage)
    async setTemporaryData(playerId, key, value) {
        try {
            if (!this.tempData) {
                this.tempData = new Map();
            }

            const playerKey = `${playerId}_${key}`;
            this.tempData.set(playerKey, value);

            // Auto-nettoyage après 10 minutes
            setTimeout(() => {
                this.tempData.delete(playerKey);
            }, 10 * 60 * 1000);

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde temporaire:', error);
        }
    }

    async getTemporaryData(playerId, key) {
        try {
            if (!this.tempData) {
                return null;
            }

            const playerKey = `${playerId}_${key}`;
            return this.tempData.get(playerKey) || null;

        } catch (error) {
            console.error('❌ Erreur lors de la récupération temporaire:', error);
            return null;
        }
    }

    async clearTemporaryData(playerId, key) {
        try {
            if (!this.tempData) {
                return;
            }

            const playerKey = `${playerId}_${key}`;
            this.tempData.delete(playerKey);

        } catch (error) {
            console.error('❌ Erreur lors du nettoyage temporaire:', error);
        }
    }

    async getCharacterByName(name) {
        try {
            const [character] = await this.db
                .select()
                .from(schema.characters)
                .where(eq(schema.characters.name, name))
                .limit(1);

            return character || null;
        } catch (error) {
            console.error('❌ Erreur lors de la recherche par nom:', error);
            return null;
        }
    }

    // Méthodes pour la gestion de la mémoire IA persistante
    async saveConversationMemory(sessionId, role, content, contextData = {}) {
        try {
            const memoryData = {
                sessionId,
                role,
                content,
                location: contextData.location || null,
                action: contextData.action || null,
                contextData: contextData.additionalData || null,
                importance: contextData.importance || 5,
                memoryType: contextData.memoryType || 'conversation',
                playerId: contextData.playerId || null,
                characterId: contextData.characterId || null
            };

            const [memory] = await this.db
                .insert(schema.conversationMemory)
                .values(memoryData)
                .returning();

            return memory;
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde mémoire:', error);
            throw error;
        }
    }

    async getConversationMemory(sessionId, limit = 1000) {
        try {
            const memories = await this.db
                .select()
                .from(schema.conversationMemory)
                .where(eq(schema.conversationMemory.sessionId, sessionId))
                .orderBy(desc(schema.conversationMemory.timestamp))
                .limit(limit);

            return memories.reverse(); // Retourner dans l'ordre chronologique
        } catch (error) {
            console.error('❌ Erreur lors de la récupération mémoire:', error);
            return [];
        }
    }

    async searchRelatedMemories(sessionId, searchText, limit = 10) {
        try {
            // Recherche simple par mots-clés dans le contenu
            const keywords = searchText.toLowerCase().split(' ').filter(word => word.length > 3);

            if (keywords.length === 0) return [];

            const memories = await this.db
                .select()
                .from(schema.conversationMemory)
                .where(eq(schema.conversationMemory.sessionId, sessionId))
                .orderBy(desc(schema.conversationMemory.importance))
                .limit(100); // Récupérer plus pour filtrer

            // Filtrer par pertinence
            const relevantMemories = memories.filter(memory => {
                const content = memory.content.toLowerCase();
                return keywords.some(keyword => content.includes(keyword));
            });

            return relevantMemories.slice(0, limit);
        } catch (error) {
            console.error('❌ Erreur lors de la recherche mémoire:', error);
            return [];
        }
    }

    async createGameBackup(playerId) {
        try {
            const player = await this.getPlayerByWhatsApp(playerId);
            if (!player) return null;

            const character = await this.getCharacterByPlayer(player.id);
            const memories = await this.getConversationMemory(`player_${player.id}`, 1000);

            const backup = {
                player: player,
                character: character,
                memories: memories,
                timestamp: new Date(),
                version: '1.0'
            };

            // Sauvegarder dans une table de backup en utilisant raw query pour cette table spécifique
            await this.pool.query(
                'INSERT INTO game_backups (player_id, backup_data, created_at) VALUES ($1, $2, $3)',
                [player.id, JSON.stringify(backup), new Date()]
            );

            console.log(`✅ Sauvegarde créée pour le joueur ${player.id}`);
            return backup;
        } catch (error) {
            console.error('❌ Erreur lors de la création de sauvegarde:', error);
            return null;
        }
    }

    async getImportantMemories(sessionId, importance = 7, limit = 10) {
        try {
            const memories = await this.db
                .select()
                .from(schema.conversationMemory)
                .where(
                    and(
                        eq(schema.conversationMemory.sessionId, sessionId),
                        gte(schema.conversationMemory.importance, importance)
                    )
                )
                .orderBy(desc(schema.conversationMemory.importance))
                .limit(limit);

            return memories;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération mémoires importantes:', error);
            return [];
        }
    }

    async saveCharacterMemory(characterId, title, content, memoryType, contextData = {}) {
        try {
            const memoryData = {
                characterId,
                memoryTitle: title,
                memoryContent: content,
                memoryType,
                location: contextData.location || null,
                participants: contextData.participants || null,
                importance: contextData.importance || 5
            };

            const [memory] = await this.db
                .insert(schema.characterMemories)
                .values(memoryData)
                .returning();

            return memory;
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde mémoire personnage:', error);
            throw error;
        }
    }

    async getCharacterMemories(characterId, limit = 10) {
        try {
            const memories = await this.db
                .select()
                .from(schema.characterMemories)
                .where(eq(schema.characterMemories.characterId, characterId))
                .orderBy(desc(schema.characterMemories.importance))
                .limit(limit);

            return memories;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération mémoires personnage:', error);
            return [];
        }
    }

    // Nettoyage périodique des anciens souvenirs peu importants
    async cleanupOldMemories(daysOld = 30, minImportance = 3) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const deleted = await this.db
                .delete(schema.conversationMemory)
                .where(
                    and(
                        lt(schema.conversationMemory.timestamp, cutoffDate),
                        lt(schema.conversationMemory.importance, minImportance)
                    )
                );

            console.log(`🧹 Nettoyage mémoire: ${deleted.rowCount} entrées supprimées`);
            return deleted.rowCount;
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage mémoire:', error);
            return 0;
        }
    }

    // Gestion des associations chat-royaume
    async saveChatKingdomAssociation(chatId, kingdomId) {
        try {
            // Utiliser une requête SQL directe pour cette fonctionnalité
            await this.pool.query(`
                INSERT INTO chat_kingdom_associations (chat_id, kingdom_id, created_at, updated_at)
                VALUES ($1, $2, NOW(), NOW())
                ON CONFLICT (chat_id) 
                DO UPDATE SET kingdom_id = $2, updated_at = NOW()
            `, [chatId, kingdomId]);

            console.log(`✅ Association sauvegardée: ${chatId} -> ${kingdomId}`);
            return true;
        } catch (error) {
            console.error('❌ Erreur sauvegarde association chat-royaume:', error);
            throw error;
        }
    }

    async getChatKingdomAssociation(chatId) {
        try {
            const result = await this.pool.query(
                'SELECT chat_id, kingdom_id, created_at, updated_at FROM chat_kingdom_associations WHERE chat_id = $1',
                [chatId]
            );

            if (result.rows.length > 0) {
                return {
                    chatId: result.rows[0].chat_id,
                    kingdomId: result.rows[0].kingdom_id,
                    createdAt: result.rows[0].created_at,
                    updatedAt: result.rows[0].updated_at
                };
            }

            return null;
        } catch (error) {
            console.error('❌ Erreur récupération association chat-royaume:', error);
            throw error;
        }
    }

    async deleteChatKingdomAssociation(chatId) {
        try {
            const result = await this.pool.query(
                'DELETE FROM chat_kingdom_associations WHERE chat_id = $1 RETURNING *',
                [chatId]
            );

            if (result.rows.length > 0) {
                console.log(`✅ Association supprimée: ${chatId}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erreur suppression association chat-royaume:', error);
            throw error;
        }
    }

    async getAllChatKingdomAssociations() {
        try {
            const result = await this.pool.query(
                'SELECT chat_id, kingdom_id, created_at, updated_at FROM chat_kingdom_associations ORDER BY created_at DESC'
            );

            return result.rows.map(row => ({
                chatId: row.chat_id,
                kingdomId: row.kingdom_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        } catch (error) {
            console.error('❌ Erreur récupération toutes associations:', error);
            return [];
        }
    }
}

module.exports = DatabaseManager;