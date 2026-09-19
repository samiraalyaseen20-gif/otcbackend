import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table';
import {
    Search, RefreshCw, Users, ChevronRight, ChevronLeft,
    ChevronsRight, ChevronsLeft, Eye, FileImage, Phone, Stethoscope, Calendar
} from 'lucide-react';

export default function Index({ patients, filters }: any) {
    const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');

    const doSearch = () => {
        router.get(route('patients.index'), { search: searchTerm }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') doSearch();
    };

    const goToPage = (page: number) => {
        router.get(route('patients.index'), { search: searchTerm, page }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const { data, current_page, last_page, from, to, total, per_page } = patients;

    return (
        <AuthenticatedLayout header="سجل المرضى">
            <Head title="سجل المرضى" />

            <div className="space-y-4" dir="rtl">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            سجل المرضى
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
                            ابحث عن مريض أو اضغط «عرض السجل» لفتح الملف الطبي وفحوصات الـ DICOM
                        </p>
                    </div>

                    {/* Search + Refresh */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="search-patients"
                                placeholder="بحث بالاسم أو الهاتف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pr-9 h-9 text-sm w-full sm:w-72"
                            />
                        </div>
                        <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={doSearch}>
                            <Search className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">بحث</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-9 gap-1.5 shrink-0"
                            onClick={() => router.get(route('patients.index'))}
                            title="تحديث"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">تحديث</span>
                        </Button>
                    </div>
                </div>

                {/* ── DESKTOP: Table ──────────────────────────────────── */}
                <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table dir="rtl" className="text-right">
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="text-right font-bold text-xs w-[50px]">#</TableHead>
                                    <TableHead className="text-right font-bold text-xs">اسم المريض</TableHead>
                                    <TableHead className="text-right font-bold text-xs">رقم الهاتف</TableHead>
                                    <TableHead className="text-right font-bold text-xs">اسم الطبيب</TableHead>
                                    <TableHead className="text-right font-bold text-xs">تاريخ الإضافة</TableHead>
                                    <TableHead className="text-right font-bold text-xs">الفحوصات</TableHead>
                                    <TableHead className="text-center font-bold text-xs w-[140px]">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <Users className="h-10 w-10 opacity-20" />
                                                <p className="text-sm">لا يوجد مرضى مطابقون للبحث</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((patient: any, index: number) => (
                                        <TableRow key={patient.patient_id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium text-xs text-muted-foreground">
                                                {(current_page - 1) * per_page + index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                                        <Users className="h-4 w-4 text-primary-foreground" />
                                                    </div>
                                                    <span className="font-bold text-sm">{patient.patient_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs" dir="ltr">{patient.patient_phone || '-'}</TableCell>
                                            <TableCell className="text-xs">{patient.doctor_name || '-'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {patient.latest_created_at
                                                    ? new Date(patient.latest_created_at).toLocaleDateString('ar-SA')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                    <FileImage className="h-3 w-3" />
                                                    {patient.scans_count}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Link href={route('patients.show', patient.patient_id)}>
                                                    <Button variant="default" size="sm" className="h-7 px-2.5 text-xs gap-1">
                                                        <Eye className="h-3.5 w-3.5" />
                                                        عرض السجل
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Desktop Pagination */}
                    {last_page > 1 && (
                        <div className="border-t border-border px-4 py-3 bg-muted/20">
                            <PaginationBar
                                currentPage={current_page}
                                lastPage={last_page}
                                from={from} to={to} total={total}
                                onGoTo={goToPage}
                            />
                        </div>
                    )}
                </div>

                {/* ── MOBILE: Cards ──────────────────────────────────── */}
                <div className="md:hidden space-y-3">
                    {data.length === 0 ? (
                        <div className="bg-card rounded-xl border border-border p-8 text-center">
                            <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground">لا يوجد مرضى مطابقون للبحث</p>
                        </div>
                    ) : (
                        data.map((patient: any, index: number) => (
                            <div
                                key={patient.patient_id}
                                className="bg-card rounded-xl border border-border shadow-sm p-4"
                            >
                                {/* Card Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <Users className="h-5 w-5 text-primary-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-base truncate">{patient.patient_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            #{(current_page - 1) * per_page + index + 1}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                                        <FileImage className="h-3 w-3" />
                                        {patient.scans_count} فحص
                                    </span>
                                </div>

                                {/* Card Details */}
                                <div className="space-y-1.5 mb-4">
                                    {patient.patient_phone && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5 shrink-0" />
                                            <span dir="ltr">{patient.patient_phone}</span>
                                        </div>
                                    )}
                                    {patient.doctor_name && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                                            <span>{patient.doctor_name}</span>
                                        </div>
                                    )}
                                    {patient.latest_created_at && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                                            <span>{new Date(patient.latest_created_at).toLocaleDateString('ar-SA')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Action */}
                                <Link href={route('patients.show', patient.patient_id)} className="block">
                                    <Button className="w-full gap-2" size="sm">
                                        <Eye className="h-4 w-4" />
                                        عرض السجل الطبي
                                    </Button>
                                </Link>
                            </div>
                        ))
                    )}

                    {/* Mobile Pagination */}
                    {last_page > 1 && (
                        <div className="bg-card rounded-xl border border-border px-4 py-3">
                            <PaginationBar
                                currentPage={current_page}
                                lastPage={last_page}
                                from={from} to={to} total={total}
                                onGoTo={goToPage}
                                compact
                            />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

/* ── Pagination Bar ────────────────────────────────────────────── */
function PaginationBar({
    currentPage, lastPage, from, to, total, onGoTo, compact = false
}: {
    currentPage: number; lastPage: number; from: number; to: number;
    total: number; onGoTo: (p: number) => void; compact?: boolean;
}) {
    return (
        <div className={`flex ${compact ? 'flex-col gap-2' : 'flex-row'} items-center justify-between`}>
            <p className="text-xs text-muted-foreground text-center">
                {total === 0
                    ? 'لا يوجد مرضى'
                    : `${from} - ${to} من ${total}  |  صفحة ${currentPage} / ${lastPage}`}
            </p>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7"
                    disabled={currentPage <= 1} onClick={() => onGoTo(1)} title="الأولى">
                    <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                    disabled={currentPage <= 1} onClick={() => onGoTo(currentPage - 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                    السابقة
                </Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                    disabled={currentPage >= lastPage} onClick={() => onGoTo(currentPage + 1)}>
                    التالية
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7"
                    disabled={currentPage >= lastPage} onClick={() => onGoTo(lastPage)} title="الأخيرة">
                    <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
