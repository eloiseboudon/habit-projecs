const THREE = require('three');
const { STLLoader } = require('three/examples/jsm/loaders/STLLoader.js');

THREE.STLLoader = STLLoader;

module.exports = THREE.STLLoader;
