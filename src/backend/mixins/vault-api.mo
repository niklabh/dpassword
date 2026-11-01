import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import VaultLib "../lib/vault";
import Common "../types/common";
import Types "../types/vault";

mixin (
  accessControlState : AccessControl.AccessControlState,
  vault : VaultLib.VaultState,
  ids : VaultLib.IdState,
) {
  /// Reject anonymous callers and require a registered principal: the vault
  /// is only reachable by a signed-in caller, and every operation is scoped
  /// to that principal. `getUserRole` traps for an unregistered caller.
  func requireSignedIn(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Vault: sign in required");
    };
    ignore AccessControl.getUserRole(accessControlState, caller);
  };

  /// Create or update an encrypted item owned by the caller.
  public shared ({ caller }) func store_encrypted_item(
    request : Types.StoreItemRequest,
  ) : async Result.Result<Common.ItemId, Types.VaultError> {
    requireSignedIn(caller);
    VaultLib.storeItem(vault, ids, caller, request);
  };

  /// List the caller's items as non-secret summaries.
  public query ({ caller }) func get_encrypted_items() : async [Types.ItemSummary] {
    requireSignedIn(caller);
    VaultLib.listItems(vault, caller);
  };

  /// Read one of the caller's items, including ciphertext and iv.
  public query ({ caller }) func get_encrypted_item(
    id : Common.ItemId,
  ) : async Result.Result<Types.EncryptedItem, Types.VaultError> {
    requireSignedIn(caller);
    VaultLib.getItem(vault, caller, id);
  };

  /// Delete one of the caller's items.
  public shared ({ caller }) func delete_item(
    id : Common.ItemId,
  ) : async Result.Result<(), Types.VaultError> {
    requireSignedIn(caller);
    VaultLib.deleteItem(vault, caller, id);
  };
};
