// @ts-nocheck
import React from 'react';
import { useGLTF } from '@react-three/drei';

export function DiceModel(props: any) {
  const gltf = useGLTF('/dado.glb');

  // Retorna diretamente o primitive sem wrapper Group
  return <primitive object={gltf.scene} scale={20} {...props} />;
}

useGLTF.preload('/dado.glb');
