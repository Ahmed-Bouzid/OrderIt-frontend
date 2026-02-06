# Sons pour l'application SunnyGo

## Fichier requis

### success-chime.mp3

Son de validation joué lors d'un paiement accepté.

**Spécifications recommandées :**

- Format : MP3
- Durée : 0.5 - 1.5 secondes
- Fréquence : 44.1 kHz
- Style : Chime de succès moderne (2-3 notes ascendantes)

**Options gratuites :**

1. **Freesound.org** : Rechercher "success chime" ou "payment success"
   - Exemple : https://freesound.org/search/?q=success+chime
2. **Pixabay Sounds** : https://pixabay.com/sound-effects/search/notification/

3. **Zapsplat** : https://www.zapsplat.com (inscription gratuite)

**Note :** Si le fichier n'existe pas, l'animation fonctionnera sans son.

## Installation

1. Télécharger un fichier `.mp3` de son de succès
2. Le renommer en `success-chime.mp3`
3. Le placer dans ce dossier `/frontend/assets/sounds/`

L'application détectera automatiquement le fichier et jouera le son lors des paiements validés.
