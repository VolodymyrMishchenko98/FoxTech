(function () {
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return '';
    }

    function formatDateTime(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat('uk-UA', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(date);
    }

    function clearNode(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function buildMessageNode(message, outgoing) {
        const row = document.createElement('div');
        row.className = `flex ${outgoing ? 'justify-end' : 'justify-start'}`;

        const bubble = document.createElement('div');
        bubble.className = outgoing
            ? 'max-w-[82%] rounded-3xl rounded-br-md bg-orange-600 px-4 py-3 text-sm text-white shadow-lg shadow-orange-600/20'
            : 'max-w-[82%] rounded-3xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-800';

        const meta = document.createElement('div');
        meta.className = outgoing ? 'mb-1 text-[11px] font-medium text-orange-100/90' : 'mb-1 text-[11px] font-medium text-slate-500';
        meta.textContent = `${message.sender_name || 'FoxTech'} · ${formatDateTime(message.created_at)}`;

        const text = document.createElement('p');
        text.className = 'whitespace-pre-wrap leading-6';
        text.textContent = message.text || '';

        bubble.appendChild(meta);
        bubble.appendChild(text);
        row.appendChild(bubble);
        return row;
    }

    function getThreadUrl(template, threadId) {
        return template.replace('/0/', `/${threadId}/`);
    }

    function openPanel(panel) {
        panel.classList.remove('hidden');
    }

    function closePanel(panel) {
        panel.classList.add('hidden');
    }

    function initUserWidget() {
        const widget = document.querySelector('[data-chat-widget][data-chat-role="user"]');
        if (!widget) return;

        const userId = Number(widget.dataset.chatUserId || 0);
        const managersUrl = widget.dataset.chatManagersUrl;
        const startUrl = widget.dataset.chatStartUrl;
        const threadsUrl = widget.dataset.chatThreadsUrl;
        const threadDetailTemplate = widget.dataset.chatThreadDetailTemplate;
        const threadSendTemplate = widget.dataset.chatThreadSendTemplate;
        const threadPollTemplate = widget.dataset.chatThreadPollTemplate;

        const launchButtons = document.querySelectorAll('[data-chat-launch]');
        const toggleButton = widget.querySelector('[data-chat-toggle]');
        const closeButton = widget.querySelector('[data-chat-close]');
        const panel = widget.querySelector('[data-chat-panel]');
        const threadList = widget.querySelector('[data-chat-thread-list]');
        const managerSelect = widget.querySelector('[data-chat-manager-select]');
        const startThreadButton = widget.querySelector('[data-chat-start-thread]');
        const showComposerButton = widget.querySelector('[data-chat-show-composer]');
        const composer = widget.querySelector('[data-chat-composer]');
        const conversation = widget.querySelector('[data-chat-conversation]');
        const emptyState = widget.querySelector('[data-chat-empty-state]');
        const messagesNode = widget.querySelector('[data-chat-messages]');
        const form = widget.querySelector('[data-chat-form]');
        const input = widget.querySelector('[data-chat-input]');
        const titleNode = widget.querySelector('[data-chat-thread-title]');
        const metaNode = widget.querySelector('[data-chat-thread-meta]');

        const state = {
            loaded: false,
            open: false,
            managers: [],
            threads: [],
            activeThreadId: null,
            lastMessageId: 0,
            pollTimer: null,
            loadingThread: false,
        };

        function stopPolling() {
            if (state.pollTimer) {
                window.clearInterval(state.pollTimer);
                state.pollTimer = null;
            }
        }

        function startPolling() {
            stopPolling();
            state.pollTimer = window.setInterval(() => {
                if (state.activeThreadId) {
                    pollActiveThread();
                }
            }, 3500);
        }

        function setConversationVisible(visible) {
            conversation.classList.toggle('hidden', !visible);
            emptyState.classList.toggle('hidden', visible);
        }

        function renderManagers() {
            clearNode(managerSelect);
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = state.managers.length ? 'Оберіть менеджера' : 'Немає доступних менеджерів';
            managerSelect.appendChild(defaultOption);

            state.managers.forEach((manager) => {
                const option = document.createElement('option');
                option.value = String(manager.id);
                option.textContent = manager.display_name || manager.username;
                managerSelect.appendChild(option);
            });

            startThreadButton.disabled = state.managers.length === 0;
        }

        function renderThreadList() {
            clearNode(threadList);

            if (!state.threads.length) {
                const empty = document.createElement('div');
                empty.className = 'rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500';
                empty.textContent = 'Поки що діалогів немає.';
                threadList.appendChild(empty);
                return;
            }

            state.threads.forEach((thread) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.threadId = String(thread.id);
                button.className = `w-full rounded-2xl border px-4 py-3 text-left transition ${
                    state.activeThreadId === thread.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-orange-500 hover:bg-orange-50'
                }`;

                const header = document.createElement('div');
                header.className = 'flex items-start justify-between gap-3';

                const info = document.createElement('div');
                const name = document.createElement('p');
                name.className = 'text-sm font-semibold text-slate-900';
                name.textContent = thread.counterpart_name || thread.manager_name || thread.customer_name || `Діалог #${thread.id}`;
                const meta = document.createElement('p');
                meta.className = 'text-xs text-slate-500';
                meta.textContent = formatDateTime(thread.created_at);
                info.appendChild(name);
                info.appendChild(meta);

                const unread = document.createElement('span');
                unread.className = 'rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700';
                unread.textContent = String(thread.unread_count || 0);

                header.appendChild(info);
                header.appendChild(unread);

                const preview = document.createElement('p');
                preview.className = 'mt-2 text-sm text-slate-600';
                preview.textContent = thread.last_message ? thread.last_message.text : 'Почніть розмову, коли будете готові.';

                button.appendChild(header);
                button.appendChild(preview);
                button.addEventListener('click', () => openThread(thread.id));
                threadList.appendChild(button);
            });
        }

        function updateSelection(threadId) {
            state.activeThreadId = threadId;
            Array.from(threadList.querySelectorAll('[data-thread-id]')).forEach((button) => {
                const isActive = Number(button.dataset.threadId) === threadId;
                button.classList.toggle('border-orange-500', isActive);
                button.classList.toggle('bg-orange-50', isActive);
                button.classList.toggle('bg-white', !isActive);
            });
        }

        function renderMessages(messages) {
            clearNode(messagesNode);
            if (!messages.length) {
                const empty = document.createElement('div');
                empty.className = 'rounded-2xl bg-white px-4 py-3 text-sm text-slate-500';
                empty.dataset.chatEmptyState = '1';
                empty.textContent = 'Повідомлень поки немає.';
                messagesNode.appendChild(empty);
                return;
            }

            messages.forEach((message) => {
                messagesNode.appendChild(buildMessageNode(message, message.sender_id === userId));
                state.lastMessageId = Math.max(state.lastMessageId, message.id || 0);
            });
            messagesNode.scrollTop = messagesNode.scrollHeight;
        }

        async function loadManagers() {
            const response = await fetch(managersUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            state.managers = data.managers || [];
            renderManagers();
        }

        async function loadThreads(preferredThreadId = null) {
            const response = await fetch(threadsUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            state.threads = data.threads || [];
            renderThreadList();

            if (state.threads.length) {
                const nextThreadId = preferredThreadId || state.activeThreadId || state.threads[0].id;
                await openThread(nextThreadId, { silent: true });
            } else {
                state.activeThreadId = null;
                state.lastMessageId = 0;
                titleNode.textContent = 'Оберіть діалог';
                metaNode.textContent = 'Почніть розмову з менеджером.';
                setConversationVisible(false);
            }
        }

        async function openThread(threadId, options = {}) {
            if (!threadId || state.loadingThread) return;
            state.loadingThread = true;

            try {
                const response = await fetch(getThreadUrl(threadDetailTemplate, threadId), {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });
                if (!response.ok) return;
                const data = await response.json();
                const thread = data.thread || {};
                const threadMessages = data.messages || [];
                const counterpartName = thread.manager_id === userId ? thread.customer_name : thread.manager_name;

                state.lastMessageId = threadMessages.reduce((maxId, message) => Math.max(maxId, message.id || 0), 0);
                updateSelection(thread.id);
                titleNode.textContent = counterpartName ? `Діалог з ${counterpartName}` : `Діалог #${thread.id}`;
                metaNode.textContent = thread.is_closed ? 'Діалог закрито' : 'Діалог активний';
                renderMessages(threadMessages);
                setConversationVisible(true);
                state.activeThreadId = thread.id;
                if (!options.silent) {
                    startPolling();
                }
            } finally {
                state.loadingThread = false;
            }
        }

        async function pollActiveThread() {
            if (!state.activeThreadId) return;
            const response = await fetch(
                `${getThreadUrl(threadPollTemplate, state.activeThreadId)}?after_id=${encodeURIComponent(state.lastMessageId || 0)}`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );
            if (!response.ok) return;
            const data = await response.json();
            const newMessages = data.messages || [];
            if (newMessages.length) {
                newMessages.forEach((message) => {
                    messagesNode.appendChild(buildMessageNode(message, message.sender_id === userId));
                    state.lastMessageId = Math.max(state.lastMessageId, message.id || 0);
                });
                messagesNode.scrollTop = messagesNode.scrollHeight;
            }
            await loadThreads(state.activeThreadId);
        }

        async function submitMessage(event) {
            event.preventDefault();
            if (!state.activeThreadId) return;

            const text = input.value.trim();
            if (!text) return;

            const sendButton = form.querySelector('button[type="submit"]');
            const originalButtonHTML = sendButton ? sendButton.innerHTML : '';
            if (sendButton) {
                sendButton.disabled = true;
                sendButton.innerHTML = '<span class="opacity-80">Надсилання…</span>';
            }
            try {
                const response = await fetch(getThreadUrl(threadSendTemplate, state.activeThreadId), {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ text }),
                });
                if (!response.ok) return;
                const data = await response.json();
                if (data.message) {
                    if (messagesNode.querySelector('[data-chat-empty-state]')) {
                        clearNode(messagesNode);
                    }
                    messagesNode.appendChild(buildMessageNode(data.message, data.message.sender_id === userId));
                    state.lastMessageId = Math.max(state.lastMessageId, data.message.id || 0);
                    input.value = '';
                    messagesNode.scrollTop = messagesNode.scrollHeight;
                }
                await loadThreads(state.activeThreadId);
            } finally {
                if (sendButton) {
                    sendButton.disabled = false;
                    sendButton.innerHTML = originalButtonHTML;
                }
            }
        }

        async function startThread() {
            const managerId = Number(managerSelect.value || 0);
            if (!managerId) return;

            startThreadButton.disabled = true;
            try {
                const response = await fetch(startUrl, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ manager_id: managerId }),
                });
                if (!response.ok) return;
                const data = await response.json();
                await loadThreads(data.thread_id);
                await openThread(data.thread_id);
            } finally {
                startThreadButton.disabled = state.managers.length === 0;
            }
        }

        function openWidget() {
            openPanel(panel);
            state.open = true;
            startPolling();
            if (!state.loaded) {
                state.loaded = true;
                Promise.all([loadManagers(), loadThreads()]).catch(() => {});
            }
        }

        function closeWidget() {
            closePanel(panel);
            state.open = false;
            stopPolling();
        }

        toggleButton.addEventListener('click', () => {
            if (panel.classList.contains('hidden')) {
                openWidget();
            } else {
                closeWidget();
            }
        });

        launchButtons.forEach((button) => {
            button.addEventListener('click', () => {
                openWidget();
            });
        });

        closeButton.addEventListener('click', closeWidget);
        startThreadButton.addEventListener('click', startThread);
        form.addEventListener('submit', submitMessage);
        showComposerButton.addEventListener('click', () => {
            composer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            managerSelect.focus();
        });
        window.addEventListener('beforeunload', stopPolling);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && state.open) {
                closeWidget();
            }
        });

        document.addEventListener('click', (event) => {
            if (!state.open) return;
            if (event.target.closest('[data-chat-widget], [data-chat-launch]')) return;
            closeWidget();
        });
    }

    function initManagerPage() {
        const page = document.querySelector('[data-chat-manager-page]');
        if (!page) return;

        const userId = Number(page.dataset.chatUserId || 0);
        const threadsUrl = page.dataset.chatThreadsUrl;
        const threadDetailTemplate = page.dataset.chatThreadDetailTemplate;
        const threadSendTemplate = page.dataset.chatThreadSendTemplate;
        const threadPollTemplate = page.dataset.chatThreadPollTemplate;

        const threadList = page.querySelector('[data-chat-thread-list]');
        const threadCount = page.querySelector('[data-chat-thread-count]');
        const titleNode = page.querySelector('[data-chat-thread-title]');
        const metaNode = page.querySelector('[data-chat-thread-meta]');
        const messagesNode = page.querySelector('[data-chat-messages]');
        const form = page.querySelector('[data-chat-form]');
        const input = page.querySelector('[data-chat-input]');
        const emptyState = page.querySelector('[data-chat-empty-state]');

        const state = {
            threads: [],
            activeThreadId: null,
            lastMessageId: 0,
            pollTimer: null,
            loadingThread: false,
        };

        function stopPolling() {
            if (state.pollTimer) {
                window.clearInterval(state.pollTimer);
                state.pollTimer = null;
            }
        }

        function startPolling() {
            stopPolling();
            state.pollTimer = window.setInterval(() => {
                if (state.activeThreadId) {
                    pollThread();
                }
                refreshThreadList();
            }, 4000);
        }

        function renderThreadList() {
            clearNode(threadList);
            threadCount.textContent = String(state.threads.length);

            if (!state.threads.length) {
                const empty = document.createElement('div');
                empty.className = 'rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500';
                empty.textContent = 'Поки що немає активних звернень.';
                threadList.appendChild(empty);
                return;
            }

            state.threads.forEach((thread) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.threadId = String(thread.id);
                button.className = `w-full rounded-2xl border px-4 py-3 text-left transition ${
                    state.activeThreadId === thread.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-slate-50 hover:border-orange-500 hover:bg-orange-50'
                }`;

                const header = document.createElement('div');
                header.className = 'flex items-start justify-between gap-3';

                const info = document.createElement('div');
                const name = document.createElement('p');
                name.className = 'text-sm font-semibold text-slate-900';
                name.textContent = thread.customer_name || `Клієнт #${thread.customer_id}`;
                const meta = document.createElement('p');
                meta.className = 'text-xs text-slate-500';
                meta.textContent = `${formatDateTime(thread.created_at)} · ${thread.manager_name || ''}`;
                info.appendChild(name);
                info.appendChild(meta);

                const unread = document.createElement('span');
                unread.className = 'rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700';
                unread.textContent = String(thread.unread_count || 0);

                header.appendChild(info);
                header.appendChild(unread);

                const preview = document.createElement('p');
                preview.className = 'mt-2 text-sm text-slate-600';
                preview.textContent = thread.last_message ? thread.last_message.text : 'Немає повідомлень у цьому діалозі.';

                button.appendChild(header);
                button.appendChild(preview);
                button.addEventListener('click', () => openThread(thread.id));
                threadList.appendChild(button);
            });
        }

        function updateSelection(threadId) {
            state.activeThreadId = threadId;
            Array.from(threadList.querySelectorAll('[data-thread-id]')).forEach((button) => {
                const active = Number(button.dataset.threadId) === threadId;
                button.classList.toggle('border-orange-500', active);
                button.classList.toggle('bg-orange-50', active);
                button.classList.toggle('bg-slate-50', !active);
            });
        }

        function renderMessages(messages) {
            clearNode(messagesNode);
            if (!messages.length) {
                const empty = document.createElement('div');
                empty.className = 'rounded-2xl bg-white px-4 py-3 text-sm text-slate-500';
                empty.dataset.chatEmptyState = '1';
                empty.textContent = 'У цьому діалозі ще немає повідомлень.';
                messagesNode.appendChild(empty);
                return;
            }

            messages.forEach((message) => {
                messagesNode.appendChild(buildMessageNode(message, message.sender_id === userId));
                state.lastMessageId = Math.max(state.lastMessageId, message.id || 0);
            });
            messagesNode.scrollTop = messagesNode.scrollHeight;
        }

        async function refreshThreadList() {
            const response = await fetch(threadsUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) return;
            const data = await response.json();
            const threads = data.threads || [];
            const activeStillExists = threads.some((thread) => thread.id === state.activeThreadId);
            state.threads = threads;
            renderThreadList();
            if (!activeStillExists && threads.length) {
                await openThread(threads[0].id, { silent: true });
            }
            if (!threads.length) {
                state.activeThreadId = null;
                state.lastMessageId = 0;
                titleNode.textContent = 'Оберіть діалог';
                metaNode.textContent = 'Тут зʼявиться переписка.';
                clearNode(messagesNode);
                const empty = document.createElement('div');
                empty.className = 'rounded-2xl bg-white px-4 py-3 text-sm text-slate-500';
                empty.textContent = 'Поки що активних звернень немає.';
                messagesNode.appendChild(empty);
            }
        }

        async function openThread(threadId, options = {}) {
            if (!threadId || state.loadingThread) return;
            state.loadingThread = true;

            try {
                const response = await fetch(getThreadUrl(threadDetailTemplate, threadId), {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });
                if (!response.ok) return;
                const data = await response.json();
                const thread = data.thread || {};
                const threadMessages = data.messages || [];

                state.lastMessageId = threadMessages.reduce((maxId, message) => Math.max(maxId, message.id || 0), 0);
                updateSelection(thread.id);
                titleNode.textContent = `Діалог із ${thread.customer_name || 'клієнтом'}`;
                metaNode.textContent = thread.is_closed ? 'Діалог закрито' : 'Діалог активний';
                renderMessages(threadMessages);
                state.activeThreadId = thread.id;
                if (!options.silent) {
                    startPolling();
                }
            } finally {
                state.loadingThread = false;
            }
        }

        async function pollThread() {
            if (!state.activeThreadId) return;
            const response = await fetch(
                `${getThreadUrl(threadPollTemplate, state.activeThreadId)}?after_id=${encodeURIComponent(state.lastMessageId || 0)}`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );
            if (!response.ok) return;
            const data = await response.json();
            const newMessages = data.messages || [];
            if (newMessages.length) {
                if (messagesNode.querySelector('[data-chat-empty-state]')) {
                    clearNode(messagesNode);
                }
                newMessages.forEach((message) => {
                    messagesNode.appendChild(buildMessageNode(message, message.sender_id === userId));
                    state.lastMessageId = Math.max(state.lastMessageId, message.id || 0);
                });
                messagesNode.scrollTop = messagesNode.scrollHeight;
            }
        }

        async function submitReply(event) {
            event.preventDefault();
            if (!state.activeThreadId) return;

            const text = input.value.trim();
            if (!text) return;

            const sendButton = form.querySelector('button[type="submit"]');
            const originalButtonHTML = sendButton ? sendButton.innerHTML : '';
            if (sendButton) {
                sendButton.disabled = true;
                sendButton.innerHTML = '<span class="opacity-80">Надсилання…</span>';
            }
            try {
                const response = await fetch(getThreadUrl(threadSendTemplate, state.activeThreadId), {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ text }),
                });
                if (!response.ok) return;
                const data = await response.json();
                if (data.message) {
                    if (messagesNode.querySelector('[data-chat-empty-state]')) {
                        clearNode(messagesNode);
                    }
                    messagesNode.appendChild(buildMessageNode(data.message, data.message.sender_id === userId));
                    state.lastMessageId = Math.max(state.lastMessageId, data.message.id || 0);
                    input.value = '';
                    messagesNode.scrollTop = messagesNode.scrollHeight;
                }
                await refreshThreadList();
            } finally {
                if (sendButton) {
                    sendButton.disabled = false;
                    sendButton.innerHTML = originalButtonHTML;
                }
            }
        }

        threadList.addEventListener('click', (event) => {
            const button = event.target.closest('[data-thread-id]');
            if (!button) return;
            openThread(Number(button.dataset.threadId));
        });

        form.addEventListener('submit', submitReply);
        refreshThreadList().then(() => {
            if (state.threads.length) {
                openThread(state.threads[0].id);
            }
        });
        startPolling();
        window.addEventListener('beforeunload', stopPolling);
    }

    function init() {
        initUserWidget();
        initManagerPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
