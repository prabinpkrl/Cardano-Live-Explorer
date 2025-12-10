import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Layout from "./components/Layout";
import HeaderBar from "./components/HeaderBar";
import SearchBar from "./components/SearchBar";
import TransactionsPanel from "./components/TransactionsPanel";
import BlocksPanel from "./components/BlocksPanel";

// Force websocket so we don't get stuck on long-polling
const socket = io("http://localhost:5000", { transports: ["websocket"] });

// Simple helpers used across the small components
const truncateHash = (hash, start = 8, end = 8) => {
  if (!hash) return "N/A";
  if (hash.length <= start + end) return hash;
  return `${hash.substring(0, start)}..${hash.substring(hash.length - end)}`;
};

const lovelaceToADA = (lovelace) => {
  if (!lovelace) return "0";
  const lovelaceStr =
    typeof lovelace === "string" ? lovelace : lovelace.toString();
  const ada = Number(lovelaceStr) / 1_000_000;
  return ada.toLocaleString("en-US", { maximumFractionDigits: 6 });
};

const calculateEpoch = (slot) => Math.floor(slot / 432000);

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
};

function App() {
  const [transactions, setTransactions] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventTs, setLastEventTs] = useState(null);

  useEffect(() => {
    const handleBlock = (block) => {
      console.log("[frontend] received block", block);
      const timestamp = Date.now();
      setLastEventTs(timestamp);

      // Process block
      const pool =
        typeof block.issuer === "string"
          ? block.issuer
          : block.issuer?.verificationKey ||
            block.issuer?.poolId ||
            block.issuerVk ||
            block.producer ||
            "Unknown Pool";

      const blockData = {
        height: block.height,
        slot: block.slot,
        epoch: calculateEpoch(block.slot),
        id: block.id,
        transactionCount: block.transactions?.length || 0,
        timestamp,
        // Calculate total output for the block
        totalOutput:
          block.transactions?.reduce((sum, tx) => {
            const txOutput =
              tx.outputs?.reduce((txSum, output) => {
                const amount =
                  output.value?.ada?.lovelace || output.value?.lovelace || "0";
                try {
                  return txSum + BigInt(amount);
                } catch {
                  return txSum;
                }
              }, BigInt(0)) || BigInt(0);
            return sum + txOutput;
          }, BigInt(0)) || BigInt(0),
        // Extract pool info if available (from block metadata or issuer)
        pool,
      };

      setBlocks((prev) => [blockData, ...prev].slice(0, 20));

      // Process transactions
      if (block.transactions && block.transactions.length > 0) {
        const newTransactions = block.transactions.map((tx) => {
          // Calculate total output for transaction
          const totalOutput =
            tx.outputs?.reduce((sum, output) => {
              const amount =
                output.value?.ada?.lovelace || output.value?.lovelace || "0";
              try {
                return sum + BigInt(amount);
              } catch {
                return sum;
              }
            }, BigInt(0)) || BigInt(0);

          // Get output addresses
          // Keep addresses even when the node does not return one so we can show a placeholder
          const outputAddresses =
            tx.outputs?.map(
              (output) => output.address || "No address (not provided)"
            ) || [];

          return {
            id: tx.id || tx.hash || `tx-${Date.now()}-${Math.random()}`,
            blockHeight: block.height,
            slot: block.slot,
            epoch: calculateEpoch(block.slot),
            outputAddresses,
            totalOutput: totalOutput.toString(),
            timestamp,
          };
        });

        setTransactions((prev) => [...newTransactions, ...prev].slice(0, 20));
      }
    };

    socket.on("connect", () => {
      console.log("Connected to backend");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Listen to a few common event names in case backend differs
    const blockEvents = ["block", "blocks", "newBlock"];
    blockEvents.forEach((eventName) => socket.on(eventName, handleBlock));
    const logAnyEvent = (event, data) => {
      console.log("[socket event]", event, data);
    };
    const logConnectError = (err) => {
      console.error("[socket connect_error]", err?.message || err);
    };
    socket.onAny(logAnyEvent);
    socket.on("connect_error", logConnectError);

    return () => {
      blockEvents.forEach((eventName) => socket.off(eventName, handleBlock));
      socket.off("connect");
      socket.off("disconnect");
      socket.offAny(logAnyEvent);
      socket.off("connect_error", logConnectError);
    };
  }, []);

  return (
    <Layout>
      <HeaderBar isConnected={isConnected} />

      {/* Search Bar */}
      <div className="flex justify-left mt-10 mb-10">
        <SearchBar />
      </div>

      <main className="w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connection Status Card */}
          <div className="glass-panel rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-15 transition-opacity rotate-12">
              <svg
                className="w-40 h-40 text-blue-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-blue-200/80 uppercase tracking-widest mb-2">
                Network Status
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-extrabold text-white tracking-tight">
                  {isConnected ? "Connected" : "Waiting"}
                </p>
              </div>
              <p className="text-base text-gray-400 mt-4 flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isConnected
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                      : "bg-rose-400"
                  }`}
                ></span>
                Socket connection {isConnected ? "established" : "lost"}
              </p>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="glass-panel rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-15 transition-opacity rotate-12">
              <svg
                className="w-40 h-40 text-purple-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
              </svg>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-purple-200/80 uppercase tracking-widest mb-2">
                Live Transactions
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-extrabold text-white tracking-tight">
                  {transactions.length}
                </p>
                <span className="text-base text-gray-400 font-medium">
                  showing
                </span>
              </div>
              <p className="text-base text-gray-400 mt-4">
                Real-time feed (max 20)
              </p>
            </div>
          </div>

          {/* Blocks Card */}
          <div className="glass-panel rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-15 transition-opacity rotate-12">
              <svg
                className="w-40 h-40 text-amber-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-amber-200/80 uppercase tracking-widest mb-2">
                Latest Blocks
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-extrabold text-white tracking-tight">
                  {blocks.length}
                </p>
                <span className="text-base text-gray-400 font-medium">
                  showing
                </span>
              </div>
              <p className="text-base text-gray-400 mt-4">
                Real-time feed (max 20)
              </p>
            </div>
          </div>
        </div>

        {isConnected && blocks.length === 0 && (
          <div className="glass-panel rounded-2xl px-10 py-8 flex items-center gap-8 animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
            <div className="relative flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <svg
                className="w-8 h-8 text-blue-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white">
                Waiting for network activity
              </h3>
              <p className="text-gray-300 text-base mt-1.5">
                Listening for new blocks and transactions... (event: newBlock)
              </p>
              {lastEventTs && (
                <p className="text-xs text-gray-500 mt-3 font-mono bg-black/20 px-3 py-1 rounded inline-block">
                  Last heartbeat: {formatTimeAgo(lastEventTs)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
          <TransactionsPanel
            transactions={transactions}
            truncateHash={truncateHash}
            formatTimeAgo={formatTimeAgo}
            lovelaceToADA={lovelaceToADA}
          />

          <BlocksPanel
            blocks={blocks}
            formatTimeAgo={formatTimeAgo}
            lovelaceToADA={lovelaceToADA}
          />
        </div>
      </main>
    </Layout>
  );
}

export default App;
