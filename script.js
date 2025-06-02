// ローカルストレージのキー
const STORAGE_KEY = 'lotteryData';

// 抽選の設定
const START_TIME = 11 * 60; // 11:00
const END_TIME = 17 * 60;   // 17:00
const FIRST_HALF_END = 14 * 60; // 14:00
const FIRST_HALF_WIN_COUNT = 18; // 前半の当たり数
const SECOND_HALF_WIN_COUNT = 9; // 後半の当たり数
const WIN_PROBABILITY = 0.3; // 30%の確率で当たり

// 抽選データ
let lotteryData = {
    lastUpdated: new Date().toISOString()
};

// 当たりの管理用オブジェクト
let lotterySlots = {
    // 前半（11:00-14:00）の当たり枠
    firstHalf: Array.from({ length: FIRST_HALF_WIN_COUNT }, (_, i) => ({
        number: i + 1,  // 1-18番
        used: false,
        timeSlot: new Date().setHours(11, i * 10, 0, 0)  // 10分ごと
    })),
    // 後半（14:00-17:00）の当たり枠
    secondHalf: Array.from({ length: SECOND_HALF_WIN_COUNT }, (_, i) => ({
        number: i + 19,  // 19-27番
        used: false,
        timeSlot: new Date().setHours(14, i * 20, 0, 0)  // 20分ごと
    }))
};

// 花火の打ち上げを制御する変数
let isFireworksActive = true;
let backgroundFireworksInterval;

// 最後の当たりが出た時刻を保存する変数
let lastWinTime = null;

// グローバルなAudioContextを保持
let globalAudioContext = null;
let isAudioInitialized = false;

// AudioContextを初期化する関数
function initAudioContext() {
    return new Promise((resolve, reject) => {
        try {
            if (!globalAudioContext) {
                globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            if (globalAudioContext.state === 'suspended') {
                // iOSデバイスでの問題を回避するため、ユーザーインタラクションを待つ
                const resumeAudio = () => {
                    globalAudioContext.resume().then(() => {
                        console.log('AudioContextが再開されました');
                        isAudioInitialized = true;
                        resolve(globalAudioContext);
                    }).catch(error => {
                        console.error('AudioContextの再開に失敗しました:', error);
                        reject(error);
                    });
                };

                // ユーザーインタラクションを待つ
                const handleInteraction = () => {
                    resumeAudio();
                    document.removeEventListener('touchstart', handleInteraction);
                    document.removeEventListener('click', handleInteraction);
                };

                document.addEventListener('touchstart', handleInteraction);
                document.addEventListener('click', handleInteraction);
            } else {
                isAudioInitialized = true;
                resolve(globalAudioContext);
            }
        } catch (error) {
            console.error('AudioContextの初期化に失敗しました:', error);
            reject(error);
        }
    });
}

// 星を生成
function createStars() {
    const starsContainer = document.querySelector('.stars');
    if (!starsContainer) {
        console.warn('Stars container not found');
        return;
    }
    
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
            // 当たりの履歴は保持したまま、スロットとlastWinTimeのみリセット
            const winningNumbers = parsedData.winningNumbers || [];
            resetLotteryData(winningNumbers);
        } else {
            lotterySlots = parsedData.slots;
            lotteryData = parsedData;
            lastWinTime = parsedData.lastWinTime || null;  // lastWinTimeがundefinedの場合はnullを設定
            console.log('読み込まれた最後の当たり時刻:', lastWinTime);
        }
    } else {
        // データが存在しない場合は初期化
        resetLotteryData([]);
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
function resetLotteryData(winningNumbers = []) {
    // 最後の当たりが出た時刻をリセット
    lastWinTime = null;
    console.log('当たり時刻をリセット');

    // 抽選スロットのリセット
    lotterySlots = {
        firstHalf: Array.from({ length: FIRST_HALF_WIN_COUNT }, (_, i) => ({
            number: i + 1,  // 1-18番
            used: false,
            timeSlot: new Date().setHours(11, i * 10, 0, 0)  // 10分ごと
        })),
        secondHalf: Array.from({ length: SECOND_HALF_WIN_COUNT }, (_, i) => ({
            number: i + 19,  // 19-27番
            used: false,
            timeSlot: new Date().setHours(14, i * 20, 0, 0)  // 20分ごと
        }))
    };
    
    // 使用済み番号をリセット
    usedNumbers = [];
    saveUsedNumbers();
    
    // 抽選データをリセット
    lotteryData = {
        lastUpdated: new Date().toISOString(),
        lastWinTime: null,
        winningNumbers: winningNumbers
    };
    
    // 更新されたデータを保存
    saveLotteryData();
    
    // 残りの当たり数を更新
    updateRemainingDisplay();

    // 当たり番号の履歴をクリア
    localStorage.removeItem('winningNumbers');
}

// データをローカルストレージに保存
function saveLotteryData() {
    const dataToSave = {
        slots: lotterySlots,
        lastUpdated: new Date().toISOString(),
        lastWinTime: lastWinTime,
        winningNumbers: lotteryData.winningNumbers || []
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('保存された最後の当たり時刻:', lastWinTime);
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
    const currentTime = hours * 60 + minutes;
    
    if (currentTime >= START_TIME && currentTime < FIRST_HALF_END) {
        // 前半（11:00-14:00）
        const slotIndex = Math.floor((currentTime - START_TIME) / 10);
        return { period: 'firstHalf', index: slotIndex };
    } else if (currentTime >= FIRST_HALF_END && currentTime < END_TIME) {
        // 後半（14:00-17:00）
        const slotIndex = Math.floor((currentTime - FIRST_HALF_END) / 20);
        return { period: 'secondHalf', index: slotIndex };
    }
    return null;
}

// 現在の時間枠の当たりを取得
function getCurrentTimeSlotWin() {
    const timeSlot = getCurrentTimeSlot();
    if (!timeSlot) return null;

    const slots = lotterySlots[timeSlot.period];
    // 未使用のスロットをフィルタリング
    const availableSlots = slots.filter(slot => !slot.used);
    if (availableSlots.length === 0) return null;

    // ランダムに1つのスロットを選択
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    return availableSlots[randomIndex];
}

// 残りの当たり数を表示
function updateRemainingDisplay() {
    const remaining = getRemainingWins();
    const remainingDiv = document.getElementById('remaining');
    if (remainingDiv) {
        remainingDiv.innerHTML = `残りのあたり：<span class="remaining-number">${remaining}</span>個`;
        console.log('表示を更新: 残りの当たり数 =', remaining);
    }
}

// 残りの当たり数を計算
function getRemainingWins() {
    // 前半（11:00-14:00）の残り数を計算
    const firstHalfRemaining = lotterySlots.firstHalf.filter(slot => !slot.used).length;
    const firstHalfUsed = FIRST_HALF_WIN_COUNT - firstHalfRemaining;

    // 後半（14:00-17:00）の残り数を計算
    const secondHalfRemaining = lotterySlots.secondHalf.filter(slot => !slot.used).length;
    const secondHalfUsed = SECOND_HALF_WIN_COUNT - secondHalfRemaining;

    // 現在時刻を取得
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    // デバッグ情報を表示
    console.log('現在時刻:', `${hours}:${minutes.toString().padStart(2, '0')}`);
    console.log('前半の総当たり数:', FIRST_HALF_WIN_COUNT);
    console.log('前半の使用済み当たり数:', firstHalfUsed);
    console.log('前半の残り当たり数:', firstHalfRemaining);
    console.log('後半の総当たり数:', SECOND_HALF_WIN_COUNT);
    console.log('後半の使用済み当たり数:', secondHalfUsed);
    console.log('後半の残り当たり数:', secondHalfRemaining);

    // 全体の残り数を計算
    const totalRemaining = firstHalfRemaining + secondHalfRemaining;
    console.log('全体の残り当たり数:', totalRemaining);

    return totalRemaining;
}

// ボタンの表示/非表示を制御する関数
function toggleDrawButton(show, isResult = false) {
    const drawButton = document.querySelector('.draw-button');
    if (!drawButton) {
        console.error('ボタンが見つかりません');
        return;
    }

    if (show) {
        drawButton.style.display = 'inline-flex';
        drawButton.textContent = isResult ? '抽選結果' : 'くじを引く';
        drawButton.disabled = false;
        console.log('ボタンを表示:', drawButton.textContent);
    } else {
        drawButton.style.display = 'none';
        drawButton.disabled = true;
        console.log('ボタンを非表示');
    }
}

// ボタンクリック音を生成
function playButtonClickSound(audioContext) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // A5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.error('ボタンクリック音の再生に失敗しました:', error);
    }
}

// 効果音を生成・再生する関数
function playSound(soundType) {
    if (!isAudioInitialized) {
        console.log('音声システムを初期化します...');
        initAudioContext()
            .then(audioContext => {
                console.log('AudioContextの状態:', audioContext.state);
                playSoundAfterInit(soundType, audioContext);
            })
            .catch(error => {
                console.error('音声の再生に失敗しました:', error);
            });
    } else {
        playSoundAfterInit(soundType, globalAudioContext);
    }
}

// 初期化後の音声再生
function playSoundAfterInit(soundType, audioContext) {
    try {
        // 音声再生前に状態を確認
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                playSoundImmediately(soundType, audioContext);
            });
        } else {
            playSoundImmediately(soundType, audioContext);
        }
    } catch (error) {
        console.error('音声の再生に失敗しました:', error);
    }
}

// 即時音声再生
function playSoundImmediately(soundType, audioContext) {
    try {
        switch (soundType) {
            case 'win':
                playTaikoSound(audioContext);
                setTimeout(() => playFireworkSound(audioContext), 300);
                setTimeout(() => playWinSound(audioContext), 600);
                break;
            case 'lose':
                playLoseSound(audioContext);
                break;
            case 'button':
                playButtonClickSound(audioContext);
                break;
        }
    } catch (error) {
        console.error('音声の再生に失敗しました:', error);
    }
}

// 太鼓の音を生成
function playTaikoSound(audioContext) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.warn('音声の再生に失敗しました:', error);
    }
}

// 花火の音を生成
function playFireworkSound(audioContext) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.warn('音声の再生に失敗しました:', error);
    }
}

// 当たりの音を生成
function playWinSound(audioContext) {
    try {
        // メインの音
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // 和音を生成
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const currentTime = audioContext.currentTime;
        
        // 音量エンベロープ
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 1.0);
        
        // 周波数変化
        oscillator.frequency.setValueAtTime(frequencies[0], currentTime);
        oscillator.frequency.setValueAtTime(frequencies[1], currentTime + 0.1);
        oscillator.frequency.setValueAtTime(frequencies[2], currentTime + 0.2);
        oscillator.frequency.setValueAtTime(frequencies[3], currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(currentTime + 1.0);

        // 追加の効果音
        setTimeout(() => {
            try {
                const subOscillator = audioContext.createOscillator();
                const subGainNode = audioContext.createGain();
                
                subOscillator.type = 'sine';
                subOscillator.frequency.setValueAtTime(392.00, audioContext.currentTime); // G4
                subOscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.1); // C5
                subOscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
                
                subGainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                subGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                subOscillator.connect(subGainNode);
                subGainNode.connect(audioContext.destination);
                
                subOscillator.start();
                subOscillator.stop(audioContext.currentTime + 0.5);
            } catch (error) {
                console.warn('追加の効果音の再生に失敗しました:', error);
            }
        }, 200);
    } catch (error) {
        console.warn('当たり音の再生に失敗しました:', error);
    }
}

// はずれの音を生成
function playLoseSound(audioContext) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(392, audioContext.currentTime); // G4
        oscillator.frequency.exponentialRampToValueAtTime(349.23, audioContext.currentTime + 0.3); // F4
        oscillator.frequency.exponentialRampToValueAtTime(329.63, audioContext.currentTime + 0.6); // E4
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
        console.warn('はずれ音の再生に失敗しました:', error);
    }
}

// 当たり番号を保存する関数
function saveWinningNumber(number) {
    if (!number) return;  // 番号が存在しない場合は保存しない

    const now = new Date();
    const winningNumber = {
        number: number,
        timestamp: now.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };

    // 既存の当たり番号を読み込む
    let winningNumbers = [];
    const savedNumbers = localStorage.getItem('winningNumbers');
    if (savedNumbers) {
        winningNumbers = JSON.parse(savedNumbers);
    }

    // 新しい当たり番号を追加
    winningNumbers.push(winningNumber);

    // ローカルストレージに保存
    localStorage.setItem('winningNumbers', JSON.stringify(winningNumbers));
}

// 当たり番号を読み込む関数
function loadWinningNumbers() {
    const savedNumbers = localStorage.getItem('winningNumbers');
    if (savedNumbers) {
        return JSON.parse(savedNumbers);
    }
    return [];
}

// 使用済みの番号を管理する配列
let usedNumbers = [];

// 使用済みの番号を読み込む関数
function loadUsedNumbers() {
    const savedUsedNumbers = localStorage.getItem('usedNumbers');
    if (savedUsedNumbers) {
        usedNumbers = JSON.parse(savedUsedNumbers);
        console.log('使用済み番号を読み込み:', usedNumbers);
        
        // 使用済み番号に基づいてスロットの状態を更新
        usedNumbers.forEach(number => {
            if (number <= FIRST_HALF_WIN_COUNT) {
                const slotIndex = lotterySlots.firstHalf.findIndex(slot => slot.number === number);
                if (slotIndex !== -1) {
                    lotterySlots.firstHalf[slotIndex].used = true;
                }
            } else {
                const slotIndex = lotterySlots.secondHalf.findIndex(slot => slot.number === number);
                if (slotIndex !== -1) {
                    lotterySlots.secondHalf[slotIndex].used = true;
                }
            }
        });
    }
}

// 使用済みの番号を保存する関数
function saveUsedNumbers() {
    localStorage.setItem('usedNumbers', JSON.stringify(usedNumbers));
    console.log('使用済み番号を保存:', usedNumbers);
}

// 当たりを判定する関数
function determineWin() {
    // 現在時刻を取得
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    // デバッグ情報を表示
    console.log('現在時刻:', `${hours}:${minutes.toString().padStart(2, '0')}`);
    console.log('残りの当たり数:', getRemainingWins());
    console.log('時間外かどうか:', currentTimeInMinutes < START_TIME || currentTimeInMinutes >= END_TIME);
    console.log('前半/後半:', currentTimeInMinutes < FIRST_HALF_END ? '前半' : '後半');
    console.log('最後の当たり時刻:', lastWinTime ? `${Math.floor(lastWinTime / 60)}:${(lastWinTime % 60).toString().padStart(2, '0')}` : 'なし');

    // 時間外の場合は当たりなし
    if (currentTimeInMinutes < START_TIME || currentTimeInMinutes >= END_TIME) {
        console.log('時間外のため当たりなし');
        return false;
    }

    // 残りの当たり数をチェック
    const remainingWins = getRemainingWins();
    if (remainingWins <= 0) {
        console.log('当たりが残っていないため当たりなし');
        return false;
    }

    // 最後の当たりが出た時刻が設定されていない場合、開始時刻を設定
    if (lastWinTime === null) {
        lastWinTime = START_TIME;
        console.log('最初の当たり判定');
        return true;
    }

    // 前半（11:00-14:00）の場合
    if (currentTimeInMinutes < FIRST_HALF_END) {
        const minutesSinceLastWin = currentTimeInMinutes - lastWinTime;
        const firstHalfRemaining = lotterySlots.firstHalf.filter(slot => !slot.used).length;
        const remainingTime = FIRST_HALF_END - currentTimeInMinutes;

        // 残り時間で当たりが出し切れない可能性がある場合
        if (firstHalfRemaining > 0 && remainingTime < firstHalfRemaining * 10) {
            // 残り時間に応じて間隔を調整
            const adjustedInterval = Math.floor(remainingTime / firstHalfRemaining);
            if (minutesSinceLastWin >= adjustedInterval) {
                console.log('前半の当たり判定（調整済み）: 当たり', '調整後の間隔:', adjustedInterval, '分');
                return true;
            }
            console.log('前半の当たり判定（調整済み）: はずれ', '次の当たりまで:', adjustedInterval - minutesSinceLastWin, '分');
            return false;
        }

        // 通常の10分間隔での判定
        if (firstHalfRemaining > 0 && minutesSinceLastWin >= 10) {
            console.log('前半の当たり判定: 当たり', '最後の当たりから経過分数:', minutesSinceLastWin);
            return true;
        }
        console.log('前半の当たり判定: はずれ', '次の当たりまで:', 10 - minutesSinceLastWin, '分');
        return false;
    }
    // 後半（14:00-17:00）の場合
    else {
        const minutesSinceLastWin = currentTimeInMinutes - lastWinTime;
        const secondHalfRemaining = lotterySlots.secondHalf.filter(slot => !slot.used).length;
        const remainingTime = END_TIME - currentTimeInMinutes;

        // 残り時間で当たりが出し切れない可能性がある場合
        if (secondHalfRemaining > 0 && remainingTime < secondHalfRemaining * 20) {
            // 残り時間に応じて間隔を調整
            const adjustedInterval = Math.floor(remainingTime / secondHalfRemaining);
            if (minutesSinceLastWin >= adjustedInterval) {
                console.log('後半の当たり判定（調整済み）: 当たり', '調整後の間隔:', adjustedInterval, '分');
                return true;
            }
            console.log('後半の当たり判定（調整済み）: はずれ', '次の当たりまで:', adjustedInterval - minutesSinceLastWin, '分');
            return false;
        }

        // 通常の20分間隔での判定
        if (secondHalfRemaining > 0 && minutesSinceLastWin >= 20) {
            console.log('後半の当たり判定: 当たり', '最後の当たりから経過分数:', minutesSinceLastWin);
            return true;
        }
        console.log('後半の当たり判定: はずれ', '次の当たりまで:', 20 - minutesSinceLastWin, '分');
        return false;
    }
}

// ランダムな当たり番号を生成する関数
function generateRandomWinningNumber() {
    // 現在時刻を取得
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    // 最後の当たりが出た時刻を更新
    lastWinTime = currentTimeInMinutes;
    console.log('当たり時刻を更新:', `${hours}:${minutes.toString().padStart(2, '0')}`);
    
    // データを保存
    saveLotteryData();

    // 時間帯に応じて適切なスロットを選択
    let slots;
    if (currentTimeInMinutes < FIRST_HALF_END) {
        // 前半（11:00-14:00）- 1-18番
        slots = lotterySlots.firstHalf;
        console.log('前半のスロットを選択');
    } else {
        // 後半（14:00-17:00）- 19-27番
        slots = lotterySlots.secondHalf;
        console.log('後半のスロットを選択');
    }

    // 未使用のスロットをフィルタリング
    const availableSlots = slots.filter(slot => !slot.used);
    console.log('利用可能なスロット数:', availableSlots.length);
    
    if (availableSlots.length === 0) {
        console.log('利用可能な当たり番号がありません');
        return null;
    }

    // ランダムに1つのスロットを選択
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    const selectedSlot = availableSlots[randomIndex];

    console.log('選択された当たり番号:', selectedSlot.number);

    // 選択されたスロットを使用済みにする
    if (selectedSlot.number <= FIRST_HALF_WIN_COUNT) {
        const slotIndex = lotterySlots.firstHalf.findIndex(slot => slot.number === selectedSlot.number);
        if (slotIndex !== -1) {
            lotterySlots.firstHalf[slotIndex].used = true;
            console.log('前半のスロットを使用済みに設定:', selectedSlot.number);
        }
    } else {
        const slotIndex = lotterySlots.secondHalf.findIndex(slot => slot.number === selectedSlot.number);
        if (slotIndex !== -1) {
            lotterySlots.secondHalf[slotIndex].used = true;
            console.log('後半のスロットを使用済みに設定:', selectedSlot.number);
        }
    }

    // 使用済み番号を保存
    usedNumbers.push(selectedSlot.number);
    saveUsedNumbers();

    // データを保存
    saveLotteryData();

    // 残りの当たり数を更新
    updateRemainingDisplay();

    return selectedSlot.number;
}

// 抽選時間内かどうかをチェック
function isLotteryTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    return currentTime >= START_TIME && currentTime < END_TIME;
}

// サイコロを表示する関数
function showDice() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <div class="dice-container">
            <span>抽選中...</span>
            <div class="dice">
                <div class="dice-face"><div class="dot"></div></div>
                <div class="dice-face"><div class="dot"></div><div class="dot"></div></div>
                <div class="dice-face"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <div class="dice-face"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <div class="dice-face"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
                <div class="dice-face"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            </div>
        </div>
    `;
}

// 雨のエフェクトを生成する関数
function createRain() {
    const rainContainer = document.createElement('div');
    rainContainer.className = 'rain-container';
    document.body.appendChild(rainContainer);

    // 雨粒を生成
    for (let i = 0; i < 50; i++) {
        const raindrop = document.createElement('div');
        raindrop.className = 'raindrop';
        raindrop.style.left = `${Math.random() * 100}%`;
        raindrop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        raindrop.style.animationDelay = `${Math.random() * 0.5}s`;
        rainContainer.appendChild(raindrop);
    }

    // 1秒後に雨のエフェクトを削除
    setTimeout(() => {
        rainContainer.remove();
    }, 1000);
}

// 抽選実行
function drawLottery() {
    const result = document.getElementById('result');
    const remaining = document.querySelector('.remaining-number');
    const drawButton = document.querySelector('.draw-button');
    
    if (!drawButton) {
        console.error('ボタンが見つかりません');
        return;
    }

    // 音声を再生
    playSound('button');

    // ボタンを非表示
    drawButton.style.display = 'none';
    drawButton.disabled = true;
    
    // 花火を一時停止
    isFireworksActive = false;
    
    // デバッグ情報を表示
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    console.log('抽選開始時刻:', `${hours}:${minutes.toString().padStart(2, '0')}`);
    console.log('残りの当たり数:', getRemainingWins());
    
    // 抽選中の表示
    result.innerHTML = `
        <div class="dice-container">
            <div class="dice left">
                <div class="dice-face">
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
            <span>抽選中...</span>
            <div class="dice right">
                <div class="dice-face">
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <div class="dice-face">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        </div>
    `;

    // 抽選中の表示時間を2秒に設定
    setTimeout(() => {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        console.log('抽選判定時刻:', `${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
        console.log('残りの当たり数:', getRemainingWins());

        if (currentTimeInMinutes < START_TIME || currentTimeInMinutes >= END_TIME) {
            console.log('時間外のため当たりなし');
            result.className = 'result time-out';
            result.textContent = '抽選時間外です';
            setTimeout(() => {
                result.className = '';
                result.innerHTML = '';
                drawButton.textContent = 'くじを引く';
                drawButton.style.display = 'inline-flex';
                drawButton.disabled = false;
                // 花火を再開
                isFireworksActive = true;
            }, 3000);
            return;
        }

        const isFirstHalf = currentTimeInMinutes < FIRST_HALF_END;
        const slot = isFirstHalf ? lotterySlots.firstHalf : lotterySlots.secondHalf;
        
        // 残りの当たり数をチェック
        const remainingWins = getRemainingWins();
        if (remainingWins <= 0) {
            console.log('当たりが残っていないため当たりなし');
            result.className = 'result lose';
            result.textContent = '当たりがなくなりました';
            setTimeout(() => {
                result.className = '';
                result.innerHTML = '';
                drawButton.textContent = 'くじを引く';
                drawButton.style.display = 'inline-flex';
                drawButton.disabled = false;
                // 花火を再開
                isFireworksActive = true;
            }, 3000);
            return;
        }

        const isWin = determineWin();
        console.log('当たり判定結果:', isWin);
        
        if (isWin) {
            const winningNumber = generateRandomWinningNumber();
            if (winningNumber) {
                console.log('当選番号:', winningNumber);
                result.className = 'result win';
                result.innerHTML = `
                    <div style="margin-bottom: 15px; font-size: 1.2em;">あたり！</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <span>当選番号：</span>
                        <div class="win-number-circle">${winningNumber}</div>
                    </div>
                `;
                playSound('win');
                updateRemainingDisplay();
                saveWinningNumber(winningNumber);

                // 当たりの結果を5秒間表示
                setTimeout(() => {
                    result.className = '';
                    result.innerHTML = '';
                    drawButton.textContent = 'くじを引く';
                    drawButton.style.display = 'inline-flex';
                    drawButton.disabled = false;
                    // 花火を再開
                    isFireworksActive = true;
                }, 5000);
            }
        } else {
            console.log('はずれ');
            result.className = 'result lose';
            result.textContent = 'はずれ';
            playSound('lose');
            createRain();

            // はずれの結果を3秒間表示
            setTimeout(() => {
                result.className = '';
                result.innerHTML = '';
                drawButton.textContent = 'くじを引く';
                drawButton.style.display = 'inline-flex';
                drawButton.disabled = false;
                // 花火を再開
                isFireworksActive = true;
            }, 3000);
        }
    }, 2000);
}

// 初期表示時にデータを読み込み、残りの当たり数を表示
document.addEventListener('DOMContentLoaded', () => {
    loadLotteryData();
    const winningNumbers = loadWinningNumbers();
    loadUsedNumbers();
    updateRemainingDisplay();
    
    createStars();
    startBackgroundFireworks();

    // 初期表示時にボタンを表示
    const drawButton = document.querySelector('.draw-button');
    if (drawButton) {
        drawButton.style.display = 'inline-flex';
        drawButton.textContent = 'くじを引く';
        drawButton.disabled = false;

        // タッチイベントとクリックイベントの両方を処理
        const handleInteraction = () => {
            if (!isAudioInitialized) {
                initAudioContext()
                    .then(() => {
                        console.log('AudioContextが初期化されました');
                    })
                    .catch(error => {
                        console.error('AudioContextの初期化に失敗しました:', error);
                    });
            }
        };

        // クリックとタッチの両方のイベントをリッスン
        drawButton.addEventListener('click', handleInteraction);
        drawButton.addEventListener('touchstart', handleInteraction);
    }

    // ページ全体のタッチイベントでも初期化
    document.addEventListener('touchstart', () => {
        if (!isAudioInitialized) {
            initAudioContext()
                .then(() => {
                    console.log('ページ全体のタッチでAudioContextが初期化されました');
                })
                .catch(error => {
                    console.error('AudioContextの初期化に失敗しました:', error);
                });
        }
    }, { once: true });
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

function updateRemainingCount() {
    const remainingElement = document.querySelector('.remaining-number');
    const currentCount = parseInt(remainingElement.textContent);
    remainingElement.textContent = currentCount - 1;
    remainingElement.classList.add('update');
    setTimeout(() => {
        remainingElement.classList.remove('update');
    }, 500);
}

// 管理画面でリセットボタンがクリックされた時の処理
function handleReset() {
    if (confirm('抽選結果をリセットしますか？\nこの操作は取り消せません。')) {
        resetLotteryData();
        alert('抽選結果をリセットしました。');
        // 管理画面の表示を更新
        if (window.location.pathname.includes('admin.html')) {
            displayWinningNumbers();
        }
    }
}

// 管理画面で当たり番号を表示する関数
function displayWinningNumbers() {
    const winningNumbersList = document.getElementById('winningNumbersList');
    if (!winningNumbersList) return;

    // 当たり番号を読み込む
    const winningNumbers = loadWinningNumbers();
    
    // 当たり番号を時系列でソート
    winningNumbers.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
    });

    // 当たり番号のリストを生成
    let html = '';
    winningNumbers.forEach(win => {
        html += `
            <div class="winning-number-item">
                <span class="number">当選番号: ${win.number}</span>
                <span class="timestamp">${win.timestamp}</span>
            </div>
        `;
    });

    // リストを更新
    winningNumbersList.innerHTML = html;
}

// くじの設定
const totalTickets = 100; // くじの総数
let remainingTickets = totalTickets; // 残りのくじの数
let winningTickets = 0; // 当たりくじの数

// くじを引く関数
function drawLottery() {
    if (remainingTickets <= 0) {
        alert('くじがなくなりました！');
        return;
    }

    // 残りのくじから1枚引く
    remainingTickets--;

    // 当たりかどうかを判定（10%の確率で当たり）
    const isWin = Math.random() < 0.1;
    if (isWin) {
        winningTickets++;
    }

    // 結果を表示
    const resultElement = document.getElementById('result');
    resultElement.textContent = isWin ? '🎉 当たり！ 🎉' : 'はずれ...';
    resultElement.className = 'result ' + (isWin ? 'win' : 'lose');

    // 残りのくじの数を更新
    updateRemainingTickets();

    // 当たりの場合は花火を表示
    if (isWin) {
        showFireworks();
    }
}

// 残りのくじの数を更新する関数
function updateRemainingTickets() {
    const remainingElement = document.getElementById('remaining');
    remainingElement.querySelector('.remaining-number').textContent = remainingTickets;
}

// 花火を表示する関数
function showFireworks() {
    const rain = document.getElementById('rain');
    rain.innerHTML = '';
    
    // 花火の数を設定
    const fireworkCount = 50;
    
    for (let i = 0; i < fireworkCount; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        
        // 花火の位置をランダムに設定
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight;
        const endX = startX + (Math.random() - 0.5) * 200;
        const endY = startY - Math.random() * 300;
        
        // 花火の色をランダムに設定
        const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // 花火のスタイルを設定
        firework.style.left = startX + 'px';
        firework.style.top = startY + 'px';
        firework.style.backgroundColor = color;
        
        // 花火のアニメーションを設定
        firework.animate([
            { transform: 'translate(0, 0)', opacity: 1 },
            { transform: `translate(${endX - startX}px, ${endY - startY}px)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 1000,
            easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
        });
        
        rain.appendChild(firework);
        
        // アニメーション終了後に花火を削除
        setTimeout(() => {
            firework.remove();
        }, 2000);
    }
}

// ページ読み込み時に残りのくじの数を表示
window.onload = function() {
    updateRemainingTickets();
}; 