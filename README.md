# Un mot pour Matheo

Site web statique, moderne et responsive, compatible **GitHub Pages**, permettant à des visiteurs de laisser anonymement un message à Matheo.  
Les messages sont stockés dans **Firebase Firestore** — aucun serveur Node.js, aucun backend personnalisé.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML complète |
| `style.css` | Design dark/admin clair, responsive, animations, toasts, modales |
| `script.js` | Logique envoi, admin, nuage de mots, suppression |
| `firebase-config.js` | Configuration Firebase **à compléter** |
| `README.md` | Ce guide |

---

## Fonctionnalités

- Envoi anonyme de messages (1 200 caractères max)
- Compteur de caractères en temps réel
- Design sombre premium + interface admin claire
- Toasts modernes en bas à droite (aucun `alert()`)
- Popup mot de passe custom (aucun `prompt()`)
- Interface admin avec 2 onglets : **Nuage de mots** et **Vue grille**
- Mode édition : suppression avec confirmation, mise à jour automatique du nuage
- Responsive mobile + desktop

---

## 1. Créer un projet Firebase

1. Ouvrez [https://console.firebase.google.com](https://console.firebase.google.com)
2. Cliquez **Créer un projet**
3. Donnez un nom, désactivez Google Analytics si inutile

---

## 2. Activer Firestore

1. Menu Firebase → **Firestore Database**
2. **Créer une base de données** → mode **production**
3. Choisissez une région proche (ex : `europe-west3`)

---

## 3. Récupérer les clés de configuration

1. Accueil du projet → cliquez l'icône **`</>`** (Application Web)
2. Donnez un nom à l'application
3. Firebase affiche un objet `firebaseConfig` avec vos clés

---

## 4. Configurer `firebase-config.js`

Ouvrez `firebase-config.js` et remplacez les valeurs :

```js
const firebaseConfig = {
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "votre-projet.firebaseapp.com",
  projectId:         "votre-projet",
  storageBucket:     "votre-projet.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef123456"
};
```

---

## 5. Structure Firestore

Collection : **`messages`**

```js
{
  customId   : 1,           // entier incrémental
  text       : "...",       // contenu du message
  createdAt  : Timestamp,   // horodatage serveur
  createdAtMs: 1710000000   // millisecondes (fallback affichage)
}
```

---

## 6. Règles Firestore minimales

Dans **Firestore > Rules** :

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{doc} {
      allow read: if true;

      allow create: if
        request.resource.data.keys().hasOnly(['customId','text','createdAt','createdAtMs'])
        && request.resource.data.customId is int
        && request.resource.data.customId > 0
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 1200
        && request.resource.data.createdAtMs is int;

      allow delete: if true;
      allow update: if false;
    }
  }
}
```

> **Note sécurité** : Le mot de passe admin est stocké dans `script.js` (JavaScript côté client).  
> Il protège l'**interface visuelle** mais pas Firestore lui-même.  
> Pour une vraie sécurité, utilisez **Firebase Authentication** et réservez `allow delete` aux utilisateurs authentifiés.

---

## 7. Déploiement sur GitHub Pages

1. Créez un dépôt GitHub
2. Ajoutez les fichiers à la racine
3. Commit + push
4. **Settings → Pages**
   - Source : **Deploy from a branch**
   - Branch : `main` / Folder : `/ (root)`
5. Enregistrez → GitHub Pages vous donne une URL publique

### Structure du dépôt

```
/
├── index.html
├── style.css
├── script.js
├── firebase-config.js
└── README.md
```

---

## 8. Lancer en local

### Python (recommandé)

```bash
python -m http.server 8000
# → http://localhost:8000
```

### VS Code Live Server

Ouvrez le dossier → clic droit `index.html` → **Open with Live Server**

> ⚠️ Ouvrir `index.html` directement via `file://` peut bloquer les modules ES (`type="module"`).  
> Utilisez toujours un serveur local.

---

## 9. Changer le mot de passe admin

Dans `script.js`, modifiez :

```js
const ADMIN_PASSWORD = "X7kP2mQa91";
```

Remplacez par une valeur longue et aléatoire (16+ caractères recommandés).

---

## 10. Limites connues

- Le mot de passe admin en JavaScript **n'est pas une vraie sécurité serveur**
- L'identifiant incrémental peut produire une collision si deux messages sont envoyés en même temps (improbable pour un usage personnel)
- Le nuage de mots est généré côté client à partir des messages chargés

---

## 11. Améliorations possibles

- Firebase Authentication pour un vrai compte admin
- Supprimer via `allow delete: if request.auth != null`
- Compteur transactionnel Firestore pour éviter les collisions d'ID
- Export CSV des messages
- Recherche et filtres dans la vue grille
