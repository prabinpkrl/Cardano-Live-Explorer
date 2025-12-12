# Cardano Live Explorer

A real-time blockchain explorer for the Cardano network that displays live blocks and transactions as they are added to the chain. Built with Node.js, React, and Socket.IO for seamless real-time updates.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture & Workflow](#architecture--workflow)
- [Key Components](#key-components)
- [How It Works](#how-it-works)
- [Setup Instructions](#setup-instructions)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)

## 🎯 Overview

This project provides a live, real-time view of the Cardano blockchain by:
- Connecting to a Cardano node via Ogmios (through Demeter)
- Synchronizing with the blockchain using ChainSync protocol
- Broadcasting new blocks and transactions to connected clients via WebSocket
- Displaying live updates in a modern, responsive React frontend

## 🏗️ Architecture & Workflow

### High-Level Data Flow

```
Cardano Node → Ogmios → Demeter → Backend (Node.js) → Socket.IO → Frontend (React) → UI Updates
```

### Detailed Workflow

1. **Blockchain Connection Layer**
   - **Cardano Node**: The actual Cardano blockchain node that maintains the ledger
   - **Ogmios**: A WebSocket-based JSON-RPC bridge that provides a standardized interface to query Cardano nodes
   - **Demeter**: A cloud service that hosts Ogmios endpoints, eliminating the need to run Ogmios locally

2. **Backend Processing Layer**
   - **live-sync.js**: Establishes connection to Ogmios and manages ChainSync
   - **server.js**: Express server that receives block data and broadcasts via Socket.IO

3. **Real-Time Communication Layer**
   - **Socket.IO**: Bidirectional WebSocket communication between server and clients

4. **Frontend Display Layer**
   - **React App**: Receives real-time updates and displays blocks/transactions in the UI

## 🔧 Key Components

### 1. Ogmios & Demeter

**Ogmios** is a lightweight, stateless, JSON-RPC WebSocket bridge that sits between your application and a Cardano node. It:
- Provides a standardized JSON-RPC interface to interact with Cardano nodes
- Handles the complexity of direct node communication
- Supports real-time chain synchronization via ChainSync protocol
- Uses WebSocket for efficient, persistent connections

**Why Demeter?**
Running Ogmios locally requires:
- Setting up and maintaining a Cardano node
- Configuring Ogmios server
- Managing infrastructure and resources

**Demeter** solves this by:
- Providing hosted Ogmios endpoints
- Handling all infrastructure management
- Offering reliable, always-available connections
- Supporting multiple Cardano networks (Mainnet, Preprod, Preview)

### 2. @cardano-ogmios/client Library

The `@cardano-ogmios/client` library is a JavaScript/TypeScript client that simplifies interaction with Ogmios. Its key roles:

#### **Connection Management**
- **`createConnectionObject()`**: Builds the connection configuration (host, port, TLS settings)
- **`createInteractionContext()`**: Manages WebSocket handshake and protocol negotiation
  - Handles connection lifecycle (open, error, close events)
  - Manages the underlying WebSocket connection
  - Provides error handling and reconnection logic

#### **JSON-RPC Abstraction**
- Ogmios only understands JSON-RPC protocol
- The library automatically converts JavaScript function calls to JSON-RPC requests
- Handles JSON-RPC response parsing and error handling
- You don't need to manually construct JSON-RPC messages

#### **ChainSync Client Creation**
- **`createChainSynchronizationClient()`**: Creates a ChainSync client instance
- Manages the ChainSync protocol state machine
- Handles rollForward and rollBackward events automatically

### 3. ChainSync Protocol

ChainSync is a Cardano protocol that enables real-time blockchain synchronization. Here's how it works:

#### **How ChainSync Works**

1. **Initial Connection**: Client connects to Ogmios and requests to start ChainSync
2. **Sync Point**: Client can start from:
   - **Current tip**: Resume from the latest block (what we use)
   - **Specific point**: Start from a particular block/slot
   - **Genesis**: Start from the beginning of the chain

3. **RollForward Events**: 
   - Triggered when a new block is added to the chain
   - Contains full block data (height, slot, transactions, etc.)
   - Client processes the block and calls `next()` to continue

4. **RollBackward Events**:
   - Triggered when a chain reorganization (fork) occurs
   - Indicates blocks that need to be rolled back
   - Client handles the rollback and calls `next()` to continue

5. **Sequential Processing**:
   - The `sequential: true` option ensures blocks are processed in order
   - Prevents race conditions and maintains data consistency

#### **In Our Implementation**

```javascript
const chainSync = await ogmios.createChainSynchronizationClient(
  context,
  {
    rollForward: async (response, next) => {
      const block = response.block;
      onNewBlock(block, next); // Process block and continue
    },
    rollBackward: async (response, next) => {
      // Handle chain reorganization
      next();
    },
  },
  { sequential: true } // Process blocks in order
);

await chainSync.resume(); // Start from current tip
```

## 📊 How It Works - Step by Step

### Backend Flow (live-sync.js)

1. **Environment Setup**
   ```javascript
   const AUTHENTICATED_URL = process.env.DEMETER_OGMIOS_URL;
   ```
   - Reads the Demeter Ogmios endpoint URL from environment variables

2. **Connection Object Creation**
   ```javascript
   const connection = ogmios.createConnectionObject({
     host: AUTHENTICATED_URL,
     port: 443,
     tls: true,
   });
   ```
   - Configures connection parameters (host, port, TLS encryption)

3. **Interaction Context Setup**
   ```javascript
   const context = await ogmios.createInteractionContext(
     (err) => { /* error handler */ },
     (code, reason) => { /* close handler */ },
     { connection }
   );
   ```
   - Establishes WebSocket connection to Ogmios
   - Handles connection lifecycle events
   - Manages protocol handshake

4. **ChainSync Client Creation**
   ```javascript
   const chainSync = await ogmios.createChainSynchronizationClient(
     context,
     {
       rollForward: async (response, next) => {
         onNewBlock(response.block, next);
       },
       rollBackward: async (response, next) => {
         // Handle rollbacks
         next();
       },
     },
     { sequential: true }
   );
   ```
   - Creates ChainSync client with event handlers
   - `rollForward`: Called for each new block
   - `rollBackward`: Called when chain reorganizes

5. **Start Synchronization**
   ```javascript
   await chainSync.resume();
   ```
   - Begins syncing from the current chain tip
   - Blocks are streamed in real-time as they're added

### Server Flow (server.js)

1. **Express Server Setup**
   ```javascript
   const app = express();
   const server = http.createServer(app);
   const io = socketio(server);
   ```
   - Creates HTTP server and Socket.IO instance

2. **ChainSync Integration**
   ```javascript
   startChainSync((block) => {
     const safeBlock = JSON.parse(
       JSON.stringify(block, (_, value) =>
         typeof value === "bigint" ? value.toString() : value
       )
     );
     
     io.emit("block", safeBlock);
     io.emit("blocks", safeBlock);
     io.emit("newBlock", safeBlock);
   });
   ```
   - Receives blocks from ChainSync
   - Converts BigInt values to strings (JSON serialization)
   - Broadcasts to all connected clients via Socket.IO

3. **BigInt Handling**
   - Cardano uses BigInt for large numbers (lovelace amounts)
   - JavaScript's JSON.stringify doesn't handle BigInt natively
   - Custom replacer function converts BigInt to string before serialization

### Frontend Flow (App.jsx)

1. **Socket Connection**
   ```javascript
   const socket = io("http://localhost:5000", { transports: ["websocket"] });
   ```
   - Connects to backend Socket.IO server
   - Forces WebSocket transport (no HTTP long-polling fallback)

2. **Event Listeners**
   ```javascript
   socket.on("block", handleBlock);
   socket.on("blocks", handleBlock);
   socket.on("newBlock", handleBlock);
   ```
   - Listens for multiple event names (for compatibility)
   - All trigger the same handler function

3. **Block Processing**
   ```javascript
   const handleBlock = (block) => {
     // Extract block data
     const blockData = {
       height: block.height,
       slot: block.slot,
       epoch: calculateEpoch(block.slot),
       transactions: block.transactions,
       // ... more fields
     };
     
     // Update state
     setBlocks((prev) => [blockData, ...prev].slice(0, 20));
     
     // Process transactions
     // Update transactions state
   };
   ```
   - Extracts relevant data from block
   - Calculates derived values (epoch, ADA amounts)
   - Updates React state (triggers UI re-render)

4. **UI Updates**
   - React automatically re-renders when state changes
   - New blocks appear at the top of the list
   - Transactions are displayed in real-time
   - Connection status indicators update

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Demeter account (for Ogmios endpoint)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd live-explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   DEMETER_OGMIOS_URL=wss://your-demeter-endpoint.com
   ```

4. **Start the server**
   ```bash
   node server.js
   ```
   The server will start on port 5000.

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend/cardano-live-explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173` (or similar Vite port).

### Running Both Services

You'll need two terminal windows:
- **Terminal 1**: Backend server (`node server.js`)
- **Terminal 2**: Frontend dev server (`npm run dev`)

## 📁 Project Structure

```
live-explorer/
├── server.js                 # Express server + Socket.IO setup
├── live-sync.js              # Ogmios connection & ChainSync logic
├── package.json              # Backend dependencies
├── .env                      # Environment variables (not in repo)
│
└── frontend/
    └── cardano-live-explorer/
        ├── src/
        │   ├── App.jsx              # Main React component
        │   ├── main.jsx             # React entry point
        │   ├── index.css            # Global styles
        │   │
        │   └── components/
        │       ├── Layout.jsx           # Page layout wrapper
        │       ├── HeaderBar.jsx        # Top navigation bar
        │       ├── SearchBar.jsx        # Blockchain search component
        │       ├── BlocksPanel.jsx      # Blocks display table
        │       └── TransactionsPanel.jsx # Transactions display table
        │
        ├── package.json      # Frontend dependencies
        └── vite.config.js    # Vite configuration
```

## 🔍 Function Explanations

### Backend Functions

#### `startChainSync(onNewBlock)` (live-sync.js)
- **Purpose**: Establishes connection to Ogmios and starts ChainSync
- **Parameters**: 
  - `onNewBlock`: Callback function called for each new block
- **Flow**:
  1. Creates connection object
  2. Establishes WebSocket connection via interaction context
  3. Creates ChainSync client with rollForward/rollBackward handlers
  4. Starts synchronization from current tip
- **Returns**: Promise that resolves when ChainSync starts

#### `rollForward` Handler
- **Purpose**: Processes new blocks as they arrive
- **Parameters**: 
  - `response`: Contains block data
  - `next`: Function to call when processing is complete
- **Flow**:
  1. Extracts block from response
  2. Calls `onNewBlock` callback with block data
  3. Calls `next()` to continue ChainSync

#### `rollBackward` Handler
- **Purpose**: Handles chain reorganizations (forks)
- **Parameters**: 
  - `response`: Contains rollback point information
  - `next`: Function to continue synchronization
- **Flow**:
  1. Logs rollback information
  2. Calls `next()` to continue from new chain tip

### Frontend Functions

#### `handleBlock(block)` (App.jsx)
- **Purpose**: Processes incoming block data and updates UI state
- **Flow**:
  1. Extracts block metadata (height, slot, epoch, etc.)
  2. Calculates total output for the block
  3. Updates blocks state (adds to beginning, limits to 20)
  4. Processes transactions and updates transactions state

#### `truncateHash(hash, start, end)`
- **Purpose**: Shortens long hashes for display
- **Example**: `abc123...xyz789`

#### `lovelaceToADA(lovelace)`
- **Purpose**: Converts lovelace (smallest unit) to ADA
- **Conversion**: 1 ADA = 1,000,000 lovelace

#### `calculateEpoch(slot)`
- **Purpose**: Calculates epoch number from slot number
- **Formula**: `Math.floor(slot / 432000)`

#### `formatTimeAgo(timestamp)`
- **Purpose**: Formats timestamp as relative time ("2 seconds ago")
- **Returns**: Human-readable time string

## 🛠️ Technologies Used

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web server framework
- **Socket.IO**: Real-time bidirectional communication
- **@cardano-ogmios/client**: Ogmios client library
- **dotenv**: Environment variable management

### Frontend
- **React**: UI framework
- **Vite**: Build tool and dev server
- **Socket.IO Client**: WebSocket client for real-time updates
- **Tailwind CSS**: Utility-first CSS framework

### Infrastructure
- **Ogmios**: JSON-RPC WebSocket bridge to Cardano nodes
- **Demeter**: Hosted Ogmios service
- **Cardano Node**: Blockchain node (via Demeter)

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
DEMETER_OGMIOS_URL=wss://your-demeter-endpoint.com
```

**Note**: Never commit `.env` files to version control. They contain sensitive credentials.

## 📝 Notes

- The application maintains a maximum of 20 blocks and 20 transactions in memory
- BigInt values are automatically converted to strings for JSON serialization
- The frontend uses WebSocket transport only (no HTTP long-polling)
- ChainSync processes blocks sequentially to maintain data consistency
- The UI updates automatically when new blocks arrive (no manual refresh needed)

## 🤝 Contributing

This is a live blockchain explorer. When contributing:
- Ensure real-time updates continue to work
- Test with actual blockchain data
- Maintain the sequential processing of blocks
- Handle BigInt conversions properly

## 📄 License

[Your License Here]

---

**Built with ❤️ for the Cardano community**

