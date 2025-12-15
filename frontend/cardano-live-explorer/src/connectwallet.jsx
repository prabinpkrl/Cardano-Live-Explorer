import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./components/Layout";

function ConnectWallet() {
  const navigate = useNavigate();
  const [walletApi, setWalletApi] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null); // hex string
  const [nonce, setNonce] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletName, setWalletName] = useState(null);

  // Step 1: Connect to wallet
  const connectWallet = async (walletKey) => {
    setError(null);
    setLoading(true);
    try {
      if (!window.cardano || !window.cardano[walletKey]) {
        setError(
          `${
            walletKey.charAt(0).toUpperCase() + walletKey.slice(1)
          } wallet not installed. Please install it first.`
        );
        setLoading(false);
        return;
      }

      const wallet = window.cardano[walletKey];
      const api = await wallet.enable();

      // Get first used address (hex)
      let usedAddresses = [];
      if (typeof api.getUsedAddresses === "function") {
        usedAddresses = await api.getUsedAddresses();
      }

      if (!usedAddresses || usedAddresses.length === 0) {
        setError("No addresses found in wallet. Make a transaction first.");
        setLoading(false);
        return;
      }

      const authAddress = usedAddresses[0]; // hex string

      console.log("Connected wallet:", walletKey);
      console.log("Wallet auth address (hex):", authAddress);

      setWalletApi(api);
      setWalletAddress(authAddress);
      setWalletName(walletKey.charAt(0).toUpperCase() + walletKey.slice(1));
      setLoading(false);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError(err.message || "Failed to connect wallet");
      setLoading(false);
    }
  };

  // Step 2: Fetch nonce from backend
  const getNonceFromBackend = async () => {
    if (!walletAddress) {
      setError("Connect wallet first");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (!res.ok) {
        throw new Error("Failed to get nonce from server");
      }

      const data = await res.json();
      console.log("Nonce from backend:", data.nonce);
      setNonce(data.nonce);
      setLoading(false);
    } catch (err) {
      console.error("Failed to get nonce:", err);
      setError(err.message || "Failed to get nonce");
      setLoading(false);
    }
  };

  // Step 3: Sign nonce
  const signNonce = async () => {
    if (!walletApi || !nonce) {
      setError("Connect wallet and fetch nonce first");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // Convert nonce to hex string for signing
      const stringToHex = (str) =>
        Array.from(str)
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("");

      const messageHex = stringToHex(nonce);

      // This should return { key, signature } for verification
      const signed = await walletApi.signData(walletAddress, messageHex);
      console.log("Signed message:", signed);

      // Step 4: Send signature + key to backend
      const res = await fetch("http://localhost:4000/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          nonce,
          signature: signed.signature,
          publicKey: signed.key,
        }),
      });

      const data = await res.json();
      console.log("Backend verification response:", data);

      // FIX: Check for "token" instead of "sessionToken"
      if (data.success && data.token && data.walletAddress) {
        // Store session token (stateless login)
        sessionStorage.setItem("sessionToken", data.token); // Changed from data.sessionToken to data.token
        sessionStorage.setItem("walletAddress", data.walletAddress);

        console.log(
          "✅ Authentication successful! Redirecting to dashboard..."
        );

        // Redirect to dashboard
        navigate("/dashboard");
      } else {
        setError(data.error || "Authentication failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to sign nonce:", err);
      setError(err.message || "Failed to sign nonce");
      setLoading(false);
    }
  };

  const truncateAddress = (addr) => {
    if (!addr) return "";
    if (addr.length <= 16) return addr;
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 8)}`;
  };

  const wallets = [
    {
      key: "lace",
      name: "Lace",
      colorClass: "bg-cyan-500/20 group-hover:bg-cyan-500/30",
    },
    {
      key: "eternl",
      name: "Eternl",
      colorClass: "bg-purple-500/20 group-hover:bg-purple-500/30",
    },
    {
      key: "nami",
      name: "Nami",
      colorClass: "bg-blue-500/20 group-hover:bg-blue-500/30",
    },
  ];

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-white mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Connect Your Wallet
            </h1>
            <p className="text-gray-400 text-lg">
              Sign in with your Cardano wallet to access your dashboard
            </p>
          </div>

          {/* Main Card */}
          <div className="glass-panel rounded-2xl p-8 border-2 border-cyan-500/10 hover:border-cyan-500/20 transition-all">
            {/* Step 1: Wallet Selection */}
            {!walletAddress && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold">
                    1
                  </span>
                  Select Your Wallet
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.key}
                      onClick={() => connectWallet(wallet.key)}
                      disabled={loading}
                      className="glass-panel rounded-xl p-6 border-2 border-gray-700/50 hover:border-cyan-500/50 transition-all text-left flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl ${wallet.colorClass} flex items-center justify-center transition-colors`}
                        >
                          <svg
                            className="w-6 h-6 text-cyan-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {wallet.name}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Connect with {wallet.name} wallet
                          </p>
                        </div>
                      </div>
                      {loading && (
                        <svg
                          className="w-5 h-5 text-cyan-400 animate-spin"
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
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Wallet Connected */}
            {walletAddress && !nonce && (
              <div>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                      ✓
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      Wallet Connected
                    </h2>
                  </div>
                  <div className="glass-panel rounded-xl p-4 mt-4 border border-green-500/20">
                    <p className="text-gray-400 text-sm mb-1">Wallet</p>
                    <p className="text-white font-mono text-sm">
                      {truncateAddress(walletAddress)}
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold">
                    2
                  </span>
                  Get Authentication Nonce
                </h2>
                <button
                  onClick={getNonceFromBackend}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin"
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
                      <span>Requesting nonce...</span>
                    </>
                  ) : (
                    "Request Nonce"
                  )}
                </button>
              </div>
            )}

            {/* Step 3: Sign Nonce */}
            {nonce && (
              <div>
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                      ✓
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      Nonce Received
                    </h2>
                  </div>
                  <div className="glass-panel rounded-xl p-4 border border-cyan-500/20">
                    <p className="text-gray-400 text-sm mb-1">Nonce</p>
                    <p className="text-white font-mono text-sm break-all">
                      {nonce}
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold">
                    3
                  </span>
                  Sign Message
                </h2>
                <p className="text-gray-400 mb-4 text-sm">
                  Please sign the message in your wallet to complete
                  authentication.
                </p>
                <button
                  onClick={signNonce}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin"
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
                      <span>Signing...</span>
                    </>
                  ) : (
                    <>
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      <span>Sign & Authenticate</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-6 glass-panel rounded-xl p-4 border-2 border-rose-500/50 bg-rose-500/10">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-rose-400 flex-shrink-0"
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
                  <p className="text-rose-400 text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ConnectWallet;
