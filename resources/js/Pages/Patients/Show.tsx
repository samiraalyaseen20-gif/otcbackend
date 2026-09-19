import { useEffect, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import {
    ArrowRight, FileImage, ChevronDown, ChevronUp,
    ZoomIn, Move, Sun, Ruler, RotateCcw, RotateCw,
    FlipHorizontal, FlipVertical, RefreshCw, Download, Printer,
    SlidersHorizontal
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
declare const cornerstoneWADOImageLoader: any;

// ── One-time Cornerstone setup ───────────────────────────────────
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
    { id: 'Wwwc',   label: 'تباين', icon: Sun },
    { id: 'Pan',    label: 'تحريك', icon: Move },
    { id: 'Zoom',   label: 'تكبير', icon: ZoomIn },
    { id: 'Length', label: 'قياس',  icon: Ruler },
];

export default function Show({ patient }: any) {
    ensureInit();

    const viewerRef      = useRef<HTMLDivElement>(null);
    const [activeTool, setActiveTool]     = useState('Wwwc');
    const [activeScan, setActiveScan]     = useState<any>(patient.scans?.[0] ?? null);
    const [loadError, setLoadError]       = useState<string | null>(null);
    const [loadingDicom, setLoadingDicom] = useState(false);
    const [csEnabled, setCsEnabled]       = useState(false);
    const [scansOpen, setScansOpen]       = useState(false);

    // Enable cornerstone once
    useEffect(() => {
        const el = viewerRef.current;
        if (!el) return;
        cornerstone.enable(el);
        setCsEnabled(true);
        try { cornerstoneTools.addTool(cornerstoneTools.WwwcTool); } catch {}
        try { cornerstoneTools.addTool(cornerstoneTools.PanTool); } catch {}
        try { cornerstoneTools.addTool(cornerstoneTools.ZoomTool); } catch {}
        try { cornerstoneTools.addTool(cornerstoneTools.LengthTool); } catch {}
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        return () => { try { cornerstone.disable(el); } catch {} };
    }, []);

    // Load DICOM on scan change
    useEffect(() => {
        if (!csEnabled || !activeScan?.dicom_url) {
            setLoadError(activeScan && !activeScan.dicom_url ? 'لا يوجد ملف DICOM لهذا الفحص.' : null);
            return;
        }
        if (!viewerRef.current) return;
        setLoadError(null);
        setLoadingDicom(true);

        const imageId = `wadouri:${activeScan.dicom_url}`;

        cornerstone.loadAndCacheImage(imageId)
            .then((image: any) => {
                // Always use live ref — captured el can be stale after Inertia page swap
                const liveEl = viewerRef.current;
                if (!liveEl) return;
                // Re-enable if element was unmounted during React re-render
                try { cornerstone.getEnabledElement(liveEl); }
                catch { cornerstone.enable(liveEl); }
                cornerstone.displayImage(liveEl, image);
                cornerstone.setViewport(liveEl, cornerstone.getDefaultViewportForImage(liveEl, image));
                setLoadingDicom(false);
            })
            .catch((err: any) => {
                console.error('[DICOM] Load FAILED:', err?.message ?? err);
                setLoadError('تعذّر تحميل صورة DICOM.');
                setLoadingDicom(false);
            });
    }, [activeScan, csEnabled]);

    const selectTool = (toolId: string) => {
        ['Wwwc', 'Pan', 'Zoom', 'Length'].forEach(t => { try { cornerstoneTools.setToolPassive(t); } catch {} });
        try { cornerstoneTools.setToolActive(toolId, { mouseButtonMask: 1 }); } catch {}
        setActiveTool(toolId);
    };

    const getVp   = () => { const el = viewerRef.current; if (!el) return null; try { return cornerstone.getViewport(el); } catch { return null; } };
    const setVp   = (v: any) => { const el = viewerRef.current; if (!el) return; try { cornerstone.setViewport(el, v); } catch {} };
    const rotate  = (d: number) => { const v = getVp(); if (!v) return; v.rotation = (v.rotation ?? 0) + d; setVp(v); };
    const flip    = (a: 'h' | 'v') => { const v = getVp(); if (!v) return; if (a === 'h') v.hflip = !v.hflip; else v.vflip = !v.vflip; setVp(v); };
    const invert  = () => { const v = getVp(); if (!v) return; v.invert = !v.invert; setVp(v); };
    const reset   = () => { const el = viewerRef.current; if (!el) return; try { const im = cornerstone.getImage(el); setVp(cornerstone.getDefaultViewportForImage(el, im)); } catch {} };
    const dlFile  = () => { if (!activeScan?.dicom_url) return; const a = document.createElement('a'); a.href = activeScan.dicom_url; a.download = `scan_${activeScan.id}.dcm`; a.click(); };
    const doPrint = () => {
        const el = viewerRef.current; if (!el) return;
        const canvas = (el as any).querySelector('canvas'); if (!canvas) return;
        const w = window.open('', '_blank'); if (!w) return;
        w.document.write(`<img src="${canvas.toDataURL('image/png')}" style="max-width:100%"/>`);
        w.document.close(); w.print();
    };

    const handleScanSelect = (scan: any) => {
        setActiveScan(scan);
        setScansOpen(false);
    };

    // ── Shared toolbar ───────────────────────────────────────────
    const Toolbar = () => (
        <div className="bg-[#1a1a1a] border-b border-[#333] px-2 py-2 overflow-x-auto flex-shrink-0">
            <div className="flex items-center gap-1 min-w-max">
                {TOOLS.map(tool => (
                    <button key={tool.id} title={tool.label} onClick={() => selectTool(tool.id)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                            activeTool === tool.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-[#e0e0e0] hover:bg-white/10'
                        }`}>
                        <tool.icon className="h-4 w-4" /><span>{tool.label}</span>
                    </button>
                ))}
                <div className="w-px h-5 bg-[#444] mx-1" />
                <button onClick={() => rotate(90)}   title="تدوير يمين"   className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RotateCw className="h-4 w-4" /></button>
                <button onClick={() => rotate(-90)}  title="تدوير يسار"   className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>
                <button onClick={() => flip('h')}    title="انعكاس أفقي"  className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><FlipHorizontal className="h-4 w-4" /></button>
                <button onClick={() => flip('v')}    title="انعكاس عمودي" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><FlipVertical className="h-4 w-4" /></button>
                <div className="w-px h-5 bg-[#444] mx-1" />
                <button onClick={invert}  title="عكس الألوان" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><SlidersHorizontal className="h-4 w-4" /></button>
                <button onClick={reset}   title="إعادة ضبط"   className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RefreshCw className="h-4 w-4" /></button>
                <button onClick={doPrint} title="طباعة"        className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><Printer className="h-4 w-4" /></button>
                <button onClick={dlFile}  title="تحميل"        className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><Download className="h-4 w-4" /></button>
            </div>
        </div>
    );

    // ── Shared viewer canvas ──────────────────────────────────────
    const ViewerCanvas = () => (
        <div className="flex-1 relative overflow-hidden min-h-0">
            <div ref={viewerRef} className="absolute inset-0 w-full h-full cursor-crosshair"
                onContextMenu={e => e.preventDefault()} />
            {loadingDicom && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <p className="text-white text-sm">جاري تحميل DICOM...</p>
                    </div>
                </div>
            )}
            {loadError && !loadingDicom && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <div className="text-center text-white/70 px-6">
                        <FileImage className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">{loadError}</p>
                    </div>
                </div>
            )}
            {!activeScan && !loadingDicom && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center text-white/40 px-6">
                        <FileImage className="h-16 w-16 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">اختر فحصاً من القائمة</p>
                    </div>
                </div>
            )}
        </div>
    );

    // ── Scans list content ────────────────────────────────────────
    const ScansList = () => (
        <div className="space-y-2 p-3">
            {(patient.scans ?? []).length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">لا توجد فحوصات</p>
            ) : (patient.scans ?? []).map((scan: any) => {
                const isActive = activeScan?.id === scan.id;
                return (
                    <button key={scan.id} onClick={() => handleScanSelect(scan)}
                        className={`w-full text-right rounded-lg p-3 transition-all border ${
                            isActive
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/40 hover:bg-muted border-transparent'
                        }`}>
                        <div className="flex items-start gap-2">
                            <FileImage className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                            <div className="min-w-0">
                                <p className="font-bold text-xs leading-tight">
                                    {scan.study_date ? `تاريخ الفحص: ${scan.study_date}` : 'تاريخ غير محدد'}
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
                                    <p className={`text-xs mt-1 ${isActive ? 'text-yellow-200' : 'text-yellow-600'}`}>⚠ لا يوجد ملف DICOM</p>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );

    return (
        <AuthenticatedLayout header={`سجل المريض: ${patient.patient_name}`}>
            <Head title={`المريض - ${patient.patient_name}`} />

            {/* ════════════════════════════════════════════════════
                MOBILE  (< md)
                — negative margin to escape the p-4 padding of <main>
                — full viewport height minus the top navbar (h-14 = 56px)
            ════════════════════════════════════════════════════ */}
            <div className="md:hidden -mx-4 -mt-4 -mb-24" dir="rtl"
                 style={{ height: 'calc(100dvh - 56px)' }}>

                <div className="flex flex-col h-full">

                    {/* ─ Back bar ─ */}
                    <div className="flex items-center gap-3 bg-card px-3 py-2.5 border-b border-border flex-shrink-0">
                        <Link href={route('patients.index')}>
                            <Button variant="outline" size="sm" className="gap-1 h-8 px-2.5">
                                <ArrowRight className="h-4 w-4" />
                                رجوع
                            </Button>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight truncate">{patient.patient_name}</p>
                            {patient.doctor_name && (
                                <p className="text-xs text-muted-foreground truncate">الطبيب: {patient.doctor_name}</p>
                            )}
                        </div>
                    </div>

                    {/* ─ Scans toggle ─ */}
                    <button onClick={() => setScansOpen(o => !o)}
                        className="flex items-center justify-between bg-card px-4 py-2.5 border-b border-border w-full text-right flex-shrink-0">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <FileImage className="h-4 w-4 text-primary" />
                            سجل الفحوصات
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                {patient.scans?.length ?? 0}
                            </span>
                            {activeScan && (
                                <span className="text-xs text-muted-foreground font-normal hidden xs:inline">
                                    | {activeScan.study_date ?? 'بدون تاريخ'}
                                </span>
                            )}
                        </div>
                        {scansOpen
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {/* ─ Collapsible scans list (max-h so viewer stays visible) ─ */}
                    {scansOpen && (
                        <div className="bg-card border-b border-border overflow-y-auto flex-shrink-0"
                             style={{ maxHeight: '45%' }}>
                            <ScansList />
                        </div>
                    )}

                    {/* ─ DICOM viewer — fills ALL remaining space ─ */}
                    <div className="flex flex-col flex-1 min-h-0 bg-[#050505]">
                        <Toolbar />
                        <ViewerCanvas />
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                DESKTOP  (≥ md)
            ════════════════════════════════════════════════════ */}
            <div className="hidden md:flex flex-col gap-4 h-[calc(100vh-130px)]" dir="rtl">

                {/* Top Header */}
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

                    {/* LEFT: Scans */}
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
                        <div className="flex-1 overflow-y-auto">
                            <ScansList />
                        </div>
                    </div>

                    {/* RIGHT: DICOM Viewer */}
                    <div className="flex-1 bg-[#050505] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-w-0">
                        <Toolbar />
                        <ViewerCanvas />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
