import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Matrix-style shader for holographic AI look
const MatrixShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      // Fresnel effect for hologram edge glow
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - dot(vNormal, viewDirection), 3.0);

      // Scanlines
      float scanline = sin(vPosition.y * 30.0 + time * 2.0) * 0.5 + 0.5;

      // Matrix digital rain effect
      float rain = sin(vPosition.y * 50.0 - time * 5.0) * 0.5 + 0.5;

      // Glitch effect
      float glitch = step(0.95, sin(time * 10.0 + vPosition.x * 100.0));

      // Mix colors
      vec3 baseColor = mix(color1, color2, vUv.y);
      vec3 finalColor = baseColor * (0.5 + scanline * 0.3 + rain * 0.2);

      // Add fresnel glow
      finalColor += color2 * fresnel * 0.8;

      // Add glitch
      finalColor += vec3(glitch * 0.3);

      // Transparency based on fresnel for hologram effect
      float alpha = 0.6 + fresnel * 0.4;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

interface MatrixFaceProps {
  mousePosition: { x: number; y: number };
  modelUrl?: string;
}

function MatrixFaceMesh({ mousePosition, modelUrl }: MatrixFaceProps) {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Load 3D model (Ready Player Me format or placeholder)
  // Note: useLoader must be called unconditionally
  const gltf = null; // TODO: Implement model loading

  useFrame((state) => {
    if (!meshRef.current) return;

    // Smooth mouse tracking
    const targetX = (mousePosition.x / window.innerWidth) * 0.3;
    const targetY = (mousePosition.y / window.innerHeight) * 0.3;

    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetX, 0.05);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetY, 0.05);

    // Update shader time uniform
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // If we have a loaded model, use it
  // TODO: Implement model rendering when Ready Player Me is integrated
  const _gltf = gltf;
  const _modelUrl = modelUrl;

  // Placeholder face mask until model loads
  return (
    <group ref={meshRef}>
      {/* eslint-disable react/no-unknown-property */}
      {/* Face mask shape */}
      <mesh>
        <sphereGeometry args={[1, 64, 64, 0, Math.PI]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={MatrixShader.vertexShader}
          fragmentShader={MatrixShader.fragmentShader}
          uniforms={{
            time: { value: 0 },
            color1: { value: new THREE.Color(0x00ff41) }, // Matrix green
            color2: { value: new THREE.Color(0x00ffff) }, // Cyan
          }}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe overlay for extra Matrix effect */}
      <mesh>
        <sphereGeometry args={[1.01, 32, 32, 0, Math.PI]} />
        <meshBasicMaterial color={0x00ff41} wireframe transparent opacity={0.3} />
      </mesh>
      {/* eslint-enable react/no-unknown-property */}
    </group>
  );
}

export const MatrixFace = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [_modelUrl, _setModelUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: event.clientX - window.innerWidth / 2,
        y: event.clientY - window.innerHeight / 2,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // TODO: Integrate Ready Player Me API
    // For now, we'll use the placeholder
    setTimeout(() => {
      setIsGenerating(false);
      // setModelUrl('path-to-ready-player-me-model.glb');
    }, 2000);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      {/* Upload Interface */}
      {!_modelUrl && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center">
          <div className="bg-black/80 backdrop-blur-sm border border-green-500/50 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Initialize AI Projection</h2>
            {!photoUrl ? (
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <div className="px-8 py-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500 rounded-lg text-green-400 transition-colors">
                  Upload Photo
                </div>
              </label>
            ) : (
              <div className="space-y-4">
                <img src={photoUrl} alt="Preview" className="w-48 h-48 object-cover rounded-lg mx-auto" />
                {isGenerating ? (
                  <div className="text-green-400 animate-pulse">Generating AI projection...</div>
                ) : (
                  <div className="text-green-400">Using placeholder - Ready Player Me integration coming next</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }} gl={{ antialias: true, alpha: true }}>
          {/* eslint-disable react/no-unknown-property */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} color="#00ff41" />
          <pointLight position={[-10, -10, -10]} intensity={0.3} color="#00ffff" />
          {/* eslint-enable react/no-unknown-property */}
          <MatrixFaceMesh mousePosition={mousePosition} modelUrl={_modelUrl} />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* Info */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-green-400 font-mono text-sm">AI NEURAL PROJECTION // MOUSE TRACKING ACTIVE</p>
      </div>
    </div>
  );
};
