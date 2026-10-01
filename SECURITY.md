# Rules deployment and invitations

Deploy `firestore.rules` and the matching frontend together. `firebase.json` now declares the rules file. Run `npm run test:rules` against the isolated demo project before deployment; the tests do not contact the production database.

Group creators may edit metadata and remove members, but cannot remove themselves or silently add members. A pending invitee can only add their own UID while atomically changing that invitation to accepted. Accepted/denied invitations cannot be reused. Group creation includes only the creator.

Private `users` documents are readable only by their owner. Email search is retired. Invitations now use the member ID displayed in the account area. Signing in publishes a minimal `publicProfiles/{uid}` containing only UID and display name; direct ID lookup is allowed to signed-in users, but listing the directory is denied. Existing users must sign in again before they can be invited by ID. Existing invitations still work without exposing private user records.
