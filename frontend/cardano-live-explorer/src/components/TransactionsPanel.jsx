function TransactionsPanel({
  transactions,
  truncateHash,
  formatTimeAgo,
  lovelaceToADA,
}) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-6 border-b border-white/5 bg-white/5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Recent Transactions
          </h2>
          <p className="text-sm text-gray-400 pl-3.5">Live stream from mempool</p>
        </div>
        <span className="text-xs font-semibold text-purple-300 bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20">
          Viewing {Math.min(transactions.length, 20)} items
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg text-gray-400 font-medium">Waiting for transaction data...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-white/[0.02]">
              <tr>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                  Transaction ID
                </th>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                  Block Info
                </th>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                  Outputs
                </th>
                <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest text-right border-b border-white/5">
                  Total Output
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx, index) => (
                <tr
                  key={`${tx.id}-${index}`}
                  className="group hover:bg-white/[0.02] transition-colors duration-200"
                >
                  <td className="px-8 py-6 align-top">
                    <div className="flex flex-col gap-1.5">
                      <a 
                        href={`https://preprod.cardanoscan.io/transaction/${tx.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-base text-purple-300 hover:text-purple-200 transition-colors cursor-pointer hover:underline"
                        title={tx.id}
                      >
                        {truncateHash(tx.id)}
                      </a>
                      <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-700"></span>
                        {formatTimeAgo(tx.timestamp)}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 align-top">
                    <div className="flex flex-col gap-2 items-start">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700 shadow-sm">
                        #{tx.blockHeight}
                      </span>
                      <span className="text-sm text-gray-500">
                        Ep {tx.epoch} • Slot {tx.slot}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 align-top">
                    <div className="flex flex-col gap-2.5">
                      {tx.outputAddresses.slice(0, 2).map((addr, idx) => (
                        <div key={idx} className="flex items-center gap-2 max-w-[240px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-none ring-2 ring-[#050505]"></span>
                          <a
                            href={`https://preprod.cardanoscan.io/address/${addr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-gray-300 hover:text-gray-100 truncate opacity-90 hover:underline cursor-pointer"
                            title={addr}
                          >
                            {addr}
                          </a>
                        </div>
                      ))}
                      {tx.outputAddresses.length > 2 && (
                        <span className="text-[11px] font-bold text-purple-400/80 pl-3.5 uppercase tracking-wide">
                          +{tx.outputAddresses.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 align-top text-right">
                    <span className="text-xl font-bold text-white tabular-nums tracking-tight block">
                      {lovelaceToADA(tx.totalOutput)}
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ADA</span>
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

export default TransactionsPanel;

