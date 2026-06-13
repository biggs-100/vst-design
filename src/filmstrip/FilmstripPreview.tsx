import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Sprite, Circle, Group, Image as KonvaImage, Text } from 'react-konva';
import type Konva from 'konva';
import { invoke } from '@tauri-apps/api/core';
import { usePluginStore } from '@/store/usePluginStore';
import { loadImage, detectFrameCount } from './ImageCache';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Supported image MIME types for the hidden file input fallback. */
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg';

/** Allowed file extensions for the Tauri dialog filter. */
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg'];

/** Default frame count to try when auto-detection yields an inexact division. */
const DEFAULT_FRAME_COUNT = 10;

/** Preview canvas dimensions for the sprite animation preview. */
const SPRITE_PREVIEW_W = 120;
const SPRITE_PREVIEW_H = 120;

/** Test knob dimensions. */
const TEST_KNOB_SIZE = 80;

/* ------------------------------------------------------------------ */
/*  Helper: build a `data:` URL from a Blob so we can display local    */
/*  files without relying on Tauri (dev fallback).                     */
/* ------------------------------------------------------------------ */

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export interface FilmstripPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

const FilmstripPreview: React.FC<FilmstripPreviewProps> = ({ isOpen, onClose }) => {
  /* ── Modal state ────────────────────────────────────────────────── */
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [frameCount, setFrameCount] = useState(DEFAULT_FRAME_COUNT);
  const [frameHeight, setFrameHeight] = useState(0);
  const [exactDivision, setExactDivision] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  // Store access for assigning filmstrip to selected component
  const selectedComponentId = usePluginStore((s) => s.selectedComponentId);

  /* ── Reset state when modal opens / closes ──────────────────────── */
  useEffect(() => {
    if (!isOpen) {
      // Stop any running animation
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
      setImageSrc(null);
      setImageObj(null);
      setError(null);
    }
  }, [isOpen]);

  /* ── Animation loop ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!isPlaying || frameCount <= 0) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const interval = 1000 / fps;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = now - last;
      if (delta >= interval) {
        last = now - (delta % interval);
        setCurrentFrame((prev) => (prev + 1) % frameCount);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, fps, frameCount]);

  /* ── Build the per-frame animation config for Konva.Sprite ──────── */
  const spriteAnimations = React.useMemo(() => {
    if (!imageObj || frameCount <= 0 || frameHeight <= 0) return {};
    return {
      preview: Array.from({ length: frameCount }, (_, i) => ({
        x: 0,
        y: i * frameHeight,
        width: imageObj.width,
        height: frameHeight,
      })),
    };
  }, [imageObj, frameCount, frameHeight]);

  /* ── Import handler ──────────────────────────────────────────────── */
  const handleImport = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      let filePath: string | null = null;
      let src: string;

      // Attempt Tauri native dialog first
      try {
        const result = await invoke<string | null>('open_file_dialog', { kind: 'open' });
        filePath = result;
      } catch {
        // Tauri invoke failed — use hidden file input fallback
        filePath = null;
      }

      if (!filePath) {
        // Fallback: hidden file input (works in dev/browser mode)
        return new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = ACCEPTED_TYPES;
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              setLoading(false);
              resolve();
              return;
            }

            // Validate extension
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
              setError('Unsupported format. Use PNG or JPG.');
              setLoading(false);
              resolve();
              return;
            }

            try {
              src = await readFileAsDataURL(file);
              await loadImageFromSrc(src, file.name);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to load image');
            }
            setLoading(false);
            resolve();
          };
          input.click();
        });
      }

      // Tauri returned a path — load via file://
      src = `file://${filePath}`;
      await loadImageFromSrc(src, filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }

    setLoading(false);
  }, []);

  /* ── Shared image-loading logic ─────────────────────────────────── */
  const loadImageFromSrc = async (src: string, _displayName: string) => {
    const img = await loadImage(src);
    setImageSrc(src);
    setImageObj(img);
    setImageWidth(img.width);
    setImageHeight(img.height);

    // Auto-detect frame count
    const detection = detectFrameCount(img.height);
    setFrameCount(detection.frameCount);
    setFrameHeight(detection.frameHeight);
    setExactDivision(detection.exact);
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  /* ── Frame count override handler ────────────────────────────────── */
  const handleFrameCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(e.target.value, 10);
      if (isNaN(raw) || raw < 1) return;

      const newCount = Math.max(1, raw);
      const newFrameH = Math.floor(imageHeight / newCount);
      const remainder = imageHeight - newFrameH * newCount;

      setFrameCount(newCount);
      setFrameHeight(newFrameH);
      setExactDivision(remainder === 0);

      // Clamp current frame if needed
      setCurrentFrame((prev) => Math.min(prev, newCount - 1));
    },
    [imageHeight],
  );

  /* ── FPS slider handler ──────────────────────────────────────────── */
  const handleFpsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFps(parseInt(e.target.value, 10));
    },
    [],
  );

  /* ── Play / pause toggle ─────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    if (frameCount <= 0) return;
    setIsPlaying((p) => !p);
  }, [frameCount]);

  /* ── Test knob: circular drag → frame index ──────────────────────── */
  const [testKnobFrame, setTestKnobFrame] = useState(0);
  const testKnobDragging = useRef(false);

  const handleKnobMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    testKnobDragging.current = true;
  }, []);

  const handleKnobMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!testKnobDragging.current || frameCount <= 0) return;
      e.cancelBubble = true;

      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      // Centre of the test knob
      const cx = TEST_KNOB_SIZE / 2;
      const cy = TEST_KNOB_SIZE / 2;

      const angleDeg = Math.atan2(pointer.y - cy, pointer.x - cx) * (180 / Math.PI);
      // Map full 360° rotation to frame index
      const normalized = ((angleDeg + 180) % 360) / 360;
      const frame = Math.min(Math.floor(normalized * frameCount), frameCount - 1);
      setTestKnobFrame(frame);
    },
    [frameCount],
  );

  const handleKnobMouseUp = useCallback(() => {
    testKnobDragging.current = false;
  }, []);

  const handleKnobMouseLeave = useCallback(() => {
    testKnobDragging.current = false;
  }, []);

  /* ── Confirm: assign filmstrip metadata to selected component ────── */
  const handleAssign = useCallback(() => {
    if (!selectedComponentId || !imageSrc) return;

    const updateProps: Record<string, unknown> = {
      assetPath: imageSrc,
      frames: frameCount,
      frameWidth: imageWidth,
      frameHeight,
    };

    usePluginStore.getState().updateComponent(selectedComponentId, updateProps);
    onClose();
  }, [selectedComponentId, imageSrc, frameCount, imageWidth, frameHeight, onClose]);

  /* ── Early return if modal is closed ──────────────────────────────── */
  if (!isOpen) return null;

  const frameInfo = imageObj
    ? `${imageWidth} × ${frameHeight.toFixed(1)} px per frame`
    : null;

  return (
    <div className="filmstrip-overlay" style={overlayStyles} onClick={onClose}>
      <div
        className="filmstrip-modal"
        style={modalStyles}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div style={headerStyles}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Filmstrip Manager</h2>
          <button
            style={closeBtnStyles}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Error display ─────────────────────────────────────── */}
        {error && (
          <div style={errorStyles}>
            {error}
            <button
              style={{
                marginLeft: 12,
                background: 'none',
                border: 'none',
                color: '#e88',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
          {/* ── Left column: image preview ────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Import button */}
            <div>
              <button
                style={primaryBtnStyles}
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Import Filmstrip'}
              </button>
            </div>

            {/* Image preview */}
            <div
              style={{
                flex: 1,
                background: '#1a1a1a',
                borderRadius: 6,
                border: '1px solid #555',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                minHeight: 160,
                position: 'relative',
              }}
            >
              {imageObj ? (
                <img
                  src={imageSrc!}
                  alt="Filmstrip preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span style={{ color: '#666', fontSize: 13 }}>
                  No filmstrip loaded
                </span>
              )}
            </div>

            {/* Frame info */}
            {imageObj && (
              <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>
                <div>
                  Image: {imageWidth} × {imageHeight}px
                </div>
                <div>
                  Frames: <strong>{frameCount}</strong> at {frameInfo}
                </div>
                {!exactDivision && (
                  <div style={{ color: '#e8a84c' }}>
                    ⚠ Image dimensions do not divide evenly into equal frames
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right column: controls ─────────────────────────────── */}
          <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Frame count override */}
            <div>
              <label style={labelStyles}>Frames:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={frameCount}
                  onChange={handleFrameCountChange}
                  style={numberInputStyles}
                />
                <span style={{ fontSize: 11, color: '#888' }}>
                  (height: {frameHeight.toFixed(1)}px)
                </span>
              </div>
            </div>

            {/* FPS slider */}
            <div>
              <label style={labelStyles}>
                FPS: {fps}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#888' }}>1</span>
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={fps}
                  onChange={handleFpsChange}
                  style={{ flex: 1, accentColor: '#4a90d9' }}
                />
                <span style={{ fontSize: 11, color: '#888' }}>60</span>
              </div>
            </div>

            {/* Play / pause + Sprite preview */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <button
                  style={smallBtnStyles}
                  onClick={togglePlay}
                  disabled={!imageObj || frameCount <= 0}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <span style={{ fontSize: 12, color: '#aaa' }}>
                  Frame {currentFrame + 1}/{frameCount}
                </span>
              </div>

              <div
                style={{
                  width: SPRITE_PREVIEW_W,
                  height: SPRITE_PREVIEW_H,
                  background: '#1a1a1a',
                  borderRadius: 6,
                  border: '1px solid #555',
                  overflow: 'hidden',
                }}
              >
                {imageObj && spriteAnimations.preview ? (
                  <Stage width={SPRITE_PREVIEW_W} height={SPRITE_PREVIEW_H}>
                    <Layer>
                      <Sprite
                        x={SPRITE_PREVIEW_W / 2 - imageObj.width / 2}
                        y={SPRITE_PREVIEW_H / 2 - frameHeight / 2}
                        image={imageObj}
                        animation="preview"
                        animations={spriteAnimations}
                        frameIndex={currentFrame}
                        frameRate={fps}
                      />
                    </Layer>
                  </Stage>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#555',
                      fontSize: 11,
                    }}
                  >
                    No preview
                  </div>
                )}
              </div>
            </div>

            {/* Test knob */}
            <div>
              <label style={labelStyles}>Test Knob:</label>
              <div
                style={{
                  width: TEST_KNOB_SIZE + 20,
                  height: TEST_KNOB_SIZE + 20,
                  background: '#1a1a1a',
                  borderRadius: 6,
                  border: '1px solid #555',
                  overflow: 'hidden',
                  position: 'relative',
                  marginTop: 4,
                }}
              >
                {imageObj && spriteAnimations.preview ? (
                  <Stage width={TEST_KNOB_SIZE + 20} height={TEST_KNOB_SIZE + 20}>
                    <Layer>
                      {/* The test knob uses the filmstrip */}
                      <Group
                        x={10}
                        y={10}
                        width={TEST_KNOB_SIZE}
                        height={TEST_KNOB_SIZE}
                      >
                        {/* Knob body from filmstrip */}
                        <KonvaImage
                          image={imageObj}
                          x={0}
                          y={0}
                          width={TEST_KNOB_SIZE}
                          height={TEST_KNOB_SIZE}
                          crop={{
                            x: 0,
                            y: testKnobFrame * frameHeight,
                            width: imageObj.width,
                            height: frameHeight,
                          }}
                          onMouseDown={handleKnobMouseDown}
                          onMouseMove={handleKnobMouseMove}
                          onMouseUp={handleKnobMouseUp}
                          onMouseLeave={handleKnobMouseLeave}
                        />
                      </Group>

                      {/* Frame number overlay */}
                      <Circle
                        x={TEST_KNOB_SIZE / 2 + 10}
                        y={TEST_KNOB_SIZE / 2 + 10}
                        radius={14}
                        fill="rgba(0,0,0,0.6)"
                        stroke="#e8a84c"
                        strokeWidth={1}
                        listening={false}
                      />
                      <Text
                        x={TEST_KNOB_SIZE / 2 + 10 - 14}
                        y={TEST_KNOB_SIZE / 2 + 10 - 6}
                        width={28}
                        height={12}
                        text={`${testKnobFrame + 1}/${frameCount}`}
                        fontSize={9}
                        fill="#e8a84c"
                        fontStyle="bold"
                        fontFamily="monospace"
                        align="center"
                        listening={false}
                      />
                    </Layer>
                  </Stage>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#555',
                      fontSize: 11,
                    }}
                  >
                    Load a filmstrip first
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                Drag the knob to test frame mapping
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={footerStyles}>
          <button
            style={{
              ...primaryBtnStyles,
              opacity: selectedComponentId && imageObj ? 1 : 0.5,
            }}
            onClick={handleAssign}
            disabled={!selectedComponentId || !imageObj}
            title={
              !selectedComponentId
                ? 'Select a component on the canvas first'
                : 'Assign filmstrip to selected component'
            }
          >
            Assign to Component
          </button>
          <button style={secondaryBtnStyles} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>

    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Inline styles (kept simple to avoid adding CSS files for MVP)      */
/* ------------------------------------------------------------------ */

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyles: React.CSSProperties = {
  background: '#2d2d2d',
  border: '1px solid #555',
  borderRadius: 8,
  padding: 20,
  width: 720,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  color: '#e0e0e0',
  fontSize: 13,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const closeBtnStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 18,
  padding: '2px 6px',
  borderRadius: 4,
};

const errorStyles: React.CSSProperties = {
  background: '#4a1a1a',
  border: '1px solid #8a3a3a',
  borderRadius: 4,
  padding: '8px 12px',
  color: '#e88',
  fontSize: 12,
};

const primaryBtnStyles: React.CSSProperties = {
  padding: '8px 20px',
  background: '#4a90d9',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const secondaryBtnStyles: React.CSSProperties = {
  padding: '8px 20px',
  background: '#4a4a4a',
  color: '#e0e0e0',
  border: '1px solid #666',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
};

const smallBtnStyles: React.CSSProperties = {
  padding: '4px 12px',
  background: '#4a4a4a',
  color: '#e0e0e0',
  border: '1px solid #666',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};

const numberInputStyles: React.CSSProperties = {
  width: 80,
  padding: '4px 8px',
  background: '#1a1a1a',
  color: '#e0e0e0',
  border: '1px solid #555',
  borderRadius: 4,
  fontSize: 13,
};

const labelStyles: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#ccc',
  marginBottom: 4,
};

const footerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  borderTop: '1px solid #444',
  paddingTop: 12,
};

export default React.memo(FilmstripPreview);
