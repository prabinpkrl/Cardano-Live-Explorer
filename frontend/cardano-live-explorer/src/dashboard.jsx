import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";

const lovelaceToADA = (lovelace) => {
  if (!lovelace) return "0";
  const lovelaceStr =
    typeof lovelace === "string" ? lovelace : lovelace.toString();
  const ada = Number(lovelaceStr) / 1_000_000;
  return ada.toLocaleString("en-US", { maximumFractionDigits: 6 });
};

const truncateHash = (hash, start = 8, end = 8) => {
  if (!hash) return "N/A";
  if (hash.length <= start + end) return hash;
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
};

const formatTimestamp = (unixTime) => {
  if (!unixTime) return "N/A";
  return new Date(unixTime * 1000).toLocaleString();
};

function Dashboard() {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState(null);
  const [stakeAddress, setStakeAddress] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch wallet address from backend using JWT token
  useEffect(() => {
    const fetchWalletAddress = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("walletAddress");
          navigate("/");
          return;
        }

        const data = await res.json();
        if (data.success && data.walletAddress) {
          setWalletAddress(data.walletAddress);

          // Get stake address from payment address
          const stakeRes = await fetch(
            `${import.meta.env.VITE_API_URL}/api/convert-stake`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ paymentAddress: data.walletAddress }),
            }
          );

          if (stakeRes.ok) {
            const stakeData = await stakeRes.json();
            if (stakeData.success) {
              setStakeAddress(stakeData.stakeAddress);
            }
          }
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("walletAddress");
          navigate("/");
        }
      } catch (err) {
        console.error("Failed to fetch wallet address:", err);
        localStorage.removeItem("authToken");
        localStorage.removeItem("walletAddress");
        navigate("/");
      }
    };

    fetchWalletAddress();
  }, [navigate]);

  // Fetch transaction history from Blockfrost
  const fetchTransactions = async () => {
    if (!walletAddress) return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch history
      const historyRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/history?address=${walletAddress}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!historyRes.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const historyData = await historyRes.json();
      setTransactions(historyData.transactions || []);

      // Fetch account info if we have stake address
      if (stakeAddress) {
        const accountRes = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/api/account?stakeAddress=${stakeAddress}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (accountRes.ok) {
          const accountData = await accountRes.json();
          setAccountInfo(accountData);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError(err.message || "Failed to load transactions");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [walletAddress, stakeAddress]);

  const handleDisconnect = () => {
    const token = localStorage.getItem("authToken");

    // Call logout endpoint
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch((err) => console.error("Logout error:", err));
    }

    // Clear local storage
    localStorage.removeItem("authToken");
    localStorage.removeItem("walletAddress");

    // Navigate to home
    navigate("/");
  };

  if (!walletAddress) {
    return null;
  }

  return (
    <Layout>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link to="/" className="flex     items-center gap-2 mb-1">
              <div className="border-2 bg-blue-400 w-fit">Back to home</div>
            </Link>
            <h1 className="text-4xl font-extrabold mb-2 text-cyan-400">
              Wallet Dashboard
            </h1>
            <p className="text-gray-400">
              View and manage your Cardano transactions
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="glass-panel rounded-xl px-6 py-3 border-2 border-gray-700/50 hover:border-rose-500/50 text-white font-semibold transition-all flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Disconnect
          </button>
        </div>

        {/* Wallet Info Card */}
        <div className="glass-panel rounded-2xl p-6 mb-8 border-2 border-cyan-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-300/90 uppercase tracking-widest mb-2">
                Connected Wallet
              </p>
              <p className="text-white font-mono text-lg">
                {truncateHash(walletAddress, 12, 12)}
              </p>
              {stakeAddress && (
                <p className="text-gray-400 font-mono text-sm mt-1">
                  Stake: {truncateHash(stakeAddress, 12, 12)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse"></span>
              <span className="text-sm font-semibold">Connected</span>
            </div>
          </div>
        </div>

        {/* Account Info Card */}
        {accountInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-panel rounded-2xl p-6 border-2 border-cyan-500/10">
              <p className="text-sm font-bold text-cyan-300/90 uppercase tracking-widest mb-2">
                Total Balance
              </p>
              <p className="text-2xl font-bold text-white">
                {lovelaceToADA(accountInfo.controlledAmount)} ₳
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-6 border-2 border-indigo-500/10">
              <p className="text-sm font-bold text-indigo-300/90 uppercase tracking-widest mb-2">
                Rewards
              </p>
              <p className="text-2xl font-bold text-white">
                {lovelaceToADA(accountInfo.rewardsSum)} ₳
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-6 border-2 border-teal-500/10">
              <p className="text-sm font-bold text-teal-300/90 uppercase tracking-widest mb-2">
                Withdrawable
              </p>
              <p className="text-2xl font-bold text-white">
                {lovelaceToADA(accountInfo.withdrawableAmount)} ₳
              </p>
            </div>
          </div>
        )}

        {/* Transactions Section */}
        <div className="glass-panel rounded-2xl p-8 border-2 border-indigo-500/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg
                className="w-6 h-6 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Transaction History
            </h2>
            {!loading && transactions.length > 0 && (
              <span className="text-gray-400 text-sm">
                {transactions.length} transaction
                {transactions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <svg
                  className="w-12 h-12 text-cyan-400 animate-spin"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-gray-400">Loading transactions...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="glass-panel rounded-xl p-6 border-2 border-rose-500/50 bg-rose-500/10">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-rose-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-rose-400 font-semibold">
                    Error loading transactions
                  </p>
                  <p className="text-rose-300/80 text-sm mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchTransactions}
                className="mt-4 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-sm font-semibold transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <svg
                className="w-20 h-20 text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-gray-400 text-lg font-semibold mb-2">
                No transactions found
              </p>
              <p className="text-gray-500 text-sm">
                Your transaction history will appear here
              </p>
            </div>
          )}

          {/* Transactions Table */}
          {!loading && !error && transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Block
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-right py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Amount (ADA)
                    </th>
                    <th className="text-right py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Fee (ADA)
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr
                      key={tx.txHash || index}
                      className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <a
                          href={`https://preprod.cardanoscan.io/transaction/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-mono text-sm hover:underline"
                        >
                          {truncateHash(tx.txHash, 10, 10)}
                        </a>
                      </td>
                      <td className="py-4 px-4 text-white font-semibold">
                        {tx.blockHeight || "N/A"}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            tx.type === "received"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            tx.type === "received"
                              ? "text-green-400"
                              : "text-rose-400"
                          }`}
                        >
                          {tx.type === "received" ? "+" : ""}
                          {lovelaceToADA(tx.netAmount)} ₳
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-400 font-mono text-sm">
                        {lovelaceToADA(tx.fees)} ₳
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">
                        {formatTimestamp(tx.blockTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
