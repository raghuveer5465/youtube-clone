const displayVideo = new Set();
const My_ApiKEY = "AIzaSyBlzundZw5x067Ng-jVbNDXuQj_PECUNwc";

let isFetchingMore = false;
let limitPopupShown = false;
let isSearchActive = false;
let lastScrollY = 0;
let targetSubChannel = null;

const gridCards = document.getElementById('video-grid');
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

gridCards.style.paddingBottom = "80px";

let mySubs = JSON.parse(localStorage.getItem('mytube_subscriptions')) || [];
let searchHistory = JSON.parse(localStorage.getItem('mytube_history')) || [];

const toast = document.getElementById('toast-notification');
if (!localStorage.getItem('mytube_onboarded')) {
    setTimeout(() => {
        toast.style.bottom = window.innerWidth <= 768 ? '70px' : '30px'; 
        setTimeout(() => {
            toast.style.bottom = '-100px';
            localStorage.setItem('mytube_onboarded', 'true');
        }, 6000);
    }, 1500);
}
document.getElementById('close-toast-btn').addEventListener('click', () => {
    toast.style.bottom = '-100px';
    localStorage.setItem('mytube_onboarded', 'true');
});

function showSkeletons(count = 6) {
    const grid = document.getElementById('video-grid');
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton-thumbnail"></div>
            <div class="skeleton-info">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-details">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        `;
        grid.appendChild(skeleton);
    }
}

function removeSkeletons() {
    const skeletons = document.querySelectorAll('.skeleton-card');
    skeletons.forEach(skel => skel.remove());
}

function parseDuration(duration) {
    if (!duration) return "0:00";
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    let result = "";
    if (hours > 0) result += hours + ":";
    result += (hours > 0 ? minutes.toString().padStart(2, '0') : minutes) + ":";
    result += seconds.toString().padStart(2, '0');
    return result;
}
function playVideo(videoData) {
    document.getElementById('playing-video-title').innerText = videoData.title;
    const iframeContainer = document.getElementById('iframe-container');
    iframeContainer.innerHTML = `<iframe width="100%" height="100%" style="max-width: 1000px; max-height: 560px; aspect-ratio: 16/9; border: none;" src="https://www.youtube.com/embed/${videoData.id}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    document.getElementById('video-player-modal').style.display = 'flex';
}
document.getElementById('close-player-btn').addEventListener('click', () => {
    document.getElementById('video-player-modal').style.display = 'none';
    document.getElementById('iframe-container').innerHTML = '';
});

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
    
    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="${videoData.thumbnail}" alt="Thumbnail" draggable="false">
            <span class="duration-badge">${videoData.duration}</span> <!-- 💡 Timestamp Added! -->
        </div>
        <div class="video-info">
            <img class="channel-avatar" src="${videoData.channelLogo}" alt="Channel Avatar" draggable="false">
            <div class="video-details">
                <h3 class="video-title">${videoData.title}</h3>
                <p class="channel-name">${videoData.channel}</p> 
                <p class="video-views">${ViewsCounted} views • ${timeAgo}</p>
            </div>
        </div>
    `;

    let pressTimer = null;
    let isHolding = false;
    let isLongPressFired = false;
    let startX = 0;
    let startY = 0;
    
    const startHold = (x, y) => {
        if (isHolding) return; 
        isHolding = true;
        isLongPressFired = false;
        startX = x;
        startY = y;
        card.classList.add('pressing');
        
        pressTimer = setTimeout(() => {
            if (isHolding) {
                isLongPressFired = true;
                card.classList.remove('pressing');
                openSubscribeModal(videoData);
                isHolding = false;
            }
        }, 800); 
    };
    
    const cancelHold = () => {
        isHolding = false;
        if (pressTimer) clearTimeout(pressTimer);
        card.classList.remove('pressing');
    };

    card.addEventListener('contextmenu', (e) => e.preventDefault());
    
    card.addEventListener('touchstart', (e) => {
        startHold(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    
    card.addEventListener('touchmove', (e) => {
        if (!isHolding) return;
        if (Math.abs(e.touches[0].clientX - startX) > 20 || Math.abs(e.touches[0].clientY - startY) > 20) {
            cancelHold();
        }
    }, { passive: true });

    card.addEventListener('touchend', cancelHold);
    card.addEventListener('touchcancel', cancelHold);

    card.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        startHold(e.clientX, e.clientY);
    });
    
    card.addEventListener('mousemove', (e) => {
        if (!isHolding) return;
        if (Math.abs(e.clientX - startX) > 20 || Math.abs(e.clientY - startY) > 20) cancelHold();
    });

    card.addEventListener('mouseup', cancelHold);
    card.addEventListener('mouseleave', cancelHold);

    card.addEventListener('click', (e) => {
        if (!isLongPressFired) {
            playVideo(videoData);
        }
    });

    grid.appendChild(card);
}

async function formatWithChannelLogos(items) {
    if (!items || !Array.isArray(items)) return [];
    const uniqueIds = [...new Set(items.map(item => item.snippet.channelId))].slice(0, 50);
    const logosDict = {};
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${uniqueIds.join(',')}&key=${My_ApiKEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.items) {
            data.items.forEach(ch => {
                logosDict[ch.id] = ch.snippet.thumbnails.default.url;
            });
        }
    } catch (e) { console.log("Failed to fetch logos"); }

    return items.map(item => ({
        id: item.id,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnail: item.snippet.thumbnails.maxres ? item.snippet.thumbnails.maxres.url : (item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.default.url),
        views: item.statistics ? item.statistics.viewCount : 0,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails ? parseDuration(item.contentDetails.duration) : "0:00",
        channelLogo: logosDict[item.snippet.channelId] || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.snippet.channelTitle)}&background=random&color=fff`
    }));
}

async function FetchData(categoryId, maxResults = 3) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=IN&videoCategoryId=${categoryId}&maxResults=${maxResults}&key=${My_ApiKEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Http error Status: ${response.status}`);
        const result = await response.json();
        return await formatWithChannelLogos(result.items);
    } catch (err) { return []; }
}

async function getChannelVideos(channelId, maxResults = 3) {
    const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${My_ApiKEY}`;
    try {
        const playlistRes = await fetch(playlistUrl);
        const playlistResult = await playlistRes.json();
        const videoIds = playlistResult.items.map(item => item.snippet.resourceId.videoId).join(',');
        if (!videoIds) return [];

        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${My_ApiKEY}`;
        const videosRes = await fetch(videosUrl);
        const videosResult = await videosRes.json();
        return await formatWithChannelLogos(videosResult.items);
    } catch (err) { return []; }
}

function renderSubscriptions() {
    subsContainer.innerHTML = '<h2>Subscriptions</h2>';
    
    if (mySubs.length === 0) {
        subsContainer.innerHTML += '<p style="color: #aaa; font-size: 13px; padding: 10px 12px; line-height: 1.5; margin: 0;">No subscriptions yet.<br><br>💡 Try long-pressing on any video to subscribe to the channel!</p>';
        return;
    }

    mySubs.forEach(sub => {
        const rowDiv = document.createElement('div');   
        rowDiv.style.display = 'flex';
        rowDiv.style.alignItems = 'center';
        rowDiv.style.justifyContent = 'space-between';
        rowDiv.style.paddingRight = '12px';

        const btn = document.createElement('button');
        btn.className = 'home';

        btn.style.flex = '1';
        const miniLogo = sub.logo ? sub.logo : `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.name)}&background=random&color=fff`;
        btn.innerHTML = `<img src="${miniLogo}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;"> <span>${sub.name}</span>`;
        
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
        
        const unsubBtn = document.createElement('button');
        unsubBtn.innerHTML = '<i class="uil uil-times"></i>';
        unsubBtn.className = 'unsub-btn';
        unsubBtn.addEventListener('click', () => {
            mySubs = mySubs.filter(s => s.id !== sub.id);
            localStorage.setItem('mytube_subscriptions', JSON.stringify(mySubs));
            renderSubscriptions();
        });

        rowDiv.appendChild(btn);
        rowDiv.appendChild(unsubBtn);
        subsContainer.appendChild(rowDiv);
    });
}
renderSubscriptions();

function openSubscribeModal(video) {
    targetSubChannel = video;
    const isSubbed = mySubs.find(s => s.id === video.channelId);
    
    if (isSubbed) {
        document.getElementById('sub-modal-title').innerText = `Unsubscribe from ${video.channel}?`;
        document.getElementById('sub-modal-desc').innerText = `Remove this channel from your subscriptions.`;
        document.getElementById('confirm-sub-btn').innerText = "Unsubscribe";
        document.getElementById('confirm-sub-btn').style.background = "#555";
    } else {
        document.getElementById('sub-modal-title').innerText = `Subscribe to ${video.channel}?`;
        document.getElementById('sub-modal-desc').innerText = `Add this channel to your subscriptions.`;
        document.getElementById('confirm-sub-btn').innerText = "Subscribe";
        document.getElementById('confirm-sub-btn').style.background = "#f00";
    }
    
    subModal.style.display = 'flex';
}

document.getElementById('confirm-sub-btn').addEventListener('click', () => {
    if (targetSubChannel) {
        const isSubbed = mySubs.find(s => s.id === targetSubChannel.channelId);
        
        if (isSubbed) {
            mySubs = mySubs.filter(s => s.id !== targetSubChannel.channelId);
        } else {
           mySubs.push({ 
                name: targetSubChannel.channel, 
                id: targetSubChannel.channelId,
                logo: targetSubChannel.channelLogo,
            });
        }
        localStorage.setItem('mytube_subscriptions', JSON.stringify(mySubs));
        renderSubscriptions();
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
    showSkeletons(12);
    const beastBoyShub_ID = "UCI86prlqXhbkREDMTaORvLQ";
    try {
        const [gamingVideos, comedyVideos, techVideos, bbsVideos] = await Promise.all([
            FetchData('20', 6), FetchData('23', 6), FetchData('28', 6), getChannelVideos(beastBoyShub_ID, 7),
        ]);
        let allVideos = [...gamingVideos, ...comedyVideos, ...techVideos, ...bbsVideos];
        allVideos = allVideos.sort(() => Math.random() - 0.5);
        allVideos = allVideos.slice(0, 21);
        removeSkeletons();
        allVideos.forEach(videoData => {
            displayVideo.add(videoData.id);
            CreateCard(videoData);
        });
    } catch (err) {
        removeSkeletons();
    }
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
        const VideosFormatter = await formatWithChannelLogos(videoData.items);
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
        showSkeletons(6);

        const categories = ['20', '23', '28'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];

        try {
            const newVideos = await FetchData(randomCategory, 50);
            const uniqueVideos = newVideos.filter(video => !displayVideo.has(video.id));
            removeSkeletons();
            if (uniqueVideos.length === 0) {
                isFetchingMore = false;
                return;
            }

            const safeMultipleOfThree = Math.floor(uniqueVideos.length / 3) * 3;
            const remainingSlots = 60 - displayVideo.size;
            
            let renderCount = Math.min(6, remainingSlots);
            if (safeMultipleOfThree > 0 && safeMultipleOfThree < renderCount) {
                renderCount = safeMultipleOfThree;
            }
            
            const videosToRender = uniqueVideos.slice(0, renderCount);
            videosToRender.forEach(videoData => {
                displayVideo.add(videoData.id);
                CreateCard(videoData);
            });
            isFetchingMore = false;
            
            if (displayVideo.size >= 60 && !limitPopupShown) {
                showLimitPopup("You've seen them all!", "We've loaded 60 popular videos for you. If you are looking for something specific, please use the search bar at the top!");
                limitPopupShown = true;
            }
        } catch (err) {
            removeSkeletons();
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