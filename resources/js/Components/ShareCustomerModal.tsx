import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerInfo {
    id: number;
    commercial_name: string;
    full_name: string;
    district?: string | null;
    nearest_landmark?: string | null;
    phone?: string | null;
}

interface Props {
    customer: CustomerInfo;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function ShareCustomerModal({ customer, trigger, open, onOpenChange }: Props) {
    const [copied, setCopied] = useState(false);
    const [isOpenInternal, setIsOpenInternal] = useState(false);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : isOpenInternal;
    const setIsOpen = (val: boolean) => {
        if (isControlled) {
            onOpenChange?.(val);
        } else {
            setIsOpenInternal(val);
        }
    };

    // Construct the absolute URL to customer show page
    const getCustomerUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/customers/${customer.id}`;
        }
        return `/customers/${customer.id}`;
    };

    // Construct the WhatsApp message text
    const getShareMessage = () => {
        const url = getCustomerUrl();
        const districtStr = customer.district ? `📍 القضاء: ${customer.district}` : '';
        const landmarkStr = customer.nearest_landmark ? ` (أقرب نقطة: ${customer.nearest_landmark})` : '';
        const phoneStr = customer.phone ? `\n📞 الهاتف: ${customer.phone}` : '';

        return `السلام عليكم، يرجى متابعة ملف هذا العميل:\n` +
            `🏪 *${customer.commercial_name}*\n` +
            `👤 *${customer.full_name}*\n` +
            `${districtStr}${landmarkStr}${phoneStr}\n\n` +
            `🔗 رابط صفحة العميل:\n${url}`;
    };

    const handleWhatsAppShare = () => {
        const text = getShareMessage();
        const encoded = encodeURIComponent(text);
        // Using api.whatsapp.com/send works on mobile app and desktop web seamlessly
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    };

    const handleCopyLink = async () => {
        try {
            const url = getCustomerUrl();
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('تم نسخ رابط العميل بنجاح');
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            toast.error('فشل في نسخ الرابط');
        }
    };

    const handleNativeShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: `عميل: ${customer.commercial_name}`,
                    text: `متابعة ملف العميل: ${customer.commercial_name}`,
                    url: getCustomerUrl(),
                });
            } catch (err) {
                // User cancelled or share failed
            }
        } else {
            handleCopyLink();
        }
    };

    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-md w-[95%] rounded-xl" dir="rtl">
                <DialogHeader className="text-right space-y-1.5">
                    <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                        <Share2 className="size-5 text-primary shrink-0" />
                        مشاركة ملف العميل
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        أرسل رابط وملخص بيانات العميل للموظفين الآخرين لمتابعة حالة العميل.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Customer Summary Card */}
                    <div className="p-3 bg-muted/40 border border-border rounded-lg text-right space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">{customer.commercial_name}</span>
                            <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">
                                العميل #{customer.id}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{customer.full_name}</p>
                        {customer.district && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                                📍 {customer.district} {customer.nearest_landmark ? `• أقرب نقطة: ${customer.nearest_landmark}` : ''}
                            </p>
                        )}
                    </div>

                    {/* Primary Action: WhatsApp */}
                    <Button
                        onClick={handleWhatsAppShare}
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm h-11 rounded-lg gap-2 shadow-sm transition-all"
                    >
                        <svg className="size-5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.852 0-3.601-.502-5.117-1.376l-.367-.217-3.801.996 1.014-3.705-.239-.38c-.96-1.527-1.467-3.3-1.467-5.114 0-5.32 4.329-9.65 9.65-9.65 2.578 0 5.001 1.004 6.822 2.827 1.82 1.823 2.822 4.246 2.821 6.824 0 5.323-4.33 9.652-9.652 9.652m0-21.362c-6.467 0-11.71 5.243-11.71 11.71 0 2.067.537 4.087 1.56 5.86l-1.656 6.047 6.187-1.623c1.711.933 3.64 1.425 5.619 1.425 6.467 0 11.71-5.243 11.71-11.71 0-3.132-1.22-6.077-3.435-8.293-2.214-2.215-5.159-3.436-8.29-3.436"/>
                        </svg>
                        <span>مشاركة مباشرة عبر الواتساب</span>
                    </Button>

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCopyLink}
                            className="h-10 text-xs font-semibold gap-1.5 justify-center"
                        >
                            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4 text-muted-foreground" />}
                            <span>{copied ? 'تم النسخ' : 'نسخ رابط العميل'}</span>
                        </Button>

                        {canNativeShare ? (
                            <Button
                                variant="outline"
                                onClick={handleNativeShare}
                                className="h-10 text-xs font-semibold gap-1.5 justify-center"
                            >
                                <ExternalLink className="size-4 text-muted-foreground" />
                                <span>مشاركة أُخرى</span>
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleWhatsAppShare}
                                className="h-10 text-xs font-semibold gap-1.5 justify-center border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            >
                                <span>إرسال سريع</span>
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
