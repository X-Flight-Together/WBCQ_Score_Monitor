// 定義遊戲數據結構
class GameData {
    constructor() {
        this.homeTeam = {
            name: '',
            score: 0,
            logoUrl: ''
        };
        this.awayTeam = {
            name: '',
            score: 0,
            logoUrl: ''
        };
        this.inning = {
            current: 1,
            half: '上半'
        };
        this.bases = {
            first: false,
            second: false,
            third: false
        };
        this.count = {
            balls: 0,
            strikes: 0,
            outs: 0
        };
        this.stadium = '';
        this.isLive = true;
        this.currentPitcher = '';
        this.currentBatter = '';
    }
}

// 更新UI的函數
class GameUI {
    static updateGameTime() {
        const gameTime = document.querySelector('.game-time');
        if (gameTime) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            gameTime.textContent = `${hours}:${minutes}`;
        }
    }

    static updateFromLiveData(data) {
        console.log('Received data:', data);
        
        // 檢查數據格式
        if (!data || typeof data !== 'object') {
            console.error('Invalid data format');
            return;
        }

        // 獲取第一個鍵值對（比賽數據）
        const gameId = Object.keys(data)[0];
        const gameData = data[gameId];
        
        if (!gameData) {
            console.error('No game data found');
            return;
        }

        // 更新比分
        const homeScore = gameData.r?.[1] || '0';
        const awayScore = gameData.r?.[0] || '0';
        this.updateScore('home', homeScore);
        this.updateScore('away', awayScore);

        // 更新隊伍名稱
        this.updateTeamName('home', gameData.hname || '主隊');
        this.updateTeamName('away', gameData.aname || '客隊');

        // 更新局數和狀態
        if (gameData.gs) {
            const inning = parseInt(gameData.gs.i) || 1;
            const isTop = gameData.gs.ti === 'Y'; // 使用 ti 欄位來判斷上下半局
            this.updateInning({
                current: inning,
                half: isTop ? '上半' : '下半'
            });

            // 更新好壞球數
            const balls = parseInt(gameData.gs.b) || 0;
            const strikes = parseInt(gameData.gs.s) || 0;
            
            this.updateCount('B', Math.min(balls, 3));
            this.updateCount('S', Math.min(strikes, 2));

            // 更新出局數
            const outs = parseInt(gameData.gs.o) || 0;
            this.updateCount('O', Math.min(outs, 2));

            // 從 br (跑者) 欄位獲取壘包狀態
            const runnersStr = gameData.gs.br || '';
            const rs = parseInt(gameData.gs.rs) || 0;  // rs 值表示壘包狀態
            
            // 更新壘包狀態
            const bases = {
                first: runnersStr !== '',      // 有跑者名字表示一壘有人
                second: rs === 2 || rs === 6,  // rs = 2 或 6 表示二壘有人
                third: rs === 4                // rs = 4 表示三壘有人
            };
            
            // 更新每個壘包的狀態
            const baseElements = {
                first: document.querySelector('.base.first'),
                second: document.querySelector('.base.second'),
                third: document.querySelector('.base.third')
            };

            // 更新壘包狀態
            for (const [base, isOccupied] of Object.entries(bases)) {
                const element = baseElements[base];
                if (element) {
                    element.classList.toggle('active', isOccupied);
                }
            }

            // 用於調試
            console.log('Runners:', {
                name: runnersStr,
                rs: rs,
                bases: bases
            });
        }

        // 更新安打和失誤
        if (gameData.h && gameData.e) {
            const homeHits = gameData.h[1] || '0';
            const awayHits = gameData.h[0] || '0';
            const homeErrors = gameData.e[1] || '0';
            const awayErrors = gameData.e[0] || '0';
            
            document.querySelector('.home .hits-value').textContent = homeHits;
            document.querySelector('.away .hits-value').textContent = awayHits;
            document.querySelector('.home .errors-value').textContent = homeErrors;
            document.querySelector('.away .errors-value').textContent = awayErrors;
        }

        // 更新投手詳細資訊
        if (gameData.ts?.pitcher) {
            const pitcher = gameData.ts.pitcher;
            const pitcherInfo = document.querySelector('.pitcher-info');
            
            pitcherInfo.querySelector('.name').textContent = pitcher.name;
            pitcherInfo.querySelector('.era').textContent = `ERA: ${pitcher.era}`;
            pitcherInfo.querySelector('.record').textContent = `勝: ${pitcher.win} 敗: ${pitcher.lose}`;
            
            if (pitcher.today) {
                pitcherInfo.querySelector('.ip').textContent = `局數: ${pitcher.today.ip}`;
                pitcherInfo.querySelector('.k-bb').textContent = `K: ${pitcher.today.so} BB: ${pitcher.today.bb}`;
                pitcherInfo.querySelector('.pitch-count').textContent = 
                    `投球數: ${pitcher.today.pitches} (好球: ${pitcher.today.strikes})`;
            }
        }

        // 更新打者詳細資訊
        if (gameData.ts?.batter) {
            const batter = gameData.ts.batter;
            const batterInfo = document.querySelector('.batter-info');
            
            batterInfo.querySelector('.name').textContent = batter.name;
            batterInfo.querySelector('.avg').textContent = `打擊率: ${batter.avg}`;
            batterInfo.querySelector('.hr-rbi').textContent = 
                `全壘打: ${batter.hr} 打點: ${batter.rbi}`;
            
            if (batter.vsPitcher) {
                batterInfo.querySelector('.vs-pitcher').textContent = 
                    `對戰投手: ${batter.vsPitcher.avg}`;
            }
        }

        // 更新下一棒資訊
        if (gameData.ts?.batterOnDeck) {
            const onDeck = document.querySelector('.on-deck');
            onDeck.querySelector('.name').textContent = gameData.ts.batterOnDeck.name;
            onDeck.querySelector('.avg').textContent = gameData.ts.batterOnDeck.avg;
        }

        if (gameData.ts?.batterInHole) {
            const inHole = document.querySelector('.in-hole');
            inHole.querySelector('.name').textContent = gameData.ts.batterInHole.name;
            inHole.querySelector('.avg').textContent = gameData.ts.batterInHole.avg;
        }

        // 更新時間戳
        if (gameData.timestamp) {
            this.updateGameTime();
        }

        // 在 updateFromLiveData 方法中添加事件更新
        if (gameData.pbp) {
            const eventElement = document.querySelector('.game-event');
            if (eventElement) {
                eventElement.textContent = gameData.pbp.pbpValue || '';
                eventElement.style.display = gameData.pbp.pbpValue ? 'block' : 'none';
            }
        }

        // 更新壘包
        this.updateBases(gameData);
    }

    static updateMobileFromLiveData(data) {
        console.log('Updating mobile UI:', data);
        
        const gameId = Object.keys(data)[0];
        const gameData = data[gameId];
        
        if (!gameData) {
            console.error('No game data found');
            return;
        }

        // 更新比分
        const homeScore = gameData.r?.[1] || '0';
        const awayScore = gameData.r?.[0] || '0';
        document.querySelector('.team.home .score').textContent = homeScore;
        document.querySelector('.team.away .score').textContent = awayScore;

        // 更新安打和失誤
        if (gameData.h && gameData.e) {
            // 主隊
            const homeHits = document.querySelector('.team.home .hits');
            const homeErrors = document.querySelector('.team.home .errors');
            if (homeHits) homeHits.textContent = `安打: ${gameData.h[1] || '0'}`;
            if (homeErrors) homeErrors.textContent = `失誤: ${gameData.e[1] || '0'}`;

            // 客隊
            const awayHits = document.querySelector('.team.away .hits');
            const awayErrors = document.querySelector('.team.away .errors');
            if (awayHits) awayHits.textContent = `安打: ${gameData.h[0] || '0'}`;
            if (awayErrors) awayErrors.textContent = `失誤: ${gameData.e[0] || '0'}`;
        }

        // 更新局數
        if (gameData.gs) {
            const inning = parseInt(gameData.gs.i) || 1;
            const isTop = gameData.gs.ti === 'Y';
            
            const currentInning = document.querySelector('.inning .current');
            const halfInning = document.querySelector('.inning .half');
            
            if (currentInning) currentInning.textContent = inning;
            if (halfInning) halfInning.textContent = isTop ? '上' : '下';

            // 更新好壞球數和出局數
            const balls = parseInt(gameData.gs.b) || 0;
            const strikes = parseInt(gameData.gs.s) || 0;
            const outs = parseInt(gameData.gs.o) || 0;

            // 更新各個計數器
            this.updateMobileCount('balls', balls, 3);
            this.updateMobileCount('strikes', strikes, 2);
            this.updateMobileCount('outs', outs, 2);
        }

        // 更新投手資訊
        if (gameData.ts?.pitcher) {
            const pitcher = gameData.ts.pitcher;
            const pitcherElement = document.querySelector('.pitcher');
            if (pitcherElement) {
                pitcherElement.querySelector('.name').textContent = pitcher.name;
                const stats = pitcherElement.querySelector('.stats');
                if (stats) {
                    stats.innerHTML = `
                        <span>ERA ${pitcher.era}</span>
                        <span>IP ${pitcher.today?.ip || '0.0'}</span>
                        <span>K ${pitcher.today?.so || '0'}</span>
                    `;
                }
            }
        }

        // 更新打者資訊
        if (gameData.ts?.batter) {
            const batter = gameData.ts.batter;
            const batterElement = document.querySelector('.batter');
            if (batterElement) {
                batterElement.querySelector('.name').textContent = batter.name;
                const stats = batterElement.querySelector('.stats');
                if (stats) {
                    stats.innerHTML = `
                        <span>打擊率 ${batter.avg}</span>
                        <span>今日 ${batter.today?.batHistory?.length ? batter.today.batHistory.length + '-' + (batter.today.batHistory.filter(h => h.type !== 'out').length) : '0-0'}</span>
                    `;
                }
            }
        }

        // 更新事件顯示
        if (gameData.pbp) {
            const eventElement = document.querySelector('.event-display');
            if (eventElement) {
                eventElement.textContent = gameData.pbp.pbpValue || '';
                eventElement.style.display = gameData.pbp.pbpValue ? 'block' : 'none';
            }
        }

        // 更新壘包
        this.updateBases(gameData);
    }

    static updateScore(team, score) {
        const scoreElement = document.querySelector(`.${team} .score`);
        if (scoreElement && scoreElement.textContent !== score.toString()) {
            scoreElement.textContent = score;
            this.animateScore(scoreElement);
        }
    }

    static updateTeamName(team, name) {
        const nameElement = document.querySelector(`.${team} .team-name`);
        if (nameElement) {
            nameElement.textContent = name;
        }
    }

    static updateCount(type, count) {
        const dots = document.querySelectorAll(`.count-${type.toLowerCase()} .dot`);
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < count);
        });
    }

    static updateInning(inning) {
        const inningElement = document.querySelector('.current-inning');
        const halfElement = document.querySelector('.inning-half');
        if (inningElement && halfElement) {
            inningElement.textContent = `第 ${inning.current} 局`;
            halfElement.textContent = inning.half;
        }
    }

    static updateGameStatus(status) {
        const liveIndicator = document.querySelector('.live-indicator');
        if (liveIndicator) {
            liveIndicator.textContent = status === 'In Progress' ? 'LIVE' : status;
        }
    }

    static animateScore(element) {
        element.style.transform = 'scale(1.2)';
        element.style.color = '#ff0000';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 500);
    }

    static updateBases(gameData) {
        // 檢查數據是否存在
        if (!gameData || !gameData.gs) {
            console.log('No base data available');
            return;
        }

        // 從 gameData.gs 中獲取壘包狀態
        const baseStatus = parseInt(gameData.gs.rs) || 0;
        console.log('Base status:', baseStatus);

        // 根據 rs 值判斷壘包狀態
        const bases = {
            first: [1, 4, 5, 7].includes(baseStatus),    // 1,4,5,7 表示一壘有人
            second: [2, 4, 6, 7].includes(baseStatus),   // 2,4,6,7 表示二壘有人
            third: [3, 5, 6, 7].includes(baseStatus)     // 3,5,6,7 表示三壘有人
        };

        console.log('Parsed base status:', bases);

        // 更新每個壘包的狀態
        const baseElements = {
            first: document.querySelector('.base.first'),
            second: document.querySelector('.base.second'),
            third: document.querySelector('.base.third')
        };

        // 更新每個壘包的狀態
        for (const [base, isOccupied] of Object.entries(bases)) {
            const element = baseElements[base];
            if (element) {
                element.classList.toggle('active', isOccupied);
                console.log(`Updating ${base} base:`, isOccupied);
            }
        }
    }

    static updateMobileCount(type, count, max) {
        const dots = document.querySelectorAll(`.${type} .dot`);
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < Math.min(count, max));
        });
    }
}

// 添加數據緩存
let lastData = null;
let lastUpdateTime = 0;
const CACHE_DURATION = 2000; // 2秒緩存

// 修改數據獲取函數
async function fetchGameData() {
    const now = Date.now();
    
    // 如果有緩存且未過期，使用緩存數據
    if (lastData && (now - lastUpdateTime) < CACHE_DURATION) {
        updateUI(lastData);
        return;
    }

    const gameDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const gameId = `INTERBASEBALL_${gameDate}_13280@18805_1900`;
    const callbackName = 'jQuery' + Math.random().toString().slice(2) + '_' + now;
    
    const baseUrl = 'https://ls7.playsport.cc/ls_json.php';
    const params = new URLSearchParams({
        alliance: '114',
        gamedate: gameDate,
        pbp: '1',
        teamStat: '1',
        oid: `${gameId}|ts`,
        xcb: callbackName,
        _: now
    });

    try {
        // 清理舊的 script 標籤
        const oldScripts = document.querySelectorAll('script[data-type="jsonp"]');
        oldScripts.forEach(script => script.remove());

        const script = document.createElement('script');
        script.src = `${baseUrl}?${params.toString()}`;
        script.dataset.type = 'jsonp';

        // 優化回調函數
        window[callbackName] = function(data) {
            // 更新緩存
            lastData = data;
            lastUpdateTime = now;
            
            updateUI(data);
            
            // 清理
            delete window[callbackName];
            script.remove();
        };

        document.body.appendChild(script);
    } catch (error) {
        console.error('Error fetching game data:', error);
    }
}

// 統一的 UI 更新函數
function updateUI(data) {
    const isMobilePage = window.location.pathname.includes('mobile.html');
    
    if (isMobilePage) {
        GameUI.updateMobileFromLiveData(data);
    } else {
        GameUI.updateFromLiveData(data);
    }
}

// 初始加載時立即顯示基本 UI
document.addEventListener('DOMContentLoaded', function() {
    // 顯示初始狀態
    const isMobilePage = window.location.pathname.includes('mobile.html');
    if (isMobilePage) {
        // 手機版初始化
        document.querySelector('.inning .current').textContent = '1';
        document.querySelector('.inning .half').textContent = '上';
    } else {
        // PC版初始化
        document.querySelector('.current-inning').textContent = '第 1 局';
        document.querySelector('.inning-half').textContent = '上半';
    }
    
    // 立即獲取第一次數據
    fetchGameData();
});

// 調整更新頻率
const UPDATE_INTERVAL = 3000; // 3秒更新一次
setInterval(fetchGameData, UPDATE_INTERVAL);

// 每秒更新時間
setInterval(() => {
    GameUI.updateGameTime();
}, 1000);

// 初始化時間
GameUI.updateGameTime(); 