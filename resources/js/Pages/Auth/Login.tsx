import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneCall } from 'lucide-react';

export default function Login({ status }: { status?: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
            <Head title="تسجيل الدخول" />
            <div
                className="min-h-screen flex flex-col items-center justify-center bg-background px-4"
                dir="rtl"
            >
                {/* Brand Header */}
                <div className="mb-8 flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-foreground text-background">
                        <PhoneCall className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight">الهادي للمكالمات التجارية</h1>
                        <p className="text-sm text-muted-foreground mt-1">نظام إدارة ومتابعة الاتصالات</p>
                    </div>
                </div>

                {/* Card */}
                <Card className="w-full max-w-sm">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl text-center">تسجيل الدخول</CardTitle>
                        <CardDescription className="text-center">
                            أدخل اسم المستخدم وكلمة المرور للوصول إلى النظام
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {status && (
                            <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700 text-right">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4 text-right">
                            {/* Username */}
                            <div className="space-y-2">
                                <Label htmlFor="username">اسم المستخدم</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="أدخل اسم المستخدم"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                    autoComplete="username"
                                    dir="ltr"
                                    required
                                />
                                {errors.username && (
                                    <p className="text-xs text-destructive">{errors.username}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">كلمة المرور</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    autoComplete="current-password"
                                    dir="ltr"
                                    required
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive">{errors.password}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={processing}>
                                {processing ? 'جاري الدخول...' : 'تسجيل الدخول'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
