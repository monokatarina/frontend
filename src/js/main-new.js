// ============================================
// FRONTEND - SISTEMA DE AGENDAMENTO
// VERSÃO COM VISUALIZAÇÃO SEMANAL MELHORADA
// ============================================

// ===== CONFIGURAÇÕES =====
const API = 'https://jokesteronline.org/api';
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19];

// ===== CONSTANTES DE REGRAS =====
const CANCEL_LIMIT_HOURS = 9;
const PROXIMITY_GRACE_MINUTES = 10;

// ===== PLANOS DE ASSINATURA =====
const PLANS = {
    basic: {
        id: 'basic',
        name: 'Básico',
        aulasPorSemana: 2,
        price: 1,
        color: '#10b981',
        icon: 'fa-seedling',
        features: ['2 aulas por semana', 'Acesso a todos horários', 'Suporte básico']
    },
    intermediate: {
        id: 'intermediate',
        name: 'Intermediário',
        aulasPorSemana: 3,
        price: 1,
        color: '#3b82f6',
        icon: 'fa-fire',
        features: ['3 aulas por semana', 'Acesso a todos horários', 'Suporte prioritário']
    },
    advanced: {
        id: 'advanced',
        name: 'Avançado',
        aulasPorSemana: 4,
        price: 1,
        color: '#f59e0b',
        icon: 'fa-rocket',
        features: ['4 aulas por semana', 'Acesso a todos horários', 'Suporte VIP']
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        aulasPorSemana: 5,
        price: 1,
        color: '#8b5cf6',
        icon: 'fa-crown',
        features: ['5 aulas por semana', 'Acesso a todos horários', 'Suporte 24/7']
    }
};

// ===== ESTADO GLOBAL =====
let availability = {};
let bookings = [];
let adminMode = false;
let currentUser = null;
let loading = false;
let processingReservation = false;
let showingPlans = false;
let nextDates = {};
let timerInterval = null;
let modalContext = null;

// ===== ELEMENTOS DOM =====
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const scheduleEl = document.getElementById('schedule');
const userInfo = document.getElementById('userInfo');
const weeklyWarning = document.getElementById('weeklyWarning');
const adminPanel = document.getElementById('adminPanel');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalUserName = document.getElementById('modalUserName');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');
const modalClose = document.getElementById('modalClose');
const toastContainer = document.getElementById('toastContainer');
const adminMenuBtn = document.getElementById('adminMenuBtn');
const adminDropdown = document.getElementById('adminDropdown');
const plansMenuBtn = document.getElementById('plansMenuBtn');
const adminMenuContainer = document.getElementById('adminMenuContainer');

// ============================================
// 1. FUNÇÕES UTILITÁRIAS BÁSICAS
// ============================================

// Sistema de notificações
function showNotification(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Carrega datas do backend
async function loadDates() {
    try {
        const response = await fetch(`${API}/admin/dates`);
        const data = await response.json();
        nextDates = data.data;
        console.log('📅 Datas carregadas:', nextDates);
        return nextDates;
    } catch (error) {
        console.error('❌ Erro ao carregar datas:', error);
        showNotification('Erro ao carregar calendário', 'error');
        return null;
    }
}

// Fetch API wrapper
const fetchAPI = async (endpoint, options = {}) => {
    const defaultOptions = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    };

    try {
        const res = await fetch(`${API}${endpoint}`, { ...defaultOptions, ...options });
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || data.message || `Erro ${res.status}`);
        }
        
        return { success: true, data: data.data || data, status: res.status };
    } catch (err) {
        console.error(`❌ Fetch error (${endpoint}):`, err.message);
        return { success: false, error: err.message };
    }
};

// Formata data de YYYY-MM-DD para DD/MM/YYYY
const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

// Verifica se um horário está reservado
const isBooked = (dateStr, hour) => {
    return bookings.filter(b => 
        b.date === dateStr && 
        Number(b.hour) === Number(hour)
    );
};

// ============================================
// 2. FUNÇÕES DE CONTROLE DE PLANOS
// ============================================

// Verifica se usuário tem plano ativo
function userHasActivePlan() {
    if (!currentUser) return false;
    if (currentUser.isAdmin) return true;
    
    console.log('🔍 Verificando plano do usuário:', currentUser);
    
    // Verificar plano direto
    if (currentUser.plan) {
        if (!currentUser.plan.status || currentUser.plan.status === 'active') {
            console.log('✅ Plano ativo encontrado:', currentUser.plan);
            return true;
        }
    }
    
    // Verificar assinatura
    if (currentUser.subscription && currentUser.subscription.status === 'active') {
        console.log('✅ Assinatura ativa encontrada:', currentUser.subscription);
        
        if (!currentUser.plan) {
            const planType = currentUser.subscription.planType || 'basic';
            currentUser.plan = {
                id: planType,
                name: getPlanName(planType),
                aulasPorSemana: currentUser.subscription.aulasPorSemana || getPlanAulas(planType),
                status: 'active',
                color: PLANS[planType]?.color || '#6366f1'
            };
        }
        return true;
    }
    
    console.log('❌ Nenhum plano ativo encontrado');
    return false;
}

// Verifica status da assinatura no backend
async function checkSubscriptionStatus() {
    if (!currentUser) return;

    try {
        console.log('🔍 Verificando status da assinatura para usuário:', currentUser.id);
        
        const response = await fetch(`${API}/payments/subscription/status/${currentUser.id}`);
        const data = await response.json();

        console.log('📊 Resposta do status:', data);

        if (data.success && data.data) {
            if (data.data.hasSubscription && data.data.plan) {
                currentUser.plan = data.data.plan;
                console.log('✅ Plan atualizado:', currentUser.plan);
            }
            
            if (data.data.subscription && data.data.subscription.status === 'active') {
                const sub = data.data.subscription;
                currentUser.subscription = sub;
                
                if (!currentUser.plan) {
                    currentUser.plan = {
                        id: sub.planType,
                        name: getPlanName(sub.planType),
                        aulasPorSemana: sub.aulasPorSemana || getPlanAulas(sub.planType),
                        status: 'active',
                        color: PLANS[sub.planType]?.color || '#6366f1'
                    };
                }
            }
            
            // Atualizar UI com informações do plano
            updatePlanInfo();
        }
    } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
    }
}

// Fun��o para atualizar o bot�o de planos
function updatePlansButton() {
    const plansBtn = document.getElementById('plansMenuBtn');
    if (!plansBtn) return;
    
    if (currentUser?.plan && userHasActivePlan()) {
        plansBtn.innerHTML = `
            <i class="fas fa-crown"></i>
            <span>Upgrade</span>
        `;
        plansBtn.classList.add('has-plan');
    } else {
        plansBtn.innerHTML = `
            <i class="fas fa-crown"></i>
            <span>Planos</span>
        `;
        plansBtn.classList.remove('has-plan');
    }
}
// Atualiza informações do plano na interface
function updatePlanInfo() {
    if (!currentUser) return;
    
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    let planHtml = '';
    
    if (currentUser.isAdmin) {
        planHtml = `
            <span class="plan-badge admin">
                <i class="fas fa-crown"></i>
                Administrador
            </span>
        `;
    } else if (userHasActivePlan() && currentUser.plan) {
        const planColor = currentUser.plan.color || '#6366f1';
        planHtml = `
            <span class="plan-badge" style="background: ${planColor}">
                <i class="fas ${PLANS[currentUser.plan.id]?.icon || 'fa-crown'}"></i>
                ${currentUser.plan.name || currentUser.plan.id}
                <span class="plan-aulas">${currentUser.plan.aulasPorSemana}/semana</span>
            </span>
        `;
    } else {
        planHtml = `
            <span class="plan-badge no-plan" onclick="window.location.href='/plans'">
                <i class="fas fa-exclamation-circle"></i>
                Sem plano ativo
                <button class="btn-plan-small">Escolher plano</button>
            </span>
        `;
    }
    
    // Adicionar badge do usuário
    const userBadge = `
        <span class="user-badge ${currentUser.isAdmin ? 'admin' : ''}">
            <i class="fas fa-${currentUser.isAdmin ? 'crown' : 'user'}"></i>
            ${currentUser.name || currentUser.email}
        </span>
    `;
    
    userInfo.innerHTML = userBadge + planHtml;

    updatePlansButton();

    if (adminMenuContainer) {
        adminMenuContainer.style.display = currentUser?.isAdmin ? '' : 'none';
    }
    
    // Atualizar aviso semanal com base no plano
    if (currentUser.plan) {
        updateWeeklyWarning();
    } else {
        updateWeeklyWarningNoPlan();
    }
}

// Funções auxiliares para planos
function getPlanName(planId) {
    return PLANS[planId]?.name || 'Básico';
}

function getPlanAulas(planId) {
    return PLANS[planId]?.aulasPorSemana || 2;
}

// ============================================
// 3. FUNÇÕES DE AVISO SEMANAL MELHORADAS
// ============================================

// Função para obter o range da semana de uma data
function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = domingo, 1 = segunda, ...
    
    // Ajustar para segunda como primeiro dia da semana
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { monday, sunday };
}
function getNextWeekRange() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const { monday, sunday } = getWeekRange(nextWeek);
    return { monday, sunday };
}
// Função para formatar range da semana
function formatWeekRange(date) {
    const { monday, sunday } = getWeekRange(date);
    
    const formatDayMonth = (d) => {
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };
    
    return `${formatDayMonth(monday)} a ${formatDayMonth(sunday)}`;
}

// Função para agrupar reservas por semana
function groupBookingsByWeek(bookings) {
    const grouped = {};
    
    bookings.forEach(booking => {
        const bookingDate = new Date(booking.date + 'T00:00:00');
        const { monday } = getWeekRange(bookingDate);
        const weekKey = monday.toISOString().split('T')[0];
        
        if (!grouped[weekKey]) {
            grouped[weekKey] = {
                weekStart: monday,
                weekKey: weekKey,
                bookings: []
            };
        }
        
        grouped[weekKey].bookings.push(booking);
    });
    
    // Ordenar semanas da mais recente para a mais antiga
    return Object.values(grouped).sort((a, b) => b.weekStart - a.weekStart);
}

// ============================================
// FUNÇÃO PARA CONTAR RESERVAS EM UMA SEMANA ESPECÍFICA
// ============================================
function countBookingsInWeek(date, userId) {
    const { monday, sunday } = getWeekRange(date);
    
    const count = bookings.filter(b => {
        if (b.userId !== userId) return false;
        const bookDate = new Date(b.date + 'T00:00:00');
        return bookDate >= monday && bookDate <= sunday;
    }).length;
    
    console.log(`📊 Semana de ${formatWeekRange(date)}: ${count} reservas`);
    return count;
}

function updateWeeklyWarning() {
    if (!weeklyWarning) return;
    
    if (currentUser?.isAdmin) {
        weeklyWarning.innerHTML = `
            <div class="warning-content">
                <i class="fas fa-crown"></i>
                <span>Modo Administrador - Voc\u00EA tem acesso total</span>
            </div>
        `;
        weeklyWarning.className = 'weekly-warning admin';
        return;
    }
    
    if (!currentUser?.plan || !userHasActivePlan()) {
        updateWeeklyWarningNoPlan();
        return;
    }
    
    const planName = currentUser.plan.name || currentUser.plan.id;
    const planLimit = currentUser.plan.aulasPorSemana;
    const planColor = currentUser.plan.color || '#6366f1';
    
    // DATA ATUAL PARA REFER�NCIA
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Seg, ..., 6=S�b
    
    // PR�XIMA SEMANA (sempre dispon\u00EDvel para agendamento)
    const nextWeekDate = new Date();
    nextWeekDate.setDate(today.getDate() + 7);
    const nextWeekRange = formatWeekRange(nextWeekDate);
    const nextWeekCount = countBookingsInWeek(nextWeekDate, currentUser.id);
    const nextRemaining = planLimit - nextWeekCount;
    const hasNextWeekBookings = nextWeekCount > 0;
    
    // SEMANA ATUAL (apenas para visualiza��o de aulas j� marcadas)
    const currentWeekRange = formatWeekRange(today);
    const currentWeekCount = countBookingsInWeek(today, currentUser.id);
    const hasCurrentWeekBookings = currentWeekCount > 0;
    
    // MENSAGEM INFORMATIVA SOBRE AGENDAMENTOS
    let infoMessage = '';
    if (dayOfWeek === 6 || dayOfWeek === 0) {
        infoMessage = 'Aos finais de semana, os agendamentos j\u00E1 s\u00E3o para a pr\u00F3xima semana.';
    } else {
        infoMessage = 'Os agendamentos dispon\u00EDveis s\u00E3o sempre para a pr\u00F3xima semana.';
    }
    
    weeklyWarning.innerHTML = `
        <div class="warning-content">
            <div class="warning-header">
                <span class="plan-indicator" style="background: ${planColor}">
                    <i class="fas ${PLANS[currentUser.plan.id]?.icon || 'fa-crown'}"></i>
                    Plano ${planName} - ${planLimit} aulas/semana
                </span>
                <span class="info-badge">
                    <i class="fas fa-info-circle"></i>
                    ${infoMessage}
                </span>
            </div>
            
            <div class="weeks-container">
                <!-- SEMANA ATUAL (Apenas consulta) -->
                <div class="week-card current ${!hasCurrentWeekBookings ? 'empty' : ''}">
                    <div class="week-title">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Semana em andamento</span>
                        <span class="week-dates">${currentWeekRange}</span>
                        ${hasCurrentWeekBookings ? '<span class="bookings-badge">Aulas marcadas</span>' : '<span class="no-bookings-badge">Sem aulas</span>'}
                    </div>
                    
                    <div class="week-stats">
                        ${hasCurrentWeekBookings ? `
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${(currentWeekCount/planLimit)*100}%; background: ${planColor}"></div>
                            </div>
                            
                            <div class="count-info">
                                <span class="used">
                                    <strong>${currentWeekCount}</strong>/${planLimit} aulas
                                    <i class="fas fa-check-circle" style="color: #10b981; margin-left: 5px;"></i>
                                </span>
                                <span class="current-bookings">
                                    <i class="fas fa-calendar-check"></i>
                                    ${currentWeekCount} aula${currentWeekCount !== 1 ? 's' : ''} marcada${currentWeekCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                        ` : `
                            <div class="empty-week-message">
                                <i class="fas fa-clock"></i>
                                <span>Nenhuma aula marcada para esta semana</span>
                            </div>
                        `}
                    </div>
                    
                    <div class="week-footer ${!hasCurrentWeekBookings ? 'info' : ''}">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Agendamentos para esta semana j\u00E1 est\u00E3o encerrados.</span>
                    </div>
                </div>
                
                <!-- PR�XIMA SEMANA (Dispon\u00EDvel para agendamento) -->
                <div class="week-card next ${hasNextWeekBookings ? 'has-bookings' : 'available'}">
                    <div class="week-title">
                        <i class="fas fa-calendar-plus"></i>
                        <span>Semana dispon\u00EDvel para agendamento</span>
                        <span class="week-dates">${nextWeekRange}</span>
                        ${hasNextWeekBookings ? '<span class="bookings-badge">Aulas agendadas</span>' : '<span class="available-badge">Dispon\u00EDvel</span>'}
                    </div>
                    
                    <div class="week-stats">
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${(nextWeekCount/planLimit)*100}%; background: ${planColor}"></div>
                        </div>
                        
                        <div class="count-info">
                            <span class="used">
                                <strong>${nextWeekCount}</strong>/${planLimit} aulas
                                ${nextWeekCount > 0 ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: 5px;"></i>' : ''}
                            </span>
                            
                            ${nextWeekCount > 0 ? 
                                `<span class="next-bookings">
                                    <i class="fas fa-calendar-check"></i>
                                    ${nextWeekCount} aula${nextWeekCount !== 1 ? 's' : ''} agendada${nextWeekCount !== 1 ? 's' : ''}
                                </span>` : 
                                `<span class="remaining positive">
                                    <i class="fas fa-arrow-up"></i>
                                    ${nextRemaining} vaga${nextRemaining !== 1 ? 's' : ''} dispon\u00EDve${nextRemaining !== 1 ? 'is' : 'l'}
                                </span>`
                            }
                        </div>
                    </div>
                    
                    ${hasNextWeekBookings ? `
                        <div class="next-week-details">
                            <i class="fas fa-info-circle"></i>
                            Voc\u00EA j\u00E1 tem aula${nextWeekCount !== 1 ? 's' : ''} marcada${nextWeekCount !== 1 ? 's' : ''} para a pr\u00F3xima semana
                        </div>
                    ` : `
                        <div class="next-week-details available">
                            <i class="fas fa-calendar-plus"></i>
                            <span>Vagas dispon\u00EDveis para a semana de ${nextWeekRange}</span>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
    
    weeklyWarning.className = 'weekly-warning info';
    
    // Se atingiu o limite na pr�xima semana, mostrar modal informativo
    if (nextWeekCount >= planLimit && !sessionStorage.getItem('limitModalShown')) {
        sessionStorage.setItem('limitModalShown', 'true');
        showLimitReachedModal(planLimit, nextWeekCount, planName);
    }
}
// 4. FUNÇÕES DE CONTAGEM E VALIDAÇÃO
// ============================================

// Conta reservas do usuário na semana atual (para compatibilidade)
const getWeeklyBookingsCount = () => {
    if (!currentUser) return 0;
    return countBookingsInWeek(new Date(), currentUser.id);
};

// Valida se pode cancelar uma reserva
function canCancelBooking(booking) {
    if (!booking) return { canCancel: false, reason: 'Reserva não encontrada' };
    
    const now = new Date();
    const bookingDate = new Date(`${booking.date}T${String(booking.hour).padStart(2, '0')}:00:00`);
    
    const diffMs = bookingDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinutes = diffMs / (1000 * 60);
    
    if (diffHours > CANCEL_LIMIT_HOURS) {
        return { 
            canCancel: true, 
            reason: 'ok',
            diffHours: Math.floor(diffHours),
            diffMinutes: Math.floor(diffMinutes % 60)
        };
    }
    
    if (diffHours <= CANCEL_LIMIT_HOURS) {
        if (booking.createdAt) {
            const createdDate = new Date(booking.createdAt);
            const minutesSinceCreation = (now - createdDate) / (1000 * 60);
            
            if (minutesSinceCreation <= PROXIMITY_GRACE_MINUTES) {
                return { 
                    canCancel: true, 
                    reason: 'grace_period',
                    minutesLeft: Math.floor(PROXIMITY_GRACE_MINUTES - minutesSinceCreation),
                    diffHours: Math.floor(diffHours),
                    diffMinutes: Math.floor(diffMinutes % 60)
                };
            }
        }
        
        const hoursUntil = Math.floor(diffHours);
        const minutesUntil = Math.floor(diffMinutes % 60);
        
        let timeMessage = '';
        if (hoursUntil > 0) {
            timeMessage = `${hoursUntil} hora${hoursUntil > 1 ? 's' : ''}`;
            if (minutesUntil > 0) {
                timeMessage += ` e ${minutesUntil} minuto${minutesUntil > 1 ? 's' : ''}`;
            }
        } else {
            timeMessage = `${minutesUntil} minuto${minutesUntil > 1 ? 's' : ''}`;
        }
        
        return { 
            canCancel: false, 
            reason: 'too_late',
            timeMessage,
            diffHours,
            diffMinutes
        };
    }
    
    return { canCancel: false, reason: 'unknown' };
}

// Mensagem de cancelamento
function getCancellationMessage(cancelCheck) {
    if (!cancelCheck) return 'Não é possível cancelar esta reserva';
    
    switch (cancelCheck.reason) {
        case 'ok':
            return `✅ Você pode cancelar esta reserva. Faltam ${cancelCheck.diffHours}h ${cancelCheck.diffMinutes}min para a aula.`;
        
        case 'grace_period':
            return `⏰ Período de graça: você tem ${cancelCheck.minutesLeft} minutos para cancelar esta reserva (aula em menos de ${CANCEL_LIMIT_HOURS}h).`;
        
        case 'too_late':
            return `❌ Cancelamento não permitido. Aula começa em ${cancelCheck.timeMessage}.`;
        
        default:
            return 'Não é possível cancelar esta reserva';
    }
}

// Valida horário da reserva
function validateBookingTime(date, hour) {
    const now = new Date();
    const bookingDate = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
    
    // Verificar se é horário passado
    if (bookingDate < now) {
        return {
            valid: false,
            error: 'past',
            message: '❌ Não é possível agendar em horários que já passaram.'
        };
    }
    
    // Verificar se está muito próximo (menos de 9 horas)
    if (bookingDate - now < CANCEL_LIMIT_HOURS * 60 * 60 * 1000) {
        return {
            valid: true,
            warning: true,
            message: `⏰ Esta aula começará em menos de ${CANCEL_LIMIT_HOURS}h. Você terá apenas ${PROXIMITY_GRACE_MINUTES} minutos para cancelar após a reserva.`
        };
    }
    
    return { valid: true };
}
// FUNÇÃO PARA VERIFICAR SE O HORÁRIO JÁ PASSOU
function isPastDateTime(date, hour) {
    const now = new Date();
    const bookingDateTime = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
    
    // Comparar se a data/hora do agendamento é anterior ao momento atual
    return bookingDateTime < now;
}

// ============================================
// 5. FUNÇÕES DE CRONÔMETRO
// ============================================

function formatTimeRemaining(bookingDate) {
    const now = new Date();
    const diffMs = bookingDate - now;
    
    if (diffMs <= 0) {
        return { text: 'Aula já passou', class: 'expired', expired: true };
    }
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const remainingHours = diffHours % 24;
    const remainingMinutes = diffMinutes % 60;
    
    let timeText = '';
    let timeClass = '';
    
    if (diffDays > 0) {
        timeText = `${diffDays}d ${remainingHours}h`;
        timeClass = 'days';
    } else if (diffHours > 0) {
        timeText = `${diffHours}h ${remainingMinutes}min`;
        timeClass = 'hours';
    } else if (diffMinutes > 0) {
        timeText = `${diffMinutes}min`;
        timeClass = 'minutes';
    } else {
        timeText = `${diffSeconds}s`;
        timeClass = 'seconds';
    }
    
    let urgencyClass = 'safe';
    if (diffHours < 1) {
        urgencyClass = 'critical';
    } else if (diffHours < 6) {
        urgencyClass = 'warning';
    } else if (diffHours < 24) {
        urgencyClass = 'moderate';
    }
    
    return {
        text: timeText,
        class: `${timeClass} ${urgencyClass}`,
        full: `${timeText} restantes`,
        expired: false
    };
}

function startTimers() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        updateAllTimers();
    }, 1000);
}

function updateAllTimers() {
    const timerElements = document.querySelectorAll('.booking-timer');
    timerElements.forEach(element => {
        const datetime = element.dataset.datetime;
        if (datetime) {
            const bookingDate = new Date(datetime);
            const timeRemaining = formatTimeRemaining(bookingDate);
            
            if (timeRemaining.expired) {
                element.innerHTML = `<i class="fas fa-hourglass-end"></i> <span class="expired">Aula passou</span>`;
                element.classList.add('expired');
            } else {
                element.innerHTML = `<i class="fas fa-hourglass-half"></i> <span class="${timeRemaining.class}">${timeRemaining.text}</span>`;
                element.className = 'booking-timer';
                element.classList.add(...timeRemaining.class.split(' '));
            }
        }
    });
}

// ============================================
// 6. FUNÇÕES DE RENDERIZAÇÃO
// ============================================

function createHeaderCell(className, content) {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = content;
    return div;
}

function createHourLabel(hour) {
    const div = document.createElement('div');
    div.className = 'hour-label';
    div.innerHTML = `<span>${hour}:00</span>`;
    return div;
}

function createSlot(wd, h) {
    const slot = document.createElement('button');
    slot.className = 'slot-btn';
    
    const dateStr = nextDates[wd];
    
    if (!dateStr) {
        slot.classList.add('disabled');
        slot.innerHTML = '<i class="fas fa-ban"></i>';
        return slot;
    }
    
    const bookedList = isBooked(dateStr, h);
    const bookCount = bookedList.length;
    const isAvailable = availability[wd]?.[h] || false;
    const isFull = bookCount >= 4;
    const userHasBooking = bookedList.some(b => b.userId === currentUser?.id);
    const hasActivePlan = userHasActivePlan() || currentUser?.isAdmin;
    
    if (!isAvailable) {
        slot.classList.add('disabled');
        slot.innerHTML = '<i class="fas fa-ban"></i>';
    } else if (isFull) {
        slot.classList.add('full');
        slot.innerHTML = `<span class="count">${bookCount}/4</span><span class="label"> Lotado</span>`;
        slot.disabled = true;
    } else if (bookCount > 0) {
        slot.classList.add('partial');
        slot.innerHTML = `<span class="count">${bookCount}/4</span><span class="label"> vagas</span>`;
        if (!hasActivePlan) {
            slot.disabled = true;
            slot.classList.add('requires-plan');
            slot.title = 'Você precisa de um plano para agendar';
        }
    } else {
        slot.classList.add('available');
        slot.innerHTML = `<span class="count">0/4</span><span class="label"> Disponível</span>`;
        if (!hasActivePlan) {
            slot.disabled = true;
            slot.classList.add('requires-plan');
            slot.title = 'Você precisa de um plano para agendar';
        }
    }
    
    if (userHasBooking) {
        slot.classList.add('my-booking');
    }

    slot.dataset.weekday = wd;
    slot.dataset.hour = h;
    slot.dataset.date = dateStr;
    slot.dataset.available = isAvailable;
    slot.dataset.bookCount = bookCount;

    slot.addEventListener('click', onSlotClick);
    
    return slot;
}

function renderSchedule() {
    const grid = document.createElement('div');
    grid.className = 'grid';

    grid.appendChild(createHeaderCell('hour-header', '<i class="fas fa-clock"></i> Horário'));
    
    for (let i = 0; i < 5; i++) {
        grid.appendChild(createHeaderCell('weekday-header', weekdays[i]));
    }

    for (const h of HOURS) {
        grid.appendChild(createHourLabel(h));
        
        for (let wd = 1; wd <= 5; wd++) {
            const slot = createSlot(wd, h);
            grid.appendChild(slot);
        }
    }

    scheduleEl.style.opacity = '0';
    setTimeout(() => {
        scheduleEl.innerHTML = '';
        scheduleEl.appendChild(grid);
        scheduleEl.style.opacity = '1';
    }, 200);

    updateWeeklyWarning();
}

// ============================================
// 7. RENDERIZAÇÃO DE RESERVAS POR SEMANA
// ============================================

function renderMyBookings() {
    const el = document.getElementById('myBookingsList');
    if (!el) return;
    
    el.innerHTML = '';
    
    if (!currentUser) {
        el.innerHTML = '<p class="empty-message"><i class="fas fa-lock"></i> Faça login para ver suas reservas</p>';
        return;
    }

    const myBookings = bookings.filter(b => b.userId === currentUser.id);
    
    if (myBookings.length === 0) {
        el.innerHTML = '<p class="empty-message"><i class="fas fa-calendar-times"></i> Você não possui reservas</p>';
        return;
    }

    // Agrupar reservas por semana
    const groupedByWeek = groupBookingsByWeek(myBookings);
    
    groupedByWeek.forEach(weekGroup => {
        const weekStart = weekGroup.weekStart;
        const weekBookings = weekGroup.bookings.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calcular quantas reservas nesta semana
        const weekCount = weekBookings.length;
        const planLimit = currentUser.plan?.aulasPorSemana || 5;
        
        // Criar header da semana
        const weekHeader = document.createElement('div');
        weekHeader.className = 'week-header';
        
        const isCurrentWeek = getWeekRange(new Date()).monday.toISOString().split('T')[0] === weekGroup.weekKey;
        
        weekHeader.innerHTML = `
            <div class="week-title">
                <i class="fas fa-calendar-alt"></i>
                <span>Semana de ${formatWeekRange(weekStart)}</span>
                ${isCurrentWeek ? '<span class="current-week-badge">Semana atual</span>' : ''}
            </div>
            <div class="week-stats">
                <div class="week-progress">
                    <div class="progress-bar-small" style="width: ${(weekCount/planLimit)*100}%; background: ${currentUser.plan?.color || '#6366f1'}"></div>
                </div>
                <span class="week-count"><strong>${weekCount}</strong>/${planLimit} aulas</span>
            </div>
        `;
        
        el.appendChild(weekHeader);
        
        // Renderizar cada reserva da semana
        weekBookings.forEach(booking => {
            const item = createBookingItem(booking);
            el.appendChild(item);
        });
    });
    
    startTimers();
}

function createBookingItem(booking) {
    const item = document.createElement('div');
    item.className = 'my-booking-item';
    
    const bookingDateTime = new Date(`${booking.date}T${String(booking.hour).padStart(2, '0')}:00:00`);
    const datetimeStr = bookingDateTime.toISOString();
    
    const cancelCheck = canCancelBooking(booking);
    const canCancel = cancelCheck.canCancel;
    const formattedDate = formatDate(booking.date);
    const timeRemaining = formatTimeRemaining(bookingDateTime);
    const weekRange = formatWeekRange(bookingDateTime);
    
    // Determinar se é semana atual
    const isCurrentWeek = getWeekRange(new Date()).monday.toISOString().split('T')[0] === 
                          getWeekRange(bookingDateTime).monday.toISOString().split('T')[0];
    
    item.innerHTML = `
        <div class="booking-info">
            <div class="booking-main">
                <div class="booking-datetime">
                    <i class="fas fa-calendar-day"></i>
                    <span class="booking-date">${formattedDate}</span>
                    <span class="booking-hour">${booking.hour}:00</span>
                </div>
                <div class="booking-week">
                    <i class="fas fa-calendar-week"></i>
                    <span>${weekRange}</span>
                    ${isCurrentWeek ? '<span class="current-week-tag">Atual</span>' : ''}
                </div>
            </div>
            <div class="booking-timer" data-datetime="${datetimeStr}">
                <i class="fas fa-hourglass-half"></i>
                <span class="${timeRemaining.class}">${timeRemaining.text}</span>
            </div>
            <div class="booking-footer">
                ${!canCancel ? '<span class="cannot-cancel-badge"><i class="fas fa-lock"></i> Não pode cancelar</span>' : ''}
            </div>
        </div>
        <button class="btn-cancel" data-id="${booking.id}" ${!canCancel ? 'disabled' : ''}>
            <i class="fas fa-times"></i>
            <span>Cancelar</span>
        </button>
    `;
    
    const cancelBtn = item.querySelector('.btn-cancel');
    cancelBtn.addEventListener('click', () => cancelBooking(booking.id));
    
    return item;
}

function renderDayControls() {
    const el = document.getElementById('dayControls');
    if (!el) return;
    
    el.innerHTML = '';
    
    for (let wd = 1; wd <= 5; wd++) {
        const btn = document.createElement('button');
        btn.className = 'day-control-btn';
        
        const dayName = weekdays[wd - 1];
        const slots = availability[wd] || {};
        const anyEnabled = Object.values(slots).some(Boolean);
        
        btn.innerHTML = `
            <i class="fas fa-${anyEnabled ? 'check-circle' : 'times-circle'}"></i>
            ${dayName}
            <span class="status">${anyEnabled ? 'Ativo' : 'Inativo'}</span>
        `;
        btn.classList.toggle('active', anyEnabled);
        
        btn.addEventListener('click', async () => {
            if (!currentUser?.isAdmin) {
                showNotification('Apenas administradores podem alterar disponibilidade', 'error');
                return;
            }
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            
            const result = await fetchAPI('/admin/availability/day', {
                method: 'POST',
                body: JSON.stringify({ weekday: wd, enabled: !anyEnabled })
            });
            
            if (result.success) {
                showNotification(`Disponibilidade de ${dayName} atualizada!`, 'success');
                await loadData();
            } else {
                showNotification(`Erro: ${result.error}`, 'error');
                btn.disabled = false;
                btn.innerHTML = `
                    <i class="fas fa-${anyEnabled ? 'check-circle' : 'times-circle'}"></i>
                    ${dayName}
                    <span class="status">${anyEnabled ? 'Ativo' : 'Inativo'}</span>
                `;
            }
        });
        
        el.appendChild(btn);
    }
}

// ============================================
// 8. FUNÇÕES DE AÇÃO
// ============================================

async function cancelBooking(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    
    const cancelCheck = canCancelBooking(booking);
    
    if (!cancelCheck.canCancel) {
        const message = getCancellationMessage(cancelCheck);
        showNotification(message, 'error');
        return;
    }
    
    let confirmMessage = '⚠️ Deseja realmente cancelar esta reserva?';
    
    if (cancelCheck.reason === 'grace_period') {
        confirmMessage = `⚠️ Aula em menos de ${CANCEL_LIMIT_HOURS}h! Você tem apenas ${cancelCheck.minutesLeft} minutos para cancelar. Deseja cancelar agora?`;
    } else {
        confirmMessage = `⚠️ Cancelar reserva para ${formatDate(booking.date)} às ${booking.hour}:00?`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    const result = await fetchAPI(`/bookings/${id}?userId=${currentUser.id}`, {
        method: 'DELETE'
    });
    
    if (result.success) {
        showNotification('Reserva cancelada com sucesso!', 'success');
        await loadData();
    } else {
        showNotification(`Erro ao cancelar: ${result.error}`, 'error');
    }
}

function onSlotClick(e) {
    const btn = e.currentTarget;
    const wd = Number(btn.dataset.weekday);
    const h = Number(btn.dataset.hour);
    const date = btn.dataset.date;
    const isAvailable = btn.dataset.available === 'true';
    const bookCount = Number(btn.dataset.bookCount);

    // VERIFICAÇÃO DE HORÁRIO PASSADO - AGORA COM MODAL
    if (isPastDateTime(date, h)) {
        showPastTimeModal(date, h); // <-- NOVO MODAL
        return;
    }

    // Modo Admin - toggle disponibilidade
    if (adminMode && currentUser?.isAdmin) {
        const newState = !isAvailable;
        if (!confirm(`${newState ? '✅ Ativar' : '❌ Desativar'} horário ${h}:00 de ${weekdays[wd - 1]}?`)) return;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        fetchAPI('/admin/availability/toggle', {
            method: 'POST',
            body: JSON.stringify({ weekday: wd, hour: h, enabled: newState })
        }).then(() => {
            showNotification(`Horário ${newState ? 'ativado' : 'desativado'}!`, 'success');
            loadData();
        }).catch(() => {
            btn.disabled = false;
            showNotification('Erro ao alterar disponibilidade', 'error');
        });
        return;
    }
    
    // Verificar login
    if (!currentUser) {
        showNotification('Faça login para reservar um horário', 'error');
        showAuthScreen();
        return;
    }

    // VERIFICAÇÃO PRINCIPAL: Usuário tem plano ativo?
    if (!currentUser.isAdmin && !userHasActivePlan()) {
        showNotification('Você precisa escolher um plano primeiro', 'warning');
        showPlanRequiredModal();
        return;
    }

    // Verificar disponibilidade
    if (!isAvailable) {
        showNotification('Este horário está indisponível', 'error');
        return;
    }

    // Verificar se já reservou
    const bookedList = isBooked(date, h);
    if (bookedList.some(b => b.userId === currentUser.id)) {
        showNotification('Você já reservou este horário', 'warning');
        return;
    }
    
    // Verificar lotação
    if (bookCount >= 4) {
        showNotification('Este horário já está lotado!', 'error');
        return;
    }
    
    // Verificar limite semanal
    const limite = currentUser.plan?.aulasPorSemana || 0;
    if (getWeeklyBookingsCount() >= limite) {
        showNotification(`Seu plano permite apenas ${limite} aulas por semana`, 'warning');
        return;
    }

    openBookingModal(date, h);
}

// ============================================
// FUNÇÃO PARA CRIAR AULA FIXA
// ============================================
async function createFixedBooking(weekday, hour) {
  if (!currentUser) {
    showNotification('Faça login primeiro', 'error');
    return;
  }

  if (!confirm(`Deseja transformar esta aula em fixa?\n\nIsso significa que você terá aula automática toda ${weekdays[weekday-1]} às ${hour}:00.`)) {
    return;
  }

  try {
    const response = await fetch(`${API}/fixed-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        weekday: weekday,
        hour: hour
      })
    });

    const data = await response.json();

    if (response.ok) {
      showNotification('Aula fixa criada com sucesso!', 'success');
      loadData(); // Recarregar dados
    } else {
      showNotification(data.error || 'Erro ao criar aula fixa', 'error');
    }
  } catch (error) {
    console.error('Erro:', error);
    showNotification('Erro ao conectar com o servidor', 'error');
  }
}


// Modal para redirecionar para planos
function showPlanRequiredModal() {
    let modal = document.getElementById('planRequiredModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'planRequiredModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div class="modal-header">
                    <h3><i class="fas fa-crown" style="color: #f59e0b;"></i> Plano necessário</h3>
                    <button class="modal-close" onclick="closePlanModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <i class="fas fa-lock" style="font-size: 48px; color: #f59e0b; margin: 20px 0;"></i>
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Para realizar agendamentos, você precisa escolher um plano.
                    </p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                        <p style="color: #666; margin-bottom: 10px;">Benefícios dos planos:</p>
                        <ul style="list-style: none; padding: 0; text-align: left;">
                            <li style="margin: 8px 0;">✓ Acesso a todos horários</li>
                            <li style="margin: 8px 0;">✓ Até 5 aulas por semana</li>
                            <li style="margin: 8px 0;">✓ Suporte personalizado</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-actions" style="flex-direction: column;">
                    <button class="btn-primary" onclick="redirectToPlans()" style="width: 100%;">
                        <i class="fas fa-crown"></i>
                        Ver planos disponíveis
                    </button>
                    <button class="btn-secondary" onclick="closePlanModal()" style="width: 100%;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}
// MODAL PARA HORÁRIO PASSADO
function showPastTimeModal(date, hour) {
    // Fechar qualquer modal existente primeiro
    const existingModal = document.getElementById('pastTimeModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'pastTimeModal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    
    // Formatar data e hora para exibição
    const formattedDate = formatDate(date);
    const dateTimeStr = `${formattedDate} às ${hour}:00`;
    
    modal.innerHTML = `
        <div class="modal-content past-time-modal">
            <div class="modal-header">
                <h3>
                    <i class="fas fa-clock"></i>
                    Horário indisponível
                </h3>
                <button class="modal-close" onclick="closePastTimeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="past-time-icon">
                    <i class="fas fa-hourglass-end"></i>
                </div>
                <p class="past-time-message">
                    Este horário <br>
                    <strong>${dateTimeStr}</strong> <br>
                    já passou.
                </p>
                <div class="past-time-suggestion">
                    <i class="fas fa-lightbulb"></i>
                    <span>Que tal escolher um horário futuro?</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="closePastTimeModal()">
                    <i class="fas fa-check"></i>
                    Entendi
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Mostrar modal com animação
    setTimeout(() => {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }, 10);
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePastTimeModal();
        }
    });
}


// Função global para fechar o modal - CORRIGIDA
window.closePastTimeModal = function() {
    const modal = document.getElementById('pastTimeModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
};

// ============================================
// MODAL DE LIMITE SEMANAL ATINGIDO
// ============================================
function showLimitReachedModal(limit, used, planName) {
    // Fechar modal existente se houver
    const existingModal = document.getElementById('limitReachedModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'limitReachedModal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    
    modal.innerHTML = `
        <div class="modal-content limit-modal">
            <div class="modal-header">
                <h3>
                    <i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i>
                    Limite semanal atingido
                </h3>
                <button class="modal-close" onclick="closeLimitModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="limit-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                
                <p class="limit-message-main">
                    Você já utilizou <strong>${used} de ${limit} aulas</strong> disponíveis nesta semana.
                </p>
                
                <div class="progress-container large">
                    <div class="progress-bar" style="width: ${(used/limit)*100}%; background: #f59e0b;"></div>
                </div>
                
                <div class="limit-info">
                    <p>
                        <i class="fas fa-info-circle"></i>
                        Para agendar mais aulas nesta semana, você precisará fazer um upgrade de plano.
                    </p>
                </div>
                
                <div class="plans-comparison">
                    <h4>Planos disponíveis:</h4>
                    
                    <div class="plan-option">
                        <div class="plan-name">
                            <i class="fas fa-seedling" style="color: #10b981;"></i>
                            Plano Básico
                        </div>
                        <div class="plan-limit">2 aulas/semana</div>
                    </div>
                    
                    <div class="plan-option">
                        <div class="plan-name">
                            <i class="fas fa-fire" style="color: #3b82f6;"></i>
                            Plano Intermediário
                        </div>
                        <div class="plan-limit">3 aulas/semana</div>
                    </div>
                    
                    <div class="plan-option">
                        <div class="plan-name">
                            <i class="fas fa-rocket" style="color: #f59e0b;"></i>
                            Plano Avançado
                        </div>
                        <div class="plan-limit">4 aulas/semana</div>
                    </div>
                    
                    <div class="plan-option highlight">
                        <div class="plan-name">
                            <i class="fas fa-crown" style="color: #8b5cf6;"></i>
                            Plano Premium
                        </div>
                        <div class="plan-limit">5 aulas/semana</div>
                    </div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="redirectToUpgrade()">
                    <i class="fas fa-crown"></i>
                    Fazer upgrade de plano
                </button>
                <button class="btn-secondary" onclick="closeLimitModal()">
                    <i class="fas fa-clock"></i>
                    Agendar para próxima semana
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }, 10);
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeLimitModal();
        }
    });
}

// Funções globais para o modal de limite
window.closeLimitModal = function() {
    const modal = document.getElementById('limitReachedModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
};

// Redirecionar para página de planos
window.redirectToUpgrade = function() {
    closeLimitModal();
    window.location.href = '/plans';
};

// Funções globais para o modal
window.closePlanModal = function() {
    const modal = document.getElementById('planRequiredModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
};

window.redirectToPlans = function() {
    closePlanModal();
    window.location.href = '/plans';
};

// ============================================
// 9. FUNÇÕES DE MODAL DE RESERVA
// ============================================

function openBookingModal(date, h) {
    // Verificar novamente se é horário passado (segurança)
    if (isPastDateTime(date, h)) {
        showPastTimeModal(date, h); // <-- USAR O MESMO MODAL
        return;
    }
    
    modalContext = { date, hour: h };
    const weekday = new Date(date).getDay(); // 1-5
    const bookedList = isBooked(date, h);
    const bookCount = bookedList.length;
    const availableSpots = 4 - bookCount;
    const weeklyCount = getWeeklyBookingsCount();
    const weekRange = formatWeekRange(new Date(date));
    
    const timeValidation = validateBookingTime(date, h);
    
    modalTitle.innerHTML = `
        <i class="fas fa-calendar-check"></i>
        Reservar ${formatDate(date)} — ${h}:00
    `;
    
    const warningHtml = timeValidation.warning ? 
        `<div class="booking-warning">
            <i class="fas fa-exclamation-triangle"></i>
            ${timeValidation.message}
        </div>` : '';
    const fixedButtonHtml = `
        <div class="fixed-booking-option">
        <hr>
        <p><i class="fas fa-repeat"></i> <strong>Quer tornar este horário fixo?</strong></p>
        <p class="fixed-description">Isso criará uma aula automática toda ${weekdays[weekday-1]} às ${h}:00.</p>
        <button class="btn-secondary btn-fixed" onclick="createFixedBooking(${weekday}, ${h})">
            <i class="fas fa-calendar-plus"></i>
            Tornar Fixo
        </button>
        </div>
    `;
    modalUserName.innerHTML += fixedButtonHtml;
    
    modalUserName.innerHTML = `
        <div class="user-info-detail">
            <p><i class="fas fa-user"></i> <strong>${currentUser.name}</strong></p>
            <p><i class="fas fa-crown" style="color: ${currentUser.plan?.color || '#6366f1'}"></i> 
                <strong>Plano ${currentUser.plan?.name || 'Ativo'}</strong> (${currentUser.plan?.aulasPorSemana || 0}/semana)
            </p>
            <p><i class="fas fa-calendar-week"></i> <strong>Semana de ${weekRange}</strong></p>
            <p class="${availableSpots > 0 ? 'text-success' : 'text-danger'}">
                <i class="fas fa-users"></i> Vagas disponíveis: ${availableSpots}/4
            </p>
            <p>
                <i class="fas fa-chart-line"></i> Seus agendamentos nesta semana: ${weeklyCount}/${currentUser.plan?.aulasPorSemana || 0}
            </p>
            ${warningHtml}
        </div>
    `;
    
    modalConfirm.disabled = false;
    modalConfirm.innerHTML = 'Confirmar';
    
    modal.hidden = false;
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => {
        modal.hidden = true;
        modalContext = null;
        modalConfirm.disabled = false;
        modalConfirm.innerHTML = 'Confirmar';
    }, 300);
}

// ============================================
// 10. FUNÇÕES DE PLANOS (REDIRECIONAMENTO)
// ============================================

function showPlans() {
    window.location.href = '/plans';
}

async function selectPlan(planId) {
    if (!currentUser) {
        showNotification('Faça login primeiro', 'warning');
        showAuthScreen();
        return;
    }

    const selectedPlanData = {
        id: planId,
        name: PLANS[planId].name,
        aulasPorSemana: PLANS[planId].aulasPorSemana,
        price: PLANS[planId].price
    };
    
    sessionStorage.setItem('selectedPlan', JSON.stringify(selectedPlanData));
    window.location.href = '/checkout';
}

// ============================================
// 11. CONTROLE DE TELAS
// ============================================

// ============================================
// CRIAR BOT�O FLUTUANTE PARA MOBILE
// ============================================
function createFloatingPlansButton() {
    if (document.getElementById('floatingPlansBtn')) return;

    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'floatingPlansBtn';
    floatingBtn.className = 'floating-plans-btn';
    floatingBtn.innerHTML = `
        <i class="fas fa-crown"></i>
        <span>Planos</span>
    `;

    floatingBtn.addEventListener('click', () => {
        if (!currentUser) {
            showNotification('Fa�a login para ver os planos', 'warning');
            showAuthScreen();
            return;
        }
        window.location.href = '/plans';
    });

    document.body.appendChild(floatingBtn);
}
function showAuthScreen() {
    authScreen.style.display = 'flex';
    appScreen.classList.remove('active');
    if (modal) modal.hidden = true;
    const floatingBtn = document.getElementById('floatingPlansBtn');
    if (floatingBtn) floatingBtn.remove();
}

function showAppScreen() {
    authScreen.style.display = 'none';
    appScreen.classList.add('active');
    if (modal) modal.hidden = true;
    createFloatingPlansButton();
    loadData();
}

// ============================================
// 12. CARREGAR DADOS
// ============================================

async function loadData() {
    if (loading) return;
    loading = true;
    
    try {
        scheduleEl.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>`;
        
        await loadDates();
        
        const [availabilityRes, bookingsRes] = await Promise.all([
            fetchAPI('/admin/availability'),
            fetchAPI('/bookings')
        ]);
        
        if (!availabilityRes.success) throw new Error(availabilityRes.error);
        if (!bookingsRes.success) throw new Error(bookingsRes.error);
        
        availability = availabilityRes.data;
        bookings = bookingsRes.data;
        
        await checkSubscriptionStatus();
        
        // Renderizar interface
        renderSchedule();
        renderDayControls();
        renderMyBookings();
        startTimers();
        
        // Mostrar/esconder painel admin
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = currentUser?.isAdmin && adminMode ? '' : 'none';
        }
        
    } catch (e) {
        console.error('❌ Erro ao carregar dados:', e);
        showNotification('Erro ao carregar dados', 'error');
    } finally {
        loading = false;
    }
}

// ============================================
// 13. INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema iniciado - Versão com Visualização Semanal');
    
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabCadastro = document.getElementById('tabCadastro');
    const adminToggle = document.getElementById('adminMode');
    const refreshBtn = document.getElementById('refreshBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // ===== TABS DE AUTENTICAÇÃO =====
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabCadastro.classList.remove('active');
        loginForm.classList.add('active');
        cadastroForm.classList.remove('active');
    });
    
    tabCadastro.addEventListener('click', () => {
        tabCadastro.classList.add('active');
        tabLogin.classList.remove('active');
        cadastroForm.classList.add('active');
        loginForm.classList.remove('active');
    });
    
    // ===== LOGIN =====
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showNotification('Preencha todos os campos', 'error');
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        
        try {
            const response = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentUser = data.user || data.data || data;
                
                await checkSubscriptionStatus();
                
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                showAppScreen();
                showNotification(`Bem-vindo, ${currentUser.name}!`, 'success');
            } else {
                showNotification(data.error || 'Falha no login', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            showNotification('Erro de conexão', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
    
    // ===== CADASTRO =====
    cadastroForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('cadastroName').value;
        const email = document.getElementById('cadastroEmail').value;
        const phone = document.getElementById('cadastroPhone').value;
        const password = document.getElementById('cadastroPassword').value;
        const password2 = document.getElementById('cadastroPassword2').value;
        
        if (password !== password2) {
            showNotification('As senhas não conferem', 'error');
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        
        try {
            const response = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, password, password2 }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showNotification('Cadastro realizado! Faça login.', 'success');
                tabLogin.click();
                
                ['cadastroName', 'cadastroEmail', 'cadastroPhone', 'cadastroPassword', 'cadastroPassword2']
                    .forEach(id => document.getElementById(id).value = '');
                
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            } else {
                showNotification(data.error || 'Falha no cadastro', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            showNotification('Erro de conexão', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
    
    // ===== LOGOUT =====
    logoutBtn.addEventListener('click', async () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
        currentUser = null;
        localStorage.removeItem('user');
        showAuthScreen();
        showNotification('Logout realizado', 'info');
    });
    
    // ===== MODO ADMIN =====
    adminToggle.addEventListener('change', (e) => {
        if (!currentUser?.isAdmin) {
            showNotification('Apenas administradores podem acessar o modo admin', 'error');
            e.target.checked = false;
            return;
        }
        
        adminMode = e.target.checked;
        adminPanel.hidden = !adminMode;
        
        document.querySelectorAll('.slot-btn').forEach(btn => {
            btn.classList.toggle('admin-mode', adminMode);
        });
        
        showNotification(adminMode ? 'Modo admin ativado' : 'Modo admin desativado', 'info');
    });
    
    // ===== BOT�O DE PLANOS (sempre vis�vel) =====
    if (plansMenuBtn) {
        plansMenuBtn.addEventListener('click', () => {
            if (!currentUser) {
                showNotification('Fa�a login para ver os planos', 'warning');
                showAuthScreen();
                return;
            }
            window.location.href = '/plans';
        });
    }
    // ===== BOTÃO ATUALIZAR =====
    refreshBtn.addEventListener('click', () => {
        loadData();
        showNotification('Dados atualizados', 'success');
    });
    
    // ===== MODAL DE RESERVA =====
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modalClose?.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    
    modalConfirm.addEventListener('click', async () => {
        if (processingReservation) return;
        
        if (!modalContext) {
            closeModal();
            return;
        }
        
        if (!currentUser) {
            closeModal();
            showNotification('Usuário não autenticado', 'error');
            return;
        }
        
        processingReservation = true;
        modalConfirm.disabled = true;
        modalConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirmando...';
        
        try {
            const result = await fetchAPI('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    date: modalContext.date,
                    hour: modalContext.hour,
                    name: currentUser.name,
                    userId: currentUser.id
                })
            });
            
            if (result.success) {
                showNotification('Horário reservado com sucesso!', 'success');
                closeModal();
                await loadData();
            } else {
                showNotification(`Erro ao reservar: ${result.error}`, 'error');
                modalConfirm.disabled = false;
                modalConfirm.innerHTML = 'Confirmar';
            }
        } catch (error) {
            showNotification('Erro ao processar reserva', 'error');
            modalConfirm.disabled = false;
            modalConfirm.innerHTML = 'Confirmar';
        } finally {
            processingReservation = false;
        }
    });
    
    // ===== MENU ADMIN DROPDOWN =====
    if (adminMenuBtn) {
        adminMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentUser?.isAdmin) {
                adminDropdown.hidden = !adminDropdown.hidden;
            } else {
                showNotification('Apenas administradores', 'error');
            }
        });
    }
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.admin-menu')) {
            if (adminDropdown) adminDropdown.hidden = true;
        }
    });
    
    // ===== VERIFICAR USUÁRIO SALVO =====
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showAppScreen();
        } catch (err) {
            console.error('Erro ao recuperar usuário');
            localStorage.removeItem('user');
            showAuthScreen();
        }
    } else {
        showAuthScreen();
    }
});

// ============================================
// 14. ESTILOS ADICIONAIS MELHORADOS
// ============================================

const additionalStyles = `
    /* Modal de horário passado - CORRIGIDO */
    .past-time-modal {
        max-width: 380px !important;
        text-align: center;
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 24px;
    }

    .past-time-modal .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
    }

    .past-time-modal .modal-header h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        color: #1f2937;
        margin: 0;
    }

    .past-time-modal .modal-header h3 i {
        color: #ef4444;
    }

    .past-time-modal .modal-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #9ca3af;
        transition: color 0.2s;
        padding: 4px 8px;
        border-radius: 4px;
    }

    .past-time-modal .modal-close:hover {
        color: #4b5563;
        background: #f3f4f6;
    }

    .past-time-modal .modal-body {
        padding: 8px 0;
    }

    .past-time-icon {
        font-size: 64px;
        color: #ef4444;
        margin: 20px 0;
        animation: shake 0.5s ease;
    }

    .past-time-icon i {
        filter: drop-shadow(0 4px 8px rgba(239, 68, 68, 0.3));
    }

    .past-time-message {
        font-size: 16px;
        color: #1f2937;
        margin-bottom: 15px;
        line-height: 1.5;
    }

    .past-time-message strong {
        color: #ef4444;
        font-weight: 700;
        background: #fee2e2;
        padding: 4px 12px;
        border-radius: 20px;
        display: inline-block;
        margin: 5px 0;
    }

    .past-time-suggestion {
        background: #f3f4f6;
        padding: 12px;
        border-radius: 8px;
        color: #4b5563;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 20px 0;
    }

    .past-time-suggestion i {
        color: #f59e0b;
        font-size: 16px;
    }

    .past-time-modal .modal-actions {
        display: flex;
        justify-content: center;
        margin-top: 24px;
    }

    .past-time-modal .btn-primary {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
    }

    .past-time-modal .btn-primary:hover {
        background: #2563eb;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    /* Responsividade */
    @media (max-width: 480px) {
        .past-time-icon {
            font-size: 48px;
        }
        
        .past-time-message {
            font-size: 14px;
        }
        
        .past-time-suggestion {
            font-size: 12px;
            padding: 10px;
        }
    }
    .past-slot {
        opacity: 0.4;
        cursor: not-allowed;
        background: linear-gradient(135deg, #e5e7eb, #d1d5db);
        position: relative;
    }

    .past-slot::before {
        content: "⏰ Passado";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 10px;
        color: #6b7280;
        font-weight: 600;
        background: rgba(255,255,255,0.9);
        padding: 2px 6px;
        border-radius: 4px;
    }
    /* Estilos para informações do plano */
    .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .plan-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 30px;
        font-size: 13px;
        font-weight: 600;
        color: white;
        position: unset;
    }
    
    .plan-badge.no-plan {
        background: #f59e0b;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .plan-badge.no-plan:hover {
        background: #d97706;
        transform: translateY(-2px);
    }
    
    .plan-badge .btn-plan-small {
        background: white;
        color: #f59e0b;
        border: none;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        margin-left: 8px;
        cursor: pointer;
    }
    
    .plan-badge .plan-aulas {
        background: rgba(255,255,255,0.2);
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 10px;
        margin-left: 8px;
    }
    
    .plan-badge.admin {
        background: #8b5cf6;
    }
    
    /* Estilos para slots que requerem plano */
    .slot-btn.requires-plan {
        opacity: 0.6;
        cursor: not-allowed;
        position: relative;
        filter: grayscale(0.5);
    }
    
    .slot-btn.requires-plan:hover::after {
        content: "🔒 Necessário plano";
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        z-index: 10;
    }
    
    /* ===== AVISO SEMANAL MELHORADO ===== */
    .weekly-warning {
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transition: all 0.3s;
    }
    
    .weekly-warning.warning {
        border-left: 4px solid #f59e0b;
        background: #fff3cd;
    }
    
    .weekly-warning.info {
        border-left: 4px solid #3b82f6;
        background: #dbeafe;
    }
    
    .weekly-warning.admin {
        border-left: 4px solid #8b5cf6;
        background: #ede9fe;
    }
    
    .warning-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
    }
    
    .warning-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .warning-left i {
        font-size: 24px;
    }
    
    .warning-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .plan-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 20px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        width: fit-content;
    }
    
    .week-info {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #4b5563;
    }
    
    .warning-right {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
    }
    
    .progress-container {
        width: 200px;
        height: 8px;
        background: rgba(0,0,0,0.1);
        border-radius: 4px;
        overflow: hidden;
    }
    
    .progress-bar {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .counter-info {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
    }
    
    .current-count {
        font-weight: 600;
        color: #1f2937;
    }
    
    .remaining {
        color: #059669;
        font-weight: 600;
        background: rgba(5,150,105,0.1);
        padding: 4px 8px;
        border-radius: 20px;
    }
    
    .limit-reached {
        color: #dc2626;
        font-weight: 600;
        background: rgba(220,38,38,0.1);
        padding: 4px 8px;
        border-radius: 20px;
    }
    
    .warning-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 30px;
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .warning-link:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    /* ===== RESERVAS POR SEMANA ===== */
    .week-header {
        background: #f8fafc;
        padding: 12px 16px;
        margin: 16px 0 8px 0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        border: 1px solid #e2e8f0;
    }
    
    .week-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #1e293b;
    }
    
    .current-week-badge {
        background: #3b82f6;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }
    
    .week-stats {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    
    .progress-bar-small {
        height: 6px;
        width: 100px;
        background: #e2e8f0;
        border-radius: 3px;
        overflow: hidden;
    }
    
    .progress-bar-small div {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .week-count {
        font-size: 13px;
        font-weight: 500;
        color: #475569;
    }
    
    .my-booking-item {
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        border: 1px solid #e2e8f0;
        transition: all 0.2s;
    }
    
    .my-booking-item:hover {
        border-color: #94a3b8;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .booking-main {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .booking-datetime {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
    }
    
    .booking-date {
        font-weight: 600;
        color: #1e293b;
    }
    
    .booking-hour {
        background: #f1f5f9;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
        color: #334155;
    }
    
    .booking-week {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #64748b;
    }
    
    .current-week-tag {
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
    }
    
    .booking-timer {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        background: #f1f5f9;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .booking-timer .critical {
        color: #dc2626;
        animation: pulse 1s infinite;
    }
    
    .booking-timer .warning {
        color: #f59e0b;
    }
    
    .booking-timer .moderate {
        color: #3b82f6;
    }
    
    .booking-timer .safe {
        color: #10b981;
    }
    
    .booking-timer.expired {
        background: #e2e8f0;
        color: #64748b;
    }
    
    .booking-footer {
        margin-top: 4px;
    }
    
    .cannot-cancel-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: #fee2e2;
        color: #dc2626;
        border-radius: 12px;
        font-size: 10px;
    }
    
    .btn-cancel {
        padding: 6px 12px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-cancel:hover:not(:disabled) {
        background: #dc2626;
        transform: translateY(-1px);
    }
    
    .btn-cancel:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
        opacity: 0.5;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.6; }
        100% { opacity: 1; }
    }
    
    @media (max-width: 768px) {
        .warning-content {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .progress-container {
            width: 100%;
        }
        
        .counter-info {
            width: 100%;
            justify-content: space-between;
        }
        
        .week-header {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .week-stats {
            width: 100%;
            justify-content: space-between;
        }
        
        .my-booking-item {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .btn-cancel {
            width: 100%;
        }
    .weeks-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-top: 15px;
    }
    
    .week-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: all 0.3s;
    }
    
    .week-card.current {
        border-left: 4px solid #3b82f6;
    }
    
    .week-card.next {
        border-left: 4px solid #8b5cf6;
    }
    
    .week-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    }
    
    .week-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 14px;
        flex-wrap: wrap;
    }
    
    .week-title i {
        font-size: 18px;
    }
    
    .week-card.current .week-title i {
        color: #3b82f6;
    }
    
    .week-card.next .week-title i {
        color: #8b5cf6;
    }
    
    .week-title span:first-of-type {
        font-weight: 600;
        color: #1f2937;
    }
    
    .week-dates {
        background: #f3f4f6;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        color: #4b5563;
    }
    
    .week-stats {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .progress-container {
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
    }
    
    .progress-bar {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .count-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
    }
    
    .used {
        color: #4b5563;
    }
    
    .used strong {
        color: #1f2937;
        font-size: 16px;
    }
    
    .remaining {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    /* Estilos para o modal de limite */
    .limit-modal {
        max-width: 450px !important;
        text-align: center;
    }

    .limit-icon {
        font-size: 48px;
        color: #f59e0b;
        margin: 20px 0;
    }

    .limit-message-main {
        font-size: 16px;
        color: #1f2937;
        margin: 15px 0;
        font-weight: 500;
    }

    .limit-message-main strong {
        color: #f59e0b;
        font-size: 20px;
    }

    .progress-container.large {
        width: 100%;
        height: 12px;
        margin: 20px 0;
    }

    .limit-info {
        background: #fff7ed;
        border-left: 4px solid #f59e0b;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        text-align: left;
        display: flex;
        align-items: flex-start;
        gap: 10px;
    }

    .limit-info i {
        color: #f59e0b;
        font-size: 18px;
        margin-top: 2px;
    }

    .limit-info p {
        color: #7b5a3a;
        font-size: 14px;
        margin: 0;
    }

    .plans-comparison {
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
        text-align: left;
    }

    .plans-comparison h4 {
        color: #334155;
        margin-bottom: 12px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .plan-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px;
        border-bottom: 1px solid #e2e8f0;
    }

    .plan-option:last-child {
        border-bottom: none;
    }

    .plan-option.highlight {
        background: #f1f5f9;
        border-radius: 6px;
        margin-top: 5px;
    }

    .plan-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #334155;
    }

    .plan-limit {
        background: #e2e8f0;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        color: #475569;
    }

    /* Estilos para os cards de semana melhorados */
    .week-card.full {
        border-left: 4px solid #f59e0b;
        background: #fff7ed;
    }

    .week-card.has-bookings {
        border-left: 4px solid #10b981;
    }

    .limit-badge {
        background: #f59e0b;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        margin-left: auto;
    }

    .bookings-badge {
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        margin-left: auto;
    }

    .limit-message {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #fee2e2;
        color: #dc2626;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .limit-message i {
        font-size: 12px;
    }

    .remaining.neutral {
        background: #f1f5f9;
        color: #475569;
    }

    .next-bookings {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #d1fae5;
        color: #059669;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .next-week-details {
        margin-top: 12px;
        padding: 10px;
        background: #eff6ff;
        border-radius: 6px;
        font-size: 12px;
        color: #1e40af;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .next-week-details i {
        color: #3b82f6;
    }

    /* Estilos para a nova interface de semanas */
    .warning-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
    }

    .info-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #e2e8f0;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        color: #475569;
    }

    .info-badge i {
        color: #3b82f6;
    }

    .week-card.current.empty {
        background: #f8fafc;
        opacity: 0.8;
    }

    .week-card.next.available {
        border-left: 4px solid #10b981;
    }

    .available-badge {
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        margin-left: auto;
    }

    .no-bookings-badge {
        background: #94a3b8;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        margin-left: auto;
    }

    .empty-week-message {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 15px;
        background: #f1f5f9;
        border-radius: 8px;
        color: #475569;
        font-size: 13px;
        width: 100%;
    }

    .empty-week-message i {
        color: #94a3b8;
        font-size: 16px;
    }

    .current-bookings {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #dbeafe;
        color: #1e40af;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .week-footer {
        margin-top: 12px;
        padding: 8px 12px;
        background: #fee2e2;
        border-radius: 6px;
        font-size: 12px;
        color: #991b1b;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .week-footer.info {
        background: #e6f7e6;
        color: #2e7d32;
    }

    .week-footer i {
        font-size: 14px;
    }

    .next-week-details.available {
        background: #e6f7e6;
        color: #2e7d32;
    }

    .next-week-details.available i {
        color: #2e7d32;
    }

    /* Responsividade para os novos elementos */
    @media (max-width: 768px) {
        .warning-header {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .info-badge {
            width: 100%;
            justify-content: center;
        }
        
        .empty-week-message {
            padding: 12px;
            font-size: 12px;
        }
        
        .week-footer {
            padding: 6px 10px;
            font-size: 11px;
        }
    }

    /* Bot�o de planos no header */
    .btn-plans {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        color: white;
        border: none;
        border-radius: 30px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .btn-plans:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
        background: linear-gradient(135deg, #7c3aed, #4f46e5);
    }

    .btn-plans i {
        font-size: 16px;
    }

    .btn-plans.has-plan {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }

    .btn-plans.has-plan:hover {
        background: linear-gradient(135deg, #d97706, #b45309);
        box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
    }

    /* Bot�o flutuante para mobile */
    .floating-plans-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        color: white;
        border: none;
        border-radius: 50px;
        font-weight: 700;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
        z-index: 1000;
        animation: float 3s ease-in-out infinite;
    }

    .floating-plans-btn:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 28px rgba(139, 92, 246, 0.5);
        background: linear-gradient(135deg, #7c3aed, #4f46e5);
    }

    .floating-plans-btn i {
        font-size: 20px;
    }

    @keyframes float {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }

    .plans-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 700;
    }

    @media (min-width: 769px) {
        .floating-plans-btn {
            display: none;
        }
    }

    @media (max-width: 768px) {
        .btn-plans span {
            display: none;
        }

        .btn-plans {
            padding: 8px 12px;
        }

        .floating-plans-btn {
            display: flex;
        }
    }
    /* Responsividade */
    @media (max-width: 768px) {
        .limit-modal {
            width: 95%;
            padding: 20px;
        }
        
        .plan-option {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
        }
        
        .limit-info {
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

console.log('✅ Código carregado completamente!');






