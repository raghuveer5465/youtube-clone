# 📺 MyTube: Advanced JAMstack YouTube Clone

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![YouTube API](https://img.shields.io/badge/YouTube_API-FF0000?style=for-the-badge&logo=youtube&logoColor=white)

A high-performance, client-side dynamic Single Page Application (SPA) built to replicate the core experience of YouTube. This project focuses on professional UI/UX, mobile-first design, and native-app functionality using modern web capabilities.

🌍 **[View Live Demo Here](https://raghuveer5465.github.io/youtube-clone/)**

---

## ✨ What You Can Do (Key Features)

*   📱 **Install as an App (PWA):** Fully installable on Android, iOS, and Desktop via Chrome. Includes a custom Service Worker for aggressive caching and fast load times.
*   🎬 **Watch Videos In-App:** Click any video card to launch a custom cinematic modal with an embedded YouTube iframe player.
*   👆 **Custom Touch Gestures:** Mimics native mobile apps—**long-press** (800ms) any video card to instantly subscribe to the creator.
*   ♾️ **Infinite Scrolling:** Effortlessly scroll to load more content. Uses intelligent API batching to load up to 60 unique videos per session.
*   🦴 **Skeleton Loaders:** Modern pulsing placeholder cards eliminate visual friction while data is fetched.
*   💾 **Persistent State:** Your search history and custom channel subscriptions are saved locally to your device via `localStorage`.

---

## 🏗️ System Architecture & Data Flow

MyTube operates on a **JAMstack** architecture (JavaScript, APIs, and Markup). There is no backend server; all logic, state management, and API routing are handled dynamically in the client's browser.

```mermaid
graph TD
    %% Core Architecture
    Client([User Browser]) <-->|Scrolls, Clicks & Long-Presses| UI[DOM Interface]
    UI <-->|Fetches Videos & Channel Logos| API((YouTube Data API v3))
    
    %% Storage
    UI <-->|Saves Subs & Search History| LS[(Local Storage)]
    
    %% PWA Features
    SW{Service Worker} -.->|Intercepts Network Requests| Client
    SW <-->|Caches Assets for Offline Use| Static[HTML/CSS/JS Assets]
    
    %% Styling
    classDef default fill:#f4f4f4,stroke:#333,stroke-width:2px,color:#000;
    classDef api fill:#f9f,stroke:#333,stroke-width:2px,color:#000;
    classDef storage fill:#ff9,stroke:#333,stroke-width:2px,color:#000;
    class API api;
    class LS storage;
