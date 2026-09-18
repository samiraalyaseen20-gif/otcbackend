import { useEffect, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Move, ZoomIn, SunMedium, Ruler, CircleEqual } from 'lucide-react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneMath from 'cornerstone-math';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import Hammer from 'hammerjs';

// Setup Cornerstone and CornerstoneTools
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// Initialize CornerstoneTools
cornerstoneTools.init();

export default function Show({ patient }: any) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [activeTool, setActiveTool] = useState('Wwwc');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!viewerRef.current || !patient.dicom_url) {
            if (!patient.dicom_url) setError('لا يوجد ملف DICOM متاح لهذا المريض.');
            return;
        }

        const element = viewerRef.current;
        cornerstone.enable(element);

        // Add Tools
        const WwwcTool = cornerstoneTools.WwwcTool;
        const PanTool = cornerstoneTools.PanTool;
        const ZoomTool = cornerstoneTools.ZoomTool;
        const LengthTool = cornerstoneTools.LengthTool;
        const AngleTool = cornerstoneTools.AngleTool;

        cornerstoneTools.addTool(WwwcTool);
        cornerstoneTools.addTool(PanTool);
        cornerstoneTools.addTool(ZoomTool);
        cornerstoneTools.addTool(LengthTool);
        cornerstoneTools.addTool(AngleTool);

        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });

        // Load image
        const imageId = `wadouri:${patient.dicom_url}`;

        cornerstone.loadImage(imageId).then((image: any) => {
            cornerstone.displayImage(element, image);
        }).catch((err: any) => {
            console.error('Error loading DICOM:', err);
            setError('تعذر تحميل ملف DICOM. قد يكون الملف تالفاً أو المسار غير صحيح.');
        });

        return () => {
            cornerstone.disable(element);
        };
    }, [patient.dicom_url]);

    const handleToolSelect = (toolName: string) => {
        // Deactivate all
        ['Wwwc', 'Pan', 'Zoom', 'Length', 'Angle'].forEach(tool => {
            cornerstoneTools.setToolPassive(tool);
        });

        // Activate selected
        cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
        setActiveTool(toolName);
    };

    return (
        <AuthenticatedLayout header={`تفاصيل المريض: ${patient.patient_name}`}>
            <Head title={`المريض - ${patient.patient_name}`} />

            <div className="space-y-6" dir="rtl">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link href={route('patients.index')}>
                            <Button variant="outline" size="icon" className="h-9 w-9 border-primary/30 text-primary hover:bg-primary/5">
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                {patient.patient_name}
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                                العمر: {patient.age} | الجنس: {patient.gender} | الطبيب: {patient.referring_doctor || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {error ? (
                    <Card className="border-destructive/50 bg-destructive/5">
                        <CardContent className="pt-6 text-center text-destructive">
                            {error}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Tools Sidebar */}
                        <div className="lg:col-span-1 space-y-4">
                            <Card className="h-full">
                                <CardHeader className="pb-3 border-b border-border">
                                    <CardTitle className="text-sm font-bold">أدوات العرض (Viewer Tools)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 flex flex-col gap-2">
                                    <Button
                                        variant={activeTool === 'Wwwc' ? 'default' : 'outline'}
                                        className="justify-start gap-2"
                                        onClick={() => handleToolSelect('Wwwc')}
                                    >
                                        <SunMedium className="h-4 w-4" />
                                        الإضاءة والتباين (Window/Level)
                                    </Button>
                                    <Button
                                        variant={activeTool === 'Pan' ? 'default' : 'outline'}
                                        className="justify-start gap-2"
                                        onClick={() => handleToolSelect('Pan')}
                                    >
                                        <Move className="h-4 w-4" />
                                        تحريك (Pan)
                                    </Button>
                                    <Button
                                        variant={activeTool === 'Zoom' ? 'default' : 'outline'}
                                        className="justify-start gap-2"
                                        onClick={() => handleToolSelect('Zoom')}
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                        تكبير / تصغير (Zoom)
                                    </Button>
                                    <Button
                                        variant={activeTool === 'Length' ? 'default' : 'outline'}
                                        className="justify-start gap-2"
                                        onClick={() => handleToolSelect('Length')}
                                    >
                                        <Ruler className="h-4 w-4" />
                                        قياس الطول (Ruler)
                                    </Button>
                                    <Button
                                        variant={activeTool === 'Angle' ? 'default' : 'outline'}
                                        className="justify-start gap-2"
                                        onClick={() => handleToolSelect('Angle')}
                                    >
                                        <CircleEqual className="h-4 w-4" />
                                        قياس الزاوية (Angle)
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Viewer Area */}
                        <div className="lg:col-span-3">
                            <Card className="h-[600px] bg-black flex flex-col">
                                <CardContent className="p-0 flex-1 relative">
                                    <div 
                                        ref={viewerRef}
                                        className="w-full h-full rounded cursor-crosshair overflow-hidden"
                                        onContextMenu={(e) => e.preventDefault()}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
