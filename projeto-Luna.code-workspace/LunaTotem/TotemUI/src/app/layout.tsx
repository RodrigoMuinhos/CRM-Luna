import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import { Toaster } from '@/components/ui/sonner';
import { GlobalClock } from '@/components/GlobalClock';
import { GlobalF2ReprintHotkey } from '@/components/GlobalF2ReprintHotkey';
import { GlobalF4SpecificReprintHotkey } from '@/components/GlobalF4SpecificReprintHotkey';
import { WEB_ONLY_MODE } from '@/lib/appMode';

export const metadata: Metadata = {
    title: 'Totem Lunavita - Check-in e Pagamentos',
    description: 'Sistema de autoatendimento para check-in e pagamentos rápidos na clínica Lunavita. Interface intuitiva e segura para pacientes.',
    keywords: ['totem', 'check-in', 'pagamentos', 'clínica', 'autoatendimento', 'lunavita'],
    authors: [{ name: 'Lunavita' }],
    openGraph: {
        type: 'website',
        locale: 'pt_BR',
        url: 'https://lunavita.vercel.app',
        siteName: 'Totem Lunavita',
        title: 'Totem Lunavita - Check-in e Pagamentos',
        description: 'Sistema de autoatendimento para check-in e pagamentos rápidos na clínica Lunavita.',
        images: [
            {
                url: '/og-image.svg',
                width: 1200,
                height: 630,
                alt: 'Totem Lunavita - Sistema de Autoatendimento',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Totem Lunavita - Check-in e Pagamentos',
        description: 'Sistema de autoatendimento para check-in e pagamentos rápidos na clínica Lunavita.',
        images: ['/og-image.svg'],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR">
            <body>
                {!WEB_ONLY_MODE && <GlobalClock />}
                {!WEB_ONLY_MODE && <GlobalF2ReprintHotkey />}
                {!WEB_ONLY_MODE && <GlobalF4SpecificReprintHotkey />}
                {children}
                <Toaster />
            </body>
        </html>
    );
}
