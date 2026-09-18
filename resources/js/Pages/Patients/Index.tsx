import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Users } from 'lucide-react';

export default function Index({ patients }: any) {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            router.get(
                route('patients.index'),
                { search: searchTerm },
                { preserveState: true, preserveScroll: true }
            );
        }
    };

    return (
        <AuthenticatedLayout header="سجل المرضى">
            <Head title="سجل المرضى" />

            <div className="space-y-6" dir="rtl">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                            سجل المرضى
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                            إدارة بيانات مرضى الفحص البصري والملفات المرفوعة (DICOM)
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                    <div className="flex items-center gap-2 max-w-sm">
                        <div className="relative w-full">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ابحث عن مريض..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearch}
                                className="pr-9 h-9 text-xs w-full"
                            />
                        </div>
                        <Button variant="secondary" size="sm" className="h-9 px-4 text-xs font-bold" onClick={() => router.get(route('patients.index'), { search: searchTerm })}>
                            بحث
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table dir="rtl" className="whitespace-nowrap text-right">
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[80px] text-right font-bold text-xs">#</TableHead>
                                    <TableHead className="text-right font-bold text-xs">اسم المريض</TableHead>
                                    <TableHead className="text-right font-bold text-xs">الطبيب</TableHead>
                                    <TableHead className="text-right font-bold text-xs">رقم الهاتف</TableHead>
                                    <TableHead className="text-right font-bold text-xs">حالة الرفع</TableHead>
                                    <TableHead className="text-center font-bold text-xs">الخيارات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patients.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <Users className="h-8 w-8 mb-2 opacity-20" />
                                                <p className="text-xs">لا يوجد مرضى مطابقين للبحث</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    patients.data.map((patient: any, index: number) => (
                                        <TableRow key={patient.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium text-xs">
                                                {(patients.current_page - 1) * patients.per_page + index + 1}
                                            </TableCell>
                                            <TableCell className="text-xs font-bold">{patient.patient_name}</TableCell>
                                            <TableCell className="text-xs">{patient.doctor_name || '-'}</TableCell>
                                            <TableCell className="text-xs text-mono" dir="ltr">{patient.patient_phone || '-'}</TableCell>
                                            <TableCell className="text-xs">
                                                <Badge variant={patient.file_path ? 'default' : 'secondary'} className="text-[10px] px-2 py-0 h-5">
                                                    {patient.file_path ? 'مكتمل' : 'قيد الانتظار'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Link href={route('patients.show', patient.id)}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
