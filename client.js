const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const Chunkstore = require('./chunkstore');
const msgpack = require('msgpack5-stream');
const replacementHasher = require('./hasher')
const DC = require('discovery-channel');
const channel = DC({dht: false});

const channelId = process.argv[2];

console.log('Joining channel %s', channelId);

channel.join(channelId);
channel.once('peer', (id, peer) => {
  console.log('Found a peer', peer);

  let hashes;
  let store;

  const client = net.connect(peer.port, peer.host);
  const protocol = msgpack(client);

  const initializeTransfer = (msg) => {
    console.log('👍 Hashes are valid, initializing transfer', msg);
    hashes = msg.hashes;
    const filename = msg.filename || `output-${Date.now().toString().substring(8)}.stuff`;

    console.log('Initializing store with chunk size %s and file size %s', msg.chunkSize, msg.fileSize);
    store = new Chunkstore(msg.chunkSize, filename, msg.fileSize);
    store.on('completed', () => { onTransferComplete(filename); });
    const expectedChunks = Math.ceil(msg.fileSize / msg.chunkSize);
    console.log('Requesting chunks...')
    const dispatcher = (from, to) => {
      while (from < to && from < expectedChunks) {
        const request = { type: 'request', index: from }
        console.log(request)
        protocol.write(request)
        from++
      }
      if (from < expectedChunks) {
        setImmediate(() => {
          dispatcher(to, to + 500)
        })
      }
    }
    dispatcher(0, 500)
  }

  const onTransferComplete = (filename) => {
    console.log('Transfer complete, written to %s', filename);
    protocol.destroy();
    channel.destroy();
  }

  protocol.on('data', (msg) => {
    if (!msg) return;

    switch(msg.type) {
      case 'error': {
        console.log('Peer returned an error: %s', msg.description);
        protocol.destroy();
        channel.destroy();
        break;
      }
      case 'handshake': {
        console.log('Handshake response');
        replacementHasher.equalsHashOfHashes(channelId, msg.hashes).then(
          () => {
            initializeTransfer(msg);
          },
          console.log
        )
        break;
      }
      case 'response': {
        const data = msg.data;
        replacementHasher.equals(hashes[msg.index], data).then(
          () => {
            console.log('got chunk')
            store.put(msg.index, data, (err) => {
              if (err) throw err;
            });
          },
          () => {
            throw new Error('Hash mismatch for chunk %s', msg.index);
          }
        );
      }
    };
  });

  const handshakeRequest = { type: 'handshake' };
  protocol.write(handshakeRequest);
});
