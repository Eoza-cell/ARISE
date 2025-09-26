import { pgTable, serial, text, integer, timestamp, boolean, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Table des joueurs
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  whatsappNumber: text('whatsapp_number').notNull().unique(),
  username: text('username').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActive: timestamp('last_active').defaultNow().notNull(),
});

// Table des personnages
export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  name: text('name').notNull(),
  gender: text('gender').notNull(), // 'male' ou 'female'
  kingdom: text('kingdom').notNull(),
  appearance: text('appearance'), // Description physique du personnage
  order: text('order'),
  level: integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
  
  // Barres de vie et d'énergie
  currentLife: integer('current_life').default(100).notNull(),
  maxLife: integer('max_life').default(100).notNull(),
  currentEnergy: integer('current_energy').default(100).notNull(),
  maxEnergy: integer('max_energy').default(100).notNull(),
  
  // Niveau de friction et puissance
  powerLevel: text('power_level').default('G').notNull(), // G, F, E, D, C, B, A
  frictionLevel: text('friction_level').default('G').notNull(),
  
  // Position dans le monde
  currentLocation: text('current_location').notNull(),
  position: json('position').notNull(), // {x: number, y: number, z?: number}
  
  // Équipement actuel
  equipment: json('equipment').notNull(), // {weapon?: string, armor?: string, accessories?: string[]}
  
  // Techniques apprises
  learnedTechniques: json('learned_techniques').notNull(), // string[]
  
  // Statistiques
  coins: integer('coins').default(0).notNull(),
  inventory: json('inventory').notNull(), // {itemId: string, quantity: number}[]
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Table des royaumes
export const kingdoms = pgTable('kingdoms', {
  id: text('id').primaryKey(), // AEGYRIA, SOMBRENUIT, etc.
  name: text('name').notNull(),
  description: text('description').notNull(),
  geography: text('geography').notNull(),
  culture: text('culture').notNull(),
  specialties: json('specialties').notNull(), // string[]
  particularities: text('particularities').notNull(),
});

// Table des ordres
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  hierarchy: json('hierarchy').notNull(), // {rank: string, title: string}[]
  specialties: json('specialties').notNull(), // string[]
  location: text('location').notNull(),
  kingdom: text('kingdom'), // Peut être null pour les ordres neutres
});

// Table des techniques
export const techniques = pgTable('techniques', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  requiredLevel: integer('required_level').notNull(),
  requiredOrder: text('required_order'), // Peut être null
  energyCost: integer('energy_cost').notNull(),
  damage: integer('damage').notNull(),
  type: text('type').notNull(), // 'attack', 'defense', 'magic', 'special'
});

// Table des équipements
export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'weapon', 'armor', 'accessory'
  rarity: text('rarity').notNull(), // 'common', 'rare', 'epic', 'legendary'
  stats: json('stats').notNull(), // {attack?: number, defense?: number, energy?: number}
  requirements: json('requirements').notNull(), // {level?: number, order?: string, kingdom?: string}
  imageUrl: text('image_url'),
});

// Table des sessions de jeu
export const gameSessions = pgTable('game_sessions', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  characterId: integer('character_id').notNull().references(() => characters.id),
  chatId: text('chat_id').notNull(), // ID du chat WhatsApp (groupe ou privé)
  gameState: json('game_state').notNull(), // État actuel du jeu
  lastAction: text('last_action'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Table des quêtes principales et secondaires (30,000 quêtes générées)
export const quests = pgTable('quests', {
  id: text('id').primaryKey(), // main_1, side_1, etc.
  type: text('type').notNull(), // 'main' ou 'side'
  title: text('title').notNull(),
  description: text('description').notNull(),
  level: integer('level').notNull(),
  chapter: integer('chapter'), // Pour les quêtes principales
  difficulty: text('difficulty').notNull(), // 'Facile', 'Normale', etc.
  estimatedTime: integer('estimated_time').notNull(), // en minutes
  objectives: json('objectives').notNull(), // Array d'objectifs
  rewards: json('rewards').notNull(), // {xp, gold, items, aura}
  requirements: json('requirements').notNull(), // {level, kingdom, previousQuest}
  status: text('status').default('available').notNull(), // 'available', 'completed'
  kingdom: text('kingdom').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table des progressions de quêtes par joueur
export const questProgress = pgTable('quest_progress', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  questId: text('quest_id').notNull().references(() => quests.id),
  status: text('status').default('active').notNull(), // 'active', 'completed', 'failed'
  progress: json('progress').notNull(), // Progrès des objectifs
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Table des auras et entraînements (système d'aura de 10 jours)
export const auraTraining = pgTable('aura_training', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  auraType: text('aura_type').notNull(), // 'fire', 'water', 'earth', etc.
  techniqueName: text('technique_name').notNull(),
  level: integer('level').default(1).notNull(),
  masteryPoints: integer('mastery_points').default(0).notNull(),
  trainingStatus: text('training_status').default('not_started').notNull(), // 'not_started', 'in_progress', 'completed'
  dailySessionsCompleted: integer('daily_sessions_completed').default(0).notNull(),
  totalSessions: integer('total_sessions').default(10).notNull(), // 10 jours d'entraînement
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  lastSessionAt: timestamp('last_session_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table des techniques d'aura apprises
export const auraTechniques = pgTable('aura_techniques', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  auraType: text('aura_type').notNull(),
  techniqueName: text('technique_name').notNull(),
  level: integer('level').default(1).notNull(),
  power: integer('power').default(10).notNull(),
  learnedAt: timestamp('learned_at').defaultNow().notNull(),
});

// Table des événements temporels (météo, événements spéciaux)
export const worldEvents = pgTable('world_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(), // 'weather', 'special', 'seasonal'
  name: text('name').notNull(),
  description: text('description').notNull(),
  effects: json('effects').notNull(), // Effets sur le gameplay
  rarity: text('rarity').notNull(), // 'common', 'rare', 'epic', 'legendary'
  duration: integer('duration').notNull(), // en minutes
  isActive: boolean('is_active').default(false).notNull(),
  kingdom: text('kingdom'), // null pour événements globaux
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table de l'état du temps et météo
export const worldTime = pgTable('world_time', {
  id: serial('id').primaryKey(),
  gameYear: integer('game_year').default(2847).notNull(),
  gameMonth: integer('game_month').default(3).notNull(),
  gameDay: integer('game_day').default(15).notNull(),
  gameHour: integer('game_hour').default(12).notNull(),
  gameMinute: integer('game_minute').default(0).notNull(),
  season: text('season').default('spring').notNull(),
  weatherType: text('weather_type').default('clear').notNull(),
  temperature: integer('temperature').default(20).notNull(),
  humidity: integer('humidity').default(50).notNull(),
  windSpeed: integer('wind_speed').default(5).notNull(),
  pressure: integer('pressure').default(1013).notNull(),
  kingdom: text('kingdom'), // null pour météo globale
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

// Relations
export const playersRelations = relations(players, ({ many }) => ({
  characters: many(characters),
  gameSessions: many(gameSessions),
  questProgress: many(questProgress),
  auraTraining: many(auraTraining),
  auraTechniques: many(auraTechniques),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  player: one(players, {
    fields: [characters.playerId],
    references: [players.id],
  }),
  gameSessions: many(gameSessions),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  player: one(players, {
    fields: [gameSessions.playerId],
    references: [players.id],
  }),
  character: one(characters, {
    fields: [gameSessions.characterId],
    references: [characters.id],
  }),
}));

export const questsRelations = relations(quests, ({ many }) => ({
  questProgress: many(questProgress),
}));

export const questProgressRelations = relations(questProgress, ({ one }) => ({
  player: one(players, {
    fields: [questProgress.playerId],
    references: [players.id],
  }),
  quest: one(quests, {
    fields: [questProgress.questId],
    references: [quests.id],
  }),
}));

export const auraTrainingRelations = relations(auraTraining, ({ one }) => ({
  player: one(players, {
    fields: [auraTraining.playerId],
    references: [players.id],
  }),
}));

export const auraTechniquesRelations = relations(auraTechniques, ({ one }) => ({
  player: one(players, {
    fields: [auraTechniques.playerId],
    references: [players.id],
  }),
}));

// Types
export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;
export type Kingdom = typeof kingdoms.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Technique = typeof techniques.$inferSelect;
export type Equipment = typeof equipment.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = typeof gameSessions.$inferInsert;
export type Quest = typeof quests.$inferSelect;
export type InsertQuest = typeof quests.$inferInsert;
export type QuestProgress = typeof questProgress.$inferSelect;
export type InsertQuestProgress = typeof questProgress.$inferInsert;
export type AuraTraining = typeof auraTraining.$inferSelect;
export type InsertAuraTraining = typeof auraTraining.$inferInsert;
export type AuraTechnique = typeof auraTechniques.$inferSelect;
export type InsertAuraTechnique = typeof auraTechniques.$inferInsert;
export type WorldEvent = typeof worldEvents.$inferSelect;
export type InsertWorldEvent = typeof worldEvents.$inferInsert;
export type WorldTime = typeof worldTime.$inferSelect;
export type InsertWorldTime = typeof worldTime.$inferInsert;