# Un mot pour Matheo — version JSONBin

Site web statique, compatible **GitHub Pages**, sans Firebase ni backend.  
Les messages sont stockés dans **JSONBin.io** via de simples requêtes `fetch()`.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML complète |
| `style.css` | Design dark, admin clair, responsive, animations |
| `script.js` | Logique complète (envoi, admin, nuage de mots, suppression) |
| `config.js` | **Vos clés JSONBin** (déjà configuré) |
| `README.md` | Ce guide |

---

## Configuration actuelle (`config.js`)

```js
export const BIN_ID  = "6a174df221f9ee59d292ad38";
export const API_KEY = "$2a$10$etsnPjhf.VIUansaih4WA.KZGHGXK9uPmf9AmnX0oYSpDO2x0aq9q";
```

⚠️ Ces clés sont publiques dans votre dépôt GitHub.  
N'importe qui lisant votre code peut lire/écrire dans le bin.  
Pour un projet personnel à faible trafic, c'est acceptable.

---

## Structure des données (JSONBin)

```json
{
  "messages": [
    {
      "id"  : 1,
      "text": "Votre message ici",
      "date": "2026-05-27T20:00:00.000Z"
    }
  ]
}
```

---

## Déploiement GitHub Pages

1. Créez un dépôt GitHub
2. Ajoutez les 5 fichiers à la racine
3. Commit + push
4. **Settings → Pages → Deploy from branch → main / root**
5. Votre site est en ligne

### Structure du dépôt

```
/
├── index.html
├── style.css
├── script.js
├── config.js
└── README.md
```

---

## Mot de passe admin

Dans `script.js`, modifiez :

```js
const ADMIN_PASSWORD = "X7kP2mQa91";
```

---

## Lancer en local

```bash
python -m http.server 8000
# → http://localhost:8000
```

> ⚠️ Ne pas ouvrir `index.html` directement via `file://` — les modules ES nécessitent un serveur HTTP.

---

## Limite connue

JSONBin fonctionne en lecture-modification-réécriture.  
Si deux personnes envoient un message exactement en même temps, le second peut écraser le premier.  
Pour un projet personnel à faible trafic, ce cas est extrêmement rare.

---

## Initialiser le bin (si vide)

Si vous créez un nouveau bin vide, ajoutez manuellement ce contenu dans le dashboard JSONBin :

```json
{ "messages": [] }
```
