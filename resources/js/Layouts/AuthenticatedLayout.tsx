import { useState, useEffect, ReactNode } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Menu,
    X,
    Shield,
    User,
    Activity,
    History,
    Download,
    Tag,
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

interface AuthenticatedProps {
    children: ReactNode;
    header?: ReactNode;
}

export default function AuthenticatedLayout({ children, header }: AuthenticatedProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // PWA Install Prompt State
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already running in standalone mode (installed PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        if (isStandalone) return;

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        // Listen for standard beforeinstallprompt (Chrome / Android)
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!localStorage.getItem('pwa_install_dismissed')) {
                setShowInstallBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS: since it doesn't support beforeinstallprompt, show the banner if on iOS and not standalone
        if (ios && !isStandalone && !localStorage.getItem('pwa_install_dismissed')) {
            setShowInstallBanner(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    setShowInstallBanner(false);
                }
                setDeferredPrompt(null);
            });
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa_install_dismissed', 'true');
        setShowInstallBanner(false);
    };

    const navItems = [
        {
            label: 'سجل المرضى',
            href: route('patients.index'),
            icon: LayoutDashboard,
            active: route().current('patients.*'),
        },
        ...(user.role === 'admin'
            ? [
                  {
                      label: 'إدارة المستخدمين',
                      href: route('users.index'),
                      icon: Users,
                      active: route().current('users.index'),
                  }
              ]
            : []),
    ];

    const handleLogout = () => {
        router.post(route('logout'));
    };

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="flex h-14 items-center border-b border-border px-6">
                <Link href={route('patients.index')} className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                        <Users className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-sm">أرشيف المرضى</span>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    القائمة الرئيسية
                </p>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                item.active
                                    ? 'bg-secondary font-medium text-foreground'
                                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            {/* User footer */}
            <div className="border-t border-border p-3">
                <div className="flex items-center gap-3 rounded-md px-3 py-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                            {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-right">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="تسجيل الخروج"
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen bg-background" dir="rtl">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 lg:w-60 border-l border-border bg-background z-20">
                <SidebarContent />
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`fixed inset-y-0 right-0 z-40 w-64 flex flex-col border-l border-border bg-background transform transition-transform duration-200 ease-in-out lg:hidden ${
                    sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex h-14 items-center justify-between border-b border-border px-4">
                    <span className="font-semibold text-sm">القائمة</span>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex flex-1 flex-col">
                    <div className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                        item.active
                                            ? 'bg-secondary font-medium text-foreground'
                                            : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                                    }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="border-t border-border p-3">
                        <div className="flex items-center gap-3 px-3 py-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                    {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 text-right">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {user.role === 'admin' ? 'مدير' : 'موظف'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-1 flex-col min-w-0 lg:pr-60">
                {/* Top header */}
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
                    {/* Mobile menu button */}
                    <button
                        className="lg:hidden text-muted-foreground hover:text-foreground"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Breadcrumb */}
                    <div className="flex-1">
                        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground justify-start">
                            <span>المرضى</span>
                            {header && (
                                <>
                                    <span>/</span>
                                    <span className="font-medium text-foreground">{header}</span>
                                </>
                            )}
                        </nav>
                    </div>

                    {/* Header actions */}
                    <div className="flex items-center gap-2">
                        {/* User badge */}
                        <div className="flex items-center gap-2">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {user.role === 'admin' ? (
                                        <span className="flex items-center gap-1 justify-end">
                                            <Shield className="h-3 w-3" /> أدمن
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 justify-end">
                                            <User className="h-3 w-3" /> موظف
                                        </span>
                                    )}
                                </p>
                            </div>
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                    {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <button
                            onClick={handleLogout}
                            title="تسجيل الخروج"
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
                    {children}
                </main>
            </div>

            {/* PWA Install Banner */}
            {showInstallBanner && (
                <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-background/95 backdrop-blur-md border border-border rounded-xl p-4 shadow-xl flex flex-col gap-3 text-right">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-foreground">تثبيت سجل المرضى</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                        {isIOS 
                                            ? 'أضف التطبيق لشاشتك الرئيسية للوصول السريع ومتابعة عملك'
                                            : 'تصفح أسرع، استهلاك أقل للبيانات، ووصول مباشر من الشاشة الرئيسية'
                                        }
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleDismiss}
                                className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-full hover:bg-muted shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        
                        {isIOS ? (
                            <div className="bg-muted/50 rounded-lg p-2.5 text-xs text-muted-foreground border border-border">
                                <p className="font-semibold text-foreground mb-1">خطوات التثبيت على الآيفون:</p>
                                <ol className="list-decimal list-inside space-y-1 pr-1">
                                    <li>اضغط على زر المشاركة <span className="inline-block font-mono bg-background px-1.5 py-0.5 rounded border border-border text-[10px]">Share ⎙</span> أسفل المتصفح</li>
                                    <li>اختر <span className="font-semibold text-foreground">إضافة للشاشة الرئيسية (Add to Home Screen)</span></li>
                                </ol>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    className="flex-1 text-xs gap-1.5 font-bold h-8"
                                    onClick={handleInstallClick}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    تثبيت الآن
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs h-8"
                                    onClick={handleDismiss}
                                >
                                    لاحقاً
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <Toaster position="top-center" dir="rtl" />
        </div>
    );
}
