/*
 * Application Vue 3 (sans build) du socle Mantis-lite.
 * - api()      : appels à l'API JSON (src/api.php)
 * - outils     : libellés, couleurs et dates
 * - vues       : un objet par écran, déclaré dans ROUTES
 * Pour ajouter un écran : créer un composant, puis l'ajouter à ROUTES et, si besoin, à MENU.
 */

const { createApp, reactive, ref, computed, onMounted, watch } = Vue;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function api(methode, chemin, corps) {
  const reponse = await fetch(chemin, {
    method: methode,
    headers: corps ? { 'Content-Type': 'application/json' } : {},
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(donnees.erreur || `Erreur ${reponse.status}`);
  }
  return donnees;
}

// ---------------------------------------------------------------------------
// État partagé et outils
// ---------------------------------------------------------------------------

// Métadonnées chargées une fois : listes de valeurs MantisBT, projets, catégories, utilisateurs
const etat = reactive({ meta: null });

const outils = {
  libelle(liste, id) {
    return etat.meta?.enums[liste]?.find((e) => e.id === id)?.label ?? '—';
  },
  couleurStatut(id) {
    return etat.meta?.enums.status.find((e) => e.id === id)?.color ?? '#eee';
  },
  date(ts) {
    return ts ? new Date(ts * 1000).toLocaleDateString('fr-FR') : '—';
  },
  dateHeure(ts) {
    return ts ? new Date(ts * 1000).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  },
  // Un ticket est en retard si son échéance est dépassée et qu'il n'est pas résolu (statut < 80).
  enRetard(t) {
    return t.due_date !== null && t.due_date < Date.now() / 1000 && t.status < 80;
  },
  depuis(ts) {
    const secondes = Math.floor(Date.now() / 1000) - ts;
    if (secondes < 3600) return `il y a ${Math.max(1, Math.floor(secondes / 60))} min`;
    if (secondes < 86400) return `il y a ${Math.floor(secondes / 3600)} h`;
    return `il y a ${Math.floor(secondes / 86400)} j`;
  },
};

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

const ListeTickets = {
  props: ["params"],
  setup() {
    const tickets = ref([]);
    const chargement = ref(true);
    const erreur = ref('');
    const filtres = reactive({ q: '', project_id: '', status: '', overdue: '' });
    let minuteur = null;

    async function charger() {
      const parametres = new URLSearchParams();
      for (const [cle, valeur] of Object.entries(filtres)) {
        if (valeur !== '') parametres.set(cle, valeur);
      }
      const texte = parametres.toString();
      try {
        tickets.value = await api('GET', '/api/tickets' + (texte ? '?' + texte : ''));
        erreur.value = '';
      } catch (e) {
        erreur.value = e.message;
      } finally {
        chargement.value = false;
      }
    }

    // La recherche attend la fin de la saisie ; les listes déroulantes agissent tout de suite.
    watch(() => filtres.q, () => {
      clearTimeout(minuteur);
      minuteur = setTimeout(charger, 300);
    });
    watch(() => [filtres.project_id, filtres.status, filtres.overdue], charger);

    function reinitialiser() {
      filtres.q = '';
      filtres.project_id = '';
      filtres.status = '';
      filtres.overdue = '';
    }

    onMounted(charger);

    return {
      tickets, chargement, erreur, filtres, reinitialiser,
      meta: computed(() => etat.meta), ...outils,
    };
  },
  template: `
    <div class="d-flex align-items-center mb-3">
      <h1 class="h4 mb-0">Tickets</h1>
      <span class="badge text-bg-secondary ms-2">{{ tickets.length }}</span>
      <a href="#/nouveau" class="btn btn-primary btn-sm ms-auto"><i class="bi bi-plus-lg me-1"></i>Nouveau ticket</a>
    </div>
    <div class="card card-body bg-body-tertiary mb-3">
      <div class="row g-2 align-items-end">
        <div class="col-12 col-md-5">
          <label class="form-label small mb-1" for="filtre-q">Recherche</label>
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input id="filtre-q" type="search" class="form-control" placeholder="Rechercher dans le résumé…" v-model="filtres.q">
          </div>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small mb-1" for="filtre-projet">Projet</label>
          <select id="filtre-projet" class="form-select form-select-sm" v-model="filtres.project_id">
            <option value="">Tous les projets</option>
            <option v-for="p in meta.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <label class="form-label small mb-1" for="filtre-statut">Statut</label>
          <select id="filtre-statut" class="form-select form-select-sm" v-model="filtres.status">
            <option value="">Tous les statuts</option>
            <option v-for="s in meta.enums.status" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <div class="form-check form-switch">
            <input id="filtre-retard" class="form-check-input" type="checkbox" role="switch"
              v-model="filtres.overdue" true-value="1" false-value="">
            <label class="form-check-label small" for="filtre-retard">En retard seulement</label>
          </div>
        </div>
        <div class="col-6 col-md-12 text-md-end">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="reinitialiser">
            <i class="bi bi-x-circle me-1"></i>Réinitialiser
          </button>
        </div>
      </div>
    </div>
    <div v-if="erreur" class="alert alert-danger">{{ erreur }}</div>
    <div v-else-if="chargement" class="text-secondary">Chargement…</div>
    <div v-else-if="!tickets.length" class="text-secondary text-center py-4">Aucun ticket ne correspond.</div>
    <div v-else class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover table-tickets mb-0">
          <thead class="table-light">
            <tr>
              <th>N°</th><th>Résumé</th><th>Projet</th><th>Statut</th>
              <th>Priorité</th><th>Échéance</th><th>Responsable</th><th>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets" :key="t.id">
              <td class="text-secondary">#{{ t.id }}</td>
              <td>{{ t.summary }}</td>
              <td class="small">{{ t.project }}<div class="text-secondary">{{ t.category }}</div></td>
              <td>
                <span class="badge badge-statut" :style="{ background: couleurStatut(t.status) }">
                  {{ libelle('status', t.status) }}
                </span>
              </td>
              <td :class="'priorite-' + t.priority">{{ libelle('priority', t.priority) }}</td>
              <td class="small">
                <span v-if="enRetard(t)" class="badge text-bg-danger">
                  <i class="bi bi-exclamation-triangle me-1"></i>En retard
                </span>
                <div :class="enRetard(t) ? 'text-secondary' : ''">{{ dateHeure(t.due_date) }}</div>
              </td>
              <td>{{ t.handler || '—' }}</td>
              <td class="small text-secondary" :title="dateHeure(t.last_updated)">{{ depuis(t.last_updated) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
};

const NouveauTicket = {
  props: ["params"],
  setup() {
    const formulaire = reactive({
      project_id: '', category_id: '', priority: 30, summary: '', description: '',
    });
    const erreur = ref('');
    const envoi = ref(false);

    const categories = computed(() =>
      etat.meta.categories.filter((c) => c.project_id === Number(formulaire.project_id)));
    const priorites = computed(() => etat.meta.enums.priority.filter((p) => p.id >= 20));

    // Indication seulement : l'échéance réelle est fixée par le serveur (SLA_DELAIS dans src/api.php).
    const DELAIS = {
      20: [7 * 86400, '7 jours'], 30: [3 * 86400, '3 jours'], 40: [86400, '1 jour'],
      50: [4 * 3600, '4 h'], 60: [3600, '1 h'],
    };
    const echeance = computed(() => {
      const d = DELAIS[Number(formulaire.priority)];
      return d ? `${outils.dateHeure(Math.floor(Date.now() / 1000) + d[0])} (${d[1]})` : '—';
    });

    function changerProjet() {
      formulaire.category_id = '';
    }

    async function envoyer() {
      erreur.value = '';
      envoi.value = true;
      try {
        await api('POST', '/api/tickets', {
          project_id: formulaire.project_id === '' ? undefined : Number(formulaire.project_id),
          category_id: formulaire.category_id === '' ? null : Number(formulaire.category_id),
          priority: Number(formulaire.priority),
          summary: formulaire.summary,
          description: formulaire.description,
        });
        location.hash = '#/';
      } catch (e) {
        erreur.value = e.message;
      } finally {
        envoi.value = false;
      }
    }

    return { formulaire, erreur, envoi, categories, priorites, echeance, meta: computed(() => etat.meta), changerProjet, envoyer };
  },
  template: `
    <h1 class="h4 mb-3">Déclarer un incident</h1>
    <div class="card shadow-sm">
      <div class="card-body">
        <div v-if="erreur" class="alert alert-danger py-2">
          <i class="bi bi-exclamation-circle me-1"></i>{{ erreur }}
        </div>
        <form class="row g-3" @submit.prevent="envoyer">
          <div class="col-md-6">
            <label class="form-label" for="f-projet">Projet <span class="text-danger">*</span></label>
            <select id="f-projet" class="form-select" v-model="formulaire.project_id" @change="changerProjet">
              <option value="">Choisir un projet…</option>
              <option v-for="p in meta.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="f-categorie">Catégorie</label>
            <select id="f-categorie" class="form-select" v-model="formulaire.category_id" :disabled="!formulaire.project_id">
              <option value="">Aucune</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <div class="form-text">Les catégories dépendent du projet choisi.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="f-priorite">Priorité</label>
            <select id="f-priorite" class="form-select" v-model="formulaire.priority">
              <option v-for="p in priorites" :key="p.id" :value="p.id">{{ p.label }}</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Échéance prévue</label>
            <div class="form-control bg-body-tertiary"><i class="bi bi-clock me-1"></i>{{ echeance }}</div>
            <div class="form-text">Urgente : 4 h · Élevée : 1 jour · Normale : 3 jours · Basse : 7 jours.</div>
          </div>
          <div class="col-12">
            <label class="form-label" for="f-resume">Résumé <span class="text-danger">*</span></label>
            <input id="f-resume" type="text" class="form-control" maxlength="128" v-model="formulaire.summary">
            <div class="form-text text-end">{{ formulaire.summary.length }} / 128</div>
          </div>
          <div class="col-12">
            <label class="form-label" for="f-description">Description <span class="text-danger">*</span></label>
            <textarea id="f-description" class="form-control" rows="4" maxlength="5000" v-model="formulaire.description"
              placeholder="Décrivez le problème, depuis quand, ce que vous avez essayé…"></textarea>
          </div>
          <div class="col-12 d-flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="envoi">
              <i class="bi bi-send me-1"></i>Créer le ticket
            </button>
            <a href="#/" class="btn btn-outline-secondary">Annuler</a>
          </div>
        </form>
      </div>
    </div>
  `,
};

const PageIntrouvable = {
  props: ["params"],
  template: `
    <div class="text-center py-5">
      <h1 class="h4">Page introuvable</h1>
      <a href="#/">Retour aux tickets</a>
    </div>
  `,
};

// ---------------------------------------------------------------------------
// Routage par ancre (#/...)
// ---------------------------------------------------------------------------

// Chaque route : un motif sur l'ancre et un composant. Les groupes capturés arrivent dans params.
const ROUTES = [
  { motif: /^#?\/?$/, vue: ListeTickets },
  { motif: /^#\/nouveau$/, vue: NouveauTicket },
];

// Liens de la barre de navigation
const MENU = [
  { href: '#/', label: 'Tickets', icone: 'bi-list-ul' },
  { href: '#/nouveau', label: 'Nouveau ticket', icone: 'bi-plus-circle' },
];

createApp({
  setup() {
    const route = ref(location.hash || '#/');
    const erreur = ref('');
    window.addEventListener('hashchange', () => { route.value = location.hash || '#/'; });

    onMounted(async () => {
      try {
        etat.meta = await api('GET', '/api/meta');
      } catch (e) {
        erreur.value = `API indisponible : ${e.message}`;
      }
    });

    const correspondance = computed(() => {
      for (const r of ROUTES) {
        const m = route.value.match(r.motif);
        if (m) return { vue: r.vue, params: m.slice(1) };
      }
      return { vue: PageIntrouvable, params: [] };
    });

    return {
      route,
      erreur,
      menu: MENU,
      meta: computed(() => etat.meta),
      utilisateur: computed(() => etat.meta?.users.find((u) => u.id === 1)),
      vue: computed(() => correspondance.value.vue),
      params: computed(() => correspondance.value.params),
    };
  },
}).mount('#app');
