import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Cell {
    value: Value;
    name: string;
}
export interface EncryptedItem {
    id: ItemId;
    iv: Uint8Array;
    ciphertext: Uint8Array;
    kind: ItemKind;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type ItemId = bigint;
export interface ItemSummary {
    id: ItemId;
    kind: ItemKind;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export type Result = {
    __kind__: "ok";
    ok: ItemId;
} | {
    __kind__: "err";
    err: VaultError;
};
export type Result_1 = {
    __kind__: "ok";
    ok: EncryptedItem;
} | {
    __kind__: "err";
    err: VaultError;
};
export type Result_2 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: VaultError;
};
export type Result_3 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface StoreItemRequest {
    id?: ItemId;
    iv: Uint8Array;
    ciphertext: Uint8Array;
    kind: ItemKind;
}
export type Timestamp = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export type VaultError = {
    __kind__: "notAuthorized";
    notAuthorized: null;
} | {
    __kind__: "notFound";
    notFound: ItemId;
};
export enum ItemKind {
    secureNote = "secureNote",
    vaultPassword = "vaultPassword"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Delete one of the caller's items.
     */
    delete_item(id: ItemId): Promise<Result_2>;
    execute(qJson: string): Promise<Result__1>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Read one of the caller's items, including ciphertext and iv.
     */
    get_encrypted_item(id: ItemId): Promise<Result_1>;
    /**
     * / List the caller's items as non-secret summaries.
     */
    get_encrypted_items(): Promise<Array<ItemSummary>>;
    isCallerAdmin(): Promise<boolean>;
    schema(): Promise<string>;
    /**
     * / Create or update an encrypted item owned by the caller.
     */
    store_encrypted_item(request: StoreItemRequest): Promise<Result>;
}
