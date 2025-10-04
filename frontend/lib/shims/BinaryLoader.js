const THREE = require('three');

class BinaryLoader {
  constructor() {
    throw new Error('BinaryLoader has been removed from three.js.');
  }
}

THREE.BinaryLoader = BinaryLoader;

module.exports = THREE.BinaryLoader;
