// ============================================
// PAINEL DO PROFESSOR - DASHBOARD
// ============================================

const API = 'https://jokesteronline.org/api';
const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

let currentUser = null;
let bookings = [];
let selectedDate = new Date();
let filterType = 'all';

// Elementos DOM
const professorInfo = document.getElementById('professorInfo');
const selectedDateEl = document.getElementById('selectedDate');
const datePicker = document.getElementById('datePicker');
const timeline = document.getElementById('timeline');
const studentsGrid = document.getElementById('studentsGrid');
const totalAulas = document.getElementById('totalAulas');
const totalAlunos = document.getElementById('totalAlunos');
const proximaAula = document.getElementById('proximaAula');

// ===== VERIFICAÇÃO DE ADMIN =====
function checkAdmin() {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
        window.location.href = 'index.html';
        return false;
    }
    
    currentUser = JSON.parse(savedUser);
    
    if (!currentUser.isAdmin) {
        alert('Acesso restrito a administradores!');
        window.location.href = 'index.html';
        return false;
    }
    
    updateProfessorInfo();
    return true;
}

// ===== ATUALIZAR INFO DO PROFESSOR =====
function updateProfessorInfo() {
    professorInfo.innerHTML = `
        <span class="professor-badge">
            <i class="fas fa-chalkboard-teacher"></i>
            Prof. ${currentUser.name}
        </span>
    `;
}

// ===== FORMATAR DATA =====
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateBR(date) {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ===== CARREGAR RESERVAS =====
async function loadBookings() {
    try {
        const response = await fetch(`${API}/bookings`);
        const data = await response.json();
        bookings = data.data || data;
        
        updateDisplay();
    } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

// ===== ATUALIZAR DISPLAY =====
function updateDisplay() {
    const dateStr = formatDate(selectedDate);
    const dayBookings = bookings.filter(b => b.date === dateStr);
    
    // Agrupar por horário
    const grouped = groupByHour(dayBookings);
    
    updateSummary(dayBookings, grouped);
    renderTimeline(grouped);
    renderStudentsGrid(grouped);
    updateDateDisplay();
}

// ===== AGRUPAR POR HORÁRIO =====
function groupByHour(bookings) {
    const grouped = {};
    
    bookings.forEach(booking => {
        if (!grouped[booking.hour]) {
            grouped[booking.hour] = {
                hour: booking.hour,
                students: [],
                status: 'pending'
            };
        }
        grouped[booking.hour].students.push(booking);
    });
    
    // Ordenar por horário
    return Object.values(grouped).sort((a, b) => a.hour - b.hour);
}

// ===== ATUALIZAR SUMMARY CARDS =====
function updateSummary(dayBookings, grouped) {
    // Total de aulas (horários únicos)
    totalAulas.textContent = grouped.length;
    
    // Total de alunos
    totalAlunos.textContent = dayBookings.length;
    
    // Próxima aula
    const now = new Date();
    const currentHour = now.getHours();
    
    const nextClass = grouped.find(g => g.hour > currentHour);
    if (nextClass) {
        proximaAula.textContent = `${nextClass.hour}:00`;
    } else {
        proximaAula.textContent = '---';
    }
}

// ===== RENDERIZAR TIMELINE =====
function renderTimeline(grouped) {
    if (grouped.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhuma aula agendada para este dia</p>
            </div>
        `;
        return;
    }
    
    let filtered = grouped;
    if (filterType === 'pending') {
        filtered = grouped.filter(g => g.status === 'pending');
    } else if (filterType === 'completed') {
        filtered = grouped.filter(g => g.status === 'completed');
    }
    
    timeline.innerHTML = filtered.map(group => `
        <div class="timeline-item ${group.status}" onclick="openClassModal(${group.hour})">
            <div class="timeline-time">
                ${group.hour}:00
            </div>
            <div class="timeline-content">
                <div class="class-info">
                    <span class="class-hour">${group.students.length} aluno${group.students.length > 1 ? 's' : ''}</span>
                    <span class="class-students">
                        <i class="fas fa-user-graduate"></i>
                        ${group.students.map(s => s.name).join(', ')}
                    </span>
                    <span class="class-status ${group.status}">
                        ${group.status === 'pending' ? '⏳ Pendente' : '✅ Concluída'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== RENDERIZAR GRID DE ALUNOS =====
function renderStudentsGrid(grouped) {
    if (grouped.length === 0) {
        studentsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-users-slash"></i>
                <p>Nenhum aluno agendado</p>
            </div>
        `;
        return;
    }
    
    studentsGrid.innerHTML = grouped.map(group => `
        <div class="hour-card">
            <div class="hour-header">
                <span>${group.hour}:00</span>
                <span class="student-count">${group.students.length}/4</span>
            </div>
            <div class="students-list">
                ${group.students.map(student => `
                    <div class="student-item">
                        <div class="student-info">
                            <div class="student-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div>
                                <div class="student-name">${student.name}</div>
                                <div class="student-plan">
                                    <i class="fas fa-crown"></i>
                                    ${student.plan || 'Aluno'}
                                </div>
                            </div>
                        </div>
                        <div class="student-check" onclick="markStudentPresent(${student.id})">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// ===== ATUALIZAR DISPLAY DA DATA =====
function updateDateDisplay() {
    const dateStr = formatDateBR(selectedDate);
    selectedDateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    datePicker.value = formatDate(selectedDate);
}

// ===== MUDAR DATA =====
function changeDate(days) {
    selectedDate.setDate(selectedDate.getDate() + days);
    updateDisplay();
}

// ===== ABRIR MODAL DA AULA =====
window.openClassModal = function(hour) {
    const dateStr = formatDate(selectedDate);
    const classBookings = bookings.filter(b => 
        b.date === dateStr && b.hour === hour
    );
    
    const modal = document.getElementById('classModal');
    const modalBody = document.getElementById('classModalBody');
    const modalTitle = document.getElementById('classModalTitle');
    
    modalTitle.innerHTML = `<i class="fas fa-clock"></i> Aula das ${hour}:00`;
    
    modalBody.innerHTML = `
        <div class="class-details">
            <div class="class-detail-item">
                <span class="detail-label">Horário:</span>
                <span class="detail-value">${hour}:00 - ${hour + 1}:00</span>
            </div>
            <div class="class-detail-item">
                <span class="detail-label">Total alunos:</span>
                <span class="detail-value">${classBookings.length}/4</span>
            </div>
            <div class="class-detail-item">
                <span class="detail-label">Alunos:</span>
                <div class="student-list-modal">
                    ${classBookings.map(s => `
                        <div class="student-item">
                            <i class="fas fa-user"></i>
                            ${s.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    modal.hidden = false;
    
    document.getElementById('markCompleted').onclick = () => {
        markClassCompleted(hour);
    };
};

// ===== MARCAR AULA COMO CONCLUÍDA =====
async function markClassCompleted(hour) {
    // Aqui você pode implementar a lógica para marcar a aula como concluída
    // Por exemplo, enviar para o backend
    showNotification(`Aula das ${hour}:00 marcada como concluída!`, 'success');
    closeModal();
}

// ===== MARCAR ALUNO COMO PRESENTE =====
window.markStudentPresent = function(studentId) {
    showNotification('Presença registrada!', 'success');
};

// ===== FECHAR MODAL =====
function closeModal() {
    document.getElementById('classModal').hidden = true;
}

// ===== NOTIFICAÇÕES =====
function showNotification(message, type = 'info') {
    // Usar a mesma função do main-new.js
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// ===== FILTROS =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        filterType = e.target.dataset.filter;
        
        const dateStr = formatDate(selectedDate);
        const dayBookings = bookings.filter(b => b.date === dateStr);
        const grouped = groupByHour(dayBookings);
        renderTimeline(grouped);
    });
});

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdmin()) return;
    
    // Configurar data inicial
    selectedDate = new Date();
    datePicker.value = formatDate(selectedDate);
    
    // Carregar dados
    loadBookings();
    
    // Event listeners
    document.getElementById('prevDay').addEventListener('click', () => changeDate(-1));
    document.getElementById('nextDay').addEventListener('click', () => changeDate(1));
    document.getElementById('todayBtn').addEventListener('click', () => {
        selectedDate = new Date();
        updateDisplay();
    });
    
    datePicker.addEventListener('change', (e) => {
        selectedDate = new Date(e.target.value);
        updateDisplay();
    });
    
    document.getElementById('refreshBtn').addEventListener('click', loadBookings);
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
    
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('classModal');
        if (e.target === modal) closeModal();
    });
});