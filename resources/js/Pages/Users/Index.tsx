import { useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { User, PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Shield, Edit3, Trash2, User as UserIcon, CheckCircle2, XCircle } from 'lucide-react';

interface Props extends PageProps {
    users: User[];
}

export default function UsersIndex({ users }: Props) {
    const { auth } = usePage<PageProps>().props;
    const currentUser = auth.user;

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const addForm = useForm({
        name: '',
        username: '',
        password: '',
        role: 'employee' as 'admin' | 'employee',
        status: 'active' as 'active' | 'inactive',
    });

    const editForm = useForm({
        name: '',
        username: '',
        password: '',
        role: 'employee' as 'admin' | 'employee',
        status: 'active' as 'active' | 'inactive',
    });

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post(route('users.store'), {
            onSuccess: () => {
                setIsAddOpen(false);
                addForm.reset();
            },
        });
    };

    const handleEditOpen = (user: User) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
            username: user.username,
            password: '',
            role: user.role,
            status: user.status,
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        editForm.put(route('users.update', editingUser.id), {
            onSuccess: () => {
                setEditingUser(null);
                editForm.reset();
            },
        });
    };

    const handleDeleteConfirm = () => {
        if (!deletingUser) return;
        router.delete(route('users.destroy', deletingUser.id), {
            onSuccess: () => setDeletingUser(null),
        });
    };

    return (
        <AuthenticatedLayout header="إدارة المستخدمين">
            <Head title="إدارة المستخدمين - الهادي للمكالمات التجارية" />

            <div className="space-y-6" dir="rtl">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            إدارة المستخدمين والحسابات
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            إضافة وتحديث حسابات الموظفين والأدمن وتحديد صلاحياتهم في النظام
                        </p>
                    </div>

                    {/* Add User Dialog */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 text-xs font-bold h-9">
                                <UserPlus className="h-4 w-4" />
                                إضافة مستخدم جديد
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-base font-bold flex items-center gap-2 text-right">
                                    <UserPlus className="h-5 w-5 text-primary" />
                                    إضافة حساب مستخدم جديد
                                </DialogTitle>
                                <DialogDescription className="text-xs text-right">
                                    قم بتعبئة بيانات المستخدم وتحديد الصلاحيات والحالة
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
                                <div className="space-y-1.5 text-right">
                                    <Label className="text-xs font-semibold">الاسم الكامل</Label>
                                    <Input
                                        value={addForm.data.name}
                                        placeholder="مثال: أحمد علي"
                                        onChange={(e) => addForm.setData('name', e.target.value)}
                                        required
                                    />
                                    {addForm.errors.name && <p className="text-[11px] text-destructive">{addForm.errors.name}</p>}
                                </div>

                                <div className="space-y-1.5 text-right">
                                    <Label className="text-xs font-semibold">اسم المستخدم (Username)</Label>
                                    <Input
                                        value={addForm.data.username}
                                        placeholder="مثال: ahmed"
                                        className="font-mono"
                                        onChange={(e) => addForm.setData('username', e.target.value)}
                                        required
                                    />
                                    {addForm.errors.username && <p className="text-[11px] text-destructive">{addForm.errors.username}</p>}
                                </div>

                                <div className="space-y-1.5 text-right">
                                    <Label className="text-xs font-semibold">كلمة المرور</Label>
                                    <Input
                                        type="password"
                                        value={addForm.data.password}
                                        placeholder="6 أحرف على الأقل"
                                        onChange={(e) => addForm.setData('password', e.target.value)}
                                        required
                                    />
                                    {addForm.errors.password && <p className="text-[11px] text-destructive">{addForm.errors.password}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-right">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">الدور / الصلاحية</Label>
                                        <Select
                                            value={addForm.data.role}
                                            onValueChange={(val) => addForm.setData('role', val as 'admin' | 'employee')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الدور" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="employee">موظف استجابة</SelectItem>
                                                <SelectItem value="admin">مدير نظام (أدمن)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">حالة الحساب</Label>
                                        <Select
                                            value={addForm.data.status}
                                            onValueChange={(val) => addForm.setData('status', val as 'active' | 'inactive')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الحالة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">نشط (مفعل)</SelectItem>
                                                <SelectItem value="inactive">معطل</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsAddOpen(false)}
                                    >
                                        إلغاء
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={addForm.processing}
                                        className="font-bold"
                                    >
                                        انشاء الحساب
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Users List Table Card */}
                <Card>
                    <CardHeader className="border-b border-border pb-4 text-right">
                        <CardTitle className="text-base font-bold">قائمة مستخدمي النظام</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            إجمالي الحسابات المسجلة: <strong className="text-foreground font-mono">{users.length}</strong>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                            <Table dir="rtl">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">#</TableHead>
                                        <TableHead className="text-right">الاسم الكامل</TableHead>
                                        <TableHead className="text-right">اسم المستخدم</TableHead>
                                        <TableHead className="text-right">الدور</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                        <TableHead className="text-right">تاريخ الإضافة</TableHead>
                                        <TableHead className="text-center">الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u, idx) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                                            <TableCell className="font-semibold text-xs flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-primary">
                                                    {u.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                <span>{u.name}</span>
                                                {u.id === currentUser.id && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">حسابك</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-bold text-primary">@{u.username}</TableCell>
                                            <TableCell>
                                                {u.role === 'admin' ? (
                                                    <Badge variant="default" className="text-[11px] gap-1">
                                                        <Shield className="h-3 w-3" />
                                                        أدمن (مدير)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[11px] gap-1">
                                                        <UserIcon className="h-3 w-3" />
                                                        موظف
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {u.status === 'active' ? (
                                                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[11px] gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        نشط
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-[11px] gap-1">
                                                        <XCircle className="h-3 w-3" />
                                                        معطل
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditOpen(u)}
                                                        className="h-8 w-8 p-0"
                                                        title="تعديل المستخدم"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>

                                                    {u.id !== currentUser.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeletingUser(u)}
                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                            title="حذف المستخدم"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile List View */}
                        <div className="block md:hidden divide-y divide-border" dir="rtl">
                            {users.map((u) => (
                                <div key={u.id} className="p-4 space-y-3 hover:bg-muted/10">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold text-primary">
                                                {u.name.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-sm font-bold flex items-center gap-1">
                                                    {u.name}
                                                    {u.id === currentUser.id && (
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">حسابك</Badge>
                                                    )}
                                                </span>
                                                <span className="text-xs text-primary font-mono font-bold">@{u.username}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditOpen(u)}
                                                className="h-8 w-8 p-0"
                                                title="تعديل المستخدم"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </Button>

                                            {u.id !== currentUser.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeletingUser(u)}
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    title="حذف المستخدم"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {u.role === 'admin' ? (
                                            <Badge variant="default" className="text-[10px] gap-1">
                                                <Shield className="h-2.5 w-2.5" />
                                                أدمن
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px] gap-1">
                                                <UserIcon className="h-2.5 w-2.5" />
                                                موظف
                                            </Badge>
                                        )}

                                        {u.status === 'active' ? (
                                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] gap-1">
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                نشط
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="text-[10px] gap-1">
                                                <XCircle className="h-2.5 w-2.5" />
                                                معطل
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Edit User Dialog */}
                {editingUser && (
                    <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-base font-bold flex items-center gap-2 text-right">
                                    <Edit3 className="h-5 w-5 text-primary" />
                                    تعديل بيانات المستخدم: {editingUser.name}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-right">
                                    تحديث اسم المستخدم، كلمة المرور، والصلاحيات
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
                                <div className="space-y-1.5 text-right">
                                    <Label className="text-xs font-semibold">الاسم الكامل</Label>
                                    <Input
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5 text-right">
                                    <Label className="text-xs font-semibold">اسم المستخدم (Username)</Label>
                                    <Input
                                        value={editForm.data.username}
                                        className="font-mono"
                                        onChange={(e) => editForm.setData('username', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5 text-right">
                                    <Label className="text-xs font-semibold">كلمة المرور جديدة (اختياري)</Label>
                                    <Input
                                        type="password"
                                        placeholder="اتركه فارغاً لعدم التغيير"
                                        value={editForm.data.password}
                                        onChange={(e) => editForm.setData('password', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-right">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">الدور</Label>
                                        <Select
                                            value={editForm.data.role}
                                            onValueChange={(val) => editForm.setData('role', val as 'admin' | 'employee')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="employee">موظف</SelectItem>
                                                <SelectItem value="admin">أدمن</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">الحالة</Label>
                                        <Select
                                            value={editForm.data.status}
                                            onValueChange={(val) => editForm.setData('status', val as 'active' | 'inactive')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">نشط</SelectItem>
                                                <SelectItem value="inactive">معطل</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <DialogFooter className="gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditingUser(null)}
                                    >
                                        إلغاء
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={editForm.processing}
                                        className="font-bold"
                                    >
                                        حفظ التعديلات
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Delete Confirmation Alert Dialog */}
                {deletingUser && (
                    <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-base font-bold text-right">
                                    هل أنت تأكيد من حذف هذا الحساب؟
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-right">
                                    سيتم حذف حساب المستخدم <strong className="text-foreground">"{deletingUser.name}"</strong> (اسم المستخدم: @{deletingUser.username}) نهائياً من النظام.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel onClick={() => setDeletingUser(null)}>
                                    إلغاء
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold">
                                    نعم، احذف الحساب
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
