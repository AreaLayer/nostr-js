
const test = require('tape')
const {RelayPool, calculateId, createDelegation, createDelegationEvent} = require('../')

const jb55 = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"
const damus = "wss://relay.damus.io"
const scsi = "wss://nostr-pub.wellorder.net"
const relays = [damus, scsi]

const PRIVKEY = "81cbdb9c82bcb6067ca96ca0e754bb3d3efd1b813281010e392256c642de1064"
const PUBKEY = "8a5a685420091ae0abef79be1735921b6bab047cc5b2aaefb8f8902dedf117f5"

function create_test_event() {
	const created_at = 0
	const kind = 1
	const content = "hi"
	const tags = []

	return {pubkey: PUBKEY, created_at, kind, content, tags}
}

test('create delegate event', async function (t) {
	const publisher_privkey = "d78578125f35cfc39fab89427d4086be1f0db939c393efd311631776a8e5d9ca"
	const publisher_pubkey = "575d3b6f59dcb0595b127d210c1664ed465f819966b70c937cac7a6e91c3f7d0"

	const conditions = "created_at<1669341617&kind=1"
	const delegation = await createDelegation(PRIVKEY, PUBKEY, publisher_pubkey, conditions)
	const ev = create_test_event()
	const delegate_ev = await createDelegationEvent(publisher_privkey, ev, delegation)

	t.equal(delegate_ev.pubkey, delegation.publisherPubkey)
})

test('calculate event id', async function (t) {
	t.plan(1)

	const ev = create_test_event()
	const id = await calculateId(ev)

	t.equal(id, "c690044fedd4fb2a7a3c4757f9deb1be4893e81605a5ae9c04f99a189c2810dd");
})

test('connect to multiple works', function (t) {
	t.plan(2)

	const pool = RelayPool(relays)

	pool.on('open', relay => {
		t.equal(true, relay.url === damus || relay.url === scsi, `connected to ${relay.url}`)

		relay.close()
	});
});

test('querying multiple works', function (t) {
	let per_relay = 2
	let expected = per_relay * relays.length

	t.plan(expected)

	let n = 0
	const pool = RelayPool(relays)

	pool.on('open', relay => {
		relay.subscribe("subid", {limit: per_relay, kinds:[1], authors: [jb55]})
	});

	pool.on('eose', relay => {
		relay.close()
	});

	pool.on('event', (relay, sub_id, ev) => {
		t.equal("subid", sub_id, `got event ${++n}/${expected} from ${relay.url}`)
	});
});

