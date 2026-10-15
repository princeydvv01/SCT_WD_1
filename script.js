/* ==========================================================================
   MERIDIAN — script.js
   Handles: scroll-driven sky color transformation, aperture dial readout,
   navbar transforms, mobile menu, active-link tracking, scroll reveals,
   and the reserve form.
   ========================================================================== */

(() => {
    'use strict';

    const root = document.documentElement;

    /* ------------------------------------------------------------------
       1. SKY COLOR JOURNEY
       A sequence of RGB stops the background continuously interpolates
       across as the user scrolls the full height of the page. Two stops
       are sampled at all times and lerped, so there is never a hard cut.
       ------------------------------------------------------------------ */
    const SKY_STOPS = [{
            rgb: [126, 200, 227],
            label: 'DAWN',
            angle: 120
        },
        {
            rgb: [79, 209, 222],
            label: 'MORNING LIGHT',
            angle: 140
        },
        {
            rgb: [123, 95, 224],
            label: 'AURORA VEIL',
            angle: 160
        },
        {
            rgb: [255, 111, 145],
            label: 'ROSE HOUR',
            angle: 180
        },
        {
            rgb: [255, 140, 66],
            label: 'SUNSET',
            angle: 200
        },
        {
            rgb: [242, 200, 121],
            label: 'GOLDEN HOUR',
            angle: 220
        },
        {
            rgb: [58, 168, 138],
            label: 'EMERALD SKY',
            angle: 240
        },
        {
            rgb: [45, 140, 150],
            label: 'TEAL HORIZON',
            angle: 260
        },
        {
            rgb: [70, 76, 150],
            label: 'INDIGO HOUR',
            angle: 280
        },
        {
            rgb: [20, 30, 70],
            label: 'DEEP DUSK',
            angle: 300
        },
        {
            rgb: [11, 16, 38],
            label: 'NIGHT SKY',
            angle: 320
        },
    ];

    const lerp = (a, b, t) => a + (b - a) * t;
    const lerpRgb = (c1, c2, t) => [
        Math.round(lerp(c1[0], c2[0], t)),
        Math.round(lerp(c1[1], c2[1], t)),
        Math.round(lerp(c1[2], c2[2], t)),
    ];
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const smoothstep = (edge0, edge1, v) => {
        const t = clamp01((v - edge0) / (edge1 - edge0));
        return t * t * (3 - 2 * t);
    };

    function sampleSky(progress) {
        const stage = progress * (SKY_STOPS.length - 1);
        const i = Math.min(Math.floor(stage), SKY_STOPS.length - 2);
        const t = stage - i;
        const a = SKY_STOPS[i];
        const b = SKY_STOPS[i + 1];
        return {
            c1: lerpRgb(a.rgb, b.rgb, t),
            c2: lerpRgb(SKY_STOPS[Math.min(i + 2, SKY_STOPS.length - 1)].rgb, b.rgb, t),
            c3: lerpRgb(a.rgb, [11, 16, 38], t * 0.6),
            angle: lerp(a.angle, b.angle, t),
            label: t < 0.5 ? a.label : b.label,
            index: i,
            t,
        };
    }

    /* ------------------------------------------------------------------
       2. STARFIELD (canvas) — fades in during the back half of the scroll
       ------------------------------------------------------------------ */
    const canvas = document.getElementById('starsCanvas');
    const ctx = canvas.getContext('2d');
    let stars = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

        const count = window.innerWidth < 700 ? 90 : 180;
        stars = Array.from({
            length: count
        }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.3 + 0.3,
            twinkleSpeed: Math.random() * 0.015 + 0.005,
            phase: Math.random() * Math.PI * 2,
        }));
    }

    function drawStars(time) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (const s of stars) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.phase);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(245, 241, 230, ${0.25 + twinkle * 0.6})`;
            ctx.fill();
        }
        requestAnimationFrame(drawStars);
    }

    resizeCanvas();
    requestAnimationFrame(drawStars);
    window.addEventListener('resize', resizeCanvas);

    /* ------------------------------------------------------------------
       3. APERTURE DIAL — build tick marks once
       ------------------------------------------------------------------ */
    const dialTicks = document.getElementById('dialTicks');
    const dialNeedle = document.getElementById('dialNeedle');
    const dialLabel = document.getElementById('dialLabel');
    const dialCoord = document.getElementById('dialCoord');

    for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * 360;
        const rad = (angle * Math.PI) / 180;
        const inner = 46,
            outer = 52;
        const x1 = 60 + inner * Math.sin(rad);
        const y1 = 60 - inner * Math.cos(rad);
        const x2 = 60 + outer * Math.sin(rad);
        const y2 = 60 - outer * Math.cos(rad);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1.toFixed(2));
        line.setAttribute('y1', y1.toFixed(2));
        line.setAttribute('x2', x2.toFixed(2));
        line.setAttribute('y2', y2.toFixed(2));
        dialTicks.appendChild(line);
    }

    /* ------------------------------------------------------------------
       4. MAIN SCROLL LOOP — updates sky, dial, and navbar together
       ------------------------------------------------------------------ */
    const nav = document.getElementById('nav');
    let ticking = false;

    function onScrollFrame() {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? clamp01(scrollY / docHeight) : 0;

        const sky = sampleSky(progress);
        root.style.setProperty('--bg-c1', sky.c1.join(', '));
        root.style.setProperty('--bg-c2', sky.c2.join(', '));
        root.style.setProperty('--bg-c3', sky.c3.join(', '));
        root.style.setProperty('--bg-angle', `${sky.angle}deg`);
        root.style.setProperty('--stars-opacity', smoothstep(0.55, 0.88, progress).toFixed(3));

        // parallax drift for the blobs, so the sky feels alive, not just recolored
        const blobA = document.querySelector('.sky__blob--a');
        const blobB = document.querySelector('.sky__blob--b');
        const blobC = document.querySelector('.sky__blob--c');
        if (blobA) blobA.style.transform = `translate(${progress * 40}px, ${progress * -60}px)`;
        if (blobB) blobB.style.transform = `translate(${progress * -50}px, ${progress * 40}px)`;
        if (blobC) blobC.style.transform = `translate(-50%, -50%) rotate(${progress * 120}deg) scale(${1 + progress * 0.4})`;

        // dial
        dialNeedle.style.transform = `rotate(${progress * 360}deg)`;
        dialLabel.textContent = sky.label;
        const raHours = Math.floor(progress * 24);
        const raMinutes = Math.floor((progress * 24 * 60) % 60);
        dialCoord.textContent = `RA ${String(raHours).padStart(2, '0')}h ${String(raMinutes).padStart(2, '0')}m`;

        // navbar
        nav.classList.toggle('is-scrolled', scrollY > 40);

        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(onScrollFrame);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick, {
        passive: true
    });
    window.addEventListener('resize', requestTick);
    onScrollFrame(); // initial paint

    /* ------------------------------------------------------------------
       5. MOBILE MENU
       ------------------------------------------------------------------ */
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    function closeMenu() {
        mobileMenu.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

    /* ------------------------------------------------------------------
       6. ACTIVE NAV LINK TRACKING
       ------------------------------------------------------------------ */
    const sections = document.querySelectorAll('main .section[id]');
    const navLinks = document.querySelectorAll('.nav__link, .mobile-menu__link');

    const sectionObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navLinks.forEach((link) => {
                        link.classList.toggle('active', link.dataset.section === id);
                    });
                }
            });
        }, {
            rootMargin: '-45% 0px -50% 0px',
            threshold: 0
        }
    );
    sections.forEach((section) => sectionObserver.observe(section));

    /* ------------------------------------------------------------------
       7. SCROLL REVEALS
       ------------------------------------------------------------------ */
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15
        }
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    /* ------------------------------------------------------------------
       8. RESERVE FORM (front-end only — no backend wired up)
       ------------------------------------------------------------------ */
    const reserveForm = document.getElementById('reserveForm');
    const reserveConfirm = document.getElementById('reserveConfirm');

    reserveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        reserveConfirm.classList.add('is-visible');
        reserveForm.reset();
    });

    /* ------------------------------------------------------------------
       9. Header CTA scrolls straight to the reserve section
       ------------------------------------------------------------------ */
    document.getElementById('navCta').addEventListener('click', () => {
        document.getElementById('reserve').scrollIntoView({
            behavior: 'smooth'
        });
    });

})();