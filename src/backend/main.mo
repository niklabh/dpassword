import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import BlobValue "mo:caffeineai-oql/BlobValue";
import IntValue "mo:caffeineai-oql/IntValue";
import NatValue "mo:caffeineai-oql/NatValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import TextValue "mo:caffeineai-oql/TextValue";
import VaultLib "lib/vault";
import VaultApi "mixins/vault-api";
import ApiDocMixin "mixins/api-doc";
import Types "types/vault";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let vault : VaultLib.VaultState;
  let ids : VaultLib.IdState;

  include VaultApi(accessControlState, vault, ids);

  // A row of the vault entity: the stored item plus the owning principal
  // promoted from the outer map key.
  type VaultRow = { owner : Principal; item : Types.EncryptedItem };

  // Every owner's items, flattened into rows. The entity's `.ownedBy("owner")`
  // scoping filters this to the caller's own rows.
  func vaultRows() : Iter.Iter<VaultRow> {
    vault.entries().flatMap(func ((owner, items)) : Iter.Iter<VaultRow> =
      items.values().map(func (item) : VaultRow = { owner; item }));
  };

  transient let sampleOwner = Principal.fromText("aaaaa-aa");
  transient let sampleItem : Types.EncryptedItem = {
    id = 0;
    kind = #secureNote;
    ciphertext = "";
    iv = "";
    createdAt = 0;
    updatedAt = 0;
  };

  include Expose({
    entities = [
      Entity.manual<VaultRow>(
        "vaultItem",
        vaultRows,
        "VaultItem",
        "id",
      )
        .sample({ owner = sampleOwner; item = sampleItem })
        .payload("id", func (r) = r.item.id)
        .payload("owner", func (r) = r.owner)
        .payload("kind", func (r) = switch (r.item.kind) { case (#secureNote) "secureNote"; case (#vaultPassword) "vaultPassword" })
        .payload("ciphertext", func (r) = r.item.ciphertext)
        .payload("iv", func (r) = r.item.iv)
        .payload("createdAt", func (r) = r.item.createdAt)
        .payload("updatedAt", func (r) = r.item.updatedAt)
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
    ];
  });

  include ApiDocMixin();
};
