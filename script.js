// --- Элементы DOM ---
const searchInput = document.getElementById('steam-id');
const searchBtn = document.getElementById('search-btn');

const profileSection = document.getElementById('profile');
const matchesSection = document.getElementById('matches');
const heroesSection = document.getElementById('heroes');

const searchPrompt = document.getElementById('search-prompt');
const playerInfo = document.getElementById('player-info');
const playerStats = document.getElementById('player-stats');

const avatarImg = document.getElementById('player-avatar');
const nameEl = document.getElementById('player-name');
const countryEl = document.getElementById('player-country');

const kdEl = document.getElementById('stat-kd');
const winrateEl = document.getElementById('stat-winrate');
const timeEl = document.getElementById('stat-time');

const matchesBody = document.getElementById('matches-body');
const tabs = document.querySelectorAll('.tab');

// --- Переключение вкладок ---
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Убираем активный класс у всех кнопок
        tabs.forEach(t => t.classList.remove('active'));
        // Добавляем активный класс нажатой кнопке
        tab.classList.add('active');

        // Скрываем все секции
        profileSection.classList.add('hidden');
        matchesSection.classList.add('hidden');
        heroesSection.classList.add('hidden');

        // Показываем нужную секцию по атрибуту data-tab
        const targetTab = tab.getAttribute('data-tab');
        document.getElementById(targetTab).classList.remove('hidden');
    });
});

// --- Загрузка данных игрока ---
async function loadPlayer(steamId) {
    try {
        // Меняем текст во время загрузки
        searchPrompt.textContent = "Загрузка...";
        searchPrompt.classList.remove('hidden');
        playerInfo.classList.add('hidden');
        playerStats.classList.add('hidden');

        // 1. Получаем профиль игрока
        const profileResponse = await fetch(`https://api.opendota.com/api/players/${steamId}`);

        if (!profileResponse.ok) {
            throw new Error(`Ошибка API: ${profileResponse.status}`);
        }

        const profileData = await profileResponse.json();

        // Проверяем, существует ли профиль
        if (profileData.error || !profileData.profile) {
            searchPrompt.textContent = "Игрок не найден или профиль скрыт. Попробуй ID: 87278757";
            return;
        }

        // Обновляем карточку
        avatarImg.src = profileData.profile.avatarmedium;
        nameEl.textContent = profileData.profile.personaname;
        countryEl.textContent = profileData.profile.loccountrycode || 'Неизвестно';

        // 2. Получаем Win/Loss статистику
        const wlResponse = await fetch(`https://api.opendota.com/api/players/${steamId}/wl`);
        const wlData = await wlResponse.json();

        const totalGames = wlData.win + wlData.lose;
        const winrate = totalGames > 0 ? Math.round((wlData.win / totalGames) * 100) : 0;

        winrateEl.textContent = `${winrate}%`;

        // В Dota API нет прямого K/D для всего аккаунта одной цифрой, 
        // поэтому ставим заглушку или можно рассчитать из всех матчей (но это долго)
        kdEl.textContent = "N/A";

        // Время примерное: кол-во игр * ~40 минут
        const estimatedHours = Math.round((totalGames * 40) / 60);
        timeEl.textContent = `~${estimatedHours} ч.`;

        // Показываем карточку и статистику
        searchPrompt.classList.add('hidden');
        playerInfo.classList.remove('hidden');
        playerStats.classList.remove('hidden');

        // 3. Загружаем последние матчи
        loadMatches(steamId);

    } catch (error) {
        console.error("Ошибка при загрузке:", error);
        searchPrompt.textContent = "Произошла ошибка при загрузке данных.";
        searchPrompt.classList.remove('hidden');
        playerInfo.classList.add('hidden');
        playerStats.classList.add('hidden');
    }
}

// --- Загрузка последних матчей ---
async function loadMatches(steamId) {
    try {
        const response = await fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`);
        const matchesData = await response.json();

        // Очищаем старые матчи
        matchesBody.innerHTML = '';

        // Берем только 5 последних матчей
        const recent5 = matchesData.slice(0, 5);

        recent5.forEach(match => {
            // В Dota API если radiant_win = true и игрок играл за Radiant (slot < 128) -> победа
            const isRadiant = match.player_slot < 128;
            const isWin = (match.radiant_win && isRadiant) || (!match.radiant_win && !isRadiant);

            const resultText = isWin ? 'Победа' : 'Поражение';
            const resultClass = isWin ? 'win' : 'loss';

            // Длительность в минутах
            const durationMin = Math.floor(match.duration / 60);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>ID Героя: ${match.hero_id}</td>
                <td class="${resultClass}">${resultText}</td>
                <td>${match.kills} / ${match.deaths} / ${match.assists}</td>
                <td>${durationMin} мин</td>
            `;

            matchesBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Ошибка загрузки матчей:", error);
        matchesBody.innerHTML = '<tr><td colspan="4">Ошибка загрузки матчей</td></tr>';
    }
}

// --- Загрузка топ героев ---
async function loadHeroes(steamId) {
    const heroesList = document.getElementById('heroes-list');
    try {
        // Сначала получаем данные конкретного игрока
        const res = await fetch(`https://api.opendota.com/api/players/${steamId}/heroes`);
        const playerHeroes = await res.json();

        // Берём топ-5 героев, на которых сыграл игрок
        const top5 = playerHeroes.slice(0, 5);
        heroesList.innerHTML = '';

        if (top5.length === 0) {
            heroesList.innerHTML = '<p>Нет данных о героях.</p>';
            return;
        }

        // К сожалению, OpenDota отдает только ID героев.
        // Чтобы получить их имена и картинки, нужно скачать справочник всех героев.
        const allHeroesRes = await fetch('https://api.opendota.com/api/heroes');
        const allHeroes = await allHeroesRes.json();

        top5.forEach(ph => {
            // Ищем полного героя по ID из списка всех
            const heroInfo = allHeroes.find(h => h.id === parseInt(ph.hero_id));
            if (!heroInfo) return;

            // OpenDota картинки хранит по специфическому пути (тут мы формируем URL)
            const heroNameShort = heroInfo.name.replace('npc_dota_hero_', '');
            const imgUrl = `https://api.opendota.com/apps/dota2/images/dota_react/heroes/${heroNameShort}.png`;

            // Вычисляем винрейт на этом герое
            const winrate = ph.games > 0 ? Math.round((ph.win / ph.games) * 100) : 0;

            const card = document.createElement('div');
            card.classList.add('hero-card');
            card.innerHTML = `
                <img src="${imgUrl}" alt="${heroInfo.localized_name}">
                <div class="hero-info">
                    <h3>${heroInfo.localized_name}</h3>
                    <p>Игр: ${ph.games}</p>
                    <p>Winrate: <span class="${winrate >= 50 ? 'win' : 'loss'}">${winrate}%</span></p>
                </div>
            `;
            heroesList.appendChild(card);
        });

    } catch (error) {
        console.error('Ошибка загрузки героев:', error);
        heroesList.innerHTML = '<p>Не удалось загрузить героев.</p>';
    }
}

// --- Слушатели событий ---
searchBtn.addEventListener('click', () => {
    const steamId = searchInput.value.trim();
    if (steamId !== '') {
        loadPlayer(steamId);
        loadHeroes(steamId); // Загружаем героев вместе с профилем
    }
});

// Поиск по нажатию Enter
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const steamId = searchInput.value.trim();
        if (steamId !== '') {
            loadPlayer(steamId);
            loadHeroes(steamId); // Загружаем героев вместе с профилем
        }
    }
});
