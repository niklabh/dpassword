import Common "../types/common";

module {
  /// The two kinds of vault item the app stores.
  public type ItemKind = {
    #secureNote;
    #vaultPassword;
  };

  /// A stored vault item. Only opaque ciphertext and its initialization
  /// vector are persisted; no plaintext field ever crosses this boundary.
  public type EncryptedItem = {
    id : Common.ItemId;
    kind : ItemKind;
    ciphertext : Blob;
    iv : Blob;
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
  };

  /// A list row: non-secret metadata only, no payload bytes.
  public type ItemSummary = {
    id : Common.ItemId;
    kind : ItemKind;
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
  };

  /// Input for creating or updating an item. A `null` id creates a new item;
  /// a supplied id updates the caller's existing item.
  public type StoreItemRequest = {
    id : ?Common.ItemId;
    kind : ItemKind;
    ciphertext : Blob;
    iv : Blob;
  };

  /// Errors a vault operation can report to the caller.
  public type VaultError = {
    #notFound : Common.ItemId;
    #notAuthorized;
  };
};
