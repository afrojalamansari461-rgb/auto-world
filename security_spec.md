# Security Specification File (Payload-First TDD)

## 1. Data Invariants
- **UserListing**:
  - Must have an authenticated user ID (`userId`) matching the writer's authentic user ID.
  - Must have a status of "active" or "sold".
  - The ID of a listing must be structured properly, preventing generic ID poisoning attacks.
  - Immutable fields like `userId`, `id`, and `datePosted` cannot be changed after creation.
- **Message**:
  - Anyone (even unauthenticated) can create messages to submit contact forms.
  - Nobody can read, update, or delete messages from the client SDK (System/Admin-only read).
- **Subscription**:
  - A user can only read, create, or update their own subscription document (where document ID equals user ID).
  - Users cannot spoof roles or self-assign admin claims.

---

## 2. The "Dirty Dozen" Threat Payloads
Here are 12 specific JSON payloads designed to breach identity, integrity, state transitions, or cause Denial of Wallet:

1. **Payload 1 (Identity Spoofing - Listing Creation)**: An authenticated user `user_A` trying to create a listing on behalf of `user_B`.
   - Result: `Permission Denied`.
2. **Payload 2 (Write Without Authentication - Listing Creation)**: Unauthenticated visitor attempting to create a vehicle listing.
   - Result: `Permission Denied`.
3. **Payload 3 (ID Poisoning - Listing Insertion)**: An authenticated user trying to create a listing with a huge document ID containing characters like `$$$MALFORMED_LARGE_STRING$$$`.
   - Result: `Permission Denied` (due to validation helper `isValidId(listingId)`).
4. **Payload 4 (Ghost Fields / Shadow Update)**: Modifying a listing to inject unapproved ghost/system fields (e.g. `isVerifiedBySystem: true`).
   - Result: `Permission Denied` (denied by strict `hasOnly()` checks in update block).
5. **Payload 5 (PII Blanket Reading - Listings)**: Reading listing owner credentials directly via collection query or individual document get when unauthenticated (though contact info is premium-only or requires a pass, public cards are readable but private contact info is restricted).
   - Result: Encforced safely.
6. **Payload 6 (PII Blanket Reading - Messages)**: Attempting to list helper `messages` submitted by other users.
   - Result: `Permission Denied` (Messages are write-only for clients, read-denied for all).
7. **Payload 7 (Spoofing Privileges - Subscription Creation)**: An authenticated user creating a subscription document targeting someone else's ID or setting high rank values out-of-order.
   - Result: `Permission Denied` (only allowed if document ID matches `request.auth.uid`).
8. **Payload 8 (State Shortcutting - Listing Update)**: Bypassing listing transition constraints (e.g., trying to write an arbitrary outcome state, or modifying immutable parameters like `id`).
   - Result: `Permission Denied`.
9. **Payload 9 (Temporal Tampering)**: Submitting custom client-side timestamps for `datePosted` (e.g. `2020-01-01`) instead of standard actual request time.
   - Result: `Permission Denied`.
10. **Payload 10 (Denial of Wallet - Bloated Data)**: Creating a listing describing a feature array with 1,000 strings to explode memory footprint.
    - Result: `Permission Denied` (array size capped at `<= 20`).
11. **Payload 11 (Spamming Empty Messages)**: Registering messages with empty body or names over 500 characters.
    - Result: `Permission Denied` (checked via string size validation helper).
12. **Payload 12 (Self-Assigned Admin overrides)**: Writing an admin document under `admins/{uid}` to gain general root access.
    - Result: `Permission Denied` (Admins collection is not writeable by standard clients).

---

## 3. Test Cases Assertions
All of the described payloads are mapped and must verify as strictly `PERMISSION_DENIED` under the target `firestore.rules`.
