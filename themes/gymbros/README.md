# Gymbros

A retro pixel workout tracker theme for [Hugo](https://gohugo.io/). Track your weekly exercises with checkboxes, weight (kg), and RPE selects — all stored in localStorage with automatic weekly archiving and text-file export.

![Screenshot](images/screenshot.png)

## Features

- Per-exercise checkboxes, weight (kg), and RPE (1-10) tracking
- Weekly auto-reset with localStorage (cookies/cache) archiving
- Export workout archive log as a text file from localStorage
- Embedded YouTube exercise demos (standard, Shorts, and youtu.be URLs)
- Automatic dark mode via `prefers-color-scheme`
- Silkscreen pixel font (loaded from Google Fonts)
- Gradient border frames on tracker day cards and exercise cards
- Responsive layout for mobile

## Installation

### Git submodule

```bash
cd your-hugo-site
git submodule add https://github.com/turkeystar142/gymbros.git themes/gymbros
```

Then set the theme in your `hugo.toml`:

```toml
theme = 'gymbros'
```

## Configuration

### Site config (`hugo.toml`)

```toml
baseURL = 'https://example.com/'
languageCode = 'en-us'
title = 'My Workout Tracker'
theme = 'gymbros'

[params]
  description = 'Weekly Workout Tracker'

[[menu.main]]
  name = 'Home'
  url = '/'
  weight = 1

[[menu.main]]
  name = 'Monday'
  url = '/days/monday/'
  weight = 2

# Add entries for each workout day...
```

### Workout data files

Create YAML files in `data/workouts/` for each day. Example (`data/workouts/monday.yaml`):

```yaml
title: "Monday — Lower Body"
subtitle: "Focus: legs + stability"
exercises:
  - id: "back-squat"
    name: "Back Squat"
    tracked: true
    description: "Barbell on upper back, squat to parallel."
    cue: "Chest up, drive through heels."
    youtube: "https://www.youtube.com/watch?v=example"
  - id: "box-jumps"
    name: "Box Jumps"
    tracked: false
    description: "Explosive jump onto a box."
    cue: ""
    youtube: ""
```

Fields:

- `id` — unique slug (used as localStorage key)
- `name` — display name
- `tracked` — `true` adds weight/RPE selects; `false` shows checkbox only
- `description` — exercise instructions
- `cue` — coaching cue (shown as blockquote, optional)
- `youtube` — video URL (supports `watch?v=`, `/shorts/`, `youtu.be` formats)

### Content pages

Create thin markdown files in `content/days/` for each workout day:

```markdown
---
title: "Monday — Lower Body"
weight: 1
day: "monday"
description: "Focus: legs + stability"
---
```

The `day` field links the page to its `data/workouts/*.yaml` file.

## Example site

See `exampleSite/` for a complete working setup. To run it:

```bash
cd themes/gymbros/exampleSite
hugo server --themesDir ../..
```

## License

[MIT](LICENSE)
