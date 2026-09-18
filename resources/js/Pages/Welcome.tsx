import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, ShieldCheck, Zap, Users, BarChart3, Settings, ArrowLeft } from 'lucide-react';

export default function Welcome({
    auth,
    laravelVersion,
    phpVersion,
}: PageProps<{ laravelVersion: string; phpVersion: string }>) {
    return (
        <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
            <Head title="الهادي للمكالمات التجارية" />

            {/* Header / Navbar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/60 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20">
                            <PhoneCall className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white">الهادي للمكالمات التجارية</h1>
                            <p className="text-xs text-indigo-400 font-medium">نظام إدارة مكالمات متطور</p>
                        </div>
                    </div>

                    <nav className="flex items-center gap-3">
                        {auth.user ? (
                            <Link href={route('dashboard')}>
                                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                                    لوحة التحكم
                                    <ArrowLeft className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')}>
                                    <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/60">
                                        تسجيل الدخول
                                    </Button>
                                </Link>
                                <Link href={route('register')}>
                                    <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/20">
                                        إنشاء حساب
                                    </Button>
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
                <div className="text-center space-y-6 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2">
                        <Badge variant="outline" className="px-4 py-1.5 border-indigo-500/40 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-semibold">
                            <Zap className="w-3.5 h-3.5 text-indigo-400 ml-1.5" />
                            تم إعداد النظام بالكامل مع Tailwind CSS & Shadcn UI
                        </Badge>
                    </div>

                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                        حلول اتصالات تجارية <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400 bg-clip-text text-transparent">ذكية ومتكاملة</span>
                    </h2>

                    <p className="text-lg text-slate-300 leading-relaxed">
                        منظومة "الهادي للمكالمات التجارية" مبنية على أحدث تقنيات لارافيل و Inertia React مع واجهات Shadcn UI المتقدمة لإدارة الاتصالات والتحليلات بكفاءة عالية.
                    </p>

                    <div className="pt-4 flex flex-wrap justify-center gap-4">
                        <Link href={route('register')}>
                            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 h-12 text-base shadow-xl shadow-indigo-600/25">
                                ابدأ الآن
                            </Button>
                        </Link>
                        <Link href={route('login')}>
                            <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white px-8 h-12 text-base">
                                عرض الأنظمة
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Features Grid using Shadcn Cards */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm text-slate-100 hover:border-indigo-500/50 transition duration-300">
                        <CardHeader>
                            <div className="p-3 w-fit bg-indigo-500/10 text-indigo-400 rounded-xl mb-3">
                                <PhoneCall className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-white text-xl">إدارة المكالمات</CardTitle>
                            <CardDescription className="text-slate-400">
                                توجيه وتسجيل وتتبع كافة المكالمات التجارية الواردة والصادرة بدقة وسلاسة.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-300">
                            يتيح لك النظام تحويل واستقبال الاتصالات بسهولة مع الاحتفاظ بسجل تفصيلي لجميع المعاملات.
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm text-slate-100 hover:border-indigo-500/50 transition duration-300">
                        <CardHeader>
                            <div className="p-3 w-fit bg-violet-500/10 text-violet-400 rounded-xl mb-3">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-white text-xl">تقارير وتحليلات</CardTitle>
                            <CardDescription className="text-slate-400">
                                إحصائيات لمراقبة أداء اتصالات العيادات والشركات ببيانات فورية وشاملة.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-300">
                            متابعة معدلات الاستجابة، مدة المكالمات، وتقارير دورية ترفع من جودة خدمة العملاء.
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm text-slate-100 hover:border-indigo-500/50 transition duration-300">
                        <CardHeader>
                            <div className="p-3 w-fit bg-emerald-500/10 text-emerald-400 rounded-xl mb-3">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-white text-xl">أمان واعتمادية</CardTitle>
                            <CardDescription className="text-slate-400">
                                حماية البيانات والصلاحيات بأعلى معايير الحماية والأمان المطلقة.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-300">
                            تحديد أدوار المستخدمين بدقة لضمان سرية واستقرار منظومة الاتصالات التجارية.
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/60 bg-slate-950 py-8 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>© {new Date().getFullYear()} الهادي للمكالمات التجارية - جميع الحقوق محفوظة.</p>
                    <p className="font-mono text-slate-600">
                        Laravel v{laravelVersion} | PHP v{phpVersion} | Shadcn UI
                    </p>
                </div>
            </footer>
        </div>
    );
}
