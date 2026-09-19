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
    const [activeTool, setActiveTool]       = useState('Wwwc');
    const [activeScan, setActiveScan]       = useState<any>(patient.scans?.[0] ?? null);
    const [loadError, setLoadError]         = useState<string | null>(null);
    const [loadingDicom, setLoadingDicom]   = useState(false);
    const [csEnabled, setCsEnabled]         = useState(false);
    const [scansOpen, setScansOpen]         = useState(false);   // mobile panel toggle

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
        const el = viewerRef.current;
        if (!el) return;
        setLoadError(null);
        setLoadingDicom(true);
        cornerstone.loadAndCacheImage(`wadouri:${activeScan.dicom_url}`)
            .then((image: any) => {
                cornerstone.displayImage(el, image);
                cornerstone.setViewport(el, cornerstone.getDefaultViewportForImage(el, image));
                setLoadingDicom(false);
            })
            .catch(() => {
                setLoadError('تعذّر تحميل صورة DICOM.');
                setLoadingDicom(false);
            });
    }, [activeScan, csEnabled]);

    const selectTool = (toolId: string) => {
        ['Wwwc', 'Pan', 'Zoom', 'Length'].forEach(t => { try { cornerstoneTools.setToolPassive(t); } catch {} });
        try { cornerstoneTools.setToolActive(toolId, { mouseButtonMask: 1 }); } catch {}
        setActiveTool(toolId);
    };

    const vp = () => { const el = viewerRef.current; if (!el) return null; try { return cornerstone.getViewport(el); } catch { return null; } };
    const setVp = (v: any) => { const el = viewerRef.current; if (!el) return; try { cornerstone.setViewport(el, v); } catch {} };

    const rotate  = (d: number) => { const v = vp(); if (!v) return; v.rotation = (v.rotation ?? 0) + d; setVp(v); };
    const flip    = (a: 'h'|'v') => { const v = vp(); if (!v) return; if (a==='h') v.hflip=!v.hflip; else v.vflip=!v.vflip; setVp(v); };
    const invert  = () => { const v = vp(); if (!v) return; v.invert=!v.invert; setVp(v); };
    const reset   = () => { const el = viewerRef.current; if (!el) return; try { const im=cornerstone.getImage(el); setVp(cornerstone.getDefaultViewportForImage(el,im)); } catch {} };
    const download = () => { if (!activeScan?.dicom_url) return; const a=document.createElement('a'); a.href=activeScan.dicom_url; a.download=`scan_${activeScan.id}.dcm`; a.click(); };
    const print    = () => {
        const el = viewerRef.current; if (!el) return;
        const canvas = (el as any).querySelector('canvas'); if (!canvas) return;
        const w = window.open('','_blank'); if (!w) return;
        w.document.write(`<img src="${canvas.toDataURL('image/png')}" style="max-width:100%"/>`);
        w.document.close(); w.print();
    };

    const handleScanSelect = (scan: any) => {
        setActiveScan(scan);
        setScansOpen(false);   // auto-close on mobile after pick
    };

    const ScansListContent = () => (
        <div className="space-y-2 p-3">
            {(patient.scans ?? []).length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">لا توجد فحوصات</p>
            ) : (patient.scans ?? []).map((scan: any) => {
                const isActive = activeScan?.id === scan.id;
                return (
                    <button
                        key={scan.id}
                        onClick={() => handleScanSelect(scan)}
                        className={`w-full text-right rounded-lg p-3 transition-all border ${
                            isActive
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/40 hover:bg-muted border-transparent'
                        }`}
                    >
                        <div className="flex items-start gap-2">
                            <FileImage className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                            <div className="min-w-0">
                                <p className={`font-bold text-xs leading-tight ${isActive ? '' : ''}`}>
                                    {scan.study_date ? `تاريخ الفحص: ${scan.study_date}` : 'تاريخ الفحص: غير محدد'}
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
            })}
        </div>
    );

    return (
        <AuthenticatedLayout header={`سجل المريض: ${patient.patient_name}`}>
            <Head title={`المريض - ${patient.patient_name}`} />

            {/* ── MOBILE layout ─────────────────────────────────── */}
            <div className="flex flex-col gap-3 md:hidden" dir="rtl">

                {/* Back + Patient info */}
                <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
                    <Link href={route('patients.index')}>
                        <Button variant="outline" size="sm" className="gap-1 h-8 px-2">
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight truncate">{patient.patient_name}</p>
                        {patient.doctor_name && (
                            <p className="text-xs text-muted-foreground leading-tight truncate">الطبيب: {patient.doctor_name}</p>
                        )}
                    </div>
                </div>

                {/* Scans toggle */}
                <button
                    onClick={() => setScansOpen(o => !o)}
                    className="flex items-center justify-between bg-card px-4 py-3 rounded-xl border border-border shadow-sm w-full text-right"
                >
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <FileImage className="h-4 w-4 text-primary" />
                        سجل الفحوصات
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {patient.scans?.length ?? 0}
                        </span>
                        {activeScan && (
                            <span className="text-xs text-muted-foreground font-normal">
                                | محدد: {activeScan.study_date ?? 'بدون تاريخ'}
                            </span>
                        )}
                    </div>
                    {scansOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Collapsible scans list */}
                {scansOpen && (
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <ScansListContent />
                    </div>
                )}

                {/* DICOM Viewer (mobile) */}
                <div className="bg-[#050505] rounded-xl border border-border shadow-sm overflow-hidden">
                    {/* Toolbar (scrollable on mobile) */}
                    <div className="bg-[#1a1a1a] border-b border-[#333] px-2 py-2 overflow-x-auto">
                        <div className="flex items-center gap-1 min-w-max">
                            {TOOLS.map(tool => (
                                <button key={tool.id} title={tool.label}
                                    onClick={() => selectTool(tool.id)}
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                                        activeTool === tool.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-[#e0e0e0] hover:bg-white/10'
                                    }`}>
                                    <tool.icon className="h-4 w-4" />
                                    <span>{tool.label}</span>
                                </button>
                            ))}
                            <div className="w-px h-5 bg-[#444] mx-1" />
                            <button onClick={() => rotate(90)}  title="تدوير يمين" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RotateCw   className="h-4 w-4" /></button>
                            <button onClick={() => rotate(-90)} title="تدوير يسار" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RotateCcw  className="h-4 w-4" /></button>
                            <button onClick={() => flip('h')}   title="انعكاس أفقي" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><FlipHorizontal className="h-4 w-4" /></button>
                            <button onClick={() => flip('v')}   title="انعكاس عمودي" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><FlipVertical   className="h-4 w-4" /></button>
                            <div className="w-px h-5 bg-[#444] mx-1" />
                            <button onClick={invert}   title="عكس الألوان" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><SlidersHorizontal className="h-4 w-4" /></button>
                            <button onClick={reset}    title="إعادة ضبط"   className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RefreshCw className="h-4 w-4" /></button>
                            <button onClick={print}    title="طباعة"        className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><Printer   className="h-4 w-4" /></button>
                            <button onClick={download} title="تحميل"        className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><Download  className="h-4 w-4" /></button>
                        </div>
                    </div>

                    {/* Viewer */}
                    <div className="relative" style={{ height: '60vw', minHeight: '280px', maxHeight: '480px' }}>
                        <div ref={viewerRef} className="absolute inset-0 w-full h-full cursor-crosshair"
                            onContextMenu={e => e.preventDefault()} />
                        {loadingDicom && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
                                    <FileImage className="h-14 w-14 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">اختر فحصاً من القائمة أعلاه</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── DESKTOP layout ────────────────────────────────── */}
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

                {/* Main body */}
                <div className="flex gap-4 flex-1 min-h-0">

                    {/* LEFT: Scans List */}
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
                            <ScansListContent />
                        </div>
                    </div>

                    {/* RIGHT: DICOM Viewer */}
                    <div className="flex-1 bg-[#050505] rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-w-0">

                        {/* Toolbar */}
                        <div className="bg-[#1a1a1a] border-b border-[#333] px-3 py-2 flex items-center gap-1 flex-wrap flex-shrink-0">
                            {TOOLS.map(tool => (
                                <button key={tool.id} title={tool.id}
                                    onClick={() => selectTool(tool.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                                        activeTool === tool.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-[#e0e0e0] hover:bg-white/10'
                                    }`}>
                                    <tool.icon className="h-4 w-4" />
                                    <span>{tool.label}</span>
                                </button>
                            ))}
                            <div className="w-px h-5 bg-[#444] mx-1" />
                            <button onClick={() => rotate(90)}  title="تدوير يمين"  className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RotateCw   className="h-4 w-4" /></button>
                            <button onClick={() => rotate(-90)} title="تدوير يسار"  className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RotateCcw  className="h-4 w-4" /></button>
                            <button onClick={() => flip('h')}   title="انعكاس أفقي" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><FlipHorizontal className="h-4 w-4" /></button>
                            <button onClick={() => flip('v')}   title="انعكاس عمودي" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><FlipVertical   className="h-4 w-4" /></button>
                            <div className="w-px h-5 bg-[#444] mx-1" />
                            <button onClick={invert}   title="عكس الألوان" className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><SlidersHorizontal className="h-4 w-4" /></button>
                            <button onClick={reset}    title="إعادة ضبط"   className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><RefreshCw className="h-4 w-4" /></button>
                            <button onClick={print}    title="طباعة"        className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><Printer   className="h-4 w-4" /></button>
                            <button onClick={download} title="تحميل"        className="p-1.5 rounded text-[#e0e0e0] hover:bg-white/10"><Download  className="h-4 w-4" /></button>
                        </div>

                        {/* Viewer area */}
                        <div className="flex-1 relative overflow-hidden">
                            <div ref={viewerRef} className="absolute inset-0 w-full h-full cursor-crosshair"
                                onContextMenu={e => e.preventDefault()} />
                            {loadingDicom && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                        <p className="text-white text-sm">جاري تحميل صورة DICOM...</p>
                                    </div>
                                </div>
                            )}
                            {loadError && !loadingDicom && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                                    <div className="text-center text-white/70 px-8">
                                        <FileImage className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-base">{loadError}</p>
                                    </div>
                                </div>
                            )}
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
