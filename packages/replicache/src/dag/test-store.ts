import {assertArray, assertString} from '../../../shared/src/asserts.ts';
import {stringCompare} from '../../../shared/src/string-compare.ts';
import type {Hash} from '../hash.ts';
import {
  assertHash,
  makeNewFakeHashFunction,
  parse as parseHash,
} from '../hash.ts';
import {TestMemStore} from '../kv/test-mem-store.ts';
import {
  Chunk,
  type ChunkHasher,
  type Refs,
  toRefs as chunkToRefs,
} from './chunk.ts';
import * as KeyType from './key-type-enum.ts';
import {chunkMetaKey, parse as parseKey} from './key.ts';
import {StoreImpl} from './store-impl.ts';

export class TestStore extends StoreImpl {
  readonly kvStore: TestMemStore;

  constructor(
    kvStore = new TestMemStore(),
    chunkHasher: ChunkHasher = makeNewFakeHashFunction(),
    assertValidHash = assertHash,
  ) {
    super(kvStore, chunkHasher, assertValidHash);
    this.kvStore = kvStore;
  }

  chunks(): Chunk[] {
    const rv: Chunk[] = [];
    for (const [key, value] of this.kvStore.entries()) {
      const pk = parseKey(key);
      if (pk.type === KeyType.ChunkData) {
        const refsValue = this.kvStore.map().get(chunkMetaKey(pk.hash));
        rv.push(new Chunk(pk.hash, value, toRefs(refsValue)));
      }
    }
    return sortByHash(rv);
  }

  chunkHashes(): Set<Hash> {
    const hashes = new Set<Hash>();
    for (const key of this.kvStore.map().keys()) {
      const pk = parseKey(key);
      if (pk.type === KeyType.ChunkData) {
        hashes.add(pk.hash);
      }
    }
    return hashes;
  }

  clear(): void {
    this.kvStore.clear();
  }
}

function sortByHash(arr: Iterable<Chunk>): Chunk[] {
  return [...arr].sort((a, b) => stringCompare(String(a.hash), String(b.hash)));
}

function toRefs(refs: unknown): Refs {
  if (refs === undefined) {
    return [];
  }
  assertArray(refs);
  const rv = new Set<Hash>();
  for (const h of refs) {
    assertString(h);
    rv.add(parseHash(h));
  }
  return chunkToRefs(rv);
}
