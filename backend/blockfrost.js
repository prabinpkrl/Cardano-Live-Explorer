const express = require("express");
const Cardano = require("@emurgo/cardano-serialization-lib-nodejs");
const { authenticateToken } = require("./jwtUtils");
require("dotenv").config();

const router = express.Router();

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY;
const BLOCKFROST_URL = process.env.BLOCKFROST_BASE_URL;

// Convert hex address to bech32
function hexToBech32(hexAddress) {
  try {
    const bytes = Buffer.from(hexAddress, "hex");
    const address = Cardano.Address.from_bytes(bytes);
    return address.to_bech32();
  } catch (e) {
    console.error("hexToBech32 error:", e.message);
    return null;
  }
}

// Convert hex stake address to bech32 (stake1...)
function hexToStakeAddress(hexStake) {
  try {
    const bytes = Buffer.from(hexStake, "hex");
    const address = Cardano.Address.from_bytes(bytes);
    return address.to_bech32();
  } catch (e) {
    console.error("hexToStakeAddress error:", e.message);
    return null;
  }
}

// Extract stake address from payment address
function getStakeFromPayment(hexPayment) {
  try {
    const bytes = Buffer.from(hexPayment, "hex");
    const address = Cardano.Address.from_bytes(bytes);
    const baseAddress = Cardano.BaseAddress.from_address(address);

    if (!baseAddress) return null;

    const stakeCred = baseAddress.stake_cred();
    const networkId = address.network_id();
    const rewardAddress = Cardano.RewardAddress.new(networkId, stakeCred);
    return rewardAddress.to_address().to_bech32();
  } catch (e) {
    console.error("getStakeFromPayment error:", e.message);
    return null;
  }
}

// Simple Blockfrost fetch
async function fetchFromBlockfrost(endpoint) {
  const url = BLOCKFROST_URL + endpoint;

  const response = await fetch(url, {
    headers: {
      project_id: BLOCKFROST_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error("Blockfrost error: " + response.status);
  }

  return response.json();
}

// GET /api/history
// Fetches transaction history for a wallet
router.get("/api/history", authenticateToken, async (req, res) => {
  try {
    const hexAddress = req.query.address;

    if (!hexAddress) {
      return res.status(400).json({ error: "address is required" });
    }

    // Convert hex to bech32
    const bech32Address = hexToBech32(hexAddress);
    if (!bech32Address) {
      return res.status(400).json({ error: "Invalid address" });
    }

    console.log(
      "[blockfrost] Fetching history for:",
      bech32Address.substring(0, 30) + "..."
    );

    // Fetch transactions
    const txList = await fetchFromBlockfrost(
      "/addresses/" + bech32Address + "/transactions?order=desc&count=20"
    );

    // Fetch details for each tx
    const transactions = [];

    for (const tx of txList) {
      try {
        const txInfo = await fetchFromBlockfrost("/txs/" + tx.tx_hash);
        const utxos = await fetchFromBlockfrost(
          "/txs/" + tx.tx_hash + "/utxos"
        );

        // Calculate amounts
        let inputAmt = BigInt(0);
        let outputAmt = BigInt(0);

        for (const inp of utxos.inputs) {
          if (inp.address === bech32Address) {
            for (const amt of inp.amount) {
              if (amt.unit === "lovelace") {
                inputAmt += BigInt(amt.quantity);
              }
            }
          }
        }

        for (const out of utxos.outputs) {
          if (out.address === bech32Address) {
            for (const amt of out.amount) {
              if (amt.unit === "lovelace") {
                outputAmt += BigInt(amt.quantity);
              }
            }
          }
        }

        const netAmount = outputAmt - inputAmt;

        transactions.push({
          txHash: tx.tx_hash,
          blockHeight: tx.block_height,
          blockTime: txInfo.block_time,
          slot: txInfo.slot,
          fees: txInfo.fees,
          netAmount: netAmount.toString(),
          type: netAmount >= 0 ? "received" : "sent",
        });
      } catch (err) {
        console.error("Error fetching tx:", tx.tx_hash, err.message);
      }
    }

    res.json({
      success: true,
      address: bech32Address,
      transactions: transactions,
    });
  } catch (err) {
    console.error("[blockfrost] History error:", err.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// GET /api/account
// Fetches account info for a stake address
router.get("/api/account", authenticateToken, async (req, res) => {
  try {
    const hexStake = req.query.stakeAddress;

    if (!hexStake) {
      return res.status(400).json({ error: "stakeAddress is required" });
    }

    // Convert to bech32 if needed
    let stakeAddress = hexStake;
    if (!hexStake.startsWith("stake")) {
      stakeAddress = hexToStakeAddress(hexStake);
      if (!stakeAddress) {
        return res.status(400).json({ error: "Invalid stake address" });
      }
    }

    console.log("[blockfrost] Fetching account:", stakeAddress);

    const account = await fetchFromBlockfrost("/accounts/" + stakeAddress);

    res.json({
      success: true,
      stakeAddress: stakeAddress,
      controlledAmount: account.controlled_amount,
      rewardsSum: account.rewards_sum,
      withdrawableAmount: account.withdrawable_amount,
      poolId: account.pool_id,
      active: account.active,
    });
  } catch (err) {
    console.error("[blockfrost] Account error:", err.message);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

// POST /api/convert-stake
// Convert payment address to stake address
router.post("/api/convert-stake", authenticateToken, async (req, res) => {
  try {
    const hexPayment = req.body.paymentAddress;

    if (!hexPayment) {
      return res.status(400).json({ error: "paymentAddress is required" });
    }

    const stakeAddress = getStakeFromPayment(hexPayment);

    if (!stakeAddress) {
      return res.status(400).json({ error: "Could not extract stake address" });
    }

    res.json({
      success: true,
      stakeAddress: stakeAddress,
    });
  } catch (err) {
    console.error("[blockfrost] Convert error:", err.message);
    res.status(500).json({ error: "Failed to convert address" });
  }
});

module.exports = {
  blockfrostRouter: router,
  hexToBech32,
  hexToStakeAddress,
  getStakeFromPayment,
};
