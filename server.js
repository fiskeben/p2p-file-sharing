const net = require('net');
const fs = require('fs');
const hasher = require('./hasher')
const msgpack = require('msgpack5-stream');
const fsChunkStore = require('fs-chunk-store');
const DC = require('discovery-channel');
const channel = DC({dht: false});

const filename = process.argv[2];

const CHUNK_SIZE = 1024 // Arbitrary chunk size that fits in memory (not too big, not too small)
const FILE_LENGTH = fs.statSync(filename).size
const file = fsChunkStore(CHUNK_SIZE, {path: filename, length: FILE_LENGTH});

const formatResponse = (index, chunk) => {
  if (chunk) {
    return {
      type: 'response',
      index: index,
      data: chunk
    };
  }
  return {
    type: 'error',
    index: index,
    description: 'not found'
  };
}

const filenameFromPotentialPath = (potentialPath) => {
  const parts = potentialPath.split('/');
  if (parts.length > 0) {
    return parts[parts.length - 1];
  }
}

const chunkHandlerForIndexAndProtocol = (index, protocol) => {
  return (err, foundChunk) => {
    const response = formatResponse(index, foundChunk);
    protocol.write(response);
  }
};

const handshakeHandlerForProtocol = (protocol) => {
  return (hashes) => {
    const response = {
      type: 'handshake',
      hashes,
      filename: filenameFromPotentialPath(filename),
      fileSize: FILE_LENGTH,
      chunkSize: CHUNK_SIZE
    };
    protocol.write(response);
  }
};

const handlerForProtocol = (protocol) => {
  return (msg) => {
    if (!msg) throw new Error('Message is null');
    switch(msg.type) {
      case 'handshake': {
        const handler = handshakeHandlerForProtocol(protocol);
        hasher.asChunksOfFile(filename, CHUNK_SIZE).then(handler);
        break;
      }
      case 'request': {
        const index = msg.index;
        console.log('Peer requested chunk %d', index);
        file.get(index, chunkHandlerForIndexAndProtocol(index, protocol));
        break;
      }
    }
  }
}

const server = net.createServer((socket) => {
  console.log('New peer connected: %s:%s', socket.remoteAddress, socket.remotePort);

  const protocol = msgpack(socket);
  protocol.on('data', handlerForProtocol(protocol));
});

server.listen(3000, () => {
  hasher.asChunksOfFile(filename, CHUNK_SIZE).then(hasher.ofChunkHashes).then(
    (id) => {
      channel.join(id, 3000);
      console.log(`ready, broadcasting to ${id}`);
    }
  );
});
