import { OrbitControls, Sphere } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface FaceProps {
  isSpeaking: boolean;
  mouthOpenAmount: number;
}

function Face({ isSpeaking, mouthOpenAmount }: FaceProps) {
  const headRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  // Subtle head movement animation
  useFrame((state) => {
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      headRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }

    // Blinking animation
    if (leftEyeRef.current && rightEyeRef.current) {
      const blink = Math.sin(state.clock.elapsedTime * 3) < -0.95 ? 0.1 : 1;
      leftEyeRef.current.scale.y = blink;
      rightEyeRef.current.scale.y = blink;
    }

    // Mouth animation when speaking
    if (mouthRef.current && isSpeaking) {
      const wiggle = Math.sin(state.clock.elapsedTime * 15) * 0.3 + 0.7;
      mouthRef.current.scale.y = 0.5 + mouthOpenAmount * 0.8 * wiggle;
    }
  });

  return (
    <group ref={headRef}>
      {/* eslint-disable react/no-unknown-property */}
      {/* Head */}
      <Sphere args={[1, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffdbac" />
      </Sphere>

      {/* Left Eye */}
      <Sphere ref={leftEyeRef} args={[0.12, 16, 16]} position={[-0.3, 0.2, 0.8]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>

      {/* Right Eye */}
      <Sphere ref={rightEyeRef} args={[0.12, 16, 16]} position={[0.3, 0.2, 0.8]}>
        <meshStandardMaterial color="#000000" />
      </Sphere>

      {/* Nose */}
      <mesh position={[0, 0, 0.9]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#ffb380" />
      </mesh>

      {/* Mouth */}
      <Sphere ref={mouthRef} args={[0.25, 16, 16]} position={[0, -0.3, 0.8]} scale={[1, 0.5, 0.3]}>
        <meshStandardMaterial color="#8b4513" />
      </Sphere>
      {/* eslint-enable react/no-unknown-property */}
    </group>
  );
}

export const AIFace = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getAIResponse = useCallback(async (_userMessage: string) => {
    try {
      // Simple AI response for now (can be replaced with actual AI SDK call)
      const responses = [
        "Hello! I'm your AI assistant. How can I help you today?",
        "That's an interesting question. Let me think about that.",
        "I understand what you're asking. Here's my perspective on that.",
        "Great point! I'd love to discuss that further with you.",
        "I'm here to help. What else would you like to know?",
      ];

      const aiResponse = responses[Math.floor(Math.random() * responses.length)];
      setResponse(aiResponse);
      await speak(aiResponse);
    } catch (error) {
      console.error('AI response error:', error);
    }
  }, []);

  useEffect(() => {
    // Initialize speech recognition

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript as string;
        setTranscript(text);
        setIsListening(false);

        // Get AI response
        void getAIResponse(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [getAIResponse]);

  const speak = async (text: string) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      synthRef.current = utterance;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onboundary = (event) => {
        // Animate mouth based on speech
        if (event.name === 'word') {
          setMouthOpenAmount(0.8);
          setTimeout(() => setMouthOpenAmount(0.3), 100);
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setMouthOpenAmount(0);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setMouthOpenAmount(0);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 3D Canvas */}
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800">
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          {/* eslint-disable react/no-unknown-property */}
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          {/* eslint-enable react/no-unknown-property */}
          <Face isSpeaking={isSpeaking} mouthOpenAmount={mouthOpenAmount} />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* Controls and Display */}
      <div className="bg-slate-900 border-t border-slate-700 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Status */}
          <div className="flex items-center justify-center gap-4">
            {isListening && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white text-sm">Listening...</span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white text-sm">Speaking...</span>
              </div>
            )}
          </div>

          {/* Transcript and Response */}
          {transcript && (
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-slate-300 text-sm mb-1">You said:</p>
              <p className="text-white">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-slate-300 text-sm mb-1">AI Response:</p>
              <p className="text-white">{response}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={startListening}
              disabled={isListening || isSpeaking}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {isListening ? 'Listening...' : 'Talk to Me'}
            </button>

            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Stop Speaking
              </button>
            )}
          </div>

          <p className="text-center text-slate-400 text-sm">
            Click &quot;Talk to Me&quot; and speak. The AI will listen and respond.
          </p>
        </div>
      </div>
    </div>
  );
};
