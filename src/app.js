import { renderMarkdown } from './markdown.js';

const appEl = document.getElementById('app');
const loadingTemplate = document.getElementById('loading-template');
const errorTemplate = document.getElementById('error-template');

const STORAGE_KEY = 'language-learning-progress-v1';
const LANGUAGE_COOKIE = 'language-preference';
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const partOfSpeechMap = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'interj.',
  determiner: 'det.',
  article: 'art.',
  phrase: 'phr.',
  'verb phrase': 'v. phr.',
  'phrasal verb': 'phr. v.',
  expression: 'expr.',
  idiom: 'idiom',
};

const speechLanguageMap = {
  en: 'en-US',
  'zh-hans': 'zh-CN',
};

function formatPartOfSpeech(value = '') {
  const key = value.trim().toLowerCase();
  return partOfSpeechMap[key] || value;
}

function getLessonButtonLabel(status) {
  return status === 'đang học' ? 'Đang học' : 'Học tiếp';
}

const state = {
  data: null,
  index: null,
  flatLessons: [],
  current: null,
  language: null,
};

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Không thể tải ${path}`);
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Không thể tải ${path}`);
  return response.text();
}

function getCookie(name) {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((value, entry) => {
      if (entry.startsWith(`${name}=`)) {
        return decodeURIComponent(entry.slice(name.length + 1));
      }
      return value;
    }, '');
}

function setLanguageCookie(value) {
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${LANGUAGE_COOKIE_MAX_AGE}`;
}

function getLanguageFromCookie() {
  return getCookie(LANGUAGE_COOKIE);
}

function getCurrentLanguageKey() {
  return state.language || state.data?.defaultLanguage || 'en';
}

function renderLoading() {
  if (!loadingTemplate) return;
  appEl.innerHTML = loadingTemplate.innerHTML;
}

function renderError(message) {
  appEl.innerHTML = errorTemplate.innerHTML;
  const p = appEl.querySelector('.error p');
  if (p) {
    p.textContent = message;
  }
}

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    console.warn('Không thể đọc tiến trình', error);
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function updateProgress(category, lessonId, status) {
  const progress = getProgress();
  const languageKey = getCurrentLanguageKey();
  if (!progress[languageKey]) progress[languageKey] = {};
  if (!progress[languageKey][category]) progress[languageKey][category] = {};
  progress[languageKey][category][lessonId] = status;
  saveProgress(progress);
}

function getLessonStatus(category, lessonId) {
  const progress = getProgress();
  const languageKey = getCurrentLanguageKey();
  const status = progress?.[languageKey]?.[category]?.[lessonId] || '';
  return status === 'chưa học' ? '' : status;
}

function buildFlatLessons() {
  if (!state.index) {
    state.flatLessons = [];
    return;
  }
  const categories = state.index.order || Object.keys(state.index.categories || {});
  const flat = [];
  categories.forEach((categoryKey) => {
    const lessons = state.index.categories[categoryKey] || [];
    lessons.forEach((lesson, lessonIndex) => {
      flat.push({
        category: categoryKey,
        lesson,
        lessonIndex,
      });
    });
  });
  state.flatLessons = flat;
}

function renderBreadcrumb(items = []) {
  if (!items.length) return '';
  const segments = items
    .map((item, index) => {
      if (item.href && index !== items.length - 1) {
        return `<a href="${item.href}">${item.label}</a>`;
      }
      return `<span>${item.label}</span>`;
    })
    .join('<span>/</span>');
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${segments}</nav>`;
}

function getLanguageLabel(languageKey) {
  const language = state.data?.languages?.[languageKey];
  return language?.label || languageKey;
}

function renderLanguageSubtitle() {
  if (!state.language) return '';
  const label = getLanguageLabel(state.language);
  return `<p class="subtitle">Đang học: ${escapeHtml(label)}</p>`;
}

function renderLanguageSelector() {
  const languages = state.data?.languages || {};
  const entries = Object.entries(languages);
  if (entries.length <= 1) return '';
  const options = entries
    .map(([code, config]) => {
      const selected = state.language === code ? ' selected' : '';
      return `<option value="${escapeHtml(code)}"${selected}>${escapeHtml(config.label || code)}</option>`;
    })
    .join('');
  return `
    <div class="language-selector">
      <label for="language-select">Ngôn ngữ</label>
      <select id="language-select">${options}</select>
    </div>
  `;
}

function renderHeader(title, extras = '') {
  const subtitle = renderLanguageSubtitle();
  const languageSelector = renderLanguageSelector();
  const actions = [languageSelector, extras].filter(Boolean).join('');
  const actionsBlock = actions ? `<div class="header-actions">${actions}</div>` : '';
  return `
    <header>
      <div>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle}
      </div>
      ${actionsBlock}
    </header>
  `;
}

function attachLanguageSelector() {
  const select = appEl.querySelector('#language-select');
  if (!select) return;
  select.addEventListener('change', (event) => {
    const value = event.target.value;
    setLanguage(value);
  });
}

function setLanguage(language, options = {}) {
  const languages = state.data?.languages || {};
  if (!languages[language]) return;
  const hasChanged = state.language !== language;
  state.language = language;
  state.index = languages[language];
  buildFlatLessons();
  setLanguageCookie(language);
  if (!options.skipRoute && hasChanged) {
    handleRoute();
  }
}

function renderTOC() {
  if (!state.index?.categories) {
    renderError('Không tìm thấy nội dung cho ngôn ngữ đã chọn.');
    return;
  }
  const categories = state.index.order || Object.keys(state.index.categories);
  const categoryBlocks = categories
    .map((categoryKey) => {
      const lessons = state.index.categories[categoryKey] || [];
      if (!lessons.length) return '';
      const gridClass = lessons.length > 6 ? 'card-grid scrollable' : 'card-grid';
      const cards = lessons
        .map((lesson) => {
          const status = getLessonStatus(categoryKey, lesson.id);
          const badge = status === 'hoàn thành' ? '<span class="status">Hoàn thành</span>' : '';
          const buttonLabel = getLessonButtonLabel(status);
          return `
            <article class="card">
              ${badge ? badge : ''}
              <h3>${lesson.title}</h3>
              <p>${lesson.description || ''}</p>
              <div class="lesson-controls">
                <a class="button" href="#/lesson/${categoryKey}/${lesson.id}">${buttonLabel}</a>
              </div>
            </article>
          `;
        })
        .join('');
      const label = state.index.labels?.[categoryKey] || categoryKey;
      return `
        <section>
          <div class="layout-header">
            <h2><a class="category-link" href="#/category/${categoryKey}">${label}</a></h2>
            <span>${lessons.length} bài học</span>
          </div>
          <div class="${gridClass}">${cards}</div>
        </section>
      `;
    })
    .join('');

  appEl.innerHTML = `
    ${renderHeader('Ứng dụng học ngoại ngữ')}
    ${renderBreadcrumb([{ label: 'Mục lục' }])}
    ${categoryBlocks || '<div class="empty"><p>Chưa có bài học nào.</p></div>'}
  `;

  attachLanguageSelector();
}

function renderNavigation(category, lessonId) {
  const currentIndex = state.flatLessons.findIndex(
    (entry) => entry.category === category && entry.lesson.id === lessonId,
  );
  const prev = state.flatLessons[currentIndex - 1];
  const next = state.flatLessons[currentIndex + 1];
  return `
    <div class="lesson-controls nav-controls">
      <a class="button secondary" href="${prev ? `#/lesson/${prev.category}/${prev.lesson.id}` : '#/'}" ${
        prev ? '' : 'aria-disabled="true" style="pointer-events:none; opacity:0.6;"'
      }>Prev</a>
      <button class="button" data-action="complete">Hoàn thành</button>
      <a class="button" href="${next ? `#/lesson/${next.category}/${next.lesson.id}` : '#/'}" ${
        next ? '' : 'aria-disabled="true" style="pointer-events:none; opacity:0.6;"'
      }>Next</a>
    </div>
  `;
}

function renderVocabularyLayout(category, lesson, data, markdown) {
  const tableRows = data
    .map(
      (item) => `
      <tr>
        <td>${item.word}</td>
        <td>${formatPartOfSpeech(item.partOfSpeech)}</td>
        <td>${item.ipa}</td>
        <td>${item.meaning}</td>
        <td><button class="button secondary" data-say="${encodeURIComponent(item.word)}">Đọc</button></td>
      </tr>
    `,
    )
    .join('');

  return `
    <section>
      <div class="layout-header">
        <h2>${lesson.title}</h2>
      </div>
      <p>${lesson.description || ''}</p>
      <div class="table-scroll">
        <table class="vocabulary">
          <colgroup>
            <col class="col-word" />
            <col class="col-pos" />
            <col class="col-ipa" />
            <col class="col-meaning" />
            <col class="col-audio" />
          </colgroup>
          <thead>
            <tr>
              <th>Từ vựng</th>
              <th>Từ loại</th>
              <th>IPA</th>
              <th>Nghĩa</th>
              <th>Phát âm</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${markdown ? `<div class="markdown">${renderMarkdown(markdown)}</div>` : ''}
      ${renderNavigation(category, lesson.id)}
    </section>
  `;
}

function renderGrammarLayout(category, lesson, markdown) {
  return `
    <section>
      <div class="layout-header">
        <h2>${lesson.title}</h2>
      </div>
      <p>${lesson.description || ''}</p>
      <div class="markdown grammar">${renderMarkdown(markdown)}</div>
      ${renderNavigation(category, lesson.id)}
    </section>
  `;
}

function renderReadingLayout(category, lesson, markdown) {
  return `
    <section>
      <div class="layout-header">
        <h2>${lesson.title}</h2>
      </div>
      <p>${lesson.description || ''}</p>
      <div class="markdown reading">${renderMarkdown(markdown)}</div>
      ${renderNavigation(category, lesson.id)}
    </section>
  `;
}

function renderQuizLayout(category, lesson, questions) {
  const questionHtml = questions
    .map(
      (question, index) => `
        <div class="quiz-question" data-question-index="${index}">
          <h3>Câu ${index + 1}: ${question.prompt}</h3>
          <div class="quiz-options">
            ${question.options
              .map(
                (option, optionIndex) => `
                  <label>
                    <input type="radio" name="q-${index}" value="${optionIndex}" />
                    <span>${option}</span>
                  </label>
                `,
              )
              .join('')}
          </div>
        </div>
      `,
    )
    .join('');

  return `
    <section>
      <div class="layout-header">
        <h2>${lesson.title}</h2>
      </div>
      <p>${lesson.description || ''}</p>
      <form class="quiz-form">
        ${questionHtml}
        <div class="lesson-controls">
          <button class="button" type="submit">Nộp bài</button>
        </div>
        <div class="quiz-result" hidden></div>
      </form>
      ${renderNavigation(category, lesson.id)}
    </section>
  `;
}

async function renderLesson(category, lessonId) {
  if (!state.index?.categories) {
    renderError('Không tìm thấy nội dung cho ngôn ngữ đã chọn.');
    return;
  }
  const lessons = state.index.categories[category];
  if (!lessons) {
    renderError('Không tìm thấy loại bài học.');
    return;
  }
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    renderError('Không tìm thấy bài học.');
    return;
  }
  updateProgress(category, lessonId, 'đang học');
  state.current = { category, lesson };

  renderLoading();

  try {
    let html = '';
    if (category === 'vocabulary') {
      const [vocabData, markdown] = await Promise.all([
        fetchJSON(lesson.source),
        lesson.markdown ? fetchText(lesson.markdown) : Promise.resolve(''),
      ]);
      html = renderVocabularyLayout(category, lesson, vocabData.words || [], markdown);
    } else if (category === 'grammar') {
      const markdown = await fetchText(lesson.markdown);
      html = renderGrammarLayout(category, lesson, markdown);
    } else if (category === 'reading') {
      const markdown = await fetchText(lesson.markdown);
      html = renderReadingLayout(category, lesson, markdown);
    } else if (category === 'quiz') {
      const quiz = await fetchJSON(lesson.source);
      html = renderQuizLayout(category, lesson, quiz.questions || []);
    }

    appEl.innerHTML = `
      ${renderHeader('Ứng dụng học ngoại ngữ')}
      ${renderBreadcrumb([
        { label: 'Mục lục', href: '#/' },
        { label: state.index.labels?.[category] || category, href: `#/category/${category}` },
        { label: lesson.title },
      ])}
      ${html}
    `;

    attachLanguageSelector();
    attachLessonInteractions(category, lesson);
  } catch (error) {
    console.error(error);
    renderError(error.message);
  }
}

function attachLessonInteractions(category, lesson) {
  const container = appEl.querySelector('section');
  if (!container) return;

  const completeButton = container.querySelector('button[data-action="complete"]');
  if (completeButton) {
    completeButton.addEventListener('click', () => {
      updateProgress(category, lesson.id, 'hoàn thành');
      alert('Đã đánh dấu hoàn thành!');
      renderLesson(category, lesson.id);
    });
  }

  if (category === 'vocabulary') {
    container.querySelectorAll('button[data-say]').forEach((button) => {
      button.addEventListener('click', () => {
        const text = decodeURIComponent(button.getAttribute('data-say'));
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          const speechLang = speechLanguageMap[state.language] || 'en-US';
          utterance.lang = speechLang;
          window.speechSynthesis.speak(utterance);
        } else {
          alert('Trình duyệt không hỗ trợ đọc to.');
        }
      });
    });
  }

  if (category === 'grammar') {
    container.querySelectorAll('.grammar-callout').forEach((callout) => {
      const button = callout.querySelector('.note-toggle');
      if (button) {
        button.addEventListener('click', () => {
          const expanded = callout.classList.toggle('open');
          button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
      }
    });
  }

  if (category === 'quiz') {
    const form = container.querySelector('.quiz-form');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const quiz = lesson.source;
        gradeQuiz(form, lesson);
      });
    }
  }
}

async function gradeQuiz(form, lesson) {
  const quiz = await fetchJSON(lesson.source);
  const answers = new FormData(form);
  const results = quiz.questions.map((question, index) => {
    const selected = answers.get(`q-${index}`);
    return Number(selected);
  });
  let correct = 0;
  quiz.questions.forEach((question, index) => {
    if (results[index] === question.answer) {
      correct += 1;
    }
  });
  const resultBox = form.querySelector('.quiz-result');
  if (resultBox) {
    resultBox.hidden = false;
    resultBox.innerHTML = `<strong>Kết quả:</strong> ${correct}/${quiz.questions.length} câu đúng.`;
  }
  updateProgress('quiz', lesson.id, 'hoàn thành');
}

function handleRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash || hash === '/') {
    renderTOC();
    return;
  }

  const lessonMatch = hash.match(/^\/lesson\/([\w-]+)\/([\w-]+)/);
  if (lessonMatch) {
    const [, category, lessonId] = lessonMatch;
    if (!state.index?.categories?.[category]) {
      window.location.hash = '#/';
      return;
    }
    renderLesson(category, lessonId);
    return;
  }

  const categoryMatch = hash.match(/^\/category\/([\w-]+)/);
  if (categoryMatch) {
    const [, category] = categoryMatch;
    if (!state.index?.categories?.[category]) {
      window.location.hash = '#/';
      return;
    }
    renderCategoryOverview(category);
    return;
  }

  renderError('Đường dẫn không hợp lệ.');
}

function renderCategoryOverview(category) {
  if (!state.index?.categories) {
    renderError('Không tìm thấy nội dung cho ngôn ngữ đã chọn.');
    return;
  }
  const lessons = state.index.categories[category];
  if (!lessons) {
    renderError('Không tìm thấy loại bài học.');
    return;
  }
  const gridClass = 'card-grid vertical';
  const cards = lessons
    .map((lesson) => {
      const status = getLessonStatus(category, lesson.id);
      const badge = status === 'hoàn thành' ? '<span class="status">Hoàn thành</span>' : '';
      const buttonLabel = getLessonButtonLabel(status);
      return `
        <article class="card">
          ${badge ? badge : ''}
          <h3>${lesson.title}</h3>
          <p>${lesson.description || ''}</p>
          <div class="lesson-controls">
            <a class="button" href="#/lesson/${category}/${lesson.id}">${buttonLabel}</a>
          </div>
        </article>
      `;
    })
    .join('');

  appEl.innerHTML = `
    ${renderHeader('Ứng dụng học ngoại ngữ')}
    ${renderBreadcrumb([
      { label: 'Mục lục', href: '#/' },
      { label: state.index.labels?.[category] || category },
    ])}
    <section>
      <div class="${gridClass}">${cards}</div>
    </section>
  `;

  attachLanguageSelector();
}

async function init() {
  renderLoading();
  try {
    state.data = await fetchJSON('content/index.json');
    const languages = state.data.languages || {};
    const fromCookie = getLanguageFromCookie();
    const initialLanguage = languages[fromCookie]
      ? fromCookie
      : state.data.defaultLanguage || Object.keys(languages)[0];
    if (initialLanguage) {
      setLanguage(initialLanguage, { skipRoute: true });
    }
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  } catch (error) {
    console.error(error);
    renderError('Không thể tải mục lục.');
  }
}

init();
