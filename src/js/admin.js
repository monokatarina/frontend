// admin.js - Painel Admin
const API = 'https://jokesteronline.org/api';

document.addEventListener('DOMContentLoaded', async () => {
  await loadBookings();
  await loadUsers();
});

async function loadBookings() {
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
  try {
    const res = await fetch(`${API}/bookings`);
    const bookings = await res.json();
    tbody.innerHTML = '';
    bookings.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${b.date}</td><td>${String(b.hour).padStart(2,'0')}:00</td><td>${b.name}</td><td><button class='btn danger' onclick='cancelBooking(${b.id})'>Cancelar</button></td>`;
      tbody.appendChild(tr);
    });
    if (bookings.length === 0) tbody.innerHTML = '<tr><td colspan="4">Nenhuma reserva</td></tr>';
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar reservas</td></tr>';
  }
}

async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
  try {
    const res = await fetch(`${API}/admin/users`);
    const users = await res.json();
    tbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.isAdmin ? 'Sim' : 'Não'}</td>`;
      tbody.appendChild(tr);
    });
    if (users.length === 0) tbody.innerHTML = '<tr><td colspan="4">Nenhum usuário</td></tr>';
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar usuários</td></tr>';
  }
}

async function cancelBooking(id) {
  if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;
  try {
    await fetch(`${API}/bookings/${id}`, { method: 'DELETE' });
    await loadBookings();
  } catch (e) {
    alert('Erro ao cancelar reserva');
  }
}
