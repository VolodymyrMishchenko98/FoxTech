(function () {
    const canvas = document.getElementById('fox-runner');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('fox-score');
    const timeEl = document.getElementById('fox-time');
    const statusEl = document.getElementById('fox-runner-status');
    const overlayEl = document.getElementById('fox-runner-overlay');
    const overlayTitleEl = document.getElementById('fox-runner-overlay-title');
    const overlayMainEl = document.getElementById('fox-runner-overlay-main');
    const overlayTextEl = document.getElementById('fox-runner-overlay-text');
    const finalScoreEl = document.getElementById('fox-runner-final-score');
    const rewardEl = document.getElementById('fox-runner-reward');
    const restartBtn = document.getElementById('fox-runner-restart');
    const jumpBtn = document.getElementById('fox-runner-jump');
    const tokenEl = document.getElementById('fox-client-token');
    const hintsEl = document.querySelector('[data-fox-runner-hints]');
    const submitUrl = canvas.dataset.submitUrl || '/api/game/submit-score/';

    const ROUND_SECONDS = 60;
    const GRAVITY = 2000;
    const JUMP_VELOCITY = -720;
    const FOX_WIDTH = 48;
    const FOX_HEIGHT = 34;
    const BASE_SPEED = 220;

    const state = {
        phase: 'running',
        score: 0,
        elapsed: 0,
        remaining: ROUND_SECONDS,
        width: 0,
        height: 0,
        groundY: 0,
        fox: {
            x: 120,
            y: 0,
            width: FOX_WIDTH,
            height: FOX_HEIGHT,
            velocityY: 0,
            onGround: true,
            runPhase: 0,
        },
        obstacles: [],
        bonuses: [],
        obstacleTimer: 1.1,
        bonusTimer: 0.8,
        scrollSpeed: BASE_SPEED,
        lastHit: '',
        clientToken: makeClientToken(),
    };

    let rafId = null;
    let lastFrameTime = 0;
    let submitAbortController = null;
    let destroyed = false;

    function makeClientToken() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        const random = Math.random().toString(36).slice(2, 10);
        return 'fox_' + Date.now().toString(36) + '_' + random;
    }

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
    }

    function circleRectOverlap(circle, rect) {
        const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
        const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        return dx * dx + dy * dy <= circle.radius * circle.radius;
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const displayWidth = Math.max(320, Math.round(rect.width));
        const displayHeight = Math.max(320, Math.round(rect.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        state.width = displayWidth;
        state.height = displayHeight;
        state.groundY = displayHeight - Math.max(64, Math.round(displayHeight * 0.17));
        const groundTop = state.groundY - state.fox.height;
        if (state.fox.onGround) {
            state.fox.y = groundTop;
        } else {
            state.fox.y = Math.min(state.fox.y, groundTop);
        }
    }

    function resetRound() {
        state.phase = 'running';
        state.score = 0;
        state.elapsed = 0;
        state.remaining = ROUND_SECONDS;
        state.obstacles = [];
        state.bonuses = [];
        state.obstacleTimer = 0.7;
        state.bonusTimer = 0.5;
        state.scrollSpeed = BASE_SPEED;
        state.lastHit = '';
        state.fox.x = 120;
        state.fox.y = state.groundY - state.fox.height;
        state.fox.velocityY = 0;
        state.fox.onGround = true;
        state.fox.runPhase = 0;
        if (tokenEl) {
            tokenEl.textContent = state.clientToken.slice(0, 8).toUpperCase();
        }
        hideOverlay();
        updateHud();
    }

    function updateHud() {
        if (scoreEl) {
            scoreEl.textContent = String(Math.max(0, Math.floor(state.score)));
        }
        if (timeEl) {
            timeEl.textContent = Math.max(0, Math.ceil(state.remaining)) + ' с';
        }
        if (statusEl) {
            if (state.phase === 'submitting') {
                statusEl.textContent = 'Надсилаємо рахунок на сервер...';
            } else if (state.phase === 'running') {
                statusEl.textContent = 'Біжіть і стрибайте, щоб збирати ягоди.';
            } else if (state.lastHit === 'collision') {
                statusEl.textContent = 'Зіткнення з перешкодою. Очікуємо відповідь сервера.';
            } else if (state.lastHit === 'timeout') {
                statusEl.textContent = 'Раунд завершено. Очікуємо відповідь сервера.';
            } else {
                statusEl.textContent = 'Гра готова до старту.';
            }
        }
    }

    function showOverlay() {
        if (!overlayEl) return;
        overlayEl.style.opacity = '1';
        if (hintsEl) {
            hintsEl.classList.add('opacity-0');
        }
    }

    function hideOverlay() {
        if (!overlayEl) return;
        overlayEl.style.opacity = '0';
        if (hintsEl) {
            hintsEl.classList.remove('opacity-0');
        }
    }

    function spawnObstacle() {
        const height = rand(40, 72);
        const width = rand(28, 48);
        state.obstacles.push({
            x: state.width + rand(40, 180),
            y: state.groundY - height,
            width,
            height,
        });
    }

    function spawnBonus() {
        const radius = rand(8, 13);
        state.bonuses.push({
            x: state.width + rand(50, 190),
            y: state.groundY - rand(76, 124),
            radius,
            spin: rand(0, Math.PI * 2),
        });
    }

    function foxHitBox() {
        return {
            x: state.fox.x + 10,
            y: state.fox.y + 5,
            width: state.fox.width - 18,
            height: state.fox.height - 5,
        };
    }

    function finishRound(reason) {
        if (state.phase !== 'running') return;
        state.phase = 'submitting';
        state.lastHit = reason;
        state.remaining = 0;
        cancelLoop();
        render();
        submitScore();
    }

    async function submitScore() {
        if (destroyed) return;

        const payload = {
            score: Math.max(0, Math.floor(state.score)),
            client_token: state.clientToken,
            duration_ms: Math.max(1000, Math.round(state.elapsed * 1000)),
        };

        state.phase = 'submitting';
        updateHud();
        showOverlay();
        if (overlayTitleEl) overlayTitleEl.textContent = 'Надсилаємо рахунок';
        if (overlayMainEl) overlayMainEl.textContent = 'Відправляємо ваш результат...';
        if (overlayTextEl) {
            overlayTextEl.textContent = 'Нагорода з’явиться лише після відповіді сервера.';
        }
        if (finalScoreEl) finalScoreEl.textContent = String(payload.score);
        if (rewardEl) rewardEl.textContent = 'Очікування...';
        if (restartBtn) {
            restartBtn.disabled = true;
        }

        submitAbortController = new AbortController();

        try {
            const response = await fetch(submitUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
                signal: submitAbortController.signal,
            });

            const contentType = response.headers.get('content-type') || '';
            let data = null;
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = {
                    message: response.redirected && response.url && response.url.includes('/accounts/login')
                        ? 'Потрібно увійти до акаунта, щоб зберегти результат.'
                        : 'Сервер повернув неочікувану відповідь. Спробуйте ще раз.',
                };
            }

            if (!response.ok) {
                throw new Error(data && (data.error || data.message) ? (data.error || data.message) : 'Не вдалося надіслати рахунок');
            }

            if (overlayTitleEl) overlayTitleEl.textContent = 'Результат отримано';
            if (overlayMainEl) overlayMainEl.textContent = data.title || 'Ваш забіг завершено';
            if (overlayTextEl) {
                overlayTextEl.textContent = data.message || 'Сервер прийняв рахунок і підготував нагороду.';
            }
            if (rewardEl) {
                const promoCode = data.promo_code || data.code || data.reward;
                rewardEl.textContent = promoCode ? ('Ваш промокод: ' + promoCode) : 'Промокод не згенеровано';
            }
            if (finalScoreEl) finalScoreEl.textContent = String(data.score ?? payload.score);
            if (statusEl) {
                statusEl.textContent = 'Відповідь сервера отримано.';
            }
        } catch (error) {
            if (destroyed) return;
            if (overlayTitleEl) overlayTitleEl.textContent = 'Результат недоступний';
            if (overlayMainEl) overlayMainEl.textContent = 'Не вдалося надіслати рахунок';
            if (overlayTextEl) {
                overlayTextEl.textContent = error && error.name === 'AbortError'
                    ? 'Запит скасовано, бо ви залишили сторінку.'
                    : (error && error.message ? error.message : 'Спробуйте ще раз пізніше.');
            }
            if (rewardEl) rewardEl.textContent = 'Промокод не згенеровано';
            if (statusEl && error && error.name !== 'AbortError') {
                statusEl.textContent = 'Помилка надсилання на сервер.';
            }
        } finally {
            if (restartBtn) {
                restartBtn.disabled = false;
            }
        }
    }

    function getCsrfToken() {
        const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function jump() {
        if (state.phase !== 'running') return;
        if (!state.fox.onGround) return;
        state.fox.velocityY = JUMP_VELOCITY;
        state.fox.onGround = false;
    }

    function update(dt) {
        if (state.phase !== 'running') return;

        state.elapsed += dt;
        state.remaining = Math.max(0, ROUND_SECONDS - state.elapsed);
        state.scrollSpeed = BASE_SPEED + Math.min(180, state.elapsed * 3.6);

        state.fox.runPhase += dt * (state.fox.onGround ? 14 : 4);
        state.fox.velocityY += GRAVITY * dt;
        state.fox.y += state.fox.velocityY * dt;

        const groundTop = state.groundY - state.fox.height;
        if (state.fox.y >= groundTop) {
            state.fox.y = groundTop;
            state.fox.velocityY = 0;
            state.fox.onGround = true;
        }

        state.obstacleTimer -= dt;
        state.bonusTimer -= dt;

        if (state.obstacleTimer <= 0) {
            spawnObstacle();
            state.obstacleTimer = rand(1.0, 1.7);
        }
        if (state.bonusTimer <= 0) {
            spawnBonus();
            state.bonusTimer = rand(0.75, 1.45);
        }

        for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
            const obstacle = state.obstacles[i];
            obstacle.x -= state.scrollSpeed * dt;
            if (obstacle.x + obstacle.width < -40) {
                state.obstacles.splice(i, 1);
            }
        }

        for (let i = state.bonuses.length - 1; i >= 0; i -= 1) {
            const bonus = state.bonuses[i];
            bonus.x -= state.scrollSpeed * dt;
            bonus.spin += dt * 7;
            if (bonus.x + bonus.radius * 2 < -40) {
                state.bonuses.splice(i, 1);
            }
        }

        const foxBox = foxHitBox();
        for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
            const obstacle = state.obstacles[i];
            if (rectsOverlap(foxBox, obstacle)) {
                finishRound('collision');
                return;
            }
        }

        for (let i = state.bonuses.length - 1; i >= 0; i -= 1) {
            const bonus = state.bonuses[i];
            const bonusRect = {
                x: bonus.x - bonus.radius,
                y: bonus.y - bonus.radius,
                width: bonus.radius * 2,
                height: bonus.radius * 2,
            };
            if (circleRectOverlap({ x: bonus.x, y: bonus.y, radius: bonus.radius + 8 }, foxBox)) {
                state.score += 10;
                state.bonuses.splice(i, 1);
            } else if (rectsOverlap(foxBox, bonusRect)) {
                state.score += 10;
                state.bonuses.splice(i, 1);
            }
        }

        if (state.remaining <= 0) {
            finishRound('timeout');
        }
    }

    function drawRoundedRect(x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, state.height);
        sky.addColorStop(0, '#f8fbff');
        sky.addColorStop(0.68, '#edf4fb');
        sky.addColorStop(1, '#e8eef6');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, state.width, state.height);

        // Simple orange glow and clouds to keep the scene warm and lively.
        const glow = ctx.createRadialGradient(state.width * 0.2, state.height * 0.1, 20, state.width * 0.2, state.height * 0.1, state.width * 0.5);
        glow.addColorStop(0, 'rgba(255, 152, 0, 0.20)');
        glow.addColorStop(1, 'rgba(255, 152, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, state.width, state.height);

        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        drawCloud(state.width * 0.16, state.height * 0.16, 54);
        drawCloud(state.width * 0.69, state.height * 0.14, 42);
        drawCloud(state.width * 0.84, state.height * 0.26, 34);

        ctx.strokeStyle = 'rgba(148,163,184,0.32)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, state.groundY + 0.5);
        ctx.lineTo(state.width, state.groundY + 0.5);
        ctx.stroke();

        const ground = ctx.createLinearGradient(0, state.groundY, 0, state.height);
        ground.addColorStop(0, '#f3f6fb');
        ground.addColorStop(1, '#dce5ef');
        ctx.fillStyle = ground;
        ctx.fillRect(0, state.groundY, state.width, state.height - state.groundY);

        for (let i = 0; i < state.width; i += 52) {
            ctx.strokeStyle = 'rgba(148,163,184,0.16)';
            ctx.beginPath();
            ctx.moveTo(i, state.groundY + 18);
            ctx.lineTo(i + 16, state.groundY + 18);
            ctx.stroke();
        }
    }

    function drawCloud(x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.32, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(x + size * 0.34, y - size * 0.14, size * 0.38, Math.PI * 1, Math.PI * 1.85);
        ctx.arc(x + size * 0.78, y, size * 0.3, Math.PI * 1.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    function drawFox() {
        const fox = state.fox;
        const bob = fox.onGround ? Math.sin(fox.runPhase) * 1.5 : 0;
        const tilt = fox.onGround ? Math.sin(fox.runPhase * 0.5) * 0.03 : clamp(fox.velocityY / 1800, -0.25, 0.25);

        ctx.save();
        ctx.translate(fox.x + fox.width / 2, fox.y + fox.height / 2 + bob);
        ctx.rotate(tilt);

        // Tail
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.quadraticCurveTo(-38, -6, -28, 18);
        ctx.quadraticCurveTo(-18, 30, -6, 18);
        ctx.quadraticCurveTo(-2, 6, -18, 0);
        ctx.fill();

        // Body
        ctx.fillStyle = '#fb923c';
        drawRoundedRect(-24, -10, 36, 26, 12);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fdba74';
        drawRoundedRect(2, -16, 28, 24, 10);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(8, -16);
        ctx.lineTo(12, -30);
        ctx.lineTo(20, -16);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(22, -16);
        ctx.lineTo(28, -29);
        ctx.lineTo(34, -16);
        ctx.closePath();
        ctx.fill();

        // Belly and face
        ctx.fillStyle = '#fff7ed';
        drawRoundedRect(-18, -4, 18, 14, 7);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(20, -4, 10, 0, Math.PI * 2);
        ctx.fill();

        // Eyes and nose
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(16, -7, 1.6, 0, Math.PI * 2);
        ctx.arc(24, -7, 1.6, 0, Math.PI * 2);
        ctx.arc(30, -2, 1.9, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        const legSwing = fox.onGround ? Math.sin(fox.runPhase * 2.2) * 6 : 0;
        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-12, 14);
        ctx.lineTo(-14 + legSwing * 0.15, 24);
        ctx.moveTo(-2, 14);
        ctx.lineTo(0 - legSwing * 0.15, 25);
        ctx.stroke();

        ctx.restore();
    }

    function drawObstacle(obstacle) {
        const top = ctx.createLinearGradient(0, obstacle.y, 0, obstacle.y + obstacle.height);
        top.addColorStop(0, '#334155');
        top.addColorStop(1, '#0f172a');
        ctx.fillStyle = top;
        drawRoundedRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 14);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x + 8, obstacle.y + 8, obstacle.width - 16, obstacle.height - 16);

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(obstacle.x + 10, obstacle.y + 10, obstacle.width - 20, 5);
    }

    function drawBonus(bonus) {
        ctx.save();
        ctx.translate(bonus.x, bonus.y);
        ctx.rotate(bonus.spin);

        const berry = ctx.createRadialGradient(-4, -5, 2, 0, 0, bonus.radius + 3);
        berry.addColorStop(0, '#fda4af');
        berry.addColorStop(1, '#e11d48');
        ctx.fillStyle = berry;
        ctx.beginPath();
        ctx.arc(0, 0, bonus.radius + 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.moveTo(-1, -bonus.radius - 3);
        ctx.lineTo(5, -bonus.radius - 10);
        ctx.lineTo(10, -bonus.radius - 1);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function drawOverlayHints() {
        if (state.phase !== 'running') return;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.font = '600 14px Inter, system-ui, sans-serif';
        ctx.fillText('Збирайте ягоди', 24, 36);
        ctx.restore();
    }

    function render() {
        resizeCanvas();
        drawBackground();
        state.bonuses.forEach(drawBonus);
        state.obstacles.forEach(drawObstacle);
        drawFox();
        drawOverlayHints();
        updateHud();
    }

    function tick(timestamp) {
        if (destroyed || state.phase !== 'running') return;

        const dt = Math.min(0.033, (timestamp - lastFrameTime) / 1000 || 0);
        lastFrameTime = timestamp;
        update(dt);
        render();

        if (state.phase === 'running') {
            rafId = window.requestAnimationFrame(tick);
        }
    }

    function startLoop() {
        cancelLoop();
        lastFrameTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
    }

    function cancelLoop() {
        if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelLoop();
        if (submitAbortController) {
            submitAbortController.abort();
        }
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('pagehide', destroy);
        window.removeEventListener('beforeunload', destroy);
        canvas.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('keydown', handleKeyDown);
        if (jumpBtn) jumpBtn.removeEventListener('click', handleJumpClick);
        if (restartBtn) restartBtn.removeEventListener('click', handleRestartClick);
    }

    function handleResize() {
        render();
    }

    function handlePointerDown(event) {
        event.preventDefault();
        jump();
    }

    function handleKeyDown(event) {
        if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
            event.preventDefault();
            jump();
        }
        if ((event.code === 'Enter' || event.code === 'KeyR') && state.phase !== 'running') {
            event.preventDefault();
            handleRestartClick();
        }
    }

    function handleJumpClick() {
        jump();
    }

    function handleRestartClick() {
        window.location.reload();
    }

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('pagehide', destroy, { once: true });
    window.addEventListener('beforeunload', destroy, { once: true });
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    if (jumpBtn) jumpBtn.addEventListener('click', handleJumpClick);
    if (restartBtn) restartBtn.addEventListener('click', handleRestartClick);

    resizeCanvas();
    resetRound();
    startLoop();
})();
