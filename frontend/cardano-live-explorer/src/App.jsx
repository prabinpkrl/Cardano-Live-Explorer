import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import HeaderBar from "./components/HeaderBar";
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
    <div className="min-h-screen bg-gradient-to-br from-[#070915] via-[#0b1024] to-[#0d1632] text-gray-100">
      <HeaderBar isConnected={isConnected} />

      <main className="w-full max-w-screen-2xl mx-auto px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/30">
            <p className="text-xs text-gray-300 mb-2 uppercase tracking-[0.12em]">
              Connection
            </p>
            <p className="text-3xl font-semibold text-white">
              {isConnected ? "Live" : "Waiting"}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Socket to backend: {isConnected ? "up" : "down"}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/30">
            <p className="text-xs text-gray-300 mb-2 uppercase tracking-[0.12em]">
              Transactions Shown
            </p>
            <p className="text-3xl font-semibold text-white">
              {transactions.length}
            </p>
            <p className="text-sm text-gray-400 mt-2">Latest 20 kept in memory</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/30">
            <p className="text-xs text-gray-300 mb-2 uppercase tracking-[0.12em]">
              Blocks Shown
            </p>
            <p className="text-3xl font-semibold text-white">{blocks.length}</p>
            <p className="text-sm text-gray-400 mt-2">Latest 20 kept in memory</p>
          </div>
        </div>
        {isConnected && blocks.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-base text-gray-100 shadow-inner shadow-black/10">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-semibold">
                Connected, waiting for block events from backend
              </span>
            </div>
            <span className="text-gray-400 block mt-2">
              (listening for: block, blocks, newBlock)
            </span>
            {lastEventTs && (
              <span className="block text-sm text-gray-500 mt-1">
                Last event received: {formatTimeAgo(lastEventTs)}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
}

export default App;
