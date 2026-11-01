import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  public type OldActor = {};

  public type VaultState = Map.Map<Principal, Map.Map<Nat, EncryptedItem>>;
  public type IdState = { var nextId : Nat };
  public type EncryptedItem = {
    id : Nat;
    kind : ItemKind;
    ciphertext : Blob;
    iv : Blob;
    createdAt : Int;
    updatedAt : Int;
  };
  public type ItemKind = { #secureNote; #vaultPassword };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    vault : VaultState;
    ids : IdState;
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      vault = Map.empty();
      ids = { var nextId = 0 };
    };
  };
};
