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
        <div className="w-full max-w-3xl">
            <form onSubmit={handleSearch} className="glass-panel rounded-2xl p-6">
                <div className="flex flex-col gap-4">
                    {/* Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/30">
                            <svg
                                className="w-5 h-5 text-purple-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Search Explorer</h3>
                            <p className="text-sm text-gray-400">Find transactions or addresses</p>
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter transaction hash or address..."
                            className="flex-1 px-6 py-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-lg font-mono tracking-wide shadow-inner"
                        />
                        <button
                            type="submit"
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 active:scale-95 text-base"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search
                            </span>
                        </button>
                    </div>

                    {/* Help Text */}
                    <div className="flex items-start gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4 mt-0.5 flex-none" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>Search results will open in Cardano Explorer (preprod network)</span>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default SearchBar;
