import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer } from "expo-three";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
} from "three";
import { GLTFLoader, SkeletonUtils } from "three-stdlib";

type ReadyPlayerMeAvatarProps = {
  modelUrl: string;
  backgroundColor?: string;
  accentColor?: string;
  style?: ViewStyle;
};

type ReadyPlayerMeModelProps = {
  scene: Scene;
  loader: GLTFLoader;
  modelUrl: string;
  onLoaded: (model: Object3D | null) => void;
};

function configureMaterials(root: Object3D) {
  root.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const material = mesh.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((item) => {
          item.roughness = 0.45;
          item.metalness = 0.05;
          item.flatShading = true;
        });
      } else if (material) {
        material.roughness = 0.45;
        material.metalness = 0.05;
        material.flatShading = true;
      }
    }
  });
}

function loadReadyPlayerMeModel({ scene, loader, modelUrl, onLoaded }: ReadyPlayerMeModelProps) {
  loader.load(
    modelUrl,
    (gltf) => {
      const model = SkeletonUtils.clone(gltf.scene);
      configureMaterials(model);
      const box = new Box3().setFromObject(model);
      const center = new Vector3();
      box.getCenter(center);
      model.position.sub(center);
      model.position.y -= box.min.y;
      scene.add(model);
      onLoaded(model);
    },
    undefined,
    () => {
      onLoaded(null);
    },
  );
}

export default function ReadyPlayerMeAvatar({
  modelUrl,
  backgroundColor = "#0f172a",
  accentColor = "#38bdf8",
  style,
}: ReadyPlayerMeAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setIsLoaded(false);
  }, [modelUrl]);

  const handleContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
      const renderer = new Renderer({ gl, antialias: true });
      renderer.setSize(width, height);
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.setClearColor(new Color(backgroundColor));

      const scene = new Scene();
      scene.background = new Color(backgroundColor);

      const camera = new PerspectiveCamera(30, width / height, 0.1, 100);
      camera.position.set(0, 1.1, 2);

      const ambientLight = new AmbientLight(0xffffff, 0.9);
      const keyLight = new DirectionalLight(new Color(accentColor), 1.2);
      keyLight.position.set(5, 5, 5);
      const fillLight = new DirectionalLight(0xffffff, 0.6);
      fillLight.position.set(-4, 4, -2);
      scene.add(ambientLight, keyLight, fillLight);

      const clock = new Clock();
      const loader = new GLTFLoader();
      const modelRef = { current: null as Object3D | null };
      let disposed = false;

      loadReadyPlayerMeModel({
        scene,
        loader,
        modelUrl,
        onLoaded: (model) => {
          if (disposed) {
            return;
          }
          modelRef.current = model;
          setIsLoaded(Boolean(model));
        },
      });

      let frameId = 0;
      const animate = () => {
        if (disposed) {
          return;
        }
        frameId = requestAnimationFrame(animate);
        if (modelRef.current) {
          const elapsed = clock.getElapsedTime();
          modelRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.2;
        }
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();

      cleanupRef.current = () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        scene.traverse((object) => {
          if ((object as Mesh).isMesh) {
            const mesh = object as Mesh;
            mesh.geometry.dispose();
            const material = mesh.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
            if (Array.isArray(material)) {
              material.forEach((item) => item.dispose());
            } else if (material) {
              material.dispose();
            }
          }
        });
        renderer.dispose();
      };
    },
    [accentColor, backgroundColor, modelUrl],
  );

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <GLView
        key={modelUrl}
        style={StyleSheet.absoluteFill}
        onContextCreate={handleContextCreate}
        pointerEvents="none"
      />
      {!isLoaded ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={accentColor} />
        </View>
      ) : null}
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
