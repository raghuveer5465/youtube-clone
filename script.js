const displayVideo = new Set();
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
searchForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const query = searchInput.value.trim();
    if(!query) return;
    const videoBox = document.getElementById('video-grid');
    videoBox.innerHTML = '';
    displayVideo.clear();
    try{
        console.log(`Search Initiated: "${query}"`);
        console.log(`API Call 1/2: Searching for IDs...`);
        const searchUrl = `https://youtube.googleapis.com/youtube/v3/search?part=id&maxResults=21&q=${encodeURIComponent(query)}&type=video&key=${My_ApiKEY}`;
        const response  = await fetch(searchUrl);
        const data = await response.json();
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        console.log(`IDs found. 📡 API Call 2/2: Fetching rich data...`);
        const videosUrl = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${My_ApiKEY}`;
        const videoResponse = await fetch(videosUrl);
        const videoData = await videoResponse.json();
        console.log(`Success: Search data formatting and card creation starting...`);
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
let isFetchingMore = false;
const gridCards = document.getElementById('video-grid');
const loader = document.getElementById('loading-spinner');

gridCards.addEventListener('scroll', async ()=>{
    const isAtBottom = gridCards.scrollTop + gridCards.clientHeight >= gridCards.scrollHeight - 200;
    if(isAtBottom && !isFetchingMore){
        isFetchingMore = true;
        if(loader){
        loader.style.display = 'block';
        gridCards.appendChild(loader);
    }else{
        console.log("Loader HTML is missing from the page!");
    }
        const categories = ['20', '23', '28'];
        const randomCategory = categories[Math.floor(Math.random()*categories.length)];
        try{
            console.log(`Scrolling: Fetching 6 more videos for category ${randomCategory}...`);
            const newVideos = await FetchData(randomCategory, 25);
            const uniqueVideos = newVideos.filter(video => !displayVideo.has(video.id));
            const videosToRender = uniqueVideos.slice(0,6);
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
            loader.style.display = 'none';
            isFetchingMore = false;
        }
    }
});