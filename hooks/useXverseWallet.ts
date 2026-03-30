import { useCallback, useState, useEffect } from "react";

export interface XverseWallet {
  address: string;
  publicKey: string;
  connected: boolean;
  provider: "xverse" | "unisat";
}

type GenericProvider = {
  request?: (...args: unknown[]) => Promise<unknown>;
  getAccounts?: () => Promise<unknown>;
  connect?: () => Promise<unknown>;
};

type UnisatProvider = {
  requestAccounts?: () => Promise<unknown>;
  getPublicKey?: () => Promise<unknown>;
};

const CONNECT_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = CONNECT_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Xverse request timed out. Open Xverse and approve the connection, then try again."));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const candidate =
            obj.address ??
            obj.paymentAddress ??
            obj.btcAddress ??
            obj.publicAddress;
          return typeof candidate === "string" ? candidate : "";
        }
        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const nested =
      obj.addresses ??
      obj.accounts ??
      obj.result ??
      obj.address ??
      obj.paymentAddress;
    return toStringArray(nested);
  }

  return [];
}

function toPublicKey(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const candidate = obj.publicKey ?? obj.pubKey;
        if (typeof candidate === "string") return candidate;
      }
    }
    return "";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const nested = obj.publicKey ?? obj.pubKey ?? obj.result;
    return toPublicKey(nested);
  }
  return "";
}

function normalizeWalletError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Failed to connect wallet.";
  if (message.toLowerCase().includes("not iterable")) {
    return "Your Xverse extension returned an internal error. Try Unisat, or enter wallet address manually and continue.";
  }
  return message;
}

async function tryObjectProviderRequest(
  provider: GenericProvider,
  method: string,
  paramsVariants: unknown[] = [[], {}],
): Promise<unknown> {
  if (!provider.request) {
    throw new Error("Provider request method not available");
  }

  for (const params of paramsVariants) {
    try {
      return await withTimeout(provider.request({ method, params }));
    } catch {
      // Continue trying the next params shape.
    }
  }

  throw new Error(`Provider method failed: ${method}`);
}

async function tryXverseRequest(
  provider: GenericProvider,
  method: string,
  paramsVariants: unknown[] = [undefined, [], {}],
): Promise<unknown> {
  if (!provider.request) {
    throw new Error("Provider request method not available");
  }

  // Reference-compatible style: provider.request("getAccounts", params)
  for (const params of paramsVariants) {
    try {
      if (typeof params === "undefined") {
        return await withTimeout(provider.request(method));
      }
      return await withTimeout(provider.request(method, params));
    } catch {
      // Try the next style.
    }
  }

  // Legacy style fallback: provider.request({ method, params })
  return tryObjectProviderRequest(provider, method, paramsVariants.filter((v) => typeof v !== "undefined"));
}

function getBitcoinNetworkTypeFromEnv(BitcoinNetworkType: Record<string, string>): string {
  const network = (process.env.NEXT_PUBLIC_BTC_NETWORK || "").toLowerCase();
  if (network.includes("test")) {
    return BitcoinNetworkType.Testnet ?? BitcoinNetworkType.Mainnet;
  }
  return BitcoinNetworkType.Mainnet ?? "Mainnet";
}

export function useXverseWallet() {
  const [wallet, setWallet] = useState<XverseWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xverseAvailable, setXverseAvailable] = useState(false);
  const [unisatAvailable, setUnisatAvailable] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isMounted, setIsMounted] = useState(true);

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  const getProvider = useCallback((): GenericProvider | null => {
    if (typeof window === "undefined") return null;
    const win = window as Window & {
      BitcoinProvider?: GenericProvider;
      XverseProviders?: {
        BitcoinProvider?: GenericProvider;
        bitcoin?: GenericProvider;
      };
      btc?: GenericProvider;
    };

    return (
      win.BitcoinProvider ??
      win.XverseProviders?.BitcoinProvider ??
      win.XverseProviders?.bitcoin ??
      win.btc ??
      null
    );
  }, []);

  const getUnisat = useCallback((): UnisatProvider | null => {
    if (typeof window === "undefined") return null;
    const win = window as Window & { unisat?: UnisatProvider };
    return win.unisat ?? null;
  }, []);

  // Check if Xverse is available
  const isXverseAvailable = useCallback(() => {
    return xverseAvailable;
  }, [xverseAvailable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Check provider availability on mount and when window changes
  useEffect(() => {
    if (!isMounted) return;

    const checkAvailability = () => {
      setXverseAvailable(getProvider() !== null);
      setUnisatAvailable(getUnisat() !== null);
    };

    checkAvailability();

    // Recheck more frequently initially (in case extension loads after page)
    let attempts = 0;
    const maxAttempts = 10; // Check for 5 seconds total (10 * 500ms)
    
    const quickCheckInterval = setInterval(() => {
      if (attempts >= maxAttempts) {
        clearInterval(quickCheckInterval);
        // Fall back to slower checking
        const slowInterval = setInterval(checkAvailability, 2000);
        return () => clearInterval(slowInterval);
      }
      
      attempts++;
      checkAvailability();
    }, 500);

    return () => clearInterval(quickCheckInterval);
  }, [getProvider, getUnisat, isMounted]);

  const connectXverseInternal = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      throw new Error("Xverse wallet not found. Please install and enable the Xverse extension.");
    }

    let accountCandidates: string[] = [];
    let publicKey = "";

    if (provider.request) {
      const response = await tryXverseRequest(provider, "getAccounts");
      accountCandidates = toStringArray(response);
      
      try {
        const pubKeyResponse = await tryXverseRequest(provider, "getPublicKey");
        publicKey = toPublicKey(pubKeyResponse);
      } catch {
        // Public key is optional for display.
      }
    }

    if (accountCandidates.length === 0) {
      throw new Error("No accounts found in Xverse wallet. Open Xverse, unlock it, and select an account, then try again.");
    }

    setWallet({
      address: accountCandidates[0],
      publicKey,
      connected: true,
      provider: "xverse",
    });
  }, [getProvider]);

  const connectUnisatInternal = useCallback(async () => {
    const unisat = getUnisat();
    if (!unisat?.requestAccounts) {
      throw new Error("Unisat wallet not found. Install Unisat extension to use this option.");
    }

    const accounts = toStringArray(await withTimeout(unisat.requestAccounts()));
    if (accounts.length === 0) {
      throw new Error("No accounts found in Unisat wallet.");
    }

    let publicKey = "";
    if (unisat.getPublicKey) {
      try {
        publicKey = toPublicKey(await withTimeout(unisat.getPublicKey()));
      } catch {
        // Public key is optional for display.
      }
    }

    setWallet({
      address: accounts[0],
      publicKey,
      connected: true,
      provider: "unisat",
    });
  }, [getUnisat]);

  const connectXverse = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectXverseInternal();
    } catch (err) {
      setError(normalizeWalletError(err));
    } finally {
      setIsConnecting(false);
    }
  }, [connectXverseInternal]);

  const connectUnisat = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectUnisatInternal();
    } catch (err) {
      setError(normalizeWalletError(err));
    } finally {
      setIsConnecting(false);
    }
  }, [connectUnisatInternal]);

  // Connect to Xverse/Unisat with proper retry handling
  const connectWallet = useCallback(async () => {
    if (!isMounted) return;

    setIsConnecting(true);
    setError(null);
    setRetryCount(0);

    let lastError: Error | null = null;

    // Attempt connection with exponential backoff
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (!isMounted) return;

      try {
        // User flow priority: prefer Xverse first, then fallback to Unisat.
        if (xverseAvailable) {
          await connectXverseInternal();
          if (isMounted) {
            setRetryCount(0);
            setIsConnecting(false);
          }
          return;
        } else if (unisatAvailable) {
          await connectUnisatInternal();
          if (isMounted) {
            setRetryCount(0);
            setIsConnecting(false);
          }
          return;
        } else {
          throw new Error("No wallet extension detected. Please install Xverse or Unisat and try again.");
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const normalizedError = normalizeWalletError(lastError);

        if (attempt < MAX_RETRIES) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `Connection attempt ${attempt + 1}/${MAX_RETRIES + 1} failed, retrying in ${delayMs}ms...`,
            lastError?.message
          );

          // Wait before retrying
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, delayMs);
            if (!isMounted) clearTimeout(timeout);
          });

          if (isMounted) {
            setRetryCount(attempt + 1);
          }
        } else {
          // Final attempt failed
          if (isMounted) {
            setError(normalizedError);
            setIsConnecting(false);
          }
          return;
        }
      }
    }
  }, [connectUnisatInternal, connectXverseInternal, unisatAvailable, xverseAvailable, isMounted]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    if (isMounted) {
      setWallet(null);
      setError(null);
      setRetryCount(0);
      localStorage.removeItem("xverse_wallet_address");
    }
  }, [isMounted]);

  // Auto-connect on mount if previously connected AND provider is available
  useEffect(() => {
    if (!isMounted) return;

    const storedAddress = localStorage.getItem("xverse_wallet_address");
    
    // Only auto-connect if we have a stored address AND a provider is available
    // This prevents stale reconnection attempts
    if (storedAddress && (xverseAvailable || unisatAvailable)) {
      // Actually attempt to reconnect, don't just set state
      setWallet({
        address: storedAddress,
        publicKey: "",
        connected: true,
        provider: xverseAvailable ? "xverse" : "unisat",
      });
    } else if (storedAddress && !xverseAvailable && !unisatAvailable) {
      // Provider might not be loaded yet, wait a bit and try again
      const recheckTimeout = setTimeout(() => {
        if (isMounted) {
          const provider = getProvider();
          const unisat = getUnisat();
          if (provider || unisat) {
            setWallet({
              address: storedAddress,
              publicKey: "",
              connected: true,
              provider: provider ? "xverse" : "unisat",
            });
          }
        }
      }, 2000);

      return () => clearTimeout(recheckTimeout);
    }
  }, [isMounted, xverseAvailable, unisatAvailable, getProvider, getUnisat]);

  // Save wallet address when connected
  useEffect(() => {
    if (wallet?.address) {
      localStorage.setItem("xverse_wallet_address", wallet.address);
    }
  }, [wallet?.address]);

  return {
    wallet,
    isConnecting,
    error,
    xverseAvailable,
    unisatAvailable,
    connectWallet,
    connectXverse,
    connectUnisat,
    disconnectWallet,
    isXverseAvailable,
  };
}
