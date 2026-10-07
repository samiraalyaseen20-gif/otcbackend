import { useEffect, useRef, useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import {
    ArrowRight, FileImage, ChevronDown, ChevronUp,
    Move, Sun, Ruler, RotateCw, ZoomIn, ZoomOut,
    RefreshCw, Download, Printer, SlidersHorizontal, AlertCircle
} from 'lucide-react';

import { App, AppOptions, ViewConfig, WindowLevel } from 'dwv';
import * as dicomParser from 'dicom-parser';

const TOOLS = [
    { id: 'WindowLevel', label: 'تباين', icon: Sun },
    { id: 'ZoomAndPan',  label: 'تحريك وتكبير', icon: Move },
    { id: 'Draw',        label: 'قياس', icon: Ruler },
];

export default function Show({ patient }: any) {
    const containerRef = useRef<HTMLDivElement>(null);
    const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const [dwvApp, setDwvApp] = useState<App | null>(null);
    const [activeTool, setActiveTool] = useState('ZoomAndPan');
    const [activeScan, setActiveScan] = useState<any>(patient.scans?.[0] ?? null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadingScan, setLoadingScan] = useState(false);
    const [isInverted, setIsInverted] = useState(false);
    const [scansOpen, setScansOpen] = useState(false);

    // Scan type: 'image' (JPG/PNG/BMP) or 'dicom'
    const [isStandardImage, setIsStandardImage] = useState(true);
    const [useFallback, setUseFallback] = useState(false);

    // Image Transform states (for standard images)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [isMobile, setIsMobile] = useState<boolean>(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Reset standard image transformations
    const resetTransform = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setIsInverted(false);
    }, []);

    // Canvas DICOM Fallback Renderer using dicom-parser
    const renderDicomFallback = async (url: string) => {
        const canvas = fallbackCanvasRef.current;
        if (!canvas) return false;
        try {
            const res = await fetch(url);
            if (!res.ok) return false;
            const arrayBuffer = await res.arrayBuffer();
            const byteArray = new Uint8Array(arrayBuffer);

            // Check if it's actually an image
            const isImg = 
                (byteArray[0] === 0xFF && byteArray[1] === 0xD8) || // JPEG
                (byteArray[0] === 0x89 && byteArray[1] === 0x50 && byteArray[2] === 0x4E && byteArray[3] === 0x47) || // PNG
                (byteArray[0] === 0x42 && byteArray[1] === 0x4D); // BMP

            if (isImg) {
                setIsStandardImage(true);
                return true;
            }

            const dataSet = dicomParser.parseDicom(byteArray);
            const rows = dataSet.uint16('x00280010');
            const cols = dataSet.uint16('x00280011');
            if (!rows || !cols) return false;

            const bitsAllocated = dataSet.uint16('x00280100') || 16;
            const pixelRepresentation = dataSet.uint16('x00280103') || 0;
            const photometricInterpretation = dataSet.string('x00280004') || 'MONOCHROME2';
            const rescaleIntercept = dataSet.floatString('x00281052') ?? 0;
            const rescaleSlope = dataSet.floatString('x00281053') ?? 1;

            let windowCenter = dataSet.floatString('x00281050');
            let windowWidth = dataSet.floatString('x00281051');

            const pixelDataElement = dataSet.elements.x7fe00010;
            if (!pixelDataElement) return false;

            canvas.width = cols;
            canvas.height = rows;
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;

            const offset = pixelDataElement.dataOffset;
            const length = pixelDataElement.length;

            // Check if Encapsulated JPEG
            let isJpeg = false;
            let jpegOffset = offset;
            for (let i = offset; i < Math.min(offset + 128, byteArray.length - 1); i++) {
                if (byteArray[i] === 0xFF && byteArray[i + 1] === 0xD8) {
                    isJpeg = true;
                    jpegOffset = i;
                    break;
                }
            }

            if (isJpeg) {
                const jpegBytes = byteArray.subarray(jpegOffset, offset + length);
                const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
                const imgUrl = URL.createObjectURL(blob);
                return new Promise<boolean>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, cols, rows);
                        URL.revokeObjectURL(imgUrl);
                        resolve(true);
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(imgUrl);
                        resolve(false);
                    };
                    img.src = imgUrl;
                });
            }

            // Raw Uncompressed Pixels
            let pixelArray: Int16Array | Uint16Array | Uint8Array;
            if (bitsAllocated === 16) {
                if (pixelRepresentation === 1) {
                    pixelArray = new Int16Array(arrayBuffer, offset, Math.floor(length / 2));
                } else {
                    pixelArray = new Uint16Array(arrayBuffer, offset, Math.floor(length / 2));
                }
            } else {
                pixelArray = new Uint8Array(arrayBuffer, offset, length);
            }

            let minVal = Infinity;
            let maxVal = -Infinity;
            for (let i = 0; i < pixelArray.length; i++) {
                const val = pixelArray[i] * rescaleSlope + rescaleIntercept;
                if (val < minVal) minVal = val;
                if (val > maxVal) maxVal = val;
            }

            if (windowCenter === undefined || windowWidth === undefined || windowWidth <= 0) {
                windowWidth = maxVal - minVal;
                windowCenter = minVal + windowWidth / 2;
            }

            if (windowWidth <= 0) windowWidth = 1;

            const imgData = ctx.createImageData(cols, rows);
            const data = imgData.data;
            const lowerBound = windowCenter - windowWidth / 2;
            const isMonochrome1 = photometricInterpretation.trim() === 'MONOCHROME1';

            let pIdx = 0;
            for (let i = 0; i < pixelArray.length; i++) {
                const val = pixelArray[i] * rescaleSlope + rescaleIntercept;
                let intensity = Math.round(((val - lowerBound) / windowWidth) * 255);
                if (intensity < 0) intensity = 0;
                if (intensity > 255) intensity = 255;

                if (isMonochrome1) {
                    intensity = 255 - intensity;
                }

                data[pIdx]     = intensity;
                data[pIdx + 1] = intensity;
                data[pIdx + 2] = intensity;
                data[pIdx + 3] = 255;
                pIdx += 4;
            }

            ctx.putImageData(imgData, 0, 0);
            return true;
        } catch (err) {
            console.error('[Fallback Canvas render error]', err);
            return false;
        }
    };

    // Detect format and load scan
    useEffect(() => {
        if (!activeScan?.dicom_url) {
            if (activeScan && !activeScan.dicom_url) {
                setLoadError('لا توجد صورة أو ملف لهذا الفحص.');
            }
            return;
        }

        setLoadingScan(true);
        setLoadError(null);
        setUseFallback(false);
        resetTransform();

        const url = activeScan.dicom_url;
        const isKnownImage = /\.(jpe?g|png|webp|bmp|gif)(\?.*)?$/i.test(url);

        if (isKnownImage) {
            setIsStandardImage(true);
            setLoadingScan(false);
            return;
        }

        // Otherwise, probe header or try DICOM
        fetch(url, { method: 'GET', headers: { Range: 'bytes=0-255' } })
            .then(async (res) => {
                const buf = await res.arrayBuffer();
                const bytes = new Uint8Array(buf);
                const isImg = 
                    (bytes[0] === 0xFF && bytes[1] === 0xD8) || // JPEG
                    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) || // PNG
                    (bytes[0] === 0x42 && bytes[1] === 0x4D); // BMP

                if (isImg) {
                    setIsStandardImage(true);
                    setLoadingScan(false);
                } else {
                    setIsStandardImage(false);
                    // Load DICOM via DWV
                    loadDicomWithDwv(url);
                }
            })
            .catch(() => {
                // Default fallback to standard image loader
                setIsStandardImage(true);
                setLoadingScan(false);
            });
    }, [activeScan, resetTransform]);

    // Load DICOM via DWV
    const loadDicomWithDwv = (url: string) => {
        const layerDiv = document.getElementById('layerGroup0');
        if (!layerDiv) return;
        layerDiv.innerHTML = '';

        try {
            const app = new App();
            const viewConfig = new ViewConfig('layerGroup0');
            const options = new AppOptions({ '*': [viewConfig] });
            (options as any).tools = {
                WindowLevel: {},
                ZoomAndPan: {},
                Draw: {}
            };

            app.init(options);

            app.addEventListener('loadstart', () => {
                setLoadingScan(true);
            });

            app.addEventListener('loadend', () => {
                setLoadingScan(false);
                try {
                    app.fitToContainer();
                    app.initWLDisplay();
                    app.setTool('WindowLevel');
                    setActiveTool('WindowLevel');
                } catch (e) {
                    console.error('[DWV loadend error]', e);
                }
            });

            app.addEventListener('error', (event: any) => {
                console.error('[DWV error, trying fallback]', event);
                renderDicomFallback(url).then((success) => {
                    setLoadingScan(false);
                    if (success) {
                        setUseFallback(true);
                    } else {
                        setLoadError('تعذّر عرض ملف الفحص.');
                    }
                });
            });

            setDwvApp(app);
            app.loadURLs([url]);
        } catch (err) {
            console.error('[DWV init error]', err);
            renderDicomFallback(url).then((success) => {
                setLoadingScan(false);
                if (success) {
                    setUseFallback(true);
                } else {
                    setLoadError('خطأ أثناء تشغيل الفحص.');
                }
            });
        }
    };

    // Zoom and pan controls for standard images
    const handleZoomIn = () => setZoom(z => Math.min(z * 1.25, 10));
    const handleZoomOut = () => setZoom(z => Math.max(z / 1.25, 0.2));

    const handleWheel = (e: React.WheelEvent) => {
        if (!isStandardImage) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        setZoom(z => Math.min(Math.max(z * factor, 0.2), 10));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isStandardImage) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isStandardImage || !isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    // Toolbar actions
    const selectTool = (toolId: string) => {
        setActiveTool(toolId);
        if (!isStandardImage && dwvApp) {
            try {
                dwvApp.setTool(toolId);
            } catch {}
        }
    };

    const rotate = (angle: number) => {
        if (isStandardImage) {
            setRotation(r => (r + angle) % 360);
        } else if (dwvApp) {
            try {
                const lg: any = dwvApp.getActiveLayerGroup();
                const vc = lg?.getActiveViewLayer?.()?.getViewController?.() || lg?.getViewController?.();
                if (vc && typeof vc.rotate === 'function') vc.rotate(angle);
            } catch {}
        }
    };

    const toggleInvert = () => {
        setIsInverted(prev => !prev);
        if (!isStandardImage && dwvApp) {
            try {
                const lg: any = dwvApp.getActiveLayerGroup();
                const vc = lg?.getActiveViewLayer?.()?.getViewController?.() || lg?.getViewController?.();
                if (vc && typeof vc.setInvert === 'function') {
                    vc.setInvert(!isInverted);
                }
            } catch {}
        }
    };

    const reset = () => {
        resetTransform();
        if (!isStandardImage && dwvApp) {
            try {
                dwvApp.resetZoomPan();
                dwvApp.resetLayout();
                dwvApp.initWLDisplay();
            } catch {}
        }
        if (useFallback && activeScan?.dicom_url) {
            renderDicomFallback(activeScan.dicom_url);
        }
    };

    const dlFile = () => {
        if (!activeScan?.dicom_url) return;
        const a = document.createElement('a');
        a.href = activeScan.dicom_url;
        const ext = isStandardImage ? 'jpg' : 'dcm';
        a.download = `scan_${activeScan.id}_${activeScan.patient_id || 'patient'}.${ext}`;
        a.click();
    };

    const doPrint = () => {
        if (!activeScan?.dicom_url) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>طباعة فحص OCT - ${patient.patient_name}</title>
                    <style>
                        body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
                        img { max-width: 98%; max-height: 98%; object-fit: contain; transform: rotate(${rotation}deg); filter: ${isInverted ? 'invert(1)' : 'none'}; }
                    </style>
                </head>
                <body>
                    <img src="${activeScan.dicom_url}" onload="window.print(); window.close();" />
                </body>
            </html>
        `);
        w.document.close();
    };

    const handleScanSelect = (scan: any) => {
        setActiveScan(scan);
        setScansOpen(false);
    };

    // Toolbar
    const Toolbar = () => (
        <div className="bg-[#1a1a1a] border-b border-[#333] px-2 py-2 overflow-x-auto flex-shrink-0">
            <div className="flex items-center gap-1 min-w-max">
                {isStandardImage ? (
                    <>
                        <button onClick={handleZoomIn} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-[#e0e0e0] hover:bg-white/10" title="تكبير (+)">
                            <ZoomIn className="h-4 w-4"/><span>تكبير</span>
                        </button>
                        <button onClick={handleZoomOut} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-[#e0e0e0] hover:bg-white/10" title="تصغير (-)">
                            <ZoomOut className="h-4 w-4"/><span>تصغير</span>
                        </button>
                    </>
                ) : (
                    TOOLS.map(T => (
                        <button key={T.id} title={T.label} onClick={() => selectTool(T.id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                                activeTool===T.id ? 'bg-primary text-primary-foreground' : 'text-[#e0e0e0] hover:bg-white/10'
                            }`}>
                            <T.icon className="h-4 w-4"/><span>{T.label}</span>
                        </button>
                    ))
                )}
                <div className="w-px h-5 bg-[#444] mx-1"/>
                <button onClick={() => rotate(90)} className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="تدوير (90°)">
                    <RotateCw className="h-4 w-4"/>
                </button>
                <button onClick={toggleInvert} className={`p-1.5 rounded transition-colors ${isInverted ? 'bg-primary text-primary-foreground' : 'text-[#e0e0e0] hover:bg-white/10'}`} title="عكس الألوان">
                    <SlidersHorizontal className="h-4 w-4"/>
                </button>
                <button onClick={reset} className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="إعادة ضبط">
                    <RefreshCw className="h-4 w-4"/>
                </button>
                <button onClick={doPrint} className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="طباعة">
                    <Printer className="h-4 w-4"/>
                </button>
                <button onClick={dlFile} className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="تحميل">
                    <Download className="h-4 w-4"/>
                </button>
            </div>
        </div>
    );

    // Viewer Canvas Wrapper
    const ViewerCanvas = ({ className = '' }: { className?: string }) => (
        <div 
            ref={containerRef} 
            className={`relative overflow-hidden min-h-0 flex-1 flex items-center justify-center bg-black select-none ${className}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isStandardImage ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
            {/* Standard Image Viewer */}
            {isStandardImage && activeScan?.dicom_url && (
                <div 
                    className="w-full h-full flex items-center justify-center overflow-hidden"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        filter: isInverted ? 'invert(1) hue-rotate(180deg)' : 'none',
                    }}
                >
                    <img 
                        ref={imageRef}
                        src={activeScan.dicom_url} 
                        alt="OCT Scan" 
                        className="max-w-full max-h-full object-contain pointer-events-none"
                        onLoad={() => setLoadingScan(false)}
                        onError={() => {
                            setLoadingScan(false);
                            setLoadError('تعذّر تحميل صورة الفحص.');
                        }}
                    />
                </div>
            )}

            {/* DICOM DWV Layer (When DICOM) */}
            {!isStandardImage && (
                <>
                    <div id="layerGroup0" className={`layerGroup absolute inset-0 w-full h-full flex items-center justify-center cursor-crosshair overflow-hidden ${useFallback ? 'hidden' : ''}`}
                        onContextMenu={e=>e.preventDefault()}/>

                    <canvas ref={fallbackCanvasRef} className={`max-w-full max-h-full object-contain ${useFallback ? 'block' : 'hidden'}`} />
                </>
            )}

            {loadingScan && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 pointer-events-none">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
                        <p className="text-white text-sm">جاري تحميل صورة الفحص...</p>
                    </div>
                </div>
            )}
            {loadError && !loadingScan && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 pointer-events-none">
                    <div className="text-center text-white/70 px-6">
                        <FileImage className="h-12 w-12 mx-auto mb-3 opacity-20"/>
                        <p className="text-sm">{loadError}</p>
                    </div>
                </div>
            )}
            {!activeScan && !loadingScan && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="text-center text-white/40 px-6">
                        <FileImage className="h-16 w-16 mx-auto mb-3 opacity-20"/>
                        <p className="text-sm">اختر فحصاً من القائمة</p>
                    </div>
                </div>
            )}
        </div>
    );

    const ScansList = () => (
        <div className="space-y-2 p-3">
            {(patient.scans ?? []).length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">لا توجد فحوصات</p>
            ) : (patient.scans ?? []).map((scan: any) => {
                const isActive = activeScan?.id === scan.id;
                return (
                    <button key={scan.id} onClick={()=>handleScanSelect(scan)}
                        className={`w-full text-right rounded-lg p-3 transition-all border ${
                            isActive
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/40 hover:bg-muted border-transparent'
                        }`}>
                        <div className="flex items-start gap-2">
                            <FileImage className={`h-4 w-4 mt-0.5 shrink-0 ${isActive?'text-primary-foreground':'text-muted-foreground'}`}/>
                            <div className="min-w-0">
                                <p className="font-bold text-xs leading-tight">
                                    {scan.study_date ? `تاريخ الفحص: ${scan.study_date}` : 'تاريخ غير محدد'}
                                </p>
                                {scan.doctor_name && (
                                    <p className={`text-xs mt-0.5 ${isActive?'text-primary-foreground/80':'text-muted-foreground'}`}>
                                        الطبيب: {scan.doctor_name}
                                    </p>
                                )}
                                {scan.created_at && (
                                    <p className={`text-xs mt-0.5 ${isActive?'text-primary-foreground/70':'text-muted-foreground/70'}`}>
                                        مؤرشف: {new Date(scan.created_at).toLocaleDateString('ar-SA')}
                                    </p>
                                )}
                                {!scan.dicom_url && (
                                    <p className={`text-xs mt-1 ${isActive?'text-yellow-200':'text-yellow-600'}`}>⚠ لا توجد صورة مرفقة</p>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );

    // MOBILE layout
    if (isMobile) {
        return (
            <AuthenticatedLayout header={`سجل المريض: ${patient.patient_name}`}>
                <Head title={`المريض - ${patient.patient_name}`}/>
                <div className="-mx-4 -mt-4 -mb-24 flex flex-col" dir="rtl"
                    style={{ height: 'calc(100dvh - 56px)' }}>

                    {/* Back bar */}
                    <div className="flex items-center gap-3 bg-card px-3 py-2.5 border-b border-border flex-shrink-0">
                        <Link href={route('patients.index')}>
                            <Button variant="outline" size="sm" className="gap-1 h-8 px-2.5">
                                <ArrowRight className="h-4 w-4"/>رجوع
                            </Button>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight truncate">{patient.patient_name}</p>
                            {patient.doctor_name && (
                                <p className="text-xs text-muted-foreground truncate">الطبيب: {patient.doctor_name}</p>
                            )}
                        </div>
                    </div>

                    {/* Scans toggle */}
                    <button onClick={()=>setScansOpen(o=>!o)}
                        className="flex items-center justify-between bg-card px-4 py-2.5 border-b border-border w-full text-right flex-shrink-0">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <FileImage className="h-4 w-4 text-primary"/>
                            سجل الفحوصات
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                {patient.scans?.length ?? 0}
                            </span>
                        </div>
                        {scansOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>}
                    </button>

                    {/* Collapsible list */}
                    {scansOpen && (
                        <div className="bg-card border-b border-border overflow-y-auto flex-shrink-0" style={{maxHeight:'45%'}}>
                            <ScansList/>
                        </div>
                    )}

                    {/* Scan viewer */}
                    <div className="flex flex-col flex-1 min-h-0 bg-[#050505]">
                        <Toolbar/>
                        <ViewerCanvas className="flex-1"/>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    // DESKTOP layout
    return (
        <AuthenticatedLayout header={`سجل المريض: ${patient.patient_name}`}>
            <Head title={`المريض - ${patient.patient_name}`}/>
            <div className="flex flex-col gap-4 h-[calc(100vh-130px)]" dir="rtl">

                {/* Header bar */}
                <div className="flex items-center gap-4 bg-card p-3 rounded-xl border border-border shadow-sm flex-shrink-0">
                    <Link href={route('patients.index')}>
                        <Button variant="outline" size="sm" className="gap-1.5 h-8">
                            <ArrowRight className="h-4 w-4"/>رجوع لسجل المرضى
                        </Button>
                    </Link>
                    <div className="h-5 w-px bg-border"/>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-base leading-tight truncate">
                            المريض: {patient.patient_name}
                            {patient.doctor_name && (
                                <span className="text-muted-foreground font-normal"> | الطبيب: {patient.doctor_name}</span>
                            )}
                        </p>
                        {(patient.patient_phone || activeScan?.study_date) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {patient.patient_phone && `الهاتف: ${patient.patient_phone}`}
                                {patient.patient_phone && activeScan?.study_date && '  |  '}
                                {activeScan?.study_date && `تاريخ الفحص: ${activeScan.study_date}`}
                            </p>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex gap-4 flex-1 min-h-0">

                    {/* LEFT: scans */}
                    <div className="w-72 flex-shrink-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-border flex-shrink-0">
                            <h2 className="font-bold text-sm flex items-center gap-2">
                                <FileImage className="h-4 w-4 text-primary"/>
                                سجل الفحوصات
                                <span className="mr-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                    {patient.scans?.length ?? 0}
                                </span>
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto"><ScansList/></div>
                    </div>

                    {/* RIGHT: Scan viewer */}
                    <div className="flex-1 bg-[#050505] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-w-0">
                        <Toolbar/>
                        <ViewerCanvas className="flex-1"/>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
