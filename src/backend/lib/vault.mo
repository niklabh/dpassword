import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/vault";

module {
  /// Per-owner vault storage: owner principal -> item id -> encrypted item.
  public type VaultState = Map.Map<Principal, Map.Map<Common.ItemId, Types.EncryptedItem>>;

  /// Monotonic id source shared across all owners.
  public type IdState = { var nextId : Common.ItemId };

  /// The caller's own item map, created on first use.
  func ownerItems(vault : VaultState, owner : Principal) : Map.Map<Common.ItemId, Types.EncryptedItem> {
    switch (vault.get(owner)) {
      case (?items) { items };
      case null {
        let items = Map.empty<Common.ItemId, Types.EncryptedItem>();
        vault.add(owner, items);
        items;
      };
    };
  };

  func toSummary(item : Types.EncryptedItem) : Types.ItemSummary {
    {
      id = item.id;
      kind = item.kind;
      createdAt = item.createdAt;
      updatedAt = item.updatedAt;
    };
  };

  /// Create a new item for `owner` when `request.id` is null, or update the
  /// caller's existing item when an id is supplied. Returns the item id.
  public func storeItem(
    vault : VaultState,
    ids : IdState,
    owner : Principal,
    request : Types.StoreItemRequest,
  ) : Result.Result<Common.ItemId, Types.VaultError> {
    let items = ownerItems(vault, owner);
    let now = Time.now();
    switch (request.id) {
      case null {
        let id = ids.nextId;
        ids.nextId := id + 1;
        let item : Types.EncryptedItem = {
          id;
          kind = request.kind;
          ciphertext = request.ciphertext;
          iv = request.iv;
          createdAt = now;
          updatedAt = now;
        };
        items.add(id, item);
        #ok(id);
      };
      case (?id) {
        switch (items.get(id)) {
          case null { #err(#notFound(id)) };
          case (?existing) {
            let updated : Types.EncryptedItem = {
              id;
              kind = request.kind;
              ciphertext = request.ciphertext;
              iv = request.iv;
              createdAt = existing.createdAt;
              updatedAt = now;
            };
            items.add(id, updated);
            #ok(id);
          };
        };
      };
    };
  };

  /// List the caller's items as non-secret summaries, newest first.
  public func listItems(vault : VaultState, owner : Principal) : [Types.ItemSummary] {
    let items = switch (vault.get(owner)) {
      case (?items) { items };
      case null { return [] };
    };
    let summaries = items.values().map(toSummary).toArray();
    summaries.sort(func (a, b) = if (a.updatedAt > b.updatedAt) { #less } else if (a.updatedAt < b.updatedAt) { #greater } else { #equal });
  };

  /// Read one of the caller's items, including its ciphertext and iv.
  public func getItem(
    vault : VaultState,
    owner : Principal,
    id : Common.ItemId,
  ) : Result.Result<Types.EncryptedItem, Types.VaultError> {
    switch (vault.get(owner)) {
      case null { #err(#notFound(id)) };
      case (?items) {
        switch (items.get(id)) {
          case null { #err(#notFound(id)) };
          case (?item) { #ok(item) };
        };
      };
    };
  };

  /// Delete one of the caller's items.
  public func deleteItem(
    vault : VaultState,
    owner : Principal,
    id : Common.ItemId,
  ) : Result.Result<(), Types.VaultError> {
    switch (vault.get(owner)) {
      case null { #err(#notFound(id)) };
      case (?items) {
        switch (items.get(id)) {
          case null { #err(#notFound(id)) };
          case (?_) {
            items.remove(id);
            #ok(());
          };
        };
      };
    };
  };
};
