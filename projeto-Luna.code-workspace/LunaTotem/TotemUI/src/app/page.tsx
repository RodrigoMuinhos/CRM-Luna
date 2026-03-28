'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckInComplete } from '../components/pages/CheckInComplete';
import { Home } from '../components/pages/Home';
import { InstallmentSelection } from '../components/pages/InstallmentSelection';
import { LetterSelection } from '../components/pages/LetterSelection';
import { PatientConfirmation } from '../components/pages/PatientConfirmation';
import { PatientList } from '../components/pages/PatientList';
import { PaymentConfirmation } from '../components/pages/PaymentConfirmation';
import { PaymentDecision } from '../components/pages/PaymentDecision';
import { PaymentProcessing } from '../components/pages/PaymentProcessing';
import { PaymentSuccess } from '../components/pages/PaymentSuccess';
import { PixIsolatedPayment } from '../components/pages/PixIsolatedPayment';
import { PhoneInput } from '../components/pages/PhoneInput';
import { NameInput } from '../components/pages/NameInput';
import { PhotoCapture } from '../components/pages/PhotoCapture';
// Cartões seguem TEF (siTEF bridge). PIX pode operar em modo isolado com QR Code.
import { HelpTour } from '../components/HelpTour';
import { Appointment as UIAppointment, PaymentMethod } from '../types';
import {
    appointmentAPI,
    patientAPI,
    paymentAPI,
    authAPI,
    type Appointment as ApiAppointment,
    type Patient as ApiPatient,
} from '../lib/api';
import { API_BASE_URL, normalizeRole, setAuth } from '../lib/apiConfig';
import { getAppointmentCreditInstallments } from '../lib/creditInstallmentsConfig';
import { pickPreferredPortugueseFemaleVoice } from '../lib/accessibilityVoice';

const normalizeBoolean = (value: unknown): boolean => {
    if (value === true || value === false) return value;
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === '') return false;
        if (['true', '1', 'yes', 'y', 'sim', 's'].includes(v)) return true;
        if (['false', '0', 'no', 'n', 'nao', 'não'].includes(v)) return false;
        // Fallback: any other non-empty string counts as true
        return true;
    }
    return Boolean(value);
};

const creditOnlyAvistaMode =
    String(process.env.NEXT_PUBLIC_PAYMENT_ONLY_CREDIT_AVISTA ?? '').trim().toLowerCase() === 'true';
const pixIsolatedMode =
    String(process.env.NEXT_PUBLIC_PIX_ISOLATED_MODE ?? 'false').trim().toLowerCase() === 'true';
const videoAutoCacheEnabled =
    String(process.env.NEXT_PUBLIC_VIDEO_AUTO_CACHE ?? 'false').trim().toLowerCase() === 'true';
const configuredCreditMaxInstallments = Number(process.env.NEXT_PUBLIC_CREDIT_MAX_INSTALLMENTS ?? 12);
const creditMaxInstallments = Number.isFinite(configuredCreditMaxInstallments)
    ? Math.max(1, Math.min(12, Math.trunc(configuredCreditMaxInstallments)))
    : 3;

const buildAppointments = (apiAppointments: ApiAppointment[], patients: ApiPatient[]): UIAppointment[] => {
    const patientMap = new Map<string, ApiPatient>();
    patients.forEach((patient) => {
        if (patient.id !== null && patient.id !== undefined && String(patient.id).trim() !== '') {
            const key = String(patient.id);
            // Keep a normalized id to avoid Map key mismatches (e.g., numeric id 28 vs string "28")
            patientMap.set(key, { ...patient, id: key } as ApiPatient);
        }
    });

    return apiAppointments.map((apiAppointment) => {
        const patientIdKey =
            (apiAppointment as any).patientId !== null && (apiAppointment as any).patientId !== undefined
                ? String((apiAppointment as any).patientId)
                : '';
        const patientFromMap = patientIdKey ? patientMap.get(patientIdKey) : undefined;
        const patient = {
            id: patientFromMap?.id ?? patientIdKey,
            name: patientFromMap?.name ?? apiAppointment.patient ?? 'Paciente',
            cpf: patientFromMap?.cpf ?? apiAppointment.cpf,
            phone: patientFromMap?.phone ?? '',
        };

        const rawAmount = apiAppointment.amount;
        const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount;
        const paid = normalizeBoolean((apiAppointment as any).paid);

        return {
            id: apiAppointment.id ?? '',
            patientId: patientIdKey,
            patient,
            doctor: apiAppointment.doctor,
            specialty: apiAppointment.specialty,
            date: apiAppointment.date,
            time: apiAppointment.time,
            status: apiAppointment.status,
            paid,
            amount: Number.isNaN(amount) ? 0 : amount,
            cpf: apiAppointment.cpf,
        };
    });
};
import { Shield, Video, Volume2, VolumeX } from 'lucide-react';
import { notifyPaymentConfirmed } from '../lib/paymentBridge';
import { LoginModal } from '../components/auth/LoginModal';
import { toast } from 'sonner';
import { useR2Videos } from '../hooks/useR2Videos';

type Screen =
    | 'home'
    | 'letterSelection'
    | 'patientList'
    | 'paymentList'
    | 'nameInput'
    | 'patientConfirmation'
    | 'photoCapture'
    | 'checkInComplete'
    | 'paymentCpfInput'
    | 'paymentConfirmation'
    | 'paymentDecision'
    | 'installmentSelection'
    | 'pixIsolatedPayment'
    | 'paymentProcessing'
    | 'paymentSuccess';

type VoiceGuidanceContent = {
    title: string;
    text: string;
};

const buildVoiceGuidance = ({
    currentScreen,
    paymentDecisionMode,
    selectedAppointment,
    paymentMethod,
}: {
    currentScreen: Screen;
    paymentDecisionMode: 'checkin' | 'payment';
    selectedAppointment: UIAppointment | null;
    paymentMethod: PaymentMethod | null;
}): VoiceGuidanceContent => {
    switch (currentScreen) {
        case 'home':
            return {
                title: 'Menu inicial',
                text: 'Oi! Bem-vinda a Lunavita! | Escolha uma opção abaixo. | Toque em Acabei de chegar para fazer seu check-in. | Ou toque em Ir para pagamento.',
            };
        case 'letterSelection':
            return {
                title: 'Identificação',
                text: 'Vamos localizar seu atendimento. | Escolha a primeira letra do seu nome.',
            };
        case 'nameInput':
            return {
                title: 'Buscar agendamento',
                text: 'Digite seu CPF no teclado da tela. | Depois toque em Buscar para localizar seu agendamento.',
            };
        case 'paymentCpfInput':
            return {
                title: 'Buscar pagamento',
                text: 'Digite seu CPF no teclado da tela. | Depois toque em Buscar para localizar seu pagamento.',
            };
        case 'patientList':
            return {
                title: 'Lista de pacientes',
                text: 'Procure seu nome na lista. | Se não encontrar, toque em Não encontrei meu nome.',
            };
        case 'paymentList':
            return {
                title: 'Lista de pagamentos',
                text: 'Procure seu nome na lista para seguir com o pagamento. | Se não encontrar, toque em Não encontrei meu nome.',
            };
        case 'patientConfirmation':
            return {
                title: 'Confirmar dados',
                text: 'Confira os dados exibidos na tela. | Se estiver tudo certo, confirme para continuar.',
            };
        case 'photoCapture':
            return {
                title: 'Captura de foto',
                text: 'Posicione-se em frente a câmera. | E toque em OK para registrar sua foto.',
            };
        case 'checkInComplete':
            return {
                title: 'Check-in concluído',
                text:
                    selectedAppointment && !selectedAppointment.paid && selectedAppointment.amount > 0
                        ? 'Seu check-in foi concluído com sucesso! | Você pode finalizar o atendimento. | Ou seguir para o pagamento.'
                        : 'Seu check-in foi concluído com sucesso! | Toque para finalizar o atendimento.',
            };
        case 'paymentDecision':
            return {
                title: 'Próximo passo',
                text:
                    paymentDecisionMode === 'checkin'
                        ? 'Seu atendimento está quase pronto. | Você pode aguardar. | Ou adiantar o pagamento agora mesmo no totem.'
                        : 'Escolha como deseja continuar. | Você pode aguardar. | Ou seguir para o pagamento no totem.',
            };
        case 'paymentConfirmation':
            return {
                title: 'Forma de pagamento',
                text: creditOnlyAvistaMode
                    ? 'Pagamento a vista no crédito. | Toque em Cartão de Crédito para continuar.'
                    : 'Escolha a forma de pagamento. | As opções disponíveis são pix, crédito e débito.',
            };
        case 'installmentSelection':
            return {
                title: 'Parcelamento',
                text: 'Escolha se deseja pagar a vista ou parcelado. | Toque na opção desejada para continuar.',
            };
        case 'pixIsolatedPayment':
            return {
                title: 'Pagamento por pix',
                text: 'Escaneie o QR Code com o aplicativo do seu banco. | Para concluir o pagamento via pix.',
            };
        case 'paymentProcessing': {
            const methodGuidance =
                paymentMethod === 'pix'
                    ? 'Siga as instruções no pinpad para concluir o pagamento via pix.'
                    : paymentMethod === 'debit'
                        ? 'Insira ou aproxime o cartão no pinpad para concluir o pagamento no débito.'
                        : 'Insira ou aproxime o cartão no pinpad para concluir o pagamento no crédito.';

            return {
                title: 'Processando pagamento',
                text: `${methodGuidance} | Aguarde a confirmação na tela.`,
            };
        }
        case 'paymentSuccess':
            return {
                title: 'Pagamento confirmado',
                text: 'Pagamento confirmado com sucesso! | Aguarde enquanto finalizamos seu atendimento.',
            };
        default:
            return {
                title: 'Atendimento guiado',
                text: 'Siga as instruções exibidas na tela. | Para continuar seu atendimento.',
            };
    }
};

export default function Page() {

    const buildAppointmentsFromApiOnly = (apiAppointments: ApiAppointment[]): UIAppointment[] => {
        return apiAppointments.map((apiAppointment) => {
            const patientIdKey =
                (apiAppointment as any).patientId !== null && (apiAppointment as any).patientId !== undefined
                    ? String((apiAppointment as any).patientId)
                    : '';

            const patient = {
                id: patientIdKey,
                name: apiAppointment.patient ?? 'Paciente',
                cpf: apiAppointment.cpf ?? '',
                phone: '',
            };

            const rawAmount = apiAppointment.amount;
            const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount;
            const paid = normalizeBoolean((apiAppointment as any).paid);

            return {
                id: apiAppointment.id ?? '',
                patientId: patientIdKey,
                patient,
                doctor: apiAppointment.doctor,
                specialty: apiAppointment.specialty,
                date: apiAppointment.date,
                time: apiAppointment.time,
                status: apiAppointment.status,
                paid,
                amount: Number.isNaN(amount) ? 0 : amount,
                cpf: apiAppointment.cpf,
            };
        });
    };
    const router = useRouter();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRestMode, setIsRestMode] = useState(false);
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [isVideoOpenedByAdmin, setIsVideoOpenedByAdmin] = useState(false); // Track if video was opened by admin click
    const [isTourOpen, setIsTourOpen] = useState(false);
    const inactivityTimer = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const restVideoRef = useRef<HTMLVideoElement | null>(null);
    const [inactivityMs, setInactivityMs] = useState(5 * 60 * 1000); // default: 5 min

    // Hook para gerenciar vídeos do R2 com cache automático
    const { videoUrls, loading: videosLoading, error: videosError } = useR2Videos({
        autoCache: videoAutoCacheEnabled,
        playlistUrl: '/api/videos/playlist-r2',
    });
    
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const primaryVideoSrc = videoUrls.length > 0 ? videoUrls[currentVideoIndex] : null;

    // Força o vídeo a recarregar quando o índice mudar
    useEffect(() => {
        if (restVideoRef.current && primaryVideoSrc) {
            restVideoRef.current.load();
            restVideoRef.current.play().catch(err => 
                console.log('[VIDEO] Erro ao reproduzir:', err)
            );
        }
    }, [currentVideoIndex, primaryVideoSrc]);

    const [currentScreen, setCurrentScreen] = useState<Screen>('home');
    const [selectedLetter, setSelectedLetter] = useState<string>('');
    const [appointments, setAppointments] = useState<UIAppointment[]>([]);
    const [filteredAppointments, setFilteredAppointments] = useState<UIAppointment[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<UIAppointment | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [installments, setInstallments] = useState<number>(1);
    const [lastPaymentSaleId, setLastPaymentSaleId] = useState<string>('');
    const [lastPaymentIssue, setLastPaymentIssue] = useState<string>('');
    const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
    const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
    const [paymentDecisionMode, setPaymentDecisionMode] = useState<'checkin' | 'payment'>('payment');
    const [isVoiceGuidanceEnabled, setIsVoiceGuidanceEnabled] = useState(true);
    const [isSpeechSupported, setIsSpeechSupported] = useState(false);
    const closeVideoOverlay = () => {
        setIsVideoOpen(false);
        setIsVideoOpenedByAdmin(false); // Reset admin flag when closing
    };
    const speechVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const speechTimeoutRef = useRef<number | null>(null);
    const lastSpokenKeyRef = useRef('');
    const speechSequenceRef = useRef(0);

    // Payment search (CPF incremental)
    const [paymentCpfDigits, setPaymentCpfDigits] = useState('');
    const [paymentSearchResults, setPaymentSearchResults] = useState<UIAppointment[]>([]);
    const [isPaymentSearching, setIsPaymentSearching] = useState(false);
    const voiceGuidance = buildVoiceGuidance({
        currentScreen,
        paymentDecisionMode,
        selectedAppointment,
        paymentMethod,
    });
    const voiceGuidanceKey = [
        currentScreen,
        paymentDecisionMode,
        selectedAppointment?.id ?? 'no-appointment',
        paymentMethod ?? 'no-method',
        voiceGuidance.text,
    ].join('|');

    const handleHelpClick = () => {
        setIsTourOpen(true);
    };
    const stopVoiceGuidance = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }

        if (speechTimeoutRef.current) {
            window.clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = null;
        }

        speechSequenceRef.current += 1;
        window.speechSynthesis.cancel();
    };

    const speakVoiceGuidance = (message: string) => {
        if (
            !message.trim() ||
            !isVoiceGuidanceEnabled ||
            !isSpeechSupported ||
            typeof window === 'undefined' ||
            !('speechSynthesis' in window)
        ) {
            return;
        }

        stopVoiceGuidance();

        const sequenceId = speechSequenceRef.current;
        const chunks = message
            .split('|')
            .map((chunk) => chunk.trim())
            .filter(Boolean);

        const speakChunk = (index: number) => {
            if (
                sequenceId !== speechSequenceRef.current ||
                typeof window === 'undefined' ||
                !('speechSynthesis' in window)
            ) {
                return;
            }

            const utterance = new SpeechSynthesisUtterance(chunks[index]);
            utterance.lang = speechVoiceRef.current?.lang || 'pt-BR';
            utterance.rate = 1.6;
            utterance.pitch = 1.36;
            utterance.volume = 1;

            if (speechVoiceRef.current) {
                utterance.voice = speechVoiceRef.current;
            }

            utterance.onend = () => {
                if (index >= chunks.length - 1 || sequenceId !== speechSequenceRef.current) {
                    return;
                }

                speechTimeoutRef.current = window.setTimeout(() => {
                    speakChunk(index + 1);
                }, 340);
            };

            utterance.onerror = () => {
                if (index >= chunks.length - 1 || sequenceId !== speechSequenceRef.current) {
                    return;
                }

                speechTimeoutRef.current = window.setTimeout(() => {
                    speakChunk(index + 1);
                }, 340);
            };

            window.speechSynthesis.speak(utterance);
        };

        speechTimeoutRef.current = window.setTimeout(() => {
            speakChunk(0);
        }, 20);
    };

    const handleToggleVoiceGuidance = () => {
        const nextValue = !isVoiceGuidanceEnabled;
        setIsVoiceGuidanceEnabled(nextValue);

        if (!nextValue) {
            stopVoiceGuidance();
            return;
        }

        lastSpokenKeyRef.current = '';
    };
    const refreshAppointmentsForSearch = async (): Promise<UIAppointment[] | null> => {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('lv_token') : null;
        const hasValidToken =
            !!token && token !== 'undefined' && token !== 'null' && token.split('.').length === 3;
        if (!hasValidToken) {
            return null;
        }
        setIsLoadingAppointments(true);
        setAppointmentsError(null);
        try {
            const [apiAppointments, patients] = await Promise.all([
                appointmentAPI.getAll(),
                patientAPI.getAll(),
            ]);
            const built = buildAppointments(apiAppointments, patients);
            setAppointments(built);
            return built;
        } catch (error) {
            console.error('Falha ao carregar agendamentos', error);
            setAppointmentsError('Nao foi possivel carregar os agendamentos no momento.');
            return null;
        } finally {
            setIsLoadingAppointments(false);
        }
    };

    // Busca incremental para pagamento: conforme digita CPF, busca no backend e mostra sugestões.
    useEffect(() => {
        if (currentScreen !== 'paymentCpfInput') {
            setPaymentSearchResults([]);
            setIsPaymentSearching(false);
            return;
        }

        const digits = (paymentCpfDigits || '').replace(/\D/g, '');
        if (digits.length < 3) {
            setPaymentSearchResults([]);
            setIsPaymentSearching(false);
            return;
        }

        let cancelled = false;
        setIsPaymentSearching(true);

        const handle = window.setTimeout(async () => {
            try {
                console.log('[PAYMENT SEARCH] Buscando pagamentos pendentes para CPF:', digits);
                const apiResults = await appointmentAPI.searchUnpaid(digits);
                const built = buildAppointmentsFromApiOnly(apiResults);
                const unpaid = built.filter((a) => !a.paid);
                console.log('[PAYMENT SEARCH] Resultados encontrados:', unpaid.length);
                if (!cancelled) {
                    setPaymentSearchResults(unpaid.slice(0, 10));
                }
            } catch (error) {
                console.error('Erro ao buscar pagamentos (incremental)', error);
                if (!cancelled) {
                    setPaymentSearchResults([]);
                }
            } finally {
                if (!cancelled) {
                    setIsPaymentSearching(false);
                }
            }
        }, 200);

        return () => {
            cancelled = true;
            window.clearTimeout(handle);
        };
    }, [currentScreen, paymentCpfDigits]);

    // Auto-login silencioso para o totem
    useEffect(() => {
        const autoLogin = async () => {
            if (typeof window === 'undefined') return;
            
            const token = window.localStorage.getItem('lv_token');
            const hasValidToken = !!token && token !== 'undefined' && token !== 'null' && token.split('.').length === 3;
            
            if (hasValidToken) {
                console.log('[TOTEM AUTO-LOGIN] Token válido encontrado');
                return;
            }

            // In Electron kiosk, prefer the preload helper (runtime creds from .env)
            // so we don't depend on build-time NEXT_PUBLIC_* variables.
            try {
                const kioskAuth = (window as any)?.lunaKiosk?.auth;
                if (kioskAuth?.ensureToken) {
                    const ensured = await kioskAuth.ensureToken();
                    if (ensured && ensured !== 'undefined' && ensured !== 'null' && String(ensured).split('.').length === 3) {
                        window.localStorage.setItem('lv_token', String(ensured));
                        setAuth(String(ensured), window.localStorage.getItem('lv_role'));
                        console.log('[TOTEM AUTO-LOGIN] ✅ Token obtido via LunaKiosk (preload)');
                        return;
                    }
                }
            } catch {
                // ignore
            }

            // Credenciais do totem (deve ser um usuário de serviço com permissões limitadas)
            // Somente realiza auto-login se variáveis estiverem definidas explicitamente no .env
            const totemEmail = process.env.NEXT_PUBLIC_TOTEM_EMAIL;
            const totemPassword = process.env.NEXT_PUBLIC_TOTEM_PASSWORD;

            if (!totemEmail || !totemPassword) {
                console.log('[TOTEM AUTO-LOGIN] Variáveis NEXT_PUBLIC_TOTEM_EMAIL/NEXT_PUBLIC_TOTEM_PASSWORD não definidas - pulando auto-login');
                return;
            }

            console.log('[TOTEM AUTO-LOGIN] Iniciando login automático...');
            
            try {
                const res = await authAPI.login(totemEmail, totemPassword);
                window.localStorage.setItem('lv_token', res.token);
                window.localStorage.setItem('lv_refresh', res.refreshToken || '');
                const normalizedRole = normalizeRole(res.role);
                if (normalizedRole) {
                    window.localStorage.setItem('lv_role', normalizedRole);
                }
                setAuth(res.token, normalizedRole);
                console.log('[TOTEM AUTO-LOGIN] ✅ Login automático realizado com sucesso');
            } catch (error) {
                console.error('[TOTEM AUTO-LOGIN] ❌ Erro no login automático:', error);
            }
        };

        autoLogin();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        setIsSpeechSupported('speechSynthesis' in window);

        try {
            const storedValue = window.localStorage.getItem('lv_voice_guidance_enabled');
            if (storedValue === 'false') {
                setIsVoiceGuidanceEnabled(false);
            }
        } catch {
            // ignore storage failures
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem('lv_voice_guidance_enabled', String(isVoiceGuidanceEnabled));
        } catch {
            // ignore storage failures
        }
    }, [isVoiceGuidanceEnabled]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }

        const synthesis = window.speechSynthesis;
        const resolveVoice = () => {
            const preferredVoice = pickPreferredPortugueseFemaleVoice(synthesis.getVoices());
            speechVoiceRef.current = preferredVoice;
        };

        resolveVoice();
        synthesis.addEventListener('voiceschanged', resolveVoice);

        return () => {
            synthesis.removeEventListener('voiceschanged', resolveVoice);
        };
    }, []);

    useEffect(() => {
        let isActive = true;

        const fetchAppointments = async () => {
            // Só carrega dados se houver token (usuário autenticado)
            const token = typeof window !== 'undefined' ? window.localStorage.getItem('lv_token') : null;
            const hasValidToken =
                !!token && token !== 'undefined' && token !== 'null' && token.split('.').length === 3;
            if (!hasValidToken) {
                console.log('[TOTEM] Sem token - aguardando login');
                setIsLoadingAppointments(false);
                return;
            }

            setIsLoadingAppointments(true);
            setAppointmentsError(null);

            try {
                const [apiAppointments, patients] = await Promise.all([
                    appointmentAPI.getAll(),
                    patientAPI.getAll(),
                ]);
                if (!isActive) {
                    return;
                }
                setAppointments(buildAppointments(apiAppointments, patients));
            } catch (error) {
                console.error('Falha ao carregar agendamentos', error);
                if (!isActive) {
                    return;
                }
                setAppointmentsError('Não foi possível carregar os agendamentos no momento.');
            } finally {
                if (isActive) {
                    setIsLoadingAppointments(false);
                }
            }
        };

        fetchAppointments();

        return () => {
            isActive = false;
        };
    }, []);

    // Carrega configuração de inatividade (1..5 min)
    useEffect(() => {
        let cancelled = false;
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/videos/settings');
                const data = await res.json();
                if (cancelled) return;
                const mins = Number.parseInt(String(data?.settings?.inactivityMinutes ?? ''), 10);
                const clamped = Number.isFinite(mins) ? Math.max(1, Math.min(5, mins)) : 5;
                setInactivityMs(clamped * 60 * 1000);
            } catch {
                if (!cancelled) setInactivityMs(5 * 60 * 1000);
            }
        };
        loadSettings();
        return () => {
            cancelled = true;
        };
    }, []);

    // Inatividade: volta para modo descanso após 5 min sem interação
    useEffect(() => {
        const resetTimer = () => {
            if (inactivityTimer.current) {
                window.clearTimeout(inactivityTimer.current);
            }
            inactivityTimer.current = window.setTimeout(() => {
                setIsRestMode(true);
                resetFlow();
            }, inactivityMs);
        };

        const handleActivity = () => {
            if (isRestMode) return;
            resetTimer();
        };

        const events = ['click', 'mousemove', 'keydown', 'touchstart'];
        events.forEach((event) => window.addEventListener(event, handleActivity));
        resetTimer();

        return () => {
            events.forEach((event) => window.removeEventListener(event, handleActivity));
            if (inactivityTimer.current) {
                window.clearTimeout(inactivityTimer.current);
            }
        };
    }, [isRestMode, inactivityMs]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) {
            return;
        }

        if (isVideoOpen) {
            const playPromise = videoElement.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    /* autoplay bloqueado */
                });
            }
        } else {
            videoElement.pause();
            videoElement.currentTime = 0;
        }
    }, [isVideoOpen]);

    useEffect(() => {
        if (isRestMode) {
            setIsVideoOpen(false);
        }
    }, [isRestMode]);

    useEffect(() => {
        if (isRestMode || isVideoOpen || isLoginModalOpen || isTourOpen) {
            stopVoiceGuidance();
            lastSpokenKeyRef.current = '';
            return;
        }

        if (!isVoiceGuidanceEnabled || !isSpeechSupported) {
            stopVoiceGuidance();
            return;
        }

        if (lastSpokenKeyRef.current === voiceGuidanceKey) {
            return;
        }

        lastSpokenKeyRef.current = voiceGuidanceKey;
        speakVoiceGuidance(voiceGuidance.text);
    }, [
        isLoginModalOpen,
        isRestMode,
        isSpeechSupported,
        isTourOpen,
        isVideoOpen,
        isVoiceGuidanceEnabled,
        voiceGuidance.text,
        voiceGuidanceKey,
    ]);

    useEffect(() => {
        return () => {
            stopVoiceGuidance();
        };
    }, []);

    useEffect(() => {
        if (!isRestMode) {
            return;
        }
        const videoElement = restVideoRef.current;
        if (!videoElement) {
            return;
        }
        videoElement.currentTime = 0;
        const playPromise = videoElement.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                /* autoplay bloqueado */
            });
        }
        return () => {
            videoElement.pause();
            videoElement.currentTime = 0;
        };
    }, [isRestMode]);

    const filterAppointmentsByLetter = (letter: string): UIAppointment[] => {
        const normalizedLetter = letter.trim().toUpperCase();
        if (!normalizedLetter) {
            return [];
        }
        return appointments.filter((appointment) => {
            const firstChar = appointment.patient.name?.[0]?.toUpperCase();
            return firstChar === normalizedLetter;
        });
    };
    const filterAppointmentsByCpf = (value: string, source: UIAppointment[] = appointments): UIAppointment[] => {
        const digits = value.replace(/\D/g, '');
        if (!digits) {
            return source;
        }

        return source.filter((appointment) => {
            const cpf = (appointment.patient.cpf || appointment.cpf || '').replace(/\D/g, '');
            return cpf.includes(digits);
        });
    };

    const isToday = (isoDate?: string) => {
        if (!isoDate) return false;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        return isoDate === todayStr;
    };

    const filterAppointmentsByPhone = (phone: string, source: UIAppointment[] = appointments): UIAppointment[] => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone) {
            return [];
        }
        return source.filter((appointment) => {
            const patientPhone = appointment.patient.phone ?? '';
            return patientPhone.replace(/\D/g, '').includes(cleanPhone);
        });
    };

    const isAppointmentCheckedIn = (appointment: UIAppointment) =>
        appointment.status?.toLowerCase() === 'confirmado' || appointment.status === 'CONFIRMADA';

    const handleStartCheckIn = () => {
        setCurrentScreen('letterSelection');
    };

    const handleStartPayment = () => {
        setSelectedLetter('');
        setFilteredAppointments([]);
        setSelectedAppointment(null);
        setPaymentMethod(null);
        setInstallments(1);
        setPaymentDecisionMode('payment');
        setCurrentScreen('paymentCpfInput');
    };

    const handleSelectLetterCheckIn = (letter: string) => {
        setSelectedLetter(letter);
        const appointmentsByLetter = filterAppointmentsByLetter(letter)
            .filter((appointment) => isToday(appointment.date))
            .filter((appointment) => !isAppointmentCheckedIn(appointment));
        setFilteredAppointments(appointmentsByLetter);
        setCurrentScreen('patientList');
    };

    const handleSelectPatient = (appointment: UIAppointment) => {
        setSelectedAppointment(appointment);
        setCurrentScreen('patientConfirmation');
    };

    const handleNotFoundCheckIn = () => {
        setCurrentScreen('nameInput');
    };

    const handlePhoneSubmit = async (phone: string) => {
        const refreshed = await refreshAppointmentsForSearch();
        const source = refreshed && refreshed.length ? refreshed : appointments;
        const appointmentsByPhone = filterAppointmentsByPhone(phone, source)
            .filter((appointment) => !isAppointmentCheckedIn(appointment));
        setFilteredAppointments(appointmentsByPhone);
        setCurrentScreen('patientList');
    };

    const handleCpfSubmit = async (cpfValue: string) => {
        const refreshed = await refreshAppointmentsForSearch();
        const source = refreshed && refreshed.length ? refreshed : appointments;
        const byCpf = filterAppointmentsByCpf(cpfValue, source)
            .filter((appointment) => !isAppointmentCheckedIn(appointment));
        setFilteredAppointments(byCpf);
        setCurrentScreen('patientList');
    };

    const handleCpfSubmitPayment = async (cpfValue: string) => {
        const cleanCpf = (cpfValue || '').replace(/\D/g, '');
        if (cleanCpf.length < 3) {
            toast.error('Digite pelo menos 3 dígitos do CPF.');
            return;
        }

        setIsLoadingAppointments(true);
        try {
            const apiResults = await appointmentAPI.searchUnpaid(cleanCpf);
            const built = buildAppointmentsFromApiOnly(apiResults);
            const unpaid = built.filter((appointment) => !appointment.paid);

            if (unpaid.length === 0) {
                toast.info('Nenhum pagamento pendente encontrado para este CPF.');
                return;
            }

            if (unpaid.length === 1) {
                setSelectedAppointment(unpaid[0]);
                setPaymentMethod(null);
                setPaymentDecisionMode('payment');
                setCurrentScreen('paymentDecision');
                return;
            }

            // Se houver múltiplos resultados, exibir a lista dedicada do fluxo de pagamento
            setSelectedAppointment(null);
            setFilteredAppointments(unpaid);
            setPaymentSearchResults(unpaid.slice(0, 10));
            setCurrentScreen('paymentList');
            return;
        } catch (error) {
            console.error('Erro ao buscar pagamentos por CPF', error);
            toast.error('Erro ao buscar pagamentos. Tente novamente.');
        } finally {
            setIsLoadingAppointments(false);
        }
    };

    const handleSelectSuggestion = (apt: UIAppointment) => {
        setSelectedAppointment(apt);
        setCurrentScreen('patientConfirmation');
    };

    const handleSelectSuggestionPayment = (apt: UIAppointment) => {
        setSelectedAppointment(apt);
        setPaymentMethod(null);
        setPaymentDecisionMode('payment');
        setCurrentScreen('paymentDecision');
    };

    const handleSelectPaymentFromList = (apt: UIAppointment) => {
        setSelectedAppointment(apt);
        setPaymentMethod(null);
        setPaymentDecisionMode('payment');
        setCurrentScreen('paymentDecision');
    };

    const handleConfirmPatient = async () => {
        // Atualizar status do agendamento para "confirmado"
        if (selectedAppointment?.id) {
            try {
                await appointmentAPI.updateStatus(selectedAppointment.id, 'confirmado');
                // Atualizar o estado local
                setAppointments(prev => prev.map(apt =>
                    apt.id === selectedAppointment.id ? { ...apt, status: 'confirmado' } : apt
                ));
                setSelectedAppointment(prev => prev ? { ...prev, status: 'confirmado' } : null);
            } catch (error) {
                console.error('Erro ao atualizar status:', error);
            }
        }
        // Proceed to photo capture to confirm chegada
        setCurrentScreen('photoCapture');
    };

    const handlePhotoCapture = async (dataUrl?: string) => {
        // Upload photo; keep flow open for payment if pending. Only change status after payment.
        if (selectedAppointment?.id) {
            try {
                if (dataUrl) {
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    await appointmentAPI.uploadPhoto(selectedAppointment.id, blob);
                }
            } catch (e) {
                console.error('Falha ao enviar foto', e);
            }
        }
        // If there is pending payment, go to payment confirmation; otherwise finish check-in
        if (selectedAppointment && !selectedAppointment.paid && (selectedAppointment.amount ?? 0) > 0) {
            setPaymentDecisionMode('checkin');
            setCurrentScreen('paymentDecision');
        } else {
            setCurrentScreen('checkInComplete');
        }
    };

    const handleCheckInComplete = () => {
        resetFlow();
    };

    const handlePaymentDecisionAwait = () => {
        if (paymentDecisionMode === 'checkin') {
            setCurrentScreen('checkInComplete');
        } else {
            resetFlow();
        }
    };

    const handlePaymentDecisionBack = () => {
        resetFlow();
    };

    const handleProceedToPayment = () => {
        setCurrentScreen('paymentConfirmation');
    };

    const handlePayAfterCheckIn = () => {
        if (!selectedAppointment) {
            return;
        }
        setPaymentDecisionMode('checkin');
        setPaymentMethod(null);
        setCurrentScreen('paymentConfirmation');
    };

    const handleNotFoundPayment = () => {
        // Não usar busca por telefone no fluxo de pagamento.
        setCurrentScreen('paymentCpfInput');
    };

    const getAllowedCreditInstallments = (appointmentId?: string | null) => {
        const byAppointment = getAppointmentCreditInstallments(appointmentId ?? undefined);
        // Business rule: if manager did not explicitly configure installments
        // for the appointment, default to credit at sight only (1x).
        if (byAppointment === null) return 1;
        return Math.max(1, Math.min(12, Math.trunc(byAppointment)));
    };

    const handleSelectPaymentMethod = (method: PaymentMethod) => {
        console.log('[page.tsx] handleSelectPaymentMethod called with method:', method);
        // When configured, enforce card credit one-shot (no installments and no other methods).
        if (creditOnlyAvistaMode) {
            setPaymentMethod('credit');
            setInstallments(1);
            setCurrentScreen('paymentProcessing');
            return;
        }

        setPaymentMethod(method);
        setInstallments(1);
        console.log('[page.tsx] installments reset to 1 for method:', method);
        if (method === 'pix' && pixIsolatedMode) {
            setCurrentScreen('pixIsolatedPayment');
            return;
        }
        if (method === 'credit') {
            const allowedInstallments = getAllowedCreditInstallments(selectedAppointment?.id);
            console.log('[page.tsx] credit selected, allowedInstallments:', allowedInstallments);
            if (allowedInstallments <= 1) {
                setInstallments(1);
                setCurrentScreen('paymentProcessing');
                return;
            }
            console.log('[page.tsx] navigating to installmentSelection');
            setCurrentScreen('installmentSelection');
            return;
        }

        setCurrentScreen('paymentProcessing');
    };
    const handleSelectInstallment = (installmentCount: number) => {
        console.log('[page.tsx] handleSelectInstallment called with:', installmentCount);
        setInstallments(installmentCount);
        console.log('[page.tsx] installments state will be updated to:', installmentCount);
        setCurrentScreen('paymentProcessing');
    };

    const handlePaymentComplete = async (payload?: { saleId?: string; printOrConfirmIssue?: string }) => {
        const currentSaleId = payload?.saleId ? String(payload.saleId) : '';
        setLastPaymentSaleId(currentSaleId);
        setLastPaymentIssue(payload?.printOrConfirmIssue ? String(payload.printOrConfirmIssue) : '');
        try {
            if (typeof window !== 'undefined') {
                if (currentSaleId) {
                    window.sessionStorage.setItem('lv_last_sale_id', currentSaleId);
                } else {
                    window.sessionStorage.removeItem('lv_last_sale_id');
                }
            }
        } catch {
            // ignore sessionStorage failures
        }

        if (!selectedAppointment) {
            setCurrentScreen('paymentSuccess');
            return;
        }

        const appointmentId = selectedAppointment.id;
        if (!appointmentId) {
            setCurrentScreen('paymentSuccess');
            return;
        }

        try {
            // Pagamento é processado via TEF (siTEF/bridge) na tela PaymentProcessing.
            // Aqui apenas atualizamos o estado local e disparos auxiliares (notificação etc.).
            setAppointments((prev) =>
                prev.map((apt) =>
                    apt.id === appointmentId
                        ? { ...apt, paid: true, status: 'EM_ATENDIMENTO' }
                        : apt
                )
            );

            setSelectedAppointment((prev) =>
                prev && prev.id === appointmentId
                    ? { ...prev, paid: true, status: 'EM_ATENDIMENTO' }
                    : prev
            );

            setFilteredAppointments((prev) =>
                prev.filter((apt) => apt.id !== appointmentId)
            );

            notifyPaymentConfirmed({
                appointmentId,
                cpf: selectedAppointment.patient.cpf,
                amount: selectedAppointment.amount,
            });
        } catch (error) {
            console.error('Erro ao processar pagamento', error);
        } finally {
            setCurrentScreen('paymentSuccess');
        }
    };

    const handlePaymentSuccess = () => {
        resetFlow();
    };

    const openAdminDialog = () => {
        setIsLoginModalOpen(true);
    };

    const handleLoginSuccess = (user: any) => {
        localStorage.setItem('user', JSON.stringify(user));
        router.push('/system');
    };

    const resetFlow = () => {
        lastSpokenKeyRef.current = '';
        setCurrentScreen('home');
        setSelectedLetter('');
        setFilteredAppointments([]);
        setSelectedAppointment(null);
        setPaymentMethod(null);
        setInstallments(1);
        setLastPaymentSaleId('');
        setLastPaymentIssue('');
        setPaymentDecisionMode('payment');
    };

    const exitRestMode = () => {
        lastSpokenKeyRef.current = '';
        setIsRestMode(false);
        resetFlow();
    };

    // Em modo descanso, qualquer interação deve voltar imediatamente para a tela inicial.
    useEffect(() => {
        if (!isRestMode) {
            return;
        }

        const handleWake = () => {
            exitRestMode();
        };

        const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'click', 'keydown'];
        events.forEach((eventName) => {
            window.addEventListener(eventName, handleWake, { capture: true });
        });

        return () => {
            events.forEach((eventName) => {
                window.removeEventListener(eventName, handleWake, { capture: true });
            });
        };
    }, [isRestMode]);

    const renderScreen = () => {
        switch (currentScreen) {
            case 'home':
                return <Home onCheckIn={handleStartCheckIn} onPayment={handleStartPayment} onHelpClick={handleHelpClick} />;

            case 'letterSelection':
                return <LetterSelection flow="checkin" onSelectLetter={handleSelectLetterCheckIn} onBack={resetFlow} />;

            case 'patientList':
                return (
                    <PatientList
                        appointments={filteredAppointments}
                        onSelectPatient={handleSelectPatient}
                        onNotFound={handleNotFoundCheckIn}
                        onBack={resetFlow}
                    />
                );

            case 'paymentList':
                return (
                    <PatientList
                        isPaymentFlow
                        appointments={filteredAppointments}
                        onSelectPatient={handleSelectPaymentFromList}
                        onNotFound={handleNotFoundPayment}
                        onBack={resetFlow}
                    />
                );

            case 'nameInput':
                return (
                    <NameInput
                        flow="checkin"
                        appointments={appointments}
                        onSubmit={handleCpfSubmit}
                        onSelectAppointment={handleSelectSuggestion}
                        onBack={resetFlow}
                        onHelpClick={handleHelpClick}
                    />
                );

            case 'paymentCpfInput':
                return (
                    <NameInput
                        flow="payment"
                        appointments={paymentSearchResults}
                        onSubmit={handleCpfSubmitPayment}
                        onSelectAppointment={handleSelectSuggestionPayment}
                        onBack={resetFlow}
                        onHelpClick={handleHelpClick}
                        onCpfChange={setPaymentCpfDigits}
                        suggestionsMode="direct"
                        suggestMinDigits={3}
                        isSearching={isPaymentSearching}
                    />
                );

            case 'patientConfirmation':
                return selectedAppointment ? (
                    <PatientConfirmation
                        appointment={selectedAppointment}
                        onConfirm={handleConfirmPatient}
                        onBack={resetFlow}
                    />
                ) : null;

            case 'photoCapture':
                return <PhotoCapture onCapture={handlePhotoCapture} />;

            case 'checkInComplete':
                return selectedAppointment ? (
                    <CheckInComplete
                        appointment={selectedAppointment}
                        onFinish={handleCheckInComplete}
                        onPayNow={handlePayAfterCheckIn}
                    />
                ) : null;

            case 'paymentPhoneInput':
                // fluxo removido
                return null;

            case 'paymentDecision':
                return selectedAppointment ? (
                    <PaymentDecision
                        appointment={selectedAppointment}
                        onAwait={handlePaymentDecisionAwait}
                        onProceed={handleProceedToPayment}
                        onBack={handlePaymentDecisionBack}
                        mode={paymentDecisionMode}
                    />
                ) : null;

            case 'paymentConfirmation':
                return selectedAppointment ? (
                    <PaymentConfirmation
                        flow={paymentDecisionMode === 'checkin' ? 'checkin' : 'payment'}
                        appointment={selectedAppointment}
                        onSelectMethod={handleSelectPaymentMethod}
                        onBack={resetFlow}
                        creditOnlyAvista={creditOnlyAvistaMode}
                        creditMaxInstallments={creditMaxInstallments}
                    />
                ) : null;

            case 'installmentSelection':
                return selectedAppointment ? (
                    <InstallmentSelection
                        flow={paymentDecisionMode === 'checkin' ? 'checkin' : 'payment'}
                        amount={selectedAppointment.amount}
                        maxInstallments={getAllowedCreditInstallments(selectedAppointment?.id)}
                        onSelectInstallment={handleSelectInstallment}
                        onBack={() => setCurrentScreen('paymentConfirmation')}
                    />
                ) : null;

            case 'pixIsolatedPayment':
                return selectedAppointment?.id ? (
                    <PixIsolatedPayment
                        flow={paymentDecisionMode === 'checkin' ? 'checkin' : 'payment'}
                        appointmentId={selectedAppointment.id}
                        onComplete={handlePaymentComplete}
                        onBack={() => setCurrentScreen('paymentConfirmation')}
                        selectedAppointment={selectedAppointment}
                    />
                ) : null;

            case 'paymentProcessing':
                return paymentMethod ? (
                    <PaymentProcessing
                        flow={paymentDecisionMode === 'checkin' ? 'checkin' : 'payment'}
                        method={paymentMethod}
                        installments={installments}
                        onComplete={handlePaymentComplete}
                        onCancelToStart={resetFlow}
                        onBack={() => {
                            if (paymentMethod === 'credit' && !creditOnlyAvistaMode) {
                                setCurrentScreen('installmentSelection');
                                return;
                            }
                            setCurrentScreen('paymentConfirmation');
                        }}
                        selectedAppointment={selectedAppointment}
                    />
                ) : null;

            case 'paymentSuccess':
                return (
                    <PaymentSuccess
                        flow={paymentDecisionMode === 'checkin' ? 'checkin' : 'payment'}
                        onFinish={handlePaymentSuccess}
                        saleId={lastPaymentSaleId}
                        autoPrintIssue={lastPaymentIssue}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F6F1]">
            <div className="min-h-screen">
                <div className="flex min-h-screen w-full flex-col justify-center">
                    {isLoadingAppointments && (
                        <div className="mb-4 px-4 text-center text-sm text-[#4A4A4A]/80">
                            Carregando agendamentos...
                        </div>
                    )}
                    {appointmentsError && (
                        <div className="mb-4 px-4 text-center text-sm text-red-600">
                            {appointmentsError}
                        </div>
                    )}
                    {renderScreen()}
                </div>
            </div>

            {isRestMode && (
                <div
                    className="fixed inset-0 z-30 flex items-center justify-center bg-black cursor-pointer"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        exitRestMode();
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Toque em qualquer lugar para iniciar um novo atendimento"
                    style={{ touchAction: 'manipulation' }}
                >
                    {primaryVideoSrc ? (
                        <>
                            <video
                                key={`rest-video-${currentVideoIndex}`}
                                ref={restVideoRef}
                                className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                                muted
                                playsInline
                                autoPlay
                                preload="auto"
                                onCanPlay={() => {
                                    // Garante início de reprodução em dispositivos mais sensíveis a autoplay.
                                    restVideoRef.current?.play().catch((err) =>
                                        console.log('[VIDEO] Erro ao reproduzir no modo descanso:', err)
                                    );
                                }}
                                onEnded={() => {
                                    console.log('[VIDEO] Vídeo terminou, avançando...');
                                    // Avança para o próximo vídeo quando terminar
                                    setCurrentVideoIndex((prev) => {
                                        const next = (prev + 1) % videoUrls.length;
                                        console.log('[VIDEO] Próximo índice:', next, '/', videoUrls.length);
                                        return next;
                                    });
                                }}
                            >
                                <source src={primaryVideoSrc} type="video/mp4" />
                                Seu navegador não suporta vídeo.
                            </video>
                            <div className="pointer-events-none absolute inset-0 bg-black/35" />

                            <div className="pointer-events-none relative z-10 flex flex-col items-center gap-4 text-center text-white">
                                <div className="rounded-full bg-black/50 px-6 py-3 text-lg font-medium">
                                    Toque em qualquer lugar da tela para iniciar
                                </div>
                                <div className="h-12 w-12 animate-pulse rounded-full border-2 border-white/60" />
                            </div>
                        </>
                    ) : (
                        <div className="relative z-10 flex flex-col items-center gap-4 text-center text-white">
                            <div className="rounded-full bg-black/50 px-6 py-3 text-lg font-medium">
                                Nenhum vídeo disponível no momento
                            </div>
                            <div className="text-sm text-white/70">Toque para voltar</div>
                        </div>
                    )}
                </div>
            )}

            {isVideoOpen && primaryVideoSrc && (
                <div
                    className="fixed inset-0 z-30 flex items-center justify-center bg-black/90 px-4 cursor-pointer"
                    role="dialog"
                    aria-label="Vídeo institucional - toque na tela para fechar"
                    onClick={() => {
                        // Fecha ao clicar em QUALQUER lugar (no vídeo ou fora dele)
                        closeVideoOverlay();
                    }}
                    onTouchEnd={(e) => {
                        // Fecha ao tocar em QUALQUER lugar (no vídeo ou fora dele)
                        e.preventDefault();
                        closeVideoOverlay();
                    }}
                    style={{ touchAction: 'manipulation' }}
                >
                    <video
                        key={`modal-video-${currentVideoIndex}`}
                        ref={videoRef}
                        controls
                        autoPlay
                        preload="metadata"
                        className="h-full w-full rounded-[28px] border border-white/30 object-cover shadow-2xl max-w-5xl"
                        onEnded={() => {
                            console.log('[VIDEO MODAL] Vídeo terminou, avançando...');
                            // Avança para o próximo vídeo quando terminar
                            setCurrentVideoIndex((prev) => (prev + 1) % videoUrls.length);
                        }}
                    >
                        <source src={primaryVideoSrc} type="video/mp4" />
                        Seu navegador não suporta vídeo.
                    </video>
                </div>
            )}

            {!isRestMode && !isVideoOpen && (
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                    {isVoiceGuidanceEnabled
                        ? voiceGuidance.text.replace(/\|/g, ' ')
                        : 'Locução guiada desativada.'}
                </div>
            )}

            <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3">
                {!isRestMode && !isVideoOpen && (
                    <button
                        type="button"
                        className="flex h-12 w-12 items-center justify-center rounded-full border text-white shadow-[0_15px_30px_rgba(140,86,60,0.25)] transition hover:scale-[1.03] disabled:opacity-50"
                        style={{ borderColor: 'rgba(224,198,178,0.6)', backgroundColor: isVoiceGuidanceEnabled ? 'rgba(183,116,70,0.92)' : 'rgba(214,170,146,0.62)' }}
                        onClick={handleToggleVoiceGuidance}
                        aria-label={isVoiceGuidanceEnabled ? `Desligar locução guiada da etapa ${voiceGuidance.title}` : `Ligar locução guiada da etapa ${voiceGuidance.title}`}
                        title={isVoiceGuidanceEnabled ? 'Desligar locução guiada' : 'Ligar locução guiada'}
                        disabled={!isSpeechSupported}
                    >
                        {isVoiceGuidanceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                )}

                <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-full border text-white shadow-[0_15px_30px_rgba(140,86,60,0.25)] transition hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: 'rgba(224,198,178,0.6)', backgroundColor: 'rgba(214,170,146,0.6)' }}
                    onClick={() => {
                        if (primaryVideoSrc) {
                            setIsVideoOpen(true);
                            setIsVideoOpenedByAdmin(true); // Mark as opened by admin
                        }
                    }}
                    aria-label="Assistir vídeo institucional"
                    disabled={!primaryVideoSrc}
                >
                    <Video size={20} />
                </button>

                <button
                    className="flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition hover:scale-[1.03]"
                    style={{ backgroundColor: 'rgba(214,170,146,0.4)', borderColor: 'rgba(224,198,178,0.5)' }}
                    onClick={openAdminDialog}
                    aria-label="Abrir modo ADM"
                >
                    <Shield size={16} className="text-white" />
                </button>
            </div>

            <LoginModal
                open={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onSuccess={handleLoginSuccess}
            />

            <HelpTour
                isOpen={isTourOpen}
                onClose={() => setIsTourOpen(false)}
            />
        </div>
    );
}
