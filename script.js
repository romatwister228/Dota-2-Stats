
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


tabs.forEach(tab => {
    tab.addEventListener('click', () => {

        tabs.forEach(t => t.classList.remove('active'));

        tab.classList.add('active');


        profileSection.classList.add('hidden');
        matchesSection.classList.add('hidden');
        heroesSection.classList.add('hidden');


        const targetTab = tab.getAttribute('data-tab');
        document.getElementById(targetTab).classList.remove('hidden');
    });
});


async function loadPlayer(steamId) {
    try {

        searchPrompt.textContent = "Загрузка...";
        searchPrompt.classList.remove('hidden');
        playerInfo.classList.add('hidden');
        playerStats.classList.add('hidden');

        const profileResponse = await fetch(`https://api.opendota.com/api/players/${steamId}`);

        if (!profileResponse.ok) {
            throw new Error(`Ошибка API: ${profileResponse.status}`);
        }

        const profileData = await profileResponse.json();


        if (profileData.error || !profileData.profile) {
            searchPrompt.textContent = "Игрок не найден или профиль скрыт. Попробуй ID: 87278757";
            return;
        }


        avatarImg.src = profileData.profile.avatarmedium;
        nameEl.textContent = profileData.profile.personaname;
        countryEl.textContent = profileData.profile.loccountrycode || 'Неизвестно';


        const wlResponse = await fetch(`https://api.opendota.com/api/players/${steamId}/wl`);
        const wlData = await wlResponse.json();

        const totalGames = wlData.win + wlData.lose;
        const winrate = totalGames > 0 ? Math.round((wlData.win / totalGames) * 100) : 0;

        winrateEl.textContent = `${winrate}%`;


        kdEl.textContent = "N/A";


        const estimatedHours = Math.round((totalGames * 40) / 60);
        timeEl.textContent = `~${estimatedHours} ч.`;


        searchPrompt.classList.add('hidden');
        playerInfo.classList.remove('hidden');
        playerStats.classList.remove('hidden');


        loadMatches(steamId);

    } catch (error) {
        console.error("Ошибка при загрузке:", error);
        searchPrompt.textContent = "Произошла ошибка при загрузке данных.";
        searchPrompt.classList.remove('hidden');
        playerInfo.classList.add('hidden');
        playerStats.classList.add('hidden');
    }
}


async function loadMatches(steamId) {
    try {
        const response = await fetch(`https://api.opendota.com/api/players/${steamId}/recentMatches`);
        const matchesData = await response.json();


        matchesBody.innerHTML = '';


        const recent5 = matchesData.slice(0, 5);

        recent5.forEach(match => {

            const isRadiant = match.player_slot < 128;
            const isWin = (match.radiant_win && isRadiant) || (!match.radiant_win && !isRadiant);

            const resultText = isWin ? 'Победа' : 'Поражение';
            const resultClass = isWin ? 'win' : 'loss';


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


async function loadHeroes(steamId) {
    const heroesList = document.getElementById('heroes-list');
    try {

        const res = await fetch(`https://api.opendota.com/api/players/${steamId}/heroes`);
        const playerHeroes = await res.json();


        const top5 = playerHeroes.slice(0, 5);
        heroesList.innerHTML = '';

        if (top5.length === 0) {
            heroesList.innerHTML = '<p>Нет данных о героях.</p>';
            return;
        }


        const allHeroesRes = await fetch('https://api.opendota.com/api/heroes');
        const allHeroes = await allHeroesRes.json();

        top5.forEach(ph => {

            const heroInfo = allHeroes.find(h => h.id === parseInt(ph.hero_id));
            if (!heroInfo) return;


            const heroNameShort = heroInfo.name.replace('npc_dota_hero_', '');
            const imgUrl = `https://api.opendota.com/apps/dota2/images/dota_react/heroes/${heroNameShort}.png`;


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


searchBtn.addEventListener('click', () => {
    const steamId = searchInput.value.trim();
    if (steamId !== '') {
        loadPlayer(steamId);
        loadHeroes(steamId);
    }
});


searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const steamId = searchInput.value.trim();
        if (steamId !== '') {
            loadPlayer(steamId);
            loadHeroes(steamId);
        }
    }
});


const MY_STEAM_ID = '414707312';
window.addEventListener('DOMContentLoaded', () => {
    loadPlayer(MY_STEAM_ID);
    loadHeroes(MY_STEAM_ID);
});
