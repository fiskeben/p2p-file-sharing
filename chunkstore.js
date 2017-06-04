const EventEmitter = require('events');
const fs = require('fs')
const fsChunkStore = require('fs-chunk-store');
const hasher = require('fixed-size-chunk-hashing')

const hashList = (listOfHashes) => {
  return crypto.createHash('sha256')
    .update(listOfHashes.join("\n"))
    .digest()
    .toString('hex');
}

class Chunkstore extends EventEmitter {
  constructor(chunkSize, filename, fileSize) {
    super();
    this.filename = filename
    this.store = fsChunkStore(chunkSize, {
      path: filename,
      length: fileSize
    });
    this.expectedChunks = Math.ceil(fileSize / chunkSize);
    this.receivedChunks = 0;

    const onReceiveHandler = this.onReceive.bind(this);
    this.on('receive', onReceiveHandler);
  }

  onReceive() {
    this.receivedChunks += 1;
    if (this.receivedChunks === this.expectedChunks) {
      const self = this
      process.nextTick(() => {
        self.close().then(() => {
          self.emit('completed');
        } );
      });
    }
  }

  put(index, data) {
    return new Promise((resolve, reject) => {
      const self = this;
      this.store.put(index, data, (err) => {
        if (err) return reject(err);
        self.emit('receive')
        resolve();
      });
    });
  }

  get(index) {
    return new Promise((resolve, reject) => {
      this.store.get(index, (err, chunk) => {
        if (err) return reject(err);
        resolve(chunk);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.store.close(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  destroy() {
    return new Promise((resolve, reject) => {
      this.store.destroy(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

module.exports = Chunkstore;
