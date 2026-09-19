import { useEffect, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import {
    ArrowRight, FileImage, ChevronDown, ChevronUp,
    Move, Sun, Ruler, RotateCw,
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
    const [dwvApp, setDwvApp] = useState<App | null>(null);
    const [activeTool, setActiveTool] = useState('WindowLevel');
    const [activeScan, setActiveScan] = useState<any>(patient.scans?.[0] ?? null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadingDicom, setLoadingDicom] = useState(false);
    const [isInverted, setIsInverted] = useState(false);
    const [scansOpen, setScansOpen] = useState(false);
    const [useFallback, setUseFallback] = useState(false);

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

    // Canvas DICOM Fallback Renderer using dicom-parser
    const renderFallback = async (url: string) => {
        const canvas = fallbackCanvasRef.current;
        if (!canvas) return false;
        try {
            const res = await fetch(url);
            if (!res.ok) return false;
            const arrayBuffer = await res.arrayBuffer();
            const byteArray = new Uint8Array(arrayBuffer);
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

    // Initialize DWV App
    useEffect(() => {
        const layerDiv = document.getElementById('layerGroup0');
        if (!layerDiv) return;

        layerDiv.innerHTML = '';

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
            setLoadingDicom(true);
            setLoadError(null);
            setUseFallback(false);
        });

        app.addEventListener('loadend', () => {
            setLoadingDicom(false);
            try {
                app.fitToContainer();
                app.initWLDisplay();

                // Auto-calculate Window Center & Width if needed
                const dataIds = app.getDataIds();
                if (dataIds && dataIds.length > 0) {
                    const dataId = dataIds[0];
                    const dataObj: any = app.getData(dataId);
                    const img: any = (app as any).getImage ? (app as any).getImage(dataId) : dataObj?.getImage?.();
                    if (img && typeof img.getValueRange === 'function') {
                        const range = img.getValueRange();
                        if (range && typeof range.min === 'number' && typeof range.max === 'number' && range.max > range.min) {
                            const width = range.max - range.min;
                            const center = range.min + width / 2;
                            const lg: any = app.getActiveLayerGroup();
                            const vc = lg?.getActiveViewLayer?.()?.getViewController?.() || lg?.getViewController?.();
                            if (vc && typeof vc.setWindowLevel === 'function') {
                                vc.setWindowLevel(new WindowLevel(center, width));
                            }
                        }
                    }
                }

                app.setTool('WindowLevel');
                setActiveTool('WindowLevel');
            } catch (e) {
                console.error('[DWV loadend error]', e);
            }
        });

        const handleResize = () => {
            try { app.fitToContainer(); } catch {}
        };
        window.addEventListener('resize', handleResize);

        app.addEventListener('error', (event: any) => {
            console.error('[DWV ERROR - trying Canvas Fallback]', event);
            if (activeScan?.dicom_url) {
                renderFallback(activeScan.dicom_url).then((success) => {
                    setLoadingDicom(false);
                    if (success) {
                        setUseFallback(true);
                    } else {
                        setLoadError('تعذّر عرض صورة DICOM.');
                    }
                });
            } else {
                setLoadingDicom(false);
                setLoadError('تعذّر عرض صورة DICOM.');
            }
        });

        setDwvApp(app);

        return () => {
            window.removeEventListener('resize', handleResize);
            try { app.reset(); } catch {}
            setDwvApp(null);
        };
    }, [isMobile]);

    // Load activeScan URL
    useEffect(() => {
        if (!activeScan?.dicom_url) {
            if (activeScan && !activeScan.dicom_url) {
                setLoadError('لا يوجد ملف DICOM لهذا الفحص.');
            }
            return;
        }

        setLoadingDicom(true);
        setLoadError(null);
        setUseFallback(false);

        if (dwvApp) {
            try {
                dwvApp.loadURLs([activeScan.dicom_url]);
            } catch (err: any) {
                console.error('[DWV Load Error - trying Canvas Fallback]', err);
                renderFallback(activeScan.dicom_url).then((success) => {
                    setLoadingDicom(false);
                    if (success) {
                        setUseFallback(true);
                    } else {
                        setLoadError('خطأ أثناء تشغيل الفحص.');
                    }
                });
            }
        } else {
            renderFallback(activeScan.dicom_url).then((success) => {
                setLoadingDicom(false);
                if (success) {
                    setUseFallback(true);
                } else {
                    setLoadError('خطأ أثناء تشغيل الفحص.');
                }
            });
        }
    }, [activeScan, dwvApp]);

    const selectTool = (toolId: string) => {
        if (!dwvApp) return;
        try {
            dwvApp.setTool(toolId);
            setActiveTool(toolId);
        } catch {}
    };

    const rotate = (angle: number) => {
        if (!dwvApp) return;
        try {
            const lg: any = dwvApp.getActiveLayerGroup();
            const vc = lg?.getActiveViewLayer?.()?.getViewController?.() || lg?.getViewController?.();
            if (vc && typeof vc.rotate === 'function') {
                vc.rotate(angle);
            }
        } catch {}
    };

    const toggleInvert = () => {
        if (!dwvApp) return;
        try {
            const lg: any = dwvApp.getActiveLayerGroup();
            const vc = lg?.getActiveViewLayer?.()?.getViewController?.() || lg?.getViewController?.();
            if (vc && typeof vc.setInvert === 'function') {
                const newInvert = !isInverted;
                vc.setInvert(newInvert);
                setIsInverted(newInvert);
            }
        } catch {}
    };

    const reset = () => {
        if (dwvApp) {
            try {
                dwvApp.resetZoomPan();
                dwvApp.resetLayout();
                dwvApp.initWLDisplay();
                setIsInverted(false);
            } catch {}
        }
        if (activeScan?.dicom_url && useFallback) {
            renderFallback(activeScan.dicom_url);
        }
    };

    const dlFile = () => {
        if (!activeScan?.dicom_url) return;
        const a = document.createElement('a');
        a.href = activeScan.dicom_url;
        a.download = `scan_${activeScan.id}.dcm`;
        a.click();
    };

    const doPrint = () => {
        const container = containerRef.current;
        if (!container) return;
        const canvas = container.querySelector('canvas') || fallbackCanvasRef.current;
        if (!canvas) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<img src="${canvas.toDataURL('image/png')}" style="max-width:100%"/>`);
        w.document.close();
        w.print();
    };

    const handleScanSelect = (scan: any) => {
        setActiveScan(scan);
        setScansOpen(false);
    };

    // Toolbar
    const Toolbar = () => (
        <div className="bg-[#1a1a1a] border-b border-[#333] px-2 py-2 overflow-x-auto flex-shrink-0">
            <div className="flex items-center gap-1 min-w-max">
                {TOOLS.map(T => (
                    <button key={T.id} title={T.label} onClick={() => selectTool(T.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                            activeTool===T.id ? 'bg-primary text-primary-foreground' : 'text-[#e0e0e0] hover:bg-white/10'
                        }`}>
                        <T.icon className="h-4 w-4"/><span>{T.label}</span>
                    </button>
                ))}
                <div className="w-px h-5 bg-[#444] mx-1"/>
                <button onClick={()=>rotate(90)}   className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="تدوير يمين"><RotateCw className="h-4 w-4"/></button>
                <button onClick={toggleInvert} className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="عكس الألوان"><SlidersHorizontal className="h-4 w-4"/></button>
                <button onClick={reset}        className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="إعادة ضبط"><RefreshCw className="h-4 w-4"/></button>
                <button onClick={doPrint}      className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="طباعة"><Printer className="h-4 w-4"/></button>
                <button onClick={dlFile}       className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10" title="تحميل"><Download className="h-4 w-4"/></button>
            </div>
        </div>
    );

    // Viewer Canvas Wrapper
    const ViewerCanvas = ({ className = '' }: { className?: string }) => (
        <div ref={containerRef} className={`relative overflow-hidden min-h-0 flex-1 flex items-center justify-center bg-black ${className}`}>
            <div id="layerGroup0" className={`layerGroup absolute inset-0 w-full h-full flex items-center justify-center cursor-crosshair overflow-hidden ${useFallback ? 'hidden' : ''}`}
                onContextMenu={e=>e.preventDefault()}/>

            <canvas ref={fallbackCanvasRef} className={`max-w-full max-h-full object-contain ${useFallback ? 'block' : 'hidden'}`} />

            {loadingDicom && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 pointer-events-none">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
                        <p className="text-white text-sm">جاري تشغيل صورة DICOM...</p>
                    </div>
                </div>
            )}
            {loadError && !loadingDicom && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 pointer-events-none">
                    <div className="text-center text-white/70 px-6">
                        <FileImage className="h-12 w-12 mx-auto mb-3 opacity-20"/>
                        <p className="text-sm">{loadError}</p>
                    </div>
                </div>
            )}
            {!activeScan && !loadingDicom && !loadError && (
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
                                    <p className={`text-xs mt-1 ${isActive?'text-yellow-200':'text-yellow-600'}`}>⚠ لا يوجد ملف DICOM</p>
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

                    {/* DICOM viewer */}
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

                    {/* RIGHT: DICOM viewer */}
                    <div className="flex-1 bg-[#050505] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-w-0">
                        <Toolbar/>
                        <ViewerCanvas className="flex-1"/>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
