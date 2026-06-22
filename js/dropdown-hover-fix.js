// Fix dropdown hover behavior for both old .relative.group and new .nav-flat-dropdown
(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDropdownHover);
    } else {
        initDropdownHover();
    }

    function initDropdownHover() {
        // ── NEW: .nav-flat-dropdown (desktop v2) ──
        const flatDropdowns = document.querySelectorAll('nav .nav-flat-dropdown');
        flatDropdowns.forEach(group => {
            const button = group.querySelector('button.nav-flat-link');
            const panel = group.querySelector('.nav-dropdown-panel');
            if (!button || !panel) return;

            let hideTimeout;

            button.addEventListener('mouseenter', () => {
                // Close all other panels
                flatDropdowns.forEach(g => {
                    if (g !== group) {
                        const p = g.querySelector('.nav-dropdown-panel');
                        if (p) {
                            p.style.opacity = '0';
                            p.style.visibility = 'hidden';
                            p.style.transform = 'translateY(-6px)';
                        }
                    }
                });
                clearTimeout(hideTimeout);
                panel.style.opacity = '1';
                panel.style.visibility = 'visible';
                panel.style.transform = 'translateY(0)';
            });

            panel.addEventListener('mouseenter', () => {
                clearTimeout(hideTimeout);
                panel.style.opacity = '1';
                panel.style.visibility = 'visible';
                panel.style.transform = 'translateY(0)';
            });

            button.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    panel.style.opacity = '0';
                    panel.style.visibility = 'hidden';
                    panel.style.transform = 'translateY(-6px)';
                }, 120);
            });

            panel.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    panel.style.opacity = '0';
                    panel.style.visibility = 'hidden';
                    panel.style.transform = 'translateY(-6px)';
                }, 120);
            });
        });

        // ── OLD: .relative.group (fallback for other pages) ──
        const dropdownGroups = document.querySelectorAll('nav .relative.group');
        dropdownGroups.forEach(group => {
            const button = group.querySelector('button');
            const dropdown = group.querySelector('.absolute.top-full');
            if (!button || !dropdown) return;

            let hideTimeout;
            button.addEventListener('mouseenter', () => {
                dropdownGroups.forEach(g => {
                    if (g !== group) {
                        const d = g.querySelector('.absolute.top-full');
                        if (d) {
                            d.classList.remove('opacity-100', 'visible');
                            d.classList.add('opacity-0', 'invisible');
                        }
                    }
                });
                clearTimeout(hideTimeout);
                dropdown.classList.remove('opacity-0', 'invisible');
                dropdown.classList.add('opacity-100', 'visible');
            });

            dropdown.addEventListener('mouseenter', () => {
                clearTimeout(hideTimeout);
                dropdown.classList.remove('opacity-0', 'invisible');
                dropdown.classList.add('opacity-100', 'visible');
            });

            button.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    dropdown.classList.remove('opacity-100', 'visible');
                    dropdown.classList.add('opacity-0', 'invisible');
                }, 150);
            });

            dropdown.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    dropdown.classList.remove('opacity-100', 'visible');
                    dropdown.classList.add('opacity-0', 'invisible');
                }, 150);
            });
        });

        console.log('✅ Dropdown hover v2 initialized');
    }
})();
