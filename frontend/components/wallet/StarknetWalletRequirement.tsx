"use client";

import { AlertCircle, CheckCircle2, Wallet, Zap } from "lucide-react";
import { useState } from "react";

interface StarknetWalletStatus {
  connected: boolean;
  address?: string;
  walletName?: string;
}

export function StarknetWalletRequirement() {
  const [starknetStatus, setStarknetStatus] = useState<StarknetWalletStatus>({
    connected: false,
  });

  const checkWalletConnection = async () => {
    try {
      const starknet = (window as any).starknet;
      if (!starknet) {
        setStarknetStatus({
          connected: false,
          walletName: "Not installed",
        });
        return;
      }

      const accounts = await starknet.request({ type: "wallet_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setStarknetStatus({
          connected: true,
          address: accounts[0],
          walletName: starknet.name || "Starknet Wallet",
        });
      }
    } catch (error) {
      setStarknetStatus({
        connected: false,
        walletName: "Connection failed",
      });
    }
  };

  return (
    <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">
            🔐 Starknet Wallet Required for ZK Signing
          </h3>
          <p className="text-xs text-blue-800 mt-1">
            Your Starknet wallet must be connected and opened to sign the zero-knowledge proof during execution.
          </p>
        </div>
      </div>

      {/* Wallet Status */}
      <div className="bg-white rounded p-3 border border-blue-200">
        {starknetStatus.connected ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <div className="text-xs">
              <div className="font-semibold">{starknetStatus.walletName}</div>
              <div className="text-emerald-500 font-mono text-xs mt-0.5">
                {starknetStatus.address?.slice(0, 6)}...{starknetStatus.address?.slice(-4)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-semibold">Wallet not connected</span>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded p-3 border border-blue-200 space-y-2">
        <div className="text-xs font-semibold text-blue-900">Required steps:</div>
        <ol className="text-xs space-y-1.5 text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold flex-shrink-0">1.</span>
            <span>
              <strong>Install Wallet:</strong> Download {" "}
              <a
                href="https://www.argent.xyz/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Argent X
              </a>
              {" "} or{" "}
              <a
                href="https://www.braavos.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Braavos
              </a>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold flex-shrink-0">2.</span>
            <span>
              <strong>Create Account:</strong> Set up your Starknet account on Sepolia testnet
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold flex-shrink-0">3.</span>
            <span>
              <strong>Pin Extension:</strong> Keep the wallet pinned in your browser toolbar
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold flex-shrink-0">4.</span>
            <span>
              <strong>Click Below:</strong> Click "Check Connection" to verify it's open and ready
            </span>
          </li>
        </ol>
      </div>

      {/* Check Button */}
      <button
        onClick={checkWalletConnection}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition-colors"
      >
        <Wallet className="h-4 w-4" />
        Check Starknet Wallet Connection
      </button>

      {/* What Happens Next */}
      {starknetStatus.connected && (
        <div className="bg-emerald-50 rounded p-3 border border-emerald-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-emerald-800">
              <div className="font-semibold">✓ Wallet Connected</div>
              <div className="mt-1">
                When you submit an intent, you'll be prompted to sign the ZK proof message in your wallet.
                This happens automatically in the execution step.
              </div>
            </div>
          </div>
        </div>
      )}

      {!starknetStatus.connected && (
        <div className="bg-red-50 rounded p-3 border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-800">
              <div className="font-semibold">✗ Wallet Not Ready</div>
              <div className="mt-1">
                Your Starknet wallet needs to be installed, initialized, and connected before you can submit intents.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to check if wallet is connected and handle signing
 */
export function useStarknetWalletSigning() {
  const [signingStatus, setSigningStatus] = useState<"idle" | "signing" | "signed" | "failed">("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestSignature = async (message: string): Promise<string | null> => {
    setSigningStatus("signing");
    setError(null);

    try {
      const starknet = (window as any).starknet;
      if (!starknet) {
        throw new Error("Starknet wallet not found. Install Argent X or Braavos.");
      }

      // Request signature from wallet
      const signature = await starknet.account.signMessage({
        types: {
          StarkNetDomain: [
            { name: "name", type: "shortstring" },
            { name: "version", type: "shortstring" },
            { name: "chainId", type: "shortstring" },
          ],
          Message: [
            { name: "message", type: "string" },
          ],
        },
        primaryType: "Message",
        domain: {
          name: "ShadowFlow OTC",
          version: "1",
          chainId: "SN_SEPOLIA",
        },
        message: {
          message,
        },
      });

      setSignature(signature);
      setSigningStatus("signed");
      return signature;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get wallet signature";
      setError(errorMsg);
      setSigningStatus("failed");
      return null;
    }
  };

  return {
    signingStatus,
    signature,
    error,
    requestSignature,
    isReady: signingStatus !== "signing",
  };
}
