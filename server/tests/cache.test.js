import { jest } from '@jest/globals';

describe('Ascent Caching & Resilience Test Suite', () => {
  let mockFetch;
  let mockCacheGet;
  let mockCacheSet;
  let fetchUserInfo;
  let fetchUserRating;

  beforeEach(async () => {
    jest.resetModules();

    mockFetch = jest.fn();
    mockCacheGet = jest.fn();
    mockCacheSet = jest.fn();

    // Mock node-fetch
    await jest.unstable_mockModule('node-fetch', () => ({
      default: mockFetch,
    }));

    // Mock redis.js
    await jest.unstable_mockModule('../utils/redis.js', () => ({
      cacheGet: mockCacheGet,
      cacheSet: mockCacheSet,
      cacheLock: jest.fn().mockResolvedValue(true),
      DEFAULT_TTL_SECONDS: 300,
    }));

    // Dynamically import fetchCF after setting up mocks
    const fetchCF = await import('../utils/fetchCF.js');
    fetchUserInfo = fetchCF.fetchUserInfo;
    fetchUserRating = fetchCF.fetchUserRating;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1: Successful cache hit
  test('1. Successful cache hit: returns cached data without calling external API', async () => {
    const cachedProfile = {
      handle: 'tourist',
      rating: 3845,
      maxRating: 4009,
      rank: 'legendary grandmaster',
    };

    mockCacheGet.mockResolvedValueOnce([cachedProfile]);

    const result = await fetchUserInfo('tourist');

    expect(result).toEqual(cachedProfile);
    expect(mockCacheGet).toHaveBeenCalledWith('cf:user.info?handles=tourist');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  // TEST 2: Cache miss and successful API request
  test('2. Cache miss: fetches from Codeforces API, populates cache with TTL, and returns data', async () => {
    const apiProfile = {
      handle: 'petr',
      rating: 3000,
      maxRating: 3200,
      rank: 'international grandmaster',
    };

    // Simulate cache miss
    mockCacheGet.mockResolvedValueOnce(null);

    // Simulate successful Codeforces API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        result: [apiProfile],
      }),
    });

    const result = await fetchUserInfo('petr');

    expect(result).toEqual(apiProfile);
    expect(mockCacheGet).toHaveBeenCalledWith('cf:user.info?handles=petr');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockCacheSet).toHaveBeenCalledWith('cf:user.info?handles=petr', [apiProfile], 300);
  });

  // TEST 3: Redis unavailable and successful fallback
  test('3. Redis unavailable: gracefully falls back to direct API fetch without crashing', async () => {
    const apiProfile = {
      handle: 'ecnerwala',
      rating: 3500,
      maxRating: 3600,
      rank: 'legendary grandmaster',
    };

    // Simulate Redis network error / crash
    mockCacheGet.mockRejectedValueOnce(new Error('ECONNREFUSED: Redis server unreachable'));

    // Codeforces API is available
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        result: [apiProfile],
      }),
    });

    const result = await fetchUserInfo('ecnerwala');

    expect(result).toEqual(apiProfile);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // TEST 4: External API failure
  test('4. External API failure: propagates error when Codeforces returns non-OK and avoids caching bad data', async () => {
    mockCacheGet.mockResolvedValueOnce(null);

    // Simulate Codeforces API returning FAILED status (e.g. handle not found)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'FAILED',
        comment: 'handles: User not found',
      }),
    });

    await expect(fetchUserInfo('non_existent_handle_12345')).rejects.toThrow('handles: User not found');
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  // TEST 5: Expired cache entry
  test('5. Expired cache entry: triggers fresh API fetch and overwrites cache with new TTL', async () => {
    const freshProfile = {
      handle: 'tourist',
      rating: 3850, // Updated rating
      maxRating: 4009,
      rank: 'legendary grandmaster',
    };

    // Redis returns null because TTL expired and key was evicted
    mockCacheGet.mockResolvedValueOnce(null);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        result: [freshProfile],
      }),
    });

    const result = await fetchUserInfo('tourist');

    expect(result).toEqual(freshProfile);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockCacheSet).toHaveBeenCalledWith('cf:user.info?handles=tourist', [freshProfile], 300);
  });
});

