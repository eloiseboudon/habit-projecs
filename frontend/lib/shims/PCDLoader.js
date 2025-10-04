const THREE = require('three');
const { PCDLoader } = require('three/examples/jsm/loaders/PCDLoader.js');
THREE.PCDLoader = PCDLoader;
module.exports = THREE.PCDLoader;
