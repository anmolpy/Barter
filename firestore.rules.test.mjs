import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, writeBatch, arrayUnion, Timestamp } from 'firebase/firestore';
let env;
const group = { name: 'Trip', members: ['owner', 'member'], createdBy: 'owner', createdAt: Timestamp.now() };
const invitation = { groupId: 'trip', invitedUid: 'guest', senderUid: 'owner', status: 'pending' };
const db = uid => env.authenticatedContext(uid).firestore();
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-barter-security', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'groups/trip'), group);
    await setDoc(doc(ctx.firestore(), 'invitations/trip_guest'), invitation);
    await setDoc(doc(ctx.firestore(), 'users/owner'), { uid: 'owner', email: 'owner@example.test' });
    await setDoc(doc(ctx.firestore(), 'publicProfiles/owner'), { uid: 'owner', displayName: 'Owner' });
  });
});
test('invitee cannot edit group metadata or join without consuming invitation', async () => {
  await assertFails(updateDoc(doc(db('guest'), 'groups/trip'), { name: 'Taken over' }));
  await assertFails(updateDoc(doc(db('guest'), 'groups/trip'), { members: arrayUnion('guest') }));
});
test('atomic acceptance adds only the invited member', async () => {
  const client = db('guest'); const batch = writeBatch(client);
  batch.update(doc(client, 'groups/trip'), { members: arrayUnion('guest') });
  batch.update(doc(client, 'invitations/trip_guest'), { status: 'accepted' });
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(doc(client, 'groups/trip'), { members: arrayUnion('intruder') }));
});
test('invitee cannot remove members, add a third party, or change metadata in the batch', async () => {
  for (const change of [{ members: ['guest'] }, { members: ['owner', 'member', 'guest', 'intruder'] }, { members: ['owner', 'member', 'guest'], name: 'Bad' }]) {
    const client = db('guest'); const batch = writeBatch(client);
    batch.update(doc(client, 'groups/trip'), change);
    batch.update(doc(client, 'invitations/trip_guest'), { status: 'accepted' });
    await assertFails(batch.commit());
  }
});
test('accepted and denied invitations cannot grant membership', async () => {
  for (const status of ['accepted', 'denied']) {
    await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'invitations/trip_guest'), { status }));
    await assertFails(updateDoc(doc(db('guest'), 'groups/trip'), { members: arrayUnion('guest') }));
  }
});
test('only owner may edit metadata; owner cannot remove self or silently add users', async () => {
  await assertFails(updateDoc(doc(db('member'), 'groups/trip'), { name: 'Bad' }));
  await assertSucceeds(updateDoc(doc(db('owner'), 'groups/trip'), { name: 'Holiday' }));
  await assertFails(updateDoc(doc(db('owner'), 'groups/trip'), { members: ['member'] }));
  await assertFails(updateDoc(doc(db('owner'), 'groups/trip'), { members: arrayUnion('other') }));
});
test('private emails and profile enumeration are denied; exact public ID lookup works', async () => {
  await assertFails(getDoc(doc(db('guest'), 'users/owner')));
  await assertFails(getDocs(collection(db('guest'), 'users')));
  await assertSucceeds(getDoc(doc(db('owner'), 'users/owner')));
  await assertSucceeds(getDoc(doc(db('guest'), 'publicProfiles/owner')));
  await assertFails(getDocs(collection(db('guest'), 'publicProfiles')));
  await assertFails(setDoc(doc(db('guest'), 'publicProfiles/guest'), { uid: 'guest', displayName: 'Guest', email: 'private@example.test' }));
});
