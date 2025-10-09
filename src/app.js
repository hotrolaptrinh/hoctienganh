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

function normalizeVocabularyValue(value = '') {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function getLessonButtonLabel(status) {
  if (status === 'hoàn thành') return 'Hoàn thành';
  if (status === 'đang học') return 'Đang học';
  return 'Bắt đầu';
}

function getButtonClassForStatus(status) {
  // status can be '', 'đang học', 'hoàn thành'
  if (!status) return 'status-start';
  if (status === 'đang học') return 'status-inprogress';
  if (status === 'hoàn thành') return 'status-complete';
  return 'status-start';
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
      <select id="language-select">${options}</select>
    </div>
  `;
}

function renderHeader(title, extras = '') {
  const languageSelector = renderLanguageSelector();
  const actions = [languageSelector, extras].filter(Boolean).join('');
  const actionsBlock = actions ? `<div class="header-actions">${actions}</div>` : '';
  return `
    <header>
      <div>
        <h1><a href="#/" class="text-secondary">${escapeHtml(title)}</a></h1>
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
          const btnClass = getButtonClassForStatus(status);
          return `
            <article class="card">
              <h3>${lesson.title}</h3>
              <p>${lesson.description || ''}</p>
              <div class="lesson-controls">
                <a class="button ${btnClass}" href="#/lesson/${categoryKey}/${lesson.id}">${status === 'hoàn thành' ? 'Hoàn thành' : (status === 'đang học' ? 'Đang học' : 'Bắt đầu')}</a>
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
    ${renderHeader('LinguaBox')}
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
  const status = getLessonStatus(category, lessonId);
  const centerClass = getButtonClassForStatus(status);
  // center button is an action: if lesson is completed, show "Chưa hoàn thành" to allow unmarking;
  // otherwise show "Hoàn thành" to mark it complete.
  const centerLabel = status === 'hoàn thành' ? 'Chưa hoàn thành' : 'Hoàn thành';
  return `
    <div class="lesson-controls nav-controls">
      <a class="button secondary" href="${prev ? `#/lesson/${prev.category}/${prev.lesson.id}` : '#/'}" ${
        prev ? '' : 'aria-disabled="true" style="pointer-events:none; opacity:0.6;"'
      }>Prev</a>
      <button class="button ${centerClass}" data-action="complete">${centerLabel}</button>
      <a class="button" href="${next ? `#/lesson/${next.category}/${next.lesson.id}` : '#/'}" ${
        next ? '' : 'aria-disabled="true" style="pointer-events:none; opacity:0.6;"'
      }>Next</a>
    </div>
  `;
}

function renderVocabularyLayout(category, lesson, data, markdown) {
  const tableRows = data
    .map(
      (item, index) => {
        const rawWord = item.word || '';
        const word = escapeHtml(rawWord);
        const encodedAnswer = encodeURIComponent(rawWord);
        const partOfSpeech = escapeHtml(formatPartOfSpeech(item.partOfSpeech));
        const ipa = escapeHtml(item.ipa || '');
        const meaning = escapeHtml(item.meaning || '');
        const inputId = `practice-word-${lesson.id}-${index}`;
        return `
      <tr>
        <td class="word-cell" data-answer="${encodedAnswer}">
          <span class="word-display">${word}</span>
          <label class="sr-only" for="${inputId}">Nhập từ vựng</label>
          <input
            class="word-input"
            id="${inputId}"
            type="text"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            hidden
          />
        </td>
        <td>${partOfSpeech}</td>
        <td><a data-say="${encodeURIComponent(item.word)}" href="javascript:void(0)">${ipa}</a></td>
        <td>${meaning}</td>
      </tr>
    `;
      },
    )
    .join('');

  return `
    <section>
      <div class="layout-header">
        <h2>${lesson.title}</h2>
      </div>
      <p>${lesson.description || ''}</p>
      <div class="practice-controls">
        <label class="practice-switch">
          <input type="checkbox" id="practice-toggle" />
          <span>Luyện tập nhập từ vựng</span>
        </label>
        <button class="button" type="button" data-action="check-answers">Kiểm tra</button>
      </div>
      <div class="table-scroll">
        <table class="vocabulary">
          <colgroup>
            <col class="col-word" />
            <col class="col-pos" />
            <col class="col-ipa" />
          <col class="col-meaning" />
          </colgroup>
          <thead>
            <tr>
              <th>Word</th>
              <th>Pos</th>
              <th>IPA</th>
              <th>Nghĩa</th>
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

function renderReadingLayout(category, lesson, readingData) {
  const sentences = readingData?.sentences || [];
  const questions = readingData?.questions || [];
  const hasSentences = sentences.length > 0;

  const sentenceItems = sentences
    .map(
      (sentence) => `
        <li class="reading-line">
          <p class="reading-sentence">${escapeHtml(sentence.text || '')}</p>
          <p class="reading-translation" hidden>${escapeHtml(sentence.translation || '')}</p>
        </li>
      `,
    )
    .join('');

  const passageHtml = hasSentences
    ? sentenceItems
    : `
        <li class="reading-line reading-line--empty">
          <p class="reading-sentence">Chưa có nội dung bài đọc cho ngôn ngữ này.</p>
        </li>
      `;

  const questionItems = questions
    .map(
      (question, index) => `
        <li class="reading-question" data-question-index="${index}">
          <p class="question-prompt"><strong>Câu ${index + 1}:</strong> ${escapeHtml(question.prompt || '')}</p>
          <textarea class="reading-response" rows="3" aria-label="Câu trả lời ${index + 1}"></textarea>
          <div class="question-answer" hidden><strong>Đáp án:</strong> ${escapeHtml(question.answer || '')}</div>
        </li>
      `,
    )
    .join('');

  return `
    <section>
      <div class="layout-header">
        <h2>${lesson.title}</h2>
      </div>
      <p>${lesson.description || ''}</p>
      ${hasSentences || questions.length
        ? `<div class="reading-controls">
            ${hasSentences
              ? `<label class="bilingual-switch">
                  <input type="checkbox" id="bilingual-toggle" />
                  <span>Song ngữ</span>
                </label>`
              : ''}
            ${questions.length
              ? '<button class="button" type="button" data-action="reveal-answers">Kiểm tra</button>'
              : ''}
          </div>`
        : ''}
      <ol class="reading-passage" aria-live="polite">${passageHtml}</ol>
      ${questions.length
        ? `
          <section class="reading-questions">
            <h3>Câu hỏi</h3>
            <ol>${questionItems}</ol>
          </section>
        `
        : ''}
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
  // Only set 'đang học' if there's no existing status (don't overwrite 'hoàn thành')
  const existingStatus = getLessonStatus(category, lessonId);
  if (!existingStatus) updateProgress(category, lessonId, 'đang học');
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
      if (!lesson.source) {
        throw new Error('Không tìm thấy dữ liệu bài đọc.');
      }
      const readingData = await fetchJSON(lesson.source);
      html = renderReadingLayout(category, lesson, readingData);
    } else if (category === 'quiz') {
      const quiz = await fetchJSON(lesson.source);
      html = renderQuizLayout(category, lesson, quiz.questions || []);
    }

    appEl.innerHTML = `
      ${renderHeader('LinguaBox')}
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
      const current = getLessonStatus(category, lesson.id);
      if (current === 'hoàn thành') {
        // unmark completed -> clear status (set to empty)
        updateProgress(category, lesson.id, '');
        alert('Đã bỏ đánh dấu hoàn thành.');
      } else {
        updateProgress(category, lesson.id, 'hoàn thành');
        alert('Đã đánh dấu hoàn thành!');
      }
      renderLesson(category, lesson.id);
    });
  }

  if (category === 'vocabulary') {
    const practiceToggle = container.querySelector('#practice-toggle');
    const checkAnswersButton = container.querySelector('button[data-action="check-answers"]');
    const wordDisplays = container.querySelectorAll('.word-display');
    const wordInputs = container.querySelectorAll('.word-input');

    const setPracticeMode = (enabled) => {
      wordDisplays.forEach((display) => {
        display.hidden = enabled;
      });
      wordInputs.forEach((input) => {
        input.hidden = !enabled;
      });
      container.classList.toggle('practice-mode', Boolean(enabled));
      if (enabled) {
        const firstInput = wordInputs[0];
        if (firstInput) {
          firstInput.focus();
        }
      }
    };

    if (practiceToggle) {
      practiceToggle.addEventListener('change', (event) => {
        setPracticeMode(event.target.checked);
      });
      setPracticeMode(practiceToggle.checked);
    } else {
      setPracticeMode(false);
    }

    if (checkAnswersButton) {
      checkAnswersButton.addEventListener('click', () => {
        wordInputs.forEach((input) => {
          const cell = input.closest('.word-cell');
          if (!cell) return;
          const answer = cell.getAttribute('data-answer') || '';
          const normalizedInput = normalizeVocabularyValue(input.value);
          let decodedAnswer = '';
          try {
            decodedAnswer = decodeURIComponent(answer);
          } catch (error) {
            decodedAnswer = answer;
          }
          const normalizedAnswer = normalizeVocabularyValue(decodedAnswer);
          if (normalizedInput === normalizedAnswer && normalizedAnswer) {
            cell.classList.remove('is-incorrect');
          } else {
            cell.classList.add('is-incorrect');
          }
        });
      });
    }

    wordInputs.forEach((input) => {
      input.addEventListener('input', () => {
        const cell = input.closest('.word-cell');
        if (cell) {
          cell.classList.remove('is-incorrect');
        }
      });
    });

    container.querySelectorAll('[data-say]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        const text = decodeURIComponent(element.getAttribute('data-say'));
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

  if (category === 'reading') {
    const bilingualToggle = container.querySelector('#bilingual-toggle');
    const translations = container.querySelectorAll('.reading-translation');
    const checkButton = container.querySelector('button[data-action="reveal-answers"]');
    const answers = container.querySelectorAll('.question-answer');

    const setBilingual = (enabled) => {
      translations.forEach((translation) => {
        translation.hidden = !enabled;
      });
      container.classList.toggle('bilingual-mode', Boolean(enabled));
    };

    if (bilingualToggle) {
      bilingualToggle.addEventListener('change', (event) => {
        setBilingual(event.target.checked);
      });
      setBilingual(bilingualToggle.checked);
    }

    if (checkButton) {
      checkButton.addEventListener('click', () => {
        answers.forEach((answer) => {
          answer.hidden = false;
        });
        container.classList.add('showing-reading-answers');
      });
    }
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
      const btnClass = getButtonClassForStatus(status);
      const label = status === 'hoàn thành' ? 'Hoàn thành' : (status === 'đang học' ? 'Đang học' : 'Bắt đầu');
      return `
        <article class="card">
          <h3>${lesson.title}</h3>
          <p>${lesson.description || ''}</p>
          <div class="lesson-controls">
            <a class="button ${btnClass}" href="#/lesson/${category}/${lesson.id}">${label}</a>
          </div>
        </article>
      `;
    })
    .join('');

  appEl.innerHTML = `
    ${renderHeader('LinguaBox')}
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

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('Service worker registered.', reg);
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}
