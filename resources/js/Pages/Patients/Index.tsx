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
    ChevronsRight, ChevronsLeft, Eye, Trash2, FileImage
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

            <div className="space-y-5" dir="rtl">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Users className="h-6 w-6 text-primary" />
                            سجل المرضى
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            ابحث عن مريض أو انقر على «عرض السجل» لفتح الملف الطبي وفحوصات الـ DICOM
                        </p>
                    </div>

                    {/* Search + Refresh */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="search-patients"
                                placeholder="بحث باسم المريض، رقم الهاتف، أو اسم الطبيب..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pr-9 w-80 h-9 text-sm"
                            />
                        </div>
                        <Button size="sm" className="h-9 gap-1.5" onClick={doSearch}>
                            <Search className="h-3.5 w-3.5" />
                            بحث
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-9 gap-1.5"
                            onClick={() => router.get(route('patients.index'))}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            تحديث
                        </Button>
                    </div>
                </div>

                {/* ── Table Card ─────────────────────────────────────── */}
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table dir="rtl" className="text-right">
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="text-right font-bold text-xs w-[50px]">#</TableHead>
                                    <TableHead className="text-right font-bold text-xs">اسم المريض</TableHead>
                                    <TableHead className="text-right font-bold text-xs">رقم هاتف المريض</TableHead>
                                    <TableHead className="text-right font-bold text-xs">اسم الطبيب</TableHead>
                                    <TableHead className="text-right font-bold text-xs">تاريخ الإضافة</TableHead>
                                    <TableHead className="text-right font-bold text-xs">عدد الفحوصات</TableHead>
                                    <TableHead className="text-center font-bold text-xs w-[160px]">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                <Users className="h-10 w-10 opacity-20" />
                                                <p className="text-sm">لا يوجد مرضى ينطبق عليهم البحث</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((patient: any, index: number) => (
                                        <TableRow
                                            key={patient.patient_id}
                                            className="group hover:bg-muted/50 transition-colors cursor-default"
                                        >
                                            {/* Index */}
                                            <TableCell className="font-medium text-xs text-muted-foreground">
                                                {(current_page - 1) * per_page + index + 1}
                                            </TableCell>

                                            {/* Patient Name with avatar */}
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                                        <Users className="h-4 w-4 text-primary-foreground" />
                                                    </div>
                                                    <span className="font-bold text-sm">{patient.patient_name}</span>
                                                </div>
                                            </TableCell>

                                            {/* Phone */}
                                            <TableCell className="text-xs" dir="ltr">
                                                {patient.patient_phone || '-'}
                                            </TableCell>

                                            {/* Doctor */}
                                            <TableCell className="text-xs">
                                                {patient.doctor_name || '-'}
                                            </TableCell>

                                            {/* Latest date */}
                                            <TableCell className="text-xs text-muted-foreground">
                                                {patient.latest_created_at
                                                    ? new Date(patient.latest_created_at).toLocaleDateString('ar-SA')
                                                    : '-'}
                                            </TableCell>

                                            {/* Scans count */}
                                            <TableCell className="text-xs">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                    <FileImage className="h-3 w-3" />
                                                    {patient.scans_count} فحص
                                                </span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link href={route('patients.show', patient.patient_id)}>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="h-7 px-2.5 text-xs gap-1"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            عرض السجل
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* ── Pagination Footer ─────────────────────────── */}
                    {last_page > 1 && (
                        <div className="border-t border-border px-4 py-3 bg-muted/20">
                            <div className="flex items-center justify-between">
                                {/* Items per page info */}
                                <p className="text-xs text-muted-foreground">
                                    {total === 0
                                        ? 'لا يوجد مرضى'
                                        : `عرض ${from} - ${to} من إجمالي ${total} مريض  |  الصفحة ${current_page} من ${last_page}`}
                                </p>

                                {/* Pagination buttons */}
                                <div className="flex items-center gap-1">
                                    {/* First */}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={current_page <= 1}
                                        onClick={() => goToPage(1)}
                                        title="الصفحة الأولى"
                                    >
                                        <ChevronsRight className="h-3.5 w-3.5" />
                                    </Button>
                                    {/* Prev */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1"
                                        disabled={current_page <= 1}
                                        onClick={() => goToPage(current_page - 1)}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                        السابقة
                                    </Button>
                                    {/* Next */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1"
                                        disabled={current_page >= last_page}
                                        onClick={() => goToPage(current_page + 1)}
                                    >
                                        التالية
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    {/* Last */}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={current_page >= last_page}
                                        onClick={() => goToPage(last_page)}
                                        title="الصفحة الأخيرة"
                                    >
                                        <ChevronsLeft className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
