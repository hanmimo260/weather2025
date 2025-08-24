// API 설정
const API_KEY = '82ecf3750fed4d1160fc3ee0372198df7e6d8f391934374d063b30143c6e7a3f';
const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// 경상남도 주요 도시들의 격자 좌표 (nx, ny)
const CITY_COORDINATES = {
    '창원시': { nx: 89, ny: 76 },
    '부산시': { nx: 97, ny: 74 },
    '진주시': { nx: 81, ny: 75 },
    '통영시': { nx: 87, ny: 68 },
    '사천시': { nx: 80, ny: 71 },
    '김해시': { nx: 95, ny: 77 },
    '밀양시': { nx: 92, ny: 83 },
    '거제시': { nx: 90, ny: 69 },
    '양산시': { nx: 97, ny: 79 },
    '의령군': { nx: 83, ny: 78 },
    '함안군': { nx: 86, ny: 77 },
    '창녕군': { nx: 87, ny: 83 },
    '고성군': { nx: 85, ny: 69 },
    '남해군': { nx: 77, ny: 68 },
    '하동군': { nx: 74, ny: 72 },
    '산청군': { nx: 78, ny: 75 },
    '함양군': { nx: 74, ny: 78 },
    '거창군': { nx: 77, ny: 81 },
    '합천군': { nx: 81, ny: 81 }
};

// DOM 요소들
const citySelect = document.getElementById('citySelect');
const locationName = document.getElementById('locationName');
const currentTime = document.getElementById('currentTime');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const windDirection = document.getElementById('windDirection');
const visibility = document.getElementById('visibility');
const loading = document.getElementById('loading');

// 현재 시간 업데이트 함수
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    currentTime.textContent = timeString;
}

// 날씨 아이콘 설정 함수
function setWeatherIcon(weatherCode) {
    const iconElement = weatherIcon.querySelector('i');
    
    // 기상청 날씨 코드에 따른 아이콘 매핑
    const weatherIcons = {
        '맑음': 'fas fa-sun',
        '구름많음': 'fas fa-cloud',
        '흐림': 'fas fa-cloud',
        '비': 'fas fa-cloud-rain',
        '눈': 'fas fa-snowflake',
        '안개': 'fas fa-smog',
        '소나기': 'fas fa-cloud-showers-heavy',
        '천둥번개': 'fas fa-bolt'
    };
    
    // 기본값
    let iconClass = 'fas fa-question';
    
    // 날씨 코드에 따른 아이콘 설정
    if (weatherCode.includes('맑음')) {
        iconClass = weatherIcons['맑음'];
        weatherIcon.className = 'weather-icon sunny';
    } else if (weatherCode.includes('구름')) {
        iconClass = weatherIcons['구름많음'];
        weatherIcon.className = 'weather-icon cloudy';
    } else if (weatherCode.includes('흐림')) {
        iconClass = weatherIcons['흐림'];
        weatherIcon.className = 'weather-icon cloudy';
    } else if (weatherCode.includes('비') || weatherCode.includes('소나기')) {
        iconClass = weatherIcons['비'];
        weatherIcon.className = 'weather-icon rainy';
    } else if (weatherCode.includes('눈')) {
        iconClass = weatherIcons['눈'];
        weatherIcon.className = 'weather-icon snowy';
    } else if (weatherCode.includes('안개')) {
        iconClass = weatherIcons['안개'];
        weatherIcon.className = 'weather-icon foggy';
    } else if (weatherCode.includes('천둥')) {
        iconClass = weatherIcons['천둥번개'];
        weatherIcon.className = 'weather-icon rainy';
    }
    
    iconElement.className = iconClass;
}

// 풍향 변환 함수
function getWindDirection(angle) {
    const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
    const index = Math.round(angle / 45) % 8;
    return directions[index];
}

// API 호출 함수
async function fetchWeatherData(city) {
    const coordinates = CITY_COORDINATES[city];
    if (!coordinates) {
        throw new Error('해당 도시의 좌표 정보가 없습니다.');
    }

    // 현재 시간 기준으로 API 호출 시간 설정
    const now = new Date();
    const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(now.getHours() / 3) * 3);
    
    // API 호출 시간이 현재 시간보다 미래인 경우 이전 시간으로 조정
    if (baseTime > now) {
        baseTime.setHours(baseTime.getHours() - 3);
    }
    
    const baseDate = baseTime.toISOString().slice(0, 10).replace(/-/g, '');
    const baseTimeStr = baseTime.toTimeString().slice(0, 2) + '00';

    const url = `${BASE_URL}/getUltraSrtNcst`;
    const params = new URLSearchParams({
        serviceKey: API_KEY,
        pageNo: '1',
        numOfRows: '1000',
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTimeStr,
        nx: coordinates.nx,
        ny: coordinates.ny
    });

    try {
        const response = await fetch(`${url}?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.response.header.resultCode !== '00') {
            throw new Error(data.response.header.resultMsg || 'API 호출 실패');
        }
        
        return data.response.body.items.item;
    } catch (error) {
        console.error('날씨 데이터 가져오기 실패:', error);
        throw error;
    }
}

// 날씨 데이터 파싱 함수
function parseWeatherData(items) {
    const weatherData = {};
    
    items.forEach(item => {
        switch (item.category) {
            case 'T1H': // 기온
                weatherData.temperature = parseFloat(item.obsrValue);
                break;
            case 'RN1': // 1시간 강수량
                weatherData.rainfall = parseFloat(item.obsrValue);
                break;
            case 'REH': // 습도
                weatherData.humidity = parseFloat(item.obsrValue);
                break;
            case 'WSD': // 풍속
                weatherData.windSpeed = parseFloat(item.obsrValue);
                break;
            case 'VEC': // 풍향
                weatherData.windDirection = parseFloat(item.obsrValue);
                break;
            case 'PTY': // 강수형태
                weatherData.precipitationType = parseInt(item.obsrValue);
                break;
        }
    });
    
    return weatherData;
}

// UI 업데이트 함수
function updateWeatherUI(city, weatherData) {
    // 위치 정보 업데이트
    locationName.textContent = city;
    
    // 기온 업데이트
    if (weatherData.temperature !== undefined) {
        temperature.textContent = Math.round(weatherData.temperature);
    }
    
    // 습도 업데이트
    if (weatherData.humidity !== undefined) {
        humidity.textContent = `${Math.round(weatherData.humidity)}%`;
    }
    
    // 풍속 업데이트
    if (weatherData.windSpeed !== undefined) {
        windSpeed.textContent = `${weatherData.windSpeed.toFixed(1)} m/s`;
    }
    
    // 풍향 업데이트
    if (weatherData.windDirection !== undefined) {
        windDirection.textContent = getWindDirection(weatherData.windDirection);
    }
    
    // 가시거리 (기본값 설정)
    visibility.textContent = '10.0 km';
    
    // 날씨 설명 및 아이콘 설정
    let weatherDesc = '맑음';
    if (weatherData.precipitationType !== undefined) {
        switch (weatherData.precipitationType) {
            case 0:
                weatherDesc = '맑음';
                break;
            case 1:
                weatherDesc = '비';
                break;
            case 2:
                weatherDesc = '비/눈';
                break;
            case 3:
                weatherDesc = '눈';
                break;
            case 4:
                weatherDesc = '소나기';
                break;
        }
    }
    
    weatherDescription.textContent = weatherDesc;
    setWeatherIcon(weatherDesc);
}

// 에러 표시 함수
function showError(message) {
    const weatherContainer = document.getElementById('weatherContainer');
    
    // 기존 에러 메시지 제거
    const existingError = weatherContainer.querySelector('.error');
    if (existingError) {
        existingError.remove();
    }
    
    // 새 에러 메시지 추가
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
    `;
    
    weatherContainer.appendChild(errorDiv);
}

// 로딩 상태 관리
function setLoading(show) {
    if (show) {
        loading.classList.add('show');
        // 기존 날씨 정보 숨기기
        document.querySelector('.weather-header').style.display = 'none';
        document.querySelector('.weather-main').style.display = 'none';
        document.querySelector('.weather-details').style.display = 'none';
    } else {
        loading.classList.remove('show');
        // 날씨 정보 다시 표시
        document.querySelector('.weather-header').style.display = 'flex';
        document.querySelector('.weather-main').style.display = 'block';
        document.querySelector('.weather-details').style.display = 'grid';
    }
}

// 도시 선택 이벤트 핸들러
async function handleCityChange() {
    const selectedCity = citySelect.value;
    
    if (!selectedCity) {
        // 도시가 선택되지 않은 경우 초기 상태로 리셋
        locationName.textContent = '도시를 선택하세요';
        temperature.textContent = '--';
        weatherDescription.textContent = '날씨 정보를 불러오는 중...';
        humidity.textContent = '--%';
        windSpeed.textContent = '-- m/s';
        windDirection.textContent = '--';
        visibility.textContent = '-- km';
        weatherIcon.innerHTML = '<i class="fas fa-question"></i>';
        weatherIcon.className = 'weather-icon';
        return;
    }
    
    try {
        setLoading(true);
        
        // 에러 메시지 제거
        const existingError = document.querySelector('.error');
        if (existingError) {
            existingError.remove();
        }
        
        // 날씨 데이터 가져오기
        const weatherItems = await fetchWeatherData(selectedCity);
        const weatherData = parseWeatherData(weatherItems);
        
        // UI 업데이트
        updateWeatherUI(selectedCity, weatherData);
        
    } catch (error) {
        console.error('날씨 정보 가져오기 실패:', error);
        showError('날씨 정보를 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
        setLoading(false);
    }
}

// 초기화 함수
function initializeApp() {
    // 현재 시간 업데이트 시작
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // 도시 선택 이벤트 리스너 등록
    citySelect.addEventListener('change', handleCityChange);
    
    // 초기 로딩 상태 숨기기
    setLoading(false);
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', initializeApp);
