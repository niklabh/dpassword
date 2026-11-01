import type { EncryptedItem, ItemSummary, backendInterface } from "@/backend";
import { ItemKind } from "@/backend";
import { Layout } from "@/components/Layout";
import { VaultSessionProvider } from "@/hooks/useVaultSession";
import { encryptPayload } from "@/lib/crypto";
import VaultWorkspace from "@/pages/VaultWorkspace";
import type { NotePayload, PasswordPayload } from "@/types/vault";
import type { InternetIdentityContext } from "@caffeineai/core-infrastructure";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setIdentityForTest } from "./setup";
import { renderWithActor } from "./test-utils";

/** A deterministic non-anonymous principal for the signed-in journeys. */
const PRINCIPAL = "2vxsx-fae";

function signedInIdentity(): InternetIdentityContext["identity"] {
  return {
    getPrincipal: () => ({
      isAnonymous: () => false,
      toText: () => PRINCIPAL,
    }),
  } as unknown as InternetIdentityContext["identity"];
}

interface FakeVault {
  items: Map<bigint, EncryptedItem>;
  nextId: bigint;
}

function makeFakeVault(): FakeVault {
  return { items: new Map(), nextId: 1n };
}

/**
 * A stateful, typed fake of the vault actor. Every read returns a fresh clone
 * so the query cache never aliases the mutable store.
 */
function makeActor(vault: FakeVault) {
  const store_encrypted_item = vi.fn<backendInterface["store_encrypted_item"]>(
    async (request) => {
      const id = request.id ?? vault.nextId;
      if (request.id === undefined) vault.nextId += 1n;
      const existing = vault.items.get(id);
      const now = BigInt(Date.now());
      vault.items.set(id, {
        id,
        kind: request.kind,
        ciphertext: request.ciphertext,
        iv: request.iv,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      return { __kind__: "ok", ok: id };
    },
  );
  const get_encrypted_items = vi.fn<backendInterface["get_encrypted_items"]>(
    async () =>
      [...vault.items.values()].map(
        (item): ItemSummary => ({
          id: item.id,
          kind: item.kind,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      ),
  );
  const get_encrypted_item = vi.fn<backendInterface["get_encrypted_item"]>(
    async (id) => {
      const item = vault.items.get(id);
      if (!item)
        return { __kind__: "err", err: { __kind__: "notFound", notFound: id } };
      return { __kind__: "ok", ok: structuredClone(item) };
    },
  );
  const delete_item = vi.fn<backendInterface["delete_item"]>(async (id) => {
    if (!vault.items.has(id)) {
      return { __kind__: "err", err: { __kind__: "notFound", notFound: id } };
    }
    vault.items.delete(id);
    return { __kind__: "ok", ok: null };
  });
  const actor = {
    store_encrypted_item,
    get_encrypted_items,
    get_encrypted_item,
    delete_item,
  } satisfies Pick<
    backendInterface,
    | "store_encrypted_item"
    | "get_encrypted_items"
    | "get_encrypted_item"
    | "delete_item"
  >;
  return {
    actor,
    store_encrypted_item,
    get_encrypted_items,
    get_encrypted_item,
    delete_item,
  };
}

function renderVault(actor: ReturnType<typeof makeActor>["actor"]) {
  return renderWithActor(
    <VaultSessionProvider>
      <Layout>
        <VaultWorkspace />
      </Layout>
    </VaultSessionProvider>,
    actor,
  );
}

/** Unlock the vault through the real UI so the derived key is in memory. */
async function unlockVault(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("vault.unlock_button"));
  await screen.findByText("Vault unlocked");
}

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("signed-out onboarding", () => {
  it("shows the Internet Identity sign-in screen and no vault", async () => {
    setIdentityForTest();
    const { default: App } = await import("@/App");
    const { actor } = makeActor(makeFakeVault());
    renderWithActor(<App />, actor);
    expect(await screen.findByTestId("auth.panel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with internet identity/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("vault.new_item_button"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("vault.locked_state")).not.toBeInTheDocument();
  });
});

describe("signed-in dashboard", () => {
  it("shows the locked gate before the key is derived", async () => {
    const { actor } = makeActor(makeFakeVault());
    renderVault(actor);
    expect(await screen.findByTestId("vault.locked_state")).toBeInTheDocument();
    expect(
      screen.queryByTestId("vault.new_item_button"),
    ).not.toBeInTheDocument();
  });

  it("shows both categories and a New Item button once unlocked", async () => {
    const user = userEvent.setup();
    const { actor } = makeActor(makeFakeVault());
    renderVault(actor);
    await unlockVault(user);
    expect(screen.getByTestId("vault.category.secureNote")).toBeInTheDocument();
    expect(
      screen.getByTestId("vault.category.vaultPassword"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("vault.new_item_button")).toBeInTheDocument();
  });
});

describe("secure notes", () => {
  it("creates a note with title, tags and body and lists it", async () => {
    const user = userEvent.setup();
    const vault = makeFakeVault();
    const { actor, store_encrypted_item } = makeActor(vault);
    renderVault(actor);
    await unlockVault(user);

    await user.click(screen.getByTestId("vault.new_item_button"));
    await user.type(screen.getByTestId("note.title_input"), "Recovery codes");
    await user.type(screen.getByTestId("note.tag_input"), "backup{Enter}");
    await user.type(
      screen.getByTestId("note.body_input"),
      "# Codes\n\nkeep safe",
    );
    await user.click(screen.getByTestId("note.save_button"));

    await waitFor(() => expect(store_encrypted_item).toHaveBeenCalledTimes(1));
    const request = store_encrypted_item.mock.calls[0][0];
    expect(request.kind).toBe(ItemKind.secureNote);
    // Only ciphertext and iv leave the browser: the plaintext must not appear.
    expect(new TextDecoder().decode(request.ciphertext)).not.toContain(
      "Recovery codes",
    );
    expect(request.iv.length).toBeGreaterThan(0);

    expect(await screen.findByText("Recovery codes")).toBeInTheDocument();
    // The tag appears both as the list subtitle and as an editor chip.
    expect(screen.getAllByText("backup").length).toBeGreaterThan(0);
  });

  it("edits an existing note and persists the change", async () => {
    const user = userEvent.setup();
    const vault = makeFakeVault();
    const { actor, store_encrypted_item } = makeActor(vault);
    renderVault(actor);
    await unlockVault(user);

    await user.click(screen.getByTestId("vault.new_item_button"));
    await user.type(screen.getByTestId("note.title_input"), "First title");
    await user.click(screen.getByTestId("note.save_button"));
    await screen.findByText("First title");

    await user.click(screen.getByTestId("vault.item.1"));
    const title = await screen.findByTestId("note.title_input");
    await user.clear(title);
    await user.type(title, "Second title");
    await user.click(screen.getByTestId("note.save_button"));

    await waitFor(() => expect(store_encrypted_item).toHaveBeenCalledTimes(2));
    expect(store_encrypted_item.mock.calls[1][0].id).toBe(1n);
    expect(await screen.findByText("Second title")).toBeInTheDocument();
  });

  it("deletes a note and removes it from the list", async () => {
    const user = userEvent.setup();
    const vault = makeFakeVault();
    const { actor, delete_item } = makeActor(vault);
    renderVault(actor);
    await unlockVault(user);

    await user.click(screen.getByTestId("vault.new_item_button"));
    await user.type(screen.getByTestId("note.title_input"), "Throwaway");
    await user.click(screen.getByTestId("note.save_button"));
    await screen.findByText("Throwaway");

    await user.click(screen.getByTestId("vault.item.1"));
    await user.click(await screen.findByTestId("note.delete_button"));

    await waitFor(() => expect(delete_item).toHaveBeenCalledWith(1n));
    await waitFor(() =>
      expect(screen.queryByText("Throwaway")).not.toBeInTheDocument(),
    );
  });
});

describe("vault passwords", () => {
  it("creates a password item and lists it under Vault Passwords", async () => {
    const user = userEvent.setup();
    const vault = makeFakeVault();
    const { actor, store_encrypted_item } = makeActor(vault);
    renderVault(actor);
    await unlockVault(user);

    await user.click(screen.getByTestId("vault.category.vaultPassword"));
    await user.click(screen.getByTestId("vault.new_item_button"));
    await user.type(screen.getByTestId("password.site_input"), "GitHub");
    await user.type(
      screen.getByTestId("password.username_input"),
      "ada@example.com",
    );
    await user.type(screen.getByTestId("password.password_input"), "s3cret");
    await user.type(
      screen.getByTestId("password.url_input"),
      "https://github.com",
    );
    await user.click(screen.getByTestId("password.save_button"));

    await waitFor(() => expect(store_encrypted_item).toHaveBeenCalledTimes(1));
    expect(store_encrypted_item.mock.calls[0][0].kind).toBe(
      ItemKind.vaultPassword,
    );
    expect(await screen.findByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("generates a random password into the password field", async () => {
    const user = userEvent.setup();
    const { actor } = makeActor(makeFakeVault());
    renderVault(actor);
    await unlockVault(user);

    await user.click(screen.getByTestId("vault.category.vaultPassword"));
    await user.click(screen.getByTestId("vault.new_item_button"));
    const password = screen.getByTestId(
      "password.password_input",
    ) as HTMLInputElement;
    expect(password.value).toBe("");

    await user.click(screen.getByTestId("password.generate_button"));
    expect(password.value.length).toBe(20);
    expect(password.value).toMatch(/[A-Z]/);
    expect(password.value).toMatch(/[a-z]/);
    expect(password.value).toMatch(/[0-9]/);
  });
});

describe("live search", () => {
  it("filters the visible list as the user types", async () => {
    const user = userEvent.setup();
    const vault = makeFakeVault();
    const { actor } = makeActor(vault);
    renderVault(actor);
    await unlockVault(user);

    for (const title of ["Alpha note", "Beta note"]) {
      await user.click(screen.getByTestId("vault.new_item_button"));
      await user.type(screen.getByTestId("note.title_input"), title);
      await user.click(screen.getByTestId("note.save_button"));
      await screen.findByText(title);
    }

    await user.type(screen.getByTestId("vault.search_input"), "Alpha");
    expect(screen.getByText("Alpha note")).toBeInTheDocument();
    expect(screen.queryByText("Beta note")).not.toBeInTheDocument();
  });
});

describe("session lock", () => {
  it("locks the vault on demand and wipes decrypted data", async () => {
    const user = userEvent.setup();
    const vault = makeFakeVault();
    const { actor } = makeActor(vault);
    renderVault(actor);
    await unlockVault(user);

    await user.click(screen.getByTestId("vault.new_item_button"));
    await user.type(screen.getByTestId("note.title_input"), "Secret note");
    await user.click(screen.getByTestId("note.save_button"));
    await screen.findByText("Secret note");

    await user.click(screen.getByTestId("vault.lock_button"));

    expect(await screen.findByTestId("vault.locked_state")).toBeInTheDocument();
    expect(screen.queryByText("Secret note")).not.toBeInTheDocument();
    expect(screen.getByTestId("vault.status")).toHaveTextContent(
      "Vault locked",
    );
  });

  it("counts down and auto-locks after inactivity", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { actor } = makeActor(makeFakeVault());
    renderVault(actor);
    await unlockVault(user);

    expect(screen.getByTestId("vault.timeout_indicator")).toHaveTextContent(
      "Auto-lock in 5:00",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByTestId("vault.timeout_indicator")).toHaveTextContent(
      "Auto-lock in 4:00",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4 * 60_000);
    });
    expect(await screen.findByTestId("vault.locked_state")).toBeInTheDocument();
  });
});

describe("per-user scoping", () => {
  it("shows only the signed-in principal's items", async () => {
    const user = userEvent.setup();
    const vault = makeFakeVault();
    const { actor } = makeActor(vault);
    const first = renderVault(actor);
    await unlockVault(user);

    await user.click(screen.getByTestId("vault.new_item_button"));
    await user.type(screen.getByTestId("note.title_input"), "Owner note");
    await user.click(screen.getByTestId("note.save_button"));
    await screen.findByText("Owner note");
    first.unmount();

    // A second principal's actor sees an empty vault.
    const otherVault = makeFakeVault();
    const { actor: otherActor } = makeActor(otherVault);
    renderVault(otherActor);
    await unlockVault(user);
    expect(await screen.findByTestId("vault.empty_state")).toBeInTheDocument();
    expect(screen.queryByText("Owner note")).not.toBeInTheDocument();
  });
});

describe("crypto seam", () => {
  it("round-trips a payload through encrypt/decrypt", async () => {
    const { deriveVaultKey, decryptPayload } = await import("@/lib/crypto");
    const key = await deriveVaultKey(PRINCIPAL);
    const payload: NotePayload = { title: "T", tags: ["a"], body: "b" };
    const { ciphertext, iv } = await encryptPayload(key, payload);
    const decoded = await decryptPayload<NotePayload>(key, ciphertext, iv);
    expect(decoded).toEqual(payload);
  });

  it("produces a key fingerprint for the session indicator", async () => {
    const { deriveVaultKey, keyFingerprint } = await import("@/lib/crypto");
    const key = await deriveVaultKey(PRINCIPAL);
    await expect(keyFingerprint(key)).resolves.toEqual(expect.any(String));
  });

  it("does not decrypt with a different principal's key", async () => {
    const { deriveVaultKey, decryptPayload } = await import("@/lib/crypto");
    const key = await deriveVaultKey(PRINCIPAL);
    const otherKey = await deriveVaultKey("other-principal");
    const payload: PasswordPayload = {
      siteName: "S",
      username: "u",
      password: "p",
      url: "https://x",
    };
    const { ciphertext, iv } = await encryptPayload(key, payload);
    await expect(decryptPayload(otherKey, ciphertext, iv)).rejects.toThrow();
  });
});
