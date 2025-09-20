import React, { useState } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { editorActions } from '../shared/store';
import type { ActiveClip } from '../shared/types';

interface SelectionOverlayProps {
  clip: ActiveClip;
  halfWidth: number;
  halfHeight: number;
  isVisible: boolean;
  onStartMove?: (e: any) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  clip,
  halfWidth,
  halfHeight,
  isVisible,
  onStartMove,
}) => {
  const [dragMode, setDragMode] = useState<'resize' | 'rotate' | 'move' | null>(null);

  const startResize = (e: any) => {
    e.stopPropagation();
    setDragMode('resize');
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = clip.scale.clone();

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) * 0.005;
      const deltaY = (e.clientY - startY) * 0.005; // Fixed: removed inversion
      
      const newScale = new THREE.Vector3(
        Math.max(0.1, startScale.x + deltaX),
        Math.max(0.1, startScale.y + deltaY),
        startScale.z
      );
      
      editorActions.updateClip(clip.id, { scale: newScale });
    };

    const handleMouseUp = () => {
      setDragMode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startRotate = (e: any) => {
    e.stopPropagation();
    setDragMode('rotate');
    
    const startX = e.clientX;
    const startRotation = clip.rotation.z;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) * 0.01;
      
      const newRotation = new THREE.Euler(
        clip.rotation.x,
        clip.rotation.y,
        startRotation - deltaX // Fixed: inverted rotation for intuitive clockwise direction
      );
      
      editorActions.updateClip(clip.id, { rotation: newRotation });
    };

    const handleMouseUp = () => {
      setDragMode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startMove = (e: any) => {
    e.stopPropagation();
    setDragMode('move');
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosition = clip.position.clone();

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - startX) * 0.005;
      const deltaY = (e.clientY - startY) * 0.005; // Fixed: removed inversion
      
      const newPosition = new THREE.Vector3(
        startPosition.x + deltaX,
        startPosition.y - deltaY, // Invert Y for screen coordinate system
        startPosition.z
      );
      
      editorActions.updateClip(clip.id, { position: newPosition });
    };

    const handleMouseUp = () => {
      setDragMode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isVisible) return null;

  // Larger handle sizes for better usability
  const handleSize = 0.08;
  const rotationHandleSize = 0.1;
  const rotationHandleDistance = 0.2;

  return (
    <group>
      {/* AABB outline */}
      <Line
        points={[
          [-halfWidth, -halfHeight, 0.001],
          [halfWidth, -halfHeight, 0.001],
          [halfWidth, halfHeight, 0.001],
          [-halfWidth, halfHeight, 0.001],
          [-halfWidth, -halfHeight, 0.001],
        ]}
        color="#00e5ff"
        lineWidth={2}
      />

      {/* Invisible move handle covering the entire clip area */}
      <mesh
        position={[0, 0, 0.001]}
        onPointerDown={onStartMove || startMove}
        visible={false}
      >
        <planeGeometry args={[halfWidth * 2, halfHeight * 2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Corner resize handles */}
      <mesh
        position={[halfWidth, halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <mesh
        position={[-halfWidth, halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <mesh
        position={[halfWidth, -halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <mesh
        position={[-halfWidth, -halfHeight, 0.002]}
        onPointerDown={startResize}
      >
        <circleGeometry args={[handleSize, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Rotation handle */}
      <mesh
        position={[0, halfHeight + rotationHandleDistance, 0.002]}
        onPointerDown={startRotate}
      >
        <circleGeometry args={[rotationHandleSize, 16]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>

      {/* Line connecting rotation handle to the clip */}
      <Line
        points={[
          [0, halfHeight, 0.001],
          [0, halfHeight + rotationHandleDistance, 0.001],
        ]}
        color="#ffcc00"
        lineWidth={1}
      />
    </group>
  );
};

export default SelectionOverlay;