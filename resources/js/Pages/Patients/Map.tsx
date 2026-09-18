import { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    MapPin,
    ArrowRight,
    Search,
    SlidersHorizontal,
    Phone,
    Building2,
    Tag,
    ExternalLink,
    Eye,
    Layers,
    RotateCcw,
    Sparkles,
} from 'lucide-react';

interface TrustItem {
    name: string;
    code: string;
}

interface Customer {
    id: number;
    full_name: string;
    commercial_name: string;
    latitude: number | null;
    longitude: number | null;
    location_address: string | null;
    nearest_landmark: string | null;
    district: string | null;
    trust_items: TrustItem[] | null;
    phone: string | null;
    refrigerator_photo: string[] | null;
    status: 'active' | 'inactive';
    departments?: string[] | null;
    classification: 'A' | 'B' | 'C';
    created_at: string;
}

interface TrustTypeMaster {
    id: number;
    name: string;
}

interface Props {
    customers: Customer[];
    filters: {
        search?: string;
        status?: string;
        classification?: string;
        district?: string;
        department?: string;
    };
    districtsList: string[];
    departmentsList?: string[];
    trust_types: TrustTypeMaster[];
}

const DEFAULT_DEPARTMENTS = [
    'قسم ارسي',
    'قسم النايس',
    'قسم ابو جنة',
    'قسم المانشيز',
    'قسم الرند',
];

export default function MapPage({ customers, filters, districtsList, departmentsList = DEFAULT_DEPARTMENTS }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [classificationFilter, setClassificationFilter] = useState(filters.classification || 'all');
    const [districtFilter, setDistrictFilter] = useState(filters.district || 'all');
    const [departmentFilter, setDepartmentFilter] = useState(filters.department || 'all');
    const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

    const mapInstanceRef = useRef<any>(null);

    // Apply Filters and refresh data
    const handleFilterChange = (newFilters: { search?: string; status?: string; classification?: string; district?: string; department?: string }) => {
        router.get(
            route('customers.map'),
            {
                search: newFilters.search !== undefined ? newFilters.search : (searchTerm || undefined),
                status: newFilters.status !== undefined ? (newFilters.status !== 'all' ? newFilters.status : undefined) : (statusFilter !== 'all' ? statusFilter : undefined),
                classification: newFilters.classification !== undefined ? (newFilters.classification !== 'all' ? newFilters.classification : undefined) : (classificationFilter !== 'all' ? classificationFilter : undefined),
                district: newFilters.district !== undefined ? (newFilters.district !== 'all' ? newFilters.district : undefined) : (districtFilter !== 'all' ? districtFilter : undefined),
                department: newFilters.department !== undefined ? (newFilters.department !== 'all' ? newFilters.department : undefined) : (departmentFilter !== 'all' ? departmentFilter : undefined),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setClassificationFilter('all');
        setDistrictFilter('all');
        setDepartmentFilter('all');
        router.get(route('customers.map'), {}, { preserveState: true, replace: true });
    };

    // Initialize Leaflet Map with all Customer Markers
    useEffect(() => {
        const timer = setTimeout(() => {
            const L = (window as any).L;
            if (!L) return;

            const mapContainer = document.getElementById('full-customers-map');
            if (!mapContainer) return;

            // Clear previous map instance if exists
            const parent = mapContainer.parentNode;
            if (parent) {
                const newDiv = document.createElement('div');
                newDiv.id = 'full-customers-map';
                newDiv.className = 'w-full h-full rounded-xl overflow-hidden shadow-inner';
                parent.replaceChild(newDiv, mapContainer);
            }

            // Default center: Basra
            const defaultLat = 30.5081;
            const defaultLng = 47.7835;

            const map = L.map('full-customers-map', {
                center: [defaultLat, defaultLng],
                zoom: 12,
                zoomControl: true,
                scrollWheelZoom: true,
            });
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Custom colored SVG pin markers based on customer classification
            const getPinColor = (classification: 'A' | 'B' | 'C') => {
                if (classification === 'A') return '#ef4444'; // Red/Gold for Class A
                if (classification === 'B') return '#3b82f6'; // Blue for Class B
                return '#10b981'; // Green for Class C
            };

            const createCustomIcon = (c: Customer) => {
                const color = getPinColor(c.classification);
                const svgHtml = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                `;
                return L.divIcon({
                    html: svgHtml,
                    className: 'custom-map-pin',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -30],
                });
            };

            const bounds: [number, number][] = [];

            customers.forEach((c) => {
                if (!c.latitude || !c.longitude) return;

                const lat = parseFloat(c.latitude as any);
                const lng = parseFloat(c.longitude as any);

                if (isNaN(lat) || isNaN(lng)) return;

                bounds.push([lat, lng]);

                const marker = L.marker([lat, lng], {
                    icon: createCustomIcon(c),
                }).addTo(map);

                // Build rich HTML Popup
                const photoPreview = (c.refrigerator_photo && c.refrigerator_photo.length > 0)
                    ? `<img src="${c.refrigerator_photo[0]}" class="w-full h-24 object-cover rounded-md mb-2 border" />`
                    : '';

                const statusBadge = c.status === 'active'
                    ? `<span style="background: #dcfce7; color: #15803d; font-size: 10px; font-weight: bold; padding: 2px 6px; borderRadius: 4px;">متعامل</span>`
                    : `<span style="background: #fee2e2; color: #b91c1c; font-size: 10px; font-weight: bold; padding: 2px 6px; borderRadius: 4px;">غير متعامل</span>`;

                const classBadge = `<span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: bold; padding: 2px 6px; borderRadius: 4px;">Class ${c.classification}</span>`;

                const deptsBadges = (c.status === 'active' && c.departments && c.departments.length > 0)
                    ? `<div style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px;">${c.departments.map(d => `<span style="background: #ecfdf5; color: #047857; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 4px; border: 1px solid #a7f3d0;">${d}</span>`).join('')}</div>`
                    : '';

                const shareText = encodeURIComponent(
                    `السلام عليكم، يرجى متابعة ملف هذا العميل:\n` +
                    `🏪 *${c.commercial_name}*\n` +
                    `👤 *${c.full_name}*\n` +
                    `📍 القضاء: ${c.district || ''} ${c.nearest_landmark ? `(${c.nearest_landmark})` : ''}\n` +
                    (c.phone ? `📞 الهاتف: ${c.phone}\n` : '') +
                    `🔗 رابط صفحة العميل:\n${window.location.origin}/customers/${c.id}`
                );
                const waUrl = `https://api.whatsapp.com/send?text=${shareText}`;

                const popupContent = `
                    <div style="direction: rtl; text-align: right; font-family: sans-serif; min-width: 210px; max-width: 260px; padding: 4px;">
                        ${photoPreview}
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
                            <h3 style="font-size: 14px; font-weight: bold; margin: 0; color: #0f172a;">${c.commercial_name}</h3>
                            <div>${classBadge}</div>
                        </div>
                        <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">الاسم: ${c.full_name}</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                            <div style="display: flex; gap: 4px;">
                                ${statusBadge}
                                <span style="background: #f1f5f9; color: #475569; font-size: 10px; padding: 2px 6px; borderRadius: 4px;">📍 ${c.district || 'غير محدد'}</span>
                            </div>
                            ${deptsBadges}
                        </div>

                        ${c.nearest_landmark ? `<p style="font-size: 11px; color: #334155; margin: 0 0 6px 0;"><b>أقرب نقطة:</b> ${c.nearest_landmark}</p>` : ''}
                        ${c.phone ? `<p style="font-size: 11px; color: #0284c7; margin: 0 0 8px 0; direction: ltr; text-align: right;">📞 <a href="tel:${c.phone}" style="color: #0284c7; font-weight: bold; text-decoration: none;">${c.phone}</a></p>` : ''}

                        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                            <div style="display: flex; gap: 4px;">
                                <a href="/customers/${c.id}" target="_blank" style="flex: 1; text-align: center; background: #0284c7; color: white; padding: 6px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold; display: block;">
                                    التفاصيل 👁️
                                </a>
                                <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" style="flex: 1; text-align: center; background: #059669; color: white; padding: 6px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold; display: block;">
                                    تطبيق الخرائط 🗺️
                                </a>
                            </div>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="text-align: center; background: #ea580c; color: white; padding: 6px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold; display: block;">
                                🚗 بدء التوجيه والملاحة (Google Maps)
                            </a>
                            <a href="${waUrl}" target="_blank" style="text-align: center; background: #25D366; color: white; padding: 6px 8px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold; display: block;">
                                💬 مشاركة العميل عبر الواتساب
                            </a>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);

                marker.on('click', () => {
                    setActiveCustomer(c);
                });
            });

            // Automatically fit bounds if there are customer markers
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }

            setTimeout(() => {
                map.invalidateSize();
            }, 200);
        }, 100);

        return () => clearTimeout(timer);
    }, [customers]);

    return (
        <AuthenticatedLayout header="خريطة مواقع العملاء">
            <Head title="خريطة العملاء - الهادي للمكالمات التجارية" />

            <div className="space-y-4" dir="rtl">
                {/* Header Navigation & Statistics Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link href={route('customers.index')}>
                            <Button variant="outline" size="sm" className="gap-2 text-xs font-bold">
                                <ArrowRight className="h-4 w-4" />
                                العودة لجدول العملاء
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary animate-bounce" />
                                الخريطة التفاعلية الشاملة
                            </h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                استعراض المواقع الميدانية لجميع العملاء وتوزيعهم الجغرافي
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-bold bg-primary/10 text-primary border-primary/20">
                            <Sparkles className="size-3.5" />
                            العملاء المعروضون: {customers.length}
                        </Badge>
                    </div>
                </div>

                {/* Interactive Search and Filter Bar */}
                <Card className="shadow-sm border-border">
                    <CardContent className="p-3 md:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-right">
                            {/* Search Input */}
                            <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="بحث باسم العميل، الاسم التجاري..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        handleFilterChange({ search: e.target.value });
                                    }}
                                    className="pr-9 text-xs"
                                />
                            </div>

                            {/* District Filter */}
                            <div>
                                <Select
                                    value={districtFilter}
                                    onValueChange={(val) => {
                                        setDistrictFilter(val);
                                        handleFilterChange({ district: val });
                                    }}
                                >
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue placeholder="تصفية حسب القضاء" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كافة الأقضية</SelectItem>
                                        {districtsList.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Classification Filter */}
                            <div>
                                <Select
                                    value={classificationFilter}
                                    onValueChange={(val) => {
                                        setClassificationFilter(val);
                                        handleFilterChange({ classification: val });
                                    }}
                                >
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue placeholder="التصنيف" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كافة التصنيفات</SelectItem>
                                        <SelectItem value="A">Class A (ممتاز)</SelectItem>
                                        <SelectItem value="B">Class B (متوسط)</SelectItem>
                                        <SelectItem value="C">Class C (عادي)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Department Filter */}
                            <div>
                                <Select
                                    value={departmentFilter}
                                    onValueChange={(val) => {
                                        setDepartmentFilter(val);
                                        handleFilterChange({ department: val });
                                    }}
                                >
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue placeholder="تصفية حسب القسم" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كافة الأقسام</SelectItem>
                                        {departmentsList.map((dept) => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                                <Select
                                    value={statusFilter}
                                    onValueChange={(val) => {
                                        setStatusFilter(val);
                                        handleFilterChange({ status: val });
                                    }}
                                >
                                    <SelectTrigger className="text-xs h-9 flex-1">
                                        <SelectValue placeholder="حالة التعامل" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كافة الحالات</SelectItem>
                                        <SelectItem value="active">متعامل</SelectItem>
                                        <SelectItem value="inactive">غير متعامل</SelectItem>
                                    </SelectContent>
                                </Select>

                                {(searchTerm || statusFilter !== 'all' || classificationFilter !== 'all' || districtFilter !== 'all' || departmentFilter !== 'all') && (
                                    <Button
                                        onClick={resetFilters}
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                                        title="إعادة ضبط الفلاتر"
                                    >
                                        <RotateCcw className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Full-Page Map Container */}
                <div className="relative w-full h-[calc(100vh-250px)] min-h-[500px] rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div id="full-customers-map" className="w-full h-full" />

                    {/* Classification Color Legend overlay */}
                    <div className="absolute bottom-4 right-4 z-[1000] bg-background/90 backdrop-blur-md p-3 rounded-lg border border-border shadow-lg text-xs space-y-1.5">
                        <p className="font-bold text-[11px] text-muted-foreground border-b border-border pb-1 mb-1">دليل ألوان التصنيف</p>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-sm" />
                            <span>Class A (ممتاز)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-sm" />
                            <span>Class B (متوسط)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm" />
                            <span>Class C (عادي)</span>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
