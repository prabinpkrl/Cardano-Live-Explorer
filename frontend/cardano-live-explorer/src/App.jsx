import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

// Utility functions
// const truncateAddress = (address, start = 8, end = 8) => {
//   if (!address) return "N/A";
//   if (address.length <= start + end) return address;
//   return `${address.substring(0, start)}..${address.substring(
//     address.length - end
//   )}`;
// };

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

const calculateEpoch = (slot) => {
  // For preprod/testnet: epoch = Math.floor(slot / 432000)
  // Adjust based on your network
  return Math.floor(slot / 432000);
};

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

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("block", (block) => {
      const timestamp = Date.now();

      // Process block
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
        pool:
          block.issuerVk || block.issuer || block.producer || "Unknown Pool",
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
          const outputAddresses =
            tx.outputs?.map((output) => output.address).filter(Boolean) || [];

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
    });

    return () => {
      socket.off("block");
      socket.off("connect");
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e27] text-gray-100">
      {/* Header */}
      <header className="bg-[#0f1429] border-b border-[#1a1f3a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Cardano Live Explorer
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Real-time blockchain data from Ogmios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            ></div>
            <span className="text-sm text-gray-400">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions Panel */}
          <div className="bg-[#0f1429] rounded-lg border border-[#1a1f3a] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f3a]">
              <h2 className="text-xl font-semibold text-white">
                Recent Transactions
              </h2>
              <button className="text-sm text-[#5b9bd5] hover:text-[#7bb3e0] transition-colors">
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              {transactions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400">
                    Waiting for live transaction data...
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-[#151a2e]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Transaction Hash
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Output Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Output
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1f3a]">
                    {transactions.map((tx, index) => (
                      <tr
                        key={`${tx.id}-${index}`}
                        className="hover:bg-[#151a2e] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-[#5b9bd5]">
                              {truncateHash(tx.id)}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {formatTimeAgo(tx.timestamp)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <span className="text-white font-medium">
                              {tx.blockHeight}
                            </span>
                            <span className="text-gray-400 ml-2">
                              {tx.epoch} / {tx.slot}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {tx.outputAddresses.slice(0, 2).map((addr, idx) => (
                              <span
                                key={idx}
                                className="text-sm font-mono text-gray-300"
                                title={addr}
                              >
                                {/* {truncateAddress(addr)} */}
                              </span>
                            ))}
                            {tx.outputAddresses.length > 2 && (
                              <span className="text-xs text-[#5b9bd5]">
                                {tx.outputAddresses.length - 2} More
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white font-medium">
                            {lovelaceToADA(tx.totalOutput)} A
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Blocks Panel */}
          <div className="bg-[#0f1429] rounded-lg border border-[#1a1f3a] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f3a]">
              <h2 className="text-xl font-semibold text-white">
                Recent Blocks
              </h2>
              <button className="text-sm text-[#5b9bd5] hover:text-[#7bb3e0] transition-colors">
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              {blocks.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400">
                    Waiting for live block data...
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-[#151a2e]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Epoch / Slot
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Pool
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Transactions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Output
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1f3a]">
                    {blocks.map((block, index) => (
                      <tr
                        key={`${block.id}-${index}`}
                        className="hover:bg-[#151a2e] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">
                              {block.height}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {formatTimeAgo(block.timestamp)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-300">
                            {block.epoch} / {block.slot}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="text-sm text-gray-300"
                            title={block.pool}
                          >
                            {/* {truncateAddress(block.pool, 5, 5)} */}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white font-medium">
                            {block.transactionCount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white font-medium">
                            {lovelaceToADA(block.totalOutput.toString())} A
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
