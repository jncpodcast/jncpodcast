(() => {
  'use strict';

  const config = window.JNC_WEEKLY_CONTENT?.instagram || {};
  const lounge = document.getElementById('instagramLounge');
  const stage = document.getElementById('instagramStage');
  const queue = document.getElementById('instagramTrack');
  const loader = document.getElementById('instagramLoader');
  const embedScript = document.getElementById('instagramEmbedScript');

  if (!lounge || !stage || !queue || !loader) return;

  const fallbackPosts = [
    'https://www.instagram.com/jamsncocktails/reel/DblBs3pCbZg/',
    'https://www.instagram.com/jamsncocktails/reel/DbgSkWDkgEC/',
    'https://www.instagram.com/jamsncocktails/reel/Dbdii9mjOnR/'
  ];

  const normalizePost = (post, index) => {
    const item = typeof post === 'string' ? { url: post } : (post || {});
    return {
      url: item.url || fallbackPosts[index % fallbackPosts.length],
      label: item.label || (index === 0 ? 'Featured reel' : 'On deck'),
      title: item.title || (index === 0 ? 'Fresh from the JNC Lounge' : `Lounge chaos, round ${index + 1}`)
    };
  };

  const sourcePosts = Array.isArray(config.posts) && config.posts.length ? config.posts : fallbackPosts;
  const posts = sourcePosts.map(normalizePost).filter(post => /^https:\/\/(www\.)?instagram\.com\//i.test(post.url));
  if (!posts.length) return;

  const title = document.getElementById('instagramTitle');
  const profileLink = document.getElementById('instagramProfileLink');
  const secondaryProfileLink = document.getElementById('instagramProfileLinkSecondary');
  const openPost = document.getElementById('instagramOpenPost');
  const viewerCount = document.getElementById('instagramViewerCount');
  const handle = document.getElementById('instagramHandle');
  const description = document.getElementById('instagramDescription');
  const previous = document.getElementById('instagramPrev');
  const next = document.getElementById('instagramNext');
  const profileUrl = config.profileUrl || 'https://www.instagram.com/jamsncocktails/';
  let activeIndex = 0;
  let loadTimer;
  let stageObserver;

  if (config.eyebrow) document.getElementById('instagramEyebrow').textContent = config.eyebrow;
  if (title && (config.title || config.accent)) {
    title.replaceChildren(document.createTextNode(`${config.title || ''} `));
    const accent = document.createElement('span');
    accent.className = 'yellow';
    accent.textContent = config.accent || '';
    title.appendChild(accent);
  }
  if (config.description) description.textContent = config.description;
  if (config.handle) handle.textContent = config.handle;
  [profileLink, secondaryProfileLink].forEach(link => {
    if (!link) return;
    link.href = profileUrl;
  });
  if (profileLink) profileLink.textContent = config.profileButtonLabel || 'Follow @jamsncocktails';

  const makeQueueItem = (post, index) => {
    const button = document.createElement('button');
    button.className = 'social-queue-item';
    button.type = 'button';
    button.dataset.instagramIndex = String(index);
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-label', `Play ${post.title}`);

    const number = document.createElement('span');
    number.className = 'social-queue-number';
    number.textContent = String(index + 1).padStart(2, '0');

    const copy = document.createElement('span');
    copy.className = 'social-queue-copy';
    const label = document.createElement('small');
    label.textContent = post.label;
    const itemTitle = document.createElement('strong');
    itemTitle.textContent = post.title;
    copy.append(label, itemTitle);

    const play = document.createElement('span');
    play.className = 'social-queue-play';
    play.setAttribute('aria-hidden', 'true');
    play.textContent = '▶';

    button.append(number, copy, play);
    button.addEventListener('click', () => showPost(index));
    return button;
  };

  const hideLoaderWhenReady = () => {
    clearTimeout(loadTimer);
    stageObserver?.disconnect();
    stageObserver = new MutationObserver(() => {
      if (stage.querySelector('iframe') || stage.querySelector('.instagram-media-rendered')) {
        window.setTimeout(() => loader.classList.add('hidden'), 350);
        stageObserver.disconnect();
      }
    });
    stageObserver.observe(stage, { childList: true, subtree: true, attributes: true });
    loadTimer = window.setTimeout(() => loader.classList.add('hidden'), 4500);
  };

  const processEmbed = () => {
    hideLoaderWhenReady();
    if (window.instgrm?.Embeds) {
      window.instgrm.Embeds.process();
    } else if (embedScript) {
      embedScript.addEventListener('load', () => window.instgrm?.Embeds.process(), { once: true });
    }
  };

  function showPost(index, scrollQueue = true) {
    activeIndex = (index + posts.length) % posts.length;
    const post = posts[activeIndex];
    const embed = document.createElement('blockquote');
    embed.className = 'instagram-media';
    embed.setAttribute('data-instgrm-permalink', post.url);
    embed.setAttribute('data-instgrm-version', '14');

    loader.classList.remove('hidden');
    stage.replaceChildren(loader, embed);
    viewerCount.textContent = `Reel ${String(activeIndex + 1).padStart(2, '0')} / ${String(posts.length).padStart(2, '0')}`;
    openPost.href = post.url;

    [...queue.children].forEach((item, itemIndex) => {
      const isActive = itemIndex === activeIndex;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
      if (isActive && scrollQueue) item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });

    processEmbed();
  }

  queue.replaceChildren(...posts.map(makeQueueItem));
  previous?.addEventListener('click', () => showPost(activeIndex - 1));
  next?.addEventListener('click', () => showPost(activeIndex + 1));
  lounge.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showPost(activeIndex - 1);
    if (event.key === 'ArrowRight') showPost(activeIndex + 1);
  });

  showPost(0, false);
})();
