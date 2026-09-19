import { useEffect, useRef, useState, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import {
    ArrowRight, FileImage, Calendar, User, Phone, Stethoscope,
    ZoomIn, ZoomOut, Move, Sun, Ruler, RotateCcw, RotateCw,
    FlipHorizontal, FlipVertical, RefreshCw, Download, Printer,
    Info, Maximize2, Minimize2, SlidersHorizontal
} from 'lucide-react';

// @ts-ignore
import * as cornerstone from 'cornerstone-core';
// @ts-ignore
import * as cornerstoneTools from 'cornerstone-tools';
// @ts-ignore
import * as cornerstoneMath from 'cornerstone-math';
// @ts-ignore
import dicomParser from 'dicom-parser';
// @ts-ignore
import Hammer from 'hammerjs';

// cornerstoneWADOImageLoader is loaded as a classic <script> in app.blade.php
// to avoid Webpack 5's Automatic publicPath error in ES module context
declare const cornerstoneWADOImageLoader: any;

// ── One-time Cornerstone setup ──────────────────────────────────
let _initialized = false;
function ensureInit() {
    if (_initialized) return;
    _initialized = true;
    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.Hammer = Hammer;
    cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    cornerstoneTools.init();
}

const TOOLS = [
    { id: 'Wwwc',   icon: Sun,             label: 'التباين/السطوع',  toolTip: 'Windowing' },
    { id: 'Pan',    icon: Move,            label: 'تحريك',           toolTip: 'Pan' },
    { id: 'Zoom',   icon: ZoomIn,          label: 'تكبير',           toolTip: 'Zoom' },
    { id: 'Length', icon: Ruler,           label: 'قياس',            toolTip: 'Length' },
];

export default function Show({ patient }: any) {
    ensureInit();

    const viewerRef = useRef<HTMLDivElement>(null);
    const [activeTool, setActiveTool]   = useState('Wwwc');
    const [activeScan, setActiveScan]   = useState<any>(patient.scans?.[0] ?? null);
    const [loadError, setLoadError]     = useState<string | null>(null);
    const [loadingDicom, setLoadingDicom] = useState(false);
    const [csEnabled, setCsEnabled]     = useState(false);

    // Enable cornerstone element once
    useEffect(() => {
        const el = viewerRef.current;
        if (!el) return;
        cornerstone.enable(el);
        setCsEnabled(true);

        // Add tools
        try { cornerstoneTools.addTool(cornerstoneTools.WwwcTool); } catch {}
        try { cornerstoneTools.addTool(cornerstoneTools.PanTool); } catch {}
        try { cornerstoneTools.addTool(cornerstoneTools.ZoomTool); } catch {}
        try { cornerstoneTools.addTool(cornerstoneTools.LengthTool); } catch {}
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });

        return () => {
            try { cornerstone.disable(el); } catch {}
        };
    }, []);

    // Load DICOM whenever active scan changes
    useEffect(() => {
        if (!csEnabled || !activeScan?.dicom_url) {
            setLoadError(activeScan && !activeScan.dicom_url ? 'لا يوجد ملف DICOM لهذا الفحص.' : null);
            return;
        }

        const el = viewerRef.current;
        if (!el) return;

        setLoadError(null);
        setLoadingDicom(true);

        const imageId = `wadouri:${activeScan.dicom_url}`;
        cornerstone.loadAndCacheImage(imageId)
            .then((image: any) => {
                cornerstone.displayImage(el, image);
                // Fit to window
                const viewport = cornerstone.getDefaultViewportForImage(el, image);
                cornerstone.setViewport(el, viewport);
                setLoadingDicom(false);
            })
            .catch((err: any) => {
                console.error('DICOM load error:', err);
                setLoadError('تعذّر تحميل صورة DICOM. تأكد من صحة الملف.');
                setLoadingDicom(false);
            });
    }, [activeScan, csEnabled]);

    const selectTool = (toolId: string) => {
        ['Wwwc', 'Pan', 'Zoom', 'Length'].forEach(t => {
            try { cornerstoneTools.setToolPassive(t); } catch {}
        });
        try { cornerstoneTools.setToolActive(toolId, { mouseButtonMask: 1 }); } catch {}
        setActiveTool(toolId);
    };

    const rotateImage = (delta: number) => {
        const el = viewerRef.current;
        if (!el) return;
        try {
            const vp = cornerstone.getViewport(el);
            vp.rotation = (vp.rotation ?? 0) + delta;
            cornerstone.setViewport(el, vp);
        } catch {}
    };

    const flipImage = (axis: 'h' | 'v') => {
        const el = viewerRef.current;
        if (!el) return;
        try {
            const vp = cornerstone.getViewport(el);
            if (axis === 'h') vp.hflip = !vp.hflip;
            else              vp.vflip = !vp.vflip;
            cornerstone.setViewport(el, vp);
        } catch {}
    };

    const invertImage = () => {
        const el = viewerRef.current;
        if (!el) return;
        try {
            const vp = cornerstone.getViewport(el);
            vp.invert = !vp.invert;
            cornerstone.setViewport(el, vp);
        } catch {}
    };

    const resetImage = () => {
        const el = viewerRef.current;
        if (!el) return;
        try {
            const image = cornerstone.getImage(el);
            const vp = cornerstone.getDefaultViewportForImage(el, image);
            cornerstone.setViewport(el, vp);
        } catch {}
    };

    const downloadDicom = () => {
        if (!activeScan?.dicom_url) return;
        const a = document.createElement('a');
        a.href = activeScan.dicom_url;
        a.download = `scan_${activeScan.id}.dcm`;
        a.click();
    };

    const printImage = () => {
        const el = viewerRef.current;
        if (!el) return;
        try {
            const canvas = (el as any).querySelector('canvas');
            if (!canvas) return;
            const dataUrl = canvas.toDataURL('image/png');
            const win = window.open('', '_blank');
            if (!win) return;
            win.document.write(`<img src="${dataUrl}" style="max-width:100%" />`);
            win.document.close();
            win.print();
        } catch {}
    };

    const firstScan = patient.scans?.[0];

    return (
        <AuthenticatedLayout header={`سجل المريض: ${patient.patient_name}`}>
            <Head title={`المريض - ${patient.patient_name}`} />

            <div className="flex flex-col gap-4 h-[calc(100vh-130px)]" dir="rtl">

                {/* ── Top Header Bar ─────────────────────────────── */}
                <div className="flex items-center gap-4 bg-card p-3 rounded-xl border border-border shadow-sm flex-shrink-0">
                    <Link href={route('patients.index')}>
                        <Button variant="outline" size="sm" className="gap-1.5 h-8">
                            <ArrowRight className="h-4 w-4" />
                            رجوع لسجل المرضى
                        </Button>
                    </Link>

                    <div className="h-5 w-px bg-border" />

                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-base leading-tight truncate">
                            المريض: {patient.patient_name}
                            {patient.doctor_name && (
                                <span className="text-muted-foreground font-normal"> | الطبيب: {patient.doctor_name}</span>
                            )}
                        </p>
                        {(patient.patient_phone || activeScan?.study_date) && (
                            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                                {patient.patient_phone && `الهاتف: ${patient.patient_phone}`}
                                {patient.patient_phone && activeScan?.study_date && '  |  '}
                                {activeScan?.study_date && `تاريخ الفحص: ${activeScan.study_date}`}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Main Body ──────────────────────────────────── */}
                <div className="flex gap-4 flex-1 min-h-0">

                    {/* LEFT: Scans / Visits List */}
                    <div className="w-72 flex-shrink-0 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-border flex-shrink-0">
                            <h2 className="font-bold text-sm flex items-center gap-2">
                                <FileImage className="h-4 w-4 text-primary" />
                                سجل الفحوصات
                                <span className="mr-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                    {patient.scans?.length ?? 0}
                                </span>
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {(patient.scans ?? []).length === 0 ? (
                                <div className="text-center text-muted-foreground text-sm py-8">
                                    لا توجد فحوصات مسجّلة
                                </div>
                            ) : (
                                (patient.scans ?? []).map((scan: any) => {
                                    const isActive = activeScan?.id === scan.id;
                                    return (
                                        <button
                                            key={scan.id}
                                            onClick={() => setActiveScan(scan)}
                                            className={`w-full text-right rounded-lg p-3 transition-all border ${
                                                isActive
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-muted/40 hover:bg-muted border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <FileImage className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                                <div className="min-w-0">
                                                    <p className={`font-bold text-xs leading-tight ${isActive ? 'text-primary-foreground' : ''}`}>
                                                        {scan.study_date
                                                            ? `تاريخ الفحص: ${scan.study_date}`
                                                            : 'تاريخ الفحص: غير محدد'}
                                                    </p>
                                                    {scan.doctor_name && (
                                                        <p className={`text-xs mt-0.5 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                            الطبيب: {scan.doctor_name}
                                                        </p>
                                                    )}
                                                    {scan.created_at && (
                                                        <p className={`text-xs mt-0.5 ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                                                            مؤرشف: {new Date(scan.created_at).toLocaleDateString('ar-SA')}
                                                        </p>
                                                    )}
                                                    {!scan.dicom_url && (
                                                        <p className={`text-xs mt-1 ${isActive ? 'text-yellow-200' : 'text-yellow-600'}`}>
                                                            ⚠ لا يوجد ملف DICOM
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT: DICOM Viewer */}
                    <div className="flex-1 bg-[#050505] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-w-0">

                        {/* Toolbar */}
                        <div className="bg-[#1a1a1a] border-b border-[#333] px-3 py-2 flex items-center gap-1 flex-wrap flex-shrink-0">
                            {/* Tool buttons */}
                            {TOOLS.map(tool => (
                                <button
                                    key={tool.id}
                                    title={tool.toolTip}
                                    onClick={() => selectTool(tool.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                                        activeTool === tool.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-[#e0e0e0] hover:bg-white/10'
                                    }`}
                                >
                                    <tool.icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{tool.label}</span>
                                </button>
                            ))}

                            <div className="w-px h-5 bg-[#444] mx-1" />

                            {/* Rotate */}
                            <button title="تدوير لليمين" onClick={() => rotateImage(90)}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <RotateCw className="h-4 w-4" />
                            </button>
                            <button title="تدوير لليسار" onClick={() => rotateImage(-90)}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <RotateCcw className="h-4 w-4" />
                            </button>

                            <div className="w-px h-5 bg-[#444] mx-1" />

                            {/* Flip */}
                            <button title="انعكاس أفقي" onClick={() => flipImage('h')}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <FlipHorizontal className="h-4 w-4" />
                            </button>
                            <button title="انعكاس عمودي" onClick={() => flipImage('v')}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <FlipVertical className="h-4 w-4" />
                            </button>

                            <div className="w-px h-5 bg-[#444] mx-1" />

                            {/* Invert */}
                            <button title="عكس الألوان" onClick={invertImage}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <SlidersHorizontal className="h-4 w-4" />
                            </button>

                            {/* Reset */}
                            <button title="إعادة ضبط" onClick={resetImage}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <RefreshCw className="h-4 w-4" />
                            </button>

                            <div className="w-px h-5 bg-[#444] mx-1" />

                            {/* Print / Download */}
                            <button title="طباعة" onClick={printImage}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <Printer className="h-4 w-4" />
                            </button>
                            <button title="تحميل ملف DICOM" onClick={downloadDicom}
                                className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10 transition-all">
                                <Download className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Viewer Area */}
                        <div className="flex-1 relative overflow-hidden">
                            {/* Cornerstone div – always rendered */}
                            <div
                                ref={viewerRef}
                                className="absolute inset-0 w-full h-full cursor-crosshair"
                                onContextMenu={(e) => e.preventDefault()}
                            />

                            {/* Loading overlay */}
                            {loadingDicom && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                        <p className="text-white text-sm">جاري تحميل صورة DICOM...</p>
                                    </div>
                                </div>
                            )}

                            {/* Error overlay */}
                            {loadError && !loadingDicom && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                                    <div className="text-center text-white/70 px-8">
                                        <FileImage className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-base">{loadError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Empty state (no scan selected or no dicom_url) */}
                            {!activeScan && !loadingDicom && !loadError && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="text-center text-white/40 px-8">
                                        <FileImage className="h-20 w-20 mx-auto mb-4 opacity-20" />
                                        <p className="text-lg">اختر فحصاً من القائمة لعرض الصورة</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
