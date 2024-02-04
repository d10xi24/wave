const cover = document.getElementById('cover');
const disc = document.getElementById('disc');
const title = document.getElementById('title');
const artist = document.getElementById('artist');
const progressContainer = document.getElementById('progress-container');
const progress = document.getElementById('progress');
const timer = document.getElementById('timer');
const duration = document.getElementById('duration');
const prev = document.getElementById('prev');
const play = document.getElementById('play');
const next = document.getElementById('next');
const playlistContainer = document.getElementById('playlist-container');
const playlist = document.getElementById('playlist');
const shuffleBtn = document.getElementById('shuffle');
const repeatBtn = document.getElementById('repeat');
const searchInput = document.getElementById('search');
const audioElement = document.getElementById('disc');

disc.addEventListener('play', updatePlayPauseIcon);
disc.addEventListener('pause', updatePlayPauseIcon);
disc.addEventListener('timeupdate', updateProgress);
disc.addEventListener('ended', handleRepeatLogic);

play.addEventListener('click', playPauseMedia);
next.addEventListener('click', gotoNextSong.bind(null, false));
prev.addEventListener('click', gotoPreviousSong);
progressContainer.addEventListener('mousedown', progressSlider);
repeatBtn.addEventListener('click', toggleRepeat);

let songIndex = 0;
let songs = [];
let isSongLoading = false;
let repeatMode = 'off';

window.addEventListener('DOMContentLoaded', async function () {
    try {
        const lastPlayedSong = JSON.parse(localStorage.getItem('Loadlastplay'));
        const playlistData = JSON.parse(localStorage.getItem('playlistData'));
        
        const response = await fetch('/songs');
        const dataText = await response.text();

        let data;
        try {
            data = JSON.parse(dataText);
        } catch (jsonError) {
            console.error('Error parsing playlist data:', jsonError);
            return;
        }

        if (!data || data.error) {
            console.error('Error loading playlist data:', data.error);
            console.log(data.stack);
            return;
        }

        songs = Array.isArray(data.songs) ? data.songs.filter(song => song.filename.endsWith('.mp3') || song.filename.endsWith('.aac')) : [];
        songIndex = playlistData.songIndex || 0;
        

        displayPlaylist();

        if (lastPlayedSong) {
            loadSong(lastPlayedSong);
            playPauseMedia();
        } else {
            if (songs.length > 0) {
                document.getElementById('playlist').style.display = 'block';
                loadSong(songs[songIndex]);
                getMetadata(songs[songIndex].filename);
            }
        }
        displayPlaylist();
    } catch (error) {
        console.error('Error loading playlist data:', error);
    }
});

function handleMetadata(song, metadata) {
    console.log('Metadata for the song:', metadata);
    disc.src = `/static/music/${song.filename}`;
    title.textContent = song.title;
    artist.textContent = song.artist;

    resetProgress();
    isSongLoading = false;
}

async function loadSong(song) {
    if (!isSongLoading) {
        isSongLoading = true;

        try {
            const response = await fetch(`/metadata?filename=${encodeURIComponent(song.filename)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const metadata = await response.json();
            handleMetadata(song, metadata);
            resetProgress();

        } catch (error) {
            console.error("Error fetching metadata:", error);
            handleMetadata(song, { album_art: null });
        } finally {
            isSongLoading = false;
        }
    }
}

async function loadPlaylist() {
    try {
        const response = await fetch('/load_playlist');
        console.log("Loading playlist...");

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const rawText = await response.text();
        let data;

        try {
            data = JSON.parse(rawText);
        } catch (jsonError) {
            console.error('Error parsing playlist data:', jsonError);
            return;  
        }

        songs = Array.isArray(data.songs) ? data.songs : [];
        songIndex = data.songIndex || 0;

        displayPlaylist();
    } catch (error) {
        console.error('Error loading playlist:', error);
    }
}
loadPlaylist();

// Display the playlist
function displayPlaylist() {
    console.log('Displaying playlist. Songs:', songs);
    const tableBody = document.getElementById('playlist');

    if (songs === undefined) {
        console.error('Error: Playlist data is undefined.');
        return;
    }

    tableBody.innerHTML = "";

    for (let i = 0; i < songs.length; i++) {
        displaySongInTable(i + 1, songs[i]);
    }
}

displayPlaylist();
// Function to update the playlist
function updatePlaylist() {
    playlist.innerHTML = "";

    songs.forEach((song, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${song.title} - ${song.artist}`;
        listItem.onclick = () => playSong(index);
        playlist.appendChild(listItem);
    });
}

disc.addEventListener('ended', () => {
    playNextSong();
});

updatePlaylist()

// Toggle play and pause
function playPauseMedia() {
    if (disc.paused) {
        disc.play();
    } else {
        disc.pause();
    }
}

// Update icon
function updatePlayPauseIcon() {
    if (disc.paused) {
        play.classList.remove('fa-pause');
        play.classList.add('fa-play');
    } else {
        play.classList.remove('fa-play');
        play.classList.add('fa-pause');
    }
}

// Update progress bar with current and remaining time
function updateProgress() {
    const currentTime = disc.currentTime;
    const totalDuration = disc.duration;

    // Calculate current time
    const currentMinutes = Math.floor(currentTime / 60);
    const currentSeconds = Math.floor(currentTime % 60);

    // Calculate remaining time
    const remainingTime = totalDuration - currentTime;
    const remainingMinutes = Math.floor(remainingTime / 60);
    const remainingSeconds = Math.floor(remainingTime % 60);

    // Display both current and remaining time
    timer.textContent = `${currentMinutes}:${currentSeconds < 10 ? '0' : ''}${currentSeconds}`;
    duration.textContent = `-${remainingMinutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;

    // Update progress bar
    progress.style.width = (currentTime / totalDuration) * 100 + '%';
}

// Reset the progress
function resetProgress() {
    progress.style.width = 0 + '%';
    timer.textContent = '0:00';
}

// Function to play the next song
async function playNextSong() {
    if (isShuffle) {
        shufflePlaylist();
    }
    if (songIndex < songs.length - 1) {
        songIndex++;
    } else {
        songIndex = 0;
    }

    await loadSong(songs[songIndex]);

    resetProgress();
    console.log('Paused before play:', disc.paused);
    disc.play();
    console.log('Playing after play:', !disc.paused);
}

disc.addEventListener('ended', playNextSong);

function toggleSearchBox() {
    var searchContainer = document.getElementById('search-container');
    searchContainer.classList.toggle('show');
}

// Search functionality
function searchSong() {
    const searchTerm = searchInput.value.toLowerCase();

    songs.forEach((song, index) => {
        const listItem = playlist.children[index];
        const songDetails = `${song.title} - ${song.artist}`.toLowerCase();

        if (songDetails.includes(searchTerm)) {
            listItem.style.display = 'block';
        } else {
            listItem.style.display = 'none';
        }
    });
}

// Go to previous song
function gotoPreviousSong() {
    if (songIndex === 0) {
        songIndex = songs.length - 1;
    } else {
        songIndex = songIndex - 1;
    }

    const isDiscPlayingNow = !disc.paused;
    loadSong(songs[songIndex]);
    resetProgress();
    if (isDiscPlayingNow) {
        playPauseMedia();
    }
}

// Go to next song
function gotoNextSong(playImmediately) {
    if (songIndex === songs.length - 1) {
        songIndex = 0;
    } else {
        songIndex = songIndex + 1;
    }

    const isDiscPlayingNow = !disc.paused;
    loadSong(songs[songIndex]);
    resetProgress();
    if (isDiscPlayingNow || playImmediately) {
        playPauseMedia();
    }
}

disc.addEventListener('ended', () => {
    playNextSong();
});

// Function to play the next song
async function playNextSong() {
    if (isShuffle) {
        shufflePlaylist();
    }
    if (songIndex < songs.length - 1) {
        songIndex++;
    } else {
        songIndex = 0;
    }
    await loadSong(songs[songIndex]);
    resetProgress();
    playPauseMedia();
}
disc.addEventListener('ended', gotoNextSong.bind(null, true));

// Toggle shuffle mode
let isShuffle = false;
shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
});

// Function to shuffle the playlist
function shufflePlaylist() {
    for (let i = songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songs[i], songs[j]] = [songs[j], songs[i]];
    }

    updatePlaylist();
}

// Function to toggle repeat mode
function toggleRepeat() {
    if (repeatMode === 'off') {
        repeatMode = 'all';
    } else if (repeatMode === 'all') {
        repeatMode = 'single';
    } else {
        repeatMode = 'off';
    }
    updateRepeatButton();
}

// Function to update the appearance of the repeat button
function updateRepeatButton() {
    repeatBtn.classList.remove('active', 'all', 'single');

    if (repeatMode === 'off') {
    } else if (repeatMode === 'single') {
        repeatBtn.classList.add('active', 'single');
    } else {
        repeatBtn.classList.add('active', 'all');
    }
}

// Function to handle the repeat logic when a song ends
async function handleRepeatLogic() {
    if (repeatMode === 'off') {
        playNextSong();
    } else if (repeatMode === 'single') {
        playSameSong();
    } else {
        playNextSong();
    }
}

function playSameSong() {
    loadSong(songs[songIndex]);  
    resetProgress();
    disc.pause();

    if (disc.paused) {
        disc.play();
    }
}

// Change song progress when clicked on progress bar
function setProgress(ev) {
    const totalWidth = this.clientWidth;
    const clickWidth = ev.offsetX;
    const clickWidthRatio = clickWidth / totalWidth;
    disc.currentTime = clickWidthRatio * disc.duration;
}

// Navigate song slider
function progressSlider(ev) {
    var is_playing = !disc.paused
    if (is_playing)
        disc.pause()
    const totalWidth = this.clientWidth;
    const clickWidth = ev.offsetX;
    const clickWidthRatio = clickWidth / totalWidth;
    disc.currentTime = clickWidthRatio * disc.duration;
    if (is_playing)
        disc.play()
    document.addEventListener('mousemove', slideMoving);
    document.addEventListener('mouseup', function() {
        if (is_playing)
            disc.play()
        document.removeEventListener('mousemove', slideMoving);
    });

}

function displaySongInTable(songIndex, song) {
    const tableBody = document.getElementById('playlist');

    const newRow = tableBody.insertRow();
    
    const songNumberCell = newRow.insertCell(0);
    songNumberCell.textContent = songIndex;
    
    const songNameCell = newRow.insertCell(1);
    songNameCell.textContent = song.title;
    
    const artistCell = newRow.insertCell(2);
    artistCell.textContent = song.artist;
}

function playSong(index) {
    if (index >= 0 && index < songs.length) {
        songIndex = index;
        loadSong(selectedSong);
        resetProgress();
        disc.play();
    } else {
        console.error('Invalid index provided for playSong function.');
    }
}


function togglePlaylist() {
    const playlistContainer = document.getElementById('playlist-container');
    playlistContainer.classList.toggle('hidden');
}
document.getElementById('menu-icon').addEventListener('click', togglePlaylist);
  