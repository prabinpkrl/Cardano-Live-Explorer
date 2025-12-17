import { Link } from "react-router-dom";

function HeaderBar({ isConnected }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-gray-700 bg-[#0d1520] backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="w-full px-8 h-24 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-5 hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center shadow-xl shadow-black/30 ring-2 ring-cyan-500/30">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-pulse ring-2 ring-cyan-500/50"></div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-cyan-300">
              Cardano Live Explorer
            </h1>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span>
              <p className="text-xs font-semibold text-cyan-300/80 uppercase tracking-widest">
                Real-Time Network Monitor
              </p>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-2 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 shadow-lg ${
              isConnected
                ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300 shadow-black/20"
                : "bg-rose-500/20 border-rose-400/30 text-rose-300 shadow-black/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                )}
                <span className="relative inline-flex rounded-full h-3 w-3 bg-current shadow-[0_0_8px_currentColor]"></span>
              </span>
              <span className="text-sm font-bold tracking-wide">
                {isConnected ? "Live & Connected" : "Reconnecting..."}
              </span>
            </div>
          </div>

          {localStorage.getItem("authToken") ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold tracking-wide transition-all shadow-lg shadow-cyan-500/10"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-6 py-3 rounded-xl border-2 border-cyan-500/30 bg-cyan-600/20 hover:bg-cyan-500/30 text-white font-bold tracking-wide transition-all shadow-lg shadow-black/20 hover:shadow-black/30"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;
