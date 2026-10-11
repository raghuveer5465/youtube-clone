const displayVideo = new Set();
const menuBtn = document.getElementById('bars');
const sidebar = document.querySelector('.brack');

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
function ViewsConverter(views){
    if(views >= 1000000) return (views/1000000).toFixed(1) + 'M';
    if(views >= 1000) return (views/1000).toFixed(1) + 'K';
    return views;
}
function CreateCard(videoData){
    console.log(`Creating Card: ${videoData.title}`);
    const grid = document.getElementById('video-grid');
    const card = document.createElement('div');
    card.className = 'video-card';
    /* card.onclick = () => {
        window.open(`https://www.youtube.com/watch?v=${videoData.id}`, '_blank');
    }; */
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
    grid.appendChild(card);
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
const My_ApiKEY = "AIzaSyBlzundZw5x067Ng-jVbNDXuQj_PECUNwc";
async function FetchData(categoryId, maxResults = 3){
    console.log(`API Call: Fetching category ${categoryId}...`);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&videoCategoryId=${categoryId}&maxResults=${maxResults}&key=${My_ApiKEY}`;
    try{
        const response = await fetch(url);
        if(!response.ok){
            throw new Error (`Http! error Status: ${response.status}`);
        }
        const result = await response.json();
        return result.items.map(item => ({
                id: item.id,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.maxres ? item.snippet.thumbnails.maxres.url : item.snippet.thumbnails.default.url,
                views: item.statistics.viewCount,
                publishedAt: item.snippet.publishedAt,
        }));
    }catch(err){
        console.log('Fetch Error : ',err);
        return [];
    }
}

async function getChannelVideos(channelId, maxResults = 3) {
    console.log(`API Call: Fetching playlist IDs for channel ${channelId}...`);
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
            thumbnail: item.snippet.thumbnails.maxres ? item.snippet.thumbnails.maxres.url : item.snippet.thumbnails.high.url,
            views: item.statistics.viewCount,
            publishedAt: item.snippet.publishedAt,
        }));
    } catch (err) {
        console.log('Error fetching specific channel:', err);
        return [];
    }
}

async function loadMixedFeed() {
    document.getElementById('video-grid').innerHTML = '';
    const beastBoyShub_ID = "UCI86prlqXhbkREDMTaORvLQ";
    try{
        const[gamingVideos, comedyVideos, techVideos, bbsVideos] = await Promise.all([
            FetchData('20', 6),
            FetchData('23', 6),
            FetchData('28', 6),
            getChannelVideos(beastBoyShub_ID, 7),
        ]);
        let allVideos = [...gamingVideos, ...comedyVideos, ...techVideos, ...bbsVideos];
        allVideos = allVideos.sort(()=>Math.random() - 0.5);
        allVideos = allVideos.slice(0, 21);
        allVideos.forEach(videoData => {
            displayVideo.add(videoData.id);
            CreateCard(videoData);
        });
    }catch(err){
        console.log("Error loading mixed Cards:", err);
    }
}
loadMixedFeed();

const searchForm = document.querySelector('.search-form');
const searchInput = document.getElementById('search');

let isFetchingMore = false;
let limitPopupShown = false;
let isSearchActive = false;

searchForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const query = searchInput.value.trim();
    if(!query) return;
    
    isSearchActive = true; 
    limitPopupShown = false;

    const videoBox = document.getElementById('video-grid');
    videoBox.scrollTop = 0;
    videoBox.innerHTML = '';
    displayVideo.clear();
    
    try{
        console.log(`Search Initiated: "${query}"`);
        console.log(`API Call 1/2: Searching for IDs...`);
        const searchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=id&maxResults=30&q=${encodeURIComponent(query)}&type=video&key=${My_ApiKEY}`;
        const response  = await fetch(searchUrl);
        const data = await response.json();
        
        const searchIdsArray = data.items.map(item => item.id.videoId);
        const videoIds = searchIdsArray.join(',');
        
        console.log(`IDs found. 📡 API Call 2/2: Fetching rich data...`);
        const videosUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${My_ApiKEY}`;
        const videoResponse = await fetch(videosUrl);
        const videoData = await videoResponse.json();
        
        console.log(`Success: Search data formatting and card creation starting...`);
        
        videoData.items.sort((a, b) => searchIdsArray.indexOf(a.id) - searchIdsArray.indexOf(b.id));
        
        const VideosFormatter = videoData.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.maxres ? item.snippet.thumbnails.maxres.url : 
            (item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.default.url),
            views: item.statistics.viewCount,
            publishedAt: item.snippet.publishedAt,
        }));
        
        VideosFormatter.forEach(video =>{
            displayVideo.add(video.id);
            CreateCard(video);
        });
    }catch(err){
        console.log("Found Error while searching for videos : ",err);
    }
});

const gridCards = document.getElementById('video-grid');
const loader = document.getElementById('loading-spinner');
gridCards.style.paddingBottom = "80px";
if(loader){
    loader.style.gridColumn = '1 / -1';
}

function showLimitPopup(title, message) {
    if (document.getElementById('limit-popup')) {
        document.getElementById('popup-title').innerText = title;
        document.getElementById('popup-desc').innerText = message;
        document.getElementById('limit-popup').style.display = 'flex';
        return;
    }
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'limit-popup';
    popupOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;';
    popupOverlay.innerHTML = `
        <div style="background: #212121; padding: 30px; border-radius: 12px; text-align: center; max-width: 350px; border: 1px solid #333; color: white;">
            <h2 id="popup-title" style="margin-top: 0; font-size: 20px;">${title}</h2>
            <p id="popup-desc" style="color: #aaa; line-height: 1.5; margin-bottom: 25px; font-size: 14px;">
                ${message}
            </p>
            <button id="close-limit-btn" style="background: #3ea6ff; color: #0f0f0f; border: none; padding: 10px 24px; font-size: 16px; font-weight: bold; border-radius: 18px; cursor: pointer;">Okay</button>
        </div>
    `;
    
    document.body.appendChild(popupOverlay);
    
    document.getElementById('close-limit-btn').addEventListener('click', () => {
        popupOverlay.style.display = 'none';
    });
}

gridCards.addEventListener('scroll', async ()=>{
    if(gridCards.scrollTop === 0) return;
    const isAtBottom = gridCards.scrollTop + gridCards.clientHeight >= gridCards.scrollHeight - 200; 
    if(isAtBottom && !isFetchingMore){    
        if (isSearchActive) {
            if (!limitPopupShown) {
                showLimitPopup(
                    "End of Search Results", 
                    "We've loaded the top 30 videos for your search. To keep the API limits safe, search scrolling is capped for now. Try searching for a new term!"
                );
                limitPopupShown = true; 
            }
            return;
        }
        if (displayVideo.size >= 60) {
            if (!limitPopupShown) {
                showLimitPopup(
                    "You've seen them all!", 
                    "We've loaded 60 popular videos for you. If you are looking for something specific, please use the search bar at the top!"
                );
                limitPopupShown = true; 
            }
            return;
        }
        isFetchingMore = true;
        if(loader){
            loader.style.display = 'block';
            loader.innerHTML = '<i class="uil uil-spinner" style="font-size: 24px; display: inline-block; animation: spin 1s linear infinite;"></i><p style="margin-top: 5px; font-size: 14px;">Loading more videos...</p>';
            gridCards.appendChild(loader);
        }
        const categories = ['20', '23', '28'];
        const randomCategory = categories[Math.floor(Math.random()*categories.length)];
        try{
            console.log(`Scrolling: Fetching up to 25 more videos...`);
            const newVideos = await FetchData(randomCategory, 25);
            const uniqueVideos = newVideos.filter(video => !displayVideo.has(video.id));
            const safeMultipleOfThree = Math.floor(uniqueVideos.length / 3) * 3;
            const remainingSlots = 60 - displayVideo.size;
            const renderCount = Math.min(6, safeMultipleOfThree, remainingSlots);
            const videosToRender = uniqueVideos.slice(0, renderCount);
            if (videosToRender.length === 0) {
                gridCards.scrollTop = gridCards.scrollTop - 200;
                if(loader) loader.style.display = 'none';
                isFetchingMore = false;
                return;
            } 
            const fragment = document.createDocumentFragment();
            videosToRender.forEach(videoData =>{
                displayVideo.add(videoData.id);
                
                const card = document.createElement('div');
                card.className = 'video-card';
                const viewsCounted = ViewsConverter(videoData.views || 0);
                const timeago = timeSince(videoData.publishedAt);
                const picUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(videoData.channel)}&background=random&color=fff`;
                
                card.innerHTML = `
                <div class="thumbnail-container">
                        <img src="${videoData.thumbnail}" alt="Thumbnail">
                    </div>
                    <div class="video-info">
                        <img class="channel-avatar" src="${picUrl}" alt="Channel Avatar">
                        <div class="video-details">
                            <h3 class="video-title">${videoData.title}</h3>
                            <p class="channel-name">${videoData.channel}</p> 
                            <p class="video-views">${viewsCounted} views • ${timeago}</p>
                        </div>  
                    </div>
                `;
                fragment.appendChild(card);
            });
            
            gridCards.insertBefore(fragment, loader);
            loader.style.display = 'none';
            isFetchingMore = false;
            
        }catch(err){
            console.log("Error loading more videos:", err);
            if(loader) loader.style.display = 'none';
            isFetchingMore = false;
        }
    }
});