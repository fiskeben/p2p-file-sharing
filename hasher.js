const crypto = require('crypto');
const fs = require('fs')
const chunkHasher = require('fixed-size-chunk-hashing')
const streamHasher = require('hash-of-stream')

const fromFile = (filename) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filename);
    streamHasher(stream, (hash) => {
      resolve(hash);
    });
  });
}

const asChunksOfFile = (filename, chunkSize) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filename);
    stream.pipe(chunkHasher(chunkSize, (err, hashes) => {
      if (err) return reject(err);
      resolve(hashes);
    }));
  });
}

const ofChunkHashes = (hashes) => {
  console.log('here chunk')
  return new Promise((resolve, reject) => {
    const result = crypto.createHash('sha256')
      .update(hashes.join("\n"))
      .digest()
      .toString('hex');
    resolve(result);
  });
}

const equalsFileHash = (expected, filename) => {
  return new Promise((resolve, reject) => {
    fromFile(filename).then(
      hash => {
        if (expected === hash) {
          resolve();
        } else {
          reject();
        }
      }
    );
  });
}

const equalsHashOfHashes = (expected, hashes) => {
  return new Promise((resolve, reject) => {
    ofChunkHashes(hashes).then(
      hash => {
        if (hash === expected) {
          console.log('hay')
          resolve();
        } else {
          console.log('hoo')
          reject();
        }
      },
      err => {
        console.log(err);
        throw new Error('something bad just happened');
      }
    ).catch(
      err => {
        console.log(err);
        throw new Error('something very bad just happened')
      }
    )
  });
}

const equals = (expected, data) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256').update(data).digest().toString('hex');
    if (hash === expected) {
      resolve();
    } else {
      reject();
    }
  })
}

module.exports = {
  fromFile,
  asChunksOfFile,
  ofChunkHashes,
  equalsHashOfHashes,
  equalsFileHash,
  equals
}
