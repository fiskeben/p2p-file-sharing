const assert = require('assert')
const hasher = require('../hasher');

const filename = __filename;

hasher.fromFile(filename).then(assert.ok, assert.fail).catch(assert.fail)

hasher.asChunksOfFile(filename, 1024).then(assert.ok, assert.fail).catch(assert.fail)

hasher.ofChunkHashes(['abc']).then(assert.ok, assert.fail).catch(assert.fail)
