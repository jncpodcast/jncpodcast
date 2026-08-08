(() => {
  const root = document.getElementById('podcastPlayer');
  if (!root) return;

  const podcastId = root.dataset.podcastId || '96540907';
  const apiBase = 'https://api.iheart.com/api/v3/podcast';
  const showUrl = 'https://www.iheart.com/podcast/269-jams-n-cocktails-96540907/';
  const audio = document.getElementById('podcastAudio');
  const artwork = document.getElementById('podcastArtwork');
  const title = document.getElementById('podcastTitle');
  const meta = document.getElementById('podcastMeta');
  const description = document.getElementById('podcastDescription');
  const episodeList = document.getElementById('podcastEpisodeList');
  const status = document.getElementById('podcastStatus');
  const playButton = document.getElementById('podcastPlay');
  const rewindButton = document.getElementById('podcastRewind');
  const forwardButton = document.getElementById('podcastForward');
  const muteButton = document.getElementById('podcastMute');
  const speedButton = document.getElementById('podcastSpeed');
  const progress = document.getElementById('podcastProgress');
  const elapsed = document.getElementById('podcastElapsed');
  const remaining = document.getElementById('podcastRemaining');
  const openEpisode = document.getElementById('podcastOpenEpisode');
  const state = { episodes: [], currentIndex: 0, speeds: [1, 1.25, 1.5, 2], speedIndex: 0 };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const whole = Math.floor(seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const secs = whole % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`;
  };
  const formatDate = (timestamp) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp));
  const plainText = (html) => {
    const holder = document.createElement('div');
    holder.innerHTML = html || '';
    return (holder.textContent || '').replace(/\s*LINKS[\s\S]*$/i, '').replace(/\s+/g, ' ').trim();
  };
  const episodeUrl = (episode) => {
    const slug = episode.title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
    return `${showUrl}episode/${slug}-${episode.id}`;
  };

  const updatePlayButton = () => {
    const playing = !audio.paused && !audio.ended;
    playButton.classList.toggle('playing', playing);
    playButton.setAttribute('aria-label', playing ? 'Pause episode' : 'Play episode');
    playButton.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
    root.classList.toggle('is-playing', playing);
  };
  const updateProgress = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : state.episodes[state.currentIndex]?.duration || 0;
    progress.max = Math.max(duration, 1);
    progress.value = Math.min(audio.currentTime || 0, duration || 0);
    elapsed.textContent = formatTime(audio.currentTime);
    remaining.textContent = duration ? `−${formatTime(Math.max(0, duration - audio.currentTime))}` : '−0:00';
    progress.style.setProperty('--listen-progress', `${duration ? (audio.currentTime / duration) * 100 : 0}%`);
  };

  const selectEpisode = (index, play = false) => {
    const episode = state.episodes[index];
    if (!episode?.mediaUrl) return;
    state.currentIndex = index;
    title.textContent = episode.title;
    meta.textContent = `${formatDate(episode.startDate)} · ${formatTime(episode.duration)}${episode.isExplicit ? ' · Explicit' : ''}`;
    description.textContent = episode.summary || 'Press play and join the crew in the legendary JNC Lounge.';
    artwork.src = episode.imageUrl || artwork.dataset.fallback;
    artwork.alt = `${episode.title} episode artwork`;
    openEpisode.href = episodeUrl(episode);
    audio.src = episode.mediaUrl;
    audio.load();
    status.textContent = play ? 'Loading episode…' : 'Ready to play';
    episodeList.querySelectorAll('.podcast-episode').forEach((item, itemIndex) => {
      const selected = itemIndex === index;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-current', selected ? 'true' : 'false');
    });
    updateProgress();
    if (play) audio.play().then(() => { status.textContent = 'Now playing'; }).catch(() => { status.textContent = 'Tap play to begin'; });
  };

  const renderEpisodes = () => {
    episodeList.replaceChildren();
    state.episodes.forEach((episode, index) => {
      const button = document.createElement('button');
      button.className = 'podcast-episode';
      button.type = 'button';
      button.setAttribute('role', 'listitem');
      const img = document.createElement('img');
      img.src = episode.imageUrl || artwork.dataset.fallback;
      img.alt = '';
      img.loading = 'lazy';
      const copy = document.createElement('span');
      copy.className = 'podcast-episode-copy';
      const heading = document.createElement('strong');
      heading.textContent = episode.title;
      const detail = document.createElement('small');
      detail.textContent = `${formatDate(episode.startDate)} · ${formatTime(episode.duration)}`;
      copy.append(heading, detail);
      const icon = document.createElement('span');
      icon.className = 'podcast-episode-play';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '▶';
      button.append(img, copy, icon);
      button.addEventListener('click', () => selectEpisode(index, true));
      episodeList.appendChild(button);
    });
  };

  const loadCatalog = async () => {
    try {
      const listResponse = await fetch(`${apiBase}/podcasts/${podcastId}/episodes?limit=6`);
      if (!listResponse.ok) throw new Error('Episode catalog unavailable');
      const listData = await listResponse.json();
      const details = await Promise.all((listData.data || []).map(async (episode) => {
        try {
          const response = await fetch(`${apiBase}/episodes/${episode.id}`);
          if (!response.ok) throw new Error('Episode unavailable');
          const data = await response.json();
          return { ...episode, ...data.episode, summary: plainText(data.episode?.description || episode.description) };
        } catch {
          return { ...episode, summary: plainText(episode.description) };
        }
      }));
      state.episodes = details.filter((episode) => episode.mediaUrl);
      if (!state.episodes.length) throw new Error('No playable episodes returned');
      renderEpisodes();
      selectEpisode(0, false);
    } catch {
      root.classList.add('has-error');
      status.textContent = 'Player feed unavailable';
      title.textContent = 'The JNC audio feed is taking five.';
      meta.textContent = 'Open iHeart to keep listening';
      description.textContent = 'The episode catalog could not load right now, but the full show is still available on iHeartRadio.';
      episodeList.replaceChildren();
      const fallback = document.createElement('a');
      fallback.className = 'podcast-fallback';
      fallback.href = showUrl;
      fallback.target = '_blank';
      fallback.rel = 'noopener';
      fallback.textContent = "Open Jams 'N' Cocktails on iHeartRadio →";
      episodeList.appendChild(fallback);
    }
  };

  playButton.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) audio.play().catch(() => { status.textContent = 'Tap play to begin'; });
    else audio.pause();
  });
  rewindButton.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 15); });
  forwardButton.addEventListener('click', () => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 30); });
  muteButton.addEventListener('click', () => {
    audio.muted = !audio.muted;
    muteButton.textContent = audio.muted ? 'Muted' : 'Sound';
    muteButton.setAttribute('aria-label', audio.muted ? 'Unmute audio' : 'Mute audio');
  });
  speedButton.addEventListener('click', () => {
    state.speedIndex = (state.speedIndex + 1) % state.speeds.length;
    audio.playbackRate = state.speeds[state.speedIndex];
    speedButton.textContent = `${audio.playbackRate}×`;
  });
  progress.addEventListener('input', () => { audio.currentTime = Number(progress.value); updateProgress(); });
  audio.addEventListener('play', () => { status.textContent = 'Now playing'; updatePlayButton(); });
  audio.addEventListener('pause', updatePlayButton);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('waiting', () => { status.textContent = 'Buffering…'; });
  audio.addEventListener('canplay', () => { if (!audio.paused) status.textContent = 'Now playing'; });
  audio.addEventListener('ended', () => selectEpisode((state.currentIndex + 1) % state.episodes.length, true));
  loadCatalog();
})();
