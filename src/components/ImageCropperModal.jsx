import React, { useState, useRef, useEffect } from 'react';
import { 
  Crop, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RefreshCw, 
  Check, 
  X, 
  Move,
  Sparkles
} from 'lucide-react';

export function ImageCropperModal({ 
  imageSrc, 
  onCropComplete, 
  onCancel,
  targetSize = 400,
  viewportSize = 260
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Dragging state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });

  // Load natural image dimensions
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Compute base scale to cover viewport
  const isRotatedSideways = rotation === 90 || rotation === 270;
  const effectiveWidth = isRotatedSideways ? imgNaturalSize.height : imgNaturalSize.width;
  const effectiveHeight = isRotatedSideways ? imgNaturalSize.width : imgNaturalSize.height;

  const baseScale = effectiveWidth && effectiveHeight 
    ? Math.max(viewportSize / effectiveWidth, viewportSize / effectiveHeight)
    : 1;

  const totalScale = baseScale * zoom;

  // Pointer drag handlers (touch & mouse)
  const handlePointerDown = (e) => {
    if (isProcessing) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialOffset.current = { ...offset };
    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: initialOffset.current.x + dx,
      y: initialOffset.current.y + dy
    });
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    if (e.target.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirmCrop = async () => {
    if (!imageSrc || isProcessing) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      // Enable high quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Multiplier from preview viewport to target canvas
      const m = targetSize / viewportSize;

      // Translate to center of canvas + scaled screen offset
      ctx.translate(targetSize / 2 + offset.x * m, targetSize / 2 + offset.y * m);

      // Rotate around translated center
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw image scaled
      const drawWidth = img.naturalWidth * totalScale * m;
      const drawHeight = img.naturalHeight * totalScale * m;

      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      // Export as high quality JPEG Data URL
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onCropComplete(croppedDataUrl);
    } catch (err) {
      console.error('Failed to crop image:', err);
      // Fallback to original image if canvas fails
      onCropComplete(imageSrc);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-right">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-zinc-100">قص وتعديل الصورة الشخصية</h3>
              <span className="text-[10px] text-amber-400 font-bold block">تحريك وتكبير الصورة داخل الإطار</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Frame */}
        <div className="relative flex flex-col items-center justify-center py-2 select-none">
          <div 
            style={{ width: `${viewportSize}px`, height: `${viewportSize}px` }}
            className="relative rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_25px_rgba(245,184,0,0.25)] bg-zinc-950 cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Guide Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10 rounded-full z-10 opacity-30">
              <div className="border-r border-b border-white/15"></div>
              <div className="border-r border-b border-white/15"></div>
              <div className="border-b border-white/15"></div>
              <div className="border-r border-b border-white/15"></div>
              <div className="border-r border-b border-white/15"></div>
              <div className="border-b border-white/15"></div>
              <div className="border-r border-white/15"></div>
              <div className="border-r border-white/15"></div>
              <div></div>
            </div>

            {/* Transformed Image */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt="قص الصورة"
                draggable={false}
                style={{
                  width: `${imgNaturalSize.width * totalScale}px`,
                  height: `${imgNaturalSize.height * totalScale}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
                }}
                className="pointer-events-none select-none absolute"
              />
            )}

            {/* Gesture Hint Pill */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-20 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-bold text-zinc-300 flex items-center gap-1 shadow-sm">
              <Move className="w-2.5 h-2.5 text-amber-400" />
              <span>اسحب للتحريك</span>
            </div>
          </div>
        </div>

        {/* Zoom Slider and Controls */}
        <div className="space-y-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80">
          {/* Zoom Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300">
              <span className="flex items-center gap-1 text-amber-400">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>درجة التكبير (Zoom):</span>
              </span>
              <span className="font-mono text-xs text-zinc-400 font-bold">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(1, +(prev - 0.2).toFixed(1)))}
                disabled={zoom <= 1}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3, +(prev + 0.2).toFixed(1)))}
                disabled={zoom >= 3}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Actions: Rotate 90 & Reset */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
            <button
              type="button"
              onClick={handleRotate}
              className="text-[11px] font-bold text-zinc-300 hover:text-amber-400 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>تدوير 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800 px-2.5 py-1.5 rounded-xl border border-zinc-800/80 transition-colors flex items-center gap-1 cursor-pointer"
              title="إعادة ضبط الصورة للوضع الافتراضي"
            >
              <RefreshCw className="w-3 h-3 text-zinc-400" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isProcessing ? 'جاري معالجة وقص الصورة...' : 'اعتماد وقص الصورة'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
