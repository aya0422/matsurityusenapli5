// ローカルストレージのキー
const STORAGE_KEY = 'lotteryData';

// 抽選の設定
const START_TIME = 11 * 60; // 11:00
const END_TIME = 17 * 60;   // 17:00
const WIN_PROBABILITY = 0.3; // 30%の確率で当たり

// 抽選データ
let lotteryData = {
    lastUpdated: new Date().toISOString()
};

// 当たりの管理用オブジェクト
let lotterySlots = {
    // 前半（11:00-14:00）の当たり枠
    firstHalf: Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        used: false,
        timeSlot: new Date().setHours(11, i * 10, 0, 0)
    })),
    // 後半（14:00-17:00）の当たり枠
    secondHalf: Array.from({ length: 9 }, (_, i) => ({
        number: i + 19,
        used: false,
        timeSlot: new Date().setHours(14, i * 20, 0, 0)
    }))
};

// 花火の打ち上げを制御する変数
let isFireworksActive = true;
let backgroundFireworksInterval;

// 星を生成
function createStars() {
    const starsContainer = document.querySelector('.stars');
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.left = Math.random() * 100 + 'vw';
        star.style.top = Math.random() * 100 + 'vh';
        star.style.animationDelay = Math.random() * 2 + 's';
        starsContainer.appendChild(star);
    }
}

// 背景の花火を開始
function startBackgroundFireworks() {
    if (backgroundFireworksInterval) {
        clearInterval(backgroundFireworksInterval);
    }
    
    // 3-5秒ごとに花火を打ち上げ
    backgroundFireworksInterval = setInterval(() => {
        if (isFireworksActive) {
            createFirework();
        }
    }, 3000 + Math.random() * 2000);
}

// 特別な花火を打ち上げる（当たり用）
function createSpecialFireworks() {
    const colors = ['#FF0000', '#FFD700', '#FF69B4', '#00FF00', '#1E90FF'];
    const positions = [
        { x: 20, y: 30 },
        { x: 50, y: 40 },
        { x: 80, y: 35 },
        { x: 35, y: 45 },
        { x: 65, y: 38 }
    ];

    positions.forEach((pos, index) => {
        setTimeout(() => {
            createFirework(pos.x, pos.y, colors[index % colors.length], true);
        }, index * 300);
    });
}

// 花火を生成（拡張版）
function createFirework(x = null, y = null, color = null, isSpecial = false) {
    if (!isFireworksActive && !isSpecial) return;
    
    const firework = document.createElement('div');
    firework.className = 'firework';
    
    // 位置が指定されていない場合はランダムな位置を生成
    if (x === null) x = Math.random() * 100;
    if (y === null) y = Math.random() * 60 + 20;
    
    firework.style.left = x + 'vw';
    firework.style.top = y + 'vh';
    
    // 花火の色を設定
    const hue = color ? null : Math.random() * 360;
    const fireworkColor = color || `hsl(${hue}, 100%, 50%)`;
    
    // 花火の軌跡を生成
    const trail = document.createElement('div');
    trail.className = 'firework-trail';
    trail.style.left = '50%';
    trail.style.bottom = '0';
    trail.style.setProperty('--color', fireworkColor);
    firework.appendChild(trail);
    
    document.body.appendChild(firework);
    
    // 0.5秒後に花火を爆発させる
    setTimeout(() => {
        trail.remove();
        
        // 花火の粒子を生成
        const particleCount = isSpecial ? 60 : 40;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            
            // 色のバリエーションを追加
            const particleHue = color ? null : (hue + Math.random() * 30 - 15) % 360;
            const particleColor = color || `hsl(${particleHue}, 100%, 50%)`;
            particle.style.backgroundColor = particleColor;
            particle.style.color = particleColor;
            
            // 粒子の飛び散る方向を計算
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = isSpecial ? 200 + Math.random() * 100 : 150 + Math.random() * 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
            
            firework.appendChild(particle);
        }
        
        // 1.5秒後に花火を削除
        setTimeout(() => {
            firework.remove();
        }, 1500);
    }, 500);
}

// 複数の花火を同時に打ち上げる
function createMultipleFireworks() {
    const count = 3 + Math.floor(Math.random() * 2); // 3-4個の花火
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            createFirework();
        }, i * 200); // 間隔を短くする
    }
}

// 定期的に花火を打ち上げる
function startFireworks() {
    // 最初の花火を打ち上げない（当たりの時のみ表示）
    isFireworksActive = false;
}

// ローカルストレージからデータを読み込む
function loadLotteryData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        // 日付をチェックして、新しい日ならデータをリセット
        if (isNewDay(parsedData.lastUpdated)) {
            resetLotteryData();
        } else {
            lotterySlots = parsedData.slots;
            lotteryData = parsedData;
        }
    }
}

// 新しい日かどうかをチェック
function isNewDay(lastUpdated) {
    const lastDate = new Date(lastUpdated);
    const currentDate = new Date();
    return lastDate.getDate() !== currentDate.getDate() ||
           lastDate.getMonth() !== currentDate.getMonth() ||
           lastDate.getFullYear() !== currentDate.getFullYear();
}

// データをリセット
function resetLotteryData() {
    lotterySlots = {
        firstHalf: Array.from({ length: 18 }, (_, i) => ({
            number: i + 1,
            used: false,
            timeSlot: new Date().setHours(11, i * 10, 0, 0)
        })),
        secondHalf: Array.from({ length: 9 }, (_, i) => ({
            number: i + 19,
            used: false,
            timeSlot: new Date().setHours(14, i * 20, 0, 0)
        }))
    };
    lotteryData = {
        lastUpdated: new Date().toISOString()
    };
    saveLotteryData();
}

// データをローカルストレージに保存
function saveLotteryData() {
    const dataToSave = {
        slots: lotterySlots,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

// 現在時刻が利用可能時間内かチェック
function isWithinOperatingHours() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const startTime = 11 * 60; // 11:00
    const endTime = 17 * 60;   // 17:00
    
    return currentTime >= startTime && currentTime < endTime;
}

// 現在の時間枠を取得
function getCurrentTimeSlot() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours >= 11 && hours < 14) {
        // 前半（11:00-14:00）
        const slotIndex = Math.floor((hours - 11) * 6 + minutes / 10);
        return { period: 'firstHalf', index: slotIndex };
    } else if (hours >= 14 && hours < 17) {
        // 後半（14:00-17:00）
        const slotIndex = Math.floor((hours - 14) * 3 + minutes / 20);
        return { period: 'secondHalf', index: slotIndex };
    }
    return null;
}

// 現在の時間枠の当たりを取得
function getCurrentTimeSlotWin() {
    const timeSlot = getCurrentTimeSlot();
    if (!timeSlot) return null;

    const slots = lotterySlots[timeSlot.period];
    if (timeSlot.index >= slots.length) return null;

    const slot = slots[timeSlot.index];
    if (slot.used) return null;

    return slot;
}

// 残りの当たり数を計算
function getRemainingWins() {
    const firstHalfRemaining = lotterySlots.firstHalf.filter(slot => !slot.used).length;
    const secondHalfRemaining = lotterySlots.secondHalf.filter(slot => !slot.used).length;
    return firstHalfRemaining + secondHalfRemaining;
}

// 紙吹雪エフェクトを生成
function createConfetti() {
    const colors = ['#fdcb6e', '#e74c3c', '#0984e3', '#00b894'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        document.body.appendChild(confetti);
        
        // アニメーション終了後に要素を削除
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// 雨エフェクトを生成
function createRain() {
    const rainContainer = document.getElementById('rain');
    rainContainer.innerHTML = ''; // 既存の雨をクリア
    
    for (let i = 0; i < 100; i++) {
        const raindrop = document.createElement('div');
        raindrop.className = 'raindrop';
        raindrop.style.left = Math.random() * 100 + 'vw';
        raindrop.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
        raindrop.style.opacity = Math.random() * 0.5 + 0.5;
        rainContainer.appendChild(raindrop);
    }
    
    // 3秒後に雨を消す
    setTimeout(() => {
        rainContainer.innerHTML = '';
    }, 3000);
}

// 悲しい顔エフェクトを生成
function createSadFaces() {
    const sadEmojis = ['😢', '😭', '😔', '😞'];
    for (let i = 0; i < 5; i++) {
        const sadFace = document.createElement('div');
        sadFace.className = 'sad-face';
        sadFace.textContent = sadEmojis[Math.floor(Math.random() * sadEmojis.length)];
        sadFace.style.left = Math.random() * 100 + 'vw';
        document.body.appendChild(sadFace);
        
        // アニメーション終了後に要素を削除
        setTimeout(() => {
            sadFace.remove();
        }, 2000);
    }
}

// 残りの当たり数を表示
function updateRemainingDisplay() {
    const remaining = getRemainingWins();
    const remainingDiv = document.getElementById('remaining');
    remainingDiv.innerHTML = `残りのあたり：<span class="remaining-number">${remaining}</span>個`;
}

// 抽選実行
function drawLottery() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // 時間外の場合は結果を表示
    if (currentTime < START_TIME || currentTime > END_TIME) {
        const resultDiv = document.getElementById('result');
        resultDiv.className = 'result time-out';
        resultDiv.innerHTML = '抽選時間外です';
        return;
    }

    // 抽選処理
    const resultDiv = document.getElementById('result');

    // 当たりの判定
    const currentSlot = getCurrentTimeSlotWin();
    const isWin = currentSlot !== null;
    
    if (isWin) {
        // 当たりの場合
        const slot = getRandomSlot();
        resultDiv.className = 'result win';
        resultDiv.innerHTML = `
            <div>あたり！</div>
            <div class="win-number">
                当たり番号：<span class="win-number-circle">${slot.number}</span>
            </div>
        `;
        createConfetti();
        createSpecialFireworks();
        saveLotteryData();
    } else {
        // はずれの場合
        resultDiv.className = 'result lose';
        resultDiv.innerHTML = 'はずれ';
        createRain();
    }

    // 残り当たり数を更新
    updateRemainingDisplay();
}

// 初期表示時にデータを読み込み、残りの当たり数を表示
document.addEventListener('DOMContentLoaded', () => {
    loadLotteryData();
    updateRemainingDisplay();
    
    // 星と花火を生成
    createStars();
    startBackgroundFireworks();
});

// ランダムな当たり番号を取得
function getRandomSlot() {
    const currentSlot = getCurrentTimeSlotWin();
    if (currentSlot) {
        // 現在の時間枠の当たりが未使用の場合
        if (currentSlot.number <= 18) {
            lotterySlots.firstHalf[currentSlot.number - 1].used = true;
        } else {
            lotterySlots.secondHalf[currentSlot.number - 19].used = true;
        }
        return currentSlot;
    }
    return null;
} 