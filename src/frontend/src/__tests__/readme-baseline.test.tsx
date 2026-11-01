import type { backendInterface } from "@/backend";
import { Layout } from "@/components/Layout";
import { VaultSessionProvider } from "@/hooks/useVaultSession";
import VaultWorkspace from "@/pages/VaultWorkspace";
import type { InternetIdentityContext } from "@caffeineai/core-infrastructure";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setIdentityForTest } from "./setup";
import { renderWithActor } from "./test-utils";

/**
 * Characterization baseline for the app identity and navigation the README
 * documents. The README addition is documentation-only, so these journeys must
 * keep working unchanged.
 */

const PRINCIPAL = "2vxsx-fae";

function signedInIdentity(): InternetIdentityContext["identity"] {
  return {
    getPrincipal: () => ({
      isAnonymous: () => false,
      toText: () => PRINCIPAL,
    }),
  } as unknown as InternetIdentityContext["identity"];
}

/** A minimal typed actor: the empty vault only needs the list read. */
function makeEmptyActor() {
  const get_encrypted_items = vi.fn<backendInterface["get_encrypted_items"]>(
    async () => [],
  );
  const actor = { get_encrypted_items } satisfies Pick<
    backendInterface,
    "get_encrypted_items"
  >;
  return { actor, get_encrypted_items };
}

function renderVault(actor: ReturnType<typeof makeEmptyActor>["actor"]) {
  return renderWithActor(
    <VaultSessionProvider>
      <Layout>
        <VaultWorkspace />
      </Layout>
    </VaultSessionProvider>,
    actor,
  );
}

async function unlockVault(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId("vault.unlock_button"));
  await screen.findByText("Vault unlocked");
}

beforeEach(() => {
  setIdentityForTest({ identity: signedInIdentity() });
});

describe("documented app identity", () => {
  it("presents the dPassword brand and sign-in copy before authentication", async () => {
    setIdentityForTest();
    const { default: App } = await import("@/App");
    const { actor } = makeEmptyActor();
    renderWithActor(<App />, actor);

    expect(await screen.findByTestId("auth.panel")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "dPassword" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/zero-knowledge vault/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with internet identity/i }),
    ).toBeInTheDocument();
  });
});

describe("documented navigation baseline", () => {
  it("shows the sidebar brand, both categories, and the New Item action once unlocked", async () => {
    const user = userEvent.setup();
    const { actor } = makeEmptyActor();
    renderVault(actor);
    await unlockVault(user);

    expect(screen.getByText("dPassword")).toBeInTheDocument();
    expect(screen.getByTestId("vault.category.secureNote")).toHaveTextContent(
      "Secure Notes",
    );
    expect(
      screen.getByTestId("vault.category.vaultPassword"),
    ).toHaveTextContent("Vault Passwords");
    expect(screen.getByTestId("vault.new_item_button")).toHaveTextContent(
      "New Item",
    );
    expect(screen.getByTestId("vault.search_input")).toBeInTheDocument();
  });

  it("switches the active category and shows its empty state", async () => {
    const user = userEvent.setup();
    const { actor } = makeEmptyActor();
    renderVault(actor);
    await unlockVault(user);

    // Secure Notes is the default category and starts empty.
    expect(await screen.findByTestId("vault.empty_state")).toBeInTheDocument();
    expect(screen.getByText(/no secure notes yet/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("vault.category.vaultPassword"));
    expect(screen.getByText(/no vault passwords yet/i)).toBeInTheDocument();
    expect(screen.getByTestId("vault.category.vaultPassword")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
