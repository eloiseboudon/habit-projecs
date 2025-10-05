import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";
import * as THREE from "three";

type ReadyPlayerMeAvatarProps = {
  modelUrl: string;
  backgroundColor?: string;
  accentColor?: string;
  style?: ViewStyle;
};

// Composant pour afficher et animer le modèle
function AvatarModel({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const [model] = useState(() => {
    const cloned = scene.clone();

    // Configure les matériaux pour un rendu cartoon
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];

        if (Array.isArray(material)) {
          material.forEach((mat) => {
            mat.roughness = 0.45;
            mat.metalness = 0.05;
            mat.flatShading = true;
          });
        } else if (material) {
          material.roughness = 0.45;
          material.metalness = 0.05;
          material.flatShading = true;
        }
      }
    });

    // Centre le modèle
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    box.getCenter(center);
    cloned.position.sub(center);
    cloned.position.y -= box.min.y;

    return cloned;
  });

  // Animation oscillante
  useFrame((state) => {
    if (groupRef.current) {
      const elapsed = state.clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.2;
    }
  });

  return <primitive ref={groupRef} object={model} />;
}

export default function ReadyPlayerMeAvatar({
  modelUrl,
  backgroundColor = "#0f172a",
  accentColor = "#38bdf8",
  style,
}: ReadyPlayerMeAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Réinitialise l'état quand l'URL change
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [modelUrl]);

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <Canvas
        camera={{ position: [0, 1.1, 2], fov: 30 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(backgroundColor));
        }}
      >
        {/* Lumières */}
        <ambientLight intensity={0.9} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.2}
          color={accentColor}
        />
        <directionalLight
          position={[-4, 4, -2]}
          intensity={0.6}
          color="#ffffff"
        />

        {/* Modèle avec chargement progressif */}
        <Suspense fallback={null}>
          <AvatarModel url={modelUrl} />
        </Suspense>
      </Canvas>

      {/* Indicateur de chargement */}
      {!isLoaded && !error && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={accentColor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000022",
  },
});