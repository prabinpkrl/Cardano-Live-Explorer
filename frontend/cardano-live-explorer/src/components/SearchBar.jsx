import { useState } from "react";

function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    // Detect if it's a transaction hash (64 characters) or address (starts with addr)
    const trimmedQuery = searchQuery.trim();
    let searchUrl;

    if (trimmedQuery.length === 64) {
      // Likely a transaction hash
      searchUrl = `https://preprod.cardanoscan.io/transaction/${trimmedQuery}`;
    } else {
      // Treat as address
      searchUrl = `https://preprod.cardanoscan.io/address/${trimmedQuery}`;
    }

    // Open in new tab
    window.open(searchUrl, "_blank", "noopener,noreferrer");

    // Clear search
    setSearchQuery("");
  };

  return (
    <div className="w-full max-w-6xl">
      <form
        onSubmit={handleSearch}
        className="glass-panel rounded-2xl p-8 border-2 border-white/10 shadow-2xl"
      >
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 flex items-center justify-center border-2 border-cyan-500/30 shadow-lg">
              <svg
                className="w-6 h-6 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-transparenttracking-tight bg-linear-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                Blockchain Search
              </h3>
              <p className="text-sm text-gray-400">
                Search transactions, addresses, or blocks
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter transaction hash or address..."
                className="w-full h-15 p-3 bg-black/40 border-2 border-white/10 rounded-xl text-white placeholder-gray-400 focus:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all text-lg font-mono tracking-wide hover:border-white/20"
              />
            </div>
            <button
              type="submit"
              className="px-10 py-5 bg-cyan-900 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 text-base flex items-center justify-center min-w-[140px]"
            >
              <span className="flex items-center gap-2.5">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search
              </span>
            </button>
          </div>

          {/* Help Text */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <svg
              className="w-4 h-4 mt-0.5 flex-none"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Search results will open in Cardano Explorer (preprod network)
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SearchBar;
