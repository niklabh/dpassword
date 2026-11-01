import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";
import { registerCaller } from "./test-utils";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const alice = createIdentity("alice");
const bob = createIdentity("bob");

const noteRequest = (ciphertext: Uint8Array, iv: Uint8Array) => ({
  id: [] as [] | [bigint],
  kind: { secureNote: null } as { secureNote: null } | { vaultPassword: null },
  ciphertext,
  iv,
});

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  const installed = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  });
  ({ actor, canisterId } = installed);
  await registerCaller(actor, alice);
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers an empty-state read instead of trapping", async () => {
  await expect(actor.get_encrypted_items()).resolves.toEqual([]);
});

it("round-trips an encrypted item through the real canister", async () => {
  const ciphertext = new Uint8Array([1, 2, 3, 4]);
  const iv = new Uint8Array([9, 8, 7]);
  const stored = await actor.store_encrypted_item(noteRequest(ciphertext, iv));
  expect(stored).toHaveProperty("ok");
  const id = (stored as { ok: bigint }).ok;

  const summaries = await actor.get_encrypted_items();
  expect(summaries).toContainEqual(
    expect.objectContaining({ id, kind: { secureNote: null } }),
  );

  const read = await actor.get_encrypted_item(id);
  expect(read).toHaveProperty("ok");
  const item = (read as { ok: { ciphertext: Uint8Array; iv: Uint8Array } }).ok;
  expect(Array.from(item.ciphertext)).toEqual([1, 2, 3, 4]);
  expect(Array.from(item.iv)).toEqual([9, 8, 7]);
});

it("updates an existing item and reports notFound for a missing one", async () => {
  const created = await actor.store_encrypted_item(
    noteRequest(new Uint8Array([1]), new Uint8Array([2])),
  );
  const id = (created as { ok: bigint }).ok;

  const updated = await actor.store_encrypted_item({
    id: [id],
    kind: { vaultPassword: null },
    ciphertext: new Uint8Array([5, 5]),
    iv: new Uint8Array([6]),
  });
  expect(updated).toEqual({ ok: id });

  const read = await actor.get_encrypted_item(id);
  const item = (read as { ok: { kind: unknown; ciphertext: Uint8Array } }).ok;
  expect(item.kind).toEqual({ vaultPassword: null });
  expect(Array.from(item.ciphertext)).toEqual([5, 5]);

  const missing = await actor.get_encrypted_item(999_999n);
  expect(missing).toEqual({ err: { notFound: 999_999n } });
});

it("deletes an item and reports notFound afterwards", async () => {
  const created = await actor.store_encrypted_item(
    noteRequest(new Uint8Array([1]), new Uint8Array([2])),
  );
  const id = (created as { ok: bigint }).ok;

  await expect(actor.delete_item(id)).resolves.toEqual({ ok: null });
  await expect(actor.get_encrypted_item(id)).resolves.toEqual({
    err: { notFound: id },
  });
});

it("scopes items to the calling principal", async () => {
  actor.setIdentity(alice);
  const created = await actor.store_encrypted_item(
    noteRequest(new Uint8Array([7]), new Uint8Array([8])),
  );
  const aliceId = (created as { ok: bigint }).ok;

  const bobActor = await registerCaller(
    pic!.createActor<_SERVICE>(idlFactory, canisterId),
    bob,
  );
  expect(await bobActor.get_encrypted_items()).toEqual([]);
  await expect(bobActor.get_encrypted_item(aliceId)).resolves.toEqual({
    err: { notFound: aliceId },
  });
  await expect(bobActor.delete_item(aliceId)).resolves.toEqual({
    err: { notFound: aliceId },
  });
});

it("rejects an anonymous caller", async () => {
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(
    guest.store_encrypted_item(noteRequest(new Uint8Array([1]), new Uint8Array([2]))),
  ).rejects.toThrow();
});
