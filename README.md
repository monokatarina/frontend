# Frontend - Agendamentos

Interface responsiva para visualizar e reservar horários da academia.

## 📁 Estrutura

- `public/` → Arquivos estáticos (HTML)
- `src/css/` → Estilos (CSS)
- `src/js/` → Scripts (JavaScript)
- `src/assets/` → Imagens, ícones

## 🚀 Como Usar

### Opção 1: Live Server (VS Code Extension)
1. Clique com botão direito em `public/index.html`
2. Selecione "Open with Live Server"
3. Acesse `http://localhost:5500/index.html`

### Opção 2: Python HTTP Server
```powershell
cd frontend
python -m http.server 8000
```
Acesse `http://localhost:8000/public/index.html`

### Opção 3: Node.js (http-server)
```powershell
npm install -g http-server
cd frontend
http-server
```

## 📋 Como Funciona

1. **Carregamento**: Ao abrir, carrega horários disponíveis e reservas do backend
2. **Grid de horários**: Mostra seg-sáb, 7h-12h e 14h-22h
3. **Cores**: Verde (livre), Vermelho (ocupado), Cinza (indisponível)
4. **Booking**: Clique em horário livre → modal com campo de nome
5. **Admin**: Checkbox "Admin" no topo → editar disponibilidade

## ⚙️ Requisitos

- Backend rodando em `http://localhost:3000`
- Navegador moderno (Chrome, Firefox, Safari, Edge)
