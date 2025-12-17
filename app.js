/* ========= CONFIG ========= */

//const SUPABASE_URL = 'https://kfjwhpdbtjeslwzpkqcm.supabase.co'; // vitalii-chukhrii
//const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmandocGRidGplc2x3enBrcWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTg0NzQsImV4cCI6MjA4MTM5NDQ3NH0.0LJB1K58KpKDVCeeVFaHuZUK_CKNJLsqYZ3Hqk4JkPc';

const SUPABASE_URL = 'https://ssavnmbmquviofwudfts.supabase.co'; // ICH
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzYXZubWJtcXV2aW9md3VkZnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODA1MjUsImV4cCI6MjA4MTQ1NjUyNX0.QZe8u89QbGcRAjKzb21uflxaSJ3OyEg1dkkz1sXIBtE';

const supabaseInstance = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let role = 'viewer';
let searchText = '';

/* ========= PAGINATION CONFIG ========= */

const PAGE_SIZE = 10;   // ← можно менять
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;

/* ======== AUTH BOX ========= */
const overlay = document.getElementById('login-overlay');
const appContent = document.getElementById('app-content');
const errorBox = document.getElementById('login-error');
const authBox = document.getElementById('auth');

function showLogin() {
  overlay.classList.remove('hidden');
  appContent.classList.add('blur-sm', 'pointer-events-none');
}

function hideLogin() {
  overlay.classList.add('hidden');
  appContent.classList.remove('blur-sm', 'pointer-events-none');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !overlay.classList.contains('hidden')) {
    document.getElementById('login-btn').click();
  }
});


/*
const loginForm = `
  <div class="bg-white p-4 rounded shadow max-w-sm">
    <h2 class="font-semibold mb-2">Login</h2>
    <input id="email" class="border p-1 w-full mb-2" placeholder="Email" />
    <input id="password" type="password"
      class="border p-1 w-full mb-2" placeholder="Password" />
    <button id="login"
      class="bg-blue-600 text-white px-3 py-1 rounded w-full">
      Login / Register
    </button>
  </div>
`;
*/
/*async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // если нет пользователя — он создастся
  const { error } = await supabaseInstance.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    const { error: signUpError } =
      await supabaseInstance.auth.signUp({ email, password });
    if (signUpError) alert(signUpError.message);
  }
}
*/
document.getElementById('login-btn').onclick = async () => {
  errorBox.classList.add('hidden');

  const email = document.getElementById('email').value;
  const password = document.getElementById('pass').value;

  if (!email || !password) {
    showError('Email and password required');
    return;
  }

  let { error } = await supabaseInstance.auth.signInWithPassword({
    email,
    password
  });

  // если пользователь не существует — регистрируем
  if (error) {
    const { error: signUpError } =
      await supabaseInstance.auth.signUp({ email, password });

    if (signUpError) {
      showError(signUpError.message);
      return;
    }
  }

  hideLogin();
  await initUser();
};

async function logout() {
  await supabaseInstance.auth.signOut();
  showLogin();
}

/*async function logout() {
  await supabaseInstance.auth.signOut();
}
*/

supabaseInstance.auth.onAuthStateChange((_event, session) => {
  if (session) {
    initUser();
  } else {
    showLogin();
  }
});
/*
supabaseInstance.auth.onAuthStateChange(() => {
  renderAuth();
});
*/
async function initUser() {
  const { data: { user } } = await supabaseInstance.auth.getUser();

  if (!user) {
    showLogin();
    return;
  }

  const { data: profile } = await supabaseInstance
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  role = profile?.role || 'viewer';

  document.getElementById('editor-panel')
    .classList.toggle('hidden', role !== 'editor');
  
    authBox.innerHTML = `
    <div id="auth" class="flex justify-between items-center">
      <div>
        Logged in as <b>${user.email}</b>
        (${role})
      </div>
      <button onclick="logout()"
        class="text-red-600">Logout</button>
    </div>
  `;
  hideLogin();
  loadWords();
}

/* ========= UI HELPERS ========= */

function highlight(text, query) {
  if (!query) return text;

  // escape regex special chars
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');

  return text.replace(regex,
    '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>'
  );
}

function roleBtnStyle(active) {
  return `
    px-3 py-1 rounded border
    ${active ? 'bg-blue-600 text-white' : 'bg-white'}
  `;
}

document.querySelectorAll('.role-btn').forEach(btn => {
  btn.className = roleBtnStyle(btn.dataset.role === role);

  btn.onclick = () => {
    role = btn.dataset.role;
    currentPage = 1;

    document.querySelectorAll('.role-btn').forEach(b =>
      b.className = roleBtnStyle(b.dataset.role === role)
    );

    document.getElementById('editor-panel')
      .classList.toggle('hidden', role !== 'editor');

    loadWords();
  };
});

/* ========= SEARCH ========= */

document.getElementById('dict_search').oninput = e => {
  searchText = e.target.value.trim();
  currentPage = 1;
  loadWords();
};

/* ========= LOAD WORDS ========= */

async function loadWords() {
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseInstance
    .from('words')
    .select(`
      id,
      wordgr,
      translations (
        id,
        wordua,
        description
      )
    `, { count: 'exact' })
    .order('wordgr')
    .range(from, to);

  if (searchText) {
    query = query.ilike('wordgr', `%${searchText}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    alert(error.message);
    return;
  }

  totalCount = count || 0;
  totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  renderWords(data);
  renderPagination();
}


/* ========= RENDER ========= */

function renderWords(words) {
  const list = document.getElementById('word-list');
  list.innerHTML = '';

  words.forEach(w => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded shadow p-4';

    card.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="text-lg font-semibold">${highlight(w.wordgr, searchText)}</div>
        <button class="toggle text-sm text-blue-600">Show</button>
      </div>

      <div class="translations hidden mt-3 space-y-3">
        ${w.translations.map(t => `
          <div class="border rounded p-2">
            <div class="font-medium">${t.wordua}</div>
            <div class="text-sm text-gray-700 whitespace-pre-wrap">${t.description || ''}</div>
            ${role === 'editor'
              ? `<button data-id="${t.id}" class="del mt-1 text-red-600 text-sm">Delete</button>`
              : ''}
          </div>
        `).join('')}

        ${role === 'editor' ? translationForm(w.id) : ''}
      </div>
    `;

    card.querySelector('.toggle').onclick = () => {
      card.querySelector('.translations').classList.toggle('hidden');
    };

    card.querySelectorAll('.del').forEach(btn => {
      btn.onclick = () => deleteTranslation(btn.dataset.id);
    });

    list.appendChild(card);
  });
}

function renderPagination() {
  const el = document.getElementById('pagination');
  el.innerHTML = '';

  if (totalCount === 0) return;

  el.innerHTML = `
    <div id="pagination" class="flex flex-col sm:flex-row items-center gap-3">

      <div class="text-sm text-gray-600">
        Found <strong>${totalCount}</strong> records
      </div>

      <div class="flex items-center gap-1">

        <button
          onclick="goPage(1)"
          ${currentPage === 1 ? 'disabled' : ''}
          class="px-2 py-1 border rounded ${currentPage === 1 ? 'opacity-40' : ''}">
          ⏮ First
        </button>

        <button
          onclick="goPage(${currentPage - 1})"
          ${currentPage === 1 ? 'disabled' : ''}
          class="px-2 py-1 border rounded ${currentPage === 1 ? 'opacity-40' : ''}">
          ◀
        </button>

        <span class="text-sm mx-2">
          Page
          <input
            id="page-num"
            type="number"
            min="1"
            max="${totalPages}"
            value="${currentPage}"
            onchange="goPage(this.value)"
            class="w-16 border rounded px-1 text-center"
          />
          of ${totalPages}
        </span>

        <button
          onclick="goPage(${currentPage + 1})"
          ${currentPage === totalPages ? 'disabled' : ''}
          class="px-2 py-1 border rounded ${currentPage === totalPages ? 'opacity-40' : ''}">
          ▶
        </button>

        <button
          onclick="goPage(${totalPages})"
          ${currentPage === totalPages ? 'disabled' : ''}
          class="px-2 py-1 border rounded ${currentPage === totalPages ? 'opacity-40' : ''}">
          Last ⏭
        </button>

      </div>
    </div>
  `;
}

/*
async function renderAuth() {
  const { data: { user } } = await supabaseInstance.auth.getUser();

  if (!user) {
    authBox.innerHTML = loginForm;
    document.getElementById('login').onclick = login;
    return;
  }

  // получить роль
  const { data: profile } = await supabaseInstance
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  role = profile?.role || 'viewer';

  authBox.innerHTML = `
    <div class="flex justify-between items-center">
      <div>
        Logged in as <b>${user.email}</b>
        (${role})
      </div>
      <button onclick="logout()"
        class="text-red-600">Logout</button>
    </div>
  `;

  document.getElementById('editor-panel')
    .classList.toggle('hidden', role !== 'editor');

  loadWords();
}
*/

window.goPage = page => {
  page = Number(page);
  if (isNaN(page)) return;

  page = Math.max(1, Math.min(totalPages, page));
  if (page === currentPage) return;

  currentPage = page;
  loadWords();
};


/* ========= FORMS ========= */

function translationForm(wordId) {
  return `
    <div class="border-t pt-2">
      <input class="border p-1 w-full mb-1" placeholder="UA word" maxlength="30" />
      <textarea class="border p-1 w-full mb-1" placeholder="Description (links allowed)"></textarea>
      <button class="bg-green-600 text-white px-2 py-1 rounded"
        onclick="addTranslation(${wordId}, this)">
        Add translation
      </button>
    </div>
  `;
}

window.addTranslation = async (wordId, btn) => {
  const box = btn.parentElement;
  const wordua = box.querySelector('input').value.trim();
  const description = box.querySelector('textarea').value.trim();

  if (!wordua) return alert('wordua required');

  const { error } = await supabaseInstance
    .from('translations')
    .insert({ word_id: wordId, wordua, description });

  if (error) alert(error.message);
  else loadWords();
};

async function deleteTranslation(id) {
  const { error } = await supabaseInstance
    .from('translations')
    .delete()
    .eq('id', id);

  if (error) alert(error.message);
  else loadWords();
}

/* ========= ADD WORD ========= */

document.getElementById('editor-panel').innerHTML = `
  <div id="editor-panel" class="bg-white p-3 rounded shadow">
    <h3 class="font-semibold mb-2">Add new Greek / Latin word</h3>
    <input id="new-word" class="border p-1 w-full mb-2" maxlength="30" />
    <button id="add-word"
      class="bg-blue-600 text-white px-3 py-1 rounded">
      Add word
    </button>
  </div>
`;

document.getElementById('add-word').onclick = async () => {
  const wordgr = document.getElementById('new-word').value.trim();
  if (!wordgr) return;

  const { error } = await supabaseInstance
    .from('words')
    .insert({ wordgr });

  if (error) alert(error.message);
  else {
    document.getElementById('new-word').value = '';
    loadWords();
  }
};

/* ========= INIT ========= 

loadWords(); */