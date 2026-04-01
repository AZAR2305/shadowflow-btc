import NodeCache from 'node-cache';

/**
 * Pyth Price Service
 * Handles fetching and caching of real-time price data from Pyth Network
 * Used for converting BTC ↔ STRK amounts and calculating cross-chain exchange rates
 */
export class PythPriceService {
  private static instance: PythPriceService;
  private priceCache: NodeCache;
  private priceServiceUrl: string;

  // Pyth Price Feed IDs for mainnet
  public static readonly PRICE_FEED_IDS: { [key: string]: string } = {
    'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'STRK': '0x6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870',
    'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    'USD': '0x1d31e424a1e0b3f5aaf61a7b5b07dbb69b79e79e7dc5e99d44ce87ba5c1b89e9',
  };

  private constructor() {
    this.priceServiceUrl = process.env.PYTH_PRICE_SERVICE_URL || 'https://hermes.pyth.network';

    // Cache with 60 second TTL by default for real-time prices
    const cacheTTL = parseInt(process.env.PRICE_CACHE_TTL || '60');
    this.priceCache = new NodeCache({ stdTTL: cacheTTL, checkperiod: 120 });
  }

  public static getInstance(): PythPriceService {
    if (!PythPriceService.instance) {
      PythPriceService.instance = new PythPriceService();
    }
    return PythPriceService.instance;
  }

  /**
   * Initialize the price service
   */
  public async initialize(): Promise<void> {
    console.log('📡 Connecting to Pyth Price Service:', this.priceServiceUrl);
    
    try {
      const testPriceIds = [
        PythPriceService.PRICE_FEED_IDS['BTC'],
        PythPriceService.PRICE_FEED_IDS['STRK']
      ];
      const testPrices = await this.fetchLatestParsed(testPriceIds);

      if (testPrices && testPrices.length > 0) {
        console.log('✅ Successfully connected to Pyth Network');
        testPrices.forEach((feed, idx) => {
          const symbol = idx === 0 ? 'BTC' : 'STRK';
          console.log(`📊 Test price (${symbol}): $${feed.price.price} (expo: ${feed.price.expo})`);
        });
      }
    } catch (error) {
      console.error('⚠️ Failed to test Pyth connection:', error);
      throw error;
    }
  }

  /**
   * Get current price for a single asset
   * @param symbol Asset symbol (BTC, STRK, ETH, etc.)
   * @returns Price data with formatted output
   */
  public async getPrice(symbol: string): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `price_${upperSymbol}`;

    // Check cache first
    const cachedPrice = this.priceCache.get<PriceData>(cacheKey);
    if (cachedPrice) {
      return cachedPrice;
    }

    const priceId = PythPriceService.PRICE_FEED_IDS[upperSymbol];
    if (!priceId) {
      throw new Error(`Price feed not found for symbol: ${symbol}`);
    }

    try {
      const parsed = await this.fetchLatestParsed([priceId]);
      if (!parsed || parsed.length === 0) {
        throw new Error(`No price data returned for ${symbol}`);
      }

      const price = parsed[0].price;

      const priceData: PriceData = {
        symbol: upperSymbol,
        priceId,
        price: price.price.toString(),
        conf: price.conf.toString(),
        expo: price.expo,
        publishTime: price.publish_time,
        formattedPrice: this.formatPrice(price.price.toString(), price.expo)
      };

      // Cache the price
      this.priceCache.set(cacheKey, priceData);

      return priceData;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get current prices for multiple assets
   * @param symbols Array of asset symbols
   * @returns Map of symbol to price data
   */
  public async getPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const priceMap = new Map<string, PriceData>();
    const normalized = symbols.map(s => s.toUpperCase());

    const priceIds = normalized.map(symbol => {
      const id = PythPriceService.PRICE_FEED_IDS[symbol];
      if (!id) {
        throw new Error(`Price feed not found for symbol: ${symbol}`);
      }
      return id;
    });

    try {
      const parsed = await this.fetchLatestParsed(priceIds);
      if (!parsed || parsed.length === 0) {
        throw new Error("No price feeds returned for requested symbols");
      }

      const normalizeId = (id: string) => id.toLowerCase().replace(/^0x/, "");
      const parsedById = new Map(parsed.map((p) => [normalizeId(p.id), p]));
      priceIds.forEach((id, index) => {
        const symbol = normalized[index];
        const feed = parsedById.get(normalizeId(id));
        if (!feed) {
          return;
        }
        const price = feed.price;

        const priceData: PriceData = {
          symbol,
          priceId: priceIds[index],
          price: price.price.toString(),
          conf: price.conf.toString(),
          expo: price.expo,
          publishTime: price.publish_time,
          formattedPrice: this.formatPrice(price.price.toString(), price.expo)
        };

        priceMap.set(symbol, priceData);
        this.priceCache.set(`price_${symbol}`, priceData);
      });

      return priceMap;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      throw error;
    }
  }

  /**
   * Convert amount from one asset to another using current prices
   * @param fromAmount Amount in source asset
   * @param fromSymbol Source symbol (BTC, STRK, etc.)
   * @param toSymbol Destination symbol (BTC, STRK, etc.)
   * @returns Object with exchanged amount and price data
   */
  public async convertAmount(
    fromAmount: string | number,
    fromSymbol: string,
    toSymbol: string
  ): Promise<ConversionResult> {
    const fromNum = typeof fromAmount === 'string' ? parseFloat(fromAmount) : fromAmount;
    
    if (isNaN(fromNum) || fromNum <= 0) {
      throw new Error(`Invalid amount: ${fromAmount}`);
    }

    const priceMap = await this.getPrices([fromSymbol, toSymbol]);
    
    const fromPrice = priceMap.get(fromSymbol.toUpperCase());
    const toPrice = priceMap.get(toSymbol.toUpperCase());

    if (!fromPrice || !toPrice) {
      throw new Error(`Missing price data for conversion`);
    }

    // Convert: fromAmount * (fromPrice / toPrice)
    const fromPriceNum = this.formatPrice(fromPrice.price, fromPrice.expo);
    const toPriceNum = this.formatPrice(toPrice.price, toPrice.expo);
    const toAmount = fromNum * (fromPriceNum / toPriceNum);

    return {
      fromAmount: fromNum,
      fromSymbol: fromSymbol.toUpperCase(),
      toAmount: parseFloat(toAmount.toFixed(8)),
      toSymbol: toSymbol.toUpperCase(),
      fromPrice: fromPriceNum,
      toPrice: toPriceNum,
      exchangeRate: fromPriceNum / toPriceNum,
      publishTime: Math.max(fromPrice.publishTime, toPrice.publishTime),
      timestamp: Date.now()
    };
  }

  /**
   * Format price with exponent
   * @param price Raw price value
   * @param expo Exponent
   * @returns Formatted price as number
   */
  private formatPrice(price: string, expo: number): number {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) {
      throw new Error(`Invalid price value: ${price}`);
    }
    return priceNum * Math.pow(10, expo);
  }

  /**
   * Get all supported symbols
   * @returns Array of supported symbols
   */
  public getSupportedSymbols(): string[] {
    return Object.keys(PythPriceService.PRICE_FEED_IDS);
  }

  /**
   * Clear price cache
   */
  public clearCache(): void {
    this.priceCache.flushAll();
  }

  /**
   * Check if a symbol is supported
   * @param symbol Symbol to check
   * @returns True if supported
   */
  public isSymbolSupported(symbol: string): boolean {
    return symbol.toUpperCase() in PythPriceService.PRICE_FEED_IDS;
  }

  private async fetchLatestParsed(priceIds: string[]): Promise<HermesParsedPrice[]> {
    const query = priceIds
      .map((id) => `ids[]=${encodeURIComponent(id.replace(/^0x/, ""))}`)
      .join("&");
    const url = `${this.priceServiceUrl.replace(/\/+$/, "")}/v2/updates/price/latest?${query}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Pyth Hermes HTTP ${response.status}`);
    }
    const data = await response.json() as { parsed?: HermesParsedPrice[] };
    return data.parsed ?? [];
  }
}

interface HermesParsedPrice {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

/**
 * Price data interface
 */
export interface PriceData {
  symbol: string;
  priceId: string;
  price: string;
  conf: string;
  expo: number;
  publishTime: number;
  formattedPrice: number;
}

/**
 * Conversion result interface
 */
export interface ConversionResult {
  fromAmount: number;
  fromSymbol: string;
  toAmount: number;
  toSymbol: string;
  fromPrice: number;
  toPrice: number;
  exchangeRate: number;
  publishTime: number;
  timestamp: number;
}
