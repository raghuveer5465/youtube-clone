const displayVideo = new Set();
const My_ApiKEY = "AIzaSyBlzundZw5x067Ng-jVbNDXuQj_PECUNwc";

let isFetchingMore = false;
let limitPopupShown = false;
let isSearchActive = false;
let lastScrollY = 0;
let targetSubChannel = null;

const gridCards = document.getElementById('video-grid');
const loader = document.getElementById('loading-spinner');
const topNav = document.getElementById('top-navbar');
const bottomNav = document.getElementById('bottom-navbar');
const searchForm = document.querySelector('.search-form');
const searchInput = document.getElementById('search');
const menuBtn = document.getElementById('bars');
const sidebar = document.querySelector('.brack');
const mobileSearchTrigger = document.querySelector('.mobile-search-trigger');
const searchOverlay = document.getElementById('mobile-search-overlay');
const closeSearchBtn = document.getElementById('close-search-btn');
const mobileSearchForm = document.getElementById('mobile-search-form');
const mobileSearchInput = document.getElementById('mobile-search-input');
const searchHistoryList = document.getElementById('search-history-list');
const subModal = document.getElementById('subscribe-modal');
const subsContainer = document.getElementById('dynamic-subs-container');

if(loader) {
    loader.style.gridColumn = '1 / -1';
}

gridCards.style.paddingBottom = "80px";

let mySubs = JSON.parse(localStorage.getItem('mytube_subscriptions')) || [];
let searchHistory = JSON.parse(localStorage.getItem('mytube_history')) || [];

function ViewsConverter(views) {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views;
}

function timeSince(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");
    interval = seconds / 2592000;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");
    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");
    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute ago" : " minutes ago");
    return Math.floor(seconds) + " seconds ago";
}

function CreateCard(videoData) {
    const grid = document.getElementById('video-grid');
    const card = document.createElement('div');
    card.className = 'video-card';
    const ViewsCounted = ViewsConverter(videoData.views || 0);
    const timeAgo = timeSince(videoData.publishedAt);
    const picURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(videoData.channel)}&background=random&color=fff`;
    
    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="${videoData.thumbnail}" alt="Thumbnail">
        </div>
        <div class="video-info">
            <img class="channel-avatar" src="${picURL}" alt="Channel Avatar">
            <div class="video-details">
                <h3 class="video-title">${videoData.title}</h3>
                <p class="channel-name">${videoData.channel}</p> 
                <p class="video-views">${ViewsCounted} views • ${timeAgo}</p>
            </div>
        </div>
    `;

    let pressTimer;
    const startPress = () => {
        pressTimer = window.setTimeout(() => openSubscribeModal(videoData), 800);
    };
    const cancelPress = () => clearTimeout(pressTimer);

    card.addEventListener('mousedown', startPress);
    card.addEventListener('mouseup', cancelPress);
    card.addEventListener('mouseleave', cancelPress);
    card.addEventListener('touchstart', startPress, {passive: true});
    card.addEventListener('touchend', cancelPress);
    card.addEventListener('touchmove', cancelPress);
    
    grid.appendChild(card);
}

async function FetchData(categoryId, maxResults = 3) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&videoCategoryId=${categoryId}&maxResults=${maxResults}&key=${My_ApiKEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Http error Status: ${response.status}`);
        const result = await response.json();
        return result.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            thumbnail: item.snippet.thumbnails.maxres ? item.snippet.thumbnails.maxres.url : item.snippet.thumbnails.default.url,
            views: item.statistics.viewCount,
            publishedAt: item.snippet.publishedAt,
        }));
    } catch (err) {
        return [];
    }
}

async function getChannelVideos(channelId, maxResults = 3) {
    const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${My_ApiKEY}`;
    try {
        const playlistRes = await fetch(playlistUrl);
        const playlistResult = await playlistRes.json();
        const videoIds = playlistResult.items.map(item => item.snippet.resourceId.videoId).join(',');
        if (!videoIds) return [];

        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${My_ApiKEY}`;
        const videosRes = await fetch(videosUrl);
        const videosResult = await videosRes.json();

        return videosResult.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            thumbnail: item.snippet.thumbnails.maxres ? item.snippet.thumbnails.maxres.url : item.snippet.thumbnails.high.url,
            views: item.statistics.viewCount,
            publishedAt: item.snippet.publishedAt,
        }));
    } catch (err) {
        return [];
    }
}

function renderSubscriptions() {
    subsContainer.innerHTML = '<h2>Subscriptions</h2>';
    mySubs.forEach(sub => {
        const btnDiv = document.createElement('div');
        const btn = document.createElement('button');
        btn.className = 'home';
        btn.innerText = sub.name;
        
        btn.addEventListener('click', async () => {
            isSearchActive = true; 
            limitPopupShown = false;
            document.querySelector('.search-form').classList.remove('highlight-active');
            document.querySelector('.mobile-search-trigger').classList.remove('highlight-active');
            
            const videoBox = document.getElementById('video-grid');
            videoBox.scrollTop = 0; 
            videoBox.innerHTML = '';
            displayVideo.clear();
            document.querySelector('.brack').classList.remove('active');
            
            const channelVideos = await getChannelVideos(sub.id, 21);
            channelVideos.forEach(v => {
                displayVideo.add(v.id);
                CreateCard(v);
            });
        });
        
        btnDiv.appendChild(btn);
        subsContainer.appendChild(btnDiv);
    });
}
renderSubscriptions();

function openSubscribeModal(video) {
    targetSubChannel = video;
    document.getElementById('sub-modal-title').innerText = `Subscribe to ${video.channel}?`;
    subModal.style.display = 'flex';
}

document.getElementById('confirm-sub-btn').addEventListener('click', () => {
    if (targetSubChannel) {
        if (!mySubs.find(s => s.id === targetSubChannel.channelId)) {
            mySubs.push({ name: targetSubChannel.channel, id: targetSubChannel.channelId });
            localStorage.setItem('mytube_subscriptions', JSON.stringify(mySubs));
            renderSubscriptions();
        }
    }
    subModal.style.display = 'none';
});

document.getElementById('cancel-sub-btn').addEventListener('click', () => {
    subModal.style.display = 'none';
});

async function goHome() {
    isSearchActive = false;
    limitPopupShown = false;
    document.querySelector('.search-form').classList.remove('highlight-active');
    document.querySelector('.mobile-search-trigger').classList.remove('highlight-active');
    document.querySelector('.brack').classList.remove('active');
    
    topNav.classList.remove('nav-hidden');
    bottomNav.classList.remove('nav-hidden');
    
    document.getElementById('video-grid').scrollTop = 0;
    await loadMixedFeed();
}

document.getElementById('sidebar-home-btn').addEventListener('click', goHome);
document.getElementById('mobile-home-btn').addEventListener('click', goHome);

async function loadMixedFeed() {
    document.getElementById('video-grid').innerHTML = '';
    displayVideo.clear();
    const beastBoyShub_ID = "UCI86prlqXhbkREDMTaORvLQ";
    try {
        const [gamingVideos, comedyVideos, techVideos, bbsVideos] = await Promise.all([
            FetchData('20', 6), FetchData('23', 6), FetchData('28', 6), getChannelVideos(beastBoyShub_ID, 7),
        ]);
        let allVideos = [...gamingVideos, ...comedyVideos, ...techVideos, ...bbsVideos];
        allVideos = allVideos.sort(() => Math.random() - 0.5);
        allVideos = allVideos.slice(0, 21);
        allVideos.forEach(videoData => {
            displayVideo.add(videoData.id);
            CreateCard(videoData);
        });
    } catch (err) {}
}

loadMixedFeed();

searchForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    isSearchActive = true;
    limitPopupShown = false;
    
    document.querySelector('.search-form').classList.add('highlight-active');
    document.querySelector('.mobile-search-trigger').classList.add('highlight-active');
    
    const videoBox = document.getElementById('video-grid');
    videoBox.scrollTop = 0; 
    videoBox.innerHTML = '';
    displayVideo.clear();

    try {
        const searchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=id&maxResults=30&q=${encodeURIComponent(query)}&type=video&key=${My_ApiKEY}`;
        const response = await fetch(searchUrl);
        const data = await response.json();

        const searchIdsArray = data.items.map(item => item.id.videoId);
        const videoIds = searchIdsArray.join(',');

        const videosUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${My_ApiKEY}`;
        const videoResponse = await fetch(videosUrl);
        const videoData = await videoResponse.json();

        videoData.items.sort((a, b) => searchIdsArray.indexOf(a.id) - searchIdsArray.indexOf(b.id));

        const VideosFormatter = videoData.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            channelId: item.snippet.channelId,
            thumbnail: item.snippet.thumbnails.maxres ? item.snippet.thumbnails.maxres.url :
                (item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.default.url),
            views: item.statistics.viewCount,
            publishedAt: item.snippet.publishedAt,
        }));

        VideosFormatter.forEach(video => {
            displayVideo.add(video.id);
            CreateCard(video);
        });
    } catch (err) {}
});

function showLimitPopup(title, message) {
    let popupOverlay = document.getElementById('limit-popup');
    if (popupOverlay) {
        document.getElementById('popup-title').innerText = title;
        document.getElementById('popup-desc').innerText = message;
        popupOverlay.style.display = 'flex';
        return;
    }

    popupOverlay = document.createElement('div');
    popupOverlay.id = 'limit-popup';
    popupOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;';

    popupOverlay.innerHTML = `
        <div style="background: #212121; padding: 30px; border-radius: 12px; text-align: center; max-width: 350px; border: 1px solid #333; color: white;">
            <h2 id="popup-title" style="margin-top: 0; font-size: 20px;">${title}</h2>
            <p id="popup-desc" style="color: #aaa; line-height: 1.5; margin-bottom: 25px; font-size: 14px;">${message}</p>
            <button id="close-limit-btn" style="background: #3ea6ff; color: #0f0f0f; border: none; padding: 10px 24px; font-size: 16px; font-weight: bold; border-radius: 18px; cursor: pointer;">Okay</button>
        </div>
    `;

    document.body.appendChild(popupOverlay);
    document.getElementById('close-limit-btn').addEventListener('click', () => {
        popupOverlay.style.display = 'none';
    });
}

gridCards.addEventListener('scroll', async () => {
    if (gridCards.scrollTop === 0) return;
    
    const currentScrollY = gridCards.scrollTop;
    if (window.innerWidth <= 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 50) {
            topNav.classList.add('nav-hidden');
            bottomNav.classList.add('nav-hidden');
        } else {
            topNav.classList.remove('nav-hidden');
            bottomNav.classList.remove('nav-hidden');
        }
    }
    lastScrollY = currentScrollY;

    const isAtBottom = gridCards.scrollTop + gridCards.clientHeight >= gridCards.scrollHeight - 200;
    if (isAtBottom && !isFetchingMore) {
        if (isSearchActive) {
            if (!limitPopupShown) {
                showLimitPopup("End of Search Results", "We've loaded the top 30 videos for your search. To keep the API limits safe, search scrolling is capped for now. Try searching for a new term!");
                limitPopupShown = true;
            }
            return;
        }

        if (displayVideo.size >= 60) {
            if (!limitPopupShown) {
                showLimitPopup("You've seen them all!", "We've loaded 60 popular videos for you. If you are looking for something specific, please use the search bar at the top!");
                limitPopupShown = true;
            }
            return;
        }

        isFetchingMore = true;
        if (loader) {
            loader.style.display = 'block';
            loader.innerHTML = '<i class="uil uil-spinner" style="font-size: 24px; display: inline-block; animation: spin 1s linear infinite;"></i><p style="margin-top: 5px; font-size: 14px;">Loading more videos...</p>';
            gridCards.appendChild(loader);
        }

        const categories = ['20', '23', '28'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];

        try {
            const newVideos = await FetchData(randomCategory, 50);
            const uniqueVideos = newVideos.filter(video => !displayVideo.has(video.id));

            const safeMultipleOfThree = Math.floor(uniqueVideos.length / 3) * 3;
            const remainingSlots = 60 - displayVideo.size;

            const renderCount = Math.min(6, safeMultipleOfThree, remainingSlots);
            const videosToRender = uniqueVideos.slice(0, renderCount);

            if (videosToRender.length === 0) {
                gridCards.scrollTop = gridCards.scrollTop - 200;
                if (loader) loader.style.display = 'none';
                isFetchingMore = false;
                return;
            }

            const fragment = document.createDocumentFragment();
            videosToRender.forEach(videoData => {
                displayVideo.add(videoData.id);
                CreateCard(videoData);
            });

            gridCards.insertBefore(fragment, loader);
            loader.style.display = 'none';
            isFetchingMore = false;
        } catch (err) {
            if (loader) loader.style.display = 'none';
            isFetchingMore = false;
        }
    }
});

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

function renderHistory() {
    searchHistoryList.innerHTML = '';
    searchHistory.forEach(term => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<i class="uil uil-history"></i><span>${term}</span>`;
        div.addEventListener('click', () => executeMobileSearch(term));
        searchHistoryList.appendChild(div);
    });
}

mobileSearchTrigger.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    renderHistory();
    setTimeout(() => mobileSearchInput.focus(), 300);
});

closeSearchBtn.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
});

mobileSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const term = mobileSearchInput.value.trim();
    if (term) executeMobileSearch(term);
});

function executeMobileSearch(term) {
    searchHistory = searchHistory.filter(t => t !== term);
    searchHistory.unshift(term);
    if (searchHistory.length > 10) searchHistory.pop();
    
    localStorage.setItem('mytube_history', JSON.stringify(searchHistory));
    
    document.getElementById('search').value = term;
    searchOverlay.classList.remove('active');
    
    searchForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}