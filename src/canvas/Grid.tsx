import React from 'react';
import { Line } from 'react-konva';

export interface GridProps {
  width: number;
  height: number;
  gridSize: number;
  enabled: boolean;
}

const Grid: React.FC<GridProps> = ({ width, height, gridSize, enabled }) => {
  if (!enabled) return null;

  const lines: React.ReactNode[] = [];

  // Vertical lines — top to bottom at each grid interval
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, 0, x, height]}
        stroke="#e0e0e0"
        strokeWidth={0.5}
      />,
    );
  }

  // Horizontal lines — left to right at each grid interval
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[0, y, width, y]}
        stroke="#e0e0e0"
        strokeWidth={0.5}
      />,
    );
  }

  return <>{lines}</>;
};

export default React.memo(Grid);
