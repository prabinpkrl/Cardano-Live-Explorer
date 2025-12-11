function BlocksPanel({ blocks, formatTimeAgo, lovelaceToADA }) {
  const renderPool = (pool) => {
    if (!pool) return "Unknown Pool";
    if (typeof pool === "string") return pool;
    try {
      return pool.verificationKey || pool.poolId || JSON.stringify(pool);
    } catch {
      return "Unknown Pool";
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-6 border-b border-white/5 bg-white/5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.6)]"></span>
            Recent Blocks
          </h2>
          <p className="text-sm text-gray-400 pl-3.5">Latest received blocks</p>
        </div>
        <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 px-4 py-2 rounded-lg border-2 border-teal-500/20 shadow-lg shadow-teal-500/10">
          Viewing {Math.min(blocks.length, 20)} items
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <p className="text-lg text-gray-400 font-medium">
              Waiting for block data...
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="`bg-white/2">
              <tr>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                  Block Height
                </th>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                  Epoch / Slot
                </th>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                  Pool
                </th>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 text-right">
                  TXs
                </th>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 text-right">
                  Output
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {blocks.map((block, index) => (
                <tr
                  key={`${block.id}-${index}`}
                  className="group hover:bg-white/2 transition-colors duration-200"
                >
                  <td className="px-8 py-6 align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold text-white tracking-tight">
                        {block.height}
                      </span>
                      <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-700"></span>
                        {formatTimeAgo(block.timestamp)}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 align-top">
                    <div className="flex flex-col gap-2 items-start">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700 shadow-sm">
                        Ep {block.epoch}
                      </span>
                      <span className="text-sm text-gray-500 font-mono">
                        Slot {block.slot}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 align-top">
                    <div className="flex items-center gap-3 max-w-[180px]">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center border-2 border-teal-500/20 flex-none shadow-lg shadow-teal-500/10">
                        <span className="text-xs font-bold text-teal-400">
                          P
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-sm text-gray-300 truncate font-medium font-mono"
                          title={renderPool(block.pool)}
                        >
                          {renderPool(block.pool)}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Pool ID
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 align-top text-right">
                    <span className="text-lg font-semibold text-gray-200">
                      {block.transactionCount}
                    </span>
                  </td>
                  <td className="px-8 py-6 align-top text-right">
                    <span className="text-xl font-bold text-white tabular-nums tracking-tight block">
                      {lovelaceToADA(block.totalOutput.toString())}
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ADA
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BlocksPanel;
