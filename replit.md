# Overview

Friction Ultimate is a WhatsApp RPG bot built with Node.js that provides an immersive medieval-technological gaming experience. Players can create characters, explore kingdoms, engage in combat, and progress through a complex RPG system entirely through WhatsApp messages. The game features a steampunk-inspired world with multiple kingdoms, character progression, combat mechanics, and AI-powered narration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Framework
- **Runtime**: Node.js with CommonJS modules
- **WhatsApp Integration**: @whiskeysockets/baileys for WhatsApp Web API connection
- **Session Management**: Multi-file authentication state for persistent WhatsApp sessions

## Database Architecture
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL configured for Neon serverless
- **Schema Design**: 
  - Players table for user management (WhatsApp numbers, usernames, activity tracking)
  - Characters table for RPG data (stats, equipment, location, progression)
  - JSON fields for complex data structures (inventory, equipment, techniques)
- **Connection**: Pool-based connections with WebSocket support for serverless environments

## Game Engine
- **Command System**: Handler-based command processing for RPG actions
- **Character Management**: Creation, progression, and stat tracking
- **World System**: Kingdom-based geography with position tracking
- **Combat Engine**: Turn-based combat with friction/power level mechanics
- **Inventory System**: JSON-based item and equipment management

## AI Integration
- **Provider**: Google Gemini AI (2.5-flash for text, 2.0-flash-experimental for images)
- **Fallback Strategy**: Graceful degradation when AI services are unavailable
- **Use Cases**: Dynamic narration generation, combat descriptions, image generation

## Image Processing
- **Canvas Rendering**: node-canvas for programmatic image creation
- **Image Processing**: Sharp library for image manipulation and optimization
- **Caching Strategy**: In-memory cache for frequently used images
- **Asset Management**: Organized folder structure for game assets and temporary files

## Message Processing
- **Deduplication**: Set-based system to prevent duplicate message processing
- **Command Routing**: Pattern-based command dispatcher with handler methods
- **State Management**: Database-backed player and character state persistence
- **Response Generation**: Rich text formatting with optional image attachments

## Error Handling
- **Connection Resilience**: Automatic reconnection for WhatsApp Web sessions
- **Database Fallbacks**: Graceful error handling for database operations
- **Service Degradation**: Fallback responses when external services fail
- **Logging**: Comprehensive error logging with emoji-based status indicators

# Recent Changes

## Import Setup Completed (September 21, 2025)
- ✅ Dependencies installed successfully (npm install)
- ✅ PostgreSQL database configured and schema pushed
- ✅ Fixed corrupted ImageGenerator.js file (removed duplicate content and markdown syntax errors)
- ✅ WhatsApp bot startup working properly
- ✅ Keep-alive web server running on port 5000
- ✅ Deployment configured for Replit VM environment
- ✅ All game data (kingdoms, orders) initialized in database

## Known Configuration Status
- Database: Fully configured and operational
- WhatsApp: Ready for QR code connection
- AI Services: Partially configured (some require API keys)
  - ✅ Pollinations (free, working)
  - ✅ Freepik (fallback, working)
  - ⚠️ OpenAI, Groq, Gemini (require API keys)
  - ⚠️ PlayHT (requires API keys for voice synthesis)

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Connection Pool**: @neondatabase/serverless for efficient connection management

## WhatsApp Integration
- **Baileys Library**: Complete WhatsApp Web API implementation
- **QR Code Generation**: qrcode-terminal for initial authentication
- **WebSocket**: ws library for real-time communication

## AI Services
- **Google Gemini**: Generative AI for text and image content
- **API Integration**: @google/generative-ai client library
- **Image Generation**: Gemini 2.0-flash-experimental for visual content

## Image Processing
- **Sharp**: High-performance image processing library
- **Canvas**: HTML5 Canvas API implementation for Node.js
- **File System**: Native fs module with promises for asset management

## Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **Environment Variables**: dotenv pattern for configuration management
- **Package Management**: npm with lockfile for dependency consistency