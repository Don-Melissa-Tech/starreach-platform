const API = '/api';

const state = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null')
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
}

async function api(url, options = {}) {
    const token = localStorage.getItem('token');

    const headers = { ...(options.headers || {}) };

    // Only set JSON Content-Type when the body is NOT FormData.
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API}${url}`, { ...options, headers });

    let data;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : data.message || 'Request failed');
    }

    return data;
}

// Single, consistent saveAuth: keeps localStorage keys ('token'/'user')
// in sync with the in-memory `state` object.
function saveAuth(data) {
    if (!data || !data.token) {
        console.error('No token received from login:', data);
        throw new Error('Login succeeded but no authentication token was received.');
    }

    state.token = data.token;
    localStorage.setItem('token', data.token);

    if (data.user) {
        state.user = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.token = null;
    state.user = null;
    location.href = '/';
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function modal(html) {
    const root = $('#modalRoot');
    if (!root) return;
    root.innerHTML = `<div class="modal-backdrop" id="activeModal"><div class="modal">${html}</div></div>`;
    $('#activeModal').addEventListener('click', e => {
        if (e.target.id === 'activeModal') root.innerHTML = '';
    });
}

function authModal(type = 'login') {
    const login = type === 'login';

    modal(`<button class="close" id="closeModal">&times;</button>
        <h2>${login ? 'Welcome Back' : 'Create Account'}</h2>
        <p class="sub">${login ? 'Sign in to manage your bookings' : 'Join StarReach and book your preferred actor'}</p>
        ${login ? `
        <form id="loginForm">
            <div class="field"><label>Email</label>
            <input name="email" type="email" required placeholder="you@example.com"></div>
            <div class="field"><label>Password</label>
            <input name="password" type="password" required placeholder="••••••••"></div>
            <button class="btn btn-gold">Sign In</button>
        </form>
        <div class="switch">Don't have an account? <a href="#" id="switchRegister">Create one</a></div>
        ` : `
        <form id="registerForm">
            <div class="field"><label>First Name</label><input name="firstName" required></div>
            <div class="field"><label>Last Name</label><input name="lastName" required></div>
            <div class="field"><label>Email</label><input name="email" type="email" required></div>
            <div class="field"><label>Phone</label><input name="phone" required></div>
            <div class="field"><label>Company / Organization</label><input name="company"></div>
            <div class="field"><label>Password</label><input name="password" type="password" minlength="6" required></div>
            <button class="btn btn-gold">Create Account</button>
        </form>
        <div class="switch">Already have an account? <a href="#" id="switchLogin">Sign in</a></div>
        `}`);

    $('#closeModal').onclick = () => $('#modalRoot').innerHTML = '';

    if (login) {
        $('#switchRegister').onclick = e => { e.preventDefault(); authModal('register'); };

        $('#loginForm').onsubmit = async e => {
            e.preventDefault();
            try {
                const data = await api('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
                });
                saveAuth(data);
                $('#modalRoot').innerHTML = '';
                toast('Signed in successfully');
                location.href = data.user.role === 'admin' ? '/admin.html' : '/client.html';
            } catch (err) {
                console.error(err);
                toast(err.message);
            }
        };
    } else {
        $('#switchLogin').onclick = e => { e.preventDefault(); authModal('login'); };

        $('#registerForm').onsubmit = async e => {
            e.preventDefault();
            try {
                const data = await api('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
                });
                saveAuth(data);
                $('#modalRoot').innerHTML = '';
                toast('Account created');
                location.href = '/client.html';
            } catch (err) {
                toast(err.message);
            }
        };
    }
}

// ---------------------------------------------------------------------
// MANAGER CONTACT DIRECTORY — edit this by hand, no backend/API involved.
//
// Add one entry per actor, keyed by the actor's exact name as it
// appears on the site (case-sensitive, must match exactly). Any field
// left blank will just show as "Not available" in the booking modal.
// WhatsApp can be left blank if it's the same as the phone number.
// ---------------------------------------------------------------------
const MANAGER_DIRECTORY = {
    'Lena Star': {
        name: 'Manager Name',
        email: 'manager@example.com',
        phone: '+2348012345678',
        whatsapp: '+2348012345678'
    },
    'Given By God': {
        name: 'Melissa',
        email: 'melissa@gmail.com',
        phone: '+2349012345678',
        whatsapp: '+2349012345678'
    },
    'DFUFDFOJOXJ': {
        name: 'Melissa',
        email: 'melissa@gmail.com',
        phone: '+2349012345678',
        whatsapp: '+2349012345678'
    }
};

// Booking is no longer self-service: a visitor must have an account before
// they can see any manager contact details, and each actor has their own
// manager, looked up locally from MANAGER_DIRECTORY above.
function bookingModal(actor) {
    if (!state.token) {
        authModal('register');
        toast('Create a free account first to see how to book this actor');
        return;
    }

    const manager = actor.manager;
    const hasManagerInfo = manager && (manager.name || manager.email || manager.phone || manager.whatsapp);

    if (hasManagerInfo) {
        renderManagerContact(actor, manager);
    } else {
        renderManagerError(actor, {
            message: `Manager contact details for ${actor.name} haven't been added yet. Check back later or contact support.`
        });
    }
}

function renderManagerContact(actor, manager) {
    const phone = manager?.phone || '';
    //const whatsappDigits = manager?.whatsapp || '';
    const whatsappRaw = manager?.whatsapp || phone;
    const whatsappDigits = whatsappRaw.replace(/[^\d+]/g, '').replace(/^\+/, '');

    modal(`<button class="close" id="closeModal">&times;</button>
        <h2>Book ${escapeHtml(actor.name)}</h2>
        <p class="sub">Bookings for ${escapeHtml(actor.name)} are arranged directly with their manager.
        Reach out using the details below to continue your booking manually.</p>
        <div class="manager-card">
            <p><strong>Manager:</strong> ${escapeHtml(manager?.name || 'Not available')}</p>
            <p><strong>Email:</strong> ${manager?.email
                ? `<a href="mailto:${escapeHtml(manager.email)}">${escapeHtml(manager.email)}</a>`
                : 'Not available'}</p>
            <p><strong>Phone:</strong> ${phone
                ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>`
                : 'Not available'}</p>
            <p><strong>WhatsApp:</strong> ${whatsappDigits
                ? `<a href="https://wa.me/${whatsappDigits}" target="_blank" rel="noopener">Chat on WhatsApp</a>`
                : 'Not available'}</p>
        </div>
        <p class="sub">When you reach out, mention ${escapeHtml(actor.name)}'s name, your event date and the event type.</p>`);

    $('#closeModal').onclick = () => $('#modalRoot').innerHTML = '';
}

function renderManagerError(actor, err) {
    modal(`<button class="close" id="closeModal">&times;</button>
        <h2>Book ${escapeHtml(actor.name)}</h2>
        <p class="sub">${escapeHtml(err?.message || 'Unable to load manager contact details right now. Please try again shortly.')}</p>`);
    $('#closeModal').onclick = () => $('#modalRoot').innerHTML = '';
}

async function loadactors() {
    const grid = $('#actorGrid');
    if (!grid) return;

    try {
        const actors = await api('/actors?featured=true');

        grid.innerHTML = actors.map(a => `
            <article class="actor-card">
                <a href="/actor.html?id=${a._id}" class="actor-img">
                    <img src="${escapeHtml(a.image || '/images/actor-1.jpg')}" alt="${escapeHtml(a.name)}">
                    <span class="category">${escapeHtml(a.category)}</span>
                </a>
                <div class="actor-body">
                    <h3>${escapeHtml(a.name)}</h3>
                    <span class="role">${escapeHtml(a.role || a.category)}</span>
                    <p>${escapeHtml(a.bio || 'Professional StarReach talent available for events and appearances.')}</p>
                    <div class="actor-foot">
                        <small>From USD ${Number(a.prices?.[0]?.price || 0).toLocaleString()}</small>
                        <button class="btn btn-gold btn-sm" data-book="${a._id}">Book</button>
                    </div>
                </div>
            </article>`).join('');

            grid.querySelectorAll('[data-book]').forEach(b => {
                b.onclick = e => {
                    e.preventDefault();
                    const a = actors.find(x => x._id === b.dataset.book);
                    if (a) bookingModal(a);
                };
            });
            // ^ bookingModal() itself checks for an account before revealing
            // anything, so no extra guard is needed here.

            revealactorCards(grid);
        } catch (e) {
            grid.innerHTML = '<div class="loading">Unable to load actors. Check the backend connection.</div>';
        }
    }

    // Slide each actor card in from the right as it scrolls into view.
    function revealactorCards(grid) {
        const cards = grid.querySelectorAll('.actor-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const index = Array.from(cards).indexOf(card);
                    setTimeout(() => card.classList.add('visible'), index * 120);
                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.15 });

        cards.forEach((card) => observer.observe(card));
    }

async function loadactorProfile() {
    const box = $('#actorProfile');
    if (!box) return;

    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
        box.innerHTML = '<div class="loading">actor not specified.</div>';
        return;
    }

    try {
        const a = await api('/actors/' + id);

        box.innerHTML = `<div class="profile-card">
            <div><img class="profile-image" src="${escapeHtml(a.image)}" alt="${escapeHtml(a.name)}"></div>
            <div>
                <span class="tag">${escapeHtml(a.category)}</span>
                <h1>${escapeHtml(a.name)}</h1>
                <p class="role">${escapeHtml(a.role || '')}</p>
                <p class="bio">${escapeHtml(a.bio || '')}</p>
                <p><strong>Location:</strong> ${escapeHtml(a.location || 'Available internationally')}</p>
                <h2>Booking Sections & Prices</h2>
                <div class="price-grid">${a.prices.map(p => `
                    <article class="price-card">
                        <h3>${escapeHtml(p.name)}</h3>
                        <div class="price">USD ${Number(p.price).toLocaleString()}</div>
                        <p>${escapeHtml(p.description || '')}</p>
                        <button class="btn btn-red btn-sm" data-book>Contact to Book</button>
                    </article>`).join('')}
                </div>
            </div>
        </div>`;

        box.querySelectorAll('[data-book]').forEach(b => {
            b.onclick = () => bookingModal(a);
        });
    } catch (e) {
        box.innerHTML = '<div class="loading">actor not found.</div>';
    }
}

async function loadClient() {
    const box = $('#clientView');
    if (!box) return;

    if (!state.token) {
        authModal('login');
        return;
    }

    try {
        const me = await api('/auth/me');
        state.user = me.user;

        const bookings = await api('/bookings/mine');

        box.innerHTML = `<div class="dash-head">
            <div>
                <span class="tag">CLIENT PROFILE</span>
                <h1>Welcome, ${escapeHtml(state.user.firstName)}</h1>
                <p>${escapeHtml(state.user.email)} ${state.user.phone ? '· ' + escapeHtml(state.user.phone) : ''}</p>
            </div>
            <a class="btn btn-gold" href="/#talent">Book Another actor</a>
        </div>
        <div class="panel">
            <h2>Profile Information</h2>
            <p><b>Name:</b> ${escapeHtml(state.user.firstName)} ${escapeHtml(state.user.lastName)}</p>
            <p><b>Email:</b> ${escapeHtml(state.user.email)}</p>
            <p><b>Company:</b> ${escapeHtml(state.user.company || '—')}</p>
        </div>
        <div class="panel">
            <h2>My Booking Requests</h2>
            ${bookings.length ? `
            <table class="table">
                <thead><tr><th>actor</th><th>Section</th><th>Event</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>${bookings.map(b => `
                    <tr>
                        <td>${escapeHtml(b.actor?.name || '—')}</td>
                        <td>${escapeHtml(b.section)}</td>
                        <td>${escapeHtml(b.eventType)}</td>
                        <td>${formatDate(b.eventDate)}</td>
                        <td><span class="status ${b.status}">${escapeHtml(b.status)}</span></td>
                    </tr>`).join('')}
                </tbody>
            </table>` : '<p>You have no booking requests yet.</p>'}
        </div>`;
    } catch (e) {
        logout();
    }
}

// =========================================================================
// ADMIN DASHBOARD
// =========================================================================

async function loadAdmin() {
    if (location.pathname !== '/admin.html') return;

    const view = $('#adminView');
    if (!view) { console.error('adminView element not found'); return; }

    const modalRoot = $('#modalRoot');
    if (!modalRoot) { console.error('modalRoot element not found'); return; }

    try {
        // 1. Check admin authentication
        const me = await api('/auth/me');
        const currentUser = me?.user;

        if (!currentUser || currentUser.role !== 'admin') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            location.href = '/login.html';
            return;
        }

        // 2. Load admin data
        const [stats, actors, bookings, clients] = await Promise.all([
            api('/admin/stats'),
            api('/actors'),
            api('/bookings'),
            api('/admin/clients')
        ]);

        // 3. Render dashboard
        view.innerHTML = `
        <div class="admin-layout">
            <aside class="admin-sidebar">
                <div class="admin-sidebar-brand">
                    <div class="brand">STARREACH<span>•</span></div>
                    <small>ADMIN CONTROL CENTER</small>
                </div>
                <nav class="admin-menu">
                    <button type="button" class="admin-menu-item active" data-admin-section="overview">📊 Dashboard</button>
                    <button type="button" class="admin-menu-item" data-admin-section="actors">🎤 actors</button>
                    <button type="button" class="admin-menu-item" data-admin-section="clients">👥 Clients</button>
                    <button type="button" class="admin-menu-item" data-admin-section="bookings">📅 Bookings</button>
                    <button type="button" class="admin-menu-item" data-admin-section="settings">⚙️ Settings</button>
                </nav>
                <button type="button" class="admin-menu-item admin-logout" data-admin-action="logout">🚪 Sign Out</button>
            </aside>

            <section class="admin-content">
                <div class="admin-section active" id="admin-overview">
                    <div class="admin-page-header">
                        <div>
                            <div class="eyebrow">ADMIN CONTROL CENTER</div>
                            <h1>STARREACH DASHBOARD</h1>
                            <p>Welcome back, ${escapeHtml(currentUser.firstName || 'Administrator')}. Manage your actors, clients and bookings.</p>
                        </div>
                    </div>

                    <div class="admin-stats">
                        <div class="admin-stat"><strong>${stats?.clients ?? clients.length}</strong><span>Clients</span></div>
                        <div class="admin-stat"><strong>${stats?.actors ?? actors.length}</strong><span>actors</span></div>
                        <div class="admin-stat"><strong>${stats?.bookings ?? bookings.length}</strong><span>Bookings</span></div>
                        <div class="admin-stat"><strong>${stats?.pending ?? 0}</strong><span>Pending</span></div>
                    </div>

                    <div class="admin-card">
                        <div class="admin-card-header">
                            <div><div class="eyebrow">QUICK ACTIONS</div><h2>MANAGEMENT</h2></div>
                        </div>
                        <div class="admin-quick-actions">
                            <button type="button" class="btn btn-primary" data-admin-section="actors">🎤 Manage actors</button>
                            <button type="button" class="btn btn-outline-light" data-admin-section="clients">👥 View Clients</button>
                            <button type="button" class="btn btn-outline-light" data-admin-section="bookings">📅 Manage Bookings</button>
                        </div>
                    </div>

                    <div class="admin-card">
                        <div class="admin-card-header">
                            <div><div class="eyebrow">RECENT ACTIVITY</div><h2>RECENT BOOKINGS</h2></div>
                            <button type="button" class="btn btn-outline-light" data-admin-section="bookings">View All</button>
                        </div>
                        <div class="table-wrap">
                            <table class="admin-table">
                                <thead><tr><th>Client</th><th>actor</th><th>Section</th><th>Event Date</th><th>Status</th></tr></thead>
                                <tbody>
                                    ${bookings.length ? bookings.slice(0, 5).map(booking => {
                                        const clientName = `${booking.client?.firstName || ''} ${booking.client?.lastName || ''}`.trim() || 'Client';
                                        const status = String(booking.status || 'pending').toLowerCase();
                                        return `<tr>
                                            <td><strong>${escapeHtml(clientName)}</strong><small>${escapeHtml(booking.client?.email || '')}</small></td>
                                            <td>${escapeHtml(booking.actor?.name || 'Unknown actor')}</td>
                                            <td>${escapeHtml(booking.section || 'Booking')}</td>
                                            <td>${formatDate(booking.eventDate)}</td>
                                            <td><span class="status-badge ${status}">${escapeHtml(status)}</span></td>
                                        </tr>`;
                                    }).join('') : '<tr><td colspan="5">No bookings found.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="admin-section" id="admin-actors">
                    <div class="admin-page-header">
                        <div>
                            <div class="eyebrow">TALENT MANAGEMENT</div>
                            <h1>actorS</h1>
                            <p>Add, edit and manage StarReach actors.</p>
                        </div>
                        <button type="button" class="btn btn-primary" data-actor-action="add">+ Add actor</button>
                    </div>
                    <div class="admin-card">
                        <div class="table-wrap">
                            <table class="admin-table">
                                <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Role</th><th>Location</th><th>Featured</th><th>Actions</th></tr></thead>
                                <tbody>
                                    ${actors.length ? actors.map(actor => `
                                        <tr>
                                            <td><img class="admin-actor-image" src="${escapeHtml(actor.image || '/images/placeholder.jpg')}" alt="${escapeHtml(actor.name || 'actor')}" onerror="this.onerror=null;this.src='/images/placeholder.jpg';"></td>
                                            <td><strong>${escapeHtml(actor.name || '')}</strong></td>
                                            <td>${escapeHtml(actor.category || '')}</td>
                                            <td>${escapeHtml(actor.role || '')}</td>
                                            <td>${escapeHtml(actor.location || '')}</td>
                                            <td>${actor.featured ? '<span class="status-badge confirmed">YES</span>' : '<span class="status-badge cancelled">NO</span>'}</td>
                                            <td>
                                                <div class="admin-actions">
                                                    <button type="button" class="btn btn-sm btn-outline-light" data-actor-action="edit" data-id="${actor._id}">Edit</button>
                                                    <button type="button" class="btn btn-sm btn-danger" data-actor-action="delete" data-id="${actor._id}">Delete</button>
                                                </div>
                                            </td>
                                        </tr>`).join('') : '<tr><td colspan="7">No actors found.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="admin-section" id="admin-clients">
                    <div class="admin-page-header">
                        <div><div class="eyebrow">CUSTOMER MANAGEMENT</div><h1>CLIENTS</h1><p>View registered StarReach clients.</p></div>
                    </div>
                    <div class="admin-card">
                        <div class="table-wrap">
                            <table class="admin-table">
                                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Registered</th></tr></thead>
                                <tbody>
                                    ${clients.length ? clients.map(client => `
                                        <tr>
                                            <td><strong>${escapeHtml(`${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client')}</strong></td>
                                            <td>${escapeHtml(client.email || '')}</td>
                                            <td>${escapeHtml(client.phone || '')}</td>
                                            <td>${escapeHtml(client.company || '')}</td>
                                            <td>${formatDate(client.createdAt)}</td>
                                        </tr>`).join('') : '<tr><td colspan="5">No registered clients found.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="admin-section" id="admin-bookings">
                    <div class="admin-page-header">
                        <div><div class="eyebrow">BOOKING MANAGEMENT</div><h1>BOOKINGS</h1><p>Review and manage booking requests.</p></div>
                    </div>
                    <div class="admin-card">
                        <div class="table-wrap">
                            <table class="admin-table">
                                <thead><tr><th>Client</th><th>actor</th><th>Section</th><th>Event Date</th><th>Status</th><th>Update</th></tr></thead>
                                <tbody>
                                    ${bookings.length ? bookings.map(booking => {
                                        const clientName = `${booking.client?.firstName || ''} ${booking.client?.lastName || ''}`.trim() || 'Client';
                                        const status = String(booking.status || 'pending').toLowerCase();
                                        return `<tr>
                                            <td><strong>${escapeHtml(clientName)}</strong><small>${escapeHtml(booking.client?.email || '')}</small></td>
                                            <td>${escapeHtml(booking.actor?.name || 'Unknown actor')}</td>
                                            <td>${escapeHtml(booking.section || 'Booking')}</td>
                                            <td>${formatDate(booking.eventDate)}</td>
                                            <td><span class="status-badge ${status}">${escapeHtml(status)}</span></td>
                                            <td>
                                                <select class="booking-status" data-booking-id="${booking._id}">
                                                    <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                                                    <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                                    <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                                                    <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                                </select>
                                            </td>
                                        </tr>`;
                                    }).join('') : '<tr><td colspan="6">No bookings found.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="admin-section" id="admin-settings">
                    <div class="admin-page-header">
                        <div><div class="eyebrow">SYSTEM SETTINGS</div><h1>SETTINGS</h1><p>Manage your administrator account.</p></div>
                    </div>
                    <div class="admin-card">
                        <h2>Administrator Account</h2>
                        <p>Signed in as: <strong>${escapeHtml(currentUser.email || '')}</strong></p>
                        <button type="button" class="btn btn-outline-light" data-admin-action="logout">Sign Out</button>
                    </div>
                </div>
            </section>
        </div>`;

        // 4. Navigation (event delegation - survives view.innerHTML re-renders)
        view.onclick = async function (event) {
            const sectionButton = event.target.closest('[data-admin-section]');
            if (sectionButton) {
                const section = sectionButton.dataset.adminSection;

                view.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
                view.querySelector(`#admin-${section}`)?.classList.add('active');

                view.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
                view.querySelector(`.admin-menu-item[data-admin-section="${section}"]`)?.classList.add('active');
                return;
            }

            const adminActionButton = event.target.closest('[data-admin-action]');
            if (adminActionButton) {
                if (adminActionButton.dataset.adminAction === 'logout') {
                    logout();
                    return;
                }
            }

            const actorButton = event.target.closest('[data-actor-action]');
            if (!actorButton) return;

            const actorAction = actorButton.dataset.actorAction;
            const actorId = actorButton.dataset.id;

            if (actorAction === 'add') {
                openactorModal();
                return;
            }

            if (actorAction === 'edit' && actorId) {
                try {
                    const actor = await api(`/actors/${actorId}`);
                    openactorModal(actor);
                } catch (error) {
                    console.error('Unable to load actor:', error);
                    toast(error.message || 'Unable to load actor');
                }
                return;
            }

            if (actorAction === 'delete' && actorId) {
                const confirmed = window.confirm('Are you sure you want to delete this actor?');
                if (!confirmed) return;

                try {
                    await api(`/actors/${actorId}`, { method: 'DELETE' });
                    toast('actor deleted successfully');
                    await loadAdmin();
                } catch (error) {
                    console.error('Delete actor error:', error);
                    toast(error.message || 'Unable to delete actor');
                }
                return;
            }
        };

        // 5. Booking status updates
        view.onchange = async function (event) {
            const select = event.target.closest('.booking-status');
            if (!select) return;

            const bookingId = select.dataset.bookingId;
            const status = select.value;
            if (!bookingId) return;

            try {
                await api(`/bookings/${bookingId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status })
                });

                toast('Booking status updated successfully');

                const row = select.closest('tr');
                const badge = row?.querySelector('.status-badge');
                if (badge) {
                    badge.className = `status-badge ${status}`;
                    badge.textContent = status;
                }
            } catch (error) {
                console.error('Booking status error:', error);
                toast(error.message || 'Unable to update booking status');
            }
        };

        // 6. Add/Edit actor modal (renders into #modalRoot, independent of #adminView)
        function openactorModal(actor = null) {
            modalRoot.innerHTML = `
                <div class="admin-modal" id="actorModal">
                    <div class="admin-modal-content">
                        <button type="button" class="admin-modal-close" id="closeactorModal">&times;</button>
                        <div class="eyebrow">actor MANAGEMENT</div>
                        <h2>${actor ? 'Edit actor' : 'Add actor'}</h2>
                        <form id="actorForm">
                            <input type="hidden" id="actorId" value="${actor?._id || ''}">

                            <label>actor Name
                                <input type="text" id="actorName" required value="${escapeHtml(actor?.name || '')}">
                            </label>

                            <label>Category
                                <input type="text" id="actorCategory" required value="${escapeHtml(actor?.category || '')}" placeholder="Actor, Musician, Speaker...">
                            </label>

                            <label>Role
                                <input type="text" id="actorRole" value="${escapeHtml(actor?.role || '')}" placeholder="Actor & Performer">
                            </label>

                            <label>Location
                                <input type="text" id="actorLocation" value="${escapeHtml(actor?.location || '')}" placeholder="Lagos, Nigeria">
                            </label>

                            <label>Biography
                                <textarea id="actorBio" rows="5" placeholder="Write a brief biography...">${escapeHtml(actor?.bio || '')}</textarea>
                            </label>

                            <label>
                                actor Image
                                <input type="file" id="actorImageFile" accept="image/jpeg,image/png,image/webp">
                                <small class="image-help">JPG, PNG or WebP. Maximum 5MB.</small>
                                <div id="actorImagePreview" class="actor-image-preview">
                                    ${actor?.image
                                        ? `<img src="${escapeHtml(actor.image)}" alt="${escapeHtml(actor.name || 'actor')}">`
                                        : '<span>No image selected</span>'}
                                </div>
                            </label>

                            <label class="checkbox-label">
                                <input type="checkbox" id="actorFeatured" ${actor?.featured !== false ? 'checked' : ''}>
                                Featured actor
                            </label>

                            <p class="sub">Note: manager contact info is no longer set here — edit the MANAGER_DIRECTORY object near the top of app.js instead.</p>

                            <div class="price-section">
                                <div class="price-section-header">
                                    <div><div class="eyebrow">BOOKING SERVICES</div><h3>PRICES</h3></div>
                                    <button type="button" class="btn btn-sm btn-outline-light" id="addPriceBtn">+ Add Price</button>
                                </div>
                                <div id="actorPrices"></div>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn btn-outline-light" id="cancelactorBtn">Cancel</button>
                                <button type="submit" class="btn btn-primary">Save actor</button>
                            </div>

                            <div class="price-section">
                                <div class="price-section-header">
                                    <div><div class="eyebrow">BOOKING CONTACT</div><h3>MANAGER INFO</h3></div>
                                </div>
                                <p class="sub">Shown to signed-in visitors when they click Book. Leave blank if not available yet.</p>
                                <label>Manager Name
                                    <input type="text" id="managerName" value="${escapeHtml(actor?.manager?.name || '')}" placeholder="e.g. Melissa">
                                </label>
                                <label>Manager Email
                                    <input type="email" id="managerEmail" value="${escapeHtml(actor?.manager?.email || '')}" placeholder="manager@example.com">
                                </label>
                                <label>Manager Phone
                                    <input type="text" id="managerPhone" value="${escapeHtml(actor?.manager?.phone || '')}" placeholder="+2348012345678">
                                </label>
                                <label>Manager WhatsApp
                                    <input type="text" id="managerWhatsapp" value="${escapeHtml(actor?.manager?.whatsapp || '')}" placeholder="Leave blank to use phone number">
                                </label>
                            </div>
                        </form>
                    </div>
                </div>`;

            const form = $('#actorForm');
            const pricesContainer = $('#actorPrices');
            const actorImageFile = $('#actorImageFile');
            const actorImagePreview = $('#actorImagePreview');

            // Existing image url (kept if the admin doesn't pick a new file)
            const existingImageUrl = actor?.image || '';

            function addPriceRow(price = {}) {
                const row = document.createElement('div');
                row.className = 'price-row';
                row.innerHTML = `
                    <input type="text" class="price-name" placeholder="Service / Section" value="${escapeHtml(price.name || '')}" required>
                    <input type="number" class="price-amount" placeholder="Amount" min="0" step="0.01" value="${price.price ?? ''}" required>
                    <input type="text" class="price-currency" placeholder="USD" value="${escapeHtml(price.currency || 'USD')}">
                    <input type="text" class="price-description" placeholder="Description" value="${escapeHtml(price.description || '')}">
                    <button type="button" class="btn btn-sm btn-danger remove-price">&times;</button>`;

                row.querySelector('.remove-price').addEventListener('click', () => row.remove());
                pricesContainer.appendChild(row);
            }

            if (actor && Array.isArray(actor.prices) && actor.prices.length) {
                actor.prices.forEach(price => addPriceRow(price));
            } else {
                addPriceRow();
            }

            $('#addPriceBtn').addEventListener('click', () => addPriceRow());

            actorImageFile.addEventListener('change', function () {
                const file = this.files?.[0];
                if (!file) return;

                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    toast('Please select a JPG, PNG or WebP image.');
                    this.value = '';
                    return;
                }

                if (file.size > 15 * 1024 * 1024) {
                    toast('Image must be smaller than 15MB.');
                    this.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = event => {
                    actorImagePreview.innerHTML = `<img src="${event.target.result}" alt="Selected actor image">`;
                };
                reader.readAsDataURL(file);
            });

            function closeactorModal() {
                modalRoot.innerHTML = '';
            }

            $('#closeactorModal').addEventListener('click', closeactorModal);
            $('#cancelactorBtn').addEventListener('click', closeactorModal);

            form.addEventListener('submit', async event => {
                event.preventDefault();

                const actorId = $('#actorId').value.trim();

                const prices = [];
                document.querySelectorAll('.price-row').forEach(row => {
                    const name = row.querySelector('.price-name').value.trim();
                    const price = Number(row.querySelector('.price-amount').value);
                    const currency = row.querySelector('.price-currency').value.trim() || 'USD';
                    const description = row.querySelector('.price-description').value.trim();

                    if (name && Number.isFinite(price)) {
                        prices.push({ name, price, currency, description });
                    }
                });

                const name = $('#actorName').value.trim();
                const category = $('#actorCategory').value.trim();
                const role = $('#actorRole').value.trim();
                const location = $('#actorLocation').value.trim();
                const bio = $('#actorBio').value.trim();
                const featured = $('#actorFeatured').checked;
                const imageFile = actorImageFile.files?.[0] || null;
                const manager = {
                    name: $('#managerName').value.trim(),
                    email: $('#managerEmail').value.trim(),
                    phone: $('#managerPhone').value.trim(),
                    whatsapp: $('#managerWhatsapp').value.trim()
                };

                if (!name) { toast('actor name is required'); return; }
                if (!category) { toast('actor category is required'); return; }

                const formData = new FormData();
                formData.append('name', name);
                formData.append('category', category);
                formData.append('role', role);
                formData.append('location', location);
                formData.append('bio', bio);
                formData.append('featured', featured);
                formData.append('prices', JSON.stringify(prices));
                formData.append('manager', JSON.stringify(manager));
                if (imageFile) {
                    formData.append('image', imageFile);
                } else if (existingImageUrl) {
                    formData.append('existingImage', existingImageUrl);
                }

                const saveButton = form.querySelector('button[type="submit"]');
                const originalText = saveButton ? saveButton.textContent : 'Save actor';

                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent = imageFile ? 'Uploading Image...' : 'Saving actor...';
                }

                try {
                    let savedactor;

                    if (actorId) {
                        savedactor = await api(`/actors/${actorId}`, { method: 'PUT', body: formData });
                        toast('actor updated successfully');
                    } else {
                        savedactor = await api('/actors', { method: 'POST', body: formData });
                        toast('actor added successfully');
                    }

                    console.log('actor saved:', savedactor);
                    
                    // Refresh the admin view to show the updated list of actors
                    closeactorModal();
                    await loadAdmin();
                    if (savedactor?._id && !document.querySelector(`[data-id="${savedactor._id}"]`)) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await loadAdmin();
                    } 
                } catch (error) {
                    console.error('Save actor error:', error);
                    toast(error.message || 'Unable to save actor');
                } finally {
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.textContent = originalText;
                    }
                }
            });
        }

    } catch (error) {
        console.error('Admin dashboard error:', error);

        view.innerHTML = `
            <div class="admin-error">
                <h2>Unable to load Admin Dashboard</h2>
                <p>${escapeHtml(error.message || 'Please sign in as an administrator.')}</p>
                <a class="btn btn-primary" href="/login.html">Sign In</a>
            </div>`;
    }
}

// =========================================================================
// INIT
// =========================================================================

function init() {
    document.addEventListener('click', e => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action) {
            e.preventDefault();
            if (action === 'logout') {
                logout();
            } else {
                authModal(action);
            }
        }

        const scroll = e.target.closest('[data-scroll]')?.dataset.scroll;
        if (scroll) {
            document.querySelector(scroll)?.scrollIntoView({ behavior: 'smooth' });
        }

        const gallery = e.target.closest('[data-gallery]');
        if (gallery) {
            toast(gallery.dataset.gallery + ' selected — choose an actor to book.');
        }
    });

    $('#hamburger')?.addEventListener('click', () => {
        const m = $('#mobileMenu');
        if (!m) return;
        m.style.display = m.style.display === 'block' ? 'none' : 'block';
    });

    $$('.faq-q').forEach(q => {
        q.onclick = () => q.nextElementSibling?.classList.toggle('open');
    });

    // Load only the page that is currently being viewed
    if (document.querySelector('#actorGrid')) loadactors();
    if (document.querySelector('#actorProfile')) loadactorProfile();
    if (document.querySelector('#clientView')) loadClient();
    if (document.querySelector('#adminView')) loadAdmin();
}

document.addEventListener('DOMContentLoaded', init);
