// ═══════════════════════════════════════════════════════
//  Playlist Modal  –  "Thêm vào Playlist" popup
//  Usage: window.openPlaylistModal({ slug, name, thumb_url, year })
// ═══════════════════════════════════════════════════════

(function () {
    const MODAL_ID = 'ap-playlist-modal';
    const CREATE_MODAL_ID = 'ap-create-playlist-modal';

    // ── Inject Modal HTML once ──────────────────────────
    function injectModals() {
        if (document.getElementById(MODAL_ID)) return;

        // Main "Add to Playlist" modal
        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.style.cssText = `
            display:none;position:fixed;inset:0;z-index:99999;
            background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);
            align-items:center;justify-content:center;
        `;
        modal.innerHTML = `
            <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:18px;
                        padding:24px;width:380px;max-width:92vw;max-height:80vh;display:flex;flex-direction:column;
                        box-shadow:0 24px 60px rgba(0,0,0,0.7);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
                    <h3 style="font-size:1.05rem;font-weight:700;color:#fff;margin:0;">Thêm vào Playlist</h3>
                    <button id="ap-pl-close" style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:22px;line-height:1;padding:0 4px;">×</button>
                </div>
                <div id="ap-pl-list" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;max-height:340px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.2) transparent;padding-right:4px;"></div>
                <button id="ap-pl-create-btn" style="
                    display:flex;align-items:center;justify-content:center;gap:8px;
                    margin-top:16px;padding:12px;border-radius:12px;width:100%;
                    background:rgba(232,185,79,0.08);border:1px solid rgba(232,185,79,0.25);
                    color:#e8b94f;font-size:14px;font-weight:600;cursor:pointer;
                    transition:background 0.2s;font-family:inherit;
                " onmouseover="this.style.background='rgba(232,185,79,0.16)'" onmouseout="this.style.background='rgba(232,185,79,0.08)'">
                    <span style="font-size:18px;">+</span> Tạo playlist mới
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        // Create Playlist modal
        const createModal = document.createElement('div');
        createModal.id = CREATE_MODAL_ID;
        createModal.style.cssText = `
            display:none;position:fixed;inset:0;z-index:100000;
            background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);
            align-items:center;justify-content:center;
        `;
        createModal.innerHTML = `
            <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:18px;
                        padding:28px;width:360px;max-width:92vw;
                        box-shadow:0 24px 60px rgba(0,0,0,0.8);">
                <h3 style="font-size:1.1rem;font-weight:700;color:#fff;margin:0 0 20px;">Tạo playlist mới</h3>
                <input id="ap-pl-name-input" type="text" placeholder="Tên playlist..."
                    style="width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);
                           background:rgba(255,255,255,0.05);color:#fff;font-size:14px;
                           outline:none;box-sizing:border-box;font-family:inherit;margin-bottom:12px;"
                    onfocus="this.style.borderColor='rgba(232,185,79,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'" />
                <input id="ap-pl-desc-input" type="text" placeholder="Mô tả (không bắt buộc)..."
                    style="width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);
                           background:rgba(255,255,255,0.05);color:#fff;font-size:14px;
                           outline:none;box-sizing:border-box;font-family:inherit;margin-bottom:20px;"
                    onfocus="this.style.borderColor='rgba(232,185,79,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'" />
                <div style="display:flex;gap:10px;">
                    <button id="ap-pl-create-confirm" style="
                        flex:1;padding:13px;border-radius:12px;border:none;
                        background:linear-gradient(135deg,#e8b94f,#d4a017);
                        color:#000;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;
                        transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                        Tạo
                    </button>
                    <button id="ap-pl-create-cancel" style="
                        padding:13px 20px;border-radius:12px;
                        background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                        color:rgba(255,255,255,0.7);font-size:14px;cursor:pointer;font-family:inherit;
                        transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">
                        Hủy
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(createModal);

        // ── Event Listeners ───────────────────────────────
        document.getElementById('ap-pl-close').addEventListener('click', closePlaylistModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closePlaylistModal(); });

        document.getElementById('ap-pl-create-btn').addEventListener('click', openCreateModal);
        document.getElementById('ap-pl-create-cancel').addEventListener('click', () => {
            createModal.style.display = 'none';
            if (window._apCurrentMovie) {
                modal.style.display = 'flex';
            }
        });
        createModal.addEventListener('click', (e) => { 
            if (e.target === createModal) {
                createModal.style.display = 'none'; 
                if (window._apCurrentMovie) modal.style.display = 'flex';
            }
        });

        document.getElementById('ap-pl-create-confirm').addEventListener('click', () => {
            const name = document.getElementById('ap-pl-name-input').value.trim();
            const desc = document.getElementById('ap-pl-desc-input').value.trim();
            if (!name) {
                document.getElementById('ap-pl-name-input').style.borderColor = '#f87171';
                return;
            }
            const pl = playlistService.create(name, desc);
            if (pl) {
                // Auto add current movie if available
                if (window._apCurrentMovie) {
                    playlistService.addMovie(pl.id, window._apCurrentMovie);
                    showToast(`Đã thêm vào "${pl.name}"`, 'success');
                } else {
                    showToast(`Đã tạo danh sách "${pl.name}"`, 'success');
                }
                document.getElementById('ap-pl-name-input').value = '';
                document.getElementById('ap-pl-desc-input').value = '';
                createModal.style.display = 'none';
                if (window._apCurrentMovie) closePlaylistModal();
                
                // If we are in profile page, reload playlists
                if (typeof loadedTabs !== 'undefined' && typeof loadPlaylists === 'function') {
                    loadedTabs.delete('playlists');
                    loadPlaylists();
                }
            }
        });

        // Enter key on name input
        document.getElementById('ap-pl-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('ap-pl-create-confirm').click();
        });
    }

    // ── Render playlist list ──────────────────────────────
    function renderList() {
        const container = document.getElementById('ap-pl-list');
        if (!container) return;
        const playlists = playlistService.getAll();
        const movie = window._apCurrentMovie;

        if (playlists.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:24px 0;color:rgba(255,255,255,0.35);font-size:13px;">
                    <span style="font-size:32px;display:block;margin-bottom:8px;">📋</span>
                    Chưa có playlist nào
                </div>`;
            return;
        }

        container.innerHTML = playlists.map(pl => {
            const alreadyIn = movie && pl.movies.some(m => m.slug === movie.slug);
            return `
                <div onclick="window._apToggleMovie('${pl.id}')" style="
                    display:flex;align-items:center;gap:12px;padding:12px 14px;
                    border-radius:12px;border:1px solid ${alreadyIn ? 'rgba(232,185,79,0.4)' : 'rgba(255,255,255,0.07)'};
                    background:${alreadyIn ? 'rgba(232,185,79,0.08)' : 'rgba(255,255,255,0.03)'};
                    cursor:pointer;transition:all 0.2s;user-select:none;
                " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='${alreadyIn ? 'rgba(232,185,79,0.08)' : 'rgba(255,255,255,0.03)'}'">
                    <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${alreadyIn ? '#e8b94f' : 'rgba(255,255,255,0.3)'};
                                display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${alreadyIn ? '#e8b94f' : 'transparent'};">
                        ${alreadyIn ? '<span style="color:#000;font-size:13px;font-weight:700;">✓</span>' : ''}
                    </div>
                    <div style="min-width:0;">
                        <div style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.name}</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:1px;">${pl.movies.length} phim</div>
                    </div>
                    ${alreadyIn ? '<span style="margin-left:auto;font-size:11px;color:#e8b94f;flex-shrink:0;">Đã thêm</span>' : ''}
                </div>
            `;
        }).join('');
    }

    // ── Toggle movie in playlist ──────────────────────────
    window._apToggleMovie = function (playlistId) {
        const movie = window._apCurrentMovie;
        if (!movie) return;
        const pl = playlistService.getById(playlistId);
        if (!pl) return;
        const alreadyIn = pl.movies.some(m => m.slug === movie.slug);
        if (alreadyIn) {
            playlistService.removeMovie(playlistId, movie.slug);
            showToast(`Đã xóa khỏi "${pl.name}"`, 'info');
        } else {
            playlistService.addMovie(playlistId, movie);
            showToast(`Đã thêm vào "${pl.name}"`, 'success');
        }
        renderList();
    };

    // ── Open / Close ──────────────────────────────────────
    function openCreateModal() {
        const modal = document.getElementById(MODAL_ID);
        const createModal = document.getElementById(CREATE_MODAL_ID);
        if (modal) modal.style.display = 'none';
        if (createModal) createModal.style.display = 'flex';
        setTimeout(() => document.getElementById('ap-pl-name-input').focus(), 100);
    }

    function closePlaylistModal() {
        const modal = document.getElementById(MODAL_ID);
        if (modal) modal.style.display = 'none';
        window._apCurrentMovie = null;
    }

    // ── Public API ────────────────────────────────────────
    window.openPlaylistModal = function (movie) {
        if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
            alert('Vui lòng đăng nhập để sử dụng tính năng này.');
            return;
        }
        injectModals();
        window._apCurrentMovie = movie;
        document.getElementById(MODAL_ID).style.display = 'flex';
        renderList();
    };

    window.openCreatePlaylistModalStandalone = function () {
        if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
            alert('Vui lòng đăng nhập để sử dụng tính năng này.');
            return;
        }
        injectModals();
        window._apCurrentMovie = null; // We are just creating, not adding a movie
        openCreateModal();
    };


    // ── Toast helper (reuse if exists) ───────────────────
    function showToast(msg, type = 'success') {
        // Use existing showMessage if available
        if (typeof showMessage === 'function') { showMessage(msg, type); return; }
        const colors = { success: '#4ade80', info: '#60a5fa', error: '#f87171' };
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
            background:#1a1a2e;border:1px solid ${colors[type]||colors.success};
            color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;
            z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,0.5);transition:opacity 0.3s;`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
    }
})();
