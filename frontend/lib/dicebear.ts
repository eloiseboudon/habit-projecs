import { useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";

import type { AvatarType } from "../types/api";

type DiceBearConfig = { style: string };

const DICEBEAR_CONFIG: Record<AvatarType, DiceBearConfig> = {
  explorateur: { style: "adventurer" },
  batisseur: { style: "lorelei-neutral" },
  moine: { style: "notionists-neutral" },
  guerrier: { style: "micah" },
};

const BASE_OPTIONS: Record<string, string> = {
  size: "256",
  scale: "90",
  radius: "50",
};

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "/"}dicebear-avatars/`;
const MEMORY_CACHE = new Map<string, string>();
let hasEnsuredDirectory = false;

async function ensureCacheDirectory(): Promise<void> {
  if (hasEnsuredDirectory) {
    return;
  }

  try {
    if (!CACHE_DIRECTORY) {
      hasEnsuredDirectory = true;
      return;
    }

    const directoryInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
    if (!directoryInfo.exists || !directoryInfo.isDirectory) {
      await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
    }
  } catch (error) {
    console.warn("Impossible de créer le répertoire de cache pour les avatars DiceBear", error);
  } finally {
    hasEnsuredDirectory = true;
  }
}

function getCacheKey(type: AvatarType, seed: string): string {
  return `${type}-${seed}`;
}

function getCachePath(type: AvatarType, seed: string): string | null {
  if (!CACHE_DIRECTORY) {
    return null;
  }

  const sanitizedSeed = seed.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${CACHE_DIRECTORY}${type}-${sanitizedSeed}.png`;
}

async function readFromCache(type: AvatarType, seed: string): Promise<string | null> {
  const cacheKey = getCacheKey(type, seed);
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey) ?? null;
  }

  const cachePath = getCachePath(type, seed);
  if (!cachePath) {
    return null;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(cachePath);
    if (!fileInfo.exists || fileInfo.isDirectory) {
      return null;
    }

    MEMORY_CACHE.set(cacheKey, cachePath);
    return cachePath;
  } catch (error) {
    console.warn("Impossible de lire l'avatar DiceBear depuis le cache", error);
    return null;
  }
}

function buildDiceBearUrl(type: AvatarType, seed: string): string {
  const config = DICEBEAR_CONFIG[type] ?? DICEBEAR_CONFIG.explorateur;
  const params = new URLSearchParams({ ...BASE_OPTIONS, seed });
  return `https://api.dicebear.com/9.x/${config.style}/png?${params.toString()}`;
}

async function downloadDiceBearAvatar(type: AvatarType, seed: string): Promise<string> {
  const cachePath = getCachePath(type, seed);
  if (!cachePath) {
    throw new Error("Aucun répertoire de cache disponible pour les avatars DiceBear.");
  }

  await ensureCacheDirectory();

  try {
    const result = await FileSystem.downloadAsync(buildDiceBearUrl(type, seed), cachePath, {
      cache: false,
    });
    const cacheKey = getCacheKey(type, seed);
    MEMORY_CACHE.set(cacheKey, result.uri);
    return result.uri;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Impossible de télécharger l'avatar depuis DiceBear.");
  }
}

export type UseDiceBearAvatarResult = {
  uri: string | null;
  isLoading: boolean;
  error: Error | null;
};

export function useDiceBearAvatar(type: AvatarType, seed: string | null | undefined): UseDiceBearAvatarResult {
  const normalizedSeed = seed && seed.trim().length > 0 ? seed : "default";
  const cacheKeyRef = useRef<string>(getCacheKey(type, normalizedSeed));
  const [uri, setUri] = useState<string | null>(() => MEMORY_CACHE.get(cacheKeyRef.current) ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !MEMORY_CACHE.has(cacheKeyRef.current));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const nextKey = getCacheKey(type, normalizedSeed);
    cacheKeyRef.current = nextKey;

    const cachedValue = MEMORY_CACHE.get(nextKey) ?? null;
    setUri(cachedValue);
    setIsLoading(!cachedValue);
    setError(null);

    let isMounted = true;

    const load = async () => {
      if (cachedValue) {
        return;
      }

      const cachedUri = await readFromCache(type, normalizedSeed);
      if (!isMounted) {
        return;
      }

      if (cachedUri) {
        setUri(cachedUri);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const downloadedUri = await downloadDiceBearAvatar(type, normalizedSeed);
        if (!isMounted) {
          return;
        }
        setUri(downloadedUri);
        setIsLoading(false);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError : new Error("Impossible de charger l'avatar."));
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [type, normalizedSeed]);

  return { uri, isLoading, error };
}
